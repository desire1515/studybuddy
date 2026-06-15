/**
 * EnableNotificationsButton Component for StudyBuddy - FIXED VERSION
 * 
 * This component provides a user-initiated button to enable push notifications.
 * It follows browser security policies by requesting permission only after
 * a user click event.
 * 
 * Key fixes:
 * - Proper user gesture handling for permission requests
 * - Better error handling and status feedback
 * - Integration with FCM after permission is granted
 * - Shows success/error feedback to user
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { initializeFCM, requestFCMToken, onForegroundMessage } from '../firebase/messaging.js';
import { Capacitor } from '@capacitor/core';

// Track if already initialized to prevent duplicate calls
let fcmInitialized = false;

/**
 * EnableNotificationsButton Component
 * 
 * @param {string} buttonText - Custom button text (optional)
 * @param {function} onSuccess - Callback when notifications are enabled successfully
 * @param {function} onError - Callback when there's an error
 */
const EnableNotificationsButton = ({ 
  buttonText = "Enable Study Reminders",
  onSuccess,
  onError 
}) => {
  const { user } = useAuth();
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Check if notifications are already enabled on mount
  useEffect(() => {
    const checkPermission = () => {
      if (typeof window === 'undefined') return;
      
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          setNotificationsEnabled(true);
          setStatus('success');
          setMessage('Notifications are already enabled!');
        } else if (Notification.permission === 'denied') {
          setStatus('error');
          setMessage('Notifications are blocked. Please enable them in browser settings.');
        }
      }
    };
    
    checkPermission();
  }, []);

  /**
   * Handle button click to enable notifications
   * This is a user-generated event, so it's valid for requesting permissions
   */
  const handleEnableNotifications = useCallback(async () => {
    // Prevent multiple clicks while processing
    if (status === 'loading') return;

    // Check if user is logged in
    if (!user) {
      setStatus('error');
      setMessage('Please log in to enable notifications.');
      if (onError) onError('User not logged in');
      return;
    }

    // Check if running on native platform
    const isNative = Capacitor.isNativePlatform();
    if (isNative) {
      setStatus('error');
      setMessage('Use the app settings to enable notifications on mobile.');
      return;
    }

    try {
      setStatus('loading');
      setMessage('Enabling notifications...');
      console.log('🔔 Enabling notifications (user gesture)...');

      // Request notification permission (MUST be in user-generated event)
      // This is called from onClick, so it's valid
      if (!('Notification' in window)) {
        setStatus('error');
        setMessage('Notifications not supported in this browser.');
        return;
      }

      const permission = await Notification.requestPermission();
      console.log('📱 Notification permission:', permission);

      if (permission !== 'granted') {
        setStatus('error');
        setMessage(permission === 'denied' 
          ? 'Permission denied. Please enable notifications in browser settings.'
          : 'Permission not granted.');
        if (onError) onError(permission);
        return;
      }

      // Permission granted - now initialize FCM
      setMessage('Setting up push notifications...');
      
      // Initialize FCM if not already done
      if (!fcmInitialized) {
        console.log('☁️ Initializing Firebase Cloud Messaging...');
        
        const fcmResult = await initializeFCM(user.uid, (payload) => {
          // Handle foreground messages
          console.log('📬 Foreground message received:', payload);
        });

        if (!fcmResult.success) {
          console.warn('⚠️ FCM initialization result:', fcmResult);
          // FCM might not work but notifications can still use browser API
        }

        fcmInitialized = true;
      }

      // Get FCM token (optional - will be null if VAPID not configured)
      console.log('🎫 Requesting FCM token...');
      const token = await requestFCMToken(user.uid);

      if (token) {
        console.log('✅ FCM Token obtained successfully');
      } else {
        console.log('ℹ️ No FCM token (VAPID may not be configured, but browser notifications will work)');
      }

      // Success!
      setNotificationsEnabled(true);
      setStatus('success');
      setMessage('StudyBuddy notifications enabled successfully!');
      
      // Show a test notification
      await showTestNotification();
      
      if (onSuccess) onSuccess(token);

    } catch (error) {
      console.error('❌ Error enabling notifications:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to enable notifications. Please try again.');
      if (onError) onError(error);
    }
  }, [user, status, onSuccess, onError]);

  /**
   * Show a test notification to confirm it works
   */
  const showTestNotification = async () => {
    try {
      // Check if we have permission
      if (Notification.permission === 'granted') {
        new Notification('🔔 StudyBuddy', {
          body: 'StudyBuddy notifications enabled successfully!',
          icon: '/pwa-192x192.svg',
          badge: '/pwa-192x192.svg',
          tag: 'studybuddy-enable-success'
        });
        console.log('✅ Test notification shown');
      }
    } catch (error) {
      console.warn('⚠️ Could not show test notification:', error);
    }
  };

  // Don't render if notifications are already enabled and no message to show
  if (notificationsEnabled && status === 'success' && !message) {
    return null;
  }

  return (
    <div className="enable-notifications-container">
      {status === 'idle' && (
        <button 
          onClick={handleEnableNotifications}
          className="enable-notifications-btn"
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '600',
            color: '#fff',
            backgroundColor: '#007AFF',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'background-color 0.2s, transform 0.1s',
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#007AFF'}
          onMouseDown={(e) => e.target.style.transform = 'scale(0.98)'}
          onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
        >
          🔔 {buttonText}
        </button>
      )}

      {status === 'loading' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="loading-spinner" style={{
            width: '20px',
            height: '20px',
            border: '2px solid #f3f3f3',
            borderTop: '2px solid #007AFF',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></span>
          <span>{message}</span>
        </div>
      )}

      {status === 'success' && (
        <div style={{
          padding: '12px',
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '8px',
          color: '#155724',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>✅</span>
          <span>{message}</span>
        </div>
      )}

      {status === 'error' && (
        <div style={{
          padding: '12px',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '8px',
          color: '#721c24',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>❌</span>
          <span>{message}</span>
        </div>
      )}

      {/* Add CSS animation for spinner if not already present */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default EnableNotificationsButton;

/**
 * Check if notifications are enabled/available
 */
export const checkNotificationStatus = () => {
  if (typeof window === 'undefined') {
    return { available: false, reason: 'server_side' };
  }
  
  if (!('Notification' in window)) {
    return { available: false, reason: 'not_supported' };
  }
  
  if (Notification.permission === 'granted') {
    return { available: true, status: 'granted' };
  }
  
  if (Notification.permission === 'denied') {
    return { available: false, reason: 'denied' };
  }
  
  return { available: false, status: 'default' };
};

/**
 * Request notification permission (returns promise)
 * NOTE: This should only be called from a user-generated event handler
 */
export const requestBrowserNotificationPermission = async () => {
  if (typeof window === 'undefined') {
    return { granted: false, reason: 'server_side' };
  }
  
  if (!('Notification' in window)) {
    return { granted: false, reason: 'not_supported' };
  }
  
  const permission = await Notification.requestPermission();
  return { 
    granted: permission === 'granted', 
    status: permission 
  };
};

