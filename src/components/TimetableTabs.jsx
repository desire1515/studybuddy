import { useState } from 'react'
import './TimetableTabs.css'

const TimetableTabs = ({ activeTab, onTabChange }) => {
  return (
    <div className="timetable-tabs">
      <button 
        className={`tab-btn ${activeTab === 'class' ? 'active' : ''}`}
        onClick={() => onTabChange('class')}
      >
        <span className="tab-icon">📚</span>
        Class Timetable
      </button>
      <button 
        className={`tab-btn ${activeTab === 'study' ? 'active' : ''}`}
        onClick={() => onTabChange('study')}
      >
        <span className="tab-icon">📝</span>
        Study Timetable
      </button>
    </div>
  )
}

export default TimetableTabs
