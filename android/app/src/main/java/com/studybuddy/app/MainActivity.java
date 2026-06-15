package com.studybuddy.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Log;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.BridgeActivity;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "StudyBuddyMainActivity";
    private static final int NOTIFICATION_PERMISSION_CODE = 12345;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // 1. Initialize the Splash Screen
        SplashScreen.installSplashScreen(this);
        
        super.onCreate(savedInstanceState);
        
        // 2. Create High-Priority Notification Channels for pop-up alerts
        createNotificationChannels();
        
        // 3. Log Firebase Token for debugging (Helpful for testing Firebase Push)
        logFirebaseToken();

        // 4. Handle initial intent (e.g., if app was launched from a notification)
        handleNotificationIntent(getIntent());
        
        // 5. Check and request necessary permissions
        checkAndRequestPermissions();
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                // High Importance Channel for "Pop-up" (Heads-up) notifications
                // We use "default" ID to override the plugin's default channel with high priority
                NotificationChannel defaultChannel = new NotificationChannel(
                        "default",
                        "Study Reminders",
                        NotificationManager.IMPORTANCE_HIGH
                );
                defaultChannel.setDescription("Used for study reminders and timetable alerts");
                defaultChannel.enableVibration(true);
                defaultChannel.setVibrationPattern(new long[]{0, 500, 200, 500});
                defaultChannel.setShowBadge(true);
                defaultChannel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
                
                manager.createNotificationChannel(defaultChannel);
                Log.d(TAG, "High importance 'default' notification channel created/updated.");
                
                // Also create a specific one just in case
                NotificationChannel highChannel = new NotificationChannel(
                        "study_reminders_high",
                        "High Priority Alerts",
                        NotificationManager.IMPORTANCE_HIGH
                );
                manager.createNotificationChannel(highChannel);
            }
        }
    }

    private void logFirebaseToken() {
        FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(task -> {
                if (!task.isSuccessful()) {
                    Log.w(TAG, "Fetching FCM registration token failed", task.getException());
                    return;
                }
                // Get new FCM registration token
                String token = task.getResult();
                Log.d(TAG, "Firebase Registration Token: " + token);
            });
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        
        if (this.bridge != null) {
            this.bridge.onNewIntent(intent);
        }
        
        handleNotificationIntent(intent);
    }

    private void handleNotificationIntent(Intent intent) {
        if (intent == null) return;
        
        if (intent.hasExtra("LocalNotificationId")) {
            int notificationId = intent.getIntExtra("LocalNotificationId", -1);
            String action = intent.getStringExtra("LocalNotificationUserAction");
            Log.i(TAG, "Notification tapped. Proceeding with ID: " + notificationId + ", Action: " + action);
        }
    }

    private void checkAndRequestPermissions() {
        // 1. POST_NOTIFICATIONS (Android 13+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_CODE);
            }
        }

        // 2. SCHEDULE_EXACT_ALARM (Android 12+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            android.app.AlarmManager alarmManager = (android.app.AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (alarmManager != null && !alarmManager.canScheduleExactAlarms()) {
                Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                intent.setData(Uri.parse("package:" + getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
                Toast.makeText(this, "Please allow Exact Alarms for study reminders to work.", Toast.LENGTH_LONG).show();
            }
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            android.app.AlarmManager alarmManager = (android.app.AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (alarmManager != null && alarmManager.canScheduleExactAlarms()) {
                Log.d(TAG, "Exact alarm permission is active.");
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == NOTIFICATION_PERMISSION_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Log.i(TAG, "Notification permission granted.");
            }
        }
    }
}
