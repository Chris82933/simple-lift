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

  // ---- Core ----
  { id: 'plank', name: 'Plank', pattern: 'core', regions: ['core'], requires: [], compound: false, load: false, tags: ['climbing', 'running'], cues: 'Straight line, squeeze glutes and abs, breathe — hold for reps as seconds.' },
  { id: 'hanging_leg_raise', name: 'Hanging Leg Raise', pattern: 'core', regions: ['core'], requires: ['pullup_bar'], compound: false, load: false, tags: ['climbing'], cues: 'No swinging, lift the legs with the abs, lower slow.' },
  { id: 'dead_bug', name: 'Dead Bug', pattern: 'core', regions: ['core'], requires: [], compound: false, load: false, tags: ['running'], cues: 'Low back pinned, extend opposite arm and leg slowly.' },
  { id: 'ab_wheel', name: 'Ab Rollout', pattern: 'core', regions: ['core'], requires: [], compound: false, load: false, tags: ['climbing'], cues: 'Roll out only as far as you can keep the back flat.' },
  { id: 'russian_twist', name: 'Russian Twist', pattern: 'core', regions: ['core'], requires: [], compound: false, load: false, cues: 'Lean back slightly, rotate from the trunk, control the pace.' },

  // ---- Conditioning ----
  { id: 'jump_rope', name: 'Jump Rope', pattern: 'conditioning', regions: ['legs', 'core'], requires: ['jump_rope'], compound: false, load: false, tags: ['running'], cues: 'Light bounces on the balls of your feet, wrists do the work.' },
  { id: 'cardio_machine', name: 'Cardio Finisher', pattern: 'conditioning', regions: ['legs'], requires: ['cardio'], compound: false, load: false, tags: ['running'], cues: 'Steady, strong effort for the time — hold a pace you can sustain.' },
  { id: 'mountain_climber', name: 'Mountain Climbers', pattern: 'conditioning', regions: ['core', 'legs'], requires: [], compound: false, load: false, tags: ['running'], cues: 'Hips low, drive the knees quickly, steady breathing.' },
]

// Merge in the bodyweight ladder variants, then stitch easy↔hard links onto
// every exercise that's part of a ladder (base or variant).
import { LADDER_EXERCISES, LADDERS } from './progressions.js'

export const EXERCISES = [...BASE_EXERCISES, ...LADDER_EXERCISES]
export const EXERCISE_BY_ID = Object.fromEntries(EXERCISES.map((e) => [e.id, e]))

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
