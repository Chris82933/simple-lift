// Calisthenics "skill tree" — a parallel track to the program-based workouts.
// Each skill is an ordered path of levels (easy → hard). Rep skills advance when
// you hit a rep target; hold skills when you hit a hold-time (seconds) target.
// A calibration benchmark maps your current ability to the right starting level.
//
// Every skill feeds one RPG "stat"; those stats drive the radar/character sheet.
// This whole file is self-contained so it never touches the program engine.

// Radar axes.
export const STATS = [
  { id: 'pull', label: 'Pull' },
  { id: 'push', label: 'Push' },
  { id: 'core', label: 'Core' },
  { id: 'legs', label: 'Legs' },
  { id: 'balance', label: 'Balance' },
]

// lvl(name, pattern, target, goalLabel, cues, calMin)
//  - target  : reps or seconds needed to advance to the next level
//  - calMin  : benchmark value at/above which calibration starts you here
const lvl = (name, pattern, target, goalLabel, cues, calMin) =>
  ({ name, pattern, target, goalLabel, cues, calMin })

export const SKILLS = [
  {
    id: 'pullup', name: 'Pull-Up', emoji: '🆙', stat: 'pull', type: 'reps', unit: 'reps',
    benchmark: 'How many strict pull-ups can you do in one set?',
    levels: [
      lvl('Negative Pull-Up', 'vert_pull', 5, '3×5 slow negatives (3–5s)', 'Jump to the top, lower as slowly as you can.', 0),
      lvl('Full Pull-Up', 'vert_pull', 8, '3×8 clean reps', 'Full hang to chin over the bar, no kipping.', 1),
      lvl('Archer Pull-Up', 'vert_pull', 5, '3×5 each side', 'Pull to one hand, other arm straight out for assist.', 8),
      lvl('One-Arm Pull-Up', 'vert_pull', 1, '1 clean rep each side', 'One hand on the bar, full pull. The peak — be patient.', 15),
    ],
  },
  {
    id: 'front_lever', name: 'Front Lever', emoji: '🛟', stat: 'pull', type: 'hold', unit: 'sec',
    benchmark: 'Longest tuck front-lever hold, in seconds? (0 if none)',
    levels: [
      lvl('Tuck Front Lever', 'vert_pull', 20, '2×20s hold', 'Hang, pull hips up, tuck knees tight, body horizontal.', 0),
      lvl('Advanced Tuck', 'vert_pull', 15, '2×15s hold', 'Open the knees to ~90° — longer lever, harder.', 20),
      lvl('Straddle Front Lever', 'vert_pull', 12, '2×12s hold', 'Legs straight and wide; keep the whole body level.', 35),
      lvl('Full Front Lever', 'vert_pull', 10, '2×10s hold', 'Legs together, body a straight horizontal line.', 55),
    ],
  },
  {
    id: 'pushup', name: 'Push-Up', emoji: '🙇', stat: 'push', type: 'reps', unit: 'reps',
    benchmark: 'How many full push-ups can you do in one set?',
    levels: [
      lvl('Incline Push-Up', 'horiz_push', 12, '3×12 reps', 'Hands on a bench/counter; the higher, the easier.', 0),
      lvl('Full Push-Up', 'horiz_push', 20, '3×20 clean reps', 'Straight line head-to-heels, chest to the floor.', 1),
      lvl('Pseudo-Planche Push-Up', 'horiz_push', 8, '3×8 reps', 'Hands by the hips, lean forward over them.', 20),
      lvl('One-Arm Push-Up', 'horiz_push', 3, '3×3 each side', 'Feet wide, one hand down, brace hard against the twist.', 35),
    ],
  },
  {
    id: 'planche', name: 'Planche', emoji: '🤸', stat: 'push', type: 'hold', unit: 'sec',
    benchmark: 'Longest planche-lean hold, in seconds? (0 if none)',
    levels: [
      lvl('Planche Lean', 'vert_push', 30, '2×30s lean', 'Hands by hips, lean forward until shoulders pass your hands.', 0),
      lvl('Tuck Planche', 'vert_push', 15, '2×15s hold', 'Lean and lift the feet, knees tucked, hips high.', 30),
      lvl('Advanced Tuck Planche', 'vert_push', 12, '2×12s hold', 'Open the hips so the back flattens out.', 50),
      lvl('Straddle Planche', 'vert_push', 8, '2×8s hold', 'Legs straight and wide, body parallel to the floor.', 70),
    ],
  },
  {
    id: 'lsit', name: 'L-Sit', emoji: '📐', stat: 'core', type: 'hold', unit: 'sec',
    benchmark: 'Longest L-sit hold, in seconds? (0 if none)',
    levels: [
      lvl('Foot-Supported L-Sit', 'core', 30, '3×30s', 'Hands down, feet lightly on the floor, press shoulders down.', 0),
      lvl('Tuck L-Sit', 'core', 20, '3×20s', 'Lift off, knees tucked to the chest, hips up.', 8),
      lvl('One-Leg L-Sit', 'core', 15, '3×15s each', 'One leg straight out, the other tucked.', 18),
      lvl('Full L-Sit', 'core', 15, '3×15s', 'Both legs straight and level — support fully off the floor.', 28),
    ],
  },
  {
    id: 'hollow', name: 'Hollow Body', emoji: '🌙', stat: 'core', type: 'hold', unit: 'sec',
    benchmark: 'Longest hollow-body hold, in seconds? (0 if none)',
    levels: [
      lvl('Tuck Hollow Hold', 'core', 30, '3×30s', 'Low back glued down, knees tucked, shoulders off the floor.', 0),
      lvl('Hollow Hold', 'core', 30, '3×30s', 'Legs straight and low, arms by your sides, back flat.', 15),
      lvl('Arms-Overhead Hollow', 'core', 30, '3×30s', 'Arms reach past your head — the full banana shape.', 30),
    ],
  },
  {
    id: 'pistol', name: 'Pistol Squat', emoji: '🦵', stat: 'legs', type: 'reps', unit: 'reps',
    benchmark: 'Full pistol squats per leg? (0 if none)',
    levels: [
      lvl('Assisted Pistol', 'squat', 8, '3×8 each (holding support)', 'Hold a rail/TRX, sit all the way down on one leg.', 0),
      lvl('Full Pistol Squat', 'squat', 5, '3×5 each leg', 'One-leg squat, other leg out front, stand under control.', 1),
      lvl('Weighted Pistol', 'squat', 5, '3×5 each + weight', 'Hold a dumbbell/plate at the chest for extra load.', 5),
    ],
  },
  {
    id: 'handstand', name: 'Handstand', emoji: '🤾', stat: 'balance', type: 'hold', unit: 'sec',
    benchmark: 'Longest wall handstand hold, in seconds? (0 if none)',
    levels: [
      lvl('Wall Handstand', 'vert_push', 45, '2×45s (belly to wall)', 'Kick up facing the wall, straight line, push tall.', 0),
      lvl('Freestanding Kick-Up', 'vert_push', 10, '2×10s balance', 'Kick up away from the wall; find balance with the fingers.', 30),
      lvl('Freestanding Handstand', 'vert_push', 30, '2×30s free hold', 'Steady, tall, no wall — small finger/wrist corrections.', 60),
    ],
  },
]

export const SKILL_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s]))

export const maxIndex = (skill) => skill.levels.length - 1

// Map a benchmark value to the best starting level index.
export function calibrateLevel(skill, value) {
  const v = Number(value) || 0
  let idx = 0
  skill.levels.forEach((l, i) => { if (v >= (l.calMin ?? 0)) idx = i })
  return idx
}

// Has a logged best met the current level's advance target?
export function readyToAdvance(skill, levelIndex, best) {
  if (levelIndex >= maxIndex(skill)) return false
  return (Number(best) || 0) >= skill.levels[levelIndex].target
}

// ---- RPG stats from the skills store ({ [skillId]: { level } }) ----
export function computeStats(state = {}) {
  const sum = {}
  const count = {}
  for (const sk of SKILLS) {
    const lv = state[sk.id]?.level ?? 0
    const denom = sk.levels.length - 1
    const prog = denom > 0 ? lv / denom : (lv > 0 ? 1 : 0)
    sum[sk.stat] = (sum[sk.stat] || 0) + prog
    count[sk.stat] = (count[sk.stat] || 0) + 1
  }
  return STATS.map((s) => ({
    id: s.id,
    label: s.label,
    value: Math.round((100 * (sum[s.id] || 0)) / (count[s.id] || 1)),
  }))
}

export const powerLevel = (stats) =>
  Math.round(stats.reduce((a, s) => a + s.value, 0) / (stats.length || 1))

const RANKS = [
  [0, 'Novice'], [16, 'Apprentice'], [36, 'Adept'],
  [56, 'Warrior'], [76, 'Elite'], [91, 'Master'],
]
export function rankFor(power) {
  let name = 'Novice'
  for (const [min, label] of RANKS) if (power >= min) name = label
  return name
}
