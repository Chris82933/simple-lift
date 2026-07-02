// Calisthenics "skill tree" — a parallel track to the program-based workouts.
// Each skill is an ordered path of levels (easy → hard). Every level carries a
// working prescription — sets × a rep range, or sets × a hold-time range —
// following conventions common to r/bodyweightfitness's Recommended Routine and
// Steven Low's "Overcoming Gravity":
//   • strength rep work: 3 sets of 5–8 reps; advance the variant at 3×8
//   • foundational rep work: 3 sets of 8–12
//   • hard static holds: 3 sets of ~5–15s; advance around the top of the range
//   • accessible holds: 3 sets of ~20–45s
// A calibration benchmark maps your current ability to the right starting level.
// Each skill feeds one RPG "stat" that drives the radar / character sheet.

// Radar axes.
export const STATS = [
  { id: 'pull', label: 'Pull' },
  { id: 'push', label: 'Push' },
  { id: 'core', label: 'Core' },
  { id: 'legs', label: 'Legs' },
  { id: 'balance', label: 'Balance' },
]

// lv(name, cues, sets, lo, hi, calMin)
//  - lo..hi : working range (reps, or seconds for hold skills)
//  - hi     : the top of the range — hit it across all sets to advance
//  - calMin : benchmark value at/above which calibration starts you here
const lv = (name, cues, sets, lo, hi, calMin) => ({ name, cues, sets, lo, hi, calMin })

export const SKILLS = [
  {
    id: 'pullup', name: 'Pull-Up', stat: 'pull', type: 'reps', unit: 'reps',
    benchmark: 'How many strict pull-ups can you do in one set?',
    levels: [
      lv('Scapular Pull', 'Hang, then pull the shoulder blades down without bending the elbows.', 3, 8, 12, 0),
      lv('Negative Pull-Up', 'Jump to the top, lower as slowly as you can (aim 3–5s).', 3, 4, 6, 0),
      lv('Band-Assisted Pull-Up', 'Loop a band under the knee/foot; full range, chin over the bar.', 3, 6, 10, 0),
      lv('Full Pull-Up', 'Dead hang to chin over the bar, no kipping.', 3, 5, 8, 1),
      lv('Archer Pull-Up', 'Pull to one hand, other arm straight out for assist. Reps each side.', 3, 4, 6, 8),
      lv('One-Arm Pull-Up', 'Assisted → free one-arm pull. Reps each side. Years in the making.', 3, 2, 4, 14),
    ],
  },
  {
    id: 'front_lever', name: 'Front Lever', stat: 'pull', type: 'hold', unit: 'sec',
    benchmark: 'Longest tuck front-lever hold, in seconds? (0 if none)',
    levels: [
      lv('Tuck Front Lever', 'Hang, pull hips up, knees tucked tight, body horizontal.', 3, 10, 20, 0),
      lv('Advanced Tuck', 'Open the knees toward ~90° — longer lever, harder.', 3, 8, 15, 18),
      lv('One-Leg Front Lever', 'One leg extended straight, the other tucked.', 3, 8, 12, 35),
      lv('Straddle Front Lever', 'Legs straight and wide; whole body level.', 3, 6, 12, 45),
      lv('Full Front Lever', 'Legs together, body a straight horizontal line.', 3, 5, 10, 60),
    ],
  },
  {
    id: 'pushup', name: 'Push-Up', stat: 'push', type: 'reps', unit: 'reps',
    benchmark: 'How many full push-ups can you do in one set?',
    levels: [
      lv('Wall Push-Up', 'Hands on a wall, lean in and press — the gentlest start.', 3, 10, 15, 0),
      lv('Incline Push-Up', 'Hands on a bench/counter; the higher, the easier.', 3, 8, 12, 0),
      lv('Knee Push-Up', 'Full form from the knees; straight line knee-to-head.', 3, 8, 12, 0),
      lv('Full Push-Up', 'Straight line head-to-heels, chest to the floor.', 3, 8, 15, 1),
      lv('Diamond Push-Up', 'Hands together under the chest, elbows tight.', 3, 6, 12, 18),
      lv('Decline Push-Up', 'Feet elevated; more load to the shoulders and upper chest.', 3, 8, 12, 25),
      lv('Pseudo-Planche Push-Up', 'Hands by the hips, lean forward over them.', 3, 5, 10, 35),
      lv('Archer Push-Up', 'Shift over one arm, the other straight out. Reps each side.', 3, 5, 8, 45),
      lv('One-Arm Push-Up', 'Feet wide, one hand down, brace hard against the twist.', 3, 3, 5, 55),
    ],
  },
  {
    id: 'planche', name: 'Planche', stat: 'push', type: 'hold', unit: 'sec',
    benchmark: 'Longest planche-lean hold, in seconds? (0 if none)',
    levels: [
      lv('Frog Stand', 'Balance the knees on the elbows, feet off the floor.', 3, 20, 40, 0),
      lv('Planche Lean', 'Hands by hips, lean forward until shoulders pass the hands.', 3, 15, 30, 0),
      lv('Tuck Planche', 'From the lean, lift the feet; knees tucked, hips high.', 3, 8, 15, 25),
      lv('Advanced Tuck Planche', 'Open the hips so the back flattens out.', 3, 8, 12, 45),
      lv('Straddle Planche', 'Legs straight and wide, body parallel to the floor.', 3, 5, 10, 65),
    ],
  },
  {
    id: 'lsit', name: 'L-Sit', stat: 'core', type: 'hold', unit: 'sec',
    benchmark: 'Longest L-sit hold, in seconds? (0 if none)',
    levels: [
      lv('Foot-Supported L-Sit', 'Hands down, feet lightly on the floor, press shoulders down.', 3, 20, 30, 0),
      lv('Tuck L-Sit', 'Lift off, knees tucked to the chest, hips up.', 3, 15, 30, 0),
      lv('One-Leg L-Sit', 'One leg straight out, the other tucked.', 3, 10, 20, 10),
      lv('Full L-Sit', 'Both legs straight and level, fully off the floor.', 3, 10, 20, 18),
      lv('V-Sit', 'Lift the straight legs above parallel toward a V.', 3, 5, 15, 35),
    ],
  },
  {
    id: 'hollow', name: 'Hollow Body', stat: 'core', type: 'hold', unit: 'sec',
    benchmark: 'Longest hollow-body hold, in seconds? (0 if none)',
    levels: [
      lv('Tuck Hollow Hold', 'Low back glued down, knees tucked, shoulders off the floor.', 3, 20, 30, 0),
      lv('One-Leg Hollow', 'One leg extended low, the other tucked; back flat.', 3, 20, 30, 0),
      lv('Hollow Hold', 'Both legs straight and low, arms by your sides.', 3, 20, 40, 18),
      lv('Arms-Overhead Hollow', 'Arms reach past the head — the full banana.', 3, 20, 45, 35),
    ],
  },
  {
    id: 'pistol', name: 'Pistol Squat', stat: 'legs', type: 'reps', unit: 'reps',
    benchmark: 'Full pistol squats per leg? (0 if none)',
    levels: [
      lv('Box Pistol', 'Sit to a box/bench on one leg, stand back up. Reps each leg.', 3, 5, 8, 0),
      lv('Assisted Pistol', 'Hold a rail/TRX, sit all the way down on one leg. Each leg.', 3, 5, 8, 0),
      lv('Full Pistol Squat', 'One-leg squat, other leg out front, stand under control. Each leg.', 3, 5, 8, 1),
      lv('Weighted Pistol', 'Hold a dumbbell/plate at the chest for extra load. Each leg.', 3, 5, 8, 6),
    ],
  },
  {
    id: 'handstand', name: 'Handstand', stat: 'balance', type: 'hold', unit: 'sec',
    benchmark: 'Longest wall handstand hold, in seconds? (0 if none)',
    levels: [
      lv('Wall Pike Hold', 'Feet on a low box, hips over shoulders, press tall.', 3, 30, 45, 0),
      lv('Chest-to-Wall Handstand', 'Walk up facing the wall, straight line, shoulders shrugged.', 3, 20, 40, 0),
      lv('Wall Handstand', 'Kick up back-to-wall; hold a tall, straight line.', 3, 30, 60, 15),
      lv('Freestanding Kick-Up', 'Kick up away from the wall; find balance on the fingers.', 3, 5, 15, 35),
      lv('Freestanding Handstand', 'Steady, tall, no wall — small finger/wrist corrections.', 3, 15, 30, 55),
    ],
  },
]

export const SKILL_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s]))

export const maxIndex = (skill) => skill.levels.length - 1

// The working plan for a level, e.g. "3 sets × 5–8 reps" / "3 sets × 10–20s hold".
export function planLabel(skill, level) {
  const u = skill.type === 'hold' ? 's' : ''
  const range = level.lo === level.hi ? `${level.hi}${u}` : `${level.lo}–${level.hi}${u}`
  return `${level.sets} sets × ${range}${skill.type === 'hold' ? ' hold' : ' reps'}`
}
// The advance threshold, e.g. "3×8" / "3×20s".
export function advanceLabel(skill, level) {
  return `${level.sets}×${level.hi}${skill.type === 'hold' ? 's' : ''}`
}

// Map a benchmark value to the best starting level index (highest calMin ≤ value).
export function calibrateLevel(skill, value) {
  const v = Number(value) || 0
  let idx = 0
  skill.levels.forEach((l, i) => { if (v >= (l.calMin ?? 0)) idx = i })
  return idx
}

// Has a logged best met the current level's advance target (top of the range)?
export function readyToAdvance(skill, levelIndex, best) {
  if (levelIndex >= maxIndex(skill)) return false
  return (Number(best) || 0) >= skill.levels[levelIndex].hi
}

// ---- RPG stats from the skills store ({ [skillId]: { level, baseline } }) ----
// `key` selects which snapshot to read: 'level' (current) or 'baseline' (start).
export function computeStats(state = {}, key = 'level') {
  const sum = {}
  const count = {}
  for (const sk of SKILLS) {
    const lvl = state[sk.id]?.[key] ?? 0
    const denom = sk.levels.length - 1
    const prog = denom > 0 ? lvl / denom : (lvl > 0 ? 1 : 0)
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
