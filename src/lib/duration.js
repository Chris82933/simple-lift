// Estimated session length. "How long will this take?" is the question that
// decides whether someone can fit a program into their week, and every template
// was silent on it.
//
// The model is deliberately simple and slightly generous: rest between sets
// dominates the total, so getting rest right matters far more than precision
// about time under tension.
import { exMeasure } from '../data/exercises.js'

const SEC_PER_REP = 3.5      // a controlled rep, up and down
const MIN_SET_SEC = 20       // even a fast set costs setup time
const WARMUP_SEC = 300       // ramping to a heavy working weight is ~5 sets with rest
const CHANGEOVER_SEC = 30    // walking to the next station, adjusting a bench

// Seconds of actual work for one set of this exercise.
function workSec(ex) {
  const m = exMeasure(ex)
  const reps = Number(ex.repHigh) || Number(ex.repLow) || 0
  if (m.type === 'distance') return reps * 60          // prescribed in minutes
  if (m.type === 'time') return m.unit === 'min' ? reps * 60 : reps
  return Math.max(MIN_SET_SEC, reps * SEC_PER_REP)
}

// Total seconds for one exercise: every set's work, plus rest. Rest is counted
// once per set rather than between sets — in practice people rest after the last
// one too, before moving on, and counting n-1 put every barbell program 20-30%
// under what those sessions actually take.
function exerciseSec(ex) {
  const sets = Math.max(1, Number(ex.sets) || 1)
  const rest = Number(ex.restSec) || 0
  const warm = ex.warmups || (ex.compound && ex.load !== false && rest >= 150) ? WARMUP_SEC : 0
  return sets * (workSec(ex) + rest) + warm + CHANGEOVER_SEC
}

// Minutes for one training day, rounded to the nearest 5.
export function estimateSessionMinutes(day) {
  const total = (day?.exercises || []).reduce((sum, ex) => sum + exerciseSec(ex), 0)
  if (total <= 0) return 0
  return Math.max(5, Math.round(total / 60 / 5) * 5)
}

// A label for a whole program: a single figure when its days are similar
// lengths, otherwise the range across them.
export function sessionLengthLabel(program) {
  const mins = (program?.days || []).map(estimateSessionMinutes).filter((m) => m > 0)
  if (!mins.length) return null
  const lo = Math.min(...mins)
  const hi = Math.max(...mins)
  return lo === hi ? `~${lo} min` : `${lo}–${hi} min`
}
