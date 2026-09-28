import { useSyncExternalStore } from 'react'

// The one place the app decides "this is a desktop". Everything desktop —
// the sidebar shell, the program studio, the multi-column page layouts —
// is gated on this value or on the matching CSS media query, and the two
// MUST stay in lockstep: a component that renders desktop markup while the
// stylesheet is still in mobile mode (or vice-versa) is how you get a
// layout that is broken at exactly one window width.
export const DESKTOP_QUERY = '(min-width: 1024px)'

// The program workspace needs more room than "this is a desktop" implies: it is
// three panes side by side INSIDE the 250px sidebar, and the middle one holds a
// table of number inputs whose columns have real minimums. Measured, not
// guessed — the table bottoms out at ~520px and the centre pane reaches that at
// a 1400px window, so 1400 is the floor and this sits above it so a long
// exercise name or a 4-digit weight can't tip it into a sideways scroll.
// Under this width the builder uses the column editor, which is a real editor
// and the right shape for a narrow window — not a degraded fallback.
// Keep in lockstep with the media query in src/styles/desktop-builder.css.
export const WORKSPACE_QUERY = '(min-width: 1440px)'

const EMPTY = () => () => {}

// useSyncExternalStore rather than useState + useEffect: it reads the match
// during render, so the first paint is already correct. The effect version
// renders mobile once and then snaps to desktop, which is visible as a flash
// on every navigation.
function subscribe(query) {
  return (onChange) => {
    if (typeof window === 'undefined' || !window.matchMedia) return EMPTY()
    const mql = window.matchMedia(query)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }
}

export function useMediaQuery(query) {
  return useSyncExternalStore(
    subscribe(query),
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false),
    // Server/prerender snapshot. Mobile is the safe default: it is the layout
    // the whole app was designed around, and it degrades upward.
    () => false,
  )
}

export function useIsDesktop() {
  return useMediaQuery(DESKTOP_QUERY)
}

export function useIsWorkspace() {
  return useMediaQuery(WORKSPACE_QUERY)
}
