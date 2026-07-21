// On-device persistence with a multi-program model and change events that the
// optional cloud-sync layer listens to. All data lives under these keys:
const PROFILE_KEY = 'simple-lift:profile'
const PROGRAMS_KEY = 'simple-lift:programs'
const ACTIVE_KEY = 'simple-lift:activeProgramId'
const HISTORY_KEY = 'simple-lift:history'
const SETTINGS_KEY = 'simple-lift:settings'
const MAXES_KEY = 'simple-lift:maxes'
const CARDIO_KEY = 'simple-lift:cardio'
const SKILLS_KEY = 'simple-lift:skills'
const UPDATED_KEY = 'simple-lift:updatedAt'
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
    try { localStorage.setItem(UPDATED_KEY, JSON.stringify(Date.now())) } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('sl-data-changed'))
  }
  return true
}

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

// Ensure every program has a schedule (older ones default to fixed weekdays).
function normalizeProgram(p) {
  if (!p.schedule) p.schedule = { mode: 'fixed' }
  if (p.schedule.mode === 'rotation' && p.schedule.pointer == null) p.schedule.pointer = 0
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
export function advanceRotation(programId, completedDayIndex) {
  const { ok, programs } = readPrograms()
  if (!ok) return // storage read failed — don't rewrite from a bad base
  const p = programs.find((x) => x.id === programId)
  if (!p || p.schedule?.mode !== 'rotation') return
  p.schedule.pointer = (completedDayIndex + 1) % p.days.length
  savePrograms(programs)
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
    updatedAt: read(UPDATED_KEY, 0),
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

// Applies a cloud snapshot to local storage. Silent so it doesn't echo back out.
export function importData(blob) {
  if (!blob) return
  if (blob.profile !== undefined) write(PROFILE_KEY, blob.profile, { silent: true })
  if (blob.programs !== undefined) write(PROGRAMS_KEY, blob.programs, { silent: true })
  if (blob.activeProgramId !== undefined) write(ACTIVE_KEY, blob.activeProgramId, { silent: true })
  if (blob.history !== undefined) write(HISTORY_KEY, blob.history, { silent: true })
  if (blob.settings !== undefined) write(SETTINGS_KEY, blob.settings, { silent: true })
  if (blob.maxes !== undefined) write(MAXES_KEY, blob.maxes, { silent: true })
  if (blob.cardio !== undefined) write(CARDIO_KEY, blob.cardio, { silent: true })
  if (blob.skills !== undefined) write(SKILLS_KEY, blob.skills, { silent: true })
  if (blob.updatedAt !== undefined) {
    try { localStorage.setItem(UPDATED_KEY, JSON.stringify(blob.updatedAt)) } catch { /* ignore */ }
  }
}

export const getUpdatedAt = () => read(UPDATED_KEY, 0)

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

const hasCompression = () =>
  typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined'

// base64url — no +/= to be mangled by chat apps, URLs, or note fields.
const toB64Url = (bytes) => {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const fromB64Url = (s) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '='))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// Push bytes through a Compression/DecompressionStream. Written against the raw
// reader/writer rather than Blob+Response so it works anywhere the stream itself
// exists. The write is deliberately not awaited before reading starts — waiting
// on both ends at once deadlocks on backpressure for larger snapshots.
async function pipeThrough(bytes, stream) {
  const writer = stream.writable.getWriter()
  writer.write(bytes).then(() => writer.close(), () => {})
  const reader = stream.readable.getReader()
  const chunks = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    total += value.length
  }
  const out = new Uint8Array(total)
  let at = 0
  for (const c of chunks) { out.set(c, at); at += c.length }
  return out
}

export async function exportCode() {
  const json = JSON.stringify(exportData())
  if (hasCompression()) {
    try {
      const gz = await pipeThrough(new TextEncoder().encode(json), new CompressionStream('gzip'))
      return CODE_PREFIX_V2 + toB64Url(gz)
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
      const json = await pipeThrough(fromB64Url(body), new DecompressionStream('gzip'))
      blob = JSON.parse(new TextDecoder().decode(json))
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
  ;[PROFILE_KEY, PROGRAMS_KEY, ACTIVE_KEY, HISTORY_KEY, SETTINGS_KEY, MAXES_KEY, CARDIO_KEY, SKILLS_KEY, UPDATED_KEY, ACTIVE_SESSION_KEY, LEGACY_PROGRAM_KEY].forEach(
    (k) => { try { localStorage.removeItem(k) } catch { /* ignore */ } },
  )
  window.dispatchEvent(new CustomEvent('sl-data-changed'))
}
