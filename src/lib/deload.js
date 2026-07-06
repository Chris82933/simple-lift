// Deload reminders. After several weeks of steady training on a program, nudge
// the user to take a lighter recovery week. The cadence comes from the program
// (templates set their own) or a sensible default for custom programs. A program
// with deloadWeeks === 0 opts out entirely (e.g. the daily-challenge template).

const DEFAULT_CADENCE = 4

// Collapse sessions in the same calendar week to a single "week trained".
// ISO-style: anchor each date to the Thursday of its week.
function weekKey(date) {
  const d = new Date(date)
  const day = (d.getDay() + 6) % 7 // Mon = 0 … Sun = 6
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - day + 3) // move to this week's Thursday
  const firstThursday = new Date(d.getFullYear(), 0, 4)
  const week = 1 + Math.round((d - firstThursday) / (7 * 86400000))
  return `${d.getFullYear()}-${week}`
}

// How many distinct calendar weeks the user has logged a session for a program.
export function weeksTrained(programId, history) {
  const weeks = new Set()
  for (const w of history) {
    if (w.programId === programId) weeks.add(weekKey(w.date))
  }
  return weeks.size
}

export function deloadCadence(program) {
  return program?.deloadWeeks || DEFAULT_CADENCE
}

// Returns { weeks, cadence, note } when a deload is due, else null.
export function deloadDue(program, history) {
  if (!program || program.deloadWeeks === 0) return null
  const trained = weeksTrained(program.id, history)
  const cadence = deloadCadence(program)
  const ack = program.deloadAckWeeks || 0
  if (trained > 0 && trained - ack >= cadence) {
    return { weeks: trained, cadence, note: program.deloadNote || null }
  }
  return null
}
