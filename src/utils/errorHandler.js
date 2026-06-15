/**
 * Global Error Handler for StudyBuddy
 * 
 * Captures and tracks JavaScript errors, unhandled promise rejections,
 * and allows manual error tracking. Stores errors locally and optionally
 * logs to Firebase Analytics.
 * 
 * Features:
 * - Global error capture (window.onerror)
 * - Unhandled promise rejection capture
 * - Local error storage for debugging
 * - Firebase Analytics integration
 * - Error retrieval API for debug panel
 * - Shake detection to show debug panel
 */

import { trackError } from '../firebase/analytics';

// ============================================================================
// CONFIGURATION
// ============================================================================

const MAX_LOCAL_ERRORS = 50; // Maximum errors to store locally
const ERROR_STORAGE_KEY = 'studybuddy_errors';
const ERROR_LISTENER_KEY = 'studybuddy_error_listener_initialized';

// ============================================================================
// STATE
// ============================================================================

let localErrors = [];
let isInitialized = false;
let errorListener = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the global error handler
 * Call this once at app startup (e.g., in main.jsx before render)
 * 
 * @param {Function} onError - Optional callback when error occurs
 */
export const initErrorHandler = (onError = null) => {
  if (isInitialized) {
    console.log('⚠️ Error handler already initialized');
    return;
  }

  console.log('🔧 Initializing global error handler...');

  // Load existing errors from localStorage
  loadErrorsFromStorage();

  // Set up global error handler
  window.onerror = handleGlobalError;

  // Set up unhandled promise rejection handler
  window.onunhandledrejection = handleUnhandledRejection;

  // Store callback if provided
  if (onError) {
    errorListener = onError;
  }

  isInitialized = true;
  console.log('✅ Global error handler initialized');
};

/**
 * Clean up error handlers (for testing or hot reload)
 */
export const cleanupErrorHandler = () => {
  window.onerror = null;
  window.onunhandledrejection = null;
  localErrors = [];
  isInitialized = false;
  errorListener = null;
  clearStoredErrors();
  console.log('🔧 Error handler cleaned up');
};

// ============================================================================
// ERROR HANDLERS
// ============================================================================

/**
 * Handle global JavaScript errors
 * 
 * @param {string} message - Error message
 * @param {string} source - URL of the script where error occurred
 * @param {number} lineno - Line number in script
 * @param {number} colno - Column number in script
 * @param {Error} error - Error object if available
 * @returns {boolean} True to prevent default error handling
 */
const handleGlobalError = (message, source, lineno, colno, error) => {
  const errorData = {
    type: 'javascript_error',
    message: String(message),
    source: source || 'unknown',
    line: lineno || 0,
    column: colno || 0,
    stack: error?.stack || '',
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    platform: getPlatformInfo()
  };

  // Log to console
  console.error('🔴 Global Error:', errorData);

  // Track to Firebase Analytics
  trackErrorToAnalytics('javascript_error', message, errorData);

  // Store locally
  addError(errorData);

  // Call listener if set
  if (errorListener) {
    errorListener(errorData);
  }

  // Return false to let default error handling happen (for development)
  return false;
};

/**
 * Handle unhandled promise rejections
 * 
 * @param {PromiseRejectionEvent} event - The rejection event
 */
const handleUnhandledRejection = (event) => {
  const error = event.reason;
  
  let message = 'Unhandled Promise Rejection';
  let stack = '';

  if (error instanceof Error) {
    message = error.message || message;
    stack = error.stack || '';
  } else if (typeof error === 'string') {
    message = error;
  } else if (error && typeof error === 'object') {
    message = error.message || JSON.stringify(error);
    stack = error.stack || '';
  }

  const errorData = {
    type: 'unhandled_promise_rejection',
    message: String(message),
    stack: stack,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    platform: getPlatformInfo(),
    reason: error
  };

  // Log to console
  console.error('🔴 Unhandled Promise Rejection:', errorData);

  // Track to Firebase Analytics
  trackErrorToAnalytics('unhandled_promise_rejection', message, errorData);

  // Store locally
  addError(errorData);

  // Call listener if set
  if (errorListener) {
    errorListener(errorData);
  }

  // Prevent default (which logs to console)
  event.preventDefault();
};

// ============================================================================
// MANUAL ERROR TRACKING
// ============================================================================

/**
 * Track a custom error manually
 * Use this to wrap try-catch blocks for better error tracking
 * 
 * @param {string} errorType - Type/category of error
 * @param {string} message - Error message
 * @param {object} context - Additional context (function name, user data, etc.)
 */
export const trackCustomError = (errorType, message, context = {}) => {
  const errorData = {
    type: `custom_error_${errorType}`,
    message: String(message),
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    platform: getPlatformInfo(),
    context: context
  };

  console.error('🔴 Custom Error:', errorData);

  // Track to Firebase Analytics
  trackErrorToAnalytics(errorType, message, errorData);

  // Store locally
  addError(errorData);

  // Call listener if set
  if (errorListener) {
    errorListener(errorData);
  }

  return errorData;
};

/**
 * Wrap an async function with automatic error tracking
 * 
 * @param {Function} fn - The async function to wrap
 * @param {string} errorType - Type of error for tracking
 * @param {object} defaultContext - Default context to include
 * @returns {Function} Wrapped function
 */
export const withErrorTracking = (fn, errorType = 'async_error', defaultContext = {}) => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      const context = {
        ...defaultContext,
        functionName: fn.name,
        arguments: args
      };
      trackCustomError(errorType, error.message || String(error), context);
      throw error;
    }
  };
};

// ============================================================================
// FIREBASE ANALYTICS
// ============================================================================

/**
 * Track error to Firebase Analytics
 * 
 * @param {string} errorType - Type of error
 * @param {string} message - Error message
 * @param {object} data - Full error data
 */
const trackErrorToAnalytics = (errorType, message, data) => {
  try {
    trackError(errorType, message, {
      source: data.source,
      line: data.line,
      url: data.url,
      platform: data.platform?.os,
      browser: data.platform?.browser
    });
  } catch (analyticsError) {
    console.warn('⚠️ Failed to track error to Firebase Analytics:', analyticsError);
  }
};

// ============================================================================
// LOCAL STORAGE
// ============================================================================

/**
 * Add an error to the local storage
 * 
 * @param {object} errorData - Error data to store
 */
const addError = (errorData) => {
  localErrors.unshift(errorData); // Add to beginning

  // Trim to max size
  if (localErrors.length > MAX_LOCAL_ERRORS) {
    localErrors = localErrors.slice(0, MAX_LOCAL_ERRORS);
  }

  // Save to localStorage
  saveErrorsToStorage();
};

/**
 * Save errors to localStorage
 */
const saveErrorsToStorage = () => {
  try {
    localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(localErrors));
  } catch (error) {
    console.warn('⚠️ Failed to save errors to localStorage:', error);
  }
};

/**
 * Load errors from localStorage
 */
const loadErrorsFromStorage = () => {
  try {
    const stored = localStorage.getItem(ERROR_STORAGE_KEY);
    if (stored) {
      localErrors = JSON.parse(stored);
      console.log(`📱 Loaded ${localErrors.length} errors from storage`);
    }
  } catch (error) {
    console.warn('⚠️ Failed to load errors from localStorage:', error);
    localErrors = [];
  }
};

/**
 * Clear stored errors
 */
export const clearStoredErrors = () => {
  try {
    localStorage.removeItem(ERROR_STORAGE_KEY);
    localErrors = [];
    console.log('🗑️ Cleared stored errors');
  } catch (error) {
    console.warn('⚠️ Failed to clear stored errors:', error);
  }
};

// ============================================================================
// ERROR RETRIEVAL API
// ============================================================================

/**
 * Get all stored errors
 * 
 * @returns {Array} Array of error objects
 */
export const getStoredErrors = () => {
  return [...localErrors];
};

/**
 * Get recent errors (last n errors)
 * 
 * @param {number} count - Number of errors to retrieve
 * @returns {Array} Array of recent errors
 */
export const getRecentErrors = (count = 10) => {
  return localErrors.slice(0, count);
};

/**
 * Get errors by type
 * 
 * @param {string} type - Error type to filter by
 * @returns {Array} Array of matching errors
 */
export const getErrorsByType = (type) => {
  return localErrors.filter(error => error.type === type);
};

/**
 * Get error count by type
 * 
 * @returns {object} Object with error counts by type
 */
export const getErrorCounts = () => {
  const counts = {};
  localErrors.forEach(error => {
    counts[error.type] = (counts[error.type] || 0) + 1;
  });
  return counts;
};

// ============================================================================
// PLATFORM INFO
// ============================================================================

/**
 * Get platform information
 * 
 * @returns {object} Platform details
 */
const getPlatformInfo = () => {
  const isCapacitor = typeof window.Capacitor !== 'undefined';
  const isPWA = window.matchMedia?.('(display-mode:standalone)')?.matches || 
               window.navigator.standalone === true;

  return {
    os: isCapacitor ? 'Android (Capacitor)' : (navigator.platform || 'unknown'),
    browser: navigator.userAgent,
    isCapacitor,
    isPWA,
    isWeb: !isCapacitor
  };
};

// ============================================================================
// DEBUG PANEL HELPERS
// ============================================================================

/**
 * Set callback for error events (used by DebugPanel)
 * 
 * @param {Function} listener - Callback function
 */
export const setErrorListener = (listener) => {
  errorListener = listener;
};

/**
 * Check if error handler is initialized
 * 
 * @returns {boolean} True if initialized
 */
export const isErrorHandlerInitialized = () => {
  return isInitialized;
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  initErrorHandler,
  cleanupErrorHandler,
  trackCustomError,
  withErrorTracking,
  getStoredErrors,
  getRecentErrors,
  getErrorsByType,
  getErrorCounts,
  clearStoredErrors,
  setErrorListener,
  isErrorHandlerInitialized
};

