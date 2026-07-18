import { useNavigate } from 'react-router-dom'
import { TEMPLATES, instantiateTemplate } from '../data/templates.js'
import { addProgram, getMax, loadSettings } from '../lib/storage.js'
import { weightForReps, incrementForUnits } from '../lib/oneRepMax.js'

// Conservative starting reps per GZCLP tier (heavier T1, lighter accessory).
const TIER_START_REPS = { t1: 5, t2: 10, t3: 15 }

export default function Templates() {
  const navigate = useNavigate()

  const use = (templateId) => {
    const program = instantiateTemplate(templateId)
    if (!program) return

    // Prefill scheme-based starting weights from any saved 1RMs.
    const inc = incrementForUnits(loadSettings().units)
    for (const day of program.days) {
      for (const ex of day.exercises) {
        if (!ex.progression) continue
        const max = getMax(ex.id)
        if (max) {
          const repsTarget = TIER_START_REPS[ex.progression.scheme] || ex.repHigh
          ex.progression.weight = weightForReps(max.oneRM, repsTarget, inc)
          ex.startWeight = ex.progression.weight
        }
      }
    }

    addProgram(program) // becomes active
    navigate('/schedule') // let them set their training days
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>Templates</h1>
        <p className="muted">Proven programs, ready to load. You can tweak everything after.</p>
      </header>

      {TEMPLATES.map((t) => (
        <div className="card template-card" key={t.templateId}>
          <div className="template-head">
            <p className="day-title">{t.name}</p>
            {t.level && <span className="level-chip">{t.level}</span>}
          </div>
          <div className="tag-row">
            {t.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
          </div>
          <p className="muted small">{t.description}</p>

          {t.bestFor && <p className="muted small"><strong>Best for:</strong> {t.bestFor}</p>}
          <p className="muted small"><strong>Needs:</strong> {t.equipment}</p>
          <p className="muted small"><strong>Workouts:</strong> {t.days.map((d) => d.title).join(', ')}</p>
          {t.progressionInfo && (
            <p className="muted small progression-info">📈 <strong>How you progress:</strong> {t.progressionInfo}</p>
          )}

          {(t.pros || t.cons) && (
            <div className="proscons">
              {t.pros && (
                <ul className="pros">
                  {t.pros.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              )}
              {t.cons && (
                <ul className="cons">
                  {t.cons.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              )}
            </div>
          )}

          {t.setupPath ? (
            <>
              <button type="button" className="btn btn-primary" onClick={() => navigate(t.setupPath)}>
                {t.setupLabel || 'Set this up'}
              </button>
              <p className="muted small">A few questions and we&apos;ll work out every starting weight for you.</p>
            </>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => use(t.templateId)}>
              Use this program
            </button>
          )}
        </div>
      ))}
    </section>
  )
}
