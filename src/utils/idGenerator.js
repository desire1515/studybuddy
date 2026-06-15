/**
 * ID Generator Utility
 * 
 * Generates unique, searchable IDs for all entities in the application.
 * Uses a combination of prefix + timestamp + random string for uniqueness.
 */

/**
 * Generate a unique ID with prefix
 * @param {string} prefix - Prefix for the ID (e.g., 'class', 'session', 'study')
 * @returns {string} Unique ID
 */
export const generateId = (prefix = 'id') => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const randomPart2 = Math.random().toString(36).substring(2, 15);
  return `${prefix}_${timestamp}_${randomPart}${randomPart2}`;
};

/**
 * Generate a shorter, more readable ID
 * @param {string} prefix - Prefix for the ID
 * @returns {string} Shorter unique ID
 */
export const generateShortId = (prefix = 'id') => {
  const timestamp = Date.now().toString(36).slice(-6);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}${randomPart}`;
};

/**
 * Generate a UUID v4 compatible ID
 * @returns {string} UUID-style ID
 */
export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Extract the prefix from an ID
 * @param {string} id - The ID to parse
 * @returns {string|null} The prefix or null if invalid
 */
export const getIdPrefix = (id) => {
  if (!id || typeof id !== 'string') return null;
  const parts = id.split('_');
  return parts.length > 1 ? parts[0] : null;
};

/**
 * Validate an ID format
 * @param {string} id - The ID to validate
 * @param {string[]} allowedPrefixes - Array of allowed prefixes
 * @returns {boolean} True if valid
 */
export const validateId = (id, allowedPrefixes = []) => {
  if (!id || typeof id !== 'string' || id.trim() === '') {
    return false;
  }
  
  // Check minimum length
  if (id.length < 5) {
    return false;
  }
  
  // If allowed prefixes specified, check against them
  if (allowedPrefixes.length > 0) {
    const prefix = getIdPrefix(id);
    return prefix && allowedPrefixes.includes(prefix);
  }
  
  return true;
};

/**
 * Normalize an ID (trim, lowercase)
 * @param {string} id - The ID to normalize
 * @returns {string} Normalized ID
 */
export const normalizeId = (id) => {
  if (!id) return '';
  return id.trim().toLowerCase();
};

// ID prefixes used in the app
export const ID_PREFIXES = {
  CLASS: 'class',
  STUDY: 'study',
  SESSION: 'session',
  POMODORO: 'pomodoro',
  TASK: 'task',
  REMINDER: 'reminder',
  USER: 'user'
};

// Convenience generators for each entity type
export const generateClassId = () => generateId(ID_PREFIXES.CLASS);
export const generateStudyId = () => generateId(ID_PREFIXES.STUDY);
export const generateSessionId = () => generateId(ID_PREFIXES.SESSION);
export const generatePomodoroId = () => generateId(ID_PREFIXES.POMODORO);
export const generateTaskId = () => generateId(ID_PREFIXES.TASK);
export const generateReminderId = () => generateId(ID_PREFIXES.REMINDER);

export default {
  generateId,
  generateShortId,
  generateUUID,
  getIdPrefix,
  validateId,
  normalizeId,
  ID_PREFIXES,
  generateClassId,
  generateStudyId,
  generateSessionId,
  generatePomodoroId,
  generateTaskId,
  generateReminderId
};

