export default function Program() {
  const week = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return (
    <section className="page">
      <header className="page-header">
        <h1>Your program</h1>
      </header>

      <div className="card placeholder-card">
        <p className="placeholder-title">Nothing scheduled</p>
        <p className="muted">
          Your weekly split will appear here, with focus areas balanced across the week.
        </p>
      </div>

      <div className="week-strip" aria-hidden="true">
        {week.map((d) => (
          <div key={d} className="day-chip">{d}</div>
        ))}
      </div>
    </section>
  )
}
