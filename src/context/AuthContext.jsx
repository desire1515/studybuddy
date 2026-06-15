/**
 * Authentication Context for StudyBuddy
 * 
 * This context provides authentication state and functions using Firebase Auth.
 * It handles:
 * - User registration and login
 * - Password reset
 * - User session management
 * - Profile updates
 * - FCM token management for push notifications
 * - Network status monitoring
 * 
 * All functions use async/await and integrate with Firebase Firestore
 * for additional user data storage.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { 
  registerWithEmail, 
  loginWithEmail, 
  logoutUser, 
  resetPassword,
  updateUserProfile as updateFirebaseProfile,
  getUserProfile as getFirebaseProfile
} from '../firebase/auth';
import { getUserProfile as getFirestoreProfile } from '../firebase/firestore';
import { initAnalytics, setUser as setAnalyticsUser, trackLogin, trackRegister, trackLogout, trackPasswordReset } from '../firebase/analytics';
import { showLocalNotification } from '../firebase/messaging';

const AuthContext = createContext();

/**
 * Helper to get data from localStorage
 * Used for initial offline access before Firebase loads
 */
const getStoredData = (key, defaultValue) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

/**
 * Helper to save data to localStorage
 * Used for caching user data
 */
const saveToStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn('LocalStorage save failed:', error);
  }
};

export const AuthProvider = ({ children }) => {
  // User state - initialize from localStorage as fallback
  const [user, setUser] = useState(() => 
    getStoredData('studybuddy_auth_user', null)
  );
  
  const [isLoading, setIsLoading] = useState(true);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [networkError, setNetworkError] = useState(null);

  // Network status monitoring
  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      console.log('🌐 Network: Online');
      setIsOnline(true);
      setNetworkError(null);
    };

    const handleOffline = () => {
      console.warn('🌐 Network: Offline');
      setIsOnline(false);
      setNetworkError('You are currently offline. Some features may be unavailable.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize Firebase Analytics on mount
  useEffect(() => {
    const init = async () => {
      try {
        await initAnalytics();
        setIsFirebaseReady(true);
        console.log('✅ Firebase Auth Context initialized');
      } catch (error) {
        console.error('Firebase init error:', error);
        setIsFirebaseReady(true); // Continue anyway
      }
    };
    
    // Start initialization
    init();
    
    // Fallback timeout - ensure we don't stay in loading state forever
    const timeoutId = setTimeout(() => {
      console.log('⏱️ Auth timeout - forcing ready state');
      setIsFirebaseReady(true);
    }, 5000); // 5 seconds max
    
    return () => clearTimeout(timeoutId);
  }, []);

  // Set up auth state listener with improved error handling
  useEffect(() => {
    if (!isFirebaseReady) return;

    // Get auth instance
    const auth = getAuth();
    
    // Subscribe to auth state changes with try-catch
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // User is signed in - get profile with offline support
          const userData = await getFirebaseProfile(firebaseUser.uid);
          
          const userWithAuth = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            ...userData,
            // Add offline indicator if applicable
            offline: userData?.offline || false
          };
          
          // User is signed in
          setUser(userWithAuth);
          saveToStorage('studybuddy_auth_user', userWithAuth);
          
          // Set analytics user ID
          setAnalyticsUser(userWithAuth.uid);
          
          // Initialize FCM for push notifications after login
          try {
            // Dynamically import messaging to avoid issues if not supported
            const { initializeFCM } = await import('../firebase/messaging');
            
            // Set up foreground message handler
            const handleForegroundMessage = (payload) => {
              console.log('Foreground message received in AuthContext:', payload);
              // Show notification for the user
              showLocalNotification(
                payload.notification?.title || 'StudyBuddy Reminder',
                payload.notification?.body || 'You have a new notification'
              );
            };
            
            // Initialize FCM and get token
            const fcmResult = await initializeFCM(firebaseUser.uid, handleForegroundMessage);
            
            if (fcmResult.success) {
              console.log('✅ FCM initialized successfully');
            }
          } catch (error) {
            console.warn('FCM initialization failed:', error);
          }
          
          console.log('✅ User authenticated:', firebaseUser.uid);
        } else {
          // User is signed out
          setUser(null);
          localStorage.removeItem('studybuddy_auth_user');
          
          console.log('ℹ️ User signed out');
        }
      } catch (error) {
        // Handle auth state change errors gracefully
        console.error('❌ Auth state change error:', error);
        
        // If we have a firebase user but profile fetch failed, use minimal data
        if (firebaseUser) {
          const minimalUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            offline: true,
            error: error.message
          };
          setUser(minimalUser);
          saveToStorage('studybuddy_auth_user', minimalUser);
        } else {
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [isFirebaseReady]);

  // Fallback: Force isLoading to false after timeout if it gets stuck
  useEffect(() => {
    if (isLoading && isFirebaseReady) {
      const timeoutId = setTimeout(() => {
        console.log('⏱️ Loading timeout - forcing isLoading false');
        setIsLoading(false);
      }, 8000); // 8 seconds max for loading
      
      return () => clearTimeout(timeoutId);
    }
  }, [isLoading, isFirebaseReady]);

  // Save user to localStorage when it changes
  useEffect(() => {
    if (user) {
      saveToStorage('studybuddy_auth_user', user);
    }
  }, [user]);

  /**
   * Clear network error
   */
  const clearNetworkError = useCallback(() => {
    setNetworkError(null);
  }, []);

  /**
   * Login with email and password
   */
  const login = async (email, password) => {
    try {
      setIsLoading(true);
      setNetworkError(null);
      
      // Authenticate with Firebase
      const userData = await loginWithEmail(email, password);
      
      // Track login event
      trackLogin(userData.uid, 'email');
      
      // Update state
      setUser(userData);
      
      return userData;
    } catch (error) {
      console.error('Login error:', error);
      
      // Check for network errors
      if (!navigator.onLine) {
        setNetworkError('You are offline. Please check your internet connection and try again.');
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Register a new user
   */
  const register = async (userData) => {
    try {
      setIsLoading(true);
      setNetworkError(null);
      
      // Register with Firebase Auth
      const { name, email, password, studentId, course, year } = userData;
      const newUser = await registerWithEmail(email, password, name, {
        studentId,
        course,
        year
      });
      
      // Track registration event
      trackRegister(newUser.uid, 'email');
      
      // Update state
      setUser(newUser);
      
      return newUser;
    } catch (error) {
      console.error('Registration error:', error);
      
      // Check for network errors
      if (!navigator.onLine) {
        setNetworkError('You are offline. Please check your internet connection and try again.');
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout the current user
   */
  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Track logout if user exists
      if (user?.uid) {
        trackLogout(user.uid);
      }
      
      // Sign out from Firebase
      await logoutUser();
      
      // Clear state
      setUser(null);
      localStorage.removeItem('studybuddy_auth_user');
      
      console.log('✅ User logged out');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Send password reset email
   */
  const sendPasswordReset = async (email) => {
    try {
      // Send reset email via Firebase
      await resetPassword(email);
      
      // Track password reset event
      trackPasswordReset(email);
      
      console.log('✅ Password reset email sent');
    } catch (error) {
      console.error('Password reset error:', error);
      
      // Check for network errors
      if (!navigator.onLine) {
        setNetworkError('You are offline. Please check your internet connection and try again.');
      }
      
      throw error;
    }
  };

  /**
   * Update user profile
   */
  const updateProfile = async (newData) => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const uid = user?.uid || currentUser?.uid;

      if (!uid) {
        throw new Error('No user logged in. Please sign in to update your profile.');
      }

      // Merge local user for local update and to preserve existing values
      const updatedUser = { ...user, ...newData, uid };

      // Update in Firestore if online
      if (navigator.onLine) {
        await updateFirebaseProfile(uid, updatedUser);
      } else {
        setNetworkError('You are offline. Changes will be synced when you reconnect.');
      }

      // Update local state
      setUser(updatedUser);
      saveToStorage('studybuddy_auth_user', updatedUser);
      console.log('✅ Profile updated');

      return updatedUser;
    } catch (error) {
      console.error('Profile update error:', error);
      
      if (!navigator.onLine) {
        // If offline and we still have previous user data, persist pending changes
        const offlineUser = { ...(user || {}), ...newData, pendingSync: true };
        setUser(offlineUser);
        saveToStorage('studybuddy_auth_user', offlineUser);
        setNetworkError('You are offline. Changes will be synced when you reconnect.');
        return offlineUser;
      }

      throw error;
    }
  };

  /**
   * Refresh user data from Firestore
   */
  const refreshUser = async () => {
    try {
      if (!user?.uid) return null;
      
      const freshData = await getFirestoreProfile(user.uid);
      if (freshData) {
        setUser(freshData);
        return freshData;
      }
      return user;
    } catch (error) {
      console.error('Refresh user error:', error);
      return user;
    }
  };

  /**
   * Get auth token for API calls
   */
  const getAuthToken = async () => {
    return null;
  };

  // Context value
  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isFirebaseReady,
    isOnline,
    networkError,
    clearNetworkError,
    login,
    register,
    logout,
    sendPasswordReset,
    updateProfile,
    refreshUser,
    getAuthToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to access authentication context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export Provider as default for Vite Fast Refresh compatibility
export default AuthProvider;

