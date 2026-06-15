/**
 * Debug Panel Component for StudyBuddy
 * 
 * A floating panel that displays error logs and app information.
 * Hidden by default - reveal with triple-tap on the screen.
 * 
 * Features:
 * - Shows recent errors with timestamps
 * - Displays platform information
 * - Allows clearing errors
 * - Expandable/collapsible
 * - Drag to reposition (optional)
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  getStoredErrors, 
  getErrorCounts, 
  clearStoredErrors,
  setErrorListener,
  isErrorHandlerInitialized 
} from '../utils/errorHandler';
import './DebugPanel.css';

// ============================================================================
// COMPONENT
// ============================================================================

const DebugPanel = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [errors, setErrors] = useState([]);
  const [errorCounts, setErrorCounts] = useState({});
  const [lastTap, setLastTap] = useState(0);
  const [platformInfo, setPlatformInfo] = useState(null);

  // Initialize on mount
  useEffect(() => {
    // Load initial errors
    if (isErrorHandlerInitialized()) {
      refreshErrors();
    }

    // Set up error listener
    setErrorListener((error) => {
      refreshErrors();
    });

    // Set up platform info
    setPlatformInfo({
      isCapacitor: typeof window.Capacitor !== 'undefined',
      isPWA: window.matchMedia?.('(display-mode:standalone)')?.matches || 
             window.navigator.standalone === true,
      url: window.location.href
    });

    // Set up triple-tap detection
    const handleTouch = (e) => {
      const now = Date.now();
      const TAP_DELAY = 300; // Max time between taps
      
      if (now - lastTap < TAP_DELAY) {
        // Triple tap detected
        setIsVisible(prev => !prev);
      }
      setLastTap(now);
    };

    // Also support triple-click for desktop testing
    const handleClick = (e) => {
      if (e.detail === 3) {
        setIsVisible(prev => !prev);
      }
    };

    document.addEventListener('touchstart', handleTouch);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('touchstart', handleTouch);
      document.removeEventListener('click', handleClick);
    };
  }, [lastTap]);

  // Refresh errors from storage
  const refreshErrors = useCallback(() => {
    setErrors(getStoredErrors());
    setErrorCounts(getErrorCounts());
  }, []);

  // Handle clear errors
  const handleClearErrors = () => {
    clearStoredErrors();
    refreshErrors();
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    } catch {
      return timestamp;
    }
  };

  // Get error type label
  const getErrorTypeLabel = (type) => {
    const labels = {
      'javascript_error': 'JS Error',
      'unhandled_promise_rejection': 'Promise Error',
      'custom_error_firestore': 'Firestore',
      'custom_error_auth': 'Auth',
      'custom_error_network': 'Network'
    };
    return labels[type] || type.replace('custom_error_', '');
  };

  // Get error type class
  const getErrorTypeClass = (type) => {
    if (type.includes('firestore')) return 'error-firestore';
    if (type.includes('auth')) return 'error-auth';
    if (type.includes('network')) return 'error-network';
    return 'error-generic';
  };

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  return (
    <div className="debug-panel">
      {/* Header */}
      <div 
        className="debug-panel-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="debug-panel-title">
          🔧 Debug Panel
        </span>
        <span className="debug-panel-toggle">
          {isExpanded ? '▼' : '▲'}
        </span>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="debug-panel-content">
          {/* Platform Info */}
          {platformInfo && (
            <div className="debug-section">
              <div className="debug-section-title">Platform</div>
              <div className="debug-info">
                {platformInfo.isCapacitor && <span className="badge badge-capacitor">Capacitor</span>}
                {platformInfo.isPWA && <span className="badge badge-pwa">PWA</span>}
                {!platformInfo.isCapacitor && !platformInfo.isPWA && <span className="badge badge-web">Web</span>}
              </div>
            </div>
          )}

          {/* Error Summary */}
          <div className="debug-section">
            <div className="debug-section-title">
              Errors ({errors.length})
            </div>
            {Object.keys(errorCounts).length > 0 && (
              <div className="debug-error-summary">
                {Object.entries(errorCounts).map(([type, count]) => (
                  <span 
                    key={type} 
                    className={`badge ${getErrorTypeClass(type)}`}
                  >
                    {getErrorTypeLabel(type)}: {count}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Error List */}
          <div className="debug-section">
            <div className="debug-section-header">
              <div className="debug-section-title">Recent Errors</div>
              {errors.length > 0 && (
                <button 
                  className="debug-btn debug-btn-clear"
                  onClick={handleClearErrors}
                >
                  Clear
                </button>
              )}
            </div>
            
            <div className="debug-error-list">
              {errors.length === 0 ? (
                <div className="debug-no-errors">
                  ✓ No errors logged
                </div>
              ) : (
                errors.slice(0, 10).map((error, index) => (
                  <div 
                    key={index} 
                    className={`debug-error-item ${getErrorTypeClass(error.type)}`}
                  >
                    <div className="debug-error-header">
                      <span className="debug-error-type">
                        {getErrorTypeLabel(error.type)}
                      </span>
                      <span className="debug-error-time">
                        {formatTime(error.timestamp)}
                      </span>
                    </div>
                    <div className="debug-error-message">
                      {error.message}
                    </div>
                    {error.context && (
                      <div className="debug-error-context">
                        {JSON.stringify(error.context)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="debug-section debug-instructions">
            <div className="debug-section-title">How to use</div>
            <ul>
              <li>Triple-tap anywhere to toggle</li>
              <li>Tap header to expand/collapse</li>
              <li>Errors are logged to Firebase</li>
              <li>Refresh to see new errors</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugPanel;

