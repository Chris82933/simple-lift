// Dependency-free SVG radar / spider chart for the calisthenics "character
// sheet". `stats` is [{ id, label, value }] with value 0–100.
export default function SkillRadar({ stats, size = 260 }) {
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 34
  const n = stats.length
  const rings = [0.25, 0.5, 0.75, 1]
  // Extra horizontal/vertical room so the axis labels aren't clipped.
  const padX = 52
  const padY = 22

  // Angle for axis i (start at top, go clockwise).
  const angle = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n
  const point = (i, frac) => [cx + r * frac * Math.cos(angle(i)), cy + r * frac * Math.sin(angle(i))]
  const poly = (frac) => stats.map((_, i) => point(i, frac).join(',')).join(' ')
  const valuePoly = stats.map((s, i) => point(i, Math.max(0.02, (s.value || 0) / 100)).join(',')).join(' ')

  return (
    <svg
      viewBox={`${-padX} ${-padY} ${size + padX * 2} ${size + padY * 2}`}
      className="skill-radar"
      role="img"
      aria-label="Skill stats radar"
    >
      {/* grid rings */}
      {rings.map((f) => (
        <polygon key={f} points={poly(f)} className="radar-ring" />
      ))}
      {/* axes + labels */}
      {stats.map((s, i) => {
        const [x, y] = point(i, 1)
        const [lx, ly] = point(i, 1.18)
        return (
          <g key={s.id}>
            <line x1={cx} y1={cy} x2={x} y2={y} className="radar-axis" />
            <text
              x={lx}
              y={ly}
              className="radar-label"
              textAnchor={Math.abs(lx - cx) < 4 ? 'middle' : lx > cx ? 'start' : 'end'}
              dominantBaseline="middle"
            >
              {s.label}
            </text>
            <text
              x={lx}
              y={ly + 13}
              className="radar-value"
              textAnchor={Math.abs(lx - cx) < 4 ? 'middle' : lx > cx ? 'start' : 'end'}
              dominantBaseline="middle"
            >
              {s.value}
            </text>
          </g>
        )
      })}
      {/* value polygon */}
      <polygon points={valuePoly} className="radar-fill" />
      {stats.map((s, i) => {
        const [x, y] = point(i, Math.max(0.02, (s.value || 0) / 100))
        return <circle key={s.id} cx={x} cy={y} r={3} className="radar-dot" />
      })}
    </svg>
  )
}
