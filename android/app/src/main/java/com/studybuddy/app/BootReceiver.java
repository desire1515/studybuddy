package com.studybuddy.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.BackoffPolicy;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import java.util.concurrent.TimeUnit;

/**
 * Boot Receiver for StudyBuddy
 * 
 * This receiver is triggered when the device boots up or the app is updated.
 * It schedules a WorkManager task to restore all scheduled reminders.
 */
public class BootReceiver extends BroadcastReceiver {
    
    private static final String TAG = "StudyBuddyBootRec";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        
        String action = intent.getAction();
        Log.i(TAG, "Received broadcast action: " + action);
        
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
            Intent.ACTION_MY_PACKAGE_REPLACED.equals(action) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(action)) {
            
            Log.i(TAG, "Scheduling notification restoration task...");
            
            // Use WorkManager to handle background execution safely on Android 15
            OneTimeWorkRequest workRequest = new OneTimeWorkRequest.Builder(RescheduleWorker.class)
                .setInitialDelay(5, TimeUnit.SECONDS) // Reduced delay for better responsiveness
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .build();
            
            WorkManager.getInstance(context).enqueue(workRequest);
        }
    }
    
    /**
     * Worker class to restore notifications.
     * This runs in the background even if the app UI is closed.
     */
    public static class RescheduleWorker extends Worker {
        
        public RescheduleWorker(@NonNull Context context, @NonNull WorkerParameters params) {
            super(context, params);
        }
        
        @NonNull
        @Override
        public Result doWork() {
            Log.i(TAG, "Executing RescheduleWorker...");
            
            try {
                Context appContext = getApplicationContext();
                
                // Trigger Capacitor's LocalNotificationRestoreReceiver
                Intent pluginIntent = new Intent("com.getcapacitor.LocalNotificationRestore");
                pluginIntent.setPackage(appContext.getPackageName());
                
                // Explicitly target the receiver if possible, though broadcast is standard for this plugin
                appContext.sendBroadcast(pluginIntent);
                
                Log.i(TAG, "Notification restore broadcast sent successfully");
                return Result.success();
                
            } catch (Exception e) {
                Log.e(TAG, "Failed to reschedule notifications", e);
                return Result.retry();
            }
        }
    }
}
