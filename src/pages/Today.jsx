import { Link, useNavigate } from 'react-router-dom'
import { loadProgram, loadHistory } from '../lib/storage.js'
import { repsLabel } from '../data/schemes.js'
import ExerciseFigure from '../components/ExerciseFigure.jsx'

const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Index of the next session to do, starting from today.
function pickSession(days, todayWeekday) {
  const todayIdx = days.findIndex((d) => d.weekday === todayWeekday)
  if (todayIdx !== -1) return { index: todayIdx, isToday: true }
  // nearest upcoming training day
  let best = null
  days.forEach((d, i) => {
    const ahead = (d.weekday - todayWeekday + 7) % 7
    if (best === null || ahead < best.ahead) best = { index: i, ahead }
  })
  return best ? { index: best.index, isToday: false } : null
}

export default function Today() {
  const navigate = useNavigate()
  const program = loadProgram()
  const history = loadHistory()

  if (!program) {
    return (
      <section className="page">
        <header className="page-header">
          <h1>Today&apos;s session</h1>
        </header>
        <div className="card placeholder-card">
          <p className="placeholder-title">No program yet</p>
          <p className="muted">
            Answer a few quick questions and Simple Lift will build a compound-lift
            program around your goals, equipment, and schedule.
          </p>
          <Link className="btn btn-primary" to="/onboarding">Build my program</Link>
        </div>
      </section>
    )
  }

  const todayWeekday = new Date().getDay()
  const pick = pickSession(program.days, todayWeekday)
  const session = program.days[pick.index]
  const trainingWeekdays = new Set(program.days.map((d) => d.weekday))
  const lastWorkout = history[0]

  return (
    <section className="page">
      <header className="page-header">
        <p className="eyebrow">{pick.isToday ? 'Today' : 'Next up'}</p>
        <h1>{session.title}</h1>
      </header>

      {!pick.isToday && (
        <p className="muted" style={{ marginTop: -8 }}>
          Today&apos;s a rest day. Your next session is {session.dayLabel}.
        </p>
      )}

      <div className="card">
        <p className="muted small">{session.note}</p>
        <ul className="exercise-preview">
          {session.exercises.map((ex) => (
            <li key={ex.id}>
              <ExerciseFigure pattern={ex.pattern} size={40} />
              <span className="ex-name">{ex.name}</span>
              <span className="muted small">{ex.sets} × {repsLabel(ex)}</span>
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
      </div>

      <div className="card">
        <p className="group-label">This week</p>
        <div className="week-strip">
          {WEEK.map((label, wd) => (
            <div
              key={label}
              className={
                'day-chip' +
                (trainingWeekdays.has(wd) ? ' is-training' : '') +
                (wd === todayWeekday ? ' is-today' : '')
              }
            >
              {label}
            </div>
          ))}
        </div>
        {lastWorkout && (
          <p className="muted small">
            Last workout: {lastWorkout.sessionTitle} · {new Date(lastWorkout.date).toLocaleDateString()}
          </p>
        )}
      </div>
    </section>
  )
}
