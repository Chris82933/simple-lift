import { Link } from 'react-router-dom'

export default function Today() {
  return (
    <section className="page">
      <header className="page-header">
        <p className="eyebrow">Wednesday</p>
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

      <div className="card">
        <p className="muted">When a session is scheduled, you&apos;ll start your workout here.</p>
        <Link className="btn btn-ghost" to="/workout">Preview workout mode</Link>
      </div>
    </section>
  )
}
