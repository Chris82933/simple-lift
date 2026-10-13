// Bone Strength — a program to maintain (and often improve) bone mineral
// density, generated from a few answers: training experience, weekly time,
// fracture history and falls risk.
//
// The backbone is the LIFTMOR protocol (Watson et al., J Bone Miner Res 2018):
// twice a week — deadlift, overhead press alternated with an impact move,
// squat — built up from a technique phase to 5 × 5 at about 80–85% of a
// one-rep max or more. In postmenopausal women with low bone mass it raised
// lumbar spine BMD 2.9% over 8 months while the control group lost 1.2%, and
// it was safe under supervision. Around that core, this file adds what the
// expert guidance asks for and the trial left out:
//   • ~50 impacts a session (Royal Osteoporosis Society "Strong, Steady and
//     Straight", Brooke-Wavell et al., BJSM 2022)
//   • balance work every session (ROS; Too Fit To Fracture, Giangregorio et
//     al., Osteoporos Int 2014/2015)
//   • back-extensor holds for posture (ROS; Too Fit To Fracture)
//   • no loaded spinal flexion — no crunches or sit-ups; core work is planks
//     and anti-rotation instead.
//
// What the answers change:
//   experience → which variation of each lift and which impact move, and the
//                PHASE to start in
//   time       → 2 or 3 sessions a week, and how much accessory work fits
//   fracture   → a spine fracture or several low-trauma fractures: no jumps
//                (walking-level impact only), beginner lifts, technique phase
//   falls      → more balance work, no jumps
//   phase      → sets × reps and rest of the three main lifts
import { EXERCISE_BY_ID } from './exercises.js'
import { exerciseEntryFromLibrary } from '../lib/exerciseEntry.js'

// The full safety note, as points: shown on the setup page, with a short
// version beside the acknowledgement.
export const BONE_SAFETY_POINTS = [
  'This is general guidance, not medical advice.',
  'Get clearance from your doctor or a physiotherapist first if you have osteoporosis, a past spine (vertebral) fracture, any fracture in the last year, or you fall often.',
  'Also check first if you have high blood pressure that isn’t controlled, a heart or eye (retina) condition, a hernia, pelvic-organ prolapse, a joint replacement, or recent surgery.',
  'In the research this is based on, heavy sessions were supervised. A few sessions with a coach or physio to check your technique is well worth it before you lift heavy.',
  'Breathe out as you lift — don’t hold your breath on every rep.',
  'Stop any exercise that causes pain, and don’t add weight while an ache lasts more than a day. Get medical advice for sudden severe back or rib pain, new height loss, chest pain, dizziness or new numbness.',
  'If jumping or impact causes leaking, a pelvic-floor physiotherapist can help — use the gentlest impact option meanwhile.',
  'This works alongside any bone medication or HRT you take, not instead of it.',
]
export const BONE_DISCLAIMER = BONE_SAFETY_POINTS.join(' ')

// The short version carried on every workout day — the full note is read once
// on the setup page rather than scrolled past every session.
export const BONE_DAY_SAFETY = 'Warm up for 5 minutes (march, bodyweight squats and hip hinges), and do 2–3 lighter ramp-up sets before each heavy lift. Breathe out as you lift. Stop anything that hurts.'

export const BONE_LEVELS = [
  {
    id: 'new',
    label: 'New to lifting',
    detail: 'Little or no weight training. Learn the lifts with light weights first — a trap-bar deadlift (or dumbbells), a dumbbell press and a goblet squat — with the gentlest impact.',
    startPhase: 1,
  },
  {
    id: 'some',
    label: 'Some experience',
    detail: 'Six months to two years of regular lifting. A trap bar and barbell, low jumps for impact, starting in the build phase.',
    startPhase: 2,
  },
  {
    id: 'experienced',
    label: 'Experienced',
    detail: 'Two years or more, comfortable with barbell squats and deadlifts. The full trial protocol from the start: 5 × 5 heavy, with jumping chin-up landings.',
    startPhase: 3,
  },
]

export const BONE_TIMES = [
  { id: '2x30', label: 'Essentials — 2 sessions a week', detail: 'The three main lifts, impact, balance and back work — the trial protocol, little else.', days: 2 },
  { id: '2x45', label: 'Standard — 2 sessions a week', detail: 'The same, plus a supported row, glute and core work.', days: 2 },
  { id: '3x60', label: 'Complete — 3 sessions a week', detail: 'Two main days plus a lighter day for single-leg strength, carries and a longer balance circuit.', days: 3 },
]

// Plain words, not "RPE" or "reps in reserve".
export const BONE_PHASES = {
  1: {
    label: 'Technique', sets: 3, low: 8, high: 10,
    effort: 'Light to moderate: stop each set when you could still do 4–5 more good reps. Keep the weight the same while you learn — every rep should look like the first.',
    advance: 'After about 3–4 weeks, when every rep looks the same as the first, move to Phase 2.',
  },
  2: {
    label: 'Build', sets: 3, low: 6, high: 8,
    effort: 'Moderately hard: stop each set with 2–3 good reps left.',
    advance: 'After about 4 weeks of steady progress with good form, move to Phase 3.',
  },
  3: {
    label: 'Strength', sets: 5, low: 5, high: 5,
    effort: 'Hard but clean: use a weight you could lift about 6–7 times at most (roughly 80–85% of your maximum) and stop each set with 1–2 good reps left.',
    advance: 'Stay here. Add the smallest weight jump when all 5 × 5 are clean; if form breaks down, drop 10% and build back up. Every 6–8 weeks take an easier week at about 80% of your working weights.',
  },
}
// The third, lighter day keeps its own effort, whatever the phase.
const VOLUME_EFFORT = 'Moderate: stop each set with 3–4 good reps left.'

// Which variation of each slot to use at each level. `alts` is the ordered
// fallback when the gym (or home) doesn't have the kit.
const LIFTS = {
  new: {
    hinge: { id: 'trap_bar_deadlift', alts: ['deadlift', 'kb_deadlift', 'db_rdl'] },
    press: { id: 'db_shoulder_press', alts: ['overhead_press'] },
    squat: { id: 'goblet_squat', alts: ['bw_squat'] },
    impactA: 'heel_drop',
    impactB: 'stomp',
  },
  some: {
    hinge: { id: 'trap_bar_deadlift', alts: ['deadlift', 'kb_deadlift', 'db_rdl'] },
    press: { id: 'overhead_press', alts: ['db_shoulder_press'] },
    squat: { id: 'back_squat', alts: ['goblet_squat'] },
    impactA: 'pogo_jump',
    impactB: 'stomp',
  },
  experienced: {
    hinge: { id: 'deadlift', alts: ['trap_bar_deadlift', 'kb_deadlift'] },
    press: { id: 'overhead_press', alts: ['db_shoulder_press'] },
    squat: { id: 'back_squat', alts: ['front_squat', 'goblet_squat'] },
    impactA: 'jump_chinup_drop',
    impactB: 'pogo_jump',
  },
}
// Chest-supported first for everyone: a long, loaded bent-over hold is the
// sustained flexed-spine position to avoid with low bone density.
const ROW = { id: 'chest_supported_row', alts: ['seated_cable_row', 'db_row'] }

// How a set is counted when it isn't simply "reps".
const PER = {
  single_leg_stance: 'alternating legs', split_squat: 'each leg', step_up: 'each leg',
  single_leg_reach: 'each leg', pallof_press: 'each side', side_plank: 'each side',
}
const COUNT = { marching: 'steps', tandem_walk: 'steps', heel_drop: 'drops', stomp: 'stomps', pogo_jump: 'jumps', jump_chinup_drop: 'landings' }

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
    // No "level up" ladders in this program: a bridge must not progress into
    // Nordic curls, or a push-up into one-arm push-ups, for someone whose bones
    // are the reason they are here.
    ladderId: null, nextId: null, prevId: null,
    ...(extra.alts ? { alts: extra.alts } : {}),
    ...(extra.slot ? { boneSlot: extra.slot } : {}),
    ...(PER[id] ? { perSide: PER[id] } : {}),
    ...(COUNT[id] ? { countLabel: COUNT[id] } : {}),
  }
}

// Rest between sets of the main lifts. Heavy sets need real rest — 2–3 minutes
// at 5 × 5 (ACSM 2009 progression guidance) — or reps get missed and form
// slips. Essentials rests a little less to keep sessions shorter.
const REST = {
  '2x30': { 1: 60, 2: 90, 3: 120 },
  '2x45': { 1: 75, 2: 90, 3: 150 },
  '3x60': { 1: 90, 2: 120, 3: 150 },
}
const mainRx = (phase, time) => {
  const p = BONE_PHASES[phase]
  return { sets: p.sets, low: p.low, high: p.high, rest: REST[time][phase] }
}
const impactRxFor = (id) => (id === 'jump_chinup_drop' ? { sets: 5, low: 5, high: 5, rest: 30 }
  : id === 'marching' ? { sets: 5, low: 20, high: 20, rest: 20 }
    : { sets: 5, low: 10, high: 10, rest: 30 })

// The LIFTMOR core: hinge → press (+ impact) → squat.
function heavyCore(lifts, phase, time, impactId) {
  const rx = mainRx(phase, time)
  const impactRx = impactRxFor(impactId)
  // Ramp-up sets on every heavy lift once the weights are real (phase 2+).
  const warm = phase > 1 ? true : undefined
  // Press and impact alternate, as in the trial, when their set counts match
  // (5 × 5). Earlier, 3 press sets against 5 impact sets would make "alternate
  // these" wrong, so the impact follows as its own block.
  const pair = rx.sets === impactRx.sets
  const out = [
    entry(lifts.hinge.id, rx, { alts: lifts.hinge.alts, warmups: warm, slot: 'main' }),
    entry(lifts.press.id, rx, { alts: lifts.press.alts, warmups: warm, supersetNext: pair ? true : undefined, slot: 'main' }),
    entry(impactId, impactRx, { rehab: true, slot: 'impact', alts: impactId === 'jump_chinup_drop' ? ['pogo_jump'] : undefined }),
    entry(lifts.squat.id, rx, { alts: lifts.squat.alts, warmups: warm, slot: 'main' }),
  ]
  // Chin-up landings are 5 × 5 as in the trial; stomps bring the day to ~50.
  if (impactId === 'jump_chinup_drop') out.push(entry('stomp', { sets: 3, low: 10, high: 10, rest: 20 }, { rehab: true }))
  return out
}

const posture = () => entry('prone_back_extension_hold', { sets: 3, low: 5, high: 10, rest: 30 }, { rehab: true })
// Sets alternate legs: 4 sets = 2 per leg; 6 with a falls history.
const balance = (fallRisk) => entry('single_leg_stance', { sets: fallRisk ? 6 : 4, low: 30, high: 30, rest: 10 }, { rehab: true })

function impactFor(lifts, which, { lowImpact, fallRisk }) {
  if (lowImpact) return 'marching'
  const id = lifts[which === 'A' ? 'impactA' : 'impactB']
  // A falls history keeps impact to stamps and heel drops — no jumping.
  if (fallRisk && (id === 'pogo_jump' || id === 'jump_chinup_drop')) return which === 'A' ? 'heel_drop' : 'stomp'
  return id
}

function heavyDay(levelId, phase, time, which, flags) {
  const lifts = LIFTS[levelId]
  const ex = heavyCore(lifts, phase, time, impactFor(lifts, which, flags))
  if (time !== '2x30') {
    // A supported row, then glutes or single-leg work and trunk. Day B's
    // extra is a bridge or thrust — never a second hinge after heavy
    // deadlifts, where a tired back drifts into flexion. At 5 × 5 the main
    // lifts fill the session, so the extras drop out.
    ex.push(entry(ROW.id, { sets: 3, low: 8, high: 10, rest: 60 }, { alts: ROW.alts }))
    if (phase < 3) {
      ex.push(which === 'A'
        ? entry('step_up', { sets: 2, low: 8, high: 10, rest: 60 })
        : entry(levelId === 'new' ? 'glute_bridge' : 'hip_thrust', { sets: 3, low: 8, high: 12, rest: 60 }, levelId === 'new' ? {} : { alts: ['glute_bridge'] }))
      ex.push(which === 'A'
        ? entry('plank', { sets: 3, low: 20, high: 30, rest: 30 }, { rehab: true })
        : entry(levelId === 'new' ? 'bird_dog' : 'side_plank', levelId === 'new' ? { sets: 2, low: 8, high: 10, rest: 30 } : { sets: 2, low: 20, high: 30, rest: 30 }, { rehab: true }))
    }
  }
  ex.push(balance(flags.fallRisk))
  if (flags.fallRisk) ex.push(entry('tandem_walk', { sets: 2, low: 10, high: 10, rest: 15 }, { rehab: true }))
  ex.push(posture())
  return ex
}

// The third day: lighter, single-leg strength, carries and a balance circuit —
// the "steady" in Strong, Steady and Straight.
function volumeDay(levelId, { lowImpact, fallRisk }) {
  const impactId = lowImpact ? 'marching' : (levelId === 'new' || fallRisk) ? 'heel_drop' : 'pogo_jump'
  return [
    entry(impactId, impactRxFor(impactId), { rehab: true, slot: 'impact' }),
    entry('split_squat', { sets: 3, low: 8, high: 10, rest: 60 }),
    entry('step_up', { sets: 3, low: 8, high: 10, rest: 60 }),
    entry('pushup', { sets: 3, low: 6, high: 12, rest: 60 }),
    entry(levelId === 'experienced' ? 'chinup' : 'lat_pulldown', { sets: 3, low: 6, high: 10, rest: 60 }, { alts: levelId === 'experienced' ? ['lat_pulldown', 'db_row'] : ['seated_cable_row', 'db_row'] }),
    entry('farmer_carry', { sets: 3, low: 30, high: 40, rest: 60 }, { alts: ['kb_suitcase_carry'] }),
    entry('pallof_press', { sets: 2, low: 10, high: 10, rest: 30 }, { rehab: true }),
    entry('single_leg_reach', { sets: fallRisk ? 3 : 2, low: 6, high: 8, rest: 15 }, { rehab: true }),
    entry('tandem_walk', { sets: fallRisk ? 3 : 2, low: 10, high: 10, rest: 15 }, { rehab: true }),
    posture(),
  ]
}

const SCHEDULE = { 2: [1, 4], 3: [1, 3, 5] } // Mon/Thu, or Mon/Wed/Fri

// The phase someone should start in. A fracture history always starts at the
// beginning, whatever the training experience.
export function startPhaseFor(level, { lowImpact } = {}) {
  if (lowImpact) return 1
  return BONE_LEVELS.find((l) => l.id === level)?.startPhase || 1
}

export function buildBoneProgram({ level = 'new', time = '2x30', phase, lowImpact = false, fallRisk = false } = {}) {
  const L = BONE_LEVELS.find((l) => l.id === level) || BONE_LEVELS[0]
  const T = BONE_TIMES.find((t) => t.id === time) || BONE_TIMES[0]
  const ph = BONE_PHASES[Number(phase)] ? Number(phase) : startPhaseFor(L.id, { lowImpact })
  const P = BONE_PHASES[ph]
  // After a spine fracture: beginner lift choices (trap bar / goblet /
  // dumbbell) whatever the experience — the guidance builds intensity
  // gradually there.
  const liftLevel = lowImpact ? 'new' : L.id
  const flags = { lowImpact: !!lowImpact, fallRisk: !!fallRisk }
  const extras = [
    lowImpact ? 'Low-impact version: no jumps — also aim for about 20 minutes of brisk walking on most days.' : '',
    fallRisk ? 'Balance work is doubled; keep a counter or rail within reach.' : '',
  ].filter(Boolean).join(' ')
  const note = (focus) => [`${P.label} phase. ${P.effort}`, focus, extras, BONE_DAY_SAFETY].filter(Boolean).join(' ')

  const days = [
    { title: 'Bone Strength A', ex: heavyDay(liftLevel, ph, T.id, 'A', flags), note: note('Main day: deadlift, press, impact, squat.') },
    { title: 'Bone Strength B', ex: heavyDay(liftLevel, ph, T.id, 'B', flags), note: note('Main day: the same lifts with a different impact move.') },
  ]
  if (T.days === 3) {
    days.splice(1, 0, {
      title: 'Bone Strength · Balance',
      ex: volumeDay(liftLevel, flags),
      note: [`Lighter day. ${VOLUME_EFFORT}`, 'Single-leg strength, carries and balance.', extras, BONE_DAY_SAFETY].filter(Boolean).join(' '),
    })
  }

  return {
    name: `Bone Strength — ${L.label}${lowImpact ? ' (low impact)' : ''}`,
    source: 'custom',
    goals: ['strength'],
    progressionMethod: 'double',
    deloadWeeks: 7,
    deloadNote: 'Every 6–8 weeks, take an easier week: about 80% of your working weights, same exercises.',
    // Kept so the setup page can show where you are and move you to another
    // phase without losing anything you have built up.
    boneDensity: { level: L.id, time: T.id, phase: ph, lowImpact: flags.lowImpact, fallRisk: flags.fallRisk },
    schedule: { mode: 'rotation', trainingDays: SCHEDULE[T.days] },
    createdAt: new Date().toISOString(),
    days: days.map((d) => ({
      title: d.title,
      dayLabel: d.title,
      weekday: null,
      note: d.note,
      regions: [...new Set(d.ex.flatMap((e) => e.regions || []))],
      exercises: d.ex,
    })),
  }
}

// Move an existing bone program to another phase IN PLACE: only the three main
// lifts' sets, reps, rest and ramp-up sets change (and whether the press pairs
// with the impact move). Everything else — weights, renamed days, exercises
// added or swapped in the builder, schedule — is left exactly as it is.
export function rebuildBoneProgram(existing, phase) {
  const cfg = existing?.boneDensity
  if (!cfg) return existing
  const to = Math.min(3, Math.max(1, Math.round(Number(phase)) || 1))
  const time = REST[cfg.time] ? cfg.time : '2x30'
  const rx = mainRx(to, time)
  const P = BONE_PHASES[to]
  const days = (existing.days || []).map((d) => {
    const exs = d.exercises || []
    const exercises = exs.map((e, i) => {
      if (e.boneSlot !== 'main') return e
      const nextEx = exs[i + 1]
      const pair = nextEx?.boneSlot === 'impact' && Number(nextEx.sets) === rx.sets
      return {
        ...e, sets: rx.sets, repLow: rx.low, repHigh: rx.high, restSec: rx.rest,
        warmups: to > 1 ? true : undefined,
        supersetNext: e.pattern === 'vert_push' ? (pair ? true : undefined) : e.supersetNext,
      }
    })
    // Swap the phase sentence at the start of the day's note; keep the rest.
    const note = typeof d.note === 'string' && /^(Technique|Build|Strength) phase\. /.test(d.note)
      ? d.note.replace(/^(Technique|Build|Strength) phase\. .*?(?= Main day:)/, `${P.label} phase. ${P.effort}`)
      : d.note
    return { ...d, exercises, note }
  })
  return { ...existing, days, boneDensity: { ...cfg, phase: to } }
}

// What the research says, with where it comes from. Shown on the setup page so
// the program's choices can be checked, not just trusted.
export const BONE_EVIDENCE = [
  'Heavy, progressive lifting works best for the spine. In LIFTMOR, twice-weekly 5 × 5 at about 80–85% of a one-rep max or more raised lumbar spine bone density by 2.9% over 8 months, while the low-intensity group lost 1.2%. The MEDEX-OP trial found a smaller gain (+1.9% vs +0.1%).',
  'Impact adds to lifting: about 50 moderate impacts (stamps, heel drops, low jumps) a session, ideally on most days. Before menopause, jumping alone raised hip density; after menopause it did little on its own — it works best alongside heavy lifting.',
  'Low-intensity training, walking alone, swimming and cycling had little or no effect on spine density in trials; walking may help the hip slightly.',
  'Challenging balance training reduces falls, and falls cause most hip and wrist fractures (spine fractures often happen without one). The best results come from about 2 hours a week — the few minutes in each session here are a start, not the full dose.',
  'After a spine fracture, or several fractures from minor falls, the guidance keeps impact to about brisk walking — the low-impact version replaces jumps with marching.',
  'Bone changes slowly. The trials ran 8 months or more, and bone scans are usually repeated every 1–2 years on the same scanner.',
  'Bone loss speeds up for several years around menopause. HRT and bone medicines can help — talk to your doctor; exercise works alongside them. Enough calcium, vitamin D and protein matter too.',
  'The trials studied postmenopausal women, but the same approach works for men (LIFTMOR-M) and suits younger women building peak bone mass.',
]

export const BONE_SOURCES = [
  { label: 'Watson et al. 2018 — LIFTMOR trial, J Bone Miner Res', url: 'https://doi.org/10.1002/jbmr.3284' },
  { label: 'Watson et al. 2019 — LIFTMOR: no vertebral fractures, improved posture, Osteoporos Int', url: 'https://doi.org/10.1007/s00198-018-04829-z' },
  { label: 'Kistler-Fischbacher et al. 2021 — MEDEX-OP trial, J Bone Miner Res', url: 'https://doi.org/10.1002/jbmr.4334' },
  { label: 'Harding et al. 2020 — LIFTMOR-M (men), Bone', url: 'https://doi.org/10.1016/j.bone.2020.115362' },
  { label: 'Brooke-Wavell et al. 2022 — Royal Osteoporosis Society "Strong, Steady and Straight" consensus, Br J Sports Med', url: 'https://doi.org/10.1136/bjsports-2021-104634' },
  { label: 'Giangregorio et al. 2014 — Too Fit To Fracture recommendations, Osteoporos Int', url: 'https://doi.org/10.1007/s00198-013-2523-2' },
  { label: 'Beck et al. 2017 — ESSA position statement on exercise for osteoporosis, J Sci Med Sport', url: 'https://doi.org/10.1016/j.jsams.2016.10.001' },
  { label: 'Kohrt et al. 2004 — ACSM position stand: physical activity and bone health', url: 'https://doi.org/10.1249/01.MSS.0000142662.21767.58' },
  { label: 'ACSM 2009 — progression models in resistance training (rest between heavy sets)', url: 'https://doi.org/10.1249/MSS.0b013e3181915670' },
  { label: 'Howe et al. 2011 — Cochrane review: exercise for preventing and treating osteoporosis', url: 'https://doi.org/10.1002/14651858.CD000333.pub2' },
  { label: 'Sherrington et al. 2019 — Cochrane review: exercise for preventing falls', url: 'https://doi.org/10.1002/14651858.CD012424.pub2' },
  { label: 'Martyn-St James & Carroll 2008 — walking and bone density, Bone', url: 'https://doi.org/10.1016/j.bone.2008.05.012' },
  { label: 'Mohebbi et al. 2023 — meta-analysis of exercise and BMD in postmenopausal women, Osteoporos Int', url: 'https://doi.org/10.1007/s00198-023-06682-1' },
]

// Practical programming conventions (not evidence for bone density): the
// small-jumps / drop-10%-after-a-stall rules come from here.
export const BONE_PRACTICE_SOURCE = { label: 'r/Fitness wiki — Basic Beginner Routine', url: 'https://thefitness.wiki/routines/r-fitness-basic-beginner-routine/' }

// The home routine the guidance asks for on most non-lifting days.
export const BONE_HOME_ROUTINE = [
  '50 impacts: heel drops, stomps or low jumps, in 5 sets of 10 (marching or brisk walking if you’ve been told to avoid jumping).',
  'Back-extensor holds: 3–5 holds of 5–10 seconds, lying face down.',
  'Balance: stand on one leg for 30 seconds each side, near a counter — more if you fall or worry about falling.',
  'In daily life, lift shopping and laundry with a hip hinge (bend at the hips and knees, back straight), not a rounded back.',
]
