import { useState } from 'react'
import { loadBodyweight, logBodyweight, deleteBodyweight, clearBodyweight, loadSettings, bodyweightOn, setBodyweightTracking } from '../lib/storage.js'
import ConfirmModal from './ConfirmModal.jsx'
import { acceptNumber, maxBodyweight } from '../lib/limits.js'

// Records the lifter's own bodyweight. Deliberately explains *why* the app wants
// it — an unexplained weight field in a workout app reads as judgemental, and
// people are right to ignore one. It is optional and never shown as a goal or
// compared to anything. Tracking is a setting, off by default.
export default function BodyweightCard({ compact = false }) {
  const units = loadSettings().units === 'kg' ? 'kg' : 'lbs'
  const [log, setLog] = useState(() => loadBodyweight())
  const [value, setValue] = useState('')
  const [on, setOn] = useState(() => bodyweightOn())
  const [confirmClear, setConfirmClear] = useState(false)

  const toggle = (next) => { setBodyweightTracking(next); setOn(next) }
  const clearAllWeighIns = () => { clearBodyweight(); setLog([]); setConfirmClear(false) }

  const current = on && log.length ? log[0] : null

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
      <p className="muted small" style={{ marginTop: 0 }}>
        Log your weight over time. Optional, and only ever used for your own numbers — the app never
        sets a target weight or comments on it.
      </p>
      <ul className="why-list">
        <li>
          <strong>Scores weighted pull-ups and dips properly.</strong> A 25 {units} belt on a{' '}
          {current ? Math.round(current.weight) : 180} {units} lifter is a{' '}
          {current ? Math.round(current.weight) + 25 : 205} {units} lift — without your weight the
          app can only see the 25.
        </li>
        <li><strong>Charts your weight over time</strong> on the Progress tab, next to your lifts.</li>
        <li><strong>Strength-to-weight</strong> — the number that actually matters for climbing and calisthenics.</li>
      </ul>
      <div className="seg">
        {[{ id: true, label: 'On' }, { id: false, label: 'Off' }].map((o) => (
          <button
            key={o.label}
            type="button"
            className={'seg-item' + (on === o.id ? ' is-selected' : '')}
            aria-pressed={on === o.id}
            onClick={() => toggle(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>

      {!on && log.length > 0 && (
        <p className="muted small" style={{ marginTop: 12 }}>
          Your {log.length} earlier weigh-in{log.length === 1 ? ' is' : 's are'} kept but not shown or
          used. Turn this back on to see {log.length === 1 ? 'it' : 'them'} again, or{' '}
          <button type="button" className="link-btn" onClick={() => setConfirmClear(true)}>delete {log.length === 1 ? 'it' : 'them'}</button>.
        </p>
      )}
      {confirmClear && (
        <ConfirmModal
          title="Delete your weigh-ins?"
          message={`This deletes all ${log.length} saved weigh-in${log.length === 1 ? '' : 's'} on this device (and in your account, if you're signed in). It can't be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={clearAllWeighIns}
          onCancel={() => setConfirmClear(false)}
        />
      )}

      {on && (<>
      <div className="bw-entry" style={{ marginTop: 12 }}>
        <input
          type="number"
          inputMode="decimal"
          className="text-input"
          placeholder={current ? `${current.weight} ${units}` : `Your weight in ${units}`}
          value={value}
          min="0"
          onChange={(e) => setValue(acceptNumber(e.target.value, value, { max: maxBodyweight() }))}
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
      </>)}
    </div>
  )
}
