import React, { useState, useEffect, useRef } from 'react';
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
      const res = await articleAPI.getBySlug(id); // Slug or ID, backend works with both
      if (res.data?.data) {
        setSelectedArticle(res.data.data);
        setLikes(res.data.data.likes || []);
        setActiveSlide(0);
        setIsExpanded(false);
      }
    } catch (err) {
      // If slug lookup fails, try direct ID lookup
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
    // Fallback to coverImage if no slides uploaded
    return [{
      url: selectedArticle.coverImage,
      caption: selectedArticle.lead || 'Photo story detail'
    }];
  };

  const slides = getSlides();

  // 2. Speech Engine (TTS)
  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);

    if (!isPlayingSpeech || !text) return;

    const cleanText = text.replace(/<[^>]*>/g, ''); // strip HTML tags
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

    // Find custom voices
    const voices = window.speechSynthesis.getVoices();
    const premiumVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural')));
    const fallbackVoice = voices.find(v => v.lang.startsWith('en'));
    utterance.voice = premiumVoice || fallbackVoice || null;

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Speak when slide changes or speech is toggled
  useEffect(() => {
    if (loading || !selectedArticle || slides.length === 0) return;
    
    // First slide speaks Title & Summary + active caption. Others speak caption.
    let textToSpeak = '';
    if (activeSlide === 0) {
      textToSpeak = `${selectedArticle.title}. ${selectedArticle.lead}. ${slides[0]?.caption || ''}`;
    } else {
      textToSpeak = slides[activeSlide]?.caption || '';
    }

    // Delay speech slightly to allow smooth transitions
    const t = setTimeout(() => {
      speakText(textToSpeak);
    }, 400);

    return () => clearTimeout(t);
  }, [activeSlide, selectedArticle, isPlayingSpeech, speechRate, loading]);

  // 3. Auto Slideshow Scroll Interval
  useEffect(() => {
    if (slideshowTimerRef.current) clearInterval(slideshowTimerRef.current);
    
    if (isAutoScrolling && slides.length > 1) {
      slideshowTimerRef.current = setInterval(() => {
        setActiveSlide(prev => (prev + 1) % slides.length);
        setIsExpanded(false); // Close expanded text on slide switch
      }, 9000); // 9 seconds slow scroll speed
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
      toast.success('Copy link to clipboard!');
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  // Other Picture Speak articles for Right List (include selected one to highlight it in the list)
  const rightSidebarArticles = articlesList || [];

  return (
    <div className="ps-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      
      {/* Premium Luxury Modal */}
      <div className="ps-modal-box">
        
        {/* Modal Header */}
        <div className="ps-modal-header">
          <div className="ps-modal-header-left">
            <span className="ps-category-badge">CAMERA SPEAKS</span>
            <h2 className="ps-modal-header-title">{selectedArticle?.title || 'Loading Photo Story...'}</h2>
          </div>
          <button className="ps-modal-close-btn" onClick={onClose} aria-label="Close modal">
            <FiX size={24} />
          </button>
        </div>

        {loading ? (
          <div className="ps-modal-loader">
            <div className="ps-spinner" />
            <p>Gathering pictures and stories...</p>
          </div>
        ) : (
          <div className="ps-modal-layout">
            
            {/* LEFT COLUMN: Slideshow, Speech controls & Expanded Details */}
            <div className="ps-modal-main">
              
              {/* Interactive Image Frame */}
              <div className="ps-viewer-frame">
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
                    <button className="ps-nav-arrow left" onClick={handlePrevSlide}>
                      <FiChevronLeft size={24} />
                    </button>
                    <button className="ps-nav-arrow right" onClick={handleNextSlide}>
                      <FiChevronRight size={24} />
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
                    {isAutoScrolling ? <FiPause size={16} /> : <FiPlay size={16} />}
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
                    {isPlayingSpeech ? <FiVolume2 size={16} /> : <FiVolumeX size={16} />}
                    <span>Voice Narrator</span>
                  </button>
                </div>

                <div className="ps-console-right">
                  <label htmlFor="speech-rate-slider">Speed:</label>
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
                  <span className="ps-rate-indicator">{speechRate.toFixed(1)}x</span>
                </div>
              </div>

              {/* Elevated Content Card with Fog Effect */}
              <div className={`ps-narrative-card ${isExpanded ? 'elevated' : ''}`}>
                <div className="ps-card-header">
                  <span className="ps-card-slide-num">Slide {activeSlide + 1} of {slides.length}</span>
                  {selectedArticle.author && (
                    <span className="ps-card-author">Photo Journal by {selectedArticle.author.name}</span>
                  )}
                </div>

                <div className={`ps-card-text-container ${isExpanded ? 'expanded' : ''}`}>
                  <p className="ps-slide-caption-text">
                    {slides[activeSlide]?.caption || "No narration text recorded for this slide."}
                  </p>
                  
                  {activeSlide === 0 && selectedArticle.body && (
                    <div 
                      className="ps-article-full-body"
                      dangerouslySetInnerHTML={{ __html: selectedArticle.body }}
                    />
                  )}

                  {/* Fog gradient mask */}
                  {!isExpanded && (
                    <div className="ps-text-fog-overlay" />
                  )}
                </div>

                {/* Read More Trigger */}
                <div className="ps-read-more-row">
                  <button 
                    className="ps-read-more-btn"
                    onClick={() => setIsExpanded(!isExpanded)}
                  >
                    {isExpanded ? 'Show Less ↑' : 'Read Full Narrative ↓'}
                  </button>
                </div>

                {/* Left side actions bar */}
                <div className="ps-actions-bar">
                  <button 
                    className={`ps-action-btn heart ${user && likes.includes(user._id) ? 'active' : ''}`}
                    onClick={handleHype}
                  >
                    <FiHeart size={18} />
                    <span>Hype ({likes.length})</span>
                  </button>
                  <button 
                    className="ps-action-btn comments"
                    onClick={() => setShowComments(true)}
                  >
                    <FiMessageSquare size={18} />
                    <span>Discuss ({selectedArticle.commentsCount || 0})</span>
                  </button>
                  <button className="ps-action-btn share" onClick={handleShare}>
                    <FiShare2 size={18} />
                    <span>Copy Link</span>
                  </button>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Sidebar List of other Camera Speaks */}
            <div className="ps-modal-sidebar">
              <h3 className="ps-sidebar-title">Other Stories</h3>
              <div className="ps-sidebar-list">
                {rightSidebarArticles.length === 0 ? (
                  <p className="ps-sidebar-empty">No other photo stories found.</p>
                ) : (
                  rightSidebarArticles.map((art) => (
                    <div 
                      key={art._id} 
                      className={`ps-sidebar-item-card ${selectedArticle && (selectedArticle._id === art._id || selectedArticle.slug === art.slug) ? 'active' : ''}`}
                      onClick={() => fetchArticleDetails(art.slug)}
                    >
                      <div className="ps-sidebar-card-thumb">
                        <img src={getImageUrl(art.coverImage)} alt={art.title} />
                      </div>
                      <div className="ps-sidebar-card-info">
                        <h4 className="ps-sidebar-card-title">{art.title}</h4>
                        <span className="ps-sidebar-card-meta">
                          By {art.author?.name || 'Student'} • {art.images?.length || 1} slides
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
            // Refresh comments count
            fetchArticleDetails(selectedArticle._id);
          }}
        />
      )}

    </div>
  );
};

export default PictureSpeakModal;
