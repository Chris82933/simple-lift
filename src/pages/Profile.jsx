import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  loadProfile, loadSettings, saveSettings, clearAll,
  exportCode, importCode,
  loadPrograms, savePrograms, loadMaxes, saveMax, loadBodyweight, logBodyweight,
  loadHistory, updateWorkout,
} from '../lib/storage.js'
import { REGIONS, EQUIPMENT_GROUPS, GOALS } from '../data/options.js'
import { useAuth } from '../context/AuthContext.jsx'
import { isIOS } from '../lib/platform.js'
import InstallApp from '../components/InstallApp.jsx'
import { applyTheme, watchSystemTheme } from '../lib/theme.js'
import { notificationsSupported, notificationPermission, requestNotifyPermission } from '../lib/notify.js'
import {
  getEquipment, setActiveProfile as storeSetActiveProfile, saveProfileEquipment,
  saveProfileCapacity, LOAD_SOURCES, profileMeta, PROFILE_IDS,
} from '../lib/equipment.js'
import { roundTo, incrementForUnits } from '../lib/oneRepMax.js'
import PlateSettings from '../components/PlateSettings.jsx'
import BodyweightCard from '../components/BodyweightCard.jsx'
import useModalA11y from '../lib/useModalA11y.js'

const ALL_EQUIP = EQUIPMENT_GROUPS.flatMap((g) => g.items)

// ---- In-app confirm dialog (U11) — replaces window.confirm for the two
// destructive actions on this page (import & replace, reset everything).
// Reuses the picker-overlay/picker-sheet modal look and useModalA11y for the
// focus trap + Escape, matching PlateSettings and other overlays.
function ConfirmModal({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, onConfirm, onCancel }) {
  const dialogRef = useRef(null)
  useModalA11y(dialogRef, onCancel)

  return (
    <div className="picker-overlay" role="dialog" aria-modal="true" aria-label={title} ref={dialogRef} tabIndex={-1}>
      <div className="picker-sheet">
        <div className="picker-head">
          <p className="ex-name big" style={{ flex: 1 }}>{title}</p>
        </div>
        <div className="picker-list">
          <p className="muted small">{message}</p>
        </div>
        <div className="picker-foot confirm-foot">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className={'btn btn-primary' + (danger ? ' danger' : '')} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

// ---- Units conversion (C6) — switching lbs↔kg must convert stored numbers,
// not just relabel them. 1 kg = 2.20462 lb exactly; round to a sensible
// loadable increment for the target unit (the same increments the rest of the
// app already uses — 2.5 kg / 5 lb, via incrementForUnits).
const KG_PER_LB = 0.45359237
function convertWeight(w, from, to) {
  const n = Number(w)
  if (!n || from === to) return w // blank/zero/NaN stays as-is; no-op if units match
  const kg = from === 'kg' ? n : n * KG_PER_LB
  const out = to === 'kg' ? kg : kg / KG_PER_LB
  return roundTo(out, incrementForUnits(to))
}

// Converts every weight field a generated/custom/GZCLP/5-3-1 program can carry:
// each exercise's startWeight, its progression.weight (double/linear/t1/t2),
// progression.tm (5-3-1 training max), progression.stage1Weight (GZCLP T2),
// and — for GZCLP — the wizard's own remembered seed maxes + units.
function convertProgramWeights(program, from, to) {
  const next = { ...program }
  if (Array.isArray(next.days)) {
    next.days = next.days.map((day) => ({
      ...day,
      exercises: (day.exercises || []).map((ex) => {
        const e2 = { ...ex }
        if (e2.startWeight !== '' && e2.startWeight != null) e2.startWeight = convertWeight(e2.startWeight, from, to)
        if (e2.progression) {
          const p = { ...e2.progression }
          for (const key of ['weight', 'tm', 'stage1Weight']) {
            if (p[key] != null) p[key] = convertWeight(p[key], from, to)
          }
          e2.progression = p
        }
        return e2
      }),
    }))
  }
  if (next.gzclp) {
    next.gzclp = {
      ...next.gzclp,
      units: to,
      maxes: Object.fromEntries(
        Object.entries(next.gzclp.maxes || {}).map(([id, v]) => [id, convertWeight(v, from, to)]),
      ),
    }
  }
  return next
}

// Converts every stored weight in one pass: programs, saved 1RMs, the
// bodyweight log, and past workout history (so Progress charts stay
// coherent). Uses only storage.js's existing exported API — no new storage
// helper, per the file-ownership rule for this change; each collection is
// read in full and written back through its normal save/update function.
function convertStoredWeights(from, to) {
  savePrograms(loadPrograms().map((p) => convertProgramWeights(p, from, to)))

  const maxes = loadMaxes()
  Object.entries(maxes).forEach(([id, m]) => {
    if (!m || m.units === to) return // already in the target unit — never double-convert
    const patch = { ...m, units: to }
    if (m.oneRM != null) patch.oneRM = convertWeight(m.oneRM, from, to)
    if (m.weight != null) patch.weight = convertWeight(m.weight, from, to)
    saveMax(id, patch)
  })

  // logBodyweight(weight, date) overwrites the single entry for that date, so
  // this rewrites each historical entry in place rather than appending.
  loadBodyweight().forEach((entry) => {
    if (entry?.date && entry.weight != null) logBodyweight(convertWeight(entry.weight, from, to), entry.date)
  })

  // Past workouts: convert each logged set's weight so Progress charts don't
  // suddenly show a unit break at the switch date.
  loadHistory().forEach((workout) => {
    if (!workout?.date || !Array.isArray(workout.entries)) return
    const entries = workout.entries.map((e) => ({
      ...e,
      sets: (e.sets || []).map((s) => (
        s.weight === '' || s.weight == null ? s : { ...s, weight: String(convertWeight(s.weight, from, to)) }
      )),
    }))
    updateWorkout(workout.date, { entries })
  })
}

// "2 min ago" for the last successful sync.
function syncAgo(ts) {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000))
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hr ago`
  return `${Math.round(h / 24)} day${h < 48 ? '' : 's'} ago`
}

// One line describing a copy of the data, so a conflict can be judged on facts.
const describeCopy = (s) =>
  s
    ? `${s.sessions} session${s.sessions === 1 ? '' : 's'} · ${s.programs} program${s.programs === 1 ? '' : 's'}`
      + (s.lastWorkout ? ` · last workout ${s.lastWorkout}` : '')
    : 'No details available'
const labelsFor = (ids = [], src) => ids.map((id) => src.find((x) => x.id === id)?.label).filter(Boolean)

export default function Profile() {
  const navigate = useNavigate()
  const auth = useAuth()
  const profile = loadProfile()
  const [settings, setSettings] = useState(loadSettings())
  const [signingIn, setSigningIn] = useState(false)
  const [plateSettingsOpen, setPlateSettingsOpen] = useState(false)
  // In-app confirm dialog (U11): { title, message, confirmLabel, danger, onConfirm } | null
  const [confirmModal, setConfirmModal] = useState(null)

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

  const runImport = () => {
    setConfirmModal({
      title: 'Import this code?',
      message: 'This replaces the programs, history, and settings on this device with what’s in the code. Your current data on this device is not kept unless you’ve saved a backup code for it too.',
      confirmLabel: 'Import & replace',
      danger: true,
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          await importCode(importText)
          setCodeStatus({ ok: true, msg: 'Imported! Reloading…' })
          setTimeout(() => window.location.reload(), 600)
        } catch (e) {
          setCodeStatus({ ok: false, msg: e?.message || 'Import failed.' })
        }
      },
    })
  }

  // C6: switching units must CONVERT stored numbers, not just relabel them —
  // otherwise a 185 lb squat silently becomes "185 kg". Destructive-ish and
  // slow to undo, so confirm first and explain exactly what changes.
  const setUnits = (units) => {
    if (units === (settings.units || 'lbs')) return
    const from = settings.units || 'lbs'
    const inc = incrementForUnits(units)
    setConfirmModal({
      title: `Switch to ${units}?`,
      message: `We'll convert your saved starting weights, saved 1RMs, bodyweight log, and past workout history from ${from} to ${units} (rounded to the nearest ${inc}${units}) — nothing just gets relabeled. This isn't perfectly reversible if you switch back and forth. Plate/bar settings aren't converted; check those under Plate calculator settings after switching.`,
      confirmLabel: `Convert to ${units}`,
      danger: true,
      onConfirm: () => {
        setConfirmModal(null)
        convertStoredWeights(from, units)
        const next = { ...settings, units }
        setSettings(next)
        saveSettings(next)
      },
    })
  }

  const setHidePlateCalc = (hide) => {
    const next = { ...settings, hidePlateCalc: hide }
    setSettings(next)
    saveSettings(next)
  }
  const setWarmupStyle = (style) => {
    const next = { ...settings, warmupStyle: style }
    setSettings(next)
    saveSettings(next)
  }
  const setSupersetTimers = (on) => {
    const next = { ...settings, supersetTimers: on }
    setSettings(next)
    saveSettings(next)
  }
  const setRestTimer = (on) => {
    const next = { ...settings, restTimer: on }
    setSettings(next)
    saveSettings(next)
  }
  const setStretching = (on) => {
    const next = { ...settings, stretching: on }
    setSettings(next)
    saveSettings(next)
  }
  const [notifyBusy, setNotifyBusy] = useState(false)
  const setRestNotify = async (on) => {
    if (!on) {
      const next = { ...settings, restNotify: false }
      setSettings(next); saveSettings(next); return
    }
    setNotifyBusy(true)
    const granted = await requestNotifyPermission()
    setNotifyBusy(false)
    if (!granted) {
      window.alert('Notifications are blocked. Turn them on for this site in your browser or phone settings, then try again.')
      return
    }
    const next = { ...settings, restNotify: true }
    setSettings(next); saveSettings(next)
  }

  // 'system' is the default for anyone who's never explicitly chosen — it
  // matches theme.js's own resolution so this page's selected pill always
  // agrees with what's actually on screen.
  const theme = settings.theme || 'system'
  const setTheme = (t) => {
    const next = { ...settings, theme: t }
    setSettings(next)
    saveSettings(next)
    applyTheme(t)
  }
  // While Settings is open with 'System' selected, follow OS scheme changes
  // live (U9). An explicit Dark/Light choice is never touched by this.
  useEffect(() => watchSystemTheme(() => theme), [theme])

  // ---- Training location (Home / Gym equipment profiles) ----
  const [equip, setEquip] = useState(() => getEquipment())
  const activeProfile = equip.active
  const chooseProfile = (id) => {
    setEquip((e) => ({ ...e, active: id }))
    storeSetActiveProfile(id)
  }
  // How much weight each gear type can actually supply, for the active profile.
  const capacity = equip.capacity?.[activeProfile] || {}
  const setCapacity = (sourceId, raw) => {
    const n = Number(raw)
    const next = { ...capacity }
    if (raw === '' || !(n > 0)) delete next[sourceId] // blank = unspecified = no limit
    else next[sourceId] = n
    setEquip((e) => ({ ...e, capacity: { ...e.capacity, [activeProfile]: next } }))
    saveProfileCapacity(activeProfile, next)
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
    setConfirmModal({
      title: 'Reset everything?',
      message: 'This clears your programs, settings, and workout history on this device. It can’t be undone unless you’ve saved a backup code.',
      confirmLabel: 'Reset everything',
      danger: true,
      onConfirm: () => {
        setConfirmModal(null)
        clearAll()
        navigate('/onboarding')
      },
    })
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
                {auth.status === 'syncing' ? 'Syncing…'
                  : auth.status === 'conflict' ? 'Needs a choice'
                    : auth.status === 'pull-pending' ? 'Update waiting'
                      : auth.status === 'error' ? 'Sync failed'
                        : auth.syncNote?.level === 'over' ? 'Sync paused' : 'Synced'}
              </span>
            </div>
            {auth.lastSyncedAt > 0 && auth.status !== 'conflict' && (
              <p className="muted small">Last synced {syncAgo(auth.lastSyncedAt)}.</p>
            )}

            {auth.conflict && (
              <div className="card notice conflict-card">
                <p className="placeholder-title">⚠️ Two copies have changed</p>
                <p className="muted small">
                  This device and your cloud backup were both updated since they last matched —
                  probably because you trained on another device, or logged something offline.
                  Keeping one means losing the other&apos;s changes, so pick the copy you want.
                </p>
                <div className="conflict-choices">
                  <button type="button" className="conflict-option" onClick={() => auth.resolveConflict('local')}>
                    <span className="path-title">Keep this device</span>
                    <span className="muted small">{describeCopy(auth.conflict.local)}</span>
                  </button>
                  <button type="button" className="conflict-option" onClick={() => auth.resolveConflict('cloud')}>
                    <span className="path-title">Keep the cloud copy</span>
                    <span className="muted small">{describeCopy(auth.conflict.cloudSummary)}</span>
                  </button>
                </div>
                <p className="muted small">
                  Not sure? Copy a backup code from below <em>before</em> choosing — that saves this
                  device&apos;s copy no matter which side you keep.
                </p>
              </div>
            )}
            {/* A pull arrived while a workout was in progress — it's held back
                rather than reloading the app under you mid-session. */}
            {auth.status === 'pull-pending' && (
              <p className="muted small sync-warn">
                An update from another device is waiting. It&apos;ll be applied once you finish (or leave) your current workout, so the app doesn&apos;t reload mid-session.
              </p>
            )}
            {/* Shape vs network failure read very differently to a user. */}
            {auth.status === 'error' && auth.syncError?.kind === 'shape' && (
              <p className="muted small sync-warn">
                ⚠️ The cloud copy couldn&apos;t be read — it doesn&apos;t look like valid Simple Lift data, so nothing on this device was changed. Your data here is untouched; keep a backup code below.
              </p>
            )}
            {auth.status === 'error' && auth.syncError?.kind !== 'shape' && (
              <p className="muted small sync-warn">
                Couldn&apos;t reach the cloud. Your data is still saved on this device and will sync when you&apos;re back online.
              </p>
            )}
            {auth.syncNote?.level === 'over' && (
              <p className="muted small sync-warn">
                ⚠️ Your data has grown past the cloud limit ({auth.syncNote.pct}% of 1&nbsp;MB), so cloud sync is paused — your data is still safe on this device. Keep a backup code below.
              </p>
            )}
            {auth.syncNote?.level === 'warn' && (
              <p className="muted small sync-warn">
                Cloud backup is {auth.syncNote.pct}% full. Workout history is stored separately and no longer counts toward this, so it should stay well clear of the limit.
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
              aria-pressed={activeProfile === id}
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
                    aria-pressed={equip.profiles[activeProfile].includes(item.id)}
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

        <details className="guide">
          <summary>How much weight do you have?</summary>
          <p className="muted small">
            Owning dumbbells isn&apos;t the same as owning <em>enough</em> weight. Fill these in and
            the app stops prescribing moves you can&apos;t load properly — a weighted pull-up
            becomes an archer pull-up if 20 {settings.units || 'lbs'} is all you can hang. Leave any
            of them blank and it won&apos;t second-guess you.
          </p>
          {LOAD_SOURCES.map((src) => (
            <label className="cap-row" key={src.id}>
              <span className="cap-label">
                {src.label}
                {src.hint && <span className="muted small"> {src.hint}</span>}
              </span>
              <input
                type="number"
                inputMode="decimal"
                className="text-input cap-input"
                placeholder={settings.units || 'lbs'}
                value={capacity[src.id] ?? ''}
                onChange={(e) => setCapacity(src.id, e.target.value)}
              />
            </label>
          ))}
        </details>
      </div>

      {/* ---- Appearance ---- */}
      <div className="card">
        <p className="group-label">Appearance</p>
        <div className="seg">
          {[
            { id: 'system', label: '🖥️ System' },
            { id: 'dark', label: '🌙 Dark' },
            { id: 'light', label: '☀️ Light' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              className={'seg-item' + (theme === t.id ? ' is-selected' : '')}
              aria-pressed={theme === t.id}
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
              aria-pressed={(settings.hidePlateCalc === true ? 'hide' : 'show') === o.id}
              onClick={() => setHidePlateCalc(o.id === 'hide')}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="muted small" style={{ marginTop: 14 }}>Warm-up plate math — <strong>Lazy</strong> builds the bar up additively so each warm-up only adds plates (fewer changes). <strong>Granular</strong> uses even percentage jumps (40/60/80%).</p>
        <div className="seg">
          {[{ id: 'lazy', label: 'Lazy (fewer changes)' }, { id: 'granular', label: 'Granular' }].map((o) => (
            <button
              key={o.id}
              type="button"
              className={'seg-item' + ((settings.warmupStyle === 'granular' ? 'granular' : 'lazy') === o.id ? ' is-selected' : '')}
              aria-pressed={(settings.warmupStyle === 'granular' ? 'granular' : 'lazy') === o.id}
              onClick={() => setWarmupStyle(o.id)}
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
              aria-pressed={(settings.restTimer === false ? 'off' : 'on') === o.id}
              onClick={() => setRestTimer(o.id === 'on')}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="muted small" style={{ marginTop: 14 }}>Superset rest timers — run several rest timers at once (one per exercise) as a compact merged pill, handy when you alternate supersetted lifts. Off keeps the single full-size timer.</p>
        <div className="seg">
          {[{ id: 'on', label: 'On' }, { id: 'off', label: 'Off' }].map((o) => (
            <button
              key={o.id}
              type="button"
              className={'seg-item' + ((settings.supersetTimers === true ? 'on' : 'off') === o.id ? ' is-selected' : '')}
              aria-pressed={(settings.supersetTimers === true ? 'on' : 'off') === o.id}
              onClick={() => setSupersetTimers(o.id === 'on')}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="muted small" style={{ marginTop: 14 }}>Stretching routine — suggest a dynamic warm-up before and static stretches after, based on the muscles the session works. Shows as a collapsed panel.</p>
        <div className="seg">
          {[{ id: 'on', label: 'On' }, { id: 'off', label: 'Off' }].map((o) => (
            <button
              key={o.id}
              type="button"
              className={'seg-item' + ((settings.stretching === true ? 'on' : 'off') === o.id ? ' is-selected' : '')}
              aria-pressed={(settings.stretching === true ? 'on' : 'off') === o.id}
              onClick={() => setStretching(o.id === 'on')}
            >
              {o.label}
            </button>
          ))}
        </div>

        {notificationsSupported() && (
          <>
            <p className="muted small" style={{ marginTop: 14 }}>
              Rest-over notification — buzz you with a notification when the rest timer hits zero, so
              you can put your phone away between sets.
            </p>
            <div className="seg">
              {[{ id: 'on', label: 'On' }, { id: 'off', label: 'Off' }].map((o) => (
                <button
                  key={o.id}
                  type="button"
                  disabled={notifyBusy}
                  className={'seg-item' + ((settings.restNotify === true && notificationPermission() === 'granted' ? 'on' : 'off') === o.id ? ' is-selected' : '')}
                  aria-pressed={(settings.restNotify === true && notificationPermission() === 'granted' ? 'on' : 'off') === o.id}
                  onClick={() => setRestNotify(o.id === 'on')}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {settings.restNotify === true && notificationPermission() !== 'granted' && (
              <p className="muted small">Notifications are blocked in your browser — turn them on for this site to use this.</p>
            )}
            {isIOS() && (
              <>
                <p className="muted small">On iPhone/iPad this works best with the app installed to your home screen, and the system may still delay a notification while other apps are open.</p>
                {/* navigator.vibrate doesn't exist on iOS Safari/PWA at all, unlike Android —
                    call that out here so a silent phone doesn't read as "the timer is broken". */}
                <p className="muted small">On iPhone, background alerts aren&apos;t guaranteed — keep the screen on to hear the chime (iOS doesn&apos;t support vibration for web apps).</p>
              </>
            )}
          </>
        )}
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
              aria-pressed={settings.units === u}
              onClick={() => setUnits(u)}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* ---- Bodyweight ---- */}
      <BodyweightCard />

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
        <button type="button" className="btn btn-primary" onClick={copyCode}>Copy my backup code</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={generateCode}>Show code</button>
        {myCode && (
          <textarea className="text-input code-box" rows={4} readOnly value={myCode} onFocus={(e) => e.target.select()} />
        )}

        <p className="group-label" style={{ marginTop: 14 }}>Import a code</p>
        <textarea
          className="text-input code-box"
          rows={4}
          aria-label="Backup code to import"
          placeholder="Paste a backup code here…"
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
        />
        <button type="button" className="btn btn-ghost" onClick={runImport} disabled={!importText.trim()}>
          Import &amp; replace my data
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

      {confirmModal && (
        <ConfirmModal {...confirmModal} onCancel={() => setConfirmModal(null)} />
      )}
    </section>
  )
}
