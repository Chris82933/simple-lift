import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  loadActiveProgram, loadSettings, appendWorkout, updateProgram, advanceRotation,
  addCardio, addProgram, updateWorkout, loadHistory, loadMaxes, saveMax,
  loadActiveSession, saveActiveSession, clearActiveSession,
} from '../lib/storage.js'
import { sessionRecords, buildSessionSummary, prShort } from '../lib/records.js'
import { repsLabel, schemeForGoals, prescriptionFor } from '../data/schemes.js'
import { stageNote, applyStage } from '../lib/gzclp.js'
import { extraNote } from '../lib/progression.js'
import { reviewSession, applyChoices, INCREMENTS } from '../lib/sessionReview.js'
import { methodFor, recommendChoice, recommendReason, methodName } from '../lib/progressionMethods.js'
import ExerciseFigure from '../components/ExerciseFigure.jsx'
import FormCheckButton from '../components/FormCheckButton.jsx'
import RestTimer from '../components/RestTimer.jsx'
import ExercisePicker from '../components/ExercisePicker.jsx'
import CardioForm from '../components/CardioForm.jsx'
import QuickOneRM from '../components/QuickOneRM.jsx'
import PlateBreakdown from '../components/PlateBreakdown.jsx'
import {
  getEquipment, setActiveProfile as storeSetActiveProfile, isDoable, bestSubstitute,
  missingEquipment, profileMeta, PROFILE_IDS, activeEquipmentIds, resolveExercisesForEquipment,
} from '../lib/equipment.js'
import { isBarbellLift } from '../lib/plates.js'
import { ladderInfo } from '../lib/ladder.js'
import { measureUnit, exMeasure, EXERCISE_BY_ID } from '../data/exercises.js'
import { warmupSets, incrementForUnits } from '../lib/oneRepMax.js'

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

// Post-session difficulty ratings (saved to history).
const DIFFICULTIES = [
  { id: 'easy', label: '😎 Easy' },
  { id: 'moderate', label: '🙂 Just right' },
  { id: 'hard', label: '😤 Hard' },
  { id: 'maxed', label: '🥵 Maxed out' },
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
function applyPersist(program, dayIndex, persist) {
  const exercises = program.days[dayIndex].exercises.map((ex) => {
    const p = persist.find((x) => x.exId === ex.id)
    if (!p) return ex
    let next = { ...ex }
    if (p.startWeight != null) next.startWeight = p.startWeight
    if (p.progression) next = applyStage({ ...next, progression: p.progression })
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

// Fresh set-tracking state for a session: warm-up ramp (rep-measured loaded
// compounds) + working sets prefilled with the stored working weight.
function buildInitialSets(session, units) {
  const initial = {}
  const inc = incrementForUnits(units)
  if (session) {
    for (const ex of session.exercises) {
      const stored = ex.progression?.weight != null ? ex.progression.weight : ex.startWeight
      const weight = ex.load !== false && stored !== '' && stored != null ? String(stored) : ''
      const warms = ex.warmups && weight && exMeasure(ex).type === 'reps'
        ? warmupSets(Number(weight), inc).map((s) => ({ weight: String(s.weight), reps: String(s.reps), done: false, warmup: true }))
        : []
      const working = Array.from({ length: ex.sets }, () => ({ weight, reps: String(ex.repHigh), done: false }))
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
  const settings = loadSettings()
  const units = settings.units || 'lbs'
  const showPlates = settings.hidePlateCalc !== true
  const restEnabled = settings.restTimer !== false // rest timer on unless turned off

  // Snapshot the program & session once at mount so mid-session edits don't reload the live workout.
  const stateDayIndex = location.state?.dayIndex
  const [snapshot] = useState(() => {
    const program = loadActiveProgram()
    const dayIndex = program ? defaultDayIndex(program, stateDayIndex) : 0
    const raw = program?.days[dayIndex] ?? null
    // Swap each move to the best version for the user's current equipment, then
    // apply any progression scheme staging.
    const forGear = raw ? resolveExercisesForEquipment(raw.exercises, activeEquipmentIds()) : []
    const session = raw
      ? { ...raw, exercises: forGear.map((e) => (e.progression ? applyStage(e) : e)) }
      : null
    // A saved in-progress session for THIS program+day, with real progress
    // (at least one logged set) → offer to resume it.
    const saved = loadActiveSession()
    const hasProgress = saved && saved.sets && Object.values(saved.sets).some(
      (rows) => Array.isArray(rows) && rows.some((r) => r.done),
    )
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
  const [sets, setSets] = useState(() => (resumed ? resumed.sets : buildInitialSets(session, units)))

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
  const [oneRmOpen, setOneRmOpen] = useState(false)
  const [cardioSaved, setCardioSaved] = useState(0)
  const [loggedCardio, setLoggedCardio] = useState([]) // this session's cardio, for the share summary

  const [rest, setRest] = useState(null)
  const [finished, setFinished] = useState(false)
  const [finishedAt, setFinishedAt] = useState(null)
  const [review, setReview] = useState({ autoNotes: [], suggestions: [] })
  const [choices, setChoices] = useState({})

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

  // Persist the live session (debounced) so it survives a close / crash / iOS
  // storage eviction — and can be resumed. Cleared once the workout finishes.
  useEffect(() => {
    if (!session || finished) return
    const t = setTimeout(() => {
      saveActiveSession({ programId: program.id, dayIndex, sessionTitle: session.title, exercises, sets, savedAt: Date.now() })
    }, 500)
    return () => clearTimeout(t)
  }, [exercises, sets, finished, program, dayIndex, session])

  // Discard a resumed session and start this day fresh.
  const startOver = () => {
    clearActiveSession()
    setExercises(session ? session.exercises : [])
    setSets(buildInitialSets(session, units))
    setShowResumed(false)
  }

  // Add an exercise to this session (one-off — not saved to the program).
  const addExercise = (ex) => {
    if (exercises.some((e) => e.id === ex.id)) return // avoid dup ids/state collision
    const scheme = schemeForGoals(goals)
    const p = prescriptionFor(ex, scheme)
    const entry = {
      id: ex.id, name: ex.name, pattern: ex.pattern, regions: ex.regions,
      compound: ex.compound, load: ex.load !== false, cues: ex.cues,
      ladderId: ex.ladderId || null, nextId: ex.nextId || null,
      sets: p.sets, repLow: p.repLow, repHigh: p.repHigh, restSec: p.restSec, startWeight: '', adhoc: true,
    }
    setExercises((list) => [...list, entry])
    setSets((s) => ({
      ...s,
      [ex.id]: Array.from({ length: p.sets }, () => ({ weight: '', reps: String(p.repHigh), done: false })),
    }))
  }

  const removeExercise = (exId) => {
    setExercises((list) => list.filter((e) => e.id !== exId))
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
    const p = prescriptionFor(sub, schemeForGoals(goals))
    const entry = {
      id: sub.id, name: sub.name, pattern: sub.pattern, regions: sub.regions,
      compound: sub.compound, load: sub.load !== false, cues: sub.cues,
      ladderId: sub.ladderId || null, nextId: sub.nextId || null,
      sets: p.sets, repLow: p.repLow, repHigh: p.repHigh, restSec: p.restSec,
      startWeight: '', adhoc: true,
    }
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
    const entry = {
      ...ex,
      id: target.id, name: target.name, pattern: target.pattern, regions: target.regions,
      compound: target.compound, load: target.load !== false, cues: target.cues,
      ladderId: target.ladderId || null, nextId: target.nextId || null, prevId: target.prevId || null,
    }
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

  const logCardio = (entry) => { addCardio(entry); setLoggedCardio((l) => [...l, entry]); setCardioSaved((n) => n + 1); setCardioOpen(false) }

  if (!program || !session) {
    return (
      <section className="page full-flow">
        <header className="page-header"><h1>No workout</h1></header>
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
      [exId]: s[exId].map((row, i) => (i === idx ? { ...row, [field]: value } : row)),
    }))

  const toggleDone = (exId, idx, restSec) =>
    setSets((s) => {
      const row = s[exId][idx]
      const nowDone = !row.done
      // No rest after the final set of an exercise — nothing left to rest for.
      const isLastSet = idx === s[exId].length - 1
      if (nowDone && !isLastSet && restEnabled) setRest({ seconds: restSec, key: `${exId}-${idx}-${Date.now()}` })
      return { ...s, [exId]: s[exId].map((r, i) => (i === idx ? { ...r, done: nowDone } : r)) }
    })

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

  // Working sets only — warm-ups don't count toward the session's progress.
  const totalSets = exercises.reduce((n, ex) => n + (sets[ex.id]?.filter((r) => !r.warmup).length || ex.sets), 0)
  const doneSets = Object.values(sets).flat().filter((r) => r.done && !r.warmup).length

  const finish = () => {
    const date = new Date().toISOString()
    const entries = exercises.map((ex) => ({ exerciseId: ex.id, name: ex.name, adhoc: !!ex.adhoc, sets: sets[ex.id] }))

    // Detect PRs and fresh 1RM estimates against the history *before* this session.
    const { prs: newPrs, oneRMUpdates } = sessionRecords(entries, loadHistory(), loadMaxes())
    appendWorkout({ date, programId: program.id, sessionTitle: session.title, dayIndex, entries, prs: newPrs })
    clearActiveSession() // session is logged — no longer resumable
    setPrs(newPrs)
    setRmUpdates(oneRMUpdates)
    setRmDone({})
    setFinishedAt(date)

    // Carry values forward + auto-apply deloads; collect optional increase suggestions.
    // Ad-hoc adds aren't in the program, so they can't persist/progress — exclude them.
    const programIds = new Set(program.days[dayIndex].exercises.map((e) => e.id))
    const result = reviewSession({ ...session, exercises }, sets, goals, units, method)
    result.persist = result.persist.filter((p) => programIds.has(p.exId))
    result.suggestions = result.suggestions.filter((s) => programIds.has(s.exId))
    const fresh = loadActiveProgram()
    if (fresh) updateProgram(applyPersist(fresh, dayIndex, result.persist))
    advanceRotation(program.id, dayIndex)

    // Did they restructure the workout since the last save? If so, offer to save.
    setCustomized(isCustomized(baseline, exercises))

    // Default is always "keep the same" — increases are an explicit choice.
    const initChoices = {}
    result.suggestions.forEach((s) => { initChoices[s.exId] = 'keep' })
    setChoices(initChoices)
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
    const entries = exercises.map((ex) => ({ name: ex.name, exerciseId: ex.id, sets: sets[ex.id] }))
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
          <p className="eyebrow">Nice work 🎉</p>
          <h1>Session complete</h1>
        </header>

        <div className="card">
          <p className="placeholder-title">{session.title}</p>
          <p className="muted">{doneSets} of {totalSets} sets logged. Your weights are saved for next time.</p>
        </div>

        {/* ---- Personal records ---- */}
        {prs.length > 0 && (
          <div className="card pr-card">
            <p className="pr-title">🏆 New personal record{prs.length === 1 ? '' : 's'}!</p>
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
                onClick={() => setDifficulty((cur) => (cur === d.id ? null : d.id))}
              >
                {d.label}
              </button>
            ))}
          </div>
          <textarea
            className="text-input notes-input"
            placeholder="Notes — how it went, aches, PRs, what to try next time…"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

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
                  ? <span className="rm-done">✓ Updated</span>
                  : <button type="button" className="btn btn-ghost btn-sm" onClick={() => applyRmUpdate(u)}>Update</button>}
              </div>
            ))}
          </div>
        )}

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
                  <span className="review-name">{sug.type === 'levelUp' ? '🚀' : sug.type === 'levelDown' ? '🔽' : '✅'} {sug.name}</span>
                  <div className="choice-chips">
                    {optionsFor(sug, units).map((opt) => {
                      const isRec = rec ? opt.key === rec : opt.recommended
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          className={'chip' + (choices[sug.exId] === opt.key ? ' is-selected' : '') + (isRec ? ' is-recommended' : '')}
                          onClick={() => setChoices((c) => ({ ...c, [sug.exId]: opt.key }))}
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

        {review.autoNotes.length > 0 && (
          <div className="card notice">
            <p className="group-label">Adjusted automatically</p>
            {review.autoNotes.map((n, i) => <p className="muted small progress-note" key={i}>🔧 {n}</p>)}
          </div>
        )}

        {/* ---- Share session ---- */}
        <div className="card">
          <p className="group-label">Share this session</p>
          <p className="muted small">Copy a text recap to paste into a Strava activity, your notes, or socials.</p>
          <div className="share-actions">
            <button type="button" className="btn btn-ghost" onClick={shareSummary}>
              {canShare ? 'Share…' : '📋 Copy summary'}
            </button>
            {canShare && (
              <button type="button" className="btn btn-ghost" onClick={copySummary}>📋 Copy</button>
            )}
          </div>
          {shareStatus === 'copied' && <p className="muted small share-note">✓ Copied to clipboard — paste it into Strava.</p>}
          {shareStatus === 'shared' && <p className="muted small share-note">✓ Shared.</p>}
          {shareStatus === 'error' && <p className="muted small share-note">Couldn’t copy — long-press to select instead.</p>}
        </div>

        <div className="flow-actions">
          <button className="btn btn-primary" onClick={done}>
            {review.suggestions.length ? 'Save & finish' : 'Done'}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="page full-flow workout">
      <header className="page-header">
        <div className="workout-head-row">
          <p className="eyebrow">{session.dayLabel} · Workout</p>
          <button type="button" className={'edit-toggle' + (editMode ? ' is-on' : '')} onClick={() => (editMode ? saveEdits() : enterEdit())}>
            {editMode ? 'Done editing' : '✎ Edit'}
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
                onClick={() => switchProfile(id)}
              >
                {profileMeta(id).icon} {profileMeta(id).name}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="step-body">
        {showResumed && (
          <div className="card notice resumed-banner">
            <p className="muted small">↩️ Resumed your in-progress session — your logged sets are back.</p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={startOver}>Start over</button>
          </div>
        )}
        {(() => {
          const n = exercises.filter((ex) => !isDoable(ex, availableSet)).length
          return n > 0 ? (
            <div className="card notice swap-banner">
              <p className="muted small">
                🏠 {n} move{n === 1 ? '' : 's'} need gear you don&apos;t have in {profileMeta(activeProfile).name} mode.
              </p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={swapAllUnavailable}>
                Swap all to what I can do
              </button>
            </div>
          ) : null
        })()}
        {exercises.map((ex) => {
          const tracksLoad = ex.load !== false
          const doable = isDoable(ex, availableSet)
          const sub = doable ? null : bestSubstitute(ex, availableSet)
          const plateTarget = showPlates && tracksLoad && isBarbellLift(ex) ? nextSetTarget(ex, sets[ex.id]) : null
          // The set row the plate math is loaded for, so we can highlight it.
          const activePlateIdx = plateTarget ? plateTarget.setNumber - 1 : -1
          // Bodyweight moves progress by variation — show where they sit in the ladder.
          const lad = !tracksLoad ? ladderInfo(ex.id) : null
          return (
            <div className={'card exercise-card' + (doable ? '' : ' is-unavailable')} key={ex.id}>
              <div className="exercise-top">
                <ExerciseFigure pattern={ex.pattern} size={52} />
                <div className="exercise-headings">
                  <div className="ex-title-row">
                    <p className="ex-name big">{ex.name}{ex.adhoc ? ' ＋' : ''}</p>
                    {editMode
                      ? <button type="button" className="icon-btn" onClick={() => removeExercise(ex.id)} aria-label={`Remove ${ex.name}`}>✕</button>
                      : <FormCheckButton name={ex.name} />}
                  </div>
                  <p className="muted small">
                    {sets[ex.id]?.filter((r) => !r.warmup).length ?? ex.sets} sets × {repsLabel(ex)}{ex.amrap ? '+' : ''} {measureUnit(ex)} · {ex.restSec}s rest
                    {sets[ex.id]?.some((r) => r.warmup) ? ' · + warm-ups' : ''}
                    {ex.compound ? ' · compound' : ''}
                  </p>
                  {ex.swappedFrom && (
                    <p className="muted small swapped-note">↔ swapped from {ex.swappedFrom} for your gear</p>
                  )}
                  {lastTime[ex.id] && (
                    <p className="muted small last-time">↩︎ Last time: {lastTime[ex.id]}</p>
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
                    🏠 Needs {missingEquipment(ex, availableSet).join(', ')} — not in {profileMeta(activeProfile).name}.
                  </span>
                  {sub
                    ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => swapExercise(ex.id, sub)}>Swap → {sub.name}</button>
                    : <span className="muted small">No alternative with your current gear — swap gear or remove it.</span>}
                </div>
              )}

              <p className="cue">💡 {ex.cues}</p>
              {ex.progression && <p className="suggestion">{stageNote(ex, units) || extraNote(ex, units)}</p>}
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
                      ↓ Easier{lad.prevName ? `: ${lad.prevName}` : ''}
                    </button>
                    <button
                      type="button"
                      className="ladder-step-btn"
                      disabled={!lad.nextId}
                      onClick={() => stepLadder(ex.id, 1)}
                    >
                      ↑ Harder{lad.nextName ? `: ${lad.nextName}` : ''}
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

              <div className={'set-table' + (tracksLoad ? '' : ' no-load')}>
                <div className="set-head">
                  <span>Set</span>
                  {tracksLoad && <span>{units}</span>}
                  <span>{measureUnit(ex)}</span>
                  <span>done</span>
                </div>
                {(() => { let workingN = 0; return sets[ex.id].map((row, idx) => {
                  const isAmrapSet = ex.amrap && idx === sets[ex.id].length - 1
                  if (!row.warmup) workingN += 1
                  return (
                    <div className={'set-line' + (row.done ? ' done' : '') + (row.warmup ? ' is-warmup' : '') + (idx === activePlateIdx ? ' is-plate-target' : '')} key={idx}>
                      <span className="set-num" title={row.warmup ? 'Warm-up set' : isAmrapSet ? 'AMRAP — as many reps as possible' : undefined}>
                        {row.warmup ? 'W' : workingN}{isAmrapSet ? '+' : ''}
                      </span>
                      {tracksLoad && (
                        <input
                          className="set-input"
                          type="number"
                          inputMode="decimal"
                          value={row.weight}
                          placeholder="–"
                          onChange={(e) => updateSet(ex.id, idx, 'weight', e.target.value)}
                        />
                      )}
                      <input
                        className="set-input"
                        type="number"
                        inputMode="numeric"
                        value={row.reps}
                        placeholder="–"
                        onChange={(e) => updateSet(ex.id, idx, 'reps', e.target.value)}
                      />
                      <button
                        type="button"
                        className={'set-check' + (row.done ? ' is-on' : '')}
                        aria-label={row.done ? 'Mark set incomplete' : 'Mark set complete'}
                        aria-pressed={row.done}
                        onClick={() => toggleDone(ex.id, idx, ex.restSec)}
                      >
                        ✓
                      </button>
                    </div>
                  )
                }) })()}
              </div>

              {editMode && (() => {
                const working = sets[ex.id].filter((r) => !r.warmup).length
                return (
                  <div className="set-adjust">
                    <button type="button" onClick={() => changeSetCount(ex.id, -1)} disabled={working <= 1} aria-label="Remove a set">– set</button>
                    <span className="muted small">{working} working set{working === 1 ? '' : 's'}</span>
                    <button type="button" onClick={() => changeSetCount(ex.id, 1)} aria-label="Add a set">+ set</button>
                  </div>
                )
              })()}
            </div>
          )
        })}

        <div className="add-row">
          <button type="button" className="add-action" onClick={() => setPickerOpen(true)}>Add exercise</button>
          <button type="button" className="add-action" onClick={() => setCardioOpen(true)}>Log cardio</button>
          <button type="button" className="add-action" onClick={() => setOneRmOpen(true)}>1RM calc</button>
        </div>
        {cardioSaved > 0 && <p className="muted small">✓ {cardioSaved} cardio session{cardioSaved === 1 ? '' : 's'} logged.</p>}

        {editMode && (
          <div className="edit-actions">
            <button type="button" className="btn btn-ghost" onClick={cancelEdits}>Cancel changes</button>
            <button type="button" className="btn btn-primary" onClick={saveEdits}>Done editing</button>
          </div>
        )}
      </div>

      <div className="flow-actions">
        <button className="btn btn-ghost" onClick={() => navigate('/today')}>Exit</button>
        <button className="btn btn-primary" onClick={finish}>Finish workout</button>
      </div>

      {rest && <RestTimer key={rest.key} seconds={rest.seconds} onDone={() => setRest(null)} />}

      {pickerOpen && (
        <ExercisePicker onPick={addExercise} onClose={() => setPickerOpen(false)} />
      )}
      {oneRmOpen && (
        <QuickOneRM units={units} onClose={() => setOneRmOpen(false)} />
      )}
      {cardioOpen && (
        <div className="picker-overlay" role="dialog" aria-label="Log cardio">
          <div className="picker-sheet">
            <div className="picker-head">
              <p className="ex-name big" style={{ flex: 1 }}>Log cardio</p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCardioOpen(false)}>Close</button>
            </div>
            <div className="picker-list">
              <CardioForm onSaved={logCardio} units={units} />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
