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

// Attach ordered equipment fallbacks (most→least optimal, same training
// purpose). The app auto-swaps to the first `alts` entry the user can do, and
// re-optimizes when their equipment changes.
const alt = (exercise, alts) => ({ ...exercise, alts })

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

// 5/3/1 main lift: percentage-based, driven by a training max rather than a
// working weight. The engine in fiveThreeOne.js rewrites the sets each week.
const t531 = (id) => ({
  ...ex(id, 3, 5, 180), amrap: true,
  progression: { scheme: '531', week: 0, cycle: 0, tm: null },
})

const day = (title, note, exercises) => ({
  title, note, weekday: null, dayLabel: title,
  regions: [...new Set(exercises.flatMap((e) => e.regions))],
  exercises,
})

export const TEMPLATES = [
  {
    templateId: 'foundations_fullbody',
    deloadWeeks: 6,
    deloadNote: 'Every ~6 weeks, take an easier week — drop a set or use a slightly easier variation — to let tendons and joints catch up with your strength.',
    name: 'Foundations: Full-Body Strength',
    description:
      'A do-everything full-body plan for real-life strength, built straight from the evidence. The WHO guidelines call for strengthening every major muscle group at least twice a week (Bull et al., 2020), and a 2022 meta-analysis of cohort studies found 30–60 minutes of weekly strength work is linked with a 10–20% lower risk of early death, heart disease, and cancer — with no extra benefit beyond that (Momma et al., 2022). This program is exactly that dose, done well: squat, hinge, push, pull, carry, and brace across 2–3 short sessions a week, scaling from a first-ever workout to years of training.',
    tags: ['Full body', 'Science-based', '2–3 days/wk'],
    level: 'All levels',
    bestFor: 'Everyday strength & health',
    equipment: 'A pair of dumbbells and a bar to hang from. A bench is optional (swap to push-ups without one).',
    progressionInfo:
      'Each muscle is trained 2×+ per week — the frequency meta-analyses favour for growth (Schoenfeld, Ogborn & Krieger, 2016) — in moderate rep ranges, which build muscle as well as heavy ones when sets approach failure (Schoenfeld et al., 2017). Stop 1–2 reps short of failure: it grows muscle about as well as grinding to zero, with less fatigue to recover from (Refalo et al., 2023). Loaded lifts use double progression (top the range on every set → add a little weight, drop back, climb again) with ~2-minute rests on the big lifts (Schoenfeld et al., 2016). Bodyweight moves climb their ladder to a harder variation — or ease down a rung when needed. Push every rep up fast and lower it under control: intending to move quickly is what builds power (Behm & Sale, 1993), and power is what daily function runs on as we age (Byrne et al., 2016). The carries train grip and posture — grip strength is one of the strongest simple predictors of long-term health (Leong et al., 2015). Even the 2-day option clears the minimum effective training dose (Iversen et al., 2021).',
    pros: [
      'Every major muscle and movement pattern 2–3×/week — the frequency and weekly dose the research keeps rewarding',
      'Truly scalable: ladders run from wall push-ups toward one-arm work; loaded lifts start as light as you need',
      'Six quick moves a session — the biggest health payoff in the data sits at just 30–60 minutes a week',
      'Carries, single-leg work, and fast lifting intent build grip, balance, and power — strength you feel outside the gym',
    ],
    cons: [
      'Not specialised — a focused program will beat it for a max bench or a competition squat',
      'Wants a couple of basics (dumbbells + something to hang from); no-equipment users lean on the bodyweight ladders',
      'Progress is steady rather than the fastest — it’s built to last, not to peak',
    ],
    source: 'template',
    goals: ['general', 'strength'],
    progressionMethod: 'double',
    schedule: { mode: 'rotation', trainingDays: [1, 3, 5] },
    days: [
      day('Full Body A', 'Squat · push · row · press · carry · brace. Stop 1–2 reps shy of failure; push up fast, lower slow. Run A/B 2×/week (e.g. Mon & Thu) or 3×/week.', [
        ex('goblet_squat', 3, [8, 12], 120),
        ex('pushup', 3, [8, 15], 90),
        ex('inverted_row', 3, [8, 12], 90),
        ex('db_shoulder_press', 3, [8, 12], 90),
        ex('farmer_carry', 2, [30, 45], 75),
        ex('plank', 3, [20, 45], 45),
      ]),
      day('Full Body B', 'Hinge · lunge · pull · press · carry · brace. Same rules — fast up, slow down, a rep or two in the tank.', [
        ex('db_rdl', 3, [8, 12], 120),
        ex('reverse_lunge', 3, [8, 12], 90),
        ex('pull_negative', 3, [3, 6], 120),
        ex('db_bench', 3, [8, 12], 90),
        ex('farmer_carry', 2, [30, 45], 75),
        ex('dead_bug', 3, [8, 12], 45),
      ]),
    ],
  },

  {
    templateId: 'starting_strength',
    deloadWeeks: 6,
    deloadNote: 'This program already auto-backs-off 10% when you stall a lift. If you feel run down, take a lighter week anyway — same lifts at ~90%.',
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
    deloadWeeks: 6,
    deloadNote: 'Squatting 5×5 three times a week adds up. If the bar speed is dropping, take a week at ~90% before pushing on.',
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
    deloadWeeks: 6,
    deloadNote: 'The AMRAP sets are taxing. Every 6 weeks or so, take an easy week — stop the last set well short of failure — then attack it again.',
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
    // GZCLP lives or dies on picking the right starting weights, so it gets a
    // setup wizard instead of a one-tap load — the same job the spreadsheets do.
    setupPath: '/gzclp',
    setupLabel: 'Set up GZCLP',
    deloadWeeks: 6,
    deloadNote: 'GZCLP drops stages automatically when you miss, but a planned lighter week every 6 weeks keeps the joints fresh.',
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
    templateId: 'wendler531_bbb',
    deloadWeeks: 0, // week 4 of every cycle IS the deload — no separate reminder needed
    name: '5/3/1 Boring But Big',
    description: 'Jim Wendler’s 5/3/1 with the Boring But Big assistance template — the standard next step once a linear program stops working. One main lift per day off a training max, then 5×10 of its opposite lift at about half that weight for size. Four-week waves: 5s, 3s, 5/3/1, then a deload.',
    tags: ['Barbell', 'Strength', 'Intermediate'],
    level: 'Intermediate',
    bestFor: 'Breaking a plateau',
    equipment: 'Barbell, rack, bench',
    progressionInfo: 'Percentage based off a training max (~90% of your true 1RM), not off what you lifted last time. Weeks run 5s → 3s → 5/3/1 → deload, with the last set of each non-deload week an AMRAP. The training max goes up once per completed cycle (+5 lb upper, +10 lb lower) — slow on purpose, which is exactly why it keeps working long after linear programs die.',
    pros: [
      'Built for lifters who have stalled — progress no longer depends on beating last session',
      'Submaximal by design, so most sessions feel manageable and repeatable',
      'A deload every fourth week is built in, not something you have to remember',
    ],
    cons: [
      'Deliberately slow — a beginner will progress faster on a linear program',
      'Needs an honest 1RM estimate to set the training max',
      'The 5×10 Boring But Big sets are exactly as boring as advertised',
    ],
    source: 'template',
    goals: ['strength', 'size'],
    schedule: { mode: 'rotation', trainingDays: [1, 2, 4, 5] },
    // Wendler documents two BBB pairings: 5×10 of the same lift, or of its
    // opposite. This uses the opposite-lift version — it spreads the volume
    // across the week instead of hammering one lift twice in a session.
    days: [
      day('Press Day', 'T1 Overhead Press 5/3/1, then 5×10 bench at ~50% of its training max.', [
        t531('overhead_press'),
        ex('bench_press', 5, 10, 90),
        alt(ex('chinup', 5, [5, 10], 90), ['lat_pulldown', 'band_pulldown']),
      ]),
      day('Deadlift Day', 'T1 Deadlift 5/3/1, then 5×10 squat at ~50%.', [
        t531('deadlift'),
        ex('back_squat', 5, 10, 90),
        ex('hanging_leg_raise', 5, [8, 15], 60),
      ]),
      day('Bench Day', 'T1 Bench 5/3/1, then 5×10 overhead press at ~50%.', [
        t531('bench_press'),
        ex('overhead_press', 5, 10, 90),
        ex('db_row', 5, [8, 12], 90),
      ]),
      day('Squat Day', 'T1 Squat 5/3/1, then 5×10 front squat at ~50%. (Wendler pairs squat with deadlift here; front squats spare the lower back.)', [
        t531('back_squat'),
        ex('front_squat', 5, 10, 90),
        alt(ex('leg_curl', 5, [10, 15], 60), ['single_leg_glute_bridge']),
      ]),
    ],
  },

  {
    templateId: 'db_fullbody',
    deloadWeeks: 6,
    deloadNote: 'Every ~6 weeks, take an easier week — drop a set per exercise or stay a couple of reps further from failure.',
    name: 'Dumbbell Full Body',
    description: 'A complete full-body program that needs nothing but a pair of adjustable dumbbells and a bench. Three sessions a week covering every major pattern — squat, hinge, push, pull, and carry — so training at home with limited kit is a real program, not a compromise.',
    tags: ['Dumbbells', 'Home', 'Full body'],
    level: 'Beginner–Intermediate',
    bestFor: 'Training at home',
    equipment: 'Adjustable dumbbells and a bench. A pull-up bar helps but is not required.',
    progressionInfo: 'Double progression — work in the given rep range, and when you hit the top of it on every set, move up to the next dumbbell weight and start again near the bottom. Because dumbbells jump in bigger steps than plates, expect to sit at a weight for a few sessions before it moves.',
    pros: [
      'Needs one pair of adjustable dumbbells — no rack, no barbell',
      'Full body three times a week is efficient and well-supported for size and strength',
      'Dumbbells are easier on the shoulders and let each side work independently',
    ],
    cons: [
      'Dumbbell jumps are coarse, so progress is less granular than a barbell',
      'Heavy lower-body work is limited by what you can hold, not what your legs can lift',
      'You will eventually outgrow the dumbbells for squats and hinges',
    ],
    source: 'template',
    goals: ['general', 'size'],
    schedule: { mode: 'rotation', trainingDays: [1, 3, 5] },
    days: [
      day('Day A', 'Squat-focused full body.', [
        ex('goblet_squat', 4, [8, 12], 120),
        alt(ex('db_bench', 4, [8, 12], 120), ['pushup']),
        ex('db_row', 4, [8, 12], 90),
        ex('db_rdl', 3, [10, 15], 90),
        ex('farmer_carry', 3, [30, 45], 75),
      ]),
      day('Day B', 'Press-focused full body.', [
        ex('db_shoulder_press', 4, [8, 12], 120),
        alt(ex('chinup', 4, [5, 10], 120), ['db_row']),
        ex('walking_lunge', 3, [10, 15], 90),
        alt(ex('incline_db_press', 3, [10, 15], 90), ['db_bench', 'pushup']),
        ex('lateral_raise', 3, [12, 20], 60),
      ]),
      day('Day C', 'Hinge-focused full body.', [
        ex('db_rdl', 4, [8, 12], 120),
        alt(ex('db_bench', 3, [10, 15], 90), ['pushup']),
        alt(ex('bulgarian_split', 3, [8, 12], 90), ['reverse_lunge']),
        ex('db_curl', 3, [10, 15], 60),
        ex('db_calf_raise', 4, [12, 20], 45),
      ]),
    ],
  },

  {
    templateId: 'reddit_ppl',
    deloadWeeks: 5,
    deloadNote: 'High volume six days a week wears you down. Every ~5 weeks, cut each set to ~90% weight (or drop to 2 sets) for a week, then resume.',
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
        // Face pulls on every push AND pull day are a signature of the original
        // routine — cheap rear-delt/rotator-cuff insurance against all the
        // pressing volume. Falls back to bands when there's no cable.
        alt(ex('face_pull', 4, [15, 20], 45), ['band_row', 'band_lateral']),
      ]),
      day('Pull', 'Back & biceps.', [
        ex('barbell_row', 4, [5, 8], 150),
        ex('pullup', 3, [6, 12], 120),
        ex('lat_pulldown', 3, [8, 12], 90),
        ex('seated_cable_row', 3, [8, 12], 90),
        alt(ex('face_pull', 4, [15, 20], 45), ['band_row', 'band_lateral']),
        ex('db_curl', 3, [8, 12], 60),
      ]),
      day('Legs', 'Quads, hamstrings & calves.', [
        ex('back_squat', 4, [5, 8], 180),
        ex('romanian_dl', 3, [8, 12], 120),
        ex('leg_press', 3, [10, 15], 90),
        // Direct hamstring work — RDLs alone leave the knee-flexion function untrained.
        alt(ex('leg_curl', 3, [10, 15], 60), ['single_leg_glute_bridge']),
        ex('db_calf_raise', 4, [12, 20], 45),
      ]),
    ],
  },

  {
    templateId: 'phul',
    deloadWeeks: 5,
    deloadNote: 'The heavy power days plus hypertrophy volume stack up fatigue. Take a lighter week every ~5 weeks — ~90% on the big lifts, easy on the rest.',
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
        // The published PHUL lower days both include a hamstring curl; without
        // it the only hamstring work is hip-hinging.
        alt(ex('leg_curl', 3, [8, 12], 60), ['single_leg_glute_bridge']),
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
    deloadWeeks: 5,
    deloadNote: 'Fingers and elbows recover slowly. Every ~5 weeks, take an easy week — drop the added weight on hangs, shorten the holds, and cut a set — to stay injury-free.',
    name: 'Climbing Strength (Home)',
    description: 'A home strength block for rock climbers, ordered the way coaches program it: fingers first while you’re fresh, one hard pull, body tension in the middle, and antagonist + prehab work last to keep elbows and shoulders healthy. It adapts to your gear — set your equipment (hangboard, a Tindeq-style finger tool, rings, dumbbells) and each move swaps to the best version you can actually do: max hangs → no-hang device pulls → bar hangs; weighted pull-ups → archer → strict pull-ups. Change your equipment and the program re-optimizes. It’s a supplement — pair it with 1–2 days of real climbing.',
    tags: ['Climbing', 'Adapts to gear', '2 days/wk'],
    level: 'Intermediate',
    bestFor: 'Rock climbing',
    equipment: 'Just a pull-up bar and a rubber band work. A hangboard OR a Tindeq-style finger tool for finger training, plus rings and a dumbbell, make it better — set what you have in Profile → Training location.',
    progressionInfo: 'Finger work uses whichever tool you have: on a hangboard, add weight (or a smaller edge) to max hangs at ~RPE 9; on a Tindeq/block, push the peak force up each session; on just a bar, grow the hang time. Pulls use double progression — build reps, then add weight (or move to a harder archer/one-arm variation if you can’t add load). Grow the timed holds (hang, lock-off, front lever) a second or two at a time. Long rests (~3 min) on fingers and max-pull work — quality over fatigue.',
    pros: [
      'Adapts to your equipment automatically — no hangboard? It uses your Tindeq-style tool or a bar hang instead. Can’t add weight? It uses harder bodyweight pulls',
      'Trains climbing’s real limiters — finger strength, lock-off and pulling power, and body tension (front lever)',
      'One main pull per day, plus antagonist/prehab (push, finger extensions, scap + wrist work) that research links to far fewer elbow and shoulder injuries',
    ],
    cons: [
      'Loaded finger training (max hangs, no-hang device) is for climbers with ~a year of experience — beginners should stick to easy dead hangs and not push the fingers hard',
      'A supplement, not a replacement — you still need 1–2 climbing sessions a week',
      'Finger training punishes rushing: warm up fully and stop at anything sharp or tweaky',
    ],
    source: 'template',
    goals: ['climbing'],
    schedule: { mode: 'rotation', trainingDays: [1, 4] },
    days: [
      day('Fingers & Max Pull', 'Fingers first while fresh (with whatever tool you have), then your one hard pull. Rest ~3 min on finger and max-pull work. New to loading fingers? Keep it easy.', [
        alt(ex('max_hangs', 5, [7, 10], 180), ['no_hang_pulls', 'dead_hang']),
        alt(ex('weighted_pullup', 4, [4, 6], 180), ['archer_pull', 'pullup']),
        ex('lock_off', 3, [8, 15], 120),
        ex('front_lever_tuck', 3, [10, 20], 120),
        alt(ex('ring_dip', 3, [6, 12], 90), ['dip', 'bench_dip', 'pushup']),
        ex('finger_ext_band', 2, [15, 25], 45),
      ]),
      day('Power & Prehab', 'Finger endurance, bodyweight pulling for volume, core, then antagonist + prehab to protect the elbows and shoulders.', [
        alt(ex('repeaters', 4, [5, 8], 180), ['no_hang_pulls', 'dead_hang']),
        ex('pullup', 4, [5, 8], 150),
        alt(ex('toes_to_bar', 3, [6, 12], 90), ['hanging_leg_raise', 'lying_leg_raise']),
        alt(ex('ring_row', 3, [8, 12], 90), ['inverted_row']),
        ex('pushup', 3, [10, 15], 75),
        ex('scap_pull', 3, [8, 12], 60),
        alt(ex('reverse_wrist_curl', 2, [15, 20], 45), ['finger_ext_band']),
      ]),
    ],
  },

  {
    templateId: 'bw_foundations',
    deloadWeeks: 6,
    deloadNote: 'Every ~6 weeks, take an easy week — drop a set or use a slightly easier variation — to let tendons catch up with your strength.',
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
    deloadWeeks: 6,
    deloadNote: 'Every ~6 weeks, take a lighter week — fewer sets or an easier ladder step — so joints and tendons recover alongside your strength.',
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
    deloadWeeks: 0,
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
        ex('run_10k', 1, 10, 0),
      ]),
    ],
  },
]

export const TEMPLATE_BY_ID = Object.fromEntries(TEMPLATES.map((t) => [t.templateId, t]))

// Presentation-only fields that shouldn't be stored on the instantiated program.
const TEMPLATE_META_FIELDS = ['templateId', 'description', 'tags', 'equipment', 'level', 'bestFor', 'progressionInfo', 'pros', 'cons', 'setupPath', 'setupLabel']

// Deep-clone a template into a fresh program ready for addProgram().
export function instantiateTemplate(templateId) {
  const t = TEMPLATE_BY_ID[templateId]
  if (!t) return null
  const clone = JSON.parse(JSON.stringify(t))
  for (const f of TEMPLATE_META_FIELDS) delete clone[f]
  return { ...clone, createdAt: new Date().toISOString() }
}
