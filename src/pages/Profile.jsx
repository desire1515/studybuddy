import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import SettingsToggle from '../components/SettingsToggle';
import { sendHelpRequest, submitFeedback, FEEDBACK_CATEGORIES } from '../firebase/email';
import { trackFeedbackSend } from '../firebase/analytics';
import './Profile.css';

const Profile = () => {
  const { user: appUser, stats, settings, toggleSetting, updateUser } = useApp();
  const { user: authUser, updateProfile, logout } = useAuth();

  const fileInputRef = useRef(null);

  const profileUser = {
    ...appUser,
    ...authUser,
    name: authUser?.name || appUser?.name || authUser?.displayName || appUser?.displayName || '',
    profilePhoto: authUser?.profilePhoto || appUser?.profilePhoto || authUser?.photoURL || appUser?.photoURL || ''
  };

  const [isEditing, setIsEditing] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropSourceImage, setCropSourceImage] = useState('');
  const [cropPreviewImage, setCropPreviewImage] = useState('');
  const [cropState, setCropState] = useState({
    x: 50,
    y: 50,
    size: 72
  });
  const [feedbackCategory, setFeedbackCategory] = useState(FEEDBACK_CATEGORIES.GENERAL);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [editForm, setEditForm] = useState({
    name: profileUser.name || '',
    studentId: profileUser.studentId || '',
    course: profileUser.course || '',
    year: profileUser.year || '',
    profilePhoto: profileUser.profilePhoto || ''
  });

  useEffect(() => {
    setEditForm({
      name: profileUser.name || '',
      studentId: profileUser.studentId || '',
      course: profileUser.course || '',
      year: profileUser.year || '',
      profilePhoto: profileUser.profilePhoto || ''
    });
  }, [profileUser.name, profileUser.studentId, profileUser.course, profileUser.year, profileUser.profilePhoto]);

  const handleEdit = () => {
    setEditForm({
      name: profileUser.name || '',
      studentId: profileUser.studentId || '',
      course: profileUser.course || '',
      year: profileUser.year || '',
      profilePhoto: profileUser.profilePhoto || ''
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!authUser?.uid) {
      console.error('Cannot save profile: no authenticated user');
      return;
    }

    try {
      const updatedProfile = await updateProfile(editForm);
      updateUser(updatedProfile);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleCancel = () => {
    setEditForm({
      name: profileUser.name || '',
      studentId: profileUser.studentId || '',
      course: profileUser.course || '',
      year: profileUser.year || '',
      profilePhoto: profileUser.profilePhoto || ''
    });
    setIsEditing(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const resizeImageToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const maxSize = 320;
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const width = Math.round(img.width * scale);
          const height = Math.round(img.height * scale);

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Could not create image context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = () => reject(new Error('Invalid image file'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.readAsDataURL(file);
    });

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read selected image'));
      reader.readAsDataURL(file);
    });

  const dataUrlToFile = (dataUrl) => {
    const parts = dataUrl.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const byteString = atob(parts[1]);
    const len = byteString.length;
    const array = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
      array[i] = byteString.charCodeAt(i);
    }

    return new File([array], 'profile.jpg', { type: mime });
  };

  const cropImageToSquareDataUrl = (sourceDataUrl, state) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const minDimension = Math.min(image.width, image.height);
        const cropSize = Math.max(40, Math.round((state.size / 100) * minDimension));
        const maxLeft = Math.max(0, image.width - cropSize);
        const maxTop = Math.max(0, image.height - cropSize);
        const left = Math.round((state.x / 100) * maxLeft);
        const top = Math.round((state.y / 100) * maxTop);

        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 320;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not initialize image context'));
          return;
        }

        ctx.drawImage(image, left, top, cropSize, cropSize, 0, 0, 320, 320);
        resolve(canvas.toDataURL('image/jpeg', 0.86));
      };
      image.onerror = () => reject(new Error('Invalid crop image'));
      image.src = sourceDataUrl;
    });

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    try {
      const rawDataUrl = await fileToDataUrl(file);
      setCropSourceImage(rawDataUrl);
      setCropState({ x: 50, y: 50, size: 72 });
      setShowCropModal(true);
    } catch (error) {
      console.error('Failed to process selected image:', error);
      alert('Could not process selected image.');
    } finally {
      e.target.value = '';
    }
  };

  const handleApplyCrop = async () => {
    if (!cropSourceImage) return;

    try {
      const croppedDataUrl = await cropImageToSquareDataUrl(cropSourceImage, cropState);
      const optimizedDataUrl = await resizeImageToDataUrl(dataUrlToFile(croppedDataUrl));
      setEditForm((prev) => ({ ...prev, profilePhoto: optimizedDataUrl }));
      setShowCropModal(false);
      setCropSourceImage('');
      setCropPreviewImage('');
    } catch (error) {
      console.error('Failed to crop image:', error);
      alert('Could not crop selected image.');
    }
  };

  useEffect(() => {
    let cancelled = false;

    const renderCropPreview = async () => {
      if (!showCropModal || !cropSourceImage) {
        setCropPreviewImage('');
        return;
      }

      try {
        const preview = await cropImageToSquareDataUrl(cropSourceImage, cropState);
        if (!cancelled) {
          setCropPreviewImage(preview);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to render crop preview:', error);
          setCropPreviewImage('');
        }
      }
    };

    renderCropPreview();

    return () => {
      cancelled = true;
    };
  }, [showCropModal, cropSourceImage, cropState.x, cropState.y, cropState.size]);

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();

    try {
      trackFeedbackSend(feedbackCategory);

      if (profileUser?.uid) {
        await submitFeedback(profileUser.uid, {
          category: feedbackCategory,
          message: feedbackMessage,
          userEmail: profileUser.email
        });
      }

      sendHelpRequest(feedbackCategory, feedbackMessage);

      setFeedbackSent(true);
      setTimeout(() => {
        setShowFeedbackModal(false);
        setFeedbackSent(false);
        setFeedbackMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error sending feedback:', error);
    }
  };

  return (
    <div className="profile">
      <div className="profile-header">
        <div className="profile-avatar">
          {editForm.profilePhoto || profileUser.profilePhoto ? (
            <img
              src={editForm.profilePhoto || profileUser.profilePhoto}
              alt="Profile"
              className="profile-avatar-image"
            />
          ) : (
            <span>Student</span>
          )}
        </div>

        <div className="profile-info">
          {isEditing ? (
            <input
              type="text"
              name="name"
              value={editForm.name}
              onChange={handleChange}
              className="edit-name-input"
              placeholder="Your Name"
            />
          ) : (
            <h1>{profileUser.name || 'Student'}</h1>
          )}

          {isEditing ? (
            <input
              type="text"
              name="studentId"
              value={editForm.studentId}
              onChange={handleChange}
              className="edit-input"
              placeholder="Student ID"
            />
          ) : (
            <p className="student-id">ID: {profileUser.studentId || 'N/A'}</p>
          )}
        </div>

        {!isEditing && (
          <div className="profile-header-actions">
            {(editForm.profilePhoto || profileUser.profilePhoto) && (
              <button className="ghost-btn" onClick={() => setShowPhotoViewer(true)}>
                View Photo
              </button>
            )}
            <button className="edit-btn" onClick={handleEdit}>
              Edit Profile
            </button>
          </div>
        )}
      </div>

      <div className="profile-details">
        {isEditing ? (
          <>
            <div className="detail-card">
              <span className="detail-icon">Course</span>
              <div className="detail-info">
                <p className="detail-label">Course</p>
                <input
                  type="text"
                  name="course"
                  value={editForm.course}
                  onChange={handleChange}
                  className="edit-input"
                  placeholder="Course"
                />
              </div>
            </div>

            <div className="detail-card">
              <span className="detail-icon">Year</span>
              <div className="detail-info">
                <p className="detail-label">Year</p>
                <select
                  name="year"
                  value={editForm.year}
                  onChange={handleChange}
                  className="edit-select"
                >
                  <option value="">Select Year</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="5th Year">5th Year</option>
                </select>
              </div>
            </div>

            <div className="edit-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                style={{ display: 'none' }}
              />

              <button type="button" className="edit-btn" onClick={() => fileInputRef.current?.click()}>
                Upload and Crop Photo
              </button>

              {editForm.profilePhoto && (
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setEditForm((prev) => ({ ...prev, profilePhoto: '' }))}
                >
                  Remove Photo
                </button>
              )}

              <button className="save-btn" onClick={handleSave} type="button">Save</button>
              <button className="cancel-btn" onClick={handleCancel} type="button">Cancel</button>
            </div>
          </>
        ) : (
          <>
            <div className="detail-card">
              <span className="detail-icon">Course</span>
              <div className="detail-info">
                <p className="detail-label">Course</p>
                <p className="detail-value">{profileUser.course || 'Not set'}</p>
              </div>
            </div>

            <div className="detail-card">
              <span className="detail-icon">Year</span>
              <div className="detail-info">
                <p className="detail-label">Year</p>
                <p className="detail-value">{profileUser.year || 'Not set'}</p>
              </div>
            </div>

            <div className="detail-card">
              <span className="detail-icon">Joined</span>
              <div className="detail-info">
                <p className="detail-label">Joined Date</p>
                <p className="detail-value">{profileUser.joinedDate || 'N/A'}</p>
              </div>
            </div>

            {profileUser.email && (
              <div className="detail-card">
                <span className="detail-icon">Email</span>
                <div className="detail-info">
                  <p className="detail-label">Email</p>
                  <p className="detail-value">{profileUser.email}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="achievements-section">
        <h2>Achievements</h2>
        <div className="achievements-grid">
          <div className="achievement-card">
            <p className="achievement-value">{stats.currentStreak}</p>
            <p className="achievement-label">Study Streak</p>
          </div>
          <div className="achievement-card">
            <p className="achievement-value">{stats.completedTasks}</p>
            <p className="achievement-label">Tasks Completed</p>
          </div>
          <div className="achievement-card">
            <p className="achievement-value">{stats.totalStudyHours}h</p>
            <p className="achievement-label">Total Study Hours</p>
          </div>
          <div className="achievement-card">
            <p className="achievement-value">A</p>
            <p className="achievement-label">Average Grade</p>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2>Settings</h2>
        <div className="settings-list">
          <SettingsToggle label="Dark Mode" icon="Moon" enabled={settings.darkMode} onToggle={() => toggleSetting('darkMode')} />
          <SettingsToggle label="Notifications" icon="Bell" enabled={settings.notifications} onToggle={() => toggleSetting('notifications')} />
          <SettingsToggle label="Study Reminders" icon="Clock" enabled={settings.studyReminders} onToggle={() => toggleSetting('studyReminders')} />
        </div>
      </div>

      <div className="settings-section">
        <h2>Account</h2>
        <div className="settings-list">
          <button
            className="support-btn"
            onClick={async () => {
              try {
                await logout();
                window.location.href = '/login';
              } catch (error) {
                console.error('Logout failed:', error);
              }
            }}
          >
            <span>Logout</span>
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h2>Help and Support</h2>
        <div className="settings-list">
          <button className="support-btn" onClick={() => setShowFeedbackModal(true)}>
            <span>Send Feedback / Get Help</span>
          </button>
          <button className="support-btn" onClick={() => sendHelpRequest('login')}>
            <span>Login Issues</span>
          </button>
        </div>
      </div>

      {showFeedbackModal && (
        <div className="modal-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Send Feedback</h2>

            {feedbackSent ? (
              <div className="success-message">
                <p>Thank you for your feedback.</p>
                <p>Your email app has been opened for details.</p>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="feedback-form">
                <div className="form-group">
                  <label htmlFor="category">Category</label>
                  <select id="category" value={feedbackCategory} onChange={(e) => setFeedbackCategory(e.target.value)}>
                    <option value={FEEDBACK_CATEGORIES.GENERAL}>General</option>
                    <option value={FEEDBACK_CATEGORIES.BUG_REPORT}>Bug Report</option>
                    <option value={FEEDBACK_CATEGORIES.FEATURE_REQUEST}>Feature Request</option>
                    <option value={FEEDBACK_CATEGORIES.HELP}>Help Request</option>
                    <option value={FEEDBACK_CATEGORIES.ACCOUNT}>Account Issue</option>
                    <option value={FEEDBACK_CATEGORIES.OTHER}>Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="message">Message</label>
                  <textarea
                    id="message"
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    placeholder="Describe your issue or feedback..."
                    rows={4}
                    required
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={() => setShowFeedbackModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="auth-btn">Send Feedback</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showPhotoViewer && (editForm.profilePhoto || profileUser.profilePhoto) && (
        <div className="modal-overlay" onClick={() => setShowPhotoViewer(false)}>
          <div className="modal-content photo-viewer-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Profile Photo</h2>
            <img
              src={editForm.profilePhoto || profileUser.profilePhoto}
              alt="Profile preview"
              className="photo-viewer-image"
            />
            <div className="modal-actions">
              <button type="button" className="cancel-btn" onClick={() => setShowPhotoViewer(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showCropModal && (
        <div className="modal-overlay" onClick={() => setShowCropModal(false)}>
          <div className="modal-content crop-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Crop Profile Photo</h2>
            <p className="crop-hint">Adjust the image and preview the final profile photo before saving.</p>

            <div className="crop-preview-grid">
              <div className="crop-source-panel">
                <p>Original</p>
                {cropSourceImage && <img src={cropSourceImage} alt="Original upload" className="crop-source-image" />}
              </div>
              <div className="crop-result-panel">
                <p>Cropped Preview</p>
                {cropPreviewImage ? (
                  <img src={cropPreviewImage} alt="Cropped preview" className="crop-result-image" />
                ) : (
                  <div className="crop-placeholder">Generating preview...</div>
                )}
              </div>
            </div>

            <div className="crop-controls">
              <label>
                Horizontal
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={cropState.x}
                  onChange={(e) => setCropState((prev) => ({ ...prev, x: Number(e.target.value) }))}
                />
              </label>

              <label>
                Vertical
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={cropState.y}
                  onChange={(e) => setCropState((prev) => ({ ...prev, y: Number(e.target.value) }))}
                />
              </label>

              <label>
                Zoom
                <input
                  type="range"
                  min="40"
                  max="100"
                  value={cropState.size}
                  onChange={(e) => setCropState((prev) => ({ ...prev, size: Number(e.target.value) }))}
                />
              </label>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => {
                  setShowCropModal(false);
                  setCropSourceImage('');
                  setCropPreviewImage('');
                }}
              >
                Cancel
              </button>
              <button type="button" className="auth-btn" onClick={handleApplyCrop}>
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
