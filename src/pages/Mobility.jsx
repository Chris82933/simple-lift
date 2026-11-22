import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GOALS, AREAS, AREA_BY_ID, GOAL_BY_ID, TESTS, UNIT_WORD, SAFETY_QUESTIONS, TIME_OPTIONS, DAYS_OPTIONS, LEVELS, MOVES,
} from '../data/mobility.js'
import { EXERCISE_BY_ID } from '../data/exercises.js'
import {
  areasFor, buildSession, blockInfo, testsFor, testProgress, asymmetry, sessionsThisWeek, weekStreak,
  sorenessDue, progressMove, NOTE_TEXT, allowedMove, timeOption, BLOCK_WEEKS, doseLine, formatTest,
} from '../lib/mobility.js'
import { loadMobility, updateMobility, removeMobility, loadSettings, loadMobilityActive } from '../lib/storage.js'
import { activeEquipmentIds } from '../lib/equipment.js'
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

// ---- Setup: what to work on --------------------------------------------
function Picker({ draft, setDraft, onNext, onCancel }) {
  const [tab, setTab] = useState(draft.goals.length || !draft.areas.length ? 'goals' : 'areas')
  const covered = areasFor(draft)
  const fit = timeOption(draft.minutes).areas
  const can = covered.length > 0
  return (
    <section className="page full-flow mobility">
      <StepTitle step={1} total={3}><h1>What do you want your body to do?</h1></StepTitle>
      <div className="step-body">
        <div className="seg" role="tablist" aria-label="Choose by">
          <button type="button" role="tab" className={'seg-item' + (tab === 'goals' ? ' is-selected' : '')} aria-selected={tab === 'goals'} onClick={() => setTab('goals')}>Goals</button>
          <button type="button" role="tab" className={'seg-item' + (tab === 'areas' ? ' is-selected' : '')} aria-selected={tab === 'areas'} onClick={() => setTab('areas')}>By area</button>
        </div>
        {tab === 'goals' ? (
          <>
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
                    onClick={() => setDraft((d) => ({ ...d, goals: toggle(d.goals, g.id) }))}
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
            <p className="muted small">Pick the areas yourself. Goals you chose are already included.</p>
            <div className="choice-chips">
              {AREAS.map((a) => {
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
                    onClick={() => setDraft((d) => ({ ...d, areas: toggle(d.areas, a.id) }))}
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
        {!can ? 'Pick a goal or an area to continue.'
          : covered.length <= fit ? `${covered.length} area${covered.length === 1 ? '' : 's'} — every session covers ${covered.length === 1 ? 'it' : 'them all'}.`
            : `${covered.length} areas — each session works ${fit} and rotates the rest. Fewer areas = faster results.`}
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

function Setup({ draft, setDraft, onBack, onNext }) {
  const flags = draft.flags || {}
  const setFlag = (id, v) => setDraft((d) => ({ ...d, flags: { ...d.flags, [id]: v } }))
  const answered = SAFETY_QUESTIONS.every((q) => typeof flags[q.id] === 'boolean')
  const ready = answered && draft.consent
  return (
    <section className="page full-flow mobility">
      <StepTitle step={2} total={3}><h1>How much time, and a quick safety check</h1></StepTitle>
      <div className="step-body">
        <p className="group-label">Time per session</p>
        <Choice label="Time per session" value={draft.minutes} onPick={(v) => setDraft((d) => ({ ...d, minutes: v }))} options={TIME_OPTIONS.map((t) => ({ v: t.min, label: t.label }))} />
        <p className="group-label">Sessions a week</p>
        <Choice label="Sessions a week" value={draft.perWeek} onPick={(v) => setDraft((d) => ({ ...d, perWeek: v }))} options={DAYS_OPTIONS.map((n) => ({ v: n, label: `${n}×` }))} />
        <p className="muted small">Three a week is the sweet spot — how often matters more than how long.</p>
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
              <Choice label={q.q} value={flags[q.id]} onPick={(v) => setFlag(q.id, v)} options={[{ v: false, label: 'No' }, { v: true, label: 'Yes' }]} />
            </div>
          ))}
        </div>
        {flags.injury && (
          <div className="card notice rehab-redflags">
            <p className="group-label">See someone first</p>
            <p className="muted small">Loading an injured or recently operated area is a job for a physio. For a sore joint, the Recovery routines are gentler and built for exactly that.</p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => window.location.assign('#/recovery')}>Open Recovery</button>
          </div>
        )}
        {(flags.bone || flags.pregnant || flags.bendy) && (
          <p className="muted small">
            We&apos;ll adjust quietly:{' '}
            {[flags.bone && 'no loaded rounding of the spine (bone density)', flags.pregnant && 'no loaded rounding or hard lowering work (pregnancy)', flags.bendy && 'shorter holds and more strength at the end of your range (very bendy)'].filter(Boolean).join('; ')}.
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
        <span className="mob-step-val">{v == null ? '—' : (t.signed && v > 0 ? `+${v}` : v)}</span>
        <button type="button" onClick={() => set((Number(v) || 0) + 1)} aria-label={`${label}: one more`}>+</button>
      </div>
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
  return stepper(value, onChange, UNIT_WORD[t.unit])
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
        <p className="muted small">Warm up first · same time of day each check-in · best of 2 tries. A finger width is about 2 cm.</p>
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

const DEFAULT_DRAFT = { goals: [], areas: [], minutes: 25, perWeek: 3, level: 'new', flags: {}, consent: false }

export default function Mobility() {
  const navigate = useNavigate()
  const toast = useToast()
  const [, setTick] = useState(0)
  const refresh = () => setTick((n) => n + 1)
  const mob = loadMobility()
  const configured = !!(mob?.added && (mob.goals?.length || mob.areas?.length))
  const [modeState, setMode] = useState(configured ? 'home' : 'intro')
  // Removed elsewhere (or never set up): the home screen has nothing to show.
  const mode = modeState === 'home' && !configured ? 'intro' : modeState
  const [draft, setDraft] = useState(() => ({ ...DEFAULT_DRAFT, ...(mob ? { goals: mob.goals || [], areas: mob.areas || [], minutes: mob.minutes || 25, perWeek: mob.perWeek || 3, level: mob.level || 'new', flags: mob.flags || {}, consent: !!mob.consent } : {}) }))
  const units = loadSettings().units === 'kg' ? 'kg' : 'lbs'
  const equipment = useMemo(() => new Set(activeEquipmentIds()), [])

  const finishSetup = (tests) => {
    const now = new Date().toISOString()
    updateMobility((m) => {
      const changedLevel = m.level && m.level !== draft.level
      const fresh = { v: 1, moves: {}, log: [], avoid: [], prefer: {}, notes: {}, pointer: 0 }
      return {
        ...fresh,
        ...m,
        ...draft,
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
          <p className="eyebrow">Mobility</p>
          <h1>Build strength through range</h1>
        </header>
        <div className="step-body">
          <div className="card welcome-hero">
            <MuscleMap pattern="hinge" size={120} />
            <p className="muted">Slow, loaded stretches that make you more flexible <em>and</em> stronger at the end of your range — 15 to 40 minutes, a few times a week, alongside your lifting.</p>
          </div>
          <ul className="why-list">
            <li><strong>Strength, not just stretch.</strong> Slow reps with a weight through your full range improve flexibility as much as holding stretches does — and build strength where you&apos;re weakest.</li>
            <li><strong>Little and often.</strong> Three short sessions a week beat one long one.</li>
            <li><strong>Honest timeline.</strong> Weeks 1–3 mostly feel easier. Real range shows up around weeks 6–8.</li>
            <li><strong>You&apos;ll see it.</strong> Quick self-checks with no tools show real progress, not day-to-day wobble.</li>
          </ul>
        </div>
        <div className="flow-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Not now</button>
          <button type="button" className="btn btn-primary" onClick={() => setMode('pick')}>Get started</button>
        </div>
      </section>
    )
  }
  if (mode === 'pick') return <Picker draft={draft} setDraft={setDraft} onCancel={() => setMode(configured ? 'home' : 'intro')} onNext={() => setMode('setup')} />
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
  const session = buildSession(mob, { state: mob.moves || {}, equipment })
  const block = blockInfo(mob.startedAt)
  const thisWeek = sessionsThisWeek(mob.log || [])
  const streak = weekStreak(mob.log || [], mob.perWeek || 3)
  const sore = sorenessDue(mob)
  const tests = testsFor(mob)
  const needsBaseline = tests.some((id) => !(mob.tests?.[id]?.length))
  const checkDue = block.easy && !(mob.lastCheck && Date.now() - new Date(mob.lastCheck).getTime() < 6 * 864e5)
  const resuming = loadMobilityActive()
  const ready = Object.entries(mob.notes || {}).filter(([, n]) => n === 'ready_next')

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

  const nextRung = (id) => {
    const area = AREAS.find((a) => a.ladder.includes(id))
    if (!area) return null
    const ladder = area.ladder.filter((x) => allowedMove(x, { flags: mob.flags, equipment, avoid: mob.avoid || [] }) && MOVES[x].kind === 'reps')
    const i = ladder.indexOf(id)
    return i >= 0 && i < ladder.length - 1 ? { area, next: ladder[i + 1] } : null
  }
  const acceptNext = (id, yes) => {
    const nr = nextRung(id)
    updateMobility((m) => {
      const notes = { ...(m.notes || {}) }
      delete notes[id]
      const rungs = { ...(m.rungs || {}) }
      if (yes && nr) rungs[nr.area.id] = (rungs[nr.area.id] ?? ({ new: 0, some: 1, flexible: 2 }[m.level] ?? 1)) + 1
      return { ...m, notes, rungs }
    })
    refresh()
  }

  // Swap a move for the next one of the same kind in its area (remembered).
  const swapMove = (item) => {
    const area = AREA_BY_ID[item.area]
    const same = area.ladder.filter((x) => MOVES[x].kind === item.kind && allowedMove(x, { flags: mob.flags, equipment, avoid: mob.avoid || [] }))
    if (same.length < 2) { toast.show('No other option for this one with your equipment'); return }
    const next = same[(same.indexOf(item.id) + 1) % same.length]
    updateMobility((m) => ({ ...m, prefer: { ...(m.prefer || {}), [`${item.area}:${item.kind}`]: next } }))
    toast.show(`Swapped to ${EXERCISE_BY_ID[next]?.name}`)
    refresh()
  }

  return (
    <section className="page full-flow mobility">
      <header className="page-header">
        <div className="onb-head-row">
          <p className="eyebrow">Mobility</p>
          <span className={'mob-week-chip' + (block.easy ? ' is-easy' : '')}>{block.easy ? 'Easy week + check-in' : `Week ${block.week} of ${BLOCK_WEEKS}`}</span>
        </div>
        <h1>Strength through range</h1>
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
              <p className="group-label" style={{ margin: 0 }}>Next session</p>
              <p className="day-title">{session.areas.map((a) => AREA_BY_ID[a]?.label).join(' · ')}</p>
            </div>
            <span className="muted small">~{session.minutes} min</span>
          </div>
          {session.easy && <p className="muted small">Easy week: fewer sets, nothing goes up. Your body catches up — then check in.</p>}
          <ul className="exercise-preview mob-moves">
            {session.items.map((it) => {
              const ex = EXERCISE_BY_ID[it.id]
              const note = mob.notes?.[it.id]
              return (
                <li key={it.id}>
                  <MuscleMap pattern={ex.pattern} exId={ex.id} size={46} compact />
                  <span className="ex-name">
                    {ex.name}
                    <span className="ex-sub">{doseLine(it, units)}</span>
                    {note && note !== 'ready_next' && NOTE_TEXT[note] && <span className="ex-sub mob-note">{NOTE_TEXT[note]}</span>}
                  </span>
                  <button type="button" className="link-btn" onClick={() => swapMove(it)} aria-label={`Swap ${ex.name}`}>Swap</button>
                </li>
              )
            })}
          </ul>
          {session.items.length === 0 && <p className="muted small">Nothing fits your equipment for these areas yet — try “Edit plan”.</p>}
          <button type="button" className="btn btn-primary" onClick={() => navigate('/mobility/session')} disabled={!session.items.length}>
            {resuming ? 'Continue session' : 'Start session'}
          </button>
          <p className="muted small mob-week-line">
            {thisWeek} of {mob.perWeek || 3} this week{streak > 0 ? ` · ${streak}-week streak` : ''}
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
            {(mob.goals || []).map((g) => <span className="tag" key={g}>{GOAL_BY_ID[g]?.label}</span>)}
            {(mob.areas || []).map((a) => <span className="tag" key={a}>{AREA_BY_ID[a]?.label}</span>)}
          </div>
          <p className="muted small">{mob.minutes} min · {mob.perWeek}× a week · {LEVELS.find((l) => l.id === mob.level)?.label}</p>
          <div className="mob-sore-row">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMode('pick')}>Edit plan</button>
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
              <li>Early gains are mostly your body accepting more stretch; they fade if you stop. Once you&apos;re happy, once a week keeps most of it.</li>
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
