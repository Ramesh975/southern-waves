import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { notificationAPI, authAPI } from '../services/api';
import {
  FiBell, FiCheck, FiCheckCircle, FiTrash2, FiSearch,
  FiSend, FiRefreshCw, FiExternalLink, FiMessageSquare,
  FiAlertTriangle, FiRadio, FiShield, FiPlus,
  FiX, FiChevronRight, FiArchive, FiTag, FiClock,
  FiFileText, FiUser, FiMessageCircle, FiSliders,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { resolveNotifUrl } from '../context/ChatContext';
import './NotificationsPage.css';

// ── Constants ──────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'active',        label: 'Active Alerts',        icon: FiBell },
  { id: 'security',      label: 'Security & Appeals',   icon: FiShield },
  { id: 'announcements', label: 'Announcements',        icon: FiRadio },
  { id: 'history',       label: 'Notification History', icon: FiArchive },
];

const NOTIFICATION_TYPES = [
  { value: 'announcement', label: '📢 Announcement' },
  { value: 'board_news',   label: '📰 Campus News' },
  { value: 'sensitivity',  label: '🚨 Security Alert' },
  { value: 'editorial',    label: '✍️ Editorial Update' },
  { value: 'comment',      label: '💬 Comment Mention' },
  { value: 'system',       label: '⚙️ System' },
];

const ACTION_TYPES = [
  { value: 'none',          label: 'No Action Button' },
  { value: 'open_article',  label: '📄 Read Article (enter slug)' },
  { value: 'open_profile',  label: '👤 View Profile (enter username)' },
  { value: 'open_chat_room',label: '🗨️ Join Chat Room (enter room name)' },
  { value: 'open_comment',  label: '💬 View Comment (enter article slug)' },
  { value: 'navigate',      label: '→ Navigate to URL' },
  { value: 'external_url',  label: '🔗 Open External URL' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const getCtaConfig = (n) => {
  if (!n.actionType || n.actionType === 'none') return null;
  if (n.actionType === 'open_article')  return { label: 'Read Article',   icon: <FiFileText size={13} />,    variant: 'article' };
  if (n.actionType === 'open_profile')  return { label: 'View Profile',   icon: <FiUser size={13} />,         variant: 'profile' };
  if (n.actionType === 'open_chat_room')return { label: 'Join Room',      icon: <FiMessageSquare size={13} />, variant: 'chat' };
  if (n.actionType === 'open_comment')  return { label: 'View Comment',   icon: <FiMessageCircle size={13} />, variant: 'comment' };
  if (n.actionType === 'navigate')      return { label: 'Go There',       icon: <FiChevronRight size={13} />,  variant: 'navigate' };
  if (n.actionType === 'external_url')  return { label: 'Open Link',      icon: <FiExternalLink size={13} />,  variant: 'external' };
  if (n.actionUrl && !n.actionUrl.startsWith('/notifications')) return { label: 'Open Resource',  icon: <FiExternalLink size={13} />,  variant: 'external' };
  return null;
};

const getNotificationIcon = (type, priority) => {
  if (priority === 'urgent' || type === 'sensitivity') return <FiAlertTriangle size={14} color="#ef4444" />;
  if (type === 'appeal')    return <FiShield size={14} color="#f59e0b" />;
  if (type === 'board_news')return <FiTag size={14} color="#0284c7" />;
  if (type === 'message')   return <FiMessageSquare size={14} color="#8b5cf6" />;
  if (type === 'comment')   return <FiMessageCircle size={14} color="#7c3aed" />;
  if (type === 'editorial') return <FiFileText size={14} color="#059669" />;
  return <FiRadio size={14} color="#10b981" />;
};

const getTypeLabel = (type, priority) => {
  if (priority === 'urgent') return 'Urgent Action';
  if (type === 'sensitivity')return 'Security Alert';
  if (type === 'appeal')     return 'User Appeal';
  if (type === 'board_news') return 'Campus News';
  if (type === 'message')    return 'Chat / Mention';
  if (type === 'comment')    return 'Comment';
  if (type === 'editorial')  return 'Editorial';
  return 'Announcement';
};

const SenderAvatar = ({ sender }) => {
  if (!sender) return null;
  const initial = (sender.name || 'S').charAt(0).toUpperCase();
  return (
    <span className="notif-page-avatar" title={sender.name}>
      {sender.avatar
        ? <img src={sender.avatar} alt={sender.name} />
        : initial}
    </span>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAdmin, isEditor, isModerator } = useAuth();
  const isModOrAdmin = isAdmin || isEditor || isModerator;

  const {
    notifications,
    unreadNotificationsCount,
    markNotificationRead,
    markAllNotificationsRead,
    dismissNotification,
    fetchNotifications,
    deleteNotification,
    openRoom,
  } = useChat();

  const initialTab = searchParams.get('tab') || 'active';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [expandedIds, setExpandedIds] = useState(new Set());

  // Appeal state
  const [responseTexts, setResponseTexts] = useState({});
  const [appealLoadingId, setAppealLoadingId] = useState(null);

  // Broadcast modal
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    title: '', message: '', type: 'announcement', priority: 'normal',
    actionType: 'none', actionUrl: '', actionPayloadRaw: '',
    targetRoles: [],
  });
  const [submittingBroadcast, setSubmittingBroadcast] = useState(false);

  // Sync tab with URL param
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) setActiveTab(tabFromUrl);
  }, [searchParams]);

  useEffect(() => { if (fetchNotifications) fetchNotifications(); }, []);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (fetchNotifications) await fetchNotifications();
      toast.success('Notifications updated');
    } catch { toast.error('Failed to update notifications'); }
    finally { setRefreshing(false); }
  };

  const handleToggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── Appeal resolution ──
  const handleResolveAppeal = async (n, actionType) => {
    const senderId = typeof n.sender === 'object' ? n.sender?._id : n.sender;
    if (!senderId) return toast.error('User information not found');
    const note = responseTexts[n._id] || '';
    setAppealLoadingId(n._id);
    try {
      if (actionType === 'approve') {
        await authAPI.unblockUser(senderId);
        toast.success('Appeal approved — account restored!');
      } else {
        await authAPI.rejectAppeal(senderId, note);
        toast.success('Appeal rejected and recorded.');
      }
      if (markNotificationRead) markNotificationRead(n._id);
      if (fetchNotifications) fetchNotifications();
      setExpandedIds(prev => { const s = new Set(prev); s.delete(n._id); return s; });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resolve appeal');
    } finally { setAppealLoadingId(null); }
  };

  const executeNotificationNavigation = (n) => {
    if (!n.isRead && markNotificationRead) markNotificationRead(n._id);
    const resolved = resolveNotifUrl(n);
    if (!resolved) {
      handleToggleExpand(n._id);
      return;
    }

    if (typeof resolved === 'object') {
      if (resolved.isChatRoom && openRoom) {
        const p = resolved.payload || {};
        openRoom(p.roomType || 'category', p.name || '');
        return;
      }
      if (resolved.isAppealReview) {
        handleToggleExpand(n._id);
        return;
      }
    }

    if (typeof resolved === 'string') {
      if (resolved.startsWith('http')) {
        window.open(resolved, '_blank', 'noopener,noreferrer');
      } else {
        navigate(resolved);
      }
    }
  };

  // ── Contextual CTA action ──
  const handleCtaAction = (n) => {
    executeNotificationNavigation(n);
  };

  const handleCardClick = (n) => {
    executeNotificationNavigation(n);
  };

  // ── Clear read history ──
  const handleClearReadHistory = async () => {
    if (!window.confirm('Clear all read notifications? Historical records remain in the archive.')) return;
    try {
      await notificationAPI.clearRead();
      toast.success('Read notifications cleared');
      if (fetchNotifications) fetchNotifications();
    } catch { toast.error('Failed to clear notifications'); }
  };

  // ── Broadcast modal helpers ──
  const updateBroadcastForm = (field, value) =>
    setBroadcastForm(prev => ({ ...prev, [field]: value }));

  const toggleTargetRole = (role) => {
    setBroadcastForm(prev => ({
      ...prev,
      targetRoles: prev.targetRoles.includes(role)
        ? prev.targetRoles.filter(r => r !== role)
        : [...prev.targetRoles, role],
    }));
  };

  // Build actionPayload from raw input based on actionType
  const buildActionPayload = (actionType, rawValue) => {
    if (!rawValue) return null;
    if (actionType === 'open_article' || actionType === 'open_comment') return { slug: rawValue.trim() };
    if (actionType === 'open_profile') return { username: rawValue.trim() };
    if (actionType === 'open_chat_room') {
      const [roomType = 'category', ...rest] = rawValue.trim().split(':');
      return { roomType, name: rest.join(':') || rawValue.trim() };
    }
    return null;
  };

  const handleCreateBroadcast = async (e) => {
    e.preventDefault();
    const { title, message, type, priority, actionType, actionUrl, actionPayloadRaw, targetRoles } = broadcastForm;
    if (!title.trim() || !message.trim()) return toast.error('Title and message are required');

    setSubmittingBroadcast(true);
    try {
      const payload = {
        title: title.trim(),
        message: message.trim(),
        type, priority,
        actionType: actionType || 'none',
        actionUrl: ['navigate', 'external_url'].includes(actionType) ? actionUrl.trim() : '',
        actionPayload: buildActionPayload(actionType, actionPayloadRaw),
        targetRoles,
      };
      await notificationAPI.create(payload);
      toast.success('Announcement broadcasted to all users! 📢');
      setBroadcastForm({ title: '', message: '', type: 'announcement', priority: 'normal', actionType: 'none', actionUrl: '', actionPayloadRaw: '', targetRoles: [] });
      setBroadcastModalOpen(false);
      if (fetchNotifications) fetchNotifications();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to broadcast announcement');
    } finally { setSubmittingBroadcast(false); }
  };

  // ── Tab counts ──
  const tabCounts = useMemo(() => {
    const active = notifications.filter(n => !n.isRead).length;
    const security = notifications.filter(n => n.type === 'sensitivity' || n.type === 'appeal' || n.priority === 'urgent').length;
    const announcements = notifications.filter(n => ['announcement', 'board_news', 'editorial'].includes(n.type)).length;
    const history = notifications.filter(n => n.isRead).length;
    return { active, security, announcements, history, total: notifications.length };
  }, [notifications]);

  // ── Filtered stream ──
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      // Tab filtering
      if (activeTab === 'active') {
        const isRecent = new Date(n.createdAt).getTime() > Date.now() - 48 * 60 * 60 * 1000;
        const isUrgent = n.priority === 'urgent' || n.priority === 'high' || n.type === 'appeal' || n.type === 'sensitivity';
        if (n.isRead && !(isRecent && isUrgent)) return false;
      } else if (activeTab === 'security') {
        if (n.type !== 'sensitivity' && n.type !== 'appeal' && n.priority !== 'urgent') return false;
      } else if (activeTab === 'announcements') {
        if (!['announcement', 'board_news', 'editorial'].includes(n.type)) return false;
      }
      // Note: 'history' tab shows everything (no additional filter)

      if (unreadOnly && n.isRead) return false;
      if (priorityFilter !== 'all' && n.priority !== priorityFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch  = (n.title || '').toLowerCase().includes(q);
        const msgMatch    = (n.message || '').toLowerCase().includes(q);
        const senderMatch = (n.sender?.name || '').toLowerCase().includes(q);
        if (!titleMatch && !msgMatch && !senderMatch) return false;
      }

      return true;
    });
  }, [notifications, activeTab, unreadOnly, priorityFilter, searchQuery]);

  const formatTime = (dateString) => {
    try { return formatDistanceToNow(new Date(dateString), { addSuffix: true }); }
    catch { return 'recently'; }
  };

  // ── Render ──
  return (
    <main className="notif-page-shell">
      <div className="notif-page-container">

        {/* ── Header Card ── */}
        <section className="notif-header-card">
          <div className="notif-header-top">
            <div className="notif-title-group">
              <div className="notif-title-icon-box"><FiBell size={24} /></div>
              <div>
                <h1 className="notif-main-title">Notifications &amp; Security Alerts</h1>
                <p className="notif-main-subtitle">
                  Real-time announcements, security warnings, user appeals and history
                </p>
              </div>
            </div>

            <div className="notif-header-actions">
              {unreadNotificationsCount > 0 && (
                <button
                  onClick={() => { if (markAllNotificationsRead) markAllNotificationsRead(); toast.success('All notifications marked as read'); }}
                  className="notif-btn notif-btn-secondary"
                >
                  <FiCheck size={14} /> Mark All Read ({unreadNotificationsCount})
                </button>
              )}
              {isAdmin && (
                <button onClick={() => setBroadcastModalOpen(true)} className="notif-btn notif-btn-primary">
                  <FiPlus size={14} /> Push Announcement
                </button>
              )}
              <button onClick={handleRefresh} className="notif-btn notif-btn-icon" title="Refresh">
                <FiRefreshCw size={14} className={refreshing ? 'notif-spin' : ''} />
              </button>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="notif-kpi-bar">
            <div className="notif-kpi-stat" onClick={() => handleTabChange('active')}>
              <span className="notif-kpi-val" style={{ color: '#0284c7' }}>{tabCounts.active}</span>
              <span className="notif-kpi-lbl">Unread Alerts</span>
            </div>
            <div className="notif-kpi-stat" onClick={() => handleTabChange('security')}>
              <span className="notif-kpi-val" style={{ color: '#ef4444' }}>{tabCounts.security}</span>
              <span className="notif-kpi-lbl">Security &amp; Appeals</span>
            </div>
            <div className="notif-kpi-stat" onClick={() => handleTabChange('announcements')}>
              <span className="notif-kpi-val" style={{ color: '#10b981' }}>{tabCounts.announcements}</span>
              <span className="notif-kpi-lbl">Announcements</span>
            </div>
            <div className="notif-kpi-stat" onClick={() => handleTabChange('history')}>
              <span className="notif-kpi-val" style={{ color: '#64748b' }}>{tabCounts.history}</span>
              <span className="notif-kpi-lbl">Archived History</span>
            </div>
          </div>
        </section>

        {/* ── Tabs ── */}
        <div className="notif-tabs-nav">
          <div className="notif-tabs-track">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const count = tabCounts[tab.id] || 0;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`notif-tab-chip ${activeTab === tab.id ? 'active' : ''}`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                  {count > 0 && <span className="notif-tab-badge">{count}</span>}
                </button>
              );
            })}
          </div>
          {activeTab === 'history' && isModOrAdmin && (
            <button onClick={handleClearReadHistory} className="notif-purge-btn" title="Purge read notifications">
              <FiTrash2 size={13} /> Clear Read History
            </button>
          )}
        </div>

        {/* ── Filter Toolbar ── */}
        <div className="notif-toolbar-card">
          <div className="notif-search-input-wrap">
            <FiSearch className="notif-search-icon" />
            <input
              type="text"
              placeholder="Search by title, content, or sender..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="notif-search-input"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="notif-search-clear">✕</button>
            )}
          </div>
          <div className="notif-toolbar-controls">
            <label className="notif-unread-toggle">
              <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
              <span>Unread Only</span>
            </label>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="notif-priority-select">
              <option value="all">All Priorities</option>
              <option value="urgent">🔴 Urgent</option>
              <option value="high">🟡 High</option>
              <option value="normal">🔵 Normal</option>
            </select>
          </div>
        </div>

        {/* ── Stream ── */}
        <section className="notif-stream-container">
          {filteredNotifications.length === 0 ? (
            <div className="notif-empty-state">
              <div className="notif-empty-icon-circle">
                <FiCheckCircle size={36} color="#16a34a" />
              </div>
              <h3 className="notif-empty-title">
                {activeTab === 'active' ? 'No Active Alerts' : 'No Records Found'}
              </h3>
              <p className="notif-empty-desc">
                {searchQuery || unreadOnly || priorityFilter !== 'all'
                  ? 'No notifications match your filters. Try clearing search.'
                  : activeTab === 'history'
                  ? 'Your notification history is empty. Read notifications will appear here.'
                  : activeTab === 'security'
                  ? 'No security alerts or user appeals requiring action.'
                  : 'You are completely caught up!'}
              </p>
              {activeTab === 'active' && (
                <button onClick={() => handleTabChange('history')} className="notif-btn notif-btn-secondary" style={{ marginTop: '12px' }}>
                  <FiArchive size={14} /> Open Notification History
                </button>
              )}
            </div>
          ) : (
            <div className="notif-cards-list">
              {filteredNotifications.map((n) => {
                const isExpanded  = expandedIds.has(n._id);
                const isUrgent    = n.priority === 'urgent' || n.priority === 'high' || n.type === 'sensitivity' || n.type === 'appeal';
                const isAppeal    = n.type === 'appeal';
                const senderUser  = typeof n.sender === 'object' ? n.sender : null;
                const ctaConfig   = getCtaConfig(n);
                const isDismissed = n.isDismissed;
                const isAppealResolved = Boolean(
                  n.isResolved ||
                  n.resolvedStatus === 'approved' ||
                  n.resolvedStatus === 'rejected' ||
                  (senderUser && !senderUser.isBlocked && !senderUser.appealRequested)
                );

                return (
                  <article
                    key={n._id}
                    className={`notif-card ${!n.isRead ? 'unread' : 'read'} ${isUrgent ? 'urgent' : ''} ${isDismissed ? 'dismissed' : ''}`}
                    onClick={() => handleCardClick(n)}
                  >
                    {/* Priority stripe */}
                    <div className={`notif-priority-stripe ${isUrgent ? 'urgent' : n.type}`} />

                    <div className="notif-card-inner">
                      {/* Meta row */}
                      <div className="notif-card-meta-row">
                        <div className="notif-card-badges">
                          <span className={`notif-type-badge ${n.type} ${n.priority || ''}`}>
                            {getNotificationIcon(n.type, n.priority)}
                            <span>{getTypeLabel(n.type, n.priority)}</span>
                          </span>
                          {n.priority === 'urgent' && <span className="notif-urgent-pill">URGENT</span>}
                          {senderUser && (
                            <span className="notif-sender-chip">
                              <SenderAvatar sender={senderUser} />
                              {senderUser.name || 'System'}
                              {senderUser.role && <em className="notif-sender-role-chip">{senderUser.role}</em>}
                            </span>
                          )}
                          {isDismissed && <span className="notif-dismissed-badge">Dismissed</span>}
                        </div>
                        <div className="notif-card-meta-right">
                          <span className="notif-card-time" title={new Date(n.createdAt).toLocaleString()}>
                            <FiClock size={11} style={{ marginRight: '4px' }} />
                            {formatTime(n.createdAt)}
                          </span>
                          {!n.isRead && <span className="notif-glow-dot" title="Unread Alert" />}
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="notif-card-title">{n.title}</h3>

                      {/* Message */}
                      <p className={`notif-card-message ${isExpanded ? 'expanded' : ''}`}>
                        {n.message}
                      </p>

                      {/* Action bar */}
                      <div className="notif-card-action-bar" onClick={(e) => e.stopPropagation()}>
                        <div className="notif-action-left">
                          {/* Mark read (only for unread) */}
                          {!n.isRead && (
                            <button
                              onClick={() => markNotificationRead && markNotificationRead(n._id)}
                              className="notif-action-link"
                            >
                              <FiCheck size={13} />
                              <span>Mark as Read</span>
                            </button>
                          )}

                          {/* Contextual CTA */}
                          {ctaConfig && n.actionType !== 'appeal_review' && (
                            <button
                              onClick={() => handleCtaAction(n)}
                              className={`notif-page-cta-btn ${ctaConfig.variant}`}
                            >
                              {ctaConfig.icon}
                              <span>{ctaConfig.label}</span>
                            </button>
                          )}

                          {/* Appeal review toggle */}
                          {isAppeal && isModOrAdmin && !isAppealResolved && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleExpand(n._id); }}
                              className="notif-action-link appeal-action"
                            >
                              <FiShield size={13} />
                              <span>{isExpanded ? 'Hide Review Panel' : 'Review Appeal'}</span>
                            </button>
                          )}

                          {/* Resolved status badge when appeal was already reviewed */}
                          {isAppeal && isAppealResolved && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                color: n.resolvedStatus === 'rejected' ? '#ef4444' : '#10b981',
                                background: n.resolvedStatus === 'rejected' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border: `1px solid ${n.resolvedStatus === 'rejected' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                              }}
                            >
                              <FiCheck size={12} />
                              <span>{n.resolvedStatus === 'rejected' ? 'Appeal Rejected' : 'Appeal Approved & Restored'}</span>
                            </span>
                          )}

                          {/* Dismiss */}
                          {!isDismissed && (
                            <button
                              onClick={() => dismissNotification && dismissNotification(n._id)}
                              className="notif-action-link dismiss-action"
                              title="Dismiss from active feed"
                            >
                              <FiX size={13} />
                              <span>Dismiss</span>
                            </button>
                          )}
                        </div>

                        {isAdmin && (
                          <button
                            onClick={() => deleteNotification(n._id)}
                            className="notif-delete-action"
                            title="Delete notification permanently"
                          >
                            <FiTrash2 size={13} />
                          </button>
                        )}
                      </div>

                      {/* Inline Appeal Review Panel */}
                      {isExpanded && isAppeal && isModOrAdmin && !isAppealResolved && (
                        <div className="notif-appeal-box" onClick={(e) => e.stopPropagation()}>
                          <div className="notif-appeal-header">
                            <FiShield size={16} color="#f59e0b" />
                            <h4>Appeal Review Deck</h4>
                          </div>
                          <p className="notif-appeal-subtitle">
                            Review the user's suspension plea. Approving will immediately restore their account.
                          </p>
                          <textarea
                            value={responseTexts[n._id] || ''}
                            onChange={(e) => setResponseTexts({ ...responseTexts, [n._id]: e.target.value })}
                            placeholder="Type a resolution note (sent to the user)..."
                            rows={3}
                            className="notif-appeal-textarea"
                          />
                          <div className="notif-appeal-actions-row">
                            <button
                              onClick={() => handleResolveAppeal(n, 'reject')}
                              disabled={appealLoadingId !== null}
                              className="notif-btn-danger"
                            >
                              {appealLoadingId === n._id ? 'Processing...' : 'Reject Appeal'}
                            </button>
                            <button
                              onClick={() => handleResolveAppeal(n, 'approve')}
                              disabled={appealLoadingId !== null}
                              className="notif-btn-success"
                            >
                              {appealLoadingId === n._id ? 'Processing...' : 'Approve & Restore Account'}
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Broadcast Modal ── */}
        {broadcastModalOpen && (
          <div className="notif-modal-overlay" onClick={() => setBroadcastModalOpen(false)}>
            <div className="notif-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="notif-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FiRadio size={20} color="var(--accent-color, #c8102e)" />
                  <h3 style={{ margin: 0, fontWeight: 900 }}>Push Announcement</h3>
                </div>
                <button onClick={() => setBroadcastModalOpen(false)} className="notif-close-x">
                  <FiX size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateBroadcast} className="notif-modal-form">
                {/* Title */}
                <div className="notif-form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    placeholder="Brief headline..."
                    value={broadcastForm.title}
                    onChange={(e) => updateBroadcastForm('title', e.target.value)}
                    required
                  />
                </div>

                {/* Type + Priority */}
                <div className="notif-form-row">
                  <div className="notif-form-group">
                    <label>Type</label>
                    <select value={broadcastForm.type} onChange={(e) => updateBroadcastForm('type', e.target.value)}>
                      {NOTIFICATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="notif-form-group">
                    <label>Priority</label>
                    <select value={broadcastForm.priority} onChange={(e) => updateBroadcastForm('priority', e.target.value)}>
                      <option value="normal">🔵 Normal</option>
                      <option value="high">🟡 High</option>
                      <option value="urgent">🔴 Urgent</option>
                    </select>
                  </div>
                </div>

                {/* Action Type */}
                <div className="notif-form-group">
                  <label>Action Button</label>
                  <select value={broadcastForm.actionType} onChange={(e) => updateBroadcastForm('actionType', e.target.value)}>
                    {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </div>

                {/* Action Payload input — shown conditionally */}
                {broadcastForm.actionType === 'navigate' || broadcastForm.actionType === 'external_url' ? (
                  <div className="notif-form-group">
                    <label>{broadcastForm.actionType === 'external_url' ? 'External URL' : 'Internal Path (e.g. /news)'}</label>
                    <input
                      type="text"
                      placeholder={broadcastForm.actionType === 'external_url' ? 'https://...' : '/path/to/page'}
                      value={broadcastForm.actionUrl}
                      onChange={(e) => updateBroadcastForm('actionUrl', e.target.value)}
                    />
                  </div>
                ) : broadcastForm.actionType !== 'none' ? (
                  <div className="notif-form-group">
                    <label>
                      {broadcastForm.actionType === 'open_article' ? 'Article Slug' :
                       broadcastForm.actionType === 'open_profile' ? 'Username' :
                       broadcastForm.actionType === 'open_chat_room' ? 'Room (e.g. category:news or tag:exams)' :
                       broadcastForm.actionType === 'open_comment' ? 'Article Slug' : 'Value'}
                    </label>
                    <input
                      type="text"
                      placeholder={
                        broadcastForm.actionType === 'open_article' ? 'e.g. my-article-slug' :
                        broadcastForm.actionType === 'open_profile' ? 'e.g. john_doe' :
                        broadcastForm.actionType === 'open_chat_room' ? 'e.g. category:sports' :
                        broadcastForm.actionType === 'open_comment' ? 'e.g. article-slug' : ''
                      }
                      value={broadcastForm.actionPayloadRaw}
                      onChange={(e) => updateBroadcastForm('actionPayloadRaw', e.target.value)}
                    />
                  </div>
                ) : null}

                {/* Target Roles */}
                <div className="notif-form-group">
                  <label>Audience (leave empty for all users)</label>
                  <div className="notif-role-chips">
                    {['admin', 'moderator', 'editor', 'author', 'user'].map(role => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleTargetRole(role)}
                        className={`notif-role-chip ${broadcastForm.targetRoles.includes(role) ? 'selected' : ''}`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                  {broadcastForm.targetRoles.length > 0 && (
                    <p className="notif-form-hint">
                      Only visible to: {broadcastForm.targetRoles.join(', ')}
                    </p>
                  )}
                </div>

                {/* Message */}
                <div className="notif-form-group">
                  <label>Announcement Content</label>
                  <textarea
                    rows={4}
                    placeholder="Write the detailed institutional message..."
                    value={broadcastForm.message}
                    onChange={(e) => updateBroadcastForm('message', e.target.value)}
                    required
                  />
                </div>

                <div className="notif-modal-footer">
                  <button type="button" onClick={() => setBroadcastModalOpen(false)} className="notif-btn notif-btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={submittingBroadcast} className="notif-btn notif-btn-primary">
                    <FiSend size={14} /> {submittingBroadcast ? 'Broadcasting...' : 'Broadcast Announcement'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </main>
  );
};

export default NotificationsPage;
