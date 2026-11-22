// The Mobility engine: turns chosen goals/areas + time + experience into a
// session, expands it into player steps, and turns how each move felt into the
// next session's dose. Pure functions (no storage) so it can all be tested.
import { MOVES, AREAS, AREA_BY_ID, GOAL_BY_ID, TESTS, TIME_OPTIONS, UNIT_WORD } from '../data/mobility.js'
import { EXERCISE_BY_ID } from '../data/exercises.js'
import { isDoable } from './equipment.js'

const DAY = 24 * 60 * 60 * 1000
export const BLOCK_WEEKS = 4

// ---- Which areas a plan covers ------------------------------------------
// Goals expand to their areas; areas picked directly are added; duplicates go.
export function areasFor({ goals = [], areas = [] } = {}) {
  const out = []
  for (const g of goals) for (const a of GOAL_BY_ID[g]?.areas || []) if (!out.includes(a)) out.push(a)
  for (const a of areas) if (AREA_BY_ID[a] && !out.includes(a)) out.push(a)
  return out
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
// density or pregnancy; long passive holds are capped for very bendy people.
export function allowedMove(id, { flags = {}, equipment, avoid = [] } = {}) {
  const m = MOVES[id]
  const ex = EXERCISE_BY_ID[id]
  if (!m || !ex || avoid.includes(id)) return false
  if (m.flex && (flags.bone || flags.pregnant)) return false
  if (m.heavy && flags.pregnant) return false
  if (equipment && !isDoable(ex, equipment)) return false
  return true
}

export const START_RUNG = { new: 0, some: 1, flexible: 2 }

// The reps move and the hold move for an area, at the area's rung.
function pickMoves(area, { level, rung, flags, equipment, avoid, prefer = {} }) {
  const ok = (id) => allowedMove(id, { flags, equipment, avoid })
  const ladder = area.ladder.filter(ok)
  const repsLadder = ladder.filter((id) => MOVES[id].kind === 'reps')
  const holdLadder = ladder.filter((id) => MOVES[id].kind === 'hold')
  const at = Math.max(0, rung ?? START_RUNG[level] ?? 1)
  const pickAt = (list, i) => (list.length ? list[Math.min(i, list.length - 1)] : null)
  const reps = prefer[`${area.id}:reps`] && repsLadder.includes(prefer[`${area.id}:reps`]) ? prefer[`${area.id}:reps`] : pickAt(repsLadder, at)
  // Very bendy: strength in range beats long passive holds — swap the hold
  // for a second reps move where there is one.
  let hold = prefer[`${area.id}:hold`] && holdLadder.includes(prefer[`${area.id}:hold`]) ? prefer[`${area.id}:hold`] : pickAt(holdLadder, Math.max(0, at - 1))
  let extra = null
  if (flags?.bendy && hold) {
    const alt = repsLadder.find((id) => id !== reps)
    if (alt) { extra = alt; hold = null }
  }
  return { reps, hold, extra, ladder, repsLadder, holdLadder }
}

// A move's dose: the person's own progressed numbers if there are any, else
// the level default. Caps applied here so nothing runs away.
export function doseFor(id, { level = 'some', state = {}, flags = {}, easy = false, sets: setsOverride } = {}) {
  const m = MOVES[id]
  const base = m.dose[level] || m.dose.some
  const s = state[id] || {}
  let sets = setsOverride ?? base.sets
  if (m.heavy) sets = Math.min(sets, 3)
  if (easy) sets = Math.max(1, Math.round(sets * 0.6))
  if (m.kind === 'hold') {
    let sec = Number(s.sec) || base.sec
    sec = Math.min(sec, flags.bendy ? 30 : 60)
    return { kind: 'hold', sets, sec, load: Number(s.load) || 0 }
  }
  return { kind: 'reps', sets, reps: Number(s.reps) || base.reps, load: Number(s.load) || 0 }
}

// One session. Leads each area with slow loaded reps, then the hold.
export function buildSession(plan, { state = {}, now = Date.now(), equipment } = {}) {
  const all = areasFor(plan)
  const opt = timeOption(plan.minutes)
  const { easy } = blockInfo(plan.startedAt, now)
  const sessionAreas = areasThisSession(all, plan.minutes, plan.pointer || 0)
  const used = new Set()
  const items = []
  for (const areaId of sessionAreas) {
    const area = AREA_BY_ID[areaId]
    if (!area) continue
    const picks = pickMoves(area, { level: plan.level, rung: plan.rungs?.[areaId], flags: plan.flags, equipment, avoid: plan.avoid || [], prefer: plan.prefer })
    const ids = [picks.reps, picks.hold, picks.extra]
    // 25 & 40 min add a third move: the next rung's reps move.
    if (opt.third) {
      const nextReps = picks.repsLadder.find((id) => id !== picks.reps && !used.has(id) && !ids.includes(id))
      if (nextReps) ids.push(nextReps)
    }
    ids.forEach((id, i) => {
      if (!id || used.has(id)) return // a move shared by two areas runs once
      used.add(id)
      const dose = doseFor(id, { level: plan.level, state, flags: plan.flags || {}, easy, sets: opt.sets })
      items.push({ id, area: areaId, ...dose, extra: i >= 3, deeper: opt.deeper && dose.kind === 'hold' && !plan.flags?.bendy })
    })
  }
  return { areas: sessionAreas, items: fitToTime(items, opt.min), easy, get minutes() { return estimateMinutes(this.items) } }
}

// Keep the session inside the time chosen: drop the optional third moves
// first (last area first), then trim 3-set moves to 2. The core of each area
// — its reps move and its hold — always stays.
function fitToTime(items, minutes) {
  const out = [...items]
  const over = () => estimateMinutes(out) > minutes + 2
  for (let i = out.length - 1; i >= 0 && over(); i--) if (out[i].extra) out.splice(i, 1)
  for (let i = out.length - 1; i >= 0 && over(); i--) if (out[i].sets > 2) out[i] = { ...out[i], sets: 2 }
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
export function estimateMinutes(items) {
  const warm = 180
  return Math.round((warm + items.reduce((t, it) => t + itemSeconds(it), 0)) / 60)
}

// ---- Player steps -------------------------------------------------------
// The flat list the player walks through: warm-up, then each move's sets
// (left then right when one-sided), a short switch between sides, rest
// between sets, and a "how did it feel" after each move.
export function buildSteps(session) {
  const steps = [{ kind: 'warmup', sec: 180 }]
  session.items.forEach((item, idx) => {
    const m = MOVES[item.id]
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
    steps.push({ kind: 'feel', item: idx, id: item.id })
  })
  steps.push({ kind: 'done' })
  return steps
}

// ---- Progression -----------------------------------------------------------
// After a session, each move's feedback becomes its next dose. One lever at a
// time, and only after two good sessions in a row:
//   holds: time (+15 s up to the cap) → load (if it takes one) → "go deeper"
//   reps:  reps (+2 up to 12)          → load (if it takes one) → next rung
// "Too much" eases off one step; "sharp / tingling" removes the move.
// feedback: { feel: 'easy'|'good'|'much', sharp?, more?: boolean (reps), load? }
export const LOAD_STEP = { lbs: 5, kg: 2.5 }
const HOLD_CAP = 60
const REPS_CAP = 12

// The most a loaded spinal-flexion move should carry: ~10% of bodyweight in
// the first block, ~20% after. Unknown bodyweight: a small fixed cap.
export function loadCap(id, { bodyweight = 0, units = 'lbs', block = 1 } = {}) {
  if (!MOVES[id]?.flex) return Infinity
  const pct = block <= 1 ? 0.1 : 0.2
  if (bodyweight > 0) return Math.max(LOAD_STEP[units], Math.floor((bodyweight * pct) / LOAD_STEP[units]) * LOAD_STEP[units])
  return units === 'kg' ? (block <= 1 ? 5 : 10) : (block <= 1 ? 10 : 20)
}

export function progressMove(id, prev = {}, fb = {}, { easyWeek = false, units = 'lbs', bodyweight = 0, block = 1, bendy = false } = {}) {
  const m = MOVES[id]
  if (!m) return { state: prev, note: null }
  const s = { ...prev, last: Date.now() }
  if (fb.load != null) s.load = Number(fb.load) || 0
  const step = LOAD_STEP[units] || 5
  if (fb.sharp) return { state: s, note: 'removed', remove: true }
  if (easyWeek) return { state: { ...s, streak: 0 }, note: null }
  if (fb.feel === 'much') {
    s.streak = 0
    if (Number(s.load) > 0) { s.load = Math.max(0, s.load - step); return { state: s, note: 'lighter' } }
    if (m.kind === 'hold') { s.sec = Math.max(15, (Number(s.sec) || m.dose.some.sec) - 10); return { state: s, note: 'shorter' } }
    s.reps = Math.max(4, (Number(s.reps) || m.dose.some.reps) - 2)
    return { state: s, note: 'fewer' }
  }
  const good = fb.feel === 'good' || fb.feel === 'easy'
  const repsOk = m.kind === 'hold' || fb.more !== false
  if (!good || !repsOk) return { state: { ...s, streak: 0 }, note: null }
  s.streak = (Number(s.streak) || 0) + (fb.feel === 'easy' ? 2 : 1)
  if (s.streak < 2) return { state: s, note: null }
  s.streak = 0
  const canLoad = m.loadable !== 'none' && !(m.flex && (Number(s.load) || 0) + step > loadCap(id, { bodyweight, units, block }))
  if (m.kind === 'hold') {
    const cap = bendy ? 30 : HOLD_CAP
    const sec = Number(s.sec) || m.dose.some.sec
    if (sec < cap) { s.sec = Math.min(cap, sec + 15); return { state: s, note: 'longer' } }
    if (canLoad && m.loadable !== 'none') { s.load = (Number(s.load) || 0) + step; return { state: s, note: 'heavier' } }
    return { state: s, note: 'deeper' }
  }
  const reps = Number(s.reps) || m.dose.some.reps
  if (reps < REPS_CAP && !m.heavy) { s.reps = Math.min(REPS_CAP, reps + 2); return { state: s, note: 'more' } }
  if (canLoad) { s.load = (Number(s.load) || 0) + step; if (m.heavy || reps >= REPS_CAP) s.reps = Math.min(reps, m.dose.some.reps); return { state: s, note: 'heavier' } }
  return { state: s, note: 'ready_next' }
}

export const NOTE_TEXT = {
  longer: 'Next time: hold 15 s longer',
  heavier: 'Next time: a little more weight',
  more: 'Next time: 2 more reps',
  deeper: 'Next time: go a little deeper',
  lighter: 'Next time: a little lighter',
  shorter: 'Next time: a shorter hold',
  fewer: 'Next time: a couple fewer reps',
  removed: 'Taken out of your plan',
  ready_next: 'Ready for the next level',
}

// ---- Self-tests -----------------------------------------------------------
// Which tests a plan shows: one per goal (or per area when no goal was picked).
export function testsFor({ goals = [], areas = [] } = {}) {
  const out = []
  for (const g of goals) { const t = GOAL_BY_ID[g]?.test; if (t && TESTS[t] && !out.includes(t)) out.push(t) }
  for (const a of areas) { const t = AREA_BY_ID[a]?.test; if (t && TESTS[t] && !out.includes(t)) out.push(t) }
  return out.slice(0, 4)
}

// A logged value for one side: number, or { L, R }.
const valueOf = (v, side) => (v && typeof v === 'object' ? v[side] : v)

// Compare the latest result with the baseline, outside the day-to-day band.
// Returns { status: 'up'|'steady'|'down'|'none', delta, sides? }.
export function testProgress(testId, entries = []) {
  const t = TESTS[testId]
  if (!t || entries.length < 2) return { status: entries.length ? 'baseline' : 'none', delta: 0 }
  const first = entries[0].v
  const last = entries[entries.length - 1].v
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
const weekStart = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime() }
export function sessionsThisWeek(log = [], now = Date.now()) {
  const ws = weekStart(now)
  return log.filter((l) => new Date(l.d).getTime() >= ws).length
}
export function weekStreak(log = [], perWeek = 3, now = Date.now()) {
  let streak = 0
  let ws = weekStart(now) - 7 * DAY
  const count = (from) => log.filter((l) => { const t = new Date(l.d).getTime(); return t >= from && t < from + 7 * DAY }).length
  while (count(ws) >= perWeek) { streak++; ws -= 7 * DAY }
  if (count(weekStart(now)) >= perWeek) streak++
  return streak
}

// Is a next-day soreness check due? (12–48 h after the last session, once.)
export function sorenessDue(mob, now = Date.now()) {
  const last = mob?.log?.[mob.log.length - 1]
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
  const one = (n) => `${t.signed && n > 0 ? '+' : ''}${n} ${UNIT_WORD[t.unit]}`
  if (t.sides && typeof v === 'object') return `L ${one(v.L)} · R ${one(v.R)}`
  return one(v)
}

export { AREAS }
