/**
 * WeeklyGoalCard Component
 * 
 * Displays the user's weekly study goal and progress.
 * Allows setting and updating weekly goals.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getWeeklyGoal, setWeeklyGoal, getWeeklyProgress } from '../firebase/firestore';
import './WeeklyGoalCard.css';

const WeeklyGoalCard = () => {
  const { user } = useAuth();
  const [goal, setGoal] = useState(10); // Default 10 hours
  const [weeklyProgress, setWeeklyProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newGoal, setNewGoal] = useState('');

  useEffect(() => {
    const loadGoalData = async () => {
      if (user?.uid) {
        try {
          const goalData = await getWeeklyGoal(user.uid);
          const progressData = await getWeeklyProgress(user.uid);
          
          if (goalData) {
            setGoal(goalData.weeklyStudyGoal || 10);
          }
          setWeeklyProgress(progressData || 0);
        } catch (error) {
          console.error('Error loading goal data:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadGoalData();
  }, [user?.uid]);

  const handleSaveGoal = async () => {
    const parsedGoal = parseFloat(newGoal);
    if (parsedGoal > 0 && parsedGoal <= 168) {
      try {
        await setWeeklyGoal(user.uid, parsedGoal);
        setGoal(parsedGoal);
        setIsEditing(false);
        setNewGoal('');
      } catch (error) {
        console.error('Error saving goal:', error);
      }
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setNewGoal('');
  };

  const progressPercentage = Math.min((weeklyProgress / goal) * 100, 100);
  const remainingHours = Math.max(goal - weeklyProgress, 0);
  
  const getProgressColor = () => {
    if (progressPercentage >= 100) return '#22c55e';
    if (progressPercentage >= 75) return '#3b82f6';
    if (progressPercentage >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getMotivationalMessage = () => {
    if (progressPercentage >= 100) return '🎉 Goal achieved! Amazing!';
    if (progressPercentage >= 75) return '💪 Almost there! Keep going!';
    if (progressPercentage >= 50) return '🚀 Halfway there!';
    if (progressPercentage >= 25) return '🌟 Great start!';
    return '✨ Let\'s get started!';
  };

  if (loading) {
    return (
      <div className="goal-card loading">
        <div className="goal-spinner"></div>
        <p>Loading goal...</p>
      </div>
    );
  }

  return (
    <div className="goal-card">
      <div className="goal-header">
        <span className="goal-icon">🎯</span>
        <h3>Weekly Study Goal</h3>
        {!isEditing && (
          <button 
            className="edit-goal-btn"
            onClick={() => setIsEditing(true)}
            aria-label="Edit goal"
          >
            ✏️
          </button>
        )}
      </div>

      <div className="goal-content">
        {isEditing ? (
          <div className="goal-edit-form">
            <label htmlFor="goal-input">Set your weekly goal (hours):</label>
            <div className="goal-input-group">
              <input
                id="goal-input"
                type="number"
                min="1"
                max="168"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                placeholder={goal.toString()}
              />
              <span className="input-suffix">hrs</span>
            </div>
            <div className="goal-actions">
              <button className="save-btn" onClick={handleSaveGoal}>
                Save
              </button>
              <button className="cancel-btn" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="goal-stats">
              <div className="goal-stat">
                <span className="stat-value">{weeklyProgress.toFixed(1)}h</span>
                <span className="stat-label">Completed</span>
              </div>
              <div className="goal-divider"></div>
              <div className="goal-stat">
                <span className="stat-value">{goal}h</span>
                <span className="stat-label">Goal</span>
              </div>
            </div>

            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${progressPercentage}%`,
                    backgroundColor: getProgressColor()
                  }}
                ></div>
              </div>
              <div className="progress-percentage">
                {Math.round(progressPercentage)}%
              </div>
            </div>

            <div className="goal-footer">
              <p className="remaining">
                {remainingHours > 0 
                  ? `${remainingHours.toFixed(1)}h remaining` 
                  : 'Goal reached!'}
              </p>
              <p className="motivation">{getMotivationalMessage()}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WeeklyGoalCard;

