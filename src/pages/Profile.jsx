import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  loadProfile, loadSettings, saveSettings, loadHistory, clearAll,
} from '../lib/storage.js'
import { REGIONS, EQUIPMENT_GROUPS, GOALS } from '../data/options.js'
import { useAuth } from '../context/AuthContext.jsx'

const ALL_EQUIP = EQUIPMENT_GROUPS.flatMap((g) => g.items)
const labelsFor = (ids = [], src) => ids.map((id) => src.find((x) => x.id === id)?.label).filter(Boolean)

export default function Profile() {
  const navigate = useNavigate()
  const auth = useAuth()
  const profile = loadProfile()
  const history = loadHistory()
  const [settings, setSettings] = useState(loadSettings())
  const [signingIn, setSigningIn] = useState(false)

  const setUnits = (units) => {
    const next = { ...settings, units }
    setSettings(next)
    saveSettings(next)
  }

  const signIn = async () => {
    setSigningIn(true)
    try {
      await auth.signIn()
    } catch (e) {
      window.alert('Sign-in failed or was cancelled.\n\n' + (e?.message || ''))
    } finally {
      setSigningIn(false)
    }
  }

  const reset = () => {
    if (window.confirm('Reset everything? This clears your programs, settings, and workout history on this device.')) {
      clearAll()
      navigate('/onboarding')
    }
  }

  const signedIn = auth?.user

  return (
    <section className="page">
      <header className="page-header"><h1>Profile</h1></header>

      {/* ---- Account / sync ---- */}
      <div className="card">
        <p className="group-label">Account</p>
        {!auth?.configured && (
          <p className="muted small">
            Google sign-in isn&apos;t set up for this app yet. Everything is saved locally
            on this device (see below).
          </p>
        )}
        {auth?.configured && !signedIn && (
          <>
            <p className="muted small">Sign in to back up your programs and progress and sync across devices.</p>
            <button className="btn btn-primary" onClick={signIn} disabled={signingIn}>
              {signingIn ? 'Opening…' : 'Sign in with Google'}
            </button>
          </>
        )}
        {signedIn && (
          <>
            <div className="account-row">
              <span>{auth.user.displayName || auth.user.email}</span>
              <span className="active-badge">{auth.status === 'syncing' ? 'Syncing…' : 'Synced'}</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => auth.signOut()}>Sign out</button>
          </>
        )}
      </div>

      {/* ---- Privacy / data-loss notice ---- */}
      <div className="card notice">
        <p className="placeholder-title">📦 Where your data lives</p>
        <p className="muted small">
          {signedIn
            ? 'Your data is backed up to your Google account and synced to this browser. Clearing this browser is safe — sign back in to restore it.'
            : 'Your programs and workout history are saved only in this browser, on this device. If you clear your browser cache / site data, switch browsers, or use another device, this data will be gone.'}
          {!signedIn && auth?.configured && ' Sign in with Google above to back it up.'}
        </p>
      </div>

      {/* ---- Units ---- */}
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

      {/* ---- Setup summary ---- */}
      {profile ? (
        <div className="card">
          <p className="group-label">Your setup</p>
          <ul className="settings-list">
            <li><span>Focus</span><span className="muted">{labelsFor(profile.focusAreas, REGIONS).join(', ') || '—'}</span></li>
            <li><span>Schedule</span><span className="muted">{profile.daysPerWeek}× / week · {profile.sessionLength} min</span></li>
            <li><span>Goals</span><span className="muted">{labelsFor(profile.goals, GOALS).join(', ') || '—'}</span></li>
            <li><span>Equipment</span><span className="muted">{labelsFor(profile.equipment, ALL_EQUIP).length ? `${profile.equipment.length} items` : 'Bodyweight'}</span></li>
          </ul>
          <Link className="btn btn-ghost" to="/programs">Manage programs</Link>
        </div>
      ) : (
        <div className="card">
          <p className="muted">No program yet.</p>
          <button className="btn btn-primary" onClick={() => navigate('/builder')}>Build custom program</button>
          <Link className="btn btn-ghost" to="/onboarding">Generate from a few questions</Link>
        </div>
      )}

      {/* ---- Activity ---- */}
      <div className="card">
        <p className="group-label">Activity</p>
        <p className="muted">{history.length} workout{history.length === 1 ? '' : 's'} logged.</p>
        {history.slice(0, 6).map((w, i) => (
          <div className="history-row" key={i}>
            <span>{w.sessionTitle}</span>
            <span className="muted small">{new Date(w.date).toLocaleDateString()}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <button type="button" className="btn btn-ghost danger" onClick={reset}>Reset all data</button>
      </div>
    </section>
  )
}
