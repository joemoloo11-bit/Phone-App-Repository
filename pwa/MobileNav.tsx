import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Settings2,
  CalendarDays,
  Wallet,
  Target,
  BarChart2,
  Download,
} from 'lucide-react'

const items = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/setup', icon: Settings2, label: 'Setup' },
  { to: '/weekly', icon: CalendarDays, label: 'Weekly' },
  { to: '/tracker', icon: Wallet, label: 'Tracker' },
  { to: '/goals', icon: Target, label: 'Goals' },
  { to: '/charts', icon: BarChart2, label: 'Charts' },
  { to: '/export', icon: Download, label: 'Export' },
]

export default function MobileNav() {
  return (
    <nav className="mobile-nav">
      <div className="mobile-nav-inner">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `mobile-nav-item${isActive ? ' active' : ''}`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
