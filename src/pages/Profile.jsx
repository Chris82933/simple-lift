export default function Profile() {
  return (
    <section className="page">
      <header className="page-header">
        <h1>Profile</h1>
      </header>

      <div className="card">
        <p className="placeholder-title">Settings</p>
        <ul className="settings-list">
          <li><span>Units</span><span className="muted">lbs / kg</span></li>
          <li><span>Equipment</span><span className="muted">Not set</span></li>
          <li><span>Goals</span><span className="muted">Not set</span></li>
        </ul>
        <p className="muted small">
          Your data is saved on this device. Account sync comes later.
        </p>
      </div>
    </section>
  )
}
