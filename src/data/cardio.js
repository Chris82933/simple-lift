// Cardio machine / activity types for logging.
// A single monochrome pulse glyph (Icon name="cardio") stands in for every
// machine — no per-machine emoji. `color` still tints charts/legends.
export const CARDIO_MACHINES = [
  { id: 'treadmill', name: 'Treadmill', color: '#38bdf8', distance: true },
  { id: 'elliptical', name: 'Elliptical', color: '#a78bfa', distance: true },
  { id: 'stairs', name: 'Stair Stepper', color: '#fb923c', distance: false },
  { id: 'bike', name: 'Stationary Bike', color: '#4ade80', distance: true },
  { id: 'rower', name: 'Rowing Machine', color: '#f472b6', distance: true },
  { id: 'run', name: 'Outdoor Run', color: '#22d3ee', distance: true },
  { id: 'walk', name: 'Walk / Hike', color: '#fbbf24', distance: true },
  { id: 'jump_rope', name: 'Jump Rope', color: '#fb7185', distance: false },
  { id: 'other', name: 'Other', color: '#94a3b8', distance: true },
]

export const CARDIO_BY_ID = Object.fromEntries(CARDIO_MACHINES.map((m) => [m.id, m]))

// Muscles each kind of cardio works — primary and secondary, the same shape
// the exercise library uses — so logged cardio shows up on the session's
// muscle map and share card. 'other' is unknown, so it credits nothing.
const M = (primary, secondary = []) => ({ primary, secondary })
export const CARDIO_MUSCLES = {
  treadmill: M(['quads', 'hamstrings', 'glutes', 'calves'], ['core']),
  run: M(['quads', 'hamstrings', 'glutes', 'calves'], ['core']),
  walk: M(['quads', 'glutes', 'calves'], ['hamstrings']),
  elliptical: M(['quads', 'glutes', 'hamstrings'], ['calves', 'chest', 'lats', 'shoulders']),
  stairs: M(['glutes', 'quads', 'calves'], ['hamstrings']),
  bike: M(['quads', 'glutes'], ['hamstrings', 'calves']),
  rower: M(['lats', 'quads', 'glutes'], ['hamstrings', 'traps', 'biceps', 'core', 'lower_back']),
  jump_rope: M(['calves'], ['quads', 'shoulders', 'forearms']),
}
