import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'

const tabsLeft = [
  { to: '/today', label: 'Today' },
  { to: '/program', label: 'Program' },
]
const tabsRight = [
  { to: '/progress', label: 'Progress' },
  { to: '/profile', label: 'Profile' },
]

// Utility screens folded into the center "+" so they're reachable everywhere
// instead of being scattered as page buttons.
const quickActions = [
  { to: '/cardio', label: '❤️ Log cardio' },
  { to: '/one-rep-max', label: '🧮 1RM calculator' },
  { to: '/skills', label: '🤸 Skill tree' },
]

export default function AppLayout() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const go = (to) => { setOpen(false); navigate(to) }

  const navClass = ({ isActive }) => 'nav-item' + (isActive ? ' is-active' : '')

  return (
    <div className="app-shell">
      <main className="app-main">
        <Outlet />
      </main>

      {open && <div className="quick-backdrop" onClick={() => setOpen(false)} />}

      <div className="bottom-nav">
        {open && (
          <div className="quick-menu" role="menu">
            {quickActions.map((a) => (
              <button key={a.to} type="button" className="quick-item" role="menuitem" onClick={() => go(a.to)}>
                {a.label}
              </button>
            ))}
          </div>
        )}
        <nav className="nav-pill" aria-label="Primary">
          {tabsLeft.map((tab) => (
            <NavLink key={tab.to} to={tab.to} className={navClass}>
              <span className="nav-label">{tab.label}</span>
            </NavLink>
          ))}
          <button
            type="button"
            className={'nav-fab' + (open ? ' is-open' : '')}
            aria-label="Quick actions"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            +
          </button>
          {tabsRight.map((tab) => (
            <NavLink key={tab.to} to={tab.to} className={navClass}>
              <span className="nav-label">{tab.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
