// Exercise library. `requires` lists equipment ids that must ALL be present
// (empty = bodyweight, always available). Movement `pattern` drives how the
// generator fills each session slot. `load: false` = a bodyweight move, tracked
// by reps; add `bwLoad` (pull-ups/dips — bodyweight is the load, hang more) or
// `addLoad` (reverse lunges, weighted push-ups — hold/wear extra weight) when
// weight is OPTIONAL, so the log still offers a weight box. See tracksLoad().
//
// Equipment ids come from data/options.js.

import { ENRICHED_ALIASES } from './aliasesExtra.js'

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
  { id: 'bw_squat', name: 'Bodyweight Squat', pattern: 'squat', regions: ['legs'], requires: [], compound: true, addLoad: true, load: false, tags: ['running'], cues: 'Sit back and down, keep heels planted, stand tall.' },
  { id: 'barbell_hack_squat', name: 'Barbell Hack Squat', pattern: 'squat', regions: ['legs', 'core'], requires: ['barbell'], compound: true, cues: 'The original, invented by strongman George Hackenschmidt: stand with a barbell on the floor behind your heels, grip it behind you, and stand up — heels down, torso tall, knees forward. A quad-dominant deadlift-in-reverse. Heels on a small plate helps depth.' },
  { id: 'hack_squat', name: 'Hack Squat (Machine)', pattern: 'squat', regions: ['legs'], requires: ['machines'], compound: true, cues: 'Shoulders and back against the pad, feet mid-platform. Lower under control to ~90° (or below), knees tracking over the toes, and drive through the whole foot. The fixed path lets you push the quads hard with little balance demand.' },
  { id: 'zercher_squat', name: 'Zercher Squat', pattern: 'squat', regions: ['legs', 'core'], requires: ['barbell'], compound: true, cues: 'Named after strongman Ed Zercher: cradle the barbell in the crooks of your elbows against your torso. Sit straight down, elbows inside the knees, chest tall. The front-loaded position hammers the quads, upper back, and core and forces an upright posture.' },
  // Squat variations of similar popularity to the Zercher
  { id: 'box_squat', name: 'Box Squat', pattern: 'squat', regions: ['legs', 'core'], requires: ['barbell', 'rack', 'flat_bench'], compound: true, cues: 'Set a box or bench so your hips sit at or just below knee height. Push your hips back and sit onto it under control, pause for a moment without relaxing, then drive up hard. Teaches consistent depth and hip drive — a powerlifting staple.' },
  { id: 'pause_squat', name: 'Pause Squat', pattern: 'squat', regions: ['legs', 'core'], requires: ['barbell', 'rack'], compound: true, cues: 'Squat to your normal depth and hold a dead stop for 2–3 seconds, staying braced — no bouncing — then drive up. Use about 70–80% of your usual squat. Builds strength out of the hole and tightens up technique.' },
  { id: 'pin_squat', name: 'Pin Squat', pattern: 'squat', regions: ['legs', 'core'], requires: ['barbell', 'rack'], compound: true, cues: 'Also called the Anderson squat. Set the safety pins at your sticking point and get under the bar while it rests on them. Brace hard and stand up from a dead stop — no stretch reflex to help. Lower it back to the pins under control between reps.' },
  { id: 'overhead_squat', name: 'Overhead Squat', pattern: 'squat', regions: ['legs', 'shoulders', 'core'], requires: ['barbell'], compound: true, cues: 'Hold the bar overhead with a wide (snatch) grip, elbows locked, armpits facing forward. Sit straight down keeping the bar over the middle of your foot. Start with an empty bar or a broomstick — it is a mobility and stability lift first.' },
  { id: 'sissy_squat', name: 'Sissy Squat', pattern: 'squat', regions: ['legs'], requires: [], compound: false, load: false, cues: 'Hold a post or rack for balance and rise onto the balls of your feet. Let your knees travel forward as you lean back, keeping a straight line from knees to shoulders, then squeeze your quads to come up. Start with a short range — it is hard on the knees until you are used to it.' },
  { id: 'cossack_squat', name: 'Cossack Squat', pattern: 'lunge', regions: ['legs'], requires: [], compound: true, load: false, cues: 'Take a wide stance. Shift your weight onto one leg and sit down into it while the other leg stays straight with the toes pointing up. Keep the working heel down and chest up, then push back to the middle. Holding a light weight in front helps your balance.' },

  // ---- Hinge ----
  { id: 'deadlift', name: 'Deadlift', pattern: 'hinge', regions: ['legs', 'back', 'core'], requires: ['barbell'], compound: true, tags: ['climbing'], cues: 'Flat back, push the floor away, lock out with glutes. If you can’t reach the bar with a flat back, pull it from blocks or a rack set at shin height.' },
  { id: 'romanian_dl', name: 'Romanian Deadlift', pattern: 'hinge', regions: ['legs', 'back'], requires: ['barbell'], compound: true, cues: 'Soft knees, push hips back, feel the hamstring stretch.' },
  { id: 'jefferson_deadlift', name: 'Jefferson Deadlift', pattern: 'hinge', regions: ['legs', 'back', 'core'], requires: ['barbell'], compound: true, cues: 'An old-time strongman lift (the Jefferson, a.k.a. straddle deadlift): stand over the bar with it between your legs, one foot ahead of the other, and stand up. The straddle stance is easy on the lower back and builds legs, glutes, and grip. Alternate the lead leg across sets.' },
  // Zercher family — the bar cradled in the crooks of the elbows
  { id: 'zercher_deadlift', name: 'Zercher Deadlift', pattern: 'hinge', regions: ['legs', 'back', 'core'], requires: ['barbell'], compound: true, cues: 'An old strongman lift. Squat down and hook the bar into the crooks of your elbows (start from low blocks or pins if the floor is too low), hands clasped. Brace hard and stand up tall, keeping the bar tight to your body. Brutal on the upper back and core; wrap the bar or wear sleeves if it digs in.' },
  { id: 'zercher_good_morning', name: 'Zercher Good Morning', pattern: 'hinge', regions: ['legs', 'back', 'core'], requires: ['barbell', 'rack'], compound: true, cues: 'Cradle the bar in your elbows against your torso. Soften the knees and push your hips back with a flat back until you feel the hamstrings stretch, then drive the hips forward to stand. Easier on the shoulders than a bar on the back.' },
  { id: 'zercher_reverse_lunge', name: 'Zercher Reverse Lunge', pattern: 'lunge', regions: ['legs', 'core'], requires: ['barbell', 'rack'], compound: true, cues: 'Unrack the bar in the crooks of your elbows. Step one foot back and lower the back knee toward the floor, chest tall, then push through the front foot to return. The front-loaded bar keeps you upright and works your core hard.' },
  { id: 'zercher_carry', name: 'Zercher Carry', pattern: 'core', regions: ['core', 'arms', 'back'], requires: ['barbell', 'rack'], compound: true, hold: true, unit: 'sec', cues: 'Take the bar from the rack in the crooks of your elbows, hands clasped, and walk tall with short, quick steps — ribs down, no leaning back. Carry for time. A strongman favourite for core and upper back.' },
  // Deadlift variations of similar popularity
  { id: 'sumo_deadlift', name: 'Sumo Deadlift', pattern: 'hinge', regions: ['legs', 'back', 'core'], requires: ['barbell'], compound: true, cues: 'Wide stance with toes turned out, hands inside the knees. Push the knees out over the toes, chest up, and push the floor apart as you stand. A more upright back than conventional — many people with long legs pull more this way.' },
  { id: 'deficit_deadlift', name: 'Deficit Deadlift', pattern: 'hinge', regions: ['legs', 'back', 'core'], requires: ['barbell', 'plates'], compound: true, cues: 'Stand on a weight plate or low platform (2–5 cm) so the bar starts lower. Keep the same flat back as a normal deadlift — the extra range builds speed off the floor. Use about 10–20% less than your deadlift.' },
  { id: 'rack_pull', name: 'Rack Pull', pattern: 'hinge', regions: ['back', 'legs'], requires: ['barbell', 'rack'], compound: true, cues: 'Set the pins (or blocks) so the bar starts just below or above the knee. Brace, pull the slack out, then drive the hips through to lock out. A partial deadlift — heavier than your full pull, great for the upper back and lockout.' },
  { id: 'snatch_grip_deadlift', name: 'Snatch-Grip Deadlift', pattern: 'hinge', regions: ['legs', 'back', 'core'], requires: ['barbell'], compound: true, cues: 'Take a very wide grip (about where your hands would be for a snatch). That puts you deeper at the start, so the hips sit lower. Keep your chest up and back flat as you stand. Builds the upper back and pulling from the floor; straps help.' },
  { id: 'stiff_leg_deadlift', name: 'Stiff-Leg Deadlift', pattern: 'hinge', regions: ['legs', 'back'], requires: ['barbell'], compound: true, cues: 'Like a Romanian deadlift, but each rep starts from the floor with the knees only slightly bent. Push your hips back with a flat back and keep the bar close. Stop where your back would start to round.' },
  { id: 'db_rdl', name: 'Dumbbell RDL', pattern: 'hinge', regions: ['legs', 'back'], requires: ['dumbbells'], compound: true, cues: 'Hinge at the hips, bells close to your legs, neutral spine.' },
  { id: 'kb_swing', name: 'Kettlebell Swing', pattern: 'hinge', regions: ['legs', 'back', 'core'], requires: ['kettlebells'], compound: true, tags: ['running'], cues: 'Snap the hips, the bell floats — it’s a hinge, not a squat.' },
  { id: 'hip_thrust', name: 'Barbell Hip Thrust', pattern: 'hinge', regions: ['legs'], requires: ['barbell', 'flat_bench'], compound: true, cues: 'Shoulders on bench, drive hips up, squeeze at the top.' },
  { id: 'glute_bridge', name: 'Glute Bridge', pattern: 'hinge', regions: ['legs'], requires: [], compound: false, addLoad: true, load: false, cues: 'Heels close, ribs down, squeeze glutes at the top.' },
  { id: 'single_leg_rdl', name: 'Single-Leg RDL', pattern: 'hinge', regions: ['legs', 'core'], requires: [], compound: true, addLoad: true, load: false, tags: ['running'], cues: 'Hips square, reach the floor, stand under control.' },

  // ---- Lunge ----
  { id: 'walking_lunge', name: 'Walking Lunge', pattern: 'lunge', regions: ['legs'], requires: ['dumbbells'], compound: true, tags: ['running'], cues: 'Long step, back knee toward the floor, push through front heel.' },
  { id: 'bw_lunge', name: 'Bodyweight Lunge', pattern: 'lunge', regions: ['legs'], requires: [], compound: true, addLoad: true, load: false, tags: ['running'], cues: 'Step forward, drop straight down, keep your torso tall.' },
  { id: 'bulgarian_split', name: 'Bulgarian Split Squat', pattern: 'lunge', regions: ['legs', 'core'], requires: ['flat_bench'], compound: true, tags: ['running'], cues: 'Rear foot on the bench, lower straight down, front-leg focus.' },
  { id: 'step_up', name: 'Step-Up', pattern: 'lunge', regions: ['legs'], requires: [], compound: true, addLoad: true, load: false, tags: ['running'], cues: 'Full foot on the box, drive up without pushing off the back leg. Start on a low box and hold a rail or wall until your balance is solid.' },
  { id: 'weighted_step_up', name: 'Weighted Step-Up', pattern: 'lunge', regions: ['legs', 'core'], requires: ['dumbbells'], compound: true, tags: ['running'], cues: 'A dumbbell in each hand, step onto a knee-height box (≈12–16 in / 30–40 cm) with the whole foot, and drive up through that heel — don’t push off the trailing foot or bounce. Lower under control. Hits quads, glutes and hamstrings, and evens out side-to-side. 3–4 sets of 8–12 reps per leg. Reps per leg.' },
  { id: 'reverse_lunge', name: 'Reverse Lunge', pattern: 'lunge', regions: ['legs'], requires: [], compound: true, addLoad: true, load: false, tags: ['running'], cues: 'Step straight back, drop the back knee toward the floor, drive through the front heel to stand — gentler on the knees than forward lunges. Reps per leg.' },
  { id: 'peterson_step_down', name: 'Peterson Step Down', pattern: 'lunge', regions: ['legs'], requires: [], compound: true, addLoad: true, load: false, cues: 'Stand on a low step; on one leg, slowly lower the other heel to tap the floor with the standing knee tracking over the toes — bulletproofs the knee (VMO). Reps per leg.' },

  // ---- Horizontal push ----
  { id: 'bench_press', name: 'Bench Press', pattern: 'horiz_push', regions: ['chest', 'arms', 'shoulders'], requires: ['barbell', 'flat_bench'], compound: true, cues: 'Shoulder blades pinched, bar to mid-chest, drive up evenly.' },
  { id: 'db_bench', name: 'Dumbbell Bench Press', pattern: 'horiz_push', regions: ['chest', 'arms', 'shoulders'], requires: ['dumbbells', 'flat_bench'], compound: true, cues: 'Lower to chest level, press up and slightly together.' },
  { id: 'incline_db_press', name: 'Incline Dumbbell Press', pattern: 'horiz_push', regions: ['chest', 'shoulders', 'arms'], requires: ['dumbbells', 'adj_bench'], compound: true, cues: 'Bench at ~30°, press up over the upper chest.' },
  { id: 'pushup', name: 'Push-Up', pattern: 'horiz_push', regions: ['chest', 'arms', 'core'], requires: [], compound: true, addLoad: true, load: false, cues: 'Straight line head to heels, elbows ~45°, full range.' },
  { id: 'dip', name: 'Dip', pattern: 'horiz_push', regions: ['chest', 'arms'], requires: ['dip_station'], bwLoad: true, compound: true, load: false, cues: 'Slight forward lean for chest, lower to a comfortable stretch.' },

  // ---- Vertical push ----
  { id: 'overhead_press', name: 'Overhead Press', pattern: 'vert_push', regions: ['shoulders', 'arms', 'core'], requires: ['barbell'], compound: true, cues: 'Squeeze glutes, press bar over the crown, finish with ribs down. If you can’t get your arms overhead without arching your lower back (common with a rounded upper back), press at an incline or use a landmine press instead.' },
  { id: 'arnold_press', name: 'Arnold Press', pattern: 'vert_push', regions: ['shoulders', 'arms', 'core'], requires: ['dumbbells'], compound: true, cues: 'Popularised by Arnold Schwarzenegger: start with dumbbells at your shoulders, palms facing you, and rotate the palms to face forward as you press overhead. Reverse on the way down. The rotation adds front-delt range a standard press skips.' },
  { id: 'db_shoulder_press', name: 'Dumbbell Shoulder Press', pattern: 'vert_push', regions: ['shoulders', 'arms'], requires: ['dumbbells'], compound: true, cues: 'Press up and slightly in, don’t flare the ribs.' },
  { id: 'pike_pushup', name: 'Pike Push-Up', pattern: 'vert_push', regions: ['shoulders', 'arms'], requires: [], compound: true, addLoad: true, load: false, cues: 'Hips high, head toward the floor between your hands.' },

  // ---- Horizontal pull ----
  { id: 'barbell_row', name: 'Barbell Row', pattern: 'horiz_pull', regions: ['back', 'arms'], requires: ['barbell'], compound: true, tags: ['climbing'], cues: 'Hinge ~45°, pull to the lower ribs, control the lowering.' },
  { id: 'db_row', name: 'One-Arm Dumbbell Row', pattern: 'horiz_pull', regions: ['back', 'arms'], requires: ['dumbbells'], compound: true, tags: ['climbing'], cues: 'Flat back, drive the elbow back, squeeze the lat.' },
  { id: 'pendlay_row', name: 'Pendlay Row', pattern: 'horiz_pull', regions: ['back', 'arms'], requires: ['barbell'], compound: true, tags: ['climbing'], cues: 'Named after coach Glenn Pendlay: torso parallel to the floor, each rep starts from a dead stop on the floor and is pulled explosively to the lower chest, then reset. Stricter and more back-thickening than a touch-and-go row.' },
  { id: 'meadows_row', name: 'Meadows Row', pattern: 'horiz_pull', regions: ['back', 'arms'], requires: ['barbell'], compound: true, tags: ['landmine', 'climbing'], cues: 'Created by bodybuilding coach John Meadows: set up a landmine (bar wedged in a corner), stand perpendicular to it, and row the loaded end with one hand from a big stretch up to the hip. Reps per side. A strong lat and upper-back builder.' },
  { id: 'seated_cable_row', name: 'Seated Cable Row', pattern: 'horiz_pull', regions: ['back', 'arms'], requires: ['cable'], compound: true, tags: ['climbing'], cues: 'Tall chest, pull to the navel, don’t lean back hard.' },
  { id: 'inverted_row', name: 'Inverted Row', pattern: 'horiz_pull', regions: ['back', 'arms'], requires: ['pullup_bar'], compound: true, addLoad: true, load: false, tags: ['climbing'], cues: 'Body in a plank, pull chest to the bar, squeeze shoulder blades.' },
  { id: 'band_row', name: 'Band Row', pattern: 'horiz_pull', regions: ['back', 'arms'], requires: ['bands'], compound: true, load: false, cues: 'Anchor the band, pull elbows back, control the return.' },
  { id: 'superman', name: 'Superman', pattern: 'horiz_pull', regions: ['back'], requires: [], compound: false, load: false, cues: 'Lift chest and thighs, squeeze the lower back, brief hold.' },

  // ---- Vertical pull ----
  { id: 'pullup', name: 'Pull-Up', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['pullup_bar'], bwLoad: true, compound: true, load: false, tags: ['climbing'], cues: 'Full hang to chin over bar, drive elbows down.' },
  { id: 'chinup', name: 'Chin-Up', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['pullup_bar'], bwLoad: true, compound: true, load: false, tags: ['climbing'], cues: 'Underhand grip, lead with the chest, full range.' },
  { id: 'lat_pulldown', name: 'Lat Pulldown', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['lat_pulldown'], compound: true, tags: ['climbing'], cues: 'Pull the bar to your collarbone, elbows down and back.' },
  { id: 'cable_pulldown', name: 'Cable Pulldown', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['cable'], compound: true, tags: ['climbing'], cues: 'Drive elbows to the floor, control the stretch up top.' },
  { id: 'band_pulldown', name: 'Band Lat Pulldown', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['bands'], compound: true, load: false, cues: 'High anchor, pull down to the chest, slow return.' },

  // ---- Biceps ----
  { id: 'db_curl', name: 'Dumbbell Curl', pattern: 'biceps', regions: ['arms'], requires: ['dumbbells'], compound: false, cues: 'Elbows pinned, curl without swinging, squeeze at the top.' },
  { id: 'ez_curl', name: 'EZ-Bar Curl', pattern: 'biceps', regions: ['arms'], requires: ['ez_bar'], compound: false, cues: 'Steady elbows, full range, no body english.' },
  { id: 'zottman_curl', name: 'Zottman Curl', pattern: 'biceps', regions: ['arms'], requires: ['dumbbells'], compound: false, cues: 'Named after 19th-century strongman George Zottman: curl up with palms up (supinated), rotate to palms-down (pronated) at the top, and lower slowly. Trains the biceps on the way up and the forearms/brachialis on the way down.' },
  { id: 'band_curl', name: 'Band Curl', pattern: 'biceps', regions: ['arms'], requires: ['bands'], compound: false, load: false, cues: 'Stand on the band, curl with control, resist the way down.' },

  // ---- Triceps ----
  { id: 'db_skullcrusher', name: 'Dumbbell Skullcrusher', pattern: 'triceps', regions: ['arms'], requires: ['dumbbells', 'flat_bench'], compound: false, cues: 'Upper arms still, lower to the forehead, extend fully.' },
  { id: 'db_overhead_ext', name: 'Overhead Triceps Extension', pattern: 'triceps', regions: ['arms'], requires: ['dumbbells'], compound: false, cues: 'Hold one dumbbell overhead in both hands, elbows pointing up and tucked; lower behind your head, then extend to a full lockout. Stretches the long head of the triceps.' },
  { id: 'cable_overhead_ext', name: 'Cable Overhead Triceps Extension', pattern: 'triceps', regions: ['arms'], requires: ['cable'], compound: false, cues: 'Rope on a low pulley, face away and take the arms overhead; extend forward to lockout keeping the elbows high — constant-tension long-head work.' },
  { id: 'band_overhead_ext', name: 'Band Overhead Triceps Extension', pattern: 'triceps', regions: ['arms'], requires: ['bands'], compound: false, load: false, cues: 'Anchor the band low behind you, arms overhead; extend to lockout and control the stretch. Elbows stay pointing forward.' },
  { id: 'bench_dip', name: 'Bench Dip', pattern: 'triceps', regions: ['arms'], requires: ['flat_bench'], compound: false, addLoad: true, load: false, cues: 'Hands on the bench, lower with elbows back, press up.' },
  { id: 'band_pushdown', name: 'Band Triceps Pushdown', pattern: 'triceps', regions: ['arms'], requires: ['bands'], compound: false, load: false, cues: 'Pin elbows to your sides, extend fully, slow return.' },
  { id: 'diamond_pushup', name: 'Diamond Push-Up', pattern: 'triceps', regions: ['arms', 'chest'], requires: [], compound: false, addLoad: true, load: false, cues: 'Hands together under the chest, elbows tight to the body.' },

  // ---- Shoulders (isolation) ----
  { id: 'lateral_raise', name: 'Lateral Raise', pattern: 'shoulder_iso', regions: ['shoulders'], requires: ['dumbbells'], compound: false, cues: 'Lead with the elbows, raise to shoulder height, no shrug.' },
  { id: 'band_lateral', name: 'Band Lateral Raise', pattern: 'shoulder_iso', regions: ['shoulders'], requires: ['bands'], compound: false, load: false, cues: 'Smooth raise to shoulder height, control the way down.' },

  // ---- Calves ----
  { id: 'db_calf_raise', name: 'Dumbbell Calf Raise', pattern: 'calf', regions: ['legs'], requires: ['dumbbells'], compound: false, tags: ['running'], cues: 'Full stretch at the bottom, rise onto the balls of your feet.' },
  { id: 'bw_calf_raise', name: 'Calf Raise', pattern: 'calf', regions: ['legs'], requires: [], compound: false, addLoad: true, load: false, tags: ['running'], cues: 'Up tall on your toes, pause, lower slowly for a stretch.' },
  { id: 'wall_sit_calf_raise', name: 'Wall Sit Calf Raise', pattern: 'calf', regions: ['legs'], requires: [], compound: false, addLoad: true, load: false, cues: 'Hold a wall sit at 90°, then rise onto the balls of your feet and lower slowly — calves under a steady load.' },
  { id: 'single_leg_calf_raise', name: 'Single-Leg Calf Raise', pattern: 'calf', regions: ['legs'], requires: [], compound: false, addLoad: true, load: false, tags: ['running'], cues: 'On one foot (hold a wall for balance), rise all the way up and lower slowly for a deep stretch. Reps per leg.' },
  { id: 'tibialis_raise', name: 'Tibialis Raise', pattern: 'calf', regions: ['legs'], requires: [], compound: false, addLoad: true, load: false, tags: ['running'], cues: 'Heels planted, back against a wall, lift your toes toward your shins as high as you can — strengthens the tibialis for knee and ankle health.' },

  // ---- Rings & climbing-focused ----
  { id: 'ring_row', name: 'Ring Row', pattern: 'horiz_pull', regions: ['back', 'arms'], requires: ['rings'], compound: true, addLoad: true, load: false, tags: ['climbing'], cues: 'Body straight, pull the rings to your chest, squeeze the shoulder blades. Lower your feet to make it harder.' },
  { id: 'ring_pullup', name: 'Ring Pull-Up', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['rings'], bwLoad: true, compound: true, load: false, tags: ['climbing'], cues: 'Let the rings rotate naturally, pull to your chest, control the descent.' },
  { id: 'ring_dip', name: 'Ring Dip', pattern: 'horiz_push', regions: ['chest', 'arms'], requires: ['rings'], bwLoad: true, compound: true, load: false, tags: ['climbing'], cues: 'Rings tight to the body — a key antagonist for climbers. Pause in the support hold at the top.' },
  { id: 'ring_pushup', name: 'Ring Push-Up', pattern: 'horiz_push', regions: ['chest', 'arms', 'core'], requires: ['rings'], compound: true, addLoad: true, load: false, cues: 'Rings just off the floor, turn them out at the top; brace hard against the wobble.' },
  { id: 'ring_support_hold', name: 'Ring Support Hold', pattern: 'core', regions: ['arms', 'core'], requires: ['rings'], compound: false, load: false, hold: true, holdSec: [15, 30], tags: ['climbing'], cues: 'Lock the elbows, depress the shoulders, rings turned slightly out. Hold for time.' },
  { id: 'skin_the_cat', name: 'Skin the Cat', pattern: 'core', regions: ['back', 'core'], requires: ['rings'], compound: true, load: false, tags: ['climbing'], cues: 'From a hang, roll backward through the shoulders and return under control — mobility + strength.' },
  { id: 'lock_off', name: 'Lock-Off Hold', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['pullup_bar'], compound: true, load: false, hold: true, holdSec: [8, 15], tags: ['climbing'], cues: 'Pull up and HOLD at ~90° (or higher) — the isometric pulling strength climbing demands. Hold for time.' },
  { id: 'typewriter_pullup', name: 'Typewriter Pull-Up', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['pullup_bar'], bwLoad: true, compound: true, load: false, tags: ['climbing'], cues: 'Pull up, then shift side to side along the bar keeping the chin high — builds one-arm strength.' },
  { id: 'weighted_pullup', name: 'Weighted Pull-Up', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['pullup_bar', 'dumbbells'], minLoad: 20, bwLoad: true, compound: true, tags: ['climbing'], cues: 'Hang a dumbbell (or a loaded backpack) from a belt or squeeze it between your feet; full range, chin over the bar. No way to add enough weight? Do Archer Pull-Ups instead — they load one arm at a time, no weights needed.' },
  { id: 'wrist_curl', name: 'Wrist Curl', pattern: 'biceps', regions: ['arms'], requires: ['dumbbells'], compound: false, tags: ['climbing'], cues: 'Forearms on your thighs, curl the dumbbell with the wrist only — forearm/finger-flexor strength.' },
  { id: 'reverse_wrist_curl', name: 'Reverse Wrist Curl', pattern: 'biceps', regions: ['arms'], requires: ['dumbbells'], compound: false, tags: ['climbing'], cues: 'Palms down, lift the dumbbell with the wrist — balances the forearms and protects the elbows.' },
  { id: 'max_hangs', name: 'Hangboard Max Hangs', pattern: 'vert_pull', regions: ['arms', 'back'], requires: ['hangboard'], compound: false, load: true, hold: true, unit: 'sec', holdSec: [7, 10], tags: ['climbing'], cues: 'On a hangboard, hang 7–10s on an edge you could just barely hold ~13s all-out — RPE 9, never to failure. Rest ~3 min between hangs. Add weight or a smaller edge as it gets easy. Finger strength’s #1 tool. Not for beginners — build ~a year of climbing first, and warm the fingers up thoroughly.' },
  { id: 'repeaters', name: 'Hangboard Repeaters', pattern: 'vert_pull', regions: ['arms', 'back'], requires: ['hangboard'], compound: false, tags: ['climbing'], cues: 'Sub-maximal edge: hang 7s, rest 3s — 6 hangs make one set (log each 7s hang as a rep). Builds finger strength-endurance. Add hangs, then a little weight. Warm up first; ease off if fingers ache.' },
  { id: 'no_hang_pulls', name: 'No-Hang Finger Pulls', pattern: 'vert_pull', regions: ['arms', 'back'], requires: ['finger_trainer'], compound: false, load: true, hold: true, unit: 'sec', holdSec: [7, 10], tags: ['climbing'], cues: 'With a Tindeq-style force gauge (or a loaded lifting block), fix your arm/legs and pull HARD against a ~20 mm edge for 5–10s — an “overcoming isometric.” A few near-max reps, ~2–3 min rest. Log the peak force and push it up over time. Builds finger strength with less tissue strain than full hangs — and no bodyweight hang needed.' },
  { id: 'front_lever_tuck', name: 'Tuck Front Lever', pattern: 'core', regions: ['core', 'back'], requires: ['pullup_bar'], compound: true, load: false, hold: true, unit: 'sec', holdSec: [8, 15], tags: ['climbing'], cues: 'Hang, pull the shoulders down and back, and tuck your knees to your chest with the torso horizontal. Hold for time — the body tension climbing lives on. Own ~15s, then the app steps you up to the advanced tuck, straddle, and full front lever.' },
  { id: 'l_sit_lock_off', name: 'L-Sit Lock-Off Hold', pattern: 'vert_pull', regions: ['back', 'arms', 'core'], requires: ['pullup_bar'], compound: true, load: false, hold: true, unit: 'sec', holdSec: [5, 15], tags: ['climbing'], cues: 'Pull up to a ~90° lock-off and hold it while raising your legs into an L (or a tuck if that’s too hard) — a lock-off and an L-sit at once. Brutal for pulling strength and core tension together. Hold for time; extend the legs as it gets easier.' },
  { id: 'frenchie_pullup', name: 'Frenchie Pull-Ups', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['pullup_bar'], bwLoad: true, compound: true, load: false, tags: ['climbing'], cues: 'An 80s French-climber classic for lock-off strength. One rep = a full cycle: pull up and hold at the top ~4s, lower and pull up again holding at ~90° for ~4s, lower and pull up again holding near the bottom (~130°) for ~4s. Rest ~3–5 min between sets. Be solid at 8–10 strict pull-ups first.' },
  { id: 'finger_ext_band', name: 'Finger Extensions', pattern: 'biceps', regions: ['arms'], requires: [], compound: false, load: false, tags: ['climbing'], cues: 'Loop a rubber band (or hair tie) around your fingertips and open the hand against it. Balances the forearm flexors you crush climbing with — key prehab against climber’s elbow.' },
  { id: 'tuck_l_sit', name: 'Tuck L-Sit', pattern: 'core', regions: ['core', 'arms'], requires: [], compound: true, load: false, hold: true, unit: 'sec', holdSec: [15, 30], tags: ['climbing'], cues: 'On parallettes, dip bars, or the floor: press down through straight arms, lift your hips, and hold your knees tucked to your chest. The entry to the L-sit. Own ~30s and the app steps you up to one-leg, then a full L-sit.' },

  // ---- Core ----
  { id: 'farmer_carry', name: 'Farmer’s Carry', pattern: 'core', regions: ['core', 'arms', 'back'], requires: ['dumbbells'], compound: true, hold: true, unit: 'sec', tags: ['climbing'], cues: 'Grab a heavy dumbbell in each hand, stand tall, and walk — shoulders back, ribs down, no leaning. Carry for time. One-bell “suitcase” carries make the core work even harder. Pick the weights up and put them down with a hip hinge — never round your back to the floor.' },
  { id: 'plank', name: 'Plank', pattern: 'core', regions: ['core'], requires: [], compound: false, addLoad: true, load: false, hold: true, tags: ['climbing', 'running'], cues: 'Straight line, squeeze glutes and abs, breathe. Hold for time.' },
  { id: 'side_plank_leg_lift', name: 'Side Plank + Leg Lift', pattern: 'core', regions: ['core'], requires: [], compound: false, load: false, cues: 'Hold a side plank and raise the top leg with control — hits the obliques and hip abductors. Reps per side.' },
  { id: 'hanging_leg_raise', name: 'Hanging Leg Raise', pattern: 'core', regions: ['core'], requires: ['pullup_bar'], compound: false, addLoad: true, load: false, tags: ['climbing'], cues: 'No swinging, lift the legs with the abs, lower slow.' },
  { id: 'dead_bug', name: 'Dead Bug', pattern: 'core', regions: ['core'], requires: [], compound: false, load: false, tags: ['running'], cues: 'Low back pinned, extend opposite arm and leg slowly.' },
  { id: 'ab_wheel', name: 'Ab Rollout', pattern: 'core', regions: ['core'], requires: [], compound: false, load: false, tags: ['climbing'], cues: 'Roll out only as far as you can keep the back flat.' },
  { id: 'russian_twist', name: 'Russian Twist', pattern: 'core', regions: ['core'], requires: [], compound: false, addLoad: true, load: false, cues: 'Lean back slightly, rotate from the trunk, control the pace.' },
  { id: 'situp', name: 'Sit-Up', pattern: 'core', regions: ['core'], requires: [], compound: false, addLoad: true, load: false, cues: 'Feet flat or anchored, curl up through the full range, lower with control.' },
  { id: 'cable_crunch', name: 'Cable Crunch', pattern: 'core', regions: ['core'], requires: ['cable'], compound: false, cues: 'Kneel, rope by your head, crunch down with the abs — don’t just bow at the hips.' },

  // ---- Popular additions (r/Fitness favorites) ----
  { id: 'back_extension', name: 'Back Extension', pattern: 'hinge', regions: ['back', 'legs', 'core'], requires: ['flat_bench'], compound: false, tags: ['running'], cues: 'Hinge over the pad, squeeze glutes to rise to a straight line — don’t hyperextend. Hold a plate to your chest to add weight once bodyweight is easy.' },
  { id: 'good_morning', name: 'Good Morning', pattern: 'hinge', regions: ['legs', 'back', 'core'], requires: ['barbell', 'rack'], compound: true, cues: 'Bar on the back, soft knees, push hips back with a flat back, feel the hamstrings.' },
  { id: 'leg_curl', name: 'Leg Curl', pattern: 'hinge', regions: ['legs'], requires: ['leg_curl_ext'], compound: false, tags: ['running'], cues: 'Curl the pad up by squeezing the hamstrings, lower slowly — no hip bouncing.' },
  { id: 'leg_extension', name: 'Leg Extension', pattern: 'squat', regions: ['legs'], requires: ['leg_curl_ext'], compound: false, tags: ['running'], cues: 'Extend to nearly locked, squeeze the quads at the top, lower under control.' },
  { id: 'incline_bench', name: 'Incline Bench Press', pattern: 'horiz_push', regions: ['chest', 'shoulders', 'arms'], requires: ['barbell', 'adj_bench'], compound: true, cues: 'Bench at ~30°, bar to the upper chest, drive up and slightly back.' },
  { id: 'cable_fly', name: 'Cable Fly', pattern: 'horiz_push', regions: ['chest'], requires: ['cable'], compound: false, cues: 'Soft elbows, hug a wide arc, squeeze the chest at the front — slow on the stretch.' },
  { id: 'chest_supported_row', name: 'Chest-Supported Row', pattern: 'horiz_pull', regions: ['back', 'arms'], requires: ['dumbbells', 'adj_bench'], compound: true, tags: ['climbing'], cues: 'Chest on an incline bench, row the bells to your hips, squeeze the mid-back.' },
  { id: 'face_pull', name: 'Face Pull', pattern: 'horiz_pull', regions: ['back', 'shoulders'], requires: ['cable'], compound: false, cues: 'Rope to eye level, pull to your forehead with elbows high — great for shoulder health.' },
  { id: 'barbell_curl', name: 'Barbell Curl', pattern: 'biceps', regions: ['arms'], requires: ['barbell'], compound: false, cues: 'Elbows pinned, curl the bar without swinging, control the lower.' },
  { id: 'hammer_curl', name: 'Hammer Curl', pattern: 'biceps', regions: ['arms'], requires: ['dumbbells'], compound: false, cues: 'Neutral (palms-in) grip, curl without swinging — hits the forearms and biceps.' },
  { id: 'cable_pushdown', name: 'Cable Triceps Pushdown', pattern: 'triceps', regions: ['arms'], requires: ['cable'], compound: false, cues: 'Pin your elbows to your sides, extend fully, resist on the way up.' },
  { id: 'cable_lateral', name: 'Cable Lateral Raise', pattern: 'shoulder_iso', regions: ['shoulders'], requires: ['cable'], compound: false, cues: 'Low pulley across your body, lead with the elbow to shoulder height, no shrug.' },

  // ---- Machine & variation staples ----
  { id: 'wide_pullup', name: 'Wide-Grip Pull-Up', pattern: 'vert_pull', regions: ['back', 'arms'], requires: ['pullup_bar'], compound: true, bwLoad: true, load: false, tags: ['climbing'], cues: 'Grip wider than the shoulders, overhand. Lead with the elbows and pull your chest to the bar — extra lat width.' },
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
  { id: 'side_plank', name: 'Side Plank', pattern: 'core', regions: ['core'], requires: [], compound: false, addLoad: true, load: false, hold: true, unit: 'sec', cues: 'On one forearm, body in a straight line, hips high and stacked. Hold for time, per side.' },

  // ---- Commercial-gym machines ----
  // The stations a big-box gym has a whole row of. Every one takes a weight
  // stack or plates, so none of them need the bodyweight flags. Isolation
  // machines are `compound: false` on purpose — the generator scores compounds
  // higher, so these fill accessory slots rather than displacing a main lift.
  { id: 'hip_abduction', name: 'Hip Abduction Machine', pattern: 'hinge', regions: ['legs'], requires: ['machines'], compound: false, tags: ['running', 'rehab'], cues: 'Sit tall with the pads on the OUTSIDE of your knees and press them apart, then let them close slowly — don’t let the stack drop. Leaning the torso forward slightly biases the glute medius, the muscle that keeps your pelvis level when you run or stand on one leg. A weak glute medius shows up as knees caving on squats and a hip drop when running.' },
  { id: 'hip_adduction', name: 'Hip Adduction Machine', pattern: 'hinge', regions: ['legs'], requires: ['machines'], compound: false, tags: ['running'], cues: 'The mirror of the abduction machine: pads on the INSIDE of the knees, squeeze them together, then let them open slowly under control. Trains the adductors (inner thigh) through a longer range than most lifts reach — worth having if you play field sports or get groin niggles.' },
  { id: 'chest_press_machine', name: 'Machine Chest Press', pattern: 'horiz_push', regions: ['chest', 'arms', 'shoulders'], requires: ['machines'], compound: true, cues: 'Set the seat so the handles line up with the middle of your chest. Press out without letting the shoulders roll forward, and stop just short of locking the elbows. The fixed path lets you push close to failure without a spotter.' },
  { id: 'seated_row_machine', name: 'Machine Seated Row', pattern: 'horiz_pull', regions: ['back', 'arms'], requires: ['machines'], compound: true, tags: ['climbing'], cues: 'Chest against the pad so the lower back does nothing. Drive the elbows back past your ribs and squeeze the mid-back, then let the arms straighten fully for the stretch.' },
  { id: 'reverse_pec_deck', name: 'Reverse Pec Deck', pattern: 'horiz_pull', regions: ['shoulders', 'back'], requires: ['machines'], compound: false, cues: 'The pec deck turned around — chest on the pad, arms out in front, sweep them wide and back. Rear delts and mid-traps, the pair most bench-heavy programs under-train. Keep it light and lead with the elbows.' },
  { id: 'preacher_curl_machine', name: 'Machine Preacher Curl', pattern: 'biceps', regions: ['arms'], requires: ['machines'], compound: false, cues: 'Upper arms flat on the pad, armpits into the top of it. Curl without lifting the elbows and lower all the way — the pad makes swinging impossible, which is the point.' },
  { id: 'machine_triceps_extension', name: 'Machine Triceps Extension', pattern: 'triceps', regions: ['arms'], requires: ['machines'], compound: false, cues: 'Elbows pinned to the pad, extend to a straight arm and resist on the way back. A seated pushdown that takes the rest of your body out of it.' },
  { id: 'ab_crunch_machine', name: 'Ab Crunch Machine', pattern: 'core', regions: ['core'], requires: ['machines'], compound: false, cues: 'Curl the ribs toward the hips rather than bowing at the waist — short range, hard squeeze. Being able to load the abs is the advantage over sit-ups.' },
  { id: 'seated_calf_raise', name: 'Seated Calf Raise', pattern: 'calf', regions: ['legs'], requires: ['machines'], compound: false, tags: ['running'], cues: 'Knees bent under the pad, balls of the feet on the platform. The bent knee shifts the work to the soleus — the deep calf muscle a standing raise mostly misses, and the one that carries the load when you run. Pause stretched at the bottom.' },
  { id: 'standing_calf_raise', name: 'Standing Calf Raise (Machine)', pattern: 'calf', regions: ['legs'], requires: ['machines'], compound: false, tags: ['running'], cues: 'Shoulders under the pads, legs straight. Rise all the way onto the toes, pause, then sink below the platform for a full stretch. A straight knee means the gastrocnemius does the work.' },
  { id: 'calf_press', name: 'Calf Press (Leg Press)', pattern: 'calf', regions: ['legs'], requires: ['leg_press'], compound: false, tags: ['running'], cues: 'Balls of the feet on the bottom edge of the leg-press platform, legs straight but knees unlocked. Push the platform away with the toes and control it back. Handy when the calf machines are busy — keep the safeties engaged.' },
  { id: 'cable_kickback', name: 'Cable Glute Kickback', pattern: 'hinge', regions: ['legs'], requires: ['cable'], compound: false, tags: ['rehab'], cues: 'Ankle strap on a low pulley, hinge forward slightly and hold the frame. Drive the leg straight back from the hip and squeeze — the movement is at the hip, not the lower back. Reps per leg.' },

  // ---- Smith machine ----
  // The Smith was offered in setup but had nothing to pick, so choosing it did
  // nothing. These are the three lifts people actually use it for. The fixed bar
  // path removes the balance demand, which is both the appeal and the reason it
  // is not a straight swap for the barbell version if you have a rack.
  { id: 'smith_squat', name: 'Smith Machine Squat', pattern: 'squat', regions: ['legs', 'core'], requires: ['smith'], compound: true, cues: 'Feet slightly ahead of the bar so the hips can travel back. Sit down between your hips and set the hooks just below depth as your safety, so you can push a hard set alone. Expect to handle more than a free squat — the machine is balancing for you.' },
  { id: 'smith_bench', name: 'Smith Machine Bench Press', pattern: 'horiz_push', regions: ['chest', 'arms', 'shoulders'], requires: ['smith', 'flat_bench'], compound: true, cues: 'Set the bench so the bar comes down to your mid-chest. Shoulder blades pinned back, touch and press. The safeties mean you can train close to failure without a spotter.' },
  { id: 'smith_row', name: 'Smith Machine Bent-Over Row', pattern: 'horiz_pull', regions: ['back', 'arms'], requires: ['smith'], compound: true, tags: ['climbing'], cues: 'Hinge to about 45°, flat back, bar starting just below the knees. Row to the belly and squeeze the mid-back. The bar tracking for you makes it easier to hold position on the last few reps than a free barbell row.' },

  // ---- Bone strength: impact, balance and posture ----
  // Added for the bone-density program. Impact moves are counted in landings
  // (reps), not time: the evidence dose is a NUMBER of impacts — about 50 a
  // session (Royal Osteoporosis Society, 2022). Balance holds are timed.
  { id: 'trap_bar_deadlift', name: 'Trap Bar Deadlift', pattern: 'hinge', regions: ['legs', 'back', 'core'], requires: ['trap_bar'], compound: true, cues: 'Stand in the middle of the hex bar, push the hips back, grip the handles at your sides. Chest proud, back flat, then stand up by pushing the floor away. The handles sit beside you rather than in front, so it is easier to keep a neutral spine than a straight-bar deadlift — a common first heavy lift for bone strength.' },
  { id: 'split_squat', name: 'Split Squat', pattern: 'lunge', regions: ['legs'], requires: [], compound: true, addLoad: true, load: false, cues: 'Long stride, back heel up, both feet planted. Drop the back knee straight down toward the floor and stand back up, torso upright. Hold a wall or rail for balance at first; add dumbbells when it is easy.' },
  { id: 'heel_drop', programOnly: true, name: 'Heel Drops', pattern: 'conditioning', regions: ['legs'], requires: [], compound: false, load: false, cues: 'Stand tall, rise up onto the balls of your feet, then drop your weight sharply onto your heels with straight knees. That jolt is the point — it loads the hip and spine through the skeleton. The gentlest impact option; hold a counter if you need to. After 4–6 weeks without pain or leaking, move on to stomps, then low jumps.' },
  { id: 'stomp', programOnly: true, name: 'Stomps', pattern: 'conditioning', regions: ['legs'], requires: [], compound: false, load: false, cues: 'March on the spot and bring each foot down firmly and fast — a controlled stamp, flat-footed, trunk upright. Each stamp is one impact; alternate legs.' },
  { id: 'pogo_jump', programOnly: true, name: 'Low Pogo Jumps', pattern: 'conditioning', regions: ['legs'], requires: [], compound: false, load: false, tags: ['running'], cues: 'Small, quick bounces off the balls of the feet with stiff ankles and a tall spine — a few centimetres off the floor, not a big jump. Land quietly and rebound straight away. Stop if you leak or anything hurts. Skip these if you have a hip or knee replacement — use stomps instead.' },
  { id: 'jump_chinup_drop', programOnly: true, name: 'Jumping Chin-Up with Drop Landing', pattern: 'vert_pull', regions: ['back', 'arms', 'legs'], requires: ['pullup_bar'], compound: true, load: false, cues: 'From the LIFTMOR trial, where it was always supervised. Use a LOW bar you can just reach with a small jump. Jump to a chin-up (palms facing you), lower slowly to straight arms, then let go and land on both feet, flat-footed, knees soft, trunk upright. The drop from the bar is what makes the landing a big jolt — if that feels like too much, step down instead. Not for anyone with a spine fracture.' },
  { id: 'marching', programOnly: true, name: 'Marching in Place', pattern: 'conditioning', regions: ['legs'], requires: [], compound: false, load: false, tags: ['rehab'], cues: 'Stand tall and march briskly on the spot, lifting each knee to about hip height and placing the foot down firmly — about the loading of brisk walking. The impact option for anyone told to avoid jumping. Reps are steps.' },
  { id: 'single_leg_stance', programOnly: true, name: 'Single-Leg Balance', pattern: 'core', regions: ['legs', 'core'], requires: [], compound: false, load: false, hold: true, unit: 'sec', holdSec: [20, 40], tags: ['rehab'], cues: 'Stand next to a counter or wall, lift one foot and hold, eyes forward, standing hip level. Hands off the support when you can; then try eyes closed or a cushion underfoot. Sets alternate legs: set 1 left, set 2 right, and so on.' },
  { id: 'tandem_walk', programOnly: true, name: 'Tandem Walk', pattern: 'core', regions: ['legs', 'core'], requires: [], compound: false, load: false, tags: ['rehab'], cues: 'Walk in a straight line placing each heel directly in front of the other foot’s toes, slowly, eyes ahead. Use a hallway so a wall is within reach. Reps are steps.' },
  { id: 'single_leg_reach', programOnly: true, name: 'Single-Leg Balance Reach', pattern: 'core', regions: ['legs', 'core'], requires: [], compound: false, load: false, tags: ['rehab'], cues: 'Balance on one leg and reach the other foot out to the front, side and back, tapping the floor lightly each time, then return to standing tall. The standing hip and ankle do the work. Reps per leg.' },
  { id: 'pallof_press', name: 'Pallof Press', pattern: 'core', regions: ['core'], requires: ['bands'], compound: false, cues: 'Band anchored at chest height to your side. Stand side-on, hold the band at your chest and press it straight out, resisting the pull to twist, then bring it back. Core work without bending or twisting the spine — the safe alternative to crunches for anyone with low bone density. Reps per side.' },
  { id: 'prone_back_extension_hold', programOnly: true, name: 'Prone Back Extension Hold', pattern: 'hinge', regions: ['back', 'core'], requires: [], compound: false, load: false, hold: true, unit: 'sec', holdSec: [5, 10], tags: ['rehab'], cues: 'Lie face down, arms by your sides, chin tucked. Squeeze the shoulder blades back and lift the chest a few centimetres to a straight line — no higher — and hold. Strengthens the back extensors that keep you upright and protect the spine.' },

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

  // ---- Kettlebell ----
  // The classic bell vocabulary: ballistics (swing, clean, snatch), grinds
  // (press, squat, get-up), and carries. Reps on single-bell work are per side
  // unless noted.
  { id: 'kb_deadlift', name: 'Kettlebell Deadlift', pattern: 'hinge', regions: ['legs', 'back'], requires: ['kettlebells'], compound: true, tags: ['kettlebell'], cues: 'Bell between your feet, hinge and grip it, then stand by pushing the floor away. The pattern every swing is built on — own it first.' },
  { id: 'kb_single_leg_dl', name: 'Kettlebell Single-Leg Deadlift', pattern: 'hinge', regions: ['legs', 'back', 'core'], requires: ['kettlebells'], compound: true, tags: ['kettlebell', 'running'], cues: 'Bell in one hand, hinge over the opposite standing leg, free leg reaching back in line with your spine. Hips stay square. Reps per side.' },
  { id: 'kb_clean', name: 'Kettlebell Clean', pattern: 'hinge', regions: ['legs', 'back', 'shoulders'], requires: ['kettlebells'], compound: true, tags: ['kettlebell'], cues: 'Swing the bell back, snap the hips, and guide it around your fist into the front rack — it should land softly, not bang your forearm. Reps per side.' },
  { id: 'kb_snatch', name: 'Kettlebell Snatch', pattern: 'hinge', regions: ['legs', 'back', 'shoulders'], requires: ['kettlebells'], compound: true, tags: ['kettlebell'], cues: 'One continuous move from between the legs to locked out overhead. Punch your hand through at the top so the bell settles instead of flipping. Reps per side.' },
  { id: 'kb_high_pull', name: 'Kettlebell High Pull', pattern: 'hinge', regions: ['back', 'shoulders', 'legs'], requires: ['kettlebells'], compound: true, tags: ['kettlebell'], cues: 'A swing that finishes with the elbow pulling high and back, bell staying close to the chest. The bridge between the swing and the snatch. Reps per side.' },
  { id: 'kb_front_squat', name: 'Kettlebell Front Squat', pattern: 'squat', regions: ['legs', 'core'], requires: ['kettlebells'], compound: true, tags: ['kettlebell'], cues: 'Bell (or two) racked on the chest, elbows tight to the ribs. Sit straight down between your hips and stand tall — the front rack forces an upright torso.' },
  { id: 'kb_press', name: 'Kettlebell Strict Press', pattern: 'vert_push', regions: ['shoulders', 'arms', 'core'], requires: ['kettlebells'], compound: true, tags: ['kettlebell'], cues: 'From the front rack, press straight overhead with no leg drive. Squeeze the glutes and brace so the ribs stay down. Reps per side.' },
  { id: 'kb_push_press', name: 'Kettlebell Push Press', pattern: 'vert_push', regions: ['shoulders', 'arms', 'legs'], requires: ['kettlebells'], compound: true, tags: ['kettlebell'], cues: 'A short dip of the knees drives the bell past the sticking point, then lock the arm out. Lets you press a heavier bell than strict. Reps per side.' },
  { id: 'kb_floor_press', name: 'Kettlebell Floor Press', pattern: 'horiz_push', regions: ['chest', 'arms', 'shoulders'], requires: ['kettlebells'], compound: true, tags: ['kettlebell'], cues: 'Lying on the floor, press the bell up over the shoulder. The floor limits the range and keeps the shoulder comfortable — ideal without a bench. Reps per side.' },
  { id: 'kb_row', name: 'Kettlebell Row', pattern: 'horiz_pull', regions: ['back', 'arms'], requires: ['kettlebells'], compound: true, tags: ['kettlebell'], cues: 'Hinge over with a flat back, pull the bell to your hip, and control it down. Don’t let the shoulder shrug toward your ear. Reps per side.' },
  { id: 'kb_halo', name: 'Kettlebell Halo', pattern: 'shoulder_iso', regions: ['shoulders', 'core'], requires: ['kettlebells'], compound: false, tags: ['kettlebell'], cues: 'Hold the bell upside down by the horns and circle it around your head, close and slow. A shoulder warm-up, not a strength move — go light. Count each full circle.' },
  { id: 'kb_windmill', name: 'Kettlebell Windmill', pattern: 'core', regions: ['core', 'shoulders', 'legs'], requires: ['kettlebells'], compound: true, tags: ['kettlebell'], cues: 'Bell locked overhead, eyes on it, push the same-side hip out and reach the free hand down your front leg. Slow and deliberate. Reps per side.' },
  { id: 'kb_turkish_getup', name: 'Turkish Get-Up', pattern: 'core', regions: ['core', 'shoulders', 'legs'], requires: ['kettlebells'], compound: true, tags: ['kettlebell'], cues: 'Stand up from lying down with the bell locked overhead the whole time, then reverse it. Never rush and never take your eyes off the bell. One rep per side takes 30–45 seconds — that is normal.' },
  { id: 'kb_racked_carry', name: 'Kettlebell Front Rack Carry', pattern: 'core', regions: ['core', 'shoulders', 'back'], requires: ['kettlebells'], compound: true, hold: true, unit: 'sec', tags: ['kettlebell'], cues: 'Bell racked on the chest, walk tall and breathe shallow — the rack position punishes any rib flare. Carry for time, swapping sides halfway.' },
  { id: 'kb_suitcase_carry', name: 'Kettlebell Suitcase Carry', pattern: 'core', regions: ['core', 'back', 'arms'], requires: ['kettlebells'], compound: true, hold: true, unit: 'sec', tags: ['kettlebell'], cues: 'One bell at your side, shoulders level, resist the lean. The anti-side-bend work is the whole point. Carry for time, then swap hands.' },
  { id: 'kb_goblet_curl', name: 'Kettlebell Curl', pattern: 'biceps', regions: ['arms'], requires: ['kettlebells'], compound: false, tags: ['kettlebell'], cues: 'Bell by the handle, elbow pinned to your side, curl without swinging. The offset weight makes it harder than it looks.' },

  // ---- Landmine (one end of a barbell anchored in a corner or a landmine base) ----
  // These only need a barbell — jam the free end into a corner if you have no
  // landmine attachment. The arc path is joint-friendly, so they're a favourite
  // for shoulders and backs that dislike straight overhead or heavy bilateral work.
  { id: 'landmine_squat', name: 'Landmine Squat', pattern: 'squat', regions: ['legs', 'core'], requires: ['barbell'], compound: true, tags: ['landmine'], cues: 'Hold the bar end at your chest with both hands (front-loaded) and sit straight down. The bar’s arc helps you stay upright and hit depth — great if back squats bother your knees or lower back.' },
  { id: 'landmine_rdl', name: 'Landmine Romanian Deadlift', pattern: 'hinge', regions: ['legs', 'back'], requires: ['barbell'], compound: true, tags: ['landmine'], cues: 'Hold the bar end with both hands, hinge at the hips with soft knees, and feel the hamstrings load. The arc keeps the weight tracking close to you.' },
  { id: 'landmine_reverse_lunge', name: 'Landmine Reverse Lunge', pattern: 'lunge', regions: ['legs', 'core'], requires: ['barbell'], compound: true, tags: ['landmine'], cues: 'Bar end racked at one shoulder (or both hands at the chest), step straight back and drop the back knee. The front-loaded weight keeps you tall and honest. Reps per leg.' },
  { id: 'landmine_press', name: 'Landmine Press', pattern: 'vert_push', regions: ['shoulders', 'chest', 'arms'], requires: ['barbell'], compound: true, tags: ['landmine'], cues: 'Half-kneeling or standing, press the bar end up and slightly forward along its arc. Shoulder-friendly overhead pressing for people who can’t go straight up pain-free. Reps per side.' },
  { id: 'landmine_row', name: 'Landmine Row', pattern: 'horiz_pull', regions: ['back', 'arms'], requires: ['barbell'], compound: true, tags: ['landmine'], cues: 'Straddle the bar (or stand to one side), grip near the end or with a handle, and row to your hip driving the elbow back. A strong mid-back builder — the Meadows row is a one-arm version of this.' },
  { id: 'landmine_rotation', name: 'Landmine Rotation', pattern: 'core', regions: ['core', 'shoulders'], requires: ['barbell'], compound: false, tags: ['landmine'], cues: 'Hold the bar end at arm’s length and sweep it side to side in an arc, rotating through the hips and trunk (not just the arms). Control it — this trains anti-rotation and rotational power. Reps per side.' },

  // ---- Rehab & recovery (physio-style strengthening for cranky joints) ----
  // Low-load, high-control moves used in prehab/rehab. Most are bodyweight or use
  // a light band. Not medical advice — if a physio gave you specific exercises,
  // do theirs.
  { id: 'straight_leg_raise', name: 'Straight-Leg Raise', pattern: 'core', regions: ['legs', 'core'], requires: [], compound: false, addLoad: true, load: false, tags: ['rehab'], cues: 'Lie on your back, one knee bent, the other leg locked dead straight. Tighten the thigh, lift the straight leg to the height of the bent knee, pause, and lower slowly. A staple for quad/VMO strength around a cranky knee without bending it. Reps per leg.' },
  { id: 'wall_sit', name: 'Wall Sit', pattern: 'squat', regions: ['legs'], requires: [], compound: false, addLoad: true, load: false, hold: true, unit: 'sec', holdSec: [20, 45], tags: ['rehab', 'running'], cues: 'Back flat on a wall, slide down until hips and knees are near 90°, weight through the heels. Hold. Builds quad endurance with no joint pounding. Hold for time.' },
  { id: 'clamshell', name: 'Clamshell', pattern: 'hinge', regions: ['legs'], requires: [], compound: false, load: false, tags: ['rehab', 'running'], cues: 'On your side, knees bent and stacked, heels together. Keep the pelvis still and open the top knee like a clam, squeezing the glute — don’t let the hip roll back. A band above the knees adds load. The classic glute-medius activator. Reps per side.' },
  { id: 'lateral_band_walk', name: 'Lateral Band Walk', pattern: 'lunge', regions: ['legs'], requires: ['bands'], compound: false, load: false, tags: ['rehab', 'running'], cues: 'Loop a band above the knees or ankles, sink to a quarter-squat, and step sideways keeping constant tension — hips level, toes forward, don’t let the knees cave. Torches the glute medius for knee and ankle stability. Reps per side.' },
  { id: 'lunge_calf_raise', name: 'Lunge + Calf Raise', pattern: 'lunge', regions: ['legs', 'core'], requires: [], compound: true, addLoad: true, load: false, tags: ['rehab', 'running'], cues: 'Step into a lunge; as you drive up on the front leg, rise onto the ball of that foot into a calf raise, then lower under control and step back. Pairs single-leg strength with ankle/calf work and balance. Reps per leg.' },
  { id: 'bosu_squat', name: 'Bosu Squat', pattern: 'squat', regions: ['legs', 'core'], requires: [], compound: true, load: false, tags: ['rehab', 'running'], cues: 'Stand on a Bosu (dome up) or a folded cushion and squat under control, knees tracking over the toes. The wobble trains ankle and knee stability and balance. No Bosu? Do it slow and single-leg on the floor. Reps.' },
  { id: 'bird_dog', name: 'Bird Dog', pattern: 'core', regions: ['core', 'back'], requires: [], compound: false, load: false, tags: ['rehab'], cues: 'On hands and knees, reach the opposite arm and leg out long, keeping the spine still and hips level — no twisting or sagging. Hold a beat, return with control. A McGill “big 3” staple for a resilient low back. Reps per side.' },
  { id: 'band_external_rotation', name: 'Band External Rotation', pattern: 'shoulder_iso', regions: ['shoulders', 'arms'], requires: ['bands'], compound: false, load: false, tags: ['rehab'], cues: 'Elbow pinned to your side and bent 90°, rotate your forearm outward against a band, then return slowly. Tuck a rolled towel under the elbow to keep it home. The go-to rotator-cuff strengthener. Reps per side.' },
  { id: 'band_pull_apart', name: 'Band Pull-Apart', pattern: 'horiz_pull', regions: ['back', 'shoulders'], requires: ['bands'], compound: false, load: false, tags: ['rehab'], cues: 'Hold a band at shoulder height with straight arms and pull it apart by squeezing the shoulder blades together — lead with the pinkies, don’t shrug. Great for posture and shoulder health. Reps.' },
  { id: 'scap_wall_slide', name: 'Scapular Wall Slide', pattern: 'vert_push', regions: ['shoulders', 'back'], requires: [], compound: false, load: false, tags: ['rehab'], cues: 'Back, hips, arms and hands against a wall in a “goalpost”. Slide the arms overhead keeping wrists and elbows on the wall as long as you can, then back down. Restores overhead motion and scapular control. Reps.' },
  { id: 'single_leg_drop_forward_jump', name: 'Single-Leg Drop Jump + Forward Jump', pattern: 'conditioning', regions: ['legs', 'core'], requires: [], compound: true, load: false, tags: ['rehab', 'running'], cues: 'Step off a low box and land softly on one leg, absorbing quietly through hip and knee; from that stuck landing, immediately jump forward and stick the next landing. Advanced plyometric for reactive ankle/knee control and power — own soft two-foot landings first. Reps per leg.' },
  { id: 'foot_intrinsics', name: 'Foot Intrinsic Strengthening', pattern: 'calf', regions: ['legs'], requires: [], compound: false, load: false, tags: ['rehab', 'running'], cues: 'Barefoot, keep the toes long and flat and dome the arch by drawing the ball of the foot toward the heel — the “short foot”. Hold a few seconds, release. Towel scrunches with the toes work too. Strengthens the arch to cut pronation stress on the shin. Reps per foot.' },
  { id: 'chin_tuck', name: 'Chin Tuck', pattern: 'core', regions: ['back'], requires: [], compound: false, load: false, tags: ['rehab'], cues: 'Sit or stand tall and glide your head straight back into a gentle “double chin” — a small nod, not a big tuck — to switch on the deep neck flexors. Hold ~5 seconds, relax. Keep it pain-free. Reps.' },
  { id: 'neck_isometric', name: 'Neck Isometric Holds', pattern: 'core', regions: ['back'], requires: [], compound: false, load: false, hold: true, unit: 'sec', holdSec: [5, 10], tags: ['rehab'], cues: 'Place a hand on your forehead, then each side, then the back of your head, and press your head gently into it with NO movement — about 20–30% effort. Hold, breathe, release. Strengthens the neck without loading the joints. Hold each direction for time.' },
  { id: 'median_nerve_glide', name: 'Median Nerve Glide', pattern: 'biceps', regions: ['arms'], requires: [], compound: false, load: false, tags: ['rehab'], cues: 'A gentle neurodynamic “floss”, not a stretch: from a bent elbow and neutral wrist, slowly straighten the elbow and extend the wrist to a light tension, then return. Never push into pain, numbness or tingling. Reps per arm.' },
  { id: 'tendon_glide', name: 'Tendon Gliding', pattern: 'biceps', regions: ['arms'], requires: [], compound: false, load: false, tags: ['rehab'], cues: 'Move the fingers through the positions — straight, hook fist, full fist, tabletop, straight fist — pausing a beat in each. Avoid a hard, forceful grip, which itself compresses the median nerve. Cycles per hand.' },
  { id: 'wrist_flexor_stretch', name: 'Wrist Flexor Stretch', pattern: 'biceps', regions: ['arms'], requires: [], compound: false, load: false, hold: true, unit: 'sec', holdSec: [20, 30], tags: ['rehab'], cues: 'Arm straight out, palm up; with the other hand gently draw the fingers and palm back toward you until you feel an easy forearm stretch. Hold, breathe, ease off. Do the palm-down version for the extensors too. Hold per side.' },
  // Tennis-elbow (lateral epicondylalgia) forearm work — see the Recovery creator.
  { id: 'iso_wrist_extension', name: 'Isometric Wrist Extension', pattern: 'biceps', regions: ['arms'], requires: [], compound: false, addLoad: true, load: false, hold: true, unit: 'sec', holdSec: [20, 45], tags: ['rehab'], cues: 'Early, pain-calming loading for tennis elbow. Forearm supported, palm down; press the back of your hand up against your other hand (or the underside of a table) with a steady, pain-free push — no movement. Or hold a light dumbbell in the raised position. Hold for time, per side.' },
  { id: 'eccentric_wrist_extension', name: 'Eccentric Wrist Extension', pattern: 'biceps', regions: ['arms'], requires: ['dumbbells'], compound: false, tags: ['rehab'], cues: 'The cornerstone of tennis-elbow rehab (the “Tyler Twist” with a rubber bar). Forearm resting on your thigh, palm down, holding a light dumbbell. Use your OTHER hand to help lift the weight up, then let go and lower it SLOWLY over 3–4 seconds with only the sore side. The slow lowering (eccentric) rebuilds the tendon. Keep it a mild, tolerable ache. Reps per side.' },
  { id: 'wrist_extensor_stretch', name: 'Wrist Extensor Stretch', pattern: 'biceps', regions: ['arms'], requires: [], compound: false, load: false, hold: true, unit: 'sec', holdSec: [20, 30], tags: ['rehab'], cues: 'Stretches the sore extensor tendons in tennis elbow. Arm straight out, palm DOWN; with the other hand gently bend the wrist down and in (fingers toward you) until you feel an easy stretch over the top of the forearm — elbow stays straight. Hold, breathe, ease off — never into sharp pain. Hold per side.' },
  // Office-worker neck/shoulder releases — see the Recovery creator.
  { id: 'upper_trap_stretch', name: 'Upper Trap Stretch', pattern: 'core', regions: ['back'], requires: [], compound: false, load: false, hold: true, unit: 'sec', holdSec: [20, 30], tags: ['rehab'], cues: 'Releases the tight upper traps and levator scapulae that ache after a day at the desk. Sit tall and hold the edge of your chair with one hand to anchor that shoulder down. Tip your head to the OPPOSITE side and slightly forward (nose toward the armpit) until you feel a gentle stretch down the side/back of the neck. Hold, breathe — never force it. Hold per side.' },
  { id: 'doorway_pec_stretch', name: 'Doorway Pec Stretch', pattern: 'horiz_push', regions: ['chest', 'shoulders'], requires: [], compound: false, load: false, hold: true, unit: 'sec', holdSec: [20, 30], tags: ['rehab'], cues: 'Opens the tight chest that pulls desk workers into rounded shoulders. Stand in a doorway, forearms on the frame with elbows about shoulder height, and step gently through until you feel an easy stretch across the front of the chest and shoulders. Keep the ribs down, don’t arch the low back. Hold for time.' },

  // ---- Isometric holds (train the position — hold for time; add load to scale) ----
  { id: 'hollow_body_hold', name: 'Hollow Body Hold', pattern: 'core', regions: ['core'], requires: [], compound: false, addLoad: true, load: false, hold: true, unit: 'sec', holdSec: [15, 30], tags: ['rehab'], cues: 'On your back, press the low back into the floor and lift the shoulders and legs into a shallow banana shape. Lower the legs to make it harder. Hold for time.' },
  { id: 'glute_bridge_hold', name: 'Glute Bridge Hold', pattern: 'hinge', regions: ['legs'], requires: [], compound: false, addLoad: true, load: false, hold: true, unit: 'sec', holdSec: [20, 45], tags: ['rehab', 'running'], cues: 'Bridge up, ribs down, and hold the top squeezing the glutes — don’t arch the low back. Rest a plate or dumbbell on the hips to load it. Hold for time.' },
  { id: 'hip_thrust_hold', name: 'Hip Thrust Hold', pattern: 'hinge', regions: ['legs'], requires: ['flat_bench'], compound: false, hold: true, unit: 'sec', holdSec: [15, 30], tags: ['running'], cues: 'Shoulders on a bench, weight across the hips, drive up to a flat back and hold the lockout — a loaded isometric for the glutes. Hold for time.' },
  { id: 'spanish_squat', name: 'Spanish Squat', pattern: 'squat', regions: ['legs'], requires: ['bands'], compound: false, load: false, hold: true, unit: 'sec', holdSec: [20, 45], tags: ['rehab'], cues: 'Loop a stout band behind your knees and anchor it in front; sit back into a squat against the band and hold — the band offloads the knee, a favourite for cranky knees and quad tendons. Hold for time.' },
  { id: 'iso_split_squat_hold', name: 'Split-Squat Hold', pattern: 'lunge', regions: ['legs', 'core'], requires: [], compound: false, hold: true, unit: 'sec', holdSec: [20, 40], tags: ['running'], cues: 'Sink to the bottom of a split squat — front shin vertical, back knee just off the floor — and hold. Hold dumbbells to load it. Hold for time, per leg.' },
  { id: 'calf_raise_hold', name: 'Calf Raise Hold', pattern: 'calf', regions: ['legs'], requires: [], compound: false, hold: true, unit: 'sec', holdSec: [20, 45], tags: ['running'], cues: 'Rise onto the balls of the feet (single-leg to progress) and hold the top, ankles stacked. Hold a dumbbell to load it. Hold for time.' },
  { id: 'overhead_hold', name: 'Overhead Hold', pattern: 'vert_push', regions: ['shoulders', 'arms', 'core'], requires: ['dumbbells'], compound: false, hold: true, unit: 'sec', holdSec: [15, 30], tags: [], cues: 'Press a weight to a locked-out overhead position and hold it dead still — brace the whole body. Builds overhead stability. Hold for time.' },
  { id: 'pushup_hold', name: 'Push-Up Hold', pattern: 'horiz_push', regions: ['chest', 'arms', 'core'], requires: [], compound: false, addLoad: true, load: false, hold: true, unit: 'sec', holdSec: [15, 30], tags: [], cues: 'Hold the bottom (or mid-range) of a push-up in a straight line head to heels, elbows tucked. A brutal isometric for the chest and triceps. Hold for time.' },
  { id: 'copenhagen_hold', name: 'Copenhagen Hold', pattern: 'core', regions: ['core', 'legs'], requires: ['flat_bench'], compound: false, addLoad: true, load: false, hold: true, unit: 'sec', holdSec: [10, 30], tags: ['running'], cues: 'Side plank with the top leg on a bench and the bottom leg hanging — hold, squeezing the inner thigh. The go-to groin/adductor strengthener; start with the knee on the bench. Hold for time, per side.' },
  { id: 'iso_mid_thigh_pull', name: 'Isometric Mid-Thigh Pull', pattern: 'hinge', regions: ['legs', 'back'], requires: ['barbell', 'rack'], compound: true, load: true, hold: true, unit: 'sec', holdSec: [3, 6], tags: [], cues: 'Set a barbell in a rack at mid-thigh (or pull against immovable pins) and pull up as hard as you can into the fixed bar — an “overcoming” isometric. A few maximal 3–6s efforts with long rest, chest tall, driving through the floor.' },
]

// Merge in the bodyweight ladder variants, then stitch easy↔hard links onto
// every exercise that's part of a ladder (base or variant).
import { LADDER_EXERCISES, LADDERS } from './progressions.js'

// Dedupe by id (first definition wins) so an accidental duplicate entry can
// never render twice in a picker or search.

// ---- Mobility: strength through range (src/data/mobility.js) ----
// Loaded end-range reps and long-position holds. Most are `programOnly`: built
// for the Mobility area, so the program generator never drops a couch stretch
// into a hypertrophy split. Nordic and deficit push-ups are ordinary strength
// moves anyone can add.
const MOBILITY_EXERCISES = [
  { id: 'elephant_walk', name: 'Elephant Walk', pattern: 'hinge', regions: ['legs'], requires: [], compound: false, load: false, programOnly: true, cues: 'Fold forward with your palms flat on the floor (bend the knees as much as you need). Straighten one knee, then the other, slowly, feeling the back of each leg lengthen.' },
  { id: 'jefferson_curl', name: 'Jefferson Curl', pattern: 'hinge', regions: ['back', 'legs'], requires: ['dumbbells'], compound: true, programOnly: true, cues: 'Stand on a step holding a light weight. Tuck the chin and roll down one vertebra at a time, letting the weight pull you toward your toes, then roll back up the same way. Start very light — this is a range move, not a strength test.' },
  { id: 'nordic_curl', name: 'Nordic Curl', pattern: 'hinge', regions: ['legs'], requires: [], compound: false, load: false, cues: 'Kneel with your heels anchored under something solid. Keep a straight line from knees to head and lower yourself forward as slowly as you can, catch yourself with your hands, push back up. A band around the chest makes it easier.' },
  { id: 'frog_stretch_rock', name: 'Frog Rock', pattern: 'lunge', regions: ['legs'], requires: [], compound: false, load: false, programOnly: true, cues: 'On all fours with your knees wide and shins parallel, rock your hips slowly back toward your heels and forward again. Keep your back flat and breathe out as you sink.' },
  { id: 'pancake_good_morning', name: 'Pancake Good Morning', pattern: 'hinge', regions: ['legs', 'back'], requires: ['dumbbells'], compound: true, programOnly: true, cues: 'Sit with your legs wide and straight, toes up, holding a light weight at your chest. Hinge forward from the hips with a long, flat back, then sit back up. Widen the legs over time before you add weight.' },
  { id: 'half_kneeling_hip_flexor', name: 'Half-Kneeling Hip Flexor Stretch', pattern: 'lunge', regions: ['legs'], requires: [], compound: false, load: false, hold: true, unit: 'sec', programOnly: true, cues: 'Kneel on one knee. Squeeze that glute and tuck your tailbone under — that alone should stretch the front of the hip. Shift forward only a little. Reach the same-side arm overhead to go further.' },
  { id: 'couch_stretch', name: 'Couch Stretch', pattern: 'lunge', regions: ['legs'], requires: [], compound: false, load: false, addLoad: true, hold: true, unit: 'sec', programOnly: true, cues: 'Back knee in the corner of a couch or wall with the shin up against it, front foot forward. Squeeze the glute, keep your ribs down and bring the torso upright slowly. Hold a dumbbell at your chest to load it later.' },
  { id: 'atg_split_squat', name: 'ATG Split Squat', pattern: 'lunge', regions: ['legs'], requires: [], compound: true, load: false, addLoad: true, cues: 'Long split stance. Let the front knee travel well past the toes while the back knee drops toward the floor, heel down, torso tall. Go only as deep as you control, then drive up. Add dumbbells once the full depth is easy.' },
  { id: 'reverse_nordic', name: 'Reverse Nordic', pattern: 'squat', regions: ['legs'], requires: [], compound: false, load: false, addLoad: true, programOnly: true, cues: 'Kneel tall on a pad, hips straight. Lean back as one unit from the knees — no bending at the hips — only as far as you can come back from, then return.' },
  { id: 'eccentric_heel_drop', name: 'Eccentric Heel Drop', pattern: 'calf', regions: ['legs'], requires: [], compound: false, load: false, addLoad: true, cues: 'Balls of your feet on a step. Rise on both feet, shift onto one, lower that heel slowly below the step, pause in the stretch, then rise on both again.' },
  { id: 'loaded_ankle_rocker', name: 'Loaded Ankle Rocker', pattern: 'calf', regions: ['legs'], requires: ['dumbbells'], compound: false, programOnly: true, cues: 'Half-kneel with a dumbbell resting on the front knee. Drive the knee forward over the toes while the heel stays down, pause, and ease back.' },
  { id: 'patrick_step', name: 'Patrick Step', pattern: 'lunge', regions: ['legs'], requires: [], compound: false, load: false, addLoad: true, programOnly: true, cues: 'Stand on a low step on one leg, heel raised. Slowly bend that knee forward past the toes to tap the other heel down in front, then straighten. Raise the step as it gets easy.' },
  { id: 'dead_hang', name: 'Dead Hang', pattern: 'vert_pull', regions: ['back', 'arms', 'shoulders'], requires: ['pullup_bar'], compound: false, load: false, bwLoad: true, hold: true, unit: 'sec', programOnly: true, cues: 'Hang from a bar with straight arms and let your shoulders rise toward your ears. Breathe and relax into it. Build time first; a weight belt comes much later.' },
  { id: 'lat_stretch_db_pullover', name: 'Dumbbell Pullover (Stretch)', pattern: 'vert_pull', regions: ['back', 'chest'], requires: ['dumbbells', 'flat_bench'], compound: false, programOnly: true, cues: 'Lie across a bench holding one dumbbell over your chest. Lower it slowly behind your head with soft elbows and ribs down, pause in the stretch, bring it back over.' },
  { id: 'deficit_pushup', name: 'Deficit Push-Up', pattern: 'horiz_push', regions: ['chest', 'arms', 'shoulders'], requires: [], compound: true, load: false, addLoad: true, cues: 'Hands on two plates, books or handles so your chest can drop below them. Lower slowly into the deep stretch, pause, press up.' },
  { id: 'open_book', name: 'Open Book', pattern: 'core', regions: ['back', 'core'], requires: [], compound: false, load: false, programOnly: true, cues: 'Lie on your side, knees bent and stacked, arms out in front. Sweep the top arm up and over to the other side, following your hand with your eyes, and pause open. Knees stay together.' },
  { id: 'bench_t_spine_extension', name: 'Bench Upper-Back Extension', pattern: 'core', regions: ['back'], requires: ['flat_bench'], compound: false, load: false, programOnly: true, cues: 'Kneel facing a bench, elbows on the edge, hands together behind your head. Sink your chest toward the floor, letting the upper back arch, pause, and come back up. Keep the lower back neutral.' },
  { id: 'seated_pike_pulse', name: 'Seated Pike Reach', pattern: 'hinge', regions: ['legs', 'back'], requires: [], compound: false, load: false, addLoad: true, programOnly: true, cues: 'Sit with your legs straight together, toes up. Reach toward your feet with a long back, pull yourself a little deeper on each breath out. Hold a light plate to load it later.' },
  { id: 'cat_cow_segmental', name: 'Slow Cat-Cow', pattern: 'core', regions: ['back', 'core'], requires: [], compound: false, load: false, programOnly: true, cues: 'On all fours, round your back one segment at a time from the tailbone up, then arch from the tailbone up. Slow and smooth, no forcing.' },
  { id: 'loaded_wrist_extension_rock', name: 'Wrist Extension Rocks', pattern: 'biceps', regions: ['arms'], requires: [], compound: false, load: false, programOnly: true, cues: 'On all fours, hands under shoulders, fingers forward. Rock your weight slowly forward over your hands and back. Turn the fingers out or back as it gets easy.' },
  { id: 'hip_90_90_switch', name: '90/90 Hip Switch', pattern: 'core', regions: ['legs', 'core'], requires: [], compound: false, load: false, programOnly: true, cues: 'Sit with both knees bent at 90°, one leg in front and one to the side. Rotate both knees over to the other side without using your hands, sitting tall.' },
  { id: 'hip_90_90_liftoff', name: '90/90 Back-Leg Lift-Off', pattern: 'core', regions: ['legs', 'core'], requires: [], compound: false, load: false, hold: true, unit: 'sec', programOnly: true, cues: 'Sit in a 90/90 and lift the back knee and foot a few centimetres off the floor without leaning. Hold. Strength right at the end of your hip rotation.' },
  { id: 'deep_squat_hold', name: 'Deep Squat Hold', pattern: 'squat', regions: ['legs', 'core'], requires: [], compound: true, load: false, addLoad: true, hold: true, unit: 'sec', programOnly: true, cues: 'Sit all the way down into a squat, heels down, chest up — hold a post or a light weight in front to counterbalance. Gently push the knees out with your elbows.' },
]

const dedupeById = (list) => {
  const seen = new Set()
  return list.filter((e) => (seen.has(e.id) ? false : seen.add(e.id)))
}
export const EXERCISES = dedupeById([...BASE_EXERCISES, ...LADDER_EXERCISES, ...MOBILITY_EXERCISES])
export const EXERCISE_BY_ID = Object.fromEntries(EXERCISES.map((e) => [e.id, e]))

// ---- User-defined custom exercises ----
// Anything the built-in library is missing, users can add. They're persisted in
// storage and merged into the live library at startup, so every lookup
// (measure, figure, records, pickers) treats them exactly like a stock exercise.
export const CUSTOM_PREFIX = 'custom_'
export const isCustomExercise = (id) => typeof id === 'string' && id.startsWith(CUSTOM_PREFIX)

// The movement types a custom exercise can be, each seeding sensible defaults so
// a user only has to type a name and pick a type. `pattern` drives the figure
// and the default set/rep scheme; `measure` is the default (they can override).
export const MOVEMENT_TYPES = [
  { pattern: 'squat', label: 'Squat', regions: ['legs', 'core'], compound: true },
  { pattern: 'hinge', label: 'Hinge / deadlift', regions: ['legs', 'back'], compound: true },
  { pattern: 'lunge', label: 'Lunge / split squat', regions: ['legs', 'core'], compound: true },
  { pattern: 'horiz_push', label: 'Push — chest / bench', regions: ['chest', 'arms'], compound: true },
  { pattern: 'vert_push', label: 'Push — overhead', regions: ['shoulders', 'arms'], compound: true },
  { pattern: 'horiz_pull', label: 'Pull — row', regions: ['back', 'arms'], compound: true },
  { pattern: 'vert_pull', label: 'Pull — pull-up / pulldown', regions: ['back', 'arms'], compound: true },
  { pattern: 'biceps', label: 'Biceps', regions: ['arms'], compound: false },
  { pattern: 'triceps', label: 'Triceps', regions: ['arms'], compound: false },
  { pattern: 'shoulder_iso', label: 'Shoulders — raises', regions: ['shoulders'], compound: false },
  { pattern: 'calf', label: 'Calves', regions: ['legs'], compound: false },
  { pattern: 'core', label: 'Core / abs', regions: ['core'], compound: false },
  { pattern: 'conditioning', label: 'Cardio / conditioning', regions: ['legs', 'core'], compound: false },
]

// Build a normalized exercise object from the custom-exercise form's fields.
// Shape matches a library exercise so nothing downstream needs to special-case it.
export function makeCustomExercise(fields = {}) {
  const type = MOVEMENT_TYPES.find((t) => t.pattern === fields.pattern) || MOVEMENT_TYPES[0]
  const measure = fields.measure || 'reps'
  const ex = {
    id: fields.id || `${CUSTOM_PREFIX}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: (fields.name || 'Custom exercise').trim(),
    pattern: type.pattern,
    regions: fields.regions?.length ? fields.regions : type.regions,
    requires: Array.isArray(fields.requires) ? fields.requires : [],
    compound: fields.compound != null ? !!fields.compound : type.compound,
    cues: (fields.cues || '').trim(),
    custom: true,
  }
  // load defaults true; only store the flag when it's a bodyweight move.
  if (fields.load === false) ex.load = false
  if (measure === 'time') { ex.hold = true; ex.unit = fields.unit || 'sec' }
  else if (measure === 'distance') { ex.distance = true; ex.unit = fields.unit || 'km' }
  return ex
}

// Merge custom exercises into the live library (idempotent — safe to call on
// every startup and after each create/delete).
export function registerCustomExercises(list) {
  for (const ex of list || []) {
    if (!ex || !ex.id) continue
    EXERCISE_BY_ID[ex.id] = ex
    const i = EXERCISES.findIndex((e) => e.id === ex.id)
    if (i === -1) EXERCISES.push(ex)
    else EXERCISES[i] = ex
  }
}

// Drop a custom exercise from the live library (after the user deletes it).
export function unregisterCustomExercise(id) {
  delete EXERCISE_BY_ID[id]
  const i = EXERCISES.findIndex((e) => e.id === id)
  if (i !== -1) EXERCISES.splice(i, 1)
}

// Where an isometric hold makes sense for a normally-dynamic lift, and the best
// positions to hold. Isometrics pay off most at the STICKING POINT or END RANGE,
// and strength is joint-angle-specific (~±15° of the trained angle) — so holding
// at a couple of positions covers more of the range. Heavy holds also build
// tendon stiffness and can calm tendon pain. Shown when the "isometric hold"
// toggle is on; the toggle itself works on any rep-based lift.
// Sources: BarBend isometric training; MTNTactical research review; Cleveland Clinic.
export const ISO_HOLDS = {
  pullup: 'Hold at the top (chin over the bar), at ~90° elbow, and just above a dead hang with the shoulders engaged — a few 10–30s holds per position. A top way to earn a first pull-up.',
  chinup: 'Hold at the top, at ~90°, and near the bottom with the shoulders set — 10–30s per position.',
  lat_pulldown: 'Hold the bar at your collarbone (fully contracted) or at ~90° for 20–40s — position-specific back strength.',
  cable_pulldown: 'Hold the fully contracted or ~90° position for 20–40s.',
  back_squat: 'Pause and hold at the bottom or at parallel (~90°) for 20–45s — trains the sticking point and is easy on the joints.',
  front_squat: 'Hold at the bottom or at ~90° for 20–45s, chest tall.',
  goblet_squat: 'Hold at the bottom for 20–45s — a great knee-friendly loaded hold.',
  bw_squat: 'Hold at the bottom or parallel for 20–45s (a wall sit is the loaded cousin).',
  barbell_hack_squat: 'Hold at the bottom or at ~90° for 20–40s, heels down and torso tall.',
  hack_squat: 'Pause and hold at ~90° (or the bottom) for 20–45s — a very knee- and back-friendly loaded quad hold.',
  zercher_squat: 'Hold at the bottom or at ~90° for 20–40s, elbows cradling the bar and chest tall.',
  box_squat: 'Hold just above the box (not sitting) for 15–30s — trains the bottom position.',
  pause_squat: 'Already a pause — lengthen it to a 10–20s hold at the bottom.',
  overhead_squat: 'Hold at the bottom for 10–20s with the bar locked overhead — builds the stability the lift needs.',
  rack_pull: 'Hold the lockout (or just above the knee) for 10–20s — big grip and upper-back work.',
  zercher_good_morning: 'Hold halfway down, flat back, for 10–20s.',
  bench_press: 'Hold at the mid-range sticking point (elbows ~90°, a few inches off the chest) or at lockout for 15–30s. Use a spotter/rack.',
  db_bench: 'Hold at the bottom stretch or the mid-range sticking point for 15–30s.',
  overhead_press: 'Hold at the overhead lockout, or at the ~90° sticking point off the shoulders, for 15–30s.',
  arnold_press: 'Hold at the overhead lockout, or at the ~90° sticking point, for 15–30s.',
  deadlift: 'Hold the bar just below the knees (mid-shin) with a flat back for 10–30s — a brutal grip and posterior-chain hold.',
  romanian_dl: 'Hold at mid-shin with a flat back and loaded hamstrings for 15–30s.',
  jefferson_deadlift: 'Hold just below the knees with a flat back for 10–30s — big grip and posterior-chain demand.',
  barbell_row: 'Hold the bar in the fully contracted position, shoulder blades squeezed, for 15–30s.',
  pendlay_row: 'Hold the bar at the lower chest, shoulder blades squeezed, for 15–30s.',
  meadows_row: 'Hold at the top, elbow driven back and lat squeezed, for 15–30s per side.',
  db_row: 'Hold at the top, elbow driven back and lat squeezed, for 15–30s per side.',
  seated_cable_row: 'Hold the fully retracted position for 15–30s.',
  pushup: 'Hold at the bottom (chest just off the floor) or mid-range for 15–30s.',
  dip: 'Hold in the bottom stretch or at the top support for 15–30s.',
  ring_dip: 'Hold the top support (rings turned out) or the bottom for 10–30s.',
  db_curl: 'Hold at ~90° (forearm parallel to the floor) — the biceps’ hardest point — for 15–30s.',
  ez_curl: 'Hold at ~90° for 15–30s.',
  zottman_curl: 'Hold at ~90° (palms still up) for 15–30s — the biceps’ hardest point.',
  hammer_curl: 'Hold at ~90° for 15–30s.',
  lateral_raise: 'Hold at the top, arms at shoulder height, for 15–30s.',
  bulgarian_split: 'Hold the bottom of the split squat for 20–40s per leg.',
  reverse_lunge: 'Hold the bottom position for 20–40s per leg.',
  weighted_step_up: 'Hold with the working knee at ~90° (or at the top) for 20–30s per leg.',
  glute_bridge: 'Hold the top lockout, squeezing the glutes, for 20–45s.',
  hip_thrust: 'Hold the top lockout for 20–45s — a loaded glute isometric.',
  db_calf_raise: 'Hold the top (fully up on the toes) or the bottom stretch for 20–45s.',
  bw_calf_raise: 'Hold the top or the bottom stretch for 20–45s.',
  leg_curl: 'Hold the fully contracted position for 15–30s.',
  leg_extension: 'Hold the top (knee locked out) for 15–30s — classic quad/VMO isometric.',
  face_pull: 'Hold the fully retracted position, elbows high, for 15–30s.',
  band_pull_apart: 'Hold the band fully apart, shoulder blades squeezed, for 15–30s.',
}

// Position/angle guidance for holding a normally-dynamic lift isometrically, or
// null when the app has none for it.
export const isoHoldFor = (id) => ISO_HOLDS[id] || null

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
  // A per-program "isometric hold" toggle turns any rep-based lift into a timed
  // hold (e.g. a held lat pulldown), without needing a separate library entry.
  if (ex?.iso) return { type: 'time', unit: 'sec' }
  if (hold) return { type: 'time', unit: unit || 'sec' }
  return { type: 'reps', unit: 'reps' }
}
// The unit word for the set column / previews ('reps' | 'sec' | 'min' | 'km').
export const measureUnit = (ex) => exMeasure(ex).unit
// Kept for existing callers.
export const isHold = (ex) => exMeasure(ex).type === 'time'
export const holdUnit = (ex) => exMeasure(ex).unit

// --- Weight handling -------------------------------------------------------
// An exercise is one of three things:
//   • always loaded  — `load` truthy or absent (barbell/dumbbell lifts)
//   • pure bodyweight — `load: false` and nothing else (planks, mobility, cardio)
//   • bodyweight that ACCEPTS optional added weight — `load: false` plus either
//       `bwLoad`  (the lifter's own weight IS the load and you can hang more:
//                  pull-ups, dips — bodyweight counts toward the 1RM), or
//       `addLoad` (you can hold/wear external weight: reverse lunges with
//                  dumbbells, weighted push-ups, a plate on a plank — the added
//                  weight is the only load, bodyweight is NOT added to the 1RM).
// The last group still reads as "bodyweight" for progression (ladders, no
// warm-up ramp), but the workout log offers an optional weight box. Both take an
// entry OR a library object OR an id and resolve the flags from the library.
const libOf = (ex) => (typeof ex === 'string' ? EXERCISE_BY_ID[ex] : EXERCISE_BY_ID[ex?.id]) || ex || {}
export function tracksLoad(ex) {
  if (!ex) return false
  const lib = libOf(ex)
  return (typeof ex === 'object' ? ex.load !== false : lib.load !== false) || !!lib.bwLoad || !!lib.addLoad
}
export function loadIsOptional(ex) {
  if (!ex) return false
  const lib = libOf(ex)
  const isBw = typeof ex === 'object' ? ex.load === false : lib.load === false
  return isBw && !!(lib.bwLoad || lib.addLoad)
}

// --- Targeted muscles (drives the MuscleMap icon) --------------------------
// Each exercise resolves to { primary, secondary } muscle ids. Most come from
// the movement `pattern` (so any two exercises of the same pattern share an
// icon — the reuse we want); MUSCLE_OVERRIDES fixes the ones a pattern default
// gets wrong (shrugs aren't lats, wrist curls aren't biceps, etc.). Muscle ids:
// chest shoulders triceps biceps forearms lats traps lower_back abs obliques
// core glutes quads hamstrings calves tibialis neck.
const M_ = (primary, secondary = []) => ({ primary, secondary })
export const PATTERN_MUSCLES = {
  squat: M_(['quads', 'glutes'], ['hamstrings', 'core', 'lower_back']),
  hinge: M_(['hamstrings', 'glutes', 'lower_back'], ['quads', 'traps', 'forearms']),
  lunge: M_(['quads', 'glutes'], ['hamstrings', 'core']),
  calf: M_(['calves']),
  horiz_push: M_(['chest'], ['shoulders', 'triceps']),
  vert_push: M_(['shoulders'], ['triceps', 'core']),
  shoulder_iso: M_(['shoulders']),
  horiz_pull: M_(['lats'], ['biceps', 'forearms', 'traps']),
  vert_pull: M_(['lats'], ['biceps', 'forearms']),
  biceps: M_(['biceps'], ['forearms']),
  triceps: M_(['triceps']),
  core: M_(['abs'], ['obliques']),
  conditioning: M_([], ['quads', 'calves', 'core']),
}
const MUSCLE_OVERRIDES = {
  // Mobility moves (what each stretches / strengthens at length)
  elephant_walk: M_(['hamstrings', 'calves']), jefferson_curl: M_(['hamstrings', 'lower_back'], ['glutes', 'abs']),
  nordic_curl: M_(['hamstrings'], ['glutes', 'calves']), frog_stretch_rock: M_(['glutes', 'hamstrings'], ['quads']),
  pancake_good_morning: M_(['hamstrings', 'glutes'], ['lower_back']), half_kneeling_hip_flexor: M_(['quads'], ['abs']),
  couch_stretch: M_(['quads'], ['abs']), atg_split_squat: M_(['quads', 'glutes'], ['calves']),
  reverse_nordic: M_(['quads'], ['abs']), eccentric_heel_drop: M_(['calves']), loaded_ankle_rocker: M_(['calves'], ['tibialis']),
  patrick_step: M_(['quads'], ['calves']), dead_hang: M_(['lats', 'forearms'], ['shoulders']),
  lat_stretch_db_pullover: M_(['lats'], ['chest', 'triceps']), deficit_pushup: M_(['chest'], ['shoulders', 'triceps']),
  open_book: M_(['obliques', 'chest'], ['traps']), bench_t_spine_extension: M_(['traps', 'lats'], ['shoulders']),
  seated_pike_pulse: M_(['hamstrings'], ['lower_back']), cat_cow_segmental: M_(['lower_back', 'abs']),
  loaded_wrist_extension_rock: M_(['forearms']), hip_90_90_switch: M_(['glutes'], ['obliques']),
  hip_90_90_liftoff: M_(['glutes'], ['obliques']), deep_squat_hold: M_(['quads', 'glutes'], ['calves', 'lower_back']),
  // Zercher family + barbell variations: the elbow-cradled bar adds biceps and
  // upper back; a wide grip adds traps; sumo shifts the work to the quads.
  zercher_squat: M_(['quads', 'glutes'], ['core', 'biceps', 'traps', 'lower_back']),
  zercher_deadlift: M_(['hamstrings', 'glutes', 'lower_back'], ['quads', 'biceps', 'traps', 'core']),
  zercher_good_morning: M_(['hamstrings', 'glutes', 'lower_back'], ['core', 'biceps']),
  zercher_reverse_lunge: M_(['quads', 'glutes'], ['hamstrings', 'core', 'biceps']),
  zercher_carry: M_(['core', 'traps'], ['biceps', 'lower_back', 'forearms']),
  overhead_squat: M_(['quads', 'glutes', 'shoulders'], ['core', 'traps', 'lower_back']),
  sissy_squat: M_(['quads'], ['core']),
  sumo_deadlift: M_(['glutes', 'quads', 'hamstrings'], ['lower_back', 'traps', 'forearms']),
  rack_pull: M_(['traps', 'lower_back', 'glutes'], ['hamstrings', 'forearms', 'lats']),
  snatch_grip_deadlift: M_(['hamstrings', 'glutes', 'lower_back', 'traps'], ['quads', 'forearms', 'lats']),
  // traps, not lats
  db_shrug: M_(['traps'], ['forearms']), barbell_shrug: M_(['traps'], ['forearms']),
  // rear delts / scapular
  face_pull: M_(['shoulders', 'traps'], ['lats']), band_pull_apart: M_(['shoulders', 'traps']),
  band_external_rotation: M_(['shoulders']),
  // forearms, not biceps
  wrist_curl: M_(['forearms']), reverse_wrist_curl: M_(['forearms']), cable_wrist_curl: M_(['forearms']),
  eccentric_wrist_extension: M_(['forearms']), iso_wrist_extension: M_(['forearms']),
  wrist_extensor_stretch: M_(['forearms']), wrist_flexor_stretch: M_(['forearms']),
  median_nerve_glide: M_(['forearms']), tendon_glide: M_(['forearms']), finger_ext_band: M_(['forearms']),
  // leg isolation
  leg_extension: M_(['quads']), leg_curl: M_(['hamstrings']),
  // glute-dominant
  glute_bridge: M_(['glutes'], ['hamstrings']), glute_bridge_hold: M_(['glutes'], ['hamstrings']),
  single_leg_glute_bridge: M_(['glutes'], ['hamstrings']),
  hip_thrust: M_(['glutes'], ['hamstrings', 'quads']), hip_thrust_hold: M_(['glutes'], ['hamstrings']),
  clamshell: M_(['glutes']), lateral_band_walk: M_(['glutes'], ['quads']),
  // Hip abduction IS the glute medius/minimus, so the hinge default (hamstrings
  // + lower back) would be wrong for it.
  hip_abduction: M_(['glutes']), cable_kickback: M_(['glutes'], ['hamstrings']),
  // Bone-strength additions: impact moves load the legs and hips through the
  // landing; balance work is the standing hip and ankle.
  trap_bar_deadlift: M_(['glutes', 'quads', 'hamstrings'], ['lower_back', 'traps', 'forearms']),
  split_squat: M_(['quads', 'glutes'], ['hamstrings']),
  marching: M_(['quads', 'calves'], ['glutes', 'core']),
  heel_drop: M_(['calves'], ['quads', 'glutes']), stomp: M_(['quads', 'calves'], ['glutes']),
  pogo_jump: M_(['calves'], ['quads', 'glutes']),
  jump_chinup_drop: M_(['lats', 'biceps'], ['quads', 'calves', 'forearms']),
  single_leg_stance: M_(['glutes', 'calves'], ['core']), tandem_walk: M_(['calves', 'glutes'], ['core']),
  single_leg_reach: M_(['glutes', 'quads'], ['calves', 'core']),
  pallof_press: M_(['obliques', 'abs'], ['shoulders']),
  prone_back_extension_hold: M_(['lower_back'], ['glutes', 'traps']),
  // The map has no inner-thigh region, so adduction is drawn on the upper leg it
  // sits between. Not exact — the adductors are their own group — but much closer
  // than the hinge default, which would light up the lower back, traps and grip.
  hip_adduction: M_(['quads', 'hamstrings']),
  // Rear delts + mid-traps, same as its cable cousin the face pull.
  reverse_pec_deck: M_(['shoulders', 'traps'], ['lats']),
  // Machine arm/ab isolation: the pattern defaults drag in movers that idle here.
  preacher_curl_machine: M_(['biceps'], ['forearms']),
  machine_triceps_extension: M_(['triceps']),
  ab_crunch_machine: M_(['abs'], ['obliques']),
  // neck / posture
  chin_tuck: M_(['neck']), neck_isometric: M_(['neck']), upper_trap_stretch: M_(['neck', 'traps']),
  scap_wall_slide: M_(['shoulders', 'traps']),
  // core specifics
  russian_twist: M_(['obliques'], ['abs']), hanging_leg_raise: M_(['abs']),
  hanging_knee_raise: M_(['abs']), toes_to_bar: M_(['abs']),
  bird_dog: M_(['lower_back'], ['glutes']), superman: M_(['lower_back'], ['glutes']),
  // shins
  tibialis_raise: M_(['tibialis']),
  // chest-flye style
  pec_deck: M_(['chest']), cable_fly: M_(['chest']),
  // doorway/pec stretch
  doorway_pec_stretch: M_(['chest'], ['shoulders']),
}
// Resolve an exercise (object, entry, or id) to { primary, secondary } muscle ids.
export function musclesFor(ex) {
  const lib = libOf(ex)
  const id = typeof ex === 'string' ? ex : ex?.id
  const override = MUSCLE_OVERRIDES[id] || lib.muscles
  if (override) return { primary: override.primary || [], secondary: override.secondary || [] }
  const d = PATTERN_MUSCLES[lib.pattern || ex?.pattern]
  return d ? { primary: [...d.primary], secondary: [...(d.secondary || [])] } : { primary: [], secondary: [] }
}

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

// Hidden search aliases — common alternate names, abbreviations, and muscle
// nicknames so a search finds the right lift even if the person calls it
// something else. Not shown in the UI; used only by matchesQuery. Keep lowercase.
const ALIASES = {
  // Mobility
  jefferson_curl: ['jefferson', 'jeff curl', 'spinal curl'],
  nordic_curl: ['nordic', 'nordics', 'nordic hamstring curl', 'nhe'],
  reverse_nordic: ['reverse nordics', 'quad nordic'],
  atg_split_squat: ['atg', 'knees over toes split squat', 'kot split squat'],
  couch_stretch: ['kneeling quad stretch', 'rectus femoris stretch'],
  half_kneeling_hip_flexor: ['hip flexor stretch', 'kneeling hip flexor'],
  eccentric_heel_drop: ['heel drop', 'alfredson', 'calf eccentric'],
  patrick_step: ['poliquin step', 'peterson step up', 'atg step'],
  dead_hang: ['passive hang', 'bar hang'],
  deficit_pushup: ['deficit push up', 'deep push up'],
  open_book: ['thoracic rotation', 't spine rotation'],
  frog_stretch_rock: ['frog stretch', 'adductor rock'],
  pancake_good_morning: ['pancake', 'straddle good morning'],
  hip_90_90_switch: ['90 90', '9090', 'hip switches'],
  deep_squat_hold: ['squat hold', 'asian squat', 'resting squat'],
  seated_pike_pulse: ['pike stretch', 'seated forward fold'],
  // Squat
  back_squat: ['barbell squat', 'high bar squat', 'low bar squat'],
  front_squat: ['barbell front squat'],
  goblet_squat: ['dumbbell squat'],
  leg_press: ['machine leg press'],
  bw_squat: ['bodyweight squat', 'air squat'],
  barbell_hack_squat: ['barbell hack squat', 'hack squat', 'hackenschmidt squat', 'hack lift', 'behind-the-back squat'],
  hack_squat: ['hack squat', 'machine hack squat', 'hack squat machine', 'hack press'],
  zercher_squat: ['zercher squat', 'zercher', 'elbow squat'],
  box_squat: ['box squats', 'powerlifting box squat', 'squat to box', 'squat to bench'],
  pause_squat: ['paused squat', 'pause squats', 'pausing squat'],
  pin_squat: ['anderson squat', 'dead stop squat', 'squat from pins', 'bottom up squat', 'bottoms up squat'],
  overhead_squat: ['ohs', 'snatch squat', 'barbell overhead squat'],
  sissy_squat: ['sissy squats', 'knee over toes squat'],
  cossack_squat: ['cossack', 'side squat', 'lateral squat'],
  zercher_reverse_lunge: ['zercher lunge', 'zercher split squat', 'zercher lunges'],
  zercher_deadlift: ['zercher dl', 'zercher pull', 'zercher lift'],
  zercher_good_morning: ['zercher gm', 'zercher good mornings'],
  zercher_carry: ['zercher walk', 'bear hug carry', 'barbell carry'],
  sumo_deadlift: ['sumo', 'sumo dl', 'sumo pull', 'wide stance deadlift'],
  deficit_deadlift: ['deficit pull', 'deficit dl', 'deficit deadlifts'],
  rack_pull: ['rack pulls', 'block pull', 'block pulls', 'partial deadlift', 'pin pull'],
  snatch_grip_deadlift: ['snatch grip dl', 'wide grip deadlift', 'snatch grip pull'],
  stiff_leg_deadlift: ['sldl', 'stiff legged deadlift', 'straight leg deadlift', 'stiff leg dl'],
  leg_extension: ['quad extension', 'knee extension'],
  // Hinge
  deadlift: ['conventional deadlift', 'barbell deadlift', 'dead lift'],
  romanian_dl: ['rdl', 'romanian deadlift', 'stiff leg deadlift', 'sldl'],
  jefferson_deadlift: ['jefferson deadlift', 'jefferson squat', 'straddle deadlift', 'jefferson lift'],
  db_rdl: ['dumbbell romanian deadlift', 'dumbbell rdl'],
  kb_swing: ['kettlebell swing', 'kb swing', 'two hand swing', 'russian swing', 'hardstyle swing'],
  kb_deadlift: ['kettlebell deadlift', 'kb deadlift'],
  kb_single_leg_dl: ['single leg deadlift', 'kb single leg deadlift', 'one legged deadlift', 'sldl'],
  kb_clean: ['kettlebell clean', 'kb clean'],
  kb_snatch: ['kettlebell snatch', 'kb snatch'],
  kb_high_pull: ['kettlebell high pull', 'kb high pull'],
  kb_front_squat: ['kettlebell front squat', 'kb front squat', 'double front squat', 'racked squat'],
  kb_press: ['kettlebell press', 'kb press', 'kettlebell military press', 'kb strict press'],
  kb_push_press: ['kettlebell push press', 'kb push press'],
  kb_floor_press: ['kettlebell floor press', 'kb floor press'],
  kb_row: ['kettlebell row', 'kb row', 'kettlebell bent over row'],
  kb_halo: ['kettlebell halo', 'kb halo'],
  kb_windmill: ['kettlebell windmill', 'kb windmill'],
  kb_turkish_getup: ['turkish get up', 'turkish getup', 'tgu', 'get up', 'getup'],
  kb_racked_carry: ['front rack carry', 'racked carry', 'rack walk'],
  kb_suitcase_carry: ['suitcase carry', 'suitcase walk', 'one arm carry'],
  kb_goblet_curl: ['kettlebell curl', 'kb curl'],
  hip_thrust: ['barbell hip thrust', 'glute thrust', 'glute bridge'],
  glute_bridge: ['hip bridge', 'bridge'],
  single_leg_rdl: ['single leg deadlift', 'one leg rdl'],
  back_extension: ['hyperextension', 'hyper extension', '45 degree back extension'],
  good_morning: ['barbell good morning'],
  leg_curl: ['hamstring curl', 'lying leg curl', 'seated leg curl'],
  // Lunge
  walking_lunge: ['dumbbell lunge', 'lunges'],
  bw_lunge: ['bodyweight lunge', 'lunges'],
  bulgarian_split: ['bulgarian split squat', 'rear foot elevated split squat', 'rfess', 'split squat'],
  step_up: ['box step up'],
  weighted_step_up: ['weighted step up', 'dumbbell step up', 'db step up', 'loaded step up'],
  landmine_squat: ['landmine squat', 'landmine front squat', 'front loaded squat', 'landmine goblet squat'],
  landmine_rdl: ['landmine rdl', 'landmine romanian deadlift', 'landmine deadlift'],
  landmine_reverse_lunge: ['landmine reverse lunge', 'landmine lunge', 'landmine split squat'],
  landmine_press: ['landmine press', 'landmine shoulder press', 'landmine overhead press', 'half kneeling landmine press'],
  landmine_row: ['landmine row', 'meadows row', 'landmine bent over row', 't-bar row', 't bar row'],
  landmine_rotation: ['landmine rotation', 'landmine twist', 'landmine 180', 'landmine oblique twist'],
  straight_leg_raise: ['straight leg raise', 'slr', 'straight-leg raise'],
  wall_sit: ['wall sit', 'wall squat hold', 'wall squat'],
  clamshell: ['clamshell', 'clam shell', 'clams', 'clam'],
  lateral_band_walk: ['lateral band walk', 'monster walk', 'banded side steps', 'crab walk', 'band walk'],
  lunge_calf_raise: ['lunge calf raise', 'lunge to calf raise', 'lunge and calf raise'],
  bosu_squat: ['bosu squat', 'balance squat', 'wobble squat', 'bosu ball squat'],
  bird_dog: ['bird dog', 'birddog', 'quadruped', 'pointer'],
  band_external_rotation: ['external rotation', 'band external rotation', 'rotator cuff', 'shoulder external rotation'],
  band_pull_apart: ['band pull apart', 'pull apart', 'band pullapart'],
  scap_wall_slide: ['wall slide', 'scapular wall slide', 'wall angel', 'wall angels'],
  single_leg_drop_forward_jump: ['single leg drop jump', 'drop jump forward jump', 'single leg hop', 'single leg bound'],
  foot_intrinsics: ['foot intrinsics', 'short foot', 'toe scrunch', 'towel scrunch', 'arch strengthening'],
  chin_tuck: ['chin tuck', 'chin tucks', 'deep neck flexor', 'cervical retraction'],
  neck_isometric: ['neck isometric', 'neck isometrics', 'neck strengthening'],
  median_nerve_glide: ['median nerve glide', 'nerve glide', 'nerve floss', 'neural glide'],
  tendon_glide: ['tendon glide', 'tendon gliding', 'finger gliding'],
  wrist_flexor_stretch: ['wrist flexor stretch', 'wrist stretch', 'forearm stretch'],
  iso_wrist_extension: ['isometric wrist extension', 'wrist extension hold', 'tennis elbow isometric'],
  eccentric_wrist_extension: ['eccentric wrist extension', 'tyler twist', 'flexbar', 'flex bar', 'tennis elbow exercise', 'lateral epicondylitis'],
  wrist_extensor_stretch: ['wrist extensor stretch', 'tennis elbow stretch', 'extensor stretch'],
  upper_trap_stretch: ['upper trap stretch', 'levator scapulae stretch', 'neck stretch', 'trap stretch'],
  doorway_pec_stretch: ['doorway pec stretch', 'doorway chest stretch', 'pec stretch', 'chest stretch', 'door stretch'],
  hollow_body_hold: ['hollow body hold', 'hollow hold', 'hollow body'],
  glute_bridge_hold: ['glute bridge hold', 'bridge hold', 'isometric glute bridge'],
  hip_thrust_hold: ['hip thrust hold', 'isometric hip thrust'],
  spanish_squat: ['spanish squat', 'banded squat hold', 'knee tendon squat'],
  iso_split_squat_hold: ['split squat hold', 'isometric split squat', 'lunge hold'],
  calf_raise_hold: ['calf raise hold', 'isometric calf raise', 'heel raise hold'],
  overhead_hold: ['overhead hold', 'isometric overhead', 'waiter hold', 'overhead carry hold'],
  pushup_hold: ['push up hold', 'pushup hold', 'isometric push up', 'bottom hold'],
  copenhagen_hold: ['copenhagen hold', 'copenhagen plank', 'adductor hold', 'groin plank'],
  iso_mid_thigh_pull: ['isometric mid thigh pull', 'mid thigh pull', 'imtp', 'overcoming isometric pull'],
  reverse_lunge: ['backward lunge'],
  // Horizontal push
  bench_press: ['barbell bench press', 'flat bench', 'flat barbell bench', 'chest press'],
  db_bench: ['dumbbell bench press', 'db bench', 'dumbbell chest press', 'flat dumbbell press'],
  incline_db_press: ['incline dumbbell press', 'incline dumbbell bench'],
  incline_bench: ['incline barbell press', 'incline barbell bench'],
  pushup: ['press up', 'push ups'],
  dip: ['chest dip', 'parallel bar dip', 'tricep dip'],
  cable_fly: ['cable crossover', 'cable flye', 'pec fly', 'chest fly'],
  // Vertical push
  overhead_press: ['ohp', 'military press', 'strict press', 'standing shoulder press', 'barbell shoulder press', 'barbell overhead press'],
  arnold_press: ['arnold press', 'arnold dumbbell press', 'rotating shoulder press'],
  db_shoulder_press: ['dumbbell shoulder press', 'dumbbell overhead press', 'seated dumbbell press', 'db press'],
  pike_pushup: ['pike press'],
  // Horizontal pull
  barbell_row: ['bent over row', 'bent-over row', 'bor', 'barbell bent over row'],
  db_row: ['one arm row', 'single arm row', 'dumbbell row', 'kroc row'],
  pendlay_row: ['pendlay row', 'dead-stop row', 'dead stop row', 'dead stop barbell row'],
  meadows_row: ['meadows row', 'landmine meadows row', 'john meadows row'],
  seated_cable_row: ['cable row', 'seated row', 'low row'],
  // Machines. People mostly search these by the body part they think the
  // machine is for ("inner thigh", "outer thigh", "rear delt machine") or by
  // gym slang, so those matter more here than the formal name.
  trap_bar_deadlift: ['trap bar deadlift', 'hex bar deadlift', 'hex bar', 'trap bar', 'hex deadlift'],
  split_squat: ['split squat', 'static lunge', 'stationary lunge', 'dumbbell split squat'],
  heel_drop: ['heel drop', 'heel drops', 'heel thumps', 'heel strikes', 'impact drops'],
  stomp: ['stomps', 'stamps', 'stamping', 'foot stomps', 'stomping'],
  pogo_jump: ['pogo', 'pogo hops', 'pogos', 'ankle hops', 'low jumps', 'small jumps', 'bounces'],
  jump_chinup_drop: ['jumping chin up', 'jumping chin-up', 'drop landing', 'liftmor jump', 'chin up drop landing'],
  marching: ['march in place', 'marching', 'march on the spot', 'high knees march', 'step in place'],
  single_leg_stance: ['single leg stance', 'one leg balance', 'stand on one leg', 'balance hold', 'single leg balance'],
  tandem_walk: ['heel to toe walk', 'tightrope walk', 'tandem stance', 'balance walk'],
  single_leg_reach: ['star excursion', 'balance reach', 'single leg reach', 'clock reach'],
  pallof_press: ['pallof', 'anti rotation press', 'anti-rotation press', 'band pallof press', 'cable pallof press'],
  prone_back_extension_hold: ['prone extension', 'prone back extension', 'back extension hold', 'floor back extension', 'lying back extension'],
  hip_abduction: ['abductor machine', 'hip abductor', 'abduction machine', 'outer thigh machine', 'outer thigh', 'glute medius machine', 'hip abductor machine', 'good girl machine'],
  hip_adduction: ['adductor machine', 'hip adductor', 'adduction machine', 'inner thigh machine', 'inner thigh', 'groin machine', 'hip adductor machine', 'bad girl machine'],
  chest_press_machine: ['machine chest press', 'seated chest press', 'chest press', 'machine bench press', 'hammer strength chest press'],
  seated_row_machine: ['machine row', 'machine seated row', 'hammer strength row', 'chest supported machine row'],
  reverse_pec_deck: ['rear delt fly', 'rear delt machine', 'reverse fly machine', 'reverse fly', 'rear deltoid machine', 'reverse flye'],
  preacher_curl_machine: ['preacher curl', 'machine curl', 'bicep curl machine', 'arm curl machine', 'scott curl'],
  machine_triceps_extension: ['machine tricep extension', 'tricep machine', 'seated tricep extension', 'machine pushdown'],
  ab_crunch_machine: ['crunch machine', 'ab machine', 'machine crunch', 'abdominal machine'],
  seated_calf_raise: ['seated calf', 'soleus raise', 'calf machine', 'seated calf machine'],
  standing_calf_raise: ['standing calf', 'calf raise machine', 'gastroc raise', 'standing calf machine'],
  calf_press: ['leg press calf raise', 'calf press', 'calf raise on leg press', 'toe press'],
  cable_kickback: ['glute kickback', 'cable glute kickback', 'donkey kick', 'hip extension cable', 'kickback'],
  smith_squat: ['smith squat', 'smith machine squat'],
  smith_bench: ['smith bench', 'smith machine bench', 'smith machine press'],
  smith_row: ['smith row', 'smith machine row', 'smith bent over row'],
  inverted_row: ['bodyweight row', 'australian pull up', 'horizontal row'],
  db_shrug: ['dumbbell shrug', 'shrugs', 'traps'],
  barbell_shrug: ['barbell shrugs', 'shrugs', 'traps'],
  // Vertical pull
  pullup: ['pull up', 'pull-up', 'pullups'],
  chinup: ['chin up', 'chin-up', 'chinups'],
  lat_pulldown: ['pulldown', 'lat pull down', 'lat pull-down'],
  cable_pulldown: ['cable lat pulldown'],
  // Biceps / forearms
  db_curl: ['bicep curl', 'biceps curl', 'dumbbell bicep curl'],
  ez_curl: ['barbell curl', 'ez bar curl', 'ez-bar curl', 'bicep curl'],
  zottman_curl: ['zottman curl', 'zottman'],
  band_curl: ['band bicep curl'],
  wrist_curl: ['forearm curl'],
  max_hangs: ['hangboard', 'fingerboard', 'max hang', 'finger strength', 'edge hang', 'dead hang weighted'],
  repeaters: ['hangboard repeaters', 'finger endurance', '7 3 repeaters', 'fingerboard'],
  no_hang_pulls: ['tindeq', 'no hang', 'no-hang', 'block pull', 'force gauge', 'isometric finger', 'lifting block', 'progressor', 'finger strength'],
  front_lever_tuck: ['front lever', 'tuck front lever', 'body tension', 'lever'],
  finger_ext_band: ['finger extensions', 'reverse finger curl', 'rubber band extensions', 'climbers elbow', 'prehab', 'extensor'],
  l_sit_lock_off: ['l sit lock off', 'lock off l sit', 'l-sit lock-off', 'lockoff'],
  frenchie_pullup: ['frenchie', 'frenchy pull up', 'french pull up', 'lock off pull up'],
  tuck_l_sit: ['l sit', 'l-sit', 'lsit', 'tuck l sit', 'compression'],
  // Triceps
  db_skullcrusher: ['skull crusher', 'skullcrusher', 'lying triceps extension', 'nose breaker', 'tricep'],
  db_overhead_ext: ['french press', 'overhead dumbbell extension', 'seated triceps extension', 'overhead tricep extension', 'tricep extension', 'triceps extension', 'tricep'],
  cable_overhead_ext: ['overhead tricep extension', 'rope overhead extension', 'cable french press', 'tricep'],
  band_overhead_ext: ['overhead tricep extension', 'band tricep extension', 'tricep'],
  band_pushdown: ['tricep pushdown', 'triceps pushdown', 'rope pushdown', 'tricep'],
  bench_dip: ['tricep dip', 'chair dip', 'tricep'],
  diamond_pushup: ['close grip pushup', 'triangle pushup', 'tricep pushup', 'tricep'],
  // Shoulders
  lateral_raise: ['side raise', 'side lateral raise', 'lateral delt raise', 'db lateral raise', 'shoulder raise'],
  band_lateral: ['band side raise'],
  // Calves
  db_calf_raise: ['dumbbell calf raise', 'standing calf raise'],
  bw_calf_raise: ['standing calf raise', 'bodyweight calf raise'],
  tibialis_raise: ['tib raise', 'anterior tibialis raise'],
  // Core
  farmer_carry: ['farmers walk', "farmer's walk", 'farmers carry', 'loaded carry', 'suitcase carry', 'dumbbell carry', 'grip'],
  plank: ['front plank', 'forearm plank'],
  hanging_leg_raise: ['hanging leg raises', 'leg raise'],
  dead_bug: ['deadbug'],
  ab_wheel: ['ab rollout', 'ab roller', 'ab wheel rollout'],
  russian_twist: ['russian twists', 'seated twist'],
  situp: ['sit up', 'sit-up', 'crunch'],
  cable_crunch: ['kneeling cable crunch', 'rope crunch'],
  side_plank: ['side plank hold'],
  // Cardio / conditioning
  running: ['run', 'jog', 'jogging'],
  treadmill: ['treadmill run', 'treadmill walk'],
  stationary_bike: ['exercise bike', 'spin bike', 'cycling', 'bike'],
  rowing_machine: ['rower', 'erg', 'concept2'],
  elliptical: ['cross trainer'],
  stair_climber: ['stairmaster', 'stair master'],
  jump_rope: ['skipping', 'skip rope', 'jump roping'],
  mountain_climber: ['mountain climbers'],
  burpee: ['burpees'],
  jumping_jack: ['jumping jacks', 'star jump'],
  high_knees: ['high knee'],
  // Rings
  ring_muscle_up: ['muscle up'],
  wall_hspu: ['handstand push up', 'hspu'],
}

// Extra machine / gym-brand nicknames, merged onto the aliases above. Kept in a
// second table so entries for the same id (e.g. leg_press) add to — rather than
// clash with — the base aliases. Unknown ids are simply ignored on merge.
const MACHINE_ALIASES = {
  hack_squat: ['hack squat sled'],
  leg_press: ['leg press machine', '45 degree leg press', 'seated leg press', 'horizontal leg press', 'sled press'],
  leg_extension: ['leg extension machine'],
  leg_curl: ['leg curl machine', 'hamstring curl machine'],
  machine_shoulder_press: ['machine shoulder press', 'shoulder press machine', 'seated press machine', 'hammer strength shoulder press', 'overhead press machine'],
  pec_deck: ['pec deck', 'pec dec', 'butterfly machine', 'chest fly machine', 'pec fly machine', 'fly machine', 'pec deck machine'],
  seated_cable_row: ['cable row machine', 'seated row machine', 'row machine'],
  lat_pulldown: ['pulldown machine', 'lat machine', 'lat pulldown machine'],
  cable_pulldown: ['cable pulldown'],
  rowing_machine: ['rowing erg', 'row erg', 'indoor rower'],
  stationary_bike: ['assault bike', 'air bike', 'peloton', 'recumbent bike', 'upright bike'],
  stair_climber: ['stepmill', 'step mill', 'stair machine'],
  elliptical: ['elliptical machine', 'elliptical trainer'],
  treadmill: ['treadmill machine'],
  cable_fly: ['cable fly machine', 'crossover machine'],
}
// Apply base aliases, then fold in the machine nicknames (deduped).
for (const [id, aliases] of Object.entries(ALIASES)) {
  if (EXERCISE_BY_ID[id]) EXERCISE_BY_ID[id].aliases = [...aliases]
}
for (const [id, extra] of Object.entries(MACHINE_ALIASES)) {
  const ex = EXERCISE_BY_ID[id]
  if (!ex) continue
  ex.aliases = [...new Set([...(ex.aliases || []), ...extra])]
}
// Fold in the enrichment pass (nicknames, acronyms, misspellings, condition
// terms) the same way — additive and deduped.
for (const [id, extra] of Object.entries(ENRICHED_ALIASES)) {
  const ex = EXERCISE_BY_ID[id]
  if (!ex) continue
  ex.aliases = [...new Set([...(ex.aliases || []), ...extra])]
}

// Why a search result matched: 'name' when the visible name contains the query,
// or the specific alias term when only a hidden nickname did. Returns null when
// there's no query or no match. Used to tag results so a non-obvious hit is
// explained (e.g. searching "erg" surfaces "Rowing Machine").
export function matchInfo(ex, query) {
  const q = (query || '').trim().toLowerCase()
  if (!q) return { match: true, via: null }
  if (ex.name.toLowerCase().includes(q)) return { match: true, via: 'name' }
  const alias = (ex.aliases || []).find((a) => a.includes(q))
  if (alias) return { match: true, via: 'alias', term: alias }
  if (fuzzyHit(ex, q)) return { match: true, via: 'fuzzy' }
  return { match: false, via: null }
}

// ---- Typo tolerance ----
// "bech pres", "deadlfit": a search that returns nothing for a slip of the
// thumb sends people to "create custom exercise" for a lift that exists.
// Every word typed must be close to SOME word in the exercise's name or
// aliases — one edit for short words, two for long ones — and at least one
// typed word has to be 4+ letters, so "ro" or "db" never go fuzzy.
function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      if (cur[j] < best) best = cur[j]
    }
    if (best > max) return max + 1
    prev = cur
  }
  return prev[b.length]
}
const wordCache = new WeakMap()
function wordsOf(ex) {
  let w = wordCache.get(ex)
  if (!w) {
    w = [...new Set((ex.name + ' ' + (ex.aliases || []).join(' ')).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean))]
    wordCache.set(ex, w)
  }
  return w
}
function fuzzyHit(ex, q) {
  const typed = q.split(/[^a-z0-9]+/).filter(Boolean)
  if (!typed.some((w) => w.length >= 4)) return false
  const hay = wordsOf(ex)
  return typed.every((w) => {
    if (w.length < 4) return hay.some((h) => h.startsWith(w))
    const tol = w.length >= 7 ? 2 : 1
    return hay.some((h) => (
      h.startsWith(w)
      || editDistance(h, w, tol) <= tol
      // still typing: "bech" against the start of "bench"
      || (h.length > w.length && editDistance(h.slice(0, w.length + 1), w, tol) <= tol)
    ))
  })
}

// Search match: exercise name OR any hidden alias contains the query.
export function matchesQuery(ex, query) {
  return matchInfo(ex, query).match
}

export { LADDERS }
