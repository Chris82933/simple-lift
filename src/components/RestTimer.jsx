import { useEffect, useRef, useState } from 'react'
import { playRestDone } from '../lib/sound.js'

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// Countdown rest timer shown after a set is completed. Auto-counts down and
// calls onDone when it reaches zero (or when skipped).
export default function RestTimer({ seconds, onDone }) {
  const [remaining, setRemaining] = useState(seconds)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    setRemaining(seconds)
  }, [seconds])

  useEffect(() => {
    if (remaining <= 0) {
      playRestDone() // happy "beep beep" — rest's over, get back to it
      doneRef.current?.()
      return
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000)
    return () => clearTimeout(id)
  }, [remaining])

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
