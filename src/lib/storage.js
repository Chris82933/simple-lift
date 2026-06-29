// On-device persistence with a multi-program model and change events that the
// optional cloud-sync layer listens to. All data lives under these keys:
const PROFILE_KEY = 'simple-lift:profile'
const PROGRAMS_KEY = 'simple-lift:programs'
const ACTIVE_KEY = 'simple-lift:activeProgramId'
const HISTORY_KEY = 'simple-lift:history'
const SETTINGS_KEY = 'simple-lift:settings'
const UPDATED_KEY = 'simple-lift:updatedAt'
const LEGACY_PROGRAM_KEY = 'simple-lift:program' // pre-multi-program

const read = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

// Writing bumps the updatedAt stamp and notifies the sync layer (unless silent,
// e.g. when we're applying data pulled down from the cloud).
function write(key, value, { silent = false } = {}) {
  localStorage.setItem(key, JSON.stringify(value))
  if (!silent) {
    localStorage.setItem(UPDATED_KEY, JSON.stringify(Date.now()))
    window.dispatchEvent(new CustomEvent('sl-data-changed'))
  }
}

export const genId = () =>
  `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`

// ---- Profile ----
export const loadProfile = () => read(PROFILE_KEY)
export const saveProfile = (p) => write(PROFILE_KEY, p)

// ---- Settings ----
export const loadSettings = () => read(SETTINGS_KEY, { units: 'lbs' })
export const saveSettings = (s) => write(SETTINGS_KEY, s)

// ---- Programs (multiple) ----
function migrateLegacy() {
  // Wrap a pre-existing single program into the new array model, once.
  const legacy = read(LEGACY_PROGRAM_KEY)
  if (legacy && !localStorage.getItem(PROGRAMS_KEY)) {
    const id = genId()
    const wrapped = { id, name: 'My Program', source: 'generated', ...legacy }
    write(PROGRAMS_KEY, [wrapped], { silent: true })
    write(ACTIVE_KEY, id, { silent: true })
    localStorage.removeItem(LEGACY_PROGRAM_KEY)
  }
}

export function loadPrograms() {
  migrateLegacy()
  return read(PROGRAMS_KEY, [])
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
  const programs = loadPrograms()
  const id = program.id || genId()
  const withId = { createdAt: new Date().toISOString(), ...program, id }
  savePrograms([...programs, withId])
  setActiveProgramId(id)
  return withId
}

export function updateProgram(program) {
  const programs = loadPrograms().map((p) => (p.id === program.id ? program : p))
  savePrograms(programs)
  return program
}

export function deleteProgram(id) {
  const remaining = loadPrograms().filter((p) => p.id !== id)
  savePrograms(remaining)
  if (getActiveProgramId() === id) {
    setActiveProgramId(remaining[0]?.id || null)
  }
}

// ---- Workout history ----
export const loadHistory = () => read(HISTORY_KEY, [])

export function appendWorkout(entry) {
  const history = loadHistory()
  history.unshift(entry) // newest first
  write(HISTORY_KEY, history)
  return history
}

export function lastPerformance(exerciseId) {
  const history = loadHistory()
  for (const workout of history) {
    const found = workout.entries.find((e) => e.exerciseId === exerciseId)
    if (found) return { date: workout.date, sets: found.sets }
  }
  return null
}

// ---- Sync snapshot ----
export function exportData() {
  return {
    profile: read(PROFILE_KEY),
    programs: read(PROGRAMS_KEY, []),
    activeProgramId: read(ACTIVE_KEY),
    history: read(HISTORY_KEY, []),
    settings: read(SETTINGS_KEY, { units: 'lbs' }),
    updatedAt: read(UPDATED_KEY, 0),
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
  if (blob.updatedAt !== undefined) localStorage.setItem(UPDATED_KEY, JSON.stringify(blob.updatedAt))
}

export const getUpdatedAt = () => read(UPDATED_KEY, 0)

export function clearAll() {
  ;[PROFILE_KEY, PROGRAMS_KEY, ACTIVE_KEY, HISTORY_KEY, SETTINGS_KEY, UPDATED_KEY, LEGACY_PROGRAM_KEY].forEach(
    (k) => localStorage.removeItem(k),
  )
  window.dispatchEvent(new CustomEvent('sl-data-changed'))
}
