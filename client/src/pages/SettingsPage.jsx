import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authAPI, filterAPI } from '../services/api';
import toast from 'react-hot-toast';
import { 
  FiUser, FiSliders, FiSun, FiMoon, FiShield, FiAlertOctagon, 
  FiEdit3, FiSettings, FiCamera, FiPlus, FiTrash2, FiSearch, 
  FiCheck, FiSend, FiClock, FiCalendar, FiAlertTriangle, 
  FiCheckCircle, FiUnlock, FiLock, FiInfo, FiHash, FiPhone, FiBookOpen,
  FiChevronRight, FiArrowLeft, FiEye, FiEyeOff, FiX, FiKey
} from 'react-icons/fi';
import { IoContrast } from 'react-icons/io5';
import { useLocation, useNavigate } from 'react-router-dom';
import { getImageUrl } from '../components/ArticleComponents';
import './SettingsPage.css';

const SECTIONS = [
  { id: 'news', label: 'News', icon: '📰', desc: 'Campus issues, student initiatives' },
  { id: 'editorial', label: 'Editorial', icon: '✍️', desc: 'In-depth reviews and opinion pieces' },
  { id: 'features', label: 'Features', icon: '🎬', desc: 'Art reviews, culture, human interest' },
  { id: 'kyp', label: 'Know Your Past', icon: '📖', desc: 'Historical movements and archives' },
  { id: 'tea-shop', label: 'Tea Shop', icon: '☕', desc: 'University circulars and student vibes' },
  { id: 'pictures-speak', label: 'Pictures Speak', icon: '📷', desc: 'Narrative storytelling through photos' }
];

const FILTER_CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'profanity', label: '🤬 Profanity' },
  { value: 'hate-speech', label: '☠️ Hate Speech' },
  { value: 'scam', label: '⚠️ Scam' },
  { value: 'cyberbullying', label: '🚫 Cyberbullying' },
  { value: 'spam', label: '📢 Spam' },
];

const BLOCK_DURATIONS = [
  { label: '1 Hour', value: '1' },
  { label: '6 Hours', value: '6' },
  { label: '12 Hours', value: '12' },
  { label: '1 Day', value: '24' },
  { label: '3 Days', value: '72' },
  { label: '7 Days', value: '168' },
  { label: '30 Days', value: '720' },
  { label: 'Indefinite', value: 'forever' },
];

const ToggleSwitch = ({ checked, onChange, activeColor = 'var(--accent-color)', disabled = false }) => {
  return (
    <div 
      onClick={() => !disabled && onChange()}
      style={{
        width: '46px',
        height: '24px',
        borderRadius: '100px',
        background: checked ? activeColor : 'var(--color-gray-300)',
        padding: '3px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: disabled ? 0.5 : 1,
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)'
      }}
    >
      <div style={{
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        background: '#ffffff',
        boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
        transform: checked ? 'translateX(22px)' : 'translateX(0)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }} />
    </div>
  );
};
const IOSSwitch = ToggleSwitch;

const SettingsPage = () => {
  const { user, refreshUser, isBlocked, isAdmin, isModerator, isEditor, changePassword, deactivateAccount, switchAccount } = useAuth();
  const { theme, setTheme, styleMode, setStyleMode } = useTheme();
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Deactivation state
  const [deactivatePassword, setDeactivatePassword] = useState('');
  const [deactivateReason, setDeactivateReason] = useState('');
  const [deactivating, setDeactivating] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  // Security Questions State & Password Confirmation Modal
  const [sq1, setSq1] = useState(user?.securityQuestions?.[0]?.question || "What was the name of your first pet?");
  const [sq2, setSq2] = useState(user?.securityQuestions?.[1]?.question || "What is your mother's maiden name?");
  const [sa1, setSa1] = useState('');
  const [sa2, setSa2] = useState('');
  const [showSa1, setShowSa1] = useState(false);
  const [showSa2, setShowSa2] = useState(false);
  const [secAuthModalOpen, setSecAuthModalOpen] = useState(false);
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [updatingSecQ, setUpdatingSecQ] = useState(false);

  useEffect(() => {
    if (user?.securityQuestions && user.securityQuestions.length >= 2) {
      setSq1(user.securityQuestions[0].question);
      setSq2(user.securityQuestions[1].question);
    }
  }, [user]);
  
  const location = useLocation();
  const navigate = useNavigate();

  // Get active tab from URL query params
  const getQueryTab = () => {
    const params = new URLSearchParams(location.search);
    return params.get('tab') || 'menu';
  };

  const [activeTab, setActiveTab] = useState(getQueryTab());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);

  // Validation errors state
  const [errors, setErrors] = useState({});

  // Resize listener
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 900);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync tab active selection with router path
  useEffect(() => {
    const currentTab = getQueryTab();
    setActiveTab(currentTab);
    setErrors({}); // Clear errors when switching tabs
  }, [location.search]);

  // Desktop default redirect
  useEffect(() => {
    if (!isMobile && (activeTab === 'menu' || !activeTab)) {
      navigate('/settings?tab=profile', { replace: true });
    }
  }, [isMobile, activeTab, navigate]);

  const handleTabChange = (tabId) => {
    navigate(`/settings?tab=${tabId}`);
  };

  // Helper to remove individual validation errors on input change
  const clearError = (field) => {
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // ==========================================
  // STATE 1: Profile Settings
  // ==========================================
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [age, setAge] = useState(user?.age || '');
  const [gender, setGender] = useState(user?.gender || 'male');
  const [educationLevel, setEducationLevel] = useState(user?.educationLevel || 'Undergraduate Degree');
  const [showRealNamePublicly, setShowRealNamePublicly] = useState(!!user?.showRealNamePublicly);
  const [bio, setBio] = useState(user?.bio || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [university, setUniversity] = useState(user?.university || '');
  const [academicMajor, setAcademicMajor] = useState(user?.academicMajor || '');
  const [yearOfStudy, setYearOfStudy] = useState(user?.yearOfStudy || 'Freshman');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Sync profile details if user updates in background
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setUsername(user.username || '');
      setAge(user.age || '');
      setGender(user.gender || 'male');
      setEducationLevel(user.educationLevel || 'Undergraduate Degree');
      setShowRealNamePublicly(!!user.showRealNamePublicly);
      setBio(user.bio || '');
      setPhone(user.phone || '');
      setUniversity(user.university || '');
      setAcademicMajor(user.academicMajor || '');
      setYearOfStudy(user.yearOfStudy || 'Freshman');
      setAvatarPreview(user.avatar || '');
    }
  }, [user]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB');
        return;
      }
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Only image files are allowed');
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  // Profile Form Validation
  const validateProfileForm = () => {
    const newErrors = {};

    // First Name checks
    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (firstName.length < 2) {
      newErrors.firstName = 'Must be at least 2 characters';
    } else if (firstName.length > 50) {
      newErrors.firstName = 'Must be under 50 characters';
    } else if (!/^[A-Za-z\s'-]+$/.test(firstName.trim())) {
      newErrors.firstName = 'Letters, spaces, hyphens, apostrophes only';
    }

    // Last Name checks
    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (lastName.length < 1) {
      newErrors.lastName = 'Must be at least 1 character';
    } else if (lastName.length > 50) {
      newErrors.lastName = 'Must be under 50 characters';
    } else if (!/^[A-Za-z\s'-]+$/.test(lastName.trim())) {
      newErrors.lastName = 'Letters, spaces, hyphens, apostrophes only';
    }

    // Biography checks
    if (bio.trim() && bio.length > 300) {
      newErrors.bio = 'Biography cannot exceed 300 characters';
    }

    // Phone checks
    const cleanedPhone = phone.replace(/\s+/g, '');
    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[0-9-]{7,15}$/.test(cleanedPhone)) {
      newErrors.phone = 'Invalid format (7-15 digits, optional "+" prefix)';
    }

    // University checks
    if (!university.trim()) {
      newErrors.university = 'University/College is required';
    } else if (university.trim().length < 3) {
      newErrors.university = 'University name must be at least 3 characters';
    } else if (university.length > 100) {
      newErrors.university = 'University name cannot exceed 100 characters';
    }

    // Academic Major check
    if (!academicMajor) {
      newErrors.academicMajor = 'Please select your academic major';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!validateProfileForm()) {
      toast.error('Please correct the validation errors in your profile settings');
      return;
    }

    setSavingProfile(true);
    try {
      const formData = new FormData();
      formData.append('firstName', firstName.trim());
      formData.append('lastName', lastName.trim());
      formData.append('username', username.trim());
      formData.append('age', age ? String(age) : '');
      formData.append('gender', gender);
      formData.append('educationLevel', educationLevel);
      formData.append('showRealNamePublicly', showRealNamePublicly ? 'true' : 'false');
      formData.append('bio', bio.trim());
      formData.append('phone', phone.trim());
      formData.append('university', university.trim());
      formData.append('academicMajor', academicMajor);
      formData.append('yearOfStudy', yearOfStudy);
      
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      await authAPI.updateProfile(formData);
      await refreshUser();
      toast.success('Profile settings updated successfully!');
      if (isMobile) {
        handleTabChange('menu');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update settings');
    } finally {
      setSavingProfile(false);
    }
  };

  // ==========================================
  // STATE 2: Feed Preferences / Recommendation Settings
  // ==========================================
  const [preferredCategories, setPreferredCategories] = useState(user?.recommendationSettings?.preferredCategories || []);
  const [preferredTags, setPreferredTags] = useState(user?.recommendationSettings?.preferredTags || []);
  const [customTagInput, setCustomTagInput] = useState('');
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    if (user?.recommendationSettings) {
      setPreferredCategories(user.recommendationSettings.preferredCategories || []);
      setPreferredTags(user.recommendationSettings.preferredTags || []);
    }
  }, [user]);

  const toggleCategory = (id) => {
    setPreferredCategories(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
    clearError('preferredCategories');
  };

  const handleAddTag = (e) => {
    e.preventDefault();
    const clean = customTagInput.toLowerCase().trim().replace(/#/g, '');
    
    // Tag validation rules
    if (!clean) return;
    if (clean.length < 2) {
      setErrors(prev => ({ ...prev, customTagInput: 'Tag must be at least 2 characters' }));
      return;
    }
    if (clean.length > 25) {
      setErrors(prev => ({ ...prev, customTagInput: 'Tag cannot exceed 25 characters' }));
      return;
    }
    if (!/^[a-z0-9-]+$/.test(clean)) {
      setErrors(prev => ({ ...prev, customTagInput: 'Alphanumeric letters, numbers, and hyphens only' }));
      return;
    }

    if (preferredTags.includes(clean)) {
      toast.error('Tag already added');
    } else {
      setPreferredTags(prev => [...prev, clean]);
      setCustomTagInput('');
      clearError('customTagInput');
    }
  };

  const handleRemoveTag = (tag) => {
    setPreferredTags(prev => prev.filter(t => t !== tag));
  };

  const handlePrefsSubmit = async (e) => {
    e.preventDefault();
    
    // Validate preferred categories count
    if (preferredCategories.length === 0) {
      setErrors(prev => ({ ...prev, preferredCategories: 'Please choose at least one preferred section.' }));
      toast.error('Please choose at least one preferred feed category');
      return;
    }

    setSavingPrefs(true);
    try {
      await authAPI.updateProfile({
        recommendationSettings: {
          preferredCategories,
          preferredTags
        }
      });
      await refreshUser();
      toast.success('Recommendation settings saved!');
      if (isMobile) {
        handleTabChange('menu');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to save feed preferences.');
    } finally {
      setSavingPrefs(false);
    }
  };

  // ==========================================
  // STATE 3: Standing & Appeals
  // ==========================================
  const [appealText, setAppealText] = useState('');
  const [appealing, setAppealing] = useState(false);
  const [appealDone, setAppealDone] = useState(user?.appealRequested || false);

  useEffect(() => {
    if (user) {
      setAppealDone(user.appealRequested || false);
    }
  }, [user]);

  const handleAppealSubmit = async (e) => {
    e.preventDefault();
    
    // Validate appeal statement length
    const cleanAppeal = appealText.trim();
    if (!cleanAppeal) {
      setErrors(prev => ({ ...prev, appealText: 'Appeal description is required' }));
      return;
    }
    if (cleanAppeal.length < 20) {
      setErrors(prev => ({ ...prev, appealText: 'Please write a substantial appeal (minimum 20 characters)' }));
      return;
    }
    if (cleanAppeal.length > 1000) {
      setErrors(prev => ({ ...prev, appealText: 'Appeal description cannot exceed 1000 characters' }));
      return;
    }

    setAppealing(true);
    try {
      await authAPI.submitAppeal(cleanAppeal);
      setAppealDone(true);
      toast.success('Appeal submitted successfully under review!');
      await refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit appeal.');
    } finally {
      setAppealing(false);
    }
  };

  const generateSettingsStrongPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%&*';
    let pwd = '';
    pwd += 'ABCDEFGHJKMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)];
    pwd += 'abcdefghjkmnpqrstuvwxyz'[Math.floor(Math.random() * 24)];
    pwd += '23456789'[Math.floor(Math.random() * 8)];
    pwd += '!@#$%&*'[Math.floor(Math.random() * 7)];
    for (let i = 4; i < 14; i++) {
      pwd += chars[Math.floor(Math.random() * chars.length)];
    }
    pwd = pwd.split('').sort(() => 0.5 - Math.random()).join('');
    setNewPassword(pwd);
    setConfirmNewPassword(pwd);
    setShowNewPassword(true);
    setShowConfirmNewPassword(true);
    toast.success('Generated strong password! 🔐');
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword) return toast.error('Please enter your current password');
    if (!newPassword || newPassword.length < 6) return toast.error('New password must be at least 6 characters');
    if (newPassword !== confirmNewPassword) return toast.error('New passwords do not match');

    setChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success('Password updated successfully! 🔒');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeactivateSubmit = async (e) => {
    e.preventDefault();
    if (!deactivatePassword) return toast.error('Please enter your password to confirm deactivation');

    setDeactivating(true);
    try {
      await deactivateAccount(deactivatePassword, deactivateReason);
      toast.success('Account deactivated. You have been signed out.');
      window.location.href = '/';
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate account');
    } finally {
      setDeactivating(false);
      setShowDeactivateModal(false);
    }
  };

  const blockedUntil = user?.blockedUntil ? new Date(user.blockedUntil) : null;
  const isIndefinite = !blockedUntil;

  // ==========================================
  // STATE 4: Content Moderation (Moderators/Admins)
  // ==========================================
  const [modTab, setModTab] = useState('words');
  const [filterWords, setFilterWords] = useState([]);
  const [activeFilterCat, setActiveFilterCat] = useState('all');
  const [wordSearchQuery, setWordSearchQuery] = useState('');
  const [loadingWords, setLoadingWords] = useState(false);

  // Custom filter word form
  const [newWordText, setNewWordText] = useState('');
  const [newWordCat, setNewWordCat] = useState('profanity');
  const [newWordSev, setNewWordSev] = useState('medium');
  const [addingWord, setAddingWord] = useState(false);

  // Blocked tags state
  const [blockedTags, setBlockedTags] = useState([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [newBlockedTagText, setNewBlockedTagText] = useState('');
  const [addingTag, setAddingTag] = useState(false);

  const fetchFilterWords = async () => {
    if (!isModerator) return;
    setLoadingWords(true);
    try {
      const params = {};
      if (activeFilterCat !== 'all') params.category = activeFilterCat;
      if (wordSearchQuery.trim()) params.search = wordSearchQuery.trim();
      const res = await filterAPI.getWords(params);
      setFilterWords(res.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load filter words');
    } finally {
      setLoadingWords(false);
    }
  };

  const fetchBlockedTags = async () => {
    if (!isModerator) return;
    setLoadingTags(true);
    try {
      const res = await filterAPI.getBlockedTags();
      setBlockedTags(res.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load blocked tags');
    } finally {
      setLoadingTags(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'moderation') {
      if (modTab === 'words') {
        fetchFilterWords();
      } else if (modTab === 'tags') {
        fetchBlockedTags();
      }
    }
  }, [activeTab, modTab, activeFilterCat]);

  const handleSearchWords = (e) => {
    e.preventDefault();
    fetchFilterWords();
  };

  const handleAddFilterWord = async (e) => {
    e.preventDefault();
    const wordClean = newWordText.trim();
    
    // Validate word entry
    if (!wordClean) {
      setErrors(prev => ({ ...prev, newWordText: 'Filter word or phrase is required' }));
      return;
    }
    if (wordClean.length < 2) {
      setErrors(prev => ({ ...prev, newWordText: 'Filter word must be at least 2 characters' }));
      return;
    }
    if (wordClean.length > 50) {
      setErrors(prev => ({ ...prev, newWordText: 'Filter phrase cannot exceed 50 characters' }));
      return;
    }
    if (!/^[A-Za-z0-9\s'-]+$/.test(wordClean)) {
      setErrors(prev => ({ ...prev, newWordText: 'Letters, numbers, spaces, hyphens only' }));
      return;
    }

    setAddingWord(true);
    try {
      const res = await filterAPI.addWord({
        word: wordClean,
        category: newWordCat,
        severity: newWordSev
      });
      setFilterWords(prev => [res.data.data, ...prev]);
      setNewWordText('');
      setErrors({});
      toast.success(`Word "${res.data.data.word}" added to moderation filters.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add filter word');
    } finally {
      setAddingWord(false);
    }
  };

  const handleToggleWord = async (word) => {
    try {
      const res = await filterAPI.updateWord(word._id, { isActive: !word.isActive });
      setFilterWords(prev => prev.map(w => w._id === word._id ? res.data.data : w));
      toast.success(`Filter word "${word.word}" ${res.data.data.isActive ? 'activated' : 'deactivated'}.`);
    } catch (err) {
      toast.error('Failed to toggle filter word');
    }
  };

  const handleDeleteWord = async (word) => {
    if (!word._id) return;
    if (!window.confirm(`Delete filter word "${word.word}"?`)) return;
    try {
      await filterAPI.deleteWord(word._id);
      setFilterWords(prev => prev.filter(w => w._id !== word._id));
      toast.success('Word removed from filters.');
    } catch (err) {
      toast.error('Failed to delete word');
    }
  };

  const handleAddBlockedTag = async (e) => {
    e.preventDefault();
    const tagClean = newBlockedTagText.trim().replace(/#/g, '');

    // Validate tag input
    if (!tagClean) {
      setErrors(prev => ({ ...prev, newBlockedTagText: 'Blocked hashtag is required' }));
      return;
    }
    if (tagClean.length < 2) {
      setErrors(prev => ({ ...prev, newBlockedTagText: 'Tag must be at least 2 characters' }));
      return;
    }
    if (tagClean.length > 30) {
      setErrors(prev => ({ ...prev, newBlockedTagText: 'Tag cannot exceed 30 characters' }));
      return;
    }
    if (!/^[a-zA-Z0-9-]+$/.test(tagClean)) {
      setErrors(prev => ({ ...prev, newBlockedTagText: 'Alphanumeric and hyphens only (no spaces or special chars)' }));
      return;
    }

    setAddingTag(true);
    try {
      const res = await filterAPI.addBlockedTag(tagClean);
      setBlockedTags(prev => [res.data.data, ...prev].sort((a,b) => a.tag.localeCompare(b.tag)));
      setNewBlockedTagText('');
      setErrors({});
      toast.success(`Hashtag #${res.data.data.tag} is now blocked.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to block tag');
    } finally {
      setAddingTag(false);
    }
  };

  const handleDeleteBlockedTag = async (tag) => {
    if (!window.confirm(`Unblock tag #${tag.tag}?`)) return;
    try {
      await filterAPI.deleteBlockedTag(tag._id);
      setBlockedTags(prev => prev.filter(t => t._id !== tag._id));
      toast.success(`Tag #${tag.tag} unblocked.`);
    } catch (err) {
      toast.error('Failed to unblock tag');
    }
  };

  // ==========================================
  // STATE 5: Editorial Settings (Editors/Admins)
  // ==========================================
  const [defaultPubStatus, setDefaultPubStatus] = useState(() => localStorage.getItem('sw_default_publish_status') || 'draft');
  const [editorInterface, setEditorInterface] = useState(() => localStorage.getItem('sw_editor_interface') || 'markdown');
  const [autoSaveInterval, setAutoSaveInterval] = useState(() => localStorage.getItem('sw_auto_save_interval') || '30');
  const [notifyAdminDraft, setNotifyAdminDraft] = useState(() => localStorage.getItem('sw_notify_admin_on_completion') === 'true');

  const handleSaveEditorial = (e) => {
    e.preventDefault();
    localStorage.setItem('sw_default_publish_status', defaultPubStatus);
    localStorage.setItem('sw_editor_interface', editorInterface);
    localStorage.setItem('sw_auto_save_interval', autoSaveInterval);
    localStorage.setItem('sw_notify_admin_on_completion', notifyAdminDraft ? 'true' : 'false');
    toast.success('Editorial preferences saved locally!');
    if (isMobile) {
      handleTabChange('menu');
    }
  };

  // ==========================================
  // STATE 6: Platform Settings (Admins Only)
  // ==========================================
  const [adminTab, setAdminTab] = useState('locks');
  
  // Platform Locks
  const [globalCommentLock, setGlobalCommentLock] = useState(false);
  const [globalChatLock, setGlobalChatLock] = useState(false);
  const [loadingLocks, setLoadingLocks] = useState(false);

  // User Manager
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilterRole, setUserFilterRole] = useState('all');
  const [userFilterStatus, setUserFilterStatus] = useState('all');

  // Inline Restrict Account Overlay state
  const [selectedUserToBlock, setSelectedUserToBlock] = useState(null);
  const [blockReasonText, setBlockReasonText] = useState('');
  const [blockDurationHours, setBlockDurationHours] = useState('24');
  const [submittingBlock, setSubmittingBlock] = useState(false);

  // Appeals list
  const [appealsList, setAppealsList] = useState([]);
  const [loadingAppeals, setLoadingAppeals] = useState(false);
  const [appealResponseText, setAppealResponseText] = useState({});
  const [resolvingAppealId, setResolvingAppealId] = useState(null);

  // Registration Governance Settings
  const [adminDefaultUniv, setAdminDefaultUniv] = useState('University of Madras');
  const [adminRestrictUniv, setAdminRestrictUniv] = useState(false);
  const [adminStrictPhone, setAdminStrictPhone] = useState(true);

  const fetchLocks = async () => {
    if (!isAdmin) return;
    setLoadingLocks(true);
    try {
      const res = await filterAPI.getSettings();
      if (res.data?.success) {
        setGlobalCommentLock(res.data.data.globalCommentLock || false);
        setGlobalChatLock(res.data.data.globalChatLock || false);
        setAdminDefaultUniv(res.data.data.defaultUniversity || 'University of Madras');
        setAdminRestrictUniv(!!res.data.data.restrictToDefaultUniversity);
        setAdminStrictPhone(res.data.data.strictIndianPhone !== undefined ? res.data.data.strictIndianPhone : true);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load global locks');
    } finally {
      setLoadingLocks(false);
    }
  };

  const handleSaveRegSettings = async () => {
    try {
      await filterAPI.updateSettings({
        defaultUniversity: adminDefaultUniv,
        restrictToDefaultUniversity: adminRestrictUniv,
        strictIndianPhone: adminStrictPhone,
      });
      toast.success('Registration settings updated!');
    } catch (err) {
      toast.error('Failed to update registration settings');
    }
  };

  const handleToggleLock = async (lockType, currentVal) => {
    if (!isAdmin) return;
    const newVal = !currentVal;
    
    // Set UI immediately
    if (lockType === 'comments') setGlobalCommentLock(newVal);
    else setGlobalChatLock(newVal);

    try {
      const res = await filterAPI.updateSettings({
        [lockType === 'comments' ? 'globalCommentLock' : 'globalChatLock']: newVal
      });
      if (res.data?.success) {
        toast.success(`Platform ${lockType} lock ${newVal ? 'ACTIVATED' : 'DEACTIVATED'}.`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update platform lock');
      // Revert UI on error
      if (lockType === 'comments') setGlobalCommentLock(currentVal);
      else setGlobalChatLock(currentVal);
    }
  };

  const fetchUsers = async () => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    try {
      const res = await authAPI.getAllUsers();
      setUsersList(res.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch user directory');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await authAPI.updateUserRole(userId, newRole);
      setUsersList(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
      toast.success('User role updated successfully.');
    } catch (err) {
      toast.error('Failed to update user role');
    }
  };

  const handleBlockUserSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserToBlock) return;
    
    // Validate restriction reason
    const reasonClean = blockReasonText.trim();
    if (!reasonClean) {
      setErrors(prev => ({ ...prev, blockReasonText: 'A violation reason is required' }));
      return;
    }
    if (reasonClean.length < 5) {
      setErrors(prev => ({ ...prev, blockReasonText: 'Please detail a valid reason (min 5 characters)' }));
      return;
    }
    if (reasonClean.length > 200) {
      setErrors(prev => ({ ...prev, blockReasonText: 'Reason detail must be under 200 characters' }));
      return;
    }

    setSubmittingBlock(true);
    try {
      await authAPI.blockUser(selectedUserToBlock._id, {
        reason: reasonClean,
        duration: blockDurationHours
      });
      toast.success(`${selectedUserToBlock.name} is now restricted.`);
      setSelectedUserToBlock(null);
      setBlockReasonText('');
      setErrors({});
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to restrict user');
    } finally {
      setSubmittingBlock(false);
    }
  };

  const handleUnblockUser = async (userObj) => {
    try {
      await authAPI.unblockUser(userObj._id);
      toast.success(`Restrictions lifted for ${userObj.name}.`);
      fetchUsers();
    } catch (err) {
      toast.error('Failed to unblock user');
    }
  };

  const fetchAppeals = async () => {
    if (!isAdmin) return;
    setLoadingAppeals(true);
    try {
      const res = await authAPI.getAppeals();
      setAppealsList(res.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load appeals');
    } finally {
      setLoadingAppeals(false);
    }
  };

  const handleResolveAppeal = async (userId, actionType) => {
    const note = appealResponseText[userId] || '';

    // Validate rejection note
    if (actionType === 'reject') {
      if (!note.trim()) {
        toast.error('A rejection response note is required');
        return;
      }
      if (note.trim().length < 10) {
        toast.error('Rejection response note must be at least 10 characters');
        return;
      }
      if (note.length > 500) {
        toast.error('Rejection response note cannot exceed 500 characters');
        return;
      }
    }

    setResolvingAppealId(`${userId}:${actionType}`);
    try {
      if (actionType === 'approve') {
        await authAPI.unblockUser(userId);
        toast.success('Appeal approved and restrictions lifted!');
      } else {
        await authAPI.rejectAppeal(userId, note.trim());
        toast.success('Appeal rejected and user suspension maintained.');
      }
      // Clear text
      setAppealResponseText(prev => ({ ...prev, [userId]: '' }));
      // Refresh
      fetchAppeals();
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error('Failed to resolve appeal');
    } finally {
      setResolvingAppealId(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'platform') {
      if (adminTab === 'locks') fetchLocks();
      else if (adminTab === 'users') fetchUsers();
      else if (adminTab === 'appeals') fetchAppeals();
    }
  }, [activeTab, adminTab]);

  // Search/Filter Users logic
  const filteredUsers = usersList.filter(u => {
    const query = userSearchQuery.toLowerCase().trim();
    const matchesSearch = !query || u.name?.toLowerCase().includes(query) || u.email?.toLowerCase().includes(query);
    const matchesRole = userFilterRole === 'all' || u.role === userFilterRole;
    
    let matchesStatus = true;
    if (userFilterStatus === 'blocked') {
      matchesStatus = u.isBlocked && (!u.blockedUntil || new Date(u.blockedUntil) > new Date());
    } else if (userFilterStatus === 'active') {
      matchesStatus = !u.isBlocked || (u.blockedUntil && new Date(u.blockedUntil) < new Date());
    }

    return matchesSearch && matchesRole && matchesStatus;
  });

  // ==========================================
  // Sidebar Tabs Config
  // ==========================================
  const tabsConfig = [
    { id: 'profile', label: 'Profile Settings', icon: <FiUser />, desc: 'Personal details & campus info' },
    { id: 'recommendations', label: 'Feed Preferences', icon: <FiSliders />, desc: 'Customize recommended topics' },
    { id: 'appearance', label: 'Appearance', icon: <FiSun />, desc: 'Themes, styling, and color accents' },
    { id: 'security', label: 'Security & Password', icon: <FiLock />, desc: 'Change password & account deactivation' },
    { id: 'status', label: 'Account Standing', icon: <FiShield />, desc: 'Check restrictions & submit appeals', badge: isBlocked ? 'Restricted' : null },
  ];

  if (isModerator) {
    tabsConfig.push({ id: 'moderation', label: 'Content Moderation', icon: <FiAlertOctagon />, desc: 'Keyword filters & blocked tags' });
  }
  if (isEditor) {
    tabsConfig.push({ id: 'editorial', label: 'Editorial Preferences', icon: <FiEdit3 />, desc: 'Default statuses and intervals' });
  }
  if (isAdmin) {
    tabsConfig.push({ id: 'platform', label: 'Platform Controls', icon: <FiSettings />, desc: 'Locks, users role & suspension panels' });
  }

  const activeTabConfig = tabsConfig.find(t => t.id === activeTab) || tabsConfig[0];

  // Mobile layout condition states
  const showMobileMenu = isMobile && (activeTab === 'menu' || !activeTab);
  const showDetailPanel = !isMobile || (activeTab && activeTab !== 'menu');

  return (
    <div className="settings-container">
      {/* ── Warm Greeting Card Header ── */}
      {(!isMobile || showMobileMenu) && (
        <div className="settings-header-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '2px solid var(--accent-color)',
              background: 'var(--color-gray-100)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {user?.avatar ? (
                <img src={getImageUrl(user.avatar)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <FiUser size={28} color="var(--color-gray-500)" />
              )}
            </div>
            <div className="settings-title-group">
              <h1>Hello, {user?.name?.split(' ')[0] || 'User'}! 👋</h1>
              <p>
                {isBlocked 
                  ? 'Your account is restricted. Please check your standing status panel to submit an appeal.'
                  : `Welcome back to your workspace. You are registered as a system ${user?.role || 'user'}.`
                }
              </p>
            </div>
          </div>

          <div className="user-identity-badge">
            <FiShield style={{ color: isBlocked ? 'var(--color-red)' : '#16a34a' }} />
            <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: isBlocked ? 'var(--color-red)' : '#16a34a' }}>
              {isBlocked ? 'Restricted' : 'Active Standing'}
            </span>
          </div>
        </div>
      )}

      {/* ==========================================
          MOBILE NAVIGATION LIST VIEW (Accordion / Menu mode)
          ========================================== */}
      {showMobileMenu && (
        <div className="mobile-settings-menu">
          <span className="settings-nav-group-title">Personal Settings</span>
          <div className="mobile-settings-section">
            <button className="mobile-settings-row" onClick={() => handleTabChange('profile')}>
              <div className="mobile-settings-icon-bg" style={{ background: '#0055a4' }}><FiUser /></div>
              <div className="mobile-settings-info">
                <span className="mobile-settings-label">Profile Settings</span>
                <span className="mobile-settings-desc">Name, bio, major, and contact info</span>
              </div>
              <FiChevronRight className="mobile-settings-chevron" />
            </button>
            
            <button className="mobile-settings-row" onClick={() => handleTabChange('recommendations')}>
              <div className="mobile-settings-icon-bg" style={{ background: '#6f42c1' }}><FiSliders /></div>
              <div className="mobile-settings-info">
                <span className="mobile-settings-label">Feed Preferences</span>
                <span className="mobile-settings-desc">Categories and personalized hashtags</span>
              </div>
              <FiChevronRight className="mobile-settings-chevron" />
            </button>

            <button className="mobile-settings-row" onClick={() => handleTabChange('appearance')}>
              <div className="mobile-settings-icon-bg" style={{ background: '#d97706' }}><FiSun /></div>
              <div className="mobile-settings-info">
                <span className="mobile-settings-label">Appearance & Styling</span>
                <span className="mobile-settings-desc">Theme mode, accent colors, layout type</span>
              </div>
              <FiChevronRight className="mobile-settings-chevron" />
            </button>

            <button className="mobile-settings-row" onClick={() => handleTabChange('status')}>
              <div className="mobile-settings-icon-bg" style={{ background: '#16a34a' }}><FiShield /></div>
              <div className="mobile-settings-info">
                <span className="mobile-settings-label">Account Standing</span>
                <span className="mobile-settings-desc">Violations standing, appeal requests</span>
              </div>
              {isBlocked && <span className="settings-nav-badge" style={{ marginRight: '8px' }}>Restricted</span>}
              <FiChevronRight className="mobile-settings-chevron" />
            </button>
          </div>

          {(isModerator || isEditor) && (
            <>
              <span className="settings-nav-group-title">Director Controls</span>
              <div className="mobile-settings-section">
                {isModerator && (
                  <button className="mobile-settings-row" onClick={() => handleTabChange('moderation')}>
                    <div className="mobile-settings-icon-bg" style={{ background: '#c8102e' }}><FiAlertOctagon /></div>
                    <div className="mobile-settings-info">
                      <span className="mobile-settings-label">Content Moderation</span>
                      <span className="mobile-settings-desc">Custom filter keywords and hashtags</span>
                    </div>
                    <FiChevronRight className="mobile-settings-chevron" />
                  </button>
                )}

                {isEditor && (
                  <button className="mobile-settings-row" onClick={() => handleTabChange('editorial')}>
                    <div className="mobile-settings-icon-bg" style={{ background: '#2563eb' }}><FiEdit3 /></div>
                    <div className="mobile-settings-info">
                      <span className="mobile-settings-label">Editorial Preferences</span>
                      <span className="mobile-settings-desc">Default auto-saves, publication statuses</span>
                    </div>
                    <FiChevronRight className="mobile-settings-chevron" />
                  </button>
                )}

                {isAdmin && (
                  <button className="mobile-settings-row" onClick={() => handleTabChange('platform')}>
                    <div className="mobile-settings-icon-bg" style={{ background: '#4b5563' }}><FiSettings /></div>
                    <div className="mobile-settings-info">
                      <span className="mobile-settings-label">Platform Controls</span>
                      <span className="mobile-settings-desc">Global security locks, user directory, appeals</span>
                    </div>
                    <FiChevronRight className="mobile-settings-chevron" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ==========================================
          DESKTOP GRID & MOBILE DETAILS PANEL VIEWS
          ========================================== */}
      {showDetailPanel && (
        <div className={isMobile ? 'settings-panel mobile-view-active' : 'settings-layout'}>
          {/* Desktop Left Sidebar */}
          {!isMobile && (
            <aside className="settings-sidebar">
              <span className="settings-nav-group-title">Personal Settings</span>
              {tabsConfig.slice(0, 4).map(t => (
                <button
                  key={t.id}
                  className={`settings-nav-btn ${activeTab === t.id ? 'active' : ''}`}
                  onClick={() => handleTabChange(t.id)}
                >
                  <span className="settings-nav-icon">{t.icon}</span>
                  <div className="settings-nav-btn-text">
                    <span>{t.label}</span>
                    <span>{t.desc}</span>
                  </div>
                  {t.badge && <span className="settings-nav-badge">{t.badge}</span>}
                </button>
              ))}

              {tabsConfig.length > 4 && (
                <>
                  <span className="settings-nav-group-title">Director Controls</span>
                  {tabsConfig.slice(4).map(t => (
                    <button
                      key={t.id}
                      className={`settings-nav-btn ${activeTab === t.id ? 'active' : ''}`}
                      onClick={() => handleTabChange(t.id)}
                    >
                      <span className="settings-nav-icon">{t.icon}</span>
                      <div className="settings-nav-btn-text">
                        <span>{t.label}</span>
                        <span>{t.desc}</span>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </aside>
          )}

          {/* Settings Panel Content */}
          <main className={isMobile ? '' : 'settings-panel'}>
            {/* Mobile Native Navigation Back Header */}
            {isMobile && (
              <div className="mobile-view-header">
                <button className="mobile-back-btn" onClick={() => handleTabChange('menu')}>
                  <FiArrowLeft style={{ marginRight: '6px' }} /> Back to Settings
                </button>
              </div>
            )}

            {/* Panel Title */}
            <div className="panel-title-area">
              <h2 className="panel-title">{activeTabConfig.label}</h2>
              <p className="panel-desc">{activeTabConfig.desc}</p>
            </div>

            {/* ── TAB 1: Profile Settings Panel ── */}
            {activeTab === 'profile' && (
              <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="avatar-setting-wrapper">
                  <div className="avatar-preview-circle">
                    {avatarPreview ? (
                      <img src={getImageUrl(avatarPreview)} alt="" />
                    ) : (
                      <FiUser size={36} color="var(--color-gray-400)" />
                    )}
                  </div>
                  <div>
                    <label htmlFor="settings-avatar-input" className="avatar-upload-btn">
                      <FiCamera /> Change Photo
                    </label>
                    <input 
                      id="settings-avatar-input"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      style={{ display: 'none' }}
                    />
                    <p style={{ fontSize: '10px', color: 'var(--color-gray-500)', marginTop: '8px', margin: 0 }}>Square images yield best visual results. Max 2MB.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '12.5px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-color)', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '6px', marginBottom: '14px' }}>
                      1. Identity & Handle Settings
                    </h3>
                    <div className="settings-form-grid">
                      <div className="settings-group">
                        <label className="settings-label">System Username Handle</label>
                        <div className="input-with-icon-wrapper">
                          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: 'var(--color-gray-400)' }}>@</span>
                          <input 
                            type="text" 
                            className="settings-input" 
                            style={{ paddingLeft: '30px' }}
                            placeholder="username_handle"
                            value={username} 
                            onChange={e => { setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')); clearError('username'); }}
                            required
                          />
                        </div>
                        {errors.username && <span style={{ color: 'var(--color-red)', fontSize: '11px', marginTop: '4px', fontWeight: 600 }}>{errors.username}</span>}
                      </div>

                      <div className="settings-group">
                        <label className="settings-label">Age</label>
                        <input 
                          type="number" 
                          className="settings-input" 
                          placeholder="e.g. 21"
                          value={age} 
                          onChange={e => setAge(e.target.value)}
                        />
                      </div>

                      <div className="settings-group">
                        <label className="settings-label">First Name</label>
                        <div className="input-with-icon-wrapper">
                          <FiUser className="input-icon" />
                          <input 
                            type="text" 
                            className="settings-input" 
                            placeholder="e.g. John"
                            value={firstName} 
                            onChange={e => { setFirstName(e.target.value); clearError('firstName'); }}
                            required
                          />
                        </div>
                        {errors.firstName && <span style={{ color: 'var(--color-red)', fontSize: '11px', marginTop: '4px', fontWeight: 600 }}>{errors.firstName}</span>}
                      </div>
                      <div className="settings-group">
                        <label className="settings-label">Last Name</label>
                        <div className="input-with-icon-wrapper">
                          <FiUser className="input-icon" />
                          <input 
                            type="text" 
                            className="settings-input" 
                            placeholder="e.g. Doe"
                            value={lastName} 
                            onChange={e => { setLastName(e.target.value); clearError('lastName'); }}
                            required
                          />
                        </div>
                        {errors.lastName && <span style={{ color: 'var(--color-red)', fontSize: '11px', marginTop: '4px', fontWeight: 600 }}>{errors.lastName}</span>}
                      </div>

                      <div className="settings-group">
                        <label className="settings-label">Gender</label>
                        <select 
                          className="settings-select"
                          value={gender}
                          onChange={e => setGender(e.target.value)}
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                          <option value="prefer_not_to_say">Prefer not to say</option>
                        </select>
                      </div>

                      <div className="settings-group">
                        <label className="settings-label">Education Level</label>
                        <select 
                          className="settings-select"
                          value={educationLevel}
                          onChange={e => setEducationLevel(e.target.value)}
                        >
                          <option value="Undergraduate Degree">Undergraduate Degree</option>
                          <option value="Postgraduate / Master Degree">Postgraduate / Master Degree</option>
                          <option value="Doctorate / PhD">Doctorate / PhD</option>
                          <option value="Diploma / Associate Degree">Diploma / Associate Degree</option>
                          <option value="High School">High School</option>
                        </select>
                      </div>

                      <div className="settings-group form-grid-full">
                        <label className="settings-label">Short Biography</label>
                        <textarea 
                          className="settings-textarea"
                          rows={3}
                          maxLength={300}
                          value={bio}
                          onChange={e => { setBio(e.target.value); clearError('bio'); }}
                          placeholder="Write a brief professional bio or quote that will display on your published article authors rail..."
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                          {errors.bio && <span style={{ color: 'var(--color-red)', fontSize: '11px', fontWeight: 600 }}>{errors.bio}</span>}
                          <span style={{ fontSize: '11px', color: 'var(--color-gray-400)', marginLeft: 'auto' }}>{bio.length}/300 chars</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Public Name Privacy Control Box */}
                  <div style={{ background: 'var(--color-gray-100)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--color-gray-200)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-black)' }}>Show Real Name Publicly</span>
                        <p style={{ fontSize: '12px', color: 'var(--color-gray-500)', margin: '2px 0 0 0' }}>
                          When enabled, your real name ({firstName} {lastName}) will be visible alongside @{username} on posts & comments.
                        </p>
                      </div>
                      <ToggleSwitch 
                        checked={showRealNamePublicly} 
                        onChange={() => setShowRealNamePublicly(!showRealNamePublicly)}
                      />
                    </div>
                  </div>

                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '12.5px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-color)', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '6px', marginBottom: '14px' }}>
                      2. Campus Standing
                    </h3>
                    <div className="settings-form-grid">
                      <div className="settings-group form-grid-full">
                        <label className="settings-label">University / College</label>
                        <div className="input-with-icon-wrapper">
                          <FiBookOpen className="input-icon" />
                          <input 
                            type="text" 
                            className="settings-input" 
                            placeholder="e.g. Southernwaves State College"
                            value={university} 
                            onChange={e => { setUniversity(e.target.value); clearError('university'); }}
                            required
                          />
                        </div>
                        {errors.university && <span style={{ color: 'var(--color-red)', fontSize: '11px', marginTop: '4px', fontWeight: 600 }}>{errors.university}</span>}
                      </div>
                      <div className="settings-group">
                        <label className="settings-label">Academic Major</label>
                        <select 
                          className="settings-select"
                          value={academicMajor}
                          onChange={e => { setAcademicMajor(e.target.value); clearError('academicMajor'); }}
                          required
                        >
                          <option value="">Select Academic Major</option>
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
                        {errors.academicMajor && <span style={{ color: 'var(--color-red)', fontSize: '11px', marginTop: '4px', fontWeight: 600 }}>{errors.academicMajor}</span>}
                      </div>
                      <div className="settings-group">
                        <label className="settings-label">Year of Study</label>
                        <select 
                          className="settings-select"
                          value={yearOfStudy}
                          onChange={e => setYearOfStudy(e.target.value)}
                          required
                        >
                          <option value="Freshman">Freshman (1st Year)</option>
                          <option value="Sophomore">Sophomore (2nd Year)</option>
                          <option value="Junior">Junior (3rd Year)</option>
                          <option value="Senior">Senior (4th Year)</option>
                          <option value="Postgraduate">Postgraduate</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '12.5px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-color)', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '6px', marginBottom: '14px' }}>
                      3. Contact Credentials & Admin Access Notice
                    </h3>
                    <div className="settings-form-grid">
                      <div className="settings-group">
                        <label className="settings-label">Verified Phone Number</label>
                        <div className="input-with-icon-wrapper">
                          <FiPhone className="input-icon" />
                          <input 
                            type="text" 
                            className="settings-input" 
                            placeholder="e.g. +91 9876543210"
                            value={phone} 
                            onChange={e => { setPhone(e.target.value); clearError('phone'); }}
                            required
                          />
                        </div>
                        {errors.phone && <span style={{ color: 'var(--color-red)', fontSize: '11px', marginTop: '4px', fontWeight: 600 }}>{errors.phone}</span>}
                      </div>
                      <div className="settings-group">
                        <label className="settings-label">Email Address (Read-only)</label>
                        <div className="input-with-icon-wrapper">
                          <FiUser className="input-icon" style={{ opacity: 0.5 }} />
                          <input 
                            type="email" 
                            className="settings-input" 
                            value={user?.email || ''} 
                            disabled
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '12px', padding: '12px 14px', background: 'rgba(200,16,46,0.05)', borderRadius: '8px', borderLeft: '3px solid var(--color-red, #c8102e)', fontSize: '11px', color: 'var(--color-gray-700)', lineHeight: '1.5' }}>
                      <strong>Terms & Governance Notice:</strong> In accordance with Platform Terms & Conditions, System Administrators and Moderators retain full access to view contact information (Email, Mobile) and real identity details for safety governance and policy enforcement.
                    </div>
                  </div>
                </div>

                <div className="settings-btn-row">
                  <button type="submit" className="settings-btn-primary" disabled={savingProfile}>
                    {savingProfile ? 'Updating Credentials...' : 'Apply Profile Changes'}
                  </button>
                </div>
              </form>
            )}

            {/* ── TAB 2: Feed Preferences Panel ── */}
            {activeTab === 'recommendations' && (
              <form onSubmit={handlePrefsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <span className="settings-label" style={{ display: 'block', marginBottom: '12px' }}>Curated Waves Feeds Selection</span>
                  {errors.preferredCategories && <div style={{ color: 'var(--color-red)', fontSize: '12px', marginBottom: '12px', fontWeight: 600 }}>{errors.preferredCategories}</div>}
                  <div className="category-select-grid">
                    {SECTIONS.map(cat => {
                      const isActive = preferredCategories.includes(cat.id);
                      return (
                        <div 
                          key={cat.id} 
                          className={`category-select-card ${isActive ? 'active' : ''}`}
                          onClick={() => toggleCategory(cat.id)}
                        >
                          <span className="category-card-icon">{cat.icon}</span>
                          <div className="category-card-info">
                            <span className="category-card-label">{cat.label}</span>
                            <span className="category-card-desc">{cat.desc}</span>
                          </div>
                          <div className="category-checkbox-wrapper">
                            <input 
                              type="checkbox"
                              checked={isActive}
                              onChange={() => {}} // toggled on card click
                              style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span className="settings-label" style={{ display: 'block', marginBottom: '4px' }}>Personal Recommendation Hashtags</span>
                  <span style={{ fontSize: '11px', color: 'var(--color-gray-500)', display: 'block', marginBottom: '10px' }}>Recommendation models prioritize articles containing these hashtags.</span>
                  
                  <div className="settings-tag-pool" style={{ marginBottom: '12px' }}>
                    {preferredTags.length > 0 ? (
                      preferredTags.map(tag => (
                        <span key={tag} className="settings-tag-pill">
                          <FiHash size={12} style={{ opacity: 0.7 }} /> {tag}
                          <button type="button" className="settings-tag-remove-btn" onClick={() => handleRemoveTag(tag)}>
                            <FiPlus size={12} style={{ transform: 'rotate(45deg)' }} />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--color-gray-400)', alignSelf: 'center' }}>No personalized tags added. Add custom interests below.</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input 
                        type="text"
                        className="settings-input"
                        style={{ flex: 1 }}
                        placeholder="e.g. sports, exam-prep, tech-news"
                        value={customTagInput}
                        onChange={e => { setCustomTagInput(e.target.value); clearError('customTagInput'); }}
                      />
                      <button type="button" className="settings-btn-secondary" style={{ padding: '0 20px' }} onClick={handleAddTag}>
                        Add Interest
                      </button>
                    </div>
                    {errors.customTagInput && <span style={{ color: 'var(--color-red)', fontSize: '11px', fontWeight: 600 }}>{errors.customTagInput}</span>}
                  </div>
                </div>

                <div className="settings-btn-row">
                  <button type="submit" className="settings-btn-primary" disabled={savingPrefs}>
                    {savingPrefs ? 'Updating Preferences...' : 'Apply Feed Customizations'}
                  </button>
                </div>
              </form>
            )}

            {/* ── TAB 3: Appearance & Theme Panel ── */}
            {activeTab === 'appearance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <div>
                  <span className="settings-label">1. Theme Mode</span>
                  <div className="theme-cards-grid">
                    {[
                      { 
                        id: 'light', 
                        label: 'Light', 
                        icon: <FiSun />, 
                        bgPreview: '#fdfdfb', 
                        txtPreview: '#121212', 
                        borderPreview: '#e0e0e0' 
                      },
                      { 
                        id: 'dark', 
                        label: 'Light Dark', 
                        icon: <FiMoon />, 
                        bgPreview: '#1f1f1f', 
                        txtPreview: '#f5f5f5', 
                        borderPreview: '#3a3a3a' 
                      },
                      { 
                        id: 'black', 
                        label: 'Pure Dark', 
                        icon: <IoContrast />, 
                        bgPreview: '#000000', 
                        txtPreview: '#ffffff', 
                        borderPreview: '#222222' 
                      },
                    ].map(item => {
                      const isActive = theme === item.id;
                      return (
                        <div
                          key={item.id}
                          className={`theme-card ${isActive ? 'active' : ''}`}
                          onClick={() => setTheme(item.id)}
                        >
                          <div style={{
                            width: '100%',
                            height: '52px',
                            borderRadius: '8px',
                            background: item.bgPreview,
                            border: `1.5px solid ${item.borderPreview}`,
                            padding: '6px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                            boxSizing: 'border-box'
                          }}>
                            <div style={{ display: 'flex', gap: '3px' }}>
                              <div style={{ width: '12px', height: '4px', borderRadius: '10px', background: 'var(--accent-color)' }} />
                              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: item.txtPreview, marginLeft: 'auto' }} />
                              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: item.txtPreview }} />
                            </div>
                            <div style={{ width: '70%', height: '5px', borderRadius: '10px', background: item.txtPreview, opacity: 0.8 }} />
                            <div style={{ width: '100%', height: '14px', borderRadius: '4px', background: 'var(--accent-color)', opacity: 0.15, display: 'flex', alignItems: 'center', padding: '0 3px', boxSizing: 'border-box' }}>
                              <div style={{ width: '40%', height: '3px', borderRadius: '10px', background: 'var(--accent-color)' }} />
                            </div>
                          </div>

                          <span className="theme-card-icon" style={{ marginTop: '4px' }}>{item.icon}</span>
                          <span className="theme-card-label">{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span className="settings-label">2. Platform Styling Framework</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginTop: '8px' }}>
                    {[
                      { id: 'modern', label: 'Modern Executive System', desc: 'Sleek glassmorphic cards, modern fluid typography, elegant data presentation' },
                    ].map(item => {
                      const isActive = styleMode === item.id;
                      return (
                        <div
                          key={item.id}
                          className={`theme-card ${isActive ? 'active' : ''}`}
                          style={{ alignItems: 'flex-start', textAlign: 'left', padding: '24px' }}
                          onClick={() => setStyleMode(item.id)}
                        >
                          <span className="theme-card-label" style={{ fontSize: '14px', marginBottom: '4px', textTransform: 'uppercase' }}>{item.label}</span>
                          <span style={{ fontSize: '11.5px', opacity: isActive ? 0.9 : 0.6, lineHeight: 1.4 }}>{item.desc}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB: Security & Password ── */}
            {activeTab === 'security' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {/* Section 1: Change Password */}
                <div style={{ background: 'var(--color-paper)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '14px', padding: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-black)', margin: '0 0 4px 0' }}>
                        Change Password
                      </h3>
                      <p style={{ fontSize: '12px', color: 'var(--color-gray-500)', margin: 0 }}>
                        Update your login credentials. Use a strong password with letters, numbers, and symbols.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={generateSettingsStrongPassword}
                      style={{
                        background: 'rgba(0,85,164,0.08)',
                        color: 'var(--accent-color)',
                        border: '1px solid var(--accent-color)',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <FiKey size={14} /> Suggest Strong Password
                    </button>
                  </div>

                  <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '520px' }}>
                    <div className="form-group">
                      <label className="settings-label">Current Password</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          className="settings-input"
                          placeholder="Enter current password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          style={{ paddingRight: '40px' }}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(prev => !prev)}
                          style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-gray-500)', display: 'flex' }}
                        >
                          {showCurrentPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="settings-label">New Password</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          className="settings-input"
                          placeholder="Enter new password (min. 6 chars)"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          style={{ paddingRight: '40px' }}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(prev => !prev)}
                          style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-gray-500)', display: 'flex' }}
                        >
                          {showNewPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="settings-label">Confirm New Password</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showConfirmNewPassword ? 'text' : 'password'}
                          className="settings-input"
                          placeholder="Re-enter new password"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          style={{ paddingRight: '40px' }}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmNewPassword(prev => !prev)}
                          style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-gray-500)', display: 'flex' }}
                        >
                          {showConfirmNewPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={changingPassword}
                      className="settings-btn-primary"
                      style={{ padding: '12px 24px', alignSelf: 'flex-start', marginTop: '8px' }}
                    >
                      {changingPassword ? 'Updating Password...' : 'Save New Password'}
                    </button>
                  </form>
                </div>

                {/* Section 2: Account Deactivation */}
                <div style={{ background: 'rgba(239, 68, 68, 0.04)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '14px', padding: '28px' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-red)', margin: '0 0 8px 0' }}>
                    Danger Zone: Deactivate Account
                  </h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--color-gray-600)', margin: '0 0 20px 0', lineHeight: 1.5 }}>
                    Deactivating your account disables your profile, removes your active session, and marks your account inactive. Your previous articles will remain archived under your pseudonym.
                  </p>

                  <form onSubmit={handleDeactivateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '520px' }}>
                    <div className="form-group">
                      <label className="settings-label" style={{ color: 'var(--color-red)' }}>Reason for Leaving (Optional)</label>
                      <input
                        type="text"
                        className="settings-input"
                        placeholder="e.g. Taking a break / Graduated"
                        value={deactivateReason}
                        onChange={(e) => setDeactivateReason(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="settings-label" style={{ color: 'var(--color-red)' }}>Confirm Password to Deactivate</label>
                      <input
                        type="password"
                        className="settings-input"
                        placeholder="Enter your account password"
                        value={deactivatePassword}
                        onChange={(e) => setDeactivatePassword(e.target.value)}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={deactivating || !deactivatePassword}
                      style={{
                        background: 'var(--color-red)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '12px 24px',
                        fontWeight: 800,
                        fontSize: '13px',
                        cursor: (deactivating || !deactivatePassword) ? 'not-allowed' : 'pointer',
                        opacity: (deactivating || !deactivatePassword) ? 0.6 : 1,
                        alignSelf: 'flex-start',
                        marginTop: '6px'
                      }}
                    >
                      {deactivating ? 'Deactivating Account...' : 'Permanently Deactivate Account'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ── TAB 4: Account Standing & Appeals Panel ── */}
            {activeTab === 'status' && (
              <div>
                {isBlocked ? (
                  <div>
                    <div className="settings-alert-box danger">
                      <FiAlertTriangle className="alert-icon" size={20} />
                      <div className="alert-content">
                        <span className="alert-title">Account Suspension Restrictions Active</span>
                        <span className="alert-message">
                          Due to community guideline violations, your account has been placed into read-only mode. You cannot publish stories or comment on active articles.
                        </span>
                      </div>
                    </div>

                    <div className="settings-table-wrapper" style={{ marginBottom: '28px' }}>
                      <table className="settings-table">
                        <thead>
                          <tr>
                            <th>Parameter</th>
                            <th>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>Violation Reason</strong></td>
                            <td>{user?.blockedReason || 'Violation of guidelines.'}</td>
                          </tr>
                          <tr>
                            <td><strong>Status</strong></td>
                            <td style={{ color: 'var(--color-red)', fontWeight: 800 }}>Restricted</td>
                          </tr>
                          <tr>
                            <td><strong>Duration</strong></td>
                            <td>{isIndefinite ? 'Permanent Suspension' : `Temporary Lift Scheduled`}</td>
                          </tr>
                          {!isIndefinite && (
                            <tr>
                              <td><strong>Release Date</strong></td>
                              <td>{blockedUntil?.toLocaleString()}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {appealDone ? (
                      <div className="settings-alert-box success">
                        <FiCheckCircle className="alert-icon" size={20} />
                        <div className="alert-content">
                          <span className="alert-title">Appeal Submission Under Review</span>
                          <span className="alert-message">
                            Your appeal request has been submitted to the content moderation board. Review answers will show in your inbox.
                          </span>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleAppealSubmit}>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-black)', marginBottom: '8px' }}>
                          Submit Appeal Request
                        </h3>
                        <p style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginBottom: '12px' }}>
                          Provide context or explain mitigating circumstances for review by site directors.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <textarea
                            className="settings-textarea"
                            style={{ width: '100%', boxSizing: 'border-box' }}
                            rows={4}
                            value={appealText}
                            onChange={e => { setAppealText(e.target.value); clearError('appealText'); }}
                            placeholder="Write appeal request text (minimum 20 characters)..."
                            required
                          />
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                            {errors.appealText && <span style={{ color: 'var(--color-red)', fontSize: '11px', fontWeight: 600 }}>{errors.appealText}</span>}
                            <span style={{ fontSize: '11px', color: 'var(--color-gray-400)', marginLeft: 'auto' }}>{appealText.length}/1000 chars</span>
                          </div>
                        </div>
                        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                          <button type="submit" className="settings-btn-primary" disabled={appealing}>
                            {appealing ? 'Submitting Appeal...' : 'Submit Appeal Request'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px 0 12px' }}>
                    <FiCheckCircle size={48} color="#16a34a" style={{ marginBottom: '12px' }} />
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 800, color: 'var(--color-black)', margin: '0 0 6px 0' }}>Account is Active</h3>
                    <p style={{ fontSize: '12.5px', color: 'var(--color-gray-500)', maxWidth: '440px', margin: '0 auto', lineHeight: 1.5 }}>
                      Your account wave is in active standing with full editorial publication and commenting privileges.
                    </p>
                  </div>
                )}

                {/* Manage Security Questions Section */}
                <div style={{ marginTop: '24px', background: 'var(--color-gray-50)', padding: '24px', borderRadius: '14px', border: '1px solid var(--color-gray-200)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-black)', margin: 0 }}>
                      🛡️ Manage Account Recovery Security Questions
                    </h3>
                  </div>

                  {/* Active Questions Badge */}
                  {user?.securityQuestions && user.securityQuestions.length >= 2 ? (
                    <div style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', color: '#15803d' }}>
                      ✓ <strong>Configured Security Questions Active:</strong>
                      <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                        <li>1. {user.securityQuestions[0]?.question}</li>
                        <li>2. {user.securityQuestions[1]?.question}</li>
                      </ul>
                    </div>
                  ) : (
                    <p style={{ fontSize: '12px', color: 'var(--color-gray-500)', margin: '0 0 16px 0' }}>
                      Update your 2 Security Questions to prevent email misuse and protect password/ID recovery.
                    </p>
                  )}

                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (!sa1.trim() || !sa2.trim()) return toast.error('Answers for both Security Questions are required');
                    if (sq1 === sq2) return toast.error('Please choose 2 different Security Questions');
                    
                    // Open password authorization modal
                    setSecAuthModalOpen(true);
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <label className="settings-label">Security Question 1</label>
                        <select className="settings-select" style={{ marginBottom: '8px' }} value={sq1} onChange={(e) => setSq1(e.target.value)}>
                          <option value="What was the name of your first pet?">What was the name of your first pet?</option>
                          <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                          <option value="What was the name of your elementary / primary school?">What was the name of your elementary / primary school?</option>
                          <option value="In what city or town were you born?">In what city or town were you born?</option>
                          <option value="What was your favorite food as a child?">What was your favorite food as a child?</option>
                          <option value="What was the make of your first car or bicycle?">What was the make of your first car or bicycle?</option>
                          <option value="What is your favorite book or movie?">What is your favorite book or movie?</option>
                        </select>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showSa1 ? "text" : "password"}
                            className="settings-input"
                            placeholder="•••••••• (Answer 1)"
                            value={sa1}
                            onChange={(e) => setSa1(e.target.value)}
                            required
                            style={{ paddingRight: '40px' }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowSa1(!showSa1)}
                            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-gray-500)', cursor: 'pointer' }}
                            title={showSa1 ? "Hide Answer" : "Show Answer"}
                          >
                            {showSa1 ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="settings-label">Security Question 2</label>
                        <select className="settings-select" style={{ marginBottom: '8px' }} value={sq2} onChange={(e) => setSq2(e.target.value)}>
                          <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                          <option value="What was the name of your first pet?">What was the name of your first pet?</option>
                          <option value="What was the name of your elementary / primary school?">What was the name of your elementary / primary school?</option>
                          <option value="In what city or town were you born?">In what city or town were you born?</option>
                          <option value="What was your favorite book or movie?">What was your favorite book or movie?</option>
                          <option value="What was your childhood nickname?">What was your childhood nickname?</option>
                        </select>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showSa2 ? "text" : "password"}
                            className="settings-input"
                            placeholder="•••••••• (Answer 2)"
                            value={sa2}
                            onChange={(e) => setSa2(e.target.value)}
                            required
                            style={{ paddingRight: '40px' }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowSa2(!showSa2)}
                            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-gray-500)', cursor: 'pointer' }}
                            title={showSa2 ? "Hide Answer" : "Show Answer"}
                          >
                            {showSa2 ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <button type="submit" className="settings-btn-primary" style={{ padding: '10px 20px', fontSize: '12px' }}>
                      Update Security Questions
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Password Authorization Modal Popup */}
            {secAuthModalOpen && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }}>
                <div style={{ maxWidth: '440px', width: '100%', background: 'var(--color-white)', color: 'var(--color-black)', borderRadius: '16px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', border: '1px solid var(--color-gray-200)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FiLock size={18} /> Password Authorization Required
                    </h3>
                    <button onClick={() => setSecAuthModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-500)' }}>
                      <FiX size={20} />
                    </button>
                  </div>

                  <p style={{ fontSize: '12.5px', color: 'var(--color-gray-600)', marginBottom: '16px', lineHeight: 1.5 }}>
                    Enter your current account password to authorize saving your updated <strong>Security Questions</strong>.
                  </p>

                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!confirmPasswordInput) return toast.error('Please enter your current password');

                    setUpdatingSecQ(true);
                    try {
                      await authAPI.updateProfile({
                        securityQuestions: [
                          { question: sq1, answer: sa1.trim() },
                          { question: sq2, answer: sa2.trim() },
                        ],
                        currentPassword: confirmPasswordInput
                      });
                      await refreshUser();
                      toast.success('Security Questions updated successfully! 🛡️');
                      setSecAuthModalOpen(false);
                      setConfirmPasswordInput('');
                      setSa1('');
                      setSa2('');
                    } catch (err) {
                      toast.error(err.response?.data?.message || 'Password authorization failed. Questions not updated.');
                    } finally {
                      setUpdatingSecQ(false);
                    }
                  }}>
                    <div className="settings-group" style={{ marginBottom: '20px' }}>
                      <label className="settings-label">Current Account Password</label>
                      <input
                        type="password"
                        className="settings-input"
                        placeholder="••••••••"
                        value={confirmPasswordInput}
                        onChange={(e) => setConfirmPasswordInput(e.target.value)}
                        autoFocus
                        required
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setSecAuthModalOpen(false)}
                        className="settings-btn-secondary"
                        style={{ flex: 1, padding: '10px' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={updatingSecQ || !confirmPasswordInput}
                        className="settings-btn-primary"
                        style={{ flex: 1, padding: '10px', fontSize: '13px' }}
                      >
                        {updatingSecQ ? 'Verifying...' : 'Confirm & Save'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ── TAB 5: Content Moderation Panel ── */}
            {activeTab === 'moderation' && isModerator && (
              <div>
                <div className="settings-subnav-row">
                  <button 
                    className={`settings-subnav-btn ${modTab === 'words' ? 'active' : ''}`}
                    onClick={() => setModTab('words')}
                  >
                    Custom Filter Words
                  </button>
                  <button 
                    className={`settings-subnav-btn ${modTab === 'tags' ? 'active' : ''}`}
                    onClick={() => setModTab('tags')}
                  >
                    Blocked Hashtags
                  </button>
                </div>

                {modTab === 'words' && (
                  <div>
                    <form onSubmit={handleAddFilterWord} style={{ background: 'var(--color-gray-50)', padding: '24px', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '14px', marginBottom: '28px' }}>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '13.5px', fontWeight: 800, textTransform: 'uppercase', margin: '0 0 16px 0', color: 'var(--color-black)' }}>Add Filter Word</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', alignItems: 'end' }}>
                        <div className="settings-group">
                          <label className="settings-label">Word / Phrase</label>
                          <input 
                            type="text" 
                            className="settings-input" 
                            placeholder="e.g. badword" 
                            value={newWordText}
                            onChange={e => { setNewWordText(e.target.value); clearError('newWordText'); }}
                            required
                          />
                        </div>
                        <div className="settings-group">
                          <label className="settings-label">Category</label>
                          <select 
                            className="settings-select" 
                            value={newWordCat}
                            onChange={e => setNewWordCat(e.target.value)}
                          >
                            <option value="profanity">Profanity</option>
                            <option value="hate-speech">Hate Speech</option>
                            <option value="scam">Scam</option>
                            <option value="cyberbullying">Cyberbullying</option>
                            <option value="spam">Spam</option>
                          </select>
                        </div>
                        <div className="settings-group">
                          <label className="settings-label">Severity</label>
                          <select 
                            className="settings-select" 
                            value={newWordSev}
                            onChange={e => setNewWordSev(e.target.value)}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </div>
                      </div>
                      {errors.newWordText && <div style={{ color: 'var(--color-red)', fontSize: '11px', marginTop: '8px', fontWeight: 600 }}>{errors.newWordText}</div>}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                        <button type="submit" className="settings-btn-primary" disabled={addingWord}>
                          {addingWord ? 'Adding word...' : 'Add Word To Filter'}
                        </button>
                      </div>
                    </form>

                    <div style={{ display: 'flex', gap: '14px', marginBottom: '20px' }}>
                      <form onSubmit={handleSearchWords} style={{ display: 'flex', flex: 1, gap: '8px' }}>
                        <div className="input-with-icon-wrapper" style={{ flex: 1 }}>
                          <FiSearch className="input-icon" />
                          <input 
                            type="text" 
                            className="settings-input"
                            placeholder="Search filter words..."
                            value={wordSearchQuery}
                            onChange={e => setWordSearchQuery(e.target.value)}
                          />
                        </div>
                        <button type="submit" className="settings-btn-secondary" style={{ padding: '0 18px' }}>
                          Search
                        </button>
                      </form>
                      <select 
                        className="settings-select"
                        style={{ width: '180px' }}
                        value={activeFilterCat}
                        onChange={e => setActiveFilterCat(e.target.value)}
                      >
                        {FILTER_CATEGORIES.map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="settings-table-wrapper">
                      <table className="settings-table">
                        <thead>
                          <tr>
                            <th>Word</th>
                            <th>Category</th>
                            <th>Severity</th>
                            <th>Active</th>
                            <th style={{ width: '60px' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loadingWords ? (
                            <tr>
                              <td colSpan="5" style={{ textAlign: 'center', padding: '24px' }}>Loading filter words...</td>
                            </tr>
                          ) : filterWords.length === 0 ? (
                            <tr>
                              <td colSpan="5" style={{ textAlign: 'center', padding: '24px' }}>No words matching parameters found.</td>
                            </tr>
                          ) : (
                            filterWords.map(word => (
                              <tr key={word._id}>
                                <td><strong>{word.word}</strong></td>
                                <td><span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>{word.category}</span></td>
                                <td>
                                  <span style={{ 
                                    fontSize: '10px', 
                                    fontWeight: 800, 
                                    textTransform: 'uppercase',
                                    color: word.severity === 'high' ? 'var(--color-red)' : word.severity === 'medium' ? '#fbbf24' : '#6b7280'
                                  }}>
                                    {word.severity}
                                  </span>
                                </td>
                                <td>
                                  <ToggleSwitch 
                                    checked={word.isActive} 
                                    onChange={() => handleToggleWord(word)}
                                  />
                                </td>
                                <td>
                                  <button className="settings-btn-secondary" style={{ padding: '6px', color: 'var(--color-red)', borderColor: 'transparent' }} onClick={() => handleDeleteWord(word)}>
                                    <FiTrash2 />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {modTab === 'tags' && (
                  <div>
                    <form onSubmit={handleAddBlockedTag} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <div className="input-with-icon-wrapper" style={{ flex: 1 }}>
                          <FiHash className="input-icon" />
                          <input 
                            type="text" 
                            className="settings-input"
                            placeholder="Enter hashtag phrase to block (e.g. clickbait-spam)..."
                            value={newBlockedTagText}
                            onChange={e => { setNewBlockedTagText(e.target.value); clearError('newBlockedTagText'); }}
                            required
                          />
                        </div>
                        <button type="submit" className="settings-btn-primary" disabled={addingTag}>
                          {addingTag ? 'Blocking...' : 'Block Hashtag'}
                        </button>
                      </div>
                      {errors.newBlockedTagText && <span style={{ color: 'var(--color-red)', fontSize: '11px', fontWeight: 600 }}>{errors.newBlockedTagText}</span>}
                    </form>

                    <div className="settings-table-wrapper">
                      <table className="settings-table">
                        <thead>
                          <tr>
                            <th>Hashtag</th>
                            <th>Blocked By</th>
                            <th>Date Blocked</th>
                            <th style={{ width: '80px' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loadingTags ? (
                            <tr>
                              <td colSpan="4" style={{ textAlign: 'center', padding: '24px' }}>Loading blocked tags...</td>
                            </tr>
                          ) : blockedTags.length === 0 ? (
                            <tr>
                              <td colSpan="4" style={{ textAlign: 'center', padding: '24px' }}>No blocked tags exist.</td>
                            </tr>
                          ) : (
                            blockedTags.map(tag => (
                              <tr key={tag._id}>
                                <td><strong>#{tag.tag}</strong></td>
                                <td>{tag.createdBy?.name || 'Admin'}</td>
                                <td>{new Date(tag.createdAt).toLocaleDateString()}</td>
                                <td>
                                  <button className="settings-btn-secondary" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => handleDeleteBlockedTag(tag)}>
                                    Unblock
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 6: Editorial Preferences Panel ── */}
            {activeTab === 'editorial' && isEditor && (
              <form onSubmit={handleSaveEditorial} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="settings-form-grid">
                  <div className="settings-group">
                    <label className="settings-label">Default Article Status</label>
                    <select 
                      className="settings-select"
                      value={defaultPubStatus}
                      onChange={e => setDefaultPubStatus(e.target.value)}
                    >
                      <option value="draft">Draft (Private edit mode)</option>
                      <option value="pending">Pending Admin Review</option>
                    </select>
                  </div>

                  <div className="settings-group">
                    <label className="settings-label">Editor Mode Interface</label>
                    <select 
                      className="settings-select"
                      value={editorInterface}
                      onChange={e => setEditorInterface(e.target.value)}
                    >
                      <option value="markdown">Markdown Editor (.md mode)</option>
                      <option value="rich-text">Rich Text Visual Editor (WYSIWYG)</option>
                    </select>
                  </div>

                  <div className="settings-group">
                    <label className="settings-label">Auto-save interval</label>
                    <select 
                      className="settings-select"
                      value={autoSaveInterval}
                      onChange={e => setAutoSaveInterval(e.target.value)}
                    >
                      <option value="10">Every 10 seconds</option>
                      <option value="30">Every 30 seconds</option>
                      <option value="60">Every 1 minute</option>
                      <option value="300">Every 5 minutes</option>
                    </select>
                  </div>
                </div>

                <div className="settings-toggle-row" style={{ marginTop: '8px' }}>
                  <div className="toggle-info">
                    <span className="toggle-title">System Completion Announcements</span>
                    <span className="toggle-desc">Notify the chief admin board immediately when you change draft status to completed.</span>
                  </div>
                  <ToggleSwitch 
                    checked={notifyAdminDraft}
                    onChange={() => setNotifyAdminDraft(!notifyAdminDraft)}
                  />
                </div>

                <div className="settings-btn-row">
                  <button type="submit" className="settings-btn-primary">
                    Save Editorial Options
                  </button>
                </div>
              </form>
            )}

            {/* ── TAB 7: Platform Controls Panel ── */}
            {activeTab === 'platform' && isAdmin && (
              <div>
                <div className="settings-subnav-row">
                  <button 
                    className={`settings-subnav-btn ${adminTab === 'locks' ? 'active' : ''}`}
                    onClick={() => setAdminTab('locks')}
                  >
                    Platform Security Locks
                  </button>
                  <button 
                    className={`settings-subnav-btn ${adminTab === 'users' ? 'active' : ''}`}
                    onClick={() => setAdminTab('users')}
                  >
                    User Directory Manager
                  </button>
                  <button 
                    className={`settings-subnav-btn ${adminTab === 'appeals' ? 'active' : ''}`}
                    onClick={() => setAdminTab('appeals')}
                  >
                    Suspension Appeals ({appealsList.length})
                  </button>
                </div>

                {adminTab === 'locks' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="settings-alert-box info">
                      <FiInfo className="alert-icon" size={20} />
                      <div className="alert-content">
                        <span className="alert-title">Platform Administrative Security Panel</span>
                        <span className="alert-message">
                          Activating global locks immediately restricts target operations across the platform. This overrides individual article settings.
                        </span>
                      </div>
                    </div>

                    {loadingLocks ? (
                      <div style={{ padding: '20px', textAlign: 'center' }}>Loading security status...</div>
                    ) : (
                      <>
                        <div className="settings-toggle-row">
                          <div className="toggle-info">
                            <span className="toggle-title"><FiLock style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Global Article Comment Lock</span>
                            <span className="toggle-desc">Lock commenting on ALL published articles. Restricts spam during campus events.</span>
                          </div>
                          <ToggleSwitch 
                            checked={globalCommentLock}
                            onChange={() => handleToggleLock('comments', globalCommentLock)}
                            activeColor="var(--color-red)"
                          />
                        </div>

                        <div className="settings-toggle-row">
                          <div className="toggle-info">
                            <span className="toggle-title"><FiLock style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Global Chat Lounge Lock</span>
                            <span className="toggle-desc">Freeze all chat message submission systems in lounge group rooms.</span>
                          </div>
                          <ToggleSwitch 
                            checked={globalChatLock}
                            onChange={() => handleToggleLock('chat', globalChatLock)}
                            activeColor="var(--color-red)"
                          />
                        </div>

                        {/* Registration & University Governance Section */}
                        <div style={{ marginTop: '16px', background: 'var(--color-gray-100)', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-gray-200)' }}>
                          <h4 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 800, color: 'var(--color-black)' }}>
                            Academic Registration & University Governance
                          </h4>

                          <div className="settings-form-grid" style={{ marginBottom: '16px' }}>
                            <div className="settings-group form-grid-full">
                              <label className="settings-label">Default University on Registration</label>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                  type="text"
                                  className="settings-input"
                                  style={{ flex: 1 }}
                                  value={adminDefaultUniv}
                                  onChange={(e) => setAdminDefaultUniv(e.target.value)}
                                  placeholder="e.g. University of Madras"
                                />
                                <select
                                  className="settings-select"
                                  style={{ width: 'auto', maxWidth: '180px' }}
                                  value={adminDefaultUniv}
                                  onChange={(e) => setAdminDefaultUniv(e.target.value)}
                                >
                                  <option value="University of Madras">University of Madras</option>
                                  <option value="Anna University">Anna University</option>
                                  <option value="Indian Institute of Technology (IIT) Madras">IIT Madras</option>
                                  <option value="SRM Institute of Science and Technology">SRM Institute</option>
                                  <option value="VIT University">VIT University</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          <div className="settings-toggle-row" style={{ marginBottom: '12px' }}>
                            <div className="toggle-info">
                              <span className="toggle-title">Strict Indian Mobile Phone Validation (+91)</span>
                              <span className="toggle-desc">Require 10-digit Indian Mobile Numbers starting with 6-9 for registration & OTP.</span>
                            </div>
                            <ToggleSwitch 
                              checked={adminStrictPhone}
                              onChange={() => setAdminStrictPhone(!adminStrictPhone)}
                              activeColor="var(--color-red)"
                            />
                          </div>

                          <div className="settings-toggle-row" style={{  marginBottom: '16px' }}>
                            <div className="toggle-info">
                              <span className="toggle-title">Restrict Registration strictly to Default University</span>
                              <span className="toggle-desc">When enabled, students can only register under {adminDefaultUniv}.</span>
                            </div>
                            <ToggleSwitch 
                              checked={adminRestrictUniv}
                              onChange={() => setAdminRestrictUniv(!adminRestrictUniv)}
                              activeColor="var(--color-red)"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={handleSaveRegSettings}
                            className="settings-btn-primary"
                            style={{ padding: '10px 20px', fontSize: '13px' }}
                          >
                            Save Academic Governance Settings
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {adminTab === 'users' && (
                  <div>
                    {selectedUserToBlock && (
                      <div style={{
                        margin: '0 0 24px 0',
                        padding: '24px',
                        background: 'rgba(239, 68, 68, 0.03)',
                        border: '2px solid var(--color-red)',
                        borderRadius: '14px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <h4 style={{ fontFamily: 'var(--font-display)', margin: 0, color: 'var(--color-red)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Restrict Access: {selectedUserToBlock.name}</h4>
                          <button className="settings-btn-secondary" style={{ padding: '4px 12px', fontSize: '11px' }} onClick={() => { setSelectedUserToBlock(null); setErrors({}); }}>Cancel</button>
                        </div>
                        <form onSubmit={handleBlockUserSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'end' }}>
                          <div className="settings-group">
                            <label className="settings-label">Suspension Duration</label>
                            <select 
                              className="settings-select"
                              value={blockDurationHours}
                              onChange={e => setBlockDurationHours(e.target.value)}
                            >
                              {BLOCK_DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                            </select>
                          </div>
                          <div className="settings-group">
                            <label className="settings-label">Violation Reason</label>
                            <input 
                              type="text"
                              className="settings-input"
                              placeholder="e.g. Spam comments on News board"
                              value={blockReasonText}
                              onChange={e => { setBlockReasonText(e.target.value); clearError('blockReasonText'); }}
                              required
                            />
                          </div>
                          {errors.blockReasonText && <span style={{ color: 'var(--color-red)', fontSize: '11px', gridColumn: 'span 2', marginTop: '4px', fontWeight: 600 }}>{errors.blockReasonText}</span>}
                          <button type="submit" className="settings-btn-primary" style={{ background: 'var(--color-red)', borderColor: 'var(--color-red)', gridColumn: 'span 2', marginTop: '12px' }} disabled={submittingBlock}>
                            {submittingBlock ? 'Applying suspension...' : 'Apply Restriction Locks'}
                          </button>
                        </form>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                      <div className="input-with-icon-wrapper" style={{ flex: 1, minWidth: '220px' }}>
                        <FiSearch className="input-icon" />
                        <input
                          type="text"
                          className="settings-input"
                          placeholder="Search users name or email address..."
                          value={userSearchQuery}
                          onChange={e => setUserSearchQuery(e.target.value)}
                        />
                      </div>
                      <select
                        className="settings-select"
                        style={{ width: '150px' }}
                        value={userFilterRole}
                        onChange={e => setUserFilterRole(e.target.value)}
                      >
                        <option value="all">All Roles</option>
                        <option value="student">Student</option>
                        <option value="moderator">Moderator</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                      </select>
                      <select
                        className="settings-select"
                        style={{ width: '160px' }}
                        value={userFilterStatus}
                        onChange={e => setUserFilterStatus(e.target.value)}
                      >
                        <option value="all">All Standings</option>
                        <option value="active">Active Standings</option>
                        <option value="blocked">Restricted Standings</option>
                      </select>
                    </div>

                    <div className="settings-table-wrapper">
                      <table className="settings-table">
                        <thead>
                          <tr>
                            <th>User Details</th>
                            <th>System Role</th>
                            <th>Standing</th>
                            <th style={{ width: '180px' }}>Access Control</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loadingUsers ? (
                            <tr>
                              <td colSpan="4" style={{ textAlign: 'center', padding: '24px' }}>Loading users directory...</td>
                            </tr>
                          ) : filteredUsers.length === 0 ? (
                            <tr>
                              <td colSpan="4" style={{ textAlign: 'center', padding: '24px' }}>No users found matching query.</td>
                            </tr>
                          ) : (
                            filteredUsers.map(u => {
                              const isRestricted = u.isBlocked && (!u.blockedUntil || new Date(u.blockedUntil) > new Date());
                              return (
                                <tr key={u._id}>
                                  <td>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                      <span style={{ fontWeight: 800 }}>{u.name}</span>
                                      <span style={{ fontSize: '11.5px', color: 'var(--color-gray-500)' }}>{u.email}</span>
                                    </div>
                                  </td>
                                  <td>
                                    <select 
                                      className="settings-select"
                                      style={{ padding: '6px 12px', fontSize: '12px' }}
                                      value={u.role}
                                      onChange={e => handleUpdateRole(u._id, e.target.value)}
                                      disabled={u._id === user?._id}
                                    >
                                      <option value="student">Student</option>
                                      <option value="moderator">Moderator</option>
                                      <option value="editor">Editor</option>
                                      <option value="admin">Admin</option>
                                    </select>
                                  </td>
                                  <td>
                                    {isRestricted ? (
                                      <span style={{ color: 'var(--color-red)', fontWeight: 800, fontSize: '11px' }}>SUSPENDED</span>
                                    ) : (
                                      <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '11px' }}>ACTIVE</span>
                                    )}
                                  </td>
                                  <td>
                                    {u._id !== user?._id && (
                                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {isRestricted ? (
                                          <button className="settings-btn-secondary" style={{ padding: '6px 10px', fontSize: '11px', color: '#16a34a' }} onClick={() => handleUnblockUser(u)}>
                                            <FiUnlock style={{ marginRight: '4px' }} /> Lift
                                          </button>
                                        ) : (
                                          <button className="settings-btn-secondary" style={{ padding: '6px 10px', fontSize: '11px', color: 'var(--color-red)', borderColor: 'rgba(239, 68, 68, 0.15)' }} onClick={() => setSelectedUserToBlock(u)}>
                                            <FiLock style={{ marginRight: '4px' }} /> Restrict
                                          </button>
                                        )}
                                        {isAdmin && (
                                          <button
                                            className="settings-btn-secondary"
                                            style={{ padding: '6px 10px', fontSize: '11px', color: 'var(--accent-color)', borderColor: 'var(--accent-color)' }}
                                            title="View platform as this user"
                                            onClick={async () => {
                                              await switchAccount(u._id);
                                              window.location.href = '/';
                                            }}
                                          >
                                            View As
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {adminTab === 'appeals' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {loadingAppeals ? (
                      <div style={{ padding: '24px', textAlign: 'center' }}>Loading user appeals...</div>
                    ) : appealsList.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <FiCheckCircle size={44} color="#16a34a" style={{ marginBottom: '12px' }} />
                        <h4 style={{ margin: 0, fontFamily: 'var(--font-display)', textTransform: 'uppercase' }}>All Appeals Handled</h4>
                        <p style={{ fontSize: '12.5px', color: 'var(--color-gray-500)', marginTop: '4px' }}>There are no pending user restriction appeal requests.</p>
                      </div>
                    ) : (
                      appealsList.map(app => (
                        <div key={app._id} style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: '14px', padding: '24px', background: 'var(--color-paper)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                              <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-black)' }}>{app.name}</span>
                              <span style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginLeft: '8px' }}>({app.email})</span>
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-red)' }}>Reason: {app.blockedReason}</span>
                          </div>
                          <div style={{ background: 'var(--color-white)', border: '1px solid rgba(0, 0, 0, 0.08)', padding: '16px', borderRadius: '10px', fontSize: '13px', fontStyle: 'italic', marginBottom: '20px', lineHeight: 1.5, color: 'var(--color-gray-800)' }}>
                            "{app.appealMessage}"
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label className="settings-label" style={{ fontSize: '9px' }}>Decision explanation note (required for Rejection)</label>
                            <textarea 
                              className="settings-textarea"
                              rows={2}
                              placeholder="Provide reason detail for suspension status maintain..."
                              value={appealResponseText[app._id] || ''}
                              onChange={e => setAppealResponseText({ ...appealResponseText, [app._id]: e.target.value })}
                            />
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                              <button className="settings-btn-secondary" style={{ color: 'var(--color-red)' }} onClick={() => handleResolveAppeal(app._id, 'reject')} disabled={resolvingAppealId !== null}>
                                Reject Appeal
                              </button>
                              <button className="settings-btn-primary" style={{ background: '#16a34a', borderColor: '#16a34a' }} onClick={() => handleResolveAppeal(app._id, 'approve')} disabled={resolvingAppealId !== null}>
                                Approve & Lift Restriction
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
