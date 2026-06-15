/**
 * StudyStreakCard Component
 * 
 * Displays the user's current study streak and best streak.
 * Updates automatically when study sessions are completed.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getStreakData, updateStreak } from '../firebase/firestore';
import './StudyStreakCard.css';

const StudyStreakCard = () => {
  const { user } = useAuth();
  const [streakData, setStreakData] = useState({
    currentStreak: 0,
    bestStreak: 0,
    lastStudyDate: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStreakData = async () => {
      if (user?.uid) {
        try {
          const data = await getStreakData(user.uid);
          setStreakData(data || { currentStreak: 0, bestStreak: 0, lastStudyDate: null });
        } catch (error) {
          console.error('Error loading streak data:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadStreakData();
  }, [user?.uid]);

  const formatLastStudyDate = (dateString) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getStreakEmoji = (streak) => {
    if (streak >= 30) return '🏆';
    if (streak >= 14) return '⭐';
    if (streak >= 7) return '🔥';
    if (streak >= 3) return '✨';
    return '💪';
  };

  const isActiveToday = streakData.lastStudyDate === new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <div className="streak-card loading">
        <div className="streak-spinner"></div>
        <p>Loading streak...</p>
      </div>
    );
  }

  return (
    <div className={`streak-card ${isActiveToday ? 'active-today' : ''}`}>
      <div className="streak-header">
        <span className="streak-icon">{getStreakEmoji(streakData.currentStreak)}</span>
        <h3>Study Streak</h3>
      </div>

      <div className="streak-content">
        <div className="streak-main">
          <div className="streak-number">
            <span className="current-streak">{streakData.currentStreak}</span>
            <span className="streak-label">days</span>
          </div>
          {isActiveToday && (
            <div className="streak-status">
              <span className="status-dot"></span>
              <span>Studied today!</span>
            </div>
          )}
        </div>

        <div className="streak-stats">
          <div className="streak-stat">
            <span className="stat-icon">🏆</span>
            <div className="stat-info">
              <span className="stat-value">{streakData.bestStreak}</span>
              <span className="stat-label">Best Streak</span>
            </div>
          </div>
          
          <div className="streak-stat">
            <span className="stat-icon">📅</span>
            <div className="stat-info">
              <span className="stat-value">{formatLastStudyDate(streakData.lastStudyDate)}</span>
              <span className="stat-label">Last Study</span>
            </div>
          </div>
        </div>

        {streakData.currentStreak === 0 && (
          <div className="streak-motivation">
            <p>🚀 Start your streak today!</p>
            <p className="motivation-hint">Complete a study session to begin</p>
          </div>
        )}

        {streakData.currentStreak > 0 && streakData.currentStreak < 7 && (
          <div className="streak-motivation">
            <p>🎯 {7 - streakData.currentStreak} days to reach 1 week!</p>
          </div>
        )}

        {streakData.currentStreak >= 7 && streakData.currentStreak < 30 && (
          <div className="streak-motivation">
            <p>🌟 {30 - streakData.currentStreak} days to reach 1 month!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyStreakCard;

