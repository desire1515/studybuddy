import { useState, useEffect } from 'react'
import './PWAInstallPrompt.css'

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallButton, setShowInstallButton] = useState(false)

  useEffect(() => {
    // Handler for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault()
      // Stash the event so it can be triggered later
      setDeferredPrompt(e)
      // Show the install button
      setShowInstallButton(true)
    }

    // Handler for successful installation
    const handleAppInstalled = () => {
      // Hide the install button
      setShowInstallButton(false)
      setDeferredPrompt(null)
    }

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallButton(false)
    }

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    // Show the install prompt
    deferredPrompt.prompt()

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice

    // Clear the deferred prompt
    setDeferredPrompt(null)
    setShowInstallButton(false)

    console.log(`User response to install prompt: ${outcome}`)
  }

  // Don't render if button should not be shown
  if (!showInstallButton) return null

  return (
    <div className="pwa-install-prompt">
      <button 
        className="pwa-install-button"
        onClick={handleInstallClick}
        aria-label="Install StudyBuddy"
      >
        <span className="pwa-install-icon">📲</span>
        Install StudyBuddy
      </button>
    </div>
  )
}

export default PWAInstallPrompt

