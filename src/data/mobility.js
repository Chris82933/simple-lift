// Mobility: strength through range of motion.
//
// The evidence in brief (see docs in the Mobility screen's "Why it works"):
// - Loaded reps through a full, slow range improve flexibility about as well as
//   stretching does (Afonso et al. 2021) AND build strength at long muscle
//   lengths — so every area leads with slow, loaded end-range reps.
// - Holds come second. They mostly raise stretch tolerance: real and useful,
//   but it fades without upkeep. Long holds are for range, not for muscle.
// - Frequency beats session length: each area ~3× a week, ≥5 min of holds per
//   muscle per week. Results: easier in 2–4 weeks, real range at 6–8 weeks.
// - One change at a time: range, then time or reps, then load.
//
// Every move id is an exercise in exercises.js, so muscle maps, search and
// form videos work everywhere.

// How a move is done in a session.
//   kind: 'reps' (slow, paced reps) | 'hold' (timed)
//   tempo: seconds lowering / pause in the stretch / rising — the player paces it
//   paced: false → self-paced (a Nordic can't be metronomed)
//   perSide: done left then right
//   loadable: 'none' | 'optional' | 'required' — whether a weight belongs in it
//   dose: per experience level → { sets, reps } or { sets, sec }
//   flex: true → loaded spinal flexion (hidden for low bone density/pregnancy)
//   heavy: true → hard eccentric: max 2× a week, longer rest
const T3 = { down: 3, pause: 1, up: 1 }
const T4 = { down: 4, pause: 2, up: 1 }
const r = (sets, reps) => ({ sets, reps })
const h = (sets, sec) => ({ sets, sec })

export const MOVES = {
  // Back of the legs
  elephant_walk: { kind: 'reps', tempo: { down: 2, pause: 1, up: 1 }, loadable: 'none', dose: { new: r(2, 10), some: r(2, 12), flexible: r(2, 12) } },
  seated_pike_pulse: { kind: 'hold', loadable: 'optional', dose: { new: h(2, 30), some: h(3, 45), flexible: h(2, 30) } },
  db_rdl: { kind: 'reps', tempo: T4, loadable: 'required', dose: { new: r(2, 8), some: r(3, 8), flexible: r(3, 8) } },
  jefferson_curl: { kind: 'reps', tempo: { down: 5, pause: 1, up: 5 }, loadable: 'required', flex: true, heavy: true, dose: { new: r(2, 6), some: r(2, 8), flexible: r(3, 8) } },
  nordic_curl: { kind: 'reps', paced: false, loadable: 'none', heavy: true, dose: { new: r(2, 3), some: r(2, 4), flexible: r(3, 5) } },
  // Inner thighs & hips
  frog_stretch_rock: { kind: 'reps', tempo: { down: 3, pause: 2, up: 1 }, loadable: 'none', dose: { new: r(2, 10), some: r(2, 12), flexible: r(2, 12) } },
  cossack_squat: { kind: 'reps', tempo: T3, perSide: true, loadable: 'optional', dose: { new: r(2, 5), some: r(3, 6), flexible: r(3, 8) } },
  copenhagen_hold: { kind: 'hold', perSide: true, loadable: 'none', dose: { new: h(2, 15), some: h(3, 20), flexible: h(3, 30) } },
  pancake_good_morning: { kind: 'reps', tempo: T4, loadable: 'optional', dose: { new: r(2, 8), some: r(3, 8), flexible: r(3, 10) } },
  // Front of the hips & quads
  half_kneeling_hip_flexor: { kind: 'hold', perSide: true, loadable: 'none', dose: { new: h(2, 30), some: h(2, 45), flexible: h(2, 30) } },
  couch_stretch: { kind: 'hold', perSide: true, loadable: 'optional', dose: { new: h(2, 30), some: h(2, 45), flexible: h(2, 30) } },
  atg_split_squat: { kind: 'reps', tempo: T3, perSide: true, loadable: 'optional', dose: { new: r(2, 6), some: r(3, 8), flexible: r(3, 8) } },
  reverse_nordic: { kind: 'reps', tempo: { down: 4, pause: 1, up: 2 }, loadable: 'optional', heavy: true, dose: { new: r(2, 5), some: r(3, 6), flexible: r(3, 8) } },
  // Calves & ankles
  tibialis_raise: { kind: 'reps', tempo: { down: 2, pause: 1, up: 1 }, loadable: 'optional', dose: { new: r(2, 15), some: r(2, 20), flexible: r(3, 20) } },
  eccentric_heel_drop: { kind: 'reps', tempo: { down: 3, pause: 2, up: 1 }, perSide: true, loadable: 'optional', dose: { new: r(2, 12), some: r(3, 12), flexible: r(3, 15) } },
  loaded_ankle_rocker: { kind: 'reps', tempo: { down: 2, pause: 2, up: 1 }, perSide: true, loadable: 'required', dose: { new: r(2, 10), some: r(3, 10), flexible: r(3, 12) } },
  patrick_step: { kind: 'reps', tempo: T3, perSide: true, loadable: 'optional', dose: { new: r(2, 10), some: r(3, 12), flexible: r(3, 15) } },
  deep_squat_hold: { kind: 'hold', loadable: 'optional', dose: { new: h(2, 30), some: h(3, 45), flexible: h(2, 30) } },
  // Shoulders overhead
  scap_wall_slide: { kind: 'reps', tempo: { down: 3, pause: 1, up: 2 }, loadable: 'none', dose: { new: r(2, 10), some: r(2, 12), flexible: r(2, 12) } },
  dead_hang: { kind: 'hold', loadable: 'optional', dose: { new: h(3, 20), some: h(3, 40), flexible: h(3, 30) } },
  lat_stretch_db_pullover: { kind: 'reps', tempo: T4, loadable: 'required', dose: { new: r(2, 10), some: r(3, 10), flexible: r(3, 10) } },
  overhead_squat: { kind: 'reps', tempo: T3, loadable: 'optional', dose: { new: r(2, 5), some: r(3, 5), flexible: r(3, 5) } },
  // Chest & front of shoulders
  doorway_pec_stretch: { kind: 'hold', perSide: true, loadable: 'none', dose: { new: h(2, 30), some: h(3, 45), flexible: h(2, 30) } },
  deficit_pushup: { kind: 'reps', tempo: { down: 3, pause: 1, up: 1 }, loadable: 'optional', dose: { new: r(2, 6), some: r(3, 8), flexible: r(3, 12) } },
  cable_fly: { kind: 'reps', tempo: T4, loadable: 'required', dose: { new: r(2, 10), some: r(3, 10), flexible: r(3, 12) } },
  // Upper back twist
  open_book: { kind: 'reps', tempo: { down: 2, pause: 3, up: 2 }, perSide: true, loadable: 'none', dose: { new: r(2, 8), some: r(2, 10), flexible: r(2, 10) } },
  bench_t_spine_extension: { kind: 'reps', tempo: { down: 2, pause: 3, up: 1 }, loadable: 'none', dose: { new: r(2, 8), some: r(3, 8), flexible: r(3, 10) } },
  kb_windmill: { kind: 'reps', tempo: T3, perSide: true, loadable: 'required', dose: { new: r(2, 5), some: r(3, 5), flexible: r(3, 6) } },
  // Spine & lower back
  cat_cow_segmental: { kind: 'reps', tempo: { down: 3, pause: 1, up: 3 }, loadable: 'none', dose: { new: r(2, 8), some: r(2, 8), flexible: r(2, 8) } },
  back_extension: { kind: 'reps', tempo: T3, loadable: 'optional', dose: { new: r(2, 10), some: r(3, 12), flexible: r(3, 12) } },
  // Wrists & forearms
  wrist_flexor_stretch: { kind: 'hold', perSide: true, loadable: 'none', dose: { new: h(2, 30), some: h(2, 30), flexible: h(2, 30) } },
  wrist_extensor_stretch: { kind: 'hold', perSide: true, loadable: 'none', dose: { new: h(2, 30), some: h(2, 30), flexible: h(2, 30) } },
  loaded_wrist_extension_rock: { kind: 'reps', tempo: { down: 2, pause: 2, up: 1 }, loadable: 'none', dose: { new: r(2, 10), some: r(3, 10), flexible: r(3, 12) } },
  wrist_curl: { kind: 'reps', tempo: T3, loadable: 'required', dose: { new: r(2, 15), some: r(3, 12), flexible: r(3, 15) } },
  eccentric_wrist_extension: { kind: 'reps', tempo: { down: 4, pause: 0, up: 1 }, loadable: 'required', dose: { new: r(2, 12), some: r(3, 12), flexible: r(3, 15) } },
  // Hip rotation
  hip_90_90_switch: { kind: 'reps', tempo: { down: 2, pause: 1, up: 2 }, loadable: 'none', dose: { new: r(2, 6), some: r(3, 8), flexible: r(3, 10) } },
  hip_90_90_liftoff: { kind: 'hold', perSide: true, loadable: 'none', dose: { new: h(2, 5), some: h(3, 8), flexible: h(3, 10) } },
  // Neck (never loaded)
  chin_tuck: { kind: 'reps', tempo: { down: 2, pause: 3, up: 1 }, loadable: 'none', dose: { new: r(2, 10), some: r(2, 10), flexible: r(2, 10) } },
  upper_trap_stretch: { kind: 'hold', perSide: true, loadable: 'none', dose: { new: h(2, 20), some: h(2, 30), flexible: h(2, 20) } },
}

// Body areas, in plain words. `ladder` runs easiest → hardest; the app picks
// where to start from experience and moves people up one rung at a time.
export const AREAS = [
  { id: 'hamstrings', label: 'Back of the legs', muscles: ['hamstrings'], ladder: ['elephant_walk', 'seated_pike_pulse', 'db_rdl', 'jefferson_curl', 'nordic_curl'], test: 'toe_touch' },
  { id: 'hips_groin', label: 'Inner thighs & hips', muscles: ['glutes', 'hamstrings'], ladder: ['frog_stretch_rock', 'cossack_squat', 'copenhagen_hold', 'pancake_good_morning'], test: 'straddle' },
  { id: 'hip_flexors', label: 'Front of hips & quads', muscles: ['quads'], ladder: ['half_kneeling_hip_flexor', 'couch_stretch', 'atg_split_squat', 'reverse_nordic'], test: 'couch' },
  { id: 'ankles', label: 'Calves & ankles', muscles: ['calves', 'tibialis'], ladder: ['tibialis_raise', 'eccentric_heel_drop', 'deep_squat_hold', 'loaded_ankle_rocker', 'patrick_step'], test: 'knee_wall' },
  { id: 'overhead', label: 'Shoulders overhead', muscles: ['lats', 'shoulders'], ladder: ['scap_wall_slide', 'dead_hang', 'lat_stretch_db_pullover', 'overhead_squat'], test: 'overhead' },
  { id: 'chest', label: 'Chest & front of shoulders', muscles: ['chest'], ladder: ['doorway_pec_stretch', 'deficit_pushup', 'cable_fly'], test: 'reach_behind' },
  { id: 'upper_back', label: 'Upper back twist', muscles: ['traps', 'obliques'], ladder: ['open_book', 'bench_t_spine_extension', 'kb_windmill'], test: 'reach_behind' },
  { id: 'lower_back', label: 'Spine & lower back', muscles: ['lower_back'], ladder: ['cat_cow_segmental', 'seated_pike_pulse', 'back_extension', 'jefferson_curl'], test: 'toe_touch' },
  { id: 'hip_rotation', label: 'Hip rotation', muscles: ['glutes'], ladder: ['hip_90_90_switch', 'hip_90_90_liftoff', 'cossack_squat'], test: 'hip_9090' },
  { id: 'wrists', label: 'Wrists & forearms', muscles: ['forearms'], ladder: ['wrist_flexor_stretch', 'wrist_extensor_stretch', 'loaded_wrist_extension_rock', 'wrist_curl', 'eccentric_wrist_extension'], test: 'wrist' },
  { id: 'neck', label: 'Neck (gentle)', muscles: ['neck', 'traps'], ladder: ['chin_tuck', 'upper_trap_stretch'], test: null, gentle: true },
]
export const AREA_BY_ID = Object.fromEntries(AREAS.map((a) => [a.id, a]))

// What people actually want. Each goal is a preset of areas plus the one test
// that shows it improving.
export const GOALS = [
  { id: 'toe_touch', label: 'Touch my toes', blurb: 'Bend to the floor without your back complaining.', areas: ['hamstrings', 'lower_back'], test: 'toe_touch' },
  { id: 'deep_squat', label: 'Sit in a deep squat', blurb: 'Heels down, chest up, comfortable at the bottom.', areas: ['ankles', 'hips_groin', 'hip_flexors'], test: 'squat' },
  { id: 'overhead', label: 'Arms fully overhead', blurb: 'Press and reach overhead without arching your lower back.', areas: ['overhead', 'upper_back'], test: 'overhead' },
  { id: 'splits', label: 'Work toward the splits', blurb: 'More range for kicks, dance, climbing and long strides.', areas: ['hips_groin', 'hip_flexors', 'hamstrings'], test: 'straddle' },
  { id: 'hips', label: 'Open, happy hips', blurb: 'Sit cross-legged and get up off the floor easily.', areas: ['hip_rotation', 'hips_groin'], test: 'hip_9090' },
  { id: 'ankles', label: 'Ankles that bend', blurb: 'Knees over toes for squats, stairs and running.', areas: ['ankles'], test: 'knee_wall' },
  { id: 'desk', label: 'Undo desk posture', blurb: 'Open the chest and get your upper back moving again.', areas: ['chest', 'upper_back'], test: 'reach_behind' },
  { id: 'wrists', label: 'Wrists for pressing', blurb: 'Comfortable push-ups, front squats and handstands.', areas: ['wrists'], test: 'wrist' },
]
export const GOAL_BY_ID = Object.fromEntries(GOALS.map((g) => [g.id, g]))

// Self-tests with no tools: finger widths (about 2 cm each — also the size of a
// real change) and landmark levels instead of degrees. `better` says which way
// is progress; `band` is the day-to-day wobble that isn't real change.
export const TESTS = {
  toe_touch: {
    label: 'Toe touch', unit: 'fw', signed: true, better: 'higher', band: 1,
    how: ['Warm up first. Stand tall, feet together, knees straight.', 'Reach down slowly as far as you can — no bouncing.', 'Count finger widths past the floor (+) or short of it (−).'],
  },
  knee_wall: {
    label: 'Knee to wall', unit: 'fw', sides: true, better: 'higher', band: 1,
    how: ['Face a wall in a half-kneel, front foot flat.', 'Push the knee to touch the wall without the heel lifting.', 'Slide the foot back as far as you can still touch: count finger widths from big toe to wall.'],
  },
  overhead: {
    label: 'Overhead reach', unit: 'level', better: 'higher', band: 1,
    levels: ['Hands well short of the wall', 'Close — a hand width away', 'Thumbs touch, but my back arches', 'Thumbs touch with my lower back flat'],
    how: ['Stand with your heels, bottom and head against a wall.', 'Flatten your lower back, then raise straight arms overhead.', 'Pick where your thumbs end up.'],
  },
  squat: {
    label: 'Deep squat', unit: 'level', better: 'higher', band: 1,
    levels: ["Can't get to parallel", 'Parallel, heels lift', 'All the way down, heels lift or I need to hold on', 'All the way down, heels flat, holding on', 'All the way down, heels flat, relaxed for 30 seconds'],
    how: ['Feet shoulder-width, toes slightly out.', 'Squat down as far as you comfortably can.', 'Pick the line that fits best.'],
  },
  straddle: {
    label: 'Wide-leg reach', unit: 'hw', better: 'lower', band: 1,
    how: ['Sit with your legs as wide as you can, knees straight, toes up.', 'Walk your hands forward and fold as far as you can with a long back.', 'Count hand widths from your chest to the floor (0 = touching).'],
  },
  couch: {
    label: 'Couch test', unit: 'fw', sides: true, better: 'lower', band: 1,
    how: ['Kneel facing away from a couch, back shin up its front.', 'Squeeze your glute and bring your torso upright.', 'Count finger widths from heel to bottom (0 = touching).'],
  },
  hip_9090: {
    label: '90/90 sit', unit: 'level', better: 'higher', band: 1,
    levels: ["Can't sit in it without a hand down", 'Sit in it, leaning back on my hands', 'Sit tall without hands', 'Sit tall and switch sides without hands'],
    how: ['Sit with both knees bent at 90° — one in front, one to the side.', 'Try to sit tall with your hands off the floor.', 'Pick the line that fits.'],
  },
  reach_behind: {
    label: 'Reach behind your back', unit: 'fw', sides: true, signed: true, better: 'higher', band: 1,
    how: ['Reach one hand over the shoulder and the other up from below, behind your back.', 'Try to touch fingertips.', 'Finger widths of overlap (+) or gap (−). Top hand names the side.'],
  },
  wrist: {
    label: 'Wrist extension', unit: 'level', better: 'higher', band: 1,
    levels: ['Palms flat on the floor hurts', 'Hands flat, but I can only lean a little', 'Hands flat, shoulders over my wrists', 'Hands flat, shoulders well past my wrists'],
    how: ['On all fours with your hands flat, fingers forward.', 'Shift your shoulders forward over your hands.', 'Pick where it stops being comfortable.'],
  },
}

export const UNIT_WORD = { fw: 'finger widths', hw: 'hand widths', level: 'level' }

// Safety questions — asked once, then applied quietly.
export const SAFETY_QUESTIONS = [
  { id: 'bendy', q: 'Are you very bendy?', hint: 'Thumb bends back to touch your forearm, or knees bend backward.' },
  { id: 'bone', q: 'Low bone density (osteopenia or osteoporosis)?', hint: '' },
  { id: 'pregnant', q: 'Pregnant?', hint: '' },
  { id: 'injury', q: 'A recent injury or surgery in an area you picked?', hint: '' },
]

// How time maps to work. More time = more areas fit, more sets, a deeper
// finish on the holds — never longer single holds than are useful.
export const TIME_OPTIONS = [
  { min: 15, label: '15 min', areas: 2, sets: 2, third: false, deeper: false },
  { min: 25, label: '25 min', areas: 3, sets: 2, third: true, deeper: false },
  { min: 40, label: '40 min', areas: 4, sets: 3, third: true, deeper: true },
]
export const DAYS_OPTIONS = [2, 3, 4]
export const LEVELS = [
  { id: 'new', label: 'New to this', hint: 'Gentler start, more time in the stretch.' },
  { id: 'some', label: 'I stretch sometimes', hint: 'A bit of everything.' },
  { id: 'flexible', label: 'Already flexible', hint: 'More strength at the end of your range, shorter holds.' },
]
