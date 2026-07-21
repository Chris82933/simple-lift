// Training-location equipment profiles (Home vs Gym) + exercise substitution.
//
// Each profile is a set of available equipment ids. The active profile drives
// what's offered in the mid-workout picker and lets the live workout swap any
// exercise you can't do right now for the best same-movement alternative you
// can. Profiles live in settings, so they ride along with export/import and
// cloud sync automatically.

import { EQUIPMENT_GROUPS } from '../data/options.js'
import { EXERCISES, EXERCISE_BY_ID } from '../data/exercises.js'
import { loadSettings, saveSettings } from './storage.js'

export const ALL_EQUIPMENT_IDS = EQUIPMENT_GROUPS.flatMap((g) => g.items.map((i) => i.id))
const HOME_DEFAULT = ['dumbbells', 'bands', 'pullup_bar', 'adj_bench']

export const PROFILE_IDS = ['gym', 'home']
const PROFILE_META = {
  gym: { name: 'Gym', icon: '🏋️' },
  home: { name: 'Home', icon: '🏠' },
}
export const profileMeta = (id) => PROFILE_META[id] || { name: id, icon: '' }

const EQUIP_LABEL = Object.fromEntries(
  EQUIPMENT_GROUPS.flatMap((g) => g.items.map((i) => [i.id, i.label])),
)
export const equipmentLabel = (id) => EQUIP_LABEL[id] || id

// Owning a piece of gear isn't the same as owning enough of it. "I have
// dumbbells but not enough weight to load a pull-up" was previously
// unrepresentable: the model was purely binary, so the app kept prescribing
// weighted pull-ups to someone whose heaviest dumbbell was 20 lb.
//
// Capacity records the heaviest load each gear type can actually supply, per
// profile, in the user's units. Anything left blank means "not specified" and is
// treated as unlimited — so this changes nothing for anyone who ignores it.
export const LOAD_SOURCES = [
  { id: 'dumbbells', label: 'Heaviest dumbbell', hint: 'Per hand.' },
  { id: 'kettlebells', label: 'Heaviest kettlebell', hint: '' },
  { id: 'plates', label: 'Total plate weight', hint: 'Everything you own, added up.' },
  { id: 'weight_belt', label: 'Weight you can hang', hint: 'Belt, vest, or a loaded backpack — for pull-ups and dips.' },
]
export const LOAD_SOURCE_IDS = LOAD_SOURCES.map((s) => s.id)

// Normalize (and default) the equipment state stored in settings.
export function getEquipment(settings = loadSettings()) {
  const e = settings.equipment || {}
  const cap = e.capacity || {}
  return {
    active: e.active === 'home' ? 'home' : 'gym',
    profiles: {
      gym: Array.isArray(e.profiles?.gym) ? e.profiles.gym : [...ALL_EQUIPMENT_IDS],
      home: Array.isArray(e.profiles?.home) ? e.profiles.home : [...HOME_DEFAULT],
    },
    // { gym: { dumbbells: 100, ... }, home: { dumbbells: 25, ... } }
    capacity: { gym: { ...(cap.gym || {}) }, home: { ...(cap.home || {}) } },
  }
}

export function activeCapacity(settings = loadSettings()) {
  const e = getEquipment(settings)
  return e.capacity[e.active] || {}
}

export function saveProfileCapacity(id, capacity) {
  const s = loadSettings()
  const e = getEquipment(s)
  const profile = id === 'home' ? 'home' : 'gym'
  saveSettings({ ...s, equipment: { ...e, capacity: { ...e.capacity, [profile]: capacity } } })
}

// The heaviest load this exercise's gear can supply. 0 means "unknown" (nothing
// recorded), which callers treat as no limit rather than as zero.
export function availableLoadFor(ex, capacity = {}) {
  const requires = requiresFor(ex)
  // A weighted pull-up or dip is loaded by whatever you can hang off yourself,
  // not by the bar it uses — check the hanging sources for those.
  const sources = EXERCISE_BY_ID[ex.id]?.bwLoad
    ? ['weight_belt', 'dumbbells', 'kettlebells', 'plates']
    : requires.filter((r) => LOAD_SOURCE_IDS.includes(r))
  let best = 0
  for (const s of sources) best = Math.max(best, Number(capacity[s]) || 0)
  return best
}

// Can the user load this exercise heavily enough for it to be the real thing?
// Exercises declare `minLoad` (in lbs) when a token amount of weight defeats the
// point — a "weighted" pull-up with 5 lb is just a pull-up.
export function hasEnoughLoad(ex, capacity = {}, units = 'lbs') {
  const need = EXERCISE_BY_ID[ex.id]?.minLoad
  if (!need) return true
  const have = availableLoadFor(ex, capacity)
  if (have <= 0) return true // nothing recorded — don't second-guess the user
  const needInUnits = units === 'kg' ? Math.round(need / 2.2) : need
  return have >= needInUnits
}

export function activeEquipmentIds(settings = loadSettings()) {
  const e = getEquipment(settings)
  return e.profiles[e.active] || []
}

export function setActiveProfile(id) {
  const s = loadSettings()
  const e = getEquipment(s)
  saveSettings({ ...s, equipment: { ...e, active: id === 'home' ? 'home' : 'gym' } })
}

export function saveProfileEquipment(id, ids) {
  const s = loadSettings()
  const e = getEquipment(s)
  saveSettings({ ...s, equipment: { ...e, profiles: { ...e.profiles, [id]: ids } } })
}

// Program-exercise objects don't copy `requires`, so resolve it from the library.
const requiresFor = (ex) => EXERCISE_BY_ID[ex.id]?.requires ?? ex.requires ?? []

const asSet = (available) => (available instanceof Set ? available : new Set(available))

// `capacity` is optional; without it this is the original gear-presence check.
export function isDoable(ex, available, { capacity, units } = {}) {
  const have = asSet(available)
  if (!requiresFor(ex).every((r) => have.has(r))) return false
  return capacity ? hasEnoughLoad(ex, capacity, units) : true
}

// Equipment an exercise needs that the current profile is missing (labels).
export function missingEquipment(ex, available) {
  const have = asSet(available)
  return requiresFor(ex).filter((r) => !have.has(r)).map(equipmentLabel)
}

// Best same-pattern alternative that's doable with the available equipment.
// Prefers matching compound/loaded status and richer (closer) variants.
export function bestSubstitute(ex, available) {
  const have = asSet(available)
  if (isDoable(ex, have)) return null
  const base = EXERCISE_BY_ID[ex.id]
  const pattern = ex.pattern ?? base?.pattern
  const compound = ex.compound ?? base?.compound
  const loaded = (ex.load ?? base?.load) !== false

  const candidates = EXERCISES.filter(
    (c) => c.id !== ex.id && c.pattern === pattern && !c.ladderOnly
      && c.pattern !== 'conditioning' && isDoable(c, have),
  )
  if (!candidates.length) return null

  const score = (c) =>
    (c.compound === compound ? 3 : 0) + c.requires.length + ((c.load !== false) === loaded ? 1 : 0)
  candidates.sort((a, b) => score(b) - score(a))
  return candidates[0]
}

// Resolve a program exercise to the best variant the user can actually do. If
// the exercise isn't doable but declares an ordered `alts` list (curated,
// same-purpose fallbacks), swap in the first alternative that IS doable —
// keeping the prescription (sets/reps/rest/weight). Because this is computed
// from the current equipment, the program re-optimizes whenever gear changes:
// add a hangboard and max hangs come back; lose it and it falls to a no-hang
// tool, then a bar hang.
export function resolveForEquipment(ex, available, opts = {}) {
  const have = asSet(available)
  if (isDoable(ex, have, opts) || !Array.isArray(ex.alts) || ex.alts.length === 0) return ex
  for (const altId of ex.alts) {
    const lib = EXERCISE_BY_ID[altId]
    if (lib && isDoable(lib, have, opts)) {
      return {
        ...ex,
        id: lib.id, name: lib.name, pattern: lib.pattern, regions: lib.regions,
        compound: lib.compound, load: lib.load !== false, cues: lib.cues,
        hold: lib.hold || undefined, distance: lib.distance || undefined, unit: lib.unit || undefined,
        ladderId: lib.ladderId || null, nextId: lib.nextId || null, prevId: lib.prevId || null,
        swappedFrom: ex.name, // so the UI can note why it changed
      }
    }
  }
  return ex // nothing doable — leave the original (the workout will flag it)
}

export function resolveExercisesForEquipment(exercises, available, opts = {}) {
  const have = asSet(available)
  return (exercises || []).map((e) => resolveForEquipment(e, have, opts))
}
