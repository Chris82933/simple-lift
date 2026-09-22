import { useEffect, useRef, useState } from 'react'
import { playRestDone } from '../lib/sound.js'
import { loadSettings } from '../lib/storage.js'

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// One row inside the merged rest-timer stack. Counts down from an absolute end
// time (so backgrounding never makes it drift), keeps its own ±15s / Skip
// controls, flashes "Go!" with a chime, then removes itself. Several of these
// run at once during a superset — hence the compact, stacked layout.
function MiniTimer({ label, seconds, onDone }) {
  const [endAt, setEndAt] = useState(() => Date.now() + seconds * 1000)
  const [left, setLeft] = useState(seconds)
  const [done, setDone] = useState(false)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    if (done) return undefined
    const tick = () => {
      const l = Math.max(0, Math.round((endAt - Date.now()) / 1000))
      setLeft(l)
      if (l <= 0) setDone(true)
    }
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [endAt, done])

  useEffect(() => {
    if (!done) return undefined
    if (loadSettings().restSound !== false) { try { playRestDone() } catch { /* ignore */ } }
    try { navigator.vibrate?.(120) } catch { /* not supported */ }
    const id = setTimeout(() => doneRef.current?.(), 900)
    return () => clearTimeout(id)
  }, [done])

  // ±15s shift the end time (never earlier than now).
  const adjust = (deltaSec) => setEndAt((e) => Math.max(Date.now(), e + deltaSec * 1000))

  return (
    <div className={'mini-timer' + (done ? ' is-go' : '')}>
      <span className="mini-timer-label" title={label}>{label}</span>
      {done ? (
        <span className="mini-timer-go">Go!</span>
      ) : (
        <>
          <span className="mini-timer-count">{fmt(left)}</span>
          <div className="mini-timer-actions">
            <button type="button" className="mini-btn" onClick={() => adjust(-15)} aria-label={`Subtract 15 seconds from ${label} rest`}>−15s</button>
            <button type="button" className="mini-btn" onClick={() => adjust(15)} aria-label={`Add 15 seconds to ${label} rest`}>+15s</button>
            <button type="button" className="mini-btn mini-btn-skip" onClick={() => doneRef.current?.()} aria-label={`Skip ${label} rest`}>Skip</button>
          </div>
        </>
      )}
    </div>
  )
}

// The merged stack of concurrent rest timers (superset mode). One container so
// a handful of timers stay tidy; each row keeps its own name and controls.
export default function RestTimers({ timers, onDone }) {
  if (!timers.length) return null
  return (
    <div className="rest-timers" role="status" aria-label="Rest timers">
      {timers.map((t) => (
        <MiniTimer key={t.key} label={t.label} seconds={t.seconds} onDone={() => onDone(t.key)} />
      ))}
    </div>
  )
}
