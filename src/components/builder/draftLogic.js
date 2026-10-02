// Pure draft helpers, lifted out of Builder.jsx so the mobile column, the
// desktop workspace and the unit tests all reason about a program draft the
// same way. Nothing in here touches React or the DOM.
import { EXERCISE_BY_ID, exMeasure } from '../../data/exercises.js'
import { prescriptionFor } from '../../data/schemes.js'
import { getMax, loadMaxes } from '../../lib/storage.js'
import { weightForReps, interpolate1RM } from '../../lib/oneRepMax.js'
import { exerciseEntryFromLibrary } from '../../lib/exerciseEntry.js'
import { maxWeight, MAX_SETS, MAX_REPS, MAX_HOLD_SEC, MAX_REST_SEC } from '../../lib/limits.js'

export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] // Mon … Sun

// Two exercises share equipment when their required-gear lists overlap (or both
// are bodyweight) — the natural case for a superset that doesn't hog stations.
export const sameEquip = (a, b) => {
  const ra = EXERCISE_BY_ID[a.id]?.requires || a.requires || []
  const rb = EXERCISE_BY_ID[b.id]?.requires || b.requires || []
  if (!ra.length && !rb.length) return true
  return ra.some((r) => rb.includes(r))
}

export const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

// Starting (working) weight for a loadable lift, derived from its 1RM and the
// rep target, PLUS whether that 1RM was a real saved max or a population-
// strength-ratio guess (interpolate1RM). The guess is fine to use, but the
// user needs to be able to tell it apart from a tested number — see the
// "≈ estimated" badge next to Start wt.
export function resolveStartWeight(ex, repHigh, inc) {
  if (ex.load === false) return { value: '', estimated: false }
  const real = getMax(ex.id)?.oneRM ? Number(getMax(ex.id).oneRM) : 0
  const oneRM = real || interpolate1RM(ex.id, loadMaxes()) || 0
  if (!oneRM) return { value: '', estimated: false }
  return { value: String(weightForReps(oneRM, repHigh, inc)), estimated: !real }
}

// Build a day's default exercise entry from the library + current goal scheme.
// Defaults come from prescriptionFor (sets/reps/rest tuned to how the move is
// measured and the muscle worked); the working weight is derived from your 1RM,
// and compound lifts get a warm-up ramp by default.
export function makeExercise(ex, scheme, inc) {
  const p = prescriptionFor(ex, scheme)
  const sw = resolveStartWeight(ex, p.repHigh, inc)
  const overrides = {
    sets: p.sets, repLow: p.repLow, repHigh: p.repHigh, restSec: p.restSec,
    startWeight: sw.value,
  }
  if (ex.load !== false && ex.compound && exMeasure(ex).type === 'reps') overrides.warmups = true
  // exerciseEntryFromLibrary only copies its known PROGRAM_FIELDS allowlist,
  // which doesn't include startWeightEstimated — add it after, not before.
  return { ...exerciseEntryFromLibrary(ex, overrides), startWeightEstimated: sw.estimated || undefined }
}

// Validate one exercise entry's user-editable numbers. Returns a map of
// field -> message; empty object means the entry is fine to save as-is.
// Deliberately strict rather than clamping-with-a-silent-default: an invalid
// number should block Save and tell the user, never get quietly rewritten
// into something they didn't type (that's the whole bug this fixes).
export function exerciseErrors(ex) {
  const errs = {}
  const sets = Number(ex.sets)
  if (Number.isNaN(sets) || sets < 1) errs.sets = 'Sets must be 1 or more'
  const restSec = Number(ex.restSec)
  if (Number.isNaN(restSec) || restSec < 0) errs.restSec = "Rest can't be negative"
  const repLow = Number(ex.repLow)
  const repHigh = Number(ex.repHigh)
  if (Number.isNaN(repLow) || repLow < 1) errs.repLow = 'Must be 1 or more'
  if (Number.isNaN(repHigh) || repHigh < 1) errs.repHigh = 'Must be 1 or more'
  if (!errs.repLow && !errs.repHigh && repLow > repHigh) errs.repRange = "Min can't exceed max"
  // Ceilings: past these a value is a typo, not a plan.
  if (!errs.sets && sets > MAX_SETS) errs.sets = `Sets can't be more than ${MAX_SETS}`
  if (!errs.restSec && restSec > MAX_REST_SEC) errs.restSec = 'Rest is over an hour'
  const repCeil = Math.max(MAX_REPS, MAX_HOLD_SEC)
  if (!errs.repHigh && repHigh > repCeil) errs.repHigh = 'Too high'
  if (ex.startWeight !== '' && ex.startWeight != null) {
    const w = Number(ex.startWeight)
    if (Number.isNaN(w) || w < 0) errs.startWeight = "Start weight can't be negative"
    else if (w > maxWeight()) errs.startWeight = `Start weight is over ${maxWeight()} — check the number`
  }
  return errs
}

// Why Save is off, in words — shared by the phone footer and the desktop
// status line, so neither has to make someone guess which of three things is
// wrong.
export function saveBlockers(draft) {
  const out = []
  if (!draft.name.trim()) out.push('give the program a name')
  if (!draft.days.some((d) => d.exercises.length > 0 || (d.cardio && d.cardio.length > 0))) {
    out.push('add at least one exercise or cardio block')
  }
  const bad = draft.days
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => d.exercises.some((e) => Object.keys(exerciseErrors(e)).length > 0))
  if (bad.length) out.push(`fix the highlighted numbers in ${bad.map(({ d, i }) => d.title.trim() || `day ${i + 1}`).join(', ')}`)
  return out
}

// Move `from` to `to` inside a day's exercise list, clearing the superset links
// a reorder can silently corrupt. A superset is "this entry pairs with the one
// below it", so the only links a move can invalidate are the ones touching the
// two holes it opens: the destination and the slot it vacated, plus the entry
// immediately above each. Both the ▲▼ buttons and drag-and-drop go through
// here, so a dragged reorder can never produce links a button reorder wouldn't.
//
// For an adjacent move this is exactly the old in-place swap: removing and
// re-inserting a neighbour is the same permutation, and {from, from-1, to, to-1}
// is the same index set as the old {ei, j, min(ei,j)-1}.
export function reorderExercises(list, from, to) {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list
  const next = [...list]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  const clear = new Set([from, from - 1, to, to - 1])
  return next.map((e, k) => (clear.has(k) ? { ...e, supersetNext: undefined } : e))
}

// Reorder whole training days. The day's weekday travels WITH it (we move the
// whole day object, same as reorderExercises moves whole exercises) — dragging
// "Legs" above "Push" means "I want to do Legs first", not "keep whatever's
// assigned to slot 1 but rename it". Its exercises and cardio blocks move as
// one unit, untouched, so there are no cross-day links to repair.
export function reorderDays(days, from, to) {
  if (from === to || from < 0 || to < 0 || from >= days.length || to >= days.length) return days
  const next = [...days]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}
