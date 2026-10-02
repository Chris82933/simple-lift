// Turn a program typed or pasted as plain text into a real program.
//
// People keep their training in notes apps, spreadsheets and forum posts, in
// roughly this shape:
//
//   Upper A
//   Bench Press 4x6-8
//   Barbell Row - 4 x 6-8 @ 135
//   3x10 Dumbbell Curl
//
//   Lower A
//   Squat: 3 sets of 5
//
// Nothing here is clever: a line with a sets × reps pattern is an exercise, any
// other line with words on it starts a new day. Names are matched to the
// library by name, then alias, then a typo-tolerant pass; anything that still
// doesn't match is kept under the name as written, so nothing typed is lost.
import { EXERCISES, EXERCISE_BY_ID, matchInfo } from '../data/exercises.js'
import { exerciseEntryFromLibrary } from './exerciseEntry.js'
import { prescriptionFor, schemeForGoals } from '../data/schemes.js'
import { DEFAULT_METHOD } from './progressionMethods.js'
import { WEEKDAY_LABELS } from './generator.js'

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const X = '(?:x|×|\\*|by)'
// name … 4x6-8   |   name: 3 sets of 5   |   name 3 sets x 10
const NAME_FIRST = new RegExp(
  `^(.+?)[\\s:,\\-–—(]*?(\\d{1,2})\\s*(?:sets?\\s*(?:of|${X})?|${X})\\s*(\\d{1,3})(?:\\s*(?:-|–|—|to)\\s*(\\d{1,3}))?(\\+)?(.*)$`, 'i',
)
// 4x6-8 name
const SETS_FIRST = new RegExp(`^(\\d{1,2})\\s*${X}\\s*(\\d{1,3})(?:\\s*(?:-|–|—|to)\\s*(\\d{1,3}))?(\\+)?\\s+(.+)$`, 'i')
const WEIGHT = /(?:@|at)?\s*(\d{2,4}(?:\.\d+)?)\s*(?:lbs?|kg|kgs|#)\b|@\s*(\d{2,4}(?:\.\d+)?)/i

const clean = (s) => s.replace(/^[\s\-*•·>]+/, '').replace(/^\d+[.)]\s+/, '').replace(/[\s:,\-–—(]+$/, '').trim()

// Best library match for a name as typed, or null.
export function findExercise(name) {
  const q = name.trim().toLowerCase()
  if (!q) return null
  const pool = EXERCISES.filter((e) => !e.ladderOnly)
  const exact = pool.find((e) => e.name.toLowerCase() === q)
  if (exact) return exact
  const alias = pool.find((e) => (e.aliases || []).includes(q))
  if (alias) return alias
  // A bare lift name means the standard version of it.
  if (BARE[q] && EXERCISE_BY_ID[BARE[q]]) return EXERCISE_BY_ID[BARE[q]]
  // Otherwise rank the hits: a match in the NAME beats one in an alias ("squat"
  // is in Wall Sit's aliases), a compound beats an accessory, and a shorter
  // name is the less specific — more likely intended — variation.
  const hits = pool.map((e) => ({ e, via: matchInfo(e, q).via })).filter((h) => h.via)
  if (!hits.length) return null
  const rank = { name: 0, alias: 1, fuzzy: 2 }
  hits.sort((a, b) => rank[a.via] - rank[b.via] || Number(!!b.e.compound) - Number(!!a.e.compound) || a.e.name.length - b.e.name.length)
  return hits[0].e
}

const BARE = {
  squat: 'back_squat', squats: 'back_squat', bench: 'bench_press', row: 'barbell_row', rows: 'barbell_row',
  press: 'overhead_press', ohp: 'overhead_press',
}

export function parseTextProgram(text, { goals = ['general'] } = {}) {
  const scheme = schemeForGoals(goals)
  const days = []
  const unknownNames = []
  let current = null
  const startDay = (title) => {
    current = { title: title || `Day ${days.length + 1}`, exercises: [] }
    days.push(current)
  }

  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || !/[a-z]/i.test(line)) continue

    let name; let sets; let lo; let hi; let amrap; let rest = ''
    const sf = clean(line).match(SETS_FIRST)
    const nf = sf ? null : clean(line).match(NAME_FIRST)
    if (sf) {
      [, sets, lo, hi, amrap, name] = sf
      const w = name.match(WEIGHT)
      if (w) { rest = w[0]; name = name.replace(w[0], '') }
    } else if (nf) {
      [, name, sets, lo, hi, amrap, rest] = nf
    } else {
      // Not an exercise: a heading. "Day 1 - Push:" → "Day 1 - Push".
      startDay(clean(line).slice(0, 60))
      continue
    }
    name = clean(name)
    if (!name) continue
    if (!current) startDay('')

    const lib = findExercise(name)
    const nSets = Math.min(30, Math.max(1, Number(sets)))
    const repLow = Math.max(1, Number(lo))
    const repHigh = Math.max(repLow, Number(hi || lo))
    const w = (rest || '').match(WEIGHT)
    const startWeight = w ? String(w[1] || w[2]) : ''
    if (lib) {
      if (current.exercises.some((e) => e.id === lib.id)) continue // one of each per day
      current.exercises.push(exerciseEntryFromLibrary(lib, {
        sets: nSets, repLow, repHigh, restSec: prescriptionFor(lib, scheme).restSec,
        startWeight: lib.load === false ? '' : startWeight,
        amrap: amrap ? true : undefined,
      }))
    } else {
      const id = 'text_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
      if (EXERCISE_BY_ID[id] || current.exercises.some((e) => e.id === id)) continue
      if (!unknownNames.includes(name)) unknownNames.push(name)
      current.exercises.push({
        id, name, pattern: 'other', regions: [], compound: false, load: true, cues: '',
        ladderId: null, nextId: null, prevId: null,
        sets: nSets, repLow, repHigh, restSec: 90, startWeight, amrap: amrap ? true : undefined,
      })
    }
  }

  const kept = days.filter((d) => d.exercises.length > 0)
  const exerciseCount = kept.reduce((n, d) => n + d.exercises.length, 0)
  if (!exerciseCount) return { program: null, exerciseCount: 0, unknownNames: [] }
  // A lone heading above everything is the program's name, not a day.
  const first = days[0]
  const programName = first && first.exercises.length === 0 && days.length > 1 ? first.title : 'Imported program'
  return {
    exerciseCount,
    unknownNames,
    program: {
      name: programName,
      source: 'custom',
      goals,
      progressionMethod: DEFAULT_METHOD,
      days: kept.map((d, i) => ({
        weekday: WEEKDAY_ORDER[i % 7],
        dayLabel: WEEKDAY_LABELS[WEEKDAY_ORDER[i % 7]],
        title: d.title,
        note: 'Imported from text.',
        regions: [...new Set(d.exercises.flatMap((e) => e.regions || []))],
        cardio: [],
        exercises: d.exercises,
      })),
    },
  }
}
