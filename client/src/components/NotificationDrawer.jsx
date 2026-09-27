import React, { useState, useMemo, useEffect } from 'react';
import {
  FiBell, FiCheck, FiCheckCircle, FiX, FiShield,
  FiExternalLink, FiMessageSquare, FiAlertTriangle,
  FiRadio, FiChevronRight, FiClock, FiArchive,
  FiTag, FiFileText, FiUser, FiMessageCircle,
} from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { resolveNotifUrl } from '../context/ChatContext';
import './NotificationDrawer.css';

// ── Helpers ──────────────────────────────────────────────────────────────────

const getNotificationIcon = (type, priority) => {
  if (priority === 'urgent' || type === 'sensitivity') return <FiAlertTriangle size={13} color="#ef4444" />;
  if (type === 'appeal') return <FiShield size={13} color="#f59e0b" />;
  if (type === 'board_news') return <FiTag size={13} color="#0284c7" />;
  if (type === 'message') return <FiMessageSquare size={13} color="#8b5cf6" />;
  if (type === 'comment') return <FiMessageCircle size={13} color="#7c3aed" />;
  if (type === 'editorial') return <FiFileText size={13} color="#059669" />;
  return <FiRadio size={13} color="#10b981" />;
};

const getTypeLabel = (type, priority) => {
  if (priority === 'urgent') return 'Urgent Alert';
  if (type === 'sensitivity') return 'Security Alert';
  if (type === 'appeal') return 'User Appeal';
  if (type === 'board_news') return 'Campus News';
  if (type === 'message') return 'Chat / Mention';
  if (type === 'comment') return 'Comment';
  if (type === 'editorial') return 'Editorial';
  return 'Announcement';
};

/** Get the label + icon for the contextual CTA based on actionType */
const getCtaConfig = (n) => {
  if (!n.actionType || n.actionType === 'none') return null;
  if (n.actionType === 'open_article') return { label: 'Read Article', icon: <FiFileText size={11} />, variant: 'article' };
  if (n.actionType === 'open_profile') return { label: 'View Profile', icon: <FiUser size={11} />, variant: 'profile' };
  if (n.actionType === 'open_chat_room') return { label: 'Join Room', icon: <FiMessageSquare size={11} />, variant: 'chat' };
  if (n.actionType === 'open_comment') return { label: 'View Comment', icon: <FiMessageCircle size={11} />, variant: 'comment' };
  if (n.actionType === 'navigate') return { label: 'Go There', icon: <FiChevronRight size={11} />, variant: 'navigate' };
  if (n.actionType === 'external_url') return { label: 'Open Link', icon: <FiExternalLink size={11} />, variant: 'external' };
  // Legacy actionUrl fallback
  if (n.actionUrl && !n.actionUrl.startsWith('/notifications')) return { label: 'Open Link', icon: <FiExternalLink size={11} />, variant: 'external' };
  return null;
};

/** User avatar with initial fallback */
const SenderAvatar = ({ sender }) => {
  if (!sender) return null;
  const initial = (sender.name || 'S').charAt(0).toUpperCase();
  return (
    <span className="notif-sender-avatar" title={sender.name}>
      {sender.avatar
        ? <img src={sender.avatar} alt={sender.name} />
        : initial}
    </span>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────

const NotificationDrawer = ({
  notifications = [],
  markNotificationRead,
  markAllNotificationsRead,
  dismissNotification,
  setNotificationsOpen,
  fetchNotifications,
  currentUser,
  navigate,
  openRoom,
  isAdminDrawer = false,
}) => {
  const [activeFilter, setActiveFilter] = useState('active');
  const [expandedId, setExpandedId] = useState(null);
  const [responseTexts, setResponseTexts] = useState({});
  const [appealLoadingId, setAppealLoadingId] = useState(null);

  const isModOrAdmin = currentUser && ['admin', 'moderator', 'editor'].includes(currentUser.role);

  // Listen for the notif:navigate custom event
  useEffect(() => {
    const handler = (e) => {
      const url = e.detail?.url;
      if (!url) return;
      setNotificationsOpen(false);
      navigate(url);
    };
    window.addEventListener('notif:navigate', handler);
    return () => window.removeEventListener('notif:navigate', handler);
  }, [navigate, setNotificationsOpen]);

  // Active drawer rule: unread OR urgent within last 48h AND not dismissed
  const activeAlerts = useMemo(() => {
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    return notifications.filter(n => {
      if (n.isDismissed) return false;
      const isRecent = new Date(n.createdAt).getTime() > cutoff;
      const isUrgent = n.priority === 'urgent' || n.priority === 'high' || n.type === 'appeal' || n.type === 'sensitivity';
      return !n.isRead || (isRecent && isUrgent);
    });
  }, [notifications]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  const displayedAlerts = useMemo(() => {
    if (activeFilter === 'urgent') {
      return activeAlerts.filter(n =>
        n.priority === 'urgent' || n.priority === 'high' || n.type === 'appeal' || n.type === 'sensitivity'
      );
    }
    return activeAlerts;
  }, [activeAlerts, activeFilter]);

  const formatTime = (dateString) => {
    try { return formatDistanceToNow(new Date(dateString), { addSuffix: true }); }
    catch { return 'recently'; }
  };

  // ── Action Handlers ──

  const executeNotificationNavigation = (n) => {
    if (!n.isRead && markNotificationRead) markNotificationRead(n._id);
    const resolved = resolveNotifUrl(n);
    if (!resolved) {
      setExpandedId(expandedId === n._id ? null : n._id);
      return;
    }

    if (typeof resolved === 'object') {
      if (resolved.isChatRoom && openRoom) {
        setNotificationsOpen(false);
        const payload = resolved.payload || {};
        openRoom(payload.roomType || 'category', payload.name || '');
        return;
      }
      if (resolved.isAppealReview) {
        setExpandedId(expandedId === n._id ? null : n._id);
        return;
      }
    }

    if (typeof resolved === 'string') {
      setNotificationsOpen(false);
      if (resolved.startsWith('http')) {
        window.open(resolved, '_blank', 'noopener,noreferrer');
      } else {
        navigate(resolved);
      }
    }
  };

  const handleCtaClick = (e, n) => {
    e.stopPropagation();
    executeNotificationNavigation(n);
  };

  const handleItemClick = (n) => {
    executeNotificationNavigation(n);
  };

  const handleDismiss = (e, n) => {
    e.stopPropagation();
    if (dismissNotification) dismissNotification(n._id);
  };

  const handleResolveAppeal = async (e, n, actionType) => {
    e.stopPropagation();
    const senderId = typeof n.sender === 'object' ? n.sender?._id : n.sender;
    if (!senderId) return toast.error('User information missing');
    const responseMsg = responseTexts[n._id] || '';
    setAppealLoadingId(n._id);
    try {
      if (actionType === 'approve') {
        await authAPI.unblockUser(senderId);
        toast.success('Appeal approved — account restored!');
      } else {
        await authAPI.rejectAppeal(senderId, responseMsg);
        toast.success('Appeal rejected and user notified.');
      }
      if (markNotificationRead) markNotificationRead(n._id);
      if (fetchNotifications) fetchNotifications();
      setExpandedId(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resolve appeal');
    } finally {
      setAppealLoadingId(null);
    }
  };

  const handleOpenHistory = () => {
    setNotificationsOpen(false);
    navigate('/notifications?tab=history');
  };

  // ── Render ──

  return (
    <div
      className="notifications-popover notif-drawer-container"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="notif-drawer-header">
        <div className="notif-drawer-title-row">
          <div className="notif-drawer-icon-wrap">
            <FiBell size={17} color="var(--accent-color, #c8102e)" />
          </div>
          <div>
            <h4 className="notif-drawer-title">
              {isAdminDrawer ? 'Admin Security & Alerts' : 'Alerts Hub'}
            </h4>
            <span className="notif-drawer-subtitle">Active &amp; recent notifications</span>
          </div>
          {unreadCount > 0 && (
            <span className="notif-unread-pill">{unreadCount} new</span>
          )}
        </div>
        <button
          onClick={() => setNotificationsOpen(false)}
          className="notif-close-x"
          title="Close"
        >
          <FiX size={17} />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="notif-drawer-filter-bar">
        <button
          onClick={() => setActiveFilter('active')}
          className={`notif-filter-pill ${activeFilter === 'active' ? 'active' : ''}`}
        >
          Active Alerts ({activeAlerts.length})
        </button>
        <button
          onClick={() => setActiveFilter('urgent')}
          className={`notif-filter-pill ${activeFilter === 'urgent' ? 'active' : ''}`}
        >
          ⚡ Critical &amp; Security
        </button>
        {unreadCount > 0 && (
          <button
            onClick={() => {
              if (markAllNotificationsRead) markAllNotificationsRead();
              toast.success('All marked as read');
            }}
            className="notif-mark-read-quick"
            title="Mark all as read"
          >
            <FiCheck size={12} /> Read all
          </button>
        )}
      </div>

      {/* Notification List */}
      <div className="notif-drawer-list">
        {displayedAlerts.length === 0 ? (
          <div className="notif-drawer-empty">
            <div className="notif-empty-icon-circle">
              <FiCheckCircle size={32} color="#16a34a" />
            </div>
            <h5>You&apos;re All Caught Up!</h5>
            <p>No active alerts. Past notifications are in History.</p>
            <button onClick={handleOpenHistory} className="notif-view-history-btn">
              <FiArchive size={14} /> Open Notification History
            </button>
          </div>
        ) : (
          displayedAlerts.map((n) => {
            const isExpanded = expandedId === n._id;
            const isUrgent = n.priority === 'urgent' || n.priority === 'high' || n.type === 'sensitivity' || n.type === 'appeal';
            const isAppeal = n.type === 'appeal';
            const senderUser = typeof n.sender === 'object' ? n.sender : null;
            const ctaConfig = getCtaConfig(n);
            const isAppealResolved = Boolean(
              n.isResolved ||
              n.resolvedStatus === 'approved' ||
              n.resolvedStatus === 'rejected' ||
              (senderUser && !senderUser.isBlocked && !senderUser.appealRequested)
            );
            const showAppealReview = isAppeal && isModOrAdmin && !isAppealResolved;

            return (
              <div
                key={n._id}
                onClick={() => handleItemClick(n)}
                className={`notif-drawer-item ${!n.isRead ? 'unread' : 'read'} ${isUrgent ? 'urgent' : ''}`}
              >
                {/* Priority stripe */}
                <div className={`notif-priority-stripe ${isUrgent ? 'urgent' : n.type}`} />

                <div className="notif-item-content">
                  {/* Meta row */}
                  <div className="notif-item-meta">
                    <span className={`notif-type-badge ${n.type} ${n.priority || ''}`}>
                      {getNotificationIcon(n.type, n.priority)}
                      <span>{getTypeLabel(n.type, n.priority)}</span>
                    </span>
                    <div className="notif-meta-right">
                      <span className="notif-time-text">
                        <FiClock size={11} style={{ marginRight: '3px' }} />
                        {formatTime(n.createdAt)}
                      </span>
                      {!n.isRead && <span className="notif-glow-dot" title="Unread" />}
                    </div>
                  </div>

                  {/* Sender line */}
                  {senderUser && (
                    <div className="notif-sender-row">
                      <SenderAvatar sender={senderUser} />
                      <span className="notif-sender-name">
                        {senderUser.name || 'System'}
                        {senderUser.role && <span className="notif-sender-role">{senderUser.role}</span>}
                      </span>
                    </div>
                  )}

                  {/* Title */}
                  <h5 className="notif-item-title">{n.title}</h5>

                  {/* Message */}
                  <p className={`notif-item-desc ${isExpanded ? 'expanded' : ''}`}>
                    {n.message}
                  </p>

                  {/* Action strip */}
                  <div className="notif-item-actions" onClick={(e) => e.stopPropagation()}>
                    {!n.isRead && (
                      <button
                        onClick={(e) => { e.stopPropagation(); if (markNotificationRead) markNotificationRead(n._id); }}
                        className="notif-inline-action-btn"
                        title="Mark as read"
                      >
                        <FiCheck size={11} /> Mark Read
                      </button>
                    )}

                    {/* Contextual CTA */}
                    {ctaConfig && n.actionType !== 'appeal_review' && (
                      <button
                        onClick={(e) => handleCtaClick(e, n)}
                        className={`notif-cta-btn ${ctaConfig.variant}`}
                        title={ctaConfig.label}
                      >
                        {ctaConfig.icon}
                        {ctaConfig.label}
                      </button>
                    )}

                    {/* Appeal review toggle (mods/admins only when unresolved) */}
                    {showAppealReview && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : n._id); }}
                        className="notif-inline-action-btn appeal-review-btn"
                      >
                        <FiShield size={11} /> {isExpanded ? 'Hide Review' : 'Review Appeal'}
                      </button>
                    )}

                    {/* Resolved status badge when appeal was already reviewed */}
                    {isAppeal && isAppealResolved && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: n.resolvedStatus === 'rejected' ? '#ef4444' : '#10b981',
                          background: n.resolvedStatus === 'rejected' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: `1px solid ${n.resolvedStatus === 'rejected' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                        }}
                      >
                        <FiCheck size={11} />
                        {n.resolvedStatus === 'rejected' ? 'Appeal Rejected' : 'Appeal Approved & Restored'}
                      </span>
                    )}

                    {/* Dismiss */}
                    <button
                      onClick={(e) => handleDismiss(e, n)}
                      className="notif-dismiss-btn"
                      title="Dismiss from drawer"
                    >
                      <FiX size={11} />
                    </button>
                  </div>

                  {/* Inline Appeal Review Panel */}
                  {isExpanded && isAppeal && isModOrAdmin && !isAppealResolved && (
                    <div className="notif-appeal-deck" onClick={(e) => e.stopPropagation()}>
                      <div className="notif-appeal-deck-header">
                        <FiShield size={14} color="#f59e0b" />
                        <span>Appeal Review</span>
                      </div>
                      <textarea
                        value={responseTexts[n._id] || ''}
                        onChange={(e) => setResponseTexts({ ...responseTexts, [n._id]: e.target.value })}
                        placeholder="Resolution note (sent back to user)..."
                        rows={2}
                        className="notif-appeal-input"
                      />
                      <div className="notif-appeal-btn-group">
                        <button
                          onClick={(e) => handleResolveAppeal(e, n, 'reject')}
                          disabled={appealLoadingId !== null}
                          className="notif-btn-reject"
                        >
                          {appealLoadingId === n._id ? '...' : 'Reject'}
                        </button>
                        <button
                          onClick={(e) => handleResolveAppeal(e, n, 'approve')}
                          disabled={appealLoadingId !== null}
                          className="notif-btn-approve"
                        >
                          {appealLoadingId === n._id ? '...' : 'Approve & Restore'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="notif-drawer-footer">
        <button
          onClick={handleOpenHistory}
          className="notif-history-nav-btn"
          title="View all notifications, archives and history"
        >
          <FiArchive size={14} />
          <span>Notification History &amp; Archives</span>
          <FiChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default NotificationDrawer;
