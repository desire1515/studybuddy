import { useState } from 'react'
import { useApp } from '../context/AppContext'

const SearchRecord = () => {
  const { tasks, reminders, studySessions } = useApp()
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase()
    setSearchTerm(term)

    if (!term.trim()) {
      setSearchResults([])
      return
    }

    const results = []

    // Search tasks
    tasks.forEach(task => {
      if (task.title?.toLowerCase().includes(term)) {
        results.push({ ...task, type: 'task' })
      }
    })

    // Search reminders
    reminders.forEach(reminder => {
      if (reminder.title?.toLowerCase().includes(term) || 
          reminder.description?.toLowerCase().includes(term)) {
        results.push({ ...reminder, type: 'reminder' })
      }
    })

    // Search study sessions
    if (studySessions) {
      studySessions.forEach(session => {
        if (session.subject?.toLowerCase().includes(term)) {
          results.push({ ...session, type: 'study' })
        }
      })
    }

    setSearchResults(results.slice(0, 10))
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'task': return '📝'
      case 'reminder': return '🔔'
      case 'study': return '📖'
      default: return '•'
    }
  }

  return (
    <div className="search-record">
      <h3>🔍 Search Records</h3>
      <input
        type="text"
        placeholder="Search tasks, reminders, study sessions..."
        value={searchTerm}
        onChange={handleSearch}
        className="search-input"
      />
      
      {searchResults.length > 0 && (
        <div className="search-results">
          {searchResults.map((result, index) => (
            <div key={result.id || index} className="search-result-item">
              <span className="result-icon">{getTypeIcon(result.type)}</span>
              <span className="result-text">
                {result.title || result.subject || 'Untitled'}
              </span>
              <span className="result-type">{result.type}</span>
            </div>
          ))}
        </div>
      )}
      
      {searchTerm && searchResults.length === 0 && (
        <p className="no-results">No records found</p>
      )}
    </div>
  )
}

export default SearchRecord
