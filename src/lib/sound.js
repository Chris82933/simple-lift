// Tiny Web Audio chime — no asset files needed. Used to signal "rest over,
// get back to it." Synthesizes a quick two-note "beep beep" on the fly.
//
// Browsers block audio until the user interacts with the page; since the timer
// only starts after the user taps a set as done, the AudioContext is already
// unlocked by then.

let ctx = null
function getCtx() {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  return ctx
}

function blip(ac, startAt, freq, dur = 0.12) {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  // Quick attack, smooth release so it sounds pleasant, not harsh.
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(0.25, startAt + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + dur)
  osc.connect(gain).connect(ac.destination)
  osc.start(startAt)
  osc.stop(startAt + dur + 0.02)
}

// Happy ascending "beep beep" (A5 → E6).
export function playRestDone() {
  try {
    const ac = getCtx()
    if (!ac) return
    if (ac.state === 'suspended') ac.resume()
    const t = ac.currentTime
    blip(ac, t, 880)
    blip(ac, t + 0.16, 1318.5)
  } catch {
    // Audio is a nicety — never let it break the workout.
  }
}
