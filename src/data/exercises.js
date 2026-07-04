// Exercise library. `requires` lists equipment ids that must ALL be present
// (empty = bodyweight, always available). Movement `pattern` drives how the
// generator fills each session slot. `load: false` = tracked by reps only.
//
// Equipment ids come from data/options.js.

export const PATTERNS = {
  SQUAT: 'squat',
  HINGE: 'hinge',
  LUNGE: 'lunge',
  H_PUSH: 'horiz_push',
  V_PUSH: 'vert_push',
  H_PULL: 'horiz_pull',
  V_PULL: 'vert_pull',
  CORE: 'core',
  CALF: 'calf',
  BICEPS: 'biceps',
  TRICEPS: 'triceps',
  SHOULDER: 'shoulder_iso',
  CONDITIONING: 'conditioning',
}

const BASE_EXERCISES = [
  // ---- Squat ----
  { id: 'back_squat', name: 'Back Squat', pattern: 'squat', regions: ['legs', 'core'], requires: ['barbell', 'rack'], compound: true, tags: ['running'], cues: 'Brace your core, sit between your hips, drive through mid-foot.' },
  { id: 'front_squat', name: 'Front Squat', pattern: 'squat', regions: ['legs', 'core'], requires: ['barbell', 'rack'], compound: true, cues: 'Elbows high, upright torso, knees track over toes.' },
  { id: 'goblet_squat', name: 'Goblet Squat', pattern: 'squat', regions: ['legs', 'core'], requires: ['dumbbells'], compound: true, cues: 'Hold the bell at your chest, sit straight down, chest tall.' },
  { id: 'kb_goblet_squat', name: 'Kettlebell Goblet Squat', pattern: 'squat', regions: ['legs', 'core'], requires: ['kettlebells'], compound: true, cues: 'Hug the bell, elbows inside knees at the bottom.' },
  { id: 'leg_press', name: 'Leg Press', pattern: 'squat', regions: ['legs'], requires: ['leg_press'], compound: true, cues: 'Feet shoulder-width, lower under control, don’t lock out hard.' },
  { id: 'bw_squat', name: 'Bodyweight Squat', pattern: 'squat', regions: ['legs'], requires: [], compound: true, load: false, tags: ['running'], cues: 'Sit back and down, keep heels planted, stand tall.' },

  // ---- Hinge ----
  { id: 'deadlift', name: 'Deadlift', pattern: 'hinge', regions: ['legs', 'back', 'core'], requires: ['barbell'], compound: true, tags: ['climbing'], cues: 'Flat back, push the floor away, lock out with glutes.' },
  { id: 'romanian_dl', name: 'Romanian Deadlift', pattern: 'hinge', regions: ['legs', 'back'], requires: ['barbell'], compound: true, cues: 'Soft knees, push hips back, feel the hamstring stretch.' },
  { id: 'db_rdl', name: 'Dumbbell RDL', pattern: 'hinge', regions: ['legs', 'back'], requires: ['dumbbells'], compound: true, cues: 'Hinge at the hips, bells close to your legs, neutral spine.' },
  { id: 'kb_swing', name: 'Kettlebell Swing', pattern: 'hinge', regions: ['legs', 'back', 'core'], requires: ['kettlebells'], compound: true, tags: ['running'], cues: 'Snap the hips, the bell floats — it’s a hinge, not a squat.' },
  { id: 'hip_thrust', name: 'Barbell Hip Thrust', pattern: 'hinge', regions: ['legs'], requires: ['barbell', 'flat_bench'], compound: true, cues: 'Shoulders on bench, drive hips up, squeeze at the top.' },
  { id: 'glute_bridge', name: 'Glute Bridge', pattern: 'hinge', regions: ['legs'], requires: [], compound: false, load: false, cues: 'Heels close, ribs down, squeeze glutes at the top.' },
  { id: 'single_leg_rdl', name: 'Single-Leg RDL', pattern: 'hinge', regions: ['legs', 'core'], requires: [], compound: true, load: false, tags: ['running'], cues: 'Hips square, reach the floor, stand under control.' },

  // ---- Lunge ----
  { id: 'walking_lunge', name: 'Walking Lunge', pattern: 'lunge', regions: ['legs'], requires: ['dumbbells'], compound: true, tags: ['running'], cues: 'Long step, back knee toward the floor, push through front heel.' },
  { id: 'bw_lunge', name: 'Bodyweight Lunge', pattern: 'lunge', regions: ['legs'], requires: [], compound: true, load: false, tags: ['running'], cues: 'Step forward, drop straight down, keep your torso tall.' },
  { id: 'bulgarian_split', name: 'Bulgarian Split Squat', pattern: 'lunge', regions: ['legs', 'core'], requires: ['flat_bench'], compound: true, tags: ['running'], cues: 'Rear foot on the bench, lower straight down, front-leg focus.' },
  { id: 'step_up', name: 'Step-Up', pattern: 'lunge', regions: ['legs'], requires: [], compound: true, load: false, tags: ['running'], cues: 'Full foot on the box, drive up without pushing off the back leg.' },
  { id: 'reverse_lunge', name: 'Reverse Lunge', pattern: 'lunge', regions: ['legs'], requires: [], compound: true, load: false, tags: ['running'], cues: 'Step straight back, drop the back knee toward the floor, drive through the front heel to stand — gentler on the knees than forward lunges. Reps per leg.' },
  { id: 'peterson_step_down', name: 'Peterson Step Down', pattern: 'lunge', regions: ['legs'], requires: [], compound: true, load: false, cues: 'Stand on a low step; on one leg, slowly lower the other heel to tap the floor with the standing knee tracking over the toes — bulletproofs the knee (VMO). Reps per leg.' },

  // ---- Horizontal push ----
  { id: 'bench_press', name: 'Bench Press', pattern: 'horiz_push', regions: ['chest', 'arms', 'shoulders'], requires: ['barbell', 'flat_bench'], compound: true, cues: 'Shoulder blades pinched, bar to mid-chest, drive up evenly.' },
  { id: 'db_bench', name: 'Dumbbell Bench Press', pattern: 'horiz_push', regions: ['chest', 'arms', 'shoulders'], requires: ['dumbbells', 'flat_bench'], compound: true, cues: 'Lower to chest level, press up and slightly together.' },
  { id: 'incline_db_press', name: 'Incline Dumbbell Press', pattern: 'horiz_push', regions: ['chest', 'shoulders', 'arms'], requires: ['dumbbells', 'adj_bench'], compound: true, cues: 'Bench at ~30°, press up over the upper chest.' },
  { id: 'pushup', name: 'Push-Up', pattern: 'horiz_push', regions: ['chest', 'arms', 'core'], requires: [], compound: true, load: false, cues: 'Straight line head to heels, elbows ~45°, full range.' },
  { id: 'dip', name: 'Dip', pattern: 'horiz_push', regions: ['chest', 'arms'], requires: ['dip_station'], compound: true, load: false, cues: 'Slight forward lean for chest, lower to a comfortable stretch.' },

  // ---- Vertical push ----
  { id: 'overhead_press', name: 'Overhead Press', pattern: 'vert_push', regions: ['shoulders', 'arms', 'core'], requires: ['barbell'], compound: true, cues: 'Squeeze glutes, press bar over the crown, finish with ribs down.' },
  { id: 'db_shoulder_press', name: 'Dumbbell Shoulder Press', pattern: 'vert_push', regions: ['shoulders', 'arms'], requires: ['dumbbells'], compound: true, cues: 'Press up and slightly in, don’t flare the ribs.' },
  { id: 'pike_pushup', name: 'Pike Push-Up', pattern: 'vert_push', regions: ['shoulders', 'arms'], requires: [], compound: true, load: false, cues: 'Hips high, head toward the floor between your hands.' },

  // ---- Horizontal pull ----
  { id: 'barbell_row', name: 'Barbell Row', pattern: 'horiz_pull', regions: ['back', 'arms'], requires: ['barbell'], compound: true, tags: ['climbing'], cues: 'Hinge ~45°, pull to the lower ribs, control the lowering.' },
  { id: 'db_row', name: 'One-Arm Dumbbell Row', pattern: 'horiz_pull', regions: ['back', 'arms'], requires: ['dumbbells'], compound: true, tags: ['climbing'], cues: 'Flat back, drive the elbow back, squeeze the lat.' },
  { id: 'seated_cable_row', name: 'Seated Cable Row', pattern: 'horiz_pull', regions: ['back', 'arms'], requires: ['cable'], compound: true, tags: ['climbing'], cues: 'Tall chest, pull to the navel, don’t lean back hard.' },
  { id: 'inverted_row', name: 'Inverted Row', pattern: 'horiz_pull', regions: ['back', 'arms'], requires: ['pullup_bar'], compound: true, load: false, tags: ['climbing'], cues: 'Body in a plank, pull chest to the bar, squeeze shoulder blades.' },
  { id: 'band_row', name: 'Band Row', pattern: 'horiz_pull', regions: ['back', 'arms'], requires: ['bands'], compound: true, load: false, cues: 'Anchor the band, pull elbows back, control the return.' },
  { id: 'superman', name: 'Superman', pattern: 'horiz_pull', regions: ['back'], requires: [], compound: false, load: false, cues: 'Lift chest and thighs, squeeze the lower back, brief hold.' },

  // ---- Vertical pull ----
  { id: 'pullup', name: 'Pull-Up', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['pullup_bar'], compound: true, load: false, tags: ['climbing'], cues: 'Full hang to chin over bar, drive elbows down.' },
  { id: 'chinup', name: 'Chin-Up', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['pullup_bar'], compound: true, load: false, tags: ['climbing'], cues: 'Underhand grip, lead with the chest, full range.' },
  { id: 'lat_pulldown', name: 'Lat Pulldown', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['lat_pulldown'], compound: true, tags: ['climbing'], cues: 'Pull the bar to your collarbone, elbows down and back.' },
  { id: 'cable_pulldown', name: 'Cable Pulldown', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['cable'], compound: true, tags: ['climbing'], cues: 'Drive elbows to the floor, control the stretch up top.' },
  { id: 'band_pulldown', name: 'Band Lat Pulldown', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['bands'], compound: true, load: false, cues: 'High anchor, pull down to the chest, slow return.' },

  // ---- Biceps ----
  { id: 'db_curl', name: 'Dumbbell Curl', pattern: 'biceps', regions: ['arms'], requires: ['dumbbells'], compound: false, cues: 'Elbows pinned, curl without swinging, squeeze at the top.' },
  { id: 'ez_curl', name: 'EZ-Bar Curl', pattern: 'biceps', regions: ['arms'], requires: ['ez_bar'], compound: false, cues: 'Steady elbows, full range, no body english.' },
  { id: 'band_curl', name: 'Band Curl', pattern: 'biceps', regions: ['arms'], requires: ['bands'], compound: false, load: false, cues: 'Stand on the band, curl with control, resist the way down.' },

  // ---- Triceps ----
  { id: 'db_skullcrusher', name: 'Dumbbell Skullcrusher', pattern: 'triceps', regions: ['arms'], requires: ['dumbbells', 'flat_bench'], compound: false, cues: 'Upper arms still, lower to the forehead, extend fully.' },
  { id: 'bench_dip', name: 'Bench Dip', pattern: 'triceps', regions: ['arms'], requires: ['flat_bench'], compound: false, load: false, cues: 'Hands on the bench, lower with elbows back, press up.' },
  { id: 'band_pushdown', name: 'Band Triceps Pushdown', pattern: 'triceps', regions: ['arms'], requires: ['bands'], compound: false, load: false, cues: 'Pin elbows to your sides, extend fully, slow return.' },
  { id: 'diamond_pushup', name: 'Diamond Push-Up', pattern: 'triceps', regions: ['arms', 'chest'], requires: [], compound: false, load: false, cues: 'Hands together under the chest, elbows tight to the body.' },

  // ---- Shoulders (isolation) ----
  { id: 'lateral_raise', name: 'Lateral Raise', pattern: 'shoulder_iso', regions: ['shoulders'], requires: ['dumbbells'], compound: false, cues: 'Lead with the elbows, raise to shoulder height, no shrug.' },
  { id: 'band_lateral', name: 'Band Lateral Raise', pattern: 'shoulder_iso', regions: ['shoulders'], requires: ['bands'], compound: false, load: false, cues: 'Smooth raise to shoulder height, control the way down.' },

  // ---- Calves ----
  { id: 'db_calf_raise', name: 'Dumbbell Calf Raise', pattern: 'calf', regions: ['legs'], requires: ['dumbbells'], compound: false, tags: ['running'], cues: 'Full stretch at the bottom, rise onto the balls of your feet.' },
  { id: 'bw_calf_raise', name: 'Calf Raise', pattern: 'calf', regions: ['legs'], requires: [], compound: false, load: false, tags: ['running'], cues: 'Up tall on your toes, pause, lower slowly for a stretch.' },
  { id: 'wall_sit_calf_raise', name: 'Wall Sit Calf Raise', pattern: 'calf', regions: ['legs'], requires: [], compound: false, load: false, cues: 'Hold a wall sit at 90°, then rise onto the balls of your feet and lower slowly — calves under a steady load.' },
  { id: 'single_leg_calf_raise', name: 'Single-Leg Calf Raise', pattern: 'calf', regions: ['legs'], requires: [], compound: false, load: false, tags: ['running'], cues: 'On one foot (hold a wall for balance), rise all the way up and lower slowly for a deep stretch. Reps per leg.' },
  { id: 'tibialis_raise', name: 'Tibialis Raise', pattern: 'calf', regions: ['legs'], requires: [], compound: false, load: false, tags: ['running'], cues: 'Heels planted, back against a wall, lift your toes toward your shins as high as you can — strengthens the tibialis for knee and ankle health.' },

  // ---- Rings & climbing-focused ----
  { id: 'ring_row', name: 'Ring Row', pattern: 'horiz_pull', regions: ['back', 'arms'], requires: ['rings'], compound: true, load: false, tags: ['climbing'], cues: 'Body straight, pull the rings to your chest, squeeze the shoulder blades. Lower your feet to make it harder.' },
  { id: 'ring_pullup', name: 'Ring Pull-Up', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['rings'], compound: true, load: false, tags: ['climbing'], cues: 'Let the rings rotate naturally, pull to your chest, control the descent.' },
  { id: 'ring_dip', name: 'Ring Dip', pattern: 'horiz_push', regions: ['chest', 'arms'], requires: ['rings'], compound: true, load: false, tags: ['climbing'], cues: 'Rings tight to the body — a key antagonist for climbers. Pause in the support hold at the top.' },
  { id: 'ring_pushup', name: 'Ring Push-Up', pattern: 'horiz_push', regions: ['chest', 'arms', 'core'], requires: ['rings'], compound: true, load: false, cues: 'Rings just off the floor, turn them out at the top; brace hard against the wobble.' },
  { id: 'ring_support_hold', name: 'Ring Support Hold', pattern: 'core', regions: ['arms', 'core'], requires: ['rings'], compound: false, load: false, hold: true, tags: ['climbing'], cues: 'Lock the elbows, depress the shoulders, rings turned slightly out. Hold for time.' },
  { id: 'skin_the_cat', name: 'Skin the Cat', pattern: 'core', regions: ['back', 'core'], requires: ['rings'], compound: true, load: false, tags: ['climbing'], cues: 'From a hang, roll backward through the shoulders and return under control — mobility + strength.' },
  { id: 'lock_off', name: 'Lock-Off Hold', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['pullup_bar'], compound: true, load: false, hold: true, tags: ['climbing'], cues: 'Pull up and HOLD at ~90° (or higher) — the isometric pulling strength climbing demands. Hold for time.' },
  { id: 'typewriter_pullup', name: 'Typewriter Pull-Up', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['pullup_bar'], compound: true, load: false, tags: ['climbing'], cues: 'Pull up, then shift side to side along the bar keeping the chin high — builds one-arm strength.' },
  { id: 'weighted_pullup', name: 'Weighted Pull-Up', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['pullup_bar', 'dumbbells'], compound: true, tags: ['climbing'], cues: 'Hang a dumbbell from a belt or squeeze it between your feet; full range, chin over the bar.' },
  { id: 'wrist_curl', name: 'Wrist Curl', pattern: 'biceps', regions: ['arms'], requires: ['dumbbells'], compound: false, tags: ['climbing'], cues: 'Forearms on your thighs, curl the dumbbell with the wrist only — forearm/finger-flexor strength.' },
  { id: 'reverse_wrist_curl', name: 'Reverse Wrist Curl', pattern: 'biceps', regions: ['arms'], requires: ['dumbbells'], compound: false, tags: ['climbing'], cues: 'Palms down, lift the dumbbell with the wrist — balances the forearms and protects the elbows.' },

  // ---- Core ----
  { id: 'plank', name: 'Plank', pattern: 'core', regions: ['core'], requires: [], compound: false, load: false, hold: true, tags: ['climbing', 'running'], cues: 'Straight line, squeeze glutes and abs, breathe. Hold for time.' },
  { id: 'side_plank_leg_lift', name: 'Side Plank + Leg Lift', pattern: 'core', regions: ['core'], requires: [], compound: false, load: false, cues: 'Hold a side plank and raise the top leg with control — hits the obliques and hip abductors. Reps per side.' },
  { id: 'hollow_hold', name: 'Hollow Body Hold', pattern: 'core', regions: ['core'], requires: [], compound: false, load: false, hold: true, cues: 'Low back pressed flat, shoulders and legs off the floor in a shallow banana. Hold for time — the foundation for levers and handstands.' },
  { id: 'hanging_leg_raise', name: 'Hanging Leg Raise', pattern: 'core', regions: ['core'], requires: ['pullup_bar'], compound: false, load: false, tags: ['climbing'], cues: 'No swinging, lift the legs with the abs, lower slow.' },
  { id: 'dead_bug', name: 'Dead Bug', pattern: 'core', regions: ['core'], requires: [], compound: false, load: false, tags: ['running'], cues: 'Low back pinned, extend opposite arm and leg slowly.' },
  { id: 'ab_wheel', name: 'Ab Rollout', pattern: 'core', regions: ['core'], requires: [], compound: false, load: false, tags: ['climbing'], cues: 'Roll out only as far as you can keep the back flat.' },
  { id: 'russian_twist', name: 'Russian Twist', pattern: 'core', regions: ['core'], requires: [], compound: false, load: false, cues: 'Lean back slightly, rotate from the trunk, control the pace.' },
  { id: 'situp', name: 'Sit-Up', pattern: 'core', regions: ['core'], requires: [], compound: false, load: false, cues: 'Feet flat or anchored, curl up through the full range, lower with control.' },
  { id: 'cable_crunch', name: 'Cable Crunch', pattern: 'core', regions: ['core'], requires: ['cable'], compound: false, cues: 'Kneel, rope by your head, crunch down with the abs — don’t just bow at the hips.' },

  // ---- Popular additions (r/Fitness favorites) ----
  { id: 'back_extension', name: 'Back Extension', pattern: 'hinge', regions: ['back', 'legs', 'core'], requires: ['flat_bench'], compound: false, load: false, tags: ['running'], cues: 'Hinge over the pad, squeeze glutes to rise to a straight line — don’t hyperextend.' },
  { id: 'good_morning', name: 'Good Morning', pattern: 'hinge', regions: ['legs', 'back', 'core'], requires: ['barbell', 'rack'], compound: true, cues: 'Bar on the back, soft knees, push hips back with a flat back, feel the hamstrings.' },
  { id: 'leg_curl', name: 'Leg Curl', pattern: 'hinge', regions: ['legs'], requires: ['leg_curl_ext'], compound: false, tags: ['running'], cues: 'Curl the pad up by squeezing the hamstrings, lower slowly — no hip bouncing.' },
  { id: 'leg_extension', name: 'Leg Extension', pattern: 'squat', regions: ['legs'], requires: ['leg_curl_ext'], compound: false, tags: ['running'], cues: 'Extend to nearly locked, squeeze the quads at the top, lower under control.' },
  { id: 'incline_bench', name: 'Incline Bench Press', pattern: 'horiz_push', regions: ['chest', 'shoulders', 'arms'], requires: ['barbell', 'adj_bench'], compound: true, cues: 'Bench at ~30°, bar to the upper chest, drive up and slightly back.' },
  { id: 'cable_fly', name: 'Cable Fly', pattern: 'horiz_push', regions: ['chest'], requires: ['cable'], compound: false, cues: 'Soft elbows, hug a wide arc, squeeze the chest at the front — slow on the stretch.' },
  { id: 'arnold_press', name: 'Arnold Press', pattern: 'vert_push', regions: ['shoulders', 'arms'], requires: ['dumbbells'], compound: true, cues: 'Start palms-in at the chin, rotate as you press overhead, reverse on the way down.' },
  { id: 'pendlay_row', name: 'Pendlay Row', pattern: 'horiz_pull', regions: ['back', 'arms'], requires: ['barbell'], compound: true, tags: ['climbing'], cues: 'Flat back parallel to the floor, explode the bar to your lower chest, reset each rep on the floor.' },
  { id: 'chest_supported_row', name: 'Chest-Supported Row', pattern: 'horiz_pull', regions: ['back', 'arms'], requires: ['dumbbells', 'adj_bench'], compound: true, tags: ['climbing'], cues: 'Chest on an incline bench, row the bells to your hips, squeeze the mid-back.' },
  { id: 'face_pull', name: 'Face Pull', pattern: 'horiz_pull', regions: ['back', 'shoulders'], requires: ['cable'], compound: false, cues: 'Rope to eye level, pull to your forehead with elbows high — great for shoulder health.' },
  { id: 'barbell_curl', name: 'Barbell Curl', pattern: 'biceps', regions: ['arms'], requires: ['barbell'], compound: false, cues: 'Elbows pinned, curl the bar without swinging, control the lower.' },
  { id: 'hammer_curl', name: 'Hammer Curl', pattern: 'biceps', regions: ['arms'], requires: ['dumbbells'], compound: false, cues: 'Neutral (palms-in) grip, curl without swinging — hits the forearms and biceps.' },
  { id: 'cable_pushdown', name: 'Cable Triceps Pushdown', pattern: 'triceps', regions: ['arms'], requires: ['cable'], compound: false, cues: 'Pin your elbows to your sides, extend fully, resist on the way up.' },
  { id: 'cable_lateral', name: 'Cable Lateral Raise', pattern: 'shoulder_iso', regions: ['shoulders'], requires: ['cable'], compound: false, cues: 'Low pulley across your body, lead with the elbow to shoulder height, no shrug.' },

  // ---- Machine & variation staples ----
  { id: 'wide_pullup', name: 'Wide-Grip Pull-Up', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['pullup_bar'], compound: true, load: false, tags: ['climbing'], cues: 'Grip wider than the shoulders, overhand. Lead with the elbows and pull your chest to the bar — extra lat width.' },
  { id: 'lat_pulldown_wide', name: 'Wide-Grip Lat Pulldown', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['lat_pulldown'], compound: true, tags: ['climbing'], cues: 'Wide overhand grip, chest tall; pull the bar to your collarbone, elbows flaring down for lat width.' },
  { id: 'lat_pulldown_narrow', name: 'Close-Grip Lat Pulldown', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['lat_pulldown'], compound: true, tags: ['climbing'], cues: 'Close or neutral grip; drive the elbows down to your sides and pull to the upper chest.' },
  { id: 'lat_prayer', name: 'Straight-Arm Pulldown', pattern: 'vert_pull', regions: ['back'], requires: ['cable'], compound: false, tags: ['climbing'], cues: 'High cable, arms nearly straight; keeping the elbows locked, sweep the bar/rope down in an arc to your thighs and squeeze the lats. Also called "lat prayers".' },
  { id: 'seated_shoulder_press', name: 'Seated Dumbbell Shoulder Press', pattern: 'vert_push', regions: ['shoulders', 'arms'], requires: ['dumbbells', 'adj_bench'], compound: true, cues: 'Back supported on an upright bench; press the dumbbells overhead and slightly in, ribs down, no arch.' },
  { id: 'machine_shoulder_press', name: 'Machine Shoulder Press', pattern: 'vert_push', regions: ['shoulders', 'arms'], requires: ['machines'], compound: true, cues: 'Adjust the seat so the handles start at shoulder height; press up smoothly and control the negative.' },
  { id: 'paused_bench', name: 'Paused Bench Press', pattern: 'horiz_push', regions: ['chest', 'arms', 'shoulders'], requires: ['barbell', 'flat_bench'], compound: true, cues: 'Lower to the chest and pause for a full second — dead stop, stay tight — then drive up. Builds off-the-chest power.' },
  { id: 'close_grip_bench', name: 'Close-Grip Bench Press', pattern: 'horiz_push', regions: ['arms', 'chest', 'shoulders'], requires: ['barbell', 'flat_bench'], compound: true, cues: 'Hands ~shoulder-width, elbows tucked; press keeping the bar over the lower chest — triceps emphasis.' },
  { id: 'pec_deck', name: 'Pec Deck', pattern: 'horiz_push', regions: ['chest'], requires: ['machines'], compound: false, cues: 'Elbows in line with the shoulders, soft angle; squeeze the pads together and control the stretch back.' },
  { id: 'bayesian_curl', name: 'Bayesian Curl', pattern: 'biceps', regions: ['arms'], requires: ['cable'], compound: false, cues: 'Low cable behind you, arm back so the biceps starts fully stretched; curl without letting the elbow drift forward — huge stretch tension.' },
  { id: 'incline_db_curl', name: 'Incline Dumbbell Curl', pattern: 'biceps', regions: ['arms'], requires: ['dumbbells', 'adj_bench'], compound: false, cues: 'Lie back on an incline bench, arms hanging straight down; curl without swinging for a deep biceps stretch.' },
  { id: 'cable_wrist_curl', name: 'Standing Cable Wrist Curl', pattern: 'biceps', regions: ['arms'], requires: ['cable'], compound: false, tags: ['climbing'], cues: 'Low cable in front, palms up; curl the handle with the wrists only, elbows still — forearm and grip strength.' },
  { id: 'db_shrug', name: 'Dumbbell Shrug', pattern: 'horiz_pull', regions: ['back', 'shoulders'], requires: ['dumbbells'], compound: false, cues: 'Dumbbells at your sides; shrug straight up toward the ears and pause — no rolling — then lower slowly. Traps.' },
  { id: 'barbell_shrug', name: 'Barbell Shrug', pattern: 'horiz_pull', regions: ['back', 'shoulders'], requires: ['barbell'], compound: false, cues: 'Bar in front (or behind); shrug the shoulders straight up, pause at the top, lower under control. Traps.' },
  { id: 'single_leg_leg_press', name: 'Single-Leg Leg Press', pattern: 'squat', regions: ['legs'], requires: ['leg_press'], compound: true, tags: ['running'], cues: 'One foot centered on the platform; press without locking out hard and control the descent. Reps per leg — evens out imbalances.' },
  { id: 'side_plank', name: 'Side Plank', pattern: 'core', regions: ['core'], requires: [], compound: false, load: false, hold: true, unit: 'sec', cues: 'On one forearm, body in a straight line, hips high and stacked. Hold for time, per side.' },

  // ---- Cardio (time / heart-rate based — great as a warm-up before lifting) ----
  { id: 'running', name: 'Running', pattern: 'conditioning', regions: ['legs', 'core'], requires: [], compound: true, load: false, hold: true, unit: 'min', tags: ['running'], cues: 'Treadmill or outdoors, whatever suits you. For a warm-up keep it easy — an aerobic “zone 2” pace you can chat at. 10–15 min primes the body before lifting; go longer for a full session.' },
  { id: 'walking_incline', name: 'Incline Walk', pattern: 'conditioning', regions: ['legs'], requires: [], compound: false, load: false, hold: true, unit: 'min', tags: ['running'], cues: 'Brisk walk up a treadmill incline or a hill — low impact and joint-friendly. A gentle, effective warm-up.' },
  { id: 'zone2_cardio', name: 'Zone 2 Cardio', pattern: 'conditioning', regions: ['legs'], requires: [], compound: false, load: false, hold: true, unit: 'min', tags: ['running'], cues: 'Easy, conversational pace — walk, jog, bike, or row. You should still be able to talk. Great as a warm-up or a recovery day.' },
  { id: 'treadmill', name: 'Treadmill', pattern: 'conditioning', regions: ['legs'], requires: ['cardio'], compound: false, load: false, hold: true, unit: 'min', tags: ['running'], cues: 'Walk, jog, or run — set a target heart-rate zone and hold it. Warm-up easy, or push for intervals.' },
  { id: 'elliptical', name: 'Elliptical', pattern: 'conditioning', regions: ['legs'], requires: ['cardio'], compound: false, load: false, hold: true, unit: 'min', tags: ['running'], cues: 'Low-impact full-body cardio — drive through the heels, use the arms, keep an even heart rate.' },
  { id: 'stationary_bike', name: 'Stationary Bike', pattern: 'conditioning', regions: ['legs'], requires: ['cardio'], compound: false, load: false, hold: true, unit: 'min', tags: ['running'], cues: 'Steady spin at a target heart rate — a knee-friendly warm-up. Add resistance for intervals.' },
  { id: 'rowing_machine', name: 'Rowing Machine', pattern: 'conditioning', regions: ['legs', 'back', 'core'], requires: ['cardio'], compound: true, load: false, hold: true, unit: 'min', tags: ['running'], cues: 'Legs → back → arms on the drive, reverse on the recovery. Full-body cardio at a steady heart rate.' },
  { id: 'stair_climber', name: 'Stair Climber', pattern: 'conditioning', regions: ['legs'], requires: ['cardio'], compound: false, load: false, hold: true, unit: 'min', tags: ['running'], cues: 'Tall posture, full steps, don’t lean on the rails — a strong lower-body heart-rate builder.' },
  { id: 'air_bike', name: 'Air Bike', pattern: 'conditioning', regions: ['legs', 'core'], requires: ['cardio'], compound: true, load: false, hold: true, unit: 'min', tags: ['running'], cues: 'Push and pull with arms and legs; the fan scales to your effort. Brutal for intervals, easy to keep in zone.' },
  { id: 'cardio_machine', name: 'Cardio (any machine)', pattern: 'conditioning', regions: ['legs'], requires: ['cardio'], compound: false, load: false, hold: true, unit: 'min', tags: ['running'], cues: 'Any cardio machine — steady effort at a target heart-rate zone for the time.' },
  { id: 'jump_rope', name: 'Jump Rope', pattern: 'conditioning', regions: ['legs', 'core'], requires: ['jump_rope'], compound: false, load: false, hold: true, unit: 'min', tags: ['running'], cues: 'Light bounces on the balls of your feet, wrists do the work.' },
  { id: 'mountain_climber', name: 'Mountain Climbers', pattern: 'conditioning', regions: ['core', 'legs'], requires: [], compound: false, load: false, hold: true, unit: 'sec', tags: ['running'], cues: 'Hips low, drive the knees quickly, steady breathing.' },
  // OPM-challenge only (hidden from the general picker); the flexible "Running" above replaces it for programs.
  { id: 'run_10k', name: '10km Run', pattern: 'conditioning', regions: ['legs', 'core'], requires: [], compound: true, load: false, distance: true, unit: 'km', ladderOnly: true, tags: ['running'], cues: 'Aim for a steady, comfortable pace. Log your full run stats (distance, time, HR) in the Cardio tab!' },

  // ---- HIIT / plyometric bodyweight ----
  { id: 'burpee', name: 'Burpees', pattern: 'conditioning', regions: ['chest', 'legs', 'core'], requires: [], compound: true, load: false, tags: ['running'], cues: 'Chest to the floor, jump the feet in, then explode up with a small hop. Full-body conditioning.' },
  { id: 'jumping_jack', name: 'Jumping Jacks', pattern: 'conditioning', regions: ['legs', 'shoulders', 'core'], requires: [], compound: false, load: false, tags: ['running'], cues: 'Jump the feet wide as the arms sweep overhead, then back — light and rhythmic.' },
  { id: 'high_knees', name: 'High Knees', pattern: 'conditioning', regions: ['legs', 'core'], requires: [], compound: false, load: false, hold: true, unit: 'sec', tags: ['running'], cues: 'Run in place driving the knees to hip height, fast turnover, on the balls of your feet. For time.' },
  { id: 'butt_kick', name: 'Butt Kicks', pattern: 'conditioning', regions: ['legs'], requires: [], compound: false, load: false, hold: true, unit: 'sec', tags: ['running'], cues: 'Jog in place kicking your heels up toward your glutes — quick and light. For time.' },
  { id: 'squat_jump', name: 'Squat Jumps', pattern: 'conditioning', regions: ['legs', 'core'], requires: [], compound: true, load: false, tags: ['running'], cues: 'Sink to a squat, jump as high as you can, land soft and absorb into the next rep.' },
  { id: 'skater_jump', name: 'Skater Jumps', pattern: 'conditioning', regions: ['legs', 'core'], requires: [], compound: true, load: false, tags: ['running'], cues: 'Bound side to side, landing on one leg with the other swept behind — control the landing. Count each side.' },
  { id: 'plank_jack', name: 'Plank Jacks', pattern: 'conditioning', regions: ['core', 'shoulders'], requires: [], compound: false, load: false, tags: ['running'], cues: 'Hold a strong plank and jump the feet wide and back together — brace so the hips stay level.' },
  { id: 'bear_crawl', name: 'Bear Crawl', pattern: 'conditioning', regions: ['core', 'shoulders', 'legs'], requires: [], compound: true, load: false, hold: true, unit: 'sec', tags: ['running'], cues: 'On hands and toes, knees just off the floor, crawl with opposite hand/foot — keep the hips low and steady. For time.' },
]

// Merge in the bodyweight ladder variants, then stitch easy↔hard links onto
// every exercise that's part of a ladder (base or variant).
import { LADDER_EXERCISES, LADDERS } from './progressions.js'

export const EXERCISES = [...BASE_EXERCISES, ...LADDER_EXERCISES]
export const EXERCISE_BY_ID = Object.fromEntries(EXERCISES.map((e) => [e.id, e]))

// How an exercise is measured so inputs adapt to it (context-aware):
//   • 'reps'     — sets × reps (× weight when load-tracked)
//   • 'time'     — sets × a duration (planks, holds, timed cardio) — unit sec/min
//   • 'distance' — sets × a distance (runs) — unit km/mi
// Resolve from the library by id (program-exercise objects may not carry flags).
export function exMeasure(ex) {
  const b = EXERCISE_BY_ID[ex?.id] || {}
  const distance = b.distance ?? ex?.distance
  const hold = b.hold ?? ex?.hold
  const unit = b.unit ?? ex?.unit
  if (distance) return { type: 'distance', unit: unit || 'km' }
  if (hold) return { type: 'time', unit: unit || 'sec' }
  return { type: 'reps', unit: 'reps' }
}
// The unit word for the set column / previews ('reps' | 'sec' | 'min' | 'km').
export const measureUnit = (ex) => exMeasure(ex).unit
// Kept for existing callers.
export const isHold = (ex) => exMeasure(ex).type === 'time'
export const holdUnit = (ex) => exMeasure(ex).unit

for (const ladder of LADDERS) {
  ladder.order.forEach((id, i) => {
    const ex = EXERCISE_BY_ID[id]
    if (!ex) return
    ex.ladderId = ladder.id
    ex.ladderName = ladder.name
    ex.levelIndex = i
    ex.prevId = ladder.order[i - 1] || null
    ex.nextId = ladder.order[i + 1] || null
  })
}

export { LADDERS }
