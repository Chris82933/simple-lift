// Cute, reusable stick-figure mascot illustrations keyed by movement category.
//
// Drawing conventions, so the figures stay consistent and anatomically sane:
//   • viewBox is 0 0 100 100; the floor, when shown, is y = 86.
//   • A head is r=9 centred so it never overlaps a bar or a limb.
//   • Anything touching the ground (push-up hands, plank forearms, feet) must
//     actually REACH y = 86 — an earlier push-up figure had the arms pointing
//     up and away from the floor.
//   • <Face> is always rendered OUTSIDE the stroked group. Nesting it inside
//     made the 1.3px eyes inherit a 5px stroke and swell into blobs.
//   • Limbs come in pairs; a single leg reads as an injury, not a stick figure.

const CATEGORY = {
  squat: 'squat',
  lunge: 'lunge',
  calf: 'calf',
  hinge: 'hinge',
  horiz_push: 'push', triceps: 'push',
  vert_push: 'overhead',
  shoulder_iso: 'lateral',
  horiz_pull: 'row',
  vert_pull: 'pull',
  biceps: 'curl',
  core: 'core',
  conditioning: 'jump',
}

// A few movements are badly served by their pattern's generic figure — a
// farmer's carry is filed under "core" but looks nothing like a plank.
const BY_EXERCISE = {
  farmer_carry: 'carry',
  kb_racked_carry: 'carry',
  kb_suitcase_carry: 'carry',
  kb_swing: 'swing',
  kb_snatch: 'swing',
  kb_clean: 'swing',
  kb_high_pull: 'swing',
  kb_turkish_getup: 'getup',
  hanging_leg_raise: 'hang',
  hanging_knee_raise: 'hang',
  toes_to_bar: 'hang',
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
const Floor = () => <line x1="14" y1="86" x2="86" y2="86" stroke="var(--surface-2)" strokeWidth="6" strokeLinecap="round" />
const Plate = ({ cx, cy, r = 5 }) => <circle cx={cx} cy={cy} r={r} fill="var(--muted)" />

// A kettlebell: bell plus handle.
const Bell = ({ cx, cy, r = 7 }) => (
  <>
    <path d={`M ${cx - 4} ${cy - r} Q ${cx} ${cy - r - 6} ${cx + 4} ${cy - r}`} stroke="var(--muted)" strokeWidth="3" fill="none" strokeLinecap="round" />
    <circle cx={cx} cy={cy} r={r} fill="var(--muted)" />
  </>
)

// A small dumbbell centred on (cx, cy).
const Bell2 = ({ cx, cy }) => (
  <>
    <line x1={cx - 7} y1={cy} x2={cx + 7} y2={cy} {...bar} />
    <Plate cx={cx - 8} cy={cy} r={4} />
    <Plate cx={cx + 8} cy={cy} r={4} />
  </>
)

const POSES = {
  // Front view, bottom of a back squat: bar clears the head, knees driven wide.
  squat: (
    <g>
      <line x1="20" y1="36" x2="80" y2="36" {...bar} />
      <Plate cx="20" cy="36" /><Plate cx="80" cy="36" />
      <g {...stroke}>
        <path d="M50 40 V58" />
        <path d="M44 38 L32 42" />
        <path d="M56 38 L68 42" />
        <path d="M50 58 L34 68 L34 86" />
        <path d="M50 58 L66 68 L66 86" />
      </g>
      <Face cx="50" cy="20" />
      <Floor />
    </g>
  ),

  // Side view split stance: front shin vertical, back knee toward the floor.
  lunge: (
    <g>
      <g {...stroke}>
        <path d="M48 32 V56" />
        <path d="M48 56 L66 66 L66 86" />
        <path d="M48 56 L34 72 L40 84" />
        <path d="M48 38 L38 50" />
      </g>
      <Face cx="48" cy="22" />
      <Floor />
    </g>
  ),

  // Heels lifted clear of the floor — the whole point of the movement.
  calf: (
    <g>
      <g {...stroke}>
        <path d="M50 32 V58" />
        <path d="M44 38 L36 54" />
        <path d="M56 38 L64 54" />
        <path d="M50 58 L42 74 L36 82" />
        <path d="M50 58 L58 74 L64 82" />
      </g>
      <Face cx="50" cy="22" />
      <Floor />
    </g>
  ),

  // Side view hinge: hips back, flat back, arms hanging straight to the bar.
  hinge: (
    <g>
      <g {...stroke}>
        <path d="M38 40 L66 52" />
        <path d="M66 52 L64 68 L60 86" />
        <path d="M70 52 L70 68 L72 86" />
        <path d="M39 42 V68" />
      </g>
      <line x1="26" y1="70" x2="52" y2="70" {...bar} />
      <Plate cx="26" cy="70" /><Plate cx="52" cy="70" />
      <Face cx="32" cy="34" r="8" />
      <Floor />
    </g>
  ),

  // Push-up, side view. Hands reach the floor (the previous figure's arms
  // pointed up into the air) and the body slopes down so the toes reach it too.
  push: (
    <g>
      <g {...stroke}>
        <path d="M36 58 L60 72 L82 86" />
        <path d="M36 58 V86" />
        <path d="M42 60 V86" />
      </g>
      <Face cx="28" cy="54" r="8" />
      <Floor />
    </g>
  ),

  // Standing overhead press, bar locked out above (and clear of) the head.
  overhead: (
    <g>
      <line x1="28" y1="14" x2="72" y2="14" {...bar} />
      <Plate cx="28" cy="14" /><Plate cx="72" cy="14" />
      <g {...stroke}>
        <path d="M42 42 L36 18" />
        <path d="M58 42 L64 18" />
        <path d="M50 40 V62" />
        <path d="M50 62 L42 86" />
        <path d="M50 62 L58 86" />
      </g>
      <Face cx="50" cy="30" />
      <Floor />
    </g>
  ),

  // Lateral raise: arms straight out to the sides at shoulder height.
  lateral: (
    <g>
      <g {...stroke}>
        <path d="M50 34 V60" />
        <path d="M46 38 L26 40" />
        <path d="M54 38 L74 40" />
        <path d="M50 60 L44 86" />
        <path d="M50 60 L56 86" />
      </g>
      <Bell2 cx="22" cy="40" />
      <Bell2 cx="78" cy="40" />
      <Face cx="50" cy="24" />
      <Floor />
    </g>
  ),

  // Bent-over row: hinged torso, elbow driving back past the ribs.
  row: (
    <g>
      <g {...stroke}>
        <path d="M36 42 L64 52" />
        <path d="M64 52 L62 68 L58 86" />
        <path d="M68 52 L68 68 L70 86" />
        <path d="M38 44 L34 58" />
      </g>
      <line x1="22" y1="60" x2="46" y2="60" {...bar} />
      <Plate cx="22" cy="60" /><Plate cx="46" cy="60" />
      <Face cx="30" cy="36" r="8" />
      <Floor />
    </g>
  ),

  // Pull-up: hanging from a bar, chin up, knees tucked behind.
  pull: (
    <g>
      <line x1="24" y1="16" x2="76" y2="16" {...bar} />
      <g {...stroke}>
        <path d="M38 18 L44 40" />
        <path d="M62 18 L56 40" />
        <path d="M50 40 V62" />
        <path d="M50 62 L42 76 L46 86" />
        <path d="M50 62 L58 76 L54 86" />
      </g>
      <Face cx="50" cy="30" r="8" />
    </g>
  ),

  // Dead hang / hanging leg raise: long body under the bar.
  hang: (
    <g>
      <line x1="24" y1="16" x2="76" y2="16" {...bar} />
      <g {...stroke}>
        <path d="M44 18 V38" />
        <path d="M56 18 V38" />
        <path d="M50 38 V62" />
        <path d="M50 62 L70 68" />
        <path d="M50 62 L70 76" />
      </g>
      <Face cx="50" cy="28" r="8" />
    </g>
  ),

  // Biceps curl: elbow pinned, forearm swept up with a dumbbell.
  curl: (
    <g>
      <g {...stroke}>
        <path d="M50 34 V60" />
        <path d="M46 40 L42 54 L52 46" />
        <path d="M50 60 L44 86" />
        <path d="M50 60 L56 86" />
      </g>
      <Bell2 cx="56" cy="44" />
      <Face cx="50" cy="24" />
      <Floor />
    </g>
  ),

  // Plank: forearms down on the floor, both legs, body in a line.
  core: (
    <g>
      <g {...stroke}>
        <path d="M38 62 L60 68 L80 74" />
        <path d="M38 62 V84" />
        <path d="M76 74 L80 86" />
        <path d="M82 74 L84 86" />
      </g>
      <line x1="30" y1="86" x2="46" y2="86" {...stroke} />
      <Face cx="30" cy="58" r="8" />
      <Floor />
    </g>
  ),

  // Loaded carry: tall posture, a bell hanging in each hand.
  carry: (
    <g>
      <g {...stroke}>
        <path d="M50 32 V58" />
        <path d="M44 38 L38 60" />
        <path d="M56 38 L62 60" />
        <path d="M50 58 L44 86" />
        <path d="M50 58 L56 86" />
      </g>
      <Bell cx="34" cy="70" r="6" />
      <Bell cx="66" cy="70" r="6" />
      <Face cx="50" cy="22" />
      <Floor />
    </g>
  ),

  // Top of a kettlebell swing: hips snapped through, bell floating out front.
  swing: (
    <g>
      <g {...stroke}>
        <path d="M46 34 V60" />
        <path d="M46 40 L68 46" />
        <path d="M46 60 L40 86" />
        <path d="M46 60 L52 86" />
      </g>
      <Bell cx="76" cy="48" r="7" />
      <Face cx="46" cy="24" />
      <Floor />
    </g>
  ),

  // Turkish get-up, the classic propped position: support hand planted on the
  // floor, torso angled up, working arm locked vertically with the bell above.
  getup: (
    <g>
      <g {...stroke}>
        <path d="M42 70 L64 76" />
        <path d="M64 76 L80 86" />
        <path d="M64 76 L74 62" />
        <path d="M42 70 L30 86" />
        <path d="M44 68 V44" />
      </g>
      <Bell cx="44" cy="34" r="6" />
      <Face cx="36" cy="64" r="8" />
      <Floor />
    </g>
  ),

  // Mid-jump: knees tucked, arms swept up, feet off the floor.
  jump: (
    <g>
      <g {...stroke}>
        <path d="M50 34 V54" />
        <path d="M50 38 L34 26" />
        <path d="M50 38 L66 26" />
        <path d="M50 54 L40 64 L44 74" />
        <path d="M50 54 L60 64 L56 74" />
      </g>
      <Face cx="50" cy="24" />
      <Floor />
    </g>
  ),
}

export default function ExerciseFigure({ pattern, exId, size = 56 }) {
  const category = BY_EXERCISE[exId] || CATEGORY[pattern] || 'core'
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

// Exported for tests: which figure a given pattern / exercise resolves to.
export const figureFor = (pattern, exId) => BY_EXERCISE[exId] || CATEGORY[pattern] || 'core'
export const FIGURE_NAMES = Object.keys(POSES)
