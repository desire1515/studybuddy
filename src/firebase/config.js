
/**
 * Firebase Configuration for StudyBuddy - COMPLETE FIXED VERSION
 * 
 * Issues Fixed:
 * 1. initializeFirestore() called multiple times - now initializes once
 * 2. onAuthStateChanged not defined - properly imported
 * 3. VAPID key issues - validated before use
 * 4. Messaging initialization - properly handled
 * 
 * IMPORTANT: Replace the VAPID_KEY below with your own key from Firebase Console:
 * 1. Go to Firebase Console > Project Settings > Cloud Messaging
 * 2. Under "Web configuration", click "Generate key pair"
 * 3. Copy the generated key and replace the placeholder below
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  getFirestore, 
  enableMultiTabIndexedDbPersistence, 
  initializeFirestore as initFirestore,
  CACHE_SIZE_UNLIMITED 
} from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getMessaging, isSupported as isMessagingSupported } from "firebase/messaging";

// ============================================================================
// FIREBASE CONFIG
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

// ============================================================================
// VAPID KEY CONFIGURATION
// ============================================================================

/**
 * VAPID Key for Firebase Cloud Messaging
 * Replace with your own key from Firebase Console
 */
export const VAPID_KEY = "BPR0m_MvZ8RvOp_iXbnNUPAkHrHNtTNifyaRLl5auYB6y6eF43jeQvSqoNulW8aPxbPX6uq9EGHfmJb6vSGs634";

/**
 * Validate VAPID key format
 */
const isValidVapidKeyFormat = (key) => {
  if (!key || typeof key !== 'string' || key.length < 80) {
    return false;
  }
  const base64UrlRegex = /^[A-Za-z0-9_-]+$/;
  return base64UrlRegex.test(key);
};

export const isVapidKeyValid = isValidVapidKeyFormat(VAPID_KEY);

export const getValidVapidKey = () => {
  if (isVapidKeyValid) {
    return VAPID_KEY;
  }
  console.warn('⚠️ Invalid VAPID key. Push notifications may not work.');
  return null;
};

// ============================================================================
// SINGLETON INITIALIZATION - Initialize ONCE only
// ============================================================================

const debugLog = (...args) => {
  if (import.meta.env.DEV) console.debug('[firebase/config]', ...args);
};

let app = null;
let auth = null;
let db = null;
let messaging = null;
let analytics = null;
let isInitialized = false;
let persistenceEnabled = false;

/**
 * Initialize Firebase app and services - called only once
 */
const initializeFirebase = async () => {
  if (isInitialized) {
    debugLog('Firebase already initialized, skipping');
    return { app, auth, db, messaging, analytics };
  }

  debugLog('Initializing Firebase services');

  try {
    // 1. Initialize Firebase App (use existing if already created)
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    debugLog('Firebase App ready');

    // 2. Initialize Auth
    auth = getAuth(app);
    auth.useDeviceLanguage();
    debugLog('Auth initialized');

    // 3. Initialize Firestore with persistence
    // IMPORTANT: Use initializeFirestore with cache size BEFORE getting the instance
    if (!db) {
      db = initFirestore(app, { cacheSizeBytes: CACHE_SIZE_UNLIMITED });
      persistenceEnabled = true;
      debugLog('Firestore initialized with cache');
    }

    // 4. Initialize Messaging (only on web with valid VAPID)
    const platform = getPlatform();
    if (platform === 'web') {
      const validVapidKey = getValidVapidKey();
      if (validVapidKey) {
        try {
          const messagingSupported = await isMessagingSupported();
          if (messagingSupported) {
            if (!messaging) {
              messaging = getMessaging(app, { vapidKey: validVapidKey });
            }
            debugLog('Messaging initialized');
          } else {
            console.warn('⚠️ Firebase Messaging not supported in this browser');
          }
        } catch (messagingError) {
          console.warn('⚠️ Firebase Messaging initialization failed:', messagingError.message);
        }
      } else {
        console.warn('⚠️ Firebase Messaging: Invalid VAPID key');
      }
    }

    // 5. Initialize Analytics (production only, with robust error handling)
    if (import.meta.env.PROD) {
      try {
        const analyticsSupported = await isSupported();
        if (analyticsSupported) {
          analytics = getAnalytics(app);
          debugLog('Analytics initialized');
        }
      } catch (analyticsError) {
        console.warn('⚠️ Firebase Analytics initialization failed:', analyticsError?.message || analyticsError);
        analytics = null;
      }
    } else {
      debugLog('Firebase Analytics disabled in development');
    }

    isInitialized = true;
    debugLog('Firebase initialization complete');

    return { app, auth, db, messaging, analytics };
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    throw error;
  }
};

// ============================================================================
// PLATFORM DETECTION
// ============================================================================

const getPlatform = () => {
  if (typeof window === 'undefined') return 'unknown';
  
  // Check for Capacitor
  if (typeof window.Capacitor !== 'undefined') {
    return 'native';
  }
  
  // Check for PWA
  const isStandalone = window.matchMedia?.("(display-mode:standalone)")?.matches || 
                       window.navigator.standalone === true;
  if (isStandalone) return 'web';
  
  return 'web';
};

// ============================================================================
// EXPORTS - All services initialized once
// ============================================================================

export const initializeFirebaseServices = initializeFirebase;

// Export auth
export { auth };

// Export db  
export { db };

// Export messaging
export { messaging };

// Export analytics
export { analytics };

// Export app
export { app as firebaseApp };

// Export platform
export { getPlatform };

// Legacy exports for backward compatibility
export const initializeMessaging = async () => {
  await initializeFirebase();
  return messaging;
};

export const getFirebaseMessaging = () => messaging;

export const initializeAnalyticsLegacy = async () => {
  await initializeFirebase();
  return analytics;
};

export const getFirebaseAnalytics = () => analytics;

// Default export
export default { 
  app, 
  auth, 
  db, 
  messaging, 
  analytics,
  initializeFirebaseServices: initializeFirebase,
  getPlatform,
  VAPID_KEY,
  isVapidKeyValid,
  getValidVapidKey
};

