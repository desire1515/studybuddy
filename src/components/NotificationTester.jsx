/**
 * Notification Test Component for StudyBuddy
 * 
 * This component provides a UI for testing notification functionality
 * on Android 13+ and Android 15 devices.
 * 
 * Usage: Add <NotificationTester /> to your app to test notifications
 */

import { useState, useEffect } from 'react'
import './NotificationTester.css'

// Import notification functions
import { 
  initNotifications,
  requestNotificationPermission,
  checkNotificationPermission,
  checkExactAlarmPermission,
  scheduleTestNotification,
  scheduleImmediateTestNotification,
  getPendingNotifications,
  cancelAllNotifications
} from '../firebase/notifications'

const NotificationTester = () => {
  const [platform, setPlatform] = useState('unknown')
  const [permissionStatus, setPermissionStatus] = useState('unknown')
  const [exactAlarmStatus, setExactAlarmStatus] = useState({})
  const [pendingNotifications, setPendingNotifications] = useState([])
  const [testing, setTesting] = useState(false)
  const [logs, setLogs] = useState([])
  const [expanded, setExpanded] = useState(false)

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, { message, type, timestamp }])
  }

  const refreshStatus = async () => {
    try {
      // Initialize notifications
      addLog('Initializing notifications...', 'info')
      const initResult = await initNotifications()
      setPlatform(initResult.platform || 'web')
      addLog(`Platform: ${initResult.platform}`, 'success')

      // Check permission
      const permResult = await checkNotificationPermission()
      setPermissionStatus(permResult.granted ? 'granted' : 'denied')
      addLog(`Permission: ${permResult.granted ? 'granted' : 'denied'}`, permResult.granted ? 'success' : 'error')

      // Check exact alarm
      const alarmResult = await checkExactAlarmPermission()
      setExactAlarmStatus(alarmResult)
      addLog(`Exact alarm: ${alarmResult.allowed ? 'allowed' : 'not allowed'}`, alarmResult.allowed ? 'success' : 'warning')

      // Get pending
      const pending = await getPendingNotifications()
      setPendingNotifications(pending)
      addLog(`Pending notifications: ${pending.length}`, 'info')
    } catch (err) {
      addLog(`Error: ${err.message}`, 'error')
    }
  }

  useEffect(() => {
    refreshStatus()
  }, [])

  const handleRequestPermission = async () => {
    setTesting(true)
    addLog('Requesting permission...', 'info')
    try {
      const result = await requestNotificationPermission()
      setPermissionStatus(result.granted ? 'granted' : 'denied')
      addLog(`Permission ${result.granted ? 'granted' : 'denied'}`, result.granted ? 'success' : 'error')
      
      if (result.granted) {
        await refreshStatus()
      }
    } catch (err) {
      addLog(`Error: ${err.message}`, 'error')
    }
    setTesting(false)
  }

  const handleTestImmediate = async () => {
    setTesting(true)
    addLog('Scheduling immediate test...', 'info')
    try {
      const result = await scheduleImmediateTestNotification()
      if (result) {
        addLog('Immediate notification scheduled!', 'success')
        await refreshStatus()
      } else {
        addLog('Failed to schedule notification', 'error')
      }
    } catch (err) {
      addLog(`Error: ${err.message}`, 'error')
    }
    setTesting(false)
  }

  const handleTestScheduled = async () => {
    setTesting(true)
    addLog('Scheduling test for 1 minute from now...', 'info')
    try {
      const result = await scheduleTestNotification()
      if (result) {
        addLog('Test notification scheduled for 1 minute from now', 'success')
        await refreshStatus()
      } else {
        addLog('Failed to schedule notification', 'error')
      }
    } catch (err) {
      addLog(`Error: ${err.message}`, 'error')
    }
    setTesting(false)
  }

  const handleCancelAll = async () => {
    setTesting(true)
    addLog('Cancelling all notifications...', 'info')
    try {
      await cancelAllNotifications()
      addLog('All notifications cancelled', 'success')
      await refreshStatus()
    } catch (err) {
      addLog(`Error: ${err.message}`, 'error')
    }
    setTesting(false)
  }

  return (
    <div className="notification-tester">
      <div className="tester-header" onClick={() => setExpanded(!expanded)}>
        <h4>🧪 Notification Tester</h4>
        <span className="expand-icon">{expanded ? '▼' : '▲'}</span>
      </div>

      {expanded && (
        <div className="tester-content">
          {/* Status Section */}
          <div className="status-section">
            <h5>Status</h5>
            <div className="status-grid">
              <div className="status-item">
                <span className="label">Platform:</span>
                <span className={`value ${platform === 'native' ? 'native' : ''}`}>{platform}</span>
              </div>
              <div className="status-item">
                <span className="label">Permission:</span>
                <span className={`value ${permissionStatus === 'granted' ? 'granted' : 'denied'}`}>
                  {permissionStatus}
                </span>
              </div>
              <div className="status-item">
                <span className="label">Exact Alarm:</span>
                <span className={`value ${exactAlarmStatus.allowed ? 'granted' : 'denied'}`}>
                  {exactAlarmStatus.allowed ? 'Allowed' : 'Not Allowed'}
                </span>
              </div>
              <div className="status-item">
                <span className="label">Pending:</span>
                <span className="value">{pendingNotifications.length} notifications</span>
              </div>
            </div>
            <button onClick={refreshStatus} className="refresh-btn">
              🔄 Refresh Status
            </button>
          </div>

          {/* Actions Section */}
          <div className="actions-section">
            <h5>Actions</h5>
            <div className="action-buttons">
              <button 
                onClick={handleRequestPermission} 
                disabled={testing || permissionStatus === 'granted'}
                className="action-btn permission"
              >
                {permissionStatus === 'granted' ? '✓ Permission Granted' : '🔔 Request Permission'}
              </button>
              
              <button 
                onClick={handleTestImmediate} 
                disabled={testing || permissionStatus !== 'granted'}
                className="action-btn immediate"
              >
                ⚡ Test Immediate
              </button>
              
              <button 
                onClick={handleTestScheduled} 
                disabled={testing || permissionStatus !== 'granted'}
                className="action-btn scheduled"
              >
                ⏰ Test in 1 Minute
              </button>
              
              <button 
                onClick={handleCancelAll} 
                disabled={testing}
                className="action-btn cancel"
              >
                🗑️ Cancel All
              </button>
            </div>
          </div>

          {/* Logs Section */}
          <div className="logs-section">
            <h5>Logs</h5>
            <div className="logs-container">
              {logs.length === 0 ? (
                <p className="no-logs">No logs yet. Try an action!</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className={`log-item ${log.type}`}>
                    <span className="log-time">{log.timestamp}</span>
                    <span className="log-message">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationTester

