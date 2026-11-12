// Turns the five onboarding answers into one recommended plan plus a couple of
// alternatives. Pure, so every combination of answers can be tested.
import { TEMPLATE_BY_ID } from '../data/templates.js'
import { ALL_EQUIPMENT_IDS } from './equipment.js'

// What someone wants from training, in their words. `goals` feeds the
// generator's set/rep scheme.
export const ONBOARDING_GOALS = [
  { id: 'general', label: 'Get fit & healthy', hint: 'Stronger for everyday life — a bit of everything', goals: ['general'] },
  { id: 'strength', label: 'Get stronger', hint: 'Lift heavier on the big lifts', goals: ['strength'] },
  { id: 'size', label: 'Build muscle', hint: 'Bigger, more defined muscles', goals: ['size'] },
  { id: 'bones', label: 'Stronger bones', hint: 'Osteopenia or osteoporosis, or protecting your bones as you age', goals: ['strength'] },
  { id: 'skills', label: 'Bodyweight skills', hint: 'Pull-ups, handstands, muscle-ups — no gym needed', goals: ['general'] },
  { id: 'climbing', label: 'Climbing', hint: 'Grip, pulling strength and fingers', goals: ['climbing'] },
  { id: 'endurance', label: 'Fitness & endurance', hint: 'Lighter weights, more reps, running support', goals: ['endurance'] },
]
export const GOAL_BY_ID = Object.fromEntries(ONBOARDING_GOALS.map((g) => [g.id, g]))
export const DEFAULT_GOAL = 'general'

export const TRAIN_PLACES = [
  { id: 'gym', label: 'At a gym', hint: 'Barbells, dumbbells, machines' },
  { id: 'home', label: 'At home with some weights', hint: 'Dumbbells, kettlebells, a bench…' },
  { id: 'none', label: 'No equipment', hint: 'Just your bodyweight' },
]

// Quick home-gear picks (the full list stays one tap away).
export const HOME_GEAR = [
  { id: 'dumbbells', label: 'Dumbbells' },
  { id: 'kettlebells', label: 'Kettlebells' },
  { id: 'flat_bench', label: 'Bench' },
  { id: 'pullup_bar', label: 'Pull-up bar' },
  { id: 'bands', label: 'Bands' },
  { id: 'barbell', label: 'Barbell & rack' },
]
export const DEFAULT_HOME_GEAR = ['dumbbells']

const CLIMBING_GEAR = ['hangboard', 'finger_trainer']

// The equipment list a place (plus any picks) stands for.
export function equipmentFor(place, picks = [], goal) {
  if (place === 'gym') {
    return ALL_EQUIPMENT_IDS.filter((id) => goal === 'climbing' || !CLIMBING_GEAR.includes(id))
  }
  const ids = new Set(picks)
  if (ids.has('barbell')) { ids.add('rack'); ids.add('plates') }
  if (ids.has('flat_bench')) ids.add('adj_bench')
  return [...ids]
}

const T = (templateId) => ({ kind: 'template', templateId })
const GEN = { kind: 'generated' }

// Ready-made programs that suit each case; the generator fills every gap (it
// builds exactly for the days and gear given).
function pick({ goal, experience, place, days, picks = [] }) {
  const isNew = experience === 'new'
  const exp = experience === 'experienced'
  if (goal === 'bones') return { primary: { kind: 'bone' }, alts: [T('foundations_fullbody')] }

  if (place === 'none') {
    if (goal === 'climbing') return { primary: T('climb_home'), alts: [T('bw_foundations')] }
    const main = isNew ? 'bw_foundations' : 'bw_ppl'
    const other = isNew ? 'bw_ppl' : 'bw_foundations'
    return { primary: T(main), alts: [T(other), GEN] }
  }

  if (place === 'home') {
    const hasDb = picks.includes('dumbbells')
    const hasKb = picks.includes('kettlebells')
    if (goal === 'climbing') return { primary: T('climb_home'), alts: [GEN] }
    if (goal === 'skills') return { primary: T(isNew ? 'bw_foundations' : 'bw_ppl'), alts: [GEN] }
    const alts = []
    if (hasDb) alts.push(T('db_fullbody'))
    if (hasKb) alts.push(T('kb_fullbody'))
    if (hasDb && picks.includes('pullup_bar')) alts.push(T('foundations_fullbody'))
    if (!hasDb && !hasKb) return { primary: T(isNew ? 'bw_foundations' : 'bw_ppl'), alts: [GEN] }
    // A dumbbell program that fits the week as given beats a generated one.
    if (hasDb && days === 3 && (goal === 'general' || goal === 'size')) {
      return { primary: T('db_fullbody'), alts: [GEN, ...alts.filter((a) => a.templateId !== 'db_fullbody')] }
    }
    return { primary: GEN, alts }
  }

  // At a gym.
  switch (goal) {
    case 'strength':
      if (isNew) return { primary: T(days <= 3 ? 'stronglifts' : 'greyskull'), alts: [T('starting_strength'), T('gzclp')] }
      if (exp && days >= 4) return { primary: T('wendler531_bbb'), alts: [T('phul'), T('gzclp')] }
      return { primary: T('gzclp'), alts: [T('greyskull'), T('wendler531_bbb')] }
    case 'size':
      if (isNew) return { primary: GEN, alts: [T('greyskull'), T('foundations_fullbody')] }
      if (days >= 6) return { primary: T('reddit_ppl'), alts: [T('phul'), GEN] }
      if (days === 4) return { primary: T('phul'), alts: [T('reddit_ppl'), GEN] }
      return { primary: GEN, alts: [T('phul'), T('greyskull')] }
    case 'skills':
      return { primary: T(isNew ? 'bw_foundations' : 'bw_ppl'), alts: [GEN] }
    case 'climbing':
      return { primary: T('climb_home'), alts: [GEN] }
    case 'endurance':
      return { primary: GEN, alts: [T('kb_fullbody'), T('foundations_fullbody')] }
    case 'general':
    default:
      if (isNew && days <= 3) return { primary: T('foundations_fullbody'), alts: [GEN, T('stronglifts')] }
      return { primary: GEN, alts: [T('foundations_fullbody'), T('stronglifts')] }
  }
}

const label = (o) => (o.kind === 'template' ? TEMPLATE_BY_ID[o.templateId]?.name : o.kind)

// { primary, alts } — alts never repeat the primary, at most 2, and only
// reference programs that exist.
export function recommendPlan(answers) {
  const { primary, alts } = pick(answers)
  const valid = (o) => o.kind !== 'template' || !!TEMPLATE_BY_ID[o.templateId]
  const seen = new Set([label(primary)])
  const out = []
  for (const a of alts) {
    if (!valid(a) || seen.has(label(a))) continue
    seen.add(label(a))
    out.push(a)
    if (out.length === 2) break
  }
  return { primary: valid(primary) ? primary : GEN, alts: out }
}

const PLACE_WORDS = { gym: 'at a gym', home: 'at home', none: 'with no equipment' }
const LEVEL_WORDS = { new: 'you’re new to lifting', some: 'you have some experience', experienced: 'you’re experienced' }

// "Why this": the answers it was chosen from, in plain words.
export function whyLine({ goal, experience, place, days }) {
  const g = GOAL_BY_ID[goal]?.label.toLowerCase() || 'get fit'
  return `Because ${LEVEL_WORDS[experience] || 'you’re getting started'}, train ${PLACE_WORDS[place] || ''} ${days}× a week, and want to ${g}.`.replace(/\s+/g, ' ')
}

// A name that says what it is, instead of "3-Day Plan".
export function generatedName({ goal, days }) {
  const what = {
    general: 'Full-Body Fitness', strength: 'Strength', size: 'Muscle', skills: 'Bodyweight',
    climbing: 'Climbing Strength', endurance: 'Endurance', bones: 'Bone Strength',
  }[goal] || 'Training'
  return `${days}-Day ${what} Plan`
}
