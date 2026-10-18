import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { notificationAPI } from '../services/api';
import { getImageUrl } from './ArticleComponents';
import { 
  FiRadio, 
  FiTrendingUp, 
  FiHeart, 
  FiBell, 
  FiArrowRight, 
  FiClock, 
  FiChevronRight,
  FiEye
} from 'react-icons/fi';
import { FaFire } from 'react-icons/fa';
import './HomeLiveScreenWidget.css';

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

const HomeLiveScreenWidget = ({ trendingArticles = [], mostLikedArticles = [] }) => {
  const [activeTab, setActiveTab] = useState('trends'); // 'trends' | 'liked' | 'notifications'
  const { user } = useAuth();
  const { notifications: chatNotifications, markNotificationRead } = useChat();
  const [publicNotifs, setPublicNotifs] = useState([]);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const navigate = useNavigate();

  // Load public notifications for guests or fallback
  useEffect(() => {
    let isMounted = true;
    if (!user || !chatNotifications || chatNotifications.length === 0) {
      setNotifsLoading(true);
      notificationAPI.getPublic({ limit: 8 })
        .then(res => {
          if (isMounted) {
            setPublicNotifs(res.data?.data || []);
          }
        })
        .catch(() => {
          if (isMounted) setPublicNotifs([]);
        })
        .finally(() => {
          if (isMounted) setNotifsLoading(false);
        });
    }
    return () => { isMounted = false; };
  }, [user, chatNotifications?.length]);

  // Notifications display list
  const notifList = useMemo(() => {
    if (user && chatNotifications && chatNotifications.length > 0) {
      return chatNotifications
        .filter(n => n.type !== 'appeal' && !n.isDismissed)
        .slice(0, 8);
    }
    return publicNotifs.slice(0, 8);
  }, [user, chatNotifications, publicNotifs]);

  const unreadNotifCount = useMemo(() => {
    if (!user || !chatNotifications) return 0;
    return chatNotifications.filter(n => !n.isRead && !n.isDismissed).length;
  }, [user, chatNotifications]);

  const handleNotifClick = (notif) => {
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

  const trendingList = useMemo(() => {
    return (trendingArticles || []).slice(0, 6);
  }, [trendingArticles]);

  const likedList = useMemo(() => {
    return (mostLikedArticles || []).slice(0, 6);
  }, [mostLikedArticles]);

  return (
    <div className="home-live-screen-widget">
      {/* ── Widget Header ── */}
      <div className="home-live-header">
        <div className="home-live-title-wrap">
          <div className="home-live-indicator-icon">
            <FiRadio size={16} />
          </div>
          <h2 className="home-live-title">Live Screen</h2>
          <span className="home-live-pill">
            <span className="home-live-dot" /> LIVE
          </span>
        </div>

        {/* Dynamic header link based on active tab */}
        <Link 
          to={activeTab === 'notifications' ? '/notifications' : activeTab === 'liked' ? '/news?tab=liked' : '/news?tab=trending'} 
          className="home-live-explore-btn"
          title={`Explore all ${activeTab}`}
        >
          Explore <FiArrowRight size={13} />
        </Link>
      </div>

      {/* ── Switcher Navigation Tabs ── */}
      <div className="home-live-tabs" role="tablist" aria-label="Live Screen Categories">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'trends'}
          className={`home-live-tab-btn ${activeTab === 'trends' ? 'active' : ''}`}
          onClick={() => setActiveTab('trends')}
        >
          <FaFire size={14} className="tab-icon tab-icon-flame" />
          <span>Latest Trend</span>
          {trendingList.length > 0 && (
            <span className="tab-count-badge">{trendingList.length}</span>
          )}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'liked'}
          className={`home-live-tab-btn ${activeTab === 'liked' ? 'active' : ''}`}
          onClick={() => setActiveTab('liked')}
        >
          <FiHeart size={14} className="tab-icon tab-icon-heart" />
          <span>Most Liked</span>
          {likedList.length > 0 && (
            <span className="tab-count-badge">{likedList.length}</span>
          )}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'notifications'}
          className={`home-live-tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          <FiBell size={14} className="tab-icon tab-icon-bell" />
          <span>Notifications</span>
          {unreadNotifCount > 0 ? (
            <span className="tab-unread-pill">{unreadNotifCount}</span>
          ) : notifList.length > 0 ? (
            <span className="tab-count-badge">{notifList.length}</span>
          ) : null}
        </button>
      </div>

      {/* ── Scrollable Tab Panels ── */}
      <div className="home-live-body">
        {/* TAB 1: LATEST TREND */}
        {activeTab === 'trends' && (
          <div className="home-live-panel" role="tabpanel">
            {trendingList.length > 0 ? (
              <div className="home-live-feed-list">
                {trendingList.map((art, idx) => (
                  <div key={art._id || idx} className="home-live-trend-card">
                    <span className="home-live-rank">#{idx + 1}</span>
                    <Link to={`/article/${art.slug}`} className="home-live-thumb-link">
                      {art.coverImage ? (
                        <img 
                          src={getImageUrl(art.coverImage)} 
                          alt={art.title} 
                          className="home-live-thumb-img" 
                          loading="lazy" 
                        />
                      ) : (
                        <div className="home-live-thumb-placeholder">
                          <FiTrendingUp size={16} />
                        </div>
                      )}
                    </Link>
                    <div className="home-live-trend-info">
                      <div className="home-live-meta-row">
                        <span className="home-live-cat-tag">
                          {art.category?.toUpperCase() || 'NEWS'}
                        </span>
                        <span className="home-live-time">
                          <FiClock size={10} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                          {formatTimeAgo(art.publishedAt || art.createdAt)}
                        </span>
                      </div>
                      <h4 className="home-live-card-title">
                        <Link to={`/article/${art.slug}`}>{art.title}</Link>
                      </h4>
                      <div className="home-live-submeta">
                        <span>By {art.author?.name || 'Staff'}</span>
                        {art.views > 0 && (
                          <>
                            <span className="dot-divider">•</span>
                            <span className="views-stat"><FiEye size={11} style={{ marginRight: 3 }} /> {art.views} reads</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="home-live-empty-state">
                <FaFire size={28} className="empty-state-icon flame-icon" />
                <p>No trending posts yet today. Fresh trends will update automatically as campus readership spikes!</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MOST LIKED POSTS */}
        {activeTab === 'liked' && (
          <div className="home-live-panel" role="tabpanel">
            {likedList.length > 0 ? (
              <div className="home-live-feed-list">
                {likedList.map((art, idx) => {
                  const likesCount = art.likesCount ?? (Array.isArray(art.likes) ? art.likes.length : 0);
                  return (
                    <div key={art._id || idx} className="home-live-liked-card">
                      <Link to={`/article/${art.slug}`} className="home-live-thumb-link">
                        {art.coverImage ? (
                          <img 
                            src={getImageUrl(art.coverImage)} 
                            alt={art.title} 
                            className="home-live-thumb-img" 
                            loading="lazy" 
                          />
                        ) : (
                          <div className="home-live-thumb-placeholder liked-ph">
                            <FiHeart size={16} />
                          </div>
                        )}
                      </Link>
                      <div className="home-live-trend-info">
                        <div className="home-live-meta-row">
                          <span className="home-live-like-badge">
                            <FiHeart size={11} className="heart-filled" /> {likesCount} {likesCount === 1 ? 'Like' : 'Likes'}
                          </span>
                          <span className="home-live-time">
                            <FiClock size={10} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                            {formatTimeAgo(art.publishedAt || art.createdAt)}
                          </span>
                        </div>
                        <h4 className="home-live-card-title">
                          <Link to={`/article/${art.slug}`}>{art.title}</Link>
                        </h4>
                        <div className="home-live-submeta">
                          <span>By {art.author?.name || 'Staff'}</span>
                          <span className="dot-divider">•</span>
                          <span className="top-choice-tag">Campus Favorite</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="home-live-empty-state">
                <FiHeart size={28} className="empty-state-icon heart-icon" />
                <p>No posts with user likes yet. Articles with the most reader reactions and student appreciation will appear here!</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="home-live-panel" role="tabpanel">
            {notifsLoading && notifList.length === 0 ? (
              <div className="home-live-empty-state">
                <div className="home-live-spinner" />
                <p>Connecting to campus alert feeds...</p>
              </div>
            ) : notifList.length > 0 ? (
              <div className="home-live-feed-list">
                {notifList.map((notif, idx) => {
                  const typeCfg = NOTIF_ICONS[notif.type] || NOTIF_ICONS.announcement;
                  const isUnread = user && !notif.isRead;
                  const isPinned = notif.priority === 'pinned' || notif.priority === 'urgent';

                  return (
                    <div 
                      key={notif._id || idx}
                      className={`home-live-notif-card ${isUnread ? 'is-unread' : ''}`}
                      onClick={() => handleNotifClick(notif)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleNotifClick(notif); }}
                    >
                      <div className="home-live-notif-icon-col">
                        <span className="home-live-type-emoji">{typeCfg.icon}</span>
                      </div>
                      <div className="home-live-notif-content-col">
                        <div className="home-live-meta-row">
                          <span className="home-live-cat-tag" style={{ color: typeCfg.color }}>
                            {typeCfg.label}
                          </span>
                          {isPinned && <span className="home-live-pinned-tag">PINNED</span>}
                          <span className="home-live-time">
                            <FiClock size={10} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                            {formatTimeAgo(notif.createdAt)}
                          </span>
                        </div>
                        <h4 className="home-live-notif-title">{notif.title}</h4>
                        {notif.message && (
                          <p className="home-live-notif-message">{notif.message}</p>
                        )}
                      </div>
                      <div className="home-live-notif-action-col">
                        {isUnread && <span className="home-live-unread-dot" title="Unread" />}
                        <FiChevronRight size={14} className="home-live-arrow" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="home-live-empty-state">
                <FiBell size={28} className="empty-state-icon bell-icon" />
                <p>No active alerts right now. High-priority announcements and live bulletins will appear here.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Widget Footer ── */}
      <div className="home-live-footer">
        <span className="home-live-footer-summary">
          {activeTab === 'trends' 
            ? `${trendingList.length} live trending post${trendingList.length === 1 ? '' : 's'}`
            : activeTab === 'liked'
            ? `${likedList.length} top student favorite${likedList.length === 1 ? '' : 's'}`
            : `${notifList.length} recent campus alert${notifList.length === 1 ? '' : 's'}`}
        </span>
        <Link 
          to={activeTab === 'notifications' ? '/notifications' : activeTab === 'liked' ? '/news?tab=liked' : '/news?tab=trending'} 
          className="home-live-footer-link"
        >
          {activeTab === 'trends' ? 'Explore Trends →' : activeTab === 'liked' ? 'Explore Most Liked →' : 'Campus Alert Center →'}
        </Link>
      </div>
    </div>
  );
};

export default HomeLiveScreenWidget;
