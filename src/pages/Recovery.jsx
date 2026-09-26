import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addProgram } from '../lib/storage.js'
import { RECOVERY_AREAS, RECOVERY_DISCLAIMER, buildRecoveryProgram } from '../data/recovery.js'
import { EXERCISE_BY_ID, measureUnit } from '../data/exercises.js'
import MuscleMap from '../components/MuscleMap.jsx'

const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
const range = (e) => (e.low === e.high ? `${e.low}` : `${e.low}–${e.high}`)

// A guided creator for a physio-style strengthening routine. Pick one or more
// problem areas; each contributes a short session of low-load rehab work.
export default function Recovery() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState([])

  const chosen = RECOVERY_AREAS.filter((a) => selected.includes(a.id))

  const create = () => {
    const program = buildRecoveryProgram(selected)
    if (!program) return
    addProgram(program) // new program, becomes active — never overwrites
    navigate('/today')
  }

  return (
    <section className="page full-flow">
      <header className="page-header">
        <div className="onb-head-row">
          <p className="eyebrow">Recovery &amp; Strength</p>
          <button type="button" className="skip-link" onClick={() => navigate('/programs')}>Cancel →</button>
        </div>
        <h1>Strengthen a joint or area</h1>
        <p className="muted">
          Pick the areas that bother you and we&apos;ll build a short, low-load strengthening routine —
          one session per area, drawn from physiotherapy and sports-science guidance.
        </p>
      </header>

      <div className="step-body">
        <div className="card notice recovery-disclaimer">
          <p className="muted small">{RECOVERY_DISCLAIMER}</p>
        </div>

        <div className="card">
          <p className="group-label">What&apos;s bothering you?</p>
          <div className="choice-chips">
            {RECOVERY_AREAS.map((a) => (
              <button
                key={a.id}
                type="button"
                className={'chip' + (selected.includes(a.id) ? ' is-selected' : '')}
                aria-pressed={selected.includes(a.id)}
                onClick={() => setSelected((s) => toggle(s, a.id))}
              >
                {a.emoji} {a.label}
              </button>
            ))}
          </div>
          <p className="muted small">Choose as many as you like — each becomes its own short session.</p>
        </div>

        {chosen.map((area) => (
          <div className="card" key={area.id}>
            <p className="day-title">{area.emoji} {area.label}</p>

            {area.improves?.length > 0 && (
              <>
                <p className="group-label">What this improves</p>
                <ul className="rehab-improves">
                  {area.improves.map((it) => <li key={it}>{it}</li>)}
                </ul>
              </>
            )}

            {/* Named conditions are phrased as "the kind of routine used for X",
                never "you have X" — the app must not read as a diagnosis. */}
            {area.conditions && <p className="muted small">{area.conditions}</p>}

            {/* The most important block on the page: when NOT to use this and
                get looked at instead. Styled as a caution, not buried. */}
            {area.notFor?.length > 0 && (
              <div className="card notice rehab-redflags">
                <p className="group-label">See someone instead if…</p>
                {area.notForLead && <p className="muted small">{area.notForLead}</p>}
                <ul className="rehab-redflag-list">
                  {area.notFor.map((it) => <li key={it}>{it}</li>)}
                </ul>
              </div>
            )}

            <ul className="exercise-preview">
              {area.exercises.map((e, i) => {
                const ex = EXERCISE_BY_ID[e.id]
                // A routine referencing an unknown id used to dereference
                // undefined here and crash the whole app to the error boundary
                // (this page renders the preview before any validation runs).
                if (!ex) return null
                return (
                  <li key={i}>
                    <MuscleMap pattern={ex.pattern} exId={ex.id} size={46} compact />
                    <span className="ex-name">{ex.name}</span>
                    <span className="muted small">{e.sets} × {range(e)} {measureUnit(ex)}</span>
                  </li>
                )
              })}
            </ul>

            {(area.timeline || area.progression) && (
              <details className="rehab-detail">
                <summary>How long it takes, and how to progress</summary>
                {area.timeline && <p className="muted small"><strong>Timeline.</strong> {area.timeline}</p>}
                {area.progression && <p className="muted small"><strong>Progressing.</strong> {area.progression}</p>}
                <p className="muted small">{area.why}</p>
              </details>
            )}
            {area.sources?.length > 0 && (
              <p className="muted small">
                Source{area.sources.length > 1 ? 's' : ''}:{' '}
                {area.sources.map((s, i) => (
                  <span key={s.url}>
                    {i > 0 && ', '}
                    <a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>
                  </span>
                ))}
              </p>
            )}
          </div>
        ))}

        {selected.length === 0 && (
          <p className="muted small">Select an area above to preview its routine.</p>
        )}

        {selected.length > 0 && (
          <p className="muted small">
            Creating this makes it your active program. Your current program is kept —
            switch back anytime under Plans.
          </p>
        )}
      </div>

      <div className="flow-actions">
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/programs')}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={create} disabled={selected.length === 0}>
          Create &amp; make active
        </button>
      </div>
    </section>
  )
}
