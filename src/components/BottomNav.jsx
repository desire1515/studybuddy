import { Link, useLocation } from 'react-router-dom'
import './BottomNav.css'

const BottomNav = () => {
  const location = useLocation()
  
  const isActive = (path) => location.pathname === path ? 'active' : ''

  // Don't show bottom nav on auth pages
  if (location.pathname === '/login' || location.pathname === '/register') {
    return null
  }

  const navItems = [
    { path: '/', icon: '🏠', label: 'Home' },
    { path: '/timetable', icon: '📅', label: 'Timetable' },
    { path: '/analytics', icon: '📊', label: 'Analytics' },
    { path: '/about', icon: 'ℹ️', label: 'About' },
    { path: '/profile', icon: '👤', label: 'Profile' },
  ]

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => (
        <Link 
          key={item.path} 
          to={item.path} 
          className={`bottom-nav-item ${isActive(item.path)}`}
        >
          <span className="bottom-nav-icon">{item.icon}</span>
          <span className="bottom-nav-label">{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}

export default BottomNav
