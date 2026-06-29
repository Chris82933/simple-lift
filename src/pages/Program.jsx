import { Link, useNavigate } from 'react-router-dom'
import { loadProgram } from '../lib/storage.js'
import { repsLabel } from '../data/schemes.js'
import ExerciseFigure from '../components/ExerciseFigure.jsx'

const GOAL_LABEL = {
  general: 'General', strength: 'Strength', size: 'Size',
  endurance: 'Endurance', climbing: 'Climbing', running: 'Running',
}

export default function Program() {
  const navigate = useNavigate()
  const program = loadProgram()

  if (!program) {
    return (
      <section className="page">
        <header className="page-header"><h1>Your program</h1></header>
        <div className="card placeholder-card">
          <p className="placeholder-title">Nothing here yet</p>
          <p className="muted">Build a program and your weekly split will show up here.</p>
          <Link className="btn btn-primary" to="/onboarding">Build my program</Link>
        </div>
      </section>
    )
  }

  const { meta } = program

  return (
    <section className="page">
      <header className="page-header">
        <h1>Your program</h1>
        <p className="muted">
          {meta.daysPerWeek} days/week · ~{meta.sessionLength} min ·{' '}
          {meta.goals.map((g) => GOAL_LABEL[g] || g).join(', ')}
        </p>
      </header>

      {program.days.map((day, i) => (
        <div className="card day-card" key={day.title}>
          <div className="day-head">
            <div>
              <p className="eyebrow">{day.dayLabel}</p>
              <p className="day-title">{day.title}</p>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/workout', { state: { dayIndex: i } })}
            >
              Start
            </button>
          </div>
          <p className="muted small balance-note">⚖️ {day.note}</p>
          <ul className="exercise-preview">
            {day.exercises.map((ex) => (
              <li key={ex.id}>
                <ExerciseFigure pattern={ex.pattern} size={40} />
                <span className="ex-name">{ex.name}</span>
                <span className="muted small">{ex.sets} × {repsLabel(ex)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="card">
        <p className="muted small">Want to change focus, equipment, or goals?</p>
        <Link className="btn btn-ghost" to="/onboarding">Rebuild program</Link>
      </div>
    </section>
  )
}
