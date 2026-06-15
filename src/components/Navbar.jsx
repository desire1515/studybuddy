import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

const Navbar = () => {
  const location = useLocation()
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  
  const isActive = (path) => location.pathname === path ? 'active' : ''

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Don't show navbar on auth pages
  if (location.pathname === '/login' || location.pathname === '/register') {
    return null
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h1>📚 StudyBuddy</h1>
      </div>
      <ul className="navbar-links">
        <li>
          <Link to="/" className={isActive('/')}>
            <span className="icon">🏠</span>
            Dashboard
          </Link>
        </li>
        <li>
          <Link to="/timetable" className={isActive('/timetable')}>
            <span className="icon">📅</span>
            Timetable
          </Link>
        </li>
        <li>
          <Link to="/analytics" className={isActive('/analytics')}>
            <span className="icon">📊</span>
            Analytics
          </Link>
        </li>
        <li>
          <Link to="/profile" className={isActive('/profile')}>
            <span className="icon">👤</span>
            Profile
          </Link>
        </li>
      </ul>
      <div className="navbar-user">
        {isAuthenticated && user && (
          <>
            <span className="user-name">👤 {user.name || user.displayName || 'Student'}</span>
            
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  )
}

export default Navbar
