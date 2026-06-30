// Applies the chosen color theme by setting data-theme on <html>, which swaps
// the CSS variable palette. Dark is the default. The theme is stored in
// settings (so it rides along with export/import and cloud sync for free).

export function applyTheme(theme) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark')
}
