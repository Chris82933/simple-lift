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
    improves: ['Single-leg balance on uneven ground', 'Confidence on stairs, trails and slopes', 'Calf and shin strength for push-off', 'Resistance to rolling it again'],
    conditions: 'The kind of routine typically used for repeated ankle sprains and a “gives way” feeling (clinically, chronic ankle instability), and for rebuilding after a sprain once swelling has settled.',
    notFor: [
      'A fresh injury where you cannot take four steps, or bony tenderness right on the ankle knobs, the top of the foot or the outer midfoot — that needs an X-ray first, not exercise.',
      'A pop felt at the time of injury with immediate heavy swelling.',
      'Pain high between the shin bones after a twisting or rolling-out injury — a different, slower-healing sprain that needs assessing.',
      'Numbness or pins and needles in the foot.',
    ],
    timeline: 'Balance often feels steadier within 2–3 weeks, but the strength and stability that actually cut re-sprain risk take 6–8 weeks of consistent work.',
    progression: 'Make balance harder before making it heavier — eyes open to eyes closed, firm floor to cushion — then add reps and load to the calf and shin work. A mild muscle ache that settles by the next morning is fine; sharp or lingering ankle pain means back off.',
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
      { label: 'Balance & strength training for chronic ankle instability (NIH/PMC)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6089027/' },
      { label: 'Physiopedia — Ottawa Ankle Rules (when a fresh injury needs an X-ray)', url: 'https://www.physio-pedia.com/Ottawa_Ankle_Rules' },
    ],
  },
  {
    id: 'hips_glutes',
    label: 'Hips & Glutes',
    shortLabel: 'Glutes',
    emoji: '🦵',
    improves: ['Single-leg stability for stairs and hills', 'Less ache lying on that side', 'Hip control that protects the knee below it', 'Hinge strength for lifting and carrying'],
    conditions: 'The kind of routine typically used for lateral hip pain (clinically, gluteal tendinopathy or greater trochanteric pain syndrome — often called “hip bursitis”), for glute weakness feeding knee or back trouble, and as an adjunct for mild hip arthritis.',
    notFor: [
      'Hip pain after a fall, with a limp or an inability to put weight through it — possible fracture, get seen urgently.',
      'Groin pain that clicks, catches or locks, or a known history of hip dysplasia.',
      'Constant night pain that does not change with position.',
      'Hip pain with a fever — treat as urgent.',
    ],
    timeline: 'Night and side-lying pain often eases within 2–4 weeks; the strength that makes it last takes 8–12 weeks of steady loading.',
    progression: 'Start with the lower-load moves if lying on that side hurts, then add the single-leg work over 2–3 weeks and load it. Tendon work tolerates a mild ache during and after — a few out of ten — provided it settles by the next morning. Avoid crossing the leg past the midline or deep hip stretches early on; those compress the sore tendon.',
    why: 'Progressive glute-medius and glute-max loading (bridges → single-leg → hinges) is the backbone of hip rehab and protects the joints below it.',
    exercises: [
      { id: 'clamshell', sets: 3, low: 12, high: 15 },
      { id: 'lateral_band_walk', sets: 3, low: 10, high: 12 },
      { id: 'single_leg_glute_bridge', sets: 3, low: 8, high: 12 },
      { id: 'single_leg_rdl', sets: 3, low: 8, high: 10 },
      { id: 'step_up', sets: 3, low: 8, high: 12 },
    ],
    sources: [
      { label: 'GHOst trial — targeted gluteal exercise (NIH/PMC)', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6149073/' },
      { label: 'Impairment-based classification & phased loading for GTPS (NIH/PMC)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8975585/' },
      { label: 'Physiopedia — Gluteus Medius', url: 'https://www.physio-pedia.com/Gluteus_Medius' },
    ],
  },
  {
    id: 'knees',
    label: 'Knees',
    emoji: '🦵',
    improves: ['Comfort going down stairs', 'Less ache after long sitting', 'Quad strength and control for squatting', 'Tolerance for hills and running'],
    conditions: 'The kind of routine typically used for pain around or behind the kneecap (clinically, patellofemoral pain — “runner’s knee”), and as an adjunct for mild patellar tendon pain (“jumper’s knee”).',
    notFor: [
      'A knee that truly locks or cannot be straightened, or that buckles and gives way — possible meniscus or ligament injury.',
      'Swelling that came on quickly after an injury.',
      'A pop or tear felt at the moment of injury.',
      'A hot, red or feverish knee — treat as urgent.',
      'Pain that is constant and unrelated to what you do.',
    ],
    timeline: 'Expect 6–8 weeks of consistent hip-and-quad work before stairs and running feel clearly better. Early sessions can feel mildly sore as things adapt.',
    progression: 'Build from the holds and non-weight-bearing work toward loaded single-leg work over 3–4 weeks. Add reps before depth, and depth before speed. The evidence for kneecap pain favours generous rep volumes a few times a week, so work the rep ranges up rather than reaching for load early. Keep pain during and after to a mild ache that has settled by the next morning.',
    why: 'Early knee rehab favours quad activation (straight-leg raises, wall sits) and eccentric step-downs, plus hip strength to offload the joint. Higher-volume programmes tend to outperform low-rep work for kneecap pain.',
    exercises: [
      { id: 'straight_leg_raise', sets: 3, low: 10, high: 15 },
      { id: 'wall_sit', sets: 3, low: 20, high: 45 },
      { id: 'peterson_step_down', sets: 3, low: 8, high: 10 },
      { id: 'step_up', sets: 3, low: 8, high: 15 },
      { id: 'single_leg_glute_bridge', sets: 3, low: 8, high: 12 },
    ],
    sources: [
      { label: 'JOSPT 2019 — Patellofemoral Pain clinical practice guideline', url: 'https://www.jospt.org/doi/10.2519/jospt.2019.0302' },
      { label: 'AAFP summary of the patellofemoral pain guideline (dosage)', url: 'https://www.aafp.org/pubs/afp/issues/2020/1001/p442.html' },
      { label: 'JOSPT — hip strengthening RCT for patellofemoral pain', url: 'https://www.jospt.org/doi/10.2519/jospt.2011.3499' },
    ],
  },
  {
    id: 'shoulders',
    label: 'Shoulders',
    emoji: '💪',
    improves: ['Reaching overhead without pinching', 'Carrying and lifting comfort', 'Shoulder-blade control under load', 'Cuff endurance for repeated reaching'],
    conditions: 'The kind of routine typically used for rotator-cuff related shoulder pain (sometimes called subacromial pain or “impingement”), mild cuff tendinopathy, and shoulder-blade weakness that keeps the shoulder aching.',
    notFor: [
      'Sudden inability to lift the arm after a fall or a wrench — especially over 40, this needs assessing for a cuff tear.',
      'A shoulder that dislocates, subluxes or feels unstable.',
      'Progressive loss of all movement, including when someone else moves the arm — needs guided management.',
      'Numbness or weakness down the arm.',
      'A hot, swollen joint or a fever — treat as urgent.',
    ],
    timeline: 'Cuff-related shoulder pain is slow: judge it over 6–12 weeks of consistent loading, not by week two.',
    progression: 'Work in a pain-free range and step the band tension up roughly weekly as the current level gets easy. No need to rush to heavy — the evidence does not show heavy loading clearly beating lighter loading here, so consistency across weeks matters more than the load on any one day.',
    why: 'Rotator-cuff loading (external rotation) plus scapular control (pull-aparts, wall slides) is the mainstay of conservative shoulder rehab.',
    exercises: [
      { id: 'band_external_rotation', sets: 3, low: 12, high: 15 },
      { id: 'band_pull_apart', sets: 3, low: 15, high: 20 },
      { id: 'band_row', sets: 3, low: 10, high: 15 },
      { id: 'scap_wall_slide', sets: 3, low: 8, high: 12 },
    ],
    sources: [
      { label: 'E3 Rehab — rotator cuff exercises', url: 'https://e3rehab.com/rotator-cuff-exercises/' },
      { label: 'Seven exercise types for rotator-cuff related shoulder pain — network meta-analysis (NIH/PMC)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12715924/' },
      { label: 'HighBar Health (PT) — rotator cuff strengthening guide', url: 'https://www.highbarhealth.com/best-exercises-for-rotator-cuff-strengthening/' },
    ],
  },
  {
    id: 'lower_back',
    label: 'Lower back',
    emoji: '🧍',
    improves: ['Tolerance for sitting and standing', 'Core endurance for lifting and daily tasks', 'How often it flares up', 'Confidence moving without guarding'],
    conditions: 'The kind of routine typically used for ordinary mechanical low back pain (clinically, non-specific low back pain) and for recurring “tweaks” from bending or lifting.',
    notForLead: 'Get emergency care the same day for any of the first four — together they can signal pressure on the nerve bundle at the base of the spine, which is time-critical:',
    notFor: [
      'Numbness in the saddle area — inner thighs, groin, genitals or around the anus.',
      'New trouble controlling your bladder or bowels, or not feeling yourself pass urine.',
      'New numbness or difficulty with sexual function.',
      'Weakness in both legs, or weakness that is spreading.',
      'Back pain with unexplained weight loss or fever, or a history of cancer.',
      'Pain that began after significant trauma, or pain that is constant, worsening and unrelieved by any position.',
    ],
    timeline: 'Ordinary low back pain usually eases over 4–6 weeks of consistent core-endurance work, and the course is bumpy rather than a straight line — the odd flare is normal.',
    progression: 'Build hold time and control before adding any load, and keep every move pain-free rather than stretching into the ache. If a flare hits, drop back to the easier holds for a few days instead of stopping altogether.',
    why: 'For a grumbly low back, spinal endurance and control (bird dog, side plank, dead bug) beats heavy or end-range work; strong glutes take load off the spine. It is one good approach rather than the only one — general exercise works comparably well.',
    exercises: [
      { id: 'bird_dog', sets: 3, low: 8, high: 10 },
      { id: 'side_plank', sets: 3, low: 20, high: 30 },
      { id: 'dead_bug', sets: 3, low: 8, high: 10 },
      { id: 'glute_bridge', sets: 3, low: 12, high: 15 },
    ],
    sources: [
      { label: 'NICE NG59 — low back pain and sciatica: assessment and management', url: 'https://www.nice.org.uk/guidance/ng59' },
      { label: 'Stabilisation exercises for low back pain — systematic review & meta-analysis', url: 'https://link.springer.com/article/10.1186/1471-2474-15-416' },
      { label: 'JOSPT — quality of reviews on spinal stabilization for chronic LBP', url: 'https://www.jospt.org/doi/10.2519/jospt.2013.4346' },
    ],
  },

  {
    id: 'shin_splints',
    label: 'Shin splints',
    emoji: '🦴',
    improves: ['Calf and shin endurance for repeated impact', 'Longer runs before the familiar ache starts', 'Foot-arch control', 'A staged, less risky return to running'],
    conditions: 'The kind of routine typically used for diffuse ache along the inner shin brought on by training load (clinically, medial tibial stress syndrome) in runners, dancers and recruits.',
    notForLead: 'Stop and get assessed before loading it further — a stress fracture needs imaging, not strengthening:',
    notFor: [
      'Pain focused on one small spot you could cover with a fingertip, rather than spread along the shin.',
      'Pain at rest, or pain that wakes you at night.',
      'Pain that does not settle with reduced load, or worsens day to day despite rest.',
      'Visible swelling over the bone, or pain on hopping on that leg.',
    ],
    timeline: 'Slow: usually 3–6 weeks of pain-free strength work before staging impact back in. Returning to full mileage too early is the most common reason it comes back.',
    progression: 'Unlike the tendon areas here, keep this work strictly pain-free rather than working to a tolerable ache. Build calf endurance with higher reps over the weeks. Only add running once daily life and this routine are pain-free, then raise weekly volume in small steps and back off at the first hint of the familiar ache.',
    why: 'Shin-splint (MTSS) rehab centres on calf strength and endurance, foot-intrinsic strength to cut pronation stress, and balance — kept strictly pain-free, easing back to impact gradually. Tired calves shift load onto the shin bone, so endurance matters as much as peak strength.',
    exercises: [
      { id: 'single_leg_calf_raise', sets: 3, low: 15, high: 20 },
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
    improves: ['How long you can hold your head up before it aches', 'Range turning and tilting the head', 'Frequency of tension-type headaches', 'Neck endurance for desk work and driving'],
    conditions: 'The kind of routine typically used for ordinary mechanical neck pain, headaches coming from the neck (clinically, cervicogenic headache), and forward-head postural strain.',
    notFor: [
      'Neck pain after significant trauma — a fall, a collision, or a forceful whiplash.',
      'Numbness, tingling or weakness spreading into an arm or hand.',
      'Clumsy hands, unsteady walking or heaviness in the legs — get this assessed promptly.',
      'Dizziness, visual changes or blackouts when you turn or tip your head back.',
      'A sudden, severe or “worst ever” headache, or headache with fever, neck stiffness or confusion — emergency care now.',
      'Unexplained weight loss or new lumps in the neck.',
    ],
    timeline: 'Deep-neck-flexor and shoulder-blade work typically takes 6–8 weeks of near-daily practice to cut headache frequency and neck ache meaningfully.',
    progression: 'Own the small, controlled nod before adding hold time or resistance — quality beats effort here. Build the isometric holds gradually toward 10 seconds. This is deliberately low-load; sharp pain or dizziness means stop, not push.',
    why: 'For non-specific neck pain, deep-neck-flexor activation (chin tucks) and gentle neck isometrics, paired with scapular/postural strengthening, cut pain and forward-head posture better than any single move.',
    exercises: [
      { id: 'chin_tuck', sets: 3, low: 8, high: 10 },
      { id: 'neck_isometric', sets: 3, low: 5, high: 10 },
      { id: 'band_pull_apart', sets: 3, low: 12, high: 20 },
      { id: 'scap_wall_slide', sets: 3, low: 8, high: 12 },
    ],
    sources: [
      { label: 'Physiopedia — deep neck flexor stabilisation protocol', url: 'https://www.physio-pedia.com/Deep_Neck_Flexor_Stabilisation_Protocol' },
      { label: 'Scapular + cervical isometric exercises RCT (NIH/PMC)', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11671652/' },
      { label: 'Neck stabilization exercise for chronic neck pain (NIH/PMC)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11869567/' },
    ],
  },
  {
    id: 'carpal_tunnel',
    label: 'Carpal tunnel',
    emoji: '🖐️',
    improves: ['How often tingling interrupts typing or driving', 'Grip comfort without forcing it', 'Wrist and forearm strength that does not provoke symptoms', 'Waking less with numb hands'],
    conditions: 'The kind of routine typically used alongside a night splint and workstation changes for mild-to-moderate median nerve irritation at the wrist (carpal tunnel syndrome), and for forearm overuse ache from repetitive hand work.',
    notForLead: 'These suggest nerve compression beyond what home exercise addresses, and the window for full recovery can close — see a clinician rather than persisting:',
    notFor: [
      'Numbness in the thumb, index or middle finger that is constant rather than coming and going.',
      'Visible wasting or flattening of the muscle pad at the base of the thumb.',
      'Persistent weakness — dropping things, or struggling with buttons and keys.',
      'Symptoms that have not budged after several weeks of splinting and easing off.',
    ],
    timeline: 'Judge this over 4–8 weeks. Nerve symptoms improve less predictably than muscle or joint symptoms, so watch the trend across weeks rather than day to day.',
    progression: 'The mild-ache rule used elsewhere in this app does not apply here: gliding work should never provoke numbness or tingling at all. If a position brings symptoms on, shorten the range rather than pushing through. Add the wrist strengthening only once gliding is comfortable, and never chase a hard grip — gripping itself squeezes the nerve.',
    why: 'Conservative carpal-tunnel care combines nerve and tendon gliding, forearm stretches, and light wrist strengthening — done gently, avoiding a forceful grip. The evidence for gliding on its own is very low-certainty and inconclusive: treat it as a low-risk addition to splinting and ergonomics, not a treatment in its own right.',
    exercises: [
      { id: 'median_nerve_glide', sets: 3, low: 8, high: 10 },
      { id: 'tendon_glide', sets: 3, low: 5, high: 5 },
      { id: 'wrist_flexor_stretch', sets: 3, low: 20, high: 30 },
      { id: 'reverse_wrist_curl', sets: 3, low: 12, high: 15 },
    ],
    sources: [
      { label: 'Cochrane — exercise and mobilisation for carpal tunnel syndrome (very low-certainty evidence)', url: 'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD009899/full' },
      { label: 'Tendon & nerve gliding for CTS — systematic review of RCTs (PubMed)', url: 'https://pubmed.ncbi.nlm.nih.gov/26357452/' },
      { label: 'Neurodynamic techniques for mild-moderate CTS — SR & meta-analysis (NIH/PMC)', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10419623/' },
    ],
  },
  {
    id: 'tennis_elbow',
    label: 'Tennis elbow',
    emoji: '🎾',
    improves: ['Grip strength without the stab on the outer elbow', 'Shaking hands, lifting a kettle or a mug', 'Typing and mouse-work comfort', 'Tolerance for racquet sports or manual work'],
    conditions: 'The kind of routine typically used for pain on the outer elbow from gripping and wrist use (clinically, lateral epicondylalgia or lateral elbow tendinopathy) — tennis is only one of many causes.',
    notFor: [
      'Numbness or tingling into the forearm or hand — that points at a nerve rather than the tendon.',
      'Pain and weakness that began with a sudden wrench or tearing sensation.',
      'A swollen, red or warm elbow — possible infection or gout, not tendinopathy.',
      'No change at all after three months of consistent loading — worth having the diagnosis revisited.',
    ],
    timeline: 'Slow and worth the patience: 6–12 weeks for clear, sustained change, and sometimes several months for full recovery. The original eccentric protocol was only reassessed at six weeks.',
    progression: 'Start with the isometric holds while it is irritable — they calm the pain. Move to the slow lowering work as the holds get easy, then add the concentric strengthening. A mild ache during loading is expected with tendon work, provided it has settled by the next morning; sharp pain or a next-day flare means the load was too much.',
    why: 'For lateral epicondylalgia (tennis elbow) the strongest evidence is for loading the wrist extensors: pain-relieving isometric holds early, then slow eccentric wrist extension (the “Tyler Twist”), progressing to concentric strengthening, finished with a gentle extensor stretch — all kept to a mild, tolerable ache.',
    exercises: [
      { id: 'iso_wrist_extension', sets: 3, low: 30, high: 45 },
      { id: 'eccentric_wrist_extension', sets: 3, low: 10, high: 15 },
      { id: 'reverse_wrist_curl', sets: 3, low: 12, high: 15 },
      { id: 'wrist_extensor_stretch', sets: 2, low: 20, high: 30 },
    ],
    sources: [
      { label: 'JOSPT 2022 — Lateral Elbow Pain clinical practice guideline', url: 'https://www.jospt.org/doi/10.2519/jospt.2022.0302' },
      { label: 'Tyler et al. — eccentric wrist-extensor exercise RCT (J Shoulder Elbow Surg 2010)', url: 'https://pubmed.ncbi.nlm.nih.gov/20579907/' },
      { label: 'Eccentric exercise for lateral elbow tendinopathy — SR & meta-analysis (NIH/PMC)', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8432114/' },
    ],
  },
  {
    id: 'office_neck_shoulder',
    label: 'Neck & shoulders (desk)',
    shortLabel: 'Desk neck',
    emoji: '💻',
    improves: ['End-of-workday neck and shoulder tension', 'Posture endurance through long screen sessions', 'Tightness across the chest and upper traps', 'Fewer desk-ache flare-ups'],
    conditions: 'The kind of routine typically used for work-related neck and shoulder ache from prolonged sitting and screen use.',
    notFor: [
      'Any of the neck red flags: recent trauma, numbness or weakness into the arm, clumsy hands or unsteady walking, dizziness on looking up, or a sudden severe headache.',
      'Pain that is constant regardless of posture or activity — that points away from a postural cause.',
    ],
    timeline: 'The underlying trial ran ten weeks; expect a measurable drop in neck and shoulder pain over about two months of small, frequent doses.',
    progression: 'This one rewards little and often over long sessions — the evidence favours small daily doses rather than more volume less frequently, so treat it as most-days work. Step the band tension up as moves become easy, and keep the stretches to a gentle sustained pull.',
    why: 'For office-worker neck/shoulder pain, neck- and scapular-specific strengthening reduces pain more reliably than posture advice alone. Pairing chin tucks and scapular work (pull-aparts, wall slides) with a targeted upper-trap and chest stretch trains the weak side and releases the tight side of desk posture.',
    exercises: [
      { id: 'chin_tuck', sets: 3, low: 8, high: 10 },
      { id: 'band_pull_apart', sets: 3, low: 12, high: 20 },
      { id: 'scap_wall_slide', sets: 3, low: 8, high: 12 },
      { id: 'upper_trap_stretch', sets: 2, low: 20, high: 30 },
      { id: 'doorway_pec_stretch', sets: 2, low: 20, high: 30 },
    ],
    sources: [
      { label: 'Andersen et al. — small daily progressive resistance training for neck/shoulder pain (RCT, Pain 2011)', url: 'https://pubmed.ncbi.nlm.nih.gov/21177034/' },
      { label: 'Workplace interventions for neck pain in office workers — SR & meta-analysis (Physical Therapy 2018)', url: 'https://academic.oup.com/ptj/article/98/1/40/4562646' },
      { label: 'Scapular stabilization exercise for chronic neck pain — systematic review (PubMed)', url: 'https://pubmed.ncbi.nlm.nih.gov/31668049/' },
    ],
  },
]

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
    // Marks this as rehab work so the app's progressive-overload logic leaves
    // it alone (see sessionReview). Without it, a rehab move that happens to
    // sit on a bodyweight ladder gets "level up" suggestions, and the loaded
    // tennis-elbow eccentrics collect weight-increase prompts every session.
    rehab: true,
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
