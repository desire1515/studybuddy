import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  Legend 
} from 'recharts'
import './ChartComponent.css'

const ChartComponent = ({ data, type = 'bar', title }) => {
  // Safety check: ensure data exists and is an array
  const chartData = Array.isArray(data) ? data : []
  
  // Check if data is empty
  const isEmptyData = chartData.length === 0

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="tooltip-value">
              {entry.name}: {entry.value} hours
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Render fallback if no data
  if (isEmptyData) {
    return (
      <div className="chart-container">
        {title && <h3 className="chart-title">{title}</h3>}
        <div className="chart-empty">
          <p>📊 No data available yet</p>
          <p className="chart-empty-subtitle">Start logging your study sessions to see analytics</p>
        </div>
      </div>
    )
  }

  return (
    <div className="chart-container">
      {title && <h3 className="chart-title">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        {type === 'bar' ? (
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="day" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Study Hours" />
          </BarChart>
        ) : (
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="week" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={2} name="Study Hours" />
            <Line type="monotone" dataKey="tasks" stroke="#22c55e" strokeWidth={2} name="Tasks Completed" />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

export default ChartComponent
