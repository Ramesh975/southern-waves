import React, { useState, useEffect } from 'react';
import { 
  FiUser, FiCheck, FiArrowRight, FiArrowLeft, FiCamera, FiEye, FiEyeOff, 
  FiCompass, FiMoon, FiSun, FiLayers, FiMessageSquare, FiBell, FiEdit3, 
  FiSearch, FiCheckCircle, FiZap 
} from 'react-icons/fi';
import { IoContrast, IoSparkles } from 'react-icons/io5';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { getImageUrl } from './ArticleComponents';
import './OnboardingWizardModal.css';

const TOPICS = [
  { id: 'news', label: 'Campus News', icon: '📰', desc: 'Breaking university notices and press' },
  { id: 'editorial', label: 'Editorial Desk', icon: '✍️', desc: 'Thought leadership and op-eds' },
  { id: 'features', label: 'Features', icon: '🌟', desc: 'In-depth investigative reports' },
  { id: 'tea-shop', label: 'Tea Shop', icon: '☕', desc: 'Casual campus dialogues and banter' },
  { id: 'pictures-speak', label: "Picture's Speak", icon: '📸', desc: 'Visual journalism and photo essays' },
  { id: 'know-your-past', label: 'Know Your Past', icon: '📜', desc: 'University history and student heritage' },
  { id: 'politics', label: 'Campus Politics', icon: '🏛️', desc: 'Student council & union updates' },
  { id: 'research', label: 'Tech & Research', icon: '🔬', desc: 'Academic breakthroughs & projects' },
  { id: 'sports', label: 'Sports & Athletics', icon: '⚽', desc: 'Inter-college tournaments and scores' },
  { id: 'culture', label: 'Arts & Fests', icon: '🎭', desc: 'Cultural summits, drama, and festivals' },
];

const OnboardingWizardModal = ({ isOpen, onClose, onComplete }) => {
  const { user, setUser } = useAuth();
  const { theme, setTheme } = useTheme();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Profile State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [academicMajor, setAcademicMajor] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('');
  const [isPublicProfile, setIsPublicProfile] = useState(true);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  // Step 2: Recommendations State
  const [selectedTopics, setSelectedTopics] = useState([]);

  // Step 3: Appearance State (Synced with ThemeContext)
  const [selectedTheme, setSelectedTheme] = useState(theme || 'dark');

  // Step 4: Tutorial Tab State
  const [tutorialIndex, setTutorialIndex] = useState(0);

  // Populate initial values when user loads
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || user.name?.split(' ')[0] || '');
      setLastName(user.lastName || user.name?.split(' ').slice(1).join(' ') || '');
      setBio(user.bio || '');
      setAcademicMajor(user.academicMajor || '');
      setYearOfStudy(user.yearOfStudy || '');
      setIsPublicProfile(user.isPublicProfile !== undefined ? user.isPublicProfile : true);
      setAvatarPreview(user.avatar || '');
      if (user.recommendationSettings?.preferredCategories?.length > 0) {
        setSelectedTopics(user.recommendationSettings.preferredCategories);
      }
      if (user.appearanceSettings?.theme) {
        setSelectedTheme(user.appearanceSettings.theme);
      }
    }
  }, [user]);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [avatarPreview]);

  // Handle avatar file selection
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        return toast.error('Avatar file size must be less than 5MB');
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Toggle topic in recommendations
  const toggleTopic = (id) => {
    setSelectedTopics(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  // Apply appearance change in real-time
  const handleThemeModeChange = (mode) => {
    setSelectedTheme(mode);
    setTheme(mode);
  };

  // Final submission and completion
  const handleCompleteSetup = async () => {
    setSaving(true);
    try {
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        formData.append('firstName', firstName);
        formData.append('lastName', lastName);
        formData.append('bio', bio);
        formData.append('academicMajor', academicMajor);
        formData.append('yearOfStudy', yearOfStudy);
        formData.append('isPublicProfile', isPublicProfile);
        formData.append('hasCompletedOnboarding', true);
        formData.append('recommendationSettings', JSON.stringify({
          preferredCategories: selectedTopics,
          preferredTags: []
        }));
        formData.append('appearanceSettings', JSON.stringify({
          theme: selectedTheme,
          themeEngine: 'default',
          accentColor: 'blue'
        }));

        const res = await authAPI.updateProfile(formData);
        if (res.data?.data) {
          setUser(res.data.data);
        }
      } else {
        const payload = {
          firstName,
          lastName,
          bio,
          academicMajor,
          yearOfStudy,
          isPublicProfile,
          hasCompletedOnboarding: true,
          recommendationSettings: {
            preferredCategories: selectedTopics,
            preferredTags: []
          },
          appearanceSettings: {
            theme: selectedTheme,
            themeEngine: 'default',
            accentColor: 'blue'
          }
        };

        const res = await authAPI.updateProfile(payload);
        if (res.data?.data) {
          setUser(res.data.data);
        }
      }

      toast.success('🎉 Welcome to Southern Waves! Profile configured.');
      if (onComplete) onComplete();
      if (onClose) onClose();
    } catch (err) {
      console.error('Onboarding save error:', err);
      toast.error(err.response?.data?.message || 'Failed to complete profile setup');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="onboarding-overlay" onClick={e => e.stopPropagation()}>
      <div className="onboarding-modal">
        {/* Stepper Navigation Header */}
        <div className="onboarding-header">
          <div className="onboarding-brand-row">
            <div className="onboarding-badge">
              <IoSparkles size={13} />
              <span>Getting Started</span>
            </div>
            <span className="onboarding-step-counter">Step {step} of 5</span>
          </div>

          <div className="onboarding-stepper-track">
            {[1, 2, 3, 4, 5].map(s => (
              <div 
                key={s} 
                className={`onboarding-step-indicator ${step === s ? 'active' : step > s ? 'completed' : ''}`}
                onClick={() => {
                  if (s < step) setStep(s);
                }}
              />
            ))}
          </div>
        </div>

        {/* Modal Body Container */}
        <div className="onboarding-body">
          {/* STEP 1: Profile & Public Profile */}
          {step === 1 && (
            <div className="onboarding-step-content">
              <div className="onboarding-step-heading">
                <h3 className="onboarding-title">Set up your Student Profile</h3>
                <p className="onboarding-subtitle">
                  Personalize your student identity across Southern Waves journalism network.
                </p>
              </div>

              {/* Avatar Uploader */}
              <div className="onboarding-avatar-row">
                <div className="onboarding-avatar-wrapper">
                  {avatarPreview && !avatarLoadError ? (
                    <img 
                      src={getImageUrl(avatarPreview)} 
                      alt="Avatar" 
                      className="onboarding-avatar-img" 
                      onError={() => setAvatarLoadError(true)}
                    />
                  ) : (
                    <div className="onboarding-avatar-placeholder">
                      {firstName ? firstName[0].toUpperCase() : 'U'}
                    </div>
                  )}
                  <label className="onboarding-avatar-upload-btn" title="Upload custom photo">
                    <FiCamera size={14} />
                    <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
                  </label>
                </div>
                <div className="onboarding-avatar-meta">
                  <span className="onboarding-avatar-label">Profile Avatar</span>
                  <span className="onboarding-avatar-hint">Upload a headshot or use your campus initials. Maximum 5MB.</span>
                </div>
              </div>

              {/* Names & Academic Info */}
              <div className="onboarding-form-grid">
                <div className="onboarding-input-group">
                  <label className="onboarding-label">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="e.g., Ananya"
                    className="onboarding-input"
                  />
                </div>
                <div className="onboarding-input-group">
                  <label className="onboarding-label">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="e.g., Sundaram"
                    className="onboarding-input"
                  />
                </div>
              </div>

              <div className="onboarding-form-grid">
                <div className="onboarding-input-group">
                  <label className="onboarding-label">Academic Major / Department</label>
                  <input
                    type="text"
                    value={academicMajor}
                    onChange={e => setAcademicMajor(e.target.value)}
                    placeholder="e.g., Computer Science / English"
                    className="onboarding-input"
                  />
                </div>
                <div className="onboarding-input-group">
                  <label className="onboarding-label">Year of Study</label>
                  <select
                    value={yearOfStudy}
                    onChange={e => setYearOfStudy(e.target.value)}
                    className="onboarding-input"
                  >
                    <option value="">Select Year</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="Postgraduate">Postgraduate</option>
                    <option value="Research Scholar">Research Scholar</option>
                  </select>
                </div>
              </div>

              <div className="onboarding-input-group">
                <label className="onboarding-label">Bio / Headline</label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Tell campus readers about yourself or what topics you write about..."
                  className="onboarding-input onboarding-textarea"
                />
              </div>

              {/* Public Profile Privacy Toggle Switch */}
              <div className="onboarding-privacy-card">
                <div className="onboarding-privacy-info">
                  <div className="onboarding-privacy-title-row">
                    {isPublicProfile ? <FiEye size={18} color="var(--accent-color)" /> : <FiEyeOff size={18} color="var(--color-gray-400)" />}
                    <span className="onboarding-privacy-title">Public Student Profile</span>
                  </div>
                  <p className="onboarding-privacy-desc">
                    {isPublicProfile 
                      ? 'Visible to fellow students. Peers can view your profile badges, articles read, and public campus comments.' 
                      : 'Private profile. Your reading history and badges are hidden from other students across the platform.'}
                  </p>
                </div>
                <label className="onboarding-toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={isPublicProfile} 
                    onChange={e => setIsPublicProfile(e.target.checked)} 
                  />
                  <span className="onboarding-toggle-slider" />
                </label>
              </div>
            </div>
          )}

          {/* STEP 2: Content Recommendations (Optional) */}
          {step === 2 && (
            <div className="onboarding-step-content">
              <div className="onboarding-step-heading">
                <div className="onboarding-badge-optional">
                  <span>Optional</span>
                </div>
                <h3 className="onboarding-title">What are you curious about?</h3>
                <p className="onboarding-subtitle">
                  Select categories you want to see prioritized on your home feed. You can change these anytime.
                </p>
              </div>

              <div className="onboarding-topics-grid">
                {TOPICS.map(topic => {
                  const isSelected = selectedTopics.includes(topic.id);
                  return (
                    <div 
                      key={topic.id}
                      onClick={() => toggleTopic(topic.id)}
                      className={`onboarding-topic-card ${isSelected ? 'selected' : ''}`}
                    >
                      <div className="onboarding-topic-icon">{topic.icon}</div>
                      <div className="onboarding-topic-info">
                        <div className="onboarding-topic-label">{topic.label}</div>
                        <div className="onboarding-topic-desc">{topic.desc}</div>
                      </div>
                      <div className="onboarding-topic-checkbox">
                        {isSelected && <FiCheck size={14} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Appearance & Theme Mode */}
          {step === 3 && (
            <div className="onboarding-step-content">
              <div className="onboarding-step-heading">
                <h3 className="onboarding-title">Personalize Theme Mode</h3>
                <p className="onboarding-subtitle">
                  Choose your surface theme mode (Light, Light Dark, Pure Dark) with instant live preview.
                </p>
              </div>

              {/* Theme Mode Selector */}
              <div className="onboarding-section-block">
                <label className="onboarding-label">Theme Mode</label>
                <div className="onboarding-modes-grid">
                  <button 
                    type="button" 
                    onClick={() => handleThemeModeChange('light')}
                    className={`onboarding-mode-btn ${selectedTheme === 'light' ? 'active' : ''}`}
                  >
                    <FiSun size={18} />
                    <span className="onboarding-mode-title">Light</span>
                    <span className="onboarding-mode-desc">Paper finish</span>
                  </button>

                  <button 
                    type="button" 
                    onClick={() => handleThemeModeChange('dark')}
                    className={`onboarding-mode-btn ${selectedTheme === 'dark' ? 'active' : ''}`}
                  >
                    <FiMoon size={18} />
                    <span className="onboarding-mode-title">Light Dark</span>
                    <span className="onboarding-mode-desc">Classic slate</span>
                  </button>

                  <button 
                    type="button" 
                    onClick={() => handleThemeModeChange('black')}
                    className={`onboarding-mode-btn ${selectedTheme === 'black' ? 'active' : ''}`}
                  >
                    <IoContrast size={18} />
                    <span className="onboarding-mode-title">Pure Dark</span>
                    <span className="onboarding-mode-desc">OLED contrast</span>
                  </button>
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="onboarding-preview-container">
                <span className="onboarding-preview-label">Live Interface Preview</span>
                <div className="onboarding-preview-card">
                  <div className="onboarding-preview-card-header">
                    <span className="onboarding-preview-tag">SAMPLE ARTICLE</span>
                    <span className="onboarding-preview-date">Today</span>
                  </div>
                  <h4 className="onboarding-preview-title">Student Press Redefines Campus Journalism</h4>
                  <p className="onboarding-preview-lead">Experience news with high-contrast surfaces, readable typography, and dynamic accent styling.</p>
                  <div className="onboarding-preview-footer">
                    <button type="button" className="onboarding-preview-btn">Read Story →</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Interactive Feature Tour */}
          {step === 4 && (
            <div className="onboarding-step-content">
              <div className="onboarding-step-heading">
                <h3 className="onboarding-title">Platform Features Walkthrough</h3>
                <p className="onboarding-subtitle">
                  Here are 4 core features designed to empower student voices across campus.
                </p>
              </div>

              <div className="onboarding-tour-showcase">
                <div className="onboarding-tour-tabs">
                  {[
                    { id: 0, title: 'Bottom Dock', icon: <FiCompass size={16} /> },
                    { id: 1, title: 'Student Chat', icon: <FiMessageSquare size={16} /> },
                    { id: 2, title: 'Alerts Hub', icon: <FiBell size={16} /> },
                    { id: 3, title: 'Publishing Studio', icon: <FiEdit3 size={16} /> },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setTutorialIndex(tab.id)}
                      className={`onboarding-tour-tab-btn ${tutorialIndex === tab.id ? 'active' : ''}`}
                    >
                      {tab.icon}
                      <span>{tab.title}</span>
                    </button>
                  ))}
                </div>

                <div className="onboarding-tour-card">
                  {tutorialIndex === 0 && (
                    <div className="onboarding-tour-pane">
                      <div className="onboarding-tour-icon-bubble">
                        <FiCompass size={32} color="var(--accent-color)" />
                      </div>
                      <h4 className="onboarding-tour-pane-title">Floating Navigation Dock & Search</h4>
                      <p className="onboarding-tour-pane-desc">
                        Our floating hardware capsule sits smoothly at the bottom of your screen. 
                        Tap the search icon to instantly query articles and tags, or switch categories effortlessly.
                      </p>
                      <div className="onboarding-tour-demo-pill">
                        <span>Home</span>
                        <span>Trend</span>
                        <span>Recent</span>
                        <span className="demo-search-icon"><FiSearch size={14} /></span>
                      </div>
                    </div>
                  )}

                  {tutorialIndex === 1 && (
                    <div className="onboarding-tour-pane">
                      <div className="onboarding-tour-icon-bubble">
                        <FiMessageSquare size={32} color="var(--accent-color)" />
                      </div>
                      <h4 className="onboarding-tour-pane-title">Campus Live Chat & Topic Rooms</h4>
                      <p className="onboarding-tour-pane-desc">
                        Engage in live student channels: discuss breaking news, debate op-eds, 
                        quote messages, share reactions, and connect with fellow writers.
                      </p>
                      <div className="onboarding-tour-demo-chat">
                        <div className="demo-chat-msg">
                          <strong>@editor_arun:</strong> Check out the latest student senate budget coverage!
                        </div>
                      </div>
                    </div>
                  )}

                  {tutorialIndex === 2 && (
                    <div className="onboarding-tour-pane">
                      <div className="onboarding-tour-icon-bubble">
                        <FiBell size={32} color="var(--accent-color)" />
                      </div>
                      <h4 className="onboarding-tour-pane-title">Notification Assist & Hub</h4>
                      <p className="onboarding-tour-pane-desc">
                        Organized categorically into Announcements, Critical Alerts, Notice Boards, 
                        and Chat Mentions. Never miss an urgent university update.
                      </p>
                      <div className="onboarding-tour-demo-badge">
                        <span>📢 Campus Broadcast</span>
                        <span>⚡ 2 Unread Notices</span>
                      </div>
                    </div>
                  )}

                  {tutorialIndex === 3 && (
                    <div className="onboarding-tour-pane">
                      <div className="onboarding-tour-icon-bubble">
                        <FiEdit3 size={32} color="var(--accent-color)" />
                      </div>
                      <h4 className="onboarding-tour-pane-title">Student Editorial Publishing Studio</h4>
                      <p className="onboarding-tour-pane-desc">
                        Have an important story to tell? Use the quick publish modal or author studio 
                        to write articles, upload media, and submit for peer review.
                      </p>
                      <div className="onboarding-tour-demo-publish">
                        <span>✍️ Draft New Story →</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Ready & Celebration */}
          {step === 5 && (
            <div className="onboarding-step-content celebration-step">
              <div className="onboarding-celebration-badge">
                <IoSparkles size={42} color="var(--accent-color)" />
              </div>
              <h3 className="onboarding-title">You're All Set, {firstName || user?.username || 'Student'}!</h3>
              <p className="onboarding-subtitle">
                Your profile is tailored, recommendations are tuned, and your theme engine is active.
              </p>

              <div className="onboarding-summary-box">
                <div className="onboarding-summary-row">
                  <span className="onboarding-summary-key">Profile Visibility</span>
                  <span className="onboarding-summary-val">{isPublicProfile ? '🌐 Public Student Profile' : '🔒 Private Profile'}</span>
                </div>
                <div className="onboarding-summary-row">
                  <span className="onboarding-summary-key">Selected Topics</span>
                  <span className="onboarding-summary-val">
                    {selectedTopics.length > 0 ? `${selectedTopics.length} preferred categories` : 'Default campus feed'}
                  </span>
                </div>
                <div className="onboarding-summary-row">
                  <span className="onboarding-summary-key">Theme Preference</span>
                  <span className="onboarding-summary-val">
                    {selectedTheme.toUpperCase()} • {selectedEngine === 'expressive' ? 'M3 Expressive' : 'Default Engine'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="onboarding-footer">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              disabled={saving}
              className="onboarding-back-btn"
            >
              <FiArrowLeft size={16} />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          <div className="onboarding-footer-actions">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(3)}
                className="onboarding-skip-btn"
              >
                Skip for now
              </button>
            )}

            {step < 5 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="onboarding-next-btn"
              >
                <span>Continue</span>
                <FiArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCompleteSetup}
                disabled={saving}
                className="onboarding-finish-btn"
              >
                <span>{saving ? 'Setting up...' : 'Enter Southern Waves →'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizardModal;
