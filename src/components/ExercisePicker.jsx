import { useState } from 'react'
import { EXERCISES, matchesQuery } from '../data/exercises.js'
import ExerciseFigure from './ExerciseFigure.jsx'
import { getEquipment, activeEquipmentIds, isDoable, profileMeta } from '../lib/equipment.js'

// Bottom-sheet exercise picker. Calls onPick(exercise) for each tap; stays open
// so several can be added in a row. onClose dismisses it. Defaults to showing
// only exercises doable with the active location's equipment.
export default function ExercisePicker({ onPick, onClose, title = 'Add exercise' }) {
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)
  const q = search.trim().toLowerCase()
  const active = getEquipment().active
  const availableSet = new Set(activeEquipmentIds())
  // Hide only the template-only ladder variants; cardio/conditioning moves (e.g.
  // Mountain Climbers, a warm-up run) can be added. Unless "Show all", also hide
  // anything you can't do with the current equipment.
  const filtered = EXERCISES.filter(
    (e) => !e.ladderOnly && matchesQuery(e, q)
      && (showAll || isDoable(e, availableSet)),
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
        <div className="picker-filter">
          <span className="muted small">{profileMeta(active).icon} {profileMeta(active).name} gear</span>
          <button type="button" className={'chip' + (showAll ? '' : ' is-selected')} onClick={() => setShowAll(false)}>What I can do</button>
          <button type="button" className={'chip' + (showAll ? ' is-selected' : '')} onClick={() => setShowAll(true)}>Show all</button>
        </div>
        <div className="picker-list">
          {filtered.map((ex) => (
            <button key={ex.id} type="button" className="picker-item" onClick={() => onPick(ex)}>
              <ExerciseFigure pattern={ex.pattern} exId={ex.id} size={34} />
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
