import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AppProvider } from './context/AppContext.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { initErrorHandler } from './utils/errorHandler'
import './index.css'

// Initialize error handler BEFORE React renders
// This captures any errors from the start
initErrorHandler();

// ============================================================================
// APP WRAPPER
// ============================================================================

/**
 * Wrapper component that provides auth and app context
 * Handles FCM initialization when user is authenticated
 */
const AppWrapper = () => {
  return (
    <AppProvider>
      <App />
    </AppProvider>
  )
}

// ============================================================================
// RENDER APP
// ============================================================================

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <AppWrapper />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

