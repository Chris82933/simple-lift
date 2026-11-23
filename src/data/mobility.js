// Mobility: strength through range of motion.
//
// The evidence in brief (see docs in the Mobility screen's "Why it works"):
// - Loaded reps through a full, slow range improve flexibility about as well as
//   stretching does (Afonso et al. 2021) AND build strength at long muscle
//   lengths — so every area leads with slow, loaded end-range reps.
// - Holds come second. They mostly raise stretch tolerance: real and useful,
//   but it fades without upkeep. Long holds are for range, not for muscle.
// - Total weekly time per area is what counts, not how it's split: gains level
//   off around ~4 min per muscle per session and ~10 min per week (Ingram et al.
//   2025). 2–3 visits a week is just the easy way to get there. Results: easier
//   in 2–4 weeks, real range at 6–8 weeks.
// - Range from strength work needs a load: bodyweight-only moves build strength
//   and control at length, not much range (Alizadeh et al. 2023) — so the leg
//   lifts and frog lifts here are for control, and holds still do the range.
// - One change at a time: range, then time or reps, then load.
//
// Every move id is an exercise in exercises.js, so muscle maps, search and
// form videos work everywhere.

// How a move is done in a session.
//   kind: 'reps' (slow, paced reps) | 'hold' (timed)
//   tempo: seconds lowering / pause in the stretch / rising — the player paces it
//   phases: what to call those three parts when 'lower / hold / up' doesn't fit
//   loadHint: what weight to start with
//   paced: false → self-paced (a Nordic can't be metronomed)
//   perSide: done left then right
//   loadable: 'none' | 'optional' | 'required' — whether a weight belongs in it
//   dose: per experience level → { sets, reps } or { sets, sec }
//   flex: true → loaded spinal flexion (hidden for low bone density/pregnancy)
//   heavy: true → hard eccentric: max 2× a week, 48 h apart, longer rest
//   active: true → a STRENGTH hold at end range (not a stretch): its own
//     time step/cap, no "sink deeper", no contract-relax
//   range: true → depth is the first thing to progress ("full depth with control?")
//   repsCap: where adding reps stops and the next lever starts
//   smallLoad: small weight jumps (wrist work, light accessories)
//   noPregnancy / noBone / boneNoLoad: quietly adjusted by the safety answers
//   primerOk: fine in the 10-minute pre-climbing primer (no heavy, no forearms)
//   maxSec: the longest a passive hold goes; loadMax: { lbs, kg } weight ceiling
//   rangeWord: what "depth" means for a range move ('height' for leg lifts)
const T3 = { down: 3, pause: 1, up: 1 }
const T4 = { down: 4, pause: 2, up: 1 }
const r = (sets, reps) => ({ sets, reps })
const h = (sets, sec) => ({ sets, sec })

export const MOVES = {
  // Back of the legs
  elephant_walk: { kind: 'reps', range: true, primerOk: true, phases: ['Straighten one knee', 'Feel the stretch', 'Switch legs'], tempo: { down: 2, pause: 1, up: 1 }, loadable: 'none', dose: { new: r(2, 10), some: r(2, 12), flexible: r(2, 12) } },
  seated_pike_pulse: { kind: 'hold', boneNoLoad: true, loadable: 'optional', dose: { new: h(2, 30), some: h(3, 45), flexible: h(2, 30) } },
  db_rdl: { kind: 'reps', repsCap: 12, loadHint: { lbs: 'Per dumbbell. Start with 10–20 lb.', kg: 'Per dumbbell. Start with 5–8 kg.' }, tempo: T4, loadable: 'required', dose: { new: r(2, 8), some: r(3, 8), flexible: r(3, 8) } },
  jefferson_curl: { kind: 'reps', repsCap: 8, loadOncePerBlock: true, phases: ['Roll down', 'Hang', 'Roll up'], loadHint: { lbs: 'Start very light: 5–10 lb.', kg: 'Start very light: 2–5 kg.' }, tempo: { down: 5, pause: 1, up: 5 }, loadable: 'required', flex: true, heavy: true, dose: { new: r(2, 6), some: r(2, 8), flexible: r(3, 8) } },
  nordic_curl: { kind: 'reps', repsCap: 6, after: 'harder', paced: false, loadable: 'none', heavy: true, dose: { new: r(2, 3), some: r(2, 4), flexible: r(3, 5) } },
  // Inner thighs & hips
  frog_stretch_rock: { kind: 'reps', range: true, primerOk: true, phases: ['Rock back', 'Feel the stretch', 'Rock forward'], tempo: { down: 3, pause: 2, up: 1 }, loadable: 'none', dose: { new: r(2, 10), some: r(2, 12), flexible: r(2, 12) } },
  cossack_squat: { kind: 'reps', range: true, primerOk: true, phases: ['Sit into one side', 'Hold the bottom', 'Back to the middle'], tempo: T3, perSide: true, loadable: 'optional', dose: { new: r(2, 5), some: r(3, 6), flexible: r(3, 8) } },
  copenhagen_hold: { kind: 'hold', active: true, heavy: true, holdStep: 5, holdCap: 30, after: 'harder', noPregnancy: true, perSide: true, loadable: 'none', dose: { new: h(1, 10), some: h(2, 15), flexible: h(2, 20) } },
  pancake_good_morning: { kind: 'reps', range: true, noPregnancy: true, tempo: T4, loadable: 'optional', dose: { new: r(2, 8), some: r(3, 8), flexible: r(3, 10) } },
  // Front of the hips & quads
  half_kneeling_hip_flexor: { kind: 'hold', perSide: true, loadable: 'none', dose: { new: h(2, 30), some: h(2, 45), flexible: h(2, 30) } },
  couch_stretch: { kind: 'hold', perSide: true, loadable: 'optional', dose: { new: h(2, 30), some: h(2, 45), flexible: h(2, 30) } },
  atg_split_squat: { kind: 'reps', range: true, tempo: T3, perSide: true, loadable: 'optional', dose: { new: r(2, 6), some: r(3, 8), flexible: r(3, 8) } },
  reverse_nordic: { kind: 'reps', range: true, repsCap: 8, tempo: { down: 4, pause: 1, up: 2 }, loadable: 'optional', heavy: true, dose: { new: r(2, 5), some: r(3, 6), flexible: r(3, 8) } },
  // Calves & ankles
  tibialis_raise: { kind: 'reps', smallLoad: true, repsCap: 25, phases: ['Toes up', 'Squeeze', 'Lower'], tempo: { down: 2, pause: 1, up: 1 }, loadable: 'optional', dose: { new: r(2, 15), some: r(2, 20), flexible: r(3, 20) } },
  eccentric_heel_drop: { kind: 'reps', repsCap: 20, phases: ['Lower the heel', 'Hold the stretch', 'Rise on both feet'], tempo: { down: 3, pause: 2, up: 1 }, perSide: true, loadable: 'optional', dose: { new: r(2, 12), some: r(3, 12), flexible: r(3, 15) } },
  loaded_ankle_rocker: { kind: 'reps', phases: ['Knee forward', 'Hold, heel down', 'Ease back'], loadHint: { lbs: 'A dumbbell on the knee: 15–25 lb.', kg: 'A dumbbell on the knee: 7–12 kg.' }, tempo: { down: 2, pause: 2, up: 1 }, perSide: true, loadable: 'required', dose: { new: r(2, 10), some: r(3, 10), flexible: r(3, 12) } },
  patrick_step: { kind: 'reps', range: true, repsCap: 20, phases: ['Knee forward, tap the heel', 'Pause', 'Stand up'], tempo: T3, perSide: true, loadable: 'optional', dose: { new: r(2, 10), some: r(3, 12), flexible: r(3, 15) } },
  deep_squat_hold: { kind: 'hold', loadable: 'optional', dose: { new: h(2, 30), some: h(3, 45), flexible: h(2, 30) } },
  // Shoulders overhead
  scap_wall_slide: { kind: 'reps', primerOk: true, phases: ['Slide up', 'Hold', 'Slide down'], tempo: { down: 3, pause: 1, up: 2 }, loadable: 'none', dose: { new: r(2, 10), some: r(2, 12), flexible: r(2, 12) } },
  dead_hang: { kind: 'hold', active: true, primerOk: true, holdStep: 10, holdCap: 60, loadable: 'optional', dose: { new: h(3, 20), some: h(3, 40), flexible: h(3, 30) } },
  lat_stretch_db_pullover: { kind: 'reps', smallLoad: true, noPregnancy: true, loadHint: { lbs: 'One dumbbell, 10–20 lb.', kg: 'One dumbbell, 5–8 kg.' }, tempo: T4, loadable: 'required', dose: { new: r(2, 10), some: r(3, 10), flexible: r(3, 10) } },
  overhead_squat: { kind: 'reps', tempo: T3, loadable: 'optional', dose: { new: r(2, 5), some: r(3, 5), flexible: r(3, 5) } },
  // Chest & front of shoulders
  doorway_pec_stretch: { kind: 'hold', perSide: true, loadable: 'none', dose: { new: h(2, 30), some: h(3, 45), flexible: h(2, 30) } },
  pushup: { kind: 'reps', tempo: { down: 3, pause: 1, up: 1 }, loadable: 'none', repsCap: 15, dose: { new: r(2, 6), some: r(3, 10), flexible: r(3, 12) } },
  deficit_pushup: { kind: 'reps', range: true, tempo: { down: 3, pause: 1, up: 1 }, loadable: 'optional', dose: { new: r(2, 6), some: r(3, 8), flexible: r(3, 12) } },
  cable_fly: { kind: 'reps', tempo: T4, loadable: 'required', dose: { new: r(2, 10), some: r(3, 10), flexible: r(3, 12) } },
  // Upper back twist
  open_book: { kind: 'reps', primerOk: true, phases: ['Open up', 'Hold it open', 'Close'], tempo: { down: 2, pause: 3, up: 2 }, perSide: true, loadable: 'none', dose: { new: r(2, 8), some: r(2, 10), flexible: r(2, 10) } },
  bench_t_spine_extension: { kind: 'reps', phases: ['Sink the chest', 'Hold', 'Come up'], tempo: { down: 2, pause: 3, up: 1 }, loadable: 'none', dose: { new: r(2, 8), some: r(3, 8), flexible: r(3, 10) } },
  kb_windmill: { kind: 'reps', noBone: true, tempo: T3, perSide: true, loadable: 'required', dose: { new: r(2, 5), some: r(3, 5), flexible: r(3, 6) } },
  // Spine & lower back
  cat_cow_segmental: { kind: 'reps', primerOk: true, phases: ['Round up', 'Pause', 'Arch down'], tempo: { down: 3, pause: 1, up: 3 }, loadable: 'none', dose: { new: r(2, 8), some: r(2, 8), flexible: r(2, 8) } },
  back_extension: { kind: 'reps', noPregnancy: true, tempo: T3, loadable: 'optional', dose: { new: r(2, 10), some: r(3, 12), flexible: r(3, 12) } },
  // Wrists & forearms
  wrist_flexor_stretch: { kind: 'hold', perSide: true, loadable: 'none', dose: { new: h(2, 30), some: h(2, 30), flexible: h(2, 30) } },
  wrist_extensor_stretch: { kind: 'hold', perSide: true, loadable: 'none', dose: { new: h(2, 30), some: h(2, 30), flexible: h(2, 30) } },
  loaded_wrist_extension_rock: { kind: 'reps', phases: ['Rock forward', 'Hold', 'Rock back'], tempo: { down: 2, pause: 2, up: 1 }, loadable: 'none', dose: { new: r(2, 10), some: r(3, 10), flexible: r(3, 12) } },
  wrist_curl: { kind: 'reps', smallLoad: true, repsCap: 20, loadHint: { lbs: 'Per dumbbell. Start with 5–10 lb.', kg: 'Per dumbbell. Start with 2–4 kg.' }, tempo: T3, loadable: 'required', dose: { new: r(2, 15), some: r(3, 12), flexible: r(3, 15) } },
  eccentric_wrist_extension: { kind: 'reps', smallLoad: true, repsCap: 20, tempo: { down: 4, pause: 0, up: 1 }, loadable: 'required', dose: { new: r(2, 12), some: r(3, 12), flexible: r(3, 15) } },
  // Hip rotation
  hip_90_90_switch: { kind: 'reps', primerOk: true, phases: ['Rotate over', 'Settle tall', 'Rotate back'], tempo: { down: 2, pause: 1, up: 2 }, loadable: 'none', dose: { new: r(2, 6), some: r(3, 8), flexible: r(3, 10) } },
  hip_90_90_liftoff: { kind: 'hold', active: true, primerOk: true, holdStep: 2, holdCap: 10, after: 'harder', perSide: true, loadable: 'none', dose: { new: h(2, 5), some: h(3, 8), flexible: h(3, 10) } },
  // Neck (never loaded)
  chin_tuck: { kind: 'reps', phases: ['Tuck the chin', 'Hold', 'Release'], tempo: { down: 2, pause: 3, up: 1 }, loadable: 'none', dose: { new: r(2, 10), some: r(2, 10), flexible: r(2, 10) } },
  upper_trap_stretch: { kind: 'hold', perSide: true, loadable: 'none', dose: { new: h(2, 20), some: h(2, 30), flexible: h(2, 20) } },

  // ---- Program-only areas (full-body 120 min and climbing) ----------------
  // Hip turnout (frog, stemming, drop knees)
  wall_frog: { kind: 'hold', primerOk: true, noPregnancy: true, maxSec: 45, loadable: 'none', dose: { new: h(2, 30), some: h(2, 45), flexible: h(2, 30) } },
  hip_airplane: { kind: 'reps', primerOk: true, noPregnancy: true, repsCap: 8, phases: ['Open the hip', 'Pause', 'Close past square'], tempo: { down: 3, pause: 1, up: 3 }, perSide: true, loadable: 'none', dose: { new: r(2, 4), some: r(3, 5), flexible: r(3, 6) } },
  active_frog_lift: { kind: 'reps', range: true, active: true, rangeWord: 'height', noPregnancy: true, repsCap: 12, phases: ['Lift both knees', 'Hold', 'Lower slowly'], tempo: { down: 1, pause: 2, up: 2 }, loadable: 'none', dose: { new: r(2, 5), some: r(2, 8), flexible: r(3, 10) } },
  // Leg-lift strength (high steps, compression)
  high_step_leg_raise: { kind: 'reps', primerOk: true, range: true, active: true, rangeWord: 'height', repsCap: 15, phases: ['Lift the foot', 'Hold it high', 'Lower slowly'], tempo: { down: 1, pause: 1, up: 2 }, perSide: true, loadable: 'none', dose: { new: r(2, 8), some: r(2, 10), flexible: r(3, 12) } },
  pike_compression_lift: { kind: 'reps', primerOk: true, range: true, active: true, rangeWord: 'height', noPregnancy: true, noBone: true, repsCap: 15, phases: ['Lift the heels', 'Hold', 'Lower'], tempo: { down: 1, pause: 2, up: 2 }, loadable: 'none', dose: { new: r(2, 6), some: r(3, 8), flexible: r(3, 10) } },
  active_high_step_hold: { kind: 'hold', primerOk: true, active: true, holdStep: 2, holdCap: 15, after: 'harder', perSide: true, loadable: 'none', dose: { new: h(2, 5), some: h(3, 8), flexible: h(3, 10) } },
  straddle_compression_lift: { kind: 'reps', range: true, active: true, rangeWord: 'height', noPregnancy: true, repsCap: 12, phases: ['Lift one leg', 'Hold', 'Lower'], tempo: { down: 1, pause: 2, up: 2 }, perSide: true, loadable: 'none', dose: { new: r(2, 5), some: r(3, 6), flexible: r(3, 8) } },
  hanging_leg_raise: { kind: 'reps', range: true, active: true, rangeWord: 'height', noPregnancy: true, repsCap: 12, phases: ['Lift the legs', 'Pause', 'Lower slowly'], tempo: { down: 1, pause: 1, up: 3 }, loadable: 'none', dose: { new: r(2, 5), some: r(3, 6), flexible: r(3, 8) } },
  // Shoulder control (rotator cuff and shoulder blades)
  band_external_rotation: { kind: 'reps', primerOk: true, repsCap: 20, phases: ['Rotate out', 'Hold', 'Return slowly'], tempo: { down: 2, pause: 1, up: 3 }, perSide: true, loadable: 'none', dose: { new: r(2, 12), some: r(2, 15), flexible: r(3, 15) } },
  band_pull_apart: { kind: 'reps', primerOk: true, repsCap: 20, phases: ['Pull apart', 'Squeeze', 'Return slowly'], tempo: { down: 2, pause: 1, up: 2 }, loadable: 'none', dose: { new: r(2, 12), some: r(2, 15), flexible: r(3, 15) } },
  prone_y_raise: { kind: 'reps', primerOk: true, smallLoad: true, noPregnancy: true, repsCap: 15, loadMax: { lbs: 5, kg: 2 }, phases: ['Raise the arms', 'Hold', 'Lower'], tempo: { down: 2, pause: 2, up: 2 }, loadable: 'optional', loadHint: { lbs: 'No weight to start. Later 1–3 lb.', kg: 'No weight to start. Later 0.5–1 kg.' }, dose: { new: r(2, 8), some: r(3, 10), flexible: r(3, 12) } },
  scap_pull_up: { kind: 'reps', primerOk: true, repsCap: 12, phases: ['Pull the shoulders down', 'Hold', 'Relax up slowly'], tempo: { down: 1, pause: 2, up: 2 }, loadable: 'none', dose: { new: r(2, 6), some: r(3, 8), flexible: r(3, 10) } },
  cuban_rotation: { kind: 'reps', smallLoad: true, repsCap: 12, loadMax: { lbs: 8, kg: 4 }, phases: ['Rotate up', 'Pause', 'Lower slowly'], tempo: { down: 2, pause: 1, up: 3 }, loadable: 'optional', loadHint: { lbs: 'Empty hands first. Later 2–5 lb — never more than 8.', kg: 'Empty hands first. Later 1–2 kg — never more than 4.' }, dose: { new: r(2, 8), some: r(3, 10), flexible: r(3, 10) } },
  // Forearm balance (the muscles climbing doesn't train)
  finger_ext_band: { kind: 'reps', repsCap: 25, phases: ['Open the hand', 'Hold wide', 'Close slowly'], tempo: { down: 1, pause: 1, up: 2 }, loadable: 'none', dose: { new: r(2, 12), some: r(2, 15), flexible: r(3, 15) } },
  reverse_wrist_curl: { kind: 'reps', smallLoad: true, repsCap: 20, loadHint: { lbs: 'Per dumbbell. Start with 3–8 lb.', kg: 'Per dumbbell. Start with 1–4 kg.' }, tempo: T3, loadable: 'required', dose: { new: r(2, 12), some: r(3, 12), flexible: r(3, 15) } },
  pronation_supination: { kind: 'reps', smallLoad: true, repsCap: 15, phases: ['Turn the palm down', 'Pause', 'Turn the palm up'], tempo: { down: 2, pause: 1, up: 2 }, perSide: true, loadable: 'required', loadHint: { lbs: 'A dumbbell held at one end, or a hammer. Choke up to make it easier.', kg: 'A dumbbell held at one end, or a hammer. Choke up to make it easier.' }, dose: { new: r(2, 8), some: r(2, 10), flexible: r(3, 10) } },
}

// Body areas, in plain words. `ladder` runs easiest → hardest; the app picks
// where to start from experience and moves people up one rung at a time.
export const AREAS = [
  { id: 'hamstrings', label: 'Back of the legs', muscles: ['hamstrings'], ladder: ['elephant_walk', 'seated_pike_pulse', 'db_rdl', 'jefferson_curl', 'nordic_curl'], test: 'toe_touch' },
  { id: 'hips_groin', label: 'Inner thighs & hips', muscles: ['glutes', 'hamstrings'], ladder: ['frog_stretch_rock', 'cossack_squat', 'copenhagen_hold', 'pancake_good_morning'], test: 'straddle' },
  { id: 'hip_flexors', label: 'Front of hips & quads', muscles: ['quads'], ladder: ['half_kneeling_hip_flexor', 'couch_stretch', 'atg_split_squat', 'reverse_nordic'], test: 'couch' },
  { id: 'ankles', label: 'Calves & ankles', muscles: ['calves', 'tibialis'], ladder: ['tibialis_raise', 'eccentric_heel_drop', 'deep_squat_hold', 'loaded_ankle_rocker', 'patrick_step'], test: 'knee_wall' },
  { id: 'overhead', label: 'Shoulders overhead', muscles: ['lats', 'shoulders'], ladder: ['scap_wall_slide', 'dead_hang', 'lat_stretch_db_pullover', 'overhead_squat'], test: 'overhead' },
  { id: 'chest', label: 'Chest & front of shoulders', muscles: ['chest'], ladder: ['doorway_pec_stretch', 'pushup', 'deficit_pushup', 'cable_fly'], test: 'reach_behind' },
  { id: 'upper_back', label: 'Upper back twist', muscles: ['traps', 'obliques'], ladder: ['open_book', 'bench_t_spine_extension', 'kb_windmill'], test: 'rotation' },
  { id: 'lower_back', label: 'Spine & lower back', muscles: ['lower_back'], ladder: ['cat_cow_segmental', 'seated_pike_pulse', 'back_extension', 'jefferson_curl'], test: 'toe_touch' },
  { id: 'hip_rotation', label: 'Hip rotation', muscles: ['glutes'], ladder: ['hip_90_90_switch', 'hip_90_90_liftoff', 'cossack_squat'], test: 'hip_9090' },
  { id: 'wrists', label: 'Wrists & forearms', muscles: ['forearms'], ladder: ['wrist_flexor_stretch', 'wrist_extensor_stretch', 'loaded_wrist_extension_rock', 'wrist_curl', 'eccentric_wrist_extension'], test: 'wrist' },
  { id: 'neck', label: 'Neck (gentle)', muscles: ['neck', 'traps'], ladder: ['chin_tuck', 'upper_trap_stretch'], test: null, gentle: true },
  // Used by the programs only. New ids, so nobody's saved levels shift.
  { id: 'climb_turnout', label: 'Hip turnout', programOnly: true, muscles: ['glutes'], ladder: ['frog_stretch_rock', 'wall_frog', 'cossack_squat', 'hip_airplane', 'copenhagen_hold', 'active_frog_lift'], test: 'wall_frog' },
  { id: 'compression', label: 'Leg-lift strength', programOnly: true, muscles: ['abs', 'quads'], ladder: ['high_step_leg_raise', 'pike_compression_lift', 'active_high_step_hold', 'straddle_compression_lift', 'hanging_leg_raise'], test: 'foot_raise' },
  { id: 'shoulder_control', label: 'Shoulder control', programOnly: true, muscles: ['shoulders', 'traps'], ladder: ['band_external_rotation', 'band_pull_apart', 'prone_y_raise', 'scap_pull_up', 'dead_hang', 'cuban_rotation'], test: 'shoulder_er' },
  { id: 'climb_forearms', label: 'Forearm balance', programOnly: true, muscles: ['forearms'], ladder: ['finger_ext_band', 'wrist_flexor_stretch', 'reverse_wrist_curl', 'pronation_supination', 'eccentric_wrist_extension'], test: null },
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
  { id: 'desk', label: 'Undo desk posture', blurb: 'Open the chest and get your upper back moving again.', areas: ['chest', 'upper_back'], test: 'rotation' },
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
    label: 'Knee to wall', unit: 'cm', sides: true, better: 'higher', band: 1,
    how: ['Face a wall in a half-kneel, front foot flat.', 'Push the knee to touch the wall without the heel lifting.', 'Slide the foot back as far as you can still touch, and measure big toe to wall in cm (no tape? one finger width ≈ 2 cm).'],
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
    label: 'Wide-leg reach', unit: 'hw', better: 'lower', band: 0,
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
  rotation: {
    label: 'Seated twist', unit: 'level', better: 'higher', band: 1,
    levels: ['I mostly face forward', 'About halfway (45°)', 'Chest faces the side wall', 'Past the side wall'],
    how: ['Sit on a chair, knees together, a stick or towel across your shoulders.', 'Turn your upper body as far as you can without your knees moving.', 'Pick where your chest ends up (do both sides; note the tighter one).'],
  },
  wrist: {
    label: 'Wrist extension', unit: 'level', better: 'higher', band: 1,
    levels: ['Palms flat on the floor hurts', 'Hands flat, but I can only lean a little', 'Hands flat, shoulders over my wrists', 'Hands flat, shoulders well past my wrists'],
    how: ['On all fours with your hands flat, fingers forward.', 'Shift your shoulders forward over your hands.', 'Pick where it stops being comfortable.'],
  },
}

TESTS.foot_raise = {
  label: 'High step', unit: 'cm', sides: true, better: 'higher', band: 3, own: true,
  how: ['Face a wall, toes one foot-length back, hands on the wall at shoulder height.', 'Lift one foot as high as you can and touch the wall with your toes — hips square, standing knee straight.', 'Measure floor to toes in cm (no tape? a hand width is about 10 cm). For your own progress only — height changes it.'],
}
TESTS.wall_frog = {
  label: 'Frog to the floor', unit: 'fw', better: 'lower', band: 1,
  how: ['Lie face-down in a frog: knees wide and bent about 90°, ankles in line with the knees, a pad under them.', 'Let your hips sink — feel it in the groin, never the knee.', 'Count finger widths from your hip bones to the floor (0 = flat).'],
}
TESTS.shoulder_er = {
  label: 'Shoulder turn-out', unit: 'level', sides: true, better: 'higher', band: 1,
  levels: ['Forearm points up or forward', 'Forearm halfway to the floor', 'Back of the hand nearly flat', 'Back of the hand flat, shoulder stays down'],
  how: ['Lie on your back, arm out at shoulder height, elbow bent 90°. (Pregnant past about 20 weeks: prop yourself up or skip this one.)', 'Let the back of your hand fall toward the floor beside your head without the shoulder lifting.', 'Pick the line that fits, for each side.'],
}

export const UNIT_WORD = { fw: 'finger widths', hw: 'hand widths', cm: 'cm', level: 'level' }

// Safety questions — asked once, then applied quietly.
export const SAFETY_QUESTIONS = [
  { id: 'bendy', q: 'Are you very bendy?', hint: 'Your thumb bends back to touch your forearm, or your knees bend backward.' },
  { id: 'bone', q: 'Low bone density (osteopenia or osteoporosis)?', hint: '' },
  { id: 'pregnant', q: 'Pregnant?', hint: '' },
  { id: 'injury', q: 'A recent injury or surgery in an area you picked?', hint: '' },
]

// How time maps to work. More time = more areas fit, more sets, a deeper
// finish on the holds — never longer single holds than are useful.
export const TIME_OPTIONS = [
  { min: 10, label: '10 min', areas: 1, sets: 2, third: false, deeper: false },
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

// ---- Ready-made programs -------------------------------------------------
// A program is a fixed list of areas per day, run through the same engine:
// each area does its slow-reps move, then its hold, with the same levels and
// progression as a plan you build yourself.
//
// Full body: every length is built to land the ~10 min a week per area that
// the evidence says is where gains level off (Ingram 2025) — 30 min × 4 or
// 60 min × 3 get there; 90 and 120 min add breadth, not more range per area.
// Holds are one longer hold (45–60 s) rather than several short ones: the
// same stretch time with less rest (Bandy 1997).
//
// Climbing: hip turnout and leg-lift strength lead every session; forearm
// balance always goes last and never before climbing; no heavy lowering work
// at all (it competes with hard climbing for recovery). Mobility work does not
// protect fingers or pulleys — load management does — and the app says so.
//   sets: { reps, hold } per move; holdMin: shortest passive hold (s);
//   holdCap: longest hold; repsScale: lighter primer reps; heavyMax: heavy
//   moves per session; only: a move flag every move must have; noGear: gear
//   to leave out (tired fingers after climbing); breakAfter: a water break.
const S = (title, areas, breakAfter) => ({ title, areas, breakAfter })
const LEGS = S('Legs', ['hamstrings', 'hip_flexors', 'ankles'])
export const PROGRAMS = [
  {
    id: 'full_body',
    label: 'Full-body strength & range',
    blurb: 'Every major area in one plan, from 30 minutes to 2 hours.',
    tests: ['toe_touch', 'squat', 'overhead', 'rotation'],
    lengths: [
      {
        min: 30, label: '30 min', perWeek: { def: 4, options: [2, 3, 4, 5] }, sets: { reps: 2, hold: 1 }, holdMin: 60, heavyMax: 1, warmSec: 180,
        note: 'Two alternating days. Four a week gives each area its full weekly dose.',
        days: [
          { label: 'Day A · Legs & reach', sections: [S('Legs & reach', ['hamstrings', 'hip_flexors', 'overhead', 'upper_back'])] },
          { label: 'Day B · Hips & chest', sections: [S('Hips & chest', ['hips_groin', 'ankles', 'chest', 'hip_rotation'])] },
        ],
      },
      {
        min: 60, label: '60 min', perWeek: { def: 3, options: [1, 2, 3] }, sets: { reps: 3, hold: 1 }, holdMin: 60, heavyMax: 2, warmSec: 300, deeper: true,
        note: 'The sweet spot: every main area, every session.',
        days: [{ label: 'Full body', sections: [LEGS, S('Hips', ['hips_groin', 'hip_rotation'], 60), S('Upper body', ['overhead', 'chest', 'upper_back'])] }],
      },
      {
        min: 90, label: '90 min', perWeek: { def: 2, options: [1, 2] }, sets: { reps: 3, hold: 1 }, holdMin: 60, heavyMax: 2, warmSec: 360, deeper: true,
        note: 'Adds spine and wrists. Covers everything in one go — two or three shorter sessions work as well.',
        days: [{ label: 'Full body', sections: [LEGS, S('Hips', ['hips_groin', 'hip_rotation'], 120), S('Upper body', ['overhead', 'chest', 'upper_back']), S('Spine & wrists', ['lower_back', 'wrists'])] }],
      },
      {
        min: 120, label: '2 hours', perWeek: { def: 1, options: [1, 2] }, sets: { reps: 3, hold: 1 }, holdMin: 60, heavyMax: 2, warmSec: 420, deeper: true,
        note: 'Everything, plus leg-lift strength and shoulder control. Once a week keeps your range; twice builds it.',
        days: [{ label: 'Full body · long', sections: [LEGS, S('Hips & leg lifts', ['hips_groin', 'hip_rotation', 'compression'], 120), S('Upper body', ['overhead', 'chest', 'upper_back', 'shoulder_control'], 120), S('Spine, wrists & neck', ['lower_back', 'wrists', 'neck'])] }],
      },
    ],
  },
  {
    id: 'climbing',
    label: 'Climbing & bouldering',
    blurb: 'Hips for high steps and drop knees, shoulders and forearms that hold up.',
    tests: ['foot_raise', 'wall_frog', 'shoulder_er', 'hip_9090'],
    exclude: ['heavy'],
    climbDays: { def: 3, options: [2, 3, 4] },
    perWeekByClimbDays: { 2: 2, 3: 2, 4: 1 },
    // Pain chips → moves left out.
    pain: {
      fingers: ['dead_hang', 'scap_pull_up', 'hanging_leg_raise'],
      elbow: ['reverse_wrist_curl', 'pronation_supination', 'eccentric_wrist_extension', 'wrist_curl'],
      shoulder: ['dead_hang', 'scap_pull_up', 'hanging_leg_raise', 'cuban_rotation', 'prone_y_raise'],
    },
    lengths: [
      {
        min: 10, mode: 'primer', label: '10-min primer', sets: { reps: 1, hold: 1 }, holdCap: 20, repsScale: 0.6, only: 'primerOk', warmSec: 60,
        days: [{ label: 'Primer · before you climb', sections: [S('Primer', ['climb_turnout', 'compression', 'shoulder_control'])] }],
      },
      {
        min: 20, mode: 'after', label: '20 min after climbing', sets: { reps: 2, hold: 1 }, holdMin: 45, noGear: ['pullup_bar'], warmSec: 0,
        days: [{ label: 'After climbing', sections: [S('After climbing', ['climb_turnout', 'hip_rotation', 'climb_forearms'])] }],
      },
      {
        min: 30, label: '30 min', perWeek: { def: 2, options: [1, 2, 3] }, sets: { reps: 3, hold: 1 }, holdMin: 45, warmSec: 180,
        days: [
          { label: 'Hips & shoulders', sections: [S('Full session', ['climb_turnout', 'compression', 'shoulder_control', 'climb_forearms'])] },
          { label: 'Hips & rotation', sections: [S('Full session', ['climb_turnout', 'compression', 'hip_rotation', 'climb_forearms'])] },
        ],
      },
      {
        min: 45, label: '45 min', perWeek: { def: 2, options: [1, 2, 3] }, sets: { reps: 3, hold: 1 }, holdMin: 45, warmSec: 180, deeper: true, third: true,
        days: [
          { label: 'Hips & shoulders', sections: [S('Full session', ['climb_turnout', 'compression', 'shoulder_control', 'hamstrings', 'climb_forearms'])] },
          { label: 'Hips & reach', sections: [S('Full session', ['climb_turnout', 'compression', 'hip_rotation', 'overhead', 'climb_forearms'])] },
        ],
      },
    ],
  },
]
export const PROGRAM_BY_ID = Object.fromEntries(PROGRAMS.map((p) => [p.id, p]))
export const PAIN_CHIPS = [
  { id: 'fingers', label: 'Fingers', note: 'We leave out hangs. Finger and pulley pain is about load — build grade and volume slowly, warm up hangs progressively, rest — not flexibility. Pain at the base of a finger, or a pop: stop climbing and see a physio.' },
  { id: 'elbow', label: 'Elbow', note: 'We leave out loaded wrist and forearm work. Recovery has gentle elbow routines.' },
  { id: 'shoulder', label: 'Shoulder', note: 'We leave out hangs and the harder shoulder moves; light band work stays. Clicking with pain, catching or deep ache: get it checked.' },
]
