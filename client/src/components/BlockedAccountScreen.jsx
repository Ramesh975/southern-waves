import { useState } from 'react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { FiLock, FiCalendar, FiClock, FiSend, FiLogOut, FiShield } from 'react-icons/fi';

const BlockedAccountScreen = ({ user, onAppealSubmitted }) => {
  const { logout } = useAuth();
  const [appealText, setAppealText] = useState('');
  const [submitting, setSubmitting] = useState(false);
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

  const handleSubmitAppeal = async (e) => {
    e.preventDefault();
    if (!appealText.trim()) return toast.error('Please write an appeal message.');
    setSubmitting(true);
    try {
      await authAPI.submitAppeal(appealText.trim());
      setAppealDone(true);
      toast.success('Appeal submitted successfully.');
      if (onAppealSubmitted) onAppealSubmitted();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit appeal.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(10, 11, 14, 0.55)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      color: '#e2e8f0',
      pointerEvents: 'auto', // Enable pointer events for modal content
    }}>
      {/* Premium background layout grids */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        pointerEvents: 'none',
      }} />

      <div style={{
        background: '#161920',
        border: '1px solid #232834',
        borderRadius: 12,
        padding: '40px',
        width: '100%',
        maxWidth: 520,
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.02)',
        position: 'relative',
        zIndex: 1,
      }}>
        
        {/* Header/Security Icon */}
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.06)',
            border: '1px solid rgba(239, 68, 68, 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            color: '#f87171',
          }}>
            <FiLock size={24} />
          </div>
          <h1 style={{
            fontSize: 22, fontWeight: 700, color: '#f8fafc',
            letterSpacing: '-0.02em',
            margin: '0 0 8px 0',
          }}>
            Security Alert
          </h1>
          <p style={{ fontSize: 13.5, color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
            This account has been temporarily restricted for a violation of the Southern Waves Terms of Service.
          </p>
        </div>

        {/* Reason Block */}
        <div style={{
          background: '#1b1f2b',
          border: '1px solid #262c3e',
          borderRadius: 8,
          padding: '16px 20px',
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: 6 }}>
            Reason for Suspension
          </div>
          <p style={{ fontSize: 13.5, color: '#cbd5e1', lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
            {user?.blockedReason || 'Violation of community safety guidelines.'}
          </p>
        </div>

        {/* Timeline Details */}
        <div style={{
          display: 'flex', gap: 12, marginBottom: 24,
        }}>
          <div style={{
            flex: 1,
            background: '#1b1f2b',
            border: '1px solid #262c3e',
            borderRadius: 8, padding: '12px 16px',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
              <FiCalendar size={11} /> Date of Release
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>
              {isIndefinite ? 'Permanent' : blockedUntil?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          {!isIndefinite && (
            <div style={{
              flex: 1,
              background: '#1b1f2b',
              border: '1px solid #262c3e',
              borderRadius: 8, padding: '12px 16px',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                <FiClock size={11} /> Remaining
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: isExpired ? '#4ade80' : '#fbbf24' }}>
                {isExpired ? 'Expired' : getDurationText()}
              </span>
            </div>
          )}
        </div>

        {/* Appeal / Recovery Submission */}
        {appealDone ? (
          <div style={{
            background: 'rgba(74, 222, 128, 0.05)',
            border: '1px solid rgba(74, 222, 128, 0.15)',
            borderRadius: 8, padding: '20px',
            textAlign: 'center',
            marginBottom: 20,
          }}>
            <div style={{ color: '#4ade80', fontSize: 14, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <FiShield size={16} /> Appeal Submitted
            </div>
            <p style={{ fontSize: 12.5, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
              Our safety review team will evaluate your statement. You will be notified immediately upon review completion.
            </p>
          </div>
        ) : (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: 10 }}>
              Submit a Statement of Appeal
            </h3>
            <form onSubmit={handleSubmitAppeal}>
              <textarea
                value={appealText}
                onChange={(e) => setAppealText(e.target.value)}
                placeholder="Describe any mitigating circumstances or explain why you believe the suspension should be reviewed..."
                rows={3}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#111318',
                  border: '1px solid #2d3548',
                  borderRadius: 6, padding: '12px 14px',
                  color: '#f8fafc', fontSize: 13, lineHeight: 1.5,
                  resize: 'none', outline: 'none',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s ease',
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#2d3548'}
              />
              <button
                type="submit"
                disabled={submitting || !appealText.trim()}
                style={{
                  marginTop: 10, width: '100%', padding: '11px',
                  background: '#2563eb',
                  border: 'none', borderRadius: 6, color: '#ffffff',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'background 0.15s ease',
                  opacity: (!appealText.trim() || submitting) ? 0.4 : 1,
                }}
              >
                <FiSend size={13} /> {submitting ? 'Submitting...' : 'Send Statement'}
              </button>
            </form>
          </div>
        )}

        {/* Footer / Logout options */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 24, paddingTop: 20, borderTop: '1px solid #232834',
        }}>
          <button
            onClick={logout}
            style={{
              background: 'none', border: 'none', color: '#94a3b8',
              fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              padding: 0,
            }}
          >
            <FiLogOut size={13} /> Log out of account
          </button>
          <span style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>
            Southern Waves Security
          </span>
        </div>

      </div>
    </div>
  );
};

export default BlockedAccountScreen;
