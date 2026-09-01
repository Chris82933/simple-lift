import { useState } from 'react'
import { loadSettings, saveSettings } from '../lib/storage.js'
import { applyTheme } from '../lib/theme.js'

// A compact light/dark switch. Applies the theme instantly and saves it (so it
// rides along with export/import and cloud sync). Shown to new users up front so
// they can pick their preference before anything else.
export default function ThemeToggle({ label = 'Appearance' }) {
  const [theme, setTheme] = useState(() => loadSettings().theme || 'dark')

  const choose = (t) => {
    setTheme(t)
    applyTheme(t)
    saveSettings({ ...loadSettings(), theme: t })
  }

  return (
    <div className="theme-toggle">
      {label && <span className="muted small">{label}</span>}
      <div className="seg seg-sm">
        {[{ id: 'dark', label: '🌙 Dark' }, { id: 'light', label: '☀️ Light' }].map((t) => (
          <button
            key={t.id}
            type="button"
            className={'seg-item' + (theme === t.id ? ' is-selected' : '')}
            aria-pressed={theme === t.id}
            onClick={() => choose(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
