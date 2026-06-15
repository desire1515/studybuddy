import './DashboardCard.css'

const DashboardCard = ({ icon, title, value, color = '#3b82f6' }) => {
  return (
    <div className="dashboard-card" style={{ borderLeftColor: color }}>
      <div className="card-icon" style={{ backgroundColor: color }}>
        {icon}
      </div>
      <div className="card-content">
        <h3 className="card-title">{title}</h3>
        <p className="card-value">{value}</p>
      </div>
    </div>
  )
}

export default DashboardCard
