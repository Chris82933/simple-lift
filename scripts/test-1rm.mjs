import { estimate1RM, roundTo, workingWeights, weightForReps, goalWorkingSets } from '../src/lib/oneRepMax.js'

const cases = [
  [225, 5], [185, 3], [135, 10], [315, 1], [100, 8],
]
console.log('=== Estimated 1RM (avg of Epley & Brzycki) ===')
for (const [w, r] of cases) {
  console.log(`  ${w} x ${r}  → ~${roundTo(estimate1RM(w, r), 5)} (epley ${roundTo(estimate1RM(w,r,'epley'),1)}, brzycki ${roundTo(estimate1RM(w,r,'brzycki'),1)})`)
}

console.log('\n=== Working weights off a 300 lb 1RM ===')
for (const row of workingWeights(300, 5)) console.log(`  ${row.pct}% (~${row.reps} reps): ${row.weight}`)

console.log('\n=== weightForReps(300, n) ===')
for (const n of [1, 3, 5, 8, 10, 12]) console.log(`  ${n} reps → ${weightForReps(300, n, 5)}`)

console.log('\n=== Goal working sets off 300 ===')
for (const g of goalWorkingSets(300, 5)) console.log(`  ${g.goal} (${g.reps}): ${g.weight}`)

console.log('\n=== Edge cases ===')
console.log('  empty:', estimate1RM('', 5), '| 1 rep @225:', estimate1RM(225, 1), '| 0 reps:', estimate1RM(225, 0))
