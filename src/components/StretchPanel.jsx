import { useState } from 'react'
import { buildStretchRoutine } from '../data/stretches.js'

// Collapsible stretch routine built from a session's muscles. `phase` picks the
// dynamic (pre-workout) or static (post-workout) variant. Collapsed by default;
// renders nothing when there are no matching stretches.
export default function StretchPanel({ muscles = [], phase = 'static', title, subtitle }) {
  const [open, setOpen] = useState(false)
  const routine = buildStretchRoutine(muscles, phase)
  if (routine.length === 0) return null
  return (
    <div className="card collapsible stretch-panel">
      <button type="button" className="collapse-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="collapse-title">{title}</span>
        <span className="muted small collapse-sub">{open ? subtitle : `${routine.length} move${routine.length === 1 ? '' : 's'}`}</span>
        <span className={'collapse-chevron' + (open ? ' is-open' : '')} aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="collapse-body">
          {subtitle && <p className="muted small">{subtitle}</p>}
          <ul className="stretch-list">
            {routine.map((s) => (
              <li className="stretch-row" key={s.muscle}>
                <div className="stretch-row-head">
                  <span className="stretch-muscle">{s.label}</span>
                  <span className="stretch-name">{s.name}</span>
                  <a
                    className="stretch-photo"
                    href={s.photo}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Photos ↗
                  </a>
                </div>
                <span className="muted small">{s.cue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
