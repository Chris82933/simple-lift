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

// Normalize (and default) the equipment state stored in settings.
export function getEquipment(settings = loadSettings()) {
  const e = settings.equipment || {}
  return {
    active: e.active === 'home' ? 'home' : 'gym',
    profiles: {
      gym: Array.isArray(e.profiles?.gym) ? e.profiles.gym : [...ALL_EQUIPMENT_IDS],
      home: Array.isArray(e.profiles?.home) ? e.profiles.home : [...HOME_DEFAULT],
    },
  }
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

export function isDoable(ex, available) {
  const have = asSet(available)
  return requiresFor(ex).every((r) => have.has(r))
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
