import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { EXERCISES, EXERCISE_BY_ID, exMeasure, matchesQuery, isoHoldFor } from '../data/exercises.js'
import { PROGRESSION_METHODS, DEFAULT_METHOD } from '../lib/progressionMethods.js'
import { GOALS } from '../data/options.js'
import { schemeForGoals, prescriptionFor } from '../data/schemes.js'
import { WEEKDAY_LABELS } from '../lib/generator.js'
import {
  loadProfile, getProgram, addProgram, updateProgram, getMax, loadMaxes, loadSettings,
} from '../lib/storage.js'
import { weightForReps, incrementForUnits, interpolate1RM } from '../lib/oneRepMax.js'
import { ladderInfo } from '../lib/ladder.js'
import MuscleMap from '../components/MuscleMap.jsx'
import CustomExerciseForm from '../components/CustomExerciseForm.jsx'
import { CARDIO_MACHINES, CARDIO_BY_ID } from '../data/cardio.js'

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] // Mon … Sun

const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

// The 1RM we can attribute to a lift: a saved max, else one interpolated from
// your other saved lifts. Weights are computed off this — never off a single
// logged set, which might be a warm-up or an off day.
function oneRMfor(exId) {
  const max = getMax(exId)
  if (max?.oneRM) return Number(max.oneRM)
  return interpolate1RM(exId, loadMaxes()) || 0
}

// Starting (working) weight for a loadable lift, derived from its 1RM and the
// rep target. Empty string when we have no 1RM to work from.
function resolveStartWeight(ex, repHigh, inc) {
  if (ex.load === false) return ''
  const oneRM = oneRMfor(ex.id)
  return oneRM ? String(weightForReps(oneRM, repHigh, inc)) : ''
}

// Build a day's default exercise entry from the library + current goal scheme.
// Defaults come from prescriptionFor (sets/reps/rest tuned to how the move is
// measured and the muscle worked); the working weight is derived from your 1RM,
// and compound lifts get a warm-up ramp by default.
function makeExercise(ex, scheme, inc) {
  const p = prescriptionFor(ex, scheme)
  const entry = {
    id: ex.id, name: ex.name, pattern: ex.pattern, regions: ex.regions,
    compound: ex.compound, load: ex.load !== false, cues: ex.cues,
    ladderId: ex.ladderId || null, nextId: ex.nextId || null, prevId: ex.prevId || null,
    hold: ex.hold || undefined, distance: ex.distance || undefined, unit: ex.unit || undefined,
    sets: p.sets, repLow: p.repLow, repHigh: p.repHigh, restSec: p.restSec,
    startWeight: resolveStartWeight(ex, p.repHigh, inc),
  }
  if (ex.load !== false && ex.compound && exMeasure(ex).type === 'reps') entry.warmups = true
  return entry
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
          progressionMethod: existing.progressionMethod || DEFAULT_METHOD,
          days: existing.days.map((d, i) => ({
            // Rotation/template days have no fixed weekday — assign one so the
            // Builder's weekday picker is a controlled input (not null).
            weekday: d.weekday ?? WEEKDAY_ORDER[i % 7],
            title: d.title,
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

  const [picker, setPicker] = useState(null) // dayIndex being edited, or null
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false) // custom-exercise form open?
  const [amrapInfo, setAmrapInfo] = useState(false)
  const [warmupInfo, setWarmupInfo] = useState(false)
  const [isoInfo, setIsoInfo] = useState(false)

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
  const removeDay = (i) => update({ days: draft.days.filter((_, j) => j !== i) })
  const removeExercise = (di, ei) =>
    updateDay(di, { exercises: draft.days[di].exercises.filter((_, j) => j !== ei) })

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
      updateExercise(di, ei, { iso: undefined, repLow: 8, repHigh: 12 })
    } else {
      updateExercise(di, ei, { iso: true, amrap: undefined, warmups: undefined, sets: 4, repLow: 30, repHigh: 30, restSec: 180 })
    }
  }

  // Reorder an exercise within its day.
  const moveExercise = (di, ei, dir) => {
    const list = draft.days[di].exercises
    const j = ei + dir
    if (j < 0 || j >= list.length) return
    const next = [...list]
    ;[next[ei], next[j]] = [next[j], next[ei]]
    updateDay(di, { exercises: next })
  }

  // Swap a laddered exercise to an easier (dir<0) or harder (dir>0) variation,
  // keeping its sets/reps/rest. Lets people pick any level directly, no target.
  const changeLevel = (di, ei, dir) => {
    const ex = draft.days[di].exercises[ei]
    const info = ladderInfo(ex.id)
    const targetId = dir > 0 ? info?.nextId : info?.prevId
    const target = targetId && EXERCISE_BY_ID[targetId]
    if (!target) return
    if (draft.days[di].exercises.some((e, j) => j !== ei && e.id === target.id)) return // no dup
    updateExercise(di, ei, {
      id: target.id, name: target.name, pattern: target.pattern, regions: target.regions,
      compound: target.compound, load: target.load !== false, cues: target.cues,
      ladderId: target.ladderId || null, nextId: target.nextId || null, prevId: target.prevId || null,
    })
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
      const w = resolveStartWeight(lib, p.repHigh, inc)
      if (w) patch.startWeight = w
      patch.warmups = lib.compound && exMeasure(lib).type === 'reps' ? true : undefined
    }
    updateExercise(di, ei, patch)
  }

  const totalExercises = draft.days.reduce((n, d) => n + d.exercises.length, 0)
  const canSave = draft.name.trim() && draft.days.some((d) => d.exercises.length > 0 || (d.cardio && d.cardio.length > 0))

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
          dayLabel: WEEKDAY_LABELS[d.weekday],
          title: d.title.trim() || WEEKDAY_LABELS[d.weekday],
          note: 'Your custom session.',
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
          exercises: d.exercises.map((e) => {
            const repHigh = Number(e.repHigh) || Number(e.repLow) || 8
            const repLow = Math.min(Number(e.repLow) || repHigh, repHigh)
            return {
              ...e,
              sets: Number(e.sets) || 3,
              repLow,
              repHigh,
              restSec: Number(e.restSec) || 90,
              startWeight: e.startWeight || '',
            }
          }),
        })),
    }
    if (editId) updateProgram({ ...getProgram(editId), ...program })
    else addProgram(program)
    navigate('/program')
  }

  // Hide only the template-only ladder variants; conditioning/cardio moves ARE
  // allowed so people can add a warm-up (e.g. 15 min zone-2) to a lifting day.
  const filtered = EXERCISES.filter((e) => !e.ladderOnly && matchesQuery(e, search))
  const dayExIds = picker !== null
    ? new Set(draft.days[picker].exercises.map((e) => e.id))
    : new Set()

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
            Sets, reps &amp; rest auto-fill with sensible defaults for each move — heavy compounds get low reps and long rest, isolation and core get higher reps. Each exercise uses a rep <em>range</em> (like most programs): aim for the top of the range on every set, then add weight. Tweak anything you like. Starting weights fill from your saved 1RMs.{' '}
            <button type="button" className="link-btn" onClick={() => navigate('/one-rep-max')}>Find your maxes</button>
          </p>
        </div>

        {/* ---- Progression method ---- */}
        <div className="card">
          <p className="group-label">How do you want to progress?</p>
          <p className="muted small">This decides which next step the app recommends after each workout. You always get the final say.</p>
          <div className="choice-list">
            {PROGRESSION_METHODS.map((m) => {
              const selected = (draft.progressionMethod || DEFAULT_METHOD) === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  className={'choice-row' + (selected ? ' is-selected' : '')}
                  onClick={() => update({ progressionMethod: m.id })}
                >
                  <span className="choice-title">
                    {m.name}{m.recommended && <span className="rec-badge">Recommended</span>}
                  </span>
                  <span className="muted small">{m.tagline}</span>
                </button>
              )
            })}
          </div>
          {(() => {
            const m = PROGRESSION_METHODS.find((x) => x.id === (draft.progressionMethod || DEFAULT_METHOD))
            return (
              <div className="method-detail">
                <p className="muted small">{m.how}</p>
                <div className="proscons">
                  <ul className="pros">{m.pros.map((p, i) => <li key={i}>{p}</li>)}</ul>
                  <ul className="cons">{m.cons.map((c, i) => <li key={i}>{c}</li>)}</ul>
                </div>
              </div>
            )
          })()}
          <p className="muted small deload-tip">
            <strong>Deload tip:</strong> every 4–6 weeks, take one lighter week — cut your working weight ~10% (or drop a set or two) and keep reps well short of failure. It clears fatigue so you come back stronger. No need to schedule it; just take one when you feel run down.
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
                  <MuscleMap pattern={ex.pattern} exId={ex.id} size={32} />
                  <span className="ex-name">{ex.name}</span>
                  <div className="ex-reorder">
                    <button type="button" className="icon-btn" disabled={ei === 0} onClick={() => moveExercise(di, ei, -1)} aria-label={`Move ${ex.name} up`}>▲</button>
                    <button type="button" className="icon-btn" disabled={ei === day.exercises.length - 1} onClick={() => moveExercise(di, ei, 1)} aria-label={`Move ${ex.name} down`}>▼</button>
                  </div>
                  <button type="button" className="icon-btn" onClick={() => removeExercise(di, ei)} aria-label="Remove exercise">✕</button>
                </div>
                <div className="builder-fields">
                  <label>Sets<input type="number" inputMode="numeric" value={ex.sets} onChange={(e) => updateExercise(di, ei, { sets: e.target.value })} /></label>
                  {exMeasure(ex).type === 'reps' ? (
                    <>
                      <label>Min reps<input type="number" inputMode="numeric" value={ex.repLow} onChange={(e) => updateExercise(di, ei, { repLow: e.target.value })} /></label>
                      <label>Max reps<input type="number" inputMode="numeric" value={ex.repHigh} onChange={(e) => updateExercise(di, ei, { repHigh: e.target.value })} /></label>
                    </>
                  ) : (
                    <>
                      <label>Min ({exMeasure(ex).unit})<input type="number" inputMode="numeric" value={ex.repLow} onChange={(e) => updateExercise(di, ei, { repLow: e.target.value })} /></label>
                      <label>Max ({exMeasure(ex).unit})<input type="number" inputMode="numeric" value={ex.repHigh} onChange={(e) => updateExercise(di, ei, { repHigh: e.target.value })} /></label>
                    </>
                  )}
                  <label>Rest s<input type="number" inputMode="numeric" value={ex.restSec} onChange={(e) => updateExercise(di, ei, { restSec: e.target.value })} /></label>
                  {ex.load && (
                    <label>Start wt<input type="number" inputMode="decimal" value={ex.startWeight} placeholder="–" onChange={(e) => updateExercise(di, ei, { startWeight: e.target.value })} /></label>
                  )}
                </div>
                {(() => {
                  const lad = ladderInfo(ex.id)
                  if (!lad || lad.length <= 1) return null
                  return (
                    <div className="ladder-steps builder-ladder">
                      <span className="muted small">Level {lad.index + 1}/{lad.length}</span>
                      <button type="button" className="ladder-step-btn" disabled={!lad.prevId} onClick={() => changeLevel(di, ei, -1)} title={lad.prevName ? `Easier: ${lad.prevName}` : ''}>↓ Easier</button>
                      <button type="button" className="ladder-step-btn" disabled={!lad.nextId} onClick={() => changeLevel(di, ei, 1)} title={lad.nextName ? `Harder: ${lad.nextName}` : ''}>↑ Harder</button>
                    </div>
                  )
                })()}
                {ex.load && exMeasure(ex).type === 'reps' && (
                  <div className="amrap-row">
                    <button
                      type="button"
                      className={'amrap-chip' + (ex.warmups ? ' is-on' : '')}
                      aria-pressed={!!ex.warmups}
                      onClick={() => updateExercise(di, ei, { warmups: ex.warmups ? undefined : true })}
                    >
                      <span className="amrap-box">{ex.warmups ? '✓' : ''}</span>
                      Warm-up ramp
                    </button>
                    <button type="button" className="info-icon" onClick={() => setWarmupInfo(true)} aria-label="What is a warm-up ramp?">i</button>
                  </div>
                )}
                {exMeasure(ex).type === 'reps' && (
                  <div className="amrap-row">
                    <button
                      type="button"
                      className={'amrap-chip' + (ex.amrap ? ' is-on' : '')}
                      aria-pressed={!!ex.amrap}
                      onClick={() => updateExercise(di, ei, { amrap: ex.amrap ? undefined : true })}
                    >
                      <span className="amrap-box">{ex.amrap ? '✓' : ''}</span>
                      AMRAP last set
                    </button>
                    <button type="button" className="info-icon" onClick={() => setAmrapInfo(true)} aria-label="What is AMRAP?">i</button>
                  </div>
                )}
                {/* Isometric-hold toggle — only for lifts that are normally rep-based
                    (a plank is already a hold). Uses the base exercise's measure so
                    the chip stays visible to toggle back off. */}
                {exMeasure({ id: ex.id }).type === 'reps' && (
                  <>
                    <div className="amrap-row">
                      <button
                        type="button"
                        className={'amrap-chip' + (ex.iso ? ' is-on' : '')}
                        aria-pressed={!!ex.iso}
                        onClick={() => toggleIso(di, ei)}
                      >
                        <span className="amrap-box">{ex.iso ? '✓' : ''}</span>
                        Isometric hold
                      </button>
                      <button type="button" className="info-icon" onClick={() => setIsoInfo(true)} aria-label="What is an isometric hold?">i</button>
                    </div>
                    {ex.iso && (
                      <p className="muted small">
                        Held for time (in seconds){ex.load ? ' at a fixed weight' : ''} — default 4 × 30 sec, 3-min rest. Edit the numbers above.
                        {isoHoldFor(ex.id) && <> <strong>Where to hold:</strong> {isoHoldFor(ex.id)}</>}
                      </p>
                    )}
                  </>
                )}
                <button type="button" className="btn btn-ghost btn-sm recommend-btn" onClick={() => applyRecommended(di, ei)}>
                  Use recommended{ex.load ? ' (sets, reps, rest & weight from your 1RM)' : ' sets, reps & rest'}
                </button>
              </div>
            ))}

            {(day.cardio || []).map((c, ci) => {
              const hasDistance = CARDIO_BY_ID[c.machine]?.distance
              return (
                <div className="builder-cardio" key={`c${ci}`}>
                  <div className="builder-ex-top">
                    <span className="machine-icon">{CARDIO_BY_ID[c.machine]?.icon || '❤️'}</span>
                    <select
                      className="text-input cardio-machine-select"
                      value={c.machine}
                      onChange={(e) => updateCardio(di, ci, { machine: e.target.value })}
                    >
                      {CARDIO_MACHINES.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <button type="button" className="icon-btn" onClick={() => removeCardio(di, ci)} aria-label="Remove cardio">✕</button>
                  </div>
                  <div className="builder-fields">
                    <label>Target min<input type="number" inputMode="numeric" value={c.targetMin} placeholder="–" onChange={(e) => updateCardio(di, ci, { targetMin: e.target.value })} /></label>
                    {hasDistance && (
                      <label>Target dist<input type="number" inputMode="decimal" value={c.targetDistance} placeholder="–" onChange={(e) => updateCardio(di, ci, { targetDistance: e.target.value })} /></label>
                    )}
                  </div>
                </div>
              )
            })}

            <div className="builder-add-row">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setPicker(di); setSearch('') }}>
                + Add exercise
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => addCardioToDay(di)}>
                Add cardio
              </button>
            </div>
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
              {filtered.map((ex) => {
                const added = dayExIds.has(ex.id)
                return (
                  <button
                    key={ex.id}
                    type="button"
                    className={'picker-item' + (added ? ' is-added' : '')}
                    disabled={added}
                    onClick={() => addExerciseToDay(picker, ex)}
                  >
                    <MuscleMap pattern={ex.pattern} exId={ex.id} size={32} />
                    <span className="ex-name">{ex.name}</span>
                    <span className="muted small">{ex.compound ? 'compound' : 'accessory'}{ex.requires.length === 0 ? ' · bodyweight' : ''}</span>
                    <span className="add-plus">{added ? '✓' : '+'}</span>
                  </button>
                )
              })}
              {filtered.length === 0 && <p className="muted">No matches.</p>}
              <button type="button" className="picker-item create-custom" onClick={() => setCreating(true)}>
                <span className="add-plus">＋</span>
                <span className="ex-name">Create a custom exercise{search.trim() ? ` “${search.trim()}”` : ''}</span>
              </button>
            </div>
          </div>

          {creating && (
            <CustomExerciseForm
              onClose={() => setCreating(false)}
              onCreate={(ex) => { setCreating(false); addExerciseToDay(picker, ex) }}
            />
          )}
        </div>
      )}

      {amrapInfo && (
        <div className="picker-overlay" role="dialog" aria-label="About AMRAP" onClick={() => setAmrapInfo(false)}>
          <div className="info-sheet" onClick={(e) => e.stopPropagation()}>
            <p className="info-title">AMRAP last set</p>
            <p className="muted small">
              AMRAP means <strong>“as many reps as possible.”</strong> You do your normal sets, then push the
              <strong> final set</strong> for max clean reps instead of stopping at the target.
            </p>
            <p className="muted small">
              It’s how programs like <strong>Greyskull LP</strong> and <strong>5/3/1</strong> work: a strong last set
              earns bigger jumps, and it’s a simple way to autoregulate — some days you have more in the tank than others.
            </p>
            <p className="muted small">Leave it off for a steady, fixed-rep approach.</p>
            <button type="button" className="btn btn-primary" onClick={() => setAmrapInfo(false)}>Got it</button>
          </div>
        </div>
      )}

      {warmupInfo && (
        <div className="picker-overlay" role="dialog" aria-label="About warm-up ramp" onClick={() => setWarmupInfo(false)}>
          <div className="info-sheet" onClick={(e) => e.stopPropagation()}>
            <p className="info-title">Warm-up ramp</p>
            <p className="muted small">
              Your <strong>working sets</strong> stay at one weight for the same reps — that&apos;s on purpose, and it&apos;s how nearly every program (StrongLifts, r/Fitness PPL, 5/3/1) is written.
            </p>
            <p className="muted small">
              What was missing is the <strong>warm-up</strong>. With this on, the app adds a few lighter ramp-up sets before your working sets — <strong>~40% × 5, 60% × 3, 80% × 2</strong> of your working weight — lighter with more reps, building to heavy with fewer. It primes the movement so your first working set isn&apos;t cold.
            </p>
            <p className="muted small">Warm-up weights are figured from your working weight, which comes from your 1RM.</p>
            <button type="button" className="btn btn-primary" onClick={() => setWarmupInfo(false)}>Got it</button>
          </div>
        </div>
      )}

      {isoInfo && (
        <div className="picker-overlay" role="dialog" aria-label="About isometric holds" onClick={() => setIsoInfo(false)}>
          <div className="info-sheet" onClick={(e) => e.stopPropagation()}>
            <p className="info-title">Isometric hold</p>
            <p className="muted small">
              Turns this lift into a <strong>timed hold</strong> instead of reps — you hold the position (or push/pull against resistance) for time. Any normal lift can become one: a <strong>held lat pulldown</strong>, a paused squat, a mid-thigh pull.
            </p>
            <p className="muted small">
              It sets the classic protocol — <strong>4 sets × 30 sec, ~3-min rest</strong> — which you can edit. The set columns switch to <strong>seconds</strong>. During the workout you get a countdown to time each hold.
            </p>
            <p className="muted small">
              If the lift is loaded (like a pulldown), it <strong>keeps its weight</strong> — hold that weight for time. Bodyweight holds just track seconds.
            </p>
            <button type="button" className="btn btn-primary" onClick={() => setIsoInfo(false)}>Got it</button>
          </div>
        </div>
      )}
    </section>
  )
}
