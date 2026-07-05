// Progression styles a custom program can use to decide how to get stronger.
// The method drives *which* option is recommended after a session (and, for
// some methods, when a progression is even offered). It only affects generic
// (non-scheme) lifts — GZCLP/LP/Greyskull templates keep their own engines.

export const DEFAULT_METHOD = 'double'

export const PROGRESSION_METHODS = [
  {
    id: 'double',
    name: 'Double progression',
    recommended: true,
    tagline: 'Add reps, then weight',
    how: 'Work inside your rep range. When you hit the top of the range on every set, add a little weight next time and drop back to the bottom — then climb again.',
    pros: [
      'Works for any goal and any lift',
      'Forgiving — you earn the weight with reps first',
      'No need to know your 1RM',
    ],
    cons: [
      'A touch slower on the big barbell lifts than pure linear',
      'Progress isn’t on a fixed schedule',
    ],
  },
  {
    id: 'linear',
    name: 'Linear progression',
    tagline: 'Add weight every session',
    how: 'Add a fixed amount of weight every session you complete your sets. Simple and fast — if you stall on a lift for a few sessions, drop back ~10% and build up again.',
    pros: [
      'Fastest gains for beginners',
      'Dead simple — just add weight',
      'Great on the main barbell lifts',
    ],
    cons: [
      'Stalls within weeks to months',
      'Best with fixed reps, not wide ranges',
      'Needs deloads once you stall',
    ],
  },
  {
    id: 'rpe',
    name: 'RPE / autoregulation',
    tagline: 'Progress by how hard it felt',
    how: 'Rate how hard the session was afterwards. Felt easy? Add weight. Just right? Add a rep. Hard? Repeat it. Maxed out? Hold or back off — so training bends to how you feel day to day.',
    pros: [
      'Adapts to sleep, stress, and recovery',
      'Fewer failed sessions and less burnout',
      'Used by many strength coaches',
    ],
    cons: [
      'Takes practice to rate effort honestly',
      'Less predictable week to week',
      'Overkill for a total beginner',
    ],
  },
  {
    id: 'manual',
    name: 'Manual',
    tagline: 'You decide each time',
    how: 'After a workout the app simply offers the choices — add weight, add a rep, or keep the same — and you pick. No automatic recommendation.',
    pros: [
      'Full control',
      'Good if you already know how you want to progress',
    ],
    cons: [
      'No guidance — it’s on you to progress sensibly',
    ],
  },
]

export const METHOD_BY_ID = Object.fromEntries(PROGRESSION_METHODS.map((m) => [m.id, m]))
export const methodName = (id) => METHOD_BY_ID[id]?.name || 'Manual'

// Resolve the method a program uses (existing custom programs default to the
// recommended method; templates/generated fall back to manual behaviour).
export function methodFor(program) {
  if (program?.progressionMethod) return program.progressionMethod
  return program?.source === 'custom' ? DEFAULT_METHOD : 'manual'
}

// The choice to flag as ★ recommended, given the method, a suggestion, and the
// session difficulty (used by RPE). Returns 'keep' | 'reps' | `w${inc}` | null.
// null = no method opinion → fall back to the lift-standard increment.
export function recommendChoice(method, sug, difficulty) {
  if (!sug || sug.type === 'levelUp') return null
  const wKey = sug.type === 'load' && sug.recommendedInc ? `w${sug.recommendedInc}` : null
  const repKey = sug.reps ? 'reps' : null

  if (method === 'rpe') {
    if (!difficulty) return null // wait until they rate how it felt
    if (difficulty === 'easy') return wKey || repKey || 'keep'
    if (difficulty === 'moderate') return repKey || wKey || 'keep'
    return 'keep' // hard / maxed → hold
  }
  if (method === 'linear') return wKey || repKey || 'keep'
  if (method === 'double') {
    // At the top of the range → add weight; still building reps → add a rep.
    return sug.hitTop ? (wKey || repKey || 'keep') : (repKey || 'keep')
  }
  return null // manual
}

// A short "why" line for the completion screen.
export function recommendReason(method, difficulty) {
  if (method === 'manual') return null
  if (method === 'rpe') {
    if (!difficulty) return 'RPE method — rate how it felt above and we’ll star the recommended step.'
    return {
      easy: 'Felt easy — the method says add weight.',
      moderate: 'Just right — add a rep and keep building.',
      hard: 'That was hard — repeat it and own it.',
      maxed: 'Maxed out — hold the weight (or back off a touch).',
    }[difficulty] || null
  }
  if (method === 'linear') return 'Linear progression — add weight each session; if you stall, drop back ~10%.'
  return 'Double progression — add weight once you top the rep range, then reset the reps.'
}
