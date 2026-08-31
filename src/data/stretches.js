// Stretch library keyed by muscle id, with a DYNAMIC variant (movement prep,
// done before training) and a STATIC variant (a held stretch, done after). A
// session's routine is assembled from the muscles it works (see musclesFor):
// dynamic before to prime them, static after for range of motion.
//
// Evidence in brief: a dynamic warm-up before is preferred (long static holds
// right before lifting can briefly dip force/power); static stretching after is
// a good time to build flexibility on warm muscles.

export const STRETCHES = {
  neck: {
    dynamic: { name: 'Neck Rolls', cue: 'Slow half-circles ear-to-ear and gentle nods — never crank it. ~5 each way.' },
    static: { name: 'Upper-Trap Stretch', cue: 'Anchor one hand under your seat, tip your head to the opposite side. 20–30s/side.' },
  },
  traps: {
    dynamic: { name: 'Shoulder Rolls', cue: 'Roll the shoulders back in big slow circles, then forward. ~8 each way.' },
    static: { name: 'Upper-Trap Stretch', cue: 'Tip the head toward one shoulder, opposite hand anchored down. 20–30s/side.' },
  },
  shoulders: {
    dynamic: { name: 'Arm Circles', cue: 'Big circles forward then back, gradually larger. ~10 each way.' },
    static: { name: 'Cross-Body Shoulder Stretch', cue: 'Draw one arm across your chest with the other. 20–30s/side.' },
  },
  chest: {
    dynamic: { name: 'Arm Swings', cue: 'Swing both arms wide open then cross the chest, building range. ~12.' },
    static: { name: 'Doorway Pec Stretch', cue: 'Forearm on a doorframe, step gently through until the chest opens. 20–30s/side.' },
  },
  lats: {
    dynamic: { name: 'Overhead Reach + Side Bend', cue: 'Reach one arm overhead and lean away, alternating. ~8/side.' },
    static: { name: 'Lat Stretch', cue: 'Hold a rack or doorframe overhead and sit your hips back and away. 20–30s/side.' },
  },
  biceps: {
    dynamic: { name: 'Arm Swings + Wrist Rolls', cue: 'Loose forward/back arm swings while rolling the wrists. ~30s.' },
    static: { name: 'Wall Biceps Stretch', cue: 'Palm flat on a wall behind you, turn your body away. 20–30s/side.' },
  },
  triceps: {
    dynamic: { name: 'Overhead Reach-Backs', cue: 'Reach a hand down your back and gently pulse deeper. ~8/side.' },
    static: { name: 'Overhead Triceps Stretch', cue: 'Hand down your back, ease the elbow back with the other hand. 20–30s/side.' },
  },
  forearms: {
    dynamic: { name: 'Wrist Circles', cue: 'Circle the wrists both ways and open/close the fists. ~30s.' },
    static: { name: 'Wrist Flexor & Extensor Stretch', cue: 'Arm straight, gently draw the fingers back, then down. 20–30s each.' },
  },
  abs: {
    dynamic: { name: 'Trunk Rotations', cue: 'Feet planted, rotate the torso side to side, arms loose. ~12.' },
    static: { name: 'Cobra Stretch', cue: 'Lie face down, press up onto your hands, hips down, gentle back extension. 20–30s.' },
  },
  obliques: {
    dynamic: { name: 'Standing Side Bends', cue: 'Reach overhead and bend smoothly side to side. ~8/side.' },
    static: { name: 'Standing Side Stretch', cue: 'Reach one arm overhead and lean away, feel the side ribs open. 20–30s/side.' },
  },
  lower_back: {
    dynamic: { name: 'Cat-Cow', cue: 'On all fours, slowly round then arch the spine with your breath. ~8.' },
    static: { name: 'Knee-to-Chest / Child’s Pose', cue: 'Hug knees to chest on your back, or sit back into child’s pose. 20–40s.' },
  },
  glutes: {
    dynamic: { name: 'Walking Knee Hugs + Hip Circles', cue: 'Hug each knee up walking forward, then open/close the hips. ~6/side.' },
    static: { name: 'Figure-4 Glute Stretch', cue: 'Ankle over the opposite knee, sit the hips back. 20–30s/side.' },
  },
  quads: {
    dynamic: { name: 'Walking Lunges', cue: 'Step into controlled lunges, tall torso, knees soft. ~6/side.' },
    static: { name: 'Standing Quad Stretch', cue: 'Heel to glute, knees together, hips forward (hold a wall). 20–30s/side.' },
  },
  hamstrings: {
    dynamic: { name: 'Leg Swings (front-to-back)', cue: 'Hold support and swing one leg forward/back, growing the range. ~10/side.' },
    static: { name: 'Standing Hamstring Stretch', cue: 'Hinge over a soft-knee straight leg and reach. 20–30s/side.' },
  },
  calves: {
    dynamic: { name: 'Ankle Bounces', cue: 'Easy bounces on the balls of the feet, then heel-to-toe walks. ~30s.' },
    static: { name: 'Wall Calf Stretch', cue: 'Back leg straight, heel down, lean into a wall. 20–30s/side.' },
  },
  tibialis: {
    dynamic: { name: 'Ankle Circles', cue: 'Draw slow circles with each foot, both directions. ~10/side.' },
    static: { name: 'Kneeling Shin Stretch', cue: 'Kneel with toes pointed back, sit gently toward your heels. 20–30s.' },
  },
}

// Muscles that don't need their own stretch fold into a neighbour.
const ALIAS = { core: 'abs' }

// Order stretches head → toe for a consistent routine.
const ORDER = [
  'neck', 'traps', 'shoulders', 'chest', 'lats', 'biceps', 'triceps', 'forearms',
  'abs', 'obliques', 'lower_back', 'glutes', 'quads', 'hamstrings', 'calves', 'tibialis',
]

// Readable label for the muscle a stretch targets (shown on each routine row).
export const MUSCLE_LABEL = {
  chest: 'Chest', shoulders: 'Shoulders', triceps: 'Triceps', biceps: 'Biceps',
  forearms: 'Forearms', lats: 'Lats', traps: 'Traps', lower_back: 'Lower back',
  abs: 'Core', obliques: 'Obliques', glutes: 'Glutes', quads: 'Quads',
  hamstrings: 'Hamstrings', calves: 'Calves', tibialis: 'Shins', neck: 'Neck',
}

// An image-search link for a stretch, so users can see example photos on demand
// (bundling stretch photos would be a licensing minefield — this stays clean).
export const stretchPhotoUrl = (name) =>
  `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(name + ' exercise')}`

// muscleIds + phase ('dynamic' | 'static') → ordered, de-duplicated stretch list.
export function buildStretchRoutine(muscleIds = [], phase = 'static') {
  const wanted = new Set()
  for (const m of muscleIds) {
    const key = ALIAS[m] || m
    if (STRETCHES[key]) wanted.add(key)
  }
  return ORDER.filter((k) => wanted.has(k)).map((k) => ({
    muscle: k,
    label: MUSCLE_LABEL[k] || k,
    name: STRETCHES[k][phase].name,
    cue: STRETCHES[k][phase].cue,
    photo: stretchPhotoUrl(STRETCHES[k][phase].name),
  }))
}
