import { useEffect, useRef, useState } from 'react'
import { playRestDone } from '../lib/sound.js'

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// Countdown rest timer shown after a set is completed. Auto-counts down and,
// when it reaches zero, flashes "Go!" with a beep + a vibration pulse (so you
// still get the cue with the phone on silent) before handing control back.
export default function RestTimer({ seconds, onDone }) {
  const [remaining, setRemaining] = useState(seconds)
  const [phase, setPhase] = useState('count') // 'count' → 'go'
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    setRemaining(seconds)
    setPhase('count')
  }, [seconds])

  // Countdown tick.
  useEffect(() => {
    if (phase !== 'count') return
    if (remaining <= 0) {
      setPhase('go')
      return
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000)
    return () => clearTimeout(id)
  }, [remaining, phase])

  // "Go!" flash: beep + vibrate, then hand control back. In its own effect so
  // the hand-back timeout isn't cancelled by the phase-change re-render.
  useEffect(() => {
    if (phase !== 'go') return
    playRestDone()
    try { navigator.vibrate?.([120, 70, 120]) } catch { /* not supported */ }
    const id = setTimeout(() => doneRef.current?.(), 850)
    return () => clearTimeout(id)
  }, [phase])

  if (phase === 'go') {
    return (
      <div className="rest-timer is-go" role="status">
        <div className="rest-timer-inner">
          <span className="rest-go">Go! 💪</span>
        </div>
      </div>
    )
  }

  return (
    <div className="rest-timer" role="status">
      <div className="rest-timer-inner">
        <span className="rest-label">Rest</span>
        <span className="rest-count">{fmt(Math.max(0, remaining))}</span>
        <div className="rest-actions">
          <button type="button" className="rest-btn" onClick={() => setRemaining((r) => Math.max(0, r - 15))} aria-label="Subtract 15 seconds">
            −15s
          </button>
          <button type="button" className="rest-btn" onClick={() => setRemaining((r) => r + 15)} aria-label="Add 15 seconds">
            +15s
          </button>
          <button type="button" className="rest-btn primary" onClick={() => doneRef.current?.()}>
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}
