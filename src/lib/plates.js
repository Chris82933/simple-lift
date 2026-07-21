// Barbell plate-loading calculator. Given a target weight, works out which
// plates to slide on each side of the bar using a greedy largest-first fill —
// the same approach every gym plate chart uses. Users can turn individual
// plate sizes on/off (not every gym stocks 5s, fractional plates, etc.) and
// pick their bar weight; that config lives in settings so it rides along with
// export/import and cloud sync automatically.
import { EXERCISE_BY_ID } from '../data/exercises.js'
import { loadSettings, saveSettings } from './storage.js'

// Standard plate sizes available at most gyms, heaviest first.
export const PLATE_WEIGHTS = {
  lbs: [45, 35, 25, 10, 5, 2.5],
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
}

export const BAR_PRESETS = {
  lbs: [
    { label: 'Standard barbell', value: 45 },
    { label: "Women's barbell", value: 35 },
    { label: 'Technique bar', value: 15 },
  ],
  kg: [
    { label: 'Standard barbell', value: 20 },
    { label: "Women's barbell", value: 15 },
    { label: 'Technique bar', value: 10 },
  ],
}

const DEFAULT_BAR = { lbs: 45, kg: 20 }

// Exercises that require a barbell are the only ones this applies to (not
// dumbbells, machines, etc.) — squats, deadlifts, bench, rows, presses...
export function isBarbellLift(ex) {
  const requires = EXERCISE_BY_ID[ex?.id]?.requires ?? ex?.requires ?? []
  return requires.includes('barbell')
}

// Read the saved plate config, filling in sensible defaults (bar weight per
// unit, every standard plate available) for anything not yet configured.
export function getPlateConfig(settings = loadSettings()) {
  const saved = settings.plates || {}
  const barWeight = { ...DEFAULT_BAR, ...(saved.barWeight || {}) }
  const available = {}
  for (const unit of Object.keys(PLATE_WEIGHTS)) {
    const savedUnit = saved.available?.[unit] || {}
    available[unit] = {}
    for (const w of PLATE_WEIGHTS[unit]) {
      available[unit][w] = Object.prototype.hasOwnProperty.call(savedUnit, w) ? !!savedUnit[w] : true
    }
  }
  return { barWeight, available }
}

export function savePlateConfig(config) {
  const settings = loadSettings()
  saveSettings({ ...settings, plates: config })
}

// Greedy largest-plate-first fill for one side of the bar.
// Returns { perSide: [45,10,5], leftover, exact, total }.
export function calculatePlates(targetWeight, barWeight, availableWeights) {
  const target = Number(targetWeight) || 0
  const bar = Number(barWeight) || 0
  if (target <= bar) {
    return { perSide: [], leftover: 0, exact: true, total: bar, barOnly: true }
  }
  let remaining = Math.round(((target - bar) / 2) * 100) / 100
  const sorted = [...availableWeights].filter((w) => w > 0).sort((a, b) => b - a)
  const perSide = []
  const EPS = 1e-6
  for (const w of sorted) {
    while (remaining + EPS >= w) {
      perSide.push(w)
      remaining = Math.round((remaining - w) * 100) / 100
    }
  }
  const total = bar + perSide.reduce((a, b) => a + b, 0) * 2
  return { perSide, leftover: Math.max(0, remaining), exact: remaining <= 0.01, total, barOnly: false }
}

// The smallest weight jump the user can actually load on a bar: twice the
// lightest plate they own, since plates go on in pairs. Someone without 2.5s
// can't make a 5 lb jump, so telling them to add 5 lb is useless advice.
// Returns 0 when nothing is known, meaning "no constraint".
export function smallestBarJump(units = 'lbs', settings = loadSettings()) {
  const unit = units === 'kg' ? 'kg' : 'lbs'
  const { available } = getPlateConfig(settings)
  const owned = PLATE_WEIGHTS[unit].filter((w) => available[unit]?.[w])
  if (!owned.length) return 0
  return Math.min(...owned) * 2
}
