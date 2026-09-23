// Turns the end-of-session muscle map into a PNG the user can post to Strava,
// Instagram, a group chat — anywhere the OS share sheet reaches.
//
// Two things make this trickier than "serialise the SVG and draw it":
//
// 1. The map's colours are `color-mix(in srgb, var(--mm-heat-hi) …)`. An SVG
//    loaded into an <img> is an isolated document: it can't see the page's
//    stylesheet or its custom properties, so every heat colour would fall back
//    to black. We walk the live nodes, read the *computed* value of each paint
//    property (which resolves both the var() and the color-mix() to an rgb())
//    and write it inline on the clone before serialising.
//
// 2. Safari/iOS only allows navigator.share() from a user gesture, and building
//    the PNG is async. Awaiting the render inside the click handler loses the
//    gesture and throws NotAllowedError. So the card is rendered ahead of time
//    (see the effect in Workout.jsx) and the click handler shares a blob that
//    is already in hand.

// Paint/þtext properties worth carrying over. Geometry stays in the markup.
const COPIED_PROPS = [
  'fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity',
  'stroke-linecap', 'stroke-linejoin', 'opacity',
  'font-size', 'font-family', 'font-weight', 'letter-spacing', 'text-anchor',
]

function inlineComputedPaint(liveRoot, cloneRoot) {
  const live = [liveRoot, ...liveRoot.querySelectorAll('*')]
  const clone = [cloneRoot, ...cloneRoot.querySelectorAll('*')]
  for (let i = 0; i < live.length && i < clone.length; i++) {
    const cs = getComputedStyle(live[i])
    for (const prop of COPIED_PROPS) {
      const v = cs.getPropertyValue(prop)
      if (v && v !== 'none' && v !== 'normal') clone[i].style.setProperty(prop, v)
    }
    // Class hooks are meaningless once the styles are inline, and leaving them
    // on invites the serialised copy to look "styled" when it isn't.
    clone[i].removeAttribute('class')
  }
}

function svgToDataUrl(svgEl) {
  const clone = svgEl.cloneNode(true)
  inlineComputedPaint(svgEl, clone)
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const xml = new XMLSerializer().serializeToString(clone)
  // encodeURIComponent (not btoa) so non-ASCII in any label can't throw.
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not render the muscle map.'))
    img.src = src
  })
}

function themeColors() {
  const cs = getComputedStyle(document.documentElement)
  const pick = (name, fallback) => (cs.getPropertyValue(name) || '').trim() || fallback
  return {
    bg: pick('--surface', '#1b1b1f'),
    text: pick('--text', '#f4f4f5'),
    muted: pick('--muted', '#898989'),
    accent: pick('--accent', '#4dffbc'),
    border: pick('--border', '#36363c'),
  }
}

const SIZE = 1080 // square — safest single size across Strava/Instagram/chat

// Renders the share card and resolves to a PNG Blob (or null if the browser
// can't produce one). `svgEl` is the live <svg> node of the muscle map.
export async function buildShareCard({ svgEl, title, dateLabel, stats = [], muscles = '' }) {
  if (!svgEl || typeof document === 'undefined') return null
  const c = themeColors()
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.fillStyle = c.bg
  ctx.fillRect(0, 0, SIZE, SIZE)

  const PAD = 72
  const font = (px, weight = '600') => `${weight} ${px}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`

  ctx.textAlign = 'left'
  ctx.fillStyle = c.accent
  ctx.font = font(30, '800')
  ctx.fillText('MUSCLES WORKED', PAD, PAD + 30)

  ctx.fillStyle = c.text
  ctx.font = font(64, '800')
  ctx.fillText(title || 'Workout', PAD, PAD + 112)

  if (dateLabel) {
    ctx.fillStyle = c.muted
    ctx.font = font(30, '500')
    ctx.fillText(dateLabel, PAD, PAD + 160)
  }

  // The map itself, scaled to fit the middle band while keeping its aspect.
  const img = await loadImage(svgToDataUrl(svgEl))
  const bandTop = PAD + 200
  const bandH = SIZE - bandTop - 210
  const bandW = SIZE - PAD * 2
  const ratio = Math.min(bandW / img.width, bandH / img.height)
  const w = img.width * ratio
  const h = img.height * ratio
  ctx.drawImage(img, (SIZE - w) / 2, bandTop + (bandH - h) / 2, w, h)

  if (muscles) {
    ctx.fillStyle = c.muted
    ctx.font = font(28, '500')
    ctx.textAlign = 'center'
    // Trim rather than wrap — this line is a highlight, not a paragraph.
    const line = muscles.length > 64 ? `${muscles.slice(0, 61)}…` : muscles
    ctx.fillText(line, SIZE / 2, SIZE - 168)
  }

  // Stat strip along the bottom, evenly spaced.
  if (stats.length) {
    const slot = (SIZE - PAD * 2) / stats.length
    stats.forEach((s, i) => {
      const x = PAD + slot * i + slot / 2
      ctx.textAlign = 'center'
      ctx.fillStyle = c.text
      ctx.font = font(46, '800')
      ctx.fillText(String(s.value), x, SIZE - 96)
      ctx.fillStyle = c.muted
      ctx.font = font(24, '600')
      ctx.fillText(String(s.label).toUpperCase(), x, SIZE - 58)
    })
  }

  ctx.textAlign = 'right'
  ctx.fillStyle = c.muted
  ctx.font = font(24, '600')
  ctx.fillText('Simple Lift', SIZE - PAD, PAD + 30)

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

// True when this browser can put an image file into the OS share sheet.
// Desktop Firefox and older browsers can't — they get the download fallback.
export function canShareImage(blob) {
  if (!blob || typeof navigator === 'undefined' || !navigator.canShare || !navigator.share) return false
  try {
    return navigator.canShare({ files: [new File([blob], 'x.png', { type: 'image/png' })] })
  } catch {
    return false
  }
}

// Hands the PNG to the OS share sheet, or saves it if sharing isn't available.
// Returns 'shared' | 'saved' | 'cancelled'. Must be called from a click.
export async function shareImage(blob, { filename = 'simple-lift.png', title, text } = {}) {
  if (!blob) return 'cancelled'
  const file = new File([blob], filename, { type: 'image/png' })
  if (canShareImage(blob)) {
    try {
      await navigator.share({ files: [file], title, text })
      return 'shared'
    } catch (err) {
      // The user dismissing the sheet is an AbortError, not a failure worth
      // falling back on — saving a file they just declined to share is rude.
      if (err && err.name === 'AbortError') return 'cancelled'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'saved'
}
