/**
 * Firebase Cloud Messaging (FCM) Service for StudyBuddy - FINAL FIXED VERSION
 * 
 * Handles FCM tokens, foreground/background messages with proper integration
 * to the notification system.
 * 
 * Key fixes:
 * - Proper platform detection for web/PWA
 * - onMessage handler for foreground messages
 * - Proper initialization with caching
 */

import { VAPID_KEY, isVapidKeyValid, getValidVapidKey, getPlatform } from "./config";

const isNativePermissionGranted = (permissionResult) =>
  permissionResult?.display === "granted" ||
  permissionResult?.permissions?.create === "granted" ||
  permissionResult?.permissions?.receive === "granted";

// ============================================================================
// FCM TOKEN MANAGEMENT
// ============================================================================

/**
 * Request FCM token for push notifications
 * @param {string} userId - User ID for storing token
 * @returns {Promise<string|null>} FCM token or null
 */
export const requestFCMToken = async (userId) => {
  const platform = getPlatform();
  
  // Only works on web
  if (platform !== 'web') {
    console.log('ℹ️ FCM not available on native platforms');
    return null;
  }
  
  // Check VAPID key
  if (!VAPID_KEY) {
    console.log('ℹ️ FCM VAPID key not configured - using browser notifications instead');
    return null;
  }
  
  if (!isVapidKeyValid) {
    console.error('❌ Invalid VAPID key format - please check Firebase Console');
    return null;
  }

  try {
    const { getToken, isSupported } = await import("firebase/messaging");
    
    // Check if messaging is supported
    if (!await isSupported()) {
      console.warn('⚠️ Messaging not supported in this browser');
      return null;
    }
    
    // Check notification permission first
    if (Notification.permission !== "granted") {
      console.warn('⚠️ Notification permission not granted:', Notification.permission);
      return null;
    }
    
    // Get messaging instance
    const { initializeMessaging, getFirebaseMessaging } = await import("./config");
    
    // Initialize messaging
    const messaging = await initializeMessaging();
    if (!messaging) {
      console.warn('⚠️ Messaging not initialized');
      return null;
    }
    
    // Get the valid VAPID key
    const vapidKey = getValidVapidKey();
    if (!vapidKey) {
      console.error('❌ Invalid VAPID key');
      return null;
    }
    
    // Get token with VAPID key
    const token = await getToken(messaging, { vapidKey });
    
    if (token) {
      console.log('✅ FCM Token obtained:', token.substring(0, 20) + '...');
      await saveFCMToken(userId, token);
      return token;
    }
    
    return null;
  } catch (e) {
    console.error('❌ Error getting FCM token:', e.message);
    if (e.message?.includes('invalid vapid key')) {
      console.error('   The VAPID key is invalid. Please update it in Firebase Console');
    }
    return null;
  }
};

/**
 * Save FCM token to Firestore
 */
export const saveFCMToken = async (userId, token) => {
  if (!userId || !token) return;
  
  try {
    const { doc, setDoc, getDoc, updateDoc } = await import("firebase/firestore");
    const { db } = await import("./config");
    
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      await updateDoc(userDocRef, { 
        fcmToken: token, 
        fcmTokenUpdatedAt: new Date().toISOString() 
      });
    } else {
      await setDoc(userDocRef, { 
        fcmToken: token, 
        fcmTokenUpdatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString() 
      });
    }
    
    // Also save to dedicated collection for tokens
    const tokenDocRef = doc(db, "fcmTokens", userId);
    await setDoc(tokenDocRef, { 
      token, 
      userId, 
      createdAt: new Date().toISOString(),
      platform: getPlatform() 
    });
    
    console.log('✅ FCM Token saved to Firestore');
  } catch (error) {
    console.error('❌ Error saving FCM token:', error.message);
  }
};

/**
 * Get stored FCM token from Firestore
 */
export const getStoredFCMToken = async (userId) => {
  try {
    const { doc, getDoc } = await import("firebase/firestore");
    const { db } = await import("./config");
    
    const tokenDoc = await getDoc(doc(db, "fcmTokens", userId));
    return tokenDoc.exists() ? tokenDoc.data().token : null;
  } catch {
    return null;
  }
};

/**
 * Delete FCM token from Firestore
 */
export const deleteFCMToken = async (userId) => {
  try {
    const { doc, setDoc } = await import("firebase/firestore");
    const { db } = await import("./config");
    
    await setDoc(doc(db, "fcmTokens", userId), { 
      token: null, 
      userId, 
      deletedAt: new Date().toISOString() 
    });
    
    console.log('✅ FCM Token deleted');
  } catch {
    console.warn('⚠️ Error deleting FCM token');
  }
};

// ============================================================================
// LOCAL NOTIFICATIONS
// ============================================================================

/**
 * Show a local notification (fallback for when FCM is unavailable)
 */
export const showLocalNotification = async (title, body, data = {}) => {
  const platform = getPlatform();
  
  if (platform === 'native') {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const perm = await LocalNotifications.checkPermissions();
      if (isNativePermissionGranted(perm)) {
        await LocalNotifications.schedule({
          notifications: [{
            id: Date.now(),
            title,
            body,
            channelId: "reminders",
            smallIcon: "ic_launcher",
            sound: "default",
            data
          }]
        });
        return true;
      }
    } catch (error) {
      console.error('❌ Error showing native notification:', error.message);
    }
  }
  
  // Web Notification API fallback
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, {
        body,
        icon: "/pwa-192x192.svg",
        badge: "/pwa-192x192.svg",
        tag: "studybuddy-notification",
        data
      });
      return true;
    } catch (error) {
      console.error('❌ Error showing web notification:', error.message);
    }
  }
  
  return false;
};

// ============================================================================
// FOREGROUND MESSAGE HANDLING
// ============================================================================

let foregroundListener = null;
let nativePushListenersAttached = false;

const initializeNativePush = async (userId, onMessageCallback) => {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    const permStatus = await PushNotifications.requestPermissions();
    if (permStatus.receive !== "granted") {
      return {
        success: false,
        reason: "push_permission_denied",
        platform: "native"
      };
    }

    if (!nativePushListenersAttached) {
      await PushNotifications.addListener("registration", async (token) => {
        console.log("✅ Native push token received");
        if (userId && token?.value) {
          await saveFCMToken(userId, token.value);
        }
      });

      await PushNotifications.addListener("registrationError", (error) => {
        console.error("❌ Native push registration error:", error);
      });

      await PushNotifications.addListener("pushNotificationReceived", async (notification) => {
        console.log("📬 Native push notification received:", notification);
        if (onMessageCallback) {
          onMessageCallback(notification);
        }

        // Ensure foreground pushes still show a visible notification.
        if (notification?.title || notification?.body) {
          await showLocalNotification(
            notification.title || "StudyBuddy",
            notification.body || "You have a new notification",
            notification?.data || {}
          );
        }
      });

      await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        console.log("👉 Native push action performed:", action);
        if (onMessageCallback) {
          onMessageCallback(action.notification || action);
        }
      });

      nativePushListenersAttached = true;
    }

    await PushNotifications.register();

    return {
      success: true,
      platform: "native",
      permissions: true
    };
  } catch (error) {
    console.error("❌ Error initializing native push:", error.message);
    return {
      success: false,
      reason: error.message,
      platform: "native"
    };
  }
};

/**
 * Set up foreground message listener
 * @param {function} callback - Callback for when messages are received
 * @returns {function} Cleanup function
 */
export const onForegroundMessage = async (callback) => {
  const platform = getPlatform();
  
  if (platform !== 'web') {
    console.log('ℹ️ Foreground messaging only available on web');
    return () => {};
  }
  
  try {
    const { onMessage } = await import("firebase/messaging");
    const { getFirebaseMessaging } = await import("./config");
    
    // Get messaging instance
    const messaging = getFirebaseMessaging();
    
    if (!messaging) {
      console.warn('⚠️ Messaging not initialized for foreground messages');
      // Try to initialize it
      const { initializeMessaging } = await import("./config");
      const initialized = await initializeMessaging();
      if (!initialized) {
        return () => {};
      }
    }
    
    // Get fresh instance
    const messagingInstance = getFirebaseMessaging();
    if (!messagingInstance) {
      console.warn('⚠️ Could not get messaging instance');
      return () => {};
    }
    
    // Clean up previous listener
    if (foregroundListener) {
      foregroundListener();
    }
    
    foregroundListener = onMessage(messagingInstance, async (payload) => {
      console.log('📬 Foreground message received:', payload);
      
      // Extract notification data
      const title = payload.notification?.title || payload.data?.title || 'StudyBuddy';
      const body = payload.notification?.body || payload.data?.body || 'New notification';
      
      // Show local notification
      await showLocalNotification(title, body, payload.data || {});
      
      // Call the callback
      if (callback) {
        callback(payload);
      }
    });
    
    console.log('✅ Foreground message listener set up');
    
    // Return cleanup function
    return () => {
      if (foregroundListener) {
        foregroundListener();
        foregroundListener = null;
      }
    };
  } catch (e) {
    console.error('❌ Error setting up foreground messages:', e.message);
    return () => {};
  }
};

/**
 * Background message handling is done by the service worker
 */
export const onBackgroundMessage = async (callback) => {
  console.log('ℹ️ Background messages handled by service worker');
  return () => {};
};

// ============================================================================
// PERMISSION HELPERS
// ============================================================================

/**
 * Get current notification permission status
 */
export const getNotificationPermissionStatus = () => {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
};

/**
 * Request notification permission
 * @returns {Promise<boolean>} Whether permission was granted
 */
export const requestNotificationPermission = async () => {
  const platform = getPlatform();
  
  if (platform === 'native') {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const result = await LocalNotifications.requestPermissions();
      return isNativePermissionGranted(result);
    } catch {
      return false;
    }
  }
  
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  
  return (await Notification.requestPermission()) === 'granted';
};

// ============================================================================
// FCM INITIALIZATION
// ============================================================================

let fcmInitialized = false;
let fcmInitializationResult = null;

/**
 * Initialize Firebase Cloud Messaging
 * @param {string} userId - User ID for token storage
 * @param {function} onMessageCallback - Callback for foreground messages
 * @returns {Promise<object>} Initialization result
 */
export const initializeFCM = async (userId, onMessageCallback) => {
  const platform = getPlatform();
  
  // Return cached result if already initialized
  if (fcmInitialized && fcmInitializationResult) {
    console.log('☁️ FCM already initialized, returning cached result');
    return fcmInitializationResult;
  }
  
  console.log('☁️ Initializing Firebase Cloud Messaging...');
  console.log('   Platform detected:', platform);
  
  // Native mobile push path (works in background/terminated app states).
  if (platform === "native") {
    fcmInitializationResult = await initializeNativePush(userId, onMessageCallback);
    fcmInitialized = true;
    return fcmInitializationResult;
  }

  // Non-web unsupported path
  if (platform !== 'web') {
    fcmInitializationResult = { 
      success: false, 
      reason: 'native_platform',
      platform 
    };
    fcmInitialized = true;
    return fcmInitializationResult;
  }
  
  // Check VAPID key
  if (!VAPID_KEY) {
    console.log('ℹ️ FCM VAPID key not configured - using browser notifications instead');
    fcmInitializationResult = { 
      success: false, 
      reason: 'vapid_not_configured',
      platform 
    };
    fcmInitialized = true;
    return fcmInitializationResult;
  }
  
  if (!isVapidKeyValid) {
    console.error('❌ Invalid VAPID key format - please check Firebase Console');
    fcmInitializationResult = { 
      success: false, 
      reason: 'invalid_vapid',
      platform 
    };
    fcmInitialized = true;
    return fcmInitializationResult;
  }
  
  try {
    const { initializeMessaging, getFirebaseMessaging } = await import("./config");
    
    // Initialize messaging
    const messaging = await initializeMessaging();
    if (!messaging) {
      fcmInitializationResult = { 
        success: false, 
        reason: 'initialization_failed',
        platform 
      };
      fcmInitialized = true;
      return fcmInitializationResult;
    }
    
    // Check notification permission
    const hasPerm = await requestNotificationPermission();
    if (!hasPerm) {
      console.warn('⚠️ No notification permission - FCM token will not be obtained');
    }
    
    // Get FCM token if permission granted
    let token = null;
    if (userId && hasPerm) {
      token = await requestFCMToken(userId);
    }
    
    // Set up foreground message handler
    if (onMessageCallback) {
      await onForegroundMessage(onMessageCallback);
    }
    
    fcmInitializationResult = { 
      success: true, 
      token, 
      messaging,
      permissions: hasPerm,
      platform
    };
    fcmInitialized = true;
    
    console.log('✅ FCM initialized successfully');
    return fcmInitializationResult;
    
  } catch (error) {
    console.error('❌ Error initializing FCM:', error.message);
    fcmInitializationResult = { 
      success: false, 
      reason: error.message,
      platform 
    };
    fcmInitialized = true;
    return fcmInitializationResult;
  }
};

/**
 * Reset FCM initialization (for testing)
 */
export const resetFCMInitialization = () => {
  fcmInitialized = false;
  fcmInitializationResult = null;
  if (foregroundListener) {
    foregroundListener();
    foregroundListener = null;
  }
  console.log('☁️ FCM initialization reset');
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  requestFCMToken,
  saveFCMToken,
  getStoredFCMToken,
  deleteFCMToken,
  onForegroundMessage,
  onBackgroundMessage,
  showLocalNotification,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  initializeFCM,
  resetFCMInitialization
};
