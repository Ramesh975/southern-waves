import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';
import { FiMail, FiPhone, FiLock, FiKey, FiUser, FiArrowLeft, FiCheckCircle, FiShield, FiClock, FiHelpCircle } from 'react-icons/fi';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { accent, theme } = useTheme();

  // Mode: 'password' | 'id'
  const [recoveryType, setRecoveryType] = useState('password');
  // Method: 'email' | 'phone'
  const [contactMethod, setContactMethod] = useState('email');

  // Step: 1 = Enter Contact, 2 = Security Questions Challenge, 3 = Reset Password / View ID
  const [step, setStep] = useState(1);

  const [contactValue, setContactValue] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Security Questions Challenge State
  const [userQuestions, setUserQuestions] = useState([]);
  const [secAnswer1, setSecAnswer1] = useState('');
  const [secAnswer2, setSecAnswer2] = useState('');

  const [loading, setLoading] = useState(false);

  // Outcome details for ID recovery
  const [recoveredId, setRecoveredId] = useState(null);

  // Responsive Screen Width
  const [windowWidth, setWindowWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 800));

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 640;

  // Step 1: Fetch Security Questions directly for user
  const handleProceedToSecurityQuestions = async (e) => {
    e.preventDefault();
    if (!contactValue.trim()) {
      return toast.error(`Please enter your registered ${contactMethod === 'email' ? 'Email address' : contactMethod === 'username' ? 'Username' : 'Phone number'}`);
    }

    if (contactMethod === 'email' && !contactValue.includes('@')) {
      return toast.error('Please enter a valid email address');
    }

    setLoading(true);
    try {
      const qRes = await authAPI.getUserSecurityQuestions({ contactValue: contactValue.trim() });
      if (qRes.data?.success && qRes.data?.hasSecurityQuestions && qRes.data?.questions?.length >= 2) {
        setUserQuestions(qRes.data.questions);
        setStep(2);
        toast.success('Account located! Please answer your 2 Security Questions.');
      } else {
        toast.error(qRes.data?.message || 'Security Recovery Not Configured: This account has not set up 2 Security Questions.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to locate user account or security questions not configured.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Handle Security Questions Answer Verification
  const handleVerifySecurityQuestions = async (e) => {
    e.preventDefault();
    if (!secAnswer1.trim() || !secAnswer2.trim()) {
      return toast.error('Please answer both Security Questions');
    }

    setLoading(true);
    try {
      const res = await authAPI.verifySecurityQuestions({
        contactValue: contactValue.trim(),
        answers: [
          { question: userQuestions[0], answer: secAnswer1.trim() },
          { question: userQuestions[1], answer: secAnswer2.trim() },
        ]
      });

      if (recoveryType === 'id') {
        setRecoveredId({
          username: res.data.username,
          email: res.data.email,
          name: res.data.name,
        });
        setStep(3);
        toast.success('Account ID recovered successfully!');
      } else {
        setStep(3);
        toast.success('Security questions verified! Set your new password below.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Incorrect Security Question answers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Handle Resetting Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }
    if (newPassword !== confirmPassword) {
      return toast.error('Passwords do not match');
    }

    setLoading(true);
    try {
      await authAPI.resetPassword({
        contactValue: contactValue.trim(),
        newPassword,
        answers: [
          { question: userQuestions[0], answer: secAnswer1.trim() },
          { question: userQuestions[1], answer: secAnswer2.trim() },
        ]
      });

      toast.success('Password updated successfully! Redirecting to Sign In...');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? '20px 12px' : '40px 20px',
      background: 'var(--color-bg-primary, #f9fafb)',
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        background: 'var(--color-white, #ffffff)',
        color: 'var(--color-black, #111827)',
        borderRadius: '16px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
        border: '1px solid var(--color-gray-200, #e5e7eb)',
        padding: isMobile ? '24px 16px' : '32px',
      }}>
        {/* Top Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%',
            background: 'var(--color-gray-100)', color: 'var(--accent-color, #c8102e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
          }}>
            <FiShield size={24} />
          </div>
          <h2 style={{ fontSize: isMobile ? '20px' : '22px', fontWeight: 800, color: 'var(--color-black)', margin: '0 0 6px 0' }}>
            {recoveryType === 'password' ? 'Reset Password' : 'Recover Account ID'}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-gray-500)', margin: 0 }}>
            {recoveryType === 'password'
              ? 'Mandatory Security Questions identity verification'
              : 'Recover your registered system handle (@username)'}
          </p>
        </div>

        {/* Tab selector for Recovery Mode */}
        {step === 1 && (
          <div style={{ display: 'flex', background: 'var(--color-gray-100)', borderRadius: '10px', padding: '4px', marginBottom: '24px' }}>
            <button
              type="button"
              onClick={() => { setRecoveryType('password'); setStep(1); }}
              style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                background: recoveryType === 'password' ? 'var(--color-white)' : 'transparent',
                color: recoveryType === 'password' ? 'var(--color-black)' : 'var(--color-gray-500)',
                boxShadow: recoveryType === 'password' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              <FiKey size={13} style={{ marginRight: '6px' }} /> Forgot Password
            </button>
            <button
              type="button"
              onClick={() => { setRecoveryType('id'); setStep(1); }}
              style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                background: recoveryType === 'id' ? 'var(--color-white)' : 'transparent',
                color: recoveryType === 'id' ? 'var(--color-black)' : 'var(--color-gray-500)',
                boxShadow: recoveryType === 'id' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              <FiUser size={13} style={{ marginRight: '6px' }} /> Recover Account ID
            </button>
          </div>
        )}

        {/* STEP 1: Enter Contact Detail */}
        {step === 1 && (
          <form onSubmit={handleProceedToSecurityQuestions}>
            {/* Status Notice Badge */}
            <div style={{
              background: 'var(--color-gray-100)',
              border: '1px solid var(--color-gray-200)',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '20px',
              fontSize: '12px',
              color: 'var(--color-black)',
              lineHeight: 1.4,
            }}>
              🛡️ <strong>Identity Protection:</strong> Account recovery strictly requires answering your 2 registered <strong>Security Questions</strong>.
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-gray-700)', display: 'block', marginBottom: '8px' }}>
                Account Search Channel
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setContactMethod('email')}
                  style={{
                    flex: 1, padding: '10px 4px', borderRadius: '8px',
                    border: contactMethod === 'email' ? '2px solid var(--accent-color)' : '1px solid var(--color-gray-300)',
                    background: contactMethod === 'email' ? 'var(--color-gray-100)' : 'var(--color-white)',
                    color: 'var(--color-black)',
                    fontWeight: 700, fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                  }}
                >
                  <FiMail size={13} /> Registered Email
                </button>
                <button
                  type="button"
                  onClick={() => setContactMethod('phone')}
                  style={{
                    flex: 1, padding: '10px 4px', borderRadius: '8px',
                    border: contactMethod === 'phone' ? '2px solid var(--accent-color)' : '1px solid var(--color-gray-300)',
                    background: contactMethod === 'phone' ? 'var(--color-gray-100)' : 'var(--color-white)',
                    color: 'var(--color-black)',
                    fontWeight: 700, fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                  }}
                >
                  <FiPhone size={13} /> Registered Mobile
                </button>
                <button
                  type="button"
                  onClick={() => setContactMethod('username')}
                  style={{
                    flex: 1, padding: '10px 4px', borderRadius: '8px',
                    border: contactMethod === 'username' ? '2px solid var(--accent-color)' : '1px solid var(--color-gray-300)',
                    background: contactMethod === 'username' ? 'var(--color-gray-100)' : 'var(--color-white)',
                    color: 'var(--color-black)',
                    fontWeight: 700, fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                  }}
                >
                  <FiUser size={13} /> Username
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">
                {contactMethod === 'email' ? 'Registered Email Address' : contactMethod === 'username' ? 'Registered Username / System Handle' : 'Registered Mobile Number (+91)'}
              </label>
              <input
                type={contactMethod === 'email' ? 'email' : 'text'}
                className="form-input"
                placeholder={contactMethod === 'email' ? 'student@university.edu' : contactMethod === 'username' ? 'e.g. london_morries' : '+91 9876543210'}
                value={contactValue}
                onChange={(e) => setContactValue(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px', borderRadius: '10px',
                background: 'var(--accent-color)', color: '#fff',
                fontWeight: 800, fontSize: '14px', border: 'none', cursor: 'pointer',
              }}
            >
              {loading ? 'Locating Account...' : 'Continue to Security Questions'}
            </button>
          </form>
        )}

        {/* STEP 2: Security Questions Challenge */}
        {step === 2 && (
          <form onSubmit={handleVerifySecurityQuestions}>
            <div style={{ background: 'var(--color-gray-100)', border: '1px solid var(--color-gray-200)', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '12px', color: 'var(--color-black)' }}>
              🛡️ <strong>Identity Challenge:</strong> Please answer your 2 Security Questions for account <strong>{contactValue}</strong>.
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>
                1. {userQuestions[0]}
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter Answer 1"
                value={secAnswer1}
                onChange={(e) => setSecAnswer1(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>
                2. {userQuestions[1]}
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter Answer 2"
                value={secAnswer2}
                onChange={(e) => setSecAnswer2(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{ padding: '12px 18px', borderRadius: '10px', background: 'var(--color-gray-100)', border: 'none', fontWeight: 700, color: 'var(--color-gray-700)', cursor: 'pointer' }}
              >
                <FiArrowLeft size={16} />
              </button>
              <button
                type="submit"
                disabled={loading || !secAnswer1.trim() || !secAnswer2.trim()}
                style={{
                  flex: 1, padding: '14px', borderRadius: '10px',
                  background: 'var(--accent-color)', color: '#fff',
                  fontWeight: 800, fontSize: '14px', border: 'none', cursor: 'pointer',
                }}
              >
                {loading ? 'Verifying Answers...' : 'Verify Security Answers'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Password Reset OR Account ID Display */}
        {step === 3 && recoveryType === 'password' && (
          <form onSubmit={handleResetPassword}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px', borderRadius: '10px',
                background: 'var(--accent-color)', color: '#fff',
                fontWeight: 800, fontSize: '14px', border: 'none', cursor: 'pointer',
              }}
            >
              {loading ? 'Updating Password...' : 'Save New Password & Sign In'}
            </button>
          </form>
        )}

        {step === 3 && recoveryType === 'id' && recoveredId && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ background: 'var(--color-gray-100)', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid var(--color-gray-200)' }}>
              <span style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--color-gray-500)' }}>
                Your Registered System Handle
              </span>
              <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--accent-color)', margin: '8px 0' }}>
                @{recoveredId.username}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--color-gray-600)', margin: 0 }}>
                Account Name: <strong>{recoveredId.name}</strong> ({recoveredId.email})
              </p>
            </div>

            <Link
              to="/login"
              style={{
                display: 'block', width: '100%', padding: '14px', borderRadius: '10px',
                background: 'var(--accent-color)', color: '#fff',
                fontWeight: 800, fontSize: '14px', textDecoration: 'none', boxSizing: 'border-box',
              }}
            >
              Proceed to Sign In
            </Link>
          </div>
        )}

        {/* Back to Login Link */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <Link to="/login" style={{ color: 'var(--color-gray-600)', fontSize: '13px', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <FiArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
