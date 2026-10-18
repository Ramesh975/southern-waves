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
  FiEye,
  FiTag
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

const HomeLiveScreenWidget = ({ articles = [], trendingArticles = [], mostLikedArticles = [] }) => {
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
      notificationAPI.getPublic({ limit: 6 })
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
        .slice(0, 6);
    }
    return publicNotifs.slice(0, 6);
  }, [user, chatNotifications, publicNotifs]);

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

  // ── Unified Mixed Stream Construction (Non-categorical, Interleaved with Tags) ──
  const mixedFeed = useMemo(() => {
    const feed = [];
    const seenArticleIds = new Set();

    const trends = (trendingArticles || []).slice(0, 6);
    const liked = (mostLikedArticles || []).slice(0, 6);
    const notifs = notifList.slice(0, 4);
    const news = (articles || []).slice(0, 6);

    const maxLen = Math.max(trends.length, liked.length, notifs.length, news.length);

    for (let i = 0; i < maxLen; i++) {
      // 1. Trending Article
      if (trends[i] && !seenArticleIds.has(trends[i]._id)) {
        seenArticleIds.add(trends[i]._id);
        const art = trends[i];
        const topicTag = Array.isArray(art.tags) && art.tags.length > 0 ? art.tags[0] : art.category;
        feed.push({
          id: `trend-${art._id || i}`,
          kind: 'article',
          itemType: 'trend',
          mainTag: '#TRENDING',
          topicTag: topicTag ? `#${topicTag.replace(/^#/, '')}` : null,
          title: art.title,
          slug: art.slug,
          coverImage: art.coverImage,
          author: art.author?.name || 'Staff',
          date: art.publishedAt || art.createdAt,
          views: art.views,
          raw: art
        });
      }

      // 2. Most Liked Article
      if (liked[i] && !seenArticleIds.has(liked[i]._id)) {
        seenArticleIds.add(liked[i]._id);
        const art = liked[i];
        const likesCount = art.likesCount ?? (Array.isArray(art.likes) ? art.likes.length : 0);
        const topicTag = Array.isArray(art.tags) && art.tags.length > 0 ? art.tags[0] : art.category;
        feed.push({
          id: `liked-${art._id || i}`,
          kind: 'article',
          itemType: 'liked',
          mainTag: '#MOST LIKED',
          topicTag: topicTag ? `#${topicTag.replace(/^#/, '')}` : null,
          likesCount: likesCount,
          title: art.title,
          slug: art.slug,
          coverImage: art.coverImage,
          author: art.author?.name || 'Staff',
          date: art.publishedAt || art.createdAt,
          raw: art
        });
      }

      // 3. Live Campus Notification / Alert
      if (notifs[i]) {
        const notif = notifs[i];
        const typeCfg = NOTIF_ICONS[notif.type] || NOTIF_ICONS.announcement;
        feed.push({
          id: `notif-${notif._id || i}`,
          kind: 'notification',
          itemType: 'notification',
          mainTag: `#${(typeCfg.label || 'ALERT').toUpperCase()}`,
          isPinned: notif.priority === 'pinned' || notif.priority === 'urgent',
          isUnread: user && !notif.isRead,
          title: notif.title,
          message: notif.message,
          icon: typeCfg.icon,
          tagColor: typeCfg.color,
          date: notif.createdAt,
          raw: notif
        });
      }

      // 4. Latest Campus News
      if (news[i] && !seenArticleIds.has(news[i]._id)) {
        seenArticleIds.add(news[i]._id);
        const art = news[i];
        const topicTag = Array.isArray(art.tags) && art.tags.length > 0 ? art.tags[0] : art.category;
        feed.push({
          id: `news-${art._id || i}`,
          kind: 'article',
          itemType: 'news',
          mainTag: art.category ? `#${art.category.toUpperCase()}` : '#LATEST',
          topicTag: topicTag ? `#${topicTag.replace(/^#/, '')}` : null,
          title: art.title,
          slug: art.slug,
          coverImage: art.coverImage,
          author: art.author?.name || 'Staff',
          date: art.publishedAt || art.createdAt,
          raw: art
        });
      }
    }

    return feed;
  }, [trendingArticles, mostLikedArticles, notifList, articles, user]);

  return (
    <div className="home-live-screen-widget">
      {/* ── Widget Header: Non-categorical, Pure Live Screen ── */}
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

        <div className="home-live-header-right">
          <span className="home-live-mixed-badge">
            <FiTag size={11} style={{ marginRight: 3 }} /> Mixed Feed
          </span>
          <Link to="/news" className="home-live-explore-btn" title="Explore all campus news">
            Explore <FiArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* ── Mixed News Feed with Distinct Tags ── */}
      <div className="home-live-body">
        {mixedFeed.length > 0 ? (
          <div className="home-live-mixed-list">
            {mixedFeed.map((item) => {
              // Notification Card
              if (item.kind === 'notification') {
                return (
                  <div 
                    key={item.id}
                    className={`home-live-mixed-card is-notif ${item.isUnread ? 'is-unread' : ''}`}
                    onClick={() => handleNotifClick(item.raw)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleNotifClick(item.raw); }}
                  >
                    <div className="home-live-card-thumb-col">
                      <div className="home-live-notif-avatar" style={{ borderColor: item.tagColor || 'var(--accent-color)' }}>
                        <span>{item.icon || '📢'}</span>
                      </div>
                    </div>

                    <div className="home-live-card-body-col">
                      <div className="home-live-tag-header">
                        <span className="home-live-tag-badge notif-tag" style={{ color: item.tagColor }}>
                          {item.mainTag}
                        </span>
                        {item.isPinned && <span className="home-live-pinned-pill">PINNED</span>}
                        <span className="home-live-time">
                          <FiClock size={10} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                          {formatTimeAgo(item.date)}
                        </span>
                      </div>

                      <h4 className="home-live-item-title">
                        {item.title}
                      </h4>

                      {item.message && (
                        <p className="home-live-item-excerpt">{item.message}</p>
                      )}
                    </div>

                    <div className="home-live-card-end-col">
                      {item.isUnread && <span className="home-live-unread-dot" title="Unread" />}
                      <FiChevronRight size={14} className="home-live-arrow" />
                    </div>
                  </div>
                );
              }

              // Article Card (Trending, Most Liked, or Latest News)
              return (
                <div 
                  key={item.id}
                  className={`home-live-mixed-card ${item.itemType === 'trend' ? 'is-trend' : item.itemType === 'liked' ? 'is-liked' : ''}`}
                >
                  <div className="home-live-card-thumb-col">
                    <Link to={`/article/${item.slug}`} className="home-live-mixed-thumb-link">
                      {item.coverImage ? (
                        <img 
                          src={getImageUrl(item.coverImage)} 
                          alt={item.title} 
                          className="home-live-mixed-thumb-img" 
                          loading="lazy" 
                        />
                      ) : (
                        <div className={`home-live-thumb-ph ${item.itemType === 'liked' ? 'liked-ph' : item.itemType === 'trend' ? 'trend-ph' : ''}`}>
                          {item.itemType === 'liked' ? <FiHeart size={16} /> : <FaFire size={15} />}
                        </div>
                      )}
                    </Link>
                  </div>

                  <div className="home-live-card-body-col">
                    <div className="home-live-tag-header">
                      {/* Main Dynamic Tag */}
                      {item.itemType === 'trend' && (
                        <span className="home-live-tag-badge trend-tag">
                          <FaFire size={10} className="tag-icon" /> {item.mainTag}
                        </span>
                      )}
                      {item.itemType === 'liked' && (
                        <span className="home-live-tag-badge liked-tag">
                          <FiHeart size={10} className="tag-icon heart-filled" /> {item.mainTag}
                        </span>
                      )}
                      {item.itemType === 'news' && (
                        <span className="home-live-tag-badge news-tag">
                          {item.mainTag}
                        </span>
                      )}

                      {/* Secondary Topic Tag */}
                      {item.topicTag && (
                        <span className="home-live-topic-tag">
                          {item.topicTag}
                        </span>
                      )}

                      <span className="home-live-time">
                        <FiClock size={10} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                        {formatTimeAgo(item.date)}
                      </span>
                    </div>

                    <h4 className="home-live-item-title">
                      <Link to={`/article/${item.slug}`}>{item.title}</Link>
                    </h4>

                    <div className="home-live-item-submeta">
                      <span className="author-name">By {item.author}</span>
                      {item.likesCount !== undefined && item.likesCount > 0 && (
                        <>
                          <span className="dot-divider">•</span>
                          <span className="liked-stat">
                            <FiHeart size={10} className="heart-filled" /> {item.likesCount} {item.likesCount === 1 ? 'like' : 'likes'}
                          </span>
                        </>
                      )}
                      {item.views > 0 && (
                        <>
                          <span className="dot-divider">•</span>
                          <span className="views-stat">
                            <FiEye size={10} /> {item.views} reads
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="home-live-card-end-col">
                    <Link to={`/article/${item.slug}`} className="home-live-arrow-link" title="Read story">
                      <FiChevronRight size={14} className="home-live-arrow" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="home-live-empty-state">
            <FaFire size={28} className="empty-state-icon flame-icon" />
            <p>Loading campus live updates and trending stories...</p>
          </div>
        )}
      </div>

      {/* ── Widget Footer ── */}
      <div className="home-live-footer">
        <span className="home-live-footer-summary">
          {mixedFeed.length} live campus updates streaming
        </span>
        <Link to="/news" className="home-live-footer-link">
          Explore All Campus News →
        </Link>
      </div>
    </div>
  );
};

export default HomeLiveScreenWidget;
