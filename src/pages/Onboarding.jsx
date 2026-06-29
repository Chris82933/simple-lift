import { Link } from 'react-router-dom'

export default function Onboarding() {
  return (
    <section className="page full-flow">
      <header className="page-header">
        <p className="eyebrow">Step 1 of 5</p>
        <h1>What do you want to focus on?</h1>
        <p className="muted">Pick the areas you care about most. We&apos;ll balance the rest.</p>
      </header>

      <div className="region-grid">
        {['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core'].map((r) => (
          <button key={r} type="button" className="region-tile">{r}</button>
        ))}
      </div>

      <div className="flow-actions">
        <Link className="btn btn-ghost" to="/today">Cancel</Link>
        <button type="button" className="btn btn-primary" disabled>Next</button>
      </div>
    </section>
  )
}
