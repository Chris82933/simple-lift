export const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] // Mon … Sun

// The weekdays a program trains on: explicit list (rotation) or the days' own
// assigned weekdays (fixed).
export function trainingWeekdays(program) {
  if (program?.schedule?.mode === 'rotation') {
    return [...(program.schedule.trainingDays || [])].sort((a, b) => a - b)
  }
  return [...new Set(program.days.map((d) => d.weekday).filter((d) => d != null))].sort((a, b) => a - b)
}

// Warnings for back-to-back training days (no rest between them).
export function restWarnings(weekdays) {
  const set = new Set(weekdays)
  const pairs = []
  for (const d of weekdays) {
    const next = (d + 1) % 7
    if (set.has(next)) pairs.push([d, next])
  }
  if (pairs.length === 0) return null
  const list = pairs.map(([a, b]) => `${WEEKDAY_SHORT[a]}→${WEEKDAY_SHORT[b]}`).join(', ')
  return `Back-to-back training days (${list}). That's fine for full-body or alternating push/pull/legs days, but try to give the same muscle group ~48h before hammering it again — or slot a rest day between heavy sessions.`
}

// Which session to show "today", for either scheduling mode.
// Returns { index, isToday, session, nextWeekday } or null.
export function pickSession(program, todayWeekday) {
  const { days } = program
  if (program.schedule?.mode === 'rotation') {
    const trainDays = trainingWeekdays(program)
    const pointer = program.schedule.pointer || 0
    const isToday = trainDays.includes(todayWeekday)
    let nextWeekday = null
    if (!isToday && trainDays.length) {
      nextWeekday = trainDays
        .map((d) => ({ d, ahead: (d - todayWeekday + 7) % 7 }))
        .sort((a, b) => a.ahead - b.ahead)[0].d
    }
    return { index: pointer, isToday, session: days[pointer], nextWeekday }
  }

  // Fixed weekdays
  const todayIdx = days.findIndex((d) => d.weekday === todayWeekday)
  if (todayIdx !== -1) return { index: todayIdx, isToday: true, session: days[todayIdx], nextWeekday: null }
  let best = null
  days.forEach((d, i) => {
    const ahead = (d.weekday - todayWeekday + 7) % 7
    if (best === null || ahead < best.ahead) best = { index: i, ahead, weekday: d.weekday }
  })
  return best
    ? { index: best.index, isToday: false, session: days[best.index], nextWeekday: best.weekday }
    : null
}
