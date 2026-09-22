import { useEffect, useRef, useState } from 'react'
import { playRestDone } from '../lib/sound.js'
import { loadSettings } from '../lib/storage.js'

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// One simple countdown segment inside the merged rest-timer pill. Counts down
// from an absolute end time (so backgrounding never makes it drift), flashes
// "Go!" with a chime, then removes itself. Deliberately minimal — the full
// single-timer control (±15s, mute) lives in RestTimer; these are the
// lightweight superset timers you can run several of at once.
function MiniTimer({ label, seconds, onDone }) {
  const [endAt] = useState(() => Date.now() + seconds * 1000)
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
    const id = setTimeout(() => doneRef.current?.(), 800)
    return () => clearTimeout(id)
  }, [done])

  return (
    <div className={'mini-timer' + (done ? ' is-go' : '')}>
      <span className="mini-timer-label">{label}</span>
      <span className="mini-timer-count">{done ? 'Go!' : fmt(left)}</span>
      <button
        type="button"
        className="mini-timer-skip"
        onClick={() => doneRef.current?.()}
        aria-label={`Skip ${label} rest`}
      >
        ✕
      </button>
    </div>
  )
}

// The merged pill of concurrent rest timers (superset mode). Each timer keeps
// its own countdown and its own skip button; they share one container so a
// stack of them takes little space.
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
