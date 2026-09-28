import { useRef, useState } from 'react'
import useModalA11y from '../../lib/useModalA11y.js'

// The four "what is this?" explainers behind the little ⓘ buttons. They are
// plain copy with no layout of their own, so both the phone column and the
// desktop workspace render the exact same sheets rather than keeping two
// copies of the text in sync by hand.
//
// Returns the dialog markup ready to drop in at the end of a page, plus the
// `show` opener the ⓘ buttons call. The rendered tree is identical to what
// Builder.jsx emitted inline before this was extracted.
export default function useInfoDialogs() {
  const [amrapInfo, setAmrapInfo] = useState(false)
  const [warmupInfo, setWarmupInfo] = useState(false)
  const [isoInfo, setIsoInfo] = useState(false)
  const [startWtInfo, setStartWtInfo] = useState(false)
  const amrapRef = useRef(null)
  const warmupRef = useRef(null)
  const isoRef = useRef(null)
  const startWtRef = useRef(null)
  useModalA11y(amrapRef, () => setAmrapInfo(false), amrapInfo)
  useModalA11y(warmupRef, () => setWarmupInfo(false), warmupInfo)
  useModalA11y(isoRef, () => setIsoInfo(false), isoInfo)
  useModalA11y(startWtRef, () => setStartWtInfo(false), startWtInfo)

  const show = {
    amrap: () => setAmrapInfo(true),
    warmup: () => setWarmupInfo(true),
    iso: () => setIsoInfo(true),
    startWt: () => setStartWtInfo(true),
  }

  const dialogs = (
    <>
      {amrapInfo && (
        <div className="picker-overlay" role="dialog" aria-modal="true" aria-label="About AMRAP" onClick={() => setAmrapInfo(false)} ref={amrapRef} tabIndex={-1}>
          <div className="info-sheet" onClick={(e) => e.stopPropagation()}>
            <p className="info-title">AMRAP last set</p>
            <p className="muted small">
              AMRAP means <strong>“as many reps as possible.”</strong> You do your normal sets, then push the
              <strong> final set</strong> for max clean reps instead of stopping at the target.
            </p>
            <p className="muted small">
              It’s how programs like <strong>Greyskull LP</strong> and <strong>5/3/1</strong> work: a strong last set
              earns bigger jumps, and it’s a simple way to autoregulate — some days you have more in the tank than others.
            </p>
            <p className="muted small">Leave it off for a steady, fixed-rep approach.</p>
            <button type="button" className="btn btn-primary" onClick={() => setAmrapInfo(false)}>Got it</button>
          </div>
        </div>
      )}

      {warmupInfo && (
        <div className="picker-overlay" role="dialog" aria-modal="true" aria-label="About warm-up ramp" onClick={() => setWarmupInfo(false)} ref={warmupRef} tabIndex={-1}>
          <div className="info-sheet" onClick={(e) => e.stopPropagation()}>
            <p className="info-title">Warm-up ramp</p>
            <p className="muted small">
              Your <strong>working sets</strong> stay at one weight for the same reps — that&apos;s on purpose, and it&apos;s how nearly every program (StrongLifts, r/Fitness PPL, 5/3/1) is written.
            </p>
            <p className="muted small">
              What was missing is the <strong>warm-up</strong>. With this on, the app adds a few lighter ramp-up sets before your working sets — <strong>~40% × 5, 60% × 3, 80% × 2</strong> of your working weight — lighter with more reps, building to heavy with fewer. It primes the movement so your first working set isn&apos;t cold.
            </p>
            <p className="muted small">Warm-up weights are figured from your working weight, which comes from your 1RM.</p>
            <button type="button" className="btn btn-primary" onClick={() => setWarmupInfo(false)}>Got it</button>
          </div>
        </div>
      )}

      {isoInfo && (
        <div className="picker-overlay" role="dialog" aria-modal="true" aria-label="About isometric holds" onClick={() => setIsoInfo(false)} ref={isoRef} tabIndex={-1}>
          <div className="info-sheet" onClick={(e) => e.stopPropagation()}>
            <p className="info-title">Isometric hold</p>
            <p className="muted small">
              Turns this lift into a <strong>timed hold</strong> instead of reps — you hold the position (or push/pull against resistance) for time. Any normal lift can become one: a <strong>held lat pulldown</strong>, a paused squat, a mid-thigh pull.
            </p>
            <p className="muted small">
              It sets the classic protocol — <strong>4 sets × 30 sec, ~3-min rest</strong> — which you can edit. The set columns switch to <strong>seconds</strong>. During the workout you get a countdown to time each hold.
            </p>
            <p className="muted small">
              If the lift is loaded (like a pulldown), it <strong>keeps its weight</strong> — hold that weight for time. Bodyweight holds just track seconds.
            </p>
            <button type="button" className="btn btn-primary" onClick={() => setIsoInfo(false)}>Got it</button>
          </div>
        </div>
      )}

      {startWtInfo && (
        <div className="picker-overlay" role="dialog" aria-modal="true" aria-label="About Start wt" onClick={() => setStartWtInfo(false)} ref={startWtRef} tabIndex={-1}>
          <div className="info-sheet" onClick={(e) => e.stopPropagation()}>
            <p className="info-title">Start wt</p>
            <p className="muted small">
              Your working weight is a <strong>percentage of your 1RM</strong>, picked for this exercise's rep target — heavier percentages for low reps, lighter for high reps.
            </p>
            <p className="muted small">
              If you have a <strong>real, tested 1RM</strong> saved for this lift, that's what's used. If you don't, we fall back to a <strong>rough estimate</strong> from typical strength ratios to your other saved maxes — those are marked <strong>“≈ est.”</strong> right on the field, so you can always tell a guess from a tested number.
            </p>
            <p className="muted small">
              Test the real thing anytime in the 1RM tool, or just type your own number here — typing over the field clears the estimate mark, since it's now your number.
            </p>
            <button type="button" className="btn btn-primary" onClick={() => setStartWtInfo(false)}>Got it</button>
          </div>
        </div>
      )}
    </>
  )

  return { show, dialogs }
}
