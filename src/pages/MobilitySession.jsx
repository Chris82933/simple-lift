import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MOVES, AREA_BY_ID } from '../data/mobility.js'
import { EXERCISE_BY_ID } from '../data/exercises.js'
import {
  buildSession, buildSteps, progressMove, blockInfo, sessionsThisWeek, NOTE_TEXT, LOAD_STEP,
} from '../lib/mobility.js'
import {
  loadMobility, updateMobility, loadSettings, loadMobilityActive, saveMobilityActive, clearMobilityActive, currentBodyweight,
} from '../lib/storage.js'
import { activeEquipmentIds } from '../lib/equipment.js'
import { playRestDone, playTick } from '../lib/sound.js'
import { keepAwake, allowSleep } from '../lib/wakeLock.js'
import MuscleMap from '../components/MuscleMap.jsx'
import FormCheckButton from '../components/FormCheckButton.jsx'

const READY_SEC = 5 // "get into position" before a hold or a paced set
const SIDE_WORD = { L: 'Left side', R: 'Right side' }
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`
const buzz = (p) => { try { navigator.vibrate?.(p) } catch { /* no vibration */ } }
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Contract-relax ("go deeper") phases inside the last hold of a long session.
function pnfPhase(elapsed, total) {
  const cycle = 25
  const inCycle = elapsed % cycle
  const left = total - elapsed
  if (left <= 5) return { label: 'Relax and hold', push: false }
  return inCycle < 5 ? { label: 'Push gently into the stretch… 30% effort', push: true } : { label: 'Relax and sink a little deeper', push: false }
}

// Which phase of a paced rep we're in.
function repPhase(elapsed, tempo) {
  const len = tempo.down + tempo.pause + tempo.up
  const rep = Math.floor(elapsed / len)
  const t = elapsed - rep * len
  if (t < tempo.down) return { rep, phase: 'down', left: tempo.down - t, frac: t / tempo.down }
  if (t < tempo.down + tempo.pause) return { rep, phase: 'pause', left: tempo.down + tempo.pause - t, frac: (t - tempo.down) / Math.max(1, tempo.pause) }
  return { rep, phase: 'up', left: len - t, frac: (t - tempo.down - tempo.pause) / tempo.up }
}
const PHASE_WORD = { down: 'Lower slowly', pause: 'Hold the stretch', up: 'Back up' }

function Ring({ frac, children }) {
  const r = 88
  const c = 2 * Math.PI * r
  return (
    <div className="mob-ring">
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="100" cy="100" r={r} className="mob-ring-track" />
        <circle cx="100" cy="100" r={r} className="mob-ring-fill" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, Math.max(0, frac)))} />
      </svg>
      <div className="mob-ring-inner">{children}</div>
    </div>
  )
}

export default function MobilitySession() {
  const navigate = useNavigate()
  const units = loadSettings().units === 'kg' ? 'kg' : 'lbs'
  const soundOn = loadSettings().restSound !== false
  const step0 = LOAD_STEP[units]

  // Build (or resume) the session once.
  const [run, setRun] = useState(() => {
    const saved = loadMobilityActive()
    if (saved?.steps?.length && Date.now() - (saved.startedAt || 0) < 12 * 3600e3) return saved
    const mob = loadMobility()
    if (!mob?.added) return null
    const session = buildSession(mob, { state: mob.moves || {}, equipment: new Set(activeEquipmentIds()) })
    if (!session.items.length) return null
    return { session, steps: buildSteps(session), index: 0, results: {}, startedAt: Date.now() }
  })
  const [now, setNow] = useState(Date.now())
  const [phaseStart, setPhaseStart] = useState(Date.now())
  const [paused, setPaused] = useState(null) // timestamp paused at
  const [setGo, setSetGo] = useState(false) // a paced set has been started
  const [tapReps, setTapReps] = useState(0) // self-paced counter
  const [confirm, setConfirm] = useState(null) // after a reps set: { reps, more }
  const [askSharp, setAskSharp] = useState(false)
  const [summary, setSummary] = useState(null)
  const lastTick = useRef(-1)

  useEffect(() => { if (run) saveMobilityActive(run) }, [run])
  useEffect(() => { keepAwake(); return () => allowSleep() }, [])
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200)
    const onVis = () => setNow(Date.now())
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
  }, [])

  const step = run?.steps[run.index]
  const item = step && step.item != null ? run.session.items[step.item] : null
  const ex = item ? EXERCISE_BY_ID[item.id] : null
  const move = item ? MOVES[item.id] : null
  const result = item ? run.results[step.item] || {} : {}
  const load = result.load ?? item?.load ?? 0
  const elapsed = Math.max(0, Math.floor(((paused || now) - phaseStart) / 1000))

  const go = (delta = 1) => {
    setRun((r) => ({ ...r, index: Math.min(r.steps.length - 1, Math.max(0, r.index + delta)) }))
    setPhaseStart(Date.now()); setPaused(null); setSetGo(false); setTapReps(0); setConfirm(null); setAskSharp(false)
    lastTick.current = -1
  }
  const setResult = (patch) => setRun((r) => ({ ...r, results: { ...r.results, [step.item]: { ...(r.results[step.item] || {}), ...patch } } }))
  const togglePause = () => {
    if (paused) { setPhaseStart((t) => t + (Date.now() - paused)); setPaused(null) } else setPaused(Date.now())
  }
  const chime = () => { if (soundOn) playRestDone(); buzz([200, 80, 200]) }
  const tick = (accent) => { if (soundOn) playTick(accent) }

  // Timed steps: when they run out, chime and move on.
  const timed = step && ['warmup', 'switch', 'rest', 'hold', 'pnf'].includes(step.kind)
  const ready = step && (step.kind === 'hold' || step.kind === 'pnf') ? READY_SEC : 0
  const total = step ? (step.sec || 0) + ready : 0
  useEffect(() => {
    if (!step || paused) return
    if (timed && elapsed >= total) {
      if (step.kind === 'hold' || step.kind === 'pnf') chime(); else buzz(120)
      go(1)
      return
    }
    // Count-in ticks before a hold, and the last 3 seconds of anything timed.
    const left = total - elapsed
    if (timed && left <= 3 && left > 0 && lastTick.current !== elapsed) { lastTick.current = elapsed; tick(false) }
    if ((step.kind === 'hold' || step.kind === 'pnf') && elapsed === ready && lastTick.current !== -2) { lastTick.current = -2; tick(true); buzz(80) }
    // Paced reps: a tick each second, a higher one at each phase change.
    if (step.kind === 'reps' && step.tempo && setGo) {
      const p = repPhase(elapsed, step.tempo)
      if (p.rep >= step.reps) { setConfirm({ reps: step.reps, more: null }); setSetGo(false); chime(); return }
      if (lastTick.current !== elapsed) {
        lastTick.current = elapsed
        const atStart = p.phase === 'down' ? p.left === step.tempo.down : p.phase === 'pause' ? p.left === step.tempo.pause : p.left === step.tempo.up
        tick(atStart)
        if (atStart && p.phase === 'pause') buzz(60)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now])

  const finish = () => {
    const mob = loadMobility()
    const block = blockInfo(mob.startedAt)
    const bodyweight = currentBodyweight()
    const notes = {}
    const moves = { ...(mob.moves || {}) }
    const avoid = [...(mob.avoid || [])]
    const logged = []
    run.session.items.forEach((it, i) => {
      const r = run.results[i]
      if (!r?.feel) return // skipped
      const { state, note, remove } = progressMove(it.id, { ...(moves[it.id] || {}), reps: moves[it.id]?.reps ?? (it.kind === 'reps' ? it.reps : undefined), sec: moves[it.id]?.sec ?? (it.kind === 'hold' ? it.sec : undefined) }, { feel: r.feel, sharp: r.sharp, more: r.more, load: r.load }, { easyWeek: block.easy, units, bodyweight, block: block.block, bendy: !!mob.flags?.bendy })
      moves[it.id] = state
      if (note) notes[it.id] = note
      if (remove && !avoid.includes(it.id)) avoid.push(it.id)
      logged.push([it.id, Number(r.load) || 0, it.kind === 'hold' ? it.sec : (r.reps || it.reps), r.feel])
    })
    const entry = { d: new Date().toISOString(), a: run.session.areas, min: Math.max(1, Math.round((Date.now() - run.startedAt) / 60000)), m: logged }
    updateMobility((m) => ({
      ...m, moves, avoid, notes: { ...(m.notes || {}), ...notes },
      log: [...(m.log || []), entry], pointer: (m.pointer || 0) + 1,
    }))
    clearMobilityActive()
    const after = loadMobility()
    setSummary({ notes, min: entry.min, week: sessionsThisWeek(after.log || []), perWeek: after.perWeek || 3, moves: logged.length })
  }

  if (!run) {
    return (
      <section className="page full-flow mobility">
        <header className="page-header"><h1>Nothing to do yet</h1></header>
        <p className="muted">Set up Mobility first, or check your equipment — nothing in your plan fits it.</p>
        <div className="flow-actions"><button type="button" className="btn btn-primary" onClick={() => navigate('/mobility')}>Open Mobility</button></div>
      </section>
    )
  }

  if (summary) {
    return (
      <section className="page full-flow mobility">
        <header className="page-header">
          <p className="eyebrow">Mobility</p>
          <h1>Session done</h1>
        </header>
        <div className="step-body">
          <p className="muted">{summary.min} min · {summary.moves} moves · {summary.week} of {summary.perWeek} this week</p>
          {Object.keys(summary.notes).length > 0 ? (
            <div className="card">
              <p className="group-label">For next time</p>
              <ul className="mob-notes">
                {Object.entries(summary.notes).map(([id, n]) => <li key={id}><strong>{EXERCISE_BY_ID[id]?.name}</strong> — {NOTE_TEXT[n]?.replace(/^Next time: /, '')}</li>)}
              </ul>
            </div>
          ) : (
            <p className="muted small">Same again next time — things go up after two good sessions in a row.</p>
          )}
          <p className="muted small">Tomorrow we&apos;ll ask how it feels. A strong stretch is normal; lasting pain isn&apos;t.</p>
        </div>
        <div className="flow-actions"><button type="button" className="btn btn-primary" onClick={() => navigate('/mobility')}>Done</button></div>
      </section>
    )
  }

  const progressFrac = run.index / Math.max(1, run.steps.length - 1)
  const nextMove = (() => {
    for (let i = run.index + 1; i < run.steps.length; i++) {
      const s = run.steps[i]
      if (s.item != null && s.item !== step.item) return EXERCISE_BY_ID[run.session.items[s.item].id]?.name
    }
    return null
  })()
  const exit = () => navigate('/mobility')
  const loadable = move && move.loadable !== 'none'
  const loadStepper = loadable && (
    <div className="mob-load" role="group" aria-label="Weight">
      <span className="muted small">Weight</span>
      <div className="rest-stepper">
        <button type="button" onClick={() => setResult({ load: Math.max(0, Number(load) - step0) })} aria-label="Less weight">–</button>
        <span className="mob-step-val">{Number(load) > 0 ? `${load} ${units}` : move.loadable === 'required' ? 'Pick one' : 'None'}</span>
        <button type="button" onClick={() => setResult({ load: Number(load) + step0 })} aria-label="More weight">+</button>
      </div>
    </div>
  )

  let body
  if (step.kind === 'warmup') {
    body = (
      <>
        <h1>Warm up</h1>
        <Ring frac={elapsed / total}><span className="mob-big">{fmt(total - elapsed)}</span></Ring>
        <ul className="why-list">
          <li>March or jog on the spot — 1 minute</li>
          <li>Arm circles and big shoulder rolls</li>
          <li>10 slow bodyweight squats or good mornings</li>
          <li>Slow cat-cow on all fours</li>
        </ul>
        <p className="muted small">Loaded stretching goes better warm. Already warm from lifting? Skip it.</p>
      </>
    )
  } else if (step.kind === 'switch') {
    body = (
      <>
        <p className="eyebrow">{ex?.name}</p>
        <h1>Switch to the {step.to === 'R' ? 'right' : 'left'} side</h1>
        <Ring frac={elapsed / total}><span className="mob-big">{total - elapsed}</span></Ring>
      </>
    )
  } else if (step.kind === 'rest') {
    body = (
      <>
        <h1>Rest</h1>
        <Ring frac={elapsed / total}><span className="mob-big">{fmt(total - elapsed)}</span></Ring>
        <p className="muted">Next: {ex?.name} — set {(run.steps[run.index + 1]?.set) || ''}</p>
      </>
    )
  } else if (step.kind === 'hold' || step.kind === 'pnf') {
    const inReady = elapsed < ready
    const holdLeft = total - elapsed
    const breath = reducedMotion() ? 'Breathe slowly' : (Math.floor((elapsed - ready) / 5) % 2 === 0 ? 'Breathe in…' : 'Breathe out — sink a little deeper')
    const pnf = step.kind === 'pnf' && !inReady ? pnfPhase(elapsed - ready, step.sec) : null
    body = (
      <>
        <p className="eyebrow">{step.side ? `${SIDE_WORD[step.side]} · ` : ''}Set {step.set} of {step.of}</p>
        <div className="mob-title-row"><h1>{ex?.name}</h1><FormCheckButton name={ex?.name} /></div>
        <Ring frac={inReady ? elapsed / ready : (elapsed - ready) / step.sec}>
          {inReady ? <><span className="mob-mid">Get in position</span><span className="mob-big">{ready - elapsed}</span></>
            : <span className="mob-big" aria-live="off">{fmt(holdLeft)}</span>}
        </Ring>
        <p className={'mob-cue' + (pnf?.push ? ' is-push' : '')} aria-live="polite">
          {inReady ? ex?.cues : pnf ? pnf.label : breath}
        </p>
        {!inReady && <p className="muted small">A strong stretch — about 6 out of 10. Never sharp, pinching or tingling.</p>}
        {loadStepper}
      </>
    )
  } else if (step.kind === 'reps') {
    if (confirm) {
      body = (
        <>
          <p className="eyebrow">{step.side ? `${SIDE_WORD[step.side]} · ` : ''}Set {step.set} of {step.of}</p>
          <h1>{ex?.name}</h1>
          <div className="mob-load" role="group" aria-label="Reps done">
            <span className="muted small">Reps done</span>
            <div className="rest-stepper">
              <button type="button" onClick={() => setConfirm((c) => ({ ...c, reps: Math.max(0, c.reps - 1) }))} aria-label="One less rep">–</button>
              <span className="mob-step-val">{confirm.reps}</span>
              <button type="button" onClick={() => setConfirm((c) => ({ ...c, reps: c.reps + 1 }))} aria-label="One more rep">+</button>
            </div>
          </div>
          {loadStepper}
          <p className="choice-title">Could you do 2 more with good form?</p>
          <div className="mob-feel">
            {/* One "no" in any set means it isn't time to progress this move. */}
            <button type="button" className="btn btn-ghost" onClick={() => { setResult({ more: false, reps: confirm.reps }); go(1) }}>No</button>
            <button type="button" className="btn btn-primary" onClick={() => { setResult({ more: result.more !== false, reps: confirm.reps }); go(1) }}>Yes</button>
          </div>
        </>
      )
    } else if (!step.tempo) {
      body = (
        <>
          <p className="eyebrow">{step.side ? `${SIDE_WORD[step.side]} · ` : ''}Set {step.set} of {step.of}</p>
          <div className="mob-title-row"><h1>{ex?.name}</h1><FormCheckButton name={ex?.name} /></div>
          <p className="muted">{ex?.cues}</p>
          <button type="button" className="mob-tap" onClick={() => { setTapReps((n) => n + 1); buzz(40) }} aria-label="Count a rep">
            <span className="mob-big">{tapReps}</span>
            <span className="muted small">of {step.reps} · tap after each rep</span>
          </button>
          {loadStepper}
        </>
      )
    } else if (!setGo) {
      body = (
        <>
          <p className="eyebrow">{step.side ? `${SIDE_WORD[step.side]} · ` : ''}Set {step.set} of {step.of}</p>
          <div className="mob-title-row"><h1>{ex?.name}</h1><FormCheckButton name={ex?.name} /></div>
          <MuscleMap pattern={ex?.pattern} exId={ex?.id} size={110} />
          <p className="muted">{ex?.cues}</p>
          <p className="choice-title">{step.reps} slow reps — we&apos;ll count the pace for you.</p>
          {loadStepper}
        </>
      )
    } else {
      const p = repPhase(elapsed, step.tempo)
      body = (
        <>
          <p className="eyebrow">{step.side ? `${SIDE_WORD[step.side]} · ` : ''}Set {step.set} of {step.of}</p>
          <h1>{ex?.name}</h1>
          <div className="mob-reps" aria-live="polite">
            <span className="mob-big">{Math.min(p.rep + 1, step.reps)}<span className="mob-of"> / {step.reps}</span></span>
          </div>
          <div className={'mob-phase is-' + p.phase}>
            <span className="mob-phase-word">{PHASE_WORD[p.phase]}</span>
            <div className="mob-phase-bar"><span style={{ width: `${Math.round(p.frac * 100)}%` }} /></div>
          </div>
          <p className="muted small">{p.phase === 'pause' ? (Number(load) > 0 ? 'Let the weight pull you into the stretch.' : 'Breathe out and sink into the stretch.') : 'Smooth and controlled.'}</p>
        </>
      )
    }
  } else if (step.kind === 'feel') {
    body = askSharp ? (
      <>
        <h1>Was it sharp, pinching or tingling?</h1>
        <p className="muted">That&apos;s different from a strong stretch. If yes, we&apos;ll take {ex?.name} out of your plan and use another move.</p>
        <div className="mob-feel">
          <button type="button" className="btn btn-ghost" onClick={() => { setResult({ feel: 'much' }); go(1) }}>No, just intense</button>
          <button type="button" className="btn btn-primary danger" onClick={() => { setResult({ feel: 'much', sharp: true }); go(1) }}>Yes</button>
        </div>
      </>
    ) : (
      <>
        <p className="eyebrow">{AREA_BY_ID[item?.area]?.label}</p>
        <h1>How did {ex?.name} feel?</h1>
        <div className="mob-feel-col">
          <button type="button" className="choice-row" onClick={() => { setResult({ feel: 'easy' }); go(1) }}>
            <span className="choice-title">Barely felt it</span><span className="muted small">Easy — ready for more</span>
          </button>
          <button type="button" className="choice-row" onClick={() => { setResult({ feel: 'good' }); go(1) }}>
            <span className="choice-title">Good stretch</span><span className="muted small">Strong but fine — the target</span>
          </button>
          <button type="button" className="choice-row" onClick={() => setAskSharp(true)}>
            <span className="choice-title">Too much</span><span className="muted small">Over the line, or it hurt</span>
          </button>
        </div>
      </>
    )
  } else if (step.kind === 'done') {
    body = (
      <>
        <h1>That&apos;s everything</h1>
        <p className="muted">Nice work. Save the session to see what changes next time.</p>
      </>
    )
  }

  // Bottom controls (thumb zone), per step.
  let actions
  if (step.kind === 'done') actions = <button type="button" className="btn btn-primary" onClick={finish}>Finish & save</button>
  else if (step.kind === 'feel') actions = null
  else if (step.kind === 'reps' && confirm) actions = null
  else if (step.kind === 'reps' && !step.tempo) {
    actions = <button type="button" className="btn btn-primary" onClick={() => setConfirm({ reps: tapReps || step.reps, more: null })}>Done</button>
  } else if (step.kind === 'reps' && !setGo) {
    actions = <button type="button" className="btn btn-primary" onClick={() => { setSetGo(true); setPhaseStart(Date.now()); lastTick.current = -1 }}>Start set</button>
  } else if (step.kind === 'reps') {
    actions = <button type="button" className="btn btn-ghost" onClick={() => { const p = repPhase(elapsed, step.tempo); setConfirm({ reps: Math.min(step.reps, p.rep + (p.phase === 'up' ? 1 : 0)), more: null }); setSetGo(false) }}>End set early</button>
  } else {
    actions = (
      <>
        <button type="button" className="btn btn-ghost" onClick={togglePause}>{paused ? 'Resume' : 'Pause'}</button>
        <button type="button" className="btn btn-ghost" onClick={() => go(1)}>{step.kind === 'warmup' ? 'Skip warm-up' : step.kind === 'rest' || step.kind === 'switch' ? 'Skip' : 'Done'}</button>
      </>
    )
  }

  return (
    <section className="page full-flow mobility mob-player">
      <div className="mob-top">
        <button type="button" className="link-btn" onClick={exit}>Exit</button>
        <div className="progress-track" aria-hidden="true"><div className="progress-fill" style={{ width: `${Math.round(progressFrac * 100)}%` }} /></div>
        {run.index > 0 && step.kind !== 'done' ? <button type="button" className="link-btn" onClick={() => go(-1)}>Back</button> : <span />}
      </div>
      <div className="step-body mob-stage">
        {body}
        {nextMove && step.kind !== 'feel' && step.kind !== 'done' && <p className="muted small mob-upnext">Up next: {nextMove}</p>}
      </div>
      {actions && <div className="flow-actions">{actions}</div>}
    </section>
  )
}

