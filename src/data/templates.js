// Ready-made programs users can load in one tap. Each is a full program
// skeleton (no id yet — addProgram assigns one on instantiation).
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

const day = (title, note, exercises) => ({
  title, note, weekday: null, dayLabel: title,
  regions: [...new Set(exercises.flatMap((e) => e.regions))],
  exercises,
})

export const TEMPLATES = [
  {
    templateId: 'opm',
    name: 'One Punch Man Challenge',
    description: 'The legendary training routine of Saitama: 100 push-ups, 100 sit-ups, 100 squats, and a 10km run — every single day, no rest days. "Just 3 years of this and I became bald." Warning: this will be humbling.',
    tags: ['Bodyweight', 'Daily', 'Endurance'],
    equipment: 'None — just your body and your will',
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

  {
    templateId: 'gzclp',
    name: 'GZCLP',
    description: 'Cody Lefever’s GZCL Linear Progression — a barbell beginner program. 4 workouts rotated across your training days. T1 main lift 5×3+, T2 secondary 3×10, T3 accessory 3×15+.',
    tags: ['Barbell', 'Strength', '3 days/wk'],
    equipment: 'Barbell, rack, bench, lat pulldown (or cable), dumbbells',
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
    templateId: 'bw_foundations',
    name: 'Bodyweight Foundations',
    description: 'A full-body bodyweight routine done on each training day, built on progression ladders — start where you are and move up a level as each gets easy. Great with just a pull-up bar.',
    tags: ['Bodyweight', 'Full body', 'Beginner'],
    equipment: 'Pull-up bar (recommended), a sturdy table/bar for rows',
    source: 'template',
    goals: ['general'],
    schedule: { mode: 'rotation', trainingDays: [1, 3, 5] },
    days: [
      day('Full Body', 'Same session each training day. Progress a level when it feels easy.', [
        ex('bw_squat', 3, [8, 12], 90),
        ex('pushup', 3, [5, 12], 90),
        ex('pull_negative', 3, [3, 6], 120),
        ex('incline_row', 3, [8, 12], 90),
        ex('single_leg_glute_bridge', 3, [8, 12], 60),
        ex('plank', 3, [20, 45], 60),
      ]),
    ],
  },

  {
    templateId: 'bw_ppl',
    name: 'Bodyweight Push / Pull / Legs',
    description: 'A 3-day bodyweight split using the progression ladders — push, pull, and legs days that rotate across your week. Scales from beginner to one-arm push-ups and pistols.',
    tags: ['Bodyweight', 'Split', 'Intermediate'],
    equipment: 'Pull-up bar, a bench/box',
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
]

export const TEMPLATE_BY_ID = Object.fromEntries(TEMPLATES.map((t) => [t.templateId, t]))

// Deep-clone a template into a fresh program ready for addProgram().
export function instantiateTemplate(templateId) {
  const t = TEMPLATE_BY_ID[templateId]
  if (!t) return null
  const clone = JSON.parse(JSON.stringify(t))
  delete clone.templateId
  delete clone.description
  delete clone.tags
  delete clone.equipment
  return { ...clone, createdAt: new Date().toISOString() }
}
