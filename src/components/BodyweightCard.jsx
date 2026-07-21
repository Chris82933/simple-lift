import { useState } from 'react'
import { loadBodyweight, logBodyweight, deleteBodyweight, loadSettings } from '../lib/storage.js'

// Records the lifter's own bodyweight. Deliberately explains *why* the app wants
// it — an unexplained weight field in a workout app reads as judgemental, and
// people are right to ignore one. It is optional and never shown as a goal or
// compared to anything.
export default function BodyweightCard({ compact = false }) {
  const units = loadSettings().units === 'kg' ? 'kg' : 'lbs'
  const [log, setLog] = useState(() => loadBodyweight())
  const [value, setValue] = useState('')

  const current = log.length ? log[0] : null

  const save = () => {
    const w = Number(value)
    if (!(w > 0)) return
    setLog(logBodyweight(w)) // fires the ✓ Saved flash via the storage layer
    setValue('')
  }

  const remove = (date) => { deleteBodyweight(date); setLog(loadBodyweight()) }

  return (
    <div className="card">
      <p className="group-label">Bodyweight</p>
      <p className="muted small">
        Optional, and only ever used for your own numbers — the app never sets a target weight or
        comments on it.
      </p>
      <ul className="why-list">
        <li>
          <strong>Scores weighted pull-ups and dips properly.</strong> A 25 {units} belt on a{' '}
          {current ? Math.round(current.weight) : 180} {units} lifter is a{' '}
          {current ? Math.round(current.weight) + 25 : 205} {units} lift — without your weight the
          app can only see the 25.
        </li>
        <li><strong>Charts your weight over time</strong> alongside your lifts, on the Progress tab.</li>
        <li><strong>Strength-to-weight</strong> — the number that actually matters for climbing and calisthenics.</li>
      </ul>

      <div className="bw-entry">
        <input
          type="number"
          inputMode="decimal"
          className="text-input"
          placeholder={current ? `${current.weight} ${units}` : `Your weight in ${units}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') save() }}
          aria-label={`Bodyweight in ${units}`}
        />
        <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={!(Number(value) > 0)}>
          Save
        </button>
      </div>

      {current && (
        <p className="muted small">
          Latest: <strong>{current.weight} {units}</strong> · {new Date(current.date).toLocaleDateString()}
          {log.length > 1 && ` · ${log.length} entries`}
        </p>
      )}

      {!compact && log.length > 1 && (
        <details className="guide">
          <summary>Weigh-in history</summary>
          <div className="bw-log">
            {log.slice(0, 20).map((e) => (
              <div className="log-row" key={e.date}>
                <span>{new Date(e.date).toLocaleDateString()}</span>
                <span className="muted small">{e.weight} {units}</span>
                <button type="button" className="icon-btn log-del" onClick={() => remove(e.date)} aria-label="Delete this weigh-in">✕</button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
