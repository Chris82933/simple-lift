import { useId, useState } from 'react'
import { toLocalInput, fromLocalInput, clampToNow, describeSessionDate, sameLocalDay } from '../lib/sessionDate.js'

// A date + time box for when a session happened. Never later than now.
export function SessionDateInput({ value, onChange, label = 'Date and time' }) {
  const id = useId()
  const now = new Date().toISOString()
  return (
    <div className="session-date-input">
      <label htmlFor={id} className="muted small">{label}</label>
      <input
        id={id}
        type="datetime-local"
        className="text-input"
        value={toLocalInput(value || now)}
        max={toLocalInput(now)}
        onChange={(e) => {
          const iso = fromLocalInput(e.target.value)
          if (iso) onChange(clampToNow(iso))
        }}
      />
    </div>
  )
}

// The in-workout "this will be logged as…" row. `logDate` null means "the
// moment you tap Finish". When the session was started on an earlier day
// (left unfinished overnight, say) it says so and offers that day.
export default function SessionDateRow({ logDate, onChange, startedAt }) {
  const [editing, setEditing] = useState(false)
  const startedIso = new Date(startedAt || Date.now()).toISOString()
  const startedEarlier = !sameLocalDay(startedIso, Date.now())
  return (
    <div className={'session-date' + (startedEarlier ? ' card notice' : '')}>
      {startedEarlier && (
        <p className="muted small">
          You started this session <strong>{describeSessionDate(startedIso)}</strong>. Pick the day it should count for.
        </p>
      )}
      <div className="session-date-row">
        <span className="muted small">
          Logs as: <strong>{logDate ? describeSessionDate(logDate) : 'now, when you finish'}</strong>
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          aria-expanded={editing}
          onClick={() => setEditing((e) => !e)}
        >
          {editing ? 'Done' : 'Change date'}
        </button>
      </div>
      {editing && (
        <div className="session-date-edit">
          <SessionDateInput value={logDate} onChange={onChange} label="Log this session for" />
          <div className="session-date-quick">
            <button type="button" className={'chip' + (!logDate ? ' is-selected' : '')} aria-pressed={!logDate} onClick={() => onChange(null)}>
              Now
            </button>
            {startedEarlier && (
              <button type="button" className={'chip' + (logDate === startedIso ? ' is-selected' : '')} aria-pressed={logDate === startedIso} onClick={() => onChange(startedIso)}>
                Day I started
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
