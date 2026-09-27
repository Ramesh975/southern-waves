import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getImageUrl } from './ArticleComponents';
import { articleAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  FiX, 
  FiChevronUp, 
  FiChevronDown, 
  FiChevronLeft,
  FiChevronRight,
  FiArrowRight, 
  FiPause, 
  FiPlay, 
  FiHeart, 
  FiBookmark, 
  FiShare2, 
  FiExternalLink,
  FiZap
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const STORY_DURATION = 5500; // 5.5s per story
const TICK_INTERVAL = 50;

const WebStoryModal = ({ 
  stories = [], 
  initialIndex = 0, 
  onClose, 
  hasMore = false, 
  loadingMore = false, 
  onLoadMore 
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [likedMap, setLikedMap] = useState({});
  const [likeCountMap, setLikeCountMap] = useState({});
  const [savedMap, setSavedMap] = useState({});

  const timerRef = useRef(null);
  const wheelLockRef = useRef(false);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);

  const activeStory = stories[currentIndex] || stories[0];

  // Initialize like & save state from activeStory and user profile
  useEffect(() => {
    if (!activeStory) return;
    const storyId = activeStory._id;
    if (likedMap[storyId] === undefined) {
      const isLiked = user && activeStory.likes ? activeStory.likes.some(id => (typeof id === 'string' ? id : id?._id) === user._id) : false;
      setLikedMap(prev => ({ ...prev, [storyId]: isLiked }));
      const baseLikes = activeStory.likes ? activeStory.likes.length : 0;
      setLikeCountMap(prev => ({ ...prev, [storyId]: baseLikes }));
    }
    if (savedMap[storyId] === undefined) {
      const isSaved = user && user.savedArticles ? user.savedArticles.some(id => (typeof id === 'string' ? id : id?._id) === storyId) : false;
      setSavedMap(prev => ({ ...prev, [storyId]: isSaved }));
    }
  }, [activeStory, user]);

  // Infinite prefetch: load next batch of 8 when 2 items from end
  useEffect(() => {
    if (hasMore && !loadingMore && onLoadMore && currentIndex >= stories.length - 2) {
      onLoadMore();
    }
  }, [currentIndex, stories.length, hasMore, loadingMore, onLoadMore]);

  const goNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else if (hasMore && onLoadMore) {
      // Trigger load more and advance once batch is appended
      onLoadMore();
      setProgress(0);
    } else {
      // Loop back to first story
      setCurrentIndex(0);
      setProgress(0);
    }
  }, [currentIndex, stories.length, hasMore, onLoadMore]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
    }
  }, [currentIndex]);

  // Story progress timer
  useEffect(() => {
    if (isPaused) return;

    timerRef.current = setInterval(() => {
      setProgress(prev => {
        const next = prev + (TICK_INTERVAL / STORY_DURATION) * 100;
        if (next >= 100) {
          goNext();
          return 0;
        }
        return next;
      });
    }, TICK_INTERVAL);

    return () => clearInterval(timerRef.current);
  }, [isPaused, goNext]);

  // Keyboard navigation & lock body scroll
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPaused(p => !p);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [onClose, goNext, goPrev]);

  // Mouse wheel navigation like YouTube Shorts (vertical scroll advances/rewinds)
  const handleWheel = (e) => {
    if (wheelLockRef.current) return;
    if (Math.abs(e.deltaY) > 28) {
      wheelLockRef.current = true;
      if (e.deltaY > 0) {
        goNext();
      } else {
        goPrev();
      }
      setTimeout(() => {
        wheelLockRef.current = false;
      }, 350);
    }
  };

  // Touch Swipe navigation (mobile and touchscreens)
  const handleTouchStart = (e) => {
    setIsPaused(true);
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    setIsPaused(false);
    const diffY = touchStartY.current - e.changedTouches[0].clientY;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;

    if (Math.abs(diffY) > 40 && Math.abs(diffY) > Math.abs(diffX)) {
      if (diffY > 0) {
        goNext(); // swipe up
      } else {
        goPrev(); // swipe down
      }
    } else if (Math.abs(diffX) > 40) {
      if (diffX > 0) {
        goNext(); // swipe left
      } else {
        goPrev(); // swipe right
      }
    }
  };

  // Like Toggle
  const handleToggleLike = async (e) => {
    e.stopPropagation();
    if (!user) {
      toast.error('Please log in to like stories');
      return;
    }
    const storyId = activeStory._id;
    const currentLiked = likedMap[storyId];
    const currentLikesCount = likeCountMap[storyId] || 0;

    // Optimistic update
    setLikedMap(prev => ({ ...prev, [storyId]: !currentLiked }));
    setLikeCountMap(prev => ({ ...prev, [storyId]: currentLiked ? Math.max(0, currentLikesCount - 1) : currentLikesCount + 1 }));

    try {
      await articleAPI.like(storyId);
    } catch (err) {
      // Revert on error
      setLikedMap(prev => ({ ...prev, [storyId]: currentLiked }));
      setLikeCountMap(prev => ({ ...prev, [storyId]: currentLikesCount }));
      toast.error('Failed to update like');
    }
  };

  // Bookmark / Save Toggle
  const handleToggleSave = async (e) => {
    e.stopPropagation();
    if (!user) {
      toast.error('Please log in to save stories');
      return;
    }
    const storyId = activeStory._id;
    const currentSaved = savedMap[storyId];

    setSavedMap(prev => ({ ...prev, [storyId]: !currentSaved }));

    try {
      if (currentSaved) {
        await authAPI.unsaveArticle(storyId);
        toast.success('Removed from saved stories');
      } else {
        await authAPI.saveArticle(storyId);
        toast.success('Story saved to your library');
      }
    } catch (err) {
      setSavedMap(prev => ({ ...prev, [storyId]: currentSaved }));
      toast.error('Failed to update bookmark');
    }
  };

  // Share story link
  const handleShare = async (e) => {
    e.stopPropagation();
    const storyUrl = `${window.location.origin}/article/${activeStory.slug}`;
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(storyUrl);
        toast.success('Story link copied to clipboard!');
      } catch (err) {
        toast.success('Share this story: ' + storyUrl);
      }
    } else {
      toast.success('Story URL: ' + storyUrl);
    }

    try {
      await articleAPI.share(activeStory._id);
    } catch (err) {
      // Ignore background share count err
    }
  };

  if (!activeStory) return null;

  const categoryLabel = activeStory.sourceLabel || activeStory.category?.toUpperCase() || 'STORY';
  const isLiked = likedMap[activeStory._id];
  const likesCount = likeCountMap[activeStory._id] || (activeStory.likes?.length || 0);
  const isSaved = savedMap[activeStory._id];

  // Windowed progress segment display: show up to 12 progress segments centered around currentIndex
  const totalStoriesCount = stories.length;
  const maxSegments = Math.min(16, totalStoriesCount);
  const windowStart = Math.max(0, Math.min(currentIndex - Math.floor(maxSegments / 2), totalStoriesCount - maxSegments));
  const visibleStories = stories.slice(windowStart, windowStart + maxSegments);

  return (
    <div 
      className="web-story-shorts-viewport"
      onWheel={handleWheel}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Ambient Blurred Media Backdrop (Full Window YouTube Shorts effect) */}
      {activeStory.coverImage && (
        <div 
          className="web-story-shorts-ambient-bg" 
          style={{ backgroundImage: `url(${getImageUrl(activeStory.coverImage)})` }}
        />
      )}
      <div className="web-story-shorts-backdrop-dim" />

      {/* Floating Global Close Button (Top-Right) */}
      <button 
        type="button" 
        className="web-story-shorts-close-btn"
        onClick={onClose}
        aria-label="Close stories player (Esc)"
        title="Close (Esc)"
      >
        <FiX size={22} />
      </button>

      {/* Stage Layout: Centered 9:16 Reel Card + YouTube Shorts Side Action Rail */}
      <div className="web-story-shorts-stage">
        
        {/* Main 9:16 Vertical Reel Player Card */}
        <div 
          className="web-story-shorts-card"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Cover Image */}
          {activeStory.coverImage ? (
            <img 
              src={getImageUrl(activeStory.coverImage)} 
              alt={activeStory.title} 
              className="web-story-shorts-img" 
            />
          ) : (
            <div className="web-story-shorts-img-fallback" />
          )}

          {/* Gradients for readability */}
          <div className="web-story-shorts-top-gradient" />
          <div className="web-story-shorts-bottom-gradient" />

          {/* Top Reel Bar: Segmented Progress & Status */}
          <div className="web-story-shorts-top-bar">
            {/* Progress Track Segments */}
            <div className="web-story-shorts-progress-row">
              {visibleStories.map((_, i) => {
                const actualIdx = windowStart + i;
                let fill = 0;
                if (actualIdx < currentIndex) fill = 100;
                else if (actualIdx === currentIndex) fill = progress;
                return (
                  <div key={actualIdx} className="web-story-shorts-prog-track">
                    <div 
                      className="web-story-shorts-prog-fill" 
                      style={{ width: `${fill}%` }} 
                    />
                  </div>
                );
              })}
            </div>

            {/* Header Controls: Tags, Story Index, Play/Pause */}
            <div className="web-story-shorts-header-row">
              <div className="web-story-shorts-tags">
                <span className="web-story-shorts-cat-pill">
                  {categoryLabel}
                </span>
                {activeStory.recommendationRationale && (
                  <span className="web-story-shorts-recom-pill">
                    <FiZap size={11} style={{ marginRight: 4 }} />
                    {activeStory.recommendationRationale}
                  </span>
                )}
              </div>

              <div className="web-story-shorts-top-controls">
                <span className="web-story-shorts-counter">
                  {currentIndex + 1} / {stories.length}{hasMore ? '+' : ''}
                </span>
                <button 
                  type="button" 
                  className="web-story-shorts-icon-btn"
                  onClick={() => setIsPaused(p => !p)}
                  aria-label={isPaused ? 'Resume story' : 'Pause story'}
                  title={isPaused ? 'Resume (Space)' : 'Pause (Space)'}
                >
                  {isPaused ? <FiPlay size={14} /> : <FiPause size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* Pause overlay watermark */}
          {isPaused && (
            <div className="web-story-shorts-paused-badge">
              <FiPause size={20} />
              <span>PAUSED</span>
            </div>
          )}

          {/* Tap Navigation Zones (Left half = prev, Right half = next) */}
          <div 
            className="web-story-shorts-tap-left" 
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            title="Previous story"
          />
          <div 
            className="web-story-shorts-tap-right" 
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            title="Next story"
          />

          {/* Mobile Overlay Arrows for easy tap navigation */}
          {currentIndex > 0 && (
            <button 
              type="button" 
              className="web-story-shorts-mobile-nav prev"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              aria-label="Previous"
            >
              <FiChevronLeft size={20} />
            </button>
          )}
          <button 
            type="button" 
            className="web-story-shorts-mobile-nav next"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="Next"
          >
            <FiChevronRight size={20} />
          </button>

          {/* Bottom Story Content & Actions */}
          <div className="web-story-shorts-content-block">
            {/* Author info */}
            {activeStory.author && (
              <div className="web-story-shorts-author-row">
                <div className="web-story-shorts-author-avatar">
                  {activeStory.author.avatar ? (
                    <img src={getImageUrl(activeStory.author.avatar)} alt={activeStory.author.name} />
                  ) : (
                    <span>{(activeStory.author.name || 'S')[0].toUpperCase()}</span>
                  )}
                </div>
                <div className="web-story-shorts-author-text">
                  <span className="web-story-shorts-author-name">
                    {activeStory.author.showRealNamePublicly && activeStory.author.name 
                      ? activeStory.author.name 
                      : (activeStory.author.username || activeStory.author.name || 'Staff Writer')}
                  </span>
                  <span className="web-story-shorts-time">
                    {activeStory.publishedAt 
                      ? new Date(activeStory.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                      : 'Recently published'}
                  </span>
                </div>
              </div>
            )}

            {/* Title */}
            <h2 className="web-story-shorts-title">
              {activeStory.title}
            </h2>

            {/* Excerpt / Lead */}
            {activeStory.lead && (
              <p className="web-story-shorts-lead">
                {activeStory.lead}
              </p>
            )}

            {/* Read Full Article Button */}
            <div className="web-story-shorts-footer-action">
              <Link 
                to={`/article/${activeStory.slug}`}
                className="web-story-shorts-read-btn"
                onClick={onClose}
              >
                <span>Read Full Article</span>
                <FiArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>

        {/* Desktop Side Action Rail (YouTube Shorts Style!) */}
        <div className="web-story-shorts-side-rail">
          {/* Up Navigation Arrow */}
          <button 
            type="button" 
            className={`web-story-rail-btn nav-btn ${currentIndex === 0 ? 'disabled' : ''}`}
            onClick={goPrev}
            disabled={currentIndex === 0}
            title="Previous story (↑ / scroll up)"
            aria-label="Previous story"
          >
            <FiChevronUp size={22} />
          </button>

          {/* Down Navigation Arrow */}
          <button 
            type="button" 
            className="web-story-rail-btn nav-btn"
            onClick={goNext}
            title="Next story (↓ / scroll down)"
            aria-label="Next story"
          >
            <FiChevronDown size={22} />
          </button>

          <div className="web-story-rail-divider" />

          {/* Like Button */}
          <button 
            type="button" 
            className={`web-story-rail-btn action-btn ${isLiked ? 'liked' : ''}`}
            onClick={handleToggleLike}
            title={isLiked ? 'Unlike story' : 'Like story'}
            aria-label="Like story"
          >
            <FiHeart size={20} className={isLiked ? 'heart-fill' : ''} />
            <span className="web-story-rail-label">{likesCount > 0 ? likesCount : 'Like'}</span>
          </button>

          {/* Save / Bookmark Button */}
          <button 
            type="button" 
            className={`web-story-rail-btn action-btn ${isSaved ? 'saved' : ''}`}
            onClick={handleToggleSave}
            title={isSaved ? 'Saved to library' : 'Save story'}
            aria-label="Save story"
          >
            <FiBookmark size={20} className={isSaved ? 'bookmark-fill' : ''} />
            <span className="web-story-rail-label">{isSaved ? 'Saved' : 'Save'}</span>
          </button>

          {/* Share Button */}
          <button 
            type="button" 
            className="web-story-rail-btn action-btn"
            onClick={handleShare}
            title="Share story link"
            aria-label="Share story"
          >
            <FiShare2 size={20} />
            <span className="web-story-rail-label">Share</span>
          </button>

          {/* Open Article in new page */}
          <Link 
            to={`/article/${activeStory.slug}`}
            className="web-story-rail-btn action-btn"
            onClick={onClose}
            title="Open complete article"
            aria-label="Open article"
          >
            <FiExternalLink size={20} />
            <span className="web-story-rail-label">Open</span>
          </Link>
        </div>

      </div>
    </div>
  );
};

export default WebStoryModal;
