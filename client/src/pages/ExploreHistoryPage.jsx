import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { articleAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { getImageUrl } from '../components/ArticleComponents';
import {
  FiArrowRight, FiArrowLeft, FiX, FiPause, FiPlay,
  FiClock, FiCompass, FiBookOpen, FiShare2, FiSliders,
  FiChevronLeft, FiChevronRight, FiMaximize2
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const ExploreHistoryPage = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const isLight = theme === 'light';
  const isBlack = theme === 'black';

  // Base Theme Colors
  const baseBg = isLight ? '#fbf9f5' : (isBlack ? '#000000' : '#0e1015');
  const cardBg = isLight ? '#ffffff' : (isBlack ? '#0a0b10' : '#161822');
  const textColor = isLight ? '#0d0d0d' : '#ffffff';
  const textSecondary = isLight ? '#475569' : '#94a3b8';
  const borderColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)';

  // Design Radii
  const radiusLg = '18px';
  const radiusMd = '10px';
  const radiusPill = '20px';

  // Data & Navigation State
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sortOption, setSortOption] = useState('oldest'); // 'oldest' | 'newest' | 'pre-1950' | '1950-2000' | 'post-2000'
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState('next'); // 'next' | 'prev'

  // Autoplay & User Interaction State
  const [autoPlay, setAutoPlay] = useState(true);
  const [progress, setProgress] = useState(0);
  const [userInteracted, setUserInteracted] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const timerRef = useRef(null);
  const wheelLockRef = useRef(false);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

  // Handle Window Resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch History Timeline Articles
  useEffect(() => {
    setLoading(true);
    articleAPI.getAll({ category: 'kyp', limit: 100 })
      .then((res) => {
        const fetched = res.data?.data || [];
        setEvents(fetched);
        setCurrentIndex(0);
        setProgress(0);
      })
      .catch((err) => {
        console.error('Failed to load Explore History:', err);
        toast.error('Failed to load history archives.');
      })
      .finally(() => setLoading(false));
  }, []);

  // Filter & Sort Events
  const sortedEvents = useMemo(() => {
    if (!events.length) return [];
    let list = [...events];

    if (sortOption === 'pre-1950') {
      list = list.filter(e => e.historicalYear && Number(e.historicalYear) < 1950);
    } else if (sortOption === '1950-2000') {
      list = list.filter(e => e.historicalYear && Number(e.historicalYear) >= 1950 && Number(e.historicalYear) <= 2000);
    } else if (sortOption === 'post-2000') {
      list = list.filter(e => e.historicalYear && Number(e.historicalYear) > 2000);
    }

    list.sort((a, b) => {
      const yearA = Number(a.historicalYear) || new Date(a.publishedAt || a.createdAt).getFullYear();
      const yearB = Number(b.historicalYear) || new Date(b.publishedAt || b.createdAt).getFullYear();
      if (sortOption === 'newest') return yearB - yearA;
      return yearA - yearB; // default chronological oldest first
    });

    return list;
  }, [events, sortOption]);

  const currentEvent = sortedEvents[currentIndex] || null;
  const nextEvent = sortedEvents[currentIndex + 1] || sortedEvents[0] || null;

  // Step Navigation Functions
  const goToNext = useCallback(() => {
    if (!sortedEvents.length) return;
    setTransitionDirection('next');
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % sortedEvents.length);
      setProgress(0);
      setIsTransitioning(false);
    }, 280);
  }, [sortedEvents.length]);

  const goToPrev = useCallback(() => {
    if (!sortedEvents.length) return;
    setTransitionDirection('prev');
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + sortedEvents.length) % sortedEvents.length);
      setProgress(0);
      setIsTransitioning(false);
    }, 280);
  }, [sortedEvents.length]);

  // User Interaction Detector (pauses auto-play or resets progression)
  const registerUserInteraction = useCallback(() => {
    if (!userInteracted) {
      setUserInteracted(true);
      setAutoPlay(false);
      toast('Switched to manual interaction mode', { icon: '👆', id: 'manual-mode', duration: 2000 });
    }
    setProgress(0);
  }, [userInteracted]);

  // 5-Second Video-like Autoplay Timer
  useEffect(() => {
    if (!autoPlay || !currentEvent || isTransitioning) {
      clearInterval(timerRef.current);
      return;
    }

    const intervalTime = 50;
    const duration = 5000; // 5 seconds
    const step = (intervalTime / duration) * 100;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          goToNext();
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timerRef.current);
  }, [autoPlay, currentEvent, isTransitioning, goToNext]);

  // Laptop / Mouse Wheel Reveal Animation Listener
  useEffect(() => {
    const handleWheel = (e) => {
      if (wheelLockRef.current) return;
      registerUserInteraction();

      if (Math.abs(e.deltaY) > 28 || Math.abs(e.deltaX) > 28) {
        wheelLockRef.current = true;
        if (e.deltaY > 0 || e.deltaX > 0) {
          goToNext();
        } else {
          goToPrev();
        }
        setTimeout(() => {
          wheelLockRef.current = false;
        }, 420);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [goToNext, goToPrev, registerUserInteraction]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      registerUserInteraction();
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        goToNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        goToPrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        setAutoPlay(p => !p);
      } else if (e.key === 'Escape') {
        navigate('/know-your-past');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, navigate, registerUserInteraction]);

  // Mobile Touch Swipe Handlers
  const handleTouchStart = (e) => {
    registerUserInteraction();
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  };

  const handleTouchEnd = (e) => {
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const duration = Date.now() - touchStartRef.current.time;

    // Horizontal swipe detection
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) && duration < 400) {
      if (deltaX < 0) {
        goToNext(); // Swipe left -> Next
      } else {
        goToPrev(); // Swipe right -> Prev
      }
    }
  };

  const handleShare = () => {
    if (!currentEvent) return;
    const url = `${window.location.origin}/article/${currentEvent.slug}`;
    if (navigator.share) {
      navigator.share({ title: currentEvent.title, text: currentEvent.lead, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Historical event link copied!');
    }
  };

  const isMobile = windowWidth <= 820;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'fixed',
        inset: 0,
        background: baseBg,
        backgroundImage: 'none',
        color: textColor,
        zIndex: 9000,
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        overflow: 'hidden',
        fontFamily: 'var(--font-sans, "Inter", sans-serif)'
      }}
    >
      {/* ── Top App Bar / Controls Header ── */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 28px',
        background: isLight 
          ? 'linear-gradient(to bottom, rgba(251, 249, 245, 0.98), rgba(251, 249, 245, 0.85) 75%, transparent)' 
          : 'linear-gradient(to bottom, rgba(14, 16, 21, 0.98), rgba(14, 16, 21, 0.85) 75%, transparent)',
        borderBottom: `1px solid ${borderColor}`,
        zIndex: 40,
        gap: '14px',
        flexWrap: 'wrap'
      }}>
        {/* Left Branding & Context */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <Link
            to="/know-your-past"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
              color: textColor,
              fontWeight: 800,
              fontSize: '15px'
            }}
          >
            <span style={{
              fontFamily: 'var(--font-display, "Playfair Display", serif)',
              fontSize: '19px',
              fontWeight: 900,
              letterSpacing: '-0.3px'
            }}>
              Southern Waves<span style={{ color: 'var(--accent-color)' }}>.</span>
            </span>
          </Link>

          <div style={{ width: '1px', height: '18px', background: isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)' }} />

          {/* Explore History Live Indicator */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${borderColor}`,
            padding: '4px 12px',
            borderRadius: radiusPill
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: 'var(--accent-color)',
              boxShadow: '0 0 10px var(--accent-color)'
            }} />
            <span style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              color: isLight ? '#334155' : '#e2e8f0'
            }}>
              Explore History
            </span>
          </div>

          {/* Sort Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <select
              value={sortOption}
              onChange={(e) => {
                setSortOption(e.target.value);
                setCurrentIndex(0);
                setProgress(0);
              }}
              style={{
                background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
                color: textColor,
                border: `1px solid ${borderColor}`,
                borderRadius: radiusPill,
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="oldest" style={{ background: baseBg }}>📜 Oldest First (Chronological)</option>
              <option value="newest" style={{ background: baseBg }}>⚡ Newest First (Modern)</option>
              <option value="pre-1950" style={{ background: baseBg }}>🏛️ Pre-1950 Era</option>
              <option value="1950-2000" style={{ background: baseBg }}>🕰️ 1950 - 2000 Era</option>
              <option value="post-2000" style={{ background: baseBg }}>🚀 Post-2000 Modern</option>
            </select>
          </div>
        </div>

        {/* Right Actions & Progress Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* 5s Autoplay Toggle Button */}
          <button
            onClick={() => {
              setAutoPlay(prev => !prev);
              setProgress(0);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: autoPlay ? 'var(--accent-color)' : (isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)'),
              border: autoPlay ? '1px solid var(--accent-color)' : `1px solid ${borderColor}`,
              color: autoPlay ? '#ffffff' : textColor,
              borderRadius: radiusPill,
              padding: '6px 14px',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: autoPlay ? '0 2px 10px rgba(0,0,0,0.2)' : 'none'
            }}
          >
            {autoPlay ? <FiPlay size={12} /> : <FiPause size={12} />}
            <span>{autoPlay ? '⚡ Auto-Reveal (5s)' : '⏸️ Manual Scroll'}</span>
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            style={{
              background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
              border: `1px solid ${borderColor}`,
              color: textColor,
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Share historical story"
          >
            <FiShare2 size={15} />
          </button>

          {/* Close Button */}
          <button
            onClick={() => navigate('/know-your-past')}
            style={{
              background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
              border: `1px solid ${borderColor}`,
              color: textColor,
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Exit Explore History"
          >
            <FiX size={17} />
          </button>
        </div>
      </header>

      {/* ── Top 5s Progression Ribbon ── */}
      {autoPlay && (
        <div style={{ width: '100%', height: '3px', background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', position: 'relative' }}>
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'var(--accent-color)',
              transition: 'width 0.05s linear',
              boxShadow: '0 0 8px var(--accent-color)'
            }}
          />
        </div>
      )}

      {/* ── Main Immersion Content ── */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '16px' : '24px 48px',
        overflowY: 'auto',
        position: 'relative'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🏛️</div>
            <p style={{ fontWeight: 800, color: textSecondary }}>Retrieving Historical Archives...</p>
          </div>
        ) : !currentEvent ? (
          <div style={{ textAlign: 'center', maxWidth: '420px' }}>
            <h3 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '12px' }}>No Historical Records Found</h3>
            <button
              onClick={() => setSortOption('oldest')}
              style={{
                background: 'var(--accent-color)',
                color: '#fff',
                padding: '10px 20px',
                borderRadius: radiusMd,
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none'
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : isMobile ? (
          /* ── Mobile Layout ── */
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              transform: isTransitioning 
                ? (transitionDirection === 'next' ? 'translateY(24px) scale(0.96)' : 'translateY(-24px) scale(0.96)') 
                : 'translateY(0) scale(1)',
              opacity: isTransitioning ? 0.3 : 1,
              transition: 'transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.35s ease'
            }}
          >
            {/* Small Image Row: [ Image | Small description & Year ] */}
            <div style={{
              display: 'flex',
              gap: '14px',
              background: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: radiusLg,
              padding: '14px',
              boxShadow: isLight ? '0 6px 20px rgba(0,0,0,0.06)' : '0 12px 30px rgba(0,0,0,0.4)',
              alignItems: 'center'
            }}>
              <Link
                to={`/article/${currentEvent.slug}`}
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: radiusMd,
                  overflow: 'hidden',
                  flexShrink: 0,
                  position: 'relative',
                  display: 'block'
                }}
              >
                {currentEvent.coverImage ? (
                  <img
                    src={getImageUrl(currentEvent.coverImage)}
                    alt={currentEvent.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, var(--accent-color) 0%, #1e1b4b 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px'
                  }}>
                    🏛️
                  </div>
                )}
              </Link>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{
                  background: 'var(--accent-color)',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 900,
                  padding: '2px 8px',
                  borderRadius: radiusPill,
                  width: 'fit-content',
                  textTransform: 'uppercase'
                }}>
                  {currentEvent.historicalYear || 'Historical Era'}
                </span>
                <h3 style={{
                  fontFamily: 'var(--font-display, "Playfair Display", serif)',
                  fontSize: '15px',
                  fontWeight: 800,
                  margin: 0,
                  lineHeight: 1.25,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {currentEvent.title}
                </h3>
                <span style={{ fontSize: '11.5px', color: textSecondary }}>
                  {currentEvent.subCategory || 'Timeline Event'} • {currentIndex + 1} of {sortedEvents.length}
                </span>
              </div>
            </div>

            {/* Rest of Detail of History */}
            <div style={{
              background: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: radiusLg,
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: isLight ? '0 6px 20px rgba(0,0,0,0.06)' : '0 12px 30px rgba(0,0,0,0.4)'
            }}>
              <p style={{
                fontSize: '14px',
                lineHeight: 1.7,
                color: isLight ? '#334155' : '#cbd5e1',
                margin: 0
              }}>
                {currentEvent.lead || currentEvent.title}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: '6px' }}>
                <Link
                  to={`/article/${currentEvent.slug}`}
                  style={{
                    flex: 1,
                    background: 'var(--accent-color)',
                    color: '#ffffff',
                    padding: '12px 18px',
                    borderRadius: radiusMd,
                    fontWeight: 800,
                    fontSize: '13.5px',
                    textDecoration: 'none',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
                  }}
                >
                  Read Full Article <FiArrowRight size={15} />
                </Link>
              </div>
            </div>

            {/* Mobile Navigation Controls & Hint */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
              <button
                onClick={goToPrev}
                style={{
                  background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
                  border: `1px solid ${borderColor}`,
                  color: textColor,
                  borderRadius: radiusPill,
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <FiChevronLeft size={16} /> Prev
              </button>

              <span style={{ fontSize: '11px', color: textSecondary, fontWeight: 700 }}>
                Swipe ↔ for History
              </span>

              <button
                onClick={goToNext}
                style={{
                  background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
                  border: `1px solid ${borderColor}`,
                  color: textColor,
                  borderRadius: radiusPill,
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                Next <FiChevronRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          /* ── Desktop / Laptop Layout (Image 1 & Image 2) ── */
          <div style={{
            width: '100%',
            maxWidth: '1160px',
            display: 'grid',
            gridTemplateColumns: 'minmax(320px, 420px) 1fr',
            gap: '64px',
            alignItems: 'center',
            transform: isTransitioning
              ? (transitionDirection === 'next' ? 'translateY(30px) scale(0.97)' : 'translateY(-30px) scale(0.97)')
              : 'translateY(0) scale(1)',
            opacity: isTransitioning ? 0.3 : 1,
            transition: 'transform 0.42s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.42s ease'
          }}>
            {/* ── Left Column: 3D Floating Card with Fog Shade Effect & Glowing Base Ring ── */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              
              {/* Floating 3D Card */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '0.78',
                  maxHeight: '520px',
                  background: cardBg,
                  borderRadius: radiusLg,
                  overflow: 'hidden',
                  border: `1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)'}`,
                  boxShadow: isLight
                    ? '0 25px 50px -12px rgba(0,0,0,0.18)'
                    : '0 30px 60px -12px rgba(0,0,0,0.7), 0 0 35px color-mix(in srgb, var(--accent-color) 25%, transparent)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  transition: 'transform 0.3s ease',
                  cursor: 'pointer'
                }}
              >
                {/* Event Image (Click opens article) */}
                <Link
                  to={`/article/${currentEvent.slug}`}
                  style={{ position: 'absolute', inset: 0, zIndex: 1, textDecoration: 'none' }}
                  title="Click to read full story"
                >
                  {currentEvent.coverImage ? (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url("${getImageUrl(currentEvent.coverImage)}")`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: isLight ? 'brightness(0.92)' : 'brightness(0.8)'
                      }}
                    />
                  ) : (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent-color) 40%, #0f172a) 0%, #1e1b4b 50%, #090d16 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '64px'
                    }}>
                      🏛️
                    </div>
                  )}
                </Link>

                {/* Top Floating Badge */}
                <div style={{
                  position: 'absolute',
                  top: '18px',
                  left: '18px',
                  zIndex: 10,
                  display: 'flex',
                  gap: '8px'
                }}>
                  <span style={{
                    background: 'var(--accent-color)',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 900,
                    padding: '4px 10px',
                    borderRadius: radiusPill,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    letterSpacing: '0.5px'
                  }}>
                    {currentEvent.historicalYear || 'Year'}
                  </span>
                  <span style={{
                    background: 'rgba(0,0,0,0.65)',
                    backdropFilter: 'blur(8px)',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: radiusPill,
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}>
                    {currentEvent.subCategory || 'Archive'}
                  </span>
                </div>

                {/* Bottom Fog Shade Effect Overlay with Small Description */}
                <div style={{
                  position: 'relative',
                  zIndex: 10,
                  padding: '24px 20px',
                  background: isLight 
                    ? 'linear-gradient(to top, rgba(255,255,255,0.98) 0%, rgba(251,249,245,0.9) 60%, rgba(251,249,245,0.4) 85%, transparent 100%)'
                    : 'linear-gradient(to top, rgba(10, 12, 18, 0.98) 0%, rgba(14, 16, 24, 0.88) 60%, rgba(14, 16, 24, 0.4) 85%, transparent 100%)',
                  borderTop: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  pointerEvents: 'none'
                }}>
                  <h4 style={{
                    fontFamily: 'var(--font-display, "Playfair Display", serif)',
                    fontSize: '17px',
                    fontWeight: 800,
                    margin: 0,
                    color: textColor,
                    lineHeight: 1.3
                  }}>
                    {currentEvent.title}
                  </h4>
                  <p style={{
                    fontSize: '12px',
                    lineHeight: 1.5,
                    color: textSecondary,
                    margin: 0,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {currentEvent.lead}
                  </p>
                </div>
              </div>

              {/* Glowing Ambient Base Ring (Inspired by Image 1) */}
              <div
                style={{
                  width: '85%',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'radial-gradient(ellipse at center, var(--accent-color) 0%, color-mix(in srgb, var(--accent-color) 45%, transparent) 50%, transparent 80%)',
                  filter: 'blur(8px)',
                  marginTop: '-10px',
                  opacity: isLight ? 0.45 : 0.8,
                  zIndex: 0
                }}
              />
            </div>

            {/* ── Right Column: Grand Title, Detailed Historical Description & Full Read Button ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              
              {/* Timeline Sequence & Era Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 900,
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  color: 'var(--accent-color)'
                }}>
                  ARCHIVE ENTRY {currentIndex + 1} OF {sortedEvents.length}
                </span>
                <div style={{ width: '40px', height: '2px', background: 'var(--accent-color)' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: textSecondary }}>
                  {currentEvent.historicalYear ? `Year ${currentEvent.historicalYear}` : 'Milestone'}
                </span>
              </div>

              {/* Grand Main Title */}
              <h1 style={{
                fontFamily: 'var(--font-display, "Playfair Display", serif)',
                fontSize: 'calc(2.2rem + 0.6vw)',
                fontWeight: 900,
                lineHeight: 1.18,
                letterSpacing: '-0.5px',
                color: textColor,
                margin: 0
              }}>
                {currentEvent.title}
              </h1>

              {/* Detailed Narrative Paragraph */}
              <div style={{
                fontSize: '16px',
                lineHeight: 1.8,
                color: isLight ? '#334155' : '#cbd5e1',
                maxHeight: '260px',
                overflowY: 'auto',
                paddingRight: '12px'
              }}>
                <p style={{ margin: '0 0 14px 0', fontSize: '17px', fontWeight: 500 }}>
                  {currentEvent.lead}
                </p>
                {currentEvent.content && (
                  <div
                    style={{ fontSize: '15px', lineHeight: 1.75, opacity: 0.9 }}
                    dangerouslySetInnerHTML={{
                      __html: currentEvent.content.length > 350
                        ? currentEvent.content.slice(0, 350) + '...'
                        : currentEvent.content
                    }}
                  />
                )}
              </div>

              {/* Action Buttons & Upcoming Queue */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap', marginTop: '10px' }}>
                {/* Full Read Article Button */}
                <Link
                  to={`/article/${currentEvent.slug}`}
                  style={{
                    background: 'var(--accent-color)',
                    color: '#ffffff',
                    padding: '14px 32px',
                    borderRadius: radiusMd,
                    fontWeight: 800,
                    fontSize: '14.5px',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 8px 24px color-mix(in srgb, var(--accent-color) 35%, transparent)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                >
                  Read Full Story <FiArrowRight size={17} />
                </Link>

                {/* Next Milestone Queue Preview */}
                {nextEvent && (
                  <div
                    onClick={goToNext}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${borderColor}`,
                      padding: '8px 16px',
                      borderRadius: radiusMd,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    title="Click to jump to next milestone"
                  >
                    <span style={{ fontSize: '11px', color: textSecondary, fontWeight: 700 }}>Next:</span>
                    <span style={{
                      fontSize: '12.5px',
                      fontWeight: 800,
                      color: textColor,
                      maxWidth: '180px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {nextEvent.title}
                    </span>
                    <FiArrowRight size={13} color="var(--accent-color)" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Bottom Laptop Scroll / Navigation Footer ── */}
      <footer style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 28px',
        fontSize: '12px',
        color: textSecondary,
        background: isLight ? 'rgba(251, 249, 245, 0.95)' : 'rgba(14, 16, 21, 0.95)',
        borderTop: `1px solid ${borderColor}`,
        zIndex: 40,
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🖱️ <strong>Laptop Trackpad / Mouse Scroll:</strong> Step-by-Step Reveal</span>
          <span>•</span>
          <span>⌨️ <strong>Arrow Keys [←] [→]:</strong> Navigate</span>
        </div>

        {/* Manual Arrow Nav Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => {
              registerUserInteraction();
              goToPrev();
            }}
            style={{
              background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
              border: `1px solid ${borderColor}`,
              color: textColor,
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Previous Story"
          >
            <FiChevronLeft size={16} />
          </button>

          <span style={{ fontWeight: 800, color: textColor }}>
            {currentIndex + 1} / {sortedEvents.length}
          </span>

          <button
            onClick={() => {
              registerUserInteraction();
              goToNext();
            }}
            style={{
              background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
              border: `1px solid ${borderColor}`,
              color: textColor,
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Next Story"
          >
            <FiChevronRight size={16} />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default ExploreHistoryPage;
