import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  loadProfile, loadSettings, saveSettings, clearAll,
  exportCode, importCode,
} from '../lib/storage.js'
import { REGIONS, EQUIPMENT_GROUPS, GOALS } from '../data/options.js'
import { useAuth } from '../context/AuthContext.jsx'
import { isIOS } from '../lib/platform.js'
import InstallApp from '../components/InstallApp.jsx'
import { applyTheme } from '../lib/theme.js'
import {
  getEquipment, setActiveProfile as storeSetActiveProfile, saveProfileEquipment,
  profileMeta, PROFILE_IDS,
} from '../lib/equipment.js'
import PlateSettings from '../components/PlateSettings.jsx'

const ALL_EQUIP = EQUIPMENT_GROUPS.flatMap((g) => g.items)
const labelsFor = (ids = [], src) => ids.map((id) => src.find((x) => x.id === id)?.label).filter(Boolean)

export default function Profile() {
  const navigate = useNavigate()
  const auth = useAuth()
  const profile = loadProfile()
  const [settings, setSettings] = useState(loadSettings())
  const [signingIn, setSigningIn] = useState(false)
  const [plateSettingsOpen, setPlateSettingsOpen] = useState(false)

  // ---- Backup & transfer (copy-paste code) ----
  const [myCode, setMyCode] = useState('')
  const [importText, setImportText] = useState('')
  const [codeStatus, setCodeStatus] = useState(null) // { ok, msg }

  // Codes are gzipped, so building one is async.
  const generateCode = async () => {
    try { setMyCode(await exportCode()); setCodeStatus(null) }
    catch { setCodeStatus({ ok: false, msg: 'Could not build a code.' }) }
  }

  const copyCode = async () => {
    let code = myCode
    if (!code) {
      try { code = await exportCode() } catch { setCodeStatus({ ok: false, msg: 'Could not build a code.' }); return }
      setMyCode(code)
    }
    try {
      await navigator.clipboard.writeText(code)
      setCodeStatus({ ok: true, msg: 'Copied! Paste it somewhere safe.' })
    } catch {
      setCodeStatus({ ok: true, msg: 'Select the code above and copy it manually.' })
    }
  }

  const runImport = async () => {
    if (!window.confirm('Import this code? It will replace the programs, history, and settings on this device.')) return
    try {
      await importCode(importText)
      setCodeStatus({ ok: true, msg: 'Imported! Reloading…' })
      setTimeout(() => window.location.reload(), 600)
    } catch (e) {
      setCodeStatus({ ok: false, msg: e?.message || 'Import failed.' })
    }
  }

  const setUnits = (units) => {
    const next = { ...settings, units }
    setSettings(next)
    saveSettings(next)
  }

  const setHidePlateCalc = (hide) => {
    const next = { ...settings, hidePlateCalc: hide }
    setSettings(next)
    saveSettings(next)
  }
  const setRestTimer = (on) => {
    const next = { ...settings, restTimer: on }
    setSettings(next)
    saveSettings(next)
  }

  const theme = settings.theme || 'dark'
  const setTheme = (t) => {
    const next = { ...settings, theme: t }
    setSettings(next)
    saveSettings(next)
    applyTheme(t)
  }

  // ---- Training location (Home / Gym equipment profiles) ----
  const [equip, setEquip] = useState(() => getEquipment())
  const activeProfile = equip.active
  const chooseProfile = (id) => {
    setEquip((e) => ({ ...e, active: id }))
    storeSetActiveProfile(id)
  }
  const toggleEquip = (itemId) => {
    setEquip((e) => {
      const cur = e.profiles[activeProfile]
      const list = cur.includes(itemId) ? cur.filter((x) => x !== itemId) : [...cur, itemId]
      saveProfileEquipment(activeProfile, list)
      return { ...e, profiles: { ...e.profiles, [activeProfile]: list } }
    })
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
      <header className="page-header"><h1>Settings</h1></header>

      {/* ---- Install to home screen ---- */}
      <InstallApp />

      {/* ---- Account / sync ---- */}
      <div className="card">
        <p className="group-label">Account</p>
        {!auth?.configured && (
          <p className="muted small">
            <strong>Coming soon.</strong> Accounts and cloud sync are on the way. For now,
            everything is saved on this device (see below).
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
              <span className="active-badge">
                {auth.status === 'syncing' ? 'Syncing…' : auth.syncNote?.level === 'over' ? 'Sync paused' : 'Synced'}
              </span>
            </div>
            {auth.syncNote?.level === 'over' && (
              <p className="muted small sync-warn">
                ⚠️ Your data has grown past the cloud limit ({auth.syncNote.pct}% of 1&nbsp;MB), so cloud sync is paused — your data is still safe on this device. Trim old sessions in Progress, or keep a backup code below.
              </p>
            )}
            {auth.syncNote?.level === 'warn' && (
              <p className="muted small sync-warn">
                Cloud backup is {auth.syncNote.pct}% full. It still syncs, but consider deleting some old sessions in Progress before it fills up.
              </p>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => auth.signOut()}>Sign out</button>
          </>
        )}
      </div>

      {/* ---- Privacy / data-loss notice ---- */}
      <div className="card notice">
        <p className="placeholder-title">Where your data lives</p>
        <p className="muted small">
          {signedIn
            ? 'Your data is backed up to your Google account and synced to this browser. Clearing this browser is safe — sign back in to restore it.'
            : 'Your programs and workout history are saved only in this browser, on this device. If you clear your browser cache / site data, switch browsers, or use another device, this data will be gone.'}
          {!signedIn && auth?.configured && ' Sign in with Google above to back it up.'}
        </p>
        {!signedIn && isIOS() && (
          <p className="muted small">
            <strong>On iPhone &amp; iPad this is more urgent:</strong> Safari (and home-screen web apps) can automatically delete this app&apos;s saved data after about <strong>7 days without opening it</strong>. To be safe, copy a backup code below and keep it somewhere — or {auth?.configured ? 'sign in above' : 'use cloud sync once it&apos;s enabled'}.
          </p>
        )}
        {!signedIn && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => { generateCode(); document.getElementById('backup-card')?.scrollIntoView({ behavior: 'smooth' }) }}>
            Back up my data now
          </button>
        )}
      </div>

      {/* ---- Tools ---- */}
      <div className="card">
        <p className="group-label">Tools</p>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/one-rep-max')}>
          1RM &amp; working-weight finder
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/cardio')}>
          Log cardio
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/skills')}>
          Calisthenics skill tree
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setPlateSettingsOpen(true)}>
          Plate calculator settings
        </button>
      </div>

      {plateSettingsOpen && (
        <PlateSettings initialUnits={settings.units || 'lbs'} onClose={() => setPlateSettingsOpen(false)} />
      )}

      {/* ---- Training location (equipment profiles) ---- */}
      <div className="card">
        <p className="group-label">Training location</p>
        <div className="seg">
          {PROFILE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={'seg-item' + (activeProfile === id ? ' is-selected' : '')}
              onClick={() => chooseProfile(id)}
            >
              {profileMeta(id).name}
            </button>
          ))}
        </div>
        <details className="guide">
          <summary>Edit {profileMeta(activeProfile).name.toLowerCase()} equipment</summary>
          {EQUIPMENT_GROUPS.map((g) => (
            <div className="equip-group" key={g.group}>
              <p className="muted small">{g.group}</p>
              <div className="check-grid">
                {g.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={'check-pill' + (equip.profiles[activeProfile].includes(item.id) ? ' is-selected' : '')}
                    onClick={() => toggleEquip(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <p className="muted small">Bodyweight moves are always available.</p>
        </details>
      </div>

      {/* ---- Appearance ---- */}
      <div className="card">
        <p className="group-label">Appearance</p>
        <div className="seg">
          {[
            { id: 'dark', label: '🌙 Dark' },
            { id: 'light', label: '☀️ Light' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              className={'seg-item' + (theme === t.id ? ' is-selected' : '')}
              onClick={() => setTheme(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ---- During workouts ---- */}
      <div className="card">
        <p className="group-label">During workouts</p>
        <p className="muted small" style={{ marginTop: 0 }}>Plate calculator — show which plates to load on the bar. Turn off if you already do the math.</p>
        <div className="seg">
          {[{ id: 'show', label: 'Show' }, { id: 'hide', label: 'Hide' }].map((o) => (
            <button
              key={o.id}
              type="button"
              className={'seg-item' + ((settings.hidePlateCalc === true ? 'hide' : 'show') === o.id ? ' is-selected' : '')}
              onClick={() => setHidePlateCalc(o.id === 'hide')}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="muted small" style={{ marginTop: 14 }}>Rest timer — auto-start a rest countdown after each set. Turn off if you time your own rests.</p>
        <div className="seg">
          {[{ id: 'on', label: 'On' }, { id: 'off', label: 'Off' }].map((o) => (
            <button
              key={o.id}
              type="button"
              className={'seg-item' + ((settings.restTimer === false ? 'off' : 'on') === o.id ? ' is-selected' : '')}
              onClick={() => setRestTimer(o.id === 'on')}
            >
              {o.label}
            </button>
          ))}
        </div>
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

      {/* ---- Backup & transfer ---- */}
      <div className="card" id="backup-card">
        <p className="group-label">Backup &amp; transfer</p>
        <p className="muted small">
          Export a code with <strong>everything</strong> — programs, history, cardio, maxes, and
          settings. Paste it on another device (or back here) to restore it. Great for moving
          phones or keeping a manual backup.
        </p>
        <p className="muted small">
          The code is compressed, so it stays short even after years of training. Codes you saved
          before still work.
        </p>
        <button type="button" className="btn btn-primary" onClick={copyCode}>📋 Copy my backup code</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={generateCode}>Show code</button>
        {myCode && (
          <textarea className="text-input code-box" rows={4} readOnly value={myCode} onFocus={(e) => e.target.select()} />
        )}

        <p className="group-label" style={{ marginTop: 14 }}>Import a code</p>
        <textarea
          className="text-input code-box"
          rows={4}
          placeholder="Paste a backup code here…"
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
        />
        <button type="button" className="btn btn-ghost" onClick={runImport} disabled={!importText.trim()}>
          ⬇️ Import &amp; replace my data
        </button>
        {codeStatus && (
          <p className={'muted small code-status ' + (codeStatus.ok ? 'ok' : 'err')}>
            {codeStatus.ok ? '✓ ' : '⚠ '}{codeStatus.msg}
          </p>
        )}
      </div>

      <div className="card">
        <button type="button" className="btn btn-ghost danger" onClick={reset}>Reset all data</button>
      </div>
    </section>
  )
}
