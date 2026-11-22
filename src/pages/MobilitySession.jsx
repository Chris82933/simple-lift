import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MOVES, AREA_BY_ID } from '../data/mobility.js'
import { EXERCISE_BY_ID } from '../data/exercises.js'
import {
  buildSession, buildSteps, progressMove, blockInfo, sessionsThisWeek, NOTE_TEXT, loadStepFor, loadCap, planSignature, mobilityEquipment,
} from '../lib/mobility.js'
import {
  loadMobility, updateMobility, loadSettings, loadMobilityActive, saveMobilityActive, clearMobilityActive, currentBodyweight,
} from '../lib/storage.js'
import { useToast } from '../components/Toast.jsx'
import { playRestDone, playTick } from '../lib/sound.js'
import { keepAwake, allowSleep } from '../lib/wakeLock.js'
import MuscleMap from '../components/MuscleMap.jsx'
import FormCheckButton from '../components/FormCheckButton.jsx'

const READY_SEC = 10 // "get into position" before a hold (3 s right after a side switch)
const SIDE_WORD = { L: 'Left side', R: 'Right side' }
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`
// Browsers refuse vibration before the first tap (e.g. a resumed session).
const buzz = (p) => { try { if (navigator.userActivation?.hasBeenActive !== false) navigator.vibrate?.(p) } catch { /* no vibration */ } }
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Contract-relax ("go deeper") phases inside the last hold of a long session.
function pnfPhase(elapsed, total) {
  const cycle = 25
  const inCycle = elapsed % cycle
  const left = total - elapsed
  if (left <= 5) return { label: 'Relax and hold', push: false }
  // Contract-relax: tense the STRETCHED muscle against the stretch, then let go.
  return inCycle < 5 ? { label: 'Gently push against the stretch — tense the stretched muscle, about 3 out of 10', push: true } : { label: 'Relax and ease a little deeper', push: false }
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
const phaseWord = (move, phase) => (move?.phases ? move.phases[{ down: 0, pause: 1, up: 2 }[phase]] : PHASE_WORD[phase])
const firstSentence = (t = '') => (t.match(/^.*?[.!?](\s|$)/)?.[0] || t).trim()

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

  // Build (or resume) the session once.
  const [run, setRun] = useState(() => {
    const mob = loadMobility()
    if (!mob?.added) return null
    const sig = planSignature(mob)
    // Resume only the same plan (an edited plan starts fresh), within 12 h.
    const saved = loadMobilityActive()
    if (saved?.steps?.length && saved.sig === sig && Date.now() - (saved.startedAt || 0) < 12 * 3600e3) return saved
    const session = buildSession(mob, { state: mob.moves || {}, equipment: mobilityEquipment(mob) })
    if (!session.items.length) return null
    return { session, steps: buildSteps(session), index: 0, results: {}, startedAt: Date.now(), sig, flags: mob.flags || {} }
  })
  const [now, setNow] = useState(Date.now())
  const [phaseStart, setPhaseStart] = useState(Date.now())
  const [paused, setPaused] = useState(null) // timestamp paused at
  const [setGo, setSetGo] = useState(false) // a paced set has been started
  const [tapReps, setTapReps] = useState(0) // self-paced counter
  const [confirm, setConfirm] = useState(null) // after a reps set: { reps, more }
  const [askSharp, setAskSharp] = useState(false)
  const [askDepth, setAskDepth] = useState(null) // the feel picked, while asking about depth
  const stageRef = useRef(null)
  const toast = useToast()
  // A toast from the hub ("Swapped to …") would sit over Pause / Skip.
  useEffect(() => { toast.dismiss?.() }, []) // eslint-disable-line react-hooks/exhaustive-deps
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
  const step0 = item ? loadStepFor(item.id, units) : 5
  const flags = run?.flags || {}
  const elapsed = Math.max(0, Math.floor(((paused || now) - phaseStart) / 1000))

  const go = (delta = 1) => {
    setRun((r) => ({ ...r, index: Math.min(r.steps.length - 1, Math.max(0, r.index + delta)) }))
    setPhaseStart(Date.now()); setPaused(null); setSetGo(false); setTapReps(0); setConfirm(null); setAskSharp(false); setAskDepth(null)
    lastTick.current = -1
  }
  // Each new step: move focus to its heading so screen readers (and keyboard
  // users) aren't left on a button that no longer exists.
  useEffect(() => { stageRef.current?.querySelector('h1')?.focus?.() }, [run?.index, confirm, askSharp, askDepth])
  const setResult = (patch) => setRun((r) => ({ ...r, results: { ...r.results, [step.item]: { ...(r.results[step.item] || {}), ...patch } } }))
  // Jump straight to this move's "how did it feel", at the pain question.
  const stoppedWrong = () => {
    const idx = run.steps.findIndex((s2, i) => i > run.index && s2.kind === 'feel' && s2.item === step.item)
    setResult({ done: true, early: true })
    setRun((r) => ({ ...r, index: idx >= 0 ? idx : r.index }))
    setPhaseStart(Date.now()); setPaused(null); setSetGo(false); setTapReps(0); setConfirm(null); setAskDepth(null)
    setAskSharp(true)
  }
  const togglePause = () => {
    if (paused) { setPhaseStart((t) => t + (Date.now() - paused)); setPaused(null) } else setPaused(Date.now())
  }
  const chime = () => { if (soundOn) playRestDone(); buzz([200, 80, 200]) }
  const tick = (accent) => { if (soundOn) playTick(accent) }

  // Timed steps: when they run out, chime and move on.
  const timed = step && ['warmup', 'switch', 'rest', 'hold', 'pnf'].includes(step.kind)
  const afterSwitch = run && run.steps[run.index - 1]?.kind === 'switch'
  const ready = step && (step.kind === 'hold' || step.kind === 'pnf') ? (afterSwitch ? 3 : READY_SEC) : 0
  const total = step ? (step.sec || 0) + ready : 0
  useEffect(() => {
    if (!step || paused) return
    if (timed && elapsed >= total) {
      if (step.kind === 'hold' || step.kind === 'pnf') { chime(); setResult({ done: true }) } else buzz(120)
      go(1)
      return
    }
    // Ticks for the last 3 seconds of anything timed, and a cue as a hold starts.
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
    if (!mob) { clearMobilityActive(); navigate('/mobility'); return } // removed elsewhere
    const block = blockInfo(mob.startedAt)
    const bodyweight = currentBodyweight()
    const notes = {}
    const cleared = []
    const readyArea = { ...(mob.readyArea || {}) }
    const moves = { ...(mob.moves || {}) }
    const avoid = [...(mob.avoid || [])]
    const logged = []
    run.session.items.forEach((it, i) => {
      const r = run.results[i]
      // Skipped (no sets done, or "skipped it"): nothing changes for this move.
      if (!r?.feel || r.skipped || !r.done) return
      // Ended early: logged as done, but it isn't a reason to make it harder.
      if (r.early && r.feel !== 'much' && !r.sharp) {
        logged.push([it.id, Number(r.load ?? it.load) || 0, it.kind === 'hold' ? (r.secDone ?? it.sec) : (r.reps ?? it.reps), r.feel])
        return
      }
      const { state, note, remove } = progressMove(it.id, { ...(moves[it.id] || {}), reps: moves[it.id]?.reps ?? (it.kind === 'reps' ? it.reps : undefined), sec: moves[it.id]?.sec ?? (it.kind === 'hold' ? it.sec : undefined) }, { feel: r.feel, sharp: r.sharp, more: r.more, fullDepth: r.fullDepth, load: r.load ?? it.load }, { easyWeek: block.easy, units, bodyweight, block: block.block, flags: mob.flags || {} })
      moves[it.id] = state
      // "Ready for the next level" only for an area's main move — the extra
      // one is already a preview of the next rung.
      const n = note === 'ready_next' && !it.main ? null : note
      if (n) notes[it.id] = n
      else cleared.push(it.id)
      if (n === 'ready_next') readyArea[it.id] = it.area
      if (remove && !avoid.includes(it.id)) avoid.push(it.id)
      logged.push([it.id, Number(r.load ?? it.load) || 0, it.kind === 'hold' ? (r.secDone ?? it.sec) : (r.reps ?? it.reps), r.feel])
    })
    // Active minutes, not wall-clock: a session resumed hours later shouldn't
    // log as an eight-hour session.
    const wall = Math.round((Date.now() - run.startedAt) / 60000)
    const entry = { d: new Date().toISOString(), a: run.session.areas, min: Math.max(1, Math.min(wall, Math.round((run.session.minutes || 30) * 1.5))), m: logged }
    updateMobility((m) => {
      const allNotes = { ...(m.notes || {}) }
      for (const id of cleared) if (allNotes[id] !== 'ready_next') delete allNotes[id]
      return {
        ...m, moves, avoid, readyArea, notes: { ...allNotes, ...notes },
        log: [...(m.log || []), entry], pointer: (m.pointer || 0) + 1,
      }
    })
    clearMobilityActive()
    const after = loadMobility()
    setSummary({ notes, min: entry.min, week: sessionsThisWeek(after.log || []), perWeek: after.perWeek || 3, moves: logged.length })
  }

  if (!run) {
    return (
      <section className="page full-flow mobility">
        <header className="page-header"><h1 tabIndex={-1}>Nothing to do yet</h1></header>
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
          <h1 tabIndex={-1}>Session done</h1>
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
        <button
          type="button"
          onClick={() => {
            const cap = loadCap(item.id, { bodyweight: currentBodyweight(), units, block: blockInfo(loadMobility()?.startedAt).block })
            setResult({ load: Math.min(cap, Number(load) + step0) })
          }}
          aria-label="More weight"
        >+</button>
      </div>
      {!(Number(load) > 0) && move.loadHint && <span className="muted small">{move.loadHint[units]}</span>}
    </div>
  )

  let body
  if (step.kind === 'warmup') {
    body = (
      <>
        <h1 tabIndex={-1}>Warm up</h1>
        <Ring frac={elapsed / total}><span className="mob-big">{fmt(total - elapsed)}</span></Ring>
        <ul className="why-list">
          <li>March or jog on the spot — 1 minute</li>
          <li>Arm circles and big shoulder rolls</li>
          <li>10 slow bodyweight squats or good mornings</li>
          <li>Slow spine waves on all fours</li>
        </ul>
        <p className="muted small">Loaded stretching goes better warm. Already warm from lifting? Skip it.</p>
      </>
    )
  } else if (step.kind === 'switch') {
    body = (
      <>
        <p className="eyebrow">{ex?.name}</p>
        <h1 tabIndex={-1}>Switch to the {step.to === 'R' ? 'right' : 'left'} side</h1>
        <Ring frac={elapsed / total}><span className="mob-big">{total - elapsed}</span></Ring>
      </>
    )
  } else if (step.kind === 'rest') {
    body = (
      <>
        <h1 tabIndex={-1}>Rest</h1>
        <Ring frac={elapsed / total}><span className="mob-big">{fmt(total - elapsed)}</span></Ring>
        <p className="muted">Next: {ex?.name} — set {(run.steps[run.index + 1]?.set) || ''}</p>
      </>
    )
  } else if (step.kind === 'hold' || step.kind === 'pnf') {
    const inReady = elapsed < ready
    const holdLeft = total - elapsed
    const active = !!move?.active
    const breath = active ? 'Strong and steady — keep good position'
      : reducedMotion() ? 'Breathe slowly' : (Math.floor((elapsed - ready) / 5) % 2 === 0 ? 'Breathe in…' : 'Breathe out — sink a little deeper')
    // Very bendy: an ACTIVE hang (shoulders gently pulled down), not a passive one.
    const cueText = flags.bendy && item?.id === 'dead_hang' ? 'Hang with straight arms and keep your shoulders gently pulled down, away from your ears — an active hang. Breathe.' : ex?.cues
    const pnf = step.kind === 'pnf' && !inReady ? pnfPhase(elapsed - ready, step.sec) : null
    body = (
      <>
        <p className="eyebrow">{step.side ? `${SIDE_WORD[step.side]} · ` : ''}Set {step.set} of {step.of}</p>
        <div className="mob-title-row"><h1 tabIndex={-1}>{ex?.name}</h1><FormCheckButton name={ex?.name} /></div>
        <Ring frac={inReady ? elapsed / ready : (elapsed - ready) / step.sec}>
          {inReady ? <><span className="mob-mid">Get in position</span><span className="mob-big">{ready - elapsed}</span></>
            : <span className="mob-big" aria-live="off">{fmt(holdLeft)}</span>}
        </Ring>
        <p className={'mob-cue' + (pnf?.push ? ' is-push' : '')} aria-live={pnf ? 'polite' : 'off'}>
          {paused ? 'Paused' : inReady ? cueText : pnf ? pnf.label : breath}
        </p>
        {!inReady && !paused && <p className="muted small mob-oneline">{firstSentence(cueText)}</p>}
        {!inReady && (
          <p className="muted small">
            {active ? 'Hard work, about 7 out of 10 — stop before your position breaks.'
              : flags.pregnant ? 'A gentle stretch — about 4 out of 10. Never sharp, pinching or tingling.'
                : 'A strong stretch — about 6 out of 10. Never sharp, pinching or tingling.'}
          </p>
        )}
        {loadStepper}
      </>
    )
  } else if (step.kind === 'reps') {
    if (confirm) {
      body = (
        <>
          <p className="eyebrow">{step.side ? `${SIDE_WORD[step.side]} · ` : ''}Set {step.set} of {step.of}</p>
          <h1 tabIndex={-1}>{ex?.name}</h1>
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
            <button type="button" className="btn btn-ghost" onClick={() => { setResult({ more: false, reps: confirm.reps, done: result.done || confirm.reps > 0, early: result.early || confirm.reps < step.reps }); go(1) }}>No</button>
            <button type="button" className="btn btn-primary" onClick={() => { setResult({ more: result.more !== false, reps: confirm.reps, done: result.done || confirm.reps > 0, early: result.early || confirm.reps < step.reps }); go(1) }}>Yes</button>
          </div>
          <button type="button" className="link-btn" onClick={stoppedWrong}>I stopped — it didn&apos;t feel right</button>
        </>
      )
    } else if (!step.tempo) {
      body = (
        <>
          <p className="eyebrow">{step.side ? `${SIDE_WORD[step.side]} · ` : ''}Set {step.set} of {step.of}</p>
          <div className="mob-title-row"><h1 tabIndex={-1}>{ex?.name}</h1><FormCheckButton name={ex?.name} /></div>
          <p className="muted">{ex?.cues}</p>
          <button type="button" className="mob-tap" onClick={() => { setTapReps((n) => n + 1); buzz(40) }} aria-label={`Count a rep, ${tapReps} of ${step.reps} so far`}>
            <span className="mob-big">{tapReps}</span>
            <span className="muted small">of {step.reps} · tap after each rep</span>
          </button>
          <button type="button" className="link-btn" onClick={() => setTapReps((n) => Math.max(0, n - 1))} disabled={!tapReps}>− Undo a rep</button>
          {loadStepper}
        </>
      )
    } else if (!setGo) {
      body = (
        <>
          <p className="eyebrow">{step.side ? `${SIDE_WORD[step.side]} · ` : ''}Set {step.set} of {step.of}</p>
          <div className="mob-title-row"><h1 tabIndex={-1}>{ex?.name}</h1><FormCheckButton name={ex?.name} /></div>
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
          <h1 tabIndex={-1}>{ex?.name}</h1>
          <div className="mob-reps" aria-live="polite">
            <span className="mob-big">{Math.min(p.rep + 1, step.reps)}<span className="mob-of"> / {step.reps}</span></span>
          </div>
          <div className={'mob-phase is-' + p.phase}>
            <span className="mob-phase-word">{phaseWord(move, p.phase)}</span>
            <div className="mob-phase-bar"><span style={{ width: `${Math.round(p.frac * 100)}%` }} /></div>
          </div>
          <p className="muted small">{p.phase === 'pause' ? (Number(load) > 0 ? 'Let the weight pull you into the stretch.' : 'Breathe out and sink into the stretch.') : 'Smooth and controlled.'}</p>
        </>
      )
    }
  } else if (step.kind === 'feel') {
    const strengthy = !!(move?.active || move?.heavy)
    const pickFeel = (feel) => {
      // Range moves: once it feels right, is the full depth under control?
      if (move?.range && feel !== 'much') { setAskDepth(feel); return }
      setResult({ feel, sharp: false, skipped: false }); go(1)
    }
    body = askDepth ? (
      <>
        <h1 tabIndex={-1}>Reaching full depth with control?</h1>
        <p className="muted">The deepest position you can own, slowly, without bouncing — that comes before more reps or weight.</p>
        <div className="mob-feel">
          <button type="button" className="btn btn-ghost" onClick={() => { setResult({ feel: askDepth, sharp: false, skipped: false, fullDepth: false }); go(1) }}>Not yet</button>
          <button type="button" className="btn btn-primary" onClick={() => { setResult({ feel: askDepth, sharp: false, skipped: false, fullDepth: true }); go(1) }}>Yes</button>
        </div>
      </>
    ) : askSharp ? (
      <>
        <h1 tabIndex={-1}>Was it sharp, pinching or tingling?</h1>
        <p className="muted">That&apos;s different from a strong stretch. If yes, we&apos;ll take {ex?.name} out of your plan and use another move.</p>
        <div className="mob-feel">
          <button type="button" className="btn btn-ghost" onClick={() => { setResult({ feel: 'much', sharp: false, skipped: false }); go(1) }}>No, just intense</button>
          <button type="button" className="btn btn-ghost" onClick={() => { setResult({ feel: 'much', sharp: true, skipped: false }); go(1) }}>Yes</button>
        </div>
      </>
    ) : (
      <>
        <p className="eyebrow">{AREA_BY_ID[item?.area]?.label}</p>
        <h1 tabIndex={-1}>How did {ex?.name} feel?</h1>
        <div className="mob-feel-col">
          <button type="button" className="choice-row" onClick={() => pickFeel('easy')}>
            <span className="choice-title">{strengthy ? 'Felt easy' : 'Barely felt it'}</span><span className="muted small">Easy — ready for more</span>
          </button>
          <button type="button" className="choice-row" onClick={() => pickFeel('good')}>
            <span className="choice-title">{strengthy ? 'Hard but good' : 'Good stretch'}</span><span className="muted small">{strengthy ? 'Tough, with good form — the target' : 'Strong but fine — the target'}</span>
          </button>
          <button type="button" className="choice-row" onClick={() => setAskSharp(true)}>
            <span className="choice-title">Too much</span><span className="muted small">Over the line, or it hurt</span>
          </button>
          <button type="button" className="link-btn" onClick={() => { setResult({ feel: 'skip', skipped: true, sharp: false }); go(1) }}>I skipped this one</button>
        </div>
      </>
    )
  } else if (step.kind === 'done') {
    body = (
      <>
        <h1 tabIndex={-1}>That&apos;s everything</h1>
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
    actions = <button type="button" className="btn btn-primary" onClick={() => setConfirm({ reps: tapReps, more: null })}>Done</button>
  } else if (step.kind === 'reps' && !setGo) {
    actions = <button type="button" className="btn btn-primary" onClick={() => { setSetGo(true); setPhaseStart(Date.now()); lastTick.current = -1 }}>Start set</button>
  } else if (step.kind === 'reps') {
    actions = <button type="button" className="btn btn-ghost" disabled={elapsed < 2} onClick={() => { const p = repPhase(elapsed, step.tempo); setConfirm({ reps: Math.min(step.reps, p.rep + (p.phase === 'up' ? 1 : 0)), more: null }); setSetGo(false) }}>End set early</button>
  } else {
    actions = (
      <>
        <button type="button" className="btn btn-ghost" onClick={togglePause}>{paused ? 'Resume' : 'Pause'}</button>
        <button type="button" className="btn btn-ghost" onClick={() => {
          if (step.kind === 'hold' || step.kind === 'pnf') {
            const held = Math.max(0, elapsed - ready)
            if (held > 0) setResult({ done: true, secDone: held, early: result.early || held < (step.sec || 0) - 2 })
          }
          go(1)
        }}>{step.kind === 'warmup' ? 'Skip warm-up' : step.kind === 'rest' || step.kind === 'switch' ? 'Skip' : 'Done'}</button>
      </>
    )
  }

  return (
    <section className="page full-flow mobility mob-player">
      <div className="mob-top">
        <button type="button" className="link-btn" onClick={exit}>Exit</button>
        <div className="progress-track" aria-hidden="true"><div className="progress-fill" style={{ width: `${Math.round(progressFrac * 100)}%` }} /></div>
        {run.index > 0 && step.kind !== 'done' ? <button type="button" className="link-btn" onClick={() => go(-1)} aria-label="Go to the previous step">‹ Previous</button> : <span />}
      </div>
      <div className="step-body mob-stage" ref={stageRef}>
        {body}
        {nextMove && !['feel', 'done', 'rest'].includes(step.kind) && <p className="muted small mob-upnext">Up next: {nextMove}</p>}
      </div>
      {actions && <div className="flow-actions">{actions}</div>}
    </section>
  )
}

