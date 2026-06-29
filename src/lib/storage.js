// Simple on-device persistence. Swappable for cloud sync later.
const PROFILE_KEY = 'simple-lift:profile'
const PROGRAM_KEY = 'simple-lift:program'
const HISTORY_KEY = 'simple-lift:history'
const SETTINGS_KEY = 'simple-lift:settings'

const read = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value))

// ---- Profile ----
export const loadProfile = () => read(PROFILE_KEY)
export const saveProfile = (p) => write(PROFILE_KEY, p)

// ---- Program ----
export const loadProgram = () => read(PROGRAM_KEY)
export const saveProgram = (p) => write(PROGRAM_KEY, p)

// ---- Settings ----
export const loadSettings = () => read(SETTINGS_KEY, { units: 'lbs' })
export const saveSettings = (s) => write(SETTINGS_KEY, s)

// ---- Workout history ----
export const loadHistory = () => read(HISTORY_KEY, [])

export function appendWorkout(entry) {
  const history = loadHistory()
  history.unshift(entry) // newest first
  write(HISTORY_KEY, history)
  return history
}

// Most recent logged performance for a given exercise, across all sessions.
export function lastPerformance(exerciseId) {
  const history = loadHistory()
  for (const workout of history) {
    const found = workout.entries.find((e) => e.exerciseId === exerciseId)
    if (found) return { date: workout.date, sets: found.sets }
  }
  return null
}

// ---- Reset everything ----
export function clearAll() {
  ;[PROFILE_KEY, PROGRAM_KEY, HISTORY_KEY, SETTINGS_KEY].forEach((k) =>
    localStorage.removeItem(k),
  )
}
