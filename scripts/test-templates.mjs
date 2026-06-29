import { EXERCISE_BY_ID, LADDERS } from '../src/data/exercises.js'
import { TEMPLATES, instantiateTemplate } from '../src/data/templates.js'

let problems = 0

// 1) Ladder links: every order id resolves, and next/prev are stitched.
console.log('=== Ladders ===')
for (const ladder of LADDERS) {
  const names = ladder.order.map((id) => {
    const ex = EXERCISE_BY_ID[id]
    if (!ex) { problems++; return `MISSING(${id})` }
    return ex.name
  })
  console.log(`  ${ladder.name}: ${names.join('  →  ')}`)
  // verify nextId chain on first/last
  const first = EXERCISE_BY_ID[ladder.order[0]]
  const last = EXERCISE_BY_ID[ladder.order.at(-1)]
  if (first && first.nextId !== ladder.order[1]) { console.log('   !! first.nextId wrong'); problems++ }
  if (last && last.nextId !== null) { console.log('   !! last.nextId should be null'); problems++ }
}

// 2) Templates: every exercise resolves; instantiate works.
console.log('\n=== Templates ===')
for (const t of TEMPLATES) {
  console.log(`\n  ${t.name}  [${t.schedule.mode}, days=${t.schedule.trainingDays}]`)
  for (const d of t.days) {
    console.log(`    ${d.title}: ${d.exercises.map((e) => `${e.name}(${e.sets}x${e.repLow}-${e.repHigh})`).join(', ')}`)
    for (const e of d.exercises) {
      if (!EXERCISE_BY_ID[e.id]) { console.log(`     !! unknown exercise ${e.id}`); problems++ }
    }
  }
  const inst = instantiateTemplate(t.templateId)
  if (!inst || !inst.days?.length) { console.log('   !! instantiate failed'); problems++ }
  if (inst.templateId || inst.description) { console.log('   !! instantiate left template-only fields'); problems++ }
}

console.log(problems === 0 ? '\nALL OK' : `\n${problems} PROBLEM(S)`)
