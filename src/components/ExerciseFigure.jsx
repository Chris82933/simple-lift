// Cute, reusable stick-figure mascot illustrations keyed by movement category.
// One friendly figure per movement type keeps the library light while still
// giving each exercise a recognizable, on-brand picture. (Static for now;
// motion can be added later.)

const CATEGORY = {
  squat: 'squat', lunge: 'squat', calf: 'squat',
  hinge: 'hinge',
  horiz_push: 'push', triceps: 'push',
  vert_push: 'overhead', shoulder_iso: 'overhead',
  horiz_pull: 'pull', vert_pull: 'pull', biceps: 'pull',
  core: 'core',
  conditioning: 'jump',
}

const Face = ({ cx, cy, r = 9 }) => (
  <>
    <circle cx={cx} cy={cy} r={r} fill="var(--accent)" />
    <circle cx={cx - 3} cy={cy - 1} r="1.3" fill="var(--accent-ink)" />
    <circle cx={cx + 3} cy={cy - 1} r="1.3" fill="var(--accent-ink)" />
    <path d={`M ${cx - 3} ${cy + 3} Q ${cx} ${cy + 6} ${cx + 3} ${cy + 3}`} stroke="var(--accent-ink)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
  </>
)

const stroke = { stroke: 'var(--accent)', strokeWidth: 5, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }
const bar = { stroke: 'var(--muted)', strokeWidth: 4, strokeLinecap: 'round' }

const POSES = {
  squat: (
    <g>
      <line x1="22" y1="34" x2="78" y2="34" {...bar} />
      <circle cx="22" cy="34" r="5" fill="var(--muted)" />
      <circle cx="78" cy="34" r="5" fill="var(--muted)" />
      <g {...stroke}>
        <path d="M50 40 V58" />
        <path d="M50 58 L40 72 L40 84" />
        <path d="M50 58 L60 72 L60 84" />
        <path d="M50 44 L38 38" />
        <path d="M50 44 L62 38" />
      </g>
      <Face cx="50" cy="30" />
    </g>
  ),
  hinge: (
    <g>
      <g {...stroke}>
        <path d="M30 40 Q55 36 72 50" />
        <path d="M72 50 V78" />
        <path d="M72 50 L66 70" />
      </g>
      <line x1="60" y1="74" x2="80" y2="74" {...bar} />
      <circle cx="60" cy="74" r="4.5" fill="var(--muted)" />
      <circle cx="80" cy="74" r="4.5" fill="var(--muted)" />
      <Face cx="26" cy="40" />
    </g>
  ),
  push: (
    <g>
      <g {...stroke}>
        <path d="M30 62 H74" />
        <path d="M40 62 L34 50" />
        <path d="M58 62 L52 50" />
      </g>
      <Face cx="26" cy="60" r="8" />
      <line x1="30" y1="74" x2="78" y2="74" stroke="var(--surface-2)" strokeWidth="6" strokeLinecap="round" />
    </g>
  ),
  overhead: (
    <g>
      <line x1="30" y1="26" x2="70" y2="26" {...bar} />
      <circle cx="30" cy="26" r="5" fill="var(--muted)" />
      <circle cx="70" cy="26" r="5" fill="var(--muted)" />
      <g {...stroke}>
        <path d="M50 40 L42 28" />
        <path d="M50 40 L58 28" />
        <path d="M50 40 V64" />
        <path d="M50 64 L42 84" />
        <path d="M50 64 L58 84" />
      </g>
      <Face cx="50" cy="46" />
    </g>
  ),
  pull: (
    <g>
      <line x1="26" y1="20" x2="74" y2="20" {...bar} />
      <g {...stroke}>
        <path d="M44 24 V40" />
        <path d="M56 24 V40" />
        <path d="M50 40 V62" />
        <path d="M50 62 L43 80" />
        <path d="M50 62 L57 80" />
      </g>
      <Face cx="50" cy="32" />
    </g>
  ),
  core: (
    <g>
      <g {...stroke}>
        <path d="M24 64 H72" />
        <path d="M72 64 L80 78" />
        <path d="M30 64 L24 52" />
      </g>
      <Face cx="22" cy="62" r="8" />
      <line x1="22" y1="76" x2="82" y2="76" stroke="var(--surface-2)" strokeWidth="6" strokeLinecap="round" />
    </g>
  ),
  jump: (
    <g {...stroke}>
      <path d="M50 34 V54" />
      <path d="M50 38 L36 30" />
      <path d="M50 38 L64 30" />
      <path d="M50 54 L40 70" />
      <path d="M50 54 L60 70" />
      <Face cx="50" cy="26" />
    </g>
  ),
}

export default function ExerciseFigure({ pattern, size = 56 }) {
  const category = CATEGORY[pattern] || 'core'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-hidden="true"
      className="exercise-figure"
    >
      {POSES[category]}
    </svg>
  )
}
