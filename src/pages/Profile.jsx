import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  loadProfile, loadSettings, saveSettings, loadHistory, clearAll,
} from '../lib/storage.js'
import { REGIONS, EQUIPMENT_GROUPS, GOALS } from '../data/options.js'

const ALL_EQUIP = EQUIPMENT_GROUPS.flatMap((g) => g.items)
const labelsFor = (ids = [], src) => ids.map((id) => src.find((x) => x.id === id)?.label).filter(Boolean)

export default function Profile() {
  const navigate = useNavigate()
  const profile = loadProfile()
  const history = loadHistory()
  const [settings, setSettings] = useState(loadSettings())

  const setUnits = (units) => {
    const next = { ...settings, units }
    setSettings(next)
    saveSettings(next)
  }

  const reset = () => {
    if (window.confirm('Reset everything? This clears your program, settings, and workout history on this device.')) {
      clearAll()
      navigate('/onboarding')
    }
  }

  return (
    <section className="page">
      <header className="page-header"><h1>Profile</h1></header>

      <div className="card">
        <p className="group-label">Units</p>
        <div className="seg">
          {['lbs', 'kg'].map((u) => (
            <button
              key={u}
              type="button"
              className={'seg-item' + (settings.units === u ? ' is-selected' : '')}
              onClick={() => setUnits(u)}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {profile ? (
        <div className="card">
          <p className="group-label">Your setup</p>
          <ul className="settings-list">
            <li><span>Focus</span><span className="muted">{labelsFor(profile.focusAreas, REGIONS).join(', ') || '—'}</span></li>
            <li><span>Schedule</span><span className="muted">{profile.daysPerWeek}× / week · {profile.sessionLength} min</span></li>
            <li><span>Goals</span><span className="muted">{labelsFor(profile.goals, GOALS).join(', ') || '—'}</span></li>
            <li><span>Equipment</span><span className="muted">{labelsFor(profile.equipment, ALL_EQUIP).length ? `${profile.equipment.length} items` : 'Bodyweight'}</span></li>
          </ul>
          <Link className="btn btn-ghost" to="/onboarding">Edit setup &amp; rebuild</Link>
        </div>
      ) : (
        <div className="card">
          <p className="muted">No program yet.</p>
          <Link className="btn btn-primary" to="/onboarding">Build my program</Link>
        </div>
      )}

      <div className="card">
        <p className="group-label">Activity</p>
        <p className="muted">{history.length} workout{history.length === 1 ? '' : 's'} logged.</p>
        {history.slice(0, 5).map((w, i) => (
          <div className="history-row" key={i}>
            <span>{w.sessionTitle}</span>
            <span className="muted small">{new Date(w.date).toLocaleDateString()}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <p className="muted small">Your data is saved on this device. Account sync comes later.</p>
        <button type="button" className="btn btn-ghost danger" onClick={reset}>Reset all data</button>
      </div>
    </section>
  )
}
