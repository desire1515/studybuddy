
/**
 * Firebase Authentication Service for StudyBuddy
 * 
 * Fixed issues:
 * - onAuthStateChanged properly imported and used
 * - Offline support with localStorage caching
 * - Graceful error handling
 */

import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  onAuthStateChanged as firebaseOnAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

// Import from config (ensures Firebase is initialized)
import { auth, db } from './config';

/**
 * Check if online
 */
const isOnline = () => {
  return typeof navigator !== 'undefined' && navigator.onLine !== false;
};

/**
 * Get cached user from localStorage
 */
const getCachedUserProfile = (uid) => {
  try {
    const cached = localStorage.getItem(`studybuddy_user_${uid}`);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

/**
 * Cache user profile
 */
const cacheUserProfile = (uid, data) => {
  try {
    localStorage.setItem(`studybuddy_user_${uid}`, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to cache user profile:', error);
  }
};

/**
 * Register with email and password
 */
export const registerWithEmail = async (email, password, name, additionalData = {}) => {
  try {
    // Create user with email and password
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update user profile with display name
    await updateProfile(user, {
      displayName: name
    });

    // Create user document in Firestore
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: name,
      studentId: additionalData.studentId || '',
      course: additionalData.course || '',
      year: additionalData.year || '1st Year',
      createdAt: new Date().toISOString(),
      joinedDate: new Date().toISOString().split('T')[0],
      achievements: {
        streak: 0,
        totalStudyHours: 0,
        tasksCompleted: 0
      }
    };

    // Save user data to Firestore
    await setDoc(doc(db, 'users', user.uid), userData);

    // Cache for offline use
    cacheUserProfile(user.uid, userData);

    console.log('✅ User registered successfully:', user.uid);
    
    return {
      uid: user.uid,
      email: user.email,
      displayName: name,
      ...additionalData
    };
  } catch (error) {
    console.error('❌ Registration error:', error.message);
    throw handleAuthError(error);
  }
};

/**
 * Login with email and password
 */
export const loginWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Get additional user data from Firestore
    let userData = null;
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        userData = userDoc.data();
      }
    } catch (firestoreError) {
      console.warn('Could not fetch user data from Firestore:', firestoreError.message);
    }
    
    const result = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || userData?.displayName,
      ...userData
    };

    // Cache for offline use
    if (userData) {
      cacheUserProfile(user.uid, userData);
    }
    
    console.log('✅ User logged in successfully:', user.uid);
    return result;
  } catch (error) {
    console.error('❌ Login error:', error.message);
    throw handleAuthError(error);
  }
};

/**
 * Logout the current user
 */
export const logoutUser = async () => {
  try {
    await signOut(auth);
    console.log('✅ User logged out successfully');
  } catch (error) {
    console.error('❌ Logout error:', error.message);
    throw handleAuthError(error);
  }
};

/**
 * Send password reset email
 */
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    console.log('✅ Password reset email sent');
  } catch (error) {
    console.error('❌ Password reset error:', error.message);
    throw handleAuthError(error);
  }
};

/**
 * Update user profile data in Firestore
 */
export const updateUserProfile = async (uid, userData) => {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, userData, { merge: true });
    
    // Update cache
    const cached = getCachedUserProfile(uid);
    if (cached) {
      cacheUserProfile(uid, { ...cached, ...userData });
    }
    
    console.log('✅ User profile updated');
  } catch (error) {
    console.error('❌ Profile update error:', error.message);
    throw handleAuthError(error);
  }
};

/**
 * Get user profile - with offline support
 */
export const getUserProfile = async (uid) => {
  try {
    // Check network status
    if (!isOnline()) {
      console.warn('⚠️ Offline mode: Using cached user profile');
      const cached = getCachedUserProfile(uid);
      if (cached) {
        return cached;
      }
      return { uid, offline: true, cachedAt: new Date().toISOString() };
    }
    
    const userDoc = await getDoc(doc(db, 'users', uid));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      // Cache the profile
      cacheUserProfile(uid, userData);
      return userData;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Get profile error:', error.message);
    
    // Check for offline-related errors
    const errorCode = error.code || '';
    if (errorCode.includes('offline') || errorCode.includes('network') || errorCode.includes('unavailable')) {
      const cached = getCachedUserProfile(uid);
      if (cached) {
        return cached;
      }
      return { uid, offline: true, cachedAt: new Date().toISOString() };
    }
    
    // Try cached data for any error
    const cached = getCachedUserProfile(uid);
    if (cached) {
      return cached;
    }
    
    return { uid, offline: true, cachedAt: new Date().toISOString() };
  }
};

/**
 * Delete user account
 */
export const deleteUserAccount = async (uid, password) => {
  try {
    const user = auth.currentUser;
    if (user) {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      
      // Delete user data from Firestore
      await deleteDoc(doc(db, 'users', uid));
      
      // Delete user from Firebase Auth
      await deleteUser(user);
      
      console.log('✅ User account deleted');
    }
  } catch (error) {
    console.error('❌ Account deletion error:', error.message);
    throw handleAuthError(error);
  }
};

/**
 * Auth state change listener - FIXED VERSION
 * Properly uses firebaseOnAuthStateChanged from Firebase Auth
 */
export const onAuthChange = (callback) => {
  // Use firebaseOnAuthStateChanged which is properly imported from Firebase Auth
  return firebaseOnAuthStateChanged(auth, async (user) => {
    if (user) {
      // User is signed in
      try {
        const userData = await getUserProfile(user.uid);
        callback({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          ...userData
        });
      } catch (error) {
        // If profile fetch fails, use minimal user data
        console.warn('Could not fetch user profile:', error.message);
        callback({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          offline: true
        });
      }
    } else {
      // User is signed out
      callback(null);
    }
  });
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

// ============================================================================
// ERROR HANDLING
// ============================================================================

const handleAuthError = (error) => {
  let message = 'An error occurred. Please try again.';

  switch (error.code) {
    case 'auth/email-already-in-use':
      message = 'This email is already registered. Please login or use a different email.';
      break;
    case 'auth/invalid-email':
      message = 'Invalid email address. Please check and try again.';
      break;
    case 'auth/operation-not-allowed':
      message = 'Operation not allowed. Please contact support.';
      break;
    case 'auth/weak-password':
      message = 'Password is too weak. Please use at least 6 characters.';
      break;
    case 'auth/user-disabled':
      message = 'This account has been disabled. Please contact support.';
      break;
    case 'auth/user-not-found':
      message = 'No account found with this email. Please register first.';
      break;
    case 'auth/wrong-password':
      message = 'Incorrect password. Please try again.';
      break;
    case 'auth/invalid-credential':
      message = 'Invalid email or password. Please try again.';
      break;
    case 'auth/too-many-requests':
      message = 'Too many failed attempts. Please try again later or reset your password.';
      break;
    case 'auth/network-request-failed':
      message = 'Network error. Please check your internet connection.';
      break;
    default:
      message = error.message || 'An error occurred. Please try again.';
  }

  return new Error(message);
};

export default {
  registerWithEmail,
  loginWithEmail,
  logoutUser,
  resetPassword,
  updateUserProfile,
  getUserProfile,
  deleteUserAccount,
  onAuthChange,
  getCurrentUser
};

