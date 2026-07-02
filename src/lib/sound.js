// Tiny Web Audio chime — no asset files needed. Signals "rest over, get back to
// it" with a warm, happy piano-style major arpeggio synthesized on the fly.
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

// One warm, piano-ish note: a few decaying harmonics through a soft low-pass,
// with a fast attack and long exponential release (that "struck string" feel).
function pianoNote(ac, freq, startAt, dur = 1.0, level = 0.2) {
  const master = ac.createGain()
  const lp = ac.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 2600
  lp.Q.value = 0.6
  master.connect(lp).connect(ac.destination)

  master.gain.setValueAtTime(0.0001, startAt)
  master.gain.exponentialRampToValueAtTime(level, startAt + 0.006)
  master.gain.exponentialRampToValueAtTime(0.0001, startAt + dur)

  // Fundamental + a few quieter overtones give it warmth and body.
  const partials = [[1, 1, 'triangle'], [2, 0.32, 'sine'], [3, 0.14, 'sine'], [4, 0.07, 'sine']]
  for (const [mult, amp, type] of partials) {
    const osc = ac.createOscillator()
    osc.type = type
    osc.frequency.value = freq * mult
    const g = ac.createGain()
    g.gain.value = amp
    osc.connect(g).connect(master)
    osc.start(startAt)
    osc.stop(startAt + dur + 0.05)
  }
}

// Bright, happy ascending C-major arpeggio (C5 · E5 · G5 · C6).
export function playRestDone() {
  try {
    const ac = getCtx()
    if (!ac) return
    if (ac.state === 'suspended') ac.resume()
    const t = ac.currentTime + 0.02
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((freq, i) => pianoNote(ac, freq, t + i * 0.1, i === notes.length - 1 ? 1.3 : 0.9, 0.2))
  } catch {
    // Audio is a nicety — never let it break the workout.
  }
}
