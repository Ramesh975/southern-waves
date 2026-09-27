import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiX, FiVolume2, FiVolumeX, FiPlay, FiPause, 
  FiChevronLeft, FiChevronRight, FiHeart, FiMessageSquare, FiShare2
} from 'react-icons/fi';
import { articleAPI } from '../services/api';
import { getImageUrl } from './ArticleComponents';
import { useAuth } from '../context/AuthContext';
import CommentsPopupModal from './CommentsPopupModal';
import toast from 'react-hot-toast';

const PictureSpeakModal = ({ articleId, onClose, articlesList = [] }) => {
  const { user } = useAuth();
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);
  
  // Auto slideshow states
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const [isPlayingSpeech, setIsPlayingSpeech] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Read More expand states
  const [isExpanded, setIsExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [likes, setLikes] = useState([]);
  
  const slideshowTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  // Swipe state
  const touchStartRef = useRef({ x: 0, y: 0 });

  // 0. Body lock & bottom nav pill removal
  useEffect(() => {
    document.body.classList.add('ps-modal-open');
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.classList.remove('ps-modal-open');
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // 1. Fetch Selected Article Details
  useEffect(() => {
    isMountedRef.current = true;
    fetchArticleDetails(articleId);
    return () => {
      isMountedRef.current = false;
      stopSpeech();
      if (slideshowTimerRef.current) clearInterval(slideshowTimerRef.current);
    };
  }, [articleId]);

  const fetchArticleDetails = async (id) => {
    setLoading(true);
    try {
      const res = await articleAPI.getBySlug(id);
      if (res.data?.data) {
        setSelectedArticle(res.data.data);
        setLikes(res.data.data.likes || []);
        setActiveSlide(0);
        setIsExpanded(false);
      }
    } catch (err) {
      try {
        const allRes = await articleAPI.getAll({ category: 'pictures-speak', limit: 100 });
        const matched = allRes.data?.data?.find(a => a._id === id || a.slug === id);
        if (matched) {
          setSelectedArticle(matched);
          setLikes(matched.likes || []);
          setActiveSlide(0);
          setIsExpanded(false);
        } else {
          toast.error('Failed to load this photo story');
          onClose();
        }
      } catch (innerErr) {
        toast.error('Failed to load this photo story');
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  // Compile images from article
  const getSlides = () => {
    if (!selectedArticle) return [];
    if (selectedArticle.images && selectedArticle.images.length > 0) {
      return selectedArticle.images;
    }
    return [{
      url: selectedArticle.coverImage,
      caption: selectedArticle.lead || 'Photo story detail'
    }];
  };

  const slides = getSlides();

  // 2. Speech Engine (TTS)
  const speakText = useCallback((text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);

    if (!isPlayingSpeech || !text) return;

    const cleanText = text.replace(/<[^>]*>/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = speechRate;

    utterance.onstart = () => {
      if (isMountedRef.current) setIsSpeaking(true);
    };

    utterance.onend = () => {
      if (isMountedRef.current) setIsSpeaking(false);
    };

    utterance.onerror = () => {
      if (isMountedRef.current) setIsSpeaking(false);
    };

    const voices = window.speechSynthesis.getVoices();
    const premiumVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural')));
    const fallbackVoice = voices.find(v => v.lang.startsWith('en'));
    utterance.voice = premiumVoice || fallbackVoice || null;

    window.speechSynthesis.speak(utterance);
  }, [isPlayingSpeech, speechRate]);

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Speak when slide changes or speech is toggled
  useEffect(() => {
    if (loading || !selectedArticle || slides.length === 0) return;
    
    let textToSpeak = '';
    if (activeSlide === 0) {
      textToSpeak = `${selectedArticle.title}. ${selectedArticle.lead}. ${slides[0]?.caption || ''}`;
    } else {
      textToSpeak = slides[activeSlide]?.caption || '';
    }

    const t = setTimeout(() => {
      speakText(textToSpeak);
    }, 400);

    return () => clearTimeout(t);
  }, [activeSlide, selectedArticle, isPlayingSpeech, speechRate, loading, speakText]);

  // 3. Auto Slideshow Scroll Interval
  useEffect(() => {
    if (slideshowTimerRef.current) clearInterval(slideshowTimerRef.current);
    
    if (isAutoScrolling && slides.length > 1) {
      slideshowTimerRef.current = setInterval(() => {
        setActiveSlide(prev => (prev + 1) % slides.length);
        setIsExpanded(false);
      }, 9000);
    }

    return () => {
      if (slideshowTimerRef.current) clearInterval(slideshowTimerRef.current);
    };
  }, [isAutoScrolling, slides.length]);

  // 4. Slide Navigation Controls
  const handlePrevSlide = () => {
    if (slides.length <= 1) return;
    setActiveSlide(prev => (prev - 1 + slides.length) % slides.length);
    setIsExpanded(false);
  };

  const handleNextSlide = () => {
    if (slides.length <= 1) return;
    setActiveSlide(prev => (prev + 1) % slides.length);
    setIsExpanded(false);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        handlePrevSlide();
      } else if (e.key === 'ArrowRight') {
        handleNextSlide();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length, onClose]);

  // Touch Swipe Handlers for mobile viewer
  const handleTouchStart = (e) => {
    const t = e.targetTouches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e) => {
    if (!e.changedTouches || !e.changedTouches[0]) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) {
        handleNextSlide();
      } else {
        handlePrevSlide();
      }
    }
  };

  // Hype (Like) handler
  const handleHype = async () => {
    if (!selectedArticle) return;
    if (!user) return toast.error('Please log in to hype stories');
    try {
      const res = await articleAPI.like(selectedArticle._id);
      if (res.data?.success) {
        setLikes(res.data.likes);
        toast.success(res.data.likes.includes(user._id) ? 'Hyped! ❤️' : 'Hype removed');
      }
    } catch (err) {
      console.error('Like failed:', err);
    }
  };

  // Share handler
  const handleShare = async () => {
    if (!selectedArticle) return;
    try {
      await articleAPI.share(selectedArticle._id);
      const url = `${window.location.origin}/article/${selectedArticle.slug}`;
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard! 🔗');
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  const rightSidebarArticles = articlesList || [];

  return (
    <div className="ps-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      
      {/* Premium Luxury Modal Box */}
      <div className="ps-modal-box">
        
        {/* Modal Header */}
        <div className="ps-modal-header">
          <div className="ps-modal-header-left">
            <span className="ps-category-badge">📷 CAMERA SPEAKS</span>
            <h2 className="ps-modal-header-title">{selectedArticle?.title || 'Loading Photo Story...'}</h2>
          </div>
          <button className="ps-modal-close-btn" onClick={onClose} aria-label="Close modal">
            <FiX size={20} />
          </button>
        </div>

        {loading ? (
          <div className="ps-modal-loader" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div className="ps-spinner" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--color-gray-500)', fontSize: 14 }}>Gathering pictures and stories...</p>
          </div>
        ) : (
          <div className="ps-modal-layout">
            
            {/* LEFT COLUMN: Slideshow, Controls & Narrative */}
            <div className="ps-modal-main">
              
              {/* Interactive Image Frame */}
              <div 
                className="ps-viewer-frame"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {slides.length > 0 && (
                  <img 
                    src={getImageUrl(slides[activeSlide]?.url)} 
                    alt={slides[activeSlide]?.caption || 'Slide image'} 
                    className="ps-active-img" 
                  />
                )}

                {/* Left/Right Overlays */}
                {slides.length > 1 && (
                  <>
                    <button className="ps-nav-arrow left" onClick={handlePrevSlide} aria-label="Previous slide">
                      <FiChevronLeft size={22} />
                    </button>
                    <button className="ps-nav-arrow right" onClick={handleNextSlide} aria-label="Next slide">
                      <FiChevronRight size={22} />
                    </button>
                  </>
                )}

                {/* Slide dots count indicator */}
                <div className="ps-slides-dots">
                  {slides.map((_, idx) => (
                    <span 
                      key={idx} 
                      className={`ps-slide-dot ${idx === activeSlide ? 'active' : ''}`}
                      onClick={() => { setActiveSlide(idx); setIsExpanded(false); }}
                      title={`Slide ${idx + 1}`}
                    />
                  ))}
                </div>

                {/* TTS Active Audio Waves */}
                {isSpeaking && (
                  <div className="ps-audio-wave-wrap">
                    <span className="ps-wave-bar b1" />
                    <span className="ps-wave-bar b2" />
                    <span className="ps-wave-bar b3" />
                    <span className="ps-wave-bar b4" />
                  </div>
                )}
              </div>

              {/* TTS Control Console */}
              <div className="ps-tts-console">
                <div className="ps-console-left">
                  <button 
                    className={`ps-console-btn ${isAutoScrolling ? 'active' : ''}`}
                    onClick={() => setIsAutoScrolling(!isAutoScrolling)}
                    title={isAutoScrolling ? "Pause Auto-Slide" : "Play Auto-Slide"}
                  >
                    {isAutoScrolling ? <FiPause size={14} /> : <FiPlay size={14} />}
                    <span>Auto-Slide</span>
                  </button>
                  
                  <button 
                    className={`ps-console-btn ${isPlayingSpeech ? 'active' : ''}`}
                    onClick={() => {
                      if (isPlayingSpeech) {
                        stopSpeech();
                        setIsPlayingSpeech(false);
                      } else {
                        setIsPlayingSpeech(true);
                      }
                    }}
                    title={isPlayingSpeech ? "Mute Voice" : "Unmute Voice"}
                  >
                    {isPlayingSpeech ? <FiVolume2 size={14} /> : <FiVolumeX size={14} />}
                    <span>Voice Narrator</span>
                  </button>
                </div>

                <div className="ps-console-right">
                  <label htmlFor="speech-rate-slider" style={{ fontSize: 11, fontWeight: 600 }}>Speed:</label>
                  <input 
                    id="speech-rate-slider"
                    type="range" 
                    min="0.75" 
                    max="1.5" 
                    step="0.1" 
                    value={speechRate} 
                    onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                    className="ps-rate-slider"
                  />
                  <span className="ps-rate-indicator" style={{ fontSize: 11, fontWeight: 700 }}>{speechRate.toFixed(1)}x</span>
                </div>
              </div>

              {/* Elevated Content Card with Fog Effect */}
              <div className={`ps-narrative-card ${isExpanded ? 'elevated' : ''}`} style={{ marginTop: 14 }}>
                <div className="ps-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span className="ps-card-slide-num" style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-color)' }}>
                    📸 Photo {activeSlide + 1} of {slides.length} {activeSlide === 0 ? '• Lead Cover' : ''}
                  </span>
                  {selectedArticle?.author && (
                    <span className="ps-card-author" style={{ fontSize: 12, color: 'var(--color-gray-500)' }}>
                      Photo Story by <strong style={{ color: 'var(--color-black)' }}>{selectedArticle.author.name}</strong>
                    </span>
                  )}
                </div>

                <div className={`ps-card-text-container ${isExpanded ? 'expanded' : ''}`}>
                  <p className="ps-slide-caption-text" style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-black)', margin: '0 0 10px 0' }}>
                    {slides[activeSlide]?.caption || selectedArticle?.lead || "No caption text recorded for this photo."}
                  </p>
                  
                  {activeSlide === 0 && selectedArticle?.lead && slides[0]?.caption !== selectedArticle.lead && (
                    <p style={{ fontSize: 13, color: 'var(--color-gray-500)', lineHeight: 1.5, margin: '0 0 10px 0', fontStyle: 'italic' }}>
                      {selectedArticle.lead}
                    </p>
                  )}

                  {activeSlide === 0 && selectedArticle?.body && (
                    <div 
                      className="ps-article-full-body"
                      style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--color-black)' }}
                      dangerouslySetInnerHTML={{ __html: selectedArticle.body }}
                    />
                  )}

                  {!isExpanded && (
                    <div className="ps-text-fog-overlay" />
                  )}
                </div>

                {/* Read More Trigger */}
                <div className="ps-read-more-row" style={{ marginTop: 6, marginBottom: 12 }}>
                  <button 
                    className="ps-read-more-btn"
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-color)', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                  >
                    {isExpanded ? 'Show Less ↑' : 'Read Full Narrative ↓'}
                  </button>
                </div>

                {/* Actions Bar */}
                <div className="ps-actions-bar" style={{ display: 'flex', gap: 10, borderTop: '1px solid var(--color-gray-200)', paddingTop: 12 }}>
                  <button 
                    className={`ps-action-btn heart ${user && likes.includes(user._id) ? 'active' : ''}`}
                    onClick={handleHype}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 20,
                      border: '1px solid var(--color-gray-200)',
                      background: user && likes.includes(user._id) ? 'rgba(239, 68, 68, 0.12)' : 'var(--color-white)',
                      color: user && likes.includes(user._id) ? '#ef4444' : 'var(--color-black)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <FiHeart size={15} />
                    <span>Hype ({likes.length})</span>
                  </button>
                  <button 
                    className="ps-action-btn comments"
                    onClick={() => setShowComments(true)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 20,
                      border: '1px solid var(--color-gray-200)',
                      background: 'var(--color-white)',
                      color: 'var(--color-black)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <FiMessageSquare size={15} />
                    <span>Discuss ({selectedArticle?.commentsCount || 0})</span>
                  </button>
                  <button 
                    className="ps-action-btn share" 
                    onClick={handleShare}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 20,
                      border: '1px solid var(--color-gray-200)',
                      background: 'var(--color-white)',
                      color: 'var(--color-black)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <FiShare2 size={15} />
                    <span>Share</span>
                  </button>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Sidebar List of other Camera Speaks */}
            <div className="ps-modal-sidebar">
              <h3 className="ps-sidebar-title" style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 10px 0', color: 'var(--color-black)' }}>
                More Visual Stories
              </h3>
              <div className="ps-sidebar-list">
                {rightSidebarArticles.length === 0 ? (
                  <p className="ps-sidebar-empty" style={{ fontSize: 12, color: 'var(--color-gray-400)', fontStyle: 'italic' }}>
                    No other photo stories found.
                  </p>
                ) : (
                  rightSidebarArticles.map((art) => (
                    <div 
                      key={art._id} 
                      className={`ps-sidebar-item-card ${selectedArticle && (selectedArticle._id === art._id || selectedArticle.slug === art.slug) ? 'active' : ''}`}
                      onClick={() => fetchArticleDetails(art.slug || art._id)}
                    >
                      <div className="ps-sidebar-card-thumb">
                        <img src={getImageUrl(art.coverImage)} alt={art.title} />
                      </div>
                      <div className="ps-sidebar-card-info">
                        <h4 className="ps-sidebar-card-title">{art.title}</h4>
                        <span className="ps-sidebar-card-meta">
                          By {art.author?.name || 'Student'} • {art.images?.length || 1} {art.images?.length === 1 ? 'photo' : 'photos'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Reusable Comments modal overlay */}
      {showComments && selectedArticle && (
        <CommentsPopupModal 
          article={selectedArticle} 
          onClose={() => {
            setShowComments(false);
            fetchArticleDetails(selectedArticle._id);
          }}
        />
      )}

    </div>
  );
};

export default PictureSpeakModal;

