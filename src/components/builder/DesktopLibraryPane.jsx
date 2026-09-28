import { useRef } from 'react'
import MuscleMap from '../MuscleMap.jsx'
import CustomExerciseForm from '../CustomExerciseForm.jsx'
import { profileMeta } from '../../lib/equipment.js'
import { WEEKDAY_LABELS } from '../../lib/generator.js'

// Right pane: the exercise library, permanently open. On a phone this is a
// modal sheet because there is nowhere else to put it, and every add costs you
// open → search → add → close. Here it is just a column, so building a session
// is type-Enter-type-Enter without the workspace ever leaving the screen.
export default function DesktopLibraryPane({ d, di }) {
  const searchRef = useRef(null)
  const day = d.draft.days[di]
  const exIds = d.exIdsForDay(di)
  const addable = d.filtered.filter(({ ex }) => !exIds.has(ex.id))

  const add = (ex) => {
    d.addExerciseToDay(di, ex)
    // Keep the caret where it was: the next thing a user does is type the next
    // exercise's name, not reach for the mouse.
    searchRef.current?.focus()
  }

  return (
    <div className="dtb-library">
      <p className="group-label">Exercise library</p>
      <input
        ref={searchRef}
        className="text-input"
        aria-label="Search exercises"
        placeholder="Search exercises…  (Enter adds the top match)"
        value={d.search}
        onChange={(e) => d.setSearch(e.target.value)}
        onKeyDown={(e) => {
          // Enter adds the first result that isn't already in the day. Typing a
          // name and hitting Enter is the fastest way to fill a session, and it
          // is the keyboard equivalent of clicking the row at the top.
          if (e.key !== 'Enter') return
          e.preventDefault()
          if (day && addable.length > 0) add(addable[0].ex)
        }}
      />
      <div className="picker-filter">
        <span className="muted small">{profileMeta(d.equipActive).icon} {profileMeta(d.equipActive).name} gear</span>
        <button type="button" className={'chip' + (d.showAll ? '' : ' is-selected')} aria-pressed={!d.showAll} onClick={() => d.setShowAll(false)}>What I can do</button>
        <button type="button" className={'chip' + (d.showAll ? ' is-selected' : '')} aria-pressed={d.showAll} onClick={() => d.setShowAll(true)}>Show all</button>
      </div>
      <p className="muted small dtb-library-target">
        {day
          ? <>Adding to <strong>{day.title.trim() || WEEKDAY_LABELS[day.weekday]}</strong></>
          : 'Add a training day first.'}
      </p>
      <div className="dtb-library-list">
        {d.filtered.map(({ ex, info }) => {
          const added = exIds.has(ex.id)
          return (
            <button
              key={ex.id}
              type="button"
              className={'picker-item' + (added ? ' is-added' : '')}
              disabled={added || !day}
              onClick={() => add(ex)}
            >
              <MuscleMap pattern={ex.pattern} exId={ex.id} size={40} compact />
              <span className="ex-name">
                {ex.name}
                {info.via === 'alias' && <span className="match-tag">“{info.term}”</span>}
              </span>
              <span className="muted small">{ex.compound ? 'compound' : 'accessory'}{ex.requires.length === 0 ? ' · bodyweight' : ''}</span>
              <span className="add-plus">{added ? '✓' : '+'}</span>
            </button>
          )
        })}
        {d.filtered.length === 0 && <p className="muted">No matches.</p>}
        <button type="button" className="picker-item create-custom" onClick={() => d.setCreating(true)}>
          <span className="add-plus">＋</span>
          <span className="ex-name">Create a custom exercise{d.search.trim() ? ` “${d.search.trim()}”` : ''}</span>
        </button>
      </div>

      {d.creating && (
        <CustomExerciseForm
          onClose={() => d.setCreating(false)}
          onCreate={(ex) => { d.setCreating(false); if (day) d.addExerciseToDay(di, ex) }}
        />
      )}
    </div>
  )
}
