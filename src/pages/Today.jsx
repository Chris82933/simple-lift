import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loadActiveProgram, loadHistory } from '../lib/storage.js'
import { getEquipment, setActiveProfile, isDoable, profileMeta, PROFILE_IDS } from '../lib/equipment.js'
import { repsLabel } from '../data/schemes.js'
import { pickSession, trainingWeekdays, restWarnings, WEEKDAY_SHORT, WEEKDAY_LABELS } from '../lib/schedule.js'
import ExerciseFigure from '../components/ExerciseFigure.jsx'
import FormCheckButton from '../components/FormCheckButton.jsx'

export default function Today() {
  const navigate = useNavigate()
  const program = loadActiveProgram()
  const history = loadHistory()
  const [activeProfile, setActiveProfileState] = useState(() => getEquipment().active)
  const switchProfile = (id) => { setActiveProfile(id); setActiveProfileState(id) }

  if (!program) {
    return (
      <section className="page">
        <header className="page-header">
          <h1>Today&apos;s session</h1>
        </header>
        <div className="card placeholder-card">
          <p className="placeholder-title">No program yet</p>
          <p className="muted">
            Build a program — pick a ready-made template, generate one from a few
            questions, or design your own.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/templates')}>Browse templates</button>
          <Link className="btn btn-ghost" to="/onboarding">Generate from a few questions</Link>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/skills')}>🤸 Or work on calisthenics skills</button>
        </div>
      </section>
    )
  }

  const todayWeekday = new Date().getDay()
  const pick = pickSession(program, todayWeekday)
  const session = pick.session
  const trainWds = new Set(trainingWeekdays(program))
  const warning = restWarnings(trainingWeekdays(program))
  const lastWorkout = history[0]

  const availableSet = new Set(getEquipment().profiles[activeProfile])
  const needSwap = session.exercises.filter((ex) => !isDoable(ex, availableSet)).length

  return (
    <section className="page">
      <header className="page-header">
        <p className="eyebrow">{pick.isToday ? 'Today' : 'Next up'}</p>
        <h1>{session.title}</h1>
      </header>

      {!pick.isToday && (
        <p className="muted" style={{ marginTop: -8 }}>
          Today&apos;s a rest day. Your next session is{' '}
          {pick.nextWeekday != null ? WEEKDAY_LABELS[pick.nextWeekday] : 'coming up'}.
        </p>
      )}

      <div className="day-choice">
        <span className="muted small">Today I&apos;m doing</span>
        <div className="seg seg-sm">
          <button type="button" className="seg-item is-selected">🏋️ My program</button>
          <button type="button" className="seg-item" onClick={() => navigate('/skills')}>🤸 Skills</button>
        </div>
      </div>

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
          {session.exercises.map((ex, j) => (
            <li key={j}>
              <ExerciseFigure pattern={ex.pattern} size={40} />
              <span className="ex-name">{ex.name}</span>
              <FormCheckButton name={ex.name} compact />
              <span className="muted small">{ex.sets} × {repsLabel(ex)}{ex.amrap ? '+' : ''}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate('/workout', { state: { dayIndex: pick.index } })}
        >
          {pick.isToday ? 'Start workout' : `Start ${session.title} now`}
        </button>
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
