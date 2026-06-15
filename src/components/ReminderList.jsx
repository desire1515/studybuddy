import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { onForegroundMessage } from '../firebase/messaging'
import { checkNotificationPermission, requestNotificationPermission } from '../firebase/notifications'
import './ReminderList.css'

const ReminderList = () => {
  const { reminders, deleteReminder, toggleReminder, updateReminder } = useApp()

  const [notificationPermission, setNotificationPermission] = useState('default')
  const [requestingPermission, setRequestingPermission] = useState(false)
  const [editingReminderId, setEditingReminderId] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    type: 'study',
    linkedClass: '',
    repeat: 'none',
    notification: true
  })

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const result = await checkNotificationPermission()
        setNotificationPermission(result.granted ? 'granted' : (result.status || 'default'))
      } catch (error) {
        console.warn('Error checking permission:', error)
      }
    }

    checkPermission()
  }, [])

  useEffect(() => {
    if (notificationPermission !== 'granted') return

    let cleanup = null

    const setupFCM = async () => {
      try {
        cleanup = await onForegroundMessage((payload) => {
          if (import.meta.env.DEV) console.debug('Foreground message received in ReminderList:', payload)
        })
      } catch (error) {
        console.warn('Failed to set up foreground message handler:', error)
      }
    }

    setupFCM()

    return () => {
      if (cleanup) cleanup()
    }
  }, [notificationPermission])

  const handleEnableNotifications = async () => {
    if (requestingPermission) return

    setRequestingPermission(true)
    try {
      const result = await requestNotificationPermission()
      if (result.granted) {
        setNotificationPermission('granted')
      } else if (result.status) {
        setNotificationPermission(result.status)
      }
    } catch (error) {
      console.error('Error requesting permission:', error)
    }
    setRequestingPermission(false)
  }

  const sortedReminders = [...reminders].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time}`)
    const dateB = new Date(`${b.date}T${b.time}`)
    return dateA - dateB
  })

  const upcomingReminders = sortedReminders.filter((r) => !r.completed)
  const completedReminders = sortedReminders.filter((r) => r.completed)

  const getTypeIcon = (type) => {
    switch (type) {
      case 'study': return 'Study'
      case 'class': return 'Class'
      case 'assignment': return 'Assign'
      case 'exam': return 'Exam'
      default: return 'Reminder'
    }
  }

  const getRepeatLabel = (repeat) => {
    switch (repeat) {
      case 'daily': return 'Daily'
      case 'weekly': return 'Weekly'
      default: return ''
    }
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (dateStr === today.toISOString().split('T')[0]) return 'Today'
    if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Tomorrow'
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const isOverdue = (reminder) => {
    const reminderTime = new Date(`${reminder.date}T${reminder.time}`)
    return reminderTime < new Date() && !reminder.completed
  }

  const startEditingReminder = (reminder) => {
    setEditingReminderId(reminder.id)
    setEditForm({
      title: reminder.title || '',
      description: reminder.description || '',
      date: reminder.date || '',
      time: reminder.time || '',
      type: reminder.type || 'study',
      linkedClass: reminder.linkedClass || '',
      repeat: reminder.repeat || 'none',
      notification: reminder.notification !== false
    })
  }

  const cancelEditingReminder = () => {
    setEditingReminderId(null)
    setSavingEdit(false)
  }

  const handleEditFormChange = (event) => {
    const { name, value, type, checked } = event.target
    setEditForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSaveReminder = async (event) => {
    event.preventDefault()

    if (!editingReminderId || savingEdit) return
    if (!editForm.title.trim() || !editForm.date || !editForm.time) {
      return
    }

    setSavingEdit(true)
    try {
      await updateReminder(editingReminderId, {
        title: editForm.title.trim(),
        description: (editForm.description || '').trim(),
        date: editForm.date,
        time: editForm.time,
        type: editForm.type,
        linkedClass: (editForm.linkedClass || '').trim(),
        repeat: editForm.repeat,
        notification: !!editForm.notification
      })
      cancelEditingReminder()
    } catch (error) {
      console.error('Error updating reminder:', error)
    } finally {
      setSavingEdit(false)
    }
  }

  const renderReminderCard = (reminder, index, isCompleted = false) => {
    const isEditing = editingReminderId === reminder.id

    if (isEditing) {
      return (
        <form
          key={reminder.id}
          className={`reminder-card reminder-edit-card ${isCompleted ? 'completed' : ''}`}
          onSubmit={handleSaveReminder}
        >
          <div className="reminder-content">
            <div className="reminder-edit-grid">
              <input
                type="text"
                name="title"
                value={editForm.title}
                onChange={handleEditFormChange}
                placeholder="Reminder title"
                required
              />
              <select name="type" value={editForm.type} onChange={handleEditFormChange}>
                <option value="study">Study</option>
                <option value="class">Class</option>
                <option value="assignment">Assignment</option>
                <option value="exam">Exam</option>
              </select>
              <input
                type="date"
                name="date"
                value={editForm.date}
                onChange={handleEditFormChange}
                required
              />
              <input
                type="time"
                name="time"
                value={editForm.time}
                onChange={handleEditFormChange}
                required
              />
              <input
                type="text"
                name="linkedClass"
                value={editForm.linkedClass}
                onChange={handleEditFormChange}
                placeholder="Linked class (optional)"
              />
              <select name="repeat" value={editForm.repeat} onChange={handleEditFormChange}>
                <option value="none">Do not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <textarea
              name="description"
              value={editForm.description}
              onChange={handleEditFormChange}
              placeholder="Description"
              rows={2}
            />
            <label className="reminder-edit-notification">
              <input
                type="checkbox"
                name="notification"
                checked={editForm.notification}
                onChange={handleEditFormChange}
              />
              Notification enabled
            </label>
            <div className="reminder-edit-actions">
              <button type="submit" className="edit-save-btn" disabled={savingEdit}>
                {savingEdit ? 'Saving...' : 'Save'}
              </button>
              <button type="button" className="edit-cancel-btn" onClick={cancelEditingReminder}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      )
    }

    return (
      <div
        key={reminder.id}
        className={`reminder-card ${isOverdue(reminder) ? 'overdue' : ''} ${isCompleted ? 'completed' : ''}`}
        style={{ animationDelay: `${index * 0.05}s` }}
      >
        <div className="reminder-checkbox" onClick={() => toggleReminder(reminder.id)}>
          {reminder.completed ? 'Done' : 'Open'}
        </div>

        <div className="reminder-content">
          <div className="reminder-header">
            <span className="reminder-icon">{getTypeIcon(reminder.type)}</span>
            <span className="reminder-title">{reminder.title}</span>
            {reminder.repeat !== 'none' && (
              <span className="reminder-repeat">{getRepeatLabel(reminder.repeat)}</span>
            )}
          </div>

          {reminder.description && (
            <p className="reminder-description">{reminder.description}</p>
          )}

          <div className="reminder-meta">
            <span>{formatDate(reminder.date)}</span>
            <span>{reminder.time}</span>
            {reminder.linkedClass && <span>{reminder.linkedClass}</span>}
          </div>
        </div>

        <div className="reminder-actions">
          <button
            className="edit-btn"
            onClick={() => startEditingReminder(reminder)}
            title="Edit reminder"
          >
            Edit
          </button>
          <button
            className="delete-btn"
            onClick={() => deleteReminder(reminder.id)}
            title="Delete reminder"
          >
            Delete
          </button>
        </div>
      </div>
    )
  }

  if (reminders.length === 0) {
    return (
      <div className="reminder-list empty">
        <div className="empty-icon">Reminders</div>
        <p>No reminders yet</p>
        <span>Create a reminder to get started</span>
        {notificationPermission !== 'granted' && (
          <button
            className="enable-btn"
            onClick={handleEnableNotifications}
            disabled={requestingPermission}
          >
            {requestingPermission ? 'Enabling...' : 'Enable Notifications'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="reminder-list">
      {notificationPermission !== 'granted' && (
        <div className="permission-banner">
          <span>Enable notifications to receive reminders</span>
          <button onClick={handleEnableNotifications} disabled={requestingPermission}>
            {requestingPermission ? '...' : 'Enable'}
          </button>
        </div>
      )}

      {upcomingReminders.length > 0 && (
        <div className="reminder-section">
          <h4>Upcoming Reminders</h4>
          <div className="reminders-container">
            {upcomingReminders.map((reminder, index) => renderReminderCard(reminder, index, false))}
          </div>
        </div>
      )}

      {completedReminders.length > 0 && (
        <div className="reminder-section completed-section">
          <h4>Completed ({completedReminders.length})</h4>
          <div className="reminders-container">
            {completedReminders.slice(0, 6).map((reminder, index) => renderReminderCard(reminder, index, true))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ReminderList
