import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { articleAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getImageUrl, getCategoryLabel } from '../components/ArticleComponents';
import {
  FiChevronLeft, FiChevronRight, FiChevronUp, FiChevronDown,
  FiHeart, FiShare2, FiBookmark, FiArrowRight, FiX,
  FiPause, FiPlay, FiUser, FiTag, FiCompass, FiSettings, FiSliders, FiZap
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const StoriesPage = () => {
  const { user } = useAuth();
  const { theme, accent, themeEngine } = useTheme();
  const navigate = useNavigate();

  const isLight = theme === 'light';
  const isBlack = theme === 'black';
  const isExpressive = themeEngine === 'expressive';

  // Core colors
  const baseBg = isLight ? '#fbf9f5' : (isBlack ? '#000000' : '#151515');
  const textColor = isLight ? '#0d0d0d' : '#ffffff';
  const textSecondary = isLight ? 'rgba(0, 0, 0, 0.65)' : 'rgba(255, 255, 255, 0.65)';
  const borderLight = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)';
  const borderStrong = isLight ? 'var(--color-gray-200, #e2e7f2)' : 'rgba(255, 255, 255, 0.15)';

  // Radii
  const radiusLg = isExpressive ? '28px' : '20px';
  const radiusMd = isExpressive ? '16px' : '10px';
  const radiusPill = isExpressive ? '30px' : '20px';

  // Shadows
  const shadowCard = isLight 
    ? (isExpressive ? 'var(--shadow-lg)' : '0 20px 40px rgba(0,0,0,0.08)') 
    : (isBlack ? 'none' : '0 25px 60px rgba(0,0,0,0.7)');
  const shadowNav = isLight 
    ? '0 8px 24px rgba(0,0,0,0.08)' 
    : '0 8px 24px rgba(0,0,0,0.6)';

  // Button background colors
  const buttonBg = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.1)';
  const buttonBorder = isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.12)';
  const buttonTextColor = isLight ? '#333333' : '#ffffff';

  // Default Card Background (when no cover image is uploaded)
  const defaultCardBg = useMemo(() => {
    if (isExpressive) {
      return `linear-gradient(135deg, color-mix(in srgb, var(--accent-color) ${isLight ? '15%' : '25%'}, ${baseBg}) 0%, color-mix(in srgb, var(--accent-color) ${isLight ? '8%' : '12%'}, ${baseBg}) 50%, ${baseBg} 100%)`;
    }
    return isLight
      ? 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 50%, #d1d5db 100%)'
      : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #0f172a 100%)';
  }, [isLight, isExpressive, baseBg]);

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  // 2D Navigation state:
  const [verticalIndex, setVerticalIndex] = useState(0);
  const [horizontalIndex, setHorizontalIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [progress, setProgress] = useState(0);
  const [likedArticles, setLikedArticles] = useState({});
  const [isVerticalTransitioning, setIsVerticalTransitioning] = useState(false);

  // User Feed & Interaction Preferences
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(() => localStorage.getItem('sw_story_autoscroll') !== 'false');
  const [storyDuration, setStoryDuration] = useState(() => parseInt(localStorage.getItem('sw_story_duration') || '6500', 10));
  const [animationStyle, setAnimationStyle] = useState(() => localStorage.getItem('sw_story_animation') || '3d-cube');
  const [longPressEnabled, setLongPressEnabled] = useState(() => localStorage.getItem('sw_story_hold') !== 'false');

  const progressIntervalRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const isPointerDownRef = useRef(false);
  const holdTimeoutRef = useRef(null);
  const wheelLockRef = useRef(false);

  // Fetch published articles for the recommendation engine
  useEffect(() => {
    setLoading(true);
    articleAPI.getAll({ status: 'published', limit: 80 })
      .then((res) => {
        const fetched = res.data?.data || [];
        setArticles(fetched);
        setVerticalIndex(0);
        setHorizontalIndex(0);
        setProgress(0);
      })
      .catch((err) => {
        console.error('Failed to load stories:', err);
        toast.error('Failed to load stories');
      })
      .finally(() => setLoading(false));
  }, []);

  const recommendationTracks = useMemo(() => {
    if (!articles.length) return [];

    const authorMap = new Map();
    articles.forEach((art) => {
      const authorId = art.author?._id || 'editorial';
      const authorName = art.author?.name || 'Southern Waves Editorial';
      const authorUsername = art.author?.username || 'editorial';
      const authorAvatar = art.author?.avatar || '';
      const authorBio = art.author?.bio || '';

      if (!authorMap.has(authorId)) {
        authorMap.set(authorId, {
          authorId,
          name: authorName,
          username: authorUsername,
          avatar: authorAvatar,
          bio: authorBio,
          allTags: new Set(),
          stories: []
        });
      }
      const track = authorMap.get(authorId);
      track.stories.push(art);
      if (art.tags && Array.isArray(art.tags)) {
        art.tags.forEach(t => track.allTags.add(t));
      }
    });

    const tracks = Array.from(authorMap.values());
    if (tracks.length <= 1) return tracks;

    const ordered = [tracks[0]];
    const remaining = tracks.slice(1);

    while (remaining.length > 0) {
      const lastTrack = ordered[ordered.length - 1];
      const lastTags = Array.from(lastTrack.allTags);

      let bestIdx = 0;
      let maxScore = -1;
      let matchedTag = '';

      remaining.forEach((rem, idx) => {
        let score = 0;
        const remTags = Array.from(rem.allTags);
        const commonTags = remTags.filter(t => lastTags.includes(t));
        score += commonTags.length * 3;

        const lastCat = lastTrack.stories[0]?.category;
        const remCat = rem.stories[0]?.category;
        if (lastCat && remCat && lastCat === remCat) {
          score += 2;
        }

        if (score > maxScore) {
          maxScore = score;
          bestIdx = idx;
          matchedTag = commonTags[0] || (lastCat === remCat ? `#${lastCat}` : '');
        }
      });

      const nextTrack = remaining.splice(bestIdx, 1)[0];
      nextTrack.recommendationReason = matchedTag ? `Related to #${matchedTag.replace('#', '')}` : 'Recommended For You';
      ordered.push(nextTrack);
    }

    return ordered;
  }, [articles]);

  const currentTrack = recommendationTracks[verticalIndex] || null;
  const currentAuthorStories = currentTrack?.stories || [];
  const currentStory = currentAuthorStories[horizontalIndex] || null;

  // Horizontal Navigation: Next story by that particular author ONLY
  const nextHorizontalStory = useCallback(() => {
    if (!currentAuthorStories.length) return;
    if (horizontalIndex < currentAuthorStories.length - 1) {
      setHorizontalIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      if (autoScrollEnabled && recommendationTracks.length > 1 && verticalIndex < recommendationTracks.length - 1) {
        setIsVerticalTransitioning(true);
        setTimeout(() => {
          setVerticalIndex((v) => v + 1);
          setHorizontalIndex(0);
          setProgress(0);
          setIsVerticalTransitioning(false);
        }, 300);
      } else {
        toast('End of stories for this author. Slide ↕ for related recommendations.', {
          icon: '↕️',
          id: 'end-of-author'
        });
      }
    }
  }, [horizontalIndex, currentAuthorStories.length, autoScrollEnabled, recommendationTracks.length, verticalIndex]);

  const prevHorizontalStory = useCallback(() => {
    if (horizontalIndex > 0) {
      setHorizontalIndex((prev) => prev - 1);
      setProgress(0);
    }
  }, [horizontalIndex]);

  const nextRecommendedAuthor = useCallback(() => {
    if (verticalIndex < recommendationTracks.length - 1) {
      setIsVerticalTransitioning(true);
      setTimeout(() => {
        setVerticalIndex((prev) => prev + 1);
        setHorizontalIndex(0);
        setProgress(0);
        setIsVerticalTransitioning(false);
      }, 280);
    } else {
      toast.success('You have caught up with all recommended campus tracks! 🎉');
    }
  }, [verticalIndex, recommendationTracks.length]);

  const prevRecommendedAuthor = useCallback(() => {
    if (verticalIndex > 0) {
      setIsVerticalTransitioning(true);
      setTimeout(() => {
        setVerticalIndex((prev) => prev - 1);
        setHorizontalIndex(0);
        setProgress(0);
        setIsVerticalTransitioning(false);
      }, 280);
    }
  }, [verticalIndex]);

  // Auto-progress
  useEffect(() => {
    if (!currentStory || isPaused || isHolding || isDragging || !autoScrollEnabled) {
      clearInterval(progressIntervalRef.current);
      return;
    }

    const intervalTime = 50;
    const step = (intervalTime / storyDuration) * 100;

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          nextHorizontalStory();
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(progressIntervalRef.current);
  }, [currentStory, isPaused, isHolding, isDragging, autoScrollEnabled, storyDuration, nextHorizontalStory]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') nextHorizontalStory();
      else if (e.key === 'ArrowLeft') prevHorizontalStory();
      else if (e.key === 'ArrowDown') nextRecommendedAuthor();
      else if (e.key === 'ArrowUp') prevRecommendedAuthor();
      else if (e.key === ' ') { e.preventDefault(); setIsPaused((p) => !p); }
      else if (e.key === 'Escape') navigate(-1);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextHorizontalStory, prevHorizontalStory, nextRecommendedAuthor, prevRecommendedAuthor, navigate]);

  // Mouse wheel listener with real scroll effort
  useEffect(() => {
    const handleWheel = (e) => {
      if (wheelLockRef.current) return;
      if (Math.abs(e.deltaY) > 30) {
        wheelLockRef.current = true;
        if (e.deltaY > 0) nextRecommendedAuthor();
        else prevRecommendedAuthor();
        setTimeout(() => { wheelLockRef.current = false; }, 380);
      } else if (Math.abs(e.deltaX) > 30) {
        wheelLockRef.current = true;
        if (e.deltaX > 0) nextHorizontalStory();
        else prevHorizontalStory();
        setTimeout(() => { wheelLockRef.current = false; }, 340);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [nextRecommendedAuthor, prevRecommendedAuthor, nextHorizontalStory, prevHorizontalStory]);

  // ── Real-Time Drag, Touch & Hold Handlers ──
  const handlePointerDown = (e) => {
    isPointerDownRef.current = true;
    touchStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);

    if (longPressEnabled) {
      holdTimeoutRef.current = setTimeout(() => {
        if (isPointerDownRef.current && !isDragging) {
          setIsHolding(true);
        }
      }, 160);
    }
  };

  const handlePointerMove = (e) => {
    if (!isPointerDownRef.current) return;
    const deltaX = e.clientX - touchStartRef.current.x;
    const deltaY = e.clientY - touchStartRef.current.y;

    if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
      clearTimeout(holdTimeoutRef.current);
      setIsHolding(false);
      setIsDragging(true);

      // Dampen drag offset for realistic physical drag feel
      setDragOffset({
        x: deltaX * 0.85,
        y: deltaY * 0.85
      });
    }
  };

  const handlePointerUp = (e) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    clearTimeout(holdTimeoutRef.current);
    const wasHolding = isHolding;
    setIsHolding(false);

    const deltaX = e.clientX - touchStartRef.current.x;
    const deltaY = e.clientY - touchStartRef.current.y;
    const duration = Date.now() - touchStartRef.current.time;

    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });

    if (wasHolding) return;

    // Threshold check for snap transition
    if (Math.abs(deltaX) > 45 || (Math.abs(deltaX) > 25 && duration < 250)) {
      if (deltaX < 0) nextHorizontalStory();
      else prevHorizontalStory();
    } else if (Math.abs(deltaY) > 45 || (Math.abs(deltaY) > 25 && duration < 250)) {
      if (deltaY < 0) nextRecommendedAuthor();
      else prevRecommendedAuthor();
    }
  };

  const cancelPointer = () => {
    isPointerDownRef.current = false;
    clearTimeout(holdTimeoutRef.current);
    setIsHolding(false);
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  };

  const handleLike = () => {
    if (!currentStory) return;
    setLikedArticles((prev) => ({
      ...prev,
      [currentStory._id]: !prev[currentStory._id]
    }));
  };

  const handleShare = () => {
    if (!currentStory) return;
    const url = `${window.location.origin}/article/${currentStory.slug}`;
    if (navigator.share) {
      navigator.share({ title: currentStory.title, text: currentStory.lead, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Story link copied to clipboard!');
    }
  };

  const handleToggleAutoScroll = () => {
    const nextVal = !autoScrollEnabled;
    setAutoScrollEnabled(nextVal);
    localStorage.setItem('sw_story_autoscroll', nextVal ? 'true' : 'false');
    toast.success(nextVal ? 'Auto-Scroll Enabled ⚡' : 'Auto-Scroll Paused ⏸️');
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={cancelPointer}
      onPointerLeave={cancelPointer}
      style={{
        position: 'fixed',
        inset: 0,
        background: baseBg,
        backgroundImage: isExpressive 
          ? 'radial-gradient(ellipse 80% 50% at 50% -20%, color-mix(in srgb, var(--accent-color) 15%, transparent), transparent 70%), radial-gradient(ellipse 60% 40% at 100% 50%, color-mix(in srgb, var(--accent-color) 8%, transparent), transparent 60%)' 
          : 'none',
        color: textColor,
        zIndex: 9000,
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        overflow: 'hidden',
        touchAction: 'none',
        fontFamily: 'var(--font-sans, "Inter", sans-serif)'
      }}
    >
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 28px',
        background: `linear-gradient(to bottom, ${baseBg} 0%, color-mix(in srgb, ${baseBg} 80%, transparent) 70%, transparent 100%)`,
        zIndex: 35,
        opacity: isHolding ? 0.15 : 1,
        transition: 'opacity 0.25s ease',
        borderBottom: isLight ? '1px solid var(--color-gray-200, #cbd5e1)' : '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        {/* Clean Typography Branding (No Logo) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              textDecoration: 'none',
              cursor: 'pointer'
            }}
            title="Return to Southern Waves Home"
          >
            <span style={{
              fontFamily: 'var(--font-display, "Playfair Display", serif)',
              fontSize: '20px',
              fontWeight: 900,
              color: textColor,
              letterSpacing: '-0.4px',
              lineHeight: 1.15
            }}>
              Southern Waves<span style={{ color: 'var(--accent-color, #0f9f59)' }}>.</span>
            </span>
          </Link>

          <div style={{ width: '1px', height: '18px', background: isLight ? 'var(--color-gray-300, #cbd5e1)' : 'rgba(255, 255, 255, 0.15)' }} />

          {/* Stories Live Pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: isLight ? 'var(--color-gray-100, #f0f3f9)' : 'rgba(255, 255, 255, 0.05)',
            border: isLight ? '1px solid var(--color-gray-200, #cbd5e1)' : '1px solid rgba(255, 255, 255, 0.1)',
            padding: '4px 11px',
            borderRadius: radiusPill,
            backdropFilter: 'blur(10px)'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--accent-color, #0f9f59)',
              boxShadow: '0 0 8px var(--accent-color, #0f9f59)'
            }} />
            <span style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              color: isLight ? 'var(--color-gray-800, #333333)' : '#ffffff'
            }}>
              Stories
            </span>
          </div>

          {currentTrack?.recommendationReason && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              padding: '4px 12px',
              borderRadius: radiusPill,
              background: isLight ? 'color-mix(in srgb, var(--accent-color) 8%, var(--color-white))' : 'rgba(255, 255, 255, 0.06)',
              border: isLight ? '1px solid color-mix(in srgb, var(--accent-color) 25%, transparent)' : '1px solid rgba(255, 255, 255, 0.12)',
              color: isLight ? 'var(--accent-color)' : '#93c5fd',
              fontWeight: 700,
              backdropFilter: 'blur(8px)'
            }}>
              <FiCompass size={12} /> {currentTrack.recommendationReason}
            </span>
          )}
        </div>

        {/* Action Controls with Theme Accent */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleToggleAutoScroll}
            style={{
              background: autoScrollEnabled ? 'var(--accent-color, #0f9f59)' : (isLight ? 'var(--color-gray-100, #f0f3f9)' : 'rgba(255, 255, 255, 0.08)'),
              border: autoScrollEnabled ? '1px solid var(--accent-color, #0f9f59)' : (isLight ? '1px solid var(--color-gray-300, #cbd5e1)' : '1px solid rgba(255, 255, 255, 0.15)'),
              color: autoScrollEnabled ? '#ffffff' : (isLight ? 'var(--color-gray-800, #333333)' : '#ffffff'),
              borderRadius: radiusPill,
              padding: '6px 14px',
              fontSize: '11.5px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: autoScrollEnabled ? (isLight ? '0 2px 10px rgba(0,0,0,0.1)' : '0 2px 10px rgba(0,0,0,0.3)') : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <span>{autoScrollEnabled ? '⚡ Auto-Play ON' : '⏸️ Manual Scroll'}</span>
          </button>
          <button
            onClick={() => setIsPaused((p) => !p)}
            style={{
              background: buttonBg,
              border: buttonBorder,
              color: buttonTextColor,
              borderRadius: isExpressive ? '12px' : '50%',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s ease'
            }}
            title={isPaused ? "Play" : "Pause"}
          >
            {isPaused ? <FiPlay size={16} /> : <FiPause size={16} />}
          </button>
          <Link
            to="/settings?tab=recommendations"
            style={{
              background: buttonBg,
              border: buttonBorder,
              color: buttonTextColor,
              borderRadius: isExpressive ? '12px' : '50%',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s ease'
            }}
            title="Stories Preferences"
          >
            <FiSliders size={15} />
          </Link>
          <button
            onClick={() => navigate('/')}
            style={{
              background: buttonBg,
              border: buttonBorder,
              color: buttonTextColor,
              borderRadius: isExpressive ? '12px' : '50%',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s ease'
            }}
            title="Close Stories"
          >
            <FiX size={18} />
          </button>
        </div>
      </header>

      {isHolding && (
        <div style={{
          position: 'absolute',
          top: '70px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          border: isLight ? '1px solid var(--color-gray-300, #cbd5e1)' : '1px solid rgba(255,255,255,0.2)',
          color: isLight ? 'var(--color-gray-800, #333333)' : '#ffffff',
          padding: '6px 14px',
          borderRadius: radiusPill,
          fontSize: '12px',
          fontWeight: 800,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: isLight ? '0 8px 24px rgba(0,0,0,0.08)' : '0 8px 24px rgba(0,0,0,0.5)',
          animation: 'pulse 1.5s infinite'
        }}>
          <span>⏸️</span> Holding to inspect • Release to continue
        </div>
      )}

      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: '10px 16px 16px',
        perspective: '1200px',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌊</div>
            <p style={{ fontWeight: 700, color: isLight ? 'var(--color-gray-600, #666666)' : '#aaa' }}>Loading Recommendation Feed...</p>
          </div>
        ) : !currentStory ? (
          <div style={{ textAlign: 'center', maxWidth: '400px', color: textColor }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800 }}>No Stories Available</h3>
            <button
              onClick={() => navigate('/')}
              style={{ 
                background: 'var(--accent-color, #c8102e)', 
                color: '#fff', 
                border: 'none', 
                padding: '10px 20px', 
                borderRadius: isExpressive ? '16px' : '8px', 
                fontWeight: 700, 
                cursor: 'pointer',
                boxShadow: isLight ? '0 4px 12px rgba(0,0,0,0.1)' : '0 4px 12px rgba(0,0,0,0.4)'
              }}
            >
              Back to Home
            </button>
          </div>
        ) : (
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '460px',
            height: '100%',
            maxHeight: '760px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: isVerticalTransitioning ? 'translateY(40px) scale(0.92)' : 'translateY(0) scale(1)',
            opacity: isVerticalTransitioning ? 0 : 1,
            transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.35s ease'
          }}>
            {currentAuthorStories.map((storyItem, idx) => {
              const offset = idx - horizontalIndex;
              const isCurrent = offset === 0;

              let cardTransform = 'translateX(0) scale(1) rotateY(0deg)';
              let cardOpacity = 1;
              let cardZIndex = 10;

              if (isCurrent) {
                if (isDragging) {
                  cardTransform = `translateX(${dragOffset.x}px) translateY(${dragOffset.y}px) rotateY(${dragOffset.x * -0.05}deg) scale(${1 - Math.min(0.08, (Math.abs(dragOffset.x) + Math.abs(dragOffset.y)) * 0.0003)})`;
                }
              } else {
                const baseOffset = offset * 105;
                const dynamicOffset = isDragging ? baseOffset + dragOffset.x * 0.4 : baseOffset;
                const direction = offset > 0 ? 1 : -1;

                if (animationStyle === '3d-cube') {
                  cardTransform = `translateX(${dynamicOffset}%) scale(${Math.max(0.85, 1 - Math.abs(offset) * 0.1)}) rotateY(${direction * -20}deg)`;
                } else if (animationStyle === 'smooth-slide') {
                  cardTransform = `translateX(${dynamicOffset}%) scale(${Math.max(0.9, 1 - Math.abs(offset) * 0.08)})`;
                } else {
                  cardTransform = `translateX(${dynamicOffset}%) scale(${Math.max(0.8, 1 - Math.abs(offset) * 0.15)})`;
                }
                cardOpacity = Math.abs(offset) === 1 ? (isDragging ? 0.5 : 0.35) : 0;
                cardZIndex = 10 - Math.abs(offset);
              }

              return (
                <div
                  key={storyItem._id}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: radiusLg,
                    overflow: 'hidden',
                    background: isLight ? 'var(--color-white, #ffffff)' : (isBlack ? '#0a0b10' : '#18181b'),
                    border: isLight ? '1px solid var(--color-gray-200, #cbd5e1)' : (isBlack ? '1px solid rgba(255,255,255,0.08)' : 'none'),
                    boxShadow: isCurrent ? shadowCard : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transform: cardTransform,
                    opacity: cardOpacity,
                    zIndex: cardZIndex,
                    pointerEvents: isCurrent ? 'auto' : 'none',
                    transition: isDragging ? 'none' : 'transform 0.42s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.42s ease',
                    willChange: 'transform, opacity'
                  }}
                >
                  {storyItem.coverImage ? (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: `url("${getImageUrl(storyItem.coverImage)}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      filter: isLight ? 'brightness(0.85)' : 'brightness(0.72)'
                    }} />
                  ) : (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: defaultCardBg
                    }} />
                  )}

                  {/* Atmospheric Smoky Fog Vignette behind Title */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: isLight 
                      ? 'linear-gradient(to bottom, rgba(255,255,255,0.7) 0%, transparent 28%, rgba(255,255,255,0.3) 55%, rgba(255,255,255,0.75) 75%, rgba(255,255,255,0.92) 100%)'
                      : 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 28%, rgba(0,0,0,0.3) 55%, rgba(0,0,0,0.85) 75%, rgba(0,0,0,0.98) 100%)',
                    zIndex: 2,
                    opacity: isHolding ? 0.2 : 1,
                    transition: 'opacity 0.25s ease'
                  }} />

                  {isCurrent && (
                    <>
                      <div
                        onClick={prevHorizontalStory}
                        style={{ position: 'absolute', top: 0, bottom: '140px', left: 0, width: '35%', zIndex: 10, cursor: 'pointer' }}
                      />
                      <div
                        onClick={nextHorizontalStory}
                        style={{ position: 'absolute', top: 0, bottom: '140px', right: 0, width: '65%', zIndex: 10, cursor: 'pointer' }}
                      />
                    </>
                  )}

                  {/* Clean Top Author Bar without progress dash ticker */}
                  <div style={{
                    position: 'relative',
                    zIndex: 5,
                    padding: '20px 18px 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    opacity: isHolding ? 0 : 1,
                    transition: 'opacity 0.2s ease'
                  }}>
                    <Link
                      to={currentTrack?.username ? `/author/${currentTrack.username}` : `/author/${currentTrack?.authorId || 'editorial'}`}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}
                    >
                      <img
                        src={currentTrack?.avatar ? getImageUrl(currentTrack.avatar) : `https://ui-avatars.com/api/?name=${encodeURIComponent(currentTrack?.name || 'SW')}&background=c8102e&color=fff`}
                        alt=""
                        style={{ width: '40px', height: '40px', borderRadius: '50%', border: isLight ? '2px solid rgba(0,0,0,0.15)' : '2px solid rgba(255,255,255,0.85)', objectFit: 'cover' }}
                      />
                      <div>
                        <span style={{ fontSize: '13.5px', fontWeight: 800, color: isLight ? '#0d0d0d' : '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {currentTrack?.name || 'Southern Waves Editorial'}
                          <span style={{ fontSize: '11px', color: isLight ? 'var(--accent-color)' : '#93c5fd' }}>↗</span>
                        </span>
                        <span style={{ fontSize: '11px', color: isLight ? 'var(--color-gray-600, #666666)' : '#cbd5e1' }}>
                          Story {idx + 1} of {currentAuthorStories.length}
                        </span>
                      </div>
                    </Link>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span style={{
                        background: 'var(--accent-color, #0f9f59)',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        padding: '3px 9px',
                        borderRadius: isExpressive ? '12px' : '10px',
                        letterSpacing: '0.5px'
                      }}>
                        {getCategoryLabel(storyItem.category)}
                      </span>
                      {storyItem.tags?.[0] && (
                        <span style={{ fontSize: '10.5px', color: isLight ? 'var(--accent-color)' : '#93c5fd', fontWeight: 700 }}>
                          #{storyItem.tags[0]}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fog Effect Title & Content Container */}
                  <div style={{
                    position: 'relative',
                    zIndex: 5,
                    padding: '24px 22px 26px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    opacity: isHolding ? 0 : 1,
                    transition: 'opacity 0.2s ease',
                    background: isLight 
                      ? 'linear-gradient(to top, rgba(255, 255, 255, 0.96) 0%, rgba(245, 245, 248, 0.85) 50%, rgba(240, 240, 245, 0.4) 80%, transparent 100%)'
                      : 'linear-gradient(to top, rgba(0, 0, 0, 0.96) 0%, rgba(5, 5, 8, 0.85) 50%, rgba(10, 10, 15, 0.4) 80%, transparent 100%)',
                    borderTop: isLight ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderBottomLeftRadius: radiusLg,
                    borderBottomRightRadius: radiusLg
                  }}>
                    <h2 style={{
                      fontFamily: 'var(--font-display, "Playfair Display", serif)',
                      fontSize: '22px',
                      fontWeight: 800,
                      lineHeight: 1.3,
                      margin: 0,
                      color: textColor,
                      letterSpacing: '-0.2px',
                      textShadow: isLight ? '0 1px 4px rgba(255,255,255,0.8)' : '0 2px 14px rgba(0,0,0,0.95), 0 0 35px rgba(0,0,0,0.85)'
                    }}>
                      {storyItem.title}
                    </h2>

                    <p style={{
                      fontSize: '13px',
                      lineHeight: 1.55,
                      color: isLight ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.82)',
                      margin: 0,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textShadow: isLight ? 'none' : '0 1px 4px rgba(0,0,0,0.8)'
                    }}>
                      {storyItem.lead}
                    </p>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '4px',
                      gap: '10px'
                    }}>
                      <Link
                        to={`/article/${storyItem.slug}`}
                        style={{
                          flex: 1,
                          background: 'var(--accent-color, #0f9f59)',
                          color: '#ffffff',
                          padding: '11px 16px',
                          borderRadius: radiusMd,
                          fontWeight: 800,
                          fontSize: '13px',
                          textDecoration: 'none',
                          textAlign: 'center',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: isLight ? '0 4px 12px rgba(0,0,0,0.1)' : '0 4px 16px rgba(0,0,0,0.5)'
                        }}
                      >
                        Read Full Story <FiArrowRight size={14} />
                      </Link>

                      <button
                        onClick={handleLike}
                        style={{
                          background: likedArticles[storyItem._id] ? 'var(--color-red, #ef4444)' : (isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)'),
                          border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.12)',
                          color: likedArticles[storyItem._id] ? '#fff' : (isLight ? 'var(--color-gray-800, #333333)' : '#fff'),
                          borderRadius: radiusMd,
                          width: '42px',
                          height: '42px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          backdropFilter: 'blur(8px)'
                        }}
                      >
                        <FiHeart size={18} fill={likedArticles[storyItem._id] ? '#fff' : 'none'} color={likedArticles[storyItem._id] ? '#fff' : (isLight ? '#333' : '#fff')} />
                      </button>

                      <button
                        onClick={handleShare}
                        style={{
                          background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)',
                          border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.12)',
                          color: isLight ? 'var(--color-gray-800, #333333)' : '#fff',
                          borderRadius: radiusMd,
                          width: '42px',
                          height: '42px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          backdropFilter: 'blur(8px)'
                        }}
                      >
                        <FiShare2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {currentAuthorStories.length > 1 && (
          <>
            <button
              onClick={prevHorizontalStory}
              disabled={horizontalIndex === 0}
              style={{
                position: 'absolute',
                left: '28px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: isLight ? 'rgba(255, 255, 255, 0.75)' : 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(12px)',
                border: isLight ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(255, 255, 255, 0.12)',
                color: isLight ? '#0d0d0d' : '#fff',
                width: '48px',
                height: '48px',
                borderRadius: isExpressive ? '16px' : '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: horizontalIndex === 0 ? 'not-allowed' : 'pointer',
                opacity: horizontalIndex === 0 ? 0.2 : isHolding ? 0 : 1,
                zIndex: 30,
                transition: 'opacity 0.2s ease, transform 0.2s ease',
                boxShadow: shadowNav
              }}
            >
              <FiChevronLeft size={24} />
            </button>

            <button
              onClick={nextHorizontalStory}
              disabled={horizontalIndex === currentAuthorStories.length - 1}
              style={{
                position: 'absolute',
                right: '28px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: isLight ? 'rgba(255, 255, 255, 0.75)' : 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(12px)',
                border: isLight ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(255, 255, 255, 0.12)',
                color: isLight ? '#0d0d0d' : '#fff',
                width: '48px',
                height: '48px',
                borderRadius: isExpressive ? '16px' : '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: horizontalIndex === currentAuthorStories.length - 1 ? 'not-allowed' : 'pointer',
                opacity: horizontalIndex === currentAuthorStories.length - 1 ? 0.2 : isHolding ? 0 : 1,
                zIndex: 30,
                transition: 'opacity 0.2s ease, transform 0.2s ease',
                boxShadow: shadowNav
              }}
            >
              <FiChevronRight size={24} />
            </button>
          </>
        )}

        {recommendationTracks.length > 1 && (
          <div style={{
            position: 'absolute',
            right: currentAuthorStories.length > 1 ? '88px' : '28px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            zIndex: 30,
            opacity: isHolding ? 0 : 1,
            transition: 'opacity 0.2s ease'
          }}>
            <button
              onClick={prevRecommendedAuthor}
              disabled={verticalIndex === 0}
              style={{
                background: isLight ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(12px)',
                border: isLight ? '1px solid rgba(0, 0, 0, 0.15)' : '1px solid rgba(255, 255, 255, 0.15)',
                color: isLight ? 'var(--accent-color)' : '#93c5fd',
                width: '40px',
                height: '40px',
                borderRadius: isExpressive ? '12px' : '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: verticalIndex === 0 ? 'not-allowed' : 'pointer',
                opacity: verticalIndex === 0 ? 0.25 : 1,
                boxShadow: isLight ? '0 4px 16px rgba(0,0,0,0.06)' : '0 4px 16px rgba(0,0,0,0.6)'
              }}
            >
              <FiChevronUp size={22} />
            </button>

            <button
              onClick={nextRecommendedAuthor}
              disabled={verticalIndex === recommendationTracks.length - 1}
              style={{
                background: isLight ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(12px)',
                border: isLight ? '1px solid rgba(0, 0, 0, 0.15)' : '1px solid rgba(255, 255, 255, 0.15)',
                color: isLight ? 'var(--accent-color)' : '#93c5fd',
                width: '40px',
                height: '40px',
                borderRadius: isExpressive ? '12px' : '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: verticalIndex === recommendationTracks.length - 1 ? 'not-allowed' : 'pointer',
                opacity: verticalIndex === recommendationTracks.length - 1 ? 0.25 : 1,
                boxShadow: isLight ? '0 4px 16px rgba(0,0,0,0.06)' : '0 4px 16px rgba(0,0,0,0.6)'
              }}
            >
              <FiChevronDown size={22} />
            </button>
          </div>
        )}
      </main>

      <footer style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '10px 20px',
        fontSize: '11.5px',
        color: isLight ? 'var(--color-gray-600, #666666)' : '#94a3b8',
        background: isLight ? 'var(--color-paper)' : (isBlack ? '#000000' : 'rgba(0,0,0,0.8)'),
        borderTop: isLight ? '1px solid var(--color-gray-200, #cbd5e1)' : '1px solid rgba(255,255,255,0.06)',
        flexWrap: 'wrap',
        opacity: isHolding ? 0.1 : 1,
        transition: 'opacity 0.2s ease'
      }}>
        <span>↔ <strong>Slide / [←] [→]:</strong> Stories of {currentTrack?.name ? currentTrack.name.split(' ')[0] : 'Author'} ({horizontalIndex + 1}/{currentAuthorStories.length})</span>
        <span>•</span>
        <span>↕ <strong>Slide / [↑] [↓]:</strong> Related News & Recommendations</span>
        <span>•</span>
        <span>👆 <strong>Hold:</strong> Pause & Inspect</span>
      </footer>
    </div>
  );
};

export default StoriesPage;
