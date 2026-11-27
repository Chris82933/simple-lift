import { formSearchUrl } from '../lib/formSearch.js'

// Opens a YouTube search for the exercise so users can do a quick form check.
// Pass the exercise id when there is one: the search is tuned per exercise
// (see lib/formSearch.js); a bare name (skill steps) falls back to the name.
export default function FormCheckButton({ id, name, compact = false }) {
  const url = formSearchUrl({ id, name })
  if (!url || !name) return null
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
