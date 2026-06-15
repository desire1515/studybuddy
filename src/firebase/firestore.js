/**
 * Firebase Firestore Service for StudyBuddy - TOP LEVEL COLLECTIONS REFACTORED ✅
 * 
 * Structure:
 * - users/{uid} - Profile only 
 * - study_sessions/{id} - {userId, subject, startTime, durationMinutes, status}
 * - class_timetables/{uid} - {userId, Monday: [...], ...}
 * - study_timetables/{uid} - {userId, Monday: [...], ...}
 * - tasks/{uid} - {userId, tasks: [...]}
 * - reminders/{uid} - {userId, reminders: [...]}
 * - study_stats/{uid} - {userId, totalStudyHours, currentStreak, bestStreak}
 * - weekly_goals/{uid} - {userId, weeklyStudyGoal}
 * - settings/{uid} - {userId, darkMode, notifications}
 */

import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';

const COLLECTIONS = {
  USERS: 'users',
  STUDY_SESSIONS: 'study_sessions',
  CLASS_TIMETABLES: 'class_timetables',
  STUDY_TIMETABLES: 'study_timetables',
  TASKS: 'tasks',
  REMINDERS: 'reminders',
  STUDY_STATS: 'study_stats',
  WEEKLY_GOALS: 'weekly_goals',
  SETTINGS: 'settings'
};

const addUserId = (uid, data) => ({ userId: uid, ...data });

// USER PROFILE (unchanged)
export const saveUserProfile = async (uid, profileData) => {
  const userRef = doc(db, COLLECTIONS.USERS, uid);
  await setDoc(userRef, profileData, { merge: true });
  console.log('✅ Profile saved');
};

export const getUserProfile = async (uid) => {
  const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, uid));
  return userDoc.exists() ? { id: uid, ...userDoc.data() } : null;
};

// CLASS TIMETABLE class_timetables/{uid}
export const saveClassTimetable = async (uid, timetable) => {
  const timetableRef = doc(db, COLLECTIONS.CLASS_TIMETABLES, uid);
  await setDoc(timetableRef, addUserId(uid, timetable), { merge: true });
};

export const getClassTimetable = async (uid) => {
  const timetableDoc = await getDoc(doc(db, COLLECTIONS.CLASS_TIMETABLES, uid));
  return timetableDoc.exists() ? timetableDoc.data() : null;
};

export const addClass = async (uid, day, classData) => {
  const timetable = await getClassTimetable(uid) || {};
  const classId = `class_${Date.now()}`;
  const dayClasses = timetable[day] || [];
  dayClasses.push({ id: classId, ...classData, createdAt: new Date().toISOString() });
  timetable[day] = dayClasses;
  await saveClassTimetable(uid, timetable);
  return classId;
};

export const updateClass = async (uid, day, classId, updatedData) => {
  const timetable = await getClassTimetable(uid);
  if (timetable?.[day]) {
    const classIndex = timetable[day].findIndex(c => c.id === classId);
    if (classIndex !== -1) {
      timetable[day][classIndex] = { ...timetable[day][classIndex], ...updatedData };
      await saveClassTimetable(uid, timetable);
    }
  }
};

export const deleteClass = async (uid, day, classId) => {
  const timetable = await getClassTimetable(uid);
  if (timetable?.[day]) {
    timetable[day] = timetable[day].filter(c => c.id !== classId);
    await saveClassTimetable(uid, timetable);
  }
};

// STUDY TIMETABLE study_timetables/{uid}
export const saveStudyTimetable = async (uid, timetable) => {
  const timetableRef = doc(db, COLLECTIONS.STUDY_TIMETABLES, uid);
  await setDoc(timetableRef, addUserId(uid, timetable), { merge: true });
};

export const getStudyTimetable = async (uid) => {
  const timetableDoc = await getDoc(doc(db, COLLECTIONS.STUDY_TIMETABLES, uid));
  return timetableDoc.exists() ? timetableDoc.data() : null;
};

export const addStudySession = async (uid, day, sessionData) => {
  const timetable = await getStudyTimetable(uid) || {};
  const sessionId = `study_${Date.now()}`;
  const daySessions = timetable[day] || [];
  daySessions.push({ id: sessionId, ...sessionData, createdAt: new Date().toISOString() });
  timetable[day] = daySessions;
  await saveStudyTimetable(uid, timetable);
  return sessionId;
};

export const updateStudySession = async (uid, day, sessionId, updatedData) => {
  const timetable = await getStudyTimetable(uid);
  if (timetable?.[day]) {
    const sessionIndex = timetable[day].findIndex(s => s.id === sessionId);
    if (sessionIndex !== -1) {
      timetable[day][sessionIndex] = { ...timetable[day][sessionIndex], ...updatedData };
      await saveStudyTimetable(uid, timetable);
    }
  }
};

export const deleteStudySession = async (uid, day, sessionId) => {
  const timetable = await getStudyTimetable(uid);
  if (timetable?.[day]) {
    timetable[day] = timetable[day].filter(s => s.id !== sessionId);
    await saveStudyTimetable(uid, timetable);
  }
};

// STUDY SESSIONS study_sessions/{id}
export const startStudySession = async (uid, subject = '') => {
  const sessionId = `session_${Date.now()}`;
  const sessionRef = doc(db, COLLECTIONS.STUDY_SESSIONS, sessionId);
  await setDoc(sessionRef, addUserId(uid, {
    subject,
    startTime: Timestamp.now(),
    date: new Date().toISOString().split('T')[0],
    status: 'active'
  }));
  return sessionId;
};

export const stopStudySession = async (uid, sessionId) => {
  const sessionRef = doc(db, COLLECTIONS.STUDY_SESSIONS, sessionId);
  const sessionDoc = await getDoc(sessionRef);
  if (sessionDoc.exists() && sessionDoc.data().userId === uid) {
    const data = sessionDoc.data();
    const endTime = Timestamp.now();
    const durationMinutes = Math.round((endTime.seconds - data.startTime.seconds) / 60);
    await updateDoc(sessionRef, { endTime, durationMinutes, status: 'completed' });
    await updateStudyStats(uid, durationMinutes);
    return { ...data, endTime, durationMinutes };
  }
};

export const getStudySessions = async (uid) => {
  const sessionsRef = collection(db, COLLECTIONS.STUDY_SESSIONS);
  const q = query(sessionsRef, where('userId', '==', uid), orderBy('startTime', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// TASKS tasks/{uid}
export const saveTasks = async (uid, tasks) => {
  const tasksRef = doc(db, COLLECTIONS.TASKS, uid);
  await setDoc(tasksRef, addUserId(uid, { tasks, updatedAt: new Date().toISOString() }), { merge: true });
};

export const getTasks = async (uid) => {
  const tasksDoc = await getDoc(doc(db, COLLECTIONS.TASKS, uid));
  return tasksDoc.exists() && tasksDoc.data().userId === uid ? tasksDoc.data().tasks || [] : [];
};

// REMINDERS reminders/{uid}
export const saveReminders = async (uid, reminders) => {
  const remindersRef = doc(db, COLLECTIONS.REMINDERS, uid);
  await setDoc(remindersRef, addUserId(uid, { reminders, updatedAt: new Date().toISOString() }), { merge: true });
};

export const getReminders = async (uid) => {
  const remindersDoc = await getDoc(doc(db, COLLECTIONS.REMINDERS, uid));
  return remindersDoc.exists() && remindersDoc.data().userId === uid ? remindersDoc.data().reminders || [] : [];
};

// SETTINGS settings/{uid}
export const saveSettings = async (uid, settingsData) => {
  const settingsRef = doc(db, COLLECTIONS.SETTINGS, uid);
  await setDoc(settingsRef, addUserId(uid, settingsData), { merge: true });
};

export const getSettings = async (uid) => {
  const settingsDoc = await getDoc(doc(db, COLLECTIONS.SETTINGS, uid));
  return settingsDoc.exists() ? settingsDoc.data() : null;
};

// WEEKLY GOALS weekly_goals/{uid}
export const setWeeklyGoal = async (uid, weeklyStudyGoal) => {
  const goalRef = doc(db, COLLECTIONS.WEEKLY_GOALS, uid);
  await setDoc(goalRef, addUserId(uid, {
    weeklyStudyGoal,
    updatedAt: new Date().toISOString()
  }), { merge: true });
};

export const getWeeklyGoal = async (uid) => {
  const goalDoc = await getDoc(doc(db, COLLECTIONS.WEEKLY_GOALS, uid));
  return goalDoc.exists() ? goalDoc.data() : null;
};

export const getWeeklyProgress = async (uid) => {
  try {
    const sessions = await getStudySessions(uid);
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let totalMinutes = 0;

    sessions.forEach((session) => {
      const durationMinutes = session.durationMinutes || 0;
      if (durationMinutes > 0) {
        totalMinutes += durationMinutes;
      } else if (session.startTime && session.endTime) {
        const start = session.startTime.seconds ? session.startTime.seconds * 1000 : new Date(session.startTime).getTime();
        const end = session.endTime.seconds ? session.endTime.seconds * 1000 : new Date(session.endTime).getTime();
        if (end > start && start >= oneWeekAgo) {
          totalMinutes += (end - start) / (1000 * 60);
        }
      }
    });

    return Math.round((totalMinutes / 60) * 10) / 10;
  } catch (error) {
    console.error('Error calculating weekly progress:', error);
    return 0;
  }
};

export const getStudyTimeBySubject = async (uid) => {
  try {
    const sessions = await getStudySessions(uid);
    const subjectMap = {};

    sessions.forEach((session) => {
      const subject = session.subject || 'Unassigned';
      let durationMinutes = session.durationMinutes || 0;

      if (!durationMinutes && session.startTime && session.endTime) {
        const start = session.startTime.seconds ? session.startTime.seconds * 1000 : new Date(session.startTime).getTime();
        const end = session.endTime.seconds ? session.endTime.seconds * 1000 : new Date(session.endTime).getTime();
        durationMinutes = end > start ? (end - start) / (1000 * 60) : 0;
      }

      if (!subjectMap[subject]) {
        subjectMap[subject] = 0;
      }
      subjectMap[subject] += durationMinutes;
    });

    return subjectMap;
  } catch (error) {
    console.error('Error fetching study time by subject:', error);
    return {};
  }
};

// STATS study_stats/{uid}
export const updateStudyStats = async (uid, minutesAdded) => {
  const statsRef = doc(db, COLLECTIONS.STUDY_STATS, uid);
  const statsDoc = await getDoc(statsRef);
  const currentHours = statsDoc.exists() ? (statsDoc.data().totalStudyHours || 0) : 0;
  const newHours = currentHours + (minutesAdded / 60);
  await setDoc(statsRef, addUserId(uid, {
    totalStudyHours: Math.round(newHours * 10) / 10,
    lastStudyDate: new Date().toISOString()
  }), { merge: true });
};

export const updateStreak = async (uid) => {
  const statsRef = doc(db, COLLECTIONS.STUDY_STATS, uid);
  const statsDoc = await getDoc(statsRef);
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  let newStreak = 1;
  let bestStreak = 0;
  
  if (statsDoc.exists()) {
    const data = statsDoc.data();
    const currentStreak = data.currentStreak || 0;
    bestStreak = data.bestStreak || 0;
    const lastDate = data.lastStudyDate;

    if (lastDate === today) {
      // Multiple sessions in the same day should keep the existing streak.
      newStreak = currentStreak;
    } else if (lastDate === yesterday) {
      newStreak = currentStreak + 1;
    }

    if (newStreak > bestStreak) bestStreak = newStreak;
  }
  
  await setDoc(statsRef, addUserId(uid, { 
    currentStreak: newStreak, 
    bestStreak,
    lastStudyDate: today 
  }), { merge: true });
  return newStreak;
};

export const getStreakData = async (uid) => {
  try {
    const statsRef = doc(db, COLLECTIONS.STUDY_STATS, uid);
    const statsDoc = await getDoc(statsRef);
    
    if (statsDoc.exists()) {
      const data = statsDoc.data();
      return {
        currentStreak: data.currentStreak || 0,
        bestStreak: data.bestStreak || 0,
        lastStudyDate: data.lastStudyDate || null
      };
    }
    
    return {
      currentStreak: 0,
      bestStreak: 0,
      lastStudyDate: null
    };
  } catch (error) {
    console.error('Error getting streak data:', error);
    return { currentStreak: 0, bestStreak: 0, lastStudyDate: null };
  }
};

// POMODORO (uses study_sessions)
export const savePomodoroSession = async (uid, sessionData) => {
  const sessionId = `pomodoro_${Date.now()}`;
  const sessionsRef = collection(db, COLLECTIONS.STUDY_SESSIONS);
  await setDoc(doc(sessionsRef, sessionId), addUserId(uid, { ...sessionData, type: 'pomodoro', createdAt: new Date().toISOString() }));
  await updateStudyStats(uid, sessionData.duration);
  return sessionId;
};

// Default export with all functions
export default {
  saveUserProfile, getUserProfile,
  saveClassTimetable, getClassTimetable, addClass, updateClass, deleteClass,
  saveStudyTimetable, getStudyTimetable, addStudySession, updateStudySession, deleteStudySession,
  startStudySession, stopStudySession, getStudySessions,
  saveTasks, getTasks,
  saveReminders, getReminders,
  saveSettings, getSettings,
  setWeeklyGoal, getWeeklyGoal, getWeeklyProgress, getStudyTimeBySubject,
  updateStudyStats, updateStreak, getStreakData,
  savePomodoroSession
};

