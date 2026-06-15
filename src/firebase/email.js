/**
 * Email Support Service for StudyBuddy
 * 
 * This module provides functionality for users to send feedback
 * and help requests to the studybuddy2025@gmail.com support email.
 * 
 * Since Firebase doesn't provide a built-in way to send emails directly,
 * this service provides multiple approaches:
 * 1. Mailto link (opens default email client)
 * 2. Firestore-based feedback collection (for tracking)
 * 3. Web-based email service integration (optional)
 * 
 * The primary approach uses mailto links for simplicity and reliability.
 */

import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Support email address
export const SUPPORT_EMAIL = 'studybuddy2025@gmail.com';

// Feedback categories
export const FEEDBACK_CATEGORIES = {
  GENERAL: 'general',
  BUG_REPORT: 'bug_report',
  FEATURE_REQUEST: 'feature_request',
  HELP: 'help',
  FEEDBACK: 'feedback',
  ACCOUNT: 'account',
  OTHER: 'other'
};

// Priority levels
export const PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

// ============================================================================
// MAILTO LINK GENERATION
// ============================================================================

/**
 * Generate a mailto link for sending feedback
 * This opens the user's default email client
 * 
 * @param {object} options - Email options
 * @param {string} options.category - Feedback category
 * @param {string} options.subject - Email subject
 * @param {string} options.body - Email body
 * @returns {string} Mailto link
 */
export const generateMailtoLink = ({ 
  category = FEEDBACK_CATEGORIES.GENERAL,
  subject = '',
  body = ''
}) => {
  // Build subject line
  const fullSubject = subject 
    ? `[StudyBuddy - ${category}] ${subject}`
    : `[StudyBuddy] ${category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')}`;
  
  // Encode subject and body for URL
  const encodedSubject = encodeURIComponent(fullSubject);
  const encodedBody = encodeURIComponent(body);
  
  // Generate mailto link
  const mailtoLink = `mailto:${SUPPORT_EMAIL}?subject=${encodedSubject}&body=${encodedBody}`;
  
  return mailtoLink;
};

/**
 * Open email client with pre-filled feedback form
 * 
 * @param {object} options - Email options
 */
export const sendFeedbackViaEmail = (options) => {
  const mailtoLink = generateMailtoLink(options);
  window.location.href = mailtoLink;
};

// ============================================================================
// FEEDBACK COLLECTION (FIRESTORE)
// ============================================================================

/**
 * Submit feedback to Firestore for tracking
 * This allows admin to review feedback in the Firebase Console
 * 
 * @param {string} userId - User's unique ID
 * @param {object} feedbackData - Feedback data
 * @returns {Promise<string>} Feedback ID
 */
export const submitFeedback = async (userId, feedbackData) => {
  try {
    const feedbackId = `feedback_${Date.now()}`;
    const feedbackRef = doc(db, 'feedback', feedbackId);
    
    await setDoc(feedbackRef, {
      id: feedbackId,
      userId,
      category: feedbackData.category || FEEDBACK_CATEGORIES.GENERAL,
      subject: feedbackData.subject || '',
      message: feedbackData.message,
      priority: feedbackData.priority || PRIORITY.MEDIUM,
      status: 'pending', // pending, reviewed, resolved
      createdAt: serverTimestamp(),
      metadata: {
        appVersion: feedbackData.appVersion || '1.0.0',
        platform: feedbackData.platform || 'web',
        userEmail: feedbackData.userEmail || ''
      }
    });
    
    console.log('✅ Feedback submitted:', feedbackId);
    return feedbackId;
  } catch (error) {
    console.error('❌ Error submitting feedback:', error);
    throw error;
  }
};

// ============================================================================
// HELP REQUEST
// ============================================================================

/**
 * Generate a help request email
 * Pre-fills common help topics
 * 
 * @param {string} issueType - Type of issue
 * @param {string} description - Description of the problem
 */
export const sendHelpRequest = (issueType, description = '') => {
  const category = FEEDBACK_CATEGORIES.HELP;
  
  // Build subject based on issue type
  const issueSubjects = {
    'login': 'Login Issue',
    'password': 'Password Reset Help',
    'timetable': 'Timetable Problem',
    'notification': 'Notification Issue',
    'sync': 'Data Sync Issue',
    'account': 'Account Problem',
    'other': 'Other Issue'
  };
  
  const subject = issueSubjects[issueType] || issueSubjects.other;
  
  // Build body with template
  const body = description 
    ? `Issue Type: ${issueType}\n\nDescription:\n${description}\n\n---\nSent from StudyBuddy App`
    : `Issue Type: ${issueType}\n\nDescription:\n[Please describe your issue here]\n\n---\nSent from StudyBuddy App`;
  
  sendFeedbackViaEmail({
    category,
    subject,
    body
  });
};

// ============================================================================
// FEEDBACK FORM HELPERS
// ============================================================================

/**
 * Get predefined feedback templates
 * 
 * @returns {object} Templates for different feedback types
 */
export const getFeedbackTemplates = () => ({
  [FEEDBACK_CATEGORIES.BUG_REPORT]: {
    subject: 'Bug Report',
    body: `Bug Description:
[Describe the bug you encountered]

Steps to Reproduce:
1. 
2. 
3. 

Expected Behavior:
[What should have happened]

Actual Behavior:
[What actually happened]

Device/System:
[Your device and OS version]

---
Sent from StudyBuddy App`
  },
  [FEEDBACK_CATEGORIES.FEATURE_REQUEST]: {
    subject: 'Feature Request',
    body: `Feature Name:
[Name of the feature you'd like to see]

Description:
[Describe the feature in detail]

Why it would be useful:
[Explain how this feature would help you]

---
Sent from StudyBuddy App`
  },
  [FEEDBACK_CATEGORIES.HELP]: {
    subject: 'Help Request',
    body: `Issue Type:
[Login / Password / Timetable / Notifications / Other]

Description:
[Describe your issue in detail]

---
Sent from StudyBuddy App`
  },
  [FEEDBACK_CATEGORIES.FEEDBACK]: {
    subject: 'App Feedback',
    body: `Feedback Type:
[General / Suggestion / Compliment / Other]

Your Feedback:
[Share your thoughts about the app]

---
Sent from StudyBuddy App`
  },
  [FEEDBACK_CATEGORIES.ACCOUNT]: {
    subject: 'Account Issue',
    body: `Issue Type:
[Login / Password / Profile / Deletion / Other]

Description:
[Describe your account issue in detail]

---
Sent from StudyBuddy App`
  }
});

/**
 * Open feedback form with template
 * 
 * @param {string} category - Feedback category
 * @param {string} userEmail - User's email (optional, for context)
 */
export const openFeedbackForm = (category, userEmail = '') => {
  const templates = getFeedbackTemplates();
  const template = templates[category] || templates[FEEDBACK_CATEGORIES.GENERAL];
  
  // Add user email to body if provided
  const bodyWithEmail = userEmail 
    ? `User Email: ${userEmail}\n\n${template.body}`
    : template.body;
  
  sendFeedbackViaEmail({
    category,
    subject: template.subject,
    body: bodyWithEmail
  });
};

// ============================================================================
// RATE THE APP
// ============================================================================

/**
 * Open app store/play store for rating
 * This is a placeholder - you'd customize URLs for your app
 */
export const rateApp = () => {
  const platform = getPlatform();
  
  // For web, show a message
  if (platform === 'web') {
    alert('Thank you for using StudyBuddy! Please rate us on the app store.');
    return;
  }
  
  // For Android (Play Store)
  // const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.studybuddy.app';
  // window.open(playStoreUrl, '_blank');
  
  console.log('📱 Rate app functionality - add your store URLs');
};

/**
 * Get platform (helper)
 */
const getPlatform = () => {
  const userAgent = navigator.userAgent || '';
  if (/android/i.test(userAgent)) return 'android';
  if (/iPad|iPhone|iPod/.test(userAgent)) return 'ios';
  return 'web';
};

// ============================================================================
// EXPORT ALL FUNCTIONS
// ============================================================================

export default {
  // Constants
  SUPPORT_EMAIL,
  FEEDBACK_CATEGORIES,
  PRIORITY,
  
  // Email functions
  generateMailtoLink,
  sendFeedbackViaEmail,
  
  // Firestore feedback
  submitFeedback,
  
  // Help requests
  sendHelpRequest,
  
  // Templates
  getFeedbackTemplates,
  openFeedbackForm,
  
  // App rating
  rateApp
};

