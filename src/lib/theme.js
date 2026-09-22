// Applies the chosen color theme by setting data-theme on <html>, which swaps
// the CSS variable palette. The theme is stored in settings (so it rides
// along with export/import and cloud sync for free). Three settings values:
// 'dark' / 'light' (explicit, sticky) and 'system' (follows the OS). A never-
// set theme (undefined — nobody has visited Settings yet) also resolves to
// 'system', so a fresh install matches the OS instead of forcing dark (U9).

export function systemPrefersDark() {
  if (typeof window === 'undefined' || !window.matchMedia) return true // sensible default when unknown
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

// The concrete dark/light value a stored theme setting resolves to right now.
export function resolveTheme(theme) {
  const t = theme || 'system'
  if (t === 'light') return 'light'
  if (t === 'dark') return 'dark'
  return systemPrefersDark() ? 'dark' : 'light' // 'system' (or any unknown value)
}

export function applyTheme(theme) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', resolveTheme(theme))
}

// Keep a 'system' choice following the OS live. Pass a function returning the
// CURRENT stored theme setting (not a snapshot) so this only re-applies while
// that setting is still 'system' — an explicit Dark/Light pick is never
// touched. Returns an unsubscribe function. Call this from wherever the theme
// setting is displayed/edited (e.g. Settings) so live OS changes take effect
// while that's mounted; ideally also called once near app startup for a
// fully global live-follow, which lives outside this file's ownership here.
export function watchSystemTheme(getTheme) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => { if ((getTheme() || 'system') === 'system') applyTheme('system') }
  if (mq.addEventListener) mq.addEventListener('change', onChange)
  else mq.addListener(onChange) // Safari < 14
  return () => {
    if (mq.removeEventListener) mq.removeEventListener('change', onChange)
    else mq.removeListener(onChange)
  }
}
