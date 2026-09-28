import { NavLink, Outlet } from 'react-router-dom'
import DesktopNav, { NavIcon, PRIMARY_TABS } from './DesktopNav.jsx'
import { useIsDesktop } from '../lib/useMediaQuery.js'

export default function AppLayout() {
  // Branching in JS rather than hiding the pill with CSS: the floating pill and
  // the sidebar would otherwise both be in the tree, giving screen readers two
  // <nav aria-label="Primary"> landmarks and two copies of every destination.
  const isDesktop = useIsDesktop()

  return (
    <div className="app-shell">
      {isDesktop && <DesktopNav />}

      <main className="app-main">
        {isDesktop ? (
          // Extra wrapper only on desktop: it owns the reading measure, so the
          // shell can go full-bleed for the sidebar without every page having
          // to opt into a max-width of its own.
          <div className="desktop-content">
            <Outlet />
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      {!isDesktop && (
        <div className="bottom-nav">
          <nav className="nav-pill" aria-label="Primary">
            {PRIMARY_TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) => 'nav-item' + (isActive ? ' is-active' : '')}
              >
                <NavIcon name={tab.icon} />
                <span className="nav-label">{tab.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </div>
  )
}
