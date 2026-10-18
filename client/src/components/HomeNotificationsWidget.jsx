import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { notificationAPI } from '../services/api';
import { 
  FiBell, 
  FiArrowRight, 
  FiClock, 
  FiChevronRight
} from 'react-icons/fi';
import './HomeNotificationsWidget.css';

const NOTIF_ICONS = {
  announcement: { icon: '📢', label: 'Announcement', color: '#c8102e' },
  board_news:   { icon: '📰', label: 'Campus News',  color: '#0055a4' },
  editorial:    { icon: '✍️', label: 'Editorial',    color: '#8b5cf6' },
  sensitivity:  { icon: '🚨', label: 'Security',     color: '#e11d48' },
  comment:      { icon: '💬', label: 'Discussion',   color: '#10b981' },
  system:       { icon: '⚙️', label: 'System',       color: '#64748b' }
};

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const past = new Date(dateStr);
  const diffSec = Math.floor((now - past) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const HomeNotificationsWidget = () => {
  const { user } = useAuth();
  const { notifications: chatNotifications, markNotificationRead } = useChat();
  const [publicNotifs, setPublicNotifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // If user is not logged in or has 0 chat notifications, fetch public notifications
  useEffect(() => {
    let isMounted = true;
    if (!user || !chatNotifications || chatNotifications.length === 0) {
      setLoading(true);
      notificationAPI.getPublic({ limit: 8 })
        .then(res => {
          if (isMounted) {
            setPublicNotifs(res.data?.data || []);
          }
        })
        .catch(() => {
          // Fallback to empty if public route fails
          if (isMounted) setPublicNotifs([]);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    }
    return () => { isMounted = false; };
  }, [user, chatNotifications?.length]);

  // Combine notifications to display: logged-in user notifications take precedence
  const displayList = useMemo(() => {
    if (user && chatNotifications && chatNotifications.length > 0) {
      // Exclude appeals/sensitive user moderation from public homepage widget
      return chatNotifications
        .filter(n => n.type !== 'appeal' && !n.isDismissed)
        .slice(0, 8);
    }
    return publicNotifs.slice(0, 8);
  }, [user, chatNotifications, publicNotifs]);

  const handleItemClick = (notif) => {
    if (user && !notif.isRead && markNotificationRead) {
      markNotificationRead(notif._id);
    }

    if (notif.actionUrl) {
      if (notif.actionUrl.startsWith('http')) {
        window.open(notif.actionUrl, '_blank', 'noopener,noreferrer');
      } else {
        navigate(notif.actionUrl);
      }
    } else {
      navigate('/notifications');
    }
  };

  return (
    <div className="home-notif-widget-card">
      {/* Widget Header - matching sketch-section-header-wrap */}
      <div className="home-notif-header">
        <div className="home-notif-title-group">
          <div className="home-notif-bell-icon">
            <FiBell size={16} />
          </div>
          <h2 className="home-notif-title">Recent Notifications</h2>
          <span className="home-notif-live-badge">
            <span className="home-notif-pulse-dot" /> LIVE
          </span>
        </div>
        <Link to="/notifications" className="home-notif-explore-btn" title="View all notifications">
          Explore <FiArrowRight size={13} />
        </Link>
      </div>

      {/* Widget Body Stream */}
      <div className="home-notif-list-container">
        {loading && displayList.length === 0 ? (
          <div className="home-notif-loading">
            <div className="home-notif-spinner" />
            <span>Loading campus alerts...</span>
          </div>
        ) : displayList.length > 0 ? (
          <div className="home-notif-list">
            {displayList.map((notif, idx) => {
              const typeCfg = NOTIF_ICONS[notif.type] || NOTIF_ICONS.announcement;
              const isUnread = user && !notif.isRead;
              const isPinned = notif.priority === 'pinned' || notif.priority === 'urgent';

              return (
                <div 
                  key={notif._id || idx}
                  className={`home-notif-item ${isUnread ? 'is-unread' : ''} ${isPinned ? 'is-pinned' : ''}`}
                  onClick={() => handleItemClick(notif)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleItemClick(notif); }}
                >
                  <div className="home-notif-item-left">
                    <span className="home-notif-type-icon">{typeCfg.icon}</span>
                  </div>

                  <div className="home-notif-item-center">
                    <div className="home-notif-item-meta-top">
                      <span className="home-notif-type-tag" style={{ color: typeCfg.color }}>
                        {typeCfg.label}
                      </span>
                      {isPinned && (
                        <span className="home-notif-priority-tag">PINNED</span>
                      )}
                      <span className="home-notif-time-ago">
                        <FiClock size={10} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>

                    <h4 className="home-notif-item-title">
                      {notif.title}
                    </h4>

                    {notif.message && (
                      <p className="home-notif-item-desc">
                        {notif.message}
                      </p>
                    )}
                  </div>

                  <div className="home-notif-item-right">
                    {isUnread && <span className="home-notif-unread-dot" title="Unread" />}
                    <FiChevronRight size={14} className="home-notif-arrow" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="home-notif-empty">
            <span className="home-notif-empty-icon">🔔</span>
            <h4>All Quiet on Campus</h4>
            <p>No active alerts right now. High-priority announcements and live bulletins will appear here.</p>
            <Link to="/notifications" className="home-notif-empty-btn">
              Open Notification Center
            </Link>
          </div>
        )}
      </div>

      {/* Widget Footer */}
      <div className="home-notif-footer">
        <span className="home-notif-footer-summary">
          {displayList.length} recent update{displayList.length === 1 ? '' : 's'}
        </span>
        <Link to="/notifications" className="home-notif-footer-link">
          Campus Alert History →
        </Link>
      </div>
    </div>
  );
};

export default HomeNotificationsWidget;
