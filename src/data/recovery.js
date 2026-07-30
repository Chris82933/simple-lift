// Recovery & Strength program creator — pick a joint/area and get a short,
// physio-style strengthening routine for it. Grounded in published rehab
// guidance (sources listed per area), but deliberately conservative and general.
//
// IMPORTANT: this is general strengthening, not medical advice. If a physio gave
// someone specific exercises, they should do theirs. Every generated program
// carries the disclaimer on each day.
import { EXERCISE_BY_ID } from './exercises.js'

export const RECOVERY_DISCLAIMER =
  'General strengthening, not medical advice. If a physio gave you specific exercises, do theirs. Ease in, keep it pain-free, and stop anything that hurts.'

// Each area is a short routine: 4–5 low-load moves with rehab-appropriate
// volume. `low`/`high` are reps for rep moves, or a seconds range for holds
// (the app renders the right unit from the exercise).
export const RECOVERY_AREAS = [
  {
    id: 'ankles',
    label: 'Ankles',
    emoji: '🦶',
    blurb: 'Calf, shin and hip strength plus balance — the combination shown to steady a wobbly ankle.',
    why: 'Ankle rehab works best when it pairs strength with balance, and evidence increasingly favours adding hip/glute work for stability — not just isolated ankle drills.',
    exercises: [
      { id: 'single_leg_calf_raise', sets: 3, low: 10, high: 15 },
      { id: 'tibialis_raise', sets: 3, low: 12, high: 20 },
      { id: 'bosu_squat', sets: 3, low: 8, high: 12 },
      { id: 'clamshell', sets: 3, low: 12, high: 15 },
      { id: 'lateral_band_walk', sets: 2, low: 10, high: 12 },
    ],
    sources: [
      { label: 'UCSF Sports Medicine — ankle strengthening protocol', url: 'https://sportsrehab.ucsf.edu/sites/g/files/tkssra10961/files/Ankle%20Strengthening%20Protocol.pdf' },
      { label: 'Foot & ankle strengthening scoping review (NIH/PMC)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11967365/' },
      { label: 'Balance & strength training for chronic ankle instability (NIH/PMC)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6089027/' },
    ],
  },
  {
    id: 'hips_glutes',
    label: 'Hips & Glutes',
    shortLabel: 'Glutes',
    emoji: '🍑',
    blurb: 'Wake up and strengthen the glute medius and max — the engine for the hips, knees and ankles.',
    why: 'Progressive glute-medius and glute-max loading (bridges → single-leg → hinges) is the backbone of hip rehab and protects the joints below it.',
    exercises: [
      { id: 'clamshell', sets: 3, low: 12, high: 15 },
      { id: 'lateral_band_walk', sets: 3, low: 10, high: 12 },
      { id: 'single_leg_glute_bridge', sets: 3, low: 8, high: 12 },
      { id: 'single_leg_rdl', sets: 3, low: 8, high: 10 },
      { id: 'step_up', sets: 3, low: 8, high: 12 },
    ],
    sources: [
      { label: 'RunningPhysio — evidence-based glute-med rehab', url: 'https://www.running-physio.com/glutemed/' },
      { label: 'GHOst trial — targeted gluteal exercise (NIH/PMC)', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6149073/' },
      { label: 'Physiopedia — Gluteus Medius', url: 'https://www.physio-pedia.com/Gluteus_Medius' },
    ],
  },
  {
    id: 'knees',
    label: 'Knees',
    emoji: '🦵',
    blurb: 'Quad (VMO) and glute strength with controlled single-leg work — kinder on an irritable knee.',
    why: 'Early knee rehab favours quad activation (straight-leg raises, wall sits) and eccentric step-downs, plus hip strength to offload the joint.',
    exercises: [
      { id: 'straight_leg_raise', sets: 3, low: 10, high: 12 },
      { id: 'wall_sit', sets: 3, low: 20, high: 45 },
      { id: 'peterson_step_down', sets: 3, low: 8, high: 10 },
      { id: 'step_up', sets: 3, low: 8, high: 12 },
      { id: 'single_leg_glute_bridge', sets: 3, low: 8, high: 12 },
    ],
    sources: [
      { label: 'JOSPT — hip & knee exercise for patellofemoral pain (2018)', url: 'https://www.jospt.org/doi/10.2519/jospt.2018.0502' },
      { label: 'JOSPT — hip strengthening reduces PFP pain sooner (RCT, 2011)', url: 'https://www.jospt.org/doi/10.2519/jospt.2011.3499' },
      { label: 'Bend + Mend — VMO activation for early knee rehab', url: 'https://bendandmend.com.au/news/physiotherapy/the-seven-best-exercises-for-vmo-activation-early-knee-rehab/' },
    ],
  },
  {
    id: 'shoulders',
    label: 'Shoulders',
    emoji: '💪',
    blurb: 'Rotator-cuff and scapular strength — low, controlled loads for a happier shoulder.',
    why: 'Rotator-cuff loading (external rotation) plus scapular control (pull-aparts, wall slides) is the mainstay of conservative shoulder rehab.',
    exercises: [
      { id: 'band_external_rotation', sets: 3, low: 12, high: 15 },
      { id: 'band_pull_apart', sets: 3, low: 12, high: 20 },
      { id: 'band_row', sets: 3, low: 10, high: 15 },
      { id: 'scap_wall_slide', sets: 3, low: 8, high: 12 },
    ],
    sources: [
      { label: 'E3 Rehab — rotator cuff exercises', url: 'https://e3rehab.com/rotator-cuff-exercises/' },
      { label: 'E3 Rehab — rotator cuff tear rehab', url: 'https://e3rehab.com/rotator-cuff-tear-rehab/' },
      { label: 'HighBar Health (PT) — rotator cuff strengthening guide', url: 'https://www.highbarhealth.com/best-exercises-for-rotator-cuff-strengthening/' },
    ],
  },
  {
    id: 'lower_back',
    label: 'Lower back',
    emoji: '🧍',
    blurb: 'The McGill “big 3” plus glutes — endurance and control for a resilient spine.',
    why: 'For a grumbly low back, spinal endurance and control (bird dog, side plank, dead bug) beats heavy or end-range work; strong glutes take load off the spine.',
    exercises: [
      { id: 'bird_dog', sets: 3, low: 8, high: 10 },
      { id: 'side_plank', sets: 3, low: 20, high: 30 },
      { id: 'dead_bug', sets: 3, low: 8, high: 10 },
      { id: 'glute_bridge', sets: 3, low: 12, high: 15 },
    ],
    sources: [
      { label: 'Stuart McGill — the “Big 3” for low-back health', url: 'https://www.backfitpro.com/' },
      { label: 'JOSPT — quality of reviews on spinal stabilization for chronic LBP', url: 'https://www.jospt.org/doi/10.2519/jospt.2013.4346' },
      { label: 'Stabilisation exercises for low back pain — systematic review & meta-analysis', url: 'https://link.springer.com/article/10.1186/1471-2474-15-416' },
    ],
  },

  {
    id: 'shin_splints',
    label: 'Shin splints',
    emoji: '🦵',
    blurb: 'Calf and foot strength plus balance to settle medial tibial stress — and a strictly pain-free return to impact.',
    why: 'Shin-splint (MTSS) rehab centres on calf strength and endurance, foot-intrinsic strength to cut pronation stress, and balance — kept strictly pain-free, easing back to impact gradually.',
    exercises: [
      { id: 'single_leg_calf_raise', sets: 3, low: 12, high: 15 },
      { id: 'tibialis_raise', sets: 3, low: 15, high: 20 },
      { id: 'foot_intrinsics', sets: 3, low: 10, high: 15 },
      { id: 'bosu_squat', sets: 3, low: 8, high: 12 },
      { id: 'clamshell', sets: 3, low: 12, high: 15 },
    ],
    sources: [
      { label: 'StatPearls / NCBI — Medial Tibial Stress Syndrome', url: 'https://www.ncbi.nlm.nih.gov/books/NBK538479/' },
      { label: 'APTA ChoosePT — physical therapy guide to shin splints', url: 'https://www.choosept.com/guide/physical-therapy-guide-shin-splints-medial-tibial-stress-syndrome-' },
      { label: 'RunningPhysio — exercises for MTSS', url: 'https://www.running-physio.com/exercises-for-medial-tibial-stress-syndrome-aka-shin-splints/' },
    ],
  },

  {
    id: 'neck',
    label: 'Neck',
    emoji: '🧣',
    blurb: 'Deep-neck-flexor and scapular strengthening for stiff, achy “tech neck”.',
    why: 'For non-specific neck pain, deep-neck-flexor activation (chin tucks) and gentle neck isometrics, paired with scapular/postural strengthening, cut pain and forward-head posture better than any single move.',
    exercises: [
      { id: 'chin_tuck', sets: 3, low: 8, high: 10 },
      { id: 'neck_isometric', sets: 3, low: 5, high: 10 },
      { id: 'band_pull_apart', sets: 3, low: 12, high: 20 },
      { id: 'scap_wall_slide', sets: 3, low: 8, high: 12 },
    ],
    sources: [
      { label: 'Isometric chin tuck ± scapular correction (Int. J. Therapy & Rehab)', url: 'https://www.magonlinelibrary.com/doi/abs/10.12968/ijtr.2021.0184' },
      { label: 'Scapular + cervical isometric exercises RCT (NIH/PMC)', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11671652/' },
      { label: 'Neck stabilization exercise for chronic neck pain (NIH/PMC)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11869567/' },
    ],
  },

  {
    id: 'carpal_tunnel',
    label: 'Carpal tunnel',
    emoji: '✋',
    blurb: 'Gentle nerve and tendon gliding plus forearm work — done softly, never forcing a grip.',
    why: 'Conservative carpal-tunnel care combines nerve and tendon gliding, forearm stretches, and light wrist strengthening — done gently and avoiding a forceful grip, which itself compresses the median nerve.',
    exercises: [
      { id: 'median_nerve_glide', sets: 3, low: 8, high: 10 },
      { id: 'tendon_glide', sets: 3, low: 5, high: 5 },
      { id: 'wrist_flexor_stretch', sets: 3, low: 20, high: 30 },
      { id: 'reverse_wrist_curl', sets: 3, low: 12, high: 15 },
    ],
    sources: [
      { label: 'Tendon & nerve gliding for CTS — systematic review of RCTs (PubMed)', url: 'https://pubmed.ncbi.nlm.nih.gov/26357452/' },
      { label: 'Nerve gliding exercises for CTS — systematic review (PubMed)', url: 'https://pubmed.ncbi.nlm.nih.gov/27842937/' },
      { label: 'Neurodynamic techniques for mild-moderate CTS — SR & meta-analysis (NIH/PMC)', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10419623/' },
    ],
  },
]

export const RECOVERY_BY_ID = Object.fromEntries(RECOVERY_AREAS.map((a) => [a.id, a]))

// A sensible weekly spread by session count (rehab is usually fine 3×/week or
// even daily — the day note says so).
const TRAINING_DAYS = { 1: [2, 4], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5] }

// Build a full program-exercise entry from the library + the routine's volume.
function entryFor(item) {
  const b = EXERCISE_BY_ID[item.id]
  if (!b) throw new Error(`recovery routine references unknown exercise: ${item.id}`)
  return {
    id: b.id, name: b.name, pattern: b.pattern, regions: b.regions,
    compound: b.compound, load: b.load !== false, cues: b.cues,
    ladderId: b.ladderId || null, nextId: b.nextId || null, prevId: b.prevId || null,
    hold: b.hold || undefined, distance: b.distance || undefined, unit: b.unit || undefined,
    sets: item.sets, repLow: item.low, repHigh: item.high,
    restSec: b.compound ? 90 : 60, startWeight: '',
  }
}

// Turn selected areas into a program (one short session per area). Returns a
// fresh object with NO id — the caller's addProgram assigns one.
export function buildRecoveryProgram(areaIds = []) {
  const areas = RECOVERY_AREAS.filter((a) => areaIds.includes(a.id))
  if (!areas.length) return null

  const days = areas.map((area) => ({
    title: `Recovery · ${area.label}`,
    dayLabel: `Recovery · ${area.label}`,
    note: RECOVERY_DISCLAIMER,
    regions: [...new Set(area.exercises.flatMap((e) => EXERCISE_BY_ID[e.id]?.regions || []))],
    exercises: area.exercises.map(entryFor),
  }))

  // Natural list: "Ankles", "Ankles & Knees", "Ankles, Knees & Shoulders".
  const labels = areas.map((a) => a.shortLabel || a.label)
  const name = labels.length <= 1
    ? labels.join('')
    : `${labels.slice(0, -1).join(', ')} & ${labels[labels.length - 1]}`

  return {
    name: `Recovery — ${name}`,
    source: 'custom', // fully editable in the builder afterwards
    recovery: { areas: areas.map((a) => a.id) },
    goals: ['general'],
    deloadWeeks: 0,
    schedule: { mode: 'rotation', trainingDays: TRAINING_DAYS[days.length] || [1, 3, 5] },
    createdAt: new Date().toISOString(),
    days,
  }
}
