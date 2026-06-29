import { useState } from 'react'
import { CARDIO_MACHINES, CARDIO_BY_ID } from '../data/cardio.js'

// Fields for logging a cardio session. Calls onSaved(entry) with the data.
export default function CardioForm({ onSaved, units = 'lbs' }) {
  const [machine, setMachine] = useState('treadmill')
  const [duration, setDuration] = useState('')
  const [distance, setDistance] = useState('')
  const [distUnit, setDistUnit] = useState(units === 'kg' ? 'km' : 'mi')
  const [avgHr, setAvgHr] = useState('')
  const [calories, setCalories] = useState('')
  const [notes, setNotes] = useState('')

  const hasDistance = CARDIO_BY_ID[machine]?.distance
  const canSave = Number(duration) > 0

  const save = () => {
    if (!canSave) return
    onSaved({
      date: new Date().toISOString(),
      machine,
      machineName: CARDIO_BY_ID[machine]?.name || 'Cardio',
      durationMin: Number(duration),
      distance: hasDistance && Number(distance) ? Number(distance) : null,
      distanceUnit: distUnit,
      avgHr: Number(avgHr) || null,
      calories: Number(calories) || null,
      notes: notes.trim(),
    })
    setDuration(''); setDistance(''); setAvgHr(''); setCalories(''); setNotes('')
  }

  return (
    <div className="cardio-form">
      <p className="group-label">Machine / activity</p>
      <div className="machine-grid">
        {CARDIO_MACHINES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={'machine-chip' + (machine === m.id ? ' is-selected' : '')}
            style={machine === m.id ? { borderColor: m.color, background: `color-mix(in srgb, ${m.color} 20%, var(--surface))` } : undefined}
            onClick={() => setMachine(m.id)}
          >
            <span className="machine-icon">{m.icon}</span>{m.name}
          </button>
        ))}
      </div>

      <div className="cardio-fields">
        <label>Time (min)
          <input type="number" inputMode="numeric" value={duration} placeholder="30" onChange={(e) => setDuration(e.target.value)} />
        </label>
        {hasDistance && (
          <label>Distance
            <div className="dist-row">
              <input type="number" inputMode="decimal" value={distance} placeholder="3.0" onChange={(e) => setDistance(e.target.value)} />
              <button type="button" className="unit-toggle" onClick={() => setDistUnit((u) => (u === 'mi' ? 'km' : 'mi'))}>{distUnit}</button>
            </div>
          </label>
        )}
        <label>Avg HR (bpm)
          <input type="number" inputMode="numeric" value={avgHr} placeholder="140" onChange={(e) => setAvgHr(e.target.value)} />
        </label>
        <label>Calories
          <input type="number" inputMode="numeric" value={calories} placeholder="320" onChange={(e) => setCalories(e.target.value)} />
        </label>
      </div>

      <input className="text-input" placeholder="Notes (level, incline, how it felt…)" value={notes} onChange={(e) => setNotes(e.target.value)} />

      <button type="button" className="btn btn-primary" onClick={save} disabled={!canSave}>Save cardio</button>
    </div>
  )
}
