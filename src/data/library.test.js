// Whole-library integrity. These are the invariants that are easy to break by
// adding one exercise and impossible to notice by reading the diff.
import { describe, it, expect } from 'vitest'
import { EXERCISES, EXERCISE_BY_ID, matchInfo, musclesFor, tracksLoad } from './exercises.js'
import { EQUIPMENT_GROUPS } from './options.js'

const EQUIPMENT_IDS = new Set(EQUIPMENT_GROUPS.flatMap((g) => g.items.map((i) => i.id)))

describe('library integrity', () => {
  it('has no duplicate ids', () => {
    const seen = new Set()
    const dupes = []
    for (const ex of EXERCISES) {
      if (seen.has(ex.id)) dupes.push(ex.id)
      seen.add(ex.id)
    }
    expect(dupes).toEqual([])
  })

  it('has no two exercises sharing a display name', () => {
    // The pickers dedupe on lowercased name, so a duplicate silently hides one
    // of the two — you would only find out when a search never returns it.
    const byName = new Map()
    const clashes = []
    for (const ex of EXERCISES) {
      const key = ex.name.toLowerCase()
      if (byName.has(key)) clashes.push(`${ex.name}: ${byName.get(key)} vs ${ex.id}`)
      byName.set(key, ex.id)
    }
    expect(clashes).toEqual([])
  })

  it('only requires equipment the setup screen actually offers', () => {
    // A typo here makes the move unreachable in every gym: isDoable() filters on
    // the active equipment set, and an id nobody can own is never in it.
    const bad = []
    for (const ex of EXERCISES) {
      for (const req of ex.requires || []) {
        if (!EQUIPMENT_IDS.has(req)) bad.push(`${ex.id} → "${req}"`)
      }
    }
    expect(bad).toEqual([])
  })
})

describe('every equipment option leads somewhere', () => {
  // Ticking a box in setup and getting nothing back is a dead end. The Smith
  // machine was exactly that until the machine exercises were added: offered in
  // the list, zero exercises requiring it.
  //
  // These three are still empty and are listed here deliberately, so the gap is
  // visible and a NEW one fails the test rather than going unnoticed. Delete an
  // entry from this list the moment that equipment gets an exercise.
  const KNOWN_EMPTY = ['plates', 'trx', 'med_ball']

  const countFor = (id) => EXERCISES.filter((e) => (e.requires || []).includes(id)).length

  it.each([...EQUIPMENT_IDS].filter((id) => !KNOWN_EMPTY.includes(id)))(
    '%s has at least one exercise',
    (id) => { expect(countFor(id)).toBeGreaterThan(0) },
  )

  it('the documented-empty list is still accurate', () => {
    // Stops the list rotting into a permanent excuse: if one of these picks up
    // an exercise, this fails and the entry has to come out.
    for (const id of KNOWN_EMPTY) {
      expect(countFor(id), `${id} now has exercises — remove it from KNOWN_EMPTY`).toBe(0)
    }
  })
})

describe('gym machines', () => {
  const MACHINES = [
    'hip_abduction', 'hip_adduction', 'chest_press_machine', 'seated_row_machine',
    'reverse_pec_deck', 'preacher_curl_machine', 'machine_triceps_extension',
    'ab_crunch_machine', 'seated_calf_raise', 'standing_calf_raise', 'calf_press',
    'cable_kickback', 'smith_squat', 'smith_bench', 'smith_row',
  ]

  it.each(MACHINES)('%s exists and tracks a weight', (id) => {
    expect(EXERCISE_BY_ID[id], id).toBeTruthy()
    // Every one of these is a stack or a loaded bar, so the log must offer a
    // weight box — none of them are bodyweight moves.
    expect(tracksLoad(EXERCISE_BY_ID[id])).toBe(true)
  })

  // People look for these by the body part they believe the machine is for, or
  // by gym slang — rarely by the name printed on the frame.
  it.each([
    ['abductor machine', 'hip_abduction'],
    ['outer thigh', 'hip_abduction'],
    ['inner thigh', 'hip_adduction'],
    ['adductor', 'hip_adduction'],
    ['rear delt fly', 'reverse_pec_deck'],
    ['preacher curl', 'preacher_curl_machine'],
    ['chest press', 'chest_press_machine'],
    ['seated calf', 'seated_calf_raise'],
    ['crunch machine', 'ab_crunch_machine'],
    ['glute kickback', 'cable_kickback'],
    ['smith squat', 'smith_squat'],
  ])('searching %s finds %s', (query, id) => {
    const hits = EXERCISES.filter((e) => matchInfo(e, query).match).map((e) => e.id)
    expect(hits).toContain(id)
  })

  it('puts hip abduction on the glutes, not the lower back', () => {
    // It carries the `hinge` pattern so the generator treats it as posterior-chain
    // accessory work, but that pattern's default muscles are hamstrings + lower
    // back — wrong for what is purely a glute medius move. An override fixes it,
    // and this is the test that notices if the override is ever dropped.
    expect(EXERCISE_BY_ID.hip_abduction.pattern).toBe('hinge')
    const m = musclesFor(EXERCISE_BY_ID.hip_abduction)
    expect(m.primary).toEqual(['glutes'])
    expect([...m.primary, ...m.secondary]).not.toContain('lower_back')
  })

  it('keeps isolation machines out of the main-lift slots', () => {
    // The generator adds +1.5 to a compound's score, so anything marked
    // compound:false fills an accessory slot instead of displacing a squat.
    for (const id of ['hip_abduction', 'hip_adduction', 'reverse_pec_deck', 'ab_crunch_machine']) {
      expect(EXERCISE_BY_ID[id].compound, id).toBe(false)
    }
    // The pressing/rowing machines are genuine compounds and should score as such.
    for (const id of ['chest_press_machine', 'seated_row_machine', 'smith_squat', 'smith_bench']) {
      expect(EXERCISE_BY_ID[id].compound, id).toBe(true)
    }
  })
})
