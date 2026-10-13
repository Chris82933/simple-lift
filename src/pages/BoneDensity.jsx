import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addProgram, loadPrograms, updateProgram, setActiveProgramId } from '../lib/storage.js'
import {
  BONE_LEVELS, BONE_TIMES, BONE_PHASES, BONE_DISCLAIMER, BONE_EVIDENCE, BONE_SOURCES, BONE_HOME_ROUTINE,
  buildBoneProgram, rebuildBoneProgram,
} from '../data/boneDensity.js'
import { measureUnit } from '../data/exercises.js'
import { estimateSessionMinutes } from '../lib/duration.js'
import MuscleMap from '../components/MuscleMap.jsx'
import { useToast } from '../components/Toast.jsx'

const range = (e) => (e.repLow === e.repHigh ? `${e.repLow}` : `${e.repLow}–${e.repHigh}`)

// Guided setup for the bone-strength program: two questions (experience, time)
// decide the lifts, the impact work, the sessions per week and the starting
// phase. Also the place to move an existing bone program on to its next phase.
export default function BoneDensity() {
  const navigate = useNavigate()
  const toast = useToast()
  const [level, setLevel] = useState(null)
  const [time, setTime] = useState(null)
  const [phase, setPhase] = useState(null) // null = the level's default
  const [cleared, setCleared] = useState(false)
  const [, force] = useState(0)

  const existing = loadPrograms().filter((p) => p.boneDensity)
  const startPhase = BONE_LEVELS.find((l) => l.id === level)?.startPhase || 1
  const ph = phase || startPhase
  const preview = level && time ? buildBoneProgram({ level, time, phase: ph }) : null

  const create = () => {
    if (!preview || !cleared) return
    addProgram(preview)
    navigate('/today')
  }

  const advance = (p) => {
    const nextPhase = Math.min(3, (p.boneDensity.phase || 1) + 1)
    updateProgram(rebuildBoneProgram(p, nextPhase))
    setActiveProgramId(p.id)
    force((n) => n + 1)
    toast.show(`Moved to Phase ${nextPhase} · ${BONE_PHASES[nextPhase].label} — your weights are kept`)
  }

  return (
    <section className="page full-flow">
      <header className="page-header">
        <div className="onb-head-row">
          <p className="eyebrow">Bone Strength</p>
          <button type="button" className="skip-link" onClick={() => navigate('/programs')}>Cancel →</button>
        </div>
        <h1>Build stronger bones</h1>
        <p className="muted">
          A strength and impact program for women to maintain — and often improve — bone density,
          based on the LIFTMOR trial and osteoporosis-society guidance. Tell us your experience and
          how much time you have; we&apos;ll set the lifts, the impact work and the pace.
        </p>
      </header>

      <div className="step-body">
        <div className="card notice rehab-redflags">
          <p className="group-label">Before you start</p>
          <p className="muted small">{BONE_DISCLAIMER}</p>
        </div>

        {existing.map((p) => {
          const cur = p.boneDensity.phase || 1
          return (
            <div className="card" key={p.id}>
              <p className="group-label">Your bone program</p>
              <p className="day-title">{p.name}</p>
              <p className="muted small">
                Phase {cur} · {BONE_PHASES[cur].label}. {BONE_PHASES[cur].advance}
              </p>
              {cur < 3 && (
                <button type="button" className="btn btn-ghost" onClick={() => advance(p)}>
                  Move to Phase {cur + 1} · {BONE_PHASES[cur + 1].label}
                </button>
              )}
            </div>
          )
        })}

        <div className="card">
          <p className="group-label">How much lifting have you done?</p>
          <div className="choice-list">
            {BONE_LEVELS.map((l) => (
              <button
                key={l.id}
                type="button"
                className={'choice-row' + (level === l.id ? ' is-selected' : '')}
                aria-pressed={level === l.id}
                onClick={() => { setLevel(l.id); setPhase(null) }}
              >
                <span className="choice-title">{l.label}</span>
                <span className="muted small">{l.detail}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <p className="group-label">How much time do you have?</p>
          <div className="choice-list">
            {BONE_TIMES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={'choice-row' + (time === t.id ? ' is-selected' : '')}
                aria-pressed={time === t.id}
                onClick={() => setTime(t.id)}
              >
                <span className="choice-title">{t.label}</span>
                <span className="muted small">{t.detail}</span>
              </button>
            ))}
          </div>
          <p className="muted small">Twice a week is enough: that is what the trials used. A third day adds balance and single-leg strength.</p>
        </div>

        {level && (
          <div className="card">
            <p className="group-label">Starting phase</p>
            <div className="seg" role="group" aria-label="Starting phase">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={'seg-item' + (ph === n ? ' is-selected' : '')}
                  aria-pressed={ph === n}
                  onClick={() => setPhase(n)}
                >
                  {n} · {BONE_PHASES[n].label}
                </button>
              ))}
            </div>
            <p className="muted small">
              <strong>Main lifts {BONE_PHASES[ph].sets} × {BONE_PHASES[ph].low === BONE_PHASES[ph].high ? BONE_PHASES[ph].low : `${BONE_PHASES[ph].low}–${BONE_PHASES[ph].high}`}.</strong>{' '}
              {BONE_PHASES[ph].effort} {BONE_PHASES[ph].advance}
            </p>
            {ph > startPhase && (
              <p className="muted small import-error">
                Starting past the technique phase is only for people who already lift these movements with good form.
              </p>
            )}
          </div>
        )}

        {preview && preview.days.map((d) => (
          <div className="card" key={d.title}>
            <p className="day-title">{d.title}</p>
            <p className="muted small">~{estimateSessionMinutes(d)} min · {d.note.split(' General guidance')[0].split(': ').slice(1).join(': ')}</p>
            <ul className="exercise-preview">
              {d.exercises.map((e, i) => (
                <li key={e.id}>
                  <MuscleMap pattern={e.pattern} exId={e.id} size={46} compact />
                  <span className="ex-name">
                    {e.name}
                    {d.exercises[i - 1]?.supersetNext && <span className="ex-sub">Alternate with the press</span>}
                  </span>
                  <span className="muted small">{e.sets} × {range(e)} {measureUnit(e)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {preview && (
          <div className="card">
            <p className="group-label">On other days (optional, about 10 minutes)</p>
            <ul className="rehab-improves">
              {BONE_HOME_ROUTINE.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </div>
        )}

        <details className="card rehab-detail">
          <summary>Why this program — what the research says</summary>
          <ul className="rehab-improves">
            {BONE_EVIDENCE.map((t) => <li key={t}>{t}</li>)}
          </ul>
          <p className="muted small">
            Sources:{' '}
            {BONE_SOURCES.map((s, i) => (
              <span key={s.url}>
                {i > 0 && ' · '}
                <a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>
              </span>
            ))}
          </p>
        </details>

        {preview && (
          <label className="consent-row" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <input type="checkbox" checked={cleared} onChange={(e) => setCleared(e.target.checked)} style={{ marginTop: 3, width: 20, height: 20, flex: 'none' }} />
            <span className="muted small">
              I&apos;ve read the note above. None of it applies to me, or a doctor or physiotherapist has cleared me for this kind of training.
            </span>
          </label>
        )}
        {preview && (
          <p className="muted small">
            Creating this makes it your active program. Your current program is kept — switch back anytime under Plans.
          </p>
        )}
      </div>

      <div className="flow-actions">
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/programs')}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={create} disabled={!preview || !cleared}>
          Create &amp; make active
        </button>
      </div>
    </section>
  )
}
