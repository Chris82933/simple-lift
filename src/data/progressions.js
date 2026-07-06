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
  { id: 'dead_hang', name: 'Dead Hang', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['pullup_bar'], compound: false, load: false, hold: true, ladderOnly: true, cues: 'Just hang with straight arms and active shoulders. Hold for time.' },
  { id: 'scap_pull', name: 'Scapular Pull', pattern: 'vert_pull', regions: ['back'], requires: ['pullup_bar'], compound: false, load: false, ladderOnly: true, cues: 'From a dead hang, pull your shoulder blades down without bending the elbows.' },
  { id: 'pull_negative', name: 'Negative Pull-Up', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['pullup_bar'], compound: true, load: false, ladderOnly: true, cues: 'Jump to the top, then lower yourself as slowly as you can (aim 3–5s).' },
  { id: 'pull_band_assist', name: 'Band-Assisted Pull-Up', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['pullup_bar', 'bands'], compound: true, load: false, ladderOnly: true, cues: 'Loop a band under your feet/knee for help; full range, chin over bar.' },
  { id: 'archer_pull', name: 'Archer Pull-Up', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['pullup_bar'], compound: true, load: false, ladderOnly: true, cues: 'Pull to one hand, keeping the other arm nearly straight out to the side.' },
  { id: 'one_arm_pull', name: 'One-Arm Pull-Up', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['pullup_bar'], compound: true, load: false, ladderOnly: true, cues: 'The peak: one hand on the bar, full pull. Years in the making — be patient.' },

  // ---- Horizontal pull (rows) ----
  { id: 'incline_row', name: 'Incline Bodyweight Row', pattern: 'horiz_pull', regions: ['back', 'arms'], requires: ['pullup_bar'], compound: true, load: false, ladderOnly: true, cues: 'Grab a waist-high bar, rings, or the edge of a sturdy table. Body straight, lean back and pull your chest to your hands — the more upright you stand, the easier. Bodyweight only, no weights.' },
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
  { id: 'long_lever_plank', name: 'Long-Lever Plank', pattern: 'core', regions: ['core'], requires: [], compound: false, load: false, hold: true, ladderOnly: true, cues: 'Elbows further forward of the shoulders — much harder anti-extension hold.' },

  // ---- Rings: horizontal pull (ring row, easy → hard by body angle) ----
  { id: 'ring_row_incline', name: 'Incline Ring Row', pattern: 'horiz_pull', regions: ['back', 'arms'], requires: ['rings'], compound: true, load: false, ladderOnly: true, cues: 'Set the rings high and stay more upright — the closer to standing, the easier. Body straight, pull the rings to your chest, squeeze the shoulder blades.' },
  { id: 'ring_row_feet_up', name: 'Feet-Elevated Ring Row', pattern: 'horiz_pull', regions: ['back', 'arms'], requires: ['rings'], compound: true, load: false, ladderOnly: true, cues: 'Feet up on a box so your body is horizontal or past it — much harder. Stay hollow, no sagging hips.' },
  { id: 'ring_archer_row', name: 'Archer Ring Row', pattern: 'horiz_pull', regions: ['back', 'arms'], requires: ['rings'], compound: true, load: false, ladderOnly: true, cues: 'Pull to one ring while the other arm reaches out nearly straight — a step toward the one-arm row.' },

  // ---- Rings: dip (support hold → full dip → rings turned out) ----
  { id: 'ring_dip_negative', name: 'Ring Dip Negative', pattern: 'horiz_push', regions: ['chest', 'arms'], requires: ['rings'], compound: true, load: false, ladderOnly: true, cues: 'Start locked out at the top, lower as slowly as you can (aim 3–5s), then reset. Builds the strength for full dips.' },
  { id: 'ring_rto_dip', name: 'RTO Ring Dip', pattern: 'horiz_push', regions: ['chest', 'arms'], requires: ['rings'], compound: true, load: false, ladderOnly: true, cues: 'Rings turned out (thumbs forward) at the top of every rep — brutal on the chest and stabilisers.' },

  // ---- Rings: push-up ----
  { id: 'ring_pushup_high', name: 'High Ring Push-Up', pattern: 'horiz_push', regions: ['chest', 'arms', 'core'], requires: ['rings'], compound: true, load: false, ladderOnly: true, cues: 'Set the rings higher so you press at an incline — easier while you learn to fight the wobble.' },
  { id: 'ring_rto_pushup', name: 'RTO Ring Push-Up', pattern: 'horiz_push', regions: ['chest', 'arms', 'core'], requires: ['rings'], compound: true, load: false, ladderOnly: true, cues: 'Rings just off the floor, turned out at the top of every rep — maximal chest tension and stability.' },

  // ---- Rings: toward the muscle-up ----
  { id: 'false_grip_pullup', name: 'False-Grip Ring Pull-Up', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['rings'], compound: true, load: false, ladderOnly: true, cues: 'Hands on top of the rings (wrists over the ring), pull high to the sternum — the grip that makes the muscle-up possible.' },
  { id: 'muscle_up_negative', name: 'Ring Muscle-Up Negative', pattern: 'vert_pull', regions: ['back', 'arms', 'chest'], requires: ['rings'], compound: true, load: false, ladderOnly: true, cues: 'Start in the support at the top and lower slowly through the transition to a hang — owns the hardest part first.' },
  { id: 'ring_muscle_up', name: 'Ring Muscle-Up', pattern: 'vert_pull', regions: ['back', 'arms', 'chest'], requires: ['rings'], compound: true, load: false, ladderOnly: true, cues: 'Explosive false-grip pull, punch the rings down and roll the shoulders over into the support. The classic rings milestone.' },

  // ---- Vertical push: pike push-up → handstand push-up ----
  { id: 'elevated_pike_pushup', name: 'Elevated Pike Push-Up', pattern: 'vert_push', regions: ['shoulders', 'arms'], requires: [], compound: true, load: false, ladderOnly: true, cues: 'Feet up on a box so your torso is nearly vertical — lower your head to the floor and press. Bridges the pike and the handstand.' },
  { id: 'wall_handstand_hold', name: 'Wall Handstand Hold', pattern: 'vert_push', regions: ['shoulders', 'arms', 'core'], requires: [], compound: false, load: false, hold: true, ladderOnly: true, cues: 'Kick up to the wall, lock the elbows, push tall and hold. Builds the position and shoulder endurance. Hold for time.' },
  { id: 'wall_hspu_negative', name: 'Wall HSPU Negative', pattern: 'vert_push', regions: ['shoulders', 'arms'], requires: [], compound: true, load: false, ladderOnly: true, cues: 'In a wall handstand, lower your head to the floor as slowly as possible, then step down and reset. The key strength-builder.' },
  { id: 'wall_hspu', name: 'Wall Handstand Push-Up', pattern: 'vert_push', regions: ['shoulders', 'arms'], requires: [], compound: true, load: false, ladderOnly: true, cues: 'Full range against the wall: lower until your head lightly touches, press back to a lockout. Keep the ribs down and body tight.' },
  { id: 'freestanding_hspu', name: 'Freestanding HSPU', pattern: 'vert_push', regions: ['shoulders', 'arms', 'core'], requires: [], compound: true, load: false, ladderOnly: true, cues: 'No wall — balance and press. The elite endpoint; expect a long road of handstand practice first.' },
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
  { id: 'calf_prog', name: 'Calf Progression', order: ['wall_sit_calf_raise', 'bw_calf_raise', 'single_leg_calf_raise'] },
  // ---- Gymnastic rings ----
  { id: 'ring_row_prog', name: 'Ring Row Progression', order: ['ring_row_incline', 'ring_row', 'ring_row_feet_up', 'ring_archer_row'] },
  { id: 'ring_dip_prog', name: 'Ring Dip Progression', order: ['ring_support_hold', 'ring_dip_negative', 'ring_dip', 'ring_rto_dip'] },
  { id: 'ring_pushup_prog', name: 'Ring Push-Up Progression', order: ['ring_pushup_high', 'ring_pushup', 'ring_rto_pushup'] },
  { id: 'muscle_up_prog', name: 'Ring Muscle-Up Progression', order: ['ring_pullup', 'false_grip_pullup', 'muscle_up_negative', 'ring_muscle_up'] },
  // ---- Handstand push-up ----
  { id: 'hspu_prog', name: 'Handstand Push-Up Progression', order: ['pike_pushup', 'elevated_pike_pushup', 'wall_handstand_hold', 'wall_hspu_negative', 'wall_hspu', 'freestanding_hspu'] },
]
