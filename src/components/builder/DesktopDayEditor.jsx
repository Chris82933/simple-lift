import { useEffect, useState } from 'react'
import { exMeasure, isoHoldFor } from '../../data/exercises.js'
import { WEEKDAY_LABELS } from '../../lib/generator.js'
import { ladderInfo } from '../../lib/ladder.js'
import MuscleMap from '../MuscleMap.jsx'
import { plannedMuscleHeat } from '../../lib/muscleHeat.js'
import { CARDIO_MACHINES, CARDIO_BY_ID } from '../../data/cardio.js'
import Icon from '../Icon.jsx'
import { WEEKDAY_ORDER, exerciseErrors, sameEquip } from './draftLogic.js'
import useClickGuard from './useClickGuard.js'

// One row per exercise instead of one card per exercise. The whole point of the
// desktop view is that a session's numbers line up in columns you can read down
// and tab across — "is every accessory at 3 sets?" is a glance here and a scroll
// on a phone.
function ExerciseRow({ d, di, ex, ei, count, info, drag, guard }) {
  const errs = exerciseErrors(ex)
  const measure = exMeasure(ex)
  const lad = ladderInfo(ex.id)
  const inSuperset = ex.supersetNext || d.draft.days[di].exercises[ei - 1]?.supersetNext
  const next = d.draft.days[di].exercises[ei + 1]
  // "Recommended" rewrites up to six fields at once, so it has to say what it
  // did — otherwise a click that changes sets from 5 to 3 is silent, and a
  // click on an already-recommended row looks broken. The snapshot is compared
  // with the row as it renders after the update.
  const [recFrom, setRecFrom] = useState(null)
  const recKey = `${ex.sets}|${ex.repLow}|${ex.repHigh}|${ex.restSec}|${ex.startWeight}|${!!ex.warmups}`
  useEffect(() => {
    if (recFrom === null) return undefined
    const t = setTimeout(() => setRecFrom(null), 3000)
    return () => clearTimeout(t)
  }, [recFrom])
  const recNote = recFrom === null ? ''
    : recFrom === recKey ? 'Already at the recommended setup'
      : `Set to ${ex.sets} × ${ex.repLow}–${ex.repHigh}${measure.type === 'reps' ? '' : ` ${measure.unit}`}, ${ex.restSec}s rest`
  const recShort = recFrom === recKey ? '✓ Already set' : `✓ ${ex.sets} × ${ex.repLow}–${ex.repHigh}`
  // Toggling a chip is the same patch the phone card applies — the desktop
  // just spends a checkbox-sized chip on it instead of a full-width row.
  const chip = (on, label, onClick, hint) => (
    <button
      type="button"
      className={'dtb-chip' + (on ? ' is-on' : '')}
      aria-pressed={!!on}
      onClick={onClick}
      title={hint}
    >
      {label}
    </button>
  )

  return (
    <tbody className={'dtb-rowgroup' + (inSuperset ? ' in-superset' : '') + (drag.overIndex === ei ? ' is-drop-target' : '')}>
      <tr
        className={'dtb-row' + (drag.dragIndex === ei ? ' is-dragging' : '')}
        draggable={drag.armed === ei}
        onDragStart={() => drag.onDragStart(ei)}
        onDragOver={(e) => { e.preventDefault(); drag.onDragOver(ei) }}
        onDrop={(e) => { e.preventDefault(); drag.onDrop(ei) }}
        onDragEnd={drag.onDragEnd}
      >
        {/* Drag is armed only while the grip is held: a permanently draggable
            row makes every number input impossible to select text in. */}
        <td className="dtb-c-grip">
          <span
            className="dtb-grip"
            aria-hidden="true"
            title="Drag to reorder — or use the ▲▼ buttons"
            onMouseDown={() => drag.setArmed(ei)}
            onMouseUp={drag.onDragEnd}
          >
            ⠿
          </span>
        </td>
        <td className="dtb-c-name">
          <span className="dtb-name-cell">
          <MuscleMap pattern={ex.pattern} exId={ex.id} size={34} compact />
          <span className="dtb-name-text">
            <span className="ex-name">{ex.name}</span>
            {lad && lad.length > 1 && (
              <span className="dtb-ladder">
                <button type="button" className="ladder-step-btn" disabled={!lad.prevId} onClick={() => d.changeLevel(di, ei, -1)} title={lad.prevName ? `Easier: ${lad.prevName}` : ''} aria-label={lad.prevName ? `Easier variation: ${lad.prevName}` : 'No easier variation'}>↓</button>
                <span className="muted small">L{lad.index + 1}/{lad.length}</span>
                <button type="button" className="ladder-step-btn" disabled={!lad.nextId} onClick={() => d.changeLevel(di, ei, 1)} title={lad.nextName ? `Harder: ${lad.nextName}` : ''} aria-label={lad.nextName ? `Harder variation: ${lad.nextName}` : 'No harder variation'}>↑</button>
              </span>
            )}
          </span>
          </span>
        </td>
        <td>
          <input
            type="number" min="1" inputMode="numeric" className={errs.sets ? 'is-invalid' : ''}
            aria-label={`Sets for ${ex.name}`} aria-invalid={!!errs.sets}
            value={ex.sets}
            onChange={(e) => d.updateExercise(di, ei, { sets: e.target.value })}
          />
        </td>
        <td>
          <input
            type="number" min="1" inputMode="numeric" className={errs.repLow || errs.repRange ? 'is-invalid' : ''}
            aria-label={`Minimum ${measure.type === 'reps' ? 'reps' : measure.unit} for ${ex.name}`}
            aria-invalid={!!(errs.repLow || errs.repRange)}
            value={ex.repLow}
            onChange={(e) => d.updateExercise(di, ei, { repLow: e.target.value })}
          />
        </td>
        <td>
          <input
            type="number" min="1" inputMode="numeric" className={errs.repHigh || errs.repRange ? 'is-invalid' : ''}
            aria-label={`Maximum ${measure.type === 'reps' ? 'reps' : measure.unit} for ${ex.name}`}
            aria-invalid={!!(errs.repHigh || errs.repRange)}
            value={ex.repHigh}
            onChange={(e) => d.updateExercise(di, ei, { repHigh: e.target.value })}
          />
        </td>
        <td>
          <input
            type="number" min="0" step="5" inputMode="numeric" className={errs.restSec ? 'is-invalid' : ''}
            aria-label={`Rest seconds for ${ex.name}`} aria-invalid={!!errs.restSec}
            value={ex.restSec}
            onChange={(e) => d.updateExercise(di, ei, { restSec: e.target.value })}
          />
        </td>
        <td className="dtb-c-wt">
          {ex.load ? (
            <span className={'dtb-wt' + (ex.startWeightEstimated ? ' has-est' : '')}>
              <input
                type="number" min="0" inputMode="decimal" placeholder="–"
                className={errs.startWeight ? 'is-invalid' : ''} aria-invalid={!!errs.startWeight}
                aria-label={`Starting weight for ${ex.name}`}
                value={ex.startWeight}
                // A manual edit means this is now the user's own number, not a
                // guess — drop the estimated flag so the badge doesn't linger.
                onChange={(e) => d.updateExercise(di, ei, { startWeight: e.target.value, startWeightEstimated: undefined })}
              />
              {ex.startWeightEstimated && (
                <button type="button" className="dtb-est" onClick={info.show.startWt} title="Estimated from your other saved maxes — click to read how" aria-label="Estimated weight — how this was worked out">≈</button>
              )}
            </span>
          ) : (
            <span className="muted small">–</span>
          )}
        </td>
      </tr>
      {/* Toggles and row actions live under the numbers, not beside them.
          Two more columns cost ~195px of the table's minimum width, which is
          what decides the window size the whole workspace needs — and they are
          the two columns that do NOT want to line up down the table. The
          numbers keep their grid; these keep their labels. */}
      <tr className="dtb-row-tools">
        <td colSpan={7}>
          {/* The flex row is a wrapper INSIDE the cell, not the cell itself:
              `display: flex` on a <td> drops it out of the table layout and the
              column collapses, which stacks every chip vertically. */}
          <span className="dtb-tools">
          <span className="dtb-tools-opts">
            {ex.load && measure.type === 'reps' &&
              chip(ex.warmups, 'Warm-up', () => d.updateExercise(di, ei, { warmups: ex.warmups ? undefined : true }), 'Ramp-up sets before the working sets')}
            {measure.type === 'reps' &&
              chip(ex.amrap, 'AMRAP', () => d.updateExercise(di, ei, { amrap: ex.amrap ? undefined : true }), 'Push the last set for max reps')}
            {/* Uses the BASE exercise's measure so the chip stays visible to toggle
                back off once the entry has become a timed hold. */}
            {exMeasure({ id: ex.id }).type === 'reps' &&
              chip(ex.iso, 'Iso', () => d.toggleIso(di, ei), 'Hold for time instead of reps')}
          </span>
          <span className="dtb-tools-move">
            {/* An action, not a toggle — so it sits with the other row actions
                at a fixed spot on the right, not after chips that come and go. */}
            <button
              type="button"
              className={'dtb-action-btn' + (recFrom !== null ? ' is-done' : '')}
              onClick={() => { setRecFrom(recKey); d.applyRecommended(di, ei) }}
              title={`Reset sets, reps and rest to the recommended setup for this goal${ex.load ? ', weight from your 1RM' : ''}`}
              aria-label={`Use recommended for ${ex.name}`}
            >
              {/* The result shows IN the button for a few seconds. As a separate
                  note it wrapped the row and pushed this button — and everything
                  under it — out from under the cursor. */}
              {recFrom === null ? 'Recommended' : recShort}
            </button>
            <span className="sr-only" role="status" aria-live="polite">{recNote}</span>
            <span className="dtb-tools-sep" aria-hidden="true" />
            <button type="button" className="icon-btn" disabled={ei === 0} onClick={guard(() => d.moveExercise(di, ei, -1))} aria-label={`Move ${ex.name} up`} title="Move up">
              <span aria-hidden="true">▲</span>
            </button>
            <button type="button" className="icon-btn" disabled={ei === count - 1} onClick={guard(() => d.moveExercise(di, ei, 1))} aria-label={`Move ${ex.name} down`} title="Move down">
              <span aria-hidden="true">▼</span>
            </button>
            <button type="button" className="icon-btn" onClick={guard(() => d.removeExercise(di, ei))} aria-label={`Remove ${ex.name}`} title="Remove exercise">
              <span aria-hidden="true">✕</span>
            </button>
          </span>
          </span>
        </td>
      </tr>
      {Object.keys(errs).length > 0 && (
        <tr className="dtb-row-note">
          <td colSpan={7}>
            {/* Inline validation, never a silent substitution — canSave stays
                false while any of these are present (see exerciseErrors). */}
            <p className="muted small import-error">
              {errs.sets && <>{errs.sets}. </>}
              {errs.repLow && <>{measure.type === 'reps' ? 'Min reps' : 'Min'}: {errs.repLow}. </>}
              {errs.repHigh && <>{measure.type === 'reps' ? 'Max reps' : 'Max'}: {errs.repHigh}. </>}
              {errs.repRange && <>{errs.repRange}. </>}
              {errs.restSec && <>{errs.restSec}. </>}
              {errs.startWeight && <>{errs.startWeight}.</>}
            </p>
          </td>
        </tr>
      )}
      {ex.iso && (
        <tr className="dtb-row-note">
          <td colSpan={7}>
            <p className="muted small">
              Held for time (in seconds){ex.load ? ' at a fixed weight' : ''} — default 4 × 30 sec, 3-min rest.
              {isoHoldFor(ex.id) && <> <strong>Where to hold:</strong> {isoHoldFor(ex.id)}</>}
            </p>
          </td>
        </tr>
      )}
      {ei < count - 1 && (
        <tr className="dtb-row-link">
          <td colSpan={7}>
            <button
              type="button"
              className={'superset-link' + (ex.supersetNext ? ' is-on' : '')}
              aria-pressed={!!ex.supersetNext}
              title={`Superset ${ex.name} with ${next?.name}`}
              onClick={() => d.toggleSuperset(di, ei)}
            >
              <span className="superset-link-icon" aria-hidden="true">⛓</span>
              {ex.supersetNext ? 'Superset — alternate with below' : 'Superset with below'}
              {ex.supersetNext && !sameEquip(ex, d.draft.days[di].exercises[ei + 1]) && (
                <span className="muted small"> · different equipment</span>
              )}
            </button>
          </td>
        </tr>
      )}
    </tbody>
  )
}

export default function DesktopDayEditor({ d, di, info }) {
  const day = d.draft.days[di]
  const [armed, setArmed] = useState(null)
  const [dragIndex, setDragIndex] = useState(null)
  const [overIndex, setOverIndex] = useState(null)
  const guard = useClickGuard()

  if (!day) {
    return (
      <div className="dtb-empty">
        <p className="muted">Pick a training day from the week above, or add one.</p>
      </div>
    )
  }

  const endDrag = () => { setArmed(null); setDragIndex(null); setOverIndex(null) }
  const drag = {
    armed, setArmed, dragIndex, overIndex,
    onDragStart: (i) => setDragIndex(i),
    onDragOver: (i) => setOverIndex(i),
    // Dropping goes through the same moveExerciseTo the ▲▼ buttons use, so a
    // dragged reorder repairs superset links exactly like a clicked one.
    onDrop: (i) => { if (dragIndex !== null) d.moveExerciseTo(di, dragIndex, i); endDrag() },
    onDragEnd: endDrag,
  }
  // A day can mix rep-based lifts with timed holds, so the column header stays
  // unit-neutral; each input's aria-label names its own unit.
  const allReps = day.exercises.length > 0 && day.exercises.every((e) => exMeasure(e).type === 'reps')

  return (
    <div className="dtb-day">
      <div className="dtb-day-head">
        <input
          className="text-input dtb-day-title"
          aria-label="Session name"
          placeholder="Session name (e.g. Push, Legs)"
          value={day.title}
          onChange={(e) => d.updateDay(di, { title: e.target.value })}
        />
        <select
          className="text-input select dtb-day-weekday"
          aria-label="Day of the week"
          value={day.weekday}
          onChange={(e) => d.updateDay(di, { weekday: Number(e.target.value) })}
        >
          {WEEKDAY_ORDER.map((wd) => (
            <option key={wd} value={wd}>{WEEKDAY_LABELS[wd]}</option>
          ))}
        </select>
        <span className="muted small">{day.exercises.length} exercise(s)</span>
      </div>

      {d.weekdayCounts[day.weekday] > 1 && (
        <p className="muted small dtb-warn">
          Another day is also set to {WEEKDAY_LABELS[day.weekday]} — fine for an AM/PM split, but double-check that&apos;s what you meant.
        </p>
      )}

      {day.exercises.length > 0 ? (
        <div className="dtb-table-wrap">
          <table className="dtb-table">
            <thead>
              <tr>
                <th className="dtb-c-grip"><span className="sr-only">Reorder</span></th>
                <th className="dtb-c-name">Exercise</th>
                <th>Sets</th>
                <th>Min{allReps ? ' reps' : ''}</th>
                <th>Max{allReps ? ' reps' : ''}</th>
                <th>Rest s</th>
                <th>Start wt</th>
              </tr>
            </thead>
            {day.exercises.map((ex, ei) => (
              <ExerciseRow
                // Keyed by exercise, not slot: after a reorder the row — and
                // the button that has focus — is the same DOM node, so focus
                // follows the exercise instead of landing on its neighbour.
                key={ex.id}
                d={d} di={di} ex={ex} ei={ei} count={day.exercises.length}
                info={info} drag={drag} guard={guard}
              />
            ))}
          </table>
        </div>
      ) : (
        <p className="muted small dtb-empty-day">
          Nothing in this session yet — search the library on the right and click an exercise to add it.
        </p>
      )}

      {day.exercises.length > 0 && (
        <div className="dtb-day-muscles">
          <MuscleMap heat={plannedMuscleHeat(day.exercises)} size={180} labels />
          <span className="muted small">Muscles this session · darker = more sets</span>
        </div>
      )}

      {(day.cardio || []).map((c, ci) => {
        const hasDistance = CARDIO_BY_ID[c.machine]?.distance
        return (
          <div className="dtb-cardio" key={`c${ci}`}>
            <span className="machine-icon"><Icon name="cardio" size={18} /></span>
            <select
              className="text-input cardio-machine-select"
              aria-label="Cardio machine"
              value={c.machine}
              onChange={(e) => d.updateCardio(di, ci, { machine: e.target.value })}
            >
              {CARDIO_MACHINES.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <label className="dtb-cardio-field">
              Target min
              <input type="number" inputMode="numeric" value={c.targetMin} placeholder="–" onChange={(e) => d.updateCardio(di, ci, { targetMin: e.target.value })} />
            </label>
            {hasDistance && (
              <label className="dtb-cardio-field">
                Target dist
                <input type="number" inputMode="decimal" value={c.targetDistance} placeholder="–" onChange={(e) => d.updateCardio(di, ci, { targetDistance: e.target.value })} />
              </label>
            )}
            <button type="button" className="icon-btn" onClick={() => d.removeCardio(di, ci)} aria-label="Remove cardio">
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        )
      })}

      <div className="dtb-day-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => d.addCardioToDay(di)}>Add cardio</button>
      </div>
    </div>
  )
}
