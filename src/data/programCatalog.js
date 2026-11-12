// How the ready-made programs are grouped and filtered on the program list.
// Kept apart from templates.js so none of it is copied onto a user's program
// (and so it never reaches cloud sync or share codes).
import { TEMPLATES } from './templates.js'
import { EXERCISE_BY_ID } from './exercises.js'

// Grouped by what the person wants, in their words.
export const PROGRAM_GROUPS = [
  {
    id: 'everyday', label: 'Everyday strength & health',
    blurb: 'Balanced, sensible plans for getting fitter and stronger.',
    ids: ['foundations_fullbody', 'db_fullbody', 'kb_fullbody'],
  },
  {
    id: 'strength', label: 'Get stronger',
    blurb: 'New to the barbell? StrongLifts or Starting Strength. Want more volume: Greyskull or GZCLP. Stalled after a year or more: 5/3/1.',
    ids: ['stronglifts', 'starting_strength', 'greyskull', 'gzclp', 'wendler531_bbb'],
  },
  {
    id: 'muscle', label: 'Build muscle',
    blurb: 'More sets and reps for size. Both suit lifters with some experience.',
    ids: ['phul', 'reddit_ppl'],
  },
  {
    id: 'bodyweight', label: 'No equipment',
    blurb: 'Bodyweight training — a pull-up bar helps.',
    ids: ['bw_foundations', 'bw_ppl'],
    skillTree: true,
  },
  {
    id: 'bones', label: 'Stronger bones',
    blurb: 'For osteopenia, osteoporosis, or protecting your bones as you age — women and men.',
    ids: ['bone_strength'],
  },
  {
    id: 'climbing', label: 'Climbing',
    blurb: 'Finger, pulling and body-tension strength for climbers.',
    ids: ['climb_home'],
  },
  {
    id: 'fun', label: 'Just for fun',
    blurb: 'A challenge, not a balanced program.',
    ids: ['opm'],
  },
]

// Plain-English one-liners under the names people may not know.
export const PROGRAM_SUBTITLES = {
  gzclp: 'Heavy, medium and light work every session, with built-in stage changes when you stall',
  wendler531_bbb: 'Monthly cycles based on a training max, plus lots of volume',
  phul: 'Power Hypertrophy Upper Lower — two heavy days, two volume days',
  reddit_ppl: 'Push / pull / legs, six days a week',
  greyskull: 'Linear progression with a last set for as many reps as you can',
  opm: '100 push-ups, sit-ups and squats plus a 10 km run, every day',
}

// Gear a lift needs, grouped into the filter's buckets.
const BUCKET = {
  barbell: 'barbell', trap_bar: 'barbell', rack: 'barbell', ez_bar: 'barbell', smith: 'barbell',
  dumbbells: 'dumbbell',
  kettlebells: 'kettlebell',
  cable: 'gym', lat_pulldown: 'gym', leg_press: 'gym', leg_curl_ext: 'gym', machines: 'gym',
}

// Which filter buckets a program falls into, from what its exercises actually
// need (first choice of each). A program with no weighted gear at all counts
// as bodyweight. Worked out, not hand-tagged: three programs used to have no
// equipment tag and vanished under every filter except "All".
export function equipmentBuckets(t) {
  const out = new Set()
  for (const d of t.days || []) {
    for (const e of d.exercises || []) {
      const req = e.requires || EXERCISE_BY_ID[e.id]?.requires || []
      for (const r of req) if (BUCKET[r]) out.add(BUCKET[r])
    }
  }
  if (out.size === 0) out.add('bodyweight')
  return out
}

export const EQUIP_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'barbell', label: 'Gym & barbell' },
  { id: 'dumbbell', label: 'Dumbbells' },
  { id: 'kettlebell', label: 'Kettlebell' },
  { id: 'bodyweight', label: 'No equipment' },
]

// Dumbbell / kettlebell mean "doable with just that" — a barbell program that
// also uses a pair of dumbbells is no help to someone training at home.
export function matchesFilter(t, filterId) {
  if (!filterId || filterId === 'all') return true
  const b = equipmentBuckets(t)
  const gym = b.has('barbell') || b.has('gym')
  if (filterId === 'barbell') return gym
  if (filterId === 'dumbbell') return b.has('dumbbell') && !gym
  if (filterId === 'kettlebell') return b.has('kettlebell') && !gym
  return b.has(filterId)
}

const norm = (s) => String(s || '').toLowerCase()
export function matchesSearch(t, q) {
  const s = norm(q).trim()
  if (!s) return true
  return [t.name, t.bestFor, t.level, PROGRAM_SUBTITLES[t.templateId], ...(t.tags || [])].some((x) => norm(x).includes(s))
}

// Every program sits in exactly one group.
export function groupOf(templateId) {
  return PROGRAM_GROUPS.find((g) => g.ids.includes(templateId)) || null
}

export const CATALOGUED = new Set(PROGRAM_GROUPS.flatMap((g) => g.ids))
export const UNCATALOGUED = TEMPLATES.filter((t) => !CATALOGUED.has(t.templateId)).map((t) => t.templateId)
