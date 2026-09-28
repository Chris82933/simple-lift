import { useState } from 'react'
import MuscleMap from '../MuscleMap.jsx'
import { plannedMuscleHeat } from '../../lib/muscleHeat.js'
import { WEEKDAY_LABELS } from '../../lib/generator.js'

// The whole week, side by side. On a phone the only way to compare Monday's
// coverage with Thursday's is to remember it across two screens of scrolling;
// with room to spare we can just show every day's muscle heat at once, which is
// how you actually spot "this split has no pulling on it".
export default function DesktopWeekStrip({ d, selected, onSelect, onAddDay }) {
  const [armed, setArmed] = useState(null)
  const [dragIndex, setDragIndex] = useState(null)
  const [overIndex, setOverIndex] = useState(null)
  const endDrag = () => { setArmed(null); setDragIndex(null); setOverIndex(null) }

  return (
    <div className="dtb-week">
      <ul className="dtb-week-list">
        {d.draft.days.map((day, di) => {
          const dayName = day.title.trim() || WEEKDAY_LABELS[day.weekday]
          const setCount = day.exercises.reduce((n, e) => n + (Number(e.sets) || 0), 0)
          return (
            <li
              key={di}
              className={
                'dtb-day-tile'
                + (di === selected ? ' is-selected' : '')
                + (di === dragIndex ? ' is-dragging' : '')
                + (di === overIndex && di !== dragIndex ? ' is-drop-target' : '')
              }
              draggable={armed === di}
              onDragStart={() => setDragIndex(di)}
              onDragOver={(e) => { e.preventDefault(); setOverIndex(di) }}
              // Days carry their exercises and weekday with them — see reorderDays.
              onDrop={(e) => { e.preventDefault(); if (dragIndex !== null) d.moveDayTo(dragIndex, di); endDrag() }}
              onDragEnd={endDrag}
            >
              <button
                type="button"
                className="dtb-day-tile-main"
                aria-pressed={di === selected}
                onClick={() => onSelect(di)}
              >
                <span className="dtb-tile-weekday">{WEEKDAY_LABELS[day.weekday]}</span>
                <MuscleMap heat={plannedMuscleHeat(day.exercises)} size={72} />
                <span className="dtb-tile-name">{dayName}</span>
                <span className="muted small">{day.exercises.length} ex · {setCount} sets{(day.cardio || []).length ? ' · cardio' : ''}</span>
              </button>
              <div className="dtb-tile-tools">
                {/* Drag arms on the grip only, so the tile's own click target
                    (select this day) still works with a plain click. */}
                <span
                  className="dtb-grip"
                  aria-hidden="true"
                  title="Drag to reorder — or use the ◀▶ buttons"
                  onMouseDown={() => setArmed(di)}
                  onMouseUp={endDrag}
                >
                  ⠿
                </span>
                <button type="button" className="icon-btn" disabled={di === 0} onClick={() => d.moveDay(di, -1)} aria-label={`Move ${dayName} earlier`}>
                  <span aria-hidden="true">◀</span>
                </button>
                <button type="button" className="icon-btn" disabled={di === d.draft.days.length - 1} onClick={() => d.moveDay(di, 1)} aria-label={`Move ${dayName} later`}>
                  <span aria-hidden="true">▶</span>
                </button>
                {d.draft.days.length > 1 && (
                  <button type="button" className="icon-btn" onClick={() => d.removeDay(di)} aria-label={`Remove ${dayName}`}>
                    <span aria-hidden="true">✕</span>
                  </button>
                )}
              </div>
            </li>
          )
        })}
        <li className="dtb-day-tile dtb-day-add">
          <button type="button" className="dtb-day-tile-main" onClick={onAddDay}>
            <span className="dtb-add-plus" aria-hidden="true">+</span>
            <span className="dtb-tile-name">Add training day</span>
          </button>
        </li>
      </ul>
    </div>
  )
}
