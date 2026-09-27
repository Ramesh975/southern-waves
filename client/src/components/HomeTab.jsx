import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FiZap, FiEye, FiArrowRight, FiCornerUpLeft,
  FiChevronLeft, FiChevronRight,
  FiTrendingUp, FiClock, FiChevronRight as FiPlay
} from 'react-icons/fi';
import { BiHeart } from 'react-icons/bi';
import { MdSchool } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import { getDisplayName } from '../utils/userUtils';
import NewsArticleCard, { getImgSrc, timeAgo } from './NewsArticleCard';
import TraditionalBoard from './TraditionalBoard';
import InfiniteScrollFooter from './InfiniteScrollFooter';
import { articleAPI } from '../services/api';

// ─── FEATURED CAROUSEL ──────────────────────────────────────────────
const FeaturedCarousel = ({ articles, onReply }) => {
  const { user } = useAuth();
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
                <span>By {getDisplayName(art.author, user)}</span>
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

// ─── RIGHT SIDEBAR: UNIVERSITY NEWS (Image-1 style) ──────────────────
// Big hero card + 2-col grid below
const SidebarUniversityNews = ({ articles }) => {
  if (!articles || articles.length === 0) return null;
  const hero = articles[0];
  const grid = articles.slice(1, 5); // up to 4 in 2×2

  return (
    <div className="ht-sidebar-uninews">
      <div className="ht-sidebar-section-header">
        <MdSchool size={15} />
        <span>University News</span>
        <Link to="/university-row" className="ht-sidebar-section-more">
          › All
        </Link>
      </div>

      {/* Hero card */}
      <Link to={`/article/${hero.slug}`} className="ht-uninews-hero">
        {hero.coverImage ? (
          <img
            src={getImgSrc(hero.coverImage)}
            alt={hero.title}
            className="ht-uninews-hero-img"
            loading="lazy"
          />
        ) : (
          <div className="ht-uninews-hero-img ht-uninews-placeholder" />
        )}
        <div className="ht-uninews-hero-overlay">
          <p className="ht-uninews-hero-title">{hero.title}</p>
        </div>
      </Link>

      {/* 2-col grid */}
      {grid.length > 0 && (
        <div className="ht-uninews-grid">
          {grid.map(art => (
            <Link key={art._id} to={`/article/${art.slug}`} className="ht-uninews-grid-item">
              {art.coverImage ? (
                <img
                  src={getImgSrc(art.coverImage)}
                  alt={art.title}
                  className="ht-uninews-grid-img"
                  loading="lazy"
                />
              ) : (
                <div className="ht-uninews-grid-img ht-uninews-placeholder" />
              )}
              <p className="ht-uninews-grid-title">{art.title}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── RIGHT SIDEBAR: TRENDING (Image-2 style) ─────────────────────────
// Compact bullet list, title only
const SidebarTrending = ({ trending, trendingTags }) => {
  if (!trending || trending.length === 0) return null;

  return (
    <div className="ht-sidebar-trending">
      <div className="ht-sidebar-section-header">
        <FiTrendingUp size={14} />
        <span>Trending</span>
        <Link to="/news?trending=true" className="ht-sidebar-section-more">
          › More
        </Link>
      </div>

      {/* Tag pills row */}
      {trendingTags && trendingTags.length > 0 && (
        <div className="ht-sidebar-tag-pills">
          {trendingTags.slice(0, 5).map(t => {
            const raw = typeof t === 'string' ? t : (t?.tag || '');
            let name = raw;
            try { name = decodeURIComponent(raw).trim(); } catch { name = raw.trim(); }
            const d = name.replace(/^#/, '');
            if (!d) return null;
            return (
              <Link key={raw} to={`/tag/${encodeURIComponent(d)}`} className="ht-sidebar-tag-pill">
                #{d}
              </Link>
            );
          })}
        </div>
      )}

      {/* Bullet list */}
      <div className="ht-trending-list">
        {trending.slice(0, 12).map((art, i) => (
          <Link key={art._id} to={`/article/${art.slug}`} className="ht-trending-item">
            <span className="ht-trending-bullet">◦</span>
            <span className="ht-trending-title">{art.title}</span>
            {(art.isTrending || i < 2) && (
              <span className="ht-trending-arrow">▶</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};

// ─── RIGHT SIDEBAR: HYPED (Mixed style) ──────────────────────────────
// Alternates: image+text card, then text-only item
const SidebarHyped = ({ trending }) => {
  if (!trending || trending.length === 0) return null;
  // First 2 items get image cards, rest are text list
  const withImg = trending.slice(0, 2);
  const textOnly = trending.slice(2, 8);

  return (
    <div className="ht-sidebar-hyped">
      <div className="ht-sidebar-section-header">
        <FiZap size={14} />
        <span>Mostly Hyped</span>
      </div>

      {/* Image cards */}
      <div className="ht-hyped-image-cards">
        {withImg.map((art, i) => (
          <Link key={art._id} to={`/article/${art.slug}`} className="ht-hyped-img-card">
            {art.coverImage ? (
              <img src={getImgSrc(art.coverImage)} alt={art.title} className="ht-hyped-img-card-photo" loading="lazy" />
            ) : (
              <div className="ht-hyped-img-card-photo ht-uninews-placeholder" />
            )}
            <div className="ht-hyped-img-card-body">
              <span className="ht-hyped-rank-badge">#{i + 1}</span>
              <p className="ht-hyped-img-card-title">{art.title}</p>
              <div className="ht-hyped-img-card-meta">
                <span><BiHeart size={11} /> {art.likes?.length || 0}</span>
                <span>{timeAgo(art.publishedAt)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Text-only list */}
      <div className="ht-hyped-text-list">
        {textOnly.map((art, i) => (
          <Link key={art._id} to={`/article/${art.slug}`} className="ht-hyped-text-item">
            <span className="ht-hyped-text-rank">#{i + 3}</span>
            <div className="ht-hyped-text-content">
              <p className="ht-hyped-text-title">{art.title}</p>
              <span className="ht-hyped-text-meta">
                <BiHeart size={10} /> {art.likes?.length || 0}
                <span className="ht-hyped-sep">·</span>
                {timeAgo(art.publishedAt)}
              </span>
            </div>
            {art.coverImage && (
              <img src={getImgSrc(art.coverImage)} alt="" className="ht-hyped-text-thumb" loading="lazy" />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};

// ─── HOME TAB ────────────────────────────────────────────────────────
const HomeTab = ({
  articles,
  trending,
  trendingTags,
  highlightId,
  onReply,
  onComment,
  onTabSwitch,
  category,
  sentinelRef,
  loadingMore,
  hasMore,
  onLoadMore,
}) => {
  const [uniArticles, setUniArticles] = useState([]);

  useEffect(() => {
    if (category !== 'news') return; // Only fetch for /news page
    articleAPI.getAll({ category: 'news', status: 'published', limit: 5 })
      .then(res => setUniArticles(res.data?.data || []))
      .catch(() => {});
  }, [category]);

  return (
    <div className="nm-home-layout">
      {/* Featured Carousel */}
      <FeaturedCarousel articles={articles} onReply={onReply} />

      {/* Main content: dynamic feed + right sidebar */}
      <div className="nm-home-columns">
        {/* Left: Dynamic width news feed */}
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
            {/* Infinite Scroll Sentinel & Loader */}
            <InfiniteScrollFooter
              sentinelRef={sentinelRef}
              isLoading={loadingMore}
              hasMore={hasMore}
              count={articles.length}
              onLoadMore={onLoadMore}
            />
          </div>
        </div>

        {/* Right: Stacked sidebar sections */}
        <aside className="nm-home-right-col">
          {/* Traditional Board — tea-shop only */}
          {category === 'tea-shop' && <TraditionalBoard onTabSwitch={onTabSwitch} />}

          {/* 1. University News — hero + 2×2 grid (news page only) */}
          {category === 'news' && <SidebarUniversityNews articles={uniArticles} />}

          {/* 2. Trending — compact bullet list */}
          <SidebarTrending trending={trending} trendingTags={trendingTags} />

          {/* 3. Mostly Hyped — mixed image+text */}
          <SidebarHyped trending={trending} />
        </aside>
      </div>
    </div>
  );
};

export default HomeTab;
