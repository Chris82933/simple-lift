// Muscle-map exercise icon: a front + back body in the app's theme colours that
// highlights the muscles an exercise targets. Data-driven — the body art and
// the muscle→region map live here; each exercise supplies its muscle ids (see
// musclesFor in data/exercises.js), so any two exercises that hit the same
// muscles render the identical icon. Bright = primary movers, dim = secondary.
import { EXERCISE_BY_ID, musclesFor } from '../data/exercises.js'

// --- Geometry (Option A: shoulders ~24 wide, short neck, short arms) --------
// Shape descriptors → React SVG elements. Coordinates live in a 0–100 box per
// body; the two bodies sit side by side in a 0 0 200 100 viewBox.
const e = (cx, cy, rx, ry, rot) => ({ t: 'e', cx, cy, rx, ry, rot })
const p = (d) => ({ t: 'p', d })
const r = (x, y, w, h, rx) => ({ t: 'r', x, y, w, h, rx })
const l = (x1, y1, x2, y2, w) => ({ t: 'l', x1, y1, x2, y2, w })
const c = (cx, cy, cr) => ({ t: 'c', cx, cy, cr })

const NECK = 'M47 18.5 L53 18.5 L54 24 L46 24 Z'
// Body silhouette, shared by both views. Arms are round-capped strokes.
const BASE_FILL = [
  e(50, 11, 6.2, 7.6), p(NECK),
  p('M45 25 C40 25 38 27 38.5 30 L43 50 C43.3 55 45 58 48 58.5 L52 58.5 C55 58 56.7 55 57 50 L61.5 30 C62 27 60 25 55 25 C54 23.5 46 23.5 45 25 Z'),
  c(25, 60, 3.5), c(75, 60, 3.5),
  e(50, 57, 9, 6),
  e(45.3, 68, 4.4, 12), e(54.7, 68, 4.4, 12),
  e(45.5, 86, 3.3, 9), e(54.5, 86, 3.3, 9),
  e(45.5, 95.5, 3, 2), e(54.5, 95.5, 3, 2),
]
const BASE_ARMS = [
  l(39, 29, 33, 44, 6), l(33, 44, 27, 57, 4.6),
  l(61, 29, 67, 44, 6), l(67, 44, 73, 57, 4.6),
]
const LINES_FRONT = [
  { t: 's', d: 'M43 33 Q50 39 57 33' }, { t: 's', d: 'M50 30 L50 50' }, { t: 'cf', cx: 50, cy: 50, cr: 0.7 },
]
const LINES_BACK = [
  { t: 's', d: 'M50 26 L50 56' }, { t: 's', d: 'M46 32 Q48 31 48 37' },
  { t: 's', d: 'M54 32 Q52 31 52 37' }, { t: 's', d: 'M50 58 L50 66' },
]

const FRONT = {
  neck: [p(NECK)],
  delts: [e(40, 30, 3.5, 3.4), e(60, 30, 3.5, 3.4)],
  chest: [p('M44 29 C41 29 40.5 32 41.5 36 C43 38 47 38 48 36 L48 30.5 C47 29.2 45.5 28.8 44 29 Z'),
    p('M56 29 C59 29 59.5 32 58.5 36 C57 38 53 38 52 36 L52 30.5 C53 29.2 54.5 28.8 56 29 Z')],
  biceps: [e(36, 36.5, 2.5, 4.3, -22), e(64, 36.5, 2.5, 4.3, 22)],
  forearms: [e(30, 50.5, 2.2, 4.8, -25), e(70, 50.5, 2.2, 4.8, 25)],
  abs: [r(45.8, 37, 8.4, 14, 3)],
  obliques: [e(43.2, 44, 1.8, 5.5), e(56.8, 44, 1.8, 5.5)],
  quads: [e(45.3, 68, 3.8, 11), e(54.7, 68, 3.8, 11)],
  shins: [e(45.5, 86, 2.6, 7.5), e(54.5, 86, 2.6, 7.5)],
}
const BACK = {
  traps: [p('M50 24 L55 30 L52.5 39 L47.5 39 L45 30 Z')],
  delts: [e(40, 30, 3.5, 3.4), e(60, 30, 3.5, 3.4)],
  triceps: [e(36, 36.5, 2.5, 4.3, -22), e(64, 36.5, 2.5, 4.3, 22)],
  lats: [p('M42 34 C45 34 47 36 47 40 L46 49 C45 51 42.5 50 41.5 47 C40 42 40 37 42 34 Z'),
    p('M58 34 C55 34 53 36 53 40 L54 49 C55 51 57.5 50 58.5 47 C60 42 60 37 58 34 Z')],
  lower_back: [r(45.8, 48, 8.4, 7, 2.5)],
  glutes: [e(45.8, 60, 4.5, 4.8), e(54.2, 60, 4.5, 4.8)],
  hamstrings: [e(45.3, 70, 3.8, 10), e(54.7, 70, 3.8, 10)],
  calves: [e(45.5, 85, 3.3, 8), e(54.5, 85, 3.3, 8)],
  forearms: [e(30, 50.5, 2.2, 4.8, -25), e(70, 50.5, 2.2, 4.8, 25)],
}

// Muscle id → which body region(s) light up.
const MUSCLE_MAP = {
  chest: [['front', 'chest']], shoulders: [['front', 'delts'], ['back', 'delts']],
  triceps: [['back', 'triceps']], biceps: [['front', 'biceps']],
  forearms: [['front', 'forearms'], ['back', 'forearms']], lats: [['back', 'lats']],
  traps: [['back', 'traps']], lower_back: [['back', 'lower_back']], abs: [['front', 'abs']],
  obliques: [['front', 'obliques']], core: [['front', 'abs'], ['front', 'obliques']],
  glutes: [['back', 'glutes']], quads: [['front', 'quads']], hamstrings: [['back', 'hamstrings']],
  calves: [['back', 'calves']], tibialis: [['front', 'shins']],
  neck: [['front', 'neck'], ['back', 'traps']],
}

// Resolve muscle ids → { front: Map(regionKey→level), back: Map(...) }
function highlightRegions({ primary = [], secondary = [] }) {
  const front = new Map(), back = new Map()
  const add = (ids, level) => {
    for (const m of ids) for (const [side, key] of MUSCLE_MAP[m] || []) {
      const map = side === 'front' ? front : back
      if (map.get(key) !== 'primary') map.set(key, level)
    }
  }
  add(secondary, 'secondary')
  add(primary, 'primary')
  return { front, back }
}

// heat: { muscleId: 0–1 } → per-region intensity (max over muscles hitting it).
function heatRegions(heat) {
  const front = new Map(), back = new Map()
  for (const [m, v] of Object.entries(heat || {})) {
    for (const [side, key] of MUSCLE_MAP[m] || []) {
      const map = side === 'front' ? front : back
      map.set(key, Math.max(map.get(key) || 0, v))
    }
  }
  return { front, back }
}

// Intensity → inline fill/opacity: shades of mint, darker = more worked.
function heatStyle(v) {
  return { fill: `color-mix(in srgb, var(--mm-heat-hi) ${Math.round(v * 100)}%, var(--mm-heat-lo))`, opacity: 0.55 + 0.45 * v }
}

const Shape = ({ s, cls, style }) => {
  if (s.t === 'e') return <ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} className={cls} style={style} transform={s.rot ? `rotate(${s.rot} ${s.cx} ${s.cy})` : undefined} />
  if (s.t === 'p') return <path d={s.d} className={cls} style={style} />
  if (s.t === 'r') return <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} ry={s.rx} className={cls} style={style} />
  if (s.t === 'l') return <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} strokeWidth={s.w} className="mm-stroke" />
  if (s.t === 'c') return <circle cx={s.cx} cy={s.cy} r={s.cr} className={cls} style={style} />
  if (s.t === 's') return <path d={s.d} className="mm-line" />
  if (s.t === 'cf') return <circle cx={s.cx} cy={s.cy} r={s.cr} className="mm-line-fill" />
  return null
}

function BodyView({ side, regions, heat }) {
  const R = side === 'front' ? FRONT : BACK
  const lines = side === 'front' ? LINES_FRONT : LINES_BACK
  return (
    <g>
      {BASE_FILL.map((s, i) => <Shape key={`bf${i}`} s={s} cls="mm-fill" />)}
      {BASE_ARMS.map((s, i) => <Shape key={`ba${i}`} s={s} cls="mm-stroke" />)}
      {lines.map((s, i) => <Shape key={`ln${i}`} s={s} cls="mm-line" />)}
      {[...regions].flatMap(([key, level]) => (R[key] || []).map((s, i) =>
        heat
          ? <Shape key={`${key}${i}`} s={s} cls="mm-heat" style={heatStyle(level)} />
          : <Shape key={`${key}${i}`} s={s} cls={level === 'primary' ? 'mm-primary' : 'mm-secondary'} />))}
    </g>
  )
}

// viewBox cropped to the two bodies (+ a little room for the labels), so they
// fill the box rather than floating in whitespace. `size` is the rendered WIDTH.
const VB = { x: 8, w: 180, h: 108 }

// Which single view carries the most signal (primary=2, secondary=1) — used by
// compact mode so a list icon shows one legible body instead of two tiny ones.
function dominantSide(front, back) {
  const score = (m) => [...m.values()].reduce((a, lv) => a + (lv === 'primary' ? 2 : 1), 0)
  return score(back) > score(front) ? 'back' : 'front'
}

export default function MuscleMap({ exId, pattern, muscles, heat, size = 96, labels = false, compact = false }) {
  const isHeat = !!heat
  const { front, back } = isHeat
    ? heatRegions(heat)
    : highlightRegions(muscles || musclesFor(EXERCISE_BY_ID[exId] || { id: exId, pattern }))

  // Compact: one dominant body, cropped so it fills the box (list/picker icons).
  if (compact && !isHeat) {
    const side = dominantSide(front, back)
    const VBW = 78
    return (
      <svg
        width={size} height={Math.round((size * 100) / VBW)} viewBox={`11 0 ${VBW} 100`}
        preserveAspectRatio="xMidYMid meet"
        role="img" aria-hidden="true" className="exercise-figure muscle-map muscle-map-compact"
      >
        <g transform="translate(0,1)"><BodyView side={side} regions={side === 'front' ? front : back} /></g>
      </svg>
    )
  }
  return (
    <svg
      width={size} height={Math.round((size * VB.h) / VB.w)} viewBox={`${VB.x} 0 ${VB.w} ${VB.h}`}
      preserveAspectRatio="xMidYMid meet"
      role="img" aria-hidden="true" className="exercise-figure muscle-map"
    >
      <g transform="translate(0,1)"><BodyView side="front" regions={front} heat={isHeat} /></g>
      <g transform="translate(96,1)"><BodyView side="back" regions={back} heat={isHeat} /></g>
      {labels && (
        <g className="mm-label">
          <text x="50" y="105" textAnchor="middle" fontSize="5.5" letterSpacing="0.6">FRONT</text>
          <text x="146" y="105" textAnchor="middle" fontSize="5.5" letterSpacing="0.6">BACK</text>
        </g>
      )}
    </svg>
  )
}

// Exported for tests.
export { MUSCLE_MAP, highlightRegions, heatRegions }
