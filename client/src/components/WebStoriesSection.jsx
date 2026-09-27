import React, { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getImageUrl } from './ArticleComponents';
import { FiChevronLeft, FiChevronRight, FiFilm, FiArrowRight, FiPlus, FiLoader } from 'react-icons/fi';

const WebStoriesSection = ({ 
  articles = [], 
  onSelectStory, 
  hasMore = false, 
  loadingMore = false, 
  onLoadMore, 
  initialLoading = false 
}) => {
  const trackRef = useRef(null);

  const scrollLeft = () => {
    if (trackRef.current) {
      trackRef.current.scrollBy({ left: -280, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (trackRef.current) {
      trackRef.current.scrollBy({ left: 280, behavior: 'smooth' });
    }
  };

  // Auto-trigger load more when user scrolls near the end of the horizontal track
  const handleScroll = () => {
    if (!trackRef.current || !hasMore || loadingMore || !onLoadMore) return;
    const { scrollLeft, scrollWidth, clientWidth } = trackRef.current;
    if (scrollWidth - (scrollLeft + clientWidth) < 140) {
      onLoadMore();
    }
  };

  if (initialLoading && (!articles || articles.length === 0)) {
    return (
      <div className="home-web-stories-container">
        <div className="home-web-stories-header">
          <div className="home-web-stories-title-block">
            <div className="home-web-stories-title-group">
              <span className="home-web-stories-icon-wrapper">
                <FiFilm className="home-web-stories-icon" />
              </span>
              <h2 className="home-web-stories-heading">Web Stories</h2>
              <div className="home-web-stories-underline" />
            </div>
            <p className="home-web-stories-recommend-note">
              Personalized based on your interests & history
            </p>
          </div>
        </div>
        <div className="home-web-stories-track">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="home-web-story-card skeleton-card">
              <div className="skeleton-box" style={{ width: '100%', height: '100%' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!articles || articles.length === 0) return null;

  return (
    <div className="home-web-stories-container">
      {/* Section Header */}
      <div className="home-web-stories-header">
        <div className="home-web-stories-title-block">
          <div className="home-web-stories-title-group">
            <span className="home-web-stories-icon-wrapper">
              <FiFilm className="home-web-stories-icon" />
            </span>
            <h2 className="home-web-stories-heading">Web Stories</h2>
            <div className="home-web-stories-underline" />
          </div>
          <p className="home-web-stories-recommend-note">
            Personalized feed based on your reading history & preferences [<Link to="/settings" className="recommend-settings-link">settings</Link>]
          </p>
        </div>

        <div className="home-web-stories-controls">
          <Link to="/stories" className="home-web-stories-all-link" title="Explore full stories player">
            <span>Explore All</span>
            <FiArrowRight size={13} />
          </Link>
          <button 
            type="button" 
            className="web-stories-scroll-btn prev" 
            onClick={scrollLeft}
            aria-label="Scroll left"
          >
            <FiChevronLeft size={16} />
          </button>
          <button 
            type="button" 
            className="web-stories-scroll-btn next" 
            onClick={scrollRight}
            aria-label="Scroll right"
          >
            <FiChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Horizontal Story Cards Track */}
      <div 
        className="home-web-stories-track" 
        ref={trackRef}
        onScroll={handleScroll}
      >
        {articles.map((art, idx) => {
          const categoryTag = art.sourceLabel || art.category?.toUpperCase() || 'STORY';
          return (
            <div 
              key={art._id || idx} 
              className="home-web-story-card"
              onClick={() => onSelectStory(idx)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectStory(idx);
                }
              }}
              title={`View story: ${art.title}`}
            >
              {/* Background Image */}
              {art.coverImage ? (
                <img 
                  src={getImageUrl(art.coverImage)} 
                  alt={art.title} 
                  className="home-web-story-img"
                  loading="lazy" 
                />
              ) : (
                <div className="home-web-story-img-placeholder" />
              )}

              {/* Fog Gradient */}
              <div className="home-web-story-gradient" />

              {/* Top Category Badge */}
              <div className="home-web-story-badge-wrap">
                <span className="home-web-story-badge">
                  {categoryTag}
                </span>
                {art.recommendationRationale && (
                  <span className="home-web-story-subbadge">
                    {art.recommendationRationale}
                  </span>
                )}
              </div>

              {/* Bottom Title & Author */}
              <div className="home-web-story-info">
                <h3 className="home-web-story-title">
                  {art.title}
                </h3>
                {art.author?.name && (
                  <span className="home-web-story-author">
                    By {art.author.name}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Load More Next Batch End Card */}
        {hasMore && (
          <div 
            className={`home-web-story-card home-web-story-load-card ${loadingMore ? 'loading' : ''}`}
            onClick={() => {
              if (!loadingMore && onLoadMore) onLoadMore();
            }}
            role="button"
            tabIndex={0}
            aria-label="Load next batch of web stories"
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !loadingMore && onLoadMore) {
                e.preventDefault();
                onLoadMore();
              }
            }}
          >
            <div className="home-web-story-load-inner">
              {loadingMore ? (
                <>
                  <div className="home-web-story-spinner" />
                  <span>Loading next 8...</span>
                </>
              ) : (
                <>
                  <div className="home-web-story-plus-icon">
                    <FiPlus size={24} />
                  </div>
                  <span className="home-web-story-load-text">Load Next 8</span>
                  <span className="home-web-story-load-sub">More for you</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebStoriesSection;
