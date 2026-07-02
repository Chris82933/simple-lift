// Custom stick-figure poses for the calisthenics skills — one recognizable
// pose per skill (hang, front lever, planche, L-sit, hollow, pistol, handstand,
// push-up). Matches the ExerciseFigure house style: 100×100, accent stroke,
// a friendly face, muted bars/floor.

const stroke = { stroke: 'var(--accent)', strokeWidth: 5, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }
const bar = { stroke: 'var(--muted)', strokeWidth: 4, strokeLinecap: 'round' }
const floor = { stroke: 'var(--surface-2)', strokeWidth: 6, strokeLinecap: 'round' }

// Face with an optional upside-down mouth (for the handstand).
const Face = ({ cx, cy, r = 9, flip = false }) => (
  <g>
    <circle cx={cx} cy={cy} r={r} fill="var(--accent)" />
    <circle cx={cx - 3} cy={cy - 1} r="1.3" fill="var(--accent-ink)" />
    <circle cx={cx + 3} cy={cy - 1} r="1.3" fill="var(--accent-ink)" />
    <path
      d={flip
        ? `M ${cx - 3} ${cy + 4} Q ${cx} ${cy + 1} ${cx + 3} ${cy + 4}`
        : `M ${cx - 3} ${cy + 3} Q ${cx} ${cy + 6} ${cx + 3} ${cy + 3}`}
      stroke="var(--accent-ink)" strokeWidth="1.2" fill="none" strokeLinecap="round"
    />
  </g>
)

const POSES = {
  // Hanging pull-up (top position: chin at the bar)
  pullup: (
    <g>
      <line x1="24" y1="18" x2="76" y2="18" {...bar} />
      <circle cx="41" cy="18" r="4" fill="var(--muted)" />
      <circle cx="59" cy="18" r="4" fill="var(--muted)" />
      <g {...stroke}>
        <path d="M41 20 L46 38" />
        <path d="M59 20 L54 38" />
        <path d="M50 38 V62" />
        <path d="M50 62 L43 80" />
        <path d="M50 62 L57 80" />
      </g>
      <Face cx="50" cy="30" />
    </g>
  ),
  // Front lever: straight horizontal body hanging from a bar
  front_lever: (
    <g>
      <line x1="56" y1="16" x2="84" y2="16" {...bar} />
      <circle cx="70" cy="16" r="4" fill="var(--muted)" />
      <g {...stroke}>
        <path d="M70 18 L62 42" />
        <path d="M60 42 H22" />
      </g>
      <Face cx="18" cy="42" />
    </g>
  ),
  // Push-up: diagonal body, hands to the floor
  pushup: (
    <g>
      <line x1="18" y1="82" x2="82" y2="82" {...floor} />
      <g {...stroke}>
        <path d="M30 50 L72 70" />
        <path d="M38 53 V80" />
        <path d="M52 60 V80" />
        <path d="M72 70 L82 78" />
      </g>
      <Face cx="26" cy="48" />
    </g>
  ),
  // Planche: horizontal body balanced on straight arms
  planche: (
    <g>
      <line x1="40" y1="82" x2="76" y2="82" {...floor} />
      <g {...stroke}>
        <path d="M52 80 L55 56" />
        <path d="M62 80 L61 56" />
        <path d="M64 54 H22" />
      </g>
      <Face cx="70" cy="52" />
    </g>
  ),
  // L-sit: upright torso, legs straight out, hands pressing down
  lsit: (
    <g>
      <g {...stroke}>
        <path d="M50 38 V60" />
        <path d="M50 50 L38 64" />
        <path d="M50 50 L62 64" />
        <path d="M50 60 H84" />
      </g>
      <line x1="34" y1="66" x2="42" y2="66" {...floor} />
      <line x1="58" y1="66" x2="66" y2="66" {...floor} />
      <Face cx="50" cy="32" />
    </g>
  ),
  // Hollow body: banana shape lying on the floor, arms overhead
  hollow: (
    <g>
      <line x1="10" y1="80" x2="90" y2="80" {...floor} />
      <g {...stroke}>
        <path d="M24 62 Q50 74 78 62" />
        <path d="M24 62 L13 55" />
        <path d="M78 62 L89 68" />
      </g>
      <Face cx="19" cy="59" />
    </g>
  ),
  // Pistol squat: one leg bent deep, the other straight out front
  pistol: (
    <g>
      <line x1="40" y1="84" x2="58" y2="84" {...floor} />
      <g {...stroke}>
        <path d="M46 40 V58" />
        <path d="M46 58 L52 70 L49 82" />
        <path d="M46 58 L74 57" />
        <path d="M46 47 L64 44" />
      </g>
      <Face cx="44" cy="33" />
    </g>
  ),
  // Handstand: upside down, hands on the floor, legs up
  handstand: (
    <g>
      <line x1="34" y1="84" x2="66" y2="84" {...floor} />
      <circle cx="44" cy="82" r="4" fill="var(--muted)" />
      <circle cx="56" cy="82" r="4" fill="var(--muted)" />
      <g {...stroke}>
        <path d="M44 82 L48 62" />
        <path d="M56 82 L52 62" />
        <path d="M50 62 V40" />
        <path d="M50 40 L44 22" />
        <path d="M50 40 L56 22" />
      </g>
      <Face cx="50" cy="72" flip />
    </g>
  ),
}

export default function SkillFigure({ pose, size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-hidden="true" className="skill-figure">
      {POSES[pose] || POSES.pullup}
    </svg>
  )
}
