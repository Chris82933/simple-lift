import { evaluateProgression, applyStage, stageNote } from '../src/lib/gzclp.js'

const squat = { id: 'back_squat', name: 'Squat', pattern: 'squat', regions: ['legs', 'core'], progression: { scheme: 't1', stage: 0, weight: 185 } }
const bench = { id: 'bench_press', name: 'Bench', pattern: 'horiz_push', regions: ['chest', 'arms'], progression: { scheme: 't2', stage: 0, weight: 135 } }
const pulldown = { id: 'lat_pulldown', name: 'Lat Pulldown', pattern: 'vert_pull', regions: ['back'], progression: { scheme: 't3', stage: 0, weight: 90 } }

const sets = (n, reps, weight, done = true) => Array.from({ length: n }, () => ({ weight, reps, done }))

const show = (label, ex, logged) => {
  const r = evaluateProgression(ex, logged, 'lbs')
  console.log(`\n${label}`)
  console.log('  before:', stageNote(ex))
  console.log('  →', r.message)
  console.log('  next progression:', JSON.stringify(r.progression))
}

console.log('===== T1 (Squat, lower body, +10 lb) =====')
show('Hit 5×3 (success)', squat, sets(5, 3, 185))
show('Missed (3 sets only) → drop to Stage 2 (6×2)', squat, sets(3, 3, 185))
show('Stage 3 fail → reset', { ...squat, progression: { scheme: 't1', stage: 2, weight: 185 } }, sets(4, 1, 185))

console.log('\n===== T2 (Bench, upper, +5 lb) =====')
show('Hit 3×10 (success)', bench, sets(3, 10, 135))
show('Missed 3×10 → drop to 3×8', bench, sets(3, 7, 135))

console.log('\n===== T3 (Lat Pulldown, AMRAP→25) =====')
show('Last set 26 reps → +5 lb', pulldown, [...sets(2, 15, 90), { weight: 90, reps: 26, done: true }])
show('Last set 18 reps → hold', pulldown, [...sets(2, 15, 90), { weight: 90, reps: 18, done: true }])

console.log('\n===== Stage display after a success/fail =====')
const dropped = applyStage({ ...squat, progression: { scheme: 't1', stage: 1, weight: 185 } })
console.log('  Stage 2 applied:', dropped.sets, 'x', dropped.repHigh, '(amrap', dropped.amrap + ')')
