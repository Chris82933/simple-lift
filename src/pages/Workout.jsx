import { Link } from 'react-router-dom'

export default function Workout() {
  return (
    <section className="page full-flow">
      <header className="page-header">
        <p className="eyebrow">Workout mode</p>
        <h1>Live session</h1>
        <p className="muted">
          During a workout you&apos;ll tick off sets, log weight &amp; reps, and run rest timers here.
        </p>
      </header>

      <div className="card placeholder-card">
        <p className="placeholder-title">Set tracking preview</p>
        <div className="set-row">
          <span>Set 1</span><span className="muted">— × — reps</span>
          <button type="button" className="set-check" aria-label="Complete set" disabled>✓</button>
        </div>
        <div className="set-row">
          <span>Set 2</span><span className="muted">— × — reps</span>
          <button type="button" className="set-check" aria-label="Complete set" disabled>✓</button>
        </div>
      </div>

      <div className="flow-actions">
        <Link className="btn btn-ghost" to="/today">Exit</Link>
      </div>
    </section>
  )
}
