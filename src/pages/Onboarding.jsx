import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  REGIONS,
  EQUIPMENT_GROUPS,
  GOALS,
  DAYS_OPTIONS,
  SESSION_OPTIONS,
} from '../data/options.js'
import { saveProfile, addProgram, loadProfile, logBodyweight, loadSettings } from '../lib/storage.js'
import { generateProgram } from '../lib/generator.js'
import { PROGRESSION_METHODS, DEFAULT_METHOD } from '../lib/progressionMethods.js'

const toggle = (arr, val) =>
  arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]

const STEPS = ['focus', 'balance', 'equipment', 'schedule', 'goals', 'progression', 'bodyweight']

const DEFAULT_DRAFT = {
  focusAreas: [],
  trainOthers: true,
  equipment: [],
  daysPerWeek: 3,
  sessionLength: 45,
  goals: [],
  progressionMethod: DEFAULT_METHOD,
  bodyweight: '', // optional — see the bodyweight step for why we ask
}

export default function Onboarding() {
  const navigate = useNavigate()
  // `started` false = the "how do you want to start?" path picker;
  // true = the guided, assisted wizard for beginner/intermediate lifters.
  const [started, setStarted] = useState(false)
  const [step, setStep] = useState(0)
  // Prefill from an existing profile when re-running setup.
  const [draft, setDraft] = useState(() => {
    const existing = loadProfile()
    return existing ? { ...DEFAULT_DRAFT, ...existing } : DEFAULT_DRAFT
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
    progression: !!draft.progressionMethod,
    bodyweight: true, // always skippable — never block setup on a weight
  }[STEPS[step]]

  const isLast = step === STEPS.length - 1

  const next = () => {
    if (!isValid) return
    if (isLast) {
      const profile = { ...draft, createdAt: new Date().toISOString() }
      saveProfile(profile)
      // Carry the chosen progression style onto the generated program so the
      // after-workout screen recommends the right next step.
      if (Number(draft.bodyweight) > 0) logBodyweight(Number(draft.bodyweight))
      const program = generateProgram(profile)
      addProgram({ ...program, progressionMethod: draft.progressionMethod })
      navigate('/today')
    } else {
      setStep((s) => s + 1)
    }
  }

  const back = () => {
    if (step === 0) setStarted(false)
    else setStep((s) => s - 1)
  }

  // Expert escape hatches — skip the questions entirely.
  const buildOwn = () => navigate('/builder')
  const useTemplate = () => navigate('/templates')
  const startGuided = () => { setStep(0); setStarted(true) }

  // One-tap "train everything" so users who don't want to choose can keep moving.
  const selectAllFocus = () => set({ focusAreas: REGIONS.map((r) => r.id) })

  // ---- Path picker: choose your starting point ----
  if (!started) {
    return (
      <section className="page full-flow">
        <header className="page-header">
          <p className="eyebrow">Welcome to Simple Lift</p>
          <h1>How do you want to start?</h1>
          <p className="muted">Pick the path that fits you. You can always rebuild or switch programs later.</p>
        </header>

        <div className="step-body">
          <button type="button" className="path-card is-primary" onClick={startGuided}>
            <div className="path-card-top">
              <span className="path-title">Guided setup</span>
              <span className="rec-badge">Recommended</span>
            </div>
            <span className="muted small">
              Answer a few quick questions and we&apos;ll build a balanced program and set up how it
              progresses each week. Best if you&apos;re a beginner or intermediate lifter.
            </span>
          </button>

          <button type="button" className="path-card" onClick={useTemplate}>
            <span className="path-title">Choose a proven program</span>
            <span className="muted small">
              Start from a tried-and-tested plan — StrongLifts 5×5, Starting Strength, Push/Pull/Legs,
              GZCLP and more — each with the right progression already built in.
            </span>
          </button>

          <button type="button" className="path-card" onClick={buildOwn}>
            <span className="path-title">Build my own</span>
            <span className="muted small">
              Design every day and exercise yourself and pick your progression style. For experts who
              already know exactly what they want.
            </span>
          </button>
        </div>

        <div className="flow-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/today')}>Cancel</button>
        </div>
      </section>
    )
  }

  const selectedMethod = PROGRESSION_METHODS.find((m) => m.id === draft.progressionMethod)
  const units = loadSettings().units === 'kg' ? 'kg' : 'lbs'

  return (
    <section className="page full-flow">
      <header className="page-header">
        <div className="onb-head-row">
          <p className="eyebrow">Step {step + 1} of {STEPS.length}</p>
          <button type="button" className="skip-link" onClick={buildOwn}>
            Skip · build my own →
          </button>
        </div>
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
            <p className="muted">Pick one or more, or just train everything. We&apos;ll balance the rest of your week around your choices.</p>
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
            <button type="button" className="link-btn full-body-link" onClick={selectAllFocus}>
              ⚡ Full body — select everything
            </button>
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

        {STEPS[step] === 'progression' && (
          <>
            <h1>How should your program progress?</h1>
            <p className="muted">This decides what the app recommends after each workout — add reps, add weight, or hold. Not sure? Go with our pick.</p>
            <div className="choice-list">
              {PROGRESSION_METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={'choice-row' + (draft.progressionMethod === m.id ? ' is-selected' : '')}
                  aria-pressed={draft.progressionMethod === m.id}
                  onClick={() => set({ progressionMethod: m.id })}
                >
                  <span className="choice-title">
                    {m.name}{m.recommended && <span className="rec-badge">Recommended</span>}
                  </span>
                  <span className="muted small">{m.tagline}</span>
                </button>
              ))}
            </div>
            {selectedMethod && (
              <div className="method-detail">
                <p className="muted small">{selectedMethod.how}</p>
                <div className="proscons">
                  <ul className="pros">{selectedMethod.pros.map((p, i) => <li key={i}>{p}</li>)}</ul>
                  <ul className="cons">{selectedMethod.cons.map((c, i) => <li key={i}>{c}</li>)}</ul>
                </div>
              </div>
            )}
            <p className="muted small">You can change this anytime, and after every workout you still choose what to do.</p>
          </>
        )}

        {STEPS[step] === 'bodyweight' && (
          <>
            <h1>What do you weigh?</h1>
            <p className="muted">
              Optional — skip it and everything still works. Here&apos;s what the app does with it,
              so you can decide:
            </p>
            <ul className="why-list">
              <li>
                <strong>Scores weighted pull-ups and dips properly.</strong> A 25 {units} belt on a
                180 {units} lifter is a 205 {units} lift. Without your weight, the app can only see
                the 25 and your progress there looks flat.
              </li>
              <li><strong>Charts your weight over time</strong> next to your lifts on the Progress tab.</li>
              <li><strong>Strength-to-weight</strong> — the number that decides most climbing and calisthenics moves.</li>
            </ul>
            <input
              type="number"
              inputMode="decimal"
              className="text-input"
              placeholder={`Your weight in ${units}`}
              value={draft.bodyweight}
              onChange={(e) => set({ bodyweight: e.target.value })}
              aria-label={`Bodyweight in ${units}`}
            />
            <p className="muted small">
              Stays on your device (or your own cloud backup). The app never sets a target weight,
              never compares you to anyone, and never mentions it unprompted. You can add or change
              it later in Settings.
            </p>
          </>
        )}
      </div>

      <div className="flow-actions">
        <button type="button" className="btn btn-ghost" onClick={back}>
          Back
        </button>
        <button type="button" className="btn btn-primary" onClick={next} disabled={!isValid}>
          {isLast ? 'Build my program' : 'Next'}
        </button>
      </div>
    </section>
  )
}
