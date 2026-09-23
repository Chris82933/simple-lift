import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loadPrograms, getActiveProgramId, loadHistory, loadSettings, saveSettings, loadActiveSession } from '../lib/storage.js'
import { isIOS } from '../lib/platform.js'
import { useAuth } from '../context/AuthContext.jsx'
import { getEquipment, setActiveProfile, isDoable, profileMeta, PROFILE_IDS, resolveExercisesForEquipment, activeCapacity } from '../lib/equipment.js'
import { repsLabel } from '../data/schemes.js'
import { measureUnit } from '../data/exercises.js'
import { CARDIO_BY_ID } from '../data/cardio.js'
import { pickSession, trainingWeekdays, restWarnings, WEEKDAY_SHORT, WEEKDAY_LABELS } from '../lib/schedule.js'
import { sessionsThisWeek, trainingStreakWeeks } from '../lib/consistency.js'
import { sessionMuscleHeat, describeHeat } from '../lib/muscleHeat.js'
import MuscleMap from '../components/MuscleMap.jsx'
import FormCheckButton from '../components/FormCheckButton.jsx'
import FocusTiles from '../components/FocusTiles.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import Icon from '../components/Icon.jsx'

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
  // R2: seed once per mount instead of re-parsing all of localStorage on
  // every render (nothing in this page mutates history itself, so a stable
  // load is safe — the second loadHistory() call below was pure duplication).
  const history = useMemo(() => loadHistory(), [])
  // "Did I actually train legs this week?" — built from real logged sets in
  // the last 7 days (not the schedule), reusing the same heat map the
  // end-of-workout screen shows. Hook lives above every early return below,
  // and stays cheap/empty ({}) rather than skipped so the hook order never
  // changes between renders.
  const weekHeat = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const recentEntries = history
      .filter((w) => new Date(w.date).getTime() >= weekAgo)
      .flatMap((w) => w.entries || [])
    return sessionMuscleHeat(recentEntries)
  }, [history])

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
      <section className="page full-flow">
        <header className="page-header">
          <p className="eyebrow">Welcome</p>
          <h1>Set up your training</h1>
        </header>
        <div className="card welcome-hero">
          <MuscleMap pattern="squat" size={128} />
          <p className="muted">
            Simple Lift builds you a plan, tracks every set, and shows a clear demo for each
            move. Choose how you&apos;d like to start:
          </p>
        </div>
        <div className="welcome-choices">
          {/* Guided setup leads, matching the "Recommended" steer this same
              choice gets one screen later in Onboarding.jsx — a nervous
              first-timer should be pointed somewhere, not handed a list of
              10+ unfamiliar program names first (see fix #3). */}
          <button
            type="button"
            className="card choice-card"
            style={{ borderColor: 'var(--accent)' }}
            onClick={() => navigate('/onboarding', { state: { guided: true } })}
          >
            <span className="choice-title">
              Answer a few questions <span className="rec-badge">Recommended</span>
            </span>
            <span className="muted small">We&apos;ll tailor a program to your goals, equipment, and schedule.</span>
          </button>
          <button type="button" className="card choice-card" onClick={() => navigate('/templates')}>
            <span className="choice-title">Browse templates</span>
            <span className="muted small">Proven programs — GZCLP, bodyweight, and more. Best if you already know what you want.</span>
          </button>
          <button type="button" className="card choice-card" onClick={() => navigate('/builder')}>
            <span className="choice-title">Build your own</span>
            <span className="muted small">Design a custom program, exercise by exercise.</span>
          </button>
        </div>
        <ThemeToggle label="Prefer light or dark?" />
      </section>
    )
  }

  const todayWeekday = new Date().getDay()
  const pick = pickSession(program, todayWeekday)
  // C1: a rotation program with an empty `days` array makes pickSession return
  // null (no valid index at all) — fall back to an empty state below rather
  // than reading .index/.session off null or indexing program.days[...] with
  // an out-of-range value.
  if (!pick || !program.days.length) {
    return (
      <section className="page">
        <header className="page-header">
          <p className="eyebrow">Today</p>
          <h1>No sessions in this program</h1>
        </header>
        <div className="card placeholder-card">
          <p className="placeholder-title">Nothing to train yet</p>
          <p className="muted">This program doesn&apos;t have any days set up. Add one, or switch to a different program.</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/builder', { state: { id: program.id } })}>Edit program</button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/programs')}>Switch program</button>
        </div>
      </section>
    )
  }
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
          <p className="placeholder-title">Back up your data</p>
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

      {(() => {
        // R2: reuse the history already loaded once per mount above instead
        // of re-parsing all of localStorage again here.
        if (!history.length) return null
        const thisWeek = sessionsThisWeek(history)
        const streak = trainingStreakWeeks(history)
        return (
          <Link className="card consistency-card" to="/progress">
            <span className="consistency-stat"><strong>{thisWeek}</strong> workout{thisWeek === 1 ? '' : 's'} this week</span>
            {streak > 1 && <span className="consistency-stat"><strong>{streak}</strong>-week streak</span>}
            <span className="consistency-link">Progress <span aria-hidden="true">→</span></span>
          </Link>
        )
      })()}

      {program.days.length > 1 && (
        <div className="day-picker" role="group" aria-label="Choose a day">
          {program.days.map((d, i) => {
            // A day with nothing programmed yet used to render as a bare,
            // selectable chip over a blank exercise list with no explanation
            // — label it instead of leaving it silently empty (see fix #8).
            const isEmpty = !(d.exercises?.length) && !(d.cardio?.length)
            return (
              <button
                key={i}
                type="button"
                className={'chip day-chip-btn' + (i === dayIndex ? ' is-selected' : '')}
                aria-pressed={i === dayIndex}
                onClick={() => setSelectedDay(i)}
              >
                {d.title}{isEmpty ? ' · Rest / no exercises set' : ''}
                {i === pick.index && pick.isToday && <span className="day-dot" aria-hidden="true" />}
              </button>
            )
          })}
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
                aria-pressed={activeProfile === id}
                onClick={() => switchProfile(id)}
              >
                <span aria-hidden="true">{profileMeta(id).icon}</span> {profileMeta(id).name}
              </button>
            ))}
          </div>
        </div>
        {session.note && <p className="muted small">{session.note}</p>}
        <ul className="exercise-preview">
          {previewExercises.map((ex, j) => (
            <li key={j}>
              <MuscleMap pattern={ex.pattern} exId={ex.id} size={46} compact />
              <span className="ex-name">
                {ex.name}
                {ex.swappedFrom && <span className="muted small swapped-note"> · swapped for your gear</span>}
              </span>
              <FormCheckButton name={ex.name} compact />
              <span className="muted small">{ex.sets} × {repsLabel(ex)}{ex.amrap ? '+' : ''} {measureUnit(ex)}</span>
            </li>
          ))}
          {(session.cardio || []).map((c, j) => {
            const target = [
              Number(c.targetMin) > 0 ? `${c.targetMin} min` : '',
              Number(c.targetDistance) > 0 ? `${c.targetDistance} ${c.distanceUnit || ''}`.trim() : '',
            ].filter(Boolean).join(' · ')
            return (
              <li key={`c${j}`}>
                <span className="cardio-preview-icon"><Icon name="cardio" size={20} /></span>
                <span className="ex-name">{c.machineName || CARDIO_BY_ID[c.machine]?.name || 'Cardio'}</span>
                <span className="muted small">{target || 'cardio'}</span>
              </li>
            )
          })}
        </ul>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate('/workout', { state: { dayIndex } })}
        >
          {resumingThisDay ? 'Continue workout' : isScheduledToday ? 'Start workout' : `Start ${session.title} now`}
        </button>
        {resumingThisDay && (
          <p className="muted small"><Icon name="play" size={12} /> Picking up where you left off · {timeAgo(inProgress.savedAt)}</p>
        )}
        {inProgress && !resumingThisDay && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/workout', { state: { dayIndex: inProgress.dayIndex } })}
          >
            <Icon name="play" size={13} /> Continue {inProgress.sessionTitle} (in progress · {timeAgo(inProgress.savedAt)})
          </button>
        )}
        {needSwap > 0 && (
          <p className="muted small">
            <span aria-hidden="true">🏠</span> {needSwap} move{needSwap === 1 ? '' : 's'} need a swap in {profileMeta(activeProfile).name} mode — you can swap them one-tap during the workout.
          </p>
        )}
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/cardio')}>Log cardio</button>
      </div>

      {/* U7: Recovery, the Skill Tree, and the 1RM finder otherwise live only
          inside the Plans hub's Extras/Tools sections and a Settings link, so
          anyone who never digs in there never finds them. A compact row here
          surfaces them from the main screen without competing with the
          primary "start workout" action above. Inline style: index.css is
          off-limits for this change; reuses .card/.group-label/.btn classes
          for everything but the row layout itself. */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p className="group-label" style={{ margin: 0 }}>Tools</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/recovery')}>Recovery &amp; Strength</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/skills')}>Skill Tree</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/one-rep-max')}>1RM finder</button>
        </div>
      </div>

      {Object.keys(weekHeat).length > 0 && (
        // Feature #9: nothing else on Today answers "did I actually train
        // legs this week?" — a beginner three months in asked exactly that.
        // Built from real history, not the schedule; simply absent (no
        // placeholder) when there's nothing logged in the last 7 days.
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <MuscleMap heat={weekHeat} size={84} />
          <div>
            <p className="group-label" style={{ margin: 0 }}>Trained this week</p>
            <p className="muted small">{describeHeat(weekHeat)}</p>
          </div>
        </div>
      )}

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
        {warning && <p className="muted small rest-note">{warning}</p>}
        {lastWorkout && (
          <p className="muted small">
            Last workout: {lastWorkout.sessionTitle} · {new Date(lastWorkout.date).toLocaleDateString()}
          </p>
        )}
      </div>
    </section>
  )
}
