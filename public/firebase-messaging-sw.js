/**
 * Firebase Cloud Messaging Service Worker for StudyBuddy
 * 
 * This service worker handles push notifications when the app is in the
 * background or closed. Required for FCM to work on the web.
 * 
 * Key features:
 * - Background push notification handling
 * - Notification click handling
 * - Proper VAPID key configuration
 */

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ============================================================================
// FIREBASE CONFIGURATION
// Must match src/firebase/config.js
// ============================================================================

firebase.initializeApp({
  apiKey: "AIzaSyAOEBogFN6Vki79MOboG_7OO0ClYvZqlZI",
  authDomain: "studybuddy-8c892.firebaseapp.com",
  projectId: "studybuddy-8c892",
  storageBucket: "studybuddy-8c892.firebasestorage.app",
  messagingSenderId: "357508453207",
  appId: "1:357508453207:web:587b70e2add7d57df52412"
});

// ============================================================================
// MESSAGING WITH VAPID KEY
// ============================================================================

// VAPID key from Firebase Console
const vapidKey = "BPR0m_MvZ8RvOp_iXbnNUPAkHrHNtTNifyaRLl5auYB6y6eF43jeQvSqoNulW8aPxbPX6uq9EGHfmJb6vSGs634";

const messaging = firebase.messaging();

// Use the VAPID key
messaging.usePublicVapidKey(vapidKey);

// ============================================================================
// BACKGROUND MESSAGE HANDLER
// ============================================================================

messaging.onBackgroundMessage(function(payload) {
  console.log('[FCM SW] Received background message:', payload);

  // Extract notification data
  const title = payload.notification?.title || payload.data?.title || 'StudyBuddy Reminder';
  const body = payload.notification?.body || payload.data?.body || 'You have a new reminder';
  const icon = '/pwa-192x192.svg';
  const tag = payload.data?.tag || 'studybuddy-reminder';
  const data = payload.data || {};

  const notificationOptions = {
    body,
    icon,
    badge: '/pwa-192x192.svg',
    tag,
    data,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  self.registration.showNotification(title, notificationOptions)
    .then(() => {
      console.log('[FCM SW] Background notification shown');
    })
    .catch((error) => {
      console.error('[FCM SW] Error showing notification:', error);
    });
});

// ============================================================================
// NOTIFICATION CLICK HANDLER
// ============================================================================

self.addEventListener('notificationclick', function(event) {
  console.log('[FCM SW] Notification clicked:', event);

  if (event.action === 'dismiss') {
    event.notification.close();
    return;
  }

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if open
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if not
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// ============================================================================
// PUSH EVENT HANDLER
// ============================================================================

self.addEventListener('push', function(event) {
  console.log('[FCM SW] Push event received:', event);

  if (event.data) {
    const data = event.data.json();
    console.log('[FCM SW] Push data:', data);
  }
});

// ============================================================================
// SERVICE WORKER LIFECYCLE
// ============================================================================

self.addEventListener('activate', function(event) {
  console.log('[FCM SW] Service worker activated');
  event.waitUntil(clients.claim());
});

self.addEventListener('install', function(event) {
  console.log('[FCM SW] Service worker installed');
  self.skipWaiting();
});

console.log('[FCM SW] Firebase Messaging Service Worker loaded with VAPID key');

