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

// ─── Full-screen Story Viewer ─────────────────────────────────────────────────
const StoryViewer = ({ article, articlesList = [], onClose, onSelectArticle }) => {
  const { user } = useAuth();
  const [activeSlide, setActiveSlide] = useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const [isPlayingSpeech, setIsPlayingSpeech] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [likes, setLikes] = useState(article?.likes || []);
  const [shares, setShares] = useState(article?.shares || 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [recommendedStories, setRecommendedStories] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(6);

  const commentsRef = useRef(null);
  const slideshowTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  const slides = getSlides(article);

  // Reset on article change
  useEffect(() => {
    setActiveSlide(0);
    setIsExpanded(false);
    setLikes(article?.likes || []);
    setShares(article?.shares || 0);
    setVisibleLimit(6);
  }, [article?._id]);

  useEffect(() => {
    if (!article) return;
    const fetchRecs = async () => {
      setRecLoading(true);
      try {
        const res = await articleAPI.getRecommendations();
        const recList = res.data?.data || [];
        let pics = recList.filter(a => a.category === 'pictures-speak' && a._id !== article._id);
        
        // If we don't have 6 pics, fallback to normal list matching tags/recent
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
        
        setRecommendedStories(pics.slice(0, 12));
      } catch (err) {
        console.error('Failed to load recommended stories:', err);
        const currentTags = article.tags || [];
        const candidates = articlesList.filter(a => a._id !== article._id);
        candidates.sort((a, b) => {
          const matchesA = (a.tags || []).filter(t => currentTags.includes(t)).length;
          const matchesB = (b.tags || []).filter(t => currentTags.includes(t)).length;
          if (matchesA !== matchesB) return matchesB - matchesA;
          return new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt);
        });
        setRecommendedStories(candidates.slice(0, 12));
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
    if (isAutoScrolling && slides.length > 1) {
      slideshowTimerRef.current = setInterval(() => {
        setActiveSlide(prev => (prev + 1) % slides.length);
        setIsExpanded(false);
      }, 9000);
    }
    return () => { if (slideshowTimerRef.current) clearInterval(slideshowTimerRef.current); };
  }, [isAutoScrolling, slides.length, article?._id]);

  const handlePrev = () => { setActiveSlide(p => (p - 1 + slides.length) % slides.length); setIsExpanded(false); };
  const handleNext = () => { setActiveSlide(p => (p + 1) % slides.length); setIsExpanded(false); };

  const touchStartXRef = useRef(0);
  const touchEndXRef = useRef(0);

  const handleTouchStart = (e) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const startX = touchStartXRef.current;
    const endX = touchEndXRef.current;
    const minDistance = 50;
    if (startX && endX) {
      if (startX - endX > minDistance) {
        handleNext();
      } else if (endX - startX > minDistance) {
        handlePrev();
      }
    }
    touchStartXRef.current = 0;
    touchEndXRef.current = 0;
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

  const filteredList = articlesList.filter(a =>
    !searchQuery || a.title.toLowerCase().includes(searchQuery.toLowerCase()) || (a.lead || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="ps-viewer-overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className={`ps-viewer-root ${isSidebarOpen ? '' : 'sidebar-collapsed'}`}>

        {/* ── LEFT: Full-screen slideshow & description & comments ── */}
        <div className="ps-viewer-left">
          {/* Image area */}
          <div 
            className="ps-viewer-img-wrap"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {slides.length > 0 && (
              <img
                key={`${article._id}-${activeSlide}`}
                src={getImageUrl(slides[activeSlide]?.url)}
                alt={slides[activeSlide]?.caption || article.title}
                className="ps-viewer-img"
              />
            )}

            {/* Gradient overlay at bottom */}
            <div className="ps-viewer-img-gradient" />

            {/* Nav arrows */}
            {slides.length > 1 && (
              <>
                <button className="ps-nav-arrow left" onClick={handlePrev}><FiChevronLeft size={26} /></button>
                <button className="ps-nav-arrow right" onClick={handleNext}><FiChevronRight size={26} /></button>
              </>
            )}

            {/* Slide dots */}
            <div className="ps-slides-dots">
              {slides.map((_, i) => (
                <span
                  key={i}
                  className={`ps-slide-dot ${i === activeSlide ? 'active' : ''}`}
                  onClick={() => { setActiveSlide(i); setIsExpanded(false); }}
                />
              ))}
            </div>

            {/* Audio waveform */}
            {isSpeaking && (
              <div className="ps-audio-wave-wrap">
                <span className="ps-wave-bar b1" /><span className="ps-wave-bar b2" />
                <span className="ps-wave-bar b3" /><span className="ps-wave-bar b4" />
              </div>
            )}

            {/* Header badge */}
            <div className="ps-viewer-header-badge">
              <span className="ps-cat-badge">📷 CAMERA SPEAKS</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="ps-viewer-sidebar-toggle-btn"
                  onClick={() => setIsSidebarOpen(prev => !prev)}
                  title={isSidebarOpen ? "Hide Sidebar (Immersive Mode)" : "Show Sidebar"}
                >
                  <FiChevronRight
                    size={22}
                    style={{
                      transform: isSidebarOpen ? 'rotate(0deg)' : 'rotate(180deg)',
                      transition: 'transform 0.3s'
                    }}
                  />
                </button>
                {onClose && (
                  <button type="button" className="ps-viewer-close-btn" onClick={onClose}><FiX size={22} /></button>
                )}
              </div>
            </div>
          </div>

          {/* TTS Console */}
          <div className="ps-tts-console">
            <div className="ps-console-left">
              <button
                className={`ps-console-btn ${isAutoScrolling ? 'active' : ''}`}
                onClick={() => setIsAutoScrolling(a => !a)}
                title={isAutoScrolling ? 'Pause Auto-Slide' : 'Play Auto-Slide'}
              >
                {isAutoScrolling ? <FiPause size={15} /> : <FiPlay size={15} />}
                <span>Auto</span>
              </button>
              <button
                className={`ps-console-btn ${isPlayingSpeech ? 'active' : ''}`}
                onClick={() => { if (isPlayingSpeech) { stopSpeech(); setIsPlayingSpeech(false); } else setIsPlayingSpeech(true); }}
                title="Voice Narrator"
              >
                {isPlayingSpeech ? <FiVolume2 size={15} /> : <FiVolumeX size={15} />}
                <span>Voice</span>
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

          {/* Narrative card with fog effect */}
          <div className={`ps-narrative-card ${isExpanded ? 'elevated' : ''}`}>
            <div className="ps-card-header">
              <span className="ps-slide-num">Slide {activeSlide + 1} / {slides.length}</span>
              <span className="ps-card-author">by {article.author?.name || 'Student'}</span>
            </div>

            <div className={`ps-card-text-container ${isExpanded ? 'expanded' : ''}`}>
              <p className="ps-slide-caption">
                {slides[activeSlide]?.caption || 'No narration for this slide.'}
              </p>
              {activeSlide === 0 && article.body && (
                <div className="ps-article-body" dangerouslySetInnerHTML={{ __html: article.body }} />
              )}
              {!isExpanded && <div className="ps-text-fog-overlay" />}
            </div>

            <button className="ps-read-more-btn" onClick={() => setIsExpanded(e => !e)}>
              {isExpanded ? 'Show Less ↑' : 'Read Full Narrative ↓'}
            </button>

            {/* Actions */}
            <div className="ps-actions-bar">
              <button className={`ps-action-btn heart ${user && likes.includes(user._id) ? 'active' : ''}`} onClick={handleHype}>
                <FiHeart size={17} /> <span>Hype ({likes.length})</span>
              </button>
              <button className="ps-action-btn comments" onClick={() => commentsRef.current?.scrollIntoView({ behavior: 'smooth' })}>
                <FiMessageSquare size={17} /> <span>Discuss ({article.commentsCount || 0})</span>
              </button>
              <button className="ps-action-btn share" onClick={handleShare}>
                <FiShare2 size={17} /> <span>Share ({shares})</span>
              </button>
            </div>
          </div>

          {/* Inline Comments thread below description */}
          <div ref={commentsRef}>
            <InlineComments article={article} />
          </div>

          {/* Mobile-only Recommended Stories */}
          <div className="ps-mobile-more-stories">
            <h3 className="ps-mobile-stories-title">More Stories for You</h3>
            {recLoading ? (
              <div className="ps-mobile-stories-loading">Loading recommendations...</div>
            ) : recommendedStories.length === 0 ? (
              <div className="ps-mobile-stories-empty">No recommendations found.</div>
            ) : (
              <div className="ps-mobile-stories-grid">
                {recommendedStories.slice(0, visibleLimit).map(art => (
                  <div 
                    key={art._id} 
                    className="ps-mobile-story-card" 
                    onClick={() => {
                      onSelectArticle?.(art);
                      setActiveSlide(0);
                      document.querySelector('.ps-viewer-left')?.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <div className="ps-mobile-story-thumb">
                      <img src={getImageUrl(art.coverImage)} alt={art.title} />
                      <span className="ps-mobile-story-badge">
                        <FiImage size={10} /> {art.images?.length || 1}
                      </span>
                    </div>
                    <div className="ps-mobile-story-info">
                      <h4 className="ps-mobile-story-card-title">{art.title}</h4>
                      <p className="ps-mobile-story-card-lead">{art.lead}</p>
                      <div className="ps-mobile-story-meta">
                        <span>by {art.author?.name || 'Student'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="ps-mobile-stories-actions">
              {recommendedStories.length > visibleLimit ? (
                <button 
                  type="button"
                  className="ps-mobile-load-more-btn"
                  onClick={() => setVisibleLimit(prev => prev + 6)}
                >
                  Load More Stories
                </button>
              ) : (
                <button 
                  type="button"
                  className="ps-mobile-search-btn"
                  onClick={() => {
                    onClose?.();
                    setTimeout(() => {
                      const searchBtn = document.querySelector('.nm-search-pill-trigger');
                      if (searchBtn) searchBtn.click();
                    }, 150);
                  }}
                >
                  <FiSearch size={14} /> Search All Stories
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Other stories sidebar ── */}
        <div className="ps-viewer-sidebar">
          <div className="ps-sidebar-search-wrap">
            <FiSearch size={15} className="ps-sidebar-search-icon" />
            <input
              type="text"
              placeholder="Search stories..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="ps-sidebar-search-input"
            />
            {searchQuery && (
              <button className="ps-sidebar-search-clear" onClick={() => setSearchQuery('')}><FiX size={14} /></button>
            )}
          </div>

          <h3 className="ps-sidebar-heading">More Stories</h3>
          <div className="ps-sidebar-list">
            {filteredList.length === 0 ? (
              <p className="ps-sidebar-empty">No stories found.</p>
            ) : filteredList.map(art => (
              <div
                key={art._id}
                className={`ps-sidebar-card ${article._id === art._id ? 'active' : ''}`}
                onClick={() => onSelectArticle?.(art)}
              >
                <div className="ps-sidebar-thumb">
                  <img src={getImageUrl(art.coverImage)} alt={art.title} />
                  {art.images?.length > 1 && (
                    <span className="ps-sidebar-badge"><FiImage size={11} /> {art.images.length}</span>
                  )}
                </div>
                <div className="ps-sidebar-info">
                  <h4 className="ps-sidebar-title">{art.title}</h4>
                  <p className="ps-sidebar-meta">
                    {art.author?.name || 'Student'} &bull; {art.images?.length || 1} slide{(art.images?.length || 1) !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            ))}
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
                    {articles.length} Stories
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
                <div className="picspeak-loading"><div className="picspeak-spinner" /><p>Loading...</p></div>
              ) : articles.length === 0 ? (
                <div className="picspeak-feed-empty">
                  <FiImage size={48} />
                  <h3>No photo stories yet</h3>
                  <p>Be the first to publish a Camera Speaks story!</p>
                </div>
              ) : (
                <div className={`picspeak-feed-grid ps-layout-${mobileLayout}`}>
                  {articles.map(art => (
                    <div key={art._id} className="picspeak-feed-card" onClick={() => setSelectedArticle(art)}>
                      <div className="picspeak-feed-card-thumb">
                        <img src={getImageUrl(art.coverImage)} alt={art.title} />
                        <span className="picspeak-feed-slide-badge">
                          <FiImage size={12} /> {art.images?.length || 1}
                        </span>
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
                  ))}
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
