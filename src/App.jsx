import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, useSearchParams } from 'react-router-dom'
import Navbar from './components/Navbar'
import BottomNav from './components/BottomNav'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import NotificationTester from './components/NotificationTester'
import ProtectedRoute from './components/ProtectedRoute'
import DebugPanel from './components/DebugPanel'
import AppLoadingScreen from './components/AppLoadingScreen'
import { useAuth } from './context/AuthContext'
import { useApp } from './context/AppContext'
import DashboardPage from './pages/Dashboard'
import TimetablePage from './pages/Timetable'
import AnalyticsPage from './pages/Analytics'
import ProfilePage from './pages/Profile'
import AboutPage from './pages/About'
import LoginPage from './pages/Login'
import RegisterPage from './pages/Register'
import './App.css'

const isDev = import.meta.env.DEV

// Use static route modules in development to avoid transient dynamic-import
// failures when the dev server websocket reconnects mid-navigation.
const Dashboard = isDev ? DashboardPage : lazy(() => import('./pages/Dashboard'))
const Timetable = isDev ? TimetablePage : lazy(() => import('./pages/Timetable'))
const Analytics = isDev ? AnalyticsPage : lazy(() => import('./pages/Analytics'))
const Profile = isDev ? ProfilePage : lazy(() => import('./pages/Profile'))
const About = isDev ? AboutPage : lazy(() => import('./pages/About'))
const Login = isDev ? LoginPage : lazy(() => import('./pages/Login'))
const Register = isDev ? RegisterPage : lazy(() => import('./pages/Register'))

// Loading fallback component for lazy route chunks.
const LoadingFallback = () => (
  <AppLoadingScreen
    initial
    message="Loading StudyBuddy"
    subtitle="Bringing your pages online"
  />
)

function App() {
  const { isAuthenticated } = useAuth()
  const { settings } = useApp()
  const [searchParams] = useSearchParams()
  
  // Show notification tester if ?testNotifications=true URL param is set
  const showTester = searchParams.get('testNotifications') === 'true'

  // Apply dark mode class to body
  useEffect(() => {
    if (settings.darkMode) {
      document.body.classList.add('dark-mode')
    } else {
      document.body.classList.remove('dark-mode')
    }
  }, [settings.darkMode])

  return (
    <div className="app">
      <Navbar />
      <div className="main-content">
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/timetable" element={
              <ProtectedRoute>
                <Timetable />
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/about" element={
              <ProtectedRoute>
                <About />
              </ProtectedRoute>
            } />
          </Routes>
        </Suspense>
      </div>
      <BottomNav />
      <PWAInstallPrompt />
      <DebugPanel />
      
      {/* Notification Tester - only shows when ?testNotifications=true */}
      {showTester && <NotificationTester />}
    </div>
  )
}

export default App

