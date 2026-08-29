import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { articleAPI, filterAPI, commentAPI } from '../services/api';
import { getImageUrl } from '../components/ArticleComponents';
import { format } from 'date-fns';
import {
  FiVolume2, FiVolumeX, FiHome, FiRadio, FiPlay, FiPause,
  FiChevronLeft, FiChevronRight, FiHeart, FiMessageSquare, FiShare2,
  FiSearch, FiX, FiClock, FiTrendingUp, FiImage, FiEye, FiPlus,
  FiUpload, FiTrash2, FiAlertCircle, FiCheckCircle,
  FiGrid, FiList, FiMonitor
} from 'react-icons/fi';
import BottomNavPill from '../components/BottomNavPill';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import './PicturesSpeakPage.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getSlides = (article) => {
  if (!article) return [];
  if (article.images && article.images.length > 0) return article.images;
  return [{ url: article.coverImage, caption: article.lead || '' }];
};

// ─── Inline Comments Sub-component ───────────────────────────────────────────
const InlineComments = ({ article }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!article) return;
    const fetchComments = async () => {
      setLoading(true);
      try {
        const res = await commentAPI.getForArticle(article._id);
        setComments(res.data?.data || []);
      } catch (err) {
        console.error('Failed to load comments:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchComments();
  }, [article?._id]);

  useEffect(() => {
    if (!article?._id) return;
    const SOCKET_URL = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace('/api', '') 
      : 'http://localhost:5000';
    const socket = io(SOCKET_URL, { 
      withCredentials: true,
      forceNew: true,
      multiplex: false 
    });

    socket.on('connect', () => {
      socket.emit('article:joinRoom', { articleId: article._id });
    });

    socket.on('comment:new', (newComment) => {
      setComments((prev) => {
        if (prev.some((c) => c._id === newComment._id)) return prev;
        return [newComment, ...prev];
      });
    });

    return () => {
      socket.emit('article:leaveRoom', { articleId: article._id });
      socket.disconnect();
    };
  }, [article?._id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const res = await commentAPI.add(article._id, { text: commentText });
      if (res.data?.success) {
        const postedComment = res.data.data;
        setComments(prev => {
          if (prev.some((c) => c._id === postedComment._id)) return prev;
          return [postedComment, ...prev];
        });
        setCommentText('');
        toast.success('Comment posted!');
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
      toast.error('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ps-inline-comments">
      <h3 className="ps-comments-heading">Discussion ({comments.length})</h3>
      {user ? (
        <form onSubmit={handleSubmit} className="ps-comments-form">
          <textarea
            placeholder="Share your thoughts on this story..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            maxLength={1000}
            required
            className="ps-comments-textarea"
            rows={2}
          />
          <button type="submit" disabled={submitting || !commentText.trim()} className="ps-comments-submit-btn">
            {submitting ? 'Posting...' : 'Post Comment'}
          </button>
        </form>
      ) : (
        <p className="ps-comments-login-prompt">
          Please login to join the discussion.
        </p>
      )}

      <div className="ps-comments-list">
        {loading ? (
          <div className="ps-comments-loading"><div className="picspeak-spinner" /></div>
        ) : comments.length === 0 ? (
          <p className="ps-comments-empty">No comments yet. Share your thoughts!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment._id} className="ps-comment-item">
              <img
                src={comment.author?.avatar || '/default-avatar.png'}
                alt={comment.author?.name}
                className="ps-comment-avatar"
              />
              <div className="ps-comment-content">
                <div className="ps-comment-meta">
                  <span className="ps-comment-author">{comment.author?.name}</span>
                  <span className="ps-comment-date">
                    {format(new Date(comment.createdAt), 'MMM dd, h:mm a')}
                  </span>
                </div>
                <p className="ps-comment-text">{comment.text}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ─── Full-screen 3D Story Viewer ───────────────────────────────────────────────
const StoryViewer = ({ article, articlesList = [], onClose, onSelectArticle }) => {
  const { user } = useAuth();
  const [activeSlide, setActiveSlide] = useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const [isPlayingSpeech, setIsPlayingSpeech] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [likes, setLikes] = useState(article?.likes || []);
  const [shares, setShares] = useState(article?.shares || 0);
  const [recommendedStories, setRecommendedStories] = useState([]);
  const [recLoading, setRecLoading] = useState(false);

  // 3D Gesture & Swipe state
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState(null); // 'next' | 'prev' | 'up' | 'down' | null

  const slideshowTimerRef = useRef(null);
  const isMountedRef = useRef(true);
  const cardRef = useRef(null);

  const slides = getSlides(article);

  // Find previous and next articles in the list
  const currentIndex = articlesList.findIndex(a => a._id === article._id);
  const prevArticle = currentIndex > 0
    ? articlesList[currentIndex - 1]
    : (articlesList.length > 1 ? articlesList[articlesList.length - 1] : null);

  const nextArticle = currentIndex >= 0 && currentIndex < articlesList.length - 1
    ? articlesList[currentIndex + 1]
    : (articlesList.length > 1 ? articlesList[0] : null);

  // Reset on article change
  useEffect(() => {
    setActiveSlide(0);
    setLikes(article?.likes || []);
    setShares(article?.shares || 0);
    setDragOffset({ x: 0, y: 0 });
    setIsTransitioning(false);
    setTransitionDirection(null);
  }, [article?._id]);

  useEffect(() => {
    if (!article) return;
    const fetchRecs = async () => {
      setRecLoading(true);
      try {
        const res = await articleAPI.getRecommendations();
        const recList = res.data?.data || [];
        let pics = recList.filter(a => a.category === 'pictures-speak' && a._id !== article._id);
        
        if (pics.length < 6) {
          const currentTags = article.tags || [];
          const existingIds = new Set(pics.map(a => a._id));
          const candidates = articlesList.filter(a => a._id !== article._id && !existingIds.has(a._id));
          
          candidates.sort((a, b) => {
            const matchesA = (a.tags || []).filter(t => currentTags.includes(t)).length;
            const matchesB = (b.tags || []).filter(t => currentTags.includes(t)).length;
            if (matchesA !== matchesB) return matchesB - matchesA;
            return new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt);
          });
          
          pics = [...pics, ...candidates];
        }
        
        setRecommendedStories(pics.slice(0, 8));
      } catch (err) {
        console.error('Failed to load recommended stories:', err);
        const candidates = articlesList.filter(a => a._id !== article._id);
        setRecommendedStories(candidates.slice(0, 8));
      } finally {
        setRecLoading(false);
      }
    };
    fetchRecs();
  }, [article?._id, articlesList]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopSpeech();
      if (slideshowTimerRef.current) clearInterval(slideshowTimerRef.current);
    };
  }, []);

  // TTS
  const speakText = useCallback((text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (!isPlayingSpeech || !text) return;
    const clean = text.replace(/<[^>]*>/g, '');
    const utt = new SpeechSynthesisUtterance(clean);
    utt.rate = speechRate;
    utt.onstart = () => isMountedRef.current && setIsSpeaking(true);
    utt.onend = () => isMountedRef.current && setIsSpeaking(false);
    utt.onerror = () => isMountedRef.current && setIsSpeaking(false);
    const voices = window.speechSynthesis.getVoices();
    utt.voice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural')))
      || voices.find(v => v.lang.startsWith('en')) || null;
    window.speechSynthesis.speak(utt);
  }, [isPlayingSpeech, speechRate]);

  const stopSpeech = () => {
    if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); setIsSpeaking(false); }
  };

  // Speak on slide/toggle change
  useEffect(() => {
    if (!article || slides.length === 0) return;
    const text = activeSlide === 0
      ? `${article.title}. ${article.lead}. ${slides[0]?.caption || ''}`
      : (slides[activeSlide]?.caption || '');
    const t = setTimeout(() => speakText(text), 400);
    return () => clearTimeout(t);
  }, [activeSlide, article, isPlayingSpeech, speechRate, speakText]);

  // Auto-slide
  useEffect(() => {
    if (slideshowTimerRef.current) clearInterval(slideshowTimerRef.current);
    if (isAutoScrolling && slides.length > 1 && !isDragging) {
      slideshowTimerRef.current = setInterval(() => {
        handleNext();
      }, 9000);
    }
    return () => { if (slideshowTimerRef.current) clearInterval(slideshowTimerRef.current); };
  }, [isAutoScrolling, slides.length, article?._id, isDragging]);

  const handlePrev = () => {
    if (slides.length <= 1) return;
    setIsTransitioning(true);
    setTransitionDirection('prev');
    setTimeout(() => {
      setActiveSlide(p => (p - 1 + slides.length) % slides.length);
      setDragOffset({ x: 0, y: 0 });
      setTimeout(() => {
        setIsTransitioning(false);
        setTransitionDirection(null);
      }, 250);
    }, 180);
  };

  const handleNext = () => {
    if (slides.length <= 1) return;
    setIsTransitioning(true);
    setTransitionDirection('next');
    setTimeout(() => {
      setActiveSlide(p => (p + 1) % slides.length);
      setDragOffset({ x: 0, y: 0 });
      setTimeout(() => {
        setIsTransitioning(false);
        setTransitionDirection(null);
      }, 250);
    }, 180);
  };

  // Bottom to Up -> Navigate to Previous Story
  const handleSwipeUpPrevStory = () => {
    if (!prevArticle) return;
    setIsTransitioning(true);
    setTransitionDirection('up');
    setTimeout(() => {
      onSelectArticle?.(prevArticle);
      setIsTransitioning(false);
      setTransitionDirection(null);
    }, 280);
  };

  // Top to Down -> Navigate to Next Story
  const handleSwipeDownNextStory = () => {
    if (!nextArticle) return;
    setIsTransitioning(true);
    setTransitionDirection('down');
    setTimeout(() => {
      onSelectArticle?.(nextArticle);
      setIsTransitioning(false);
      setTransitionDirection(null);
    }, 280);
  };

  // Touch & Mouse 3D Swipe Handlers
  const dragStartRef = useRef({ x: 0, y: 0, time: 0 });

  const onTouchStart = (e) => {
    const t = e.targetTouches[0];
    dragStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
    setIsDragging(true);
  };

  const onTouchMove = (e) => {
    if (!isDragging) return;
    const t = e.targetTouches[0];
    const dx = t.clientX - dragStartRef.current.x;
    const dy = t.clientY - dragStartRef.current.y;
    setDragOffset({ x: dx, y: dy });
  };

  const onTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const { x, y } = dragOffset;
    const absX = Math.abs(x);
    const absY = Math.abs(y);

    if (absX > 45 && absX > absY) {
      if (x < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    } else if (y < -50 && absY > absX) {
      // Bottom to Up Swipe -> Previous Story
      handleSwipeUpPrevStory();
    } else if (y > 50 && absY > absX) {
      // Top to Down Swipe -> Next Story
      handleSwipeDownNextStory();
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
  };

  const onMouseDown = (e) => {
    dragStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    setIsDragging(true);
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setDragOffset({ x: dx, y: dy });
  };

  const onMouseUp = () => {
    onTouchEnd();
  };

  const handleHype = async () => {
    if (!user) return toast.error('Please login to hype stories');
    try {
      const res = await articleAPI.like(article._id);
      if (res.data?.success) {
        setLikes(res.data.likes);
        toast.success(res.data.likes.includes(user._id) ? 'Hyped! ❤️' : 'Hype removed');
      }
    } catch { toast.error('Failed to hype'); }
  };

  const handleShare = async () => {
    try {
      await articleAPI.share(article._id);
      setShares(s => s + 1);
      await navigator.clipboard.writeText(`${window.location.origin}/article/${article.slug}`);
      toast.success('Link copied! 🔗');
    } catch { toast.error('Failed to share'); }
  };

  // Dynamic 3D transform computation during drag / transitions
  const get3DTransformStyle = () => {
    if (isDragging) {
      const rotY = Math.max(-25, Math.min(25, dragOffset.x * 0.1));
      const rotX = Math.max(-20, Math.min(20, -dragOffset.y * 0.08));
      const scale = Math.max(0.92, 1 - (Math.abs(dragOffset.x) + Math.abs(dragOffset.y)) * 0.0004);
      return {
        transform: `perspective(1200px) translate3d(${dragOffset.x * 0.75}px, ${dragOffset.y * 0.7}px, 0) rotateY(${rotY}deg) rotateX(${rotX}deg) scale(${scale})`,
        transition: 'none',
        cursor: 'grabbing'
      };
    }
    if (isTransitioning) {
      if (transitionDirection === 'next') {
        return {
          transform: 'perspective(1200px) translate3d(-60px, 0, -80px) rotateY(-22deg) scale(0.94)',
          opacity: 0.75,
          transition: 'all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)'
        };
      }
      if (transitionDirection === 'prev') {
        return {
          transform: 'perspective(1200px) translate3d(60px, 0, -80px) rotateY(22deg) scale(0.94)',
          opacity: 0.75,
          transition: 'all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)'
        };
      }
      if (transitionDirection === 'up') {
        return {
          transform: 'perspective(1200px) translate3d(0, -100px, -120px) rotateX(28deg) scale(0.88)',
          opacity: 0.4,
          transition: 'all 0.28s cubic-bezier(0.16, 1, 0.3, 1)'
        };
      }
      if (transitionDirection === 'down') {
        return {
          transform: 'perspective(1200px) translate3d(0, 100px, -120px) rotateX(-28deg) scale(0.88)',
          opacity: 0.4,
          transition: 'all 0.28s cubic-bezier(0.16, 1, 0.3, 1)'
        };
      }
    }
    return {
      transform: 'perspective(1200px) translate3d(0, 0, 0) rotateY(0deg) rotateX(0deg) scale(1)',
      transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      cursor: 'grab'
    };
  };

  return (
    <div className="ps-viewer-overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className="ps-viewer-root-split">

        {/* ── TOP BAR: Navigation & Close ── */}
        <header className="ps-viewer-top-bar">
          {/* Bottom-to-Up Previous Navigation button */}
          <div className="ps-top-nav-controls">
            {prevArticle && (
              <button 
                type="button" 
                className="ps-top-nav-btn prev"
                onClick={handleSwipeUpPrevStory}
                title="Previous Story (Swipe bottom-to-up)"
              >
                <span className="ps-nav-arrow-icon">↑</span>
                <span className="ps-nav-text">Previous: {prevArticle.title}</span>
              </button>
            )}
            {nextArticle && (
              <button 
                type="button" 
                className="ps-top-nav-btn next"
                onClick={handleSwipeDownNextStory}
                title="Next Story (Swipe top-to-down)"
              >
                <span className="ps-nav-text">Next: {nextArticle.title}</span>
                <span className="ps-nav-arrow-icon">↓</span>
              </button>
            )}
          </div>

          {/* Close button */}
          <button type="button" className="ps-viewer-close-btn" onClick={onClose} title="Close">
            <FiX size={20} />
          </button>
        </header>

        {/* ── TWO-COLUMN VIEW MODE LAYOUT ── */}
        <div className="ps-viewer-split-body">

          {/* ════════════════════════════════════════════════════════════
             LEFT SIDE: { photos } | { actions } | { & discus }
          ════════════════════════════════════════════════════════════ */}
          <div className="ps-view-left-column">
            
            {/* 1. { photos } — Hero 3D Stage with Stacked Photos Shade Reveal */}
            <div className="ps-3d-stage-wrapper">
              <div className="ps-hero-stack-container">
                
                {/* Stack Under-layer 2 (Deepest shade) */}
                {slides.length > 2 && (
                  <div className="ps-hero-stack-layer ps-stack-depth-2">
                    <img
                      src={getImageUrl(slides[(activeSlide + 2) % slides.length]?.url)}
                      alt="Stacked background photo"
                      className="ps-hero-stack-img"
                    />
                    <div className="ps-hero-stack-shade ps-shade-2" />
                  </div>
                )}

                {/* Stack Under-layer 1 (Middle shade layer) */}
                {slides.length > 1 && (
                  <div className="ps-hero-stack-layer ps-stack-depth-1">
                    <img
                      src={getImageUrl(slides[(activeSlide + 1) % slides.length]?.url)}
                      alt="Stacked next photo"
                      className="ps-hero-stack-img"
                    />
                    <div className="ps-hero-stack-shade ps-shade-1" />
                  </div>
                )}

                {/* Active Hero Card with 3D Gesture Drag & Smooth Lift */}
                <div 
                  ref={cardRef}
                  className="ps-3d-story-card ps-hero-active-card"
                  style={get3DTransformStyle()}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                >
                  {slides.length > 0 && (
                    <img
                      key={`${article._id}-${activeSlide}`}
                      src={getImageUrl(slides[activeSlide]?.url)}
                      alt={slides[activeSlide]?.caption || article.title}
                      className="ps-viewer-img"
                      draggable={false}
                    />
                  )}

                  {/* Gradient Overlay */}
                  <div className="ps-viewer-img-gradient" />

                  {/* 3D Swipe Cue Indicator */}
                  <div className="ps-3d-swipe-cue">
                    <span>← Swipe photos • ↑ Prev story • ↓ Next story</span>
                  </div>

                  {/* Nav Arrows */}
                  {slides.length > 1 && (
                    <>
                      <button 
                        type="button" 
                        className="ps-nav-arrow left" 
                        onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                        aria-label="Previous Photo"
                      >
                        <FiChevronLeft size={24} />
                      </button>
                      <button 
                        type="button" 
                        className="ps-nav-arrow right" 
                        onClick={(e) => { e.stopPropagation(); handleNext(); }}
                        aria-label="Next Photo"
                      >
                        <FiChevronRight size={24} />
                      </button>
                    </>
                  )}

                  {/* Slide Dots */}
                  <div className="ps-slides-dots">
                    {slides.map((_, i) => (
                      <span
                        key={i}
                        className={`ps-slide-dot ${i === activeSlide ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setActiveSlide(i); }}
                      />
                    ))}
                  </div>

                  {/* Audio Waveform */}
                  {isSpeaking && (
                    <div className="ps-audio-wave-wrap">
                      <span className="ps-wave-bar b1" /><span className="ps-wave-bar b2" />
                      <span className="ps-wave-bar b3" /><span className="ps-wave-bar b4" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. { actions } — Actions Bar & Voice Narration */}
            <div className="ps-left-actions-panel">
              {/* Interaction buttons */}
              <div className="ps-actions-bar">
                <button className={`ps-action-btn heart ${user && likes.includes(user._id) ? 'active' : ''}`} onClick={handleHype}>
                  <FiHeart size={18} /> <span>Hype ({likes.length})</span>
                </button>
                <button className="ps-action-btn share" onClick={handleShare}>
                  <FiShare2 size={18} /> <span>Share ({shares})</span>
                </button>
              </div>

              {/* TTS & Auto Console */}
              <div className="ps-tts-console">
                <div className="ps-console-left">
                  <button
                    className={`ps-console-btn ${isAutoScrolling ? 'active' : ''}`}
                    onClick={() => setIsAutoScrolling(a => !a)}
                    title={isAutoScrolling ? 'Pause Auto-Slide' : 'Play Auto-Slide'}
                  >
                    {isAutoScrolling ? <FiPause size={14} /> : <FiPlay size={14} />}
                    <span>Auto-Slide</span>
                  </button>
                  <button
                    className={`ps-console-btn ${isPlayingSpeech ? 'active' : ''}`}
                    onClick={() => { if (isPlayingSpeech) { stopSpeech(); setIsPlayingSpeech(false); } else setIsPlayingSpeech(true); }}
                    title="Voice Narrator"
                  >
                    {isPlayingSpeech ? <FiVolume2 size={14} /> : <FiVolumeX size={14} />}
                    <span>Voice Narrator</span>
                  </button>
                </div>
                <div className="ps-console-right">
                  <label>Speed</label>
                  <input
                    type="range" min="0.75" max="1.5" step="0.1" value={speechRate}
                    onChange={e => setSpeechRate(parseFloat(e.target.value))}
                    className="ps-rate-slider"
                  />
                  <span className="ps-rate-val">{speechRate.toFixed(1)}x</span>
                </div>
              </div>
            </div>

            {/* 3. { & discus } — Discussion & Comments Thread */}
            <div className="ps-left-discussion-panel">
              <InlineComments article={article} />
            </div>

          </div>

          {/* ════════════════════════════════════════════════════════════
             RIGHT SIDE: { slide content } | { continue of slide content }
          ════════════════════════════════════════════════════════════ */}
          <div className="ps-view-right-column">
            
            {/* Header & Story Info */}
            <div className="ps-story-meta-header">
              <div className="ps-story-meta-badge-row">
                <span className="ps-cat-badge">📷 CAMERA SPEAKS</span>
                <span className="ps-slide-counter-badge">
                  Photo {activeSlide + 1} / {slides.length}
                </span>
              </div>

              <h1 className="ps-story-view-title">{article.title}</h1>
              
              <div className="ps-story-view-author-row">
                <img
                  src={article.author?.avatar || '/default-avatar.png'}
                  alt={article.author?.name}
                  className="ps-story-view-avatar"
                />
                <div>
                  <span className="ps-story-view-author-name">{article.author?.name || 'Student Journalist'}</span>
                  <span className="ps-story-view-date">
                    {article.publishedAt ? format(new Date(article.publishedAt), 'MMMM dd, yyyy') : 'Recent'}
                  </span>
                </div>
              </div>
            </div>

            {/* { slide content } — Active Slide Caption */}
            <div className="ps-active-slide-content-box">
              <span className="ps-slide-caption-label">Photo Narration</span>
              <p className="ps-slide-caption-text">
                {slides[activeSlide]?.caption || article.lead || 'Visual narrative recorded for this slide.'}
              </p>
            </div>

            {/* { continue of slide content } — Full Narrative Body */}
            <div className="ps-continue-slide-content">
              <h3 className="ps-continue-narrative-title">Story Narrative</h3>
              {article.body ? (
                <div 
                  className="ps-article-full-reading-body" 
                  dangerouslySetInnerHTML={{ __html: article.body }} 
                />
              ) : (
                <p className="ps-article-lead-reading">{article.lead}</p>
              )}

              {/* Story tags */}
              {article.tags && article.tags.length > 0 && (
                <div className="ps-story-tags-row">
                  {article.tags.map(t => (
                    <span key={t} className="ps-story-tag-pill">#{t}</span>
                  ))}
                </div>
              )}

              {/* More Stories Recommendation Cards */}
              {recommendedStories.length > 0 && (
                <div className="ps-right-more-stories-section">
                  <h4 className="ps-right-more-title">More Stories to Explore</h4>
                  <div className="ps-right-more-grid">
                    {recommendedStories.map(rec => (
                      <div 
                        key={rec._id} 
                        className="ps-right-more-card"
                        onClick={() => onSelectArticle?.(rec)}
                      >
                        <img src={getImageUrl(rec.coverImage)} alt={rec.title} />
                        <div className="ps-right-more-card-info">
                          <h5>{rec.title}</h5>
                          <span>by {rec.author?.name || 'Student'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

// ─── Sub-components for Verification Queue ─────────────────────────────────────
const AdminPendingCard = ({ article, onApprove, onReject }) => {
  const [activePreviewSlide, setActivePreviewSlide] = useState(0);
  const slides = getSlides(article);

  return (
    <div className="ps-admin-pending-card">
      <div className="ps-pending-card-header">
        <div className="ps-pending-card-author-info">
          <img
            src={article.author?.avatar || '/default-avatar.png'}
            alt={article.author?.name}
            className="ps-pending-card-avatar"
          />
          <div>
            <h4 className="ps-pending-card-author-name">{article.author?.name || 'Student'}</h4>
            <span className="ps-pending-card-author-role">
              {article.author?.role || 'student'} • {article.author?.email}
            </span>
          </div>
        </div>
        <span className="ps-pending-card-date">
          Submitted {article.createdAt ? format(new Date(article.createdAt), 'MMM dd, yyyy') : 'Recent'}
        </span>
      </div>

      <div className="ps-pending-card-body">
        <h3 className="ps-pending-card-title">{article.title}</h3>
        <p className="ps-pending-card-lead">{article.lead}</p>
        
        {slides.length > 0 && (
          <div className="ps-pending-card-preview-area">
            <div className="ps-pending-card-preview-img-wrap">
              <img
                src={getImageUrl(slides[activePreviewSlide]?.url)}
                alt={`Slide ${activePreviewSlide + 1}`}
                className="ps-pending-card-preview-img"
              />
              {slides.length > 1 && (
                <>
                  <button
                    type="button"
                    className="ps-pending-preview-arrow left"
                    onClick={() => setActivePreviewSlide(p => (p - 1 + slides.length) % slides.length)}
                  >
                    <FiChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    className="ps-pending-preview-arrow right"
                    onClick={() => setActivePreviewSlide(p => (p + 1) % slides.length)}
                  >
                    <FiChevronRight size={16} />
                  </button>
                </>
              )}
              <span className="ps-pending-preview-badge">
                Slide {activePreviewSlide + 1} / {slides.length}
              </span>
            </div>
            <div className="ps-pending-card-preview-caption">
              <strong>Caption:</strong> {slides[activePreviewSlide]?.caption || 'No caption for this slide.'}
            </div>
          </div>
        )}
      </div>

      <div className="ps-pending-card-footer">
        <button type="button" className="ps-pending-btn approve" onClick={() => onApprove(article._id)}>
          <FiCheckCircle size={15} /> Approve & Publish
        </button>
        <button type="button" className="ps-pending-btn reject" onClick={() => onReject(article._id)}>
          <FiX size={15} /> Reject & Delete
        </button>
      </div>
    </div>
  );
};

const StudentPendingCard = ({ article, onRetract }) => {
  const slides = getSlides(article);
  return (
    <div className="ps-student-pending-card">
      <div className="ps-pending-card-header">
        <h3 className="ps-pending-card-title">{article.title}</h3>
        <span className="ps-pending-card-date">
          Submitted {article.createdAt ? format(new Date(article.createdAt), 'MMM dd, yyyy') : 'Recent'}
        </span>
      </div>

      <div className="ps-pending-card-body">
        <p className="ps-pending-card-lead">{article.lead}</p>
        <div className="ps-pending-thumbnails-strip">
          {slides.map((s, idx) => (
            <div key={idx} className="ps-pending-thumbnail-item">
              <img src={getImageUrl(s.url)} alt={`Slide ${idx + 1}`} />
              <span className="ps-pending-thumbnail-badge">#{idx + 1}</span>
            </div>
          ))}
        </div>

        {/* Stepper Progress Stepper */}
        <div className="ps-pending-stepper">
          <div className="ps-stepper-step completed">
            <div className="ps-stepper-icon"><FiCheckCircle size={14} /></div>
            <div className="ps-stepper-label">Submitted</div>
          </div>
          <div className="ps-stepper-line completed"></div>
          <div className="ps-stepper-step completed">
            <div className="ps-stepper-icon"><FiCheckCircle size={14} /></div>
            <div className="ps-stepper-label">Safety Scan</div>
          </div>
          <div className="ps-stepper-line active"></div>
          <div className="ps-stepper-step active">
            <div className="ps-stepper-icon pulse"></div>
            <div className="ps-stepper-label">Admin Review</div>
          </div>
          <div className="ps-stepper-line"></div>
          <div className="ps-stepper-step">
            <div className="ps-stepper-icon"></div>
            <div className="ps-stepper-label">Published</div>
          </div>
        </div>
      </div>

      <div className="ps-pending-card-footer">
        <button type="button" className="ps-pending-btn retract" onClick={() => onRetract(article._id)}>
          <FiTrash2 size={14} /> Retract Submission
        </button>
      </div>
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
const PicturesSpeakPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeNavTab, setActiveNavTab] = useState('feed'); // 'feed' | 'pending'
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileLayout, setMobileLayout] = useState('grid'); // 'grid' | 'list' | 'swipe'

  // Feed tab state
  const [selectedArticle, setSelectedArticle] = useState(null);

  // Home tab state
  const [recentArticles, setRecentArticles] = useState([]);
  const [trendingArticles, setTrendingArticles] = useState([]);

  // Pending queue state
  const [pendingArticles, setPendingArticles] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  // Load published articles
  const loadPublished = async () => {
    setLoading(true);
    try {
      const [allRes, trendRes] = await Promise.all([
        articleAPI.getAll({ category: 'pictures-speak', status: 'published', limit: 50 }),
        articleAPI.getTrending({ limit: 6 }),
      ]);
      const all = allRes.data?.data || [];
      setArticles(all);

      // Recent = sorted by publishedAt descending
      const recent = [...all].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)).slice(0, 12);
      setRecentArticles(recent);

      // Trending = filter pictures-speak from trending OR sort by views
      const trendAll = trendRes.data?.data || [];
      const trendPics = trendAll.filter(a => a.category === 'pictures-speak').slice(0, 6);
      setTrendingArticles(trendPics.length > 0 ? trendPics : [...all].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 6));
    } catch (err) {
      console.error('Failed to load pictures-speak:', err);
      toast.error('Failed to load Camera Speaks stories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPublished();
  }, []);

  // Load pending articles
  const loadPending = useCallback(async () => {
    if (!user) return;
    setPendingLoading(true);
    try {
      if (user.role === 'admin' || user.role === 'moderator') {
        const res = await filterAPI.getPending();
        const allPending = res.data?.data || [];
        setPendingArticles(allPending.filter(a => a.category === 'pictures-speak'));
      } else {
        const res = await articleAPI.getAll({
          author: user._id,
          status: 'pending',
          category: 'pictures-speak',
        });
        setPendingArticles(res.data?.data || []);
      }
    } catch (err) {
      console.error('Failed to load pending:', err);
    } finally {
      setPendingLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeNavTab === 'pending') {
      loadPending();
    }
  }, [activeNavTab, loadPending]);

  const openArticle = (art) => {
    setSelectedArticle(art);
    setActiveNavTab('feed');
  };

  // Verification queue actions
  const handleApprove = async (id) => {
    try {
      const res = await filterAPI.approveArticle(id, { unblockAuthor: true });
      if (res.data?.success) {
        toast.success('Story approved and published live! 🚀');
        setPendingArticles(prev => prev.filter(a => a._id !== id));
        loadPublished();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to approve story');
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to reject and delete this submission?')) return;
    try {
      const res = await filterAPI.dismissArticle(id);
      if (res.status === 200) {
        toast.success('Submission rejected and dismissed');
        setPendingArticles(prev => prev.filter(a => a._id !== id));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to reject story');
    }
  };

  const handleRetract = async (id) => {
    if (!window.confirm('Are you sure you want to retract your submission? This will delete it.')) return;
    try {
      const res = await articleAPI.delete(id);
      if (res.data?.success) {
        toast.success('Submission retracted successfully');
        setPendingArticles(prev => prev.filter(a => a._id !== id));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to retract submission');
    }
  };

  return (
    <main className="picspeak-page">
      {/* ── FEED TAB ── */}
      {activeNavTab === 'feed' && (
        <>
          {selectedArticle ? (
            <StoryViewer
              article={selectedArticle}
              articlesList={articles}
              onClose={() => setSelectedArticle(null)}
              onSelectArticle={setSelectedArticle}
            />
          ) : (
            <div className="picspeak-feed">
              {/* Mobile layout switcher toolbar */}
              {!loading && articles.length > 0 && (
                <div className="ps-mobile-layout-bar">
                  <span className="ps-mobile-layout-label">
                    {articles.length} {articles.length === 1 ? 'Story' : 'Stories'}
                  </span>
                  <div className="ps-mobile-layout-btns">
                    <button
                      type="button"
                      className={`ps-layout-btn ${mobileLayout === 'grid' ? 'active' : ''}`}
                      onClick={() => setMobileLayout('grid')}
                      title="Grid View"
                    >
                      <FiGrid size={15} />
                    </button>
                    <button
                      type="button"
                      className={`ps-layout-btn ${mobileLayout === 'list' ? 'active' : ''}`}
                      onClick={() => setMobileLayout('list')}
                      title="List View"
                    >
                      <FiList size={15} />
                    </button>
                    <button
                      type="button"
                      className={`ps-layout-btn ${mobileLayout === 'swipe' ? 'active' : ''}`}
                      onClick={() => setMobileLayout('swipe')}
                      title="Swipe View"
                    >
                      <FiMonitor size={15} />
                    </button>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="picspeak-loading"><div className="picspeak-spinner" /><p>Loading gallery...</p></div>
              ) : articles.length === 0 ? (
                <div className="picspeak-feed-empty">
                  <FiImage size={48} />
                  <h3>No photo stories found</h3>
                  <p>Be the first to publish a Camera Speaks story!</p>
                </div>
              ) : (
                <div className={`picspeak-feed-grid ps-layout-${mobileLayout}`}>
                  {articles.map(art => {
                    const imgCount = art.images?.length || 1;
                    return (
                      <div 
                        key={art._id} 
                        className={`ps-stacked-card-wrapper ${imgCount > 1 ? 'has-stack' : ''}`}
                        onClick={() => setSelectedArticle(art)}
                      >
                        {/* Stacked Deck Under-layers: Only render if story has multiple photos */}
                        {imgCount > 2 && (
                          <div className="ps-stacked-layer ps-layer-2" />
                        )}
                        {imgCount > 1 && (
                          <div className="ps-stacked-layer ps-layer-1" />
                        )}

                        {/* Main Front Card */}
                        <div className="picspeak-feed-card">
                          <div className="picspeak-feed-card-thumb">
                            <img src={getImageUrl(art.coverImage)} alt={art.title} loading="lazy" />
                            {/* Photo Count Badge: Only show if card has 2 or more photos */}
                            {imgCount > 1 && (
                              <span className="picspeak-feed-slide-badge">
                                <FiImage size={12} /> {imgCount} photos
                              </span>
                            )}
                          </div>
                          <div className="picspeak-feed-card-body">
                            <span className="picspeak-home-card-category">PHOTO STORY</span>
                            <h3 className="picspeak-feed-card-title">{art.title}</h3>
                            <p className="picspeak-feed-card-lead">{art.lead}</p>
                            <div className="picspeak-feed-card-foot">
                              <img
                                src={art.author?.avatar || '/default-avatar.png'}
                                alt={art.author?.name}
                                className="picspeak-feed-card-avatar"
                              />
                              <span>{art.author?.name || 'Student'}</span>
                              <span className="picspeak-feed-card-date">
                                {art.publishedAt ? format(new Date(art.publishedAt), 'MMM dd, yyyy') : 'Recent'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── PENDING PROGRESS TAB (User Pending Files Menu) ── */}
      {activeNavTab === 'pending' && user && (
        <div className="ps-pending-queue">
          <div className="ps-queue-header">
            <h2 className="ps-queue-title"><FiClock size={24} /> Verification Queue</h2>
            <p className="ps-queue-subtitle">
              {user.role === 'admin' || user.role === 'moderator'
                ? 'Moderate and approve pending Camera Speaks visual stories.'
                : 'Track the progress of your submitted visual stories.'}
            </p>
          </div>

          {pendingLoading ? (
            <div className="picspeak-loading">
              <div className="picspeak-spinner" />
              <p>Loading queue...</p>
            </div>
          ) : pendingArticles.length === 0 ? (
            <div className="ps-pending-empty-state">
              <FiCheckCircle size={40} className="ps-dropzone-icon" />
              <h3 className="ps-pending-empty-title">Queue is Clean</h3>
              <p className="ps-pending-empty-desc">
                {user.role === 'admin' || user.role === 'moderator'
                  ? 'No stories are awaiting administrator review right now.'
                  : 'You do not have any pending verification stories.'}
              </p>
            </div>
          ) : (
            <div className="ps-pending-list">
              {pendingArticles.map(art => (
                user.role === 'admin' || user.role === 'moderator' ? (
                  <AdminPendingCard
                    key={art._id}
                    article={art}
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                ) : (
                  <StudentPendingCard
                    key={art._id}
                    article={art}
                    onRetract={handleRetract}
                  />
                )
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom navigation pill */}
      <BottomNavPill
        activeTab={activeNavTab}
        category="pictures-speak"
        showSearch={true}
        showPublish={true}
        customTabs={[
          { id: 'feed', label: 'Explore', icon: FiRadio },
          ...(user ? [
            { id: 'pending', label: 'Pending', icon: FiClock }
          ] : [])
        ]}
        onTabClick={(tabId) => {
          if (tabId === 'feed') { setActiveNavTab('feed'); }
          else if (tabId === 'pending') { setActiveNavTab('pending'); setSelectedArticle(null); }
        }}
        onPublishSuccess={(newArt) => {
          if (newArt.category === 'pictures-speak') {
            if (newArt.status === 'pending') {
              toast.success('Visual story submitted for admin review! ⏳');
              loadPending();
              setActiveNavTab('pending');
            } else {
              toast.success('Visual story published live! 🎉');
              loadPublished();
              setSelectedArticle(newArt);
              setActiveNavTab('feed');
            }
          }
        }}
      />
    </main>
  );
};

export default PicturesSpeakPage;
