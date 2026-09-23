import { useState, useEffect, useRef, Fragment } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import useModalA11y from '../lib/useModalA11y.js'
import { useToast } from '../components/Toast.jsx'
import {
  loadActiveProgram, loadSettings, appendWorkout, updateProgram, advanceRotation,
  addCardio, deleteCardio, insertCardioAt, addProgram, updateWorkout, loadHistory, loadMaxes, saveMax,
  loadActiveSession, saveActiveSession, clearActiveSession, currentBodyweight,
} from '../lib/storage.js'
import { sessionRecords, buildSessionSummary, prShort } from '../lib/records.js'
import { repsLabel, schemeForGoals, prescriptionFor } from '../data/schemes.js'
import { stageNote, applyStage } from '../lib/gzclp.js'
import { is531, applyWeek, weekNote } from '../lib/fiveThreeOne.js'
import { extraNote } from '../lib/progression.js'
import { reviewSession, applyChoices, INCREMENTS } from '../lib/sessionReview.js'
import { methodFor, recommendChoice, recommendReason, methodName } from '../lib/progressionMethods.js'
import MuscleMap from '../components/MuscleMap.jsx'
import FormCheckButton from '../components/FormCheckButton.jsx'
import RestTimer from '../components/RestTimer.jsx'
import RestTimers from '../components/RestTimers.jsx'
import ExercisePicker from '../components/ExercisePicker.jsx'
import CardioForm from '../components/CardioForm.jsx'
import { CARDIO_BY_ID } from '../data/cardio.js'
import QuickOneRM from '../components/QuickOneRM.jsx'
import PlateBreakdown from '../components/PlateBreakdown.jsx'
import {
  getEquipment, setActiveProfile as storeSetActiveProfile, isDoable, bestSubstitute,
  missingEquipment, profileMeta, PROFILE_IDS, activeEquipmentIds, resolveExercisesForEquipment, activeCapacity,
} from '../lib/equipment.js'
import { isBarbellLift, lazyWarmupSets, getPlateConfig, PLATE_WEIGHTS, smallestBarJump } from '../lib/plates.js'
import { exerciseEntryFromLibrary } from '../lib/exerciseEntry.js'
import { ladderInfo } from '../lib/ladder.js'
import { measureUnit, exMeasure, EXERCISE_BY_ID, isoHoldFor, tracksLoad, loadIsOptional } from '../data/exercises.js'
import { warmupSets, incrementForUnits } from '../lib/oneRepMax.js'
import { lastWeightFromHistory, fillDownRows } from '../lib/logging.js'
import { sessionMuscleHeat, plannedMuscleHeat, describeHeat } from '../lib/muscleHeat.js'
import StretchPanel from '../components/StretchPanel.jsx'
import Icon from '../components/Icon.jsx'

// Which set the plate breakdown should load for: the set you're about to do —
// i.e. the first one not yet marked done (or the last, once all are done). This
// makes the plate math follow along as you complete sets (useful when sets ramp
// in weight). Falls back to any entered / stored working weight.
function nextSetTarget(ex, rows) {
  const list = rows || []
  const total = list.length
  let idx = list.findIndex((r) => !r.done)
  if (idx === -1) idx = Math.max(0, total - 1)
  let weight = Number(list[idx]?.weight) || 0
  if (weight <= 0) {
    const entered = list.map((r) => Number(r.weight)).find((w) => w > 0)
    weight = entered || Number(ex.progression?.weight ?? ex.startWeight) || 0
  }
  return { weight, setNumber: idx + 1, total }
}

// The weight step for a set's ± stepper: the smallest jump you can actually
// load on a barbell (twice your lightest plate) when that's known, otherwise
// the standard lift increment for your units.
function weightStepFor(ex, units) {
  if (isBarbellLift(ex)) {
    const jump = smallestBarJump(units)
    if (jump > 0) return jump
  }
  return incrementForUnits(units)
}

// Two dumbbells held at once (vs. a single dumbbell — e.g. "One-Arm ..."
// moves) need a per-hand weight label, or the total-vs-per-hand number is
// ambiguous. The library carries no explicit flag for this, so infer it from
// the equipment requirement plus name (session entries don't carry `requires`,
// so look the library definition up by id).
function isTwoDumbbell(ex) {
  const lib = EXERCISE_BY_ID[ex.id]
  return !!lib?.requires?.includes('dumbbells') && !/one-arm/i.test(lib.name || '')
}

// Human-readable session length for the completion screen.
function formatDuration(sec) {
  const totalMin = Math.round(sec / 60)
  if (totalMin < 1) return '<1 min'
  if (totalMin < 60) return `${totalMin} min`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

// Post-session difficulty ratings (saved to history).
const DIFFICULTIES = [
  { id: 'easy', label: 'Easy' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'hard', label: 'Hard' },
  { id: 'maxed', label: 'Maxed out' },
]

// Did the user change the workout's structure (added/removed/reordered
// exercises, or edited rest times or set counts) relative to the given baseline?
function isCustomized(originalExercises, liveExercises) {
  if (liveExercises.length !== originalExercises.length) return true
  return liveExercises.some((le, i) => {
    const orig = originalExercises.find((o) => o.id === le.id)
    return !orig || orig.restSec !== le.restSec || orig.sets !== le.sets || originalExercises[i]?.id !== le.id
  })
}

// Rebuild a program day's exercise list from the live (edited) one, preserving
// each kept exercise's saved progression/weights and folding in rest and set-count
// changes, exercise order, and any newly added exercises.
function buildCustomDay(persistedExercises, liveExercises) {
  return liveExercises.map((le) => {
    const orig = persistedExercises.find((o) => o.id === le.id)
    if (orig) return { ...orig, restSec: le.restSec, sets: le.sets }
    const { adhoc, ...rest } = le // promote ad-hoc add into a real program entry
    return rest
  })
}

function defaultDayIndex(program, stateIndex) {
  if (Number.isInteger(stateIndex)) return stateIndex
  const today = new Date().getDay()
  const idx = program.days.findIndex((d) => d.weekday === today)
  return idx === -1 ? 0 : idx
}

// Write the carried-forward values (entered weights, auto GZCLP deloads) to the program.
function applyPersist(program, dayIndex, persist, units) {
  const exercises = program.days[dayIndex].exercises.map((ex) => {
    const p = persist.find((x) => x.exId === ex.id)
    if (!p) return ex
    let next = { ...ex }
    if (p.startWeight != null) next.startWeight = p.startWeight
    if (p.progression) {
      const merged = { ...next, progression: p.progression }
      next = is531(merged) ? applyWeek(merged, units) : applyStage(merged)
    }
    return next
  })
  return { ...program, days: program.days.map((d, i) => (i === dayIndex ? { ...d, exercises } : d)) }
}

// ---- progression-choice options (end-of-session). Default is always 'keep'. ----
const optionsFor = (sug, units) => {
  if (sug.type === 'levelUp') {
    return [
      { key: 'levelUp', label: `Level up → ${sug.nextName}` },
      { key: 'keep', label: 'Keep same' },
    ]
  }
  if (sug.type === 'levelDown') {
    return [
      { key: 'levelDown', label: `Ease off → ${sug.prevName}` },
      { key: 'keep', label: 'Keep same' },
    ]
  }
  const opts = []
  if (sug.type === 'load') {
    for (const inc of INCREMENTS[units] || INCREMENTS.lbs) {
      opts.push({ key: `w${inc}`, label: `+${inc} ${units}`, recommended: inc === sug.recommendedInc })
    }
  }
  if (sug.reps) {
    // Timed moves grow by seconds/minutes (even loaded ones, e.g. carries);
    // everything else by reps.
    const isTime = sug.type === 'time' || sug.measure?.type === 'time'
    const by = sug.reps.by || 1
    const label = isTime ? `+${by} ${sug.measure?.unit || 'sec'}` : `+${by} rep${by > 1 ? 's' : ''}`
    opts.push({ key: 'reps', label })
  }
  opts.push({ key: 'keep', label: 'Keep same' })
  return opts
}

// Seed (or re-seed) progression choices to the recommended option for
// auto-progression: GZCLP and linear/Greyskull schemes (`sug.isGzclp` is set
// on both, true or false — only those two paths set it) are DEFINED by
// automatic load increases, so they always seed to the recommended jump.
// For generic exercises, linear/RPE methods seed via recommendChoice(); RPE
// needs a difficulty rating first, so it stays 'keep' until one is picked.
// Manual and double progression always default to 'keep' — the user decides.
// Choices the user has manually touched are left alone.
function seedChoices(suggestions, method, difficulty, touched = {}) {
  const next = {}
  suggestions.forEach((s) => {
    if (touched[s.exId]) return
    const schemeAuto = s.isGzclp !== undefined
    let choice = 'keep'
    if (schemeAuto) {
      choice = s.recommendedInc != null ? `w${s.recommendedInc}` : 'keep'
    } else if (method === 'linear' || method === 'rpe') {
      choice = recommendChoice(method, s, difficulty) || 'keep'
    }
    next[s.exId] = choice
  })
  return next
}

// Fresh set-tracking state for a session: warm-up ramp (rep-measured loaded
// compounds) + working sets prefilled with the stored working weight.
// Warm-up config from settings: 'lazy' additive plate ramp (default) vs the
// 'granular' percentage ramp, plus the plate set for the lazy math.
function warmupConfig(units) {
  const s = loadSettings()
  const unit = units === 'kg' ? 'kg' : 'lbs'
  const cfg = getPlateConfig(s)
  return {
    style: s.warmupStyle === 'granular' ? 'granular' : 'lazy',
    bar: cfg.barWeight[unit],
    availableWeights: PLATE_WEIGHTS[unit].filter((w) => cfg.available[unit]?.[w]),
  }
}

function buildInitialSets(session, units, lastWeight = {}, wu = null) {
  const initial = {}
  const inc = incrementForUnits(units)
  const cfg = wu || warmupConfig(units)
  if (session) {
    for (const ex of session.exercises) {
      const stored = ex.progression?.weight != null ? ex.progression.weight : ex.startWeight
      let weight = ex.load !== false && stored !== '' && stored != null ? String(stored) : ''
      // Nothing prescribed? Fall back to what you lifted last time (covers
      // accessories and optional-load bodyweight moves that carry no 1RM).
      if (weight === '' && Number(lastWeight[ex.id]) > 0) weight = String(lastWeight[ex.id])
      // Lazy additive ramp for a plate-loaded bar; percentage ramp otherwise
      // (or as a fallback when the weight can't be built additively).
      let rows = []
      if (ex.warmups && weight && exMeasure(ex).type === 'reps') {
        if (cfg.style === 'lazy' && isBarbellLift(ex)) {
          rows = lazyWarmupSets(Number(weight), { bar: cfg.bar, availableWeights: cfg.availableWeights })
        }
        if (!rows.length) rows = warmupSets(Number(weight), inc)
      }
      const warms = rows.map((s) => ({ weight: String(s.weight), reps: String(s.reps), done: false, warmup: true }))
      // Most schemes prescribe the same weight and reps for every working set.
      // Percentage-based ones (5/3/1) prescribe each set separately, so honour
      // per-set values when the exercise supplies them.
      const working = Array.from({ length: ex.sets }, (_, i) => ({
        weight: ex.setWeights?.[i] != null ? String(ex.setWeights[i]) : weight,
        reps: String(ex.setReps?.[i] ?? ex.repHigh),
        done: false,
      }))
      initial[ex.id] = [...warms, ...working]
    }
  }
  return initial
}

// A "last time" one-liner per exercise from history (most recent done sets).
function buildLastTimeMap() {
  const map = {}
  for (const w of loadHistory()) { // newest first
    for (const e of w.entries || []) {
      if (map[e.exerciseId]) continue
      const done = (e.sets || []).filter((s) => s.done && !s.warmup && Number(s.reps) > 0)
      if (!done.length) continue
      map[e.exerciseId] = done.map((s) => {
        const wt = Number(s.weight) || 0
        return wt > 0 ? `${wt}×${s.reps}` : `${s.reps}`
      }).join(', ')
    }
  }
  return map
}


export default function Workout() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const settings = loadSettings()
  const units = settings.units || 'lbs'
  const showPlates = settings.hidePlateCalc !== true
  const restEnabled = settings.restTimer !== false // rest timer on unless turned off
  const supersetTimers = settings.supersetTimers === true // opt-in: multiple concurrent rest timers
  const stretching = settings.stretching === true // opt-in warm-up/cool-down panels

  // Snapshot the program & session once at mount so mid-session edits don't reload the live workout.
  const stateDayIndex = location.state?.dayIndex
  const [snapshot] = useState(() => {
    const program = loadActiveProgram()
    const dayIndex = program ? defaultDayIndex(program, stateDayIndex) : 0
    const raw = program?.days[dayIndex] ?? null
    // Swap each move to the best version for the user's current equipment, then
    // apply any progression scheme staging.
    const forGear = raw ? resolveExercisesForEquipment(raw.exercises, activeEquipmentIds(), { capacity: activeCapacity(), units: loadSettings().units }) : []
    const session = raw
      ? { ...raw, exercises: forGear.map((e) => (is531(e) ? applyWeek(e, units) : e.progression ? applyStage(e) : e)) }
      : null
    // A saved in-progress session for THIS program+day, with real progress
    // (at least one logged set) → offer to resume it.
    const saved = loadActiveSession()
    const loggedSets = saved && saved.sets && Object.values(saved.sets).some(
      (rows) => Array.isArray(rows) && rows.some((r) => r.done),
    )
    // Cardio logged mid-workout counts as progress too, so a cardio-only session
    // is still resumable.
    const hasProgress = loggedSets || (Array.isArray(saved?.cardio) && saved.cardio.length > 0)
    const resumed = saved && program && saved.programId === program.id && saved.dayIndex === dayIndex
      && Array.isArray(saved.exercises) && saved.exercises.length > 0 && hasProgress
      ? saved : null
    return { program, dayIndex, session, resumed }
  })
  const { program, dayIndex, session, resumed } = snapshot
  const goals = program?.goals || program?.meta?.goals || []
  const method = methodFor(program)
  // "Last time" numbers per exercise (computed once at mount).
  const [lastTime] = useState(() => buildLastTimeMap())

  // Set-tracking state: resumed from a saved session, else prefilled fresh.
  const [sets, setSets] = useState(() => (resumed ? resumed.sets : buildInitialSets(session, units, lastWeightFromHistory(loadHistory()))))

  // Live, editable exercise list (lets users add/remove/adjust mid-workout).
  const [exercises, setExercises] = useState(() => (resumed ? resumed.exercises : (session ? session.exercises : [])))
  const [showResumed, setShowResumed] = useState(!!resumed)
  const [editMode, setEditMode] = useState(false)
  // Snapshot taken when entering edit mode, so "Cancel changes" can revert.
  const [editSnapshot, setEditSnapshot] = useState(null)
  // The last structure saved to the program — what the completion screen
  // compares against, so already-saved edits don't prompt again.
  const [baseline, setBaseline] = useState(() => (session ? session.exercises : []))
  const [pickerOpen, setPickerOpen] = useState(false)
  const [cardioOpen, setCardioOpen] = useState(false)
  const [cardioMachine, setCardioMachine] = useState('treadmill') // preselect for the form
  const [oneRmOpen, setOneRmOpen] = useState(false)
  const cardioDialogRef = useRef(null)
  useModalA11y(cardioDialogRef, () => setCardioOpen(false), cardioOpen)
  // This session's cardio — restored on resume, persisted in the active session,
  // fed to the share summary, and shown as cards in the session.
  const [loggedCardio, setLoggedCardio] = useState(() => (resumed?.cardio ? resumed.cardio : []))
  // U4: when this session started — restored from the saved active session on
  // resume, else the first mount. Used to compute durationSec at finish.
  const [startedAt, setStartedAt] = useState(() => (resumed?.startedAt) || Date.now())
  const [durationSec, setDurationSec] = useState(0)

  const [rest, setRest] = useState(null)
  // Superset mode: several concurrent rest timers instead of the single one.
  const [rests, setRests] = useState([])
  const [hold, setHold] = useState(null) // in-set isometric hold timer
  const [finished, setFinished] = useState(false)
  const [finishedAt, setFinishedAt] = useState(null)
  const [muscleHeat, setMuscleHeat] = useState({})
  const [review, setReview] = useState({ autoNotes: [], suggestions: [] })
  const [choices, setChoices] = useState({})
  // Which suggestions' choices the user has manually picked — re-seeding on a
  // difficulty change must never clobber those.
  const [touchedChoices, setTouchedChoices] = useState({})

  // Completion-screen records: PRs, offered 1RM updates (+ which were applied),
  // and share status.
  const [prs, setPrs] = useState([])
  const [rmUpdates, setRmUpdates] = useState([])
  const [rmDone, setRmDone] = useState({})
  const [shareStatus, setShareStatus] = useState(null)

  // Completion-screen extras: structural-edit save, difficulty, notes.
  const [customized, setCustomized] = useState(false)
  const [saveChoice, setSaveChoice] = useState('none') // 'none' | 'update' | 'new'
  const [difficulty, setDifficulty] = useState(null)
  const [notes, setNotes] = useState('')

  // C7: RPE's recommendation depends on the difficulty rating, which is chosen
  // on the same completion screen — re-seed any choice the user hasn't manually
  // touched whenever it changes. Must sit above the early return below so the
  // hook order stays identical on every render.
  useEffect(() => {
    if (!finished || !review.suggestions.length) return
    setChoices((c) => ({ ...c, ...seedChoices(review.suggestions, method, difficulty, touchedChoices) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty])

  // Persist the live session (debounced) so it survives a close / crash / iOS
  // storage eviction — and can be resumed. Cleared once the workout finishes.
  useEffect(() => {
    if (!session || finished) return
    const t = setTimeout(() => {
      saveActiveSession({ programId: program.id, dayIndex, sessionTitle: session.title, exercises, sets, cardio: loggedCardio, startedAt, savedAt: Date.now() })
    }, 500)
    return () => clearTimeout(t)
  }, [exercises, sets, loggedCardio, finished, program, dayIndex, session, startedAt])

  // R6: the debounce above can drop the last sub-500ms of edits if the tab is
  // backgrounded or a service-worker update swaps the page out from under it.
  // Flush synchronously the moment the tab hides or the page is about to be
  // unloaded, so nothing logged mid-set is lost.
  useEffect(() => {
    if (!session || finished) return
    const flush = () => {
      saveActiveSession({ programId: program.id, dayIndex, sessionTitle: session.title, exercises, sets, cardio: loggedCardio, startedAt, savedAt: Date.now() })
    }
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush() }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flush)
    }
  }, [exercises, sets, loggedCardio, finished, program, dayIndex, session, startedAt])

  // Discard a resumed session and start this day fresh. Sits right next to the
  // "Resumed your in-progress session" banner, so a stray tap here can wipe out
  // real logged work — confirm first, with the real count, whenever there's
  // anything to lose.
  const startOver = () => {
    const loggedSetCount = Object.values(sets).flat().filter((r) => r.done && !r.warmup).length
    const loggedCount = loggedSetCount + loggedCardio.length
    if (loggedCount > 0) {
      const setPart = loggedSetCount > 0 ? `${loggedSetCount} logged set${loggedSetCount === 1 ? '' : 's'}` : ''
      const cardioPart = loggedCardio.length > 0 ? `${loggedCardio.length} cardio entr${loggedCardio.length === 1 ? 'y' : 'ies'}` : ''
      const what = [setPart, cardioPart].filter(Boolean).join(' and ')
      if (!window.confirm(`Discard ${what} and start this workout over?`)) return
    }
    clearActiveSession()
    setExercises(session ? session.exercises : [])
    setSets(buildInitialSets(session, units))
    setLoggedCardio([])
    setStartedAt(Date.now()) // fresh session, fresh clock (U4)
    setShowResumed(false)
  }

  // Add an exercise to this session (one-off — not saved to the program).
  const addExercise = (ex) => {
    if (exercises.some((e) => e.id === ex.id)) return // avoid dup ids/state collision
    const scheme = schemeForGoals(goals)
    const p = prescriptionFor(ex, scheme)
    const entry = exerciseEntryFromLibrary(ex, {
      sets: p.sets, repLow: p.repLow, repHigh: p.repHigh, restSec: p.restSec, startWeight: '', adhoc: true,
    })
    setExercises((list) => [...list, entry])
    setSets((s) => ({
      ...s,
      [ex.id]: Array.from({ length: p.sets }, () => ({ weight: '', reps: String(p.repHigh), done: false })),
    }))
  }

  // C4: dropping a middle member of a superset must not let the entry before
  // it absorb whatever shifts into the gap — clear its link (mirrors
  // Builder's removeExercise).
  const removeExercise = (exId) => {
    setExercises((list) => {
      const idx = list.findIndex((e) => e.id === exId)
      return list
        .filter((e) => e.id !== exId)
        .map((e, j) => (j === idx - 1 ? { ...e, supersetNext: undefined } : e))
    })
    setSets((s) => { const n = { ...s }; delete n[exId]; return n })
  }

  // ---- Home/Gym equipment mode + one-off exercise substitution ----
  const equip = getEquipment(settings)
  const [activeProfile, setActiveProfileState] = useState(equip.active)
  const availableSet = new Set(equip.profiles[activeProfile])
  const switchProfile = (id) => { storeSetActiveProfile(id); setActiveProfileState(id) }

  // Replace an exercise you can't do here with a doable same-pattern alternative,
  // for this session only (marked adhoc, so it never touches program progression).
  const swapExercise = (exId, sub) => {
    // C4: keep this exercise's superset link (if any) alive through the swap.
    const old = exercises.find((e) => e.id === exId)
    const p = prescriptionFor(sub, schemeForGoals(goals))
    const entry = exerciseEntryFromLibrary(sub, {
      sets: p.sets, repLow: p.repLow, repHigh: p.repHigh, restSec: p.restSec,
      startWeight: '', adhoc: true, supersetNext: old?.supersetNext,
    })
    setExercises((list) => {
      if (list.some((e) => e.id === sub.id)) return list.filter((e) => e.id !== exId) // avoid dup id
      return list.map((e) => (e.id === exId ? entry : e))
    })
    setSets((s) => {
      const n = { ...s }
      delete n[exId]
      n[sub.id] = Array.from({ length: p.sets }, () => ({ weight: '', reps: String(p.repHigh), done: false }))
      return n
    })
  }

  // Manually move a laddered bodyweight move up (harder) or down (easier) a
  // level, on demand — no target required. Keeps the current sets/reps/rest.
  const stepLadder = (exId, dir) => {
    const ex = exercises.find((e) => e.id === exId)
    const info = ladderInfo(exId)
    const targetId = dir > 0 ? info?.nextId : info?.prevId
    const target = targetId && EXERCISE_BY_ID[targetId]
    if (!ex || !target) return
    // C4: passing the whole existing entry as overrides keeps its program
    // fields (sets/reps/rest/progression/supersetNext/…) — only identity
    // comes from the target rung.
    const entry = exerciseEntryFromLibrary(target, ex)
    setExercises((list) => {
      if (list.some((e) => e.id === target.id && e.id !== exId)) return list // avoid dup id
      return list.map((e) => (e.id === exId ? entry : e))
    })
    setSets((s) => {
      const n = { ...s }
      const rows = n[exId] || []
      delete n[exId]
      // Keep the same number of working sets; reset done + drop any warm-ups.
      n[target.id] = rows.filter((r) => !r.warmup).map((r) => ({ ...r, done: false }))
      return n
    })
  }

  const swapAllUnavailable = () => {
    exercises.forEach((ex) => {
      if (isDoable(ex, availableSet)) return
      const sub = bestSubstitute(ex, availableSet)
      if (sub) swapExercise(ex.id, sub)
    })
  }

  const adjustRest = (exId, delta) =>
    setExercises((list) => list.map((e) => (e.id === exId ? { ...e, restSec: Math.max(0, e.restSec + delta) } : e)))

  const logCardio = (entry) => {
    // Tag with an id so this session's card can delete the right cardio log row.
    const withId = { id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, ...entry }
    addCardio(withId)
    setLoggedCardio((l) => [...l, withId])
    setCardioOpen(false)
  }
  // Delete immediately, offer Undo via toast (mirrors Progress.jsx) — a mis-tap
  // shouldn't force re-entering a cardio entry from memory.
  const removeLoggedCardio = (entry) => {
    const idx = loggedCardio.indexOf(entry)
    if (entry.id) deleteCardio(entry.id)
    setLoggedCardio((l) => l.filter((e) => e !== entry))
    toast.show('Cardio entry removed', {
      actionLabel: 'Undo',
      onAction: () => {
        if (entry.id) insertCardioAt(entry, idx)
        setLoggedCardio((l) => {
          const next = [...l]
          next.splice(idx, 0, entry)
          return next
        })
      },
    })
  }

  if (!program || !session) {
    return (
      <section className="page full-flow">
        <header className="page-header"><h1>No active workout</h1></header>
        <div className="card"><p className="muted">No program found. Build one first.</p></div>
        <div className="flow-actions">
          <button className="btn btn-ghost" onClick={() => navigate('/today')}>Back</button>
        </div>
      </section>
    )
  }

  const updateSet = (exId, idx, field, value) =>
    setSets((s) => ({
      ...s,
      [exId]: (s[exId] || []).map((row, i) => (i === idx ? { ...row, [field]: value } : row)),
    }))

  // U2: nudge a set's weight or reps by a step (± steppers) — never below 0.
  const bumpSet = (exId, idx, field, delta) =>
    setSets((s) => ({
      ...s,
      [exId]: (s[exId] || []).map((row, i) => {
        if (i !== idx) return row
        const next = Math.max(0, (Number(row[field]) || 0) + delta)
        return { ...row, [field]: String(Math.round(next * 100) / 100) }
      }),
    }))

  // Copy the first working set's weight & reps into every later working set
  // that isn't done yet — one tap for straight sets instead of retyping.
  const fillDown = (exId) =>
    setSets((s) => ({ ...s, [exId]: fillDownRows(s[exId] || []) }))

  const toggleDone = (exId, idx, restSec) => {
    const rows = sets[exId] || []
    const nowDone = !rows[idx]?.done
    // No rest after the final set of an exercise — nothing left to rest for.
    const isLastSet = idx === rows.length - 1
    // C5: alternating a superset — move straight to the partner exercise and
    // rest only once the LAST member of the group finishes a set.
    const ex = exercises.find((e) => e.id === exId)
    const supersetted = !!ex?.supersetNext
    setSets((s) => ({ ...s, [exId]: (s[exId] || []).map((r, i) => (i === idx ? { ...r, done: nowDone } : r)) }))
    // Start rest AFTER the state update (never inside the updater — StrictMode
    // double-invokes updaters, which would spawn duplicate timers).
    if (nowDone && !isLastSet && !supersetted && restEnabled) {
      const key = `${exId}-${idx}-${Date.now()}`
      if (supersetTimers) {
        const label = exercises.find((e) => e.id === exId)?.name || 'Rest'
        setRests((rs) => [...rs, { key, seconds: restSec, label }].slice(-4))
      } else {
        setRest({ seconds: restSec, key })
      }
    } else if (!nowDone) {
      // Un-marking a set cancels whatever rest timer IT started — otherwise a
      // stray countdown from a mis-tap keeps running and chimes/vibrates later.
      // Timer keys are prefixed with `${exId}-${idx}-`, so match on that
      // (covers both the single `rest` timer and superset `rests` list).
      const prefix = `${exId}-${idx}-`
      setRest((r) => (r && r.key.startsWith(prefix) ? null : r))
      setRests((rs) => rs.filter((t) => !t.key.startsWith(prefix)))
    }
  }

  // Start the in-set countdown for an isometric hold — the next un-done working
  // set of a time-measured exercise, for its prescribed seconds.
  const startHold = (ex) => {
    const rows = sets[ex.id] || []
    const idx = rows.findIndex((r) => !r.done && !r.warmup)
    if (idx === -1) return
    const secs = Number(rows[idx].reps) || Number(ex.repHigh) || 30
    setHold({ exId: ex.id, idx, seconds: secs, restSec: ex.restSec, key: `${ex.id}-${idx}-${Date.now()}` })
  }
  // The hold finished (or was skipped): log the seconds and mark the set done,
  // which starts the normal rest countdown.
  const finishHold = () => {
    if (!hold) return
    const { exId, idx, seconds, restSec } = hold
    updateSet(exId, idx, 'reps', String(seconds))
    toggleDone(exId, idx, restSec)
    setHold(null)
  }

  // Add or drop a set mid-workout. A new set copies the last row's weight/reps
  // (a sensible default) but starts un-done; keep ex.sets in sync so the review
  // knows how many sets were prescribed.
  const changeSetCount = (exId, delta) => {
    setSets((s) => {
      const rows = s[exId] || []
      const workingCount = rows.filter((r) => !r.warmup).length
      if (delta > 0) {
        // Copy the last working row (warm-ups are always first) for the new set.
        const lastWorking = [...rows].reverse().find((r) => !r.warmup) || { weight: '', reps: '', done: false }
        return { ...s, [exId]: [...rows, { weight: lastWorking.weight, reps: lastWorking.reps, done: false }] }
      }
      if (workingCount <= 1) return s
      return { ...s, [exId]: rows.slice(0, -1) } // drop the last (a working set)
    })
    setExercises((list) => list.map((e) => {
      if (e.id !== exId) return e
      const working = (sets[exId] || []).filter((r) => !r.warmup).length || e.sets
      return { ...e, sets: Math.max(1, working + delta) }
    }))
  }

  // ---- Edit mode: snapshot on enter, save or discard on exit ----
  const enterEdit = () => {
    setEditSnapshot({ exercises, sets })
    setEditMode(true)
  }
  // Persist structural edits (set counts, rest, order, adds/removes) to the
  // active program now — so they stick even if the workout isn't finished.
  const saveEdits = () => {
    const fresh = loadActiveProgram()
    if (fresh) {
      const newExercises = buildCustomDay(fresh.days[dayIndex].exercises, exercises)
      const days = fresh.days.map((d, i) => (i === dayIndex ? { ...d, exercises: newExercises } : d))
      updateProgram({ ...fresh, days })
      setBaseline(exercises)
    }
    setEditMode(false)
    setEditSnapshot(null)
  }
  // Discard this edit session's changes, reverting to the pre-edit snapshot.
  const cancelEdits = () => {
    if (editSnapshot) {
      setExercises(editSnapshot.exercises)
      setSets(editSnapshot.sets)
    }
    setEditMode(false)
    setEditSnapshot(null)
  }

  // Top-of-header edit pill: the natural "get me out of here" tap. It must
  // never blind-save a destructive change — only confirm when exercises were
  // actually removed since entering edit mode; a pure rest/set-count tweak
  // saves straight away like before.
  const finishEditPill = () => {
    if (!editMode) { enterEdit(); return }
    const removedCount = editSnapshot
      ? editSnapshot.exercises.filter((e) => !exercises.some((x) => x.id === e.id)).length
      : 0
    if (removedCount > 0) {
      const msg = `Save changes to your program? ${removedCount} exercise${removedCount === 1 ? '' : 's'} removed.`
      if (!window.confirm(msg)) return
    }
    saveEdits()
  }

  // Working sets only — warm-ups don't count toward the session's progress.
  const totalSets = exercises.reduce((n, ex) => n + (sets[ex.id]?.filter((r) => !r.warmup).length || ex.sets), 0)
  const doneSets = Object.values(sets).flat().filter((r) => r.done && !r.warmup).length

  const finish = () => {
    // C8: nothing logged — don't silently record an empty session and burn a
    // rotation slot. Match how Exit already confirms.
    if (doneSets === 0 && loggedCardio.length === 0) {
      if (!window.confirm('Finish with nothing logged? This records an empty session and advances your rotation.')) return
    }

    const date = new Date().toISOString()
    const entries = exercises.map((ex) => ({ exerciseId: ex.id, name: ex.name, adhoc: !!ex.adhoc, sets: sets[ex.id] || [] }))
    // U4: session length, from first mount (or the resumed session's original
    // start) to now.
    const sessionDurationSec = Math.max(0, Math.round((Date.now() - startedAt) / 1000))

    // Detect PRs and fresh 1RM estimates against the history *before* this session.
    const { prs: newPrs, oneRMUpdates } = sessionRecords(entries, loadHistory(), loadMaxes(), { bodyweight: currentBodyweight() })

    // Carry values forward + auto-apply deloads; collect optional increase suggestions.
    // Ad-hoc adds aren't in the program, so they can't persist/progress — exclude them.
    // Computed BEFORE appendWorkout so its autoNotes can be stored on the
    // history record below (contract with the auto-deload-explanations UI:
    // field name must be exactly `autoNotes`).
    const programIds = new Set(program.days[dayIndex].exercises.map((e) => e.id))
    const result = reviewSession({ ...session, exercises }, sets, goals, units, method)
    result.persist = result.persist.filter((p) => programIds.has(p.exId))
    result.suggestions = result.suggestions.filter((s) => programIds.has(s.exId))

    appendWorkout({ date, programId: program.id, sessionTitle: session.title, dayIndex, entries, prs: newPrs, durationSec: sessionDurationSec, autoNotes: result.autoNotes })
    clearActiveSession() // session is logged — no longer resumable
    setPrs(newPrs)
    setRmUpdates(oneRMUpdates)
    setRmDone({})
    setFinishedAt(date)
    setDurationSec(sessionDurationSec)
    setMuscleHeat(sessionMuscleHeat(entries))

    const fresh = loadActiveProgram()
    if (fresh) updateProgram(applyPersist(fresh, dayIndex, result.persist, units))
    advanceRotation(program.id, dayIndex)

    // Did they restructure the workout since the last save? If so, offer to save.
    setCustomized(isCustomized(baseline, exercises))

    // C7: seed to the recommended option for auto-progression (GZCLP/LP/GSLP
    // schemes, or a linear/RPE method) — manual/double still default to 'keep'.
    setTouchedChoices({})
    setChoices(seedChoices(result.suggestions, method, difficulty, {}))
    setReview(result)
    setFinished(true)
  }

  // Apply confirmed progression choices, save any customization & notes, leave.
  const done = () => {
    // 1) Progression choices (weight/rep bumps) onto the active program.
    if (review.suggestions.length) {
      const fresh = loadActiveProgram()
      if (fresh) updateProgram(applyChoices(fresh, dayIndex, review.suggestions, choices))
    }

    // 2) Save structural edits to the program, if the user chose to.
    if (customized && saveChoice !== 'none') {
      const fresh = loadActiveProgram()
      if (fresh) {
        const newExercises = buildCustomDay(fresh.days[dayIndex].exercises, exercises)
        if (saveChoice === 'update') {
          const days = fresh.days.map((d, i) => (i === dayIndex ? { ...d, exercises: newExercises } : d))
          updateProgram({ ...fresh, days })
        } else if (saveChoice === 'new') {
          const days = fresh.days.map((d, i) => (i === dayIndex ? { ...d, exercises: newExercises } : d))
          const { id, createdAt, ...rest } = fresh
          addProgram({ ...rest, name: `${fresh.name} (custom)`, source: 'custom', days })
        }
      }
    }

    // 3) Difficulty + notes onto this session's history record.
    if (difficulty || notes.trim()) {
      updateWorkout(finishedAt, { difficulty, notes: notes.trim() })
    }

    navigate('/today')
  }

  // Save a fresh 1RM estimate for one lift (keeps recommended weights accurate).
  const applyRmUpdate = (u) => {
    saveMax(u.exId, { oneRM: u.oneRM, weight: u.weight, reps: u.reps, units, name: u.name })
    setRmDone((d) => ({ ...d, [u.exId]: true }))
  }

  // Build the shareable text once, on demand.
  const summaryText = () => {
    const entries = exercises.map((ex) => ({ name: ex.name, exerciseId: ex.id, sets: sets[ex.id] || [] }))
    return buildSessionSummary(session.title, entries, { units, cardio: loggedCardio })
  }
  const canShare = typeof navigator !== 'undefined' && !!navigator.share
  const shareSummary = async () => {
    const text = summaryText()
    if (canShare) {
      try { await navigator.share({ title: session.title, text }); setShareStatus('shared') } catch { /* cancelled */ }
    } else {
      copySummary()
    }
  }
  const copySummary = async () => {
    try { await navigator.clipboard.writeText(summaryText()); setShareStatus('copied') } catch { setShareStatus('error') }
  }

  if (finished) {
    return (
      <section className="page full-flow">
        <header className="page-header">
          <p className="eyebrow">Nice work</p>
          <h1>Session complete</h1>
        </header>

        <div className="card">
          <p className="placeholder-title">{session.title}</p>
          <p className="muted">{doneSets} of {totalSets} sets logged. Your weights are saved for next time.</p>
          {durationSec > 0 && <p className="muted small">Took {formatDuration(durationSec)}.</p>}
        </div>

        {/* ---- Muscles worked (session heatmap) ---- */}
        {Object.keys(muscleHeat).length > 0 && (
          <div className="card muscles-worked">
            <p className="group-label">Muscles worked</p>
            <p className="sr-only">{describeHeat(muscleHeat)}</p>
            <MuscleMap heat={muscleHeat} size={300} labels />
            <div className="heat-legend">
              <span className="muted small">Less</span>
              <span className="heat-legend-bar" aria-hidden="true" />
              <span className="muted small">More</span>
            </div>
          </div>
        )}

        {stretching && (
          <StretchPanel
            muscles={Object.keys(muscleHeat)}
            phase="static"
            title="Cool-down stretches"
            subtitle="Hold each for range of motion while you're still warm."
          />
        )}

        {/* ---- Personal records ---- */}
        {prs.length > 0 && (
          <div className="card pr-card">
            <p className="pr-title"><Icon name="trophy" size={18} /> New personal record{prs.length === 1 ? '' : 's'}!</p>
            <ul className="pr-list">
              {prs.map((pr) => (
                <li key={pr.exId}>
                  <span className="pr-name">{pr.name}</span>
                  <span className="pr-value">{prShort(pr, units)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ---- Save workout customizations ---- */}
        {customized && (
          <div className="card">
            <p className="group-label">You changed this workout</p>
            <p className="muted small">You added, removed, or re-timed exercises. Want to keep these changes?</p>
            <div className="choice-chips save-choices">
              {[
                { key: 'none', label: 'Just this once' },
                { key: 'update', label: 'Update this program' },
                { key: 'new', label: 'Save as new program' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={'chip' + (saveChoice === opt.key ? ' is-selected' : '')}
                  aria-pressed={saveChoice === opt.key}
                  onClick={() => setSaveChoice(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ---- Difficulty + notes ---- */}
        <div className="card">
          <p className="group-label">How did it feel?</p>
          <div className="choice-chips">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                type="button"
                className={'chip' + (difficulty === d.id ? ' is-selected' : '')}
                aria-pressed={difficulty === d.id}
                onClick={() => setDifficulty((cur) => (cur === d.id ? null : d.id))}
              >
                {d.label}
              </button>
            ))}
          </div>
          <textarea
            className="text-input notes-input"
            aria-label="Session notes"
            placeholder="Notes — how it went, aches, PRs, what to try next time…"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {review.suggestions.length > 0 && (
          <div className="card">
            <p className="group-label">Progress next time?</p>
            <p className="muted small">
              {method === 'manual'
                ? 'Bump these up only if it felt right — otherwise keep the same (the default).'
                : <>Using <strong>{methodName(method)}</strong>. {recommendReason(method, difficulty)}</>}
            </p>
            {review.suggestions.map((sug) => {
              const rec = recommendChoice(method, sug, difficulty)
              return (
                <div className="review-row" key={sug.exId}>
                  <span className="review-name"><span aria-hidden="true">{sug.type === 'levelUp' ? '↑' : sug.type === 'levelDown' ? '↓' : '✓'}</span> {sug.name}</span>
                  <div className="choice-chips">
                    {optionsFor(sug, units).map((opt) => {
                      const isRec = rec ? opt.key === rec : opt.recommended
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          className={'chip' + (choices[sug.exId] === opt.key ? ' is-selected' : '') + (isRec ? ' is-recommended' : '')}
                          aria-pressed={choices[sug.exId] === opt.key}
                          onClick={() => {
                            setChoices((c) => ({ ...c, [sug.exId]: opt.key }))
                            setTouchedChoices((t) => ({ ...t, [sug.exId]: true }))
                          }}
                        >
                          {opt.label}{isRec ? ' ★' : ''}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            <p className="muted small">★ = recommended by your progression method. You choose.</p>
          </div>
        )}

        {review.suggestions.length > 0 && (
          <details className="card guide">
            <summary>When should I add weight or reps?</summary>
            <ul className="tips">
              <li><strong>Add weight</strong> when you finished all sets and reps with clean form and the last set still had <strong>1–2 reps in the tank</strong> — the bar moved smoothly, not a grind.</li>
              <li><strong>Add a rep</strong> when you hit your sets but the weight felt heavy, or your goal is muscle/endurance — earn the reps before adding load.</li>
              <li><strong>Keep the same</strong> if form broke down, bar speed slowed a lot, or any set felt maximal. Repeating a weight builds confidence and is never wasted.</li>
              <li><strong>Increment guide:</strong> big lifts (squat, deadlift) jump ~10 lb, upper-body presses/rows ~5 lb, and small isolation moves ~2.5 lb.</li>
            </ul>
          </details>
        )}

        {/* ---- Update estimated 1RMs from strong sets ---- */}
        {rmUpdates.length > 0 && (
          <div className="card">
            <p className="group-label">Update your 1RM?</p>
            <p className="muted small">A strong set beat your saved max — update it so recommended weights stay accurate.</p>
            {rmUpdates.map((u) => (
              <div className="review-row rm-row" key={u.exId}>
                <span className="review-name">
                  {u.name}
                  <span className="muted small"> · {u.weight}×{u.reps} → {u.oneRM} {units}{u.prev > 0 ? ` (was ${u.prev})` : ''}</span>
                </span>
                {rmDone[u.exId]
                  ? <span className="rm-done"><span aria-hidden="true">✓</span> Updated</span>
                  : <button type="button" className="btn btn-ghost btn-sm" onClick={() => applyRmUpdate(u)}>Update</button>}
              </div>
            ))}
          </div>
        )}

        {review.autoNotes.length > 0 && (
          <div className="card notice">
            <p className="group-label">Adjusted automatically</p>
            {review.autoNotes.map((n, i) => <p className="muted small progress-note" key={i}>{n}</p>)}
          </div>
        )}

        <div className="flow-actions">
          <button className="btn btn-primary" onClick={done}>
            {review.suggestions.length ? 'Save & finish' : 'Done'}
          </button>
        </div>

        {/* ---- Share session (optional, after the primary finish action) ---- */}
        <div className="card share-card">
          <p className="group-label">Share this session</p>
          <p className="muted small">Copy a text recap to paste into a Strava activity, your notes, or socials.</p>
          <div className="share-actions">
            <button type="button" className="btn btn-ghost" onClick={shareSummary}>
              {canShare ? 'Share…' : 'Copy summary'}
            </button>
            {canShare && (
              <button type="button" className="btn btn-ghost" onClick={copySummary}>Copy</button>
            )}
          </div>
          {shareStatus === 'copied' && <p className="muted small share-note"><span aria-hidden="true">✓</span> Copied to clipboard — paste it into Strava.</p>}
          {shareStatus === 'shared' && <p className="muted small share-note"><span aria-hidden="true">✓</span> Shared.</p>}
          {shareStatus === 'error' && <p className="muted small share-note">Couldn’t copy — long-press to select instead.</p>}
        </div>
      </section>
    )
  }

  return (
    <section className="page full-flow workout">
      <header className="page-header">
        <div className="workout-head-row">
          <p className="eyebrow">{session.dayLabel} · Workout</p>
          <button type="button" className={'edit-toggle' + (editMode ? ' is-on' : '')} onClick={finishEditPill}>
            {editMode ? 'Done' : <><Icon name="edit" size={14} /> Edit</>}
          </button>
        </div>
        <h1>{session.title}</h1>
        <div className="progress-track" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${(doneSets / Math.max(1, totalSets)) * 100}%` }} />
        </div>
        <p className="muted small">{doneSets} / {totalSets} sets done</p>
        <div className="mode-row">
          <span className="muted small">Training at</span>
          <div className="seg seg-sm">
            {PROFILE_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className={'seg-item' + (activeProfile === id ? ' is-selected' : '')}
                aria-pressed={activeProfile === id}
                onClick={() => switchProfile(id)}
              >
                <span aria-hidden="true">{profileMeta(id).icon}</span> {profileMeta(id).name}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="step-body">
        {showResumed && (
          <div className="card notice resumed-banner">
            <p className="muted small">Resumed your in-progress session — your logged sets are back.</p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={startOver}>Start over</button>
          </div>
        )}
        {(() => {
          const n = exercises.filter((ex) => !isDoable(ex, availableSet)).length
          return n > 0 ? (
            <div className="card notice swap-banner">
              <p className="muted small">
                <span aria-hidden="true">🏠</span> {n} move{n === 1 ? '' : 's'} need gear you don&apos;t have in {profileMeta(activeProfile).name} mode.
              </p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={swapAllUnavailable}>
                Swap all to what I can do
              </button>
            </div>
          ) : null
        })()}
        {stretching && (
          <StretchPanel
            muscles={Object.keys(plannedMuscleHeat(exercises))}
            phase="dynamic"
            title="Warm-up"
            subtitle="Dynamic moves to prime the muscles you're about to train."
          />
        )}
        {exercises.map((ex, exIdx) => {
          const loaded = ex.load !== false
          // Show a weight box whenever the move can take weight — always for
          // loaded lifts, optionally for bodyweight moves that accept it
          // (pull-ups/dips with a belt, reverse lunges with dumbbells…).
          const showWeight = tracksLoad(ex)
          const optionalLoad = loadIsOptional(ex)
          const doable = isDoable(ex, availableSet)
          const sub = doable ? null : bestSubstitute(ex, availableSet)
          const plateTarget = showPlates && loaded && isBarbellLift(ex) ? nextSetTarget(ex, sets[ex.id]) : null
          // The set row the plate math is loaded for, so we can highlight it.
          const activePlateIdx = plateTarget ? plateTarget.setNumber - 1 : -1
          // Bodyweight moves progress by variation — show where they sit in the ladder.
          const lad = !loaded ? ladderInfo(ex.id) : null
          // Every working set logged? De-emphasise the finished exercise so the
          // eye falls on what's left — but restore full weight while editing.
          const workingRows = (sets[ex.id] || []).filter((r) => !r.warmup)
          const exComplete = workingRows.length > 0 && workingRows.every((r) => r.done)
          const dimmed = exComplete && !editMode
          // Superset bracket: consecutive exercises carrying supersetNext form a
          // group. Draw a connecting frame and a "top" header on the first.
          const groupedWithPrev = !!exercises[exIdx - 1]?.supersetNext
          const groupedWithNext = !!ex.supersetNext && !editMode
          const inSuperset = (groupedWithPrev || groupedWithNext) && !editMode
          const ssTop = inSuperset && !groupedWithPrev
          const ssBottom = inSuperset && !groupedWithNext
          return (
            <Fragment key={ex.id}>
            {ssTop && (
              <div className="superset-head">
                <span className="superset-badge"><span aria-hidden="true">⛓</span> Superset</span>
                <span className="muted small">Alternate these — rest after the round</span>
              </div>
            )}
            <div className={'card exercise-card'
              + (doable ? '' : ' is-unavailable')
              + (dimmed ? ' is-complete' : '')
              + (inSuperset ? ' superset-member' : '')
              + (ssTop ? ' superset-top' : '')
              + (ssBottom ? ' superset-bottom' : '')}>
              <div className="exercise-top">
                <MuscleMap pattern={ex.pattern} exId={ex.id} size={104} />
                <div className="exercise-headings">
                  <div className="ex-title-row">
                    <p className="ex-name big">{ex.name}{ex.adhoc ? <span aria-hidden="true"> ＋</span> : ''}</p>
                    {dimmed && <span className="ex-done-chip"><span aria-hidden="true">✓</span> Done</span>}
                    {editMode
                      ? <button type="button" className="icon-btn" onClick={() => removeExercise(ex.id)} aria-label={`Remove ${ex.name}`}><span aria-hidden="true">✕</span></button>
                      : <FormCheckButton name={ex.name} />}
                  </div>
                  <p className="muted small">
                    {sets[ex.id]?.filter((r) => !r.warmup).length ?? ex.sets} sets × {repsLabel(ex)}{ex.amrap ? '+' : ''} {measureUnit(ex)} · {ex.restSec}s rest
                    {sets[ex.id]?.some((r) => r.warmup) ? ' · + warm-ups' : ''}
                  </p>
                  {ex.swappedFrom && (
                    <p className="muted small swapped-note">↔ swapped from {ex.swappedFrom} for your gear</p>
                  )}
                  {lastTime[ex.id] && (
                    <p className="muted small last-time"><span aria-hidden="true">↩︎</span> Last time: {lastTime[ex.id]}</p>
                  )}
                </div>
              </div>

              {editMode && (
                <div className="rest-edit">
                  <span className="muted small">Rest timer</span>
                  <div className="rest-stepper">
                    <button type="button" onClick={() => adjustRest(ex.id, -15)} aria-label="less rest">–</button>
                    <span>{ex.restSec}s</span>
                    <button type="button" onClick={() => adjustRest(ex.id, 15)} aria-label="more rest">+</button>
                  </div>
                </div>
              )}

              {!doable && (
                <div className="swap-note">
                  <span className="muted small">
                    <span aria-hidden="true">🏠</span> Needs {missingEquipment(ex, availableSet).join(', ')} — not in {profileMeta(activeProfile).name}.
                  </span>
                  {sub
                    ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => swapExercise(ex.id, sub)}>Swap → {sub.name}</button>
                    : (
                      <>
                        <span className="muted small">No alternative with your current gear.</span>
                        {/* No substitute exists — give a direct way out instead of
                            forcing a trip into edit mode + a long scroll. */}
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeExercise(ex.id)}>Remove</button>
                      </>
                    )}
                </div>
              )}

              <p className="cue">{ex.cues}</p>
              {ex.progression && <p className="suggestion">{weekNote(ex, units) || stageNote(ex, units) || extraNote(ex, units)}</p>}
              {lad && lad.length > 1 && (
                <div className="ladder-hint">
                  <p className="suggestion" style={{ margin: 0 }}>
                    Progression ladder · step {lad.index + 1} of {lad.length}
                    {lad.nextName
                      ? ` — next: ${lad.nextName}. Level up once you can do all ${ex.sets} sets at ${ex.repHigh} ${measureUnit(ex)} with clean form.`
                      : " — you're at the hardest step. Keep adding reps."}
                  </p>
                  <div className="ladder-steps">
                    <button
                      type="button"
                      className="ladder-step-btn"
                      disabled={!lad.prevId}
                      onClick={() => stepLadder(ex.id, -1)}
                    >
                      <span aria-hidden="true">↓</span> Easier{lad.prevName ? `: ${lad.prevName}` : ''}
                    </button>
                    <button
                      type="button"
                      className="ladder-step-btn"
                      disabled={!lad.nextId}
                      onClick={() => stepLadder(ex.id, 1)}
                    >
                      <span aria-hidden="true">↑</span> Harder{lad.nextName ? `: ${lad.nextName}` : ''}
                    </button>
                  </div>
                </div>
              )}
              {plateTarget && (
                <PlateBreakdown
                  weight={plateTarget.weight}
                  units={units}
                  setNumber={plateTarget.total > 1 ? plateTarget.setNumber : null}
                />
              )}

              {optionalLoad && (
                <p className="muted small optional-load-hint">
                  Bodyweight — leave the {units} blank, or add weight (a belt, dumbbells, or a vest) to load it.
                </p>
              )}
              {ex.amrap && (
                // The sr-only span + title tooltip on the set number do nothing on
                // touch, so AMRAP's meaning was invisible to sighted mobile users.
                // A visible caption fixes that without needing to tap anything.
                <p className="muted small">Last set: do as many reps as you can.</p>
              )}
              <div className={'set-table' + (showWeight ? '' : ' no-load')}>
                <div className="set-head">
                  <span>Set</span>
                  {showWeight && (
                    <span title={optionalLoad ? 'Optional added weight' : undefined}>
                      {optionalLoad ? `+${units}` : isTwoDumbbell(ex) ? `${units} (each)` : units}
                    </span>
                  )}
                  <span>{measureUnit(ex)}</span>
                  <span>done</span>
                </div>
                {(() => {
                  let workingN = 0
                  const rows = sets[ex.id] || []
                  const weightStep = weightStepFor(ex, units)
                  return rows.map((row, idx) => {
                  const isAmrapSet = ex.amrap && idx === rows.length - 1
                  if (!row.warmup) workingN += 1
                  const setLabel = row.warmup ? 'Warm-up set' : `Set ${workingN}${isAmrapSet ? ' (AMRAP — as many reps as possible)' : ''}`
                  return (
                    <div className={'set-line' + (row.done ? ' done' : '') + (row.warmup ? ' is-warmup' : '') + (idx === activePlateIdx ? ' is-plate-target' : '')} key={idx}>
                      <span className="set-num" title={row.warmup ? 'Warm-up set' : isAmrapSet ? 'AMRAP — as many reps as possible' : undefined}>
                        {row.warmup ? 'W' : workingN}{isAmrapSet ? '+' : ''}
                        <span className="sr-only">{setLabel}</span>
                      </span>
                      {showWeight && (
                        <div className="set-field">
                          <button
                            type="button"
                            className="set-stepper-btn"
                            aria-label={`Subtract ${weightStep} ${units} from ${setLabel} weight`}
                            onClick={() => bumpSet(ex.id, idx, 'weight', -weightStep)}
                          >
                            –
                          </button>
                          <input
                            className="set-input"
                            type="number"
                            inputMode="decimal"
                            aria-label={`${setLabel} weight (${units})`}
                            value={row.weight}
                            placeholder={optionalLoad ? 'bw' : '–'}
                            onChange={(e) => updateSet(ex.id, idx, 'weight', e.target.value)}
                          />
                          <button
                            type="button"
                            className="set-stepper-btn"
                            aria-label={`Add ${weightStep} ${units} to ${setLabel} weight`}
                            onClick={() => bumpSet(ex.id, idx, 'weight', weightStep)}
                          >
                            +
                          </button>
                        </div>
                      )}
                      <div className="set-field">
                        <button
                          type="button"
                          className="set-stepper-btn"
                          aria-label={`Subtract 1 rep from ${setLabel}`}
                          onClick={() => bumpSet(ex.id, idx, 'reps', -1)}
                        >
                          –
                        </button>
                        <input
                          className="set-input"
                          type="number"
                          inputMode="numeric"
                          aria-label={`${setLabel} reps`}
                          value={row.reps}
                          placeholder="–"
                          onChange={(e) => updateSet(ex.id, idx, 'reps', e.target.value)}
                        />
                        <button
                          type="button"
                          className="set-stepper-btn"
                          aria-label={`Add 1 rep to ${setLabel}`}
                          onClick={() => bumpSet(ex.id, idx, 'reps', 1)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className={'set-check' + (row.done ? ' is-on' : '')}
                        aria-label={row.done ? 'Mark set incomplete' : 'Mark set complete'}
                        aria-pressed={row.done}
                        onClick={() => toggleDone(ex.id, idx, ex.restSec)}
                      >
                        <span aria-hidden="true">✓</span>
                      </button>
                    </div>
                  )
                  })
                })()}
              </div>

              {exMeasure(ex).type !== 'time' && (() => {
                const working = (sets[ex.id] || []).filter((r) => !r.warmup)
                if (working.length < 2) return null
                const first = working[0]
                const repsOk = String(first?.reps ?? '').trim() !== ''
                const weightOk = !showWeight || String(first?.weight ?? '').trim() !== ''
                const anyToFill = working.slice(1).some((r) => !r.done)
                if (!repsOk || !weightOk || !anyToFill) return null
                return (
                  <button type="button" className="btn btn-ghost btn-sm fill-down" onClick={() => fillDown(ex.id)}>
                    <span aria-hidden="true">↓</span> Copy set 1 down
                  </button>
                )
              })()}

              {exMeasure(ex).type === 'time' && (() => {
                const rows = sets[ex.id] || []
                const nextIdx = rows.findIndex((r) => !r.done && !r.warmup)
                if (nextIdx === -1) return null
                const target = Number(rows[nextIdx].reps) || Number(ex.repHigh) || 30
                const where = ex.iso ? isoHoldFor(ex.id) : null
                return (
                  <>
                    <button type="button" className="btn btn-ghost btn-sm hold-start" onClick={() => startHold(ex)}>
                      <Icon name="play" size={13} /> Time a {target}s hold
                    </button>
                    {where && <p className="muted small hold-where"><strong>Where to hold:</strong> {where}</p>}
                  </>
                )
              })()}

              {editMode && (() => {
                const working = (sets[ex.id] || []).filter((r) => !r.warmup).length
                return (
                  <div className="set-adjust">
                    <button type="button" onClick={() => changeSetCount(ex.id, -1)} disabled={working <= 1} aria-label="Remove a set">– set</button>
                    <span className="muted small">{working} working set{working === 1 ? '' : 's'}</span>
                    <button type="button" onClick={() => changeSetCount(ex.id, 1)} aria-label="Add a set">+ set</button>
                  </div>
                )
              })()}
            </div>
            </Fragment>
          )
        })}

        {/* Cardio logged this session — a real card, same weight as any lift. */}
        {loggedCardio.map((c, i) => {
          const meta = CARDIO_BY_ID[c.machine]
          const stats = [
            Number(c.durationMin) > 0 ? `${c.durationMin} min` : '',
            Number(c.distance) > 0 ? `${c.distance} ${c.distanceUnit || ''}`.trim() : '',
            Number(c.avgHr) > 0 ? `${c.avgHr} bpm` : '',
            Number(c.calories) > 0 ? `${c.calories} cal` : '',
          ].filter(Boolean).join(' · ')
          return (
            <div className="card exercise-card cardio-card" key={c.id || i}>
              <div className="exercise-top">
                <span className="cardio-card-icon" aria-hidden="true"><Icon name="cardio" size={38} /></span>
                <div className="exercise-headings">
                  <div className="ex-title-row">
                    <p className="ex-name big">{c.machineName || meta?.name || 'Cardio'}</p>
                    <span className="ex-done-chip"><span aria-hidden="true">✓</span> Done</span>
                    <button type="button" className="icon-btn" onClick={() => removeLoggedCardio(c)} aria-label="Remove this cardio"><span aria-hidden="true">✕</span></button>
                  </div>
                  <p className="muted small">{stats || 'Logged'}</p>
                  {c.notes && <p className="muted small">{c.notes}</p>}
                </div>
              </div>
            </div>
          )
        })}

        {Array.isArray(session?.cardio) && session.cardio.length > 0 && (
          <div className="planned-cardio">
            <p className="group-label">Cardio</p>
            {session.cardio.map((c, i) => {
              const logged = loggedCardio.some((e) => e.machine === c.machine)
              const target = [
                Number(c.targetMin) > 0 ? `${c.targetMin} min` : '',
                Number(c.targetDistance) > 0 ? `${c.targetDistance} ${c.distanceUnit || ''}`.trim() : '',
              ].filter(Boolean).join(' · ')
              return (
                <div className={'planned-cardio-row' + (logged ? ' is-logged' : '')} key={i}>
                  <span className="machine-icon"><Icon name="cardio" size={18} /></span>
                  <span className="ex-name">{c.machineName || CARDIO_BY_ID[c.machine]?.name || 'Cardio'}</span>
                  {target && <span className="muted small">{target}</span>}
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => { setCardioMachine(c.machine || 'treadmill'); setCardioOpen(true) }}
                  >
                    {logged ? <><span aria-hidden="true">✓</span> Logged</> : 'Log'}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <div className="add-row">
          <button type="button" className="add-action" onClick={() => setPickerOpen(true)}>Add exercise</button>
          <button type="button" className="add-action" onClick={() => { setCardioMachine('treadmill'); setCardioOpen(true) }}>Log cardio</button>
          <button type="button" className="add-action" onClick={() => setOneRmOpen(true)}>1RM calc</button>
        </div>

        {editMode && (
          <div className="edit-actions">
            <button type="button" className="btn btn-ghost" onClick={cancelEdits}>Cancel changes</button>
            <button type="button" className="btn btn-primary" onClick={saveEdits}>Done editing</button>
          </div>
        )}
      </div>

      <div className="flow-actions">
        <button
          className="btn btn-ghost"
          onClick={() => {
            if (doneSets > 0 && !window.confirm('Exit without finishing? Your sets are saved — resume anytime and tap Finish to record it.')) return
            navigate('/today')
          }}
        >
          {doneSets > 0 ? 'Save & exit' : 'Exit'}
        </button>
        <button className="btn btn-primary" onClick={finish}>Finish workout</button>
      </div>

      {hold && <RestTimer key={hold.key} seconds={hold.seconds} mode="hold" onDone={finishHold} />}
      {!supersetTimers && rest && <RestTimer key={rest.key} seconds={rest.seconds} onDone={() => setRest(null)} />}
      {supersetTimers && <RestTimers timers={rests} onDone={(key) => setRests((rs) => rs.filter((t) => t.key !== key))} />}

      {pickerOpen && (
        <ExercisePicker onPick={addExercise} onClose={() => setPickerOpen(false)} />
      )}
      {oneRmOpen && (
        <QuickOneRM units={units} onClose={() => setOneRmOpen(false)} />
      )}
      {cardioOpen && (
        <div className="picker-overlay" role="dialog" aria-modal="true" aria-label="Log cardio" ref={cardioDialogRef} tabIndex={-1}>
          <div className="picker-sheet">
            <div className="picker-head">
              <p className="ex-name big" style={{ flex: 1 }}>Log cardio</p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCardioOpen(false)}>Close</button>
            </div>
            <div className="picker-list">
              <CardioForm onSaved={logCardio} units={units} initialMachine={cardioMachine} />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
