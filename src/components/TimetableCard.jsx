import './TimetableCard.css'

const TimetableCard = ({ day, sessions, onDelete, onEdit, type = 'class' }) => {
  // Sort sessions by start time
  const sortedSessions = [...sessions].sort((a, b) => {
    if (!a.startTime || !b.startTime) return 0
    return a.startTime.localeCompare(b.startTime)
  })

  return (
    <div className="timetable-card">
      <div className="timetable-card-header">
        <h3 className="day-name">{day}</h3>
        <span className="session-count">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="sessions-list">
        {sortedSessions.length > 0 ? (
          sortedSessions.map((session, index) => (
            <div
              key={session.id || index}
              className="session-item"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="session-time">
                <span className="time-start">{session.startTime || '--:--'}</span>
                <span className="time-separator">-</span>
                <span className="time-end">{session.endTime || '--:--'}</span>
              </div>

              <div className="session-details">
                <h4 className="session-subject">
                  {session.subject}
                  {type === 'study' && session.reminder && <span className="reminder-badge">Reminder</span>}
                </h4>
                {type === 'class' && session.room && (
                  <p className="session-room">Room: {session.room}</p>
                )}
              </div>

              <div className="session-actions">
                <button
                  className="edit-session-btn"
                  onClick={() => onEdit?.(session)}
                  title="Edit session"
                >
                  Edit
                </button>
                <button
                  className="delete-session-btn"
                  onClick={() => onDelete(session.id)}
                  title="Delete session"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="no-sessions">
            <span className="no-sessions-icon">No Data</span>
            <p>No {type === 'class' ? 'classes' : 'study sessions'} scheduled</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default TimetableCard
