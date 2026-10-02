// Sanity limits for numbers people type. Not "what is a good lift" — just the
// line past which a value can only be a slip of the thumb: a minus sign, an
// extra digit, a held-down key. Without these a 99,999 lb set became a
// personal record, the "current best" tile and most of a week's volume.
import { loadSettings } from './storage.js'

// Above the heaviest lifts ever recorded in either unit, with room to spare.
export const maxWeightFor = (units) => (units === 'kg' ? 700 : 1500)
export const maxWeight = () => maxWeightFor(loadSettings().units)
export const MAX_BODYWEIGHT = { lbs: 1000, kg: 450 }
export const maxBodyweight = () => MAX_BODYWEIGHT[loadSettings().units === 'kg' ? 'kg' : 'lbs']
export const MAX_REPS = 1000      // also covers a long timed hold in seconds
export const MAX_HOLD_SEC = 3600
export const MAX_SETS = 30
export const MAX_REST_SEC = 3600

// For a controlled input's onChange: returns the value to store. Blank is
// always allowed (clearing the box). Anything negative, non-numeric or past
// `max` is refused by keeping what was there before — the keystroke simply
// doesn't land, which is how a number field behaves when you type a letter.
export function acceptNumber(next, prev, { min = 0, max = Infinity } = {}) {
  if (next === '' || next == null) return ''
  const n = Number(next)
  if (Number.isNaN(n) || n < min || n > max) return prev ?? ''
  return next
}
