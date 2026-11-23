import { Fragment, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GOALS, AREAS, AREA_BY_ID, GOAL_BY_ID, TESTS, UNIT_WORD, SAFETY_QUESTIONS, TIME_OPTIONS, DAYS_OPTIONS, LEVELS, MOVES,
  PROGRAMS, PROGRAM_BY_ID, PAIN_CHIPS,
} from '../data/mobility.js'
import { EXERCISE_BY_ID } from '../data/exercises.js'
import {
  areasFor, buildSession, blockInfo, testsFor, testProgress, asymmetry, sessionsThisWeek, weekStreak,
  sorenessDue, progressMove, NOTE_TEXT, allowedMove, BLOCK_WEEKS, doseLine, formatTest,
  exposuresPerWeek, planSignature, mobilityEquipment, swapChoices,
  programExposures, programLength, fullLengths, planAreas, primersThisWeek, minutesText,
} from '../lib/mobility.js'
import { loadMobility, updateMobility, removeMobility, loadSettings, loadMobilityActive, clearMobilityActive } from '../lib/storage.js'
import { getEquipment, profileMeta } from '../lib/equipment.js'
import MuscleMap from '../components/MuscleMap.jsx'
import { useToast } from '../components/Toast.jsx'

const MAX_GOALS = 3
const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

function StepTitle({ step, total, children }) {
  return (
    <header className="page-header">
      <p className="eyebrow">Mobility · {step} of {total}</p>
      {children}
    </header>
  )
}

// ---- Ready-made programs --------------------------------------------------
const lengthTags = (p) => (p.id === 'climbing' ? ['10-min primer', '30 or 45 min'] : fullLengths(p.id).map((l) => l.label))
function ProgramCards({ selected, onPick }) {
  return (
    <div className="mob-goal-grid mob-programs">
      {PROGRAMS.map((p) => {
        const on = selected === p.id
        return (
          <button key={p.id} type="button" className={'mob-goal mob-program' + (on ? ' is-selected' : '')} aria-pressed={on} onClick={() => onPick(p.id)}>
            <span className="choice-title">{p.label}</span>
            <span className="muted small">{p.blurb}</span>
            <span className="mob-area-tags">{lengthTags(p).map((t) => <span key={t} className="tag">{t}</span>)}</span>
          </button>
        )
      })}
    </div>
  )
}
// Picking a program: its shortest full length to start, the matching
// sessions a week; switching back to the same program keeps where you were.
function withProgram(d, id) {
  const prog = PROGRAM_BY_ID[id]
  const same = d.program?.id === id
  const len = same ? d.program.len : fullLengths(id)[0].min
  const length = programLength({ program: { id, len }, flags: d.flags })
  const climbDays = same ? d.program.climbDays : prog.climbDays?.def
  const perWeek = same ? d.perWeek : (prog.perWeekByClimbDays?.[climbDays] ?? length.perWeek?.def ?? 3)
  return { ...d, perWeek, program: { day: 0, ...(same ? d.program : {}), id, len, ...(climbDays ? { climbDays } : {}) } }
}

// ---- Setup: what to work on --------------------------------------------
function Picker({ draft, setDraft, onNext, onCancel }) {
  const [tab, setTab] = useState(draft.program ? 'programs' : draft.goals.length || !draft.areas.length ? 'goals' : 'areas')
  const covered = areasFor({ ...draft, avoidAreas: [] })
  const prog = PROGRAM_BY_ID[draft.program?.id]
  const can = !!prog || covered.length > 0
  return (
    <section className="page full-flow mobility">
      <StepTitle step={1} total={3}><h1>What do you want your body to do?</h1></StepTitle>
      <div className="step-body">
        <div className="seg" role="tablist" aria-label="Choose by">
          <button type="button" role="tab" className={'seg-item' + (tab === 'programs' ? ' is-selected' : '')} aria-selected={tab === 'programs'} onClick={() => setTab('programs')}>Programs</button>
          <button type="button" role="tab" className={'seg-item' + (tab === 'goals' ? ' is-selected' : '')} aria-selected={tab === 'goals'} onClick={() => setTab('goals')}>Goals</button>
          <button type="button" role="tab" className={'seg-item' + (tab === 'areas' ? ' is-selected' : '')} aria-selected={tab === 'areas'} onClick={() => setTab('areas')}>By area</button>
        </div>
        {tab === 'programs' ? (
          <>
            <p className="muted small">A complete plan, ready to go. Or build your own from goals or areas.</p>
            <ProgramCards selected={draft.program?.id} onPick={(id) => setDraft((d) => (d.program?.id === id ? { ...d, program: null } : withProgram(d, id)))} />
          </>
        ) : tab === 'goals' ? (
          <>
            {prog && <p className="muted small mob-warn">Picking a goal replaces the {prog.label} program.</p>}
            <p className="muted small">Pick up to {MAX_GOALS}.</p>
            <div className="mob-goal-grid">
              {GOALS.map((g) => {
                const on = draft.goals.includes(g.id)
                const full = !on && draft.goals.length >= MAX_GOALS
                return (
                  <button
                    key={g.id}
                    type="button"
                    className={'mob-goal' + (on ? ' is-selected' : '')}
                    aria-pressed={on}
                    disabled={full}
                    onClick={() => setDraft((d) => ({ ...d, program: null, goals: toggle(d.goals, g.id) }))}
                  >
                    <span className="choice-title">{g.label}</span>
                    <span className="muted small">{g.blurb}</span>
                    <span className="mob-area-tags">{g.areas.map((a) => <span key={a} className="tag">{AREA_BY_ID[a].label}</span>)}</span>
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <>
            {prog && <p className="muted small mob-warn">Picking an area replaces the {prog.label} program.</p>}
            <p className="muted small">Pick the areas yourself. Goals you chose are already included.</p>
            <div className="choice-chips">
              {AREAS.filter((a) => !a.programOnly).map((a) => {
                const fromGoal = areasFor({ goals: draft.goals }).includes(a.id)
                const on = fromGoal || draft.areas.includes(a.id)
                return (
                  <button
                    key={a.id}
                    type="button"
                    className={'chip' + (on ? ' is-selected' : '')}
                    aria-pressed={on}
                    disabled={fromGoal}
                    title={fromGoal ? 'Part of a goal you picked' : undefined}
                    onClick={() => setDraft((d) => ({ ...d, program: null, areas: toggle(d.areas, a.id) }))}
                  >
                    {a.label}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
      <p className="muted small mob-budget" role="status">
        {prog ? `${prog.label} — next, pick how long.`
          : !can ? 'Pick a program, a goal or an area to continue.'
            : `${covered.length} area${covered.length === 1 ? '' : 's'}${covered.length > 3 ? ' — fewer areas means each gets more work and faster results' : ''}.`}
      </p>
      <div className="flow-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={onNext} disabled={!can}>Next</button>
      </div>
    </section>
  )
}

function Choice({ options, value, onPick, label }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.v} type="button" className={'seg-item' + (value === o.v ? ' is-selected' : '')} aria-pressed={value === o.v} onClick={() => onPick(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

// A program's length, sessions a week and (climbing) climbing days + pain.
function ProgramSetup({ draft, setDraft }) {
  const prog = PROGRAM_BY_ID[draft.program.id]
  const flags = draft.flags || {}
  const length = programLength(draft)
  const lens = fullLengths(prog.id).filter((l) => !(flags.pregnant && l.min > 60))
  const setProgram = (patch, more = {}) => setDraft((d) => ({ ...d, ...more, program: { ...d.program, ...patch } }))
  const per = programExposures(draft, draft.perWeek)
  const pain = draft.program.pain || []
  const climbing = prog.id === 'climbing'
  return (
    <>
      <p className="group-label">{climbing ? 'Full session length' : 'Session length'}</p>
      <Choice
        label="Session length"
        value={length.min}
        onPick={(v) => setProgram({ len: v }, climbing ? {} : { perWeek: fullLengths(prog.id).find((l) => l.min === v)?.perWeek?.def ?? 3 })}
        options={lens.map((l) => ({ v: l.min, label: l.label }))}
      />
      {length.note && <p className="muted small">{length.note}</p>}
      {flags.pregnant && <p className="muted small">Pregnant: sessions stay at an hour or less.</p>}
      {draft.level === 'new' && length.min >= 90 && (
        <p className="muted small">New to this? A few weeks at 30 or 60 minutes first makes the long sessions much easier — the moves will be familiar.</p>
      )}
      {climbing && (
        <>
          <p className="group-label">Days you climb a week</p>
          <Choice label="Days you climb a week" value={draft.program.climbDays} onPick={(v) => setProgram({ climbDays: v }, { perWeek: prog.perWeekByClimbDays[v] ?? draft.perWeek })} options={prog.climbDays.options.map((n) => ({ v: n, label: `${n}` }))} />
        </>
      )}
      <p className="group-label">{climbing ? 'Full sessions a week (rest days)' : 'Sessions a week'}</p>
      <Choice label="Sessions a week" value={draft.perWeek} onPick={(v) => setDraft((d) => ({ ...d, perWeek: v }))} options={(length.perWeek?.options || DAYS_OPTIONS).map((n) => ({ v: n, label: `${n}×` }))} />
      <p className="muted small" role="status">
        {climbing
          ? 'Plus a 10-minute primer before you climb, and a 20-minute session for after climbing when you want one.'
          : per >= 2 ? `Each area about ${per}× a week — what counts is about 10 minutes per area each week.`
            : 'Each area about once a week — enough to keep your range. Add a day to build more.'}
      </p>
      {climbing && (
        <>
          <p className="group-label">Any pain when you climb?</p>
          <div className="choice-chips">
            {PAIN_CHIPS.map((c) => {
              const on = pain.includes(c.id)
              return <button key={c.id} type="button" className={'chip' + (on ? ' is-selected' : '')} aria-pressed={on} onClick={() => setProgram({ pain: toggle(pain, c.id) })}>{c.label}</button>
            })}
          </div>
          {PAIN_CHIPS.filter((c) => pain.includes(c.id)).map((c) => <p key={c.id} className="muted small">{c.note}</p>)}
          {!pain.length && <p className="muted small">None? Leave these off. This plan works the muscles climbing doesn&apos;t — it doesn&apos;t protect fingers; sensible loading does.</p>}
        </>
      )}
    </>
  )
}

function Setup({ draft, setDraft, onBack, onNext }) {
  const flags = draft.flags || {}
  const setFlag = (id, v) => setDraft((d) => ({ ...d, flags: { ...d.flags, [id]: v } }))
  const answered = SAFETY_QUESTIONS.every((q) => typeof flags[q.id] === 'boolean' || flags[q.id] === 'unsure')
  const prog = PROGRAM_BY_ID[draft.program?.id]
  const ready = answered && draft.consent
  return (
    <section className="page full-flow mobility">
      <StepTitle step={2} total={3}><h1>{prog ? prog.label : 'How much time, and a quick safety check'}</h1></StepTitle>
      <div className="step-body">
        {prog ? <ProgramSetup draft={draft} setDraft={setDraft} /> : (<>
        <p className="group-label">Time per session</p>
        <Choice label="Time per session" value={draft.minutes} onPick={(v) => setDraft((d) => ({ ...d, minutes: v }))} options={TIME_OPTIONS.map((t) => ({ v: t.min, label: t.label }))} />
        <p className="group-label">Sessions a week</p>
        <Choice label="Sessions a week" value={draft.perWeek} onPick={(v) => setDraft((d) => ({ ...d, perWeek: v }))} options={DAYS_OPTIONS.map((n) => ({ v: n, label: `${n}×` }))} />
        {(() => {
          const n = areasFor(draft).length
          const per = exposuresPerWeek(n, draft.minutes, draft.perWeek)
          return (
            <p className={'muted small' + (per < 2 ? ' mob-warn' : '')} role="status">
              Each area about {per}× a week. What counts is total time — about 10 minutes per area each week; 2–3 sessions is the easy way to get there.
              {per < 2 && ' Pick more time or more sessions, or fewer goals.'}
            </p>
          )
        })()}
        </>)}
        <p className="group-label">What do you have?</p>
        {(() => {
          const e = getEquipment()
          return (
            <Choice
              label="Equipment"
              value={draft.gear || e.active}
              onPick={(v) => setDraft((d) => ({ ...d, gear: v }))}
              options={[
                { v: 'gym', label: `${profileMeta('gym').name} gear` },
                { v: 'home', label: `${profileMeta('home').name} gear` },
                { v: 'none', label: 'Nothing' },
              ]}
            />
          )
        })()}
        <p className="muted small">Uses your Gym or Home equipment list from Settings. “Nothing” keeps it to bodyweight and a wall{prog?.id === 'climbing' ? ' — a rubber band and a pull-up bar cover most of the climbing plan' : ''}.</p>
        <p className="group-label">Experience</p>
        <div className="choice-list">
          {LEVELS.map((l) => (
            <button key={l.id} type="button" className={'choice-row' + (draft.level === l.id ? ' is-selected' : '')} aria-pressed={draft.level === l.id} onClick={() => setDraft((d) => ({ ...d, level: l.id }))}>
              <span className="choice-title">{l.label}</span>
              <span className="muted small">{l.hint}</span>
            </button>
          ))}
        </div>

        <p className="group-label">Safety check</p>
        <div className="mob-safety">
          {SAFETY_QUESTIONS.map((q) => (
            <div className="mob-safety-row" key={q.id}>
              <div>
                <p className="choice-title">{q.q}</p>
                {q.hint && <p className="muted small">{q.hint}</p>}
              </div>
              <Choice label={q.q} value={flags[q.id]} onPick={(v) => setFlag(q.id, v)} options={[{ v: false, label: 'No' }, { v: 'unsure', label: 'Not sure' }, { v: true, label: 'Yes' }]} />
            </div>
          ))}
        </div>
        {Object.values(flags).includes('unsure') && <p className="muted small">“Not sure” counts as yes — we play it safe. Worth asking your doctor or physio.</p>}
        {flags.injury && (
          <div className="card notice rehab-redflags">
            <p className="group-label">See someone first</p>
            <p className="muted small">Loading an injured or recently operated area is a job for a physio. For a sore joint, the Recovery routines are gentler and built for exactly that.</p>
            <p className="muted small">Which area is it? We&apos;ll leave it out.</p>
            <div className="choice-chips">
              {planAreas({ ...draft, avoidAreas: [] }).map((a) => {
                const on = (draft.avoidAreas || []).includes(a)
                return (
                  <button key={a} type="button" className={'chip' + (on ? ' is-selected' : '')} aria-pressed={on} onClick={() => setDraft((d) => ({ ...d, avoidAreas: toggle(d.avoidAreas || [], a) }))}>
                    {AREA_BY_ID[a].label}
                  </button>
                )
              })}
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => window.location.assign('#/recovery')}>Open Recovery</button>
          </div>
        )}
        {(flags.bone || flags.pregnant || flags.bendy) && (
          <p className="muted small">
            We&apos;ll adjust quietly:{' '}
            {[flags.bone && 'no loaded rounding or twisting of the spine (bone density)', flags.pregnant && 'gentler holds, nothing lying flat, no loaded rounding or hard lowering work (pregnancy)', flags.bendy && 'shorter stretches and more strength at the end of your range (very bendy)'].filter(Boolean).join('; ')}.
          </p>
        )}
        <label className="consent-row">
          <input type="checkbox" checked={!!draft.consent} onChange={(e) => setDraft((d) => ({ ...d, consent: e.target.checked }))} />
          <span className="muted small">I&apos;ll aim for a strong stretch, never pain — and stop if anything is sharp, pinching or tingling.</span>
        </label>
      </div>
      {!ready && <p className="muted small" role="status" style={{ textAlign: 'center', margin: 0 }}>{!answered ? 'Answer the four questions to continue.' : 'Tick the box to continue.'}</p>}
      <div className="flow-actions">
        <button type="button" className="btn btn-ghost" onClick={onBack}>Back</button>
        <button type="button" className="btn btn-primary" onClick={onNext} disabled={!ready}>Next</button>
      </div>
    </section>
  )
}

// ---- Self-test entry ------------------------------------------------------
function TestInput({ testId, value, onChange }) {
  const t = TESTS[testId]
  if (t.unit === 'level') {
    return (
      <div className="choice-list">
        {t.levels.map((label, i) => (
          <button key={i} type="button" className={'choice-row' + (value === i ? ' is-selected' : '')} aria-pressed={value === i} onClick={() => onChange(i)}>
            <span className="choice-title">{label}</span>
          </button>
        ))}
      </div>
    )
  }
  const stepper = (v, set, label) => (
    <div className="mob-stepper" role="group" aria-label={label}>
      <span className="muted small">{label}</span>
      <div className="rest-stepper">
        <button type="button" onClick={() => set((Number(v) || 0) - 1)} aria-label={`${label}: one less`} disabled={!t.signed && (Number(v) || 0) <= 0}>–</button>
        <span className="mob-step-val">{v == null ? 'tap ±' : (t.signed && v > 0 ? `+${v}` : v)}</span>
        <button type="button" onClick={() => set((Number(v) || 0) + 1)} aria-label={`${label}: one more`}>+</button>
      </div>
    </div>
  )
  // Quick picks for a stiff first check-in: no tapping ten times to −10.
  const quick = testId === 'toe_touch' && (
    <div className="choice-chips mob-quick">
      {[[-12, 'Mid-shin'], [-6, 'Ankles'], [-2, 'Just short'], [0, 'Touch the floor'], [4, 'Palms flat']].map(([n, label]) => (
        <button key={n} type="button" className={'chip' + (value === n ? ' is-selected' : '')} aria-pressed={value === n} onClick={() => onChange(n)}>{label}</button>
      ))}
    </div>
  )
  if (t.sides) {
    const v = value && typeof value === 'object' ? value : {}
    return (
      <div className="mob-sides">
        {stepper(v.L, (n) => onChange({ ...v, L: n }), 'Left')}
        {stepper(v.R, (n) => onChange({ ...v, R: n }), 'Right')}
      </div>
    )
  }
  return <>{quick}{stepper(value, onChange, UNIT_WORD[t.unit])}</>
}

function CheckIn({ tests, existing, onSave, onSkip, title, step }) {
  const [vals, setVals] = useState({})
  const done = (id) => {
    const v = vals[id]
    if (v == null) return false
    if (TESTS[id].sides) return Number.isFinite(v.L) && Number.isFinite(v.R)
    return true
  }
  const any = tests.some(done)
  return (
    <section className="page full-flow mobility">
      {step ? <StepTitle step={step} total={3}><h1>{title}</h1></StepTitle> : <header className="page-header"><p className="eyebrow">Mobility</p><h1>{title}</h1></header>}
      <div className="step-body">
        <p className="muted small">Best after a short warm-up · same time of day each check-in · best of 2 tries. A finger width is about 2 cm. Not warm? Skip and check in after your first session.</p>
        {tests.map((id) => {
          const t = TESTS[id]
          const prev = existing?.[id]?.at(-1)
          return (
            <div className="card mob-test" key={id}>
              <p className="day-title">{t.label}</p>
              <ol className="mob-how">{t.how.map((line, i) => <li key={i} className="muted small">{line}</li>)}</ol>
              <TestInput testId={id} value={vals[id]} onChange={(v) => setVals((s) => ({ ...s, [id]: v }))} />
              {prev && <p className="muted small">Last time: {formatTest(id, prev.v)}</p>}
            </div>
          )
        })}
      </div>
      <div className="flow-actions">
        <button type="button" className="btn btn-ghost" onClick={onSkip}>{step ? 'Skip — test later' : 'Cancel'}</button>
        <button type="button" className="btn btn-primary" onClick={() => onSave(Object.fromEntries(tests.filter(done).map((id) => [id, vals[id]])))} disabled={!any}>Save</button>
      </div>
    </section>
  )
}

// Long, multi-part sessions fold the full move list away so Start stays close.
function MoveList({ open, count, children }) {
  if (open) return children
  return (
    <details className="mob-all">
      <summary>See all {count} moves</summary>
      {children}
    </details>
  )
}

const DEFAULT_DRAFT = { goals: [], areas: [], minutes: 25, perWeek: 3, level: 'new', flags: {}, consent: false, program: null }

export default function Mobility() {
  const navigate = useNavigate()
  const toast = useToast()
  const [, setTick] = useState(0)
  const refresh = () => setTick((n) => n + 1)
  const mob = loadMobility()
  const configured = !!(mob?.added && (mob.program || mob.goals?.length || mob.areas?.length))
  const [modeState, setMode] = useState(configured ? 'home' : 'intro')
  // Removed elsewhere (or never set up): the home screen has nothing to show.
  const mode = modeState === 'home' && !configured ? 'intro' : modeState
  const [draft, setDraft] = useState(() => ({ ...DEFAULT_DRAFT, ...(mob ? { goals: mob.goals || [], areas: mob.areas || [], minutes: mob.minutes || 25, perWeek: mob.perWeek || 3, level: mob.level || 'new', flags: mob.flags || {}, consent: !!mob.consent, program: mob.program || null, gear: mob.gear, avoidAreas: mob.avoidAreas || [] } : {}) }))
  const prog = PROGRAM_BY_ID[mob?.program?.id]
  const units = loadSettings().units === 'kg' ? 'kg' : 'lbs'
  const equipment = useMemo(() => mobilityEquipment(mob || {}), [mob?.gear]) // eslint-disable-line react-hooks/exhaustive-deps

  const finishSetup = (tests) => {
    const now = new Date().toISOString()
    clearMobilityActive() // an edited plan never resumes the old session
    updateMobility((m) => {
      const changedLevel = m.level && m.level !== draft.level
      const fresh = { v: 1, moves: {}, log: [], avoid: [], prefer: {}, notes: {}, pointer: 0 }
      return {
        ...fresh,
        ...m,
        ...draft,
        avoidAreas: draft.flags?.injury ? (draft.avoidAreas || []).filter((a) => planAreas(draft).includes(a)) : [],
        // A different program (or none) starts its days from the top.
        program: draft.program ? { ...draft.program, day: m.program?.id === draft.program.id ? (m.program.day || 0) : 0 } : null,
        rungs: changedLevel ? {} : (m.rungs || {}),
        added: true,
        startedAt: m.startedAt && m.added ? m.startedAt : now,
        tests: addTests(m.tests || {}, tests, now),
      }
    })
    setMode('home')
    refresh()
  }

  if (mode === 'intro') {
    return (
      <section className="page full-flow mobility">
        <header className="page-header">
          <div className="onb-head-row">
            <p className="eyebrow">Mobility</p>
            <button type="button" className="skip-link" onClick={() => navigate('/programs')}>‹ Plans</button>
          </div>
          <h1>Build strength through range</h1>
        </header>
        <div className="step-body">
          <div className="card welcome-hero">
            <MuscleMap pattern="hinge" size={120} />
            <p className="muted">Slow, weighted reps and holds that make you more flexible <em>and</em> stronger at the end of your range — 10 minutes to 2 hours, alongside your lifting.</p>
          </div>
          <p className="group-label">Ready-made programs</p>
          <ProgramCards onPick={(id) => { setDraft((d) => withProgram(d, id)); setMode('setup') }} />
          <p className="group-label">How it works</p>
          <ul className="why-list">
            <li><strong>Strength, not just stretch.</strong> Slow reps with a weight through your full range improve flexibility as much as holding stretches does — and build strength where you&apos;re weakest.</li>
            <li><strong>Enough, not endless.</strong> About 10 minutes per area a week is where gains level off — split however suits you.</li>
            <li><strong>Honest timeline.</strong> Weeks 1–3 mostly feel easier. Real range shows up around weeks 6–8.</li>
            <li><strong>You&apos;ll see it.</strong> Quick self-checks with no tools show real progress, not day-to-day wobble.</li>
          </ul>
        </div>
        <div className="flow-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Not now</button>
          <button type="button" className="btn btn-primary" onClick={() => setMode('pick')}>Build your own</button>
        </div>
      </section>
    )
  }
  if (mode === 'pick') return <Picker draft={draft} setDraft={setDraft} onCancel={() => setMode(configured ? 'home' : 'intro')} onNext={() => setMode('setup')} />
  // Straight to setup from a program card or "Edit plan"; Back goes to the picker.
  if (mode === 'setup') return <Setup draft={draft} setDraft={setDraft} onBack={() => setMode('pick')} onNext={() => (configured ? finishSetup({}) : setMode('first-check'))} />
  if (mode === 'first-check') {
    return <CheckIn step={3} title="Where are you starting?" tests={testsFor(draft)} existing={mob?.tests} onSkip={() => finishSetup({})} onSave={(vals) => finishSetup(vals)} />
  }
  if (mode === 'check') {
    return (
      <CheckIn
        title="Check-in"
        tests={testsFor(mob)}
        existing={mob.tests}
        onSkip={() => setMode('home')}
        onSave={(vals) => {
          const now = new Date().toISOString()
          updateMobility((m) => ({ ...m, tests: addTests(m.tests || {}, vals, now), lastCheck: now }))
          toast.show('Check-in saved')
          setMode('home')
        }}
      />
    )
  }

  // ---- Home ----
  const saved = loadMobilityActive()
  const resuming = !!(saved && saved.sig === planSignature(mob, saved.session?.mode === 'full' ? undefined : saved.session?.mode) && Date.now() - (saved.startedAt || 0) < 12 * 3600e3)
  // A session in progress is what "Continue" will run — show that one.
  const session = resuming ? { ...saved.session, minutes: saved.session.minutes } : buildSession(mob, { state: mob.moves || {}, equipment })
  const resumeMode = resuming && saved.session?.mode && saved.session.mode !== 'full' ? saved.session.mode : null
  const climbing = prog?.id === 'climbing'
  const primers = primersThisWeek(mob.log || [])
  const sessionPath = (m) => '/mobility/session' + (m ? `?mode=${m}` : '')
  const parts = (session.sections || []).filter((x) => x.live !== false)
  const block = blockInfo(mob.startedAt)
  const thisWeek = sessionsThisWeek(mob.log || [])
  const streak = weekStreak(mob.log || [], mob.perWeek || 3)
  const sore = sorenessDue(mob)
  const tests = testsFor(mob)
  const needsBaseline = tests.some((id) => !(mob.tests?.[id]?.length))
  const checkDue = block.easy && !(mob.lastCheck && Date.now() - new Date(mob.lastCheck).getTime() < 6 * 864e5)
  // Not in an easy week — nothing goes up then.
  const ready = block.easy ? [] : Object.entries(mob.notes || {}).filter(([, n]) => n === 'ready_next')

  const answerSore = (how) => {
    updateMobility((m) => {
      const last = m.log?.at(-1)
      const next = { ...m, soreCheckedFor: last?.d }
      if (how === 'sore' && last) {
        const moves = { ...(m.moves || {}) }
        for (const [id] of last.m || []) moves[id] = progressMove(id, moves[id] || {}, { feel: 'much' }, { units }).state
        next.moves = moves
      }
      return next
    })
    if (how === 'sore') toast.show('Got it — next session eases off those moves')
    refresh()
  }

  // The area the move was trained for (shared moves belong to more than one).
  const nextRung = (id) => {
    const area = AREA_BY_ID[mob.readyArea?.[id]] || AREAS.find((a) => a.ladder.includes(id))
    if (!area) return null
    const ladder = area.ladder.filter((x) => allowedMove(x, { flags: mob.flags, equipment, avoid: mob.avoid || [] }) && MOVES[x].kind === 'reps')
    const i = ladder.indexOf(id)
    return i >= 0 && i < ladder.length - 1 ? { area, next: ladder[i + 1], index: i + 1 } : null
  }
  const acceptNext = (id, yes) => {
    const nr = nextRung(id)
    updateMobility((m) => {
      const notes = { ...(m.notes || {}) }
      delete notes[id]
      const rungs = { ...(m.rungs || {}) }
      const prefer = { ...(m.prefer || {}) }
      if (yes && nr) {
        rungs[nr.area.id] = nr.index
        delete prefer[`${nr.area.id}:reps`] // a swap mustn't hide the new level
      }
      return { ...m, notes, rungs, prefer }
    })
    if (yes && nr) toast.show(`${EXERCISE_BY_ID[nr.next]?.name} replaces ${EXERCISE_BY_ID[id]?.name} for ${nr.area.label.toLowerCase()} from your next session`)
    refresh()
  }

  // Swap a move for the next one of the same kind in its area (remembered).
  const swapMove = (item) => {
    if (resuming) { toast.show('Finish or restart the session in progress first'); return }
    const choices = swapChoices(item, mob, equipment).filter((id) => !(prog?.exclude?.includes('heavy') && MOVES[id].heavy))
    if (!choices.length) { toast.show('No other option at your level with this equipment'); return }
    const current = mob.prefer?.[`${item.area}:${item.kind}`]
    const next = choices[(choices.indexOf(current) + 1) % choices.length]
    updateMobility((m) => ({ ...m, prefer: { ...(m.prefer || {}), [`${item.area}:${item.kind}`]: next } }))
    toast.show(`Swapped to ${EXERCISE_BY_ID[next]?.name}`)
    refresh()
  }

  return (
    <section className="page full-flow mobility">
      <header className="page-header">
        <div className="onb-head-row">
          <button type="button" className="skip-link" onClick={() => navigate('/programs')}>‹ Plans</button>
          <span className={'mob-week-chip' + (block.easy ? ' is-easy' : '')} title="Blocks of 4 weeks repeat: 3 building, 1 easy">{block.easy ? 'Easy week + check-in' : `Week ${block.week} of ${BLOCK_WEEKS}`}</span>
        </div>
        <h1>{prog ? prog.label : 'Strength through range'}</h1>
      </header>
      <div className="step-body">
        {sore && (
          <div className="card notice mob-sore">
            <p className="choice-title">How do your {(sore.a || []).map((a) => AREA_BY_ID[a]?.label.toLowerCase()).filter(Boolean).join(' and ') || 'muscles'} feel today?</p>
            <div className="mob-sore-row">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => answerSore('fine')}>Fine</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => answerSore('bit')}>A bit sore</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => answerSore('sore')}>Sore</button>
            </div>
          </div>
        )}

        {ready.map(([id]) => {
          const nr = nextRung(id)
          if (!nr) return null
          return (
            <div className="card notice mob-ready" key={id}>
              <p className="choice-title">Ready for {EXERCISE_BY_ID[nr.next]?.name}?</p>
              <p className="muted small">You&apos;ve outgrown {EXERCISE_BY_ID[id]?.name} — the next step for {nr.area.label.toLowerCase()}.</p>
              <div className="mob-sore-row">
                <button type="button" className="btn btn-primary btn-sm" onClick={() => acceptNext(id, true)}>Try it</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => acceptNext(id, false)}>Not yet</button>
              </div>
            </div>
          )
        })}

        <div className="card mob-next">
          <div className="mob-next-head">
            <div>
              <p className="group-label" style={{ margin: 0 }}>{resuming ? 'In progress' : 'Next session'}</p>
              <p className="day-title">{session.label || session.areas.map((a) => AREA_BY_ID[a]?.label).join(' · ')}</p>
              {session.label && parts.length < 2 && <p className="muted small">{session.areas.map((a) => AREA_BY_ID[a]?.label).join(' · ')}</p>}
            </div>
            <span className="muted small mob-min">~{minutesText(session.minutes)}</span>
          </div>
          {session.length >= 90 && <p className="muted small">Stop whenever you need to — past halfway still counts for the week. Water breaks are built in.</p>}
          {session.easy && <p className="muted small">Easy week: fewer sets, nothing goes up. Your body catches up — then check in.</p>}
          {parts.length > 1 && (
            <ul className="mob-parts">
              {parts.map((x) => {
                const n = session.items.filter((it) => it.s === session.sections.indexOf(x)).length
                return <li key={x.title}><span>{x.title}</span><span className="muted small">{n} move{n === 1 ? '' : 's'}{x.breakAfter ? ' · then a water break' : ''}</span></li>
              })}
            </ul>
          )}
          <MoveList open={parts.length < 2} count={session.items.length}>
          <ul className="exercise-preview mob-moves">
            {session.items.map((it, i) => {
              const ex = EXERCISE_BY_ID[it.id]
              const note = mob.notes?.[it.id]
              const live = (session.sections || []).filter((x) => x.live !== false)
              const head = live.length > 1 && it.s != null && session.items[i - 1]?.s !== it.s ? session.sections[it.s]?.title : null
              return (
                <Fragment key={it.id}>
                {head && <li className="mob-sec-head"><p className="group-label">{head}</p></li>}
                <li>
                  <MuscleMap pattern={ex.pattern} exId={ex.id} size={46} compact />
                  <span className="ex-name">
                    {ex.name}
                    <span className="ex-sub">{doseLine(it, units)}</span>
                    {note && note !== 'ready_next' && NOTE_TEXT[note] && <span className="ex-sub mob-note">{NOTE_TEXT[note]}</span>}
                  </span>
                  <button type="button" className="link-btn" onClick={() => swapMove(it)} aria-label={`Swap ${ex.name}`}>Swap</button>
                </li>
                </Fragment>
              )
            })}
          </ul>
          </MoveList>
          {session.items.length === 0 && <p className="muted small">Nothing fits your equipment for these areas yet — try “Edit plan”.</p>}
          <button type="button" className="btn btn-primary" onClick={() => navigate(sessionPath(resumeMode))} disabled={!session.items.length}>
            {resuming ? 'Continue session' : climbing ? 'Start full session' : 'Start session'}
          </button>
          {climbing && !resuming && (
            <div className="mob-climb-row">
              <button type="button" className="btn btn-ghost" onClick={() => navigate(sessionPath('primer'))}><span>Before I climb</span><span className="mob-btn-sub">10-min primer</span></button>
              <button type="button" className="btn btn-ghost" onClick={() => navigate(sessionPath('after'))}><span>After I climb</span><span className="mob-btn-sub">20 min, no hangs</span></button>
            </div>
          )}
          <p className="muted small mob-week-line">
            {thisWeek} of {mob.perWeek || 3} {climbing ? 'full sessions ' : ''}this week{climbing && primers ? ` · ${primers} primer${primers === 1 ? '' : 's'}` : ''}{streak > 0 ? ` · ${streak}-week streak` : ''}
          </p>
        </div>

        <div className="card mob-progress">
          <div className="mob-next-head">
            <p className="group-label" style={{ margin: 0 }}>Your range</p>
            <button type="button" className={'btn btn-sm ' + (checkDue || needsBaseline ? 'btn-primary' : 'btn-ghost')} onClick={() => setMode('check')}>Check in</button>
          </div>
          {(checkDue || needsBaseline) && <p className="muted small">{needsBaseline ? 'Log a starting point so you can see real progress later.' : 'Easy week — a good time to check in.'}</p>}
          {tests.map((id) => {
            const entries = mob.tests?.[id] || []
            const p = testProgress(id, entries)
            const last = entries.at(-1)
            const asym = last && asymmetry(id, last.v)
            const since = entries[0] && new Date(entries[0].d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            return (
              <div className="mob-test-row" key={id}>
                <p className="choice-title">{TESTS[id].label}</p>
                <p className="muted small">{last ? formatTest(id, last.v) : 'No check-in yet'}</p>
                {p.status === 'up' && <p className="small mob-up">Real progress since {since}.</p>}
                {p.status === 'steady' && <p className="muted small">Steady — day-to-day wobble is about one {TESTS[id].unit === 'level' ? 'level' : UNIT_WORD[TESTS[id].unit].replace(/s$/, '')}. Keep going.</p>}
                {p.status === 'down' && <p className="muted small">Tighter than when you started — sleep, soreness or time of day can do this. Check again next week.</p>}
                {asym && <p className="muted small">Your {asym.tighter} side is tighter — start with it.</p>}
              </div>
            )
          })}
        </div>

        <div className="card mob-plan">
          <p className="group-label">Your plan</p>
          <div className="tag-row">
            {prog && <span className="tag">{prog.label}</span>}
            {!prog && (mob.goals || []).map((g) => <span className="tag" key={g}>{GOAL_BY_ID[g]?.label}</span>)}
            {!prog && (mob.areas || []).map((a) => <span className="tag" key={a}>{AREA_BY_ID[a]?.label}</span>)}
          </div>
          <p className="muted small">
            {prog ? programLength(mob).label : `${mob.minutes} min`} · {mob.perWeek}× a week{climbing ? ` · climbing ${mob.program.climbDays}× a week` : ''} · {LEVELS.find((l) => l.id === mob.level)?.label}
          </p>
          <div className="mob-sore-row">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMode(prog ? 'setup' : 'pick')}>{prog ? 'Change length' : 'Edit plan'}</button>
            {prog && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMode('pick')}>Switch plan</button>}
            <button
              type="button"
              className="btn btn-ghost btn-sm danger"
              onClick={() => {
                removeMobility()
                toast.show('Mobility removed — your check-ins are kept', { actionLabel: 'Undo', onAction: () => { updateMobility({ added: true }); refresh() } })
                navigate('/programs')
              }}
            >
              Remove
            </button>
          </div>
          <details className="mob-why">
            <summary>How it works</summary>
            <ul className="why-list">
              <li>Each area starts with <strong>slow reps with a weight</strong>, lowering into the stretch — that builds range and strength together.</li>
              <li>Then a <strong>hold</strong>: a strong stretch, around 5–7 out of 10. Never sharp, pinching or tingling.</li>
              <li>Things go up <strong>one at a time</strong> — range, then time or reps, then weight — after two good sessions.</li>
              <li>Every 4th week is an <strong>easy week</strong> with a check-in.</li>
              <li>Early gains are mostly your body accepting more stretch; they fade if you stop. Once you&apos;re happy, once or twice a week helps keep it.</li>
            </ul>
          </details>
        </div>
      </div>
    </section>
  )
}

function addTests(prev, vals, d) {
  const out = { ...prev }
  for (const [id, v] of Object.entries(vals || {})) out[id] = [...(out[id] || []), { d, v }]
  return out
}
