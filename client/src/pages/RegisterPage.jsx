import React, { useState, useEffect } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authAPI, filterAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  FiUser, FiMail, FiPhone, FiLock, FiCheckCircle, FiShield,
  FiBook, FiArrowRight, FiArrowLeft, FiCheck, FiX, FiHelpCircle, FiClock,
  FiEye, FiEyeOff, FiKey, FiRefreshCw
} from 'react-icons/fi';

const RegisterPage = () => {
  const { register, user, loading } = useAuth();
  const { accent, theme } = useTheme();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Screen Width for Mobile Responsiveness
  const [windowWidth, setWindowWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 800));

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 640;

  // System Settings Config from Admin
  const [publicSettings, setPublicSettings] = useState({
    defaultUniversity: 'University of Madras',
    restrictToDefaultUniversity: false,
    strictIndianPhone: true,
    allowedUniversities: ['University of Madras', 'Anna University', 'IIT Madras', 'SRM Institute', 'VIT University', 'Loyola College', 'Presidency College'],
  });

  // Form State
  const [form, setForm] = useState({
    // Step 1: Personal
    firstName: '',
    lastName: '',
    age: '',
    gender: 'male',
    // Step 2: Contact
    email: '',
    phone: '',
    // Step 3: Education
    educationLevel: 'Undergraduate Degree',
    university: 'University of Madras',
    academicMajor: '',
    yearOfStudy: '1st Year / Freshman',
    // Step 4: Setup & Credentials
    username: '',
    password: '',
    confirmPassword: '',
    // Step 5: Security Questions & Recovery Setup
    securityQuestion1: 'What was the name of your first pet?',
    securityAnswer1: '',
    securityQuestion2: "What is your mother's maiden name?",
    securityAnswer2: '',
    agreeTerms: false,
  });

  const SECURITY_QUESTION_OPTIONS = [
    "What was the name of your first pet?",
    "What is your mother's maiden name?",
    "What was the name of your elementary / primary school?",
    "In what city or town were you born?",
    "What was your favorite food as a child?",
    "What was the make of your first car or bicycle?",
    "What is your favorite book or movie?",
    "What was your childhood nickname?"
  ];

  useEffect(() => {
    filterAPI.getPublicSettings()
      .then((res) => {
        if (res.data?.success && res.data?.data) {
          const cfg = res.data.data;
          setPublicSettings(cfg);
          if (cfg.defaultUniversity) {
            setForm(prev => ({ ...prev, university: cfg.defaultUniversity }));
          }
        }
      })
      .catch((err) => console.warn('Public settings fetch fallback:', err.message));
  }, []);

  // Verification States (Step 2)
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [emailTimer, setEmailTimer] = useState(0);
  const [phoneTimer, setPhoneTimer] = useState(0);
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  const [sendingPhoneOtp, setSendingPhoneOtp] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState(false);

  // Username validation state (Step 4)
  const [usernameStatus, setUsernameStatus] = useState({ checking: false, available: null, message: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Strong password generator
  const generateStrongPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%&*';
    let pwd = '';
    // Ensure at least one upper, one lower, one number, one special
    pwd += 'ABCDEFGHJKMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)];
    pwd += 'abcdefghjkmnpqrstuvwxyz'[Math.floor(Math.random() * 24)];
    pwd += '23456789'[Math.floor(Math.random() * 8)];
    pwd += '!@#$%&*'[Math.floor(Math.random() * 7)];
    for (let i = 4; i < 14; i++) {
      pwd += chars[Math.floor(Math.random() * chars.length)];
    }
    // Shuffle
    pwd = pwd.split('').sort(() => 0.5 - Math.random()).join('');
    setForm(prev => ({ ...prev, password: pwd, confirmPassword: pwd }));
    setShowPassword(true);
    setShowConfirmPassword(true);
    toast.success('Strong password generated and filled! 🔐');
  };

  // Terms Modal State
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Countdown timers
  useEffect(() => {
    let t1, t2;
    if (emailTimer > 0) t1 = setInterval(() => setEmailTimer(prev => prev - 1), 1000);
    if (phoneTimer > 0) t2 = setInterval(() => setPhoneTimer(prev => prev - 1), 1000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [emailTimer, phoneTimer]);

  if (!loading && user) return <Navigate to="/" replace />;

  // --- Step 2: Send & Verify Email OTP ---
  const handleSendEmailOtp = async () => {
    if (!form.email || !form.email.includes('@')) {
      return toast.error('Please enter a valid email address');
    }
    setSendingEmailOtp(true);
    try {
      const res = await authAPI.sendEmailOtp(form.email);
      toast.success(res.data.message || 'OTP code sent to email');
      if (res.data.otp) {
        setEmailOtp(res.data.otp);
        toast(`🔑 Email OTP Code: ${res.data.otp}`, { duration: 9000, icon: '✉️' });
      }
      setEmailOtpSent(true);
      setEmailTimer(60);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send email OTP');
    } finally {
      setSendingEmailOtp(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp.trim()) return toast.error('Enter the OTP code received');
    setVerifyingEmail(true);
    try {
      await authAPI.verifyEmailOtp(form.email, emailOtp.trim());
      setEmailVerified(true);
      toast.success('Email verified successfully! ✓');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid email OTP');
    } finally {
      setVerifyingEmail(false);
    }
  };

  // Indian Phone Validation Helper
  const isValidIndianPhone = (phoneStr) => {
    if (!phoneStr) return false;
    const clean = phoneStr.replace(/[\s-]/g, '');
    return /^(?:\+91|0)?[6-9]\d{9}$/.test(clean);
  };

  // --- Step 2: Send & Verify Phone OTP ---
  const handleSendPhoneOtp = async () => {
    if (!form.phone || !form.phone.trim()) {
      return toast.error('Please enter your Mobile Phone number');
    }
    if (publicSettings.strictIndianPhone && !isValidIndianPhone(form.phone)) {
      return toast.error('Please enter a valid 10-digit Indian Mobile Number (+91) starting with 6-9');
    }
    setSendingPhoneOtp(true);
    try {
      const res = await authAPI.sendPhoneOtp(form.phone);
      toast.success(res.data.message || 'OTP code sent to mobile phone');
      if (res.data.otp) {
        setPhoneOtp(res.data.otp);
        toast(`🔑 Mobile OTP Code: ${res.data.otp}`, { duration: 9000, icon: '📱' });
      }
      setPhoneOtpSent(true);
      setPhoneTimer(60);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send phone OTP');
    } finally {
      setSendingPhoneOtp(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!phoneOtp.trim()) return toast.error('Enter the Mobile OTP code');
    setVerifyingPhone(true);
    try {
      await authAPI.verifyPhoneOtp(form.phone, phoneOtp.trim());
      setPhoneVerified(true);
      toast.success('Mobile phone verified successfully! ✓');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid phone OTP');
    } finally {
      setVerifyingPhone(false);
    }
  };

  // --- Step 4: Check Username Availability ---
  const handleCheckUsername = async (value) => {
    const clean = value.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
    setForm(prev => ({ ...prev, username: clean }));

    if (clean.length < 3) {
      setUsernameStatus({ checking: false, available: false, message: 'At least 3 characters' });
      return;
    }

    setUsernameStatus({ checking: true, available: null, message: 'Checking availability...' });
    try {
      const res = await authAPI.checkUsername(clean);
      if (res.data.available) {
        setUsernameStatus({ checking: false, available: true, message: `@${clean} is available!` });
      } else {
        setUsernameStatus({ checking: false, available: false, message: `@${clean} is taken. Try another.` });
      }
    } catch (err) {
      setUsernameStatus({ checking: false, available: false, message: err.response?.data?.message || 'Invalid handle format' });
    }
  };

  // Step Navigations
  const handleNextStep1 = (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) return toast.error('First and Last name are required');
    if (!form.age || Number(form.age) < 13) return toast.error('Please enter a valid age (must be 13 or older)');
    setStep(2);
  };

  const handleNextStep2 = (e) => {
    e.preventDefault();
    if (!emailVerified) return toast.error('Please verify your email address to proceed');
    if (!phoneVerified) return toast.error('Please verify your mobile phone number to proceed');
    setStep(3);
  };

  const handleNextStep3 = (e) => {
    e.preventDefault();
    if (!form.university.trim()) return toast.error('University/Institution is required');
    if (!form.academicMajor.trim()) return toast.error('Academic Major/Field is required');
    
    // Auto suggest username if empty
    if (!form.username) {
      const suggested = (form.firstName + '_' + form.lastName).toLowerCase().replace(/[^a-z0-9_]/g, '');
      handleCheckUsername(suggested);
    }
    setStep(4);
  };

  const handleNextStep4 = (e) => {
    e.preventDefault();
    if (usernameStatus.available !== true) {
      return toast.error('Please choose a valid & available username handle');
    }
    if (!form.password || form.password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }
    if (form.password !== form.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    setStep(5);
  };

  const STEPS_LIST = [
    { num: 1, label: 'Personal' },
    { num: 2, label: 'Contact' },
    { num: 3, label: 'Academics' },
    { num: 4, label: 'Credentials' },
    { num: 5, label: 'Security' },
  ];

  return (
    <div className="auth-page" style={{
      minHeight: '85vh',
      padding: isMobile ? '16px 12px' : '32px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg-primary, #f9fafb)',
    }}>
      <div className="auth-card" style={{
        maxWidth: '580px',
        width: '100%',
        borderRadius: '20px',
        border: '1px solid var(--color-gray-200, #e5e7eb)',
        background: 'var(--color-white, #ffffff)',
        color: 'var(--color-black, #111827)',
        padding: isMobile ? '24px 16px' : '36px 30px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.06)',
      }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? '20px' : '28px' }}>
          <p className="auth-logo" style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: 900, color: 'var(--accent-color, #c8102e)', margin: 0 }}>
            Southern Waves
          </p>
          <p className="auth-subtitle" style={{ fontSize: '13px', color: 'var(--color-gray-500)', marginTop: '4px' }}>
            5-Step Student Identity Registration
          </p>
        </div>

        {/* Wizard Step Progress Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isMobile ? '24px' : '32px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '14px', left: '8%', right: '8%', height: '2px', background: 'var(--color-gray-200)', zIndex: 0 }} />
          <div style={{
            position: 'absolute', top: '14px', left: '8%',
            width: `${((step - 1) / 4) * 84}%`,
            height: '2px', background: 'var(--accent-color, #c8102e)', zIndex: 0, transition: 'all 0.3s ease'
          }} />

          {STEPS_LIST.map((s) => (
            <div key={s.num} style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  width: isMobile ? '26px' : '30px',
                  height: isMobile ? '26px' : '30px',
                  borderRadius: '50%',
                  background: step >= s.num ? 'var(--accent-color, #c8102e)' : 'var(--color-gray-200)',
                  color: step >= s.num ? '#ffffff' : 'var(--color-gray-500)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: isMobile ? '11px' : '13px',
                  transition: 'all 0.3s ease'
                }}
              >
                {step > s.num ? <FiCheck size={isMobile ? 14 : 16} /> : s.num}
              </div>
              {!isMobile && (
                <span style={{ fontSize: '11px', fontWeight: 700, marginTop: '6px', color: step === s.num ? 'var(--color-black)' : 'var(--color-gray-400)' }}>
                  {s.label}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* STEP 1: Basic Details (Name, Age, Gender) */}
        {step === 1 && (
          <form onSubmit={handleNextStep1}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '18px', color: 'var(--color-black)', borderBottom: '1px solid var(--color-gray-200)', paddingBottom: '8px' }}>
              Step 1 of 5: Personal Details
            </h3>

            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '14px', marginBottom: '16px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Alex"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Morgan"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '14px', marginBottom: '24px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Age</label>
                <input
                  type="number"
                  min="13"
                  max="100"
                  className="form-input"
                  placeholder="20"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  required
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Gender</label>
                <select
                  className="form-input"
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '14px', borderRadius: '10px', background: 'var(--accent-color, #c8102e)', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              Continue to Contact Verification <FiArrowRight size={18} />
            </button>
          </form>
        )}

        {/* STEP 2: Contact & Verification (Mobile & Email OTP) */}
        {step === 2 && (
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '18px', color: 'var(--color-black)', borderBottom: '1px solid var(--color-gray-200)', paddingBottom: '8px' }}>
              Step 2 of 5: Contact & Live Verification
            </h3>

            {/* Email Box */}
            <div style={{ background: 'var(--color-gray-100)', padding: '16px', borderRadius: '12px', marginBottom: '16px', border: '1px solid var(--color-gray-200)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-black)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FiMail size={16} /> Email Address
                </label>
                {emailVerified && (
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FiCheckCircle size={14} /> Verified
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '8px' }}>
                <input
                  type="email"
                  disabled={emailVerified}
                  className="form-input"
                  placeholder="student@university.edu"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  style={{ flex: 1, background: emailVerified ? 'var(--color-gray-200)' : 'var(--color-white)' }}
                />
                {!emailVerified && (
                  <button
                    type="button"
                    disabled={sendingEmailOtp || emailTimer > 0 || !form.email}
                    onClick={handleSendEmailOtp}
                    style={{
                      padding: '10px 18px',
                      minHeight: '44px',
                      borderRadius: '8px',
                      background: 'var(--color-black)',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '13px',
                      border: 'none',
                      cursor: (sendingEmailOtp || emailTimer > 0 || !form.email) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      whiteSpace: 'nowrap',
                      opacity: (sendingEmailOtp || emailTimer > 0 || !form.email) ? 0.6 : 1
                    }}
                  >
                    {sendingEmailOtp ? 'Sending...' : emailTimer > 0 ? `${emailTimer}s` : emailOtpSent ? 'Resend OTP' : 'Send OTP'}
                  </button>
                )}
              </div>

              {/* Email OTP Input */}
              {emailOtpSent && !emailVerified && (
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '8px', marginTop: '10px' }}>
                  <input
                    type="text"
                    maxLength={6}
                    className="form-input"
                    placeholder="6-digit Email OTP"
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                    style={{ flex: 1, letterSpacing: '2px', fontWeight: 700 }}
                  />
                  <button
                    type="button"
                    disabled={verifyingEmail || emailOtp.length < 6}
                    onClick={handleVerifyEmailOtp}
                    style={{
                      padding: '10px 18px',
                      minHeight: '44px',
                      borderRadius: '8px',
                      background: 'var(--accent-color)',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '13px',
                      border: 'none',
                      cursor: (verifyingEmail || emailOtp.length < 6) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {verifyingEmail ? 'Verifying...' : 'Verify Email'}
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Phone Box */}
            <div style={{ background: 'var(--color-gray-100)', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid var(--color-gray-200)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-black)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FiPhone size={16} /> Mobile Phone (+91)
                </label>
                {phoneVerified && (
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FiCheckCircle size={14} /> Verified
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '8px' }}>
                <input
                  type="text"
                  disabled={phoneVerified}
                  className="form-input"
                  placeholder="+91 9876543210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  style={{ flex: 1, background: phoneVerified ? 'var(--color-gray-200)' : 'var(--color-white)' }}
                />
                {!phoneVerified && (
                  <button
                    type="button"
                    disabled={sendingPhoneOtp || phoneTimer > 0 || !form.phone}
                    onClick={handleSendPhoneOtp}
                    style={{
                      padding: '10px 18px',
                      minHeight: '44px',
                      borderRadius: '8px',
                      background: 'var(--color-black)',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '13px',
                      border: 'none',
                      cursor: (sendingPhoneOtp || phoneTimer > 0 || !form.phone) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      whiteSpace: 'nowrap',
                      opacity: (sendingPhoneOtp || phoneTimer > 0 || !form.phone) ? 0.6 : 1
                    }}
                  >
                    {sendingPhoneOtp ? 'Sending...' : phoneTimer > 0 ? `${phoneTimer}s` : phoneOtpSent ? 'Resend OTP' : 'Send OTP'}
                  </button>
                )}
              </div>

              {/* Phone OTP Input */}
              {phoneOtpSent && !phoneVerified && (
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '8px', marginTop: '10px' }}>
                  <input
                    type="text"
                    maxLength={6}
                    className="form-input"
                    placeholder="6-digit Mobile OTP"
                    value={phoneOtp}
                    onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ''))}
                    style={{ flex: 1, letterSpacing: '2px', fontWeight: 700 }}
                  />
                  <button
                    type="button"
                    disabled={verifyingPhone || phoneOtp.length < 6}
                    onClick={handleVerifyPhoneOtp}
                    style={{
                      padding: '10px 18px',
                      minHeight: '44px',
                      borderRadius: '8px',
                      background: 'var(--accent-color)',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '13px',
                      border: 'none',
                      cursor: (verifyingPhone || phoneOtp.length < 6) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {verifyingPhone ? 'Verifying...' : 'Verify Mobile'}
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" onClick={() => setStep(1)} style={{ padding: '12px 20px', borderRadius: '10px', background: 'var(--color-gray-100)', border: 'none', fontWeight: 700, color: 'var(--color-gray-700)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiArrowLeft size={16} /> Back
              </button>
              <button type="button" onClick={handleNextStep2} style={{ flex: 1, padding: '12px 20px', borderRadius: '10px', background: 'var(--accent-color)', border: 'none', color: '#fff', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                Continue to Academics <FiArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Education & Academic Details */}
        {step === 3 && (
          <form onSubmit={handleNextStep3}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '18px', color: 'var(--color-black)', borderBottom: '1px solid var(--color-gray-200)', paddingBottom: '8px' }}>
              Step 3 of 5: Education & Academic Details
            </h3>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Education Level</label>
              <select
                className="form-input"
                value={form.educationLevel}
                onChange={(e) => setForm({ ...form, educationLevel: e.target.value })}
              >
                <option value="Undergraduate Degree">Undergraduate Degree (UG / Bachelor's)</option>
                <option value="Postgraduate / Master Degree">Postgraduate Degree (PG / Master's)</option>
                <option value="Doctorate / PhD">Doctorate / PhD Research Scholar</option>
                <option value="Diploma / Associate Degree">Diploma / Polytechnic</option>
                <option value="Higher Secondary / High School">Higher Secondary / 12th Standard</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>University / College / Campus</span>
                <span style={{ fontSize: '11px', color: 'var(--color-gray-500)' }}>Select or Type Custom</span>
              </label>
              
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '8px' }}>
                <input
                  type="text"
                  list="university-options-list"
                  className="form-input"
                  style={{ flex: 1 }}
                  placeholder="e.g. University of Madras"
                  value={form.university}
                  onChange={(e) => setForm({ ...form, university: e.target.value })}
                  readOnly={publicSettings.restrictToDefaultUniversity}
                  required
                />
                {!publicSettings.restrictToDefaultUniversity && (
                  <select
                    className="form-input"
                    style={{ width: isMobile ? '100%' : 'auto', maxWidth: isMobile ? '100%' : '200px', fontSize: '12px' }}
                    value={form.university}
                    onChange={(e) => setForm({ ...form, university: e.target.value })}
                  >
                    <option value="">-- Quick Campus List --</option>
                    <option value="University of Madras (Chepauk / Marina / Guindy)">University of Madras</option>
                    <option value="Anna University (CEG / ACT / SAP / MIT)">Anna University</option>
                    <option value="Indian Institute of Technology (IIT) Madras">IIT Madras</option>
                    <option value="SRM Institute of Science and Technology">SRM Institute</option>
                    <option value="VIT University (Chennai / Vellore)">VIT University</option>
                    <option value="Loyola College, Chennai">Loyola College</option>
                    <option value="Presidency College, Chennai">Presidency College</option>
                    <option value="Madras Christian College (MCC)">Madras Christian College</option>
                    <option value="Stella Maris College, Chennai">Stella Maris College</option>
                    <option value="Madurai Kamaraj University">Madurai Kamaraj Univ</option>
                    <option value="Bharathiar University, Coimbatore">Bharathiar University</option>
                  </select>
                )}
              </div>

              <datalist id="university-options-list">
                <option value="University of Madras" />
                <option value="Anna University" />
                <option value="Indian Institute of Technology (IIT) Madras" />
                <option value="SRM Institute of Science and Technology" />
                <option value="VIT University" />
                <option value="Loyola College, Chennai" />
                <option value="Presidency College, Chennai" />
                <option value="Madras Christian College (MCC)" />
                <option value="Stella Maris College, Chennai" />
                <option value="Madurai Kamaraj University" />
                <option value="Bharathiar University, Coimbatore" />
              </datalist>

              {publicSettings.restrictToDefaultUniversity && (
                <p style={{ fontSize: '11px', color: 'var(--accent-color)', marginTop: '4px', fontWeight: 600 }}>
                  * Registration is currently restricted to students of {publicSettings.defaultUniversity}.
                </p>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '14px', marginBottom: '24px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Course / Academic Major</span>
                  <span style={{ fontSize: '11px', color: 'var(--color-gray-500)' }}>Select / Type</span>
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <input
                    type="text"
                    list="course-options-list"
                    className="form-input"
                    placeholder="e.g. Computer Science / Journalism"
                    value={form.academicMajor}
                    onChange={(e) => setForm({ ...form, academicMajor: e.target.value })}
                    required
                  />
                  <select
                    className="form-input"
                    style={{ fontSize: '12px' }}
                    value=""
                    onChange={(e) => {
                      if (e.target.value) setForm({ ...form, academicMajor: e.target.value });
                    }}
                  >
                    <option value="">-- Quick Course / Major Select --</option>
                    <option value="Computer Science & Engineering">Computer Science & Engg</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Journalism & Mass Communication">Journalism & Mass Comm</option>
                    <option value="Visual Communication / Media Arts">Visual Communication</option>
                    <option value="B.Com / Commerce & Finance">B.Com / Commerce & Finance</option>
                    <option value="BBA / Business Administration">BBA / Business Administration</option>
                    <option value="English Literature">English Literature</option>
                    <option value="Tamil Literature">Tamil Literature</option>
                    <option value="Law / LLB / Legal Studies">Law / LLB / Legal Studies</option>
                    <option value="Economics">Economics</option>
                    <option value="Mechanical / Civil / Electrical Engg">Core Engineering</option>
                    <option value="Physics / Chemistry / Maths">Pure Sciences (Physics/Chem/Math)</option>
                    <option value="Medicine / Biotechnology">Biotechnology / Life Sciences</option>
                  </select>
                </div>
                <datalist id="course-options-list">
                  <option value="Computer Science & Engineering" />
                  <option value="Information Technology" />
                  <option value="Journalism & Mass Communication" />
                  <option value="Visual Communication" />
                  <option value="Commerce & Accounting" />
                  <option value="Business Administration" />
                  <option value="English Literature" />
                  <option value="Tamil Literature" />
                  <option value="Law & Legal Studies" />
                  <option value="Economics" />
                </datalist>
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Designation / Year of Study</label>
                <select
                  className="form-input"
                  value={form.yearOfStudy}
                  onChange={(e) => setForm({ ...form, yearOfStudy: e.target.value })}
                >
                  <option value="1st Year / Freshman">1st Year / Freshman</option>
                  <option value="2nd Year / Sophomore">2nd Year / Sophomore</option>
                  <option value="3rd Year / Junior">3rd Year / Junior</option>
                  <option value="Final Year / Senior">Final Year / Senior</option>
                  <option value="Postgraduate (1st / 2nd Year)">Postgraduate (1st / 2nd Year)</option>
                  <option value="Doctorate / PhD Scholar">Doctorate / PhD Scholar</option>
                  <option value="Alumni / Graduate">Alumni / Graduate</option>
                  <option value="Faculty / Staff Member">Faculty / Staff Member</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" onClick={() => setStep(2)} style={{ padding: '12px 20px', borderRadius: '10px', background: 'var(--color-gray-100)', border: 'none', fontWeight: 700, color: 'var(--color-gray-700)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiArrowLeft size={16} /> Back
              </button>
              <button type="submit" style={{ flex: 1, padding: '12px 20px', borderRadius: '10px', background: 'var(--accent-color)', border: 'none', color: '#fff', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                Continue to Credentials <FiArrowRight size={16} />
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: Credentials & Username */}
        {step === 4 && (
          <form onSubmit={handleNextStep4}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '18px', color: 'var(--color-black)', borderBottom: '1px solid var(--color-gray-200)', paddingBottom: '8px' }}>
              Step 4 of 5: Setup Username & Credentials
            </h3>

            {/* Username Field */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>System Handle / Username</span>
                {usernameStatus.message && (
                  <span style={{ color: usernameStatus.available ? '#16a34a' : '#dc2626', fontSize: '12px', fontWeight: 700 }}>
                    {usernameStatus.message}
                  </span>
                )}
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: 'var(--color-gray-400)' }}>@</span>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '32px' }}
                  placeholder="alex_morgan"
                  value={form.username}
                  onChange={(e) => handleCheckUsername(e.target.value)}
                  required
                />
              </div>
              <p style={{ fontSize: '11px', color: 'var(--color-gray-500)', marginTop: '4px' }}>
                Your username is your primary handle across feeds, posts, and comments. Real name stays private by default.
              </p>
            </div>

            {/* Password Suggestion Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-black)' }}>Password Setup</span>
              <button
                type="button"
                onClick={generateStrongPassword}
                style={{
                  background: 'rgba(0,85,164,0.08)',
                  color: 'var(--accent-color)',
                  border: '1px solid var(--accent-color)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <FiKey size={13} /> Suggest Strong Password
              </button>
            </div>

            {/* Passwords with Eye Visibility Toggles */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '14px', marginBottom: '20px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    style={{ paddingRight: '38px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-gray-500)',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    style={{ paddingRight: '38px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(prev => !prev)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-gray-500)',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" onClick={() => setStep(3)} style={{ padding: '12px 20px', borderRadius: '10px', background: 'var(--color-gray-100)', border: 'none', fontWeight: 700, color: 'var(--color-gray-700)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiArrowLeft size={16} /> Back
              </button>
              <button
                type="submit"
                disabled={usernameStatus.available !== true}
                style={{
                  flex: 1, padding: '14px', borderRadius: '10px', background: 'var(--accent-color)', color: '#fff', fontWeight: 800, fontSize: '14px', border: 'none', cursor: usernameStatus.available !== true ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                Continue to Security Questions <FiArrowRight size={16} />
              </button>
            </div>
          </form>
        )}

        {/* STEP 5: Account Recovery & Security Questions Setup */}
        {step === 5 && (
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!form.agreeTerms) return toast.error('You must agree to the Terms & Conditions');
            if (!form.securityAnswer1.trim() || !form.securityAnswer2.trim()) {
              return toast.error('Please provide answers for both Security Questions');
            }
            if (form.securityQuestion1 === form.securityQuestion2) {
              return toast.error('Please choose 2 different Security Questions');
            }

            setSubmitting(true);
            try {
              await register({
                firstName: form.firstName,
                lastName: form.lastName,
                email: form.email,
                phone: form.phone,
                university: form.university,
                academicMajor: form.academicMajor,
                yearOfStudy: form.yearOfStudy,
                educationLevel: form.educationLevel,
                age: form.age,
                gender: form.gender,
                username: form.username,
                password: form.password,
                emailVerified: true,
                phoneVerified: true,
                securityQuestions: [
                  { question: form.securityQuestion1, answer: form.securityAnswer1.trim() },
                  { question: form.securityQuestion2, answer: form.securityAnswer2.trim() },
                ]
              });
              toast.success('Registration successful! Welcome to Southern Waves');
              navigate('/');
            } catch (err) {
              toast.error(err.response?.data?.message || 'Registration failed');
            } finally {
              setSubmitting(false);
            }
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '18px', color: 'var(--color-black)', borderBottom: '1px solid var(--color-gray-200)', paddingBottom: '8px' }}>
              Step 5 of 5: Account Recovery & Security Questions
            </h3>

            <div style={{ background: 'var(--color-gray-100)', border: '1px solid var(--color-gray-200)', padding: '12px 14px', borderRadius: '10px', marginBottom: '20px', fontSize: '12px', color: 'var(--color-black)', lineHeight: 1.5 }}>
              🛡️ <strong>Anti-Misuse Protection:</strong> Configuring 2 Security Questions ensures only you can recover your Account ID or reset your password even if someone gains temporary access to an email or phone number.
            </div>

            {/* Security Question 1 */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Security Question 1</label>
              <select
                className="form-input"
                style={{ marginBottom: '8px' }}
                value={form.securityQuestion1}
                onChange={(e) => setForm({ ...form, securityQuestion1: e.target.value })}
              >
                {SECURITY_QUESTION_OPTIONS.map((q, idx) => (
                  <option key={idx} value={q}>{q}</option>
                ))}
              </select>
              <input
                type="text"
                className="form-input"
                placeholder="Your Answer to Question 1"
                value={form.securityAnswer1}
                onChange={(e) => setForm({ ...form, securityAnswer1: e.target.value })}
                required
              />
            </div>

            {/* Security Question 2 */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Security Question 2</label>
              <select
                className="form-input"
                style={{ marginBottom: '8px' }}
                value={form.securityQuestion2}
                onChange={(e) => setForm({ ...form, securityQuestion2: e.target.value })}
              >
                {SECURITY_QUESTION_OPTIONS.map((q, idx) => (
                  <option key={idx} value={q}>{q}</option>
                ))}
              </select>
              <input
                type="text"
                className="form-input"
                placeholder="Your Answer to Question 2"
                value={form.securityAnswer2}
                onChange={(e) => setForm({ ...form, securityAnswer2: e.target.value })}
                required
              />
            </div>

            {/* Terms & Conditions Checkbox */}
            <div style={{ background: 'var(--color-gray-100)', padding: '14px', borderRadius: '10px', marginBottom: '24px', border: '1px solid var(--color-gray-200)' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '12px', color: 'var(--color-gray-700)', lineHeight: '1.4' }}>
                <input
                  type="checkbox"
                  checked={form.agreeTerms}
                  onChange={(e) => setForm({ ...form, agreeTerms: e.target.checked })}
                  style={{ marginTop: '2px' }}
                  required
                />
                <span>
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-color)', fontWeight: 700, padding: 0, textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    Terms & Privacy Conditions
                  </button>
                  . I understand that my @username will be used publicly by default, and contact information is accessible to Admins & Moderators for safety governance.
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" onClick={() => setStep(4)} style={{ padding: '12px 20px', borderRadius: '10px', background: 'var(--color-gray-100)', border: 'none', fontWeight: 700, color: 'var(--color-gray-700)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiArrowLeft size={16} /> Back
              </button>
              <button
                type="submit"
                disabled={submitting || !form.agreeTerms || !form.securityAnswer1.trim() || !form.securityAnswer2.trim()}
                style={{
                  flex: 1, padding: '14px', borderRadius: '10px', background: 'var(--accent-color)', color: '#fff', fontWeight: 800, fontSize: '14px', border: 'none', cursor: (submitting || !form.agreeTerms) ? 'not-allowed' : 'pointer'
                }}
              >
                {submitting ? 'Creating Account...' : 'Complete Setup & Register'}
              </button>
            </div>
          </form>
        )}

        {/* Existing Account Footer */}
        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--color-gray-500)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent-color)', fontWeight: 700, textDecoration: 'none' }}>
            Sign In here
          </Link>
        </p>
      </div>

      {/* Terms & Conditions Modal */}
      {showTermsModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ maxWidth: '520px', width: '100%', background: 'var(--color-white)', color: 'var(--color-black)', borderRadius: '16px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', border: '1px solid var(--color-gray-200)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiShield size={18} /> Terms & Identity Guidelines
              </h3>
              <button onClick={() => setShowTermsModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-500)' }}>
                <FiX size={20} />
              </button>
            </div>
            
            <div style={{ fontSize: '12.5px', color: 'var(--color-gray-700)', lineHeight: '1.6', maxHeight: '300px', overflowY: 'auto', paddingRight: '6px' }}>
              <p><strong>1. Username Handle System</strong><br />
              All public interactions (articles, teashop posts, comments) display your primary @username handle by default. Real names are hidden from the public unless enabled in your Settings.</p>
              
              <p><strong>2. Contact & Identity Governance</strong><br />
              Admins and Moderators retain access to registered contact details (email and mobile number) for safety, account verification, and community moderation.</p>

              <p><strong>3. Anti-Misuse Security Questions</strong><br />
              Configured security questions protect your account against unauthorized recovery attempts.</p>
            </div>

            <button
              onClick={() => setShowTermsModal(false)}
              style={{ width: '100%', marginTop: '16px', padding: '12px', borderRadius: '10px', background: 'var(--accent-color)', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }}
            >
              I Understand & Accept
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterPage;
