/**
 * App Context for StudyBuddy
 * 
 * This context manages the app's state and integrates with Firebase Firestore
 * for data persistence. It handles:
 * - User profile and settings
 * - Class timetable management
 * - Study timetable management
 * - Study session tracking (timer)
 * - Tasks management
 * - Reminders
 * - Statistics and achievements
 * 
 * The context falls back to localStorage if Firebase is unavailable
 * for a seamless offline experience.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

// Firebase Firestore imports
import {
  getClassTimetable,
  saveClassTimetable,
  getStudyTimetable,
  saveStudyTimetable,
  startStudySession as startSessionDB,
  stopStudySession as stopSessionDB,
  getStudySessions,
  getTasks,
  saveTasks,
  getReminders,
  saveReminders,
  getSettings,
  saveSettings,
  updateStreak,
  getStreakData
} from '../firebase/firestore';

// Firebase Analytics imports
import {
  trackAddClass,
  trackUpdateClass,
  trackDeleteClass,
  trackAddStudySession,
  trackDeleteStudySession,
  trackStudySessionStart,
  trackStudySessionEnd,
  trackStudySessionComplete,
  trackNotificationEnable,
  trackNotificationDisable
} from '../firebase/analytics';

// Firebase Notifications imports
import {
  initNotifications,
  scheduleReminderNotification,
  loadAndRescheduleReminders,
  scheduleTimetableReminders,
  checkNotificationPermission
} from '../firebase/notifications';

const AppContext = createContext();

// ============================================================================
// DEFAULT DATA
// ============================================================================

const getDefaultTimetable = () => ({
  Monday: [],
  Tuesday: [],
  Wednesday: [],
  Thursday: [],
  Friday: [],
  Saturday: [],
  Sunday: []
});

const getDefaultSettings = () => ({
  darkMode: false,
  notifications: true,
  studyReminders: true
});

const getDefaultUser = () => ({
  name: '',
  studentId: '',
  course: '',
  year: '',
  email: '',
  joinedDate: new Date().toISOString().split('T')[0]
});

const getDefaultSubjects = () => [
  { id: 1, name: 'Mathematics', color: '#3b82f6' },
  { id: 2, name: 'Physics', color: '#8b5cf6' },
  { id: 3, name: 'Chemistry', color: '#10b981' },
  { id: 4, name: 'Computer Science', color: '#f59e0b' },
  { id: 5, name: 'English', color: '#ef4444' },
  { id: 6, name: 'History', color: '#06b6d4' }
];

const getDefaultTasks = () => [];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get data from localStorage
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
 * Save data to localStorage
 */
const saveToStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn('LocalStorage save failed:', error);
  }
};

// ============================================================================
// APP PROVIDER
// ============================================================================

export const AppProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  
  // State variables - initialize from localStorage as fallback
  const [userData, setUserData] = useState(() => 
    getStoredData('studybuddy_user', getDefaultUser())
  );
  
  const [timetable, setTimetable] = useState(() => 
    getStoredData('studybuddy_timetable', getDefaultTimetable())
  );
  
  const [studyTimetable, setStudyTimetable] = useState(() => 
    getStoredData('studybuddy_study_timetable', getDefaultTimetable())
  );
  
  const [studySessions, setStudySessions] = useState(() => 
    getStoredData('studybuddy_sessions', [])
  );
  
  const [tasks, setTasks] = useState(() => 
    getStoredData('studybuddy_tasks', getDefaultTasks())
  );
  
  const [settings, setSettings] = useState(() => 
    getStoredData('studybuddy_settings', getDefaultSettings())
  );
  
  const [activeSession, setActiveSession] = useState(() => 
    getStoredData('studybuddy_active_session', null)
  );
  
  const [reminders, setReminders] = useState(() => 
    getStoredData('studybuddy_reminders', [])
  );
  
  const [subjects, setSubjects] = useState(() => 
    getStoredData('studybuddy_subjects', getDefaultSubjects())
  );

  const [streakData, setStreakData] = useState(() =>
    getStoredData('studybuddy_streak_data', {
      currentStreak: 0,
      bestStreak: 0,
      lastStudyDate: null
    })
  );
  
  const [isLoading, setIsLoading] = useState(true);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  // Initialize Firebase data when user logs in
  useEffect(() => {
    const initAppData = async () => {
      if (isAuthenticated && user?.uid) {
        setIsLoading(true);
        
        try {
          // Initialize notifications
          await initNotifications();
          
          // Load data from Firestore
          await loadAllData(user.uid);
          
          setIsFirebaseReady(true);
          console.log('✅ App data loaded from Firestore');
        } catch (error) {
          console.warn('Firebase load failed, using localStorage:', error);
          setIsFirebaseReady(true); // Continue with local data
        }
      } else {
        // User not authenticated
        setIsFirebaseReady(false);
        setIsLoading(false);
      }
    };
    
    initAppData();
  }, [isAuthenticated, user?.uid]);

  // Initialize notifications on mount (only if not already initialized via singleton)
  useEffect(() => {
    // The singleton pattern in notifications.js will prevent duplicate initialization
    // This useEffect just ensures notifications are initialized even for anonymous users
    initNotifications();
  }, []);

  // Keep app-level profile data aligned with auth profile data.
  useEffect(() => {
    if (!user) return;

    setUserData((prev) => ({
      ...prev,
      name: user.name || user.displayName || prev.name || '',
      studentId: user.studentId || prev.studentId || '',
      course: user.course || prev.course || '',
      year: user.year || prev.year || '',
      email: user.email || prev.email || '',
      joinedDate: user.joinedDate || prev.joinedDate || new Date().toISOString().split('T')[0],
      profilePhoto: user.profilePhoto || user.photoURL || prev.profilePhoto || ''
    }));
  }, [
    user?.uid,
    user?.name,
    user?.displayName,
    user?.studentId,
    user?.course,
    user?.year,
    user?.email,
    user?.joinedDate,
    user?.profilePhoto,
    user?.photoURL
  ]);

  // Save to localStorage when data changes (for offline support)
  useEffect(() => {
    saveToStorage('studybuddy_user', userData);
  }, [userData]);

  useEffect(() => {
    saveToStorage('studybuddy_timetable', timetable);
  }, [timetable]);

  useEffect(() => {
    saveToStorage('studybuddy_study_timetable', studyTimetable);
  }, [studyTimetable]);

  useEffect(() => {
    saveToStorage('studybuddy_sessions', studySessions);
  }, [studySessions]);

  useEffect(() => {
    saveToStorage('studybuddy_tasks', tasks);
  }, [tasks]);

  useEffect(() => {
    saveToStorage('studybuddy_settings', settings);
  }, [settings]);

  useEffect(() => {
    saveToStorage('studybuddy_active_session', activeSession);
  }, [activeSession]);

  useEffect(() => {
    saveToStorage('studybuddy_reminders', reminders);
  }, [reminders]);

  useEffect(() => {
    saveToStorage('studybuddy_subjects', subjects);
  }, [subjects]);

  useEffect(() => {
    saveToStorage('studybuddy_streak_data', streakData);
  }, [streakData]);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  /**
   * Load all data from Firestore
   */
  const loadAllData = async (uid) => {
    try {
      // Load class timetable
      const classTimetable = await getClassTimetable(uid);
      setTimetable(classTimetable || getDefaultTimetable());
      
      // Load study timetable
      const study = await getStudyTimetable(uid);
      setStudyTimetable(study || getDefaultTimetable());
      
      // Load tasks
      const userTasks = await getTasks(uid);
      setTasks(Array.isArray(userTasks) ? userTasks : []);
      
      // Load reminders
      const userReminders = await getReminders(uid);
      const normalizedReminders = Array.isArray(userReminders) ? userReminders : [];
      setReminders(normalizedReminders);
      if (normalizedReminders.length > 0) {
        // Re-schedule reminders on startup
        await loadAndRescheduleReminders(normalizedReminders);
      }
      
      // Load settings
      const userSettings = await getSettings(uid);
      if (userSettings) {
        setSettings({ ...getDefaultSettings(), ...userSettings });
      } else {
        setSettings(getDefaultSettings());
      }

      // Ensure timetable reminders are scheduled at app startup so they fire
      // even if the user does not revisit the reminders/dashboard screen.
      if ((userSettings?.studyReminders ?? true) && study) {
        await scheduleTimetableReminders(study, 'study');
      }
      
      // Load study sessions
      const sessions = await getStudySessions(uid);
      setStudySessions(sessions || []);

      // Load streak data from Firestore stats collection
      const streak = await getStreakData(uid);
      setStreakData(streak || { currentStreak: 0, bestStreak: 0, lastStudyDate: null });
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // STATISTICS CALCULATION
  // ============================================================================

  /**
   * Calculate user statistics
   */
  const calculateStats = useCallback(() => {
    const completedTasks = tasks.filter((task) => task.completed).length;
    const totalTasks = tasks.length;
    const completedReminders = reminders.filter((reminder) => reminder.completed).length;
    const totalReminders = reminders.length;

    const totalTrackableItems = totalTasks + totalReminders;
    const totalCompletedItems = completedTasks + completedReminders;
    const completionRate = totalTrackableItems > 0
      ? Math.round((totalCompletedItems / totalTrackableItems) * 100)
      : 0;

    // Calculate total study hours from all stored session formats.
    const toMillis = (value) => {
      if (!value) return null;
      if (typeof value === 'number') return value;
      if (typeof value === 'string') return new Date(value).getTime();
      if (typeof value?.seconds === 'number') return value.seconds * 1000;
      if (typeof value?.toDate === 'function') return value.toDate().getTime();
      return null;
    };

    const getSessionMinutes = (session) => {
      if (typeof session?.durationMinutes === 'number' && session.durationMinutes > 0) {
        return session.durationMinutes;
      }

      // Pomodoro sessions store `duration` in minutes.
      if (typeof session?.duration === 'number' && session.duration > 0) {
        return session.duration;
      }

      const startMs = toMillis(session?.startTime);
      const endMs = toMillis(session?.endTime);
      if (startMs && endMs && endMs > startMs) {
        return Math.round((endMs - startMs) / (1000 * 60));
      }

      return 0;
    };

    const totalStudyMinutes = studySessions.reduce((acc, session) => acc + getSessionMinutes(session), 0);
    const totalStudyHours = Math.round((totalStudyMinutes / 60) * 10) / 10;

    // Get today's schedule
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    const todayClasses = timetable[today] || [];
    const todayStudySessions = studyTimetable[today] || [];

    // Calculate weekly totals
    const totalClassesPerWeek = Object.values(timetable).reduce(
      (acc, day) => acc + (Array.isArray(day) ? day.length : 0), 0
    );
    const totalStudySessionsPerWeek = Object.values(studyTimetable).reduce(
      (acc, day) => acc + (Array.isArray(day) ? day.length : 0), 0
    );

    return {
      activeReminders: reminders.filter((reminder) => !reminder.completed).length,
      totalStudyHours,
      completionRate,
      currentStreak: streakData.currentStreak || 0,
      todayClasses: todayClasses.length,
      todayStudySessions: todayStudySessions.length,
      totalClassesPerWeek,
      totalStudySessionsPerWeek,
      completedTasks,
      totalTasks
    };
  }, [timetable, studyTimetable, tasks, reminders, studySessions, streakData.currentStreak]);

  const stats = calculateStats();

  // ============================================================================
  // CLASS TIMETABLE FUNCTIONS
  // ============================================================================

  /**
   * Add a class to the timetable
   */
  const addClass = async (day, classData) => {
    const newClass = { ...classData, id: `class_${Date.now()}` };
    const updatedTimetable = {
      ...timetable,
      [day]: [...(timetable[day] || []), newClass]
    };
    
    // Update local state
    setTimetable(updatedTimetable);
    
    // Save to Firestore
    if (isAuthenticated && user?.uid) {
      try {
        await saveClassTimetable(user.uid, updatedTimetable);
        trackAddClass(day, classData.subject);
      } catch (error) {
        console.error('Error saving class:', error);
      }
    }
  };

  /**
   * Update a class
   */
  const updateClass = async (day, classId, updatedClass) => {
    const updatedTimetable = {
      ...timetable,
      [day]: (timetable[day] || []).map((cls) =>
        cls.id === classId ? { ...cls, ...updatedClass } : cls
      )
    };

    // Update local state
    setTimetable(updatedTimetable);
    
    // Save to Firestore
    if (isAuthenticated && user?.uid) {
      try {
        await saveClassTimetable(user.uid, updatedTimetable);
        trackUpdateClass(day, updatedClass.subject);
      } catch (error) {
        console.error('Error updating class:', error);
      }
    }
  };

  /**
   * Delete a class
   */
  const deleteClass = async (day, classId) => {
    const deletedClass = timetable[day]?.find(c => c.id === classId);
    const updatedTimetable = {
      ...timetable,
      [day]: (timetable[day] || []).filter((cls) => cls.id !== classId)
    };
    
    // Update local state
    setTimetable(updatedTimetable);
    
    // Save to Firestore
    if (isAuthenticated && user?.uid) {
      try {
        await saveClassTimetable(user.uid, updatedTimetable);
        trackDeleteClass(day, deletedClass?.subject);
      } catch (error) {
        console.error('Error deleting class:', error);
      }
    }
  };

  // ============================================================================
  // STUDY TIMETABLE FUNCTIONS
  // ============================================================================

  /**
   * Add a study session
   */
  const addStudySession = async (day, sessionData) => {
    const newSession = { ...sessionData, id: `study_${Date.now()}` };
    const updatedTimetable = {
      ...studyTimetable,
      [day]: [...(studyTimetable[day] || []), newSession]
    };
    
    // Update local state
    setStudyTimetable(updatedTimetable);
    
    // Save to Firestore
    if (isAuthenticated && user?.uid) {
      try {
        await saveStudyTimetable(user.uid, updatedTimetable);
        trackAddStudySession(day, sessionData.subject);
        
        // Schedule notification if reminder is enabled
        if (sessionData.reminder && settings.studyReminders) {
          await scheduleTimetableReminders(updatedTimetable, 'study');
        }
      } catch (error) {
        console.error('Error saving study session:', error);
      }
    }
  };

  /**
   * Update a study session
   */
  const updateStudySession = async (day, sessionId, updatedSession) => {
    const updatedTimetable = {
      ...studyTimetable,
      [day]: (studyTimetable[day] || []).map((session) =>
        session.id === sessionId ? { ...session, ...updatedSession } : session
      )
    };

    // Update local state
    setStudyTimetable(updatedTimetable);
    
    // Save to Firestore
    if (isAuthenticated && user?.uid) {
      try {
        await saveStudyTimetable(user.uid, updatedTimetable);
      } catch (error) {
        console.error('Error updating study session:', error);
      }
    }
  };

  /**
   * Delete a study session
   */
  const deleteStudySession = async (day, sessionId) => {
    const deletedSession = studyTimetable[day]?.find(s => s.id === sessionId);
    const updatedTimetable = {
      ...studyTimetable,
      [day]: (studyTimetable[day] || []).filter((session) => session.id !== sessionId)
    };
    
    // Update local state
    setStudyTimetable(updatedTimetable);
    
    // Save to Firestore
    if (isAuthenticated && user?.uid) {
      try {
        await saveStudyTimetable(user.uid, updatedTimetable);
        trackDeleteStudySession(day, deletedSession?.subject);
      } catch (error) {
        console.error('Error deleting study session:', error);
      }
    }
  };

  /**
   * Toggle study reminder
   */
  const toggleStudyReminder = async (day, sessionId) => {
    const updatedTimetable = {
      ...studyTimetable,
      [day]: (studyTimetable[day] || []).map((session) =>
        session.id === sessionId ? { ...session, reminder: !session.reminder } : session
      )
    };

    setStudyTimetable(updatedTimetable);
    
    // Save to Firestore
    if (isAuthenticated && user?.uid) {
      try {
        await saveStudyTimetable(user.uid, updatedTimetable);
      } catch (error) {
        console.error('Error toggling reminder:', error);
      }
    }
  };

  // ============================================================================
  // STUDY SESSION (TIMER) FUNCTIONS
  // ============================================================================

  /**
   * Start a study session (timer)
   */
  const startStudySession = async () => {
    const startedAt = new Date();
    let sessionId = `session_${Date.now()}`;
    let persisted = false;

    if (isAuthenticated && user?.uid) {
      try {
        const firestoreSessionId = await startSessionDB(user.uid, '');
        if (firestoreSessionId) {
          sessionId = firestoreSessionId;
          persisted = true;
        }
      } catch (error) {
        console.error('Error starting session:', error);
      }
    }

    const session = {
      id: sessionId,
      startTime: startedAt.toISOString(),
      date: startedAt.toISOString().split('T')[0],
      status: 'active',
      persisted
    };

    setActiveSession(session);
    trackStudySessionStart(session.id);
  };

  /**
   * Stop a study session
   */
  const stopStudySession = async () => {
    if (activeSession) {
      const end = new Date();
      const start = new Date(activeSession.startTime);
      const durationMinutes = Math.max(1, Math.round((end - start) / (1000 * 60)));

      const session = {
        ...activeSession,
        endTime: end.toISOString(),
        durationMinutes,
        status: 'completed'
      };
      
      // Add to sessions
      setStudySessions(prev => [...prev, session]);
      
      // Save to Firestore
      if (isAuthenticated && user?.uid) {
        try {
          if (activeSession.persisted) {
            await stopSessionDB(user.uid, activeSession.id);
          }
          const updatedCurrentStreak = await updateStreak(user.uid);
          setStreakData((prev) => {
            const today = new Date().toISOString().split('T')[0];
            const safeBest = prev?.bestStreak || 0;
            return {
              currentStreak: updatedCurrentStreak || 0,
              bestStreak: Math.max(safeBest, updatedCurrentStreak || 0),
              lastStudyDate: today
            };
          });
          
          trackStudySessionEnd(activeSession.id, durationMinutes);
          trackStudySessionComplete(activeSession.id, durationMinutes);
        } catch (error) {
          console.error('Error stopping session:', error);
        }
      } else {
        setStreakData((prev) => {
          const today = new Date().toISOString().split('T')[0];
          const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
          const currentStreak = prev?.currentStreak || 0;
          let nextStreak = 1;

          if (prev?.lastStudyDate === today) {
            nextStreak = currentStreak;
          } else if (prev?.lastStudyDate === yesterday) {
            nextStreak = currentStreak + 1;
          }

          return {
            currentStreak: nextStreak,
            bestStreak: Math.max(prev?.bestStreak || 0, nextStreak),
            lastStudyDate: today
          };
        });
        trackStudySessionEnd(activeSession.id, durationMinutes);
        trackStudySessionComplete(activeSession.id, durationMinutes);
      }
      
      setActiveSession(null);
    }
  };

  // ============================================================================
  // TASK FUNCTIONS
  // ============================================================================

  /**
   * Toggle task completion
   */
  const toggleTask = (taskId) => {
    const updatedTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);
    
    // Save to Firestore
    if (isAuthenticated && user?.uid) {
      saveTasks(user.uid, updatedTasks).catch(error => 
        console.error('Error saving tasks:', error)
      );
    }
  };

  /**
   * Add a new task
   */
  const addTask = (taskData) => {
    const newTask = {
      ...taskData,
      id: `task_${Date.now()}`,
      completed: false,
      createdAt: new Date().toISOString()
    };
    const updatedTasks = [...tasks, newTask];
    
    setTasks(updatedTasks);
    
    // Save to Firestore
    if (isAuthenticated && user?.uid) {
      saveTasks(user.uid, updatedTasks).catch(error => 
        console.error('Error saving tasks:', error)
      );
    }
  };

  /**
   * Delete a task
   */
  const deleteTask = (taskId) => {
    const updatedTasks = tasks.filter((task) => task.id !== taskId);
    setTasks(updatedTasks);
    
    // Save to Firestore
    if (isAuthenticated && user?.uid) {
      saveTasks(user.uid, updatedTasks).catch(error => 
        console.error('Error saving tasks:', error)
      );
    }
  };

  // ============================================================================
  // USER FUNCTIONS
  // ============================================================================

  /**
   * Update user data
   */
  const updateUser = (newUserData) => {
    setUserData(newUserData);
  };

  // ============================================================================
  // SETTINGS FUNCTIONS
  // ============================================================================

  /**
   * Toggle a setting
   */
  const toggleSetting = async (setting) => {
    const newValue = !settings[setting];
    const updatedSettings = { ...settings, [setting]: newValue };
    
    setSettings(updatedSettings);
    
    // Track notification settings
    if (setting === 'notifications' || setting === 'studyReminders') {
      if (newValue) {
        trackNotificationEnable(setting);
      } else {
        trackNotificationDisable(setting);
      }
    }
    
    // Save to Firestore
    if (isAuthenticated && user?.uid) {
      try {
        await saveSettings(user.uid, updatedSettings);
      } catch (error) {
        console.error('Error saving settings:', error);
      }
    }
  };

  // ============================================================================
  // REMINDER FUNCTIONS
  // ============================================================================

  /**
   * Add a reminder
   */
  const addReminder = async (reminder) => {
    const updatedReminders = [...reminders, reminder];
    setReminders(updatedReminders);

    if (reminder?.notification) {
      try {
        await scheduleReminderNotification(reminder);
      } catch (error) {
        console.error('Error scheduling reminder notification:', error);
      }
    }

    // Save to Firestore
    if (isAuthenticated && user?.uid) {
      saveReminders(user.uid, updatedReminders).catch(error =>
        console.error('Error saving reminder:', error)
      );
    }
  };

  /**
   * Delete a reminder
   */
  const deleteReminder = (reminderId) => {
    const updated = reminders.filter((r) => r.id !== reminderId);
    setReminders(updated);
    
    // Save to Firestore
    if (isAuthenticated && user?.uid) {
      saveReminders(user.uid, updated).catch(error =>
        console.error('Error deleting reminder:', error)
      );
    }
  };

  /**
   * Toggle a reminder
   */
  const toggleReminder = (reminderId) => {
    const updated = reminders.map((r) =>
      r.id === reminderId ? { ...r, completed: !r.completed } : r
    );
    setReminders(updated);
    
    // Save to Firestore
    if (isAuthenticated && user?.uid) {
      saveReminders(user.uid, updated).catch(error =>
        console.error('Error toggling reminder:', error)
      );
    }
  };

  /**
   * Update an existing reminder
   */
  const updateReminder = async (reminderId, updatedFields) => {
    const updated = reminders.map((reminder) =>
      reminder.id === reminderId
        ? { ...reminder, ...updatedFields, updatedAt: new Date().toISOString() }
        : reminder
    );

    setReminders(updated);

    const editedReminder = updated.find((reminder) => reminder.id === reminderId);
    if (editedReminder?.notification) {
      try {
        await scheduleReminderNotification(editedReminder);
      } catch (error) {
        console.error('Error rescheduling updated reminder:', error);
      }
    }

    if (isAuthenticated && user?.uid) {
      saveReminders(user.uid, updated).catch((error) =>
        console.error('Error updating reminder:', error)
      );
    }
  };

  // ============================================================================
  // NOTIFICATION PERMISSION
  // ============================================================================

  /**
   * Request notification permission - wraps the firebase notification function
   */
  const requestNotificationPermissions = async () => {
    // Note: This should be called from a user gesture (onClick) to work properly
    // The actual permission request should come from ReminderManager or EnableNotificationsButton
    const result = await checkNotificationPermission();
    return result.granted;
  };

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value = {
    // User data
    user: userData,
    isLoading,
    isFirebaseReady,
    
    // Timetable
    timetable,
    addClass,
    updateClass,
    deleteClass,
    
    // Study Timetable
    studyTimetable,
    addStudySession,
    updateStudySession,
    deleteStudySession,
    toggleStudyReminder,
    
    // Study Sessions
    studySessions,
    activeSession,
    startStudySession,
    stopStudySession,
    
    // Tasks
    tasks,
    toggleTask,
    addTask,
    deleteTask,
    
    // Settings
    settings,
    toggleSetting,
    
    // Reminders
    reminders,
    addReminder,
    deleteReminder,
    toggleReminder,
    updateReminder,
    
    // Subjects
    subjects,
    
    // Stats
    stats,
    
    // Permissions
    requestNotificationPermissions,
    
    // Legacy/Compatibility
    updateUser
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

/**
 * Hook to access app context
 */
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

// Export Provider as default for Vite Fast Refresh compatibility
export default AppProvider;

