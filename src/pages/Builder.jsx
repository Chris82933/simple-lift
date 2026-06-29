import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { EXERCISES } from '../data/exercises.js'
import { GOALS } from '../data/options.js'
import { schemeForGoals } from '../data/schemes.js'
import { WEEKDAY_LABELS } from '../lib/generator.js'
import {
  loadProfile, getProgram, addProgram, updateProgram, getMax, loadSettings,
} from '../lib/storage.js'
import { weightForReps, incrementForUnits } from '../lib/oneRepMax.js'
import ExerciseFigure from '../components/ExerciseFigure.jsx'

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] // Mon … Sun

const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

// Build a day's default exercise entry from the library + current goal scheme.
// Prefills a starting weight from a saved 1RM when one exists for this lift.
function makeExercise(ex, scheme, inc) {
  const tier = ex.compound ? scheme.compound : scheme.accessory
  const max = ex.load !== false ? getMax(ex.id) : null
  return {
    id: ex.id, name: ex.name, pattern: ex.pattern, regions: ex.regions,
    compound: ex.compound, load: ex.load !== false, cues: ex.cues,
    sets: tier.sets, reps: tier.repHigh, restSec: tier.rest,
    startWeight: max ? String(weightForReps(max.oneRM, tier.repHigh, inc)) : '',
  }
}

export default function Builder() {
  const navigate = useNavigate()
  const location = useLocation()
  const editId = location.state?.id || null
  const profile = loadProfile()

  const [draft, setDraft] = useState(() => {
    if (editId) {
      const existing = getProgram(editId)
      if (existing) {
        return {
          name: existing.name,
          goals: existing.goals || [],
          days: existing.days.map((d) => ({
            weekday: d.weekday,
            title: d.title,
            exercises: d.exercises.map((e) => ({
              ...e, reps: e.repHigh ?? e.reps ?? 8,
            })),
          })),
        }
      }
    }
    return {
      name: '',
      goals: profile?.goals?.length ? profile.goals : ['general'],
      days: [{ weekday: 1, title: 'Day 1', exercises: [] }],
    }
  })

  const [picker, setPicker] = useState(null) // dayIndex being edited, or null
  const [search, setSearch] = useState('')

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
      days: [...draft.days, { weekday: WEEKDAY_ORDER[draft.days.length % 7], title: `Day ${draft.days.length + 1}`, exercises: [] }],
    })
  const removeDay = (i) => update({ days: draft.days.filter((_, j) => j !== i) })
  const removeExercise = (di, ei) =>
    updateDay(di, { exercises: draft.days[di].exercises.filter((_, j) => j !== ei) })

  const addExerciseToDay = (di, ex) =>
    updateDay(di, { exercises: [...draft.days[di].exercises, makeExercise(ex, scheme, inc)] })

  const totalExercises = draft.days.reduce((n, d) => n + d.exercises.length, 0)
  const canSave = draft.name.trim() && draft.days.some((d) => d.exercises.length > 0)

  const save = () => {
    if (!canSave) return
    const program = {
      id: editId || undefined,
      name: draft.name.trim(),
      source: 'custom',
      goals: draft.goals,
      days: draft.days
        .filter((d) => d.exercises.length > 0)
        .map((d) => ({
          weekday: d.weekday,
          dayLabel: WEEKDAY_LABELS[d.weekday],
          title: d.title.trim() || WEEKDAY_LABELS[d.weekday],
          note: 'Your custom session.',
          regions: [...new Set(d.exercises.flatMap((e) => e.regions))],
          exercises: d.exercises.map((e) => ({
            id: e.id, name: e.name, pattern: e.pattern, regions: e.regions,
            compound: e.compound, load: e.load, cues: e.cues,
            sets: Number(e.sets) || 3,
            repLow: Number(e.reps) || 8,
            repHigh: Number(e.reps) || 8,
            restSec: Number(e.restSec) || 90,
            startWeight: e.startWeight || '',
          })),
        })),
    }
    if (editId) updateProgram({ ...getProgram(editId), ...program })
    else addProgram(program)
    navigate('/program')
  }

  const filtered = EXERCISES.filter((e) =>
    e.name.toLowerCase().includes(search.trim().toLowerCase()),
  )

  return (
    <section className="page full-flow">
      <header className="page-header">
        <p className="eyebrow">{editId ? 'Edit program' : 'New custom program'}</p>
        <h1>Build your program</h1>
      </header>

      <div className="step-body">
        <div className="card">
          <p className="group-label">Program name</p>
          <input
            className="text-input"
            placeholder="e.g. Chris’ Strength Block"
            value={draft.name}
            onChange={(e) => update({ name: e.target.value })}
          />
          <p className="group-label">Goal (drives growth suggestions)</p>
          <div className="check-grid">
            {GOALS.map((g) => (
              <button
                key={g.id}
                type="button"
                className={'check-pill' + (draft.goals.includes(g.id) ? ' is-selected' : '')}
                onClick={() => update({ goals: toggle(draft.goals, g.id) })}
              >
                {g.label}
              </button>
            ))}
          </div>
          <p className="muted small">
            💡 Starting weights auto-fill from your saved 1RMs.{' '}
            <button type="button" className="link-btn" onClick={() => navigate('/one-rep-max')}>Find your maxes</button>
          </p>
        </div>

        {draft.days.map((day, di) => (
          <div className="card day-card" key={di}>
            <div className="builder-day-head">
              <select
                className="text-input select"
                value={day.weekday}
                onChange={(e) => updateDay(di, { weekday: Number(e.target.value) })}
              >
                {WEEKDAY_ORDER.map((wd) => (
                  <option key={wd} value={wd}>{WEEKDAY_LABELS[wd]}</option>
                ))}
              </select>
              {draft.days.length > 1 && (
                <button type="button" className="icon-btn" onClick={() => removeDay(di)} aria-label="Remove day">✕</button>
              )}
            </div>
            <input
              className="text-input"
              placeholder="Session name (e.g. Push, Legs)"
              value={day.title}
              onChange={(e) => updateDay(di, { title: e.target.value })}
            />

            {day.exercises.map((ex, ei) => (
              <div className="builder-exercise" key={ei}>
                <div className="builder-ex-top">
                  <ExerciseFigure pattern={ex.pattern} size={36} />
                  <span className="ex-name">{ex.name}</span>
                  <button type="button" className="icon-btn" onClick={() => removeExercise(di, ei)} aria-label="Remove exercise">✕</button>
                </div>
                <div className="builder-fields">
                  <label>Sets<input type="number" inputMode="numeric" value={ex.sets} onChange={(e) => updateExercise(di, ei, { sets: e.target.value })} /></label>
                  <label>Reps<input type="number" inputMode="numeric" value={ex.reps} onChange={(e) => updateExercise(di, ei, { reps: e.target.value })} /></label>
                  <label>Rest s<input type="number" inputMode="numeric" value={ex.restSec} onChange={(e) => updateExercise(di, ei, { restSec: e.target.value })} /></label>
                  {ex.load && (
                    <label>Start wt<input type="number" inputMode="decimal" value={ex.startWeight} placeholder="–" onChange={(e) => updateExercise(di, ei, { startWeight: e.target.value })} /></label>
                  )}
                </div>
              </div>
            ))}

            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setPicker(di); setSearch('') }}>
              + Add exercise
            </button>
          </div>
        ))}

        <button type="button" className="btn btn-ghost" onClick={addDay}>+ Add training day</button>
        <p className="muted small">{draft.days.length} day(s) · {totalExercises} exercise(s)</p>
      </div>

      <div className="flow-actions">
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={save} disabled={!canSave}>
          {editId ? 'Save changes' : 'Save program'}
        </button>
      </div>

      {picker !== null && (
        <div className="picker-overlay" role="dialog" aria-label="Add exercise">
          <div className="picker-sheet">
            <div className="picker-head">
              <input
                className="text-input"
                placeholder="Search exercises…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setPicker(null)}>Done</button>
            </div>
            <div className="picker-list">
              {filtered.map((ex) => (
                <button key={ex.id} type="button" className="picker-item" onClick={() => addExerciseToDay(picker, ex)}>
                  <ExerciseFigure pattern={ex.pattern} size={34} />
                  <span className="ex-name">{ex.name}</span>
                  <span className="muted small">{ex.compound ? 'compound' : 'accessory'}{ex.requires.length === 0 ? ' · bodyweight' : ''}</span>
                  <span className="add-plus">+</span>
                </button>
              ))}
              {filtered.length === 0 && <p className="muted">No matches.</p>}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
