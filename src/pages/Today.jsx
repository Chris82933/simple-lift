import { Link } from 'react-router-dom'
import { loadProfile } from '../lib/storage.js'
import { REGIONS, GOALS } from '../data/options.js'

const labelsFor = (ids, source) =>
  ids.map((id) => source.find((x) => x.id === id)?.label).filter(Boolean)

export default function Today() {
  const profile = loadProfile()

  if (!profile) {
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

  const focus = labelsFor(profile.focusAreas, REGIONS)
  const goals = labelsFor(profile.goals, GOALS)

  return (
    <section className="page">
      <header className="page-header">
        <p className="eyebrow">Your plan</p>
        <h1>Today&apos;s session</h1>
      </header>

      <div className="card">
        <p className="placeholder-title">Program created ✅</p>
        <p className="muted">
          {profile.daysPerWeek} days/week · ~{profile.sessionLength} min sessions
        </p>
        <div>
          <p className="group-label">Focus</p>
          <div className="check-grid">
            {focus.map((f) => <span key={f} className="check-pill is-selected">{f}</span>)}
          </div>
        </div>
        <div>
          <p className="group-label">Goals</p>
          <div className="check-grid">
            {goals.map((g) => <span key={g} className="check-pill is-selected">{g}</span>)}
          </div>
        </div>
        <Link className="btn btn-ghost" to="/workout">Preview workout mode</Link>
      </div>

      <div className="card">
        <p className="muted small">
          Next up: Simple Lift will turn these choices into a real day-by-day program with
          exercises, sets, and reps.
        </p>
        <Link className="btn btn-ghost" to="/onboarding">Redo setup</Link>
      </div>
    </section>
  )
}
