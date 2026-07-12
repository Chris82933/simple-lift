import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  loadPrograms, getActiveProgramId, setActiveProgramId, deleteProgram, restoreProgram,
} from '../lib/storage.js'
import { useToast } from '../components/Toast.jsx'

export default function Programs() {
  const navigate = useNavigate()
  const toast = useToast()
  const [, force] = useState(0)
  const programs = loadPrograms()
  const activeId = getActiveProgramId()

  const refresh = () => force((n) => n + 1)

  const makeActive = (id) => { setActiveProgramId(id); refresh() }
  const remove = (program) => {
    const wasActive = program.id === activeId
    deleteProgram(program.id)
    refresh()
    toast.show(`Deleted "${program.name}"`, {
      actionLabel: 'Undo',
      onAction: () => { restoreProgram(program); if (wasActive) setActiveProgramId(program.id); refresh() },
    })
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>Programs</h1>
        <p className="muted">Switch between programs, or build a new one.</p>
      </header>

      <div className="card">
        <button type="button" className="btn btn-primary" onClick={() => navigate('/templates')}>
          📋 Browse templates (GZCLP, bodyweight…)
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/builder')}>
          ＋ Build custom program
        </button>
        <Link className="btn btn-ghost" to="/onboarding">Generate one from a few questions</Link>
        <Link className="btn btn-ghost" to="/one-rep-max">🏋️ Find your starting weights (1RM)</Link>
      </div>

      {programs.length === 0 && (
        <div className="card placeholder-card">
          <p className="muted">No programs yet. Create one above.</p>
        </div>
      )}

      {programs.map((p) => {
        const isActive = p.id === activeId
        const exCount = p.days.reduce((n, d) => n + d.exercises.length, 0)
        return (
          <div className={'card program-card' + (isActive ? ' is-active' : '')} key={p.id}>
            <div className="program-card-head">
              <div>
                <p className="day-title">{p.name}</p>
                <p className="muted small">
                  {p.source === 'custom' ? 'Custom' : 'Generated'} · {p.days.length} days · {exCount} exercises
                </p>
              </div>
              {isActive ? (
                <span className="active-badge">Active</span>
              ) : (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => makeActive(p.id)}>
                  Set active
                </button>
              )}
            </div>
            <div className="program-card-actions">
              {isActive && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/schedule')}>
                  Schedule
                </button>
              )}
              {p.source === 'custom' && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/builder', { state: { id: p.id } })}>
                  Edit
                </button>
              )}
              <button type="button" className="btn btn-ghost btn-sm danger" onClick={() => remove(p)}>
                Delete
              </button>
            </div>
          </div>
        )
      })}
    </section>
  )
}
