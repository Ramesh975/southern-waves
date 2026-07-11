import React, { useState } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { FiX, FiCamera, FiUser, FiShield, FiLock, FiAlertCircle, FiSend, FiCheckCircle, FiClock, FiCalendar, FiSettings, FiTrash2, FiPlus } from 'react-icons/fi';

const CATEGORIES = [
  { id: 'news', label: 'News' },
  { id: 'editorial', label: 'Editorial' },
  { id: 'features', label: 'Features' },
  { id: 'kyp', label: 'Know Our Past' },
  { id: 'tea-shop', label: 'Tea Shop' },
  { id: 'pictures-speak', label: 'Pictures Speak' }
];

const AccountSettingsModal = ({ user, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState(user?.isBlocked ? 'status' : 'profile'); // 'profile' | 'recommendations' | 'status'
  
  // Profile settings state
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [university, setUniversity] = useState(user?.university || '');
  const [academicMajor, setAcademicMajor] = useState(user?.academicMajor || '');
  const [yearOfStudy, setYearOfStudy] = useState(user?.yearOfStudy || 'Freshman');
  
  // Recommendation settings state
  const [preferredCategories, setPreferredCategories] = useState(user?.recommendationSettings?.preferredCategories || []);
  const [preferredTags, setPreferredTags] = useState(user?.recommendationSettings?.preferredTags || []);
  const [customTagInput, setCustomTagInput] = useState('');

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
  const [saving, setSaving] = useState(false);

  // Appeal settings state
  const [appealText, setAppealText] = useState('');
  const [appealing, setAppealing] = useState(false);
  const [appealDone, setAppealDone] = useState(user?.appealRequested || false);

  const blockedUntil = user?.blockedUntil ? new Date(user.blockedUntil) : null;
  const isExpired = blockedUntil && new Date() > blockedUntil;
  const isIndefinite = !blockedUntil;

  const getDurationText = () => {
    if (isIndefinite) return 'Indefinitely';
    const diff = blockedUntil - new Date();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days !== 1 ? 's' : ''} remaining`;
    }
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes} minutes remaining`;
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First and Last name cannot be empty');
      return;
    }
    if (!university.trim()) {
      toast.error('University/College cannot be empty');
      return;
    }
    if (!phone.trim()) {
      toast.error('Phone number cannot be empty');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('firstName', firstName.trim());
      formData.append('lastName', lastName.trim());
      formData.append('bio', bio.trim());
      formData.append('phone', phone.trim());
      formData.append('university', university.trim());
      formData.append('academicMajor', academicMajor);
      formData.append('yearOfStudy', yearOfStudy);
      formData.append('recommendationSettings', JSON.stringify({
        preferredCategories,
        preferredTags
      }));
      
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      await authAPI.updateProfile(formData);
      toast.success('Settings updated successfully!');
      if (onSuccess) await onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAppealSubmit = async (e) => {
    e.preventDefault();
    if (!appealText.trim()) return toast.error('Please write an appeal statement.');
    setAppealing(true);
    try {
      await authAPI.submitAppeal(appealText.trim());
      setAppealDone(true);
      toast.success('Appeal submitted successfully.');
      if (onSuccess) await onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit appeal.');
    } finally {
      setAppealing(false);
    }
  };

  const toggleCategory = (id) => {
    setPreferredCategories(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleAddTag = (e) => {
    e.preventDefault();
    const clean = customTagInput.toLowerCase().trim().replace(/#/g, '');
    if (!clean) return;
    if (preferredTags.includes(clean)) {
      toast.error('Tag already added');
    } else {
      setPreferredTags(prev => [...prev, clean]);
      setCustomTagInput('');
    }
  };

  const handleRemoveTag = (tag) => {
    setPreferredTags(prev => prev.filter(t => t !== tag));
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeInOverlay 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-bg, var(--color-white, #fff))',
          border: '2px solid var(--color-black)',
          borderRadius: '12px',
          padding: '24px 32px',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
          margin: '0 16px',
          boxShadow: '8px 8px 0 var(--color-black)',
          animation: 'slideUpModal 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-black)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
            borderRadius: '50%',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.target.style.background = 'rgba(0,0,0,0.05)')}
          onMouseLeave={(e) => (e.target.style.background = 'none')}
        >
          <FiX size={20} />
        </button>

        {/* Title */}
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '20px',
            fontWeight: 800,
            textAlign: 'center',
            textTransform: 'uppercase',
            marginBottom: '20px',
            color: 'var(--color-black)',
          }}
        >
          Account Settings
        </h2>

        {/* Tab Selection */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--color-gray-200)',
          marginBottom: '24px',
          gap: '12px'
        }}>
          <button
            onClick={() => setActiveTab('profile')}
            style={{
              flex: 1, padding: '10px 0', border: 'none', background: 'none',
              fontSize: '12px', fontWeight: 700, cursor: 'pointer',
              color: activeTab === 'profile' ? 'var(--accent-color, #0055a4)' : 'var(--color-gray-500)',
              borderBottom: activeTab === 'profile' ? '2.5px solid var(--accent-color, #0055a4)' : '2.5px solid transparent',
              transition: 'all 0.15s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            <FiUser size={13} /> Profile
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            style={{
              flex: 1.2, padding: '10px 0', border: 'none', background: 'none',
              fontSize: '12px', fontWeight: 700, cursor: 'pointer',
              color: activeTab === 'recommendations' ? 'var(--accent-color, #0055a4)' : 'var(--color-gray-500)',
              borderBottom: activeTab === 'recommendations' ? '2.5px solid var(--accent-color, #0055a4)' : '2.5px solid transparent',
              transition: 'all 0.15s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            <FiSettings size={13} /> Feed Preferences
          </button>
          <button
            onClick={() => setActiveTab('status')}
            style={{
              flex: 0.9, padding: '10px 0', border: 'none', background: 'none',
              fontSize: '12px', fontWeight: 700, cursor: 'pointer',
              color: activeTab === 'status' ? 'var(--color-red)' : 'var(--color-gray-500)',
              borderBottom: activeTab === 'status' ? '2.5px solid var(--color-red)' : '2.5px solid transparent',
              transition: 'all 0.15s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            <FiShield size={13} /> Status
            {user?.isBlocked && (
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: 'var(--color-red)', display: 'inline-block'
              }} />
            )}
          </button>
        </div>

        {/* Tab 1: Profile Settings */}
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Avatar Upload */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '3px solid var(--accent-color, #0055a4)',
                    background: 'var(--color-gray-100)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <FiUser size={36} color="var(--color-gray-400)" />
                  )}
                </div>
                <label
                  htmlFor="settings-avatar-upload"
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    background: 'var(--accent-color, #0055a4)',
                    color: 'white',
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    border: '2px solid var(--color-white)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  }}
                >
                  <FiCamera size={13} />
                  <input
                    id="settings-avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
              <span style={{ fontSize: '10px', color: 'var(--color-gray-500)', fontWeight: 600 }}>Change Photo</span>
            </div>

            {/* First & Last Name */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-gray-600)' }}>First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  style={{
                    padding: '10px',
                    border: '2px solid var(--color-black)',
                    borderRadius: '4px',
                    fontSize: '13px',
                    background: 'var(--color-white)',
                    color: 'var(--color-black)',
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-gray-600)' }}>Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  style={{
                    padding: '10px',
                    border: '2px solid var(--color-black)',
                    borderRadius: '4px',
                    fontSize: '13px',
                    background: 'var(--color-white)',
                    color: 'var(--color-black)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Phone & University */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-gray-600)' }}>Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  style={{
                    padding: '10px',
                    border: '2px solid var(--color-black)',
                    borderRadius: '4px',
                    fontSize: '13px',
                    background: 'var(--color-white)',
                    color: 'var(--color-black)',
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-gray-600)' }}>University</label>
                <input
                  type="text"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  required
                  style={{
                    padding: '10px',
                    border: '2px solid var(--color-black)',
                    borderRadius: '4px',
                    fontSize: '13px',
                    background: 'var(--color-white)',
                    color: 'var(--color-black)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Major & Year */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-gray-600)' }}>Major</label>
                <select
                  value={academicMajor}
                  onChange={(e) => setAcademicMajor(e.target.value)}
                  required
                  style={{
                    padding: '10px',
                    border: '2px solid var(--color-black)',
                    borderRadius: '4px',
                    fontSize: '13px',
                    background: 'var(--color-white)',
                    color: 'var(--color-black)',
                    outline: 'none',
                    height: '38px'
                  }}
                >
                  <option value="">Select Major</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Business">Business</option>
                  <option value="Social Sciences">Social Sciences</option>
                  <option value="Sciences">Sciences</option>
                  <option value="Literature">Literature</option>
                  <option value="Medicine">Medicine</option>
                  <option value="Arts">Arts</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-gray-600)' }}>Year of Study</label>
                <select
                  value={yearOfStudy}
                  onChange={(e) => setYearOfStudy(e.target.value)}
                  required
                  style={{
                    padding: '10px',
                    border: '2px solid var(--color-black)',
                    borderRadius: '4px',
                    fontSize: '13px',
                    background: 'var(--color-white)',
                    color: 'var(--color-black)',
                    outline: 'none',
                    height: '38px'
                  }}
                >
                  <option value="Freshman">Freshman</option>
                  <option value="Sophomore">Sophomore</option>
                  <option value="Junior">Junior</option>
                  <option value="Senior">Senior</option>
                  <option value="Postgraduate">Postgraduate</option>
                </select>
              </div>
            </div>

            {/* Bio Field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-gray-600)' }}>Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={2}
                maxLength={300}
                style={{
                  padding: '10px',
                  border: '2px solid var(--color-black)',
                  borderRadius: '4px',
                  fontSize: '13px',
                  background: 'var(--color-white)',
                  color: 'var(--color-black)',
                  outline: 'none',
                  resize: 'none',
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1, padding: '10px', background: 'transparent',
                  border: '2px solid var(--color-gray-300)', borderRadius: '4px',
                  fontWeight: 700, fontSize: '13px', cursor: 'pointer', color: 'var(--color-gray-700)',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  flex: 1, padding: '10px', background: 'var(--color-black)',
                  border: '2px solid var(--color-black)', borderRadius: '4px',
                  fontWeight: 700, fontSize: '13px', cursor: 'pointer', color: '#fff',
                }}
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Recommendation Preferences */}
        {activeTab === 'recommendations' && (
          <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Preferred Categories */}
            <div>
              <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-gray-600)', display: 'block', marginBottom: '8px' }}>
                Preferred Sections
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                background: 'rgba(0,0,0,0.02)',
                padding: '12px',
                border: '2px solid var(--color-black)',
                borderRadius: '6px'
              }}>
                {CATEGORIES.map(cat => {
                  const isChecked = preferredCategories.includes(cat.id);
                  return (
                    <label key={cat.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: 'var(--color-black)'
                    }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCategory(cat.id)}
                        style={{ accentColor: 'var(--accent-color, #0055a4)' }}
                      />
                      {cat.label}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Preferred Tags */}
            <div>
              <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-gray-600)', display: 'block', marginBottom: '4px' }}>
                Interest Topics
              </label>
              
              {/* Tag pool display */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                minHeight: '40px',
                padding: '8px 10px',
                border: '2px solid var(--color-black)',
                borderRadius: '4px',
                background: 'var(--color-white)',
                marginBottom: '8px'
              }}>
                {preferredTags.length > 0 ? (
                  preferredTags.map(tag => (
                    <span 
                      key={tag} 
                      style={{
                        background: '#000',
                        color: '#fff',
                        borderRadius: '16px',
                        padding: '3px 10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        style={{
                          background: 'none', border: 'none', color: '#fff', 
                          cursor: 'pointer', fontSize: '10px', display: 'flex', padding: 0
                        }}
                      >
                        <FiX size={10} />
                      </button>
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--color-gray-400)', alignSelf: 'center' }}>
                    No custom topics added yet.
                  </span>
                )}
              </div>

              {/* Add Tag Input */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="e.g. sports, exam-tips"
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '2px solid var(--color-black)',
                    borderRadius: '4px',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  style={{
                    background: '#fff',
                    border: '2px solid var(--color-black)',
                    borderRadius: '4px',
                    padding: '0 12px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px'
                  }}
                >
                  <FiPlus size={14} /> Add
                </button>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1, padding: '10px', background: 'transparent',
                  border: '2px solid var(--color-gray-300)', borderRadius: '4px',
                  fontWeight: 700, fontSize: '13px', cursor: 'pointer', color: 'var(--color-gray-700)',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  flex: 1, padding: '10px', background: 'var(--color-black)',
                  border: '2px solid var(--color-black)', borderRadius: '4px',
                  fontWeight: 700, fontSize: '13px', cursor: 'pointer', color: '#fff',
                }}
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Account Status & Appeal */}
        {activeTab === 'status' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {user?.isBlocked ? (
              <>
                {/* Restriction Info */}
                <div style={{
                  background: 'rgba(239, 68, 68, 0.04)',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  borderRadius: '8px',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-red)', fontWeight: 700, fontSize: '14px' }}>
                    <FiLock size={16} /> Restricted Mode Active
                  </div>
                  
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-gray-500)', display: 'block', marginBottom: '3px' }}>Reason</span>
                    <p style={{ fontSize: '13.5px', color: 'var(--color-black)', margin: 0, lineHeight: 1.4 }}>
                      {user.blockedReason || 'Violation of community safety guidelines.'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--color-gray-200)', paddingTop: '10px' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-gray-500)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <FiCalendar size={10} /> Release Date
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-black)' }}>
                        {isIndefinite ? 'Permanent' : blockedUntil?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    {!isIndefinite && (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-gray-500)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <FiClock size={10} /> Remaining
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: isExpired ? '#22c55e' : '#fbbf24' }}>
                          {isExpired ? 'Expired' : getDurationText()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Appeal Area */}
                {appealDone ? (
                  <div style={{
                    background: 'rgba(34, 197, 94, 0.04)',
                    border: '1px solid rgba(34, 197, 94, 0.15)',
                    borderRadius: '8px', padding: '16px',
                    textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px'
                  }}>
                    <FiCheckCircle size={22} color="#22c55e" />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#22c55e' }}>Appeal Under Review</span>
                    <p style={{ fontSize: '12px', color: 'var(--color-gray-500)', margin: 0, lineHeight: 1.4 }}>
                      Your statement of appeal is currently being reviewed by the content moderation board.
                    </p>
                  </div>
                ) : (
                  <div>
                    <h3 style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-gray-600)', marginBottom: '8px', letterSpacing: '0.5px' }}>
                      Submit Appeal Statement
                    </h3>
                    <form onSubmit={handleAppealSubmit}>
                      <textarea
                        value={appealText}
                        onChange={(e) => setAppealText(e.target.value)}
                        placeholder="Provide details on mitigating circumstances or clarify why you believe restrictions should be lifted..."
                        rows={3}
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          background: 'var(--color-white)',
                          border: '2px solid var(--color-black)',
                          borderRadius: '4px', padding: '10px 12px',
                          color: 'var(--color-black)', fontSize: '13px', lineHeight: 1.5,
                          resize: 'none', outline: 'none',
                          fontFamily: 'inherit',
                          transition: 'all 0.15s ease',
                        }}
                      />
                      <button
                        type="submit"
                        disabled={appealing || !appealText.trim()}
                        style={{
                          marginTop: '10px', width: '100%', padding: '11px',
                          background: 'var(--color-black)',
                          border: '2px solid var(--color-black)',
                          borderRadius: '4px', color: '#ffffff',
                          fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                          opacity: (!appealText.trim() || appealing) ? 0.5 : 1,
                        }}
                      >
                        <FiSend size={13} /> {appealing ? 'Submitting...' : 'Submit Statement'}
                      </button>
                    </form>
                  </div>
                )}
              </>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '30px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}>
                <FiCheckCircle size={44} color="#22c55e" />
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-black)', margin: '0 0 4px 0' }}>Account is Active</h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--color-gray-500)', margin: 0, lineHeight: 1.5 }}>
                    Your account is in good standing. Thank you for contributing to a positive and constructive discussion space on Southern Waves! 🌊
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={onClose}
              style={{
                width: '100%',
                padding: '12px',
                background: 'transparent',
                border: '2px solid var(--color-black)',
                borderRadius: '4px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                color: 'var(--color-black)',
                marginTop: '10px',
              }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountSettingsModal;
