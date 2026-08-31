// Small monochrome SVG icons that inherit the surrounding text color
// (currentColor), so glyphs read as one deliberate system instead of the
// multicolor emoji they replace. Extend the switch to add more.
const ICONS = {
  trophy: (
    <>
      <path d="M6 3h12v4a6 6 0 0 1-12 0V3Z" fill="currentColor" />
      <path d="M6 4H3v2a4 4 0 0 0 4 4M18 4h3v2a4 4 0 0 1-4 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      <rect x="11" y="12" width="2" height="4" fill="currentColor" />
      <rect x="8" y="18" width="8" height="2" rx="1" fill="currentColor" />
    </>
  ),
  edit: (
    <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4L18.5 9.5a2.12 2.12 0 0 0-3-3L5 17v3Z" />
      <path d="M13.5 6.5l3 3" />
    </g>
  ),
  play: <path d="M8 5v14l11-7z" fill="currentColor" />,
}

export default function Icon({ name, size = 16, className = '' }) {
  const glyph = ICONS[name]
  if (!glyph) return null
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      className={'icon' + (className ? ' ' + className : '')}
      aria-hidden="true" focusable="false"
    >
      {glyph}
    </svg>
  )
}
