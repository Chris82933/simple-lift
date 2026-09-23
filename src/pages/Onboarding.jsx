import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  REGIONS,
  EQUIPMENT_GROUPS,
  GOALS,
  DAYS_OPTIONS,
  SESSION_OPTIONS,
} from '../data/options.js'
import { saveProfile, addProgram, loadProfile, logBodyweight, loadSettings, saveMax } from '../lib/storage.js'
import { generateProgram, EXPERIENCE_LEVELS } from '../lib/generator.js'
import { PROGRESSION_METHODS, DEFAULT_METHOD } from '../lib/progressionMethods.js'
import { estimate1RM } from '../lib/oneRepMax.js'
import ThemeToggle from '../components/ThemeToggle.jsx'

const toggle = (arr, val) =>
  arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]

const STEPS = ['experience', 'focus', 'balance', 'equipment', 'schedule', 'goals', 'progression', 'strength', 'bodyweight']

// The main barbell lifts we ask about for starting weights — also the ones
// STRENGTH_RATIOS (in oneRepMax.js) can extrapolate from to seed everything
// else loadable (front squat, RDL, rows, hip thrusts…).
const STRENGTH_LIFTS = [
  { key: 'squat', id: 'back_squat', label: 'Squat' },
  { key: 'bench', id: 'bench_press', label: 'Bench press' },
  { key: 'deadlift', id: 'deadlift', label: 'Deadlift' },
  { key: 'ohp', id: 'overhead_press', label: 'Overhead press' },
]

const DEFAULT_DRAFT = {
  experienceLevel: '',
  focusAreas: [],
  trainOthers: true,
  equipment: [],
  daysPerWeek: 3,
  sessionLength: 45,
  goals: [],
  progressionMethod: DEFAULT_METHOD,
  strength: { squat: '', bench: '', deadlift: '', ohp: '' }, // optional — see the strength step
  bodyweight: '', // optional — see the bodyweight step for why we ask
}

export default function Onboarding() {
  const navigate = useNavigate()
  const location = useLocation()
  // `started` false = the "how do you want to start?" path picker;
  // true = the guided, assisted wizard for beginner/intermediate lifters.
  // When the caller already chose "answer a few questions" (Today's empty state,
  // the Plans hub), jump straight into the wizard so nobody picks a path twice.
  const [started, setStarted] = useState(() => !!location.state?.guided)
  const [step, setStep] = useState(0)
  // Prefill from an existing profile when re-running setup.
  const [draft, setDraft] = useState(() => {
    const existing = loadProfile()
    return existing ? { ...DEFAULT_DRAFT, ...existing } : DEFAULT_DRAFT
  })
  // Strength step: a true beginner defaults to "just the bar" (no number
  // required) with the numeric inputs tucked behind this toggle, rather than
  // a blank-looking required field being the first thing they see. Declared
  // up front with the other hooks — must never sit after the early return below.
  const [knowStrength, setKnowStrength] = useState(false)

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))
  // Functional toggle so rapid successive clicks don't read stale state.
  const toggleField = (field, val) =>
    setDraft((d) => ({ ...d, [field]: toggle(d[field], val) }))

  const isValid = {
    experience: !!draft.experienceLevel,
    focus: draft.focusAreas.length >= 1,
    balance: true,
    equipment: true, // none selected = bodyweight only
    schedule: !!draft.daysPerWeek && !!draft.sessionLength,
    goals: draft.goals.length >= 1,
    progression: !!draft.progressionMethod,
    strength: true, // always skippable — "not sure" still yields a safely light program
    bodyweight: true, // always skippable — never block setup on a weight
  }[STEPS[step]]

  const isLast = step === STEPS.length - 1

  const next = () => {
    if (!isValid) return
    if (isLast) {
      const profile = { ...draft, createdAt: new Date().toISOString() }
      saveProfile(profile)
      if (Number(draft.bodyweight) > 0) logBodyweight(Number(draft.bodyweight))
      // Seed real 1RMs from the strength step so generateProgram (and the 1RM
      // tool later) has something to work from instead of leaving every
      // loaded lift blank. Assumes the number given is roughly a 5-rep set.
      STRENGTH_LIFTS.forEach(({ key, id, label }) => {
        const raw = Number(draft.strength?.[key])
        if (raw > 0) {
          const oneRM = Math.round(estimate1RM(raw, 5))
          if (oneRM > 0) saveMax(id, { oneRM, weight: raw, reps: 5, rir: 0, units, name: label, fromOnboarding: true })
        }
      })
      // Carry the chosen progression style onto the generated program so the
      // after-workout screen recommends the right next step.
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
  // Leaving the guided flow abandons every answer given so far and drops the
  // user in the blank expert Builder — confirm so a "skip this one question"
  // tap can't accidentally land them there (see fix #1).
  const confirmBuildOwn = () => {
    if (window.confirm("Leave the guided setup and build your program from scratch? You'll pick every exercise yourself.")) {
      buildOwn()
    }
  }

  // Steps with no default answer — safe to skip outright without steering
  // someone into re-answering something the app already defaulted for them.
  const OPTIONAL_STEPS = new Set(['strength', 'bodyweight'])

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
          <ThemeToggle label="First up — light or dark?" />
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
          {OPTIONAL_STEPS.has(STEPS[step]) && (
            <button type="button" className="skip-link" onClick={next}>
              Skip this question →
            </button>
          )}
        </div>
        <div className="progress-track" aria-hidden="true">
          <div
            className="progress-fill"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </header>

      <div className="step-body">
        {STEPS[step] === 'experience' && (
          <>
            <h1>How long have you been lifting?</h1>
            <p className="muted">This sets how much work we start you with, whether we walk you through lighter warm-up sets, and how quickly the weights go up.</p>
            <div className="choice-list">
              {EXPERIENCE_LEVELS.map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  className={'choice-row' + (draft.experienceLevel === lvl.id ? ' is-selected' : '')}
                  aria-pressed={draft.experienceLevel === lvl.id}
                  onClick={() => set({
                    experienceLevel: lvl.id,
                    // Steer the progression default toward what suits the level —
                    // the progression step still lets them pick anything.
                    progressionMethod: lvl.id === 'new' ? 'linear' : DEFAULT_METHOD,
                  })}
                >
                  <span className="choice-title">{lvl.label}</span>
                  <span className="muted small">{lvl.hint}</span>
                </button>
              ))}
            </div>
          </>
        )}

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
              Full body — select everything
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
                aria-pressed={draft.trainOthers}
                onClick={() => set({ trainOthers: true })}
              >
                <span className="choice-title">Yes, balance my week</span>
                <span className="muted small">Recommended — hit everything across the week</span>
              </button>
              <button
                type="button"
                className={'choice-row' + (!draft.trainOthers ? ' is-selected' : '')}
                aria-pressed={!draft.trainOthers}
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
                  aria-pressed={draft.daysPerWeek === d}
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
                  aria-pressed={draft.sessionLength === m}
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

        {STEPS[step] === 'strength' && (
          <>
            <h1>Roughly what can you lift?</h1>
            {draft.experienceLevel === 'new' && !knowStrength ? (
              // A true beginner usually can't produce this number at all — lead
              // with the safe default instead of a blank-looking required field
              // (see fix #2). "I know my numbers" reveals the normal inputs below.
              <>
                <p className="muted">
                  Most people just starting out don&apos;t know this yet — that&apos;s completely
                  fine. We&apos;ll start every barbell lift at the empty bar ({units === 'kg' ? 20 : 45}{' '}
                  {units}) and it&apos;ll feel light and easy on purpose. You add weight fast from there.
                </p>
                <div className="choice-list">
                  <button type="button" className="choice-row is-selected" aria-pressed="true" onClick={next}>
                    <span className="choice-title">Start at the bar</span>
                    <span className="muted small">Recommended — safe, and the app builds your real numbers up from here.</span>
                  </button>
                  <button
                    type="button"
                    className="choice-row"
                    aria-pressed="false"
                    onClick={() => setKnowStrength(true)}
                  >
                    <span className="choice-title">I know my numbers</span>
                    <span className="muted small">Enter what you can comfortably lift for about 5 reps.</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="muted">
                  Optional, lift by lift — skip any you don&apos;t know. Without this, new barbell lifts
                  start with a blank weight box; with it, we set a real starting weight for you. Enter
                  what you can comfortably lift for about 5 reps.
                </p>
                <div className="choice-list">
                  {STRENGTH_LIFTS.map((lift) => (
                    <div className="strength-row" key={lift.key}>
                      <label className="strength-label" htmlFor={`sw-${lift.key}`}>{lift.label}</label>
                      <div className="strength-input-row">
                        <input
                          id={`sw-${lift.key}`}
                          type="number"
                          inputMode="decimal"
                          className="text-input"
                          placeholder={`${units}, ~5 reps`}
                          value={draft.strength[lift.key]}
                          onChange={(e) => set({ strength: { ...draft.strength, [lift.key]: e.target.value } })}
                          aria-label={`${lift.label} weight in ${units}, for about 5 reps`}
                        />
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => set({ strength: { ...draft.strength, [lift.key]: String(units === 'kg' ? 20 : 45) } })}
                        >
                          Not sure? Just the bar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="muted small">
                  Anything left blank starts light (near the empty bar) instead of blank — never a dead
                  end. Fine-tune anytime with the one-rep max (1RM) tool in Settings.
                </p>
              </>
            )}
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
              <li><strong>Charts your weight over time</strong> next to your lifts on the Progress tab.</li>
              <li><strong>Strength-to-weight</strong> — the number that decides most climbing and calisthenics moves.</li>
              <li>
                <strong>Scores weighted pull-ups and dips properly.</strong> A 25 {units} belt on a
                180 {units} lifter is a 205 {units} lift. Without your weight, the app can only see
                the 25 and your progress there looks flat.
              </li>
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

      {/* Kept BEFORE .flow-actions, not after: .full-flow > .flow-actions:last-child
          is how the Back/Next bar stays pinned to the thumb zone, so this can't
          become flow-actions' next sibling without breaking that on every step. */}
      <button
        type="button"
        className="link-btn"
        style={{ alignSelf: 'center' }}
        onClick={confirmBuildOwn}
      >
        Not for me — leave the guided setup and build my own program
      </button>
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
