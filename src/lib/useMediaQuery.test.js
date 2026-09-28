import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { useIsDesktop, DESKTOP_QUERY } from './useMediaQuery.js'

// The desktop layout is chosen in two independent places: this hook picks the
// React tree, and `@media (min-width: 1024px)` in src/styles/desktop-*.css
// picks the stylesheet. If the hook ever stops reacting to a media-query
// change, the two disagree and you get the desktop markup styled as a phone —
// a layout that is broken at exactly one window size and nowhere else.
//
// This has to be a unit test: driving a real browser through the automation
// viewport doesn't fire `resize` or matchMedia `change` at all, so a resize
// across the breakpoint cannot be exercised there.

let matches = false
let listeners = []

function installMatchMedia() {
  matches = false
  listeners = []
  window.matchMedia = vi.fn((query) => ({
    media: query,
    get matches() { return query === DESKTOP_QUERY ? matches : false },
    addEventListener: (_type, fn) => listeners.push(fn),
    removeEventListener: (_type, fn) => { listeners = listeners.filter((l) => l !== fn) },
  }))
}

// Flip the query the way a real browser does: change the value, then notify.
const setMatches = (v) => {
  matches = v
  for (const fn of [...listeners]) fn({ matches: v })
}

function Probe() {
  return createElement('span', null, useIsDesktop() ? 'desktop' : 'mobile')
}

let container
let root

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  installMatchMedia()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('useIsDesktop', () => {
  it('reads the query during the first render, with no mobile flash', () => {
    matches = true
    act(() => root.render(createElement(Probe)))
    // The naive useState+useEffect version renders 'mobile' once and then
    // corrects itself, which is visible as a flash on every navigation.
    expect(container.textContent).toBe('desktop')
  })

  it('re-renders when the viewport crosses the breakpoint in both directions', () => {
    act(() => root.render(createElement(Probe)))
    expect(container.textContent).toBe('mobile')

    act(() => setMatches(true))
    expect(container.textContent).toBe('desktop')

    act(() => setMatches(false))
    expect(container.textContent).toBe('mobile')
  })

  it('stops listening once unmounted', () => {
    act(() => root.render(createElement(Probe)))
    expect(listeners.length).toBeGreaterThan(0)
    act(() => root.unmount())
    expect(listeners).toHaveLength(0)
    // afterEach unmounts again; re-create so that stays a no-op.
    root = createRoot(container)
  })

  it('falls back to mobile when matchMedia is unavailable', () => {
    delete window.matchMedia
    act(() => root.render(createElement(Probe)))
    expect(container.textContent).toBe('mobile')
  })
})
