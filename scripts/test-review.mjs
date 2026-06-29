import { reviewSession, applyChoices } from '../src/lib/sessionReview.js'

const sets = (n, reps, weight, done) => Array.from({ length: n }, () => ({ weight: String(weight), reps: String(reps), done }))

const squatGz = { id: 'back_squat', name: 'Squat', pattern: 'squat', regions: ['legs'], load: true, sets: 5, repLow: 3, repHigh: 3, amrap: true, progression: { scheme: 't1', stage: 0, weight: 185 } }
const dbCurl = { id: 'db_curl', name: 'Curl', pattern: 'biceps', regions: ['arms'], load: true, sets: 3, repLow: 12, repHigh: 12 }
const pushup = { id: 'pushup', name: 'Push-Up', pattern: 'horiz_push', regions: ['chest'], load: false, sets: 3, repLow: 12, repHigh: 12, nextId: 'decline_pushup' }

const run = (label, session, setsMap, goals) => {
  const r = reviewSession(session, setsMap, goals, 'lbs')
  console.log(`\n${label}`)
  console.log('  persist:', JSON.stringify(r.persist))
  console.log('  autoNotes:', r.autoNotes)
  console.log('  suggestions:', r.suggestions.map((s) => ({ name: s.name, kind: s.kind, def: s.goalDefault, weight: s.weight, reps: s.reps })))
}

console.log('========= THE BUG: entered weight, nothing ticked =========')
run('Squat 185 entered, 0 done → keep weight, no deload, no suggestion', { exercises: [squatGz] }, { back_squat: sets(5, 3, 185, false) }, ['strength'])

console.log('\n========= GZCLP complete → increase is a SUGGESTION =========')
run('Squat 5×3 all done → suggest +10 (not auto)', { exercises: [squatGz] }, { back_squat: sets(5, 3, 185, true) }, ['strength'])

console.log('\n========= GZCLP genuine miss (some done) → auto deload =========')
run('Squat only 3 of 5 done → deload note', { exercises: [squatGz] }, { back_squat: sets(3, 3, 185, true) }, ['strength'])

console.log('\n========= Generic, goal default =========')
run('Curl complete, STRENGTH goal → default weight', { exercises: [dbCurl] }, { db_curl: sets(3, 12, 30, true) }, ['strength'])
run('Curl complete, ENDURANCE goal → default reps', { exercises: [dbCurl] }, { db_curl: sets(3, 12, 30, true) }, ['endurance'])

console.log('\n========= Bodyweight ladder → level-up suggestion =========')
run('Push-Up owned → levelUp suggestion', { exercises: [pushup] }, { pushup: sets(3, 12, 0, true) }, ['general'])

console.log('\n========= applyChoices =========')
const prog = { days: [{ exercises: [{ ...dbCurl, startWeight: 30 }] }] }
const r = reviewSession(prog.days[0], { db_curl: sets(3, 12, 30, true) }, ['strength'], 'lbs')
const afterWeight = applyChoices(prog, 0, r.suggestions, { db_curl: 'weight' })
const afterReps = applyChoices(prog, 0, r.suggestions, { db_curl: 'reps' })
console.log('  choose weight → startWeight:', afterWeight.days[0].exercises[0].startWeight)
console.log('  choose reps   → repHigh:', afterReps.days[0].exercises[0].repHigh)
