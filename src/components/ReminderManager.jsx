/**
 * ReminderManager Component for StudyBuddy - FINAL FIXED VERSION
 * 
 * Manages study reminders and notification permissions.
 * Properly requests permissions from user gesture (onClick).
 * Triggers notifications when study sessions are scheduled.
 * 
 * Key fixes:
 * - Proper user gesture handling for permission requests
 * - Better initialization flow
 * - Study session notification scheduling
 * - Improved error handling
 */

import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import './ReminderManager.css'

// Import notification functions
import { 
  requestNotificationPermission, 
  checkNotificationPermission,
  scheduleTestNotification,
  scheduleImmediateTestNotification,
  scheduleTimetableReminders,
  initNotifications
} from '../firebase/notifications'

// Track if notifications are initialized - singleton pattern
let notificationsInitialized = false;

const ReminderManager = ({ studySchedule = {} }) => {
  const { studyTimetable, toggleStudyReminder } = useApp()
  const [notificationPermission, setNotificationPermission] = useState('default')
  const [platform, setPlatform] = useState('web')
  const [testing, setTesting] = useState(false)
  const [initError, setInitError] = useState(null)
  const [scheduledCount, setScheduledCount] = useState(0)

  // Initialize notifications on mount (without requesting permission)
  useEffect(() => {
    const init = async () => {
      if (notificationsInitialized) return;
      
      try {
        const result = await initNotifications()
        console.log('Notifications initialized:', result)
        setPlatform(result.platform || 'web')
        
        // Check current permission status
        const permStatus = await checkNotificationPermission()
        if (permStatus.granted) {
          setNotificationPermission('granted')
        } else if (permStatus.platform === 'web') {
          setNotificationPermission(Notification.permission || 'default')
        } else {
          setNotificationPermission('default')
        }
        
        notificationsInitialized = true;
      } catch (err) {
        console.error('Error initializing notifications:', err)
        setInitError(err.message)
      }
    }
    
    init()
  }, [])

  // Schedule reminders when study timetable changes
  useEffect(() => {
    const scheduleReminders = async () => {
      if (notificationPermission !== 'granted') return
      if (!studyTimetable || Object.keys(studyTimetable).length === 0) return
      
      try {
        const count = await scheduleTimetableReminders(studyTimetable, 'study')
        setScheduledCount(count)
        console.log(`📅 Scheduled ${count} study session reminders`)
      } catch (err) {
        console.error('Error scheduling reminders:', err)
      }
    }
    
    scheduleReminders()
  }, [studyTimetable, notificationPermission])

  /**
   * Request notification permission - MUST be called from user gesture
   */
  const requestPermission = useCallback(async () => {
    setTesting(true)
    setInitError(null)
    
    try {
      const result = await requestNotificationPermission('ReminderManager_button_click')
      console.log('Permission result:', result)
      
      if (result.granted) {
        setNotificationPermission('granted')
        
        // Schedule reminders after permission granted
        if (studyTimetable) {
          const count = await scheduleTimetableReminders(studyTimetable, 'study')
          setScheduledCount(count)
        }
        
        // For native platform, try immediate test
        if (result.platform === 'native') {
          await scheduleImmediateTestNotification()
        }
        
        console.log('Notification permission granted!')
      } else {
        setNotificationPermission('denied')
        if (result.error) {
          setInitError(result.error)
        }
      }
    } catch (err) {
      console.error('Error requesting permission:', err)
      setInitError(err.message)
      
      // Fallback to browser Notification API
      if ('Notification' in window) {
        try {
          const permission = await Notification.requestPermission()
          setNotificationPermission(permission)
        } catch (e) {
          console.error('Fallback permission request failed:', e)
        }
      }
    }
    
    setTesting(false)
  }, [studyTimetable])

  const handleTestNotification = useCallback(async () => {
    setTesting(true)
    setInitError(null)
    
    try {
      // Check permission first
      const permStatus = await checkNotificationPermission()
      
      if (!permStatus.granted) {
        // Request permission first
        const result = await requestNotificationPermission('ReminderManager_test_button')
        if (!result.granted) {
          alert('Please enable notifications first!')
          setTesting(false)
          return
        }
        setNotificationPermission('granted')
      }
      
      // Schedule a test notification 1 minute from now
      await scheduleTestNotification()
      alert('Test notification scheduled! Check your notifications in 1 minute.')
    } catch (err) {
      console.error('Error scheduling test:', err)
      setInitError(err.message)
      alert('Failed to schedule test notification. Check console for details.')
    }
    
    setTesting(false)
  }, [])

  const getUpcomingSessions = useCallback(() => {
    const sessions = []
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const today = new Date()
    const currentDay = days[today.getDay()]
    
    // Use the studyTimetable from context
    const schedule = studyTimetable || studySchedule
    Object.entries(schedule).forEach(([day, daySessions]) => {
      if (Array.isArray(daySessions)) {
        daySessions.forEach(session => {
          sessions.push({
            ...session,
            day,
            isToday: day === currentDay
          })
        })
      }
    })
    
    return sessions.sort((a, b) => {
      if (!a.startTime || !b.startTime) return 0
      return a.startTime.localeCompare(b.startTime)
    })
  }, [studyTimetable, studySchedule])

  const upcomingSessions = getUpcomingSessions()
  
  // Filter sessions with reminders enabled
  const sessionsWithReminders = upcomingSessions.filter(s => s.reminder)

  return (
    <div className="reminder-manager">
      <div className="reminder-header">
        <h3>🔔 Study Reminders</h3>
        {notificationPermission !== 'granted' && (
          <button 
            className="enable-notifications-btn"
            onClick={requestPermission}
            disabled={testing}
          >
            {testing ? 'Enabling...' : 'Enable Notifications'}
          </button>
        )}
      </div>

      {notificationPermission === 'granted' && (
        <div className="notification-status">
          <span className="status-icon">✓</span>
          <span>Notifications enabled ({platform})</span>
          <button 
            className="test-notification-btn"
            onClick={handleTestNotification}
            disabled={testing}
          >
            {testing ? 'Testing...' : 'Test Notification'}
          </button>
        </div>
      )}

      {notificationPermission === 'denied' && (
        <div className="notification-warning">
          <span className="warning-icon">⚠️</span>
          <span>Notifications blocked. Please enable in browser/app settings.</span>
        </div>
      )}

      {initError && (
        <div className="notification-error">
          <span className="error-icon">❌</span>
          <span>Error: {initError}</span>
        </div>
      )}

      {/* Scheduled reminders count */}
      {notificationPermission === 'granted' && scheduledCount > 0 && (
        <div className="scheduled-count">
          <span className="count-icon">📅</span>
          <span>{scheduledCount} reminder{scheduledCount !== 1 ? 's' : ''} scheduled for today</span>
        </div>
      )}

      <div className="upcoming-sessions">
        <h4>Upcoming Study Sessions</h4>
        {upcomingSessions.length > 0 ? (
          <div className="sessions-list">
            {upcomingSessions.slice(0, 5).map((session, index) => (
              <div 
                key={session.id || index} 
                className={`session-preview ${session.isToday ? 'today' : ''}`}
              >
                <div className="session-info">
                  <span className="session-day">{session.day}</span>
                  <span className="session-time">
                    {session.startTime} - {session.endTime}
                  </span>
                </div>
                <div className="session-subject">{session.subject}</div>
                <button 
                  className={`reminder-toggle ${session.reminder ? 'active' : ''}`}
                  onClick={() => toggleStudyReminder && toggleStudyReminder(session.day, session.id)}
                  title={session.reminder ? 'Disable reminder' : 'Enable reminder'}
                >
                  {session.reminder ? '🔔' : '🔕'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-sessions-msg">
            No study sessions scheduled
          </p>
        )}
        
        {upcomingSessions.length === 0 && (
          <p className="hint-text">
            Add study sessions in the Timetable page to receive reminders
          </p>
        )}
      </div>

      {/* Platform Info */}
      <div className="platform-info">
        <small>Platform: {platform}</small>
        {platform === 'native' && (
          <small className="native-badge">Android App</small>
        )}
      </div>
    </div>
  )
}

export default ReminderManager

