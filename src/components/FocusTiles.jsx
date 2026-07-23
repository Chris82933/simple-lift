import { useNavigate } from 'react-router-dom'
import { loadPrograms, getActiveProgramId, setActiveProgramId, isSkillTreeAdded } from '../lib/storage.js'

// "Today's focus" tiles: each saved program, plus the calisthenics skill tree
// *only if the user has added it*. Used on both Today and the Skill Tree so
// switching feels the same everywhere. `current` is 'program' | 'skills'. On
// Today pass `onPickProgram` to switch inline; elsewhere program tiles go home.
export default function FocusTiles({ current, onPickProgram }) {
  const navigate = useNavigate()
  const programs = loadPrograms()
  const activeId = getActiveProgramId()
  // Hidden by default; shown once added, and always while you're on it.
  const showSkills = current === 'skills' || isSkillTreeAdded()

  const pickProgram = (id) => {
    setActiveProgramId(id)
    if (onPickProgram) onPickProgram(id)
    else navigate('/today')
  }
  const pickSkills = () => { if (current !== 'skills') navigate('/skills') }

  return (
    <div className="focus-tabs">
      {programs.map((p) => (
        <button
          key={p.id}
          type="button"
          className={'focus-tab' + (current === 'program' && p.id === activeId ? ' is-selected' : '')}
          onClick={() => pickProgram(p.id)}
        >
          <span className="focus-tab-name">{p.name}</span>
          <span className="muted small">{p.source === 'custom' ? 'Custom' : 'Program'} · {p.days.length} day{p.days.length === 1 ? '' : 's'}</span>
        </button>
      ))}
      {showSkills && (
        <button
          type="button"
          className={'focus-tab' + (current === 'skills' ? ' is-selected' : '')}
          onClick={pickSkills}
        >
          <span className="focus-tab-name">🤸 Calisthenics</span>
          <span className="muted small">Skill tree</span>
        </button>
      )}
    </div>
  )
}
