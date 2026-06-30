import { useState } from 'react'
import { EXERCISES } from '../data/exercises.js'
import ExerciseFigure from './ExerciseFigure.jsx'

// Bottom-sheet exercise picker. Calls onPick(exercise) for each tap; stays open
// so several can be added in a row. onClose dismisses it.
export default function ExercisePicker({ onPick, onClose, title = 'Add exercise' }) {
  const [search, setSearch] = useState('')
  const q = search.trim().toLowerCase()
  // Hide template-only ladder variants and conditioning moves (logged via cardio).
  const filtered = EXERCISES.filter(
    (e) => !e.ladderOnly && e.pattern !== 'conditioning' && e.name.toLowerCase().includes(q),
  )

  return (
    <div className="picker-overlay" role="dialog" aria-label={title}>
      <div className="picker-sheet">
        <div className="picker-head">
          <input
            className="text-input"
            placeholder="Search exercises…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>Done</button>
        </div>
        <div className="picker-list">
          {filtered.map((ex) => (
            <button key={ex.id} type="button" className="picker-item" onClick={() => onPick(ex)}>
              <ExerciseFigure pattern={ex.pattern} size={34} />
              <span className="ex-name">{ex.name}</span>
              <span className="muted small">
                {ex.compound ? 'compound' : 'accessory'}{ex.requires.length === 0 ? ' · bodyweight' : ''}
              </span>
              <span className="add-plus">+</span>
            </button>
          ))}
          {filtered.length === 0 && <p className="muted">No matches.</p>}
        </div>
      </div>
    </div>
  )
}
