/**
 * Firebase Analytics Service for StudyBuddy
 * 
 * This module provides analytics tracking using Firebase Analytics.
 * It safely handles both web and Capacitor Android environments.
 * 
 * Features:
 * - User activity tracking (logins, app usage)
 * - Timetable usage analytics
 * - Study session tracking
 * - Custom events for user behavior
 * - Screen view tracking
 * 
 * All functions are safe to run on web and Capacitor Android.
 */

import { logEvent, setUserId, setUserProperties } from 'firebase/analytics';
import { initializeFirebaseServices, getFirebaseAnalytics } from './config';

// ============================================================================
// ANALYTICS EVENT NAMES
// Define custom event names for consistent tracking
// ============================================================================

const EVENTS = {
  // Authentication Events
  LOGIN: 'login',
  REGISTER: 'register',
  LOGOUT: 'logout',
  PASSWORD_RESET: 'password_reset',
  
  // App Usage Events
  APP_OPEN: 'app_open',
  SCREEN_VIEW: 'screen_view',
  
  // Timetable Events
  TIMETABLE_VIEW: 'timetable_view',
  TIMETABLE_ADD_CLASS: 'timetable_add_class',
  TIMETABLE_UPDATE_CLASS: 'timetable_update_class',
  TIMETABLE_DELETE_CLASS: 'timetable_delete_class',
  TIMETABLE_ADD_STUDY: 'timetable_add_study',
  TIMETABLE_DELETE_STUDY: 'timetable_delete_study',
  
  // Study Session Events
  STUDY_SESSION_START: 'study_session_start',
  STUDY_SESSION_END: 'study_session_end',
  STUDY_SESSION_COMPLETE: 'study_session_complete',
  
  // Feature Usage
  PROFILE_VIEW: 'profile_view',
  PROFILE_UPDATE: 'profile_update',
  ANALYTICS_VIEW: 'analytics_view',
  DASHBOARD_VIEW: 'dashboard_view',
  
  // Notifications
  NOTIFICATION_ENABLE: 'notification_enable',
  NOTIFICATION_DISABLE: 'notification_disable',
  REMINDER_SET: 'reminder_set',
  
  // Feedback
  FEEDBACK_SEND: 'feedback_send',
  HELP_REQUEST: 'help_request',
  
  // Errors
  ERROR: 'error',
  
  // Engagement
  USER_ENGAGEMENT: 'user_engagement'
};

// ============================================================================
// ANALYTICS INSTANCE
// ============================================================================

let analytics = null;

/**
 * Initialize and get the analytics instance
 * Must be called before tracking events
 * 
 * @returns {Promise<Analytics|null>} Analytics instance
 */
export const initAnalytics = async () => {
  if (!analytics) {
    const services = await initializeFirebaseServices();
    analytics = services.analytics || null;
  }
  return analytics;
};

/**
 * Check if analytics is available
 * 
 * @returns {boolean} True if analytics is available
 */
export const isAnalyticsAvailable = () => {
  return analytics !== null;
};

// ============================================================================
// USER TRACKING
// ============================================================================

/**
 * Set the current user's ID for analytics
 * This helps track user behavior across sessions
 * 
 * @param {string} userId - User's unique ID
 */
export const setUser = (userId) => {
  if (analytics) {
    setUserId(analytics, userId);
    console.log('✅ Analytics: User ID set:', userId);
  }
};

/**
 * Set user properties for better segmentation
 * 
 * @param {object} properties - User properties (e.g., { plan: 'free', year: '1st' })
 */
export const setUserPropertiesForAnalytics = (properties) => {
  if (analytics) {
    setUserProperties(analytics, properties);
    console.log('✅ Analytics: User properties set');
  }
};

// ============================================================================
// AUTHENTICATION EVENTS
// ============================================================================

/**
 * Track successful login
 * 
 * @param {string} userId - User's unique ID
 * @param {string} method - Login method (email, google, etc.)
 */
export const trackLogin = (userId, method = 'email') => {
  if (analytics) {
    logEvent(analytics, EVENTS.LOGIN, {
      method,
      user_id: userId,
      timestamp: new Date().toISOString()
    });
    console.log('📊 Analytics: Login tracked');
  }
};

/**
 * Track successful registration
 * 
 * @param {string} userId - User's unique ID
 * @param {string} method - Registration method
 */
export const trackRegister = (userId, method = 'email') => {
  if (analytics) {
    logEvent(analytics, EVENTS.REGISTER, {
      method,
      user_id: userId,
      timestamp: new Date().toISOString()
    });
    console.log('📊 Analytics: Registration tracked');
  }
};

/**
 * Track logout
 * 
 * @param {string} userId - User's unique ID
 */
export const trackLogout = (userId) => {
  if (analytics) {
    logEvent(analytics, EVENTS.LOGOUT, {
      user_id: userId,
      timestamp: new Date().toISOString()
    });
    console.log('📊 Analytics: Logout tracked');
  }
};

/**
 * Track password reset request
 * 
 * @param {string} email - User's email
 */
export const trackPasswordReset = (email) => {
  if (analytics) {
    logEvent(analytics, EVENTS.PASSWORD_RESET, {
      email: email.replace(/./g, '*'), // Partially hide email
      timestamp: new Date().toISOString()
    });
    console.log('📊 Analytics: Password reset tracked');
  }
};

// ============================================================================
// SCREEN VIEW TRACKING
// ============================================================================

/**
 * Track screen views
 * This is important for understanding which screens users spend most time on
 * 
 * @param {string} screenName - Name of the screen
 * @param {string} screenClass - Class of the screen component
 */
export const trackScreenView = (screenName, screenClass) => {
  if (analytics) {
    logEvent(analytics, EVENTS.SCREEN_VIEW, {
      screen_name: screenName,
      screen_class: screenClass,
      timestamp: new Date().toISOString()
    });
    console.log('📊 Analytics: Screen view tracked:', screenName);
  }
};

/**
 * Track dashboard view
 * 
 * @param {object} stats - Current stats to include
 */
export const trackDashboardView = (stats = {}) => {
  if (analytics) {
    logEvent(analytics, EVENTS.DASHBOARD_VIEW, {
      ...stats,
      timestamp: new Date().toISOString()
    });
    console.log('📊 Analytics: Dashboard view tracked');
  }
};

/**
 * Track profile view
 * 
 * @param {string} userId - User's unique ID
 */
export const trackProfileView = (userId) => {
  if (analytics) {
    logEvent(analytics, EVENTS.PROFILE_VIEW, {
      user_id: userId,
      timestamp: new Date().toISOString()
    });
    console.log('📊 Analytics: Profile view tracked');
  }
};

/**
 * Track analytics page view
 */
export const trackAnalyticsView = () => {
  if (analytics) {
    logEvent(analytics, EVENTS.ANALYTICS_VIEW, {
      timestamp: new Date().toISOString()
    });
    console.log('📊 Analytics: Analytics view tracked');
  }
};

// ============================================================================
// TIMETABLE EVENTS
// ============================================================================

/**
 * Track timetable view
 * 
 * @param {string} type - Type of timetable ('class' or 'study')
 */
export const trackTimetableView = (type = 'class') => {
  if (analytics) {
    logEvent(analytics, EVENTS.TIMETABLE_VIEW, {
      type,
      timestamp: new Date().toISOString()
    });
    console.log('📊 Analytics: Timetable view tracked:', type);
  }
};

/**
 * Track adding a class
 * 
 * @param {string} day - Day of the week
 * @param {string} subject - Subject name
 */
export const trackAddClass = (day, subject) => {
  if (analytics) {
    logEvent(analytics, EVENTS.TIMETABLE_ADD_CLASS, {
      day,
      subject,
      timestamp: new Date().toISOString()
    });
    console.log('📊 Analytics: Add class tracked');
  }
};

/**
 * Track updating a class
 * 
 * @param {string} day - Day of the week
 * @param {string} subject - Subject name
 */
export const trackUpdateClass = (day, subject) => {
  if (analytics) {
    logEvent(analytics, EVENTS.TIMETABLE_UPDATE_CLASS, {
      day,
      subject,
      timestamp: new Date().toISOString()
    });
    console.log('📊 Analytics: Update class tracked');
  }
};

/**
 * Track deleting a class
 * 
 * @param {string} day - Day of the week
 * @param {string} subject - Subject name
 */
export const trackDeleteClass = (day, subject) => {
  if (analytics) {
    logEvent(analytics, EVENTS.TIMETABLE_DELETE_CLASS, {
      day,
      subject,
      timestamp: new Date().toISOString()
    });
    console.log('📊 Analytics: Delete class tracked');
  }
};

/**
 * Track adding a study session
 * 
 * @param {string} day - Day of the week
 * @param {string} subject - Subject name
 */
export const trackAddStudySession = (day, subject) => {
  if (analytics) {
    logEvent(analytics, EVENTS.TIMETABLE_ADD_STUDY, {
      day,
      subject,
      timestamp: new Date().toISOString()
    });
    console.log('📊 Analytics: Add study session tracked');
  }
};

/**
 * Track deleting a study session
 * 
 * @param {string} day - Day of the week
 * @param {string} subject - Subject name
 */
export const trackDeleteStudySession = (day, subject) => {
  if (analytics) {
    logEvent(analytics, EVENTS.TIMETABLE_DELETE_STUDY, {
      day,
      subject,
      timestamp: new Date().toISOString()
    });
    console.log('📊 Analytics: Delete study session tracked');
  }
};

// ============================================================================
// STUDY SESSION EVENTS
// ============================================================================

/**
 * Track study session start
 * 
 * @param {string} sessionId - Session ID
 * @param {string} subject - Subject being studied
 */
export const trackStudySessionStart = (sessionId, subject = '') => {
  if (analytics) {
    logEvent(analytics, EVENTS.STUDY_SESSION_START, {
      session_id: sessionId,
      subject,
      timestamp: new Date().toISOString()
    });
    console.log('📊 Analytics: Study session started');
  }
};

/**
 * Track study session end
 * 
 * @param {string} sessionId - Session ID
 * @param {number} durationMinutes - Duration in minutes
 * @param {string} subject - Subject being studied
 */
export const trackStudySessionEnd = (sessionId, durationMinutes, subject = '') => {
  if (analytics) {
    logEvent(analytics, EVENTS.STUDY_SESSION_END, {
      session_id: sessionId,
      duration_minutes: durationMinutes,
      subject,
      timestamp: new Date().toISOString()
    });
    console.log('📊 Analytics: Study session ended');
  }
};

/**
 * Track study session complete (with meaningful duration)
 * 
 * @param {string} sessionId - Session ID
 * @param {number} durationMinutes - Duration in minutes
 * @param {string} subject - Subject being studied
 */
export const trackStudySessionComplete = (sessionId, durationMinutes, subject = '') => {
  if (analytics) {
    logEvent(analytics, EVENTS.STUDY_SESSION_COMPLETE, {
      session_id: sessionId,
      duration_minutes: durationMinutes,
      subject,
      timestamp: new Date().toISOString()
    });
    console.log('📊 Analytics: Study session completed');
  }
};

// ============================================================================
// PROFILE EVENTS
// ============================================================================

/**
 * Track profile update
 * 
 * @param {string} userId - User's unique ID
 * @param {array} fieldsUpdated - Array of updated field names
 */
export const trackProfileUpdate = (userId, fieldsUpdated = []) => {
  if (analytics) {
    logEvent(analytics, EVENTS.PROFILE_UPDATE, {
      user_id: userId,
      fields_updated: fieldsUpdated,
      timestamp: new Date().toISOString()
    });
    console.log('📊 Analytics: Profile update tracked');
  }
};

// ============================================================================
// NOTIFICATION EVENTS
// ============================================================================

/**
 * Track notification enable
 * 
 * @param {string} type - Type of notification
 */
export const trackNotificationEnable = (type = 'all') => {
  if (analytics) {
    logEvent(analytics, EVENTS.NOTIFICATION_ENABLE, {
      type,
      timestamp: new Date().toISOString()
    });
    console.log('📊 Analytics: Notification enabled');
  }
};

/**
 * Track notification disable
 * 
 * @param {string} type - Type of notification
 */
export const trackNotificationDisable = (type = 'all') => {
  if (analytics) {
    logEvent(analytics, EVENTS.NOTIFICATION_DISABLE, {
      type,
      timestamp: new Date().toISOString()
    });
    console.log('📊 Analytics: Notification disabled');
  }
};

/**
 * Track reminder set
 * 
 * @param {string} type - Type of reminder
 * @param {string} day - Day of the week
 */
export const trackReminderSet = (type, day) => {
  if (analytics) {
    logEvent(analytics, EVENTS.REMINDER_SET, {
      type,
      day,
      timestamp: new Date().toISOString()
    });
    console.log('📊 Analytics: Reminder set');
  }
};

// ============================================================================
// FEEDBACK EVENTS
// ============================================================================

/**
 * Track feedback submission
 * 
 * @param {string} type - Type of feedback
 * @param {string} category - Feedback category
 */
export const trackFeedbackSend = (type = 'general', category = 'feedback') => {
  if (analytics) {
    logEvent(analytics, EVENTS.FEEDBACK_SEND, {
      type,
      category,
      timestamp: new Date().toISOString()
    });
    console.log('📊 Analytics: Feedback sent');
  }
};

/**
 * Track help request
 * 
 * @param {string} issueType - Type of issue
 */
export const trackHelpRequest = (issueType = 'general') => {
  if (analytics) {
    logEvent(analytics, EVENTS.HELP_REQUEST, {
      issue_type: issueType,
      timestamp: new Date().toISOString()
    });
    console.log('📊 Analytics: Help request tracked');
  }
};

// ============================================================================
// ERROR TRACKING
// ============================================================================

/**
 * Track errors
 * 
 * @param {string} errorType - Type of error
 * @param {string} message - Error message
 * @param {object} context - Additional context
 */
export const trackError = (errorType, message, context = {}) => {
  if (analytics) {
    logEvent(analytics, EVENTS.ERROR, {
      error_type: errorType,
      message,
      ...context,
      timestamp: new Date().toISOString()
    });
    console.log('📊 Analytics: Error tracked');
  }
};

// ============================================================================
// CUSTOM PARAMETERS
// Helper functions for setting custom parameters
// ============================================================================

/**
 * Track user engagement
 * 
 * @param {string} engagementType - Type of engagement
 * @param {number} value - Engagement value
 */
export const trackEngagement = (engagementType, value = 1) => {
  if (analytics) {
    logEvent(analytics, EVENTS.USER_ENGAGEMENT, {
      engagement_type: engagementType,
      value,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Track custom event with parameters
 * 
 * @param {string} eventName - Name of the event
 * @param {object} params - Event parameters
 */
export const trackCustomEvent = (eventName, params = {}) => {
  if (analytics) {
    logEvent(analytics, eventName, {
      ...params,
      timestamp: new Date().toISOString()
    });
    console.log('📊 Analytics: Custom event tracked:', eventName);
  }
};

export default {
  // Initialization
  initAnalytics,
  isAnalyticsAvailable,
  
  // User Tracking
  setUser,
  setUserProperties,
  
  // Auth Events
  trackLogin,
  trackRegister,
  trackLogout,
  trackPasswordReset,
  
  // Screen Views
  trackScreenView,
  trackDashboardView,
  trackProfileView,
  trackAnalyticsView,
  
  // Timetable Events
  trackTimetableView,
  trackAddClass,
  trackUpdateClass,
  trackDeleteClass,
  trackAddStudySession,
  trackDeleteStudySession,
  
  // Study Session Events
  trackStudySessionStart,
  trackStudySessionEnd,
  trackStudySessionComplete,
  
  // Profile Events
  trackProfileUpdate,
  
  // Notification Events
  trackNotificationEnable,
  trackNotificationDisable,
  trackReminderSet,
  
  // Feedback Events
  trackFeedbackSend,
  trackHelpRequest,
  
  // Error Tracking
  trackError,
  
  // Custom
  trackEngagement,
  trackCustomEvent,
  
  // Event Constants
  EVENTS
};

