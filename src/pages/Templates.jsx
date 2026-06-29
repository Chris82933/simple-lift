import { useNavigate } from 'react-router-dom'
import { TEMPLATES, instantiateTemplate } from '../data/templates.js'
import { addProgram } from '../lib/storage.js'

export default function Templates() {
  const navigate = useNavigate()

  const use = (templateId) => {
    const program = instantiateTemplate(templateId)
    if (!program) return
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
          <p className="day-title">{t.name}</p>
          <div className="tag-row">
            {t.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
          </div>
          <p className="muted small">{t.description}</p>
          <p className="muted small"><strong>Needs:</strong> {t.equipment}</p>
          <p className="muted small"><strong>Workouts:</strong> {t.days.map((d) => d.title).join(', ')}</p>
          <button type="button" className="btn btn-primary" onClick={() => use(t.templateId)}>
            Use this program
          </button>
        </div>
      ))}
    </section>
  )
}
