import { useState } from 'react'
import { MOVEMENT_TYPES, makeCustomExercise } from '../data/exercises.js'
import { saveCustomExercise } from '../lib/storage.js'
import { registerCustomExercises } from '../data/exercises.js'
import { EQUIPMENT_GROUPS, REGIONS } from '../data/options.js'

const ALL_EQUIP = EQUIPMENT_GROUPS.flatMap((g) => g.items)

const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

// A little form for adding an exercise the built-in library doesn't have. Name +
// movement type is all that's required; everything else has a sensible default.
// On save it persists, registers into the live library, and hands the finished
// exercise back so the caller can drop it straight into the program/workout.
export default function CustomExerciseForm({ onCreate, onClose }) {
  const [name, setName] = useState('')
  const [pattern, setPattern] = useState('horiz_push')
  const [measure, setMeasure] = useState('reps')
  const [requires, setRequires] = useState([])
  const [regions, setRegions] = useState([])
  const [loaded, setLoaded] = useState(true)
  const [compound, setCompound] = useState(true)
  const [cues, setCues] = useState('')
  const [advanced, setAdvanced] = useState(false)

  const type = MOVEMENT_TYPES.find((t) => t.pattern === pattern) || MOVEMENT_TYPES[0]

  // Picking a movement type reseeds the defaults the user hasn't overridden.
  const chooseType = (p) => {
    setPattern(p)
    const t = MOVEMENT_TYPES.find((x) => x.pattern === p)
    if (t) setCompound(t.compound)
  }

  const canSave = name.trim().length > 0

  const save = () => {
    if (!canSave) return
    const ex = makeCustomExercise({
      name,
      pattern,
      measure,
      regions,
      requires,
      // Time-based holds and equipment-free moves default to bodyweight.
      load: measure === 'time' && !loaded ? false : (requires.length === 0 && !loaded ? false : loaded),
      compound,
      cues,
    })
    saveCustomExercise(ex)
    registerCustomExercises([ex])
    onCreate(ex)
  }

  return (
    <div className="picker-overlay" role="dialog" aria-label="Create a custom exercise">
      <div className="picker-sheet">
        <div className="picker-head">
          <p className="ex-name big" style={{ flex: 1 }}>Create an exercise</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        </div>

        <div className="picker-list custom-ex-form">
          <label className="cef-field">
            <span className="group-label">Name</span>
            <input
              className="text-input"
              placeholder="e.g. Landmine Meadows Row"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </label>

          <div className="cef-field">
            <span className="group-label">Movement type</span>
            <div className="choice-chips">
              {MOVEMENT_TYPES.map((t) => (
                <button
                  key={t.pattern}
                  type="button"
                  className={'chip' + (pattern === t.pattern ? ' is-selected' : '')}
                  onClick={() => chooseType(t.pattern)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="muted small">Sets the icon and the default sets &amp; reps. You can change everything later.</p>
          </div>

          <div className="cef-field">
            <span className="group-label">Measured in</span>
            <div className="seg">
              {[{ id: 'reps', label: 'Reps' }, { id: 'time', label: 'Time' }, { id: 'distance', label: 'Distance' }].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={'seg-item' + (measure === m.id ? ' is-selected' : '')}
                  onClick={() => setMeasure(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="cef-field">
            <span className="group-label">Equipment</span>
            <div className="choice-chips">
              {ALL_EQUIP.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={'chip' + (requires.includes(item.id) ? ' is-selected' : '')}
                  onClick={() => setRequires((r) => toggle(r, item.id))}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="muted small">Leave empty for a bodyweight move. This controls when it&apos;s offered for your gear.</p>
          </div>

          <button type="button" className="link-btn" onClick={() => setAdvanced((a) => !a)}>
            {advanced ? '▴ Fewer options' : '▾ More options'}
          </button>

          {advanced && (
            <>
              <div className="cef-field">
                <span className="group-label">Muscles worked</span>
                <div className="choice-chips">
                  {REGIONS.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className={'chip' + (regions.includes(r.id) ? ' is-selected' : '')}
                      onClick={() => setRegions((rs) => toggle(rs, r.id))}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <p className="muted small">Optional — defaults to {type.regions.map((r) => REGIONS.find((x) => x.id === r)?.label || r).join(', ')}.</p>
              </div>

              <label className="cef-toggle">
                <input type="checkbox" checked={loaded} onChange={(e) => setLoaded(e.target.checked)} />
                <span>Uses added weight (track a working weight and warm-ups)</span>
              </label>
              <label className="cef-toggle">
                <input type="checkbox" checked={compound} onChange={(e) => setCompound(e.target.checked)} />
                <span>Compound (multi-joint) — longer rest, fewer reps by default</span>
              </label>

              <label className="cef-field">
                <span className="group-label">Notes / cues</span>
                <textarea
                  className="text-input"
                  rows={2}
                  placeholder="How to do it, reminders…"
                  value={cues}
                  onChange={(e) => setCues(e.target.value)}
                />
              </label>
            </>
          )}
        </div>

        <div className="picker-foot">
          <button type="button" className="btn btn-primary" onClick={save} disabled={!canSave}>
            Create &amp; add
          </button>
        </div>
      </div>
    </div>
  )
}
