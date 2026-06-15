/**
 * Analytics Page
 * 
 * Enhanced with:
 * - Daily Study Chart
 * - Weekly Study Chart
 * - Subject Breakdown (Pie Chart)
 */

import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { getStudyTimeBySubject, getWeeklyProgress } from '../firebase/firestore'
import ChartComponent from '../components/ChartComponent'
import DashboardCard from '../components/DashboardCard'
import './Analytics.css'

const Analytics = () => {
  const { studySessions, stats } = useApp()
  const { user } = useAuth()
  const [subjectData, setSubjectData] = useState({})
  const [weeklyProgress, setWeeklyProgress] = useState(0)
  const [loading, setLoading] = useState(true)

  // Load analytics data from Firestore
  useEffect(() => {
    const loadAnalyticsData = async () => {
      if (user?.uid) {
        try {
          const subjectTime = await getStudyTimeBySubject(user.uid)
          const weekly = await getWeeklyProgress(user.uid)
          setSubjectData(subjectTime || {})
          setWeeklyProgress(weekly || 0)
        } catch (error) {
          console.error('Error loading analytics data:', error)
        } finally {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    }

    loadAnalyticsData()
  }, [user?.uid, studySessions])

  // Generate study hours per day data
  const dailyStudyData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const data = days.map(day => ({ day, hours: 0 }))
    
    studySessions.forEach(session => {
      if (session.date) {
        const sessionDate = new Date(session.date)
        const dayIndex = (sessionDate.getDay() + 6) % 7 // Adjust so Monday = 0
        
        let duration
        if (session.durationMinutes) {
          duration = session.durationMinutes / 60
        } else if (session.startTime && session.endTime) {
          duration = (new Date(session.endTime) - new Date(session.startTime)) / (1000 * 60 * 60)
        } else {
          duration = 0
        }
        
        data[dayIndex].hours += duration
      }
    })
    
    return data.map(d => ({ ...d, hours: Math.round(d.hours * 10) / 10 }))
  }, [studySessions])

  // Generate weekly progress data
  const weeklyProgressData = useMemo(() => {
    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4']
    return weeks.map((week, index) => {
      const weekStart = index * 7
      const weekSessions = studySessions.slice(weekStart, weekStart + 7)
      const hours = weekSessions.reduce((acc, session) => {
        const duration = session.durationMinutes ? session.durationMinutes / 60 : 0
        return acc + duration
      }, 0)
      return {
        week,
        hours: Math.round(hours * 10) / 10,
        tasks: Math.floor(hours / 2)
      }
    })
  }, [studySessions])

  // Generate subject breakdown data
  const subjectBreakdownData = useMemo(() => {
    // Use data from Firestore if available
    if (Object.keys(subjectData).length > 0) {
      return Object.entries(subjectData).map(([subject, minutes]) => ({
        name: subject,
        hours: Math.round((minutes / 60) * 10) / 10,
        percentage: 0 // Will be calculated
      }))
    }
    
    // Fallback to local data
    const subjectHours = {}
    studySessions.forEach(session => {
      const subject = session.subject || 'Unassigned'
      if (!subjectHours[subject]) {
        subjectHours[subject] = 0
      }
      
      let duration = 0
      if (session.durationMinutes) {
        duration = session.durationMinutes / 60
      } else if (session.startTime && session.endTime) {
        duration = (new Date(session.endTime) - new Date(session.startTime)) / (1000 * 60 * 60)
      }
      
      subjectHours[subject] += duration
    })
    
    return Object.entries(subjectHours).map(([subject, hours]) => ({
      name: subject,
      hours: Math.round(hours * 10) / 10,
      percentage: 0
    }))
  }, [studySessions, subjectData])

  // Calculate percentages for subject data
  const subjectDataWithPercentages = useMemo(() => {
    const totalHours = subjectBreakdownData.reduce((acc, item) => acc + item.hours, 0)
    return subjectBreakdownData.map(item => ({
      ...item,
      percentage: totalHours > 0 ? Math.round((item.hours / totalHours) * 100) : 0
    }))
  }, [subjectBreakdownData])

  // Subject colors
  const subjectColors = {
    'Mathematics': '#3b82f6',
    'Physics': '#8b5cf6',
    'Chemistry': '#10b981',
    'Computer Science': '#f59e0b',
    'English': '#ef4444',
    'History': '#06b6d4',
    'Unassigned': '#6b7280',
    'General': '#6b7280'
  }

  const getSubjectColor = (subject) => {
    return subjectColors[subject] || '#6b7280'
  }

  // Calculate additional stats
  const averageHoursPerDay = stats.totalStudyHours / 7
  const longestStreak = stats.currentStreak

  // Get today's study time
  const todayStudyTime = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const todaySessions = studySessions.filter(s => s.date === today)
    return todaySessions.reduce((acc, session) => {
      const duration = session.durationMinutes ? session.durationMinutes / 60 : 0
      return acc + duration
    }, 0)
  }, [studySessions])

  // Get this week's study time
  const thisWeekStudyTime = weeklyProgress || studySessions.reduce((acc, session) => {
    if (session.date) {
      const sessionDate = new Date(session.date)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      
      if (sessionDate >= weekAgo) {
        const duration = session.durationMinutes ? session.durationMinutes / 60 : 0
        return acc + duration
      }
    }
    return acc
  }, 0)

  return (
    <div className="analytics">
      <div className="analytics-header">
        <h1>📊 Analytics Dashboard</h1>
        <p>Track your study progress and performance</p>
      </div>

      <div className="stats-cards">
        <DashboardCard 
          icon="⏰" 
          title="Total Study Hours" 
          value={`${stats.totalStudyHours}h`} 
          color="#3b82f6"
        />
        <DashboardCard 
          icon="📈" 
          title="Average Hours/Day" 
          value={`${Math.round(averageHoursPerDay * 10) / 10}h`} 
          color="#8b5cf6"
        />
        <DashboardCard 
          icon="✅" 
          title="Completion Rate" 
          value={`${stats.completionRate}%`} 
          color="#22c55e"
        />
        <DashboardCard 
          icon="🔥" 
          title="Longest Streak" 
          value={`${longestStreak} days`} 
          color="#f59e0b"
        />
      </div>

      {/* Quick Stats Row */}
      <div className="quick-stats">
        <div className="quick-stat">
          <span className="quick-stat-icon">📅</span>
          <div className="quick-stat-content">
            <span className="quick-stat-value">{todayStudyTime.toFixed(1)}h</span>
            <span className="quick-stat-label">Today</span>
          </div>
        </div>
        <div className="quick-stat">
          <span className="quick-stat-icon">📆</span>
          <div className="quick-stat-content">
            <span className="quick-stat-value">{thisWeekStudyTime.toFixed(1)}h</span>
            <span className="quick-stat-label">This Week</span>
          </div>
        </div>
        <div className="quick-stat">
          <span className="quick-stat-icon">🍅</span>
          <div className="quick-stat-content">
            <span className="quick-stat-value">{studySessions.length}</span>
            <span className="quick-stat-label">Sessions</span>
          </div>
        </div>
      </div>

      <div className="charts-section">
        <div className="chart-wrapper">
          <ChartComponent 
            data={dailyStudyData} 
            type="bar" 
            title="Study Hours Per Day" 
          />
        </div>
        <div className="chart-wrapper">
          <ChartComponent 
            data={weeklyProgressData} 
            type="line" 
            title="Weekly Progress" 
          />
        </div>
      </div>

      {/* Subject Breakdown Section */}
      <div className="subject-section">
        <h2>📚 Subject Breakdown</h2>
        {loading ? (
          <div className="loading-analytics">
            <p>Loading subject data...</p>
          </div>
        ) : subjectDataWithPercentages.length > 0 ? (
          <div className="subject-grid">
            {subjectDataWithPercentages.map((item, index) => (
              <div 
                key={index} 
                className="subject-card"
                style={{ borderLeftColor: getSubjectColor(item.name) }}
              >
                <div className="subject-info">
                  <span className="subject-name">{item.name}</span>
                  <span className="subject-hours">{item.hours}h</span>
                </div>
                <div className="subject-bar">
                  <div 
                    className="subject-bar-fill"
                    style={{ 
                      width: `${item.percentage}%`,
                      backgroundColor: getSubjectColor(item.name)
                    }}
                  ></div>
                </div>
                <span className="subject-percentage">{item.percentage}%</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-subjects">
            <p>📚 No subject data yet</p>
            <p className="empty-hint">Complete study sessions to see subject breakdown</p>
          </div>
        )}
      </div>

      <div className="tracking-info">
        <h2>📝 Study Tracking Information</h2>
        <div className="info-grid">
          <div className="info-card">
            <h3>Total Sessions</h3>
            <p>{studySessions.length}</p>
          </div>
          <div className="info-card">
            <h3>Tasks Completed</h3>
            <p>{stats.completedTasks} / {stats.totalTasks}</p>
          </div>
          <div className="info-card">
            <h3>Active Tasks</h3>
            <p>{stats.activeReminders}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics

