// Lightweight multi-series line chart (SVG, no dependencies).
// series = [{ id, name, color, points: [{ t (ms), weight }] }] — already filtered to visible.
const W = 340
const H = 200
const PAD = { l: 38, r: 12, t: 14, b: 24 }

const niceRange = (min, max) => {
  if (min === max) return [Math.max(0, min - 10), max + 10]
  const pad = (max - min) * 0.12
  return [Math.max(0, min - pad), max + pad]
}

export default function ProgressChart({ series, units = 'lbs' }) {
  const pts = series.flatMap((s) => s.points)
  if (pts.length === 0) {
    return <p className="muted small">Log a few weighted sessions to see your progress chart.</p>
  }

  const ts = pts.map((p) => p.t)
  const ws = pts.map((p) => p.weight)
  let tMin = Math.min(...ts)
  let tMax = Math.max(...ts)
  const [wMin, wMax] = niceRange(Math.min(...ws), Math.max(...ws))
  if (tMin === tMax) { tMin -= 1; tMax += 1 }

  const plotW = W - PAD.l - PAD.r
  const plotH = H - PAD.t - PAD.b
  const x = (t) => PAD.l + ((t - tMin) / (tMax - tMin)) * plotW
  const y = (w) => PAD.t + ((wMax - w) / (wMax - wMin)) * plotH

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(wMin + f * (wMax - wMin)))
  const fmtDate = (t) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="progress-chart" role="img" aria-label="Weight progress over time">
      {/* y gridlines + labels */}
      {yTicks.map((w, i) => (
        <g key={i}>
          <line x1={PAD.l} y1={y(w)} x2={W - PAD.r} y2={y(w)} className="chart-grid" />
          <text x={PAD.l - 6} y={y(w) + 3} className="chart-axis" textAnchor="end">{w}</text>
        </g>
      ))}
      {/* x labels: first & last date */}
      <text x={PAD.l} y={H - 6} className="chart-axis" textAnchor="start">{fmtDate(tMin)}</text>
      <text x={W - PAD.r} y={H - 6} className="chart-axis" textAnchor="end">{fmtDate(tMax)}</text>

      {/* series */}
      {series.map((s) => (
        <g key={s.id}>
          {s.points.length > 1 && (
            <polyline
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={s.points.map((p) => `${x(p.t)},${y(p.weight)}`).join(' ')}
            />
          )}
          {s.points.map((p, i) => (
            <circle key={i} cx={x(p.t)} cy={y(p.weight)} r="3" fill={s.color} />
          ))}
        </g>
      ))}
    </svg>
  )
}
