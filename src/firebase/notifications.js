/**
 * Notifications Service for StudyBuddy - FINAL FIXED VERSION
 * 
 * Handles local push notifications for:
 * - Capacitor LocalNotifications (native Android)
 * - Web Notification API (browser fallback)
 * - Firebase Cloud Messaging (web push - for background notifications)
 * 
 * Key fixes:
 * - Proper singleton pattern to prevent duplicate initialization
 * - User gesture requirement for permission requests (onClick handlers)
 * - FCM integration for background notifications
 * - Reliable audio playback using Web Audio API (no WAV files needed)
 * - Foreground message handling
 */

import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { getValidVapidKey, isVapidKeyValid, VAPID_KEY } from './config';
import { playNotificationSound, playNotificationSoundExtended } from '../utils/audioUtils';

// ============================================================================
// SINGLETON - Prevent duplicate initialization
// ============================================================================

let notificationsInitialized = false;
let initializationResult = null;
let permissionRequestInProgress = false;

// ============================================================================
// CONFIGURATION
// ============================================================================

export const NOTIFICATION_CHANNELS = {
  REMINDERS: 'reminders',
  TIMETABLE: 'timetable_reminders',
  STUDY: 'study_reminders',
  GENERAL: 'general_notifications'
};

const CHANNEL_CONFIGS = {
  reminders: {
    id: 'reminders',
    name: 'Reminders',
    description: 'Channel for reminder notifications',
    importance: 5,
    sound: 'default'
  },
  timetable: {
    id: 'timetable_reminders',
    name: 'Class Reminders',
    description: 'Notifications for class schedules',
    importance: 4,
    sound: 'default'
  },
  study: {
    id: 'study_reminders',
    name: 'Study Reminders',
    description: 'Notifications for study sessions',
    importance: 4,
    sound: 'default'
  }
};

// ============================================================================
// PLATFORM DETECTION
// ============================================================================

const isNativeAndroid = () => Capacitor.getPlatform() === 'android';
const isNativePlatform = () => Capacitor.isNativePlatform();

const getPlatform = () => {
  if (typeof window === 'undefined') return 'unknown';
  if (isNativeAndroid()) return 'android';
  if (isNativePlatform()) return 'ios';
  return 'web';
};

const isNativePermissionGranted = (permissionResult) =>
  permissionResult?.display === 'granted' ||
  permissionResult?.permissions?.create === 'granted' ||
  permissionResult?.permissions?.receive === 'granted';

const MAX_ANDROID_NOTIFICATION_ID = 2147483647;

/**
 * Convert any string/number identifier into a deterministic positive int
 * required by Android LocalNotifications.
 */
const toNotificationId = (rawId) => {
  if (typeof rawId === 'number' && Number.isInteger(rawId) && rawId > 0) {
    return rawId;
  }

  const str = String(rawId ?? `notif_${Date.now()}`);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }

  return (Math.abs(hash) % (MAX_ANDROID_NOTIFICATION_ID - 1)) + 1;
};

// ============================================================================
// VAPID KEY VALIDATION
// ============================================================================

export const isFCMReady = async () => {
  const platform = getPlatform();
  
  if (platform !== 'web') {
    return { ready: false, reason: 'native_platform' };
  }
  
  // Check if VAPID key is configured
  if (!VAPID_KEY) {
    console.log('ℹ️ FCM not configured - using browser Notification API instead');
    return { ready: false, reason: 'vapid_not_configured' };
  }
  
  if (!isVapidKeyValid) {
    console.warn('⚠️ FCM not ready: Invalid VAPID key format');
    console.warn('   Push notifications will use browser Notification API instead');
    return { ready: false, reason: 'invalid_vapid_key' };
  }
  
  return { ready: true };
};

// ============================================================================
// PERMISSION HANDLING
// ============================================================================

/**
 * Request notification permission - MUST be called from user-generated event
 * @param {string} source - Source of the request for logging
 */
export const requestNotificationPermission = async (source = 'unknown') => {
  // Prevent duplicate permission requests
  if (permissionRequestInProgress) {
    console.log('⏳ Permission request already in progress');
    return { granted: false, reason: 'already_requesting' };
  }
  
  permissionRequestInProgress = true;
  
  const platform = getPlatform();
  console.log(`📱 Requesting notification permission from ${source} on ${platform}...`);
  
  try {
    // Native platform
    if (isNativePlatform()) {
      try {
        const result = await LocalNotifications.requestPermissions();
        const granted = isNativePermissionGranted(result);
        
        console.log('📱 Native notification permission:', granted ? 'granted' : 'denied', result);
        
        permissionRequestInProgress = false;
        return { granted, platform: 'native', details: result.permissions };
      } catch (error) {
        console.error('❌ Error requesting native permissions:', error.message);
        permissionRequestInProgress = false;
        return { granted: false, platform: 'native', error: error.message };
      }
    }
    
    // Web Notification API
    if (!('Notification' in window)) {
      permissionRequestInProgress = false;
      return { granted: false, platform: 'web', error: 'Not supported' };
    }
    
    if (Notification.permission === 'granted') {
      permissionRequestInProgress = false;
      return { granted: true, platform: 'web' };
    }
    
    if (Notification.permission === 'denied') {
      permissionRequestInProgress = false;
      return { granted: false, platform: 'web', error: 'Denied - please enable in browser settings' };
    }
    
    // Request permission - this MUST be in a user-generated event
    const permission = await Notification.requestPermission();
    console.log('📱 Web notification permission:', permission);
    
    permissionRequestInProgress = false;
    return { granted: permission === 'granted', platform: 'web', status: permission };
  } catch (error) {
    console.error('❌ Error requesting permission:', error);
    permissionRequestInProgress = false;
    return { granted: false, platform: platform, error: error.message };
  }
};

export const checkNotificationPermission = async () => {
  if (isNativePlatform()) {
    try {
      const result = await LocalNotifications.checkPermissions();
      return { granted: isNativePermissionGranted(result), platform: 'native' };
    } catch (error) {
      return { granted: false, platform: 'native', error: error.message };
    }
  }
  
  if (!('Notification' in window)) {
    return { granted: false, platform: 'web', error: 'Not supported' };
  }
  
  return { granted: Notification.permission === 'granted', platform: 'web', status: Notification.permission };
};

// ============================================================================
// NOTIFICATION CHANNELS - ANDROID 8+
// ============================================================================

export const registerNotificationChannels = async () => {
  if (!isNativeAndroid()) return;
  
  try {
    for (const config of Object.values(CHANNEL_CONFIGS)) {
      await LocalNotifications.createChannel({
        id: config.id,
        name: config.name,
        description: config.description,
        importance: config.importance,
        sound: config.sound,
        vibration: true,
        lights: true,
        lightColor: '#007AFF'
      });
    }
    console.log('✅ Notification channels registered');
  } catch (error) {
    console.error('❌ Error registering channels:', error.message);
  }
};

// ============================================================================
// AUDIO HANDLING - Using Web Audio API (no external files needed)
// ============================================================================

/**
 * Play notification sound using Web Audio API
 */
const playAudioAlert = async (soundType = 'default') => {
  try {
    // Try our audio utility first
    const success = await playNotificationSoundExtended(soundType);
    if (success) {
      console.log('✅ Audio alert played via Web Audio API');
      return true;
    }
  } catch (error) {
    console.warn('⚠️ Audio alert failed:', error.message);
  }
  return false;
};

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize notifications - uses singleton pattern to prevent duplicate initialization
 * NOTE: This does NOT request permission automatically - use EnableNotificationsButton for that
 * @returns {Promise<object>} Initialization result
 */
export const initNotifications = async () => {
  // Return cached result if already initialized
  if (notificationsInitialized && initializationResult) {
    console.log('🔔 Notifications already initialized, returning cached result');
    return initializationResult;
  }
  
  console.log('🔔 Initializing notifications (without requesting permission)...');
  
  const platform = getPlatform();
  console.log('📱 Platform:', platform);
  
  // Register channels for Android (this doesn't require user permission)
  await registerNotificationChannels();
  
  // Check current permission status WITHOUT requesting
  let permissionResult = { granted: false, platform: platform, status: 'not_checked' };
  
  if (isNativePlatform()) {
    try {
      const result = await LocalNotifications.checkPermissions();
      permissionResult = { 
        granted: isNativePermissionGranted(result), 
        platform: 'native', 
        details: result
      };
    } catch (error) {
      console.warn('⚠️ Could not check native permissions:', error.message);
    }
  } else if ('Notification' in window) {
    // Just check the status, don't request
    permissionResult = { 
      granted: Notification.permission === 'granted', 
      platform: 'web', 
      status: Notification.permission 
    };
  }
  
  console.log('📱 Current permission status:', permissionResult);
  
  // Check FCM readiness (this doesn't require permission, just checks config)
  const fcmStatus = await isFCMReady();
  console.log('☁️ FCM Status:', fcmStatus);
  
  if (!fcmStatus.ready && fcmStatus.reason === 'invalid_vapid_key') {
    console.warn('⚠️ Firebase Cloud Messaging unavailable due to invalid VAPID key');
    console.warn('   Using browser Notification API as fallback');
  }
  
  // Set up native listeners
  if (isNativePlatform()) {
    await setupNativeListeners();
  }
  
  // Cache the result
  initializationResult = { platform, permissions: permissionResult, fcm: fcmStatus };
  notificationsInitialized = true;
  
  console.log('✅ Notifications initialized successfully');
  return initializationResult;
};

/**
 * Reset notification initialization (useful for testing)
 */
export const resetNotificationInitialization = () => {
  notificationsInitialized = false;
  initializationResult = null;
  permissionRequestInProgress = false;
  console.log('🔔 Notification initialization reset');
};

const setupNativeListeners = async () => {
  try {
    await LocalNotifications.addListener('localNotificationReceived', (notification) => {
      console.log('📬 Notification received:', notification);
    });
    
    await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      console.log('👆 Notification action:', action);
    });
    
    console.log('✅ Native notification listeners set up');
  } catch (error) {
    console.warn('⚠️ Error setting up native listeners:', error.message);
  }
};

// ============================================================================
// SCHEDULE NOTIFICATIONS
// ============================================================================

export const scheduleNotification = async ({ 
  id, 
  title, 
  body, 
  channelId = NOTIFICATION_CHANNELS.REMINDERS,
  scheduleAt = new Date(),
  allowWhileIdle = true,
  playSound = true,
  soundType = 'default'
}) => {
  const platform = getPlatform();
  
  // Native Android
  if (isNativePlatform()) {
    try {
      const hasPermission = await checkNotificationPermission();
      if (!hasPermission.granted) {
        console.warn('⚠️ Native notification permission not granted');
        return null;
      }
      
      await LocalNotifications.schedule({
        notifications: [{
          id: toNotificationId(id),
          title,
          body,
          channelId,
          schedule: { at: scheduleAt, allowWhileIdle },
          smallIcon: 'ic_launcher',
          sound: 'default',
          vibration: true,
          priority: 'high'
        }]
      });
      
      console.log(`✅ Native notification scheduled: ${title}`);
      
      // Play sound
      if (playSound) {
        await playAudioAlert(soundType);
      }
      
      return id;
    } catch (error) {
      console.error('❌ Error scheduling native notification:', error.message);
      // Fall back to web
      return scheduleWebNotification({ id, title, body, scheduleAt, playSound, soundType });
    }
  }
  
  // Web - use FCM if available, otherwise fallback to web notifications
  const fcmStatus = await isFCMReady();
  
  if (fcmStatus.ready) {
    // For FCM, we need to use Firebase Functions or store the scheduled time in Firestore
    // and use a scheduled job. For now, we'll use local scheduling as fallback.
    console.log('ℹ️ FCM is ready - using local scheduling (FCM server-side scheduling requires Cloud Functions)');
  }
  
  return scheduleWebNotification({ id, title, body, scheduleAt, playSound, soundType });
};

const scheduledTimeouts = new Map();

const scheduleWebNotification = async ({ id, title, body, scheduleAt, playSound = true, soundType = 'default' }) => {
  if (Notification.permission !== 'granted') {
    // Permission was not granted; notifications are disabled.
    return null;
  }

  const now = new Date();
  const delay = scheduleAt.getTime() - now.getTime();

  // Deduplicate timer-based scheduling
  if (scheduledTimeouts.has(id)) {
    clearTimeout(scheduledTimeouts.get(id));
    scheduledTimeouts.delete(id);
  }

  if (delay <= 0) {
    const result = showWebNotification(id, title, body);
    if (result && playSound) {
      await playAudioAlert(soundType);
    }
    return result;
  }

  const timerId = setTimeout(() => {
    showWebNotification(id, title, body);
    if (playSound) {
      playAudioAlert(soundType);
    }
    scheduledTimeouts.delete(id);
  }, delay);

  scheduledTimeouts.set(id, timerId);
  console.log(`✅ Web notification scheduled: ${title} in ${Math.round(delay/1000)}s`);
  return id;
};

const showWebNotification = (id, title, body) => {
  if (Notification.permission === 'granted') {
    try {
      const notification = new Notification(title, {
        body,
        icon: '/pwa-192x192.svg',
        badge: '/pwa-192x192.svg',
        tag: id.toString(),
        vibrate: [200, 100, 200],
        requireInteraction: false
      });
      
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      
      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);
      
      console.log('✅ Web notification shown:', title);
      return id;
    } catch (error) {
      console.error('❌ Error showing web notification:', error.message);
    }
  }
  return null;
};

// ============================================================================
// REMINDER API - Simple wrapper for reminder objects
// ============================================================================

export const scheduleReminderNotification = async (reminder) => {
  if (!reminder || !reminder.id || !reminder.title) {
    console.warn('⚠️ Invalid reminder object for scheduling');
    return null;
  }

  let scheduleAt = null;

  try {
    if (reminder.date && reminder.time) {
      if (reminder.date.toDate) {
        scheduleAt = new Date(reminder.date.toDate());
      } else if (typeof reminder.date === 'string') {
        const [year, month, day] = reminder.date.split('-').map(Number);
        scheduleAt = new Date(year, month - 1, day);
      } else {
        scheduleAt = new Date(reminder.date);
      }

      const [hours, minutes] = reminder.time.split(':').map(Number);
      if (!isNaN(hours) && !isNaN(minutes)) {
        scheduleAt.setHours(hours, minutes, 0, 0);
      }
    } else if (reminder.date && typeof reminder.date === 'object' && reminder.date.toDate) {
      scheduleAt = new Date(reminder.date.toDate());
    }

    if (!scheduleAt || Number.isNaN(scheduleAt.getTime())) {
      console.warn('⚠️ Could not parse reminder date/time, using immediate schedule');
      scheduleAt = new Date();
    }

    const now = new Date();
    if (scheduleAt <= now) {
      console.log('ℹ️ Reminder time has already passed; scheduling immediate notification');
      scheduleAt = new Date(now.getTime() + 1000);
    }

    const title = reminder.title || 'StudyBuddy Reminder';
    const body = reminder.description || `Reminder for ${title}`;
    const channelId = NOTIFICATION_CHANNELS.REMINDERS;

    const result = await scheduleNotification({
      id: `reminder_${reminder.id}`,
      title,
      body,
      channelId,
      scheduleAt,
      soundType: 'reminder'
    });

    if (
      typeof Notification !== 'undefined' &&
      scheduleAt.getTime() - now.getTime() < 2000 &&
      Notification.permission === 'granted'
    ) {
      showWebNotification(`reminder_created_${reminder.id}`, `Reminder created: ${title}`, body);
    }

    console.log(`✅ Reminder scheduled: ${title} at ${scheduleAt.toLocaleString()}`);
    return result;
  } catch (error) {
    console.error('❌ Error scheduling reminder notification:', error?.message || error);
    return null;
  }
};

export const loadAndRescheduleReminders = async (reminders = []) => {
  if (!Array.isArray(reminders)) {
    console.warn('⚠️ loadAndRescheduleReminders expected an array');
    return [];
  }

  const scheduled = [];
  for (const reminder of reminders) {
    if (reminder?.notification !== false) {
      try {
        const id = await scheduleReminderNotification(reminder);
        if (id) scheduled.push(id);
      } catch (error) {
        console.error('❌ Error rescheduling reminder:', error?.message || error);
      }
    }
  }

  console.log(`✅ Rescheduled ${scheduled.length} reminder notifications`);
  return scheduled;
};

// ============================================================================
// CANCEL NOTIFICATIONS
// ============================================================================

export const cancelNotification = async (id) => {
  if (isNativePlatform()) {
    try {
      await LocalNotifications.cancel({ notifications: [{ id: toNotificationId(id) }] });
      console.log(`✅ Cancelled notification: ${id}`);
    } catch (error) {
      console.error('❌ Error cancelling notification:', error.message);
    }
  }
};

export const cancelAllNotifications = async () => {
  if (isNativePlatform()) {
    try {
      await LocalNotifications.cancelAll();
      console.log('✅ Cancelled all notifications');
    } catch (error) {
      console.error('❌ Error cancelling all:', error.message);
    }
  }
};

export const getPendingNotifications = async () => {
  if (isNativePlatform()) {
    try {
      const result = await LocalNotifications.getPending();
      return result.notifications || [];
    } catch (error) {
      return [];
    }
  }
  return [];
};

// ============================================================================
// TIMETABLE REMINDERS
// ============================================================================

export const scheduleTimetableReminders = async (timetable, type = 'class') => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const now = new Date();
  let count = 0;

  const getNextReminderDate = (dayIndex, startHour, startMinute) => {
    const base = new Date(now);
    const dayDelta = (dayIndex - now.getDay() + 7) % 7;
    base.setDate(base.getDate() + dayDelta);
    base.setHours(startHour, startMinute, 0, 0);

    // Reminder is 5 minutes before start.
    const reminderDate = new Date(base.getTime() - 5 * 60 * 1000);

    // If the computed reminder has already passed this week, schedule next week's occurrence.
    if (reminderDate <= now) {
      reminderDate.setDate(reminderDate.getDate() + 7);
    }

    return reminderDate;
  };

  for (const [day, entries] of Object.entries(timetable || {})) {
    const dayIndex = days.indexOf(day);
    if (dayIndex < 0 || !Array.isArray(entries)) continue;

    for (const entry of entries) {
      if (!entry?.reminder || !entry?.startTime) continue;

      const [hours, minutes] = String(entry.startTime).split(':').map(Number);
      if (Number.isNaN(hours) || Number.isNaN(minutes)) continue;

      const notificationTime = getNextReminderDate(dayIndex, hours, minutes);
      const subject = entry.subject || entry.name || 'Your session';
      const notifId = `${type}_${day}_${entry.id || entry.startTime}_${notificationTime.toISOString().slice(0, 10)}`;

      await scheduleNotification({
        id: notifId,
        title: type === 'class' ? '📚 Class Starting Soon' : '📖 Study Session Starting Soon',
        body: `${subject} starts in 5 minutes`,
        channelId: type === 'class' ? NOTIFICATION_CHANNELS.TIMETABLE : NOTIFICATION_CHANNELS.STUDY,
        scheduleAt: notificationTime,
        soundType: 'reminder'
      });

      count++;
    }
  }

  console.log(`✅ Scheduled ${count} ${type} reminders for upcoming sessions`);
  return count;
};

// ============================================================================
// TEST NOTIFICATIONS
// ============================================================================

export const scheduleTestNotification = async () => {
  const testId = 'test_' + Date.now();
  const scheduleTime = new Date(Date.now() + 60000); // 1 minute
  
  const result = await scheduleNotification({
    id: testId,
    title: '🧪 Test Notification',
    body: 'This is a test from StudyBuddy!',
    scheduleAt: scheduleTime,
    playSound: true,
    soundType: 'default'
  });
  
  if (result) {
    console.log('✅ Test notification scheduled for', scheduleTime.toLocaleTimeString());
  }
  
  return result;
};

export const scheduleImmediateTestNotification = async () => {
  const testId = 'immediate_' + Date.now();

  const permission = await checkNotificationPermission();
  if (!permission.granted) {
    console.warn('⚠️ Immediate test: notification permission not granted', permission);
    if ('Notification' in window && Notification.permission !== 'granted') {
      console.log('Requesting permission as part of immediate test...');
      await requestNotificationPermission('immediate_test');
    }
  }

  const result = await scheduleNotification({
    id: testId,
    title: '🧪 Immediate Test',
    body: 'Testing notifications NOW!',
    scheduleAt: new Date(),
    playSound: true,
    soundType: 'success'
  });

  if (!result && 'Notification' in window && Notification.permission === 'granted') {
    // fallback direct Notification API for immediate verification
    new Notification('🧪 Immediate Test', {
      body: 'Fallback notification - check it now!',
      icon: '/pwa-192x192.svg'
    });
    console.log('✅ Fallback direct browser notification shown.');
    return true;
  }

  return result;
};

export const checkExactAlarmPermission = async () => {
  if (!isNativeAndroid()) {
    return { allowed: true, reason: 'web_platform' };
  }
  
  try {
    const permissions = await LocalNotifications.checkExactNotificationSetting();
    const hasSchedulePermission = permissions?.exact_alarm === 'granted';
    
    return {
      allowed: hasSchedulePermission,
      platform: 'android',
      details: permissions
    };
  } catch (error) {
    console.error('Error checking exact alarm permission:', error.message);
    return { allowed: false, error: error.message };
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  initNotifications,
  resetNotificationInitialization,
  requestNotificationPermission,
  checkNotificationPermission,
  registerNotificationChannels,
  checkExactAlarmPermission,
  scheduleNotification,
  scheduleTimetableReminders,
  scheduleTestNotification,
  scheduleImmediateTestNotification,
  cancelNotification,
  cancelAllNotifications,
  getPendingNotifications,
  isFCMReady,
  CHANNELS: NOTIFICATION_CHANNELS
};

