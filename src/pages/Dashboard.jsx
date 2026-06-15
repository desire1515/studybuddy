import { Link, useNavigate } from 'react-router-dom'
import { useCallback, useState } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { scheduleImmediateTestNotification, requestNotificationPermission } from '../firebase/notifications'
import DashboardCard from '../components/DashboardCard'
import StudyTimer from '../components/StudyTimer'
import StudyStreakCard from '../components/StudyStreakCard'
import WeeklyGoalCard from '../components/WeeklyGoalCard'
import SearchRecord from '../components/SearchRecord'
import ReminderForm from '../components/ReminderForm'
import ReminderList from '../components/ReminderList'
import './Dashboard.css'

const Dashboard = () => {
  const { user, stats, tasks, toggleTask, reminders, toggleReminder, timetable, studyTimetable } = useApp()
  const { isAuthenticated } = useAuth()
  const [testLoading, setTestLoading] = useState(false)
  const [testMessage, setTestMessage] = useState('')

  const runImmediateTest = useCallback(async () => {
    setTestLoading(true)
    setTestMessage('Requesting permission...')
    const permission = await requestNotificationPermission('dashboard_immediate_test')
    if (!permission.granted) {
      setTestMessage('Permission denied. Enable notifications and try again.')
      setTestLoading(false)
      return
    }

    setTestMessage('Scheduling immediate notification...')
    const result = await scheduleImmediateTestNotification()
    if (result) {
      setTestMessage('✅ Immediate notification scheduled (check your notifications).')
    } else {
      setTestMessage('❌ Failed to schedule immediate notification.')
    }
    setTestLoading(false)
  }, [])

  // Safety check - if data is not ready, show loading
  if (!timetable || !studyTimetable || !reminders || !tasks) {
    return (
      <div className="dashboard">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your data...</p>
        </div>
      </div>
    )
  }

  // Combine tasks, reminders, and today's timetable for Quick Tasks view
  const getTodayKey = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[new Date().getDay()]
  }
  
  const todayKey = getTodayKey()
  const todayClasses = timetable[todayKey] || []
  const todayStudySessions = studyTimetable[todayKey] || []

  const quickItems = [
    ...(tasks || []).map(task => ({ ...task, type: 'task' })),
    ...(reminders || []).map(reminder => ({ ...reminder, type: 'reminder' })),
    ...(todayClasses || []).map(cls => ({ ...cls, type: 'class', name: cls.subject })),
    ...(todayStudySessions || []).map(session => ({ ...session, type: 'study', name: session.subject }))
  ].slice(0, 5)

  const handleToggle = (item) => {
    if (item.type === 'task') {
      toggleTask(item.id)
    } else if (item.type === 'reminder') {
      toggleReminder(item.id)
    }
  }

  const getItemIcon = (item) => {
    switch (item.type) {
      case 'task': return '📝'
      case 'reminder': return '🔔'
      case 'class': return '📚'
      case 'study': return '📖'
      default: return '•'
    }
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome back, {user.name || user.displayName || 'Guest'}! 👋</h1>
        <p>Let's make today productive!</p>
      </div>

      <div className="dashboard-cards">
        <DashboardCard 
          icon="🔔" 
          title="Active Reminders" 
          value={stats.activeReminders} 
          color="#f59e0b"
        />
        <DashboardCard 
          icon="⏰" 
          title="Total Study Hours" 
          value={`${stats.totalStudyHours}h`} 
          color="#3b82f6"
        />
        <DashboardCard 
          icon="✅" 
          title="Completion Rate" 
          value={`${stats.completionRate}%`} 
          color="#22c55e"
        />
        <DashboardCard 
          icon="🔥" 
          title="Study Streak" 
          value={`${stats.currentStreak} days`} 
          color="#ef4444"
        />
      </div>

      <div className="dashboard-sections tracking-cards">
        <StudyStreakCard />
        <WeeklyGoalCard />
      </div>

      <div className="dashboard-notification-test">
        <button className="test-notification-btn" onClick={runImmediateTest} disabled={testLoading}>
          {testLoading ? 'Testing...' : 'Send Immediate Notification'}
        </button>
        {testMessage && <p className="test-message">{testMessage}</p>}
      </div>

      <div className="dashboard-sections">
        <SearchRecord />
      </div>

      <div className="dashboard-sections">
        <section className="study-timer-section">
          <h2>Study Timer</h2>
          <StudyTimer />
        </section>

        <section className="tasks-section">
          <h2>Quick Tasks & Reminders</h2>
          <div className="tasks-list">
            {quickItems.length === 0 ? (
              <div className="empty-tasks">
                <p>📝 No tasks or reminders yet</p>
                {isAuthenticated ? (
                  <p className="empty-hint">Add tasks from Timetable or create reminders below</p>
                ) : (
                  <p className="empty-hint">Login to sync your tasks</p>
                )}
              </div>
            ) : (
              quickItems.map(item => (
                <div 
                  key={item.id} 
                  className={`task-item ${item.completed ? 'completed' : ''} ${item.type === 'class' || item.type === 'study' ? 'timetable-item' : ''}`}
                  onClick={() => handleToggle(item)}
                >
                  <span className="task-checkbox">
                    {item.completed ? '✓' : ''}
                  </span>
                  <span className="task-name">
                    {getItemIcon(item)} {item.name || item.title}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="dashboard-sections reminders-section">
        <section className="reminder-form-section">
          <ReminderForm />
        </section>
        <section className="reminder-list-section">
          <ReminderList />
        </section>
      </div>

      <div className="navigation-buttons">
        <Link to="/timetable" className="nav-btn">
          <span>📅</span> View Timetable
        </Link>
        <Link to="/analytics" className="nav-btn">
          <span>📊</span> View Analytics
        </Link>
        <Link to="/profile" className="nav-btn">
          <span>👤</span> View Profile
        </Link>
      </div>
    </div>
  )
}

export default Dashboard
