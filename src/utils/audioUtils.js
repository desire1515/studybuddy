/**
 * Audio utilities for StudyBuddy notifications
 * Provides reliable audio playback without external dependencies
 */

// Simple beep sound using Web Audio API
export const playNotificationSound = async (type = 'default') => {
  try {
    // Create audio context
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      console.warn('Web Audio API not supported');
      return false;
    }
    
    const audioContext = new AudioContext();
    
    // Resume if suspended
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    // Different frequencies for different notification types
    const frequencies = {
      default: 440,    // A4 - standard notification
      success: 880,    // A5 - success sound
      reminder: 523,   // C5 - reminder
      alarm: 1000      // High pitch alarm
    };
    
    const frequency = frequencies[type] || frequencies.default;
    
    // Create oscillator for the tone
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    
    // Create a pleasant notification sound pattern
    const now = audioContext.currentTime;
    
    // First beep
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.02);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.15);
    
    // Second beep (slightly higher pitch)
    oscillator.frequency.setValueAtTime(frequency * 1.2, now + 0.2);
    gainNode.gain.setValueAtTime(0, now + 0.2);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.22);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.35);
    
    oscillator.start(now);
    oscillator.stop(now + 0.4);
    
    console.log('✅ Notification sound played:', type);
    return true;
  } catch (error) {
    console.warn('Audio playback failed:', error.message);
    return false;
  }
};

// Play a more complex notification sound
export const playNotificationSoundExtended = async (type = 'default') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    
    const audioContext = new AudioContext();
    
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    const now = audioContext.currentTime;
    
    // Create multiple oscillators for richer sound
    const frequencies = {
      default: [523, 659, 784],    // C5, E5, G5 - major chord
      success: [523, 659, 784, 1047], // C5 major with octave
      reminder: [440, 554, 659],    // A4 major
      alarm: [880, 880, 880]        // Repeated high tone
    };
    
    const freqs = frequencies[type] || frequencies.default;
    
    freqs.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, now);
      
      const startTime = now + (index * 0.1);
      const duration = 0.15;
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });
    
    return true;
  } catch (error) {
    console.warn('Extended audio playback failed:', error.message);
    return false;
  }
};

export default {
  playNotificationSound,
  playNotificationSoundExtended
};

