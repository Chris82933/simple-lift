import { NavLink, useLocation } from 'react-router-dom'

// Simple, minimal line icons (stroke uses currentColor so they match the tab).
// These live here rather than in AppLayout.jsx because the dependency has to
// point one way: AppLayout imports the sidebar, so the sidebar cannot import
// back from it without a cycle.
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
  build: (
    <>
      <path d="M12 5v14M5 12h14" />
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
    </>
  ),
  templates: (
    <>
      <path d="M12 3 3 7.5l9 4.5 9-4.5L12 3Z" />
      <polyline points="3 12.5 12 17 21 12.5" />
      <polyline points="3 16.75 12 21.25 21 16.75" />
    </>
  ),
  calculator: (
    <>
      <rect x="4.5" y="2.5" width="15" height="19" rx="2.5" />
      <line x1="8" y1="6.5" x2="16" y2="6.5" />
      <path d="M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01M8.5 18h.01M12 18h.01M15.5 18h.01" />
    </>
  ),
}

// The four thumb-zone destinations. Shared so the phone pill and the desktop
// sidebar can never drift apart.
export const PRIMARY_TABS = [
  { to: '/today', label: 'Today', icon: 'today' },
  { to: '/programs', label: 'Plans', icon: 'program' },
  { to: '/progress', label: 'Progress', icon: 'progress' },
  { to: '/profile', label: 'Settings', icon: 'settings' },
]

// Destinations that are one-or-two taps deep on the phone but are exactly the
// things you open a laptop to do — authoring and planning, not logging sets.
const SECONDARY_LINKS = [
  { to: '/builder', label: 'Build a program', icon: 'build' },
  { to: '/schedule', label: 'Schedule', icon: 'program' },
  { to: '/templates', label: 'Templates', icon: 'templates' },
  { to: '/one-rep-max', label: '1RM calculator', icon: 'calculator' },
]

export function NavIcon({ name }) {
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

// Pages that have no sidebar entry of their own light up the section they are
// reached from, so the sidebar always says where you are.
const PARENT_OF = {
  '/program': '/programs',
  '/import-program': '/programs',
  '/recovery': '/programs',
  '/skills': '/programs',
  '/gzclp': '/templates',
  '/cardio': '/today',
}

export default function DesktopNav() {
  const { pathname } = useLocation()
  const navClass = (to) => ({ isActive }) =>
    'desktop-nav-link' + (isActive || PARENT_OF[pathname] === to ? ' is-active' : '')
  return (
    <nav className="desktop-nav" aria-label="Primary">
      <p className="desktop-nav-wordmark">Simple Lift</p>

      <ul className="desktop-nav-list">
        {PRIMARY_TABS.map((tab) => (
          <li key={tab.to}>
            <NavLink to={tab.to} className={navClass(tab.to)}>
              <NavIcon name={tab.icon} />
              <span className="desktop-nav-label">{tab.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      <p className="desktop-nav-heading">Plan &amp; build</p>
      <ul className="desktop-nav-list">
        {SECONDARY_LINKS.map((link) => (
          <li key={link.to}>
            <NavLink to={link.to} className={navClass(link.to)}>
              <NavIcon name={link.icon} />
              <span className="desktop-nav-label">{link.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
