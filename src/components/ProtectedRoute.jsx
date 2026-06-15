import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AppLoadingScreen from './AppLoadingScreen'

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <AppLoadingScreen
        initial
        message="Signing you in"
        subtitle="Syncing your profile and schedule"
      />
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

export default ProtectedRoute

