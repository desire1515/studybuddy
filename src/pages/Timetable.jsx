import { useState } from 'react'
import { useApp } from '../context/AppContext'
import TimetableTabs from '../components/TimetableTabs'
import TimetableCard from '../components/TimetableCard'
import ReminderManager from '../components/ReminderManager'
import './Timetable.css'

const emptyEntry = {
  subject: '',
  startTime: '',
  endTime: '',
  room: '',
  reminder: false
}

const Timetable = () => {
  const {
    timetable,
    studyTimetable,
    stats,
    addClass,
    updateClass,
    deleteClass,
    addStudySession,
    updateStudySession,
    deleteStudySession
  } = useApp()

  const [activeTab, setActiveTab] = useState('class')
  const [selectedDay, setSelectedDay] = useState('Monday')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingEntryId, setEditingEntryId] = useState(null)
  const [newEntry, setNewEntry] = useState(emptyEntry)

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  const getToday = () => {
    const currentDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return currentDays[new Date().getDay()]
  }

  const today = getToday()

  const getSessionsForDay = (day) => {
    if (activeTab === 'class') {
      return timetable[day] || []
    }
    return studyTimetable[day] || []
  }

  const sessionsForDay = getSessionsForDay(selectedDay)

  const resetEntryForm = () => {
    setNewEntry(emptyEntry)
    setEditingEntryId(null)
  }

  const handleToggleForm = () => {
    if (showAddForm) {
      setShowAddForm(false)
      resetEntryForm()
      return
    }

    resetEntryForm()
    setShowAddForm(true)
  }

  const handleSubmitEntry = async (e) => {
    e.preventDefault()

    if (!newEntry.subject.trim() || !newEntry.startTime || !newEntry.endTime) {
      return
    }

    const payload = {
      subject: newEntry.subject.trim(),
      startTime: newEntry.startTime,
      endTime: newEntry.endTime,
      ...(activeTab === 'class' ? { room: (newEntry.room || '').trim() } : { reminder: !!newEntry.reminder })
    }

    if (editingEntryId) {
      if (activeTab === 'class') {
        await updateClass(selectedDay, editingEntryId, payload)
      } else {
        await updateStudySession(selectedDay, editingEntryId, payload)
      }
    } else if (activeTab === 'class') {
      await addClass(selectedDay, payload)
    } else {
      await addStudySession(selectedDay, payload)
    }

    resetEntryForm()
    setShowAddForm(false)
  }

  const handleEditEntry = (entry) => {
    setEditingEntryId(entry.id)
    setNewEntry({
      subject: entry.subject || '',
      startTime: entry.startTime || '',
      endTime: entry.endTime || '',
      room: entry.room || '',
      reminder: !!entry.reminder
    })
    setShowAddForm(true)
  }

  const handleDeleteEntry = async (entryId) => {
    const confirmMessage = activeTab === 'class'
      ? 'Are you sure you want to delete this class?'
      : 'Are you sure you want to delete this study session?'

    if (!window.confirm(confirmMessage)) {
      return
    }

    if (activeTab === 'class') {
      await deleteClass(selectedDay, entryId)
    } else {
      await deleteStudySession(selectedDay, entryId)
    }

    if (editingEntryId === entryId) {
      resetEntryForm()
      setShowAddForm(false)
    }
  }

  return (
    <div className="timetable">
      <div className="timetable-header">
        <h1>Timetable</h1>
        <p>Manage your class and study schedule</p>
      </div>

      <TimetableTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="day-selector">
        {days.map((day) => (
          <button
            key={day}
            className={`day-btn ${selectedDay === day ? 'active' : ''} ${day === today ? 'today' : ''}`}
            onClick={() => setSelectedDay(day)}
          >
            {day.slice(0, 3)}
          </button>
        ))}
      </div>

      <div className="timetable-content">
        <section className="sessions-section">
          <div className="sessions-header">
            <h2>
              {selectedDay}'s {activeTab === 'class' ? 'Classes' : 'Study Sessions'}
            </h2>
            <button className="add-session-btn" onClick={handleToggleForm}>
              {showAddForm
                ? (editingEntryId ? 'Cancel Edit' : 'Cancel')
                : `+ Add ${activeTab === 'class' ? 'Class' : 'Session'}`}
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleSubmitEntry} className="add-session-form">
              <input
                type="text"
                placeholder="Subject name"
                value={newEntry.subject}
                onChange={(e) => setNewEntry({ ...newEntry, subject: e.target.value })}
                required
              />

              <div className="time-inputs">
                <input
                  type="time"
                  value={newEntry.startTime}
                  onChange={(e) => setNewEntry({ ...newEntry, startTime: e.target.value })}
                  required
                />
                <span className="time-separator">to</span>
                <input
                  type="time"
                  value={newEntry.endTime}
                  onChange={(e) => setNewEntry({ ...newEntry, endTime: e.target.value })}
                  required
                />
              </div>

              {activeTab === 'class' && (
                <input
                  type="text"
                  placeholder="Room"
                  value={newEntry.room}
                  onChange={(e) => setNewEntry({ ...newEntry, room: e.target.value })}
                />
              )}

              {activeTab === 'study' && (
                <label className="reminder-toggle">
                  <input
                    type="checkbox"
                    checked={newEntry.reminder}
                    onChange={(e) => setNewEntry({ ...newEntry, reminder: e.target.checked })}
                  />
                  <span>Set Reminder</span>
                </label>
              )}

              <button type="submit" className="submit-btn">
                {editingEntryId ? 'Save Changes' : 'Add'}
              </button>
            </form>
          )}

          <TimetableCard
            day={selectedDay}
            sessions={sessionsForDay}
            onEdit={handleEditEntry}
            onDelete={handleDeleteEntry}
            type={activeTab}
          />
        </section>

        <aside className="timetable-sidebar">
          <div className="stats-section">
            <h3>Weekly Statistics</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-icon">Classes</span>
                <div className="stat-info">
                  <p className="stat-value">{stats.totalClassesPerWeek}</p>
                  <p className="stat-label">Classes</p>
                </div>
              </div>
              <div className="stat-card">
                <span className="stat-icon">Study</span>
                <div className="stat-info">
                  <p className="stat-value">{stats.totalStudySessionsPerWeek}</p>
                  <p className="stat-label">Study Sessions</p>
                </div>
              </div>
              <div className="stat-card">
                <span className="stat-icon">Today</span>
                <div className="stat-info">
                  <p className="stat-value">{stats.todayClasses}</p>
                  <p className="stat-label">Today's Classes</p>
                </div>
              </div>
              <div className="stat-card">
                <span className="stat-icon">Focus</span>
                <div className="stat-info">
                  <p className="stat-value">{stats.todayStudySessions}</p>
                  <p className="stat-label">Today's Study</p>
                </div>
              </div>
            </div>
          </div>

          {activeTab === 'study' && <ReminderManager studySchedule={studyTimetable} />}
        </aside>
      </div>
    </div>
  )
}

export default Timetable
