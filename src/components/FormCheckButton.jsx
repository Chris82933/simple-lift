// Opens a YouTube search for the exercise so users can do a quick form check.
export default function FormCheckButton({ name, compact = false }) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent('how to ' + name + ' proper form')}`
  return (
    <a
      className={'form-check' + (compact ? ' compact' : '')}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={`Watch ${name} form on YouTube`}
      aria-label={`Watch a ${name} form check on YouTube`}
      onClick={(e) => e.stopPropagation()}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <rect x="1.5" y="5" width="21" height="14" rx="4" fill="#ff0000" />
        <path d="M10 8.5l6 3.5-6 3.5z" fill="#fff" />
      </svg>
      {!compact && <span>Form</span>}
    </a>
  )
}
