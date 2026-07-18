import { NavLink, Outlet } from 'react-router-dom'

// Simple, minimal line icons (stroke uses currentColor so they match the tab).
const ICONS = {
  today: (
    <>
      <line x1="3" y1="9.5" x2="3" y2="14.5" /><line x1="6" y1="7" x2="6" y2="17" />
      <line x1="18" y1="7" x2="18" y2="17" /><line x1="21" y1="9.5" x2="21" y2="14.5" />
      <line x1="6" y1="12" x2="18" y2="12" />
    </>
  ),
  program: (
    <>
      <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
      <line x1="3.5" y1="9" x2="20.5" y2="9" />
      <line x1="8" y1="2.5" x2="8" y2="6" /><line x1="16" y1="2.5" x2="16" y2="6" />
    </>
  ),
  progress: (
    <>
      <polyline points="3 16.5 9 10.5 13 14 21 6" />
      <polyline points="15 6 21 6 21 12" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.6v3.2M12 18.2v3.2M4.4 4.4l2.3 2.3M17.3 17.3l2.3 2.3M2.6 12h3.2M18.2 12h3.2M4.4 19.6l2.3-2.3M17.3 6.7l2.3-2.3" />
    </>
  ),
}

const tabs = [
  { to: '/today', label: 'Today', icon: 'today' },
  { to: '/program', label: 'Program', icon: 'program' },
  { to: '/progress', label: 'Progress', icon: 'progress' },
  { to: '/profile', label: 'Settings', icon: 'settings' },
]

function NavIcon({ name }) {
  return (
    <svg
      className="nav-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  )
}

export default function AppLayout() {
  return (
    <div className="app-shell">
      <main className="app-main">
        <Outlet />
      </main>

      <div className="bottom-nav">
        <nav className="nav-pill" aria-label="Primary">
          {tabs.map((tab) => (
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
    </div>
  )
}
