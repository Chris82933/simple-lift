import { useNavigate } from 'react-router-dom'
import { isSkillTreeAdded, setSkillTreeAdded } from '../lib/storage.js'

// Offers the calisthenics skill tree as an opt-in extra alongside real programs.
// It isn't a workout program — it's a skills tracker with a radar chart — so it
// lives here as something you add on purpose rather than a default for everyone.
export default function SkillTreeCard() {
  const navigate = useNavigate()
  const added = isSkillTreeAdded()

  const open = () => {
    if (!added) setSkillTreeAdded(true)
    navigate('/skills')
  }

  return (
    <div className="card template-card skill-tree-card">
      <div className="template-head">
        <p className="day-title">🤸 Calisthenics Skill Tree</p>
        {added && <span className="level-chip">Added</span>}
      </div>
      <p className="muted small">
        A fun side quest, not a full program. Track bodyweight skills — pull-ups toward muscle-ups,
        L-sit to front lever, wall handstand toward free-standing — with level-by-level progressions,
        a &ldquo;best set today&rdquo; logger, and a power-level radar chart that fills out as you get
        stronger. Cool, but not for everyone.
      </p>
      <button type="button" className="btn btn-primary" onClick={open}>
        {added ? 'Open skill tree' : '➕ Add skill tree'}
      </button>
    </div>
  )
}
