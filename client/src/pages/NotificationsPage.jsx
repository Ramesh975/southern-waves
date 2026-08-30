import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { notificationAPI, authAPI } from '../services/api';
import {
  FiBell, FiCheck, FiCheckCircle, FiTrash2, FiSearch,
  FiSend, FiRefreshCw, FiExternalLink, FiMessageSquare,
  FiAlertTriangle, FiRadio, FiSliders, FiShield, FiPlus,
  FiX, FiChevronRight, FiFilter, FiInfo, FiTag
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { getImageUrl } from '../components/ArticleComponents';
import './NotificationsPage.css';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: FiBell },
  { id: 'announcement', label: 'Announcements 📢', icon: FiRadio },
  { id: 'board_news', label: 'Board News 📰', icon: FiTag },
  { id: 'sensitivity', label: 'Critical Alerts ⚡', icon: FiAlertTriangle },
  { id: 'appeal', label: 'Appeals 🛡️', icon: FiShield },
  { id: 'message', label: 'Chat & Mentions 💬', icon: FiMessageSquare },
  { id: 'editorial', label: 'Editorial ✍️', icon: FiSliders }
];

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isEditor, isModerator } = useAuth();
  const {
    notifications,
    unreadNotificationsCount,
    markNotificationRead,
    markAllNotificationsRead,
    fetchNotifications,
    deleteNotification,
    openRoom,
    setIsOpen
  } = useChat();

  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Broadcast announcement modal state
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newType, setNewType] = useState('announcement');
  const [newPriority, setNewPriority] = useState('normal');
  const [newActionUrl, setNewActionUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Appeal response state
  const [appealResponseId, setAppealResponseId] = useState(null);
  const [appealText, setAppealText] = useState('');
  const [appealLoading, setAppealLoading] = useState(false);
  const [snappingCategory, setSnappingCategory] = useState(null);
  const [collapsedCategories, setCollapsedCategories] = useState({});

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchNotifications();
      toast.success('Notifications updated');
    } catch {
      toast.error('Failed to refresh notifications');
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateBroadcast = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) {
      return toast.error('Please enter a title and message');
    }

    setSubmitting(true);
    try {
      await notificationAPI.create({
        title: newTitle.trim(),
        message: newMessage.trim(),
        type: newType,
        priority: newPriority,
        actionUrl: newActionUrl.trim()
      });
      toast.success('Announcement broadcasted successfully!');
      setNewTitle('');
      setNewMessage('');
      setNewType('announcement');
      setNewPriority('normal');
      setNewActionUrl('');
      setBroadcastModalOpen(false);
      fetchNotifications();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to push announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveAppeal = async (n, actionType) => {
    const senderId = typeof n.sender === 'object' ? n.sender?._id : n.sender;
    if (!senderId) return toast.error('User details not found');

    setAppealLoading(true);
    try {
      if (actionType === 'approve') {
        await authAPI.unblockUser(senderId);
        toast.success('Appeal approved and user unblocked!');
      } else {
        await authAPI.rejectAppeal(senderId, appealText);
        toast.success('Appeal rejected and user notified.');
      }
      await markNotificationRead(n._id);
      setAppealResponseId(null);
      setAppealText('');
      fetchNotifications();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resolve appeal');
    } finally {
      setAppealLoading(false);
    }
  };

  const handleNotificationAction = (n) => {
    if (!n.isRead) markNotificationRead(n._id);

    if (n.actionUrl) {
      if (n.actionUrl.startsWith('http')) {
        window.open(n.actionUrl, '_blank');
      } else {
        navigate(n.actionUrl);
      }
      return;
    }

    if (n.type === 'message') {
      openRoom('group', 'news');
      setIsOpen(true);
    }
  };

  const handleSnapClearCategory = async (categoryId) => {
    setSnappingCategory(categoryId);
    setTimeout(async () => {
      const catNotifs = notifications.filter(n => n.type === categoryId && !n.isRead);
      await Promise.all(catNotifs.map(n => markNotificationRead(n._id)));
      setSnappingCategory(null);
    }, 650);
  };

  // Filtered Notifications
  const filteredList = useMemo(() => {
    return notifications.filter(item => {
      // Category filter
      if (activeCategory !== 'all') {
        if (item.type !== activeCategory) return false;
      }
      // Unread only filter
      if (unreadOnly && item.isRead) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesMsg = item.message?.toLowerCase().includes(q);
        return matchesTitle || matchesMsg;
      }
      return true;
    });
  }, [notifications, activeCategory, unreadOnly, searchQuery]);

  // Featured / Pinned Announcement
  const featuredAnnouncement = useMemo(() => {
    return notifications.find(n => (n.priority === 'pinned' || n.type === 'sensitivity') && !n.isRead);
  }, [notifications]);

  const getTimeAgo = (dateStr) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return '';
    }
  };

  return (
    <div className="notif-page-shell">
      <div className="notif-page-container">
        
        {/* ── Main Header Card ── */}
        <div className="notif-header-card">
          <div className="notif-header-top">
            <div className="notif-title-group">
              <div className="notif-title-icon-box">
                <FiBell size={24} />
              </div>
              <div>
                <h1 className="notif-main-title">Notifications & Announcements</h1>
                <p className="notif-main-subtitle">
                  {unreadNotificationsCount > 0 
                    ? `${unreadNotificationsCount} unread update${unreadNotificationsCount > 1 ? 's' : ''} requiring your attention`
                    : 'You are all caught up with the latest updates'}
                </p>
              </div>
            </div>

            <div className="notif-header-actions">
              {unreadNotificationsCount > 0 && (
                <button
                  className="notif-btn notif-btn-primary"
                  onClick={markAllNotificationsRead}
                  title="Mark all notifications as read"
                >
                  <FiCheckCircle size={15} />
                  <span>Mark All Read</span>
                </button>
              )}

              <button
                className="notif-btn notif-btn-secondary"
                onClick={handleRefresh}
                disabled={refreshing}
                title="Refresh notifications"
              >
                <FiRefreshCw size={14} className={refreshing ? 'spin-icon' : ''} />
                <span>Refresh</span>
              </button>

              {(isAdmin || isEditor) && (
                <button
                  className="notif-btn notif-btn-primary"
                  onClick={() => setBroadcastModalOpen(true)}
                  style={{ background: 'var(--color-black)', color: 'var(--color-white)' }}
                  title="Push Announcement"
                >
                  <FiPlus size={15} />
                  <span>New Announcement</span>
                </button>
              )}
            </div>
          </div>

          {/* Search & Quick Controls */}
          <div className="notif-controls-row">
            <div className="notif-search-box">
              <FiSearch className="notif-search-icon" size={15} />
              <input
                type="text"
                placeholder="Search alerts, announcements, keywords..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="notif-search-input"
              />
            </div>

            <button
              className={`notif-tab-chip ${unreadOnly ? 'active' : ''}`}
              onClick={() => setUnreadOnly(!unreadOnly)}
            >
              <FiFilter size={13} />
              <span>Unread Only</span>
              {unreadNotificationsCount > 0 && (
                <span className="notif-tab-badge">{unreadNotificationsCount}</span>
              )}
            </button>
          </div>

          {/* Categorical Tabs */}
          <div className="notif-tabs-bar">
            {CATEGORIES.map(cat => {
              const count = cat.id === 'all' 
                ? notifications.length 
                : notifications.filter(n => n.type === cat.id).length;

              if (count === 0 && cat.id !== 'all') return null;

              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  className={`notif-tab-chip ${activeCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  <Icon size={14} />
                  <span>{cat.label}</span>
                  <span className="notif-tab-badge">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Featured / Pinned Announcement Banner ── */}
        {featuredAnnouncement && activeCategory === 'all' && (
          <div className="notif-announcement-banner">
            <div className="notif-announcement-icon">
              <FiAlertTriangle size={20} />
            </div>
            <div className="notif-announcement-content">
              <div className="notif-announcement-header">
                <h3 className="notif-announcement-title">{featuredAnnouncement.title}</h3>
                <span className="notif-time-text">{getTimeAgo(featuredAnnouncement.createdAt)}</span>
              </div>
              <p className="notif-announcement-text">{featuredAnnouncement.message}</p>
            </div>
            <button
              className="notif-icon-btn"
              onClick={() => markNotificationRead(featuredAnnouncement._id)}
              title="Acknowledge & Mark as read"
            >
              <FiCheck size={16} />
            </button>
          </div>
        )}

        {/* ── Notification Feed ── */}
        <div className="notif-feed-list">
          {filteredList.length === 0 ? (
            <div className="notif-empty-card">
              <div className="notif-empty-icon"><FiCheckCircle size={32} /></div>
              <h3 className="notif-empty-title">No notifications found</h3>
              <p className="notif-empty-desc">
                {searchQuery
                  ? 'No notifications match your search keyword. Try clearing filters.'
                  : 'You are completely caught up! New announcements and mentions will appear here.'}
              </p>
            </div>
          ) : activeCategory === 'all' ? (
            // ── Categorical grouped view ──
            CATEGORIES.filter(c => c.id !== 'all').map((cat) => {
              const catItems = filteredList.filter(n => n.type === cat.id);
              if (catItems.length === 0) return null;
              const Icon = cat.icon;
              const isCollapsed = collapsedCategories[cat.id];
              const isSnapping = snappingCategory === cat.id;

              return (
                <div
                  key={cat.id}
                  className={`notif-category-group ${isSnapping ? 'snapping' : ''}`}
                >
                  <div className="notif-category-group-header">
                    <div className="notif-category-group-label">
                      <Icon size={15} />
                      <span>{cat.label}</span>
                      <span className="notif-tab-badge">{catItems.length}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        className="notif-cat-collapse-btn"
                        onClick={() => setCollapsedCategories(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                      >
                        {isCollapsed ? '▼ Show' : '▲ Hide'}
                      </button>
                      {catItems.some(n => !n.isRead) && (
                        <button
                          className="notif-cat-clear-btn"
                          onClick={() => handleSnapClearCategory(cat.id)}
                        >
                          ✦ Snap Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="notif-category-items">
                      {catItems.map((item, idx) => {
                        const senderUser = typeof item.sender === 'object' ? item.sender : null;
                        const isAppeal = item.type === 'appeal';
                        const canModerateAppeal = isAppeal && (isAdmin || isEditor || isModerator);

                        return (
                          <div
                            key={item._id}
                            className={`notif-card ${!item.isRead ? 'unread' : ''}`}
                            style={{ '--snap-index': idx }}
                          >
                            <div className="notif-card-header">
                              <div className="notif-card-meta">
                                <span className={`notif-type-tag notif-type-${item.type}`}>
                                  {item.type.replace('_', ' ')}
                                </span>
                                {item.priority === 'pinned' && (
                                  <span className="notif-type-tag" style={{ background: '#fef3c7', color: '#b45309' }}>📌 Pinned</span>
                                )}
                                <span className="notif-time-text">{getTimeAgo(item.createdAt)}</span>
                              </div>
                              <div className="notif-card-actions">
                                <button
                                  className="notif-icon-btn"
                                  onClick={() => markNotificationRead(item._id)}
                                  title={item.isRead ? 'Marked read' : 'Mark as read'}
                                >
                                  <FiCheck size={14} color={item.isRead ? 'var(--color-gray-400)' : 'var(--accent-color)'} />
                                </button>
                                {isAdmin && (
                                  <button className="notif-icon-btn" onClick={() => deleteNotification(item._id)} title="Delete">
                                    <FiTrash2 size={14} color="#dc2626" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="notif-card-body">
                              {senderUser && (
                                <img
                                  src={senderUser.avatar ? getImageUrl(senderUser.avatar) : `https://ui-avatars.com/api/?name=${encodeURIComponent(senderUser.name || 'User')}&background=random`}
                                  alt=""
                                  className="notif-sender-avatar"
                                />
                              )}
                              <div className="notif-card-main-text">
                                <h4 className="notif-card-title">{item.title}</h4>
                                <p className="notif-card-message">{item.message}</p>
                              </div>
                            </div>

                            {(item.actionUrl || canModerateAppeal || item.type === 'message') && (
                              <div className="notif-card-footer">
                                {item.actionUrl && (
                                  <button className="notif-action-link-btn" onClick={() => handleNotificationAction(item)}>
                                    <span>Open Link</span><FiExternalLink size={13} />
                                  </button>
                                )}
                                {item.type === 'message' && (
                                  <button className="notif-action-link-btn" onClick={() => handleNotificationAction(item)}>
                                    <span>Go to Chat</span><FiMessageSquare size={13} />
                                  </button>
                                )}
                                {canModerateAppeal && (
                                  <button
                                    className="notif-action-link-btn"
                                    onClick={() => setAppealResponseId(appealResponseId === item._id ? null : item._id)}
                                    style={{ color: '#d97706' }}
                                  >
                                    <span>{appealResponseId === item._id ? 'Cancel' : 'Review Appeal'}</span>
                                    <FiChevronRight size={14} />
                                  </button>
                                )}
                              </div>
                            )}

                            {canModerateAppeal && appealResponseId === item._id && (
                              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-gray-200)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <textarea
                                  value={appealText}
                                  onChange={e => setAppealText(e.target.value)}
                                  placeholder="Type decision note..."
                                  rows={2}
                                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-gray-200)', background: 'var(--color-gray-50)', color: 'var(--color-black)', fontSize: '12.5px', outline: 'none', boxSizing: 'border-box' }}
                                />
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                  <button className="notif-btn notif-btn-secondary" onClick={() => handleResolveAppeal(item, 'reject')} disabled={appealLoading} style={{ color: '#dc2626', borderColor: '#fca5a5' }}>Reject Appeal</button>
                                  <button className="notif-btn notif-btn-primary" onClick={() => handleResolveAppeal(item, 'approve')} disabled={appealLoading} style={{ background: '#16a34a' }}>Approve & Unblock</button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            // ── Flat list for specific category filter ──
            filteredList.map(item => {
              const senderUser = typeof item.sender === 'object' ? item.sender : null;
              const isAppeal = item.type === 'appeal';
              const canModerateAppeal = isAppeal && (isAdmin || isEditor || isModerator);

              return (
                <div key={item._id} className={`notif-card ${!item.isRead ? 'unread' : ''}`}>
                  <div className="notif-card-header">
                    <div className="notif-card-meta">
                      <span className={`notif-type-tag notif-type-${item.type}`}>{item.type.replace('_', ' ')}</span>
                      {item.priority === 'pinned' && (<span className="notif-type-tag" style={{ background: '#fef3c7', color: '#b45309' }}>📌 Pinned</span>)}
                      <span className="notif-time-text">{getTimeAgo(item.createdAt)}</span>
                    </div>
                    <div className="notif-card-actions">
                      <button className="notif-icon-btn" onClick={() => markNotificationRead(item._id)} title={item.isRead ? 'Marked read' : 'Mark as read'}>
                        <FiCheck size={14} color={item.isRead ? 'var(--color-gray-400)' : 'var(--accent-color)'} />
                      </button>
                      {isAdmin && (<button className="notif-icon-btn" onClick={() => deleteNotification(item._id)} title="Delete"><FiTrash2 size={14} color="#dc2626" /></button>)}
                    </div>
                  </div>
                  <div className="notif-card-body">
                    {senderUser && (<img src={senderUser.avatar ? getImageUrl(senderUser.avatar) : `https://ui-avatars.com/api/?name=${encodeURIComponent(senderUser.name || 'User')}&background=random`} alt="" className="notif-sender-avatar" />)}
                    <div className="notif-card-main-text">
                      <h4 className="notif-card-title">{item.title}</h4>
                      <p className="notif-card-message">{item.message}</p>
                    </div>
                  </div>
                  {(item.actionUrl || canModerateAppeal || item.type === 'message') && (
                    <div className="notif-card-footer">
                      {item.actionUrl && (<button className="notif-action-link-btn" onClick={() => handleNotificationAction(item)}><span>Open Link</span><FiExternalLink size={13} /></button>)}
                      {item.type === 'message' && (<button className="notif-action-link-btn" onClick={() => handleNotificationAction(item)}><span>Go to Chat</span><FiMessageSquare size={13} /></button>)}
                      {canModerateAppeal && (<button className="notif-action-link-btn" onClick={() => setAppealResponseId(appealResponseId === item._id ? null : item._id)} style={{ color: '#d97706' }}><span>{appealResponseId === item._id ? 'Cancel' : 'Review Appeal'}</span><FiChevronRight size={14} /></button>)}
                    </div>
                  )}
                  {canModerateAppeal && appealResponseId === item._id && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-gray-200)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <textarea value={appealText} onChange={e => setAppealText(e.target.value)} placeholder="Type decision note to the user..." rows={2} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-gray-200)', background: 'var(--color-gray-50)', color: 'var(--color-black)', fontSize: '12.5px', outline: 'none', boxSizing: 'border-box' }} />
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="notif-btn notif-btn-secondary" onClick={() => handleResolveAppeal(item, 'reject')} disabled={appealLoading} style={{ color: '#dc2626', borderColor: '#fca5a5' }}>Reject Appeal</button>
                        <button className="notif-btn notif-btn-primary" onClick={() => handleResolveAppeal(item, 'approve')} disabled={appealLoading} style={{ background: '#16a34a' }}>Approve & Unblock</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>


      {/* ── Broadcast Announcement Modal ── */}
      {broadcastModalOpen && (
        <div className="notif-modal-overlay" onClick={() => setBroadcastModalOpen(false)}>
          <div className="notif-modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>Push Broadcast Announcement</h3>
              <button 
                className="notif-icon-btn" 
                onClick={() => setBroadcastModalOpen(false)}
              >
                <FiX size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 750, textTransform: 'uppercase', color: 'var(--color-gray-500)', marginBottom: '6px' }}>
                  Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Campus Spring Festival Registration Open"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--color-gray-200)', background: 'var(--color-gray-50)', color: 'var(--color-black)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 750, textTransform: 'uppercase', color: 'var(--color-gray-500)', marginBottom: '6px' }}>
                  Message Content
                </label>
                <textarea
                  placeholder="Write announcement details..."
                  rows={4}
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--color-gray-200)', background: 'var(--color-gray-50)', color: 'var(--color-black)', fontSize: '13px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 750, textTransform: 'uppercase', color: 'var(--color-gray-500)', marginBottom: '6px' }}>
                    Type
                  </label>
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--color-gray-200)', background: 'var(--color-gray-50)', color: 'var(--color-black)', fontSize: '13px', outline: 'none' }}
                  >
                    <option value="announcement">📢 Announcement</option>
                    <option value="board_news">📰 Board News</option>
                    <option value="sensitivity">⚡ Critical Alert</option>
                    <option value="editorial">✍️ Editorial Notice</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 750, textTransform: 'uppercase', color: 'var(--color-gray-500)', marginBottom: '6px' }}>
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--color-gray-200)', background: 'var(--color-gray-50)', color: 'var(--color-black)', fontSize: '13px', outline: 'none' }}
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High Priority</option>
                    <option value="pinned">📌 Pinned Banner</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 750, textTransform: 'uppercase', color: 'var(--color-gray-500)', marginBottom: '6px' }}>
                  Action URL (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. /news or https://university.edu"
                  value={newActionUrl}
                  onChange={e => setNewActionUrl(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--color-gray-200)', background: 'var(--color-gray-50)', color: 'var(--color-black)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  className="notif-btn notif-btn-secondary"
                  onClick={() => setBroadcastModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="notif-btn notif-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Pushing...' : 'Broadcast Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
