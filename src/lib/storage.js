// On-device persistence with a multi-program model and change events that the
// optional cloud-sync layer listens to. All data lives under these keys:
import { hasCompression, encodeGzip, decodeGzip } from './codec.js'

const PROFILE_KEY = 'simple-lift:profile'
const PROGRAMS_KEY = 'simple-lift:programs'
const ACTIVE_KEY = 'simple-lift:activeProgramId'
const HISTORY_KEY = 'simple-lift:history'
const SETTINGS_KEY = 'simple-lift:settings'
const MAXES_KEY = 'simple-lift:maxes'
const CARDIO_KEY = 'simple-lift:cardio'
const SKILLS_KEY = 'simple-lift:skills'
const BODYWEIGHT_KEY = 'simple-lift:bodyweight'
const CUSTOM_EX_KEY = 'simple-lift:customExercises'
const UPDATED_KEY = 'simple-lift:updatedAt'
const REV_KEY = 'simple-lift:rev' // monotonic local revision counter (R4 — see getRev)
const ACTIVE_SESSION_KEY = 'simple-lift:activeSession' // in-progress workout (resume)
const LEGACY_PROGRAM_KEY = 'simple-lift:program' // pre-multi-program

// Low-level read that separates "the key is genuinely absent" from "the read
// or JSON parse FAILED" (storage disabled, quota weirdness, corruption). The
// distinction matters: on iOS a transient failure must never be mistaken for
// "empty", or a following save would overwrite good data with nothing.
//   → { ok: true,  value }   value is null when the key is absent
//   → { ok: false, value: null }   couldn't read reliably — do NOT clobber
function readRaw(key) {
  let raw
  try {
    raw = localStorage.getItem(key)
  } catch {
    return { ok: false, value: null } // storage unavailable (private mode, disabled)
  }
  if (raw == null) return { ok: true, value: null } // genuinely not set yet
  try {
    return { ok: true, value: JSON.parse(raw) }
  } catch {
    return { ok: false, value: null } // corrupt — better to keep it than replace it
  }
}

const read = (key, fallback = null) => {
  const r = readRaw(key)
  return r.ok && r.value != null ? r.value : fallback
}

// Set once if a write ever throws (usually iOS quota / private mode) so the UI
// can warn the user their data isn't being saved.
let storageBroken = false
export const isStorageHealthy = () => !storageBroken

// Is localStorage usable at all right now? Drives the iOS "back up" warnings.
export function storageAvailable() {
  try {
    const k = '__sl_probe__'
    localStorage.setItem(k, '1')
    localStorage.removeItem(k)
    return true
  } catch {
    return false
  }
}

// Writing bumps the updatedAt stamp and notifies the sync layer (unless silent,
// e.g. when we're applying data pulled down from the cloud). Never throws —
// returns false and announces an error instead, so a failed save can't crash a
// workout flow.
function write(key, value, { silent = false } = {}) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    storageBroken = true
    try {
      window.dispatchEvent(new CustomEvent('sl-storage-error', { detail: { key, message: String((e && e.message) || e) } }))
    } catch { /* no window */ }
    return false
  }
  if (!silent) {
    try {
      localStorage.setItem(UPDATED_KEY, JSON.stringify(Date.now()))
      // R4: bump the device-local revision counter alongside the wall-clock
      // stamp. Every non-silent write is, by definition, a local mutation that
      // touches synced data, so this is the one place that needs to do it.
      localStorage.setItem(REV_KEY, JSON.stringify((read(REV_KEY, 0) || 0) + 1))
    } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('sl-data-changed'))
  }
  return true
}

// ---- Sync revision counter (R4) ----
// `updatedAt` is Date.now() from whichever device wrote it, so a skewed device
// clock can make a genuinely newer cloud copy look older. `rev` is monotonic
// and device-independent: it only ever increments by 1, once per local write
// (see `write()` above), so comparing revs across devices is safe even when
// their clocks aren't. Read it with getRev(); it travels in exportData()/the
// backup codes, and importData() installs a cloud-provided rev verbatim
// (not incremented) since that's adopting the remote value, not a new local
// mutation. Callers writing a sync marker should stash the rev each side was
// at (`cloudRev`/`localRev`) alongside the existing `cloudUpdatedAt`/
// `localUpdatedAt` — see syncDecision() below for exactly how it's used.
export const getRev = () => read(REV_KEY, 0)

// Safe load-modify-save for a collection. If the read itself failed (not merely
// empty), it declines to write rather than overwrite good data with a degraded
// value — the core guard against the iOS data-loss report. Returns true if it
// wrote, false if it bailed or the write failed.
function mutate(key, fallback, fn) {
  const r = readRaw(key)
  if (!r.ok) return false // couldn't read reliably — do not clobber
  const current = r.value == null ? fallback : r.value
  return write(key, fn(current))
}

export const genId = () =>
  `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`

// ---- Profile ----
export const loadProfile = () => read(PROFILE_KEY)
export const saveProfile = (p) => write(PROFILE_KEY, p)

// ---- Settings ----
export const loadSettings = () => read(SETTINGS_KEY, { units: 'lbs' })
export function saveSettings(s) {
  const ok = write(SETTINGS_KEY, s)
  // Announce a user-facing settings save so the UI can flash "Saved".
  if (ok) { try { window.dispatchEvent(new CustomEvent('sl-saved')) } catch { /* no window */ } }
  return ok
}

// ---- Calisthenics skills ({ [skillId]: { level, best, log:[{date,value}] } }) ----
export const loadSkills = () => read(SKILLS_KEY, {})
export const saveSkills = (s) => write(SKILLS_KEY, s)
export function updateSkill(skillId, patch) {
  mutate(SKILLS_KEY, {}, (all) => ({ ...all, [skillId]: { ...(all[skillId] || {}), ...patch } }))
  return loadSkills()
}

// The calisthenics skill tree is a fun extra, not a program for everyone, so it
// is added deliberately rather than shown to all. An explicit setting wins;
// otherwise anyone who has already logged a skill keeps it (grandfathered), and
// everyone else starts without it.
export function isSkillTreeAdded(settings = loadSettings(), skills = loadSkills()) {
  if (settings.skillTree === true) return true
  if (settings.skillTree === false) return false
  return Object.keys(skills || {}).length > 0
}
export function setSkillTreeAdded(added) {
  saveSettings({ ...loadSettings(), skillTree: !!added })
}

// ---- User-defined custom exercises ----
// Stored as full exercise objects so they can be merged straight into the
// library at startup. They ride along with export/import and cloud sync.
export const loadCustomExercises = () => read(CUSTOM_EX_KEY, [])

export function saveCustomExercise(ex) {
  if (!ex || !ex.id) return loadCustomExercises()
  mutate(CUSTOM_EX_KEY, [], (list) => {
    const i = list.findIndex((e) => e.id === ex.id)
    if (i === -1) return [...list, ex]
    const copy = list.slice()
    copy[i] = ex
    return copy
  })
  return loadCustomExercises()
}

export function deleteCustomExercise(id) {
  mutate(CUSTOM_EX_KEY, [], (list) => list.filter((e) => e.id !== id))
  return loadCustomExercises()
}

// ---- Programs (multiple) ----
function migrateLegacy() {
  // Wrap a pre-existing single program into the new array model, once. Only
  // migrate when we can confirm no programs array exists yet — never on a read
  // failure, which could otherwise duplicate or clobber.
  const legacy = read(LEGACY_PROGRAM_KEY)
  const existing = readRaw(PROGRAMS_KEY)
  if (legacy && existing.ok && existing.value == null) {
    const id = genId()
    const wrapped = { id, name: 'My Program', source: 'generated', ...legacy }
    write(PROGRAMS_KEY, [wrapped], { silent: true })
    write(ACTIVE_KEY, id, { silent: true })
    try { localStorage.removeItem(LEGACY_PROGRAM_KEY) } catch { /* ignore */ }
  }
}

// Clamp a rotation pointer into [0, len). Handles undefined/null/NaN (→ 0),
// negative values (wrap from the end), and out-of-range values (modulo) — the
// single source of truth used everywhere a pointer is read or advanced, so an
// out-of-range pointer can never hand back `undefined` for `days[pointer]`.
// len <= 0 (no days) always clamps to 0; callers with empty `days` must still
// handle that themselves (there's no valid index to return).
export function clampRotationPointer(pointer, len) {
  if (!(len > 0)) return 0
  const n = Number(pointer)
  if (!Number.isFinite(n)) return 0
  return ((n % len) + len) % len
}

// Ensure every program has a schedule (older ones default to fixed weekdays),
// and that a rotation pointer is always in range. Immutable (R9): returns a
// new object rather than mutating its argument, mirroring the rest of the store.
// Exported so callers (and tests) can normalize a program without going
// through localStorage.
export function normalizeProgram(p) {
  if (!p.schedule) return { ...p, schedule: { mode: 'fixed' } }
  if (p.schedule.mode === 'rotation') {
    const len = Array.isArray(p.days) ? p.days.length : 0
    const pointer = clampRotationPointer(p.schedule.pointer ?? 0, len)
    if (pointer === p.schedule.pointer) return p
    return { ...p, schedule: { ...p.schedule, pointer } }
  }
  return p
}

// Read programs with the read-status flag, so mutators can bail on failure
// instead of clobbering. Runs the one-time legacy migration first.
function readPrograms() {
  migrateLegacy()
  const r = readRaw(PROGRAMS_KEY)
  if (!r.ok) return { ok: false, programs: [] }
  return { ok: true, programs: (r.value || []).map(normalizeProgram) }
}

export function loadPrograms() {
  return readPrograms().programs
}

// Advance a rotation program's pointer to the next workout after one is done.
// Immutable (R9): builds a new program object and a new array rather than
// mutating the one just read.
export function advanceRotation(programId, completedDayIndex) {
  const { ok, programs } = readPrograms()
  if (!ok) return // storage read failed — don't rewrite from a bad base
  const p = programs.find((x) => x.id === programId)
  if (!p || p.schedule?.mode !== 'rotation') return
  const len = Array.isArray(p.days) ? p.days.length : 0
  const pointer = clampRotationPointer(completedDayIndex + 1, len)
  const updated = { ...p, schedule: { ...p.schedule, pointer } }
  savePrograms(programs.map((x) => (x.id === programId ? updated : x)))
}

export const savePrograms = (arr) => write(PROGRAMS_KEY, arr)

export const getActiveProgramId = () => read(ACTIVE_KEY)
export const setActiveProgramId = (id) => write(ACTIVE_KEY, id)

export function loadActiveProgram() {
  const programs = loadPrograms()
  if (programs.length === 0) return null
  const activeId = getActiveProgramId()
  return programs.find((p) => p.id === activeId) || programs[0]
}

export function getProgram(id) {
  return loadPrograms().find((p) => p.id === id) || null
}

// Adds a program, assigns an id if missing, and makes it active.
export function addProgram(program) {
  const { ok, programs } = readPrograms()
  const id = program.id || genId()
  const withId = { createdAt: new Date().toISOString(), ...program, id }
  // Only append onto programs we could actually read. If the read failed, base
  // on [] — the write itself will most likely also fail (same storage fault),
  // so nothing is silently wiped; if it succeeds we've at least kept the new one.
  savePrograms([...(ok ? programs : []), withId])
  setActiveProgramId(id)
  return withId
}

export function updateProgram(program) {
  const { ok, programs } = readPrograms()
  if (!ok) return program // don't overwrite everything from a bad base
  savePrograms(programs.map((p) => (p.id === program.id ? program : p)))
  return program
}

export function deleteProgram(id) {
  const { ok, programs } = readPrograms()
  if (!ok) return
  const remaining = programs.filter((p) => p.id !== id)
  savePrograms(remaining)
  if (getActiveProgramId() === id) {
    setActiveProgramId(remaining[0]?.id || null)
  }
}

// Re-add a deleted program (undo). Won't duplicate if it's somehow back.
export function restoreProgram(program) {
  const { ok, programs } = readPrograms()
  if (!ok || programs.some((p) => p.id === program.id)) return
  savePrograms([...programs, program])
}

// ---- Estimated maxes (from the 1RM calculator) ----
// Shape: { [exerciseId]: { oneRM, weight, reps, rir, units, name, updatedAt } }
export const loadMaxes = () => read(MAXES_KEY, {})
export const getMax = (exerciseId) => loadMaxes()[exerciseId] || null

export function saveMax(exerciseId, data) {
  mutate(MAXES_KEY, {}, (maxes) => ({ ...maxes, [exerciseId]: { ...data, updatedAt: new Date().toISOString() } }))
  return loadMaxes()
}

export function deleteMax(exerciseId) {
  mutate(MAXES_KEY, {}, (maxes) => { const n = { ...maxes }; delete n[exerciseId]; return n })
}

// ---- Cardio log ----
export const loadCardio = () => read(CARDIO_KEY, [])

export function addCardio(entry) {
  const withId = { id: genId(), ...entry }
  mutate(CARDIO_KEY, [], (log) => [withId, ...log])
  return loadCardio()
}

export function deleteCardio(id) {
  mutate(CARDIO_KEY, [], (log) => log.filter((e) => e.id !== id))
}

export function insertCardioAt(entry, idx) {
  mutate(CARDIO_KEY, [], (log) => {
    const c = log.slice()
    c.splice(Math.max(0, Math.min(idx ?? c.length, c.length)), 0, entry)
    return c
  })
}

// ---- Bodyweight log ----
// Newest-first [{ date, weight }]. Used for the Progress chart and — more
// importantly — to make weighted bodyweight lifts (pull-ups, dips) score
// correctly: hanging 25 lb from a 180 lb lifter is a 205 lb lift, not a 25 lb one.
export const loadBodyweight = () => read(BODYWEIGHT_KEY, [])

export function logBodyweight(weight, date = new Date().toISOString()) {
  const w = Number(weight) || 0
  if (w <= 0) return loadBodyweight()
  const day = date.slice(0, 10)
  mutate(BODYWEIGHT_KEY, [], (log) => {
    // One entry per day — re-weighing replaces rather than stacks.
    const rest = log.filter((e) => (e.date || '').slice(0, 10) !== day)
    return [{ date, weight: w }, ...rest].sort((a, b) => (a.date < b.date ? 1 : -1))
  })
  // Announce it like a settings save so the UI flashes "✓ Saved".
  try { window.dispatchEvent(new CustomEvent('sl-saved')) } catch { /* no window */ }
  return loadBodyweight()
}

export function deleteBodyweight(date) {
  mutate(BODYWEIGHT_KEY, [], (log) => log.filter((e) => e.date !== date))
}

// The most recent recorded weight, or 0 when the user has never entered one.
export function currentBodyweight() {
  const log = loadBodyweight()
  return log.length ? Number(log[0].weight) || 0 : 0
}

// ---- In-progress workout (for resuming after a close / crash / iOS eviction) ----
// Kept local-only (silent) — no need to sync a half-finished session.
export const loadActiveSession = () => read(ACTIVE_SESSION_KEY, null)
export const saveActiveSession = (s) => write(ACTIVE_SESSION_KEY, s, { silent: true })
export function clearActiveSession() {
  try { localStorage.removeItem(ACTIVE_SESSION_KEY) } catch { /* ignore */ }
}

// ---- Workout history ----
export const loadHistory = () => read(HISTORY_KEY, [])

// Re-insert a deleted workout / cardio entry at its original index (undo).
export function insertWorkoutAt(entry, idx) {
  mutate(HISTORY_KEY, [], (h) => {
    const c = h.slice()
    c.splice(Math.max(0, Math.min(idx ?? c.length, c.length)), 0, entry)
    return c
  })
}

export function appendWorkout(entry) {
  mutate(HISTORY_KEY, [], (history) => [entry, ...history]) // newest first
  return loadHistory()
}

// Remove a logged workout by its date stamp (its unique id).
export function deleteWorkout(date) {
  mutate(HISTORY_KEY, [], (history) => history.filter((w) => w.date !== date))
}

export function lastPerformance(exerciseId) {
  const history = loadHistory()
  for (const workout of history) {
    const found = workout.entries.find((e) => e.exerciseId === exerciseId)
    if (found) return { date: workout.date, sets: found.sets }
  }
  return null
}

// Patch the most recent workout (or one matched by date) with extra fields,
// e.g. a post-session difficulty rating and notes.
export function updateWorkout(date, patch) {
  mutate(HISTORY_KEY, [], (history) => {
    const idx = date ? history.findIndex((w) => w.date === date) : 0
    if (idx === -1 || history.length === 0) return history
    const copy = history.slice()
    copy[idx] = { ...copy[idx], ...patch }
    return copy
  })
}

// ---- Sync snapshot ----
export function exportData() {
  return {
    profile: read(PROFILE_KEY),
    programs: read(PROGRAMS_KEY, []),
    activeProgramId: read(ACTIVE_KEY),
    history: read(HISTORY_KEY, []),
    settings: read(SETTINGS_KEY, { units: 'lbs' }),
    maxes: read(MAXES_KEY, {}),
    cardio: read(CARDIO_KEY, []),
    skills: read(SKILLS_KEY, {}),
    bodyweight: read(BODYWEIGHT_KEY, []),
    customExercises: read(CUSTOM_EX_KEY, []),
    updatedAt: read(UPDATED_KEY, 0),
    rev: read(REV_KEY, 0),
  }
}

// Firestore caps a single document at ~1 MiB, and we sync the whole snapshot as
// one document. Guard against silently outgrowing it: warn with headroom, and
// let the sync layer refuse a doomed write near the ceiling. JSON byte length is
// a close-enough proxy for Firestore's own size accounting.
export const CLOUD_DOC_LIMIT = 1048576 // 1 MiB
export const CLOUD_WARN_AT = 800 * 1024 // ~0.78 MiB — flag well before the wall

export function snapshotBytes() {
  try {
    const json = JSON.stringify(exportData())
    return typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(json).length : json.length
  } catch {
    return 0
  }
}

// { bytes, pct (0–100), warn, over } describing how full the cloud document is.
export function cloudSizeInfo() {
  const bytes = snapshotBytes()
  return {
    bytes,
    pct: Math.min(100, Math.round((bytes / CLOUD_DOC_LIMIT) * 100)),
    warn: bytes >= CLOUD_WARN_AT,
    over: bytes >= CLOUD_DOC_LIMIT,
  }
}

// ---- Import validation (R5) ----
// A cloud pull or a pasted backup code can't be trusted to match the current
// schema: a hand-edited code, a partial cloud write, or a blob from a future
// app version can hand back a top-level field of the wrong type entirely (an
// object where an array was expected, say), which would crash the UI the
// moment it tries to .map() or .find() it. Individual entries can also be
// malformed without the container itself being the wrong type.
//
// We reject the former outright (nothing is written) and quietly drop/coerce
// the latter — permissive about unknown extra fields for forward
// compatibility, strict about the shapes the UI indexes into.
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

// A program needs a real id and an array of days; each day needs an array of
// exercises. Bad days/exercises are dropped rather than failing the whole
// program. Runs the pointer through the same clamp as everywhere else (C1).
function sanitizeProgram(p) {
  if (!isPlainObject(p) || typeof p.id !== 'string' || !p.id) return null
  if (!Array.isArray(p.days)) return null
  const days = p.days
    .filter(isPlainObject)
    .map((d) => ({ ...d, exercises: Array.isArray(d.exercises) ? d.exercises : [] }))
  return normalizeProgram({ ...p, days })
}

function sanitizePrograms(list) {
  if (!Array.isArray(list)) return null
  const out = []
  for (const p of list) {
    const s = sanitizeProgram(p)
    if (s) out.push(s)
  }
  return out
}

// A history entry needs a date (its identity — see deleteWorkout/updateWorkout)
// and an entries array; the sets inside are left freeform.
function sanitizeHistoryEntry(w) {
  if (!isPlainObject(w) || typeof w.date !== 'string' || !w.date) return null
  return { ...w, entries: Array.isArray(w.entries) ? w.entries : [] }
}

function sanitizeHistory(list) {
  if (!Array.isArray(list)) return null
  const out = []
  for (const w of list) {
    const s = sanitizeHistoryEntry(w)
    if (s) out.push(s)
  }
  return out
}

const numOrUndefined = (v) => (v === undefined || v === null || !Number.isFinite(Number(v)) ? undefined : Number(v))

// Checks every field present on `blob` against the shape exportData()
// produces. Returns { ok: true, value } with a cleaned, ready-to-write copy,
// or { ok: false, errors } naming the top-level fields whose type didn't
// match at all — those abort the whole import rather than installing a
// partial/garbled snapshot.
export function validateImportBlob(blob) {
  if (!isPlainObject(blob)) return { ok: false, errors: ['(not an object)'] }
  const errors = []
  const out = {}

  if (blob.profile !== undefined) {
    if (blob.profile === null || isPlainObject(blob.profile)) out.profile = blob.profile
    else errors.push('profile')
  }
  if (blob.programs !== undefined) {
    const sanitized = sanitizePrograms(blob.programs)
    if (sanitized) out.programs = sanitized
    else errors.push('programs')
  }
  if (blob.activeProgramId !== undefined) {
    if (blob.activeProgramId === null || typeof blob.activeProgramId === 'string') out.activeProgramId = blob.activeProgramId
    else errors.push('activeProgramId')
  }
  if (blob.history !== undefined) {
    const sanitized = sanitizeHistory(blob.history)
    if (sanitized) out.history = sanitized
    else errors.push('history')
  }
  if (blob.settings !== undefined) {
    if (isPlainObject(blob.settings)) out.settings = blob.settings
    else errors.push('settings')
  }
  if (blob.maxes !== undefined) {
    if (isPlainObject(blob.maxes)) out.maxes = blob.maxes
    else errors.push('maxes')
  }
  if (blob.cardio !== undefined) {
    if (Array.isArray(blob.cardio)) out.cardio = blob.cardio
    else errors.push('cardio')
  }
  if (blob.skills !== undefined) {
    if (isPlainObject(blob.skills)) out.skills = blob.skills
    else errors.push('skills')
  }
  if (blob.bodyweight !== undefined) {
    if (Array.isArray(blob.bodyweight)) out.bodyweight = blob.bodyweight
    else errors.push('bodyweight')
  }
  if (blob.customExercises !== undefined) {
    if (Array.isArray(blob.customExercises)) out.customExercises = blob.customExercises
    else errors.push('customExercises')
  }
  if (blob.updatedAt !== undefined) {
    const n = numOrUndefined(blob.updatedAt)
    if (n !== undefined) out.updatedAt = n
    else errors.push('updatedAt')
  }
  if (blob.rev !== undefined) {
    const n = numOrUndefined(blob.rev)
    if (n !== undefined) out.rev = n
    else errors.push('rev')
  }

  if (errors.length) return { ok: false, errors }
  return { ok: true, value: out }
}

// Applies a cloud snapshot (or an imported backup code) to local storage.
// Silent so it doesn't echo back out. Validates/normalizes first (R5) and
// throws rather than installing anything if a top-level field is the wrong
// type — callers (importCode, the cloud-sync layer) should surface the error
// to the user instead of applying a partial snapshot.
export function importData(blob) {
  if (!blob) return
  const result = validateImportBlob(blob)
  if (!result.ok) {
    throw new Error(`That data has an unexpected shape (${result.errors.join(', ')}) — nothing was changed.`)
  }
  const clean = result.value
  if (clean.profile !== undefined) write(PROFILE_KEY, clean.profile, { silent: true })
  if (clean.programs !== undefined) write(PROGRAMS_KEY, clean.programs, { silent: true })
  if (clean.activeProgramId !== undefined) write(ACTIVE_KEY, clean.activeProgramId, { silent: true })
  if (clean.history !== undefined) write(HISTORY_KEY, clean.history, { silent: true })
  if (clean.settings !== undefined) write(SETTINGS_KEY, clean.settings, { silent: true })
  if (clean.maxes !== undefined) write(MAXES_KEY, clean.maxes, { silent: true })
  if (clean.cardio !== undefined) write(CARDIO_KEY, clean.cardio, { silent: true })
  if (clean.skills !== undefined) write(SKILLS_KEY, clean.skills, { silent: true })
  if (clean.bodyweight !== undefined) write(BODYWEIGHT_KEY, clean.bodyweight, { silent: true })
  if (clean.customExercises !== undefined) write(CUSTOM_EX_KEY, clean.customExercises, { silent: true })
  if (clean.updatedAt !== undefined) {
    try { localStorage.setItem(UPDATED_KEY, JSON.stringify(clean.updatedAt)) } catch { /* ignore */ }
  }
  // Cloud-provided rev is installed verbatim (not incremented) — adopting the
  // remote value isn't itself a new local mutation. See getRev() above.
  if (clean.rev !== undefined) {
    try { localStorage.setItem(REV_KEY, JSON.stringify(clean.rev)) } catch { /* ignore */ }
  }
}

export const getUpdatedAt = () => read(UPDATED_KEY, 0)

// ---- Sync marker ----
// Records the state both sides agreed on at the last successful sync. Without
// it, `updatedAt` alone cannot tell "the cloud is newer, take it" apart from
// "we both changed since we last agreed" — and the second case silently threw
// away one device's sessions. Device-local, so it never travels in the snapshot.
const SYNC_MARKER_KEY = 'simple-lift:syncMarker'

export const getSyncMarker = () => read(SYNC_MARKER_KEY, null)
export const setSyncMarker = (marker) => write(SYNC_MARKER_KEY, marker, { silent: true })
export const clearSyncMarker = () => {
  try { localStorage.removeItem(SYNC_MARKER_KEY) } catch { /* ignore */ }
}

/**
 * Compare local and cloud snapshots against the last agreed state.
 *   'push'     — only local moved
 *   'pull'     — only the cloud moved
 *   'conflict' — both moved since the last sync; the user must choose
 *   'none'     — already in step
 *
 * R4: `updatedAt` is Date.now() from whichever device wrote it, so a skewed
 * device clock can make a genuinely newer cloud copy look older (or hide a
 * real conflict). When BOTH the cloud snapshot carries a `rev` AND the sync
 * marker recorded a `cloudRev`/`localRev` baseline, rev comparison is used
 * instead — it's monotonic and immune to clock skew. Otherwise (legacy cloud
 * data with no `rev`, or a marker saved before this existed) it falls back to
 * the original `updatedAt` comparison unchanged, so existing users keep
 * working through the upgrade. See getRev() above for the write side.
 */
export function syncDecision(cloud, marker = getSyncMarker(), localUpdatedAt = getUpdatedAt(), localRev = getRev()) {
  if (!cloud) return 'push' // nothing up there yet

  const cloudAt = Number(cloud?.updatedAt) || 0
  const localAt = Number(localUpdatedAt) || 0

  if (!marker) {
    // First sync on this device: no shared history to reason from. Identical
    // stamps mean the same data; otherwise both sides may hold real work.
    if (cloudAt === localAt) return 'none'
    return localAt > 0 ? 'conflict' : 'pull'
  }

  const cloudRev = numOrUndefined(cloud?.rev)
  const localRevNum = numOrUndefined(localRev)
  const markerCloudRev = numOrUndefined(marker.cloudRev)
  const markerLocalRev = numOrUndefined(marker.localRev)
  const useRev = cloudRev !== undefined && localRevNum !== undefined && markerCloudRev !== undefined && markerLocalRev !== undefined

  let cloudMoved, localMoved
  if (useRev) {
    cloudMoved = cloudRev > markerCloudRev
    localMoved = localRevNum > markerLocalRev
  } else {
    const agreedCloud = Number(marker?.cloudUpdatedAt) || 0
    const agreedLocal = Number(marker?.localUpdatedAt) || 0
    cloudMoved = cloudAt > agreedCloud
    localMoved = localAt > agreedLocal
  }

  if (cloudMoved && localMoved) return 'conflict'
  if (cloudMoved) return 'pull'
  if (localMoved) return 'push'
  return 'none'
}

// Human-readable "what's in this copy", so a conflict prompt can describe each
// side instead of asking the user to pick blind.
export function summarizeSnapshot(blob) {
  const history = blob?.history || []
  const last = history[0]?.date
  return {
    sessions: history.length,
    programs: (blob?.programs || []).length,
    cardio: (blob?.cardio || []).length,
    lastWorkout: last ? new Date(last).toLocaleDateString() : null,
    updatedAt: Number(blob?.updatedAt) || 0,
  }
}

// ---- Copy-paste backup codes ----
// One portable string holding the whole snapshot, for moving to a new phone or
// surviving iOS wiping local data.
//
// v1 was plain base64 of the JSON, which is bulky: the snapshot repeats the same
// keys for every set of every session, and base64 then adds another third on
// top. v2 gzips first, which typically cuts a real history by 10–20×. Nothing is
// dropped — it's lossless compression of the identical snapshot.
//
// v1 codes still import, forever. Anyone holding an old code keeps their backup.
const CODE_PREFIX = 'SLIFT1:'   // base64(json)
const CODE_PREFIX_V2 = 'SLIFT2:' // base64url(gzip(json))

export async function exportCode() {
  const json = JSON.stringify(exportData())
  if (hasCompression()) {
    try {
      return CODE_PREFIX_V2 + (await encodeGzip(exportData()))
    } catch { /* fall through to the uncompressed form */ }
  }
  // Older browsers (pre-iOS 16.4) — still produce a working, if longer, code.
  return CODE_PREFIX + btoa(unescape(encodeURIComponent(json)))
}

// Returns true on success, rejects with a friendly message otherwise.
export async function importCode(code) {
  if (!code || typeof code !== 'string') throw new Error('Paste your backup code first.')
  const trimmed = code.trim()
  const v2 = trimmed.startsWith(CODE_PREFIX_V2)
  let body = trimmed
  if (v2) body = body.slice(CODE_PREFIX_V2.length)
  else if (body.startsWith(CODE_PREFIX)) body = body.slice(CODE_PREFIX.length)
  body = body.replace(/\s+/g, '')

  let blob
  try {
    if (v2) {
      if (!hasCompression()) {
        throw new Error('This browser is too old to read a compressed backup code. Open the code on a newer device, or use an older code if you have one.')
      }
      blob = await decodeGzip(body)
    } else {
      blob = JSON.parse(decodeURIComponent(escape(atob(body))))
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('This browser')) throw e
    throw new Error('That code doesn’t look valid. Copy the whole thing and try again.')
  }
  if (!blob || typeof blob !== 'object' || (blob.programs === undefined && blob.profile === undefined)) {
    throw new Error('That code doesn’t contain Simple Lift data.')
  }
  importData(blob)
  // importData is silent; announce the change so the UI/sync layer refreshes.
  try { localStorage.setItem(UPDATED_KEY, JSON.stringify(Date.now())) } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent('sl-data-changed'))
  return true
}

export function clearAll() {
  ;[PROFILE_KEY, PROGRAMS_KEY, ACTIVE_KEY, HISTORY_KEY, SETTINGS_KEY, MAXES_KEY, CARDIO_KEY, SKILLS_KEY, BODYWEIGHT_KEY, CUSTOM_EX_KEY, UPDATED_KEY, REV_KEY, ACTIVE_SESSION_KEY, LEGACY_PROGRAM_KEY].forEach(
    (k) => { try { localStorage.removeItem(k) } catch { /* ignore */ } },
  )
  window.dispatchEvent(new CustomEvent('sl-data-changed'))
}
