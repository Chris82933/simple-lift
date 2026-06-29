import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addCardio, loadCardio, deleteCardio, loadSettings } from '../lib/storage.js'
import { CARDIO_BY_ID } from '../data/cardio.js'
import CardioForm from '../components/CardioForm.jsx'

export default function CardioLog() {
  const navigate = useNavigate()
  const units = loadSettings().units || 'lbs'
  const [, force] = useState(0)
  const log = loadCardio()

  const onSaved = (entry) => { addCardio(entry); force((n) => n + 1) }
  const remove = (id) => { deleteCardio(id); force((n) => n + 1) }

  return (
    <section className="page full-flow">
      <header className="page-header">
        <p className="eyebrow">Cardio</p>
        <h1>Log cardio</h1>
        <p className="muted">Treadmill, bike, rower, stairs and more — track time, distance, heart rate and calories.</p>
      </header>

      <div className="step-body">
        <div className="card">
          <CardioForm onSaved={onSaved} units={units} />
        </div>

        {log.length > 0 && (
          <div className="card">
            <p className="group-label">Recent cardio</p>
            {log.slice(0, 12).map((c) => {
              const m = CARDIO_BY_ID[c.machine]
              return (
                <div className="cardio-entry" key={c.id}>
                  <span className="cardio-icon" style={{ background: `color-mix(in srgb, ${m?.color || '#888'} 22%, var(--surface))` }}>{m?.icon || '❤️'}</span>
                  <div className="cardio-info">
                    <span className="ex-name">{c.machineName}</span>
                    <span className="muted small">
                      {c.durationMin} min
                      {c.distance ? ` · ${c.distance} ${c.distanceUnit}` : ''}
                      {c.avgHr ? ` · ${c.avgHr} bpm` : ''}
                      {c.calories ? ` · ${c.calories} cal` : ''}
                    </span>
                  </div>
                  <span className="muted small cardio-date">{new Date(c.date).toLocaleDateString()}</span>
                  <button type="button" className="icon-btn" onClick={() => remove(c.id)} aria-label="Delete entry">✕</button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="flow-actions">
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Back</button>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/progress')}>View charts</button>
      </div>
    </section>
  )
}
