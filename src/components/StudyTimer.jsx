/**
 * StudyTimer Component
 * 
 * Enhanced with Pomodoro Focus Mode:
 * - 25 min focus sessions
 * - 5 min short breaks
 * - 15 min long break every 4 sessions
 * - Auto-save sessions to Firestore
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { savePomodoroSession, updateStreak } from '../firebase/firestore'
import { 
  trackStudySessionStart, 
  trackStudySessionEnd, 
  trackStudySessionComplete 
} from '../firebase/analytics'
import { playNotificationSoundExtended } from '../utils/audioUtils'
import './StudyTimer.css'

// Pomodoro timer durations in minutes
const POMODORO_CONFIG = {
  FOCUS: 25,
  SHORT_BREAK: 5,
  LONG_BREAK: 15,
  SESSIONS_BEFORE_LONG_BREAK: 4
}

const StudyTimer = () => {
  const { activeSession, startStudySession, stopStudySession } = useApp()
  const { user } = useAuth()
  
  // Timer state
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [timerMode, setTimerMode] = useState('focus')
  const [pomodoroSessions, setPomodoroSessions] = useState(0)
  const [selectedSubject, setSelectedSubject] = useState('')
  const [usePomodoro, setUsePomodoro] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  
  const intervalRef = useRef(null)
  const audioRef = useRef(null)

  // Subjects for selection
  const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Computer Science', 'English', 'History', 'Other']

  // Calculate time remaining for Pomodoro
  const getTimeRemaining = useCallback(() => {
    if (!usePomodoro || !isRunning) return 0
    
    const duration = timerMode === 'focus' 
      ? POMODORO_CONFIG.FOCUS 
      : timerMode === 'shortBreak' 
        ? POMODORO_CONFIG.SHORT_BREAK 
        : POMODORO_CONFIG.LONG_BREAK
    
    return (duration * 60) - elapsedTime
  }, [usePomodoro, isRunning, timerMode, elapsedTime])

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Play notification sound using Web Audio API
  const playNotificationSound = useCallback(async () => {
    try {
      await playNotificationSoundExtended('success')
    } catch (e) {
      console.warn('Audio notification failed:', e)
    }
  }, [])

  // Handle timer completion
  const handleTimerComplete = useCallback(async () => {
    playNotificationSound();

    if (timerMode === 'focus') {
      const newSessions = pomodoroSessions + 1;
      setPomodoroSessions(newSessions);
      
      if (user?.uid && sessionId) {
        try {
          await savePomodoroSession(user.uid, {
            subject: selectedSubject || 'General',
            duration: POMODORO_CONFIG.FOCUS,
            type: 'focus',
            sessionId,
            completedAt: new Date().toISOString()
          });
          
          await updateStreak(user.uid);
          trackStudySessionComplete(sessionId, POMODORO_CONFIG.FOCUS, selectedSubject);
        } catch (error) {
          console.error('Error saving/completing Pomodoro:', error);
        }
      }

      const nextMode = newSessions % POMODORO_CONFIG.SESSIONS_BEFORE_LONG_BREAK === 0 ? 'longBreak' : 'shortBreak';
      setTimerMode(nextMode);
    } else {
      setTimerMode('focus');
    }
    setElapsedTime(0);
    setIsRunning(false);
  }, [timerMode, pomodoroSessions, selectedSubject, user, sessionId, playNotificationSound]);

  // Unified timer effect - handles regular sessions AND Pomodoro
  useEffect(() => {
    if (!intervalRef.current) return;

    const updateTimer = () => {
      setElapsedTime(prevElapsed => {
        // Regular session mode: calculate from activeSession
        if (activeSession && !usePomodoro) {
          const start = new Date(activeSession.startTime);
          const now = new Date();
          const diff = Math.floor((now - start) / 1000);
          return diff;
        }

        // Pomodoro mode: check completion
        if (usePomodoro && isRunning) {
          const remaining = getTimeRemaining(prevElapsed);
          if (remaining <= 0 && prevElapsed > 0) {
            handleTimerComplete();
            return 0;
          }
          return prevElapsed + 1;
        }

        return prevElapsed;
      });
    };

    intervalRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [activeSession, isRunning, usePomodoro, getTimeRemaining, handleTimerComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Start Pomodoro focus
  const handleStartPomodoro = useCallback(() => {
    const newSessionId = `pomodoro_${Date.now()}`;
    setSessionId(newSessionId);
    setIsRunning(true);
    setElapsedTime(0);
    setTimerMode('focus');
    trackStudySessionStart(newSessionId, selectedSubject);
  }, [selectedSubject]);

  // Stop timer
  // Stop current timer (Pomodoro or regular)
  const handleStop = useCallback(async () => {
    setIsRunning(false);
    
    if (usePomodoro && sessionId && elapsedTime > 60) {
      try {
        const durationMinutes = Math.floor(elapsedTime / 60);
        await savePomodoroSession(user?.uid, {
          subject: selectedSubject || 'General',
          duration: durationMinutes,
          type: 'focus_partial',
          sessionId,
          completedAt: new Date().toISOString()
        });
        trackStudySessionEnd(sessionId, durationMinutes, selectedSubject);
      } catch (error) {
        console.error('Error saving partial session:', error);
      }
    }
    
    setElapsedTime(0);
    setSessionId(null);
  }, [usePomodoro, sessionId, elapsedTime, selectedSubject, user]);

  // Skip break
  const handleSkipBreak = () => {
    setTimerMode('focus')
    setElapsedTime(0)
  }

  // Toggle Pomodoro mode
  const togglePomodoroMode = () => {
    if (!usePomodoro) {
      // Switching to Pomodoro
      setUsePomodoro(true)
      setTimerMode('focus')
      setElapsedTime(0)
    } else {
      // Switching back to regular timer
      setUsePomodoro(false)
      setIsRunning(false)
      setTimerMode('focus')
      setElapsedTime(0)
    }
  }

  const getModeColor = () => {
    switch (timerMode) {
      case 'focus': return '#ef4444'
      case 'shortBreak': return '#22c55e'
      case 'longBreak': return '#3b82f6'
      default: return '#ef4444'
    }
  }

  const getModeLabel = () => {
    switch (timerMode) {
      case 'focus': return '🍅 Focus Time'
      case 'shortBreak': return '☕ Short Break'
      case 'longBreak': return '🌴 Long Break'
      default: return 'Focus'
    }
  }

  const getTotalPomodoroTime = () => {
    const focusTime = pomodoroSessions * POMODORO_CONFIG.FOCUS
    return Math.floor(focusTime / 60)
  }

  // Show Pomodoro toggle always, regular timer when OFF
  const isPomodoroActive = usePomodoro && !activeSession;
  return (
    <div className="study-timer">
      <div className="pomodoro-header">
        <button 
          className={`pomodoro-toggle ${usePomodoro ? 'active' : ''}`}
          onClick={togglePomodoroMode}
        >
          🍅 Pomodoro {usePomodoro ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Subject selector for Pomodoro */}
      {!isRunning && timerMode === 'focus' && usePomodoro && (
        <div className="subject-selector">
          <label>What are you studying?</label>
          <select 
            value={selectedSubject} 
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            <option value="">Select a subject</option>
            {subjects.map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>
      )}

      {/* Pomodoro UI */}
      {usePomodoro ? (
        <div className="pomodoro-ui">
          <div 
            className="timer-display pomodoro-display"
            style={{ borderColor: getModeColor() }}
          >
            <span className="timer-mode-icon">
              {timerMode === 'focus' ? '🎯' : '☕'}
            </span>
            <span className="timer-mode-label">{getModeLabel()}</span>
            <span className="timer-time">
              {isRunning ? formatTime(getTimeRemaining()) : formatTime(
                timerMode === 'focus' ? POMODORO_CONFIG.FOCUS * 60 
                : timerMode === 'shortBreak' ? POMODORO_CONFIG.SHORT_BREAK * 60 
                : POMODORO_CONFIG.LONG_BREAK * 60
              )}
            </span>
          </div>

          <div className="pomodoro-controls">
            {!isRunning ? (
              <button 
                className="timer-btn start-btn" 
                onClick={handleStartPomodoro}
                disabled={timerMode !== 'focus'}
              >
                <span>▶️</span> {timerMode === 'focus' ? ' Start Focus' : ' Start Break'}
              </button>
            ) : (
              <button className="timer-btn stop-btn" onClick={handleStop}>
                <span>⏹️</span> Stop
              </button>
            )}

            {isRunning && timerMode !== 'focus' && (
              <button className="timer-btn skip-btn" onClick={handleSkipBreak}>
                Skip ⏭️
              </button>
            )}
          </div>

          <div className="pomodoro-stats">
            <div className="pomodoro-session">
              <span className="session-count">{pomodoroSessions}</span>
              <span className="session-label">Sessions</span>
            </div>
            <div className="pomodoro-time">
              <span className="time-count">{getTotalPomodoroTime()}</span>
              <span className="time-label">Minutes Today</span>
            </div>
          </div>

          <div className="pomodoro-info">
            <p>🍅 25 min focus → 5 min break</p>
            <p>🌴 Long break after 4 sessions</p>
          </div>
        </div>
      ) : (
        // Regular Timer UI
        <div className="regular-timer">
          <div className="timer-display">
            <span className="timer-icon">⏱️</span>
            <span className="timer-time">{formatTime(elapsedTime)}</span>
          </div>

          <div className="timer-controls">
            {activeSession ? (
              <button className="timer-btn stop-btn" onClick={stopStudySession}>
                <span>⏹️</span> Stop Study
              </button>
            ) : isRunning ? (
              <button className="timer-btn stop-btn" onClick={handleStop}>
                <span>⏹️</span> Stop
              </button>
            ) : (
              <button className="timer-btn start-btn" onClick={startStudySession}>
                <span>▶️</span> Start Study
              </button>
            )}
          </div>

          {activeSession && (
            <p className="timer-status">Study session in progress...</p>
          )}
        </div>
      )}
    </div>
  )
}

export default StudyTimer

