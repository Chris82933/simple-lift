// The Mobility engine: turns chosen goals/areas + time + experience into a
// session, expands it into player steps, and turns how each move felt into the
// next session's dose. Pure functions (no storage) so it can all be tested.
import { MOVES, AREAS, AREA_BY_ID, GOAL_BY_ID, TESTS, TIME_OPTIONS, UNIT_WORD, PROGRAM_BY_ID } from '../data/mobility.js'
import { EXERCISE_BY_ID } from '../data/exercises.js'
import { isDoable, getEquipment } from './equipment.js'

const DAY = 24 * 60 * 60 * 1000
export const BLOCK_WEEKS = 4

// ---- Which areas a plan covers ------------------------------------------
// Goals expand to their areas; areas picked directly are added; duplicates go.
// Areas the person said are injured are left out entirely.
export function areasFor({ goals = [], areas = [], avoidAreas = [] } = {}) {
  const out = []
  for (const g of goals) for (const a of GOAL_BY_ID[g]?.areas || []) if (!out.includes(a)) out.push(a)
  for (const a of areas) if (AREA_BY_ID[a] && !out.includes(a)) out.push(a)
  return out.filter((a) => !avoidAreas.includes(a))
}

// Roughly how many times a week each area gets worked: sessions a week × the
// share of areas each session can fit. The evidence says aim for ~3.
export function exposuresPerWeek(areaCount, minutes, perWeek) {
  if (!areaCount) return 0
  const fit = timeOption(minutes).areas
  return Math.round(Math.min(perWeek, (perWeek * fit) / areaCount) * 10) / 10
}

export const timeOption = (min) => TIME_OPTIONS.find((t) => t.min === Number(min)) || TIME_OPTIONS[1]

// How many areas fit the time; the rest rotate across sessions so every area
// still gets its ~3 exposures a week.
export function areasThisSession(allAreas, minutes, sessionIndex = 0) {
  const fit = timeOption(minutes).areas
  if (allAreas.length <= fit) return [...allAreas]
  const start = (sessionIndex * fit) % allAreas.length
  return Array.from({ length: fit }, (_, i) => allAreas[(start + i) % allAreas.length])
}

// ---- Block (4 weeks: 3 building, 1 easy + check-in) -------------------------
export function blockInfo(startedAt, now = Date.now()) {
  const start = new Date(startedAt || now).getTime()
  const days = Math.max(0, Math.floor((now - start) / DAY))
  const week = (Math.floor(days / 7) % BLOCK_WEEKS) + 1
  return { week, easy: week === BLOCK_WEEKS, block: Math.floor(days / 7 / BLOCK_WEEKS) + 1 }
}

// ---- Choosing moves -----------------------------------------------------
// Safety answers quietly remove moves: loaded spinal flexion for low bone
// density or pregnancy; lying-down and pelvis-straining work in pregnancy;
// loaded side-bend + twist for low bone density.
export function allowedMove(id, { flags = {}, equipment, avoid = [] } = {}) {
  const m = MOVES[id]
  const ex = EXERCISE_BY_ID[id]
  if (!m || !ex || avoid.includes(id)) return false
  if (m.flex && (flags.bone || flags.pregnant)) return false
  if ((m.heavy || m.noPregnancy) && flags.pregnant) return false
  if (m.noBone && flags.bone) return false
  if (equipment && !isDoable(ex, equipment)) return false
  return true
}

// Where a level starts on an area's reps ladder. Nobody starts on a heavy
// eccentric or loaded spinal flexion — being flexible isn't the same as being
// strong at length. Those are reached through "Ready for the next level?".
export const START_RUNG = { new: 0, some: 1, flexible: 2 }
const startable = (id) => !MOVES[id].heavy && !MOVES[id].flex
export function startRung(repsLadder, level) {
  const want = START_RUNG[level] ?? 1
  let i = Math.min(want, repsLadder.length - 1)
  while (i > 0 && !startable(repsLadder[i])) i--
  return Math.max(0, i)
}

// Heavy moves (Nordic, reverse Nordic, Jefferson curl): at most twice a week
// and never within 48 h of the last time.
export function heavyAllowed(id, log = [], now = Date.now()) {
  if (!MOVES[id]?.heavy) return true
  const times = log.filter((l) => (l.m || []).some((row) => row[0] === id)).map((l) => new Date(l.d).getTime())
  if (times.some((t) => now - t < 48 * 3600 * 1000)) return false
  const ws = weekStart(now)
  return times.filter((t) => t >= ws).length < 2
}

// The reps move and the hold move for an area. Starts at the area's rung and
// works outward to the nearest move not already used by another area (shared
// moves like the Cossack belong to whichever area got there first).
function pickMoves(area, { level, rung, flags, equipment, avoid, prefer = {}, used = new Set(), log = [], now, extraOk }) {
  // The saved rung is a position on the ladder of moves this person can do
  // at all (safety + equipment) - NOT on today's list. A move that's only
  // out today (a heavy one inside 48 h, a primer-only filter) is stepped
  // around, never used to shift everything up a rung.
  const allowed = (id) => allowedMove(id, { flags, equipment, avoid })
  const usable = (id) => allowed(id) && heavyAllowed(id, log, now) && (!extraOk || extraOk(id))
  const ladder = area.ladder.filter(allowed)
  const repsLadder = ladder.filter((id) => MOVES[id].kind === 'reps')
  const holdLadder = ladder.filter((id) => MOVES[id].kind === 'hold')
  const at = Math.min(Math.max(0, rung ?? startRung(repsLadder, level)), Math.max(0, repsLadder.length - 1))
  const nearest = (list, i, taken) => {
    for (let d = 0; d <= Math.max(i, list.length); d++) {
      for (const j of d === 0 ? [i] : [i - d, i + d]) {
        if (j >= 0 && j < list.length && !taken.has(list[j]) && usable(list[j])) return list[j]
      }
    }
    return null
  }
  const pref = (kind, list) => {
    const p = prefer[`${area.id}:${kind}`]
    return p && list.includes(p) && !used.has(p) && usable(p) ? p : null
  }
  const reps = pref('reps', repsLadder) || nearest(repsLadder, at, used)
  let hold = pref('hold', holdLadder) || nearest(holdLadder, Math.max(0, at - 1), new Set([...used, reps]))
  // Very bendy: strength in range beats long passive holds — an active
  // (strength) hold stays; a passive stretch becomes a second reps move.
  let extra = null
  if (flags?.bendy && hold && !MOVES[hold].active) {
    const alt = nearest(repsLadder, Math.max(0, at - 1), new Set([...used, reps]))
    if (alt) { extra = alt; hold = null }
  }
  // The third move (25/40 min) is the NEXT rung up, so it previews where
  // the area is heading — never a step back.
  const third = nearest(repsLadder.slice(at + 1).filter((id) => !MOVES[id].heavy), 0, new Set([...used, reps, extra]))
  return { reps, hold, extra, third, at, repsLadder, holdLadder }
}

// Hold time limits: strength holds have their own; everyone else 60 s, or
// 30 s when very bendy or pregnant.
export function holdCapFor(id, flags = {}) {
  const m = MOVES[id]
  if (m?.active) return m.holdCap || 30
  return Math.min(m?.maxSec || 60, flags.bendy || flags.pregnant ? 30 : 60)
}

// A move's dose: the person's own progressed numbers if there are any, else
// the level default. Sets follow the level, trimmed for 15-minute sessions
// and topped up for 40. Caps applied here so nothing runs away.
// Programs pass their own `sets` ({ reps, hold }), a shortest passive hold
// (`holdMin`: one longer hold instead of several short ones), a `holdCap`
// (20 s before climbing) and `repsScale` (lighter primer reps).
export function doseFor(id, { level = 'some', state = {}, flags = {}, easy = false, minutes, sets: setsFor, holdMin, holdCap, repsScale } = {}) {
  const m = MOVES[id]
  const base = m.dose[level] || m.dose.some
  const s = state[id] || {}
  let sets = base.sets
  if (setsFor) sets = m.kind === 'hold' ? setsFor.hold : setsFor.reps
  else if (Number(minutes) <= 15) sets = Math.min(sets, 2)
  else if (Number(minutes) >= 40 && !m.heavy) sets = Math.max(sets, 3)
  // Heavy work keeps its own small dose whatever the session length.
  if (m.heavy) sets = Math.min(sets, m.kind === 'hold' ? base.sets : 3)
  if (m.flex) sets = Math.min(sets, 2)
  if (easy) sets = Math.max(1, Math.round(sets * 0.6))
  const load = flags.bone && m.boneNoLoad ? 0 : Number(s.load) || 0
  if (m.kind === 'hold') {
    let sec = Number(s.sec) || base.sec
    if (holdMin && !m.active) sec = Math.max(sec, holdMin)
    sec = Math.min(sec, holdCapFor(id, flags), holdCap || Infinity)
    return { kind: 'hold', sets, sec, load }
  }
  const reps = Number(s.reps) || base.reps
  return { kind: 'reps', sets, reps: repsScale ? Math.max(3, Math.round(reps * repsScale)) : reps, load }
}

// One session. Leads each area with slow loaded reps, then the hold.
export function buildSession(plan, { state = {}, now = Date.now(), equipment, mode } = {}) {
  if (plan.program && PROGRAM_BY_ID[plan.program.id]) return buildProgramSession(plan, { state, now, equipment, mode })
  const all = areasFor(plan)
  const opt = timeOption(plan.minutes)
  const { easy } = blockInfo(plan.startedAt, now)
  const sessionAreas = areasThisSession(all, plan.minutes, plan.pointer || 0)
  const used = new Set()
  const items = []
  for (const areaId of sessionAreas) {
    const area = AREA_BY_ID[areaId]
    if (!area) continue
    const picks = pickMoves(area, { level: plan.level, rung: plan.rungs?.[areaId], flags: plan.flags || {}, equipment, avoid: plan.avoid || [], prefer: plan.prefer, used, log: plan.log || [], now })
    const ids = [[picks.reps, false], [picks.hold, false], [picks.extra, false], [opt.third ? picks.third : null, true]]
    for (const [id, extra] of ids) {
      if (!id || used.has(id)) continue
      used.add(id)
      const dose = doseFor(id, { level: plan.level, state, flags: plan.flags || {}, easy, minutes: opt.min })
      const m = MOVES[id]
      items.push({ id, area: areaId, ...dose, extra, main: id === picks.reps, deeper: opt.deeper && dose.kind === 'hold' && !m.active && !area.gentle && !plan.flags?.bendy && !plan.flags?.pregnant })
    }
  }
  const fitted = fitToTime(items, opt.min)
  // Only the areas that actually made it in (a tight time can drop one).
  const areas = sessionAreas.filter((a) => fitted.some((i) => i.area === a))
  return { areas, items: fitted, easy, get minutes() { return estimateMinutes(this.items) } }
}

// The equipment a Mobility plan uses: what you said in setup — the gym or
// home profile, or nothing at all.
export function mobilityEquipment(plan = {}) {
  const e = getEquipment()
  if (plan.gear === 'none') return new Set()
  if (plan.gear === 'home' || plan.gear === 'gym') return new Set(e.profiles[plan.gear] || [])
  return new Set(e.profiles[e.active] || [])
}

// Swap choices for a move: same kind, same area, nothing harder than one
// rung above where the area is, and never a heavy or loaded-rounding move
// unless the area has already been moved up to it.
export function swapChoices(item, plan, equipment) {
  const area = AREA_BY_ID[item.area]
  if (!area) return []
  const ok = (id) => allowedMove(id, { flags: plan.flags || {}, equipment, avoid: plan.avoid || [] })
  const repsLadder = area.ladder.filter((id) => ok(id) && MOVES[id].kind === 'reps')
  const at = plan.rungs?.[area.id] ?? startRung(repsLadder, plan.level)
  return area.ladder.filter((id) => {
    if (id === item.id || !ok(id) || MOVES[id].kind !== item.kind) return false
    if (MOVES[id].kind !== 'reps') return true
    const i = repsLadder.indexOf(id)
    if (i > at + 1) return false
    if ((MOVES[id].heavy || MOVES[id].flex) && i > at) return false
    return true
  })
}

// Keep the session inside the time chosen: drop the optional third moves
// first (last area first), then trim 3-set moves to 2. The core of each area
// — its reps move and its hold — always stays.
function fitToTime(items, minutes, fixedSec = 180) {
  const out = [...items]
  const over = () => estimateMinutes(out, fixedSec) > minutes + 2
  for (let i = out.length - 1; i >= 0 && over(); i--) if (out[i].extra) out.splice(i, 1)
  for (let i = out.length - 1; i >= 0 && over(); i--) if (out[i].sets > 2) out[i] = { ...out[i], sets: 2 }
  for (let i = out.length - 1; i >= 0 && over(); i--) if (out[i].kind === 'hold' && out[i].sets > 1) out[i] = { ...out[i], sets: 1 }
  // Still over: drop the last area's hold, then the last area — it comes
  // round again in the next session.
  while (over() && new Set(out.map((i) => i.area)).size > 1) {
    const lastArea = out[out.length - 1].area
    const holdAt = out.findIndex((i) => i.area === lastArea && i.kind === 'hold' && !i.main)
    if (holdAt >= 0 && out.filter((i) => i.area === lastArea).length > 1) out.splice(holdAt, 1)
    else for (let i = out.length - 1; i >= 0; i--) if (out[i].area === lastArea) out.splice(i, 1)
  }
  return out
}

// ---- Time ------------------------------------------------------------------
const repSeconds = (id) => {
  const t = MOVES[id]?.tempo
  return t ? t.down + t.pause + t.up : 4
}
export function itemSeconds(item) {
  const m = MOVES[item.id]
  const sides = m?.perSide ? 2 : 1
  const work = item.kind === 'hold' ? item.sec : item.reps * repSeconds(item.id)
  const rest = item.kind === 'hold' ? 20 : (m?.heavy ? 90 : 45)
  return item.sets * (sides * (work + (sides > 1 ? 6 : 0)) + rest) + 20 // + setup
}
// fixedSec: warm-up, water breaks and section cards (3 min warm-up by default).
export function estimateMinutes(items, fixedSec = 180) {
  return Math.round((fixedSec + items.reduce((t, it) => t + itemSeconds(it), 0)) / 60)
}

// ---- Player steps -------------------------------------------------------
// The flat list the player walks through: warm-up, then each move's sets
// (left then right when one-sided), a short switch between sides, rest
// between sets, and a "how did it feel" after each move.
export function buildSteps(session) {
  const warm = session.warmSec ?? 180
  const steps = warm > 0 ? [{ kind: 'warmup', sec: warm, mode: session.mode }] : []
  const sections = session.sections || []
  const live = sections.filter((x) => x.live !== false)
  const primer = session.mode === 'primer'
  let lastSection = -1
  session.items.forEach((item, idx) => {
    const m = MOVES[item.id]
    // Long programs: a short title card as each section starts, and a water
    // break after the sections that have one.
    if (item.s != null && item.s !== lastSection) {
      if (lastSection >= 0 && sections[lastSection]?.breakAfter) steps.push({ kind: 'break', sec: sections[lastSection].breakAfter })
      lastSection = item.s
      if (live.length > 1) {
        const its = session.items.filter((x) => x.s === item.s)
        steps.push({ kind: 'section', sec: 8, s: item.s, title: sections[item.s].title, index: live.indexOf(sections[item.s]) + 1, of: live.length, moves: its.length, min: Math.max(1, Math.round(its.reduce((t, x) => t + itemSeconds(x), 0) / 60)) })
      }
    }
    const sides = m.perSide ? ['L', 'R'] : [null]
    for (let set = 1; set <= item.sets; set++) {
      sides.forEach((side, si) => {
        const last = set === item.sets
        const kind = item.kind === 'hold' ? (item.deeper && last ? 'pnf' : 'hold') : 'reps'
        steps.push({
          kind, item: idx, id: item.id, side, set, of: item.sets,
          sec: item.sec, reps: item.reps, load: item.load,
          tempo: m.paced === false ? null : m.tempo || null,
        })
        if (si < sides.length - 1) steps.push({ kind: 'switch', item: idx, id: item.id, sec: 6, to: sides[si + 1] })
      })
      if (set < item.sets) steps.push({ kind: 'rest', item: idx, id: item.id, sec: item.kind === 'hold' ? 20 : (m.heavy ? 90 : 45) })
    }
    // The primer flows straight on - one pain check at the end instead.
    if (!primer) steps.push({ kind: 'feel', item: idx, id: item.id })
  })
  if (primer) steps.push({ kind: 'check' })
  steps.push({ kind: 'done', mode: session.mode })
  return steps
}

// ---- Progression -----------------------------------------------------------
// After a session, each move's feedback becomes its next dose. One lever at a
// time, and only after two good sessions in a row:
//   range moves: depth first ("full depth with control?")
//   holds:   time (by the move's step, up to its cap) → load (if it takes one)
//            → "go deeper" / "a harder version"
//   reps:    reps (+2 up to the move's cap) → load (if it takes one)
//            → next rung ("Ready for the next level?")
// "Too much" eases off one step; "sharp / tingling" removes the move.
// feedback: { feel: 'easy'|'good'|'much', sharp?, more?: boolean (reps),
//             fullDepth?: boolean (range moves), load? }
export const LOAD_STEP = { lbs: 5, kg: 2.5 }
export const SMALL_LOAD_STEP = { lbs: 2.5, kg: 1 }
export const loadStepFor = (id, units = 'lbs') => (MOVES[id]?.smallLoad ? SMALL_LOAD_STEP : LOAD_STEP)[units] || 5
const repsCapFor = (m) => m.repsCap || Math.min(25, Math.round(m.dose.some.reps * 1.5))
const BLOCK_MS = 28 * 864e5

// The most a loaded spinal-flexion move should carry: ~10% of bodyweight in
// the first block, ~20% after. Unknown bodyweight: a small fixed cap.
export function loadCap(id, { bodyweight = 0, units = 'lbs', block = 1 } = {}) {
  if (MOVES[id]?.loadMax) return MOVES[id].loadMax[units] ?? Infinity
  if (!MOVES[id]?.flex) return Infinity
  const step = loadStepFor(id, units)
  const pct = block <= 1 ? 0.1 : 0.2
  if (bodyweight > 0) return Math.max(step, Math.floor((bodyweight * pct) / step) * step)
  return units === 'kg' ? (block <= 1 ? 5 : 10) : (block <= 1 ? 10 : 20)
}

export function progressMove(id, prev = {}, fb = {}, { easyWeek = false, units = 'lbs', bodyweight = 0, block = 1, flags = {}, bendy = false, now = Date.now() } = {}) {
  const m = MOVES[id]
  if (!m) return { state: prev, note: null }
  const f = { ...flags, bendy: bendy || flags.bendy }
  const s = { ...prev, last: now }
  if (fb.load != null) s.load = Number(fb.load) || 0
  const step = loadStepFor(id, units)
  if (fb.sharp) return { state: s, note: 'removed', remove: true }
  if (easyWeek) return { state: { ...s, streak: 0 }, note: null }
  if (fb.feel === 'much') {
    s.streak = 0
    if (Number(s.load) > 0) { s.load = Math.max(0, s.load - step); return { state: s, note: 'lighter' } }
    if (m.kind === 'hold') { s.sec = Math.max(m.active ? 5 : 15, (Number(s.sec) || m.dose.some.sec) - (m.holdStep || 10)); return { state: s, note: 'shorter' } }
    s.reps = Math.max(3, (Number(s.reps) || m.dose.some.reps) - 2)
    return { state: s, note: 'fewer' }
  }
  const good = fb.feel === 'good' || fb.feel === 'easy'
  const repsOk = m.kind === 'hold' || fb.more !== false
  if (!good || !repsOk) return { state: { ...s, streak: 0 }, note: null }
  // "Barely felt it" counts double on a hold (it really is too easy); a reps
  // move still needs two real sessions.
  s.streak = (Number(s.streak) || 0) + (fb.feel === 'easy' && m.kind === 'hold' ? 2 : 1)
  if (s.streak < 2) return { state: s, note: null }
  s.streak = 0
  // Range first: until the full depth is controlled, depth is the lever.
  if (m.range && s.depth !== 'full') {
    if (fb.fullDepth) s.depth = 'full'
    else return { state: s, note: 'deeper' }
  }
  const loadNow = Number(s.load) || 0
  const capOk = !(m.flex && loadNow + step > loadCap(id, { bodyweight, units, block })) && !(m.loadMax && loadNow + step > m.loadMax[units])
  const blockOk = !(m.loadOncePerBlock && s.lastLoadAt && now - s.lastLoadAt < BLOCK_MS)
  const canLoad = m.loadable !== 'none' && capOk && blockOk && !(f.bone && m.boneNoLoad)
  if (m.kind === 'hold') {
    const cap = holdCapFor(id, f)
    const sec = Number(s.sec) || m.dose.some.sec
    if (sec < cap) { s.sec = Math.min(cap, sec + (m.holdStep || 15)); return { state: s, note: 'longer' } }
    if (canLoad && m.after !== 'harder' && !f.pregnant) { s.load = loadNow + step; return { state: s, note: 'heavier' } }
    return { state: s, note: m.after === 'harder' || f.bendy ? 'harder' : 'deeper' }
  }
  const reps = Number(s.reps) || m.dose.some.reps
  const capR = repsCapFor(m)
  if (reps < capR) { s.reps = Math.min(capR, reps + (m.heavy ? 1 : 2)); return { state: s, note: 'more' } }
  if (m.after === 'harder') return { state: s, note: 'harder' }
  if (canLoad) {
    s.load = loadNow + step
    s.lastLoadAt = now
    // New weight: back to the bottom of the rep range and build again.
    s.reps = m.dose.some.reps
    return { state: s, note: 'heavier' }
  }
  return { state: s, note: 'ready_next' }
}

export const NOTE_TEXT = {
  longer: 'Next time: hold a little longer',
  heavier: 'Next time: a little more weight',
  more: 'Next time: one or two more reps',
  deeper: 'Next time: go a little deeper, with control',
  harder: 'Next time: try a harder version',
  lighter: 'Next time: a little lighter',
  shorter: 'Next time: a shorter hold',
  fewer: 'Next time: a couple fewer reps',
  removed: 'Taken out of your plan',
  ready_next: 'Ready for the next level',
}

// ---- Self-tests -----------------------------------------------------------
// Which tests a plan shows: one per goal (or per area when no goal was picked).
export function testsFor({ goals = [], areas = [], program } = {}) {
  if (program && PROGRAM_BY_ID[program.id]) return PROGRAM_BY_ID[program.id].tests.filter((t) => TESTS[t])
  const out = []
  for (const g of goals) { const t = GOAL_BY_ID[g]?.test; if (t && TESTS[t] && !out.includes(t)) out.push(t) }
  for (const a of areas) { const t = AREA_BY_ID[a]?.test; if (t && TESTS[t] && !out.includes(t)) out.push(t) }
  return out.slice(0, 4)
}

// The better of two logged values (per side for two-sided tests).
function betterOf(t, a, b) {
  const pick = (x, y) => {
    const nx = Number(x); const ny = Number(y)
    if (!Number.isFinite(nx)) return y
    if (!Number.isFinite(ny)) return x
    return (t.better === 'higher' ? nx >= ny : nx <= ny) ? x : y
  }
  if (t.sides && a && typeof a === 'object') return { L: pick(a.L, b?.L), R: pick(a.R, b?.R) }
  return pick(a, b)
}

// A logged value for one side: number, or { L, R }.
const valueOf = (v, side) => (v && typeof v === 'object' ? v[side] : v)

// Compare the latest result with the baseline, outside the day-to-day band.
// Returns { status: 'up'|'steady'|'down'|'none', delta, sides? }.
export function testProgress(testId, entries = []) {
  const t = TESTS[testId]
  if (!t || entries.length < 2) return { status: entries.length ? 'baseline' : 'none', delta: 0 }
  // One noisy reading shouldn't decide it: compare the baseline with the
  // better of the last two check-ins.
  const first = entries[0].v
  const last = entries.length > 2 ? betterOf(t, entries.at(-1).v, entries.at(-2).v) : entries.at(-1).v
  const sides = t.sides ? ['L', 'R'] : [null]
  const deltas = sides.map((side) => {
    const a = Number(valueOf(first, side))
    const b = Number(valueOf(last, side))
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 0
    return t.better === 'higher' ? b - a : a - b
  })
  // The side that moved least decides: "real progress" on both sides or none.
  const delta = t.sides ? Math.min(...deltas) : deltas[0]
  const best = Math.max(...deltas)
  // A whole level is a real change; a measured distance has to clear the
  // wobble (one finger width either way is just a different day).
  const real = (d) => (t.unit === 'level' ? Math.abs(d) >= 1 : Math.abs(d) > t.band)
  const status = delta > 0 && real(delta) ? 'up' : best < 0 && real(best) ? 'down' : 'steady'
  return { status, delta, best, deltas }
}

// Left/right difference worth mentioning (beyond the noise band).
export function asymmetry(testId, value) {
  const t = TESTS[testId]
  if (!t?.sides || !value || typeof value !== 'object') return null
  const L = Number(value.L)
  const R = Number(value.R)
  if (!Number.isFinite(L) || !Number.isFinite(R) || Math.abs(L - R) <= t.band) return null
  const tighter = t.better === 'higher' ? (L < R ? 'left' : 'right') : (L > R ? 'left' : 'right')
  return { tighter, diff: Math.abs(L - R) }
}

// ---- Consistency ----------------------------------------------------------
function weekStart(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime() }
// A full session counts for the week; a primer or a session stopped early
// (under half its moves) is logged but doesn't.
export const countsForWeek = (l) => !l.short && l.mode !== 'primer'
export function sessionsThisWeek(log = [], now = Date.now()) {
  const ws = weekStart(now)
  return log.filter((l) => countsForWeek(l) && new Date(l.d).getTime() >= ws).length
}
export function primersThisWeek(log = [], now = Date.now()) {
  const ws = weekStart(now)
  return log.filter((l) => l.mode === 'primer' && new Date(l.d).getTime() >= ws).length
}
export function weekStreak(log = [], perWeek = 3, now = Date.now()) {
  let streak = 0
  let ws = weekStart(now) - 7 * DAY
  const count = (from) => log.filter((l) => { const t = new Date(l.d).getTime(); return countsForWeek(l) && t >= from && t < from + 7 * DAY }).length
  while (count(ws) >= perWeek) { streak++; ws -= 7 * DAY }
  if (count(weekStart(now)) >= perWeek) streak++
  return streak
}

// Is a next-day soreness check due? (12–48 h after the last session, once.)
export function sorenessDue(mob, now = Date.now()) {
  const last = [...(mob?.log || [])].reverse().find((l) => l.mode !== 'primer')
  if (!last || mob.soreCheckedFor === last.d) return null
  const age = now - new Date(last.d).getTime()
  return age >= 12 * 3600 * 1000 && age <= 48 * 3600 * 1000 ? last : null
}

// ---- Display text ----
// "2 × 8 slow · 10 lb" — never tempo numbers; the player paces the reps.
export function doseLine(item, units) {
  const m = MOVES[item.id]
  const each = m?.perSide ? ' each side' : ''
  const what = item.kind === 'hold' ? `${item.sets} × ${item.sec} s${each}` : `${item.sets} × ${item.reps}${m?.paced === false ? '' : ' slow'}${each}`
  let load = ''
  if (Number(item.load) > 0) load = ` · ${item.load} ${units}`
  else if (m?.loadable === 'required') load = ' · pick a light weight'
  return what + load
}

export function formatTest(testId, v) {
  const t = TESTS[testId]
  if (!t || v == null) return '—'
  if (t.unit === 'level') return t.levels[v] || '—'
  if (testId === 'toe_touch' && Number.isFinite(Number(v))) {
    const n = Number(v)
    return n < 0 ? `${-n} finger width${n === -1 ? '' : 's'} short of the floor` : n === 0 ? 'Touching the floor' : `${n} finger width${n === 1 ? '' : 's'} past the floor`
  }
  const one = (n) => `${t.signed && n > 0 ? '+' : ''}${n} ${UNIT_WORD[t.unit]}`
  if (t.sides && typeof v === 'object') return `L ${one(v.L)} · R ${one(v.R)}`
  return one(v)
}

export { AREAS }

// What a saved, unfinished session was built from. If the plan changes
// (edited, removed and re-added, a move swapped), the old session is stale.
export function planSignature(plan = {}, mode) {
  const base = [plan.goals, plan.areas, plan.avoidAreas, plan.minutes, plan.level, plan.flags, plan.rungs, plan.prefer, plan.avoid, plan.pointer]
  // Custom plans keep their old signature, so a session in progress survives
  // this update.
  if (plan.program) base.push(plan.program, mode || 'full')
  return JSON.stringify(base)
}

// ---- Programs ----------------------------------------------------------------
// The length a program plan runs at. Primer / after-climbing are picked by
// mode; otherwise the chosen length (capped at 60 min when pregnant).
export function programLength(plan, mode) {
  const prog = PROGRAM_BY_ID[plan?.program?.id]
  if (!prog) return null
  if (mode === 'primer' || mode === 'after') return prog.lengths.find((l) => l.mode === mode) || null
  const full = prog.lengths.filter((l) => !l.mode)
  let len = Number(plan.program.len) || full[0].min
  if (plan.flags?.pregnant) len = Math.min(len, 60)
  return full.find((l) => l.min === len) || [...full].reverse().find((l) => l.min <= len) || full[0]
}
export const fullLengths = (programId) => (PROGRAM_BY_ID[programId]?.lengths || []).filter((l) => !l.mode)

// The moves a program leaves out because of the pain chips.
export function painAvoid(plan) {
  const prog = PROGRAM_BY_ID[plan?.program?.id]
  return (plan?.program?.pain || []).flatMap((p) => prog?.pain?.[p] || [])
}

// Every area a program plan works, on any day (for the injury chips).
export function programAreas(plan) {
  const prog = PROGRAM_BY_ID[plan?.program?.id]
  if (!prog) return []
  const out = []
  for (const l of prog.lengths) for (const d of l.days) for (const sec of d.sections) for (const a of sec.areas) if (!out.includes(a)) out.push(a)
  return out
}
// The areas a plan works: a program's, or the goals + areas you picked.
export const planAreas = (plan) => (plan?.program ? programAreas(plan) : areasFor(plan))

// Roughly how many times a week each area gets worked at this length: the
// area that comes round least decides.
export function programExposures(plan, perWeek) {
  const length = programLength(plan)
  if (!length) return 0
  const n = length.days.length
  const counts = {}
  for (const d of length.days) for (const sec of d.sections) for (const a of sec.areas) counts[a] = (counts[a] || 0) + 1
  const avoid = plan.avoidAreas || []
  const vals = Object.entries(counts).filter(([a]) => !avoid.includes(a)).map(([, c]) => (c / n) * perWeek)
  return vals.length ? Math.round(Math.min(...vals) * 10) / 10 : 0
}

// One program session: the day's sections, each area its reps move then its
// hold - the same picking, levels and progression as a custom plan.
export function buildProgramSession(plan, { state = {}, now = Date.now(), equipment, mode } = {}) {
  const prog = PROGRAM_BY_ID[plan.program.id]
  const length = programLength(plan, mode)
  const flags = plan.flags || {}
  const days = length.days
  const day = days[(Number(plan.program.day) || 0) % days.length]
  const { easy } = blockInfo(plan.startedAt, now)
  const avoid = [...(plan.avoid || []), ...painAvoid(plan)]
  const avoidAreas = plan.avoidAreas || []
  const heavyMax = prog.exclude?.includes('heavy') ? 0 : (plan.level === 'new' ? Math.min(1, length.heavyMax ?? 1) : (length.heavyMax ?? 1))
  let heavy = 0
  const used = new Set()
  const items = []
  const sections = []
  day.sections.forEach((sec) => {
    const areas = sec.areas.filter((a) => AREA_BY_ID[a] && !avoidAreas.includes(a))
    if (!areas.length) return
    const s = sections.length
    sections.push({ title: sec.title, areas, breakAfter: sec.breakAfter })
    for (const areaId of areas) {
      const area = AREA_BY_ID[areaId]
      const extraOk = (id) => {
        const m = MOVES[id]
        if (length.only && !m[length.only]) return false
        if (m.heavy && heavy >= heavyMax) return false
        if (length.noGear?.length && (EXERCISE_BY_ID[id]?.requires || []).some((g) => length.noGear.includes(g))) return false
        return true
      }
      const picks = pickMoves(area, { level: plan.level, rung: plan.rungs?.[areaId], flags, equipment, avoid, prefer: plan.prefer, used, log: plan.log || [], now, extraOk })
      const ids = [[picks.reps, false], [picks.hold, false], [picks.extra, false], [length.third ? picks.third : null, true]]
      for (const [id, extra] of ids) {
        if (!id || used.has(id)) continue
        used.add(id)
        if (MOVES[id].heavy) heavy++
        const dose = doseFor(id, { level: plan.level, state, flags, easy, sets: length.sets, holdMin: length.holdMin, holdCap: length.holdCap, repsScale: length.repsScale })
        const m = MOVES[id]
        items.push({ id, area: areaId, s, ...dose, extra, main: id === picks.reps, deeper: !!length.deeper && dose.kind === 'hold' && !m.active && !area.gentle && !flags.bendy && !flags.pregnant })
      }
    }
  })
  const warmSec = length.warmSec ?? 180
  const fixed = (its) => {
    const live = sections.filter((_, i) => its.some((it) => it.s === i))
    const breaks = live.slice(0, -1).reduce((t, sec) => t + (sec.breakAfter || 0), 0)
    return warmSec + breaks + (live.length > 1 ? live.length * 8 : 0)
  }
  const fitted = fitToTime(items, length.min, fixed(items))
  // A section that lost every move (to the time limit or gear) isn't shown.
  const liveSections = sections.map((sec, i) => ({ ...sec, live: fitted.some((it) => it.s === i) }))
  return {
    program: prog.id, mode: length.mode || 'full', label: day.label, length: length.min,
    areas: [...new Set(fitted.map((i) => i.area))], items: fitted, easy, sections: liveSections, warmSec,
    fixedSec: fixed(fitted),
    get minutes() { return estimateMinutes(this.items, this.fixedSec) },
  }
}

// Did a session do enough to count for the week? Half its moves (a primer:
// any of them).
export function enoughDone(itemCount, doneCount, mode) {
  if (mode === 'primer') return doneCount >= 1
  return doneCount >= Math.ceil(itemCount / 2)
}

// "1 h 55 min" for long sessions.
export function minutesText(min) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}
