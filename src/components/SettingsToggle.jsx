import './SettingsToggle.css'

const SettingsToggle = ({ label, icon, enabled, onToggle }) => {
  return (
    <div className="settings-toggle">
      <div className="toggle-info">
        <span className="toggle-icon">{icon}</span>
        <span className="toggle-label">{label}</span>
      </div>
      <button 
        className={`toggle-switch ${enabled ? 'active' : ''}`}
        onClick={onToggle}
        aria-pressed={enabled}
      >
        <span className="toggle-slider"></span>
      </button>
    </div>
  )
}

export default SettingsToggle
