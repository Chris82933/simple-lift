import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  loadPrograms, getActiveProgramId, setActiveProgramId, loadHistory, loadSettings, saveSettings, loadSkills,
} from '../lib/storage.js'
import { getEquipment, setActiveProfile, isDoable, profileMeta, PROFILE_IDS } from '../lib/equipment.js'
import { computeStats, powerLevel, rankFor } from '../data/skills.js'
import { repsLabel } from '../data/schemes.js'
import { pickSession, trainingWeekdays, restWarnings, WEEKDAY_SHORT, WEEKDAY_LABELS } from '../lib/schedule.js'
import ExerciseFigure from '../components/ExerciseFigure.jsx'
import SkillRadar from '../components/SkillRadar.jsx'
import FormCheckButton from '../components/FormCheckButton.jsx'

const SKILLS_FOCUS = 'skills'

export default function Today() {
  const navigate = useNavigate()
  const programs = loadPrograms()
  const history = loadHistory()

  const [mode, setMode] = useState(() => (loadSettings().activeMode === SKILLS_FOCUS ? SKILLS_FOCUS : 'program'))
  const [activeId, setActiveId] = useState(() => getActiveProgramId())
  const [activeProfile, setActiveProfileState] = useState(() => getEquipment().active)
  const switchProfile = (id) => { setActiveProfile(id); setActiveProfileState(id) }

  const program = programs.find((p) => p.id === activeId) || programs[0] || null

  // Choose today's focus: a saved program, or the calisthenics skill tree.
  const chooseFocus = (val) => {
    const s = loadSettings()
    if (val === SKILLS_FOCUS) {
      saveSettings({ ...s, activeMode: SKILLS_FOCUS })
      setMode(SKILLS_FOCUS)
    } else {
      setActiveProgramId(val)
      saveSettings({ ...s, activeMode: 'program' })
      setActiveId(val)
      setMode('program')
    }
  }

  // The focus selector — makes calisthenics feel like just another program.
  const FocusPicker = () => (
    <div className="day-choice">
      <span className="muted small">Today&apos;s focus</span>
      <select
        className="text-input select"
        value={mode === SKILLS_FOCUS ? SKILLS_FOCUS : (program?.id || '')}
        onChange={(e) => chooseFocus(e.target.value)}
      >
        {programs.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
        <option value={SKILLS_FOCUS}>🤸 Calisthenics</option>
      </select>
    </div>
  )

  // ---- Calisthenics focus ----
  if (mode === SKILLS_FOCUS) {
    const skills = loadSkills()
    const started = Object.keys(skills).length > 0
    const stats = computeStats(skills)
    const baseline = computeStats(skills, 'baseline')
    const power = powerLevel(stats)
    return (
      <section className="page">
        <header className="page-header">
          <p className="eyebrow">Today</p>
          <h1>Calisthenics</h1>
        </header>
        {programs.length > 0 && <FocusPicker />}
        <div className="card char-sheet">
          <SkillRadar stats={stats} baseline={baseline} />
          <div className="char-meta">
            <p className="power-level">{power}</p>
            <p className="power-label">Power level · {rankFor(power)}</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/skills')}>
            {started ? 'Open skill tree' : '🎯 Find my levels'}
          </button>
          {!started && <p className="muted small">Calibrate once and we&apos;ll set every skill to the right starting level.</p>}
        </div>
      </section>
    )
  }

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
          <button type="button" className="btn btn-ghost" onClick={() => chooseFocus(SKILLS_FOCUS)}>🤸 Or work on calisthenics skills</button>
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

      <FocusPicker />

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
