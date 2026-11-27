// The YouTube search behind each "Form" button.
//
// Rules, in order:
//   1. A hand-tuned search when the app's name isn't what people search for
//      (our own wording, brackets, an equipment note) — QUERY by exercise id,
//      SKILL_QUERY by skill-step name.
//   2. Stretches (static mobility holds): "X stretch".
//   3. Timed holds (isometrics, skill holds): "X hold".
//   4. Everything else: "X form".
// "pose" is used, by hand, only where the yoga name is what people search.
import { EXERCISE_BY_ID, EXERCISES, isHold } from '../data/exercises.js'
import { MOVES } from '../data/mobility.js'

const QUERY = {
  // Lifts whose names need help
  hack_squat: 'machine hack squat form',
  db_rdl: 'dumbbell rdl form',
  band_row: 'resistance band row form',
  superman: 'superman exercise form',
  band_pulldown: 'resistance band lat pulldown form',
  db_skullcrusher: 'dumbbell skull crusher form',
  band_curl: 'resistance band bicep curl form',
  band_overhead_ext: 'resistance band overhead tricep extension form',
  band_pushdown: 'resistance band tricep pushdown form',
  lateral_raise: 'dumbbell lateral raise form',
  band_lateral: 'resistance band lateral raise form',
  bw_calf_raise: 'bodyweight calf raise form',
  ab_wheel: 'ab wheel rollout form',
  standing_calf_raise: 'standing calf raise machine form',
  calf_press: 'calf press on leg press form',
  db_overhead_ext: 'dumbbell overhead tricep extension form',
  kb_goblet_curl: 'kettlebell curl form',
  lat_stretch_db_pullover: 'dumbbell pullover form',
  lat_prayer: 'straight arm pulldown form',
  hip_abduction: 'hip abduction machine form',
  hip_adduction: 'hip adduction machine form',
  max_hangs: 'hangboard max hangs form',
  repeaters: 'hangboard repeaters form',
  no_hang_pulls: 'no hang finger pulls hold',
  finger_ext_band: 'rubber band finger extensions form',
  pronation_supination: 'forearm pronation supination exercise form',
  jump_chinup_drop: 'jumping chin up drop landing form',
  side_plank_leg_lift: 'side plank leg lift form',
  freestanding_hspu: 'freestanding handstand push up form',
  wall_hspu_negative: 'wall handstand push up negative form',
  ring_rto_dip: 'rto ring dip form',
  ring_rto_pushup: 'rto ring push up form',
  iso_mid_thigh_pull: 'isometric mid thigh pull form',
  scap_pull: 'scapular pull up form',
  // Names that also mean something else on YouTube
  good_morning: 'good morning exercise form',
  bird_dog: 'bird dog exercise form',
  dead_bug: 'dead bug exercise form',
  clamshell: 'clamshell exercise form',
  dip: 'parallel bar dip form',
  // Bone-density and balance work: named for what it is
  heel_drop: 'heel drop exercise bone density',
  stomp: 'stomping exercise bone density',
  pogo_jump: 'pogo jumps form',
  marching: 'marching in place exercise form',
  single_leg_stance: 'single leg balance hold',
  tandem_walk: 'tandem walk balance exercise',
  single_leg_reach: 'single leg balance reach form',
  foot_intrinsics: 'foot intrinsic strengthening exercises',
  median_nerve_glide: 'median nerve glide exercise',
  tendon_glide: 'tendon gliding exercises',
  // Cardio: technique searches people actually use
  treadmill: 'treadmill running form',
  stationary_bike: 'stationary bike setup and form',
  zone2_cardio: 'zone 2 cardio explained',
  run_10k: 'running form',
  cardio_machine: null, // no one machine to show
  // Carries are walked, not held
  farmer_carry: "farmer's carry form",
  zercher_carry: 'zercher carry form',
  kb_racked_carry: 'kettlebell front rack carry form',
  kb_suitcase_carry: 'suitcase carry form',
  // Holds known by another name
  copenhagen_hold: 'copenhagen plank hold',
  dead_hang: 'dead hang hold',
  wall_sit: 'wall sit hold',
  plank: 'plank hold',
  foot_l_sit: 'foot supported l sit hold',
  long_lever_plank: 'long lever plank hold',
  hip_90_90_liftoff: '90 90 hip lift off hold',
  active_high_step_hold: 'standing high knee hold',
  // Mobility moves: what people call them
  elephant_walk: 'elephant walk stretch',
  frog_stretch_rock: 'rocking frog stretch',
  wall_frog: 'wall frog stretch',
  seated_pike_pulse: 'seated pike stretch',
  cat_cow_segmental: 'cat cow pose',
  open_book: 'open book stretch',
  bench_t_spine_extension: 'bench thoracic extension stretch',
  loaded_wrist_extension_rock: 'quadruped wrist rocks stretch',
  hip_90_90_switch: '90 90 hip switches form',
  loaded_ankle_rocker: 'weighted knee over toe ankle rocker form',
  active_frog_lift: 'active frog knee lift offs form',
  high_step_leg_raise: 'standing hip flexor leg raise form',
  pike_compression_lift: 'pike compression lifts form',
  straddle_compression_lift: 'straddle compression lifts form',
  scap_wall_slide: 'scapular wall slides form',
  deep_squat_hold: 'deep squat hold',
  // Disambiguated after review: names that pull up the wrong video
  overhead_hold: 'barbell overhead lockout hold',
  v_sit: 'v sit calisthenics hold',
  skin_the_cat: 'skin the cat gymnastics rings form',
  neck_isometric: 'neck isometric hold',
  jefferson_deadlift: 'jefferson straddle deadlift form',
  lock_off: 'pull up lock off hold',
  l_sit_lock_off: 'l sit pull up hold',
  single_leg_drop_forward_jump: 'single leg drop landing forward hop form',
  eccentric_heel_drop: 'eccentric heel drops achilles form',
  frenchie_pullup: 'frenchie pull up climbing form',
  reverse_nordic: 'reverse nordic curl form',
  patrick_step: 'patrick step knees over toes form',
  walking_incline: 'incline treadmill walking form',
  air_bike: 'assault bike form',
  pushup_hold: 'isometric push up hold',
  calf_raise_hold: 'isometric calf raise hold',
  lunge_calf_raise: 'reverse lunge to calf raise form',
}

// Skill steps (Skills page) are named for the ladder, not as exercises.
const SKILL_QUERY = {
  'full pull-up': 'pull up form',
  'advanced tuck': 'advanced tuck front lever hold',
  'full front lever': 'front lever hold',
  'v-sit': 'v sit calisthenics hold',
  'full push-up': 'push up form',
  'pseudo-planche push-up': 'pseudo planche push up form',
  'archer push-up': 'archer push up form',
  'frog stand': 'frog stand hold',
  'planche lean': 'planche lean hold',
  'tuck planche': 'tuck planche hold',
  'advanced tuck planche': 'advanced tuck planche hold',
  'straddle planche': 'straddle planche hold',
  'full l-sit': 'l sit hold',
  'tuck hollow hold': 'tuck hollow body hold',
  'one-leg hollow': 'single leg hollow body hold',
  'hollow hold': 'hollow body hold',
  'arms-overhead hollow': 'arms overhead hollow body hold',
  'box pistol': 'box pistol squat form',
  'assisted pistol': 'assisted pistol squat form',
  'full pistol squat': 'pistol squat form',
  'weighted pistol': 'weighted pistol squat form',
  'wall pike hold': 'wall pike hold',
  'chest-to-wall handstand': 'chest to wall handstand hold',
  'wall handstand': 'wall handstand hold',
  'freestanding kick-up': 'handstand kick up form',
  'freestanding handstand': 'freestanding handstand hold',
}

const BY_NAME = Object.fromEntries(EXERCISES.map((e) => [e.name.toLowerCase(), e]))

// "Hack Squat (Machine)" -> "hack squat"; "Lunge + Calf Raise" -> "lunge calf raise".
const clean = (name) => name.replace(/\s*\([^)]*\)/g, '').replace(/\s\+\s/g, ' ').replace(/\//g, ' ').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase()

const own = (o, k) => typeof k === 'string' && Object.hasOwn(o, k)

// The search for an exercise (or anything with a name). null = no button.
// Pass the whole exercise when you have it: a custom timed exercise is only
// known to be a hold from its own fields. `hold: true` marks a hold skill.
export function formSearchQuery(arg) {
  const { id, name, hold } = arg || {}
  if (own(QUERY, id)) return QUERY[id]
  const key = (name || '').trim().toLowerCase()
  if (!id && own(SKILL_QUERY, key)) return SKILL_QUERY[key]
  const ex = (own(EXERCISE_BY_ID, id) && EXERCISE_BY_ID[id]) || (own(BY_NAME, key) && BY_NAME[key]) || null
  if (ex && ex.id !== id && own(QUERY, ex.id)) return QUERY[ex.id]
  const n = clean(ex?.name || name || '')
  if (!n) return null
  if (/\b(stretch|holds?|pose)$/.test(n)) return n
  const mob = ex && MOVES[ex.id]
  if (mob?.kind === 'hold' && !mob.active) return `${n} stretch`
  const timed = (e) => e && isHold(e) && e.pattern !== 'conditioning'
  if (hold || mob?.kind === 'hold' || timed(ex) || (!ex && arg?.unit === 'sec' && arg?.hold)) return `${n} hold`
  return `${n} form`
}

export const formSearchUrl = (ex) => {
  const q = formSearchQuery(ex)
  return q ? `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` : null
}
