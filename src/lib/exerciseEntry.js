// Builds a program/session exercise entry from a library exercise definition.
//
// This object literal used to be hand-rolled at every call site that adds,
// swaps, or levels an exercise (Builder's makeExercise/changeLevel, Workout's
// addExercise/swapExercise/stepLadder, equipment's resolveForEquipment,
// sessionReview's applyChoices) — and each copy carried a slightly different
// field set, so fields like `supersetNext`, `hold`, `distance`, `unit` would
// silently vanish depending on which code path built the entry. This is the
// one place identity/metadata fields are read off the library entry.
//
// Usage: exerciseEntryFromLibrary(lib, overrides)
//   lib       — a library exercise (from EXERCISE_BY_ID / EXERCISES), or
//               anything with the same shape. Supplies identity/metadata:
//               id, name, pattern, regions, compound, load, cues, ladderId,
//               nextId, prevId, hold, distance, unit.
//   overrides — the program-side fields to carry over: sets, repLow, repHigh,
//               restSec, startWeight, progression, supersetNext, amrap,
//               warmups, iso, adhoc, swappedFrom, setWeights, setReps. Only
//               keys in this allowlist are read off `overrides`, so it's safe
//               to pass the *existing* entry wholesale (its own id/name/etc.
//               are simply ignored) when swapping/leveling in place — see
//               Workout.jsx's stepLadder for that pattern.
//
// Any of these fields left unset in `overrides` are simply omitted, so
// callers that want a specific field cleared (e.g. a fresh `startWeight: ''`
// after a swap) should pass it explicitly.
const PROGRAM_FIELDS = [
  'sets', 'repLow', 'repHigh', 'restSec', 'startWeight', 'progression',
  'supersetNext', 'amrap', 'warmups', 'iso', 'adhoc', 'swappedFrom',
  'setWeights', 'setReps',
]

export function exerciseEntryFromLibrary(lib, overrides = {}) {
  const entry = {
    id: lib.id, name: lib.name, pattern: lib.pattern, regions: lib.regions,
    compound: lib.compound, load: lib.load !== false, cues: lib.cues,
    ladderId: lib.ladderId || null, nextId: lib.nextId || null, prevId: lib.prevId || null,
    hold: lib.hold || undefined, distance: lib.distance || undefined, unit: lib.unit || undefined,
  }
  for (const key of PROGRAM_FIELDS) {
    if (overrides[key] !== undefined) entry[key] = overrides[key]
  }
  return entry
}
