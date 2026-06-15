import { useState } from 'react'
import { useApp } from '../context/AppContext'
import './ReminderForm.css'

const ReminderForm = () => {
  const { addReminder, timetable } = useApp()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    type: 'study', // study, class, assignment, exam
    linkedClass: '',
    repeat: 'none', // none, daily, weekly
    notification: true
  })

  const getUniqueSubjects = () => {
    const subjects = new Set()
    if (!timetable) return []
    
    Object.values(timetable).forEach(dayClasses => {
      if (Array.isArray(dayClasses)) {
        dayClasses.forEach(cls => {
          const subjectName = cls?.subject || cls?.name
          if (subjectName) {
            subjects.add(subjectName)
          }
        })
      }
    })
    return Array.from(subjects)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.title || !formData.date || !formData.time) return

    addReminder({
      ...formData,
      id: Date.now(),
      completed: false,
      createdAt: new Date().toISOString()
    })

    // Reset form
    setFormData({
      title: '',
      description: '',
      date: '',
      time: '',
      type: 'study',
      linkedClass: '',
      repeat: 'none',
      notification: true
    })
  }

  const subjects = getUniqueSubjects()

  return (
    <form onSubmit={handleSubmit} className="reminder-form">
      <h3>📝 Create Reminder</h3>
      
      <div className="form-row">
        <div className="form-group">
          <label>Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter reminder title"
            required
          />
        </div>

        <div className="form-group">
          <label>Type</label>
          <select name="type" value={formData.type} onChange={handleChange}>
            <option value="study">📚 Study Session</option>
            <option value="class">🏫 Class</option>
            <option value="assignment">📝 Assignment</option>
            <option value="exam">📋 Exam</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Add details (optional)"
          rows={2}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Date *</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Time *</label>
          <input
            type="time"
            name="time"
            value={formData.time}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Link to Class (Optional)</label>
          <select name="linkedClass" value={formData.linkedClass} onChange={handleChange}>
            <option value="">None</option>
            {subjects.map(subject => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Repeat</label>
          <select name="repeat" value={formData.repeat} onChange={handleChange}>
            <option value="none">Don't repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
      </div>

      <div className="form-group checkbox-group">
        <label>
          <input
            type="checkbox"
            name="notification"
            checked={formData.notification}
            onChange={handleChange}
          />
          🔔 Enable notification
        </label>
      </div>

      <button type="submit" className="submit-btn">
        ➕ Add Reminder
      </button>
    </form>
  )
}

export default ReminderForm
