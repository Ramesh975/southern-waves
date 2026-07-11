import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiZap, FiEye, FiArrowRight, FiCornerUpLeft, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import NewsArticleCard, { getImgSrc, timeAgo } from './NewsArticleCard';
import TraditionalBoard from './TraditionalBoard';

// ─── FEATURED CAROUSEL ──────────────────────────────────────────────
const FeaturedCarousel = ({ articles, onReply }) => {
  const [idx, setIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  const featured = articles.filter(a => a.isFeatured || a.isTrending);
  const items = featured.length > 0 ? featured : articles.slice(0, 5);

  const advance = useCallback((dir) => {
    setIdx(i => (i + dir + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (!isPaused && items.length > 1) {
      timerRef.current = setInterval(() => advance(1), 4500);
    }
    return () => clearInterval(timerRef.current);
  }, [isPaused, advance, items.length]);

  if (!items.length) return null;

  return (
    <div
      className="nm-carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="nm-carousel-track" style={{ transform: `translateX(-${idx * 100}%)` }}>
        {items.map((art, i) => (
          <div key={art._id} className="nm-carousel-slide">
            <div
              className="nm-carousel-bg"
              style={{ backgroundImage: art.coverImage ? `url(${getImgSrc(art.coverImage)})` : 'none' }}
            />
            <div className="nm-carousel-fog" />
            <div className="nm-carousel-content">
              <div className="nm-carousel-badges">
                {art.isBreaking && <span className="nm-badge breaking">⚡ Breaking</span>}
                {art.isTrending && <span className="nm-badge trending">🔥 Trending</span>}
                <span className="nm-carousel-cat">{art.category}</span>
              </div>
              <h2 className="nm-carousel-title">{art.title}</h2>
              <p className="nm-carousel-lead">{art.lead}</p>
              <div className="nm-carousel-meta">
                <img
                  src={getImgSrc(art.author?.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(art.author?.name || 'A')}&background=random`}
                  alt={art.author?.name}
                  className="nm-carousel-avatar"
                />
                <span>By {art.author?.name}</span>
                <span className="nm-carousel-dot">·</span>
                <span>{timeAgo(art.publishedAt)}</span>
              </div>
              <div className="nm-carousel-actions">
                <Link to={`/article/${art.slug}`} className="nm-carousel-read-btn">
                  Read Story <FiArrowRight size={14} />
                </Link>
                <button className="nm-carousel-reply-btn" onClick={() => onReply(art)}>
                  <FiCornerUpLeft size={14} /> Reply
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Nav Arrows */}
      {items.length > 1 && (
        <>
          <button className="nm-carousel-arrow left" onClick={() => advance(-1)}>
            <FiChevronLeft size={20} />
          </button>
          <button className="nm-carousel-arrow right" onClick={() => advance(1)}>
            <FiChevronRight size={20} />
          </button>
          <div className="nm-carousel-dots">
            {items.map((_, i) => (
              <button
                key={i}
                className={`nm-dot${i === idx ? ' active' : ''}`}
                onClick={() => setIdx(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ─── HOME TAB ────────────────────────────────────────────────────────
const HomeTab = ({ articles, trending, highlightId, onReply, onComment, onTabSwitch, category }) => {
  return (
    <div className="nm-home-layout">
      {/* Featured Carousel */}
      <FeaturedCarousel articles={articles} onReply={onReply} />

      <div className="nm-home-columns">
        {/* Main Feed */}
        <div className="nm-main-feed">
          <div className="nm-section-header">
            <span className="nm-section-title">Latest News</span>
            <span className="nm-section-rule" />
          </div>
          <div className="nm-feed-list">
            {(category === 'tea-shop' 
              ? articles.filter(art => art.tags?.includes('mind') || (!art.tags?.includes('spoken') && !art.tags?.includes('ground')))
              : articles
            ).map(art => (
              <NewsArticleCard
                key={art._id}
                article={art}
                onReply={onReply}
                onComment={onComment}
                highlight={highlightId === art._id}
              />
            ))}
            {articles.length === 0 && (
              <div className="nm-empty">No articles found in this category.</div>
            )}
          </div>
        </div>

        {/* Right column: Board + Hyped */}
        <aside className="nm-home-right-col">
          {/* Traditional Board — animated */}
          {category === 'tea-shop' && <TraditionalBoard onTabSwitch={onTabSwitch} />}

          {/* Mostly Hyped */}
          <div className="nm-hyped-sidebar">
            <div className="nm-section-header">
              <FiZap size={16} className="nm-zap-icon" />
              <span className="nm-section-title">Mostly Hyped</span>
            </div>
            <div className="nm-hyped-list">
              {trending.slice(0, 6).map((art, i) => (
                <Link to={`/article/${art.slug}`} key={art._id} className="nm-hyped-item">
                  <span className="nm-hyped-rank">#{i + 1}</span>
                  <div className="nm-hyped-info">
                    <p className="nm-hyped-title">{art.title}</p>
                    <span className="nm-hyped-meta">
                      <FiEye size={11} /> {art.views?.toLocaleString()}
                      <span className="nm-hyped-sep">·</span>
                      {timeAgo(art.publishedAt)}
                    </span>
                  </div>
                  {art.coverImage && (
                    <img src={getImgSrc(art.coverImage)} alt="" className="nm-hyped-thumb" />
                  )}
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default HomeTab;
