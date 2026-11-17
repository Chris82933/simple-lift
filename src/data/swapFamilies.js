// "Station taken" swaps: which lifts can stand in for each other, and roughly
// how their loads compare.
//
// Each family has a reference lift (r = 1). Every other member's `r` is its
// typical load relative to that reference for the same effort — a gym rule of
// thumb, not a law. Dumbbell and kettlebell values are PER DUMBBELL (what you
// pick up in one hand). Confidence:
//   H — barbell ↔ barbell, well-established
//   M — reasonable, but technique/bracing differ
//   L — machines: stacks, cams and sleds vary a lot between gyms
//
// Within a family, members are listed in order of how good a stand-in they
// are for the reference lift (what an experienced lifter would reach for
// first) — that order is the ranking. Load-capable stand-ins come before
// light dumbbell versions: a 225 lb squatter is poorly served by a goblet squat.
//
// Deliberately separate from STRENGTH_RATIOS (oneRepMax.js): those feed
// estimated maxes and starting weights, and machine numbers must never leak
// into those.
const fam = (family, members) => Object.fromEntries(Object.entries(members).map(([id, [r, conf]]) => [id, { family, r, conf }]))

export const SWAP_TABLE = {
  ...fam('squat', {
    back_squat: [1, 'H'], hack_squat: [1.1, 'L'], smith_squat: [0.95, 'M'], leg_press: [1.8, 'L'],
    front_squat: [0.85, 'H'], box_squat: [0.95, 'H'], pause_squat: [0.85, 'H'], zercher_squat: [0.8, 'M'],
    barbell_hack_squat: [0.8, 'M'], landmine_squat: [0.5, 'L'], bulgarian_split: [0.25, 'M'], split_squat: [0.3, 'M'],
    goblet_squat: [0.3, 'M'], kb_goblet_squat: [0.3, 'M'], reverse_lunge: [0.27, 'M'], walking_lunge: [0.25, 'M'],
    single_leg_leg_press: [0.8, 'L'],
  }),
  ...fam('hinge', {
    deadlift: [1, 'H'], trap_bar_deadlift: [1.05, 'H'], sumo_deadlift: [1, 'M'], rack_pull: [1.12, 'M'],
    romanian_dl: [0.75, 'H'], stiff_leg_deadlift: [0.7, 'M'], hip_thrust: [1.1, 'M'], good_morning: [0.42, 'M'],
    landmine_rdl: [0.5, 'L'], db_rdl: [0.35, 'M'], kb_deadlift: [0.4, 'L'],
  }),
  ...fam('horiz_push', {
    bench_press: [1, 'H'], db_bench: [0.37, 'M'], smith_bench: [0.95, 'M'], chest_press_machine: [1.0, 'L'],
    paused_bench: [0.95, 'H'], close_grip_bench: [0.9, 'H'], incline_bench: [0.82, 'H'], incline_db_press: [0.32, 'M'],
    kb_floor_press: [0.33, 'L'],
  }),
  ...fam('vert_push', {
    overhead_press: [1, 'H'], db_shoulder_press: [0.38, 'M'], seated_shoulder_press: [0.4, 'M'], machine_shoulder_press: [1.0, 'L'],
    arnold_press: [0.32, 'M'], landmine_press: [0.55, 'L'], kb_press: [0.35, 'L'],
  }),
  ...fam('horiz_pull', {
    barbell_row: [1, 'H'], pendlay_row: [0.9, 'H'], db_row: [0.45, 'M'], seated_cable_row: [0.9, 'L'],
    chest_supported_row: [0.38, 'L'], seated_row_machine: [1.0, 'L'], smith_row: [0.95, 'M'],
    landmine_row: [0.6, 'L'], kb_row: [0.4, 'L'],
  }),
  ...fam('vert_pull', {
    lat_pulldown: [1, 'M'], cable_pulldown: [1, 'M'], lat_pulldown_wide: [0.95, 'M'], lat_pulldown_narrow: [1.0, 'M'],
  }),
  ...fam('biceps', {
    barbell_curl: [1, 'H'], ez_curl: [1, 'H'], db_curl: [0.4, 'M'], hammer_curl: [0.45, 'M'],
    incline_db_curl: [0.33, 'M'], preacher_curl_machine: [0.8, 'L'], bayesian_curl: [0.25, 'L'],
  }),
  ...fam('triceps', {
    cable_pushdown: [1, 'M'], cable_overhead_ext: [0.7, 'L'], machine_triceps_extension: [0.9, 'L'],
    db_overhead_ext: [0.6, 'L'], db_skullcrusher: [0.25, 'L'],
  }),
  ...fam('lateral', { lateral_raise: [1, 'H'], cable_lateral: [0.6, 'L'] }),
  ...fam('calf', {
    standing_calf_raise: [1, 'L'], seated_calf_raise: [0.6, 'M'], calf_press: [1.4, 'L'], db_calf_raise: [0.25, 'L'],
  }),
  ...fam('chest_fly', { pec_deck: [1, 'L'], cable_fly: [0.5, 'L'] }),
}

export const swapInfo = (id) => SWAP_TABLE[id] || null
// Position within its family: lower = better stand-in.
const ORDER = Object.fromEntries(Object.keys(SWAP_TABLE).map((id, i) => [id, i]))
export const swapRank = (id) => ORDER[id] ?? 1e6
export const swapFamilyOf = (id) => SWAP_TABLE[id]?.family || null
