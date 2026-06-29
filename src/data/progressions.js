// Bodyweight skill ladders: ordered easy → hard variants of one movement.
// The builder/picker shows every level; progressive overload suggests moving
// up a level once you own the current one. `ladderOnly` keeps these variants
// out of the auto-generator (they're for templates & manual choice).
//
// Each ladder's `order` lists exercise ids from easy → hard. Some ids refer to
// exercises already in the base library (e.g. pullup, pushup, bw_squat); the
// rest are defined here.

export const LADDER_EXERCISES = [
  // ---- Vertical pull (toward the one-arm pull-up) ----
  { id: 'dead_hang', name: 'Dead Hang', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['pullup_bar'], compound: false, load: false, ladderOnly: true, cues: 'Just hang with straight arms and active shoulders — count reps as seconds.' },
  { id: 'scap_pull', name: 'Scapular Pull', pattern: 'vert_pull', regions: ['back'], requires: ['pullup_bar'], compound: false, load: false, ladderOnly: true, cues: 'From a dead hang, pull your shoulder blades down without bending the elbows.' },
  { id: 'pull_negative', name: 'Negative Pull-Up', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['pullup_bar'], compound: true, load: false, ladderOnly: true, cues: 'Jump to the top, then lower yourself as slowly as you can (aim 3–5s).' },
  { id: 'pull_band_assist', name: 'Band-Assisted Pull-Up', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['pullup_bar', 'bands'], compound: true, load: false, ladderOnly: true, cues: 'Loop a band under your feet/knee for help; full range, chin over bar.' },
  { id: 'archer_pull', name: 'Archer Pull-Up', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['pullup_bar'], compound: true, load: false, ladderOnly: true, cues: 'Pull to one hand, keeping the other arm nearly straight out to the side.' },
  { id: 'one_arm_pull', name: 'One-Arm Pull-Up', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['pullup_bar'], compound: true, load: false, ladderOnly: true, cues: 'The peak: one hand on the bar, full pull. Years in the making — be patient.' },

  // ---- Horizontal pull (rows) ----
  { id: 'incline_row', name: 'Incline Row', pattern: 'horiz_pull', regions: ['back', 'arms'], requires: ['pullup_bar'], compound: true, load: false, ladderOnly: true, cues: 'High bar, body fairly upright — easier the more upright you are.' },
  { id: 'feet_elev_row', name: 'Feet-Elevated Row', pattern: 'horiz_pull', regions: ['back', 'arms'], requires: ['pullup_bar'], compound: true, load: false, ladderOnly: true, cues: 'Feet up on a box so your torso is past horizontal — harder than a flat row.' },
  { id: 'one_arm_inverted_row', name: 'One-Arm Inverted Row', pattern: 'horiz_pull', regions: ['back', 'arms'], requires: ['pullup_bar'], compound: true, load: false, ladderOnly: true, cues: 'Row with one hand, body in a tight plank — control the rotation.' },

  // ---- Push (toward the one-arm push-up) ----
  { id: 'wall_pushup', name: 'Wall Push-Up', pattern: 'horiz_push', regions: ['chest', 'arms'], requires: [], compound: true, load: false, ladderOnly: true, cues: 'Hands on a wall, lean in and press — the gentlest starting point.' },
  { id: 'incline_pushup', name: 'Incline Push-Up', pattern: 'horiz_push', regions: ['chest', 'arms'], requires: [], compound: true, load: false, ladderOnly: true, cues: 'Hands on a bench/counter; the higher the surface, the easier.' },
  { id: 'knee_pushup', name: 'Knee Push-Up', pattern: 'horiz_push', regions: ['chest', 'arms'], requires: [], compound: true, load: false, ladderOnly: true, cues: 'Full push-up form but from the knees; keep a straight line knee-to-head.' },
  { id: 'decline_pushup', name: 'Decline Push-Up', pattern: 'horiz_push', regions: ['chest', 'shoulders', 'arms'], requires: [], compound: true, load: false, ladderOnly: true, cues: 'Feet elevated; shifts more load to the shoulders and upper chest.' },
  { id: 'pseudo_planche_pushup', name: 'Pseudo Planche Push-Up', pattern: 'horiz_push', regions: ['chest', 'shoulders', 'arms'], requires: [], compound: true, load: false, ladderOnly: true, cues: 'Hands by your hips, lean forward over them — big shoulder/lean demand.' },
  { id: 'one_arm_pushup', name: 'One-Arm Push-Up', pattern: 'horiz_push', regions: ['chest', 'arms', 'core'], requires: [], compound: true, load: false, ladderOnly: true, cues: 'Feet wide, one hand down, brace hard against the twist.' },

  // ---- Squat (toward the pistol) ----
  { id: 'assisted_squat', name: 'Assisted Squat', pattern: 'squat', regions: ['legs'], requires: [], compound: true, load: false, ladderOnly: true, cues: 'Hold a doorframe/TRX for balance and depth; build the pattern.' },
  { id: 'shrimp_squat', name: 'Shrimp Squat', pattern: 'squat', regions: ['legs', 'core'], requires: [], compound: true, load: false, ladderOnly: true, cues: 'Hold one foot behind you, squat down on the other — assist with a rail at first.' },
  { id: 'pistol_squat', name: 'Pistol Squat', pattern: 'squat', regions: ['legs', 'core'], requires: [], compound: true, load: false, ladderOnly: true, cues: 'One-leg squat, other leg out front. Full depth, stand back up under control.' },

  // ---- Hinge (toward the nordic curl) ----
  { id: 'single_leg_glute_bridge', name: 'Single-Leg Glute Bridge', pattern: 'hinge', regions: ['legs'], requires: [], compound: false, load: false, ladderOnly: true, cues: 'One foot planted, drive the hip up level; squeeze the glute.' },
  { id: 'nordic_negative', name: 'Nordic Curl Negative', pattern: 'hinge', regions: ['legs'], requires: [], compound: true, load: false, ladderOnly: true, cues: 'Anchor your feet, lower your torso as slowly as possible, push back up with hands.' },
  { id: 'nordic_curl', name: 'Nordic Curl', pattern: 'hinge', regions: ['legs'], requires: [], compound: true, load: false, ladderOnly: true, cues: 'Lower and pull yourself back up using only the hamstrings — elite hamstring strength.' },

  // ---- Core: compression / leg raises (toward toes-to-bar) ----
  { id: 'lying_leg_raise', name: 'Lying Leg Raise', pattern: 'core', regions: ['core'], requires: [], compound: false, load: false, ladderOnly: true, cues: 'On your back, lower legs slowly, low back pressed down.' },
  { id: 'hanging_knee_raise', name: 'Hanging Knee Raise', pattern: 'core', regions: ['core'], requires: ['pullup_bar'], compound: false, load: false, ladderOnly: true, cues: 'Hang and drive your knees to your chest, no swinging.' },
  { id: 'toes_to_bar', name: 'Toes-to-Bar', pattern: 'core', regions: ['core'], requires: ['pullup_bar'], compound: false, load: false, ladderOnly: true, cues: 'Straight-ish legs all the way up to touch the bar — control the descent.' },

  // ---- Core: anti-extension ----
  { id: 'long_lever_plank', name: 'Long-Lever Plank', pattern: 'core', regions: ['core'], requires: [], compound: false, load: false, ladderOnly: true, cues: 'Elbows further forward of the shoulders — much harder anti-extension hold.' },
]

// Ordered easy → hard. Ids may reference base-library exercises too.
export const LADDERS = [
  { id: 'vpull', name: 'Pull-Up Progression', order: ['dead_hang', 'scap_pull', 'pull_negative', 'pull_band_assist', 'pullup', 'archer_pull', 'one_arm_pull'] },
  { id: 'hpull', name: 'Row Progression', order: ['incline_row', 'inverted_row', 'feet_elev_row', 'one_arm_inverted_row'] },
  { id: 'push', name: 'Push-Up Progression', order: ['wall_pushup', 'incline_pushup', 'knee_pushup', 'pushup', 'decline_pushup', 'pseudo_planche_pushup', 'one_arm_pushup'] },
  { id: 'dip', name: 'Dip Progression', order: ['bench_dip', 'dip'] },
  { id: 'squat_prog', name: 'Squat Progression', order: ['assisted_squat', 'bw_squat', 'bulgarian_split', 'shrimp_squat', 'pistol_squat'] },
  { id: 'hinge_prog', name: 'Hamstring Progression', order: ['glute_bridge', 'single_leg_glute_bridge', 'single_leg_rdl', 'nordic_negative', 'nordic_curl'] },
  { id: 'core_comp', name: 'Leg-Raise Progression', order: ['lying_leg_raise', 'hanging_knee_raise', 'hanging_leg_raise', 'toes_to_bar'] },
  { id: 'core_brace', name: 'Plank Progression', order: ['plank', 'long_lever_plank', 'ab_wheel'] },
]
