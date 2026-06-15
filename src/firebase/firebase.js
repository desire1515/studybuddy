/**
 * Firebase Service for StudyBuddy - COMPLETE FIXED VERSION
 * 
 * Features:
 * 1. Firestore multi-tab persistence support
 * 2. Firebase Cloud Messaging for foreground/background notifications
 * 3. Single initialization pattern
 * 4. PWA / installed web app compatible
 * 5. Error handling for multiple tabs, permissions, and offline mode
 * 
 * Usage:
 * import { initializeFirebase, getFirebaseServices } from './firebase/firebase';
 * 
 * // In your app initialization:
 * await initializeFirebase();
 * const { auth, db, messaging, analytics } = getFirebaseServices();
 */

import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  enableMultiTabIndexedDbPersistence,
  initializeFirestore,
  CACHE_SIZE_UNLIMITED 
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
import { 
  getMessaging, 
  isSupported as isMessagingSupported,
  onMessage,
  getToken
} from "firebase/messaging";

// ============================================================================
// CONFIGURATION
// ============================================================================

const firebaseConfig = {
  apiKey: "AIzaSyAOEBogFN6Vki79MOboG_7OO0ClYvZqlZI",
  authDomain: "studybuddy-8c892.firebaseapp.com",
  projectId: "studybuddy-8c892",
  storageBucket: "studybuddy-8c892.firebasestorage.app",
  messagingSenderId: "357508453207",
  appId: "1:357508453207:web:587b70e2add7d57df52412",
  measurementId: "G-98QF8T9P3Z"
};

// VAPID Key for FCM - Replace with your own from Firebase Console
const VAPID_KEY = "BPR0m_MvZ8RvOp_iXbnNUPAkHrHNtTNifyaRLl5auYB6y6eF43jeQvSqoNulW8aPxbPX6uq9EGHfmJb6vSGs634";

// ============================================================================
// STATE MANAGEMENT - Single Instance Pattern
// ============================================================================

let app = null;
let authInstance = null;
let dbInstance = null;
let messagingInstance = null;
let analyticsInstance = null;
let isInitialized = false;
let initPromise = null;

// ============================================================================
// PLATFORM DETECTION
// ============================================================================

/**
 * Detect platform: 'web', 'web-standalone' (PWA), 'native' (Capacitor/Cordova)
 */
export const getPlatform = () => {
  if (typeof window === 'undefined') return 'server';
  
  // Check for Capacitor (native mobile app)
  if (typeof window.Capacitor !== 'undefined') {
    return 'native';
  }
  
  // Check for Cordova
  if (typeof window.cordova !== 'undefined') {
    return 'native';
  }
  
  // Check for PWA (installed web app)
  const isStandalone = 
    window.matchMedia?.("(display-mode:standalone)")?.matches || 
    window.navigator.standalone === true ||
    window.navigator.webdriver === true;
  
  if (isStandalone) return 'web-standalone';
  
  return 'web';
};

/**
 * Check if running on native platform
 */
export const isNativePlatform = () => {
  const platform = getPlatform();
  return platform === 'native';
};

/**
 * Check if running as PWA
 */
export const isPWA = () => {
  const platform = getPlatform();
  return platform === 'web-standalone' || platform === 'web';
};

// ============================================================================
// VAPID KEY HELPERS
// ============================================================================

const isValidVapidKey = (key) => {
  if (!key || typeof key !== 'string' || key.length < 50) return false;
  return /^[A-Za-z0-9_-]+$/.test(key);
};

export const getVapidKey = () => isValidVapidKey(VAPID_KEY) ? VAPID_KEY : null;

export const isFCMConfigured = () => isValidVapidKey(VAPID_KEY);

// ============================================================================
// FIRESTORE - Multi-Tab Persistence
// ============================================================================

/**
 * Initialize Firestore with multi-tab persistence support
 */
const initializeFirestorePersistence = async (firestoreApp) => {
  try {
    // Use multi-tab IndexedDB persistence for offline support across tabs
    const unsubscribe = await enableMultiTabIndexedDbPersistence(firestoreApp);
    console.log('✅ Firestore: Multi-tab IndexedDB persistence enabled');
    return { success: true, type: 'multi-tab' };
  } catch (error) {
    // Handle specific error cases
    if (error.code === 'failed-precondition') {
      // Multiple tabs open - this is OK, persistence works across tabs
      console.warn('⚠️ Firestore: Multiple tabs detected, using shared persistence');
      return { success: true, type: 'shared', reason: 'multiple_tabs' };
    } 
    else if (error.code === 'unimplemented') {
      // Browser doesn't support persistence
      console.warn('⚠️ Firestore: Persistence not supported in this browser');
      return { success: false, type: 'none', reason: 'unimplemented' };
    }
    else {
      // Other error - try without persistence
      console.warn('⚠️ Firestore: Persistence error:', error.message);
      return { success: false, type: 'memory', reason: error.code };
    }
  }
};

// ============================================================================
// FIREBASE INITIALIZATION - Single Entry Point
// ============================================================================

/**
 * Initialize all Firebase services - call only once
 * @returns {Promise<Object>} Firebase services { app, auth, db, messaging, analytics }
 */
export const initializeFirebase = async () => {
  // If already initialized, return cached instances
  if (isInitialized && app) {
    console.log('🔥 Firebase already initialized');
    return getFirebaseServices();
  }
  
  // If initialization in progress, wait for it
  if (initPromise) {
    console.log('⏳ Firebase initialization in progress, waiting...');
    return initPromise;
  }
  
  // Start initialization
  console.log('🔥 Initializing Firebase services...');
  
  initPromise = (async () => {
    try {
      // 1. Initialize Firebase App
      app = initializeApp(firebaseConfig);
      console.log('✅ Firebase App initialized');
      
      // 2. Initialize Firestore with multi-tab persistence
      const platform = getPlatform();
      if (platform === 'web' || platform === 'web-standalone') {
        // For web, use initializeFirestore with settings first
        dbInstance = initializeFirestore(app, {
          cacheSizeBytes: CACHE_SIZE_UNLIMITED
        });
        
        // Enable multi-tab persistence
        await initializeFirestorePersistence(dbInstance);
      } else {
        // For native, just get the instance
        dbInstance = getFirestore(app);
      }
      console.log('✅ Firestore initialized');
      
      // 3. Initialize Auth
      authInstance = getAuth(app);
      authInstance.useDeviceLanguage();
      console.log('✅ Firebase Auth initialized');
      
      // 4. Initialize Messaging (only on web with valid VAPID)
      if ((platform === 'web' || platform === 'web-standalone') && isValidVapidKey(VAPID_KEY)) {
        try {
          const messagingSupported = await isMessagingSupported();
          if (messagingSupported) {
            messagingInstance = getMessaging(app, {
              vapidKey: VAPID_KEY
            });
            console.log('✅ Firebase Messaging initialized');
          } else {
            console.warn('⚠️ Firebase Messaging not supported');
          }
        } catch (error) {
          console.warn('⚠️ Firebase Messaging init error:', error.message);
        }
      } else if (platform === 'native') {
        console.log('ℹ️ Firebase Messaging: Using native notifications');
      }
      
      // 5. Initialize Analytics
      try {
        const analyticsSupported = await isAnalyticsSupported();
        if (analyticsSupported && platform !== 'native') {
          analyticsInstance = getAnalytics(app);
          console.log('✅ Firebase Analytics initialized');
        }
      } catch (error) {
        console.warn('⚠️ Firebase Analytics init error:', error.message);
      }
      
      isInitialized = true;
      console.log('🔥 Firebase initialization complete');
      
      return getFirebaseServices();
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
      throw error;
    }
  })();
  
  return initPromise;
};

/**
 * Get all Firebase service instances
 * @returns {Object} { app, auth, db, messaging, analytics, platform }
 */
export const getFirebaseServices = () => ({
  app,
  auth: authInstance,
  db: dbInstance,
  messaging: messagingInstance,
  analytics: analyticsInstance,
  platform: getPlatform(),
  isInitialized
});

// ============================================================================
// AUTH HELPERS
// ============================================================================

/**
 * Subscribe to auth state changes
 * @param {Function} callback - Called with user object or null
 * @returns {Function} Unsubscribe function
 */
export const subscribeToAuthState = (callback) => {
  if (!authInstance) {
    console.warn('⚠️ Auth not initialized yet');
    return () => {};
  }
  
  return onAuthStateChanged(authInstance, (user) => {
    console.log('🔐 Auth state changed:', user ? `User: ${user.uid}` : 'Signed out');
    callback(user);
  });
};

/**
 * Get current user (may be null)
 */
export const getCurrentUser = () => authInstance?.currentUser || null;

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => !!authInstance?.currentUser;

// ============================================================================
// FIRESTORE HELPERS
// ============================================================================

/**
 * Check if Firestore is available (online or offline mode)
 */
export const isFirestoreReady = () => {
  if (!dbInstance) return false;
  return true; // Firestore works in offline mode too
};

/**
 * Get Firestore instance
 */
export const getFirestoreInstance = () => dbInstance;

// ============================================================================
// MESSAGING HELPERS - Foreground Notifications
// ============================================================================

/**
 * Set up foreground message listener
 * @param {Function} callback - Called when message received in foreground
 * @returns {Promise<Function>} Cleanup function
 */
export const onForegroundMessage = async (callback) => {
  if (!messagingInstance) {
    console.warn('⚠️ Messaging not initialized');
    return () => {};
  }
  
  try {
    const unsubscribe = onMessage(messagingInstance, (payload) => {
      console.log('📬 Foreground message received:', payload);
      
      // Extract notification data
      const title = payload.notification?.title || payload.data?.title || 'StudyBuddy';
      const body = payload.notification?.body || payload.data?.body || '';
      
      // Show local notification as fallback
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/pwa-192x192.svg',
          badge: '/pwa-192x192.svg',
          tag: payload.messageId || 'studybuddy',
          data: payload.data
        });
      }
      
      // Call the callback
      if (callback) callback(payload);
    });
    
    console.log('✅ Foreground message listener set up');
    return unsubscribe;
  } catch (error) {
    console.error('❌ Error setting up foreground messages:', error);
    return () => {};
  }
};

/**
 * Get FCM token for push notifications
 * @param {string} userId - User ID for tracking
 * @returns {Promise<string|null>} FCM token
 */
export const getFCMToken = async (userId = 'anonymous') => {
  if (!messagingInstance) {
    console.warn('⚠️ Messaging not initialized');
    return null;
  }
  
  try {
    // Check permission first
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return null;
    }
    
    const token = await getToken(messagingInstance, {
      vapidKey: VAPID_KEY
    });
    
    console.log('✅ FCM Token obtained:', token.substring(0, 20) + '...');
    return token;
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    return null;
  }
};

// ============================================================================
// NOTIFICATION PERMISSION HELPERS
// ============================================================================

/**
 * Request notification permission (must be called from user interaction)
 * @returns {Promise<string>} 'granted', 'denied', or 'default'
 */
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.warn('⚠️ Notifications not supported');
    return 'denied';
  }
  
  // Already granted
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  
  // Already denied - can't ask again
  if (Notification.permission === 'denied') {
    return 'denied';
  }
  
  // Request permission
  try {
    const permission = await Notification.requestPermission();
    console.log('📱 Notification permission:', permission);
    return permission;
  } catch (error) {
    console.error('❌ Error requesting permission:', error);
    return 'denied';
  }
};

/**
 * Get current notification permission status
 */
export const getNotificationPermissionStatus = () => {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
};

/**
 * Check if notifications are allowed
 */
export const hasNotificationPermission = () => {
  if (!('Notification' in window)) return false;
  return Notification.permission === 'granted';
};

// ============================================================================
// NETWORK STATUS HELPERS
// ============================================================================

/**
 * Monitor network status
 * @param {Function} callback - Called with online status
 * @returns {Function} Cleanup function
 */
export const monitorNetworkStatus = (callback) => {
  const handleOnline = () => {
    console.log('🌐 Network: Online');
    callback(true);
  };
  
  const handleOffline = () => {
    console.warn('🌐 Network: Offline');
    callback(false);
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Initial status
  callback(navigator.onLine);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};
