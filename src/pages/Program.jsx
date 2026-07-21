import { Link, useNavigate } from 'react-router-dom'
import { loadActiveProgram, loadPrograms } from '../lib/storage.js'
import { repsLabel } from '../data/schemes.js'
import { measureUnit } from '../data/exercises.js'
import ExerciseFigure from '../components/ExerciseFigure.jsx'
import FormCheckButton from '../components/FormCheckButton.jsx'

const GOAL_LABEL = {
  general: 'General', strength: 'Strength', size: 'Size',
  endurance: 'Endurance', climbing: 'Climbing', running: 'Running',
}

export default function Program() {
  const navigate = useNavigate()
  const program = loadActiveProgram()
  const programCount = loadPrograms().length

  if (!program) {
    return (
      <section className="page">
        <header className="page-header"><h1>Your program</h1></header>
        <div className="card placeholder-card">
          <p className="placeholder-title">Nothing here yet</p>
          <p className="muted">Build a program and your weekly split will show up here.</p>
          <button className="btn btn-primary" onClick={() => navigate('/templates')}>Browse templates</button>
          <button className="btn btn-ghost" onClick={() => navigate('/builder')}>Build custom program</button>
          <Link className="btn btn-ghost" to="/onboarding">Generate from a few questions</Link>
        </div>
      </section>
    )
  }

  const goals = program.goals || program.meta?.goals || []

  return (
    <section className="page">
      <header className="page-header">
        <p className="eyebrow">Active program</p>
        <h1>{program.name}</h1>
        <p className="muted">
          {program.days.length} days/week
          {goals.length ? ' · ' + goals.map((g) => GOAL_LABEL[g] || g).join(', ') : ''}
        </p>
      </header>

      <div className="card switch-row">
        <Link className="btn btn-ghost btn-sm" to="/programs">
          Switch / manage{programCount > 1 ? ` (${programCount})` : ''}
        </Link>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/schedule')}>📅 Schedule</button>
      </div>

      {program.days.map((day, i) => (
        <div className="card day-card" key={i}>
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
          {day.note && <p className="muted small balance-note">⚖️ {day.note}</p>}
          <ul className="exercise-preview">
            {day.exercises.map((ex, j) => (
              <li key={j}>
                <ExerciseFigure pattern={ex.pattern} size={40} />
                <span className="ex-name">{ex.name}</span>
                <FormCheckButton name={ex.name} compact />
                <span className="muted small">{ex.sets} × {repsLabel(ex)}{ex.amrap ? '+' : ''} {measureUnit(ex)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {program.source === 'gzclp-wizard' && (
        <div className="card">
          <p className="group-label">GZCLP setup</p>
          <p className="muted small">
            Retested a max, changed gyms, or want different accessories? Re-run the setup and the
            starting weights are recalculated for you.
          </p>
          <button
            className="btn btn-ghost"
            onClick={() => navigate('/gzclp', { state: { programId: program.id } })}
          >
            ⚙️ Adjust GZCLP setup
          </button>
        </div>
      )}

      {program.source === 'custom' && (
        <div className="card">
          <button className="btn btn-ghost" onClick={() => navigate('/builder', { state: { id: program.id } })}>
            Edit this program
          </button>
        </div>
      )}
    </section>
  )
}
