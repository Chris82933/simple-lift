import { Outlet } from 'react-router-dom'
import DesktopNav from './DesktopNav.jsx'
import { useIsDesktop } from '../lib/useMediaQuery.js'

// Tools like /builder, /schedule and /one-rep-max are full-screen flows: on a
// phone they deliberately take over the screen, because a bottom pill under a
// multi-step form is just something else to mis-tap.
//
// On a desktop that reasoning doesn't hold. The window is big enough for the
// sidebar and the tool, and without it the only way out of the program builder
// is its own Cancel button — a dead end on a screen that has room for a nav.
//
// On mobile this component renders NOTHING of its own: it returns the bare
// <Outlet/>, so the page stays a direct child of #root exactly as before.
// /workout and /onboarding are not wrapped in this — those two are genuinely
// modal, and chrome during a working set is a distraction.
export default function FlowLayout() {
  const isDesktop = useIsDesktop()
  if (!isDesktop) return <Outlet />

  return (
    <div className="app-shell flow-shell">
      <DesktopNav />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
