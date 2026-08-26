import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  loadPrograms, getActiveProgramId, setActiveProgramId, deleteProgram, restoreProgram,
  isSkillTreeAdded, setSkillTreeAdded, loadSkills,
} from '../lib/storage.js'
import { computeStats, powerLevel, rankFor } from '../data/skills.js'
import { useToast } from '../components/Toast.jsx'

export default function Programs() {
  const navigate = useNavigate()
  const toast = useToast()
  const [, force] = useState(0)
  const programs = loadPrograms()
  const activeId = getActiveProgramId()
  const skillTreeAdded = isSkillTreeAdded()

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

  // Add the calisthenics skill tree without leaving this page.
  const addSkillTree = () => { setSkillTreeAdded(true); refresh() }
  // Remove it here too — no need to enter the tree just to drop it.
  const removeSkillTree = () => {
    setSkillTreeAdded(false)
    refresh()
    toast.show('Removed Calisthenics Skill Tree', {
      actionLabel: 'Undo',
      onAction: () => { setSkillTreeAdded(true); refresh() },
    })
  }

  // A one-line power-level summary of the radar chart for the card.
  const skillSummary = () => {
    const power = powerLevel(computeStats(loadSkills()))
    return `Power level ${power} · ${rankFor(power)}`
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>Programs</h1>
        <p className="muted">Switch between programs, or build a new one.</p>
      </header>

      <div className="card">
        <button type="button" className="btn btn-primary" onClick={() => navigate('/templates')}>
          Browse templates (GZCLP, bodyweight…)
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/builder')}>
          Build custom program
        </button>
        <Link className="btn btn-ghost" to="/onboarding">Generate one from a few questions</Link>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/recovery')}>
          Recovery &amp; Strength
        </button>
        {!skillTreeAdded && (
          <button type="button" className="btn btn-ghost" onClick={addSkillTree}>
            Add the Calisthenics Skill Tree
          </button>
        )}
        <Link className="btn btn-ghost" to="/one-rep-max">Find your starting weights (1RM)</Link>
      </div>

      {programs.length === 0 && !skillTreeAdded && (
        <div className="card placeholder-card">
          <p className="muted">No programs yet. Create one above.</p>
        </div>
      )}

      {skillTreeAdded && (
        <div className="card program-card skill-tree-program">
          <div className="program-card-head">
            <div>
              <p className="day-title">Calisthenics Skill Tree</p>
              <p className="muted small">
                Special program · skill progressions + radar chart · {skillSummary()}
              </p>
            </div>
            <span className="level-chip">Skill tree</span>
          </div>
          <p className="muted small">
            Not a workout to schedule — a bodyweight-skills tracker (muscle-up, front lever, handstand…)
            with level-by-level progressions and a power-level radar chart that fills out as you get stronger.
          </p>
          <div className="program-card-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/skills')}>
              Open
            </button>
            <button type="button" className="btn btn-ghost btn-sm danger" onClick={removeSkillTree}>
              Remove
            </button>
          </div>
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
