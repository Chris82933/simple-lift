// Bone Strength — a program for women to maintain (and often improve) bone
// mineral density, generated from two answers: training experience and how
// much time is available each week.
//
// The backbone is the LIFTMOR protocol (Watson et al., J Bone Miner Res 2018):
// twice a week, about 30 minutes — deadlift, overhead press alternated with an
// impact move, squat — built up from a technique phase to 5 × 5 at 80–85% of
// a one-rep max. In postmenopausal women with low bone mass it raised lumbar
// spine BMD 2.9% over 8 months while the control group lost 1.2%, and it was
// safe under supervision. Around that core, this file adds what the expert
// guidance asks for and the trial left out:
//   • ~50 impacts a session (Royal Osteoporosis Society "Strong, Steady and
//     Straight", Brooke-Wavell et al., BJSM 2022)
//   • balance work at least twice a week (ROS; Too Fit To Fracture,
//     Giangregorio et al., Osteoporos Int 2014/2015)
//   • back-extensor holds for posture (ROS; Too Fit To Fracture)
//   • no loaded spinal flexion or twisting — no crunches or sit-ups; core work
//     is planks and anti-rotation instead.
//
// What the answers change:
//   experience → which variation of each lift (dumbbell/goblet → trap bar →
//                barbell), which impact move, and which PHASE to start in
//   time       → 2 or 3 sessions a week, and how much accessory, balance and
//                posture work fits around the three main lifts
//   phase      → sets × reps of the main lifts (technique → build → strength)
import { EXERCISE_BY_ID } from './exercises.js'
import { exerciseEntryFromLibrary } from '../lib/exerciseEntry.js'

export const BONE_DISCLAIMER =
  'General guidance, not medical advice. If you have osteoporosis, a past spine (vertebral) fracture, any fracture in the last year, or fall often, get clearance from your doctor or a physiotherapist first — and ideally have someone coach your technique before lifting heavy. In the research this program is based on, heavy sessions were supervised. Stop any exercise that causes pain, and don\u2019t add weight while any ache lasts more than a day. If jumping or impact causes leaking, a pelvic-floor physiotherapist can help — use the gentlest impact option meanwhile. This program works alongside any bone medication you take, not instead of it.'

// The short version carried on every workout day — the full note lives on the
// setup page, where it is read once rather than scrolled past every session.
export const BONE_DAY_SAFETY = 'Warm up for 5 minutes first (march, bodyweight squats and hinges). Stop anything that hurts. Full safety note: Plans → Bone Strength.'

export const BONE_LEVELS = [
  {
    id: 'new',
    label: 'New to lifting',
    detail: 'Little or no weight training. Starts with dumbbells and the gentlest impact, and spends the first weeks learning technique.',
    startPhase: 1,
  },
  {
    id: 'some',
    label: 'Some experience',
    detail: 'Six months to two years of regular lifting. Uses a trap bar and barbell, low jumps for impact, and starts in the build phase.',
    startPhase: 2,
  },
  {
    id: 'experienced',
    label: 'Experienced',
    detail: 'Two years or more, comfortable with barbell squats and deadlifts. The full LIFTMOR protocol from the start: 5 × 5 heavy, with jumping chin-up landings.',
    startPhase: 3,
  },
]

export const BONE_TIMES = [
  { id: '2x30', label: '2 short sessions a week', detail: 'The trial protocol plus a few minutes of balance and back work: about 25 minutes while learning, 45–50 once the weights are heavy (warm-up sets take time). Add the daily home routine on other days if you can.', days: 2, minutes: 45 },
  { id: '2x45', label: '2 sessions of about 45–60 min', detail: 'The same core plus a supported row, balance and back work — and single-leg and core work while the weights are still light.', days: 2, minutes: 55 },
  { id: '3x60', label: '3 sessions of about 45–65 min', detail: 'Two heavy days plus a lighter day for single-leg strength, carries and a balance circuit.', days: 3, minutes: 60 },
]

export const BONE_PHASES = {
  1: { label: 'Technique', sets: 3, low: 8, high: 10, effort: 'Easy to moderate — finish every set feeling you could do 4–5 more reps.', advance: 'After about 3–4 weeks, when every rep looks the same as the first, move to Phase 2.' },
  2: { label: 'Build', sets: 3, low: 6, high: 8, effort: 'Moderately hard — 2–3 reps left in the tank at the end of each set.', advance: 'After about 4 weeks, when all sets reach 8 reps with good form, move to Phase 3.' },
  3: { label: 'Strength', sets: 5, low: 5, high: 5, effort: 'Hard but clean — 1–2 reps in reserve. This is the trial dose: about 80–85% of a one-rep max or more.', advance: 'Stay here. Add the smallest weight jump when all 5 × 5 are clean; if form breaks down, drop 10% and build back up. Every 6–8 weeks take an easier week at about 80% of your working weights.' },
}

// Which variation of each slot to use at each level. `alts` is the ordered
// fallback when the gym (or home) doesn't have the kit — the workout swaps in
// the first one available.
const LIFTS = {
  new: {
    hinge: { id: 'trap_bar_deadlift', alts: ['deadlift', 'kb_deadlift', 'db_rdl'] },
    press: { id: 'db_shoulder_press', alts: ['overhead_press'] },
    squat: { id: 'goblet_squat', alts: ['bw_squat'] },
    impactA: { id: 'heel_drop' },
    impactB: { id: 'stomp' },
    row: { id: 'db_row', alts: ['seated_cable_row'] },
  },
  some: {
    hinge: { id: 'trap_bar_deadlift', alts: ['deadlift', 'kb_deadlift', 'db_rdl'] },
    press: { id: 'overhead_press', alts: ['db_shoulder_press'] },
    squat: { id: 'back_squat', alts: ['goblet_squat'] },
    impactA: { id: 'pogo_jump' },
    impactB: { id: 'stomp' },
    row: { id: 'db_row', alts: ['chest_supported_row', 'seated_cable_row'] },
  },
  experienced: {
    hinge: { id: 'deadlift', alts: ['trap_bar_deadlift', 'kb_deadlift'] },
    press: { id: 'overhead_press', alts: ['db_shoulder_press'] },
    squat: { id: 'back_squat', alts: ['front_squat', 'goblet_squat'] },
    impactA: { id: 'jump_chinup_drop', alts: ['pogo_jump'] },
    impactB: { id: 'pogo_jump' },
    // Chest-supported, not bent-over: a long loaded bent-over hold is exactly
    // the sustained flexed-spine position to avoid with low bone density.
    row: { id: 'chest_supported_row', alts: ['db_row', 'seated_cable_row'] },
  },
}

function entry(id, rx, extra = {}) {
  const lib = EXERCISE_BY_ID[id]
  if (!lib) throw new Error(`Unknown exercise in the bone-density program: ${id}`)
  return {
    ...exerciseEntryFromLibrary(lib, {
      sets: rx.sets, repLow: rx.low, repHigh: rx.high, restSec: rx.rest, startWeight: '',
      warmups: extra.warmups, supersetNext: extra.supersetNext,
      // Impact, balance and posture work is a fixed dose, not something to add
      // weight to — keep progression suggestions off it.
      rehab: extra.rehab,
    }),
    ...(extra.alts ? { alts: extra.alts } : {}),
  }
}

// The main-lift prescription for this phase. Rest is what makes the time
// budget. LIFTMOR fitted its heavy lifts into 30-minute sessions; the 30-minute
// option keeps rests short to match, and the longer options rest longer for the
// heavy 5 × 5 rather than doing more sets.
const REST = {
  '2x30': { 1: 60, 2: 60, 3: 60 },
  '2x45': { 1: 75, 2: 75, 3: 75 },
  '3x60': { 1: 90, 2: 90, 3: 90 },
}
const mainRx = (phase, time) => {
  const p = BONE_PHASES[phase]
  return { sets: p.sets, low: p.low, high: p.high, rest: REST[time][phase] }
}

// Impact for anyone with a spine fracture or several low-trauma fractures:
// no jumps, no landings. The ROS consensus says to keep impact to about brisk
// walking for them; marching in place is that, indoors and countable.
const LOW_IMPACT = { impactA: { id: 'marching' }, impactB: { id: 'marching' } }

// The LIFTMOR core: hinge → press (+ impact) → squat.
function heavyCore(level, phase, time, impactKey, lowImpact) {
  const L = LIFTS[level]
  const rx = mainRx(phase, time)
  const impact = (lowImpact ? LOW_IMPACT : L)[impactKey]
  // 5 × 10 = 50 impacts (ROS). Jumping chin-up landings are 5 × 5 as in the
  // trial; extra stomps after the squat bring that day up to ~50 as well.
  // Marching is 5 × 20 steps — walking-level loading, by design.
  const impactRx = impact.id === 'jump_chinup_drop' ? { sets: 5, low: 5, high: 5, rest: 30 }
    : impact.id === 'marching' ? { sets: 5, low: 20, high: 20, rest: 20 }
      : { sets: 5, low: 10, high: 10, rest: 30 }
  // Every heavy lift gets ramp-up sets once the weights are real (phase 2+).
  const warm = phase > 1 ? true : undefined
  // Press and impact alternate, as in the trial, when their set counts match
  // (the 5 × 5 phase). Earlier, 3 press sets against 5 impact sets would make
  // "alternate these" wrong, so the impact follows as its own block.
  const pair = rx.sets === impactRx.sets
  const out = [
    entry(L.hinge.id, rx, { alts: L.hinge.alts, warmups: warm }),
    entry(L.press.id, rx, { alts: L.press.alts, warmups: warm, supersetNext: pair ? true : undefined }),
    entry(impact.id, impactRx, { alts: impact.alts, rehab: true }),
    entry(L.squat.id, rx, { alts: L.squat.alts, warmups: warm }),
  ]
  if (impact.id === 'jump_chinup_drop') out.push(entry('stomp', { sets: 3, low: 10, high: 10, rest: 20 }, { rehab: true }))
  return out
}

const posture = () => entry('prone_back_extension_hold', { sets: 3, low: 5, high: 10, rest: 30 }, { rehab: true })
// 4 sets = 2 per leg.
const balance = () => entry('single_leg_stance', { sets: 4, low: 30, high: 30, rest: 10 }, { rehab: true })

function heavyDay(level, phase, time, which, lowImpact) {
  const L = LIFTS[level]
  const ex = heavyCore(level, phase, time, which === 'A' ? 'impactA' : 'impactB', lowImpact)
  if (time === '2x30') {
    ex.push(balance(), posture())
    return ex
  }
  // 45+ minutes: a supported row for the upper back, then single-leg or glute
  // work, trunk and balance. Day B's extra is a bridge or thrust — NOT a second
  // hinge after heavy deadlifts, where a tired back drifts into flexion.
  // Once warm-up sets come in, the heavy lifts take most of the session: from
  // phase 2 the 45-minute option keeps only the row; at 5 × 5 so does the
  // 3-day option (its third day carries the single-leg and trunk work).
  const tight = (time === '2x45' && phase > 1) || (time === '3x60' && phase === 3)
  ex.push(entry(L.row.id, { sets: 3, low: 8, high: 10, rest: 60 }, { alts: L.row.alts }))
  if (!tight) {
    ex.push(which === 'A'
      ? entry('step_up', { sets: 2, low: 8, high: 10, rest: 60 })
      : entry(level === 'new' ? 'glute_bridge' : 'hip_thrust', { sets: 3, low: 8, high: 12, rest: 60 }, level === 'new' ? {} : { alts: ['glute_bridge'] }))
    ex.push(which === 'A'
      ? entry('plank', { sets: 3, low: 20, high: 30, rest: 30 }, { rehab: true })
      : entry(level === 'new' ? 'bird_dog' : 'side_plank', level === 'new' ? { sets: 2, low: 8, high: 10, rest: 30 } : { sets: 2, low: 20, high: 30, rest: 30 }, { rehab: true }))
  }
  ex.push(balance(), posture())
  return ex
}

// The third day on the 3-session option: lighter, single-leg strength, carries
// and a proper balance circuit — the "steady" in Strong, Steady and Straight.
function volumeDay(level, lowImpact) {
  const impactId = lowImpact ? 'marching' : level === 'new' ? 'heel_drop' : 'pogo_jump'
  return [
    entry(impactId, impactId === 'marching' ? { sets: 5, low: 20, high: 20, rest: 20 } : { sets: 5, low: 10, high: 10, rest: 30 }, { rehab: true }),
    entry('split_squat', { sets: 3, low: 8, high: 10, rest: 60 }),
    entry('step_up', { sets: 3, low: 8, high: 10, rest: 60 }),
    entry('pushup', { sets: 3, low: 6, high: 12, rest: 60 }),
    entry(level === 'experienced' ? 'chinup' : 'lat_pulldown', { sets: 3, low: 6, high: 10, rest: 60 }, { alts: level === 'experienced' ? ['lat_pulldown', 'db_row'] : ['db_row'] }),
    entry('farmer_carry', { sets: 3, low: 30, high: 40, rest: 60 }, { alts: ['kb_suitcase_carry'] }),
    entry('pallof_press', { sets: 2, low: 10, high: 10, rest: 30 }, { rehab: true }),
    entry('single_leg_reach', { sets: 2, low: 6, high: 8, rest: 15 }, { rehab: true }),
    entry('tandem_walk', { sets: 2, low: 10, high: 10, rest: 15 }, { rehab: true }),
    posture(),
  ]
}

const SCHEDULE = { 2: [1, 4], 3: [1, 3, 5] } // Mon/Thu, or Mon/Wed/Fri

export function buildBoneProgram({ level = 'new', time = '2x30', phase, lowImpact = false } = {}) {
  const L = BONE_LEVELS.find((l) => l.id === level) || BONE_LEVELS[0]
  const T = BONE_TIMES.find((t) => t.id === time) || BONE_TIMES[0]
  const ph = BONE_PHASES[phase] ? Number(phase) : L.startPhase
  const P = BONE_PHASES[ph]
  const note = (focus) => `Phase ${ph} · ${P.label}: ${P.effort} ${focus} ${lowImpact ? 'Low-impact version: no jumping. ' : ''}${BONE_DAY_SAFETY}`

  const days = [
    { title: 'Bone Strength A', ex: heavyDay(L.id, ph, T.id, 'A', lowImpact), focus: 'Heavy day — deadlift, press with impact, squat.' },
    { title: 'Bone Strength B', ex: heavyDay(L.id, ph, T.id, 'B', lowImpact), focus: 'Heavy day — same lifts, a different impact move.' },
  ]
  if (T.days === 3) days.splice(1, 0, { title: 'Bone Strength · Balance', ex: volumeDay(L.id, lowImpact), focus: 'Lighter day — single-leg strength, carries and balance.' })

  return {
    name: `Bone Strength — ${L.label}`,
    source: 'custom',
    goals: ['strength'],
    progressionMethod: 'double',
    // An easier week every 6–8 weeks (see Phase 3's advice).
    deloadWeeks: 7,
    // Kept so the setup page can show where you are and move you to the next
    // phase without losing the weights you have built up.
    boneDensity: { level: L.id, time: T.id, phase: ph, lowImpact: !!lowImpact },
    schedule: { mode: 'rotation', trainingDays: SCHEDULE[T.days] },
    createdAt: new Date().toISOString(),
    days: days.map((d) => ({
      title: d.title,
      dayLabel: d.title,
      weekday: null,
      note: note(d.focus),
      regions: [...new Set(d.ex.flatMap((e) => e.regions || []))],
      exercises: d.ex,
    })),
  }
}

// Move an existing bone program to another phase, keeping its id, schedule and
// every weight already entered for an exercise that is still in it.
export function rebuildBoneProgram(existing, phase) {
  const cfg = existing?.boneDensity || {}
  const next = buildBoneProgram({ level: cfg.level, time: cfg.time, phase, lowImpact: cfg.lowImpact })
  const weights = new Map()
  for (const d of existing?.days || []) for (const e of d.exercises || []) if (e.startWeight) weights.set(e.id, e.startWeight)
  return {
    ...existing,
    ...next,
    name: existing.name || next.name,
    createdAt: existing.createdAt || next.createdAt,
    schedule: existing.schedule || next.schedule,
    days: next.days.map((d) => ({
      ...d,
      exercises: d.exercises.map((e) => (weights.has(e.id) ? { ...e, startWeight: weights.get(e.id) } : e)),
    })),
  }
}

// What the research says, in a few lines, with where it comes from. Shown on
// the setup page so the program's choices can be checked, not just trusted.
export const BONE_EVIDENCE = [
  'Heavy, progressive lifting works best for the spine: in LIFTMOR, twice-weekly 5 × 5 at more than 85% of a one-rep max raised lumbar spine bone density by 2.9% over 8 months, while the low-intensity group lost 1.2%. The MEDEX-OP trial (80–85%) also improved spine density (+1.9% vs +0.1%), and women who lifted heavier gained more.',
  'Impact adds to lifting, especially before menopause: about 50 moderate impacts (stamps, heel drops, low jumps) a session is the recommended dose. After menopause, jumping alone did little in trials — it works best alongside heavy lifting.',
  'Light weights for high reps (40–60% of max), walking alone, swimming and cycling did not meaningfully improve bone density in trials.',
  'Balance training at least twice a week reduces falls — and falls cause most hip and wrist fractures (spine fractures often happen without one).',
  'If you have had a spine fracture or several fractures from minor falls, the guidance keeps impact to about brisk walking — the low-impact version replaces jumps with marching.',
  'Bone changes slowly. The trials ran 8 months or more; a bone scan sooner than about a year is unlikely to show the difference.',
]

export const BONE_SOURCES = [
  { label: 'Watson et al. 2018 — LIFTMOR trial, J Bone Miner Res', url: 'https://doi.org/10.1002/jbmr.3284' },
  { label: 'Watson et al. 2019 — LIFTMOR: no vertebral fractures, improved posture, Osteoporos Int', url: 'https://doi.org/10.1007/s00198-018-04829-z' },
  { label: 'Kistler-Fischbacher et al. 2021 — MEDEX-OP trial, J Bone Miner Res', url: 'https://doi.org/10.1002/jbmr.4334' },
  { label: 'Brooke-Wavell et al. 2022 — Royal Osteoporosis Society "Strong, Steady and Straight" consensus, Br J Sports Med', url: 'https://doi.org/10.1136/bjsports-2021-104634' },
  { label: 'Giangregorio et al. 2014 — Too Fit To Fracture recommendations, Osteoporos Int', url: 'https://doi.org/10.1007/s00198-013-2523-2' },
  { label: 'Beck et al. 2017 — ESSA position statement on exercise for osteoporosis, J Sci Med Sport', url: 'https://doi.org/10.1016/j.jsams.2016.10.001' },
  { label: 'Kohrt et al. 2004 — ACSM position stand: physical activity and bone health', url: 'https://doi.org/10.1249/01.MSS.0000142662.21767.58' },
  { label: 'Howe et al. 2011 — Cochrane review: exercise for preventing and treating osteoporosis', url: 'https://doi.org/10.1002/14651858.CD000333.pub2' },
  { label: 'Mohebbi et al. 2023 — meta-analysis of exercise and BMD in postmenopausal women, Osteoporos Int', url: 'https://doi.org/10.1007/s00198-023-06682-1' },
]

// Practical programming conventions (not evidence for bone density): the
// small-jumps / drop-10%-after-a-stall rules come from here.
export const BONE_PRACTICE_SOURCE = { label: 'r/Fitness wiki — Basic Beginner Routine', url: 'https://thefitness.wiki/routines/r-fitness-basic-beginner-routine/' }

// The daily home routine the guidance asks for on non-lifting days.
export const BONE_HOME_ROUTINE = [
  '50 impacts: heel drops, stomps or low jumps, in 5 sets of 10.',
  'Back-extensor holds: 3–5 holds of 5–10 seconds, lying face down.',
  'Balance: stand on one leg for 30 seconds each side, near a counter.',
]
