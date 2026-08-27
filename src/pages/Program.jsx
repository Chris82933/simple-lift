import { Link, useNavigate } from 'react-router-dom'
import { loadActiveProgram, loadPrograms } from '../lib/storage.js'
import { repsLabel } from '../data/schemes.js'
import { measureUnit } from '../data/exercises.js'
import MuscleMap from '../components/MuscleMap.jsx'
import { plannedMuscleHeat } from '../lib/muscleHeat.js'
import FormCheckButton from '../components/FormCheckButton.jsx'
import ShareProgram from '../components/ShareProgram.jsx'

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
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/schedule')}>Schedule</button>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/import-program')}>Import</button>
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
          {day.note && <p className="muted small balance-note">{day.note}</p>}
          {day.exercises.length > 0 && (
            <div className="day-muscles">
              <MuscleMap heat={plannedMuscleHeat(day.exercises)} size={50} />
              <span className="muted small">Muscles this session · darker = more sets</span>
            </div>
          )}
          <ul className="exercise-preview">
            {day.exercises.map((ex, j) => (
              <li key={j}>
                <MuscleMap pattern={ex.pattern} exId={ex.id} size={34} />
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
            Adjust GZCLP setup
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

      <ShareProgram program={program} />
    </section>
  )
}
