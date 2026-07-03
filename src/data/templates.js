// Ready-made programs users can load in one tap. Each is a full program
// skeleton (no id yet — addProgram assigns one on instantiation).
//
// Every template also carries plain-language guidance — level, who it's best
// for, how it progresses, and honest pros/cons — so people can make an informed
// choice. Those presentation-only fields are stripped on instantiation.
import { EXERCISE_BY_ID } from './exercises.js'

// Build a program-exercise entry from a library id, overriding the prescription.
// `reps` is a number or a [low, high] pair.
function ex(id, sets, reps, rest, startWeight = '') {
  const b = EXERCISE_BY_ID[id]
  if (!b) throw new Error(`template references unknown exercise: ${id}`)
  const [lo, hi] = Array.isArray(reps) ? reps : [reps, reps]
  return {
    id: b.id, name: b.name, pattern: b.pattern, regions: b.regions,
    compound: b.compound, load: b.load !== false, cues: b.cues,
    ladderId: b.ladderId || null, nextId: b.nextId || null, prevId: b.prevId || null,
    sets, repLow: lo, repHigh: hi, restSec: rest, startWeight,
  }
}

// GZCLP tier helpers — attach the authentic progression scheme to each lift.
const t1 = (id) => ({ ...ex(id, 5, 3, 180), amrap: true, progression: { scheme: 't1', stage: 0, weight: null } })
const t2 = (id) => ({ ...ex(id, 3, 10, 120), progression: { scheme: 't2', stage: 0, weight: null } })
const t3 = (id) => ({ ...ex(id, 3, 15, 90), amrap: true, progression: { scheme: 't3', stage: 0, weight: null } })

// Linear-progression helper (StrongLifts / Starting Strength): add weight every
// session you complete; auto-deload 10% after 3 misses in a row.
const lp = (id, sets, reps, rest) => ({ ...ex(id, sets, reps, rest), progression: { scheme: 'lp', weight: null, fails: 0 } })

// Greyskull-LP helper: last set is AMRAP; hit target → add weight, blow past it
// → double jump, miss → reset 10%.
const gslp = (id, sets, reps, rest) => ({ ...ex(id, sets, reps, rest), amrap: true, progression: { scheme: 'gslp', weight: null, fails: 0 } })

const day = (title, note, exercises) => ({
  title, note, weekday: null, dayLabel: title,
  regions: [...new Set(exercises.flatMap((e) => e.regions))],
  exercises,
})

export const TEMPLATES = [
  {
    templateId: 'starting_strength',
    name: 'Starting Strength',
    description: 'Mark Rippetoe’s classic novice barbell program. Three big lifts per session, 3×5, alternating two workouts — the fastest proven way to build base strength as a beginner.',
    tags: ['Barbell', 'Strength', 'Beginner'],
    level: 'Beginner',
    bestFor: 'Raw strength',
    equipment: 'Barbell, rack, bench',
    progressionInfo: 'Linear progression — add weight (≈5 lb upper, 10 lb lower) every session you hit all reps. Miss a lift 3 sessions in a row and it auto-deloads 10%.',
    pros: [
      'Low volume (3×5) is easy to recover from and quick to finish',
      'Whole-body each session — simple and proven for fast novice gains',
      'Teaches the core barbell lifts with lots of squat practice',
    ],
    cons: [
      'Very little direct back/arm work — not built for muscle size',
      'Heavy deadlifting every session wears some people down',
      'You’ll stall and need a new program within a few months',
    ],
    source: 'template',
    goals: ['strength'],
    schedule: { mode: 'rotation', trainingDays: [1, 3, 5] },
    days: [
      day('Workout A', 'Squat · Bench · Deadlift — 3×5, add weight each time.', [
        lp('back_squat', 3, 5, 180), lp('bench_press', 3, 5, 180), lp('deadlift', 1, 5, 180),
      ]),
      day('Workout B', 'Squat · Overhead Press · Deadlift.', [
        lp('back_squat', 3, 5, 180), lp('overhead_press', 3, 5, 180), lp('deadlift', 1, 5, 180),
      ]),
    ],
  },

  {
    templateId: 'stronglifts',
    name: 'StrongLifts 5×5',
    description: 'The internet’s most popular beginner barbell program. Five sets of five on the big lifts, two alternating workouts, add weight every session. Dead simple and very effective.',
    tags: ['Barbell', 'Strength', 'Beginner'],
    level: 'Beginner',
    bestFor: 'Strength + some size',
    equipment: 'Barbell, rack, bench',
    progressionInfo: 'Linear progression — +5 lb (upper) / +10 lb (lower) each session you hit 5×5. Three misses in a row triggers an automatic 10% deload.',
    pros: [
      'Extremely simple: same five lifts, just add weight',
      'High squat frequency drives fast beginner progress',
      '5×5 volume builds a bit more muscle than 3×5 programs',
    ],
    cons: [
      '5×5 squats three times a week gets brutal as the bar gets heavy',
      'Almost no arm or accessory work',
      'Most people stall within a couple of months and must switch',
    ],
    source: 'template',
    goals: ['strength', 'general'],
    schedule: { mode: 'rotation', trainingDays: [1, 3, 5] },
    days: [
      day('Workout A', 'Squat · Bench · Barbell Row — all 5×5.', [
        lp('back_squat', 5, 5, 180), lp('bench_press', 5, 5, 180), lp('barbell_row', 5, 5, 180),
      ]),
      day('Workout B', 'Squat · Overhead Press · Deadlift.', [
        lp('back_squat', 5, 5, 180), lp('overhead_press', 5, 5, 180), lp('deadlift', 1, 5, 180),
      ]),
    ],
  },

  {
    templateId: 'greyskull',
    name: 'Greyskull LP',
    description: 'John Sheaffer’s linear program with an AMRAP twist: the last set of each lift is “as many reps as possible,” so strong days earn bigger jumps. Includes arms — a favourite for lifters who also want to look the part.',
    tags: ['Barbell', 'Strength', 'Beginner'],
    level: 'Beginner–Intermediate',
    bestFor: 'Strength + size',
    equipment: 'Barbell, rack, bench, pull-up bar, dumbbells',
    progressionInfo: 'AMRAP linear progression — hit the target reps on the last set to add weight; double the target earns a double jump. Miss the target → reset 10% and build back.',
    pros: [
      'AMRAP last set lets good days earn double weight jumps',
      'Built-in 10% reset keeps you from grinding to a hard stall',
      'Adds chin-ups and curls, so arms aren’t neglected',
    ],
    cons: [
      'All-out AMRAP sets are taxing and need honest effort',
      'Still a linear program you’ll eventually outgrow',
      'Self-regulation means you have to push the AMRAP sets truthfully',
    ],
    source: 'template',
    goals: ['strength', 'size'],
    schedule: { mode: 'rotation', trainingDays: [1, 3, 5] },
    days: [
      day('Workout A', 'Bench & Squat (last set AMRAP) + chin-ups.', [
        gslp('bench_press', 3, 5, 180), gslp('back_squat', 3, 5, 180), ex('chinup', 3, [5, 10], 120),
      ]),
      day('Workout B', 'Press & Deadlift (last set AMRAP) + curls.', [
        gslp('overhead_press', 3, 5, 180), gslp('deadlift', 1, 5, 180), ex('db_curl', 3, [8, 12], 75),
      ]),
    ],
  },

  {
    templateId: 'gzclp',
    name: 'GZCLP',
    description: 'Cody Lefever’s GZCL Linear Progression — a barbell beginner program with smart built-in stage drops. T1 main lift 5×3+, T2 secondary 3×10, T3 accessory 3×15+, rotated across four workouts.',
    tags: ['Barbell', 'Strength', 'Beginner'],
    level: 'Beginner–Intermediate',
    bestFor: 'Strength with more volume',
    equipment: 'Barbell, rack, bench, lat pulldown (or cable), dumbbells',
    progressionInfo: 'Three-tier auto-progression: add weight on success; miss and it automatically drops you to an easier rep stage (5×3→6×2→10×1) at the same weight before resetting — so you rarely stall hard.',
    pros: [
      'Smart auto stage-drops mean fewer hard stalls than plain 5×5',
      'More total volume (three tiers) builds strength and some size',
      'Still only three sessions a week',
    ],
    cons: [
      'Needs a fairly full barbell gym (rack, bench, pulldown)',
      'More moving parts to learn than StrongLifts/Starting Strength',
      'Mostly strength-focused — limited direct arm work',
    ],
    source: 'template',
    goals: ['strength'],
    schedule: { mode: 'rotation', trainingDays: [1, 3, 5] },
    days: [
      day('A1 · Squat', 'T1 Squat 5×3+ · T2 Bench 3×10 · T3 Lat Pulldown 3×15+', [
        t1('back_squat'), t2('bench_press'), t3('lat_pulldown'),
      ]),
      day('B1 · OHP', 'T1 OHP 5×3+ · T2 Deadlift 3×10 · T3 Row 3×15+', [
        t1('overhead_press'), t2('deadlift'), t3('db_row'),
      ]),
      day('A2 · Bench', 'T1 Bench 5×3+ · T2 Squat 3×10 · T3 Lat Pulldown 3×15+', [
        t1('bench_press'), t2('back_squat'), t3('lat_pulldown'),
      ]),
      day('B2 · Deadlift', 'T1 Deadlift 5×3+ · T2 OHP 3×10 · T3 Row 3×15+', [
        t1('deadlift'), t2('overhead_press'), t3('db_row'),
      ]),
    ],
  },

  {
    templateId: 'reddit_ppl',
    name: 'Reddit PPL (Push / Pull / Legs)',
    description: 'The hugely popular r/Fitness “Metallicadpa” 6-day Push/Pull/Legs routine. High frequency and volume around the big lifts — one of the most recommended programs for building muscle once you’re past the true-beginner stage.',
    tags: ['Barbell', 'Hypertrophy', '6 days/wk'],
    level: 'Intermediate',
    bestFor: 'Muscle size',
    equipment: 'Full gym: barbell, rack, bench, dumbbells, cables/pulldown',
    progressionInfo: 'Double progression — work within each rep range; when you hit the top of the range on every set, add weight next time and start back near the bottom. Compounds add weight sooner, isolations chase reps.',
    pros: [
      'High frequency + volume — excellent for muscle growth',
      'Balanced: hits push, pull, and legs twice each per week',
      'Battle-tested by thousands of lifters on r/Fitness',
    ],
    cons: [
      'Six days a week is a serious time commitment',
      'Too much volume for a true beginner to recover from',
      'Demands good sleep and nutrition to keep up',
    ],
    source: 'template',
    goals: ['size', 'strength'],
    schedule: { mode: 'rotation', trainingDays: [1, 2, 3, 4, 5, 6] },
    days: [
      day('Push', 'Chest, shoulders & triceps.', [
        ex('bench_press', 4, [5, 8], 150),
        ex('overhead_press', 3, [8, 12], 120),
        ex('incline_db_press', 3, [8, 12], 90),
        ex('lateral_raise', 3, [12, 20], 60),
        ex('db_skullcrusher', 3, [8, 12], 75),
      ]),
      day('Pull', 'Back & biceps.', [
        ex('barbell_row', 4, [5, 8], 150),
        ex('pullup', 3, [6, 12], 120),
        ex('lat_pulldown', 3, [8, 12], 90),
        ex('seated_cable_row', 3, [8, 12], 90),
        ex('db_curl', 3, [8, 12], 60),
      ]),
      day('Legs', 'Quads, hamstrings & calves.', [
        ex('back_squat', 4, [5, 8], 180),
        ex('romanian_dl', 3, [8, 12], 120),
        ex('leg_press', 3, [10, 15], 90),
        ex('db_calf_raise', 4, [12, 20], 45),
      ]),
    ],
  },

  {
    templateId: 'phul',
    name: 'PHUL (Power Hypertrophy Upper Lower)',
    description: 'A 4-day “powerbuilding” split: two heavy power days for strength and two higher-rep hypertrophy days for size. A great intermediate step once linear programs stop working.',
    tags: ['Barbell', 'Powerbuilding', '4 days/wk'],
    level: 'Intermediate',
    bestFor: 'Strength + size',
    equipment: 'Full gym: barbell, rack, bench, dumbbells, cables/pulldown',
    progressionInfo: 'Double progression on every lift — heavy 3–5s on power days, 8–12s on hypertrophy days. Hit the top of the range on all sets, then add weight and reset to the bottom.',
    pros: [
      'Combines heavy strength work with higher-rep muscle work',
      'Only four days a week — friendlier schedule than 6-day PPL',
      'Upper/lower split gives each area good frequency and recovery',
    ],
    cons: [
      'Assumes you already know the lifts and your working weights',
      'Hypertrophy-day volume can be a lot to push through',
      'Needs a reasonably well-equipped gym',
    ],
    source: 'template',
    goals: ['strength', 'size'],
    schedule: { mode: 'rotation', trainingDays: [1, 2, 4, 5] },
    days: [
      day('Upper Power', 'Heavy upper-body strength.', [
        ex('bench_press', 4, [3, 5], 180),
        ex('barbell_row', 4, [5, 8], 150),
        ex('overhead_press', 3, [5, 8], 120),
        ex('lat_pulldown', 3, [6, 10], 90),
        ex('db_curl', 3, [6, 10], 60),
      ]),
      day('Lower Power', 'Heavy lower-body strength.', [
        ex('back_squat', 4, [3, 5], 180),
        ex('deadlift', 3, [3, 5], 180),
        ex('leg_press', 3, [10, 15], 90),
        ex('db_calf_raise', 4, [8, 12], 45),
      ]),
      day('Upper Hypertrophy', 'Higher-rep upper-body size work.', [
        ex('incline_db_press', 4, [8, 12], 90),
        ex('seated_cable_row', 4, [8, 12], 90),
        ex('lateral_raise', 3, [12, 20], 60),
        ex('db_skullcrusher', 3, [8, 12], 60),
        ex('db_curl', 3, [8, 12], 60),
      ]),
      day('Lower Hypertrophy', 'Higher-rep lower-body size work.', [
        ex('front_squat', 4, [8, 12], 120),
        ex('romanian_dl', 3, [8, 12], 90),
        ex('leg_press', 3, [12, 20], 75),
        ex('db_calf_raise', 4, [12, 20], 45),
      ]),
    ],
  },

  {
    templateId: 'climb_home',
    name: 'Climbing Strength (Home)',
    description: 'A rings-and-bar strength block for rock climbers, in the order coaches recommend: fingers and heavy pulling first while you’re fresh, core tension in the middle, and antagonist/prehab work last to keep elbows and shoulders healthy. Built around minimal home gear.',
    tags: ['Climbing', 'Rings', '2 days/wk'],
    level: 'Intermediate',
    bestFor: 'Rock climbing',
    equipment: 'Pull-up bar, gymnastic rings, one adjustable dumbbell',
    progressionInfo: 'Double progression on the pulls (build reps, then add a little weight); grow hang and lock-off times as they get easy. Long rests on finger and max-pull work — quality over fatigue.',
    pros: [
      'Trains what climbing needs — grip, lock-off strength, pulling power, core tension',
      'Balances hard pulling with antagonist push and forearm work to protect elbows',
      'Only needs a bar, rings, and one adjustable dumbbell',
    ],
    cons: [
      'Assumes healthy fingers — ease into the hangs, no maximal edges here',
      'No substitute for climbing itself; pair it with 1–2 climbing days a week',
      'Fingerboard-specific max strength still wants a hangboard (not included)',
    ],
    source: 'template',
    goals: ['climbing'],
    schedule: { mode: 'rotation', trainingDays: [1, 4] },
    days: [
      day('Pull & Fingers', 'Fingers and heavy pulling while fresh. Rest 2–3 min on the hard sets.', [
        ex('dead_hang', 5, [10, 15], 150),
        ex('weighted_pullup', 5, [3, 5], 150),
        ex('lock_off', 3, [5, 10], 120),
        ex('ring_row', 3, [8, 12], 90),
        ex('toes_to_bar', 3, [6, 12], 90),
        ex('ring_dip', 3, [8, 12], 90),
      ]),
      day('Power & Prehab', 'Explosive pulling, core tension, then forearm & shoulder prehab.', [
        ex('dead_hang', 6, [7, 10], 120),
        ex('pullup', 4, [5, 8], 120),
        ex('typewriter_pullup', 3, [4, 6], 120),
        ex('ring_support_hold', 3, [15, 30], 90),
        ex('hanging_leg_raise', 3, [8, 12], 75),
        ex('ring_pushup', 3, [8, 12], 75),
        ex('wrist_curl', 3, [12, 15], 60),
        ex('reverse_wrist_curl', 3, [12, 15], 60),
      ]),
    ],
  },

  {
    templateId: 'bw_foundations',
    name: 'Bodyweight Foundations',
    description: 'A full-body bodyweight routine done each training day, modelled on the r/bodyweightfitness Recommended Routine and standard calisthenics progression. Every move sits on a ladder — start where you are and step up to a harder variation as each gets easy. No weights: just a pull-up bar and something low to grip for rows.',
    tags: ['Bodyweight', 'Full body', 'Beginner'],
    level: 'Beginner',
    bestFor: 'General fitness, no weights',
    equipment: 'A pull-up bar, plus a low bar / rings / sturdy table to grip for rows. No weights needed.',
    progressionInfo: 'Two-stage progression: build reps within the range, then — once you own the top of the range on every set — the app offers a level-up to the next harder variation in that movement’s ladder (e.g. incline row → inverted row → feet-elevated row → one-arm row). Your strength keeps climbing without ever adding a plate.',
    pros: [
      'Genuinely no weights — a pull-up bar and a table to row under is enough',
      'Every exercise is on a ladder, so it scales from total beginner to advanced',
      'Balanced full body: squat, hinge, push, both pulls, and both core directions',
    ],
    cons: [
      'Loading the legs really hard is tricky with bodyweight alone',
      'Progress comes in bigger jumps between variations than adding a small plate',
      'Not the fastest route to maximal barbell strength',
    ],
    source: 'template',
    goals: ['general'],
    schedule: { mode: 'rotation', trainingDays: [1, 3, 5] },
    days: [
      day('Full Body', 'Same session each training day. When you own the top of the rep range on every set, the app offers the next harder variation.', [
        ex('bw_squat', 3, [8, 15], 90),
        ex('single_leg_glute_bridge', 3, [8, 12], 60),
        ex('pushup', 3, [8, 12], 90),
        ex('incline_row', 3, [8, 12], 90),
        ex('pull_negative', 3, [3, 6], 120),
        ex('lying_leg_raise', 3, [8, 15], 60),
        ex('plank', 3, [20, 45], 60),
      ]),
    ],
  },

  {
    templateId: 'bw_ppl',
    name: 'Bodyweight Push / Pull / Legs',
    description: 'A 3-day bodyweight split using the progression ladders — push, pull, and legs days that rotate across your week. Scales from beginner to one-arm push-ups and pistols.',
    tags: ['Bodyweight', 'Split', 'Intermediate'],
    level: 'Intermediate',
    bestFor: 'Muscle & skill, no gym',
    equipment: 'Pull-up bar, a bench/box',
    progressionInfo: 'Reps then variation — build reps within range, then the app suggests the next harder progression (e.g. toward one-arm push-ups and pistol squats).',
    pros: [
      'Split lets you target push, pull, and legs with just bodyweight',
      'Scales all the way to one-arm push-ups and pistol squats',
      'Minimal gear — a bar and a bench is plenty',
    ],
    cons: [
      'Lower-body loading is tricky without weights',
      'A 3-day split rewards consistency you have to commit to',
      'Not the most efficient path to maximal strength',
    ],
    source: 'template',
    goals: ['general'],
    schedule: { mode: 'rotation', trainingDays: [1, 3, 5] },
    days: [
      day('Push', 'Chest, shoulders & triceps.', [
        ex('pushup', 3, [6, 12], 90),
        ex('pike_pushup', 3, [5, 10], 90),
        ex('bench_dip', 3, [8, 12], 75),
        ex('diamond_pushup', 3, [6, 12], 75),
      ]),
      day('Pull', 'Back & biceps.', [
        ex('pull_negative', 4, [3, 6], 120),
        ex('incline_row', 3, [8, 12], 90),
        ex('feet_elev_row', 3, [6, 10], 90),
        ex('hanging_knee_raise', 3, [8, 12], 60),
      ]),
      day('Legs', 'Quads, hamstrings & calves.', [
        ex('bw_squat', 3, [10, 20], 90),
        ex('bulgarian_split', 3, [8, 12], 90),
        ex('single_leg_glute_bridge', 3, [10, 15], 60),
        ex('bw_calf_raise', 3, [12, 20], 45),
      ]),
    ],
  },

  {
    templateId: 'opm',
    name: 'One Punch Man Challenge',
    description: 'The legendary training routine of Saitama: 100 push-ups, 100 sit-ups, 100 squats, and a 10km run — every single day, no rest days. "Just 3 years of this and I became bald." Warning: this will be humbling.',
    tags: ['Bodyweight', 'Daily', 'Endurance'],
    level: 'All levels (brutal)',
    bestFor: 'Conditioning & willpower',
    equipment: 'None — just your body and your will',
    progressionInfo: 'No built-in overload — it’s a fixed daily challenge. Once 100 reps gets easy, the gains plateau; treat it as a conditioning streak, not a strength program.',
    pros: [
      'Dead simple, free, and needs zero equipment',
      'Builds serious work capacity, consistency, and discipline',
      'A genuinely fun challenge to test yourself against',
    ],
    cons: [
      'No progressive overload once 100 reps is easy — gains stall',
      'High daily volume with no rest days risks overuse injury',
      'Not optimal for building maximal strength or size',
    ],
    source: 'template',
    goals: ['endurance', 'general'],
    schedule: { mode: 'rotation', trainingDays: [0, 1, 2, 3, 4, 5, 6] },
    days: [
      day("Saitama's Training", '100 reps of each. Every day. No days off. Log your 10km run in the Cardio tab.', [
        ex('pushup', 10, 10, 30),
        ex('situp', 10, 10, 30),
        ex('bw_squat', 10, 10, 30),
        ex('run_10k', 1, 1, 0),
      ]),
    ],
  },
]

export const TEMPLATE_BY_ID = Object.fromEntries(TEMPLATES.map((t) => [t.templateId, t]))

// Presentation-only fields that shouldn't be stored on the instantiated program.
const TEMPLATE_META_FIELDS = ['templateId', 'description', 'tags', 'equipment', 'level', 'bestFor', 'progressionInfo', 'pros', 'cons']

// Deep-clone a template into a fresh program ready for addProgram().
export function instantiateTemplate(templateId) {
  const t = TEMPLATE_BY_ID[templateId]
  if (!t) return null
  const clone = JSON.parse(JSON.stringify(t))
  for (const f of TEMPLATE_META_FIELDS) delete clone[f]
  return { ...clone, createdAt: new Date().toISOString() }
}
