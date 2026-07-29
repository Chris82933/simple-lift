import { useEffect, useRef, useState } from 'react'
import { playRestDone } from '../lib/sound.js'
import { loadSettings, saveSettings } from '../lib/storage.js'
import { scheduleRestDone, cancelRestDone, notificationPermission } from '../lib/notify.js'

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
const secsLeft = (endAt) => Math.max(0, Math.round((endAt - Date.now()) / 1000))

// Countdown rest timer shown after a set is completed. It counts down from an
// ABSOLUTE end time rather than by ticking a counter, so backgrounding the app —
// where browsers throttle or freeze timers — never makes it drift: on return we
// just recompute from the clock. When it reaches zero it flashes "Go!" with a
// chime + vibration. If the user has enabled rest notifications, one is scheduled
// while the app is backgrounded (and cancelled the moment they come back).
export default function RestTimer({ seconds, onDone }) {
  const [endAt, setEndAt] = useState(() => Date.now() + seconds * 1000)
  const [remaining, setRemaining] = useState(seconds)
  const [phase, setPhase] = useState('count') // 'count' → 'go'
  const [soundOn, setSoundOn] = useState(() => loadSettings().restSound !== false)
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  const soundRef = useRef(soundOn)
  soundRef.current = soundOn
  const notifyOn = loadSettings().restNotify === true && notificationPermission() === 'granted'

  const toggleSound = () => {
    setSoundOn((on) => {
      const next = !on
      saveSettings({ ...loadSettings(), restSound: next })
      if (next) playRestDone() // preview the chime when turning it on
      return next
    })
  }

  // A new rest starts: reset the end time and phase.
  useEffect(() => {
    setEndAt(Date.now() + seconds * 1000)
    setRemaining(seconds)
    setPhase('count')
  }, [seconds])

  // Derive the remaining seconds from the clock on a light interval. Even if the
  // interval is throttled while backgrounded, the value is correct whenever it
  // does run.
  useEffect(() => {
    if (phase !== 'count') return
    const tick = () => {
      const left = secsLeft(endAt)
      setRemaining(left)
      if (left <= 0) setPhase('go')
    }
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [endAt, phase])

  // Recompute immediately when the app returns to the foreground, and manage the
  // optional background notification: schedule on leave, cancel on return (so it
  // never double-fires while the user is watching the timer).
  useEffect(() => {
    if (phase !== 'count') return
    const onVis = () => {
      if (document.hidden) {
        if (notifyOn) scheduleRestDone(endAt)
      } else {
        cancelRestDone()
        const left = secsLeft(endAt)
        setRemaining(left)
        if (left <= 0) setPhase('go')
      }
    }
    document.addEventListener('visibilitychange', onVis)
    if (document.hidden && notifyOn) scheduleRestDone(endAt)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      cancelRestDone()
    }
  }, [endAt, phase, notifyOn])

  // "Go!" flash: chime (if on) + vibrate, then hand control back.
  useEffect(() => {
    if (phase !== 'go') return
    cancelRestDone()
    if (soundRef.current) playRestDone()
    try { navigator.vibrate?.([120, 70, 120]) } catch { /* not supported */ }
    const id = setTimeout(() => doneRef.current?.(), 850)
    return () => clearTimeout(id)
  }, [phase])

  // ±15s shift the end time (clamped so it never lands before now).
  const adjust = (deltaSec) => setEndAt((e) => Math.max(Date.now(), e + deltaSec * 1000))

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
          <button
            type="button"
            className="rest-btn rest-mute"
            onClick={toggleSound}
            aria-label={soundOn ? 'Mute rest-end sound' : 'Unmute rest-end sound'}
            aria-pressed={soundOn}
            title={soundOn ? 'Chime on' : 'Chime off'}
          >
            {soundOn ? '🔊' : '🔇'}
          </button>
          <button type="button" className="rest-btn" onClick={() => adjust(-15)} aria-label="Subtract 15 seconds">
            −15s
          </button>
          <button type="button" className="rest-btn" onClick={() => adjust(15)} aria-label="Add 15 seconds">
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
