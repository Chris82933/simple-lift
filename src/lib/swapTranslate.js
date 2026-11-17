// "Station taken": find stand-ins for a lift whose equipment is busy, and
// translate the planned weight and reps onto them.
import { EXERCISES, EXERCISE_BY_ID, exMeasure } from '../data/exercises.js'
import { swapInfo, swapRank } from '../data/swapFamilies.js'
import { estimate1RM, weightForReps } from './oneRepMax.js'
import { isDoable, availableLoadFor } from './equipment.js'

const libOf = (exOrId) => (typeof exOrId === 'string' ? EXERCISE_BY_ID[exOrId] : EXERCISE_BY_ID[exOrId?.id] || exOrId) || null
const requiresOf = (ex) => libOf(ex)?.requires || []

// The one piece of kit that gets "taken" — what the sheet's title names and
// what "Mark busy" flags. A barbell bench press's station is a barbell bench,
// not every flat bench in the gym (a dumbbell press can use any of those).
const SINGLE_UNIT = [
  ['rack', 'Rack'], ['smith', 'Smith machine'], ['leg_press', 'Leg press'], ['trap_bar', 'Trap bar'],
  ['lat_pulldown', 'Pulldown'], ['cable', 'Cable station'], ['leg_curl_ext', 'Leg machine'], ['machines', 'Machine'],
]
export function stationOf(ex) {
  const req = requiresOf(ex)
  for (const [gear, label] of SINGLE_UNIT) if (req.includes(gear)) return { key: gear, label }
  if (req.includes('barbell') && (req.includes('flat_bench') || req.includes('adj_bench'))) return { key: 'barbell_bench', label: 'Bench' }
  if (req.includes('barbell')) return { key: 'barbell', label: 'Barbell' }
  if (req.includes('dumbbells')) return { key: 'dumbbells', label: 'Dumbbells' }
  if (req.includes('kettlebells')) return { key: 'kettlebells', label: 'Kettlebell' }
  if (req.includes('pullup_bar')) return { key: 'pullup_bar', label: 'Pull-up bar' }
  if (req.includes('dip_station')) return { key: 'dip_station', label: 'Dip station' }
  return null // nothing to be "taken" (bodyweight on the floor)
}

// Usable here: the gear is in the profile and its station isn't marked busy.
export function usableHere(ex, available, busy = []) {
  const st = stationOf(ex)
  return isDoable(ex, available) && !(st && busy.includes(st.key))
}

// Dumbbell / kettlebell loads are per dumbbell: what goes in one hand.
export const perDumbbell = (ex) => requiresOf(ex).some((r) => r === 'dumbbells' || r === 'kettlebells')
// What one 'per' unit is called.
export const perWord = (ex) => (requiresOf(ex).includes('kettlebells') && !requiresOf(ex).includes('dumbbells') ? 'kettlebell' : 'dumbbell')
const usesBarbell = (ex) => requiresOf(ex).some((r) => r === 'barbell' || r === 'trap_bar')

// The smallest jump each kind of kit usually allows.
function stepFor(ex, units) {
  const req = requiresOf(ex)
  const kg = units === 'kg'
  if (req.includes('dumbbells')) return kg ? 2 : 5
  if (req.includes('kettlebells')) return kg ? 4 : 5
  if (req.some((r) => ['machines', 'leg_press', 'leg_curl_ext'].includes(r))) return kg ? 5 : 10
  return kg ? 2.5 : 5
}
const BAR = { lbs: 45, kg: 20 }

const CONF_RANK = { H: 0, M: 1, L: 2, feel: 3 }
const lower = (a, b) => (CONF_RANK[a] >= CONF_RANK[b] ? a : b)
const repsBased = (ex) => exMeasure(ex).type === 'reps'

// Translate one planned set (weight × reps on `fromId`) onto `toId`.
// Returns { weight, reps, conf, capped, perHand }. `weight` is null when the
// stand-in can't be translated (different family, bodyweight, timed): then the
// reps carry over and the lifter goes by feel.
export function translateSet({ fromId, toId, weight, reps, units = 'lbs', capacity = {}, learned = null }) {
  const to = libOf(toId)
  const from = libOf(fromId)
  const r = Number(reps) || 0
  const base = { weight: null, reps: r, conf: 'feel', capped: false, perHand: perDumbbell(to) }
  if (!to || to.load === false || !repsBased(to) || !from || !repsBased(from)) return base
  const a = swapInfo(fromId)
  const b = swapInfo(toId)
  const w = Number(weight) || 0
  if (!a || !b || a.family !== b.family || !(w > 0) || !(r > 0)) return base

  // Triples are a barbell thing; on dumbbells or a machine, work in fives.
  let targetReps = Math.min(20, r)
  if (!usesBarbell(to) && targetReps < 5) targetReps = 5
  const e1 = estimate1RM(w, r) * (b.r / a.r) * (Number(learned) > 0 ? Number(learned) : 1)
  const step = stepFor(to, units)
  let out = weightForReps(e1, targetReps, step)
  if (usesBarbell(to)) out = Math.max(out, BAR[units] || 45)
  out = Math.max(out, step)

  // Heaviest dumbbell (if the lifter recorded one): cap the load, add reps.
  let capped = false
  const cap = availableLoadFor(to, capacity)
  if (cap > 0 && out > cap) {
    out = Math.floor(cap / step) * step || cap
    targetReps = Math.max(targetReps, Math.min(30, Math.round(30 * (e1 / out - 1))))
    capped = true
  }
  const conf = Number(learned) > 0 ? 'H' : lower(a.conf, b.conf)
  return { weight: out, reps: targetReps, conf, capped, perHand: perDumbbell(to), per: perWord(to) }
}

// The lighter first set on an uncertain translation: ~90%, rounded down.
export function feelerWeight(weight, toId, units = 'lbs') {
  const step = stepFor(libOf(toId), units)
  const w = Math.floor((Number(weight) * 0.9) / step) * step
  const floor = usesBarbell(libOf(toId)) ? BAR[units] || 45 : step
  return Math.max(floor, w)
}

// After the feeler: did it go as the translation expected? Only a clear miss
// (fewer reps than planned) or a clear surplus (2+ more) moves the rest.
export function adjustAfterFeeler({ toId, feelerW, feelerReps, targetReps, current, units = 'lbs' }) {
  const r = Number(feelerReps) || 0
  const t = Number(targetReps) || 0
  if (!(r > 0) || !(t > 0) || (r >= t && r < t + 2)) return null
  const step = stepFor(libOf(toId), units)
  let next = weightForReps(estimate1RM(feelerW, r), t, step)
  if (r < t) next = Math.min(next, Number(current) - step) // a miss never raises the load
  if (usesBarbell(libOf(toId))) next = Math.max(next, BAR[units] || 45)
  next = Math.max(step, next)
  return next === Number(current) ? null : next
}

// Ranked stand-ins for `ex`. `planned` is the set being replaced
// ({ weight, reps }); `fromId` is the lift the translation starts from (the
// original, even when swapping an already-swapped lift).
export function swapOptions(ex, { available, busy = [], inSession = [], units = 'lbs', capacity = {}, planned = {}, fromId, learned = {} } = {}) {
  const root = fromId || ex.id
  const lib = libOf(ex)
  if (!lib) return []
  const info = swapInfo(root) || swapInfo(ex.id)
  const pattern = lib.pattern
  const taken = stationOf(ex)
  const skip = new Set([ex.id, ...inSession])
  const pool = EXERCISES.filter((c) => !skip.has(c.id) && !c.ladderOnly && !c.programOnly
    && c.pattern !== 'conditioning' && usableHere(c, available, busy))

  const alts = new Set(ex.alts || [])
  const rows = []
  for (const c of pool) {
    const sameFamily = info && swapInfo(c.id)?.family === info.family
    // Different movement, same pattern: offered too, but by feel.
    if (!sameFamily && (c.pattern !== pattern || lib.compound !== c.compound)) continue
    const t = translateSet({ fromId: root, toId: c.id, weight: planned.weight, reps: planned.reps, units, capacity, learned: learned[`${root}>${c.id}`] })
    const shares = !!taken && stationOf(c)?.key === taken.key
    rows.push({ lib: c, t, shares, curated: alts.has(c.id) })
  }
  // Off the taken station first; then the program's own curated fallbacks;
  // then the family's best-stand-in order; anything only matched by movement
  // pattern (by feel) last.
  const famOrder = (r) => (info && swapInfo(r.lib.id)?.family === info.family ? swapRank(r.lib.id) : 1e7)
  rows.sort((x, y) => (x.shares - y.shares)
    || (y.curated - x.curated)
    || (famOrder(x) - famOrder(y)))
  return rows.slice(0, 8)
}

// Scale a stored load from one lift to another in the same family (used when a
// program exercise is swapped for the gear before the session starts).
// Returns null when the two can't be compared.
export function scaleLoad(fromId, toId, value, units = 'lbs') {
  const a = swapInfo(fromId)
  const b = swapInfo(toId)
  const v = Number(value)
  if (!a || !b || a.family !== b.family || !(v > 0)) return null
  const step = stepFor(libOf(toId), units)
  let out = Math.round((v * b.r / a.r) / step) * step
  if (usesBarbell(libOf(toId))) out = Math.max(out, BAR[units] || 45)
  return Math.max(step, out)
}

export const CONF_LABEL = { H: 'Close match', M: 'Close match', L: 'Ballpark', feel: 'By feel' }
