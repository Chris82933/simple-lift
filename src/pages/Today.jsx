import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loadPrograms, getActiveProgramId, loadHistory, loadSettings, saveSettings, loadActiveSession } from '../lib/storage.js'
import { isIOS } from '../lib/platform.js'
import { useAuth } from '../context/AuthContext.jsx'
import { getEquipment, setActiveProfile, isDoable, profileMeta, PROFILE_IDS, resolveExercisesForEquipment, activeCapacity } from '../lib/equipment.js'
import { repsLabel } from '../data/schemes.js'
import { measureUnit } from '../data/exercises.js'
import { pickSession, trainingWeekdays, restWarnings, WEEKDAY_SHORT, WEEKDAY_LABELS } from '../lib/schedule.js'
import ExerciseFigure from '../components/ExerciseFigure.jsx'
import FormCheckButton from '../components/FormCheckButton.jsx'
import FocusTiles from '../components/FocusTiles.jsx'

// Short "how long ago" label for an in-progress session's last save.
function timeAgo(ts) {
  if (!ts) return ''
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000))
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hr ago`
  return `${Math.round(h / 24)} day${h < 48 ? '' : 's'} ago`
}

export default function Today() {
  const navigate = useNavigate()
  const auth = useAuth()
  const programs = loadPrograms()
  const history = loadHistory()

  // iOS quietly deletes local app data after ~7 days of no use. Nudge iOS users
  // with no cloud backup to save a backup — once, until they dismiss or sign in.
  const [iosDismissed, setIosDismissed] = useState(() => !!loadSettings().iosBackupDismissed)
  const showIosWarning = isIOS() && !auth?.user && !iosDismissed
  const dismissIos = () => {
    setIosDismissed(true)
    saveSettings({ ...loadSettings(), iosBackupDismissed: true })
  }
  const [activeId, setActiveId] = useState(() => getActiveProgramId())
  const [activeProfile, setActiveProfileState] = useState(() => getEquipment().active)
  // Let people pick a different day of the program to do, not just today's.
  const [selectedDay, setSelectedDay] = useState(null)
  const switchProfile = (id) => { setActiveProfile(id); setActiveProfileState(id) }
  const pickProgram = (id) => { setActiveId(id); setSelectedDay(null) }

  const program = programs.find((p) => p.id === activeId) || programs[0] || null

  if (!program) {
    return (
      <section className="page">
        <header className="page-header"><h1>Today&apos;s session</h1></header>
        <div className="card placeholder-card">
          <p className="placeholder-title">No program yet</p>
          <p className="muted">
            Build a program — pick a ready-made template, generate one from a few
            questions, or design your own.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/templates')}>Browse templates</button>
          <Link className="btn btn-ghost" to="/onboarding">Generate from a few questions</Link>
          <p className="muted small">Into bodyweight skills? The calisthenics skill tree is in Browse templates.</p>
        </div>
      </section>
    )
  }

  const todayWeekday = new Date().getDay()
  const pick = pickSession(program, todayWeekday)
  // The day being previewed: the user's chosen day, else today's scheduled one.
  const dayIndex = selectedDay != null && selectedDay < program.days.length ? selectedDay : pick.index
  const session = program.days[dayIndex]
  const isScheduledToday = pick.isToday && dayIndex === pick.index
  const trainWds = new Set(trainingWeekdays(program))
  const warning = restWarnings(trainingWeekdays(program))
  const lastWorkout = history[0]

  const availableSet = new Set(getEquipment().profiles[activeProfile])
  // Swap each move to the best version for the current gear (re-runs when the
  // training location / equipment changes).
  const gear = { capacity: activeCapacity(), units: loadSettings().units }
  const previewExercises = resolveExercisesForEquipment(session.exercises, availableSet, gear)
  const needSwap = previewExercises.filter((ex) => !isDoable(ex, availableSet, gear)).length

  // An in-progress session for this program (any logged set) → offer to continue.
  const inProgress = (() => {
    const s = loadActiveSession()
    if (!s || !program || s.programId !== program.id) return null
    const has = Object.values(s.sets || {}).some((rows) => Array.isArray(rows) && rows.some((r) => r.done))
    return has ? s : null
  })()
  const resumingThisDay = inProgress && inProgress.dayIndex === dayIndex

  return (
    <section className="page">
      <header className="page-header">
        <p className="eyebrow">{isScheduledToday ? 'Today' : selectedDay != null ? 'Chosen session' : 'Next up'}</p>
        <h1>{session.title}</h1>
      </header>

      {showIosWarning && (
        <div className="card notice ios-warning">
          <p className="placeholder-title">📲 Back up your data</p>
          <p className="muted small">
            On iPhone &amp; iPad, Safari can erase this app&apos;s saved data after about a week of not opening it — and it isn&apos;t backed up anywhere yet. Save a backup code (or sign in, once that&apos;s enabled) so your programs are one paste away from restored.
          </p>
          <div className="ios-warning-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/profile')}>Back up now</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={dismissIos}>Dismiss</button>
          </div>
        </div>
      )}

      {!pick.isToday && selectedDay == null && (
        <p className="muted" style={{ marginTop: -8 }}>
          Today&apos;s a rest day. Your next session is{' '}
          {pick.nextWeekday != null ? WEEKDAY_LABELS[pick.nextWeekday] : 'coming up'}. Pick any day below to do it now.
        </p>
      )}

      <FocusTiles current="program" onPickProgram={pickProgram} />

      {program.days.length > 1 && (
        <div className="day-picker" role="group" aria-label="Choose a day">
          {program.days.map((d, i) => (
            <button
              key={i}
              type="button"
              className={'chip day-chip-btn' + (i === dayIndex ? ' is-selected' : '')}
              onClick={() => setSelectedDay(i)}
            >
              {d.title}
              {i === pick.index && pick.isToday && <span className="day-dot" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}

      <div className="card">
        <div className="mode-row">
          <span className="muted small">Training at</span>
          <div className="seg seg-sm">
            {PROFILE_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className={'seg-item' + (activeProfile === id ? ' is-selected' : '')}
                onClick={() => switchProfile(id)}
              >
                {profileMeta(id).icon} {profileMeta(id).name}
              </button>
            ))}
          </div>
        </div>
        {session.note && <p className="muted small">{session.note}</p>}
        <ul className="exercise-preview">
          {previewExercises.map((ex, j) => (
            <li key={j}>
              <ExerciseFigure pattern={ex.pattern} exId={ex.id} size={40} />
              <span className="ex-name">
                {ex.name}
                {ex.swappedFrom && <span className="muted small swapped-note"> · swapped for your gear</span>}
              </span>
              <FormCheckButton name={ex.name} compact />
              <span className="muted small">{ex.sets} × {repsLabel(ex)}{ex.amrap ? '+' : ''} {measureUnit(ex)}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate('/workout', { state: { dayIndex } })}
        >
          {resumingThisDay ? 'Continue workout' : isScheduledToday ? 'Start workout' : `Start ${session.title} now`}
        </button>
        {resumingThisDay && (
          <p className="muted small">▶ Picking up where you left off · {timeAgo(inProgress.savedAt)}</p>
        )}
        {inProgress && !resumingThisDay && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/workout', { state: { dayIndex: inProgress.dayIndex } })}
          >
            ▶ Continue {inProgress.sessionTitle} (in progress · {timeAgo(inProgress.savedAt)})
          </button>
        )}
        {needSwap > 0 && (
          <p className="muted small">
            🏠 {needSwap} move{needSwap === 1 ? '' : 's'} need a swap in {profileMeta(activeProfile).name} mode — you can swap them one-tap during the workout.
          </p>
        )}
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/cardio')}>❤️ Log cardio</button>
      </div>

      <div className="card">
        <div className="week-head">
          <p className="group-label" style={{ margin: 0 }}>This week</p>
          <Link className="link-sm" to="/schedule">Edit days</Link>
        </div>
        <div className="week-strip">
          {WEEKDAY_SHORT.map((label, wd) => (
            <div
              key={label}
              className={
                'day-chip' +
                (trainWds.has(wd) ? ' is-training' : '') +
                (wd === todayWeekday ? ' is-today' : '')
              }
            >
              {label}
            </div>
          ))}
        </div>
        {warning && <p className="muted small rest-note">💤 {warning}</p>}
        {lastWorkout && (
          <p className="muted small">
            Last workout: {lastWorkout.sessionTitle} · {new Date(lastWorkout.date).toLocaleDateString()}
          </p>
        )}
      </div>
    </section>
  )
}
