import React from 'react';
import { Link } from 'react-router-dom';
import { FiClock, FiZap, FiEye } from 'react-icons/fi';
import { isWithinInterval, subHours } from 'date-fns';
import NewsArticleCard, { getImgSrc, timeAgo } from './NewsArticleCard';

const RecentTab = ({ articles, highlightId, onReply, onComment }) => {
  const hotFewHours = articles.filter(a => {
    try {
      return isWithinInterval(new Date(a.publishedAt), {
        start: subHours(new Date(), 24),
        end: new Date()
      });
    } catch {
      return false;
    }
  }).sort((a, b) => b.views - a.views).slice(0, 5);

  const hotMinute = articles.filter(a => {
    try {
      return isWithinInterval(new Date(a.publishedAt), {
        start: subHours(new Date(), 2),
        end: new Date()
      });
    } catch {
      return false;
    }
  }).slice(0, 3);

  const recentAll = [...articles].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  return (
    <div className="nm-recent-layout">
      {/* Left: Recently Updated Feed */}
      <div className="nm-recent-feed">
        <div className="nm-section-header">
          <FiClock size={15} />
          <span className="nm-section-title">Recently Updated</span>
        </div>
        {recentAll.map(art => (
          <NewsArticleCard key={art._id} article={art} onReply={onReply} onComment={onComment} highlight={highlightId === art._id} />
        ))}
        {recentAll.length === 0 && <div className="nm-empty">No recent articles.</div>}
      </div>

      {/* Right: Hot Few Hours + Hot Minute */}
      <aside className="nm-recent-sidebar">
        {/* Hot Few Hours */}
        <div className="nm-recent-sidebar-block">
          <div className="nm-section-header">
            <FiZap size={14} className="nm-zap-icon" />
            <span className="nm-section-title">Hot Few Hours</span>
          </div>
          {hotFewHours.length === 0 ? (
            <p className="nm-sidebar-empty">No new articles in the last 24h.</p>
          ) : (
            hotFewHours.map((art, i) => (
              <Link to={`/article/${art.slug}`} key={art._id} className="nm-sidebar-item">
                <span className="nm-sidebar-rank">#{i + 1}</span>
                <div className="nm-sidebar-info">
                  <span className="nm-sidebar-title">{art.title}</span>
                  <span className="nm-sidebar-meta">
                    <FiEye size={10} /> {art.views} · {timeAgo(art.publishedAt)}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Hot Minute */}
        <div className="nm-recent-sidebar-block" style={{ marginTop: 24 }}>
          <div className="nm-section-header">
            <FiZap size={16} className="nm-section-icon-hot" style={{ color: '#ef4444' }} />
            <span className="nm-section-title">Hot Minute</span>
            <span className="nm-live-badge">LIVE</span>
          </div>
          {hotMinute.length === 0 ? (
            <p className="nm-sidebar-empty">No articles in the last 2h. Check back soon!</p>
          ) : (
            hotMinute.map(art => (
              <Link to={`/article/${art.slug}`} key={art._id} className="nm-sidebar-item hot-minute">
                <div className="nm-sidebar-info">
                  <span className="nm-sidebar-title">{art.title}</span>
                  <span className="nm-sidebar-meta">{timeAgo(art.publishedAt)}</span>
                </div>
                {art.coverImage && (
                  <img src={getImgSrc(art.coverImage)} alt="" className="nm-sidebar-thumb" />
                )}
              </Link>
            ))
          )}
        </div>
      </aside>
    </div>
  );
};

export default RecentTab;
