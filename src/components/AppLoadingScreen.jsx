import './AppLoadingScreen.css';

const AppLoadingScreen = ({ message = 'Loading StudyBuddy', subtitle = 'Preparing your workspace', initial = false }) => (
  <div className={`app-loading-screen ${initial ? 'app-loading-screen--initial' : ''}`}>
    <div className="app-loading-card" role="status" aria-live="polite">
      <div className="app-loading-brand">
        <div className="app-loading-logo">SB</div>
        <div>
          <p className="app-loading-title">{message}</p>
          <p className="app-loading-subtitle">{subtitle}</p>
        </div>
      </div>

      <div className="app-loading-progress" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  </div>
);

export default AppLoadingScreen;
