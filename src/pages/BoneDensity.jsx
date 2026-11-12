import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { addProgram, loadPrograms, updateProgram, setActiveProgramId, getActiveProgramId, loadMaxes, loadSettings } from '../lib/storage.js'
import { seedProgramWeights } from '../lib/seedWeights.js'
import {
  BONE_LEVELS, BONE_TIMES, BONE_PHASES, BONE_SAFETY_POINTS, BONE_EVIDENCE, BONE_SOURCES, BONE_HOME_ROUTINE,
  BONE_PRACTICE_SOURCE, buildBoneProgram, rebuildBoneProgram, startPhaseFor,
} from '../data/boneDensity.js'
import { measureUnit } from '../data/exercises.js'
import { estimateSessionMinutes } from '../lib/duration.js'
import MuscleMap from '../components/MuscleMap.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import { useToast } from '../components/Toast.jsx'

const range = (e) => (e.repLow === e.repHigh ? `${e.repLow}` : `${e.repLow}–${e.repHigh}`)
const rxLabel = (p) => `${p.sets} × ${p.low === p.high ? p.low : `${p.low}–${p.high}`}`

// Minutes per session for a configuration, from the phase it starts in to the
// heaviest — sessions get longer as rests and warm-ups grow.
function minuteRange(cfg) {
  const all = [cfg.from, 3].flatMap((phase) => buildBoneProgram({ ...cfg, phase }).days.map(estimateSessionMinutes))
  return [Math.min(...all), Math.max(...all)]
}

// A question whose answers are mutually exclusive: radio semantics, with the
// question as the group's accessible name.
function Choice({ id, question, hint, options, value, onChange, compact }) {
  return (
    <div className="card">
      <h2 className="group-label bone-q" id={id}>{question}</h2>
      {hint && <p className="muted small">{hint}</p>}
      <div className={compact ? 'seg' : 'choice-list'} role="radiogroup" aria-labelledby={id}>
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            className={(compact ? 'seg-item' : 'choice-row') + (value === o.value ? ' is-selected' : '')}
            onClick={() => onChange(o.value)}
          >
            {compact ? o.label : (
              <>
                <span className="choice-title">{o.label}</span>
                {o.detail && <span className="muted small">{o.detail}</span>}
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// Guided setup for the Bone Strength program, and the place to move an
// existing one between phases.
export default function BoneDensity() {
  const navigate = useNavigate()
  const toast = useToast()
  const [fracture, setFracture] = useState(null)
  const [falls, setFalls] = useState(null)
  // Coming from "Help me choose", experience is already answered — don't ask
  // twice. Three days a week there means the three-session option.
  const location = useLocation()
  const fromSetup = location.state || {}
  const [level, setLevel] = useState(() => (['new', 'some', 'experienced'].includes(fromSetup.level) ? fromSetup.level : null))
  const [time, setTime] = useState(() => (Number(fromSetup.days) >= 3 ? '3x60' : null))
  const [phase, setPhase] = useState(null) // null = the recommended start
  const [cleared, setCleared] = useState(false)
  const [pendingPhase, setPendingPhase] = useState(null) // { program, to }
  const [, setTick] = useState(0)
  const refresh = () => setTick((n) => n + 1)

  // Any answer that changes the program un-ticks the acknowledgement: it was
  // given for a different program.
  const answer = (setter) => (v) => { setter(v); setCleared(false) }

  const programs = loadPrograms()
  const existing = programs.filter((p) => p.boneDensity)
  const activeId = getActiveProgramId()
  const lowImpact = fracture === true
  const fallRisk = falls === true
  const start = level ? startPhaseFor(level, { lowImpact }) : 1
  // After a fracture: technique only to start. New lifters: never straight to 5 × 5.
  const maxPhase = lowImpact ? 1 : level === 'new' ? 2 : 3
  const ph = Math.min(phase || start, maxPhase)
  const answered = fracture !== null && falls !== null && level && time
  const preview = answered ? buildBoneProgram({ level, time, phase: ph, lowImpact, fallRisk }) : null

  const missing = [
    fracture === null && 'the fracture question',
    falls === null && 'the falls question',
    !level && 'your experience',
    !time && 'how much time you have',
  ].filter(Boolean)
  const blockReason = missing.length
    ? `To see your program, answer ${missing.join(', ')}.`
    : !cleared ? 'Tick the box above to confirm you’ve read the safety points.' : ''

  const create = () => {
    if (!preview || !cleared) return
    addProgram(seedProgramWeights(preview, { maxes: loadMaxes(), units: loadSettings().units === 'kg' ? 'kg' : 'lbs' }))
    toast.show(`${preview.name} is ready — it’s now your active program`)
    navigate('/today')
  }

  const confirmPhase = () => {
    const { program, to } = pendingPhase
    const from = Math.min(3, Math.max(1, Number(program.boneDensity.phase) || 1))
    updateProgram(rebuildBoneProgram(program, to))
    setPendingPhase(null)
    refresh()
    toast.show(`Now in Phase ${to} · ${BONE_PHASES[to].label}`, {
      actionLabel: 'Undo',
      // Undo by changing back the same way, so anything logged in between
      // (new weights) is kept.
      onAction: () => {
        const now = loadPrograms().find((x) => x.id === program.id)
        if (now) { updateProgram(rebuildBoneProgram(now, from)); refresh() }
      },
    })
  }

  return (
    <section className="page full-flow bone-page">
      <header className="page-header">
        <div className="onb-head-row">
          <p className="eyebrow">Bone Strength</p>
          <button type="button" className="skip-link" onClick={() => navigate('/programs')}>Cancel →</button>
        </div>
        <h1>Build stronger bones</h1>
        <p className="muted">
          Strength and impact training to keep your bones strong — and often make them stronger — based on
          research in women after menopause and osteoporosis-society guidance. A few questions set the
          exercises, the effort and the pace.
        </p>
      </header>

      <div className="step-body">
        {existing.map((p) => {
          const cur = Math.min(3, Math.max(1, Number(p.boneDensity.phase) || 1))
          return (
            <div className="card" key={p.id}>
              <h2 className="group-label bone-q">Your bone program</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <p className="day-title" style={{ margin: 0 }}>{p.name}</p>
                {p.id === activeId
                  ? <span className="active-badge">Active</span>
                  : (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setActiveProgramId(p.id); refresh(); toast.show(`${p.name} is now your active program`) }}>
                      Make active
                    </button>
                  )}
              </div>
              <p className="muted small">
                Phase {cur} · {BONE_PHASES[cur].label}
                {p.boneDensity.lowImpact ? ' · low impact' : ''}
                {p.createdAt ? ` · started ${new Date(p.createdAt).toLocaleDateString()}` : ''}.{' '}
                {BONE_PHASES[cur].advance}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/program', { state: { id: p.id } })}>Open program</button>
                {cur < 3 && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPendingPhase({ program: p, to: cur + 1 })}>
                    Move to Phase {cur + 1} · {BONE_PHASES[cur + 1].label}
                  </button>
                )}
                {cur > 1 && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPendingPhase({ program: p, to: cur - 1 })}>
                    Back to Phase {cur - 1}
                  </button>
                )}
              </div>
            </div>
          )
        })}

        <details className="card notice rehab-redflags bone-safety" open={existing.length === 0}>
          <summary className="group-label">Safety — please read before you start</summary>
          <ul className="bone-safety-list">
            {BONE_SAFETY_POINTS.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </details>

        <Choice
          id="bone-q-fracture"
          question="Have you had a spine (vertebral) fracture, or more than one fracture from a minor fall?"
          hint="A fall from standing height or less counts as minor."
          compact
          value={fracture}
          onChange={answer((v) => { setFracture(v); setPhase(null) })}
          options={[{ value: false, label: 'No' }, { value: true, label: 'Yes / not sure' }]}
        />
        {lowImpact && (
          <p className="muted small bone-callout">
            You&apos;ll get the low-impact version: no jumps or landings — marching instead, which loads your bones about
            as much as brisk walking (the limit the guidance sets after a spine fracture) — with the lighter lifts,
            starting in the technique phase. Please see a physiotherapist before lifting heavy.
          </p>
        )}

        <Choice
          id="bone-q-falls"
          question="Have you fallen in the last year, or do you worry about falling?"
          compact
          value={falls}
          onChange={answer(setFalls)}
          options={[{ value: false, label: 'No' }, { value: true, label: 'Yes' }]}
        />
        {fallRisk && (
          <p className="muted small bone-callout">
            You&apos;ll get extra balance work and no jumping. The strongest evidence for preventing falls is about
            2 hours a week of challenging balance training — ask your doctor about a supervised falls-prevention class
            (such as Otago or FaME) alongside this program.
          </p>
        )}

        <Choice
          id="bone-q-level"
          question="How much weight training have you done?"
          value={level}
          onChange={answer((v) => { setLevel(v); setPhase(null) })}
          options={BONE_LEVELS.map((l) => ({ value: l.id, label: l.label, detail: l.detail }))}
        />

        <Choice
          id="bone-q-time"
          question="How much time do you have?"
          hint="Two sessions a week is what the trials used. Sessions get longer as the weights get heavier — mostly resting between heavy sets."
          value={time}
          onChange={answer(setTime)}
          options={BONE_TIMES.map((t) => {
            const r = level && fracture !== null ? minuteRange({ level, time: t.id, lowImpact, fallRisk, from: start }) : null
            return { value: t.id, label: t.label, detail: `${t.detail}${r ? ` About ${r[0]}–${r[1]} min a session.` : ''}` }
          })}
        />

        {level && fracture !== null && (
          <div className="card">
            <h2 className="group-label bone-q" id="bone-q-phase">Where to start</h2>
            <div className="seg" role="radiogroup" aria-labelledby="bone-q-phase">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={ph === n}
                  className={'seg-item bone-phase' + (ph === n ? ' is-selected' : '')}
                  onClick={() => { setPhase(n); setCleared(false) }}
                  disabled={n > maxPhase}
                >
                  <span className="bone-phase-n">Phase {n}</span>
                  <span>{BONE_PHASES[n].label}</span>
                </button>
              ))}
            </div>
            <p className="muted small">
              <strong>Main lifts {rxLabel(BONE_PHASES[ph])}.</strong> {BONE_PHASES[ph].effort} {BONE_PHASES[ph].advance}
            </p>
            {maxPhase < 3 && (
              <p className="muted small">
                {lowImpact
                  ? 'After a spine fracture the program starts with technique. Move on later from this page, once a physiotherapist is happy with your form.'
                  : 'New lifters build up to 5 × 5 — move on from this page once you’ve learned the lifts.'}
              </p>
            )}
            {ph > start && (
              <p className="muted small import-error">Only start past the technique phase if you already lift these movements with good form.</p>
            )}
            <p className="muted small">
              <strong>Words you&apos;ll see:</strong> a <em>set</em> is a group of repetitions (<em>reps</em>), so
              &ldquo;3 × 8&rdquo; means 3 sets of 8 reps. Your <em>maximum</em> (one-rep max) is the most you could lift once.
            </p>
          </div>
        )}

        {preview && (
          <div className="bone-preview-grid">
            {preview.days.map((d) => (
              <div className="card" key={d.title}>
                <h3 className="day-title">{d.title}</h3>
                <p className="muted small">About {estimateSessionMinutes(d)} min</p>
                <ul className="exercise-preview">
                  {d.exercises.map((e, i) => (
                    <li key={e.id}>
                      <MuscleMap pattern={e.pattern} exId={e.id} size={46} compact />
                      <span className="ex-name">
                        {e.name}
                        {d.exercises[i - 1]?.supersetNext && <span className="ex-sub">Alternate sets with the press</span>}
                        {e.perSide && <span className="ex-sub">{e.perSide === 'alternating legs' ? 'Sets alternate legs' : `Reps ${e.perSide}`}</span>}
                      </span>
                      <span className="muted small">{e.sets} × {range(e)} {e.countLabel || measureUnit(e)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {preview && (
          <>
            <p className="muted small">
              No trap (hex) bar? A regular deadlift — or a dumbbell Romanian deadlift at home — is suggested instead
              during the workout. If your gym has one, tick &ldquo;Trap / hex bar&rdquo; under Settings → Equipment.
            </p>
            <div className="card">
              <h2 className="group-label bone-q">On most other days (recommended, about 10 minutes)</h2>
              <ul className="rehab-improves">
                {BONE_HOME_ROUTINE.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
          </>
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
          <p className="muted small">
            Progression rules (small weight jumps, drop 10% after a stall) follow common practice, e.g.{' '}
            <a href={BONE_PRACTICE_SOURCE.url} target="_blank" rel="noopener noreferrer">{BONE_PRACTICE_SOURCE.label}</a> — not bone-density research.
          </p>
        </details>

        {preview && (
          <label className="consent-row">
            <input type="checkbox" checked={cleared} onChange={(e) => setCleared(e.target.checked)} />
            <span className="muted small">
              {lowImpact
                ? 'A doctor or physiotherapist has cleared me for strength training.'
                : 'I’ve read the safety points. None of them apply to me, or a doctor or physiotherapist has cleared me.'}
            </span>
          </label>
        )}
        {preview && programs.length > 0 && (
          <p className="muted small">
            Creating this makes it your active program. Your current program is kept — switch back anytime under Plans.
          </p>
        )}
        {/* Before the action bar, not after it: the bar only stays pinned to
            the bottom while it is the page's last child. */}
        {blockReason && <p className="muted small bone-block" id="bone-block" role="status">{blockReason}</p>}
      </div>

      <div className="flow-actions">
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/programs')}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={create} disabled={!preview || !cleared} aria-describedby={blockReason ? 'bone-block' : undefined}>
          Create &amp; make active
        </button>
      </div>

      {pendingPhase && (
        <ConfirmModal
          title={`Move to Phase ${pendingPhase.to} · ${BONE_PHASES[pendingPhase.to].label}?`}
          message={`Your three main lifts become ${rxLabel(BONE_PHASES[pendingPhase.to])}${pendingPhase.to > 1 ? ', with ramp-up sets' : ''}. Only those lifts change — your weights and any edits you've made stay. You can undo this.`}
          confirmLabel="Change phase"
          onConfirm={confirmPhase}
          onCancel={() => setPendingPhase(null)}
        />
      )}
    </section>
  )
}
