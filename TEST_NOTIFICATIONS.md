# Notification Testing Guide for StudyBuddy PWA

## Overview
This guide provides step-by-step instructions for testing notifications on Android 13+ and Android 15 (API 36) devices.

## Files Updated
1. `android/app/src/main/AndroidManifest.xml` - Permissions added
2. `android/app/src/main/java/com/studybuddy/app/BootReceiver.java` - Enhanced boot handling
3. `src/firebase/notifications.js` - Local notifications with Android 13+/15+ support
4. `src/firebase/messaging.js` - FCM with local notification fallback
5. `src/firebase/config.js` - Firebase configuration
6. `src/components/ReminderManager.jsx` - Updated to use Capacitor LocalNotifications

---

## Testing Steps

### Step 1: Verify Android Permissions
Open `android/app/src/main/AndroidManifest.xml` and ensure these permissions are present:
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.USE_EXACT_ALARM" />
```

### Step 2: Build the Android App
```bash
cd android
./gradlew assembleDebug
```

### Step 3: Install on Device
```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

### Step 4: Test Notification Permission
1. Open the app
2. Navigate to Reminders or Dashboard
3. Tap "Enable Notifications" button
4. Grant the POST_NOTIFICATIONS permission when prompted (Android 13+)
5. Verify the status shows "Notifications enabled (native)"

### Step 5: Test Immediate Notification
1. In the app, tap "Test Notification"
2. You should receive a notification immediately with title "🧪 Immediate Test"
3. Tap the notification - should open the app

### Step 6: Test Scheduled Notification (1 minute)
1. Tap "Test Notification" (scheduled for 1 minute)
2. Wait 1 minute
3. Notification should appear with title "🧪 Test Notification"

### Step 7: Test After Reboot
1. Restart the device
2. Open the app
3. Verify notifications still work
4. Scheduled notifications should still fire

---

## Android 15 (API 36) Specific Notes

### Exact Alarm Behavior
- Android 15 has stricter exact alarm controls
- The app will automatically fall back to inexact scheduling if exact alarm permission is denied
- Check logcat for: `⚠️ Exact alarm not allowed, will use inexact scheduling`

### Notification Channels
- Channel ID: "reminders" 
- Channel Name: "Reminders"
- Importance: HIGH (5) - ensures notifications show on lock screen

### Verification Commands
```bash
# Check notification permission
adb shell dumpsys notification --nuid={notification_id}

# Check exact alarm status
adb shell settings get global alarm_wakeup_queue_length
```

---

## Troubleshooting

### Permission Denied
If notification permission is denied:
1. Go to Settings > Apps > StudyBuddy > Permissions
2. Enable Notifications
3. Restart app

### Notifications Not Showing
1. Check notification channel importance (must be HIGH for Android 8+)
2. Check battery optimization - disable for StudyBuddy
3. Check DND/Do Not Disturb settings

### Exact Alarm Not Working (Android 12+)
- App needs SCHEDULE_EXACT_ALARM permission (already in manifest)
- For Android 15+, may need to request via Settings
- Fallback: inexact alarms will still fire but may be delayed by system

---

## Test Notification Code
The test notification is scheduled 1 minute from now using:
```javascript
const scheduleTime = new Date(Date.now() + 60000);
await scheduleNotification({
  id: 'test_notification_' + Date.now(),
  title: '🧪 Test Notification',
  body: 'This is a test notification from StudyBuddy.',
  channelId: 'reminders',
  scheduleAt: scheduleTime
});
```

---

## Files Summary

| File | Changes |
|------|---------|
| AndroidManifest.xml | Added POST_NOTIFICATIONS, SCHEDULE_EXACT_ALARM, RECEIVE_BOOT_COMPLETED, USE_EXACT_ALARM |
| BootReceiver.java | Added WorkManager for Android 13+ reschedule support |
| notifications.js | Added checkExactAlarmPermission, exact alarm fallback, Android 15 support |
| messaging.js | Added local notification for foreground FCM messages |
| config.js | Added vapidKey export and validation |
| ReminderManager.jsx | Updated to use Capacitor LocalNotifications |

