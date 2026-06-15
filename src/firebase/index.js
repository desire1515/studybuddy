/**
 * Firebase Services Index for StudyBuddy
 * 
 * This file exports all Firebase services for easy importing throughout the app.
 * 
 * Usage:
 * import { authService, firestoreService, analytics } from './firebase';
 */

// ============================================================================
// CONFIG
// ============================================================================

export { 
  firebaseApp,
  auth, 
  db, 
  initializeFirebaseServices, 
  getFirebaseAnalytics,
  VAPID_KEY,
  isVapidKeyValid,
  getValidVapidKey
} from './config';

// ============================================================================
// AUTHENTICATION
// ============================================================================

export { 
  default as authService,
  registerWithEmail,
  loginWithEmail,
  logoutUser,
  resetPassword,
  updateUserProfile,
  getUserProfile,
  deleteUserAccount,
  onAuthChange,
  getCurrentUser
} from './auth';

// ============================================================================
// FIRESTORE DATABASE
// ============================================================================

export { 
  default as firestoreService,
  // User Profile
  saveUserProfile,
  getUserProfile as getUserProfileDB,
  
  // Class Timetable
  saveClassTimetable,
  getClassTimetable,
  addClass,
  updateClass,
  deleteClass,
  
  // Study Timetable
  saveStudyTimetable,
  getStudyTimetable,
  addStudySession,
  updateStudySession,
  deleteStudySession,
  
  // Study Sessions
  startStudySession,
  stopStudySession,
  getStudySessions,
  
  // Stats & Achievements
  updateStudyStats,
  updateStreak,
  
  // Tasks
  saveTasks,
  getTasks,
  
  // Reminders
  saveReminders,
  getReminders,
  
  // Settings
  saveSettings,
  getSettings
} from './firestore';

// ============================================================================
// ANALYTICS
// ============================================================================

export { 
  default as analyticsService,
  initAnalytics,
  isAnalyticsAvailable,
  setUser,
  setUserPropertiesForAnalytics,
  trackLogin,
  trackRegister,
  trackLogout,
  trackPasswordReset,
  trackScreenView,
  trackDashboardView,
  trackProfileView,
  trackAnalyticsView,
  trackTimetableView,
  trackAddClass,
  trackUpdateClass,
  trackDeleteClass,
  trackAddStudySession,
  trackDeleteStudySession,
  trackStudySessionStart,
  trackStudySessionEnd,
  trackStudySessionComplete,
  trackProfileUpdate,
  trackNotificationEnable,
  trackNotificationDisable,
  trackReminderSet,
  trackFeedbackSend,
  trackHelpRequest,
  trackError,
  trackEngagement,
  trackCustomEvent,
  EVENTS
} from './analytics';

// ============================================================================
// NOTIFICATIONS (Local Notifications)
// ============================================================================

export { 
  default as notificationsService,
  // Initialization
  initNotifications,
  resetNotificationInitialization,
  requestNotificationPermission,
  checkNotificationPermission,
  registerNotificationChannels,
  
  // Exact Alarm (Android 12+)
  checkExactAlarmPermission,
  
  // Scheduling
  scheduleNotification,
  scheduleReminderNotification,
  loadAndRescheduleReminders,
  scheduleTimetableReminders,
  
  // Test
  scheduleTestNotification,
  scheduleImmediateTestNotification,
  
  // Cancel
  cancelNotification,
  cancelAllNotifications,
  
  // Query
  getPendingNotifications,
  
  // Constants
  NOTIFICATION_CHANNELS as CHANNELS
} from './notifications';

// ============================================================================
// MESSAGING (FCM - Firebase Cloud Messaging)
// ============================================================================

export {
  default as messagingService,
  // Token Management
  requestFCMToken,
  saveFCMToken,
  getStoredFCMToken,
  deleteFCMToken,
  
  // Foreground/Background Messages
  onForegroundMessage,
  onBackgroundMessage,
  showLocalNotification,
  
  // Permission
  getNotificationPermissionStatus,
  requestNotificationPermission as requestWebNotificationPermission,
  
  // Initialization
  initializeFCM,
  resetFCMInitialization
} from './messaging';

// ============================================================================
// EMAIL SUPPORT
// ============================================================================

export { 
  default as emailService,
  SUPPORT_EMAIL,
  FEEDBACK_CATEGORIES,
  PRIORITY,
  generateMailtoLink,
  sendFeedbackViaEmail,
  submitFeedback,
  sendHelpRequest,
  getFeedbackTemplates,
  openFeedbackForm,
  rateApp
} from './email';

