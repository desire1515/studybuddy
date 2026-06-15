import './About.css'

const About = () => {
  const features = [
    {
      icon: '📚',
      title: 'Class Timetable',
      description: 'Manage your class schedule efficiently'
    },
    {
      icon: '📖',
      title: 'Study Timetable',
      description: 'Plan and organize your study sessions'
    },
    {
      icon: '🔔',
      title: 'Notifications & Reminders',
      description: 'Never miss important tasks or classes'
    },
    {
      icon: '📅',
      title: 'Weekly Structured View',
      description: 'Visualize your week at a glance'
    },
    {
      icon: '☁️',
      title: 'Firebase Cloud Storage',
      description: 'Your data is safely stored in the cloud'
    }
  ]

  const handleEmailClick = () => {
    window.location.href = 'mailto:studybuddy2025@gmail.com?subject=StudyBuddy Help Request'
  }

  return (
    <div className="about">
      <div className="about-header">
        <div className="about-logo">
          <span className="about-logo-icon">📘</span>
        </div>
        <h1>StudyBuddy</h1>
        <p className="about-tagline">Your Academic Companion</p>
      </div>

      <div className="about-section">
        <h2>About the App</h2>
        <div className="about-card">
          <p>
            StudyBuddy helps students manage their <strong>Class Timetable</strong> and 
            <strong> Study Timetable</strong> with reminders and structured weekly view. 
            Stay organized, track your progress, and achieve your academic goals with ease.
          </p>
        </div>
      </div>

      <div className="about-section">
        <h2>Features</h2>
        <div className="features-list">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <div className="feature-content">
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="about-section">
        <h2>Version</h2>
        <div className="about-card version-card">
          <span className="version-number">Version 1.0.0</span>
        </div>
      </div>

      <div className="about-section contact-section">
        <h2>Contact Support</h2>
        <div className="about-card contact-card">
          <p className="contact-description">
            Need help or have questions? We're here to assist you!
          </p>
          <a 
            href="mailto:studybuddy2025@gmail.com?subject=StudyBuddy Help Request"
            className="contact-button"
            onClick={handleEmailClick}
          >
            📧 Send Email
          </a>
          <p className="contact-email">studybuddy2025@gmail.com</p>
        </div>
      </div>

      <div className="about-footer">
        <p>© 2025 StudyBuddy. All rights reserved.</p>
      </div>
    </div>
  )
}

export default About

