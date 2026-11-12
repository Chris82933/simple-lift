import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { REGIONS, EQUIPMENT_GROUPS, SESSION_OPTIONS } from '../data/options.js'
import {
  saveProfile, addProgram, loadProfile, loadSettings, saveSettings, saveMax,
  loadPrograms, loadHistory, loadMaxes, setSkillTreeAdded,
} from '../lib/storage.js'
import { generateProgram, EXPERIENCE_LEVELS } from '../lib/generator.js'
import { DEFAULT_METHOD } from '../lib/progressionMethods.js'
import { saveProfileEquipment, setActiveProfile } from '../lib/equipment.js'
import { estimate1RM } from '../lib/oneRepMax.js'
import { TEMPLATE_BY_ID, instantiateTemplate } from '../data/templates.js'
import { seedProgramWeights, usesBarbell } from '../lib/seedWeights.js'
import {
  ONBOARDING_GOALS, GOAL_BY_ID, DEFAULT_GOAL, TRAIN_PLACES, HOME_GEAR, DEFAULT_HOME_GEAR,
  equipmentFor, recommendPlan, whyLine, generatedName,
} from '../lib/recommend.js'
import { WEEKDAY_SHORT, WEEKDAY_ORDER, WEEKDAY_LABELS } from '../lib/schedule.js'
import { acceptNumber, maxWeight } from '../lib/limits.js'
import { useToast } from '../components/Toast.jsx'

// Five questions, each with an answer already picked, then one recommended
// plan. It used to be nine steps — body-part focus before goals, a whole screen
// for "train the other areas too?", a 25-item equipment checklist, and a
// choice between four progression methods a beginner can't judge. Those now
// default sensibly (everything, yes, by where you train, by experience) and
// stay changeable later.
const STEPS = ['goal', 'experience', 'place', 'days', 'plan']

const STRENGTH_LIFTS = [
  { id: 'back_squat', label: 'Squat' },
  { id: 'bench_press', label: 'Bench press' },
  { id: 'deadlift', label: 'Deadlift' },
  { id: 'overhead_press', label: 'Overhead press' },
]

const DAYS_FOR_COUNT = { 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6] }
const ALL_REGIONS = REGIONS.map((r) => r.id)
const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
const byWeekOrder = (days) => [...days].sort((a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b))

// Builds the program an option stands for. Never writes anything.
function buildOption(option, a) {
  if (!option) return null
  if (option.kind === 'template') {
    const t = TEMPLATE_BY_ID[option.templateId]
    if (!t) return null
    if (t.setupPath) return { setupPath: t.setupPath, name: t.name, info: t.progressionInfo, titles: t.days.map((d) => d.title), setupLabel: t.setupLabel }
    const p = instantiateTemplate(option.templateId)
    return {
      program: { ...p, schedule: { ...(p.schedule || {}), mode: 'rotation', trainingDays: byWeekOrder(a.days), pointer: 0 } },
      name: t.name, info: t.progressionInfo, titles: p.days.map((d) => d.title),
    }
  }
  if (option.kind === 'bone') {
    return { setupPath: '/bone-density', name: 'Bone Strength', info: 'Heavy-but-safe lifting, impact and balance, built from your answers to a few safety questions.', titles: [] }
  }
  const p = generateProgram(a.profile)
  const order = byWeekOrder(a.days)
  const days = p.days.map((d, i) => ({ ...d, weekday: order[i], dayLabel: WEEKDAY_LABELS[order[i]] }))
  return {
    program: { ...p, name: generatedName({ goal: a.goal, days: a.days.length }), days },
    name: generatedName({ goal: a.goal, days: a.days.length }),
    info: a.experience === 'new'
      ? 'Add a little weight each time you finish every rep. The app tells you when.'
      : 'Hit the top of the rep range on every set, then add weight. The app tells you when.',
    titles: days.map((d) => `${WEEKDAY_SHORT[d.weekday]} · ${d.title}`),
  }
}

export default function Onboarding() {
  const navigate = useNavigate()
  const toast = useToast()
  const existing = useMemo(() => loadProfile(), [])
  // A first-timer may still choose units here; anyone with saved data changes
  // units in Settings, where stored weights are converted rather than relabelled.
  const fresh = useMemo(() => !loadPrograms().length && !loadHistory().length && !Object.keys(loadMaxes()).length, [])
  const [step, setStep] = useState(0)
  const [goal, setGoal] = useState(DEFAULT_GOAL)
  const [experience, setExperience] = useState(existing?.experienceLevel || 'some')
  const [place, setPlace] = useState('gym')
  const [picks, setPicks] = useState(DEFAULT_HOME_GEAR)
  const [gymCustom, setGymCustom] = useState(null) // null = a full gym
  const [days, setDays] = useState(DAYS_FOR_COUNT[existing?.daysPerWeek] || DAYS_FOR_COUNT[3])
  const [sessionLength, setSessionLength] = useState(existing?.sessionLength || 45)
  const [units, setUnits] = useState(() => {
    const saved = loadSettings().units
    if (saved === 'kg' || saved === 'lbs') return saved
    return /^en-(US|LR|MM)/i.test(navigator.language || '') ? 'lbs' : 'kg'
  })
  const [strength, setStrength] = useState({})
  const [chosen, setChosen] = useState(null) // null = the recommendation

  const equipment = place === 'gym' ? (gymCustom ?? equipmentFor('gym', [], goal)) : equipmentFor(place, picks, goal)
  const profile = {
    experienceLevel: experience,
    focusAreas: ALL_REGIONS,
    trainOthers: true,
    equipment,
    daysPerWeek: days.length,
    sessionLength,
    goals: GOAL_BY_ID[goal]?.goals || ['general'],
    progressionMethod: experience === 'new' ? 'linear' : DEFAULT_METHOD,
  }
  const answers = { goal, experience, place, days, picks, profile }
  const rec = useMemo(() => recommendPlan({ goal, experience, place, days: days.length, picks }), [goal, experience, place, days.length, picks])
  const option = chosen || rec.primary
  const isPlan = STEPS[step] === 'plan'
  const built = useMemo(
    () => (isPlan ? buildOption(option, answers) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isPlan, option, goal, experience, place, days, picks, sessionLength, gymCustom],
  )

  const canNext = STEPS[step] !== 'days' || (days.length >= 2 && days.length <= 6)
  const next = () => { if (canNext) setStep((s) => Math.min(STEPS.length - 1, s + 1)) }
  const back = () => {
    if (step === 0) navigate(loadPrograms().length ? '/programs' : '/today')
    else setStep((s) => s - 1)
  }
  // A single tap answers the question and moves on.
  const answerAndGo = (setter) => (v) => { setter(v); setChosen(null); setStep((s) => s + 1) }

  // Starting weights are worth asking only when the plan has barbell lifts and
  // the person isn't brand new (who starts at the bar regardless).
  const asksWeights = experience !== 'new' && !!built?.program?.days?.some((d) => d.exercises.some((e) => e.load !== false && usesBarbell(e)))

  const start = () => {
    if (!built) return
    if (built.setupPath) {
      navigate(built.setupPath, { state: { level: experience, days: days.length } })
      return
    }
    saveProfile({ ...profile, createdAt: existing?.createdAt || new Date().toISOString() })
    if (fresh && loadSettings().units !== units) saveSettings({ ...loadSettings(), units })
    const profileId = place === 'gym' ? 'gym' : 'home'
    saveProfileEquipment(profileId, equipment)
    setActiveProfile(profileId)
    if (asksWeights) {
      for (const l of STRENGTH_LIFTS) {
        const w = Number(strength[l.id])
        if (w > 0) saveMax(l.id, { oneRM: Math.round(estimate1RM(w, 5)), weight: w, reps: 5, rir: 0, units, name: l.label, fromOnboarding: true })
      }
    }
    if (goal === 'skills') setSkillTreeAdded(true)
    // Rebuild now that any numbers are saved, so the weights use them.
    const fresher = buildOption(option, answers)
    const program = seedProgramWeights({ ...fresher.program, progressionMethod: profile.progressionMethod }, { maxes: loadMaxes(), units })
    const made = addProgram(program)
    toast.show(`${made.name} is ready — your first workout is on Today`)
    navigate('/today')
  }

  const startLightCopy = place === 'none'
    ? 'Everything uses your bodyweight, with easier versions of the harder moves to start.'
    : place === 'home'
      ? 'We’ll start with light weights. The first week should feel easy — that’s on purpose.'
      : `We’ll start at the empty bar (${units === 'kg' ? 20 : 45} ${units}) and light dumbbells. The first week should feel easy — that’s on purpose.`

  const optionLabel = (o) => (o.kind === 'template' ? TEMPLATE_BY_ID[o.templateId]?.name
    : o.kind === 'bone' ? 'Bone Strength' : `${generatedName({ goal, days: days.length })} (made for you)`)
  const optionHint = (o) => (o.kind === 'template' ? TEMPLATE_BY_ID[o.templateId]?.bestFor
    : o.kind === 'bone' ? 'For osteopenia, osteoporosis and healthy bones'
      : 'Built for exactly your days, time and equipment')

  return (
    <section className="page full-flow onboarding">
      <header className="page-header">
        <div className="onb-head-row">
          <p className="eyebrow">{isPlan ? 'Your plan' : `Question ${step + 1} of ${STEPS.length - 1}`}</p>
          {step === 0 && (
            <button type="button" className="skip-link" onClick={() => navigate('/templates')}>
              I know which program I want →
            </button>
          )}
        </div>
        <div className="progress-track" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </header>

      <div className="step-body">
        {STEPS[step] === 'goal' && (
          <>
            <h1>What do you want from training?</h1>
            <p className="muted">Pick the closest. You can change your plan any time.</p>
            <div className="choice-list">
              {ONBOARDING_GOALS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={'choice-row' + (goal === g.id ? ' is-selected' : '')}
                  aria-pressed={goal === g.id}
                  onClick={() => answerAndGo(setGoal)(g.id)}
                >
                  <span className="choice-title">{g.label}</span>
                  <span className="muted small">{g.hint}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {STEPS[step] === 'experience' && (
          <>
            <h1>How long have you been lifting?</h1>
            <p className="muted">This sets how much work you start with and how quickly the weights go up.</p>
            <div className="choice-list">
              {EXPERIENCE_LEVELS.map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  className={'choice-row' + (experience === lvl.id ? ' is-selected' : '')}
                  aria-pressed={experience === lvl.id}
                  onClick={() => answerAndGo(setExperience)(lvl.id)}
                >
                  <span className="choice-title">{lvl.label}</span>
                  <span className="muted small">{lvl.hint}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {STEPS[step] === 'place' && (
          <>
            <h1>Where will you train?</h1>
            <div className="choice-list">
              {TRAIN_PLACES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={'choice-row' + (place === p.id ? ' is-selected' : '')}
                  aria-pressed={place === p.id}
                  onClick={() => { setPlace(p.id); setChosen(null) }}
                >
                  <span className="choice-title">{p.label}</span>
                  <span className="muted small">{p.hint}</span>
                </button>
              ))}
            </div>

            {place !== 'gym' && (
              <div>
                <p className="group-label">{place === 'home' ? 'What do you have?' : 'Anything at all?'}</p>
                <div className="check-grid">
                  {(place === 'home' ? HOME_GEAR : HOME_GEAR.filter((g) => g.id === 'pullup_bar' || g.id === 'bands')).map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      className={'check-pill' + (picks.includes(g.id) ? ' is-selected' : '')}
                      aria-pressed={picks.includes(g.id)}
                      onClick={() => { setPicks((x) => toggle(x, g.id)); setChosen(null) }}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <details className="equip-more">
              <summary>{place === 'gym' ? 'Not a full gym? Edit the equipment list' : 'Something else? Full equipment list'}</summary>
              {EQUIPMENT_GROUPS.map((g) => (
                <div className="equip-group" key={g.group}>
                  <p className="group-label">{g.group}</p>
                  <div className="check-grid">
                    {g.items.map((item) => {
                      const on = equipment.includes(item.id)
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={'check-pill' + (on ? ' is-selected' : '')}
                          aria-pressed={on}
                          onClick={() => {
                            setChosen(null)
                            if (place === 'gym') setGymCustom((c) => toggle(c ?? equipment, item.id))
                            else setPicks((x) => toggle(x, item.id))
                          }}
                        >
                          {item.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </details>
          </>
        )}

        {STEPS[step] === 'days' && (
          <>
            <h1>Which days can you train?</h1>
            <p className="muted">Two to four days is plenty to get stronger. Pick the days that usually work.</p>
            <div className="check-grid weekday-chips" role="group" aria-label="Training days">
              {WEEKDAY_ORDER.map((wd) => (
                <button
                  key={wd}
                  type="button"
                  className={'check-pill' + (days.includes(wd) ? ' is-selected' : '')}
                  aria-pressed={days.includes(wd)}
                  onClick={() => { setDays((d) => toggle(d, wd)); setChosen(null) }}
                >
                  {WEEKDAY_SHORT[wd]}
                </button>
              ))}
            </div>
            <p className="muted small" role="status">
              {days.length < 2 ? 'Pick at least two days.' : days.length > 6 ? 'Pick six days or fewer — your body needs a rest day.' : `${days.length} days a week.`}
            </p>

            <p className="group-label">About how long per session?</p>
            <div className="seg">
              {SESSION_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={'seg-item' + (sessionLength === m ? ' is-selected' : '')}
                  aria-pressed={sessionLength === m}
                  onClick={() => setSessionLength(m)}
                >
                  {m}m
                </button>
              ))}
            </div>

            {fresh && (
              <>
                <p className="group-label">Weights in</p>
                <div className="seg seg-sm" role="group" aria-label="Weight units" style={{ alignSelf: 'flex-start' }}>
                  {['lbs', 'kg'].map((u) => (
                    <button key={u} type="button" className={'seg-item' + (units === u ? ' is-selected' : '')} aria-pressed={units === u} onClick={() => setUnits(u)} style={{ minWidth: 64 }}>
                      {u}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {isPlan && built && (
          <>
            <h1>{built.name}</h1>
            <p className="muted">{whyLine({ goal, experience, place, days: days.length })}</p>

            <div className="card plan-summary">
              {built.titles.length > 0 && (
                <>
                  <p className="group-label">Your week</p>
                  <ul className="plan-week">
                    {built.titles.map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                  {built.program?.schedule?.mode === 'rotation' && (
                    <p className="muted small">
                      These take turns on {byWeekOrder(days).map((d) => WEEKDAY_SHORT[d]).join(', ')}. Miss a day and the next workout just waits for you.
                    </p>
                  )}
                </>
              )}
              {built.info && <p className="muted small"><strong>How it progresses:</strong> {built.info}</p>}
            </div>

            {!built.setupPath && (
              asksWeights ? (
                <div className="card setup-weights">
                  <p className="group-label">Starting weights <span className="muted">(optional, {units})</span></p>
                  <p className="muted small">A weight you could lift about 5 times. Not sure? Leave it blank and we&apos;ll start light — you can change any weight mid-workout.</p>
                  {STRENGTH_LIFTS.map((l) => (
                    <div className="strength-row" key={l.id}>
                      <label className="strength-label" htmlFor={`onb-${l.id}`}>{l.label}</label>
                      <input
                        id={`onb-${l.id}`}
                        type="number"
                        inputMode="decimal"
                        className="text-input"
                        min="0"
                        placeholder="blank = start light"
                        value={strength[l.id] ?? ''}
                        onChange={(e) => setStrength((s) => ({ ...s, [l.id]: acceptNumber(e.target.value, s[l.id] ?? '', { max: maxWeight() }) }))}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted small">{startLightCopy}</p>
              )
            )}

            {rec.alts.length > 0 && (
              <div className="plan-alts">
                <p className="group-label">Your options</p>
                <div className="choice-list">
                  {[rec.primary, ...rec.alts].map((o) => {
                    const key = o.templateId || o.kind
                    const on = (option.templateId || option.kind) === key
                    return (
                      <button
                        key={key}
                        type="button"
                        className={'choice-row' + (on ? ' is-selected' : '')}
                        aria-pressed={on}
                        onClick={() => setChosen(o)}
                      >
                        <span className="choice-title">
                          {optionLabel(o)}{o === rec.primary && <span className="rec-badge">Our pick</span>}
                        </span>
                        <span className="muted small">{optionHint(o)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            <p className="muted small">
              Rather pick for yourself?{' '}
              <button type="button" className="link-btn" onClick={() => navigate('/templates')}>Browse all programs</button>
              {' · '}
              <button type="button" className="link-btn" onClick={() => navigate('/builder')}>Build my own</button>
            </p>
          </>
        )}
      </div>

      <div className="flow-actions">
        <button type="button" className="btn btn-ghost" onClick={back}>{step === 0 ? 'Cancel' : 'Back'}</button>
        {isPlan ? (
          <button type="button" className="btn btn-primary" onClick={start} disabled={!built}>
            {built?.setupPath ? (built.setupLabel || 'Continue setup') : 'Start my plan'}
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={next} disabled={!canNext}>Next</button>
        )}
      </div>
    </section>
  )
}
