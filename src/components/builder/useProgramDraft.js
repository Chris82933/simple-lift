import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { EXERCISES, EXERCISE_BY_ID, exMeasure, matchInfo } from '../../data/exercises.js'
import { DEFAULT_METHOD } from '../../lib/progressionMethods.js'
import { prescriptionFor, schemeForGoals } from '../../data/schemes.js'
import { WEEKDAY_LABELS } from '../../lib/generator.js'
import {
  loadProfile, getProgram, addProgram, updateProgram, loadSettings,
  clampRotationPointer, getActiveProgramId, setActiveProgramId,
} from '../../lib/storage.js'
import { incrementForUnits } from '../../lib/oneRepMax.js'
import { ladderInfo } from '../../lib/ladder.js'
import { CARDIO_BY_ID } from '../../data/cardio.js'
import { exerciseEntryFromLibrary } from '../../lib/exerciseEntry.js'
import { getEquipment, activeEquipmentIds, isDoable } from '../../lib/equipment.js'
import { useToast } from '../Toast.jsx'
import {
  WEEKDAY_ORDER, exerciseErrors, makeExercise, reorderDays, reorderExercises, resolveStartWeight,
} from './draftLogic.js'

// An unsaved draft is kept here so leaving the builder — Cancel by mistake, a
// sidebar link, a reload, the phone killing the tab — never throws away a
// half-built program. Deliberately outside storage.js: it is scratch state for
// one device, not account data to export or sync.
const DRAFT_KEY = 'simple-lift:builder-draft'
const readSavedDraft = (editId) => {
  try {
    const v = JSON.parse(localStorage.getItem(DRAFT_KEY))
    return v && (v.editId || null) === (editId || null) && Array.isArray(v.draft?.days) ? v.draft : null
  } catch { return null }
}
const clearSavedDraft = () => { try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ } }

// The single source of truth for a program draft. Both the phone column and the
// desktop workspace render off this one hook, so there is no second copy of
// `save()` to drift out of sync — whichever view you built the program in, the
// object that lands in storage is byte-identical.
export default function useProgramDraft() {
  const navigate = useNavigate()
  const location = useLocation()
  const editId = location.state?.id || null
  const profile = loadProfile()

  // What the builder shows with nothing typed: the stored program when
  // editing, an empty shell otherwise. "Unsaved changes" = "differs from this".
  const [baseline] = useState(() => {
    if (editId) {
      const existing = getProgram(editId)
      if (existing) {
        return {
          name: existing.name,
          goals: existing.goals || [],
          progressionMethod: existing.progressionMethod || DEFAULT_METHOD,
          days: existing.days.map((d, i) => ({
            // Rotation/template days have no fixed weekday — assign one so the
            // Builder's weekday picker is a controlled input (not null).
            weekday: d.weekday ?? WEEKDAY_ORDER[i % 7],
            title: d.title,
            // Carried through the edit so save() can preserve them — a rehab
            // day's safety note and its "Recovery · Ankles" label would
            // otherwise be replaced with generic custom-program text.
            note: d.note,
            dayLabel: d.dayLabel,
            exercises: d.exercises.map((e) => ({
              ...e,
              repLow: e.repLow ?? e.reps ?? 8,
              repHigh: e.repHigh ?? e.reps ?? 8,
            })),
            cardio: d.cardio || [],
          })),
        }
      }
    }
    return {
      name: '',
      goals: profile?.goals?.length ? profile.goals : ['general'],
      progressionMethod: DEFAULT_METHOD,
      days: [{ weekday: 1, title: 'Day 1', exercises: [], cardio: [] }],
    }
  })
  const [recovered] = useState(() => readSavedDraft(editId))
  const [draft, setDraft] = useState(recovered || baseline)
  const baselineJson = useMemo(() => JSON.stringify(baseline), [baseline])
  const dirty = useMemo(() => JSON.stringify(draft) !== baselineJson, [draft, baselineJson])
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)

  // Keep the draft on disk while it differs from what is stored.
  useEffect(() => {
    try {
      if (dirty) localStorage.setItem(DRAFT_KEY, JSON.stringify({ editId, draft, at: Date.now() }))
      else localStorage.removeItem(DRAFT_KEY)
    } catch { /* storage full or unavailable — the in-memory draft still works */ }
  }, [dirty, draft, editId])

  const [picker, setPicker] = useState(null) // dayIndex being edited, or null
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false) // U6: false = filter to active-location gear
  const [creating, setCreating] = useState(false) // custom-exercise form open?
  const toast = useToast()

  // Say so when a draft came back, and offer the way out — otherwise reopening
  // the builder to find a half-finished program looks like a bug.
  useEffect(() => {
    if (!recovered) return
    toast.show('Picked up your unsaved draft', {
      actionLabel: 'Start fresh',
      onAction: () => { clearSavedDraft(); setDraft(baseline) },
    })
    // Once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cancel asks first when there is something to lose.
  const cancel = () => { if (dirty) setConfirmingDiscard(true); else navigate(-1) }
  const discardAndLeave = () => { clearSavedDraft(); setConfirmingDiscard(false); navigate(-1) }

  const scheme = useMemo(() => schemeForGoals(draft.goals), [draft.goals])
  const inc = incrementForUnits(loadSettings().units)

  const update = (patch) => setDraft((d) => ({ ...d, ...patch }))
  const updateDay = (i, patch) =>
    setDraft((d) => ({ ...d, days: d.days.map((day, j) => (j === i ? { ...day, ...patch } : day)) }))
  const updateExercise = (di, ei, patch) =>
    updateDay(di, {
      exercises: draft.days[di].exercises.map((e, j) => (j === ei ? { ...e, ...patch } : e)),
    })

  const addDay = () =>
    update({
      days: [...draft.days, { weekday: WEEKDAY_ORDER[draft.days.length % 7], title: `Day ${draft.days.length + 1}`, exercises: [], cardio: [] }],
    })

  // ---- Cardio blocks on a day (targets are optional reminders) ----
  const addCardioToDay = (di) =>
    updateDay(di, { cardio: [...(draft.days[di].cardio || []), { machine: 'treadmill', targetMin: '', targetDistance: '' }] })
  const updateCardio = (di, ci, patch) =>
    updateDay(di, { cardio: (draft.days[di].cardio || []).map((c, j) => (j === ci ? { ...c, ...patch } : c)) })
  const removeCardio = (di, ci) =>
    updateDay(di, { cardio: (draft.days[di].cardio || []).filter((_, j) => j !== ci) })
  // Removing a day is a one-tap, easy-to-fat-finger action that can wipe a
  // whole session's worth of configured exercises — reuse the same
  // Undo-toast pattern Programs.jsx uses for deleting a whole program,
  // rather than a blocking confirm dialog.
  const removeDay = (i) => {
    const day = draft.days[i]
    const dayName = day.title.trim() || WEEKDAY_LABELS[day.weekday]
    update({ days: draft.days.filter((_, j) => j !== i) })
    toast.show(`Removed "${dayName}"`, {
      actionLabel: 'Undo',
      onAction: () => setDraft((d) => {
        const days = [...d.days]
        days.splice(Math.min(i, days.length), 0, day)
        return { ...d, days }
      }),
    })
  }

  // Reorder a whole training day — see reorderDays for why the weekday travels
  // with it. `dir` keeps the ▲▼ buttons' call shape; moveDayTo is what the
  // desktop drag handler needs.
  const moveDayTo = (from, to) => update({ days: reorderDays(draft.days, from, to) })
  const moveDay = (i, dir) => moveDayTo(i, i + dir)

  // Same fat-finger risk as removeDay, but for a single exercise — its sets,
  // reps, rest, progression and superset link are all gone in one tap.
  // Undo-toast restores the exercise AND the superset link it broke.
  const removeExercise = (di, ei) => {
    const day = draft.days[di]
    const ex = day.exercises[ei]
    const prevSupersetNext = ei > 0 ? day.exercises[ei - 1]?.supersetNext : undefined
    updateDay(di, {
      // Drop the exercise; clear the previous one's superset link so it doesn't
      // accidentally group with whatever shifts up into the gap.
      exercises: day.exercises
        .filter((_, j) => j !== ei)
        .map((e, j) => (j === ei - 1 ? { ...e, supersetNext: undefined } : e)),
    })
    toast.show(`Removed "${ex.name}"`, {
      actionLabel: 'Undo',
      onAction: () => setDraft((d) => {
        const days = d.days.map((dd, j) => {
          if (j !== di) return dd
          const exercises = [...dd.exercises]
          const insertAt = Math.min(ei, exercises.length)
          exercises.splice(insertAt, 0, ex)
          if (insertAt > 0 && prevSupersetNext) {
            exercises[insertAt - 1] = { ...exercises[insertAt - 1], supersetNext: prevSupersetNext }
          }
          return { ...dd, exercises }
        })
        return { ...d, days }
      }),
    })
  }

  // Group this exercise with the next into a superset (alternate them, rest
  // after the round). Adjacent exercises carrying supersetNext form one group.
  const toggleSuperset = (di, ei) => {
    const ex = draft.days[di].exercises[ei]
    updateExercise(di, ei, { supersetNext: ex.supersetNext ? undefined : true })
  }

  // Block the same exercise twice in one day — duplicate ids collide with the
  // live workout's per-exercise set tracking.
  const addExerciseToDay = (di, ex) => {
    if (draft.days[di].exercises.some((e) => e.id === ex.id)) return
    updateDay(di, { exercises: [...draft.days[di].exercises, makeExercise(ex, scheme, inc)] })
  }

  // Turn a rep-based lift into a timed isometric hold (or back). Toggling on
  // seeds the classic hold protocol — 4 sets × 30 sec with a long 3-min rest —
  // which the user can still edit; load (if any) is kept, so a held pulldown
  // still tracks weight.
  const toggleIso = (di, ei) => {
    const ex = draft.days[di].exercises[ei]
    if (ex.iso) {
      // Put back exactly what was there before the toggle. Without this,
      // trying Iso and changing your mind turned 5 × 4–6 with warm-ups into
      // 4 × 8–12 without them, and nothing said so.
      const prev = ex.isoPrev || { repLow: 8, repHigh: 12 }
      updateExercise(di, ei, { iso: undefined, isoPrev: undefined, ...prev })
    } else {
      const isoPrev = { sets: ex.sets, repLow: ex.repLow, repHigh: ex.repHigh, restSec: ex.restSec, amrap: ex.amrap, warmups: ex.warmups }
      updateExercise(di, ei, { iso: true, isoPrev, amrap: undefined, warmups: undefined, sets: 4, repLow: 30, repHigh: 30, restSec: 180 })
    }
  }

  // Reorder an exercise within its day. moveExerciseTo is the arbitrary-index
  // form the desktop drag handler uses; both share reorderExercises so the
  // superset-link repair is identical either way.
  const moveExerciseTo = (di, from, to) =>
    updateDay(di, { exercises: reorderExercises(draft.days[di].exercises, from, to) })
  const moveExercise = (di, ei, dir) => moveExerciseTo(di, ei, ei + dir)

  // Swap a laddered exercise to an easier (dir<0) or harder (dir>0) variation,
  // keeping its sets/reps/rest. Lets people pick any level directly, no target.
  const changeLevel = (di, ei, dir) => {
    const ex = draft.days[di].exercises[ei]
    const info = ladderInfo(ex.id)
    const targetId = dir > 0 ? info?.nextId : info?.prevId
    const target = targetId && EXERCISE_BY_ID[targetId]
    if (!target) return
    if (draft.days[di].exercises.some((e, j) => j !== ei && e.id === target.id)) return // no dup
    // Program-side fields (sets/reps/rest/supersetNext/…) carry over from the
    // current entry; identity/metadata (including hold/distance/unit, which
    // the old hand-rolled version here used to silently drop) come from the
    // target level's library definition.
    // Same PROGRAM_FIELDS-allowlist gap as makeExercise: startWeightEstimated
    // isn't in it, so carry it over from the entry being replaced explicitly.
    updateExercise(di, ei, { ...exerciseEntryFromLibrary(target, ex), startWeightEstimated: ex.startWeightEstimated })
  }

  // Reset one exercise to the recommended setup for the current goal: sets/reps/
  // rest from the scheme, working weight computed from your 1RM (saved or
  // interpolated — never a single logged set), and a warm-up ramp on compounds.
  const applyRecommended = (di, ei) => {
    const ex = draft.days[di].exercises[ei]
    const lib = EXERCISE_BY_ID[ex.id] || ex
    const p = prescriptionFor(lib, scheme)
    const patch = { sets: p.sets, repLow: p.repLow, repHigh: p.repHigh, restSec: p.restSec }
    if (lib.load !== false) {
      const sw = resolveStartWeight(lib, p.repHigh, inc)
      if (sw.value) { patch.startWeight = sw.value; patch.startWeightEstimated = sw.estimated || undefined }
      patch.warmups = lib.compound && exMeasure(lib).type === 'reps' ? true : undefined
    }
    updateExercise(di, ei, patch)
  }

  const totalExercises = draft.days.reduce((n, d) => n + d.exercises.length, 0)
  // A bad Sets/reps/rest value must block Save rather than get silently
  // swapped for a default — see exerciseErrors.
  const hasInvalidExercise = draft.days.some((d) => d.exercises.some((e) => Object.keys(exerciseErrors(e)).length > 0))
  const canSave = draft.name.trim() && draft.days.some((d) => d.exercises.length > 0 || (d.cardio && d.cardio.length > 0)) && !hasInvalidExercise

  // Two days sharing a weekday is a real footgun for the Today day-picker
  // (which one runs?) — legitimate for AM/PM splits, so this warns rather
  // than blocking.
  const weekdayCounts = draft.days.reduce((m, d) => { m[d.weekday] = (m[d.weekday] || 0) + 1; return m }, {})

  const save = () => {
    if (!canSave) return
    const program = {
      id: editId || undefined,
      name: draft.name.trim(),
      source: 'custom',
      goals: draft.goals,
      progressionMethod: draft.progressionMethod || DEFAULT_METHOD,
      days: draft.days
        .filter((d) => d.exercises.length > 0 || (d.cardio && d.cardio.length > 0))
        .map((d) => ({
          weekday: d.weekday,
          dayLabel: d.dayLabel || WEEKDAY_LABELS[d.weekday],
          title: d.title.trim() || WEEKDAY_LABELS[d.weekday],
          // Keep a day's existing note. Overwriting it unconditionally wiped
          // the rehab safety note ("keep it pain-free, stop anything that
          // hurts") the moment someone edited a Recovery program.
          note: d.note || 'Your custom session.',
          regions: [...new Set(d.exercises.flatMap((e) => e.regions))],
          // Planned cardio for the day. Targets are optional; a bare machine is fine.
          cardio: (d.cardio || []).map((c) => ({
            machine: c.machine || 'other',
            machineName: (CARDIO_BY_ID[c.machine] || CARDIO_BY_ID.other).name,
            targetMin: Number(c.targetMin) || null,
            targetDistance: Number(c.targetDistance) || null,
            distanceUnit: c.distanceUnit || (loadSettings().units === 'kg' ? 'km' : 'mi'),
          })),
          // Spread the original entry first so advanced fields (GZCLP
          // progression, amrap, ladder links) survive an edit, then override
          // the user-editable numbers.
          // canSave already blocks Save while any exercise fails exerciseErrors,
          // so by the time we get here every value has passed validation.
          // Math.max is just a floor for defense-in-depth — it is never
          // reached with a value the user didn't already confirm as valid,
          // unlike the old `Number(e.sets) || 3` which silently substituted
          // a fabricated default for 0/blank/invalid input.
          exercises: d.exercises.map((e) => ({
            ...e,
            isoPrev: undefined, // builder-only scratch (see toggleIso)
            sets: Math.max(1, Number(e.sets) || 1),
            repLow: Math.max(1, Number(e.repLow) || 1),
            repHigh: Math.max(1, Number(e.repHigh) || 1),
            restSec: Math.max(0, Number(e.restSec) || 0),
            startWeight: e.startWeight || '',
          })),
        })),
    }
    if (editId) {
      const existing = getProgram(editId)
      // C1: this editor is weekday-based — it doesn't expose rotation mode or
      // trainingDays (that's Schedule.jsx's job) — so a rotation program's
      // schedule must survive an edit here untouched EXCEPT for `pointer`,
      // which indexes into `days`. The day list we just wrote can be shorter
      // (or longer) than before, so a pointer left over from the old list can
      // point past the end of the new one. Clamp it with the same helper the
      // data layer uses, so Builder can never hand back a program whose
      // pointer is already out of range. We keep the rotation/trainingDays
      // choice itself as-is — that's a decision this screen doesn't make.
      const schedule = existing?.schedule?.mode === 'rotation'
        ? { ...existing.schedule, pointer: clampRotationPointer(existing.schedule.pointer, program.days.length) }
        : existing?.schedule
      updateProgram({ ...existing, ...program, schedule })
      clearSavedDraft()
      toast.show(`Saved changes to “${program.name}”`)
      // Back to wherever the edit started (Plans, the program page, Today).
      navigate(-1)
      return
    }
    // A new program becomes the active one. Say so, and let them keep the old
    // one active instead — silently swapping what Today shows is a surprise.
    const previousActive = getActiveProgramId()
    const previous = previousActive && getProgram(previousActive)
    addProgram(program)
    clearSavedDraft()
    toast.show(`Saved “${program.name}” — it’s now your active program`, previous ? {
      actionLabel: `Keep ${previous.name}`,
      onAction: () => { setActiveProgramId(previousActive); window.dispatchEvent(new CustomEvent('sl-data-changed')) },
    } : {})
    navigate('/today')
  }

  // U6: same equipment-aware filtering as the in-workout ExercisePicker —
  // default to what the active location can actually do, with a "Show all"
  // escape hatch, so Builder stops silently loading programs full of gear
  // the user doesn't own.
  const equipActive = getEquipment().active
  const equipAvailable = new Set(activeEquipmentIds())

  // Hide only the template-only ladder variants; conditioning/cardio moves ARE
  // allowed so people can add a warm-up (e.g. 15 min zone-2) to a lifting day.
  // Dedupe repeated display names and keep why each result matched (for the tag).
  const filtered = (() => {
    const out = []
    const seen = new Set()
    for (const e of EXERCISES) {
      if (e.ladderOnly) continue
      const info = matchInfo(e, search)
      if (!info.match) continue
      if (!showAll && !isDoable(e, equipAvailable)) continue
      const key = e.name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ ex: e, info })
    }
    return out
  })()
  // Which exercises a given day already holds — drives the "✓ / added" state in
  // the library. Mobile asks about the day whose picker is open; the desktop
  // library pane asks about whichever day is selected, so this takes an index.
  const exIdsForDay = (di) =>
    (di === null || di === undefined || !draft.days[di])
      ? new Set()
      : new Set(draft.days[di].exercises.map((e) => e.id))
  const dayExIds = exIdsForDay(picker)

  return {
    editId, draft, setDraft, navigate,
    picker, setPicker, search, setSearch, showAll, setShowAll, creating, setCreating,
    scheme, inc,
    update, updateDay, updateExercise,
    addDay, removeDay, moveDay, moveDayTo,
    addExerciseToDay, removeExercise, moveExercise, moveExerciseTo,
    toggleSuperset, toggleIso, changeLevel, applyRecommended,
    addCardioToDay, updateCardio, removeCardio,
    save, canSave, hasInvalidExercise, totalExercises, weekdayCounts,
    dirty, cancel, confirmingDiscard, setConfirmingDiscard, discardAndLeave,
    equipActive, filtered, dayExIds, exIdsForDay,
  }
}
