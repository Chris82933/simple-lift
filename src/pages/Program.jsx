import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  loadActiveProgram, loadPrograms, getProgram, getActiveProgramId, setActiveProgramId,
} from '../lib/storage.js'
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
  const location = useLocation()
  const [, force] = useState(0)
  // Optional program id in router state (set by Programs.jsx's "View days" on a
  // non-active program) lets you glance at a program without switching to it.
  // Falls back to the active program when absent.
  const viewId = location.state?.id
  const program = viewId ? (getProgram(viewId) || loadActiveProgram()) : loadActiveProgram()
  const isActiveView = !!program && program.id === getActiveProgramId()
  const programCount = loadPrograms().length

  const activate = () => { setActiveProgramId(program.id); force((n) => n + 1) }

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
        <p className="eyebrow">{isActiveView ? 'Active program' : 'Viewing'}</p>
        <h1>{program.name}</h1>
        <p className="muted">
          {program.days.length} days/week
          {goals.length ? ' · ' + goals.map((g) => GOAL_LABEL[g] || g).join(', ') : ''}
        </p>
      </header>

      {!isActiveView && (
        <div className="card notice">
          <p className="muted small">
            This isn&apos;t your active program — it&apos;s here for reference only, so days won&apos;t start from this screen.
          </p>
          <button type="button" className="btn btn-primary btn-sm" onClick={activate}>Make this active</button>
        </div>
      )}

      <div className="card switch-row">
        <Link className="btn btn-ghost btn-sm" to="/programs">
          Switch / manage{programCount > 1 ? ` (${programCount})` : ''}
        </Link>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/schedule', { state: { id: program.id } })}>Schedule</button>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/import-program')}>Import</button>
      </div>

      {program.days.map((day, i) => (
        <div className="card day-card" key={i}>
          <div className="day-head">
            <div>
              <p className="eyebrow">{day.dayLabel}</p>
              <p className="day-title">{day.title}</p>
            </div>
            {isActiveView && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => navigate('/workout', { state: { dayIndex: i } })}
              >
                Start
              </button>
            )}
          </div>
          {day.note && <p className="muted small balance-note">{day.note}</p>}
          {day.exercises.length > 0 && (
            <div className="day-muscles">
              <MuscleMap heat={plannedMuscleHeat(day.exercises)} size={180} labels />
              <span className="muted small">Muscles this session · darker = more sets</span>
            </div>
          )}
          <ul className="exercise-preview">
            {day.exercises.map((ex, j) => (
              <li key={j}>
                <MuscleMap pattern={ex.pattern} exId={ex.id} size={46} compact />
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

      {/* Builder can open any program regardless of source — it used to be gated to
          source === 'custom', which locked out everyone who used the guided
          onboarding or a template (the app's own recommended paths) from ever
          changing a single exercise. Saving in Builder stamps source: 'custom',
          so editing here naturally converts a template/generated program into
          your own copy — call that out for anyone coming from a non-custom source. */}
      <div className="card">
        {program.source !== 'custom' && (
          <p className="muted small">Editing makes this your own copy.</p>
        )}
        <button className="btn btn-ghost" onClick={() => navigate('/builder', { state: { id: program.id } })}>
          Edit this program
        </button>
      </div>

      <ShareProgram program={program} />
    </section>
  )
}
