import { Fragment, useRef } from 'react'
import useModalA11y from '../../lib/useModalA11y.js'
import { exMeasure, isoHoldFor } from '../../data/exercises.js'
import { PROGRESSION_METHODS, DEFAULT_METHOD } from '../../lib/progressionMethods.js'
import { GOALS } from '../../data/options.js'
import { WEEKDAY_LABELS } from '../../lib/generator.js'
import { ladderInfo } from '../../lib/ladder.js'
import MuscleMap from '../MuscleMap.jsx'
import { plannedMuscleHeat } from '../../lib/muscleHeat.js'
import CustomExerciseForm from '../CustomExerciseForm.jsx'
import { CARDIO_MACHINES, CARDIO_BY_ID } from '../../data/cardio.js'
import Icon from '../Icon.jsx'
import { profileMeta } from '../../lib/equipment.js'
import { WEEKDAY_ORDER, exerciseErrors, sameEquip, toggle } from './draftLogic.js'
import useInfoDialogs from './InfoDialogs.jsx'

// The phone program builder: one column, one card per training day, the
// exercise library behind a bottom sheet. This is the product on a phone and
// it is deliberately frozen — the desktop workspace is a separate view off the
// same draft hook, not a restyling of this one, so nothing here has to bend to
// accommodate a 1400px window.
export default function BuilderMobile({ d }) {
  const {
    editId, draft, navigate,
    picker, setPicker, search, setSearch, showAll, setShowAll, creating, setCreating,
    update, updateDay, updateExercise,
    addDay, removeDay, moveDay,
    addExerciseToDay, removeExercise, moveExercise,
    toggleSuperset, toggleIso, changeLevel, applyRecommended,
    addCardioToDay, updateCardio, removeCardio,
    save, canSave, hasInvalidExercise, totalExercises, weekdayCounts,
    equipActive, filtered, dayExIds,
  } = d

  const pickerRef = useRef(null)
  // Suspend the picker's trap while its nested custom-exercise form is open.
  useModalA11y(pickerRef, () => setPicker(null), picker !== null && !creating)
  const info = useInfoDialogs()

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
            aria-label="Program name"
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

        {draft.days.map((day, di) => {
          const dayName = day.title.trim() || WEEKDAY_LABELS[day.weekday]
          return (
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
              <div className="ex-reorder">
                <button type="button" className="icon-btn" disabled={di === 0} onClick={() => moveDay(di, -1)} aria-label={`Move ${dayName} up`}>
                  <span aria-hidden="true">▲</span>
                </button>
                <button type="button" className="icon-btn" disabled={di === draft.days.length - 1} onClick={() => moveDay(di, 1)} aria-label={`Move ${dayName} down`}>
                  <span aria-hidden="true">▼</span>
                </button>
              </div>
              {draft.days.length > 1 && (
                <button type="button" className="icon-btn" onClick={() => removeDay(di)} aria-label="Remove day">
                  <span aria-hidden="true">✕</span>
                </button>
              )}
            </div>
            <input
              className="text-input"
              aria-label="Session name"
              placeholder="Session name (e.g. Push, Legs)"
              value={day.title}
              onChange={(e) => updateDay(di, { title: e.target.value })}
            />
            {weekdayCounts[day.weekday] > 1 && (
              <p className="muted small" style={{ color: 'var(--warn)' }}>
                Another day is also set to {WEEKDAY_LABELS[day.weekday]} — fine for an AM/PM split, but double-check that&apos;s what you meant.
              </p>
            )}

            {day.exercises.length > 0 && (
              <div className="day-muscles">
                <MuscleMap heat={plannedMuscleHeat(day.exercises)} size={200} labels />
                <span className="muted small">Muscles this session · darker = more sets</span>
              </div>
            )}

            {day.exercises.map((ex, ei) => {
              const errs = exerciseErrors(ex)
              return (
              <Fragment key={ei}>
              <div className={'builder-exercise' + (ex.supersetNext || day.exercises[ei - 1]?.supersetNext ? ' in-superset' : '')}>
                <div className="builder-ex-top">
                  <MuscleMap pattern={ex.pattern} exId={ex.id} size={46} compact />
                  <span className="ex-name">{ex.name}</span>
                  <div className="ex-reorder">
                    <button type="button" className="icon-btn" disabled={ei === 0} onClick={() => moveExercise(di, ei, -1)} aria-label={`Move ${ex.name} up`}>
                      <span aria-hidden="true">▲</span>
                    </button>
                    <button type="button" className="icon-btn" disabled={ei === day.exercises.length - 1} onClick={() => moveExercise(di, ei, 1)} aria-label={`Move ${ex.name} down`}>
                      <span aria-hidden="true">▼</span>
                    </button>
                  </div>
                  <button type="button" className="icon-btn" onClick={() => removeExercise(di, ei)} aria-label="Remove exercise">
                    <span aria-hidden="true">✕</span>
                  </button>
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
                    <label>
                      Start wt{ex.startWeightEstimated && <span className="muted small"> · ≈ est.</span>}
                      <input
                        type="number"
                        inputMode="decimal"
                        value={ex.startWeight}
                        placeholder="–"
                        // A manual edit means this is now the user's own number, not a
                        // guess — drop the estimated flag so the badge doesn't linger.
                        onChange={(e) => updateExercise(di, ei, { startWeight: e.target.value, startWeightEstimated: undefined })}
                      />
                    </label>
                  )}
                </div>
                {/* Inline validation, never a silent substitution — canSave stays
                    false while any of these are present (see exerciseErrors). */}
                {Object.keys(errs).length > 0 && (
                  <p className="muted small import-error">
                    {errs.sets && <>{errs.sets}. </>}
                    {errs.repLow && <>{exMeasure(ex).type === 'reps' ? 'Min reps' : 'Min'}: {errs.repLow}. </>}
                    {errs.repHigh && <>{exMeasure(ex).type === 'reps' ? 'Max reps' : 'Max'}: {errs.repHigh}. </>}
                    {errs.repRange && <>{errs.repRange}. </>}
                    {errs.restSec && <>{errs.restSec}.</>}
                  </p>
                )}
                {ex.load && (
                  <div className="amrap-row">
                    <span className="muted small">
                      Start weight comes from your 1RM{ex.startWeightEstimated ? ' (estimated — no tested max saved for this lift yet)' : ''}.
                    </span>
                    <button type="button" className="info-icon" onClick={info.show.startWt} aria-label="Where does Start wt come from?">i</button>
                  </div>
                )}
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
                      <span className="amrap-box" aria-hidden="true">{ex.warmups ? '✓' : ''}</span>
                      Warm-up ramp
                    </button>
                    <button type="button" className="info-icon" onClick={info.show.warmup} aria-label="What is a warm-up ramp?">i</button>
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
                      <span className="amrap-box" aria-hidden="true">{ex.amrap ? '✓' : ''}</span>
                      AMRAP last set
                    </button>
                    <button type="button" className="info-icon" onClick={info.show.amrap} aria-label="What is AMRAP?">i</button>
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
                        <span className="amrap-box" aria-hidden="true">{ex.iso ? '✓' : ''}</span>
                        Isometric hold
                      </button>
                      <button type="button" className="info-icon" onClick={info.show.iso} aria-label="What is an isometric hold?">i</button>
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
              {ei < day.exercises.length - 1 && (
                <button
                  type="button"
                  className={'superset-link' + (ex.supersetNext ? ' is-on' : '')}
                  aria-pressed={!!ex.supersetNext}
                  onClick={() => toggleSuperset(di, ei)}
                >
                  <span className="superset-link-icon" aria-hidden="true">⛓</span>
                  {ex.supersetNext ? 'Superset — alternate with below' : 'Superset with below'}
                  {ex.supersetNext && !sameEquip(ex, day.exercises[ei + 1]) && (
                    <span className="muted small"> · different equipment</span>
                  )}
                </button>
              )}
              </Fragment>
              )
            })}

            {(day.cardio || []).map((c, ci) => {
              const hasDistance = CARDIO_BY_ID[c.machine]?.distance
              return (
                <div className="builder-cardio" key={`c${ci}`}>
                  <div className="builder-ex-top">
                    <span className="machine-icon"><Icon name="cardio" size={18} /></span>
                    <select
                      className="text-input cardio-machine-select"
                      value={c.machine}
                      onChange={(e) => updateCardio(di, ci, { machine: e.target.value })}
                    >
                      {CARDIO_MACHINES.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <button type="button" className="icon-btn" onClick={() => removeCardio(di, ci)} aria-label="Remove cardio">
                      <span aria-hidden="true">✕</span>
                    </button>
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
          )
        })}

        <button type="button" className="btn btn-ghost" onClick={addDay}>+ Add training day</button>
        <p className="muted small">{draft.days.length} day(s) · {totalExercises} exercise(s)</p>
        {hasInvalidExercise && (
          <p className="muted small import-error">Fix the highlighted sets/reps/rest values above before saving.</p>
        )}
      </div>

      <div className="flow-actions">
        <button type="button" className="btn btn-ghost" onClick={d.cancel}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={save} disabled={!canSave}>
          {editId ? 'Save changes' : 'Save program'}
        </button>
      </div>

      {picker !== null && (
        <div className="picker-overlay" role="dialog" aria-modal="true" aria-label="Add exercise" ref={pickerRef} tabIndex={-1}>
          <div className="picker-sheet">
            <div className="picker-head">
              <input
                className="text-input"
                aria-label="Search exercises"
                placeholder="Search exercises…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setPicker(null)}>Done</button>
            </div>
            <div className="picker-filter">
              <span className="muted small">{profileMeta(equipActive).icon} {profileMeta(equipActive).name} gear</span>
              <button type="button" className={'chip' + (showAll ? '' : ' is-selected')} aria-pressed={!showAll} onClick={() => setShowAll(false)}>What I can do</button>
              <button type="button" className={'chip' + (showAll ? ' is-selected' : '')} aria-pressed={showAll} onClick={() => setShowAll(true)}>Show all</button>
            </div>
            <div className="picker-list">
              {filtered.map(({ ex, info: m }) => {
                const added = dayExIds.has(ex.id)
                return (
                  <button
                    key={ex.id}
                    type="button"
                    className={'picker-item' + (added ? ' is-added' : '')}
                    disabled={added}
                    onClick={() => addExerciseToDay(picker, ex)}
                  >
                    <MuscleMap pattern={ex.pattern} exId={ex.id} size={46} compact />
                    <span className="ex-name">
                      {ex.name}
                      {m.via === 'alias' && <span className="match-tag">“{m.term}”</span>}
                    </span>
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

      {info.dialogs}
    </section>
  )
}
