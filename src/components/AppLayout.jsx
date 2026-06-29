import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { to: '/today', label: 'Today', icon: '🏋️' },
  { to: '/program', label: 'Program', icon: '🗓️' },
  { to: '/progress', label: 'Progress', icon: '📈' },
  { to: '/profile', label: 'Profile', icon: '👤' },
]

export default function AppLayout() {
  return (
    <div className="app-shell">
      <main className="app-main">
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="Primary">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => 'nav-item' + (isActive ? ' is-active' : '')}
          >
            <span className="nav-icon" aria-hidden="true">{tab.icon}</span>
            <span className="nav-label">{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
