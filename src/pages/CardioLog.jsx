import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addCardio, loadCardio, deleteCardio, insertCardioAt, loadSettings } from '../lib/storage.js'
import { CARDIO_BY_ID } from '../data/cardio.js'
import CardioForm from '../components/CardioForm.jsx'
import Icon from '../components/Icon.jsx'
import { useToast } from '../components/Toast.jsx'

export default function CardioLog() {
  const navigate = useNavigate()
  const toast = useToast()
  const units = loadSettings().units || 'lbs'
  const [, force] = useState(0)
  const log = loadCardio()

  const onSaved = (entry) => { addCardio(entry); force((n) => n + 1) }
  // Delete immediately, offer Undo via toast (mirrors Progress.jsx) — deleting
  // was instant and unrecoverable before, so a mis-tap forced re-entering the
  // whole entry from memory.
  const remove = (id) => {
    const idx = log.findIndex((c) => c.id === id)
    const entry = log[idx]
    deleteCardio(id)
    force((n) => n + 1)
    if (!entry) return
    toast.show('Cardio entry deleted', {
      actionLabel: 'Undo',
      onAction: () => { insertCardioAt(entry, idx); force((n) => n + 1) },
    })
  }

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
                  <span className="cardio-icon" style={{ background: `color-mix(in srgb, ${m?.color || '#888'} 22%, var(--surface))` }}><Icon name="cardio" size={18} /></span>
                  <div className="cardio-info">
                    <span className="ex-name">{c.machineName}</span>
                    <span className="muted small">
                      {/* Cardio can be logged without a duration (distance- or
                          calories-only), so build the line from what's there. */}
                      {[
                        Number(c.durationMin) > 0 ? `${c.durationMin} min` : '',
                        c.distance ? `${c.distance} ${c.distanceUnit}` : '',
                        c.avgHr ? `${c.avgHr} bpm` : '',
                        c.calories ? `${c.calories} cal` : '',
                      ].filter(Boolean).join(' · ')}
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
