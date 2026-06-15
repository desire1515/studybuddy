import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  
  const { login, sendPasswordReset } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await sendPasswordReset(resetEmail);
      setResetSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>📚 StudyBuddy</h1>
          <p>Welcome back! Please login to continue.</p>
        </div>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            <button 
              type="button" 
              className="link-btn"
              onClick={() => {
                setShowResetModal(true);
                setError('');
                setResetSent(false);
              }}
            >
              Forgot Password?
            </button>
          </p>
          <p>Don't have an account? <Link to="/register">Register</Link></p>
        </div>

        <div className="demo-credentials">
          <p><strong>New User?</strong> Register to create an account</p>
        </div>

        {/* Password Reset Modal */}
        {showResetModal && (
          <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>🔐 Reset Password</h2>
              
              {resetSent ? (
                <div className="success-message">
                  <p>✅ Password reset email sent!</p>
                  <p>Check your inbox for further instructions.</p>
                  <button 
                    className="auth-btn"
                    onClick={() => setShowResetModal(false)}
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePasswordReset} className="auth-form">
                  <p className="modal-description">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                  
                  <div className="form-group">
                    <label htmlFor="resetEmail">Email</label>
                    <input
                      type="email"
                      id="resetEmail"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                    />
                  </div>

                  <div className="modal-actions">
                    <button 
                      type="button" 
                      className="cancel-btn"
                      onClick={() => setShowResetModal(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="auth-btn" disabled={isLoading}>
                      {isLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;

