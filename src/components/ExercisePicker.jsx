import { Fragment, useRef, useState } from 'react'
import { EXERCISES, matchInfo } from '../data/exercises.js'
import MuscleMap from './MuscleMap.jsx'
import CustomExerciseForm from './CustomExerciseForm.jsx'
import { getEquipment, activeEquipmentIds, isDoable, profileMeta } from '../lib/equipment.js'
import useModalA11y from '../lib/useModalA11y.js'

const GROUP_LABEL = {
  squat: 'Squat', lunge: 'Lunge & single-leg', hinge: 'Hinge, glutes & hamstrings',
  horiz_push: 'Push — chest', vert_push: 'Push — shoulders', shoulder_iso: 'Shoulders — isolation',
  horiz_pull: 'Pull — rows', vert_pull: 'Pull — pull-ups & pulldowns',
  biceps: 'Biceps', triceps: 'Triceps', core: 'Core', calf: 'Calves', conditioning: 'Conditioning & cardio',
}
const groupOf = (e) => GROUP_LABEL[e.pattern] || 'Other'

// Bottom-sheet exercise picker. Calls onPick(exercise) for each tap; stays open
// so several can be added in a row. onClose dismisses it. Defaults to showing
// only exercises doable with the active location's equipment.
export default function ExercisePicker({ onPick, onClose, title = 'Add exercise' }) {
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [creating, setCreating] = useState(false)
  const dialogRef = useRef(null)
  // Suspend the trap while the nested custom-exercise form is open — it runs its own.
  useModalA11y(dialogRef, onClose, !creating)
  const q = search.trim().toLowerCase()
  const active = getEquipment().active
  const availableSet = new Set(activeEquipmentIds())
  // Hide only the template-only ladder variants; cardio/conditioning moves (e.g.
  // Mountain Climbers, a warm-up run) can be added. Unless "Show all", also hide
  // anything you can't do with the current equipment. Collapse any repeated
  // display name so the same exercise never appears twice, and keep WHY each
  // result matched so a non-obvious hit (via an alias) can be explained.
  const filtered = []
  const seenNames = new Set()
  for (const e of EXERCISES) {
    if (e.ladderOnly) continue
    const info = matchInfo(e, q)
    if (!info.match) continue
    if (!showAll && !isDoable(e, availableSet)) continue
    const nameKey = e.name.toLowerCase()
    if (seenNames.has(nameKey)) continue
    seenNames.add(nameKey)
    filtered.push({ ex: e, info })
  }
  // With nothing typed this is a 200-row list. Group it by movement so it can
  // be scanned; once there is a query, relevance order matters more.
  const grouped = !q
  if (grouped) {
    const order = Object.keys(GROUP_LABEL)
    const rank = (e) => { const i = order.indexOf(e.pattern); return i === -1 ? order.length : i }
    filtered.sort((a, b) => rank(a.ex) - rank(b.ex))
  }

  return (
    <div className="picker-overlay" role="dialog" aria-modal="true" aria-label={title} ref={dialogRef} tabIndex={-1}>
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
          <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>Done</button>
        </div>
        <div className="picker-filter">
          <span className="muted small">{profileMeta(active).icon} {profileMeta(active).name} gear</span>
          <button type="button" className={'chip' + (showAll ? '' : ' is-selected')} aria-pressed={!showAll} onClick={() => setShowAll(false)}>What I can do</button>
          <button type="button" className={'chip' + (showAll ? ' is-selected' : '')} aria-pressed={showAll} onClick={() => setShowAll(true)}>Show all</button>
        </div>
        <div className="picker-list">
          {filtered.map(({ ex, info }, i) => (
            <Fragment key={ex.id}>
            {grouped && (i === 0 || groupOf(filtered[i - 1].ex) !== groupOf(ex)) && (
              <p className="picker-group-label">{groupOf(ex)}</p>
            )}
            <button type="button" className="picker-item" onClick={() => onPick(ex)}>
              <MuscleMap pattern={ex.pattern} exId={ex.id} size={44} compact />
              <span className="ex-name">
                {ex.name}{ex.custom ? ' ·' : ''}
                {info.via === 'alias' && <span className="match-tag">“{info.term}”</span>}
              </span>
              <span className="muted small">
                {ex.custom ? 'custom · ' : ''}{ex.compound ? 'compound' : 'accessory'}{ex.requires.length === 0 ? ' · bodyweight' : ''}
              </span>
              <span className="add-plus">+</span>
            </button>
            </Fragment>
          ))}
          {filtered.length === 0 && <p className="muted">No matches.</p>}
          <button type="button" className="picker-item create-custom" onClick={() => setCreating(true)}>
            <span className="add-plus">＋</span>
            <span className="ex-name">Create a custom exercise{q ? ` “${search.trim()}”` : ''}</span>
          </button>
        </div>
      </div>

      {creating && (
        <CustomExerciseForm
          initialName={search.trim()}
          onClose={() => setCreating(false)}
          onCreate={(ex) => { setCreating(false); onPick(ex) }}
        />
      )}
    </div>
  )
}
