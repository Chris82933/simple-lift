// Share one program as a copy-paste code, and import someone else's as a NEW
// program (never overwriting anything the importer already has).
//
// A shared program is just its structure — days, exercises, sets/reps/rest, and
// how it progresses. On import the recipient chooses what to carry over, because
// the sharer's *numbers* are theirs: their starting weights and training max are
// meaningless for a different lifter, and are blanked by default.
import { EXERCISE_BY_ID } from '../data/exercises.js'
import { encodeGzip, decodeGzip, hasCompression } from './codec.js'

const SHARE_PREFIX = 'SLPROG1:'

// Fields that are private to the sharer or specific to their install, stripped
// before a program ever leaves the device.
const PRIVATE_PROGRAM_FIELDS = ['id', 'createdAt', 'updatedAt']

// The scheme each progression starts from, so "start fresh" is a real reset
// rather than a guess. Weights are cleared separately by the weights option.
function freshProgression(p) {
  if (!p || !p.scheme) return p
  switch (p.scheme) {
    case 't1': case 't2': case 't3':
      return { scheme: p.scheme, stage: 0, weight: null }
    case '531':
      return { scheme: '531', week: 0, cycle: 0, tm: null }
    case 'lp': case 'gslp':
      return { scheme: p.scheme, weight: null, fails: 0 }
    default:
      return { ...p }
  }
}

// Remove every loading number so the importer fills in their own.
function stripWeights(p) {
  if (!p) return p
  const out = { ...p }
  if ('weight' in out) out.weight = null
  if ('tm' in out) out.tm = null
  if ('stage1Weight' in out) out.stage1Weight = null
  return out
}

// A sensible weekly spread when the importer opts to set their own schedule.
const DEFAULT_DAYS = { 1: [3], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6] }

export const IMPORT_DEFAULTS = { weights: 'blank', progress: 'fresh', schedule: 'theirs' }

// ---- Export ----

// The shareable shape: the program minus anything private. The GZCLP wizard
// stashes the sharer's actual 1RMs in gzclp.maxes — never share those.
export function shareableProgram(program) {
  const clone = JSON.parse(JSON.stringify(program))
  for (const f of PRIVATE_PROGRAM_FIELDS) delete clone[f]
  if (clone.gzclp) delete clone.gzclp.maxes
  if (clone.schedule) delete clone.schedule.pointer
  return clone
}

export async function encodeProgramCode(program) {
  if (!hasCompression()) {
    throw new Error('This browser is too old to create a share code. Try a newer browser or device.')
  }
  const payload = { v: 1, program: shareableProgram(program) }
  return SHARE_PREFIX + (await encodeGzip(payload))
}

// ---- Import ----

export function isProgramCode(code) {
  return typeof code === 'string' && code.trim().startsWith(SHARE_PREFIX)
}

// Decode a code to the shared program. Throws a friendly Error otherwise.
export async function decodeProgramCode(code) {
  if (!code || typeof code !== 'string') throw new Error('Paste a program code first.')
  const trimmed = code.trim()
  if (!trimmed.startsWith(SHARE_PREFIX)) {
    throw new Error('That doesn’t look like a program share code.')
  }
  if (!hasCompression()) {
    throw new Error('This browser is too old to read a share code. Try a newer browser or device.')
  }
  const body = trimmed.slice(SHARE_PREFIX.length).replace(/\s+/g, '')
  let payload
  try {
    payload = await decodeGzip(body)
  } catch {
    throw new Error('That code is incomplete or corrupted. Copy the whole thing and try again.')
  }
  const program = payload?.program
  if (!program || !Array.isArray(program.days) || program.days.length === 0) {
    throw new Error('That code doesn’t contain a program.')
  }
  return program
}

// A compact description for the import preview, so the recipient knows what
// they're about to add before they add it.
export function summarizeProgram(program) {
  const exercises = new Set()
  let unknown = 0
  for (const day of program.days || []) {
    for (const ex of day.exercises || []) {
      exercises.add(ex.id)
      if (!EXERCISE_BY_ID[ex.id]) unknown += 1
    }
  }
  const schemes = new Set()
  for (const day of program.days || []) {
    for (const ex of day.exercises || []) {
      if (ex.progression?.scheme) schemes.add(ex.progression.scheme)
    }
  }
  return {
    name: program.name || 'Shared program',
    days: program.days.length,
    exercises: exercises.size,
    unknown, // exercises this app version doesn't recognise
    hasWeights: (program.days || []).some((d) => (d.exercises || []).some(
      (e) => Number(e.startWeight) > 0 || Number(e.progression?.weight) > 0 || Number(e.progression?.tm) > 0,
    )),
    schemes: [...schemes],
  }
}

// Turn a decoded shared program into one ready for addProgram, applying the
// recipient's import choices. Always returns a fresh object with NO id — the
// caller's addProgram assigns one, guaranteeing a brand-new program.
export function buildImportedProgram(shared, opts = {}, existingNames = []) {
  const { weights, progress, schedule } = { ...IMPORT_DEFAULTS, ...opts }
  const clone = JSON.parse(JSON.stringify(shared))
  for (const f of PRIVATE_PROGRAM_FIELDS) delete clone[f]
  if (clone.gzclp) delete clone.gzclp.maxes

  clone.days = (clone.days || []).map((day) => ({
    ...day,
    exercises: (day.exercises || []).map((ex) => {
      const out = { ...ex }
      if (weights === 'blank') out.startWeight = ''
      if (out.progression) {
        let p = progress === 'fresh' ? freshProgression(out.progression) : { ...out.progression }
        if (weights === 'blank') p = stripWeights(p)
        out.progression = p
      }
      return out
    }),
  }))

  // Schedule: keep theirs (minus their place in the rotation), or reset to a
  // neutral spread the recipient can edit.
  if (schedule === 'mine') {
    const mode = clone.schedule?.mode || 'rotation'
    clone.schedule = { mode, trainingDays: DEFAULT_DAYS[clone.days.length] || [1, 3, 5] }
  } else if (clone.schedule) {
    delete clone.schedule.pointer
  }

  // Imported programs are the recipient's to edit.
  clone.source = 'custom'
  delete clone.setupPath
  delete clone.setupLabel

  // Never silently look like an existing program. If the name is taken, tag it.
  let name = clone.name || 'Shared program'
  if (existingNames.includes(name)) {
    let n = 2
    while (existingNames.includes(`${name} (${n})`)) n += 1
    name = `${name} (${n})`
  }
  clone.name = name
  return clone
}
