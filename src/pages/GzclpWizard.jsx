import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { addProgram, updateProgram, getProgram, loadSettings, getMax } from '../lib/storage.js'
import { getEquipment } from '../lib/equipment.js'
import { EXERCISE_BY_ID } from '../data/exercises.js'
import {
  GZCLP_LIFTS, SEED_MODES, T3_CHOICES, T3_EXTRAS, DAY_FORMATS,
  buildGzclpProgram, previewRotation, oneRMFrom, startWeights, firstDoable,
} from '../lib/gzclpBuild.js'

const STEPS = ['start', 'maxes', 'schedule', 'accessories', 'review']

// Mirrors what the GZCLP spreadsheets' "start" tab does: collect maxes and
// preferences, then hand back a program with every weight already worked out.
export default function GzclpWizard() {
  const navigate = useNavigate()
  const location = useLocation()
  const units = loadSettings().units === 'kg' ? 'kg' : 'lbs'
  const have = new Set(getEquipment().profiles[getEquipment().active] || [])

  // Re-running setup for a program the wizard already built: its answers were
  // saved on the program, so we can reopen exactly where they left off.
  const editingId = location.state?.programId || null
  const existing = editingId ? getProgram(editingId) : null
  const saved = existing?.gzclp || null

  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState(() => ({
    units,
    seedMode: saved?.seedMode || 'oneRM',
    // Prefill from any 1RMs the user has already saved in the app.
    maxes: saved?.maxes || Object.fromEntries(GZCLP_LIFTS.map((l) => [l.id, getMax(l.id)?.oneRM || ''])),
    dayFormat: saved?.dayFormat || 3,
    t3: saved?.t3 || {
      vert_pull: firstDoable(T3_CHOICES.vert_pull.ids, have),
      horiz_pull: firstDoable(T3_CHOICES.horiz_pull.ids, have),
    },
    extra: saved?.extra || 'none',
  }))

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))
  const setMax = (id, v) => setDraft((d) => ({ ...d, maxes: { ...d.maxes, [id]: v } }))
  const setT3 = (slot, id) => setDraft((d) => ({ ...d, t3: { ...d.t3, [slot]: id } }))

  const key = STEPS[step]
  const isLast = step === STEPS.length - 1
  // "Start light" needs no numbers; the other modes want at least one lift filled in.
  const isValid = key !== 'maxes' || draft.seedMode === 'light'
    || GZCLP_LIFTS.some((l) => Number(draft.maxes[l.id]) > 0)

  const next = () => {
    if (!isValid) return
    if (key === 'start' && draft.seedMode === 'light') { setStep(2); return }
    if (isLast) {
      const built = buildGzclpProgram(draft)
      if (existing) {
        // Keep the program's identity, name, and place in the rotation; replace
        // the workouts and their freshly computed starting weights.
        updateProgram({ ...existing, ...built, id: existing.id, name: existing.name })
      } else {
        addProgram(built)
      }
      navigate('/today')
      return
    }
    setStep((s) => s + 1)
  }
  const back = () => {
    if (step === 0) { navigate(existing ? '/program' : '/templates'); return }
    if (step === 2 && draft.seedMode === 'light') { setStep(0); return }
    setStep((s) => s - 1)
  }

  const rows = previewRotation(draft)
  const w = (n) => (n == null ? '—' : `${n} ${units}`)

  return (
    <section className="page full-flow">
      <header className="page-header">
        <div className="onb-head-row">
          <p className="eyebrow">{existing ? 'Adjust GZCLP' : 'GZCLP setup'} · step {step + 1} of {STEPS.length}</p>
          <button type="button" className="skip-link" onClick={() => navigate(existing ? '/program' : '/templates')}>
            Cancel →
          </button>
        </div>
        <div className="progress-track" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </header>

      <div className="step-body">
        {key === 'start' && (
          <>
            <h1>Where are you starting from?</h1>
            <p className="muted">
              GZCLP begins deliberately light — around 75% of your max for the T1 lift — so the
              automatic stage drops have room to work. Tell us what you know and we&apos;ll do the maths.
            </p>
            {SEED_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={'path-card' + (draft.seedMode === m.id ? ' is-primary' : '')}
                onClick={() => set({ seedMode: m.id })}
              >
                <span className="path-title">{m.label}</span>
                <span className="muted small">{m.hint}</span>
              </button>
            ))}
          </>
        )}

        {key === 'maxes' && (
          <>
            <h1>{draft.seedMode === 'fiveRM' ? 'Your best set of 5' : 'Your one-rep maxes'}</h1>
            <p className="muted">
              In {units}. Leave a lift blank if you don&apos;t know it — you can enter its weight on
              the first session instead.
            </p>
            {GZCLP_LIFTS.map((l) => {
              const oneRM = oneRMFrom(draft.seedMode, draft.maxes[l.id], units)
              const sw = startWeights(oneRM, units)
              return (
                <div className="card gz-lift" key={l.id}>
                  <label className="gz-lift-row">
                    <span className="gz-lift-name">{l.label}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      className="text-input gz-input"
                      value={draft.maxes[l.id]}
                      onChange={(e) => setMax(l.id, e.target.value)}
                      placeholder={draft.seedMode === 'fiveRM' ? 'weight × 5' : '1RM'}
                    />
                  </label>
                  <p className="muted small">
                    {sw.t1 == null
                      ? 'No number yet — the workout screen will ask for a weight.'
                      : `Starts at ${w(sw.t1)} for T1 (5×3+) and ${w(sw.t2)} for T2 (3×10).`}
                  </p>
                </div>
              )
            })}
          </>
        )}

        {key === 'schedule' && (
          <>
            <h1>How often can you train?</h1>
            <p className="muted">
              Either way you run the same four workouts — A1, B1, A2, B2 — in a rolling rotation, so
              a missed day never breaks the sequence.
            </p>
            {DAY_FORMATS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={'path-card' + (draft.dayFormat === f.id ? ' is-primary' : '')}
                onClick={() => set({ dayFormat: f.id })}
              >
                <span className="path-title">{f.label}</span>
                <span className="muted small">{f.hint}</span>
              </button>
            ))}
          </>
        )}

        {key === 'accessories' && (
          <>
            <h1>Pick your T3 work</h1>
            <p className="muted">
              T3 is the high-rep tier: 3×15 with an AMRAP last set. Hit 25+ reps on that set and the
              weight goes up. We&apos;ve pre-picked what your equipment supports.
            </p>
            {Object.entries(T3_CHOICES).map(([slot, group]) => (
              <div className="card" key={slot}>
                <p className="group-label">{group.label}</p>
                <div className="choice-chips">
                  {group.ids.map((id) => {
                    const lib = EXERCISE_BY_ID[id]
                    const doable = (lib.requires || []).every((r) => have.has(r))
                    return (
                      <button
                        key={id}
                        type="button"
                        className={'chip' + (draft.t3[slot] === id ? ' is-selected' : '')}
                        onClick={() => setT3(slot, id)}
                      >
                        {lib.name}{doable ? '' : ' ·  no gear'}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            <div className="card">
              <p className="group-label">Add one more movement per workout?</p>
              <div className="choice-chips">
                {T3_EXTRAS.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    className={'chip' + (draft.extra === e.id ? ' is-selected' : '')}
                    onClick={() => set({ extra: e.id })}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
              <p className="muted small">Optional. Sessions are already three tiers deep.</p>
            </div>
          </>
        )}

        {key === 'review' && (
          <>
            <h1>Your GZCLP</h1>
            <p className="muted">
              {draft.dayFormat} days a week, four rotating workouts. Everything below is editable
              afterwards in the program builder.
            </p>
            {rows.map((r) => (
              <div className="card" key={r.key}>
                <p className="day-title">{r.key} · {r.t1}</p>
                <div className="log-row"><span>T1 · {r.t1} 5×3+</span><span className="muted small">{w(r.t1Weight)}</span></div>
                <div className="log-row"><span>T2 · {r.t2} 3×10</span><span className="muted small">{w(r.t2Weight)}</span></div>
                <div className="log-row">
                  <span>T3 · {EXERCISE_BY_ID[draft.t3[r.key.startsWith('A') ? 'vert_pull' : 'horiz_pull']].name} 3×15+</span>
                  <span className="muted small">your choice</span>
                </div>
                {draft.extra !== 'none' && (
                  <div className="log-row">
                    <span>T3 · {EXERCISE_BY_ID[T3_EXTRAS.find((e) => e.id === draft.extra).ids[0]].name} 3×15+</span>
                    <span className="muted small">extra</span>
                  </div>
                )}
              </div>
            ))}
            {existing && (
              <div className="card notice">
                <p className="muted small">
                  ⚠️ <strong>This replaces your current GZCLP weights and stages.</strong> Each lift
                  restarts at Stage 1 with the weights above, so if a lift had worked its way down
                  to 6×2 or 10×1 it goes back to 5×3. Your logged history and PRs are untouched.
                </p>
              </div>
            )}
            <div className="card notice">
              <p className="muted small">
                📈 <strong>How it progresses:</strong> finish every set and the weight goes up next
                time (+{units === 'kg' ? '5' : '10'} {units} squat &amp; deadlift, +{units === 'kg' ? '2.5' : '5'} {units} bench &amp; press).
                Miss reps and the app drops you to a harder-to-fail stage at the same weight —
                5×3 → 6×2 → 10×1 for T1, 3×10 → 3×8 → 3×6 for T2 — before it ever resets you.
              </p>
            </div>
          </>
        )}
      </div>

      <div className="flow-actions">
        <button type="button" className="btn btn-ghost" onClick={back}>Back</button>
        <button type="button" className="btn btn-primary" onClick={next} disabled={!isValid}>
          {isLast ? (existing ? 'Update my program' : 'Create my program') : 'Next'}
        </button>
      </div>
    </section>
  )
}
