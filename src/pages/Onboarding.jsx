import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  REGIONS,
  EQUIPMENT_GROUPS,
  GOALS,
  DAYS_OPTIONS,
  SESSION_OPTIONS,
} from '../data/options.js'
import { saveProfile } from '../lib/storage.js'

const toggle = (arr, val) =>
  arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]

const STEPS = ['focus', 'balance', 'equipment', 'schedule', 'goals']

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState({
    focusAreas: [],
    trainOthers: true,
    equipment: [],
    daysPerWeek: 3,
    sessionLength: 45,
    goals: [],
  })

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))
  // Functional toggle so rapid successive clicks don't read stale state.
  const toggleField = (field, val) =>
    setDraft((d) => ({ ...d, [field]: toggle(d[field], val) }))

  const isValid = {
    focus: draft.focusAreas.length >= 1,
    balance: true,
    equipment: true, // none selected = bodyweight only
    schedule: !!draft.daysPerWeek && !!draft.sessionLength,
    goals: draft.goals.length >= 1,
  }[STEPS[step]]

  const isLast = step === STEPS.length - 1

  const next = () => {
    if (!isValid) return
    if (isLast) {
      saveProfile({ ...draft, createdAt: new Date().toISOString() })
      navigate('/today')
    } else {
      setStep((s) => s + 1)
    }
  }

  const back = () => {
    if (step === 0) navigate('/today')
    else setStep((s) => s - 1)
  }

  return (
    <section className="page full-flow">
      <header className="page-header">
        <p className="eyebrow">Step {step + 1} of {STEPS.length}</p>
        <div className="progress-track" aria-hidden="true">
          <div
            className="progress-fill"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </header>

      <div className="step-body">
        {STEPS[step] === 'focus' && (
          <>
            <h1>What do you want to focus on?</h1>
            <p className="muted">Pick one or more. We&apos;ll balance the rest of your week around them.</p>
            <div className="region-grid">
              {REGIONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={'region-tile' + (draft.focusAreas.includes(r.id) ? ' is-selected' : '')}
                  aria-pressed={draft.focusAreas.includes(r.id)}
                  onClick={() => toggleField('focusAreas', r.id)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </>
        )}

        {STEPS[step] === 'balance' && (
          <>
            <h1>Train the other areas too?</h1>
            <p className="muted">
              We can spread the muscle groups you didn&apos;t pick across other days to keep your
              body balanced — or keep things focused on just your picks.
            </p>
            <div className="choice-list">
              <button
                type="button"
                className={'choice-row' + (draft.trainOthers ? ' is-selected' : '')}
                onClick={() => set({ trainOthers: true })}
              >
                <span className="choice-title">Yes, balance my week</span>
                <span className="muted small">Recommended — hit everything across the week</span>
              </button>
              <button
                type="button"
                className={'choice-row' + (!draft.trainOthers ? ' is-selected' : '')}
                onClick={() => set({ trainOthers: false })}
              >
                <span className="choice-title">No, just my focus areas</span>
                <span className="muted small">Concentrate volume on what I picked</span>
              </button>
            </div>
          </>
        )}

        {STEPS[step] === 'equipment' && (
          <>
            <h1>What equipment do you have?</h1>
            <p className="muted">Tick everything you can use. Nothing selected = bodyweight only.</p>
            {EQUIPMENT_GROUPS.map((g) => (
              <div className="equip-group" key={g.group}>
                <p className="group-label">{g.group}</p>
                <div className="check-grid">
                  {g.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={'check-pill' + (draft.equipment.includes(item.id) ? ' is-selected' : '')}
                      aria-pressed={draft.equipment.includes(item.id)}
                      onClick={() => toggleField('equipment', item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {STEPS[step] === 'schedule' && (
          <>
            <h1>How often can you train?</h1>
            <p className="muted">We&apos;ll fit your program to this.</p>

            <p className="group-label">Days per week</p>
            <div className="seg">
              {DAYS_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={'seg-item' + (draft.daysPerWeek === d ? ' is-selected' : '')}
                  onClick={() => set({ daysPerWeek: d })}
                >
                  {d}
                </button>
              ))}
            </div>

            <p className="group-label">Session length</p>
            <div className="seg">
              {SESSION_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={'seg-item' + (draft.sessionLength === m ? ' is-selected' : '')}
                  onClick={() => set({ sessionLength: m })}
                >
                  {m}m
                </button>
              ))}
            </div>
          </>
        )}

        {STEPS[step] === 'goals' && (
          <>
            <h1>What are you training for?</h1>
            <p className="muted">Pick one or more. This shapes your sets, reps, and rest.</p>
            <div className="choice-list">
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={'choice-row' + (draft.goals.includes(g.id) ? ' is-selected' : '')}
                  aria-pressed={draft.goals.includes(g.id)}
                  onClick={() => toggleField('goals', g.id)}
                >
                  <span className="choice-title">{g.label}</span>
                  <span className="muted small">{g.hint}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flow-actions">
        <button type="button" className="btn btn-ghost" onClick={back}>
          {step === 0 ? 'Cancel' : 'Back'}
        </button>
        <button type="button" className="btn btn-primary" onClick={next} disabled={!isValid}>
          {isLast ? 'Build my program' : 'Next'}
        </button>
      </div>
    </section>
  )
}
