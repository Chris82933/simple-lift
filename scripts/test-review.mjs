import { reviewSession, applyChoices, recommendedInc } from '../src/lib/sessionReview.js'

const sets = (n, reps, weight, done) => Array.from({ length: n }, () => ({ weight: String(weight), reps: String(reps), done }))

const squatGz = { id: 'back_squat', name: 'Squat', pattern: 'squat', regions: ['legs'], compound: true, load: true, sets: 5, repLow: 3, repHigh: 3, amrap: true, progression: { scheme: 't1', stage: 0, weight: 185 } }
const dbCurl = { id: 'db_curl', name: 'Curl', pattern: 'biceps', regions: ['arms'], compound: false, load: true, sets: 3, repLow: 12, repHigh: 12 }
const bench = { id: 'bench_press', name: 'Bench', pattern: 'horiz_push', regions: ['chest'], compound: true, load: true, sets: 3, repLow: 8, repHigh: 8 }

console.log('=== Recommended increments (lbs) ===')
console.log('  squat (lower main):', recommendedInc(squatGz, 'lbs'))
console.log('  bench (upper main):', recommendedInc(bench, 'lbs'))
console.log('  curl  (isolation):', recommendedInc(dbCurl, 'lbs'))
console.log('  squat (kg):', recommendedInc(squatGz, 'kg'))

const run = (label, ex, setsArr, goals = ['general']) => {
  const r = reviewSession({ exercises: [ex] }, { [ex.id]: setsArr }, goals, 'lbs')
  console.log(`\n${label}`)
  console.log('  suggestions:', JSON.stringify(r.suggestions))
  console.log('  autoNotes:', r.autoNotes)
  return r
}

run('Squat 5×3 done → load suggestion base 185, rec 10', squatGz, sets(5, 3, 185, true))
run('Curl 3×12 done → load suggestion base 30, rec 2.5, has reps', dbCurl, sets(3, 12, 30, true))
run('Curl incomplete (0 done) → no suggestion', dbCurl, sets(3, 12, 30, false))

console.log('\n=== applyChoices: default keep does nothing ===')
const prog = { days: [{ exercises: [{ ...dbCurl, startWeight: 30 }] }] }
const r = reviewSession(prog.days[0], { db_curl: sets(3, 12, 30, true) }, ['general'], 'lbs')
console.log('  keep   → startWeight:', applyChoices(prog, 0, r.suggestions, { db_curl: 'keep' }).days[0].exercises[0].startWeight)
console.log('  +2.5   → startWeight:', applyChoices(prog, 0, r.suggestions, { db_curl: 'w2.5' }).days[0].exercises[0].startWeight)
console.log('  +5     → startWeight:', applyChoices(prog, 0, r.suggestions, { db_curl: 'w5' }).days[0].exercises[0].startWeight)
console.log('  +10    → startWeight:', applyChoices(prog, 0, r.suggestions, { db_curl: 'w10' }).days[0].exercises[0].startWeight)
console.log('  reps   → repHigh:', applyChoices(prog, 0, r.suggestions, { db_curl: 'reps' }).days[0].exercises[0].repHigh)

console.log('\n=== GZCLP apply +5 keeps stage, sets weight ===')
const gprog = { days: [{ exercises: [{ ...squatGz }] }] }
const gr = reviewSession(gprog.days[0], { back_squat: sets(5, 3, 185, true) }, ['strength'], 'lbs')
const after = applyChoices(gprog, 0, gr.suggestions, { back_squat: 'w5' }).days[0].exercises[0]
console.log('  +5 → weight:', after.progression.weight, 'stage:', after.progression.stage)
