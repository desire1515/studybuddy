# Push Notification Fix Plan for StudyBuddy

## Objective
Fix push notification issues for Android PWA installation by integrating Firebase Cloud Messaging (FCM).

## Tasks

### 1. Update package.json
- Add @firebase/messaging dependency

### 2. Update firebase/config.js
- Import and initialize Firebase Messaging
- Add VAPID key configuration

### 3. Create firebase/messaging.js
- FCM token management functions
- Request permission wrapper
- Foreground message handler setup
- Background message handler registration

### 4. Update vite.config.js
- Configure VitePWA for push notifications
- Add proper service worker configuration

### 5. Create public/firebase-messaging-sw.js
- Background service worker for push notifications
- Handle push events when app is in background

### 6. Update AuthContext.jsx
- Initialize FCM on user login
- Save FCM token to Firestore

### 7. Update AppContext.jsx
- Integrate FCM messaging
- Handle notification scheduling

### 8. Update ReminderList.jsx
- Add foreground notification listener
- Display notifications when app is open

## Dependencies Required
- @firebase/messaging (add to package.json)

