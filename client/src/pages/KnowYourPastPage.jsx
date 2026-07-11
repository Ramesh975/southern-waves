import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { articleAPI, commentAPI } from '../services/api';
import toast from 'react-hot-toast';
import { FiSearch, FiClock, FiX, FiArrowRight, FiFileText, FiShare2, FiMessageSquare, FiSend } from 'react-icons/fi';
import { getImgSrc } from '../components/NewsArticleCard';
import BottomNavPill from '../components/BottomNavPill';

const SUB_CATEGORIES = [
  'Movement', 'Agitation', 'Milestone', 'Crisis', 'Architecture', 'Culture', 'Sports', 'Other'
];

const KnowYourPastPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { socket } = useChat();

  // Timeline list state
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [yearRange, setYearRange] = useState('all');
  const [sortOrder, setSortOrder] = useState('historicalYearAsc'); // historicalYearAsc | historicalYearDesc
  const [customStartYear, setCustomStartYear] = useState('');
  const [customEndYear, setCustomEndYear] = useState('');

  // Window width tracking for responsive serpentine layouts
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [searchActive, setSearchActive] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedPreviewEvent, setSelectedPreviewEvent] = useState(null);

  // Real-time Comments states
  const [commentsModalOpen, setCommentsModalOpen] = useState(false);
  const [commentArticle, setCommentArticle] = useState(null);
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);

  const clickTimeoutRef = useRef(null);

  // Socket.io integration for real-time article comments popup
  useEffect(() => {
    if (!commentsModalOpen || !commentArticle || !socket) return;

    // Join the article-specific chatroom room
    socket.emit('article:joinRoom', { articleId: commentArticle._id });
    console.log('Joined real-time comments room for article:', commentArticle._id);

    // Listen to real-time broadcasts
    const handleNewComment = (newComment) => {
      setComments((prev) => {
        // Prevent duplicate appending
        if (prev.some(c => c._id === newComment._id)) return prev;
        return [newComment, ...prev];
      });
    };

    socket.on('comment:new', handleNewComment);

    return () => {
      socket.emit('article:leaveRoom', { articleId: commentArticle._id });
      socket.off('comment:new', handleNewComment);
      console.log('Left real-time comments room for article:', commentArticle._id);
    };
  }, [commentsModalOpen, commentArticle, socket]);

  const handleOpenComments = async (article) => {
    setCommentArticle(article);
    setCommentsModalOpen(true);
    setCommentsLoading(true);
    try {
      const res = await commentAPI.getForArticle(article._id);
      setComments(res.data.data || []);
    } catch (err) {
      console.error('Failed to load comments:', err);
      toast.error('Failed to load comments.');
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    try {
      const res = await commentAPI.add(commentArticle._id, { text: newCommentText });
      if (res.data.success) {
        setNewCommentText('');
      }
    } catch (err) {
      console.error('Failed to submit comment:', err);
      toast.error(err.response?.data?.message || 'Failed to submit comment.');
    }
  };

  // Debounced card single-click handler to prevent conflicts with double-clicks
  const handleCardClick = (event) => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      return;
    }

    clickTimeoutRef.current = setTimeout(() => {
      setSelectedPreviewEvent(event);
      setPreviewOpen(true);
      clickTimeoutRef.current = null;
    }, 220);
  };

  // Immediate double-click handler to route straight to full page
  const handleCardDoubleClick = (slug) => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    navigate(`/article/${slug}`);
  };

  // Close preview panel on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setPreviewOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Helper: word count estimation
  const getContentWordCount = (content) => {
    if (!content) return '0 words';
    const text = content.replace(/<[^>]*>/g, '');
    const count = text.split(/\s+/).filter(Boolean).length;
    return `${count} words`;
  };

  // Helper: check if description exceeds 100 words
  const isContentExceedingLimit = (content) => {
    if (!content) return false;
    const text = content.replace(/<[^>]*>/g, '');
    const words = text.split(/\s+/).filter(Boolean);
    return words.length > 100;
  };

  // Helper: date formatter matching explorer DD-MM-YYYY
  const formatEventDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-GB').replace(/\//g, '-');
  };

  // Handler: native share wrapper
  const handleShareClick = async (event, e) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: event.lead,
          url: `${window.location.origin}/article/${event.slug}`
        });
      } catch (err) {
        console.log('Share failed:', err);
      }
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/article/${event.slug}`);
      toast.success('Link copied to clipboard!');
    }
  };

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch events
  const fetchEvents = () => {
    setLoading(true);
    articleAPI.getAll({
      category: 'kyp',
      limit: 100,
      sort: sortOrder,
      search: search || undefined
    })
      .then((res) => {
        let data = res.data?.data || [];
        
        // Filter by subcategory client-side if selected
        if (subCategory) {
          data = data.filter(e => e.subCategory && e.subCategory.toLowerCase() === subCategory.toLowerCase());
        }

        // Filter by year range client-side if selected
        if (yearRange === 'pre-1950') {
          data = data.filter(e => e.historicalYear && Number(e.historicalYear) < 1950);
        } else if (yearRange === '1950-2000') {
          data = data.filter(e => e.historicalYear && Number(e.historicalYear) >= 1950 && Number(e.historicalYear) <= 2000);
        } else if (yearRange === 'post-2000') {
          data = data.filter(e => e.historicalYear && Number(e.historicalYear) > 2000);
        } else if (yearRange === 'custom') {
          if (customStartYear) {
            data = data.filter(e => e.historicalYear && Number(e.historicalYear) >= Number(customStartYear));
          }
          if (customEndYear) {
            data = data.filter(e => e.historicalYear && Number(e.historicalYear) <= Number(customEndYear));
          }
        }

        setEvents(data);
      })
      .catch((err) => {
        console.error('Failed to load history timeline:', err);
        toast.error('Failed to load history timeline.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchEvents();
  }, [search, subCategory, yearRange, sortOrder, customStartYear, customEndYear]);

  // Determine items per row based on window size
  const itemsPerRow = windowWidth > 992 ? 4 : windowWidth > 640 ? 2 : 1;

  // Segment events into serpentine rows
  const rows = [];
  for (let i = 0; i < events.length; i += itemsPerRow) {
    rows.push(events.slice(i, i + itemsPerRow));
  }

  return (
    <main style={{
      minHeight: '90vh',
      padding: '40px 0 120px 0',
      background: '#fafafa',
      backgroundImage: 'radial-gradient(#e5e7eb 1.5px, transparent 1.5px)',
      backgroundSize: '24px 24px',
      fontFamily: 'var(--font-sans, "Inter", sans-serif)'
    }}>
      <style>{`
        .kyp-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 16px;
        }
        .kyp-title {
          font-family: var(--font-display, "Outfit", sans-serif);
          font-size: 28px;
          font-weight: 850;
          letter-spacing: -0.5px;
          margin: 0;
          color: #111827;
        }
        .explore-link {
          color: var(--accent-color, #c8102e);
          font-weight: 700;
          text-decoration: none;
          font-size: 13px;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: transform 0.2s;
        }
        .explore-link:hover {
          transform: translateX(3px);
        }
        
        /* Serpentine Grid Layout */
        .serpentine-container {
          position: relative;
          width: 100%;
          margin: 0 auto;
          padding: 20px 0;
        }
        .serpentine-row {
          position: relative;
          display: grid;
          gap: 32px;
          padding: 30px 0;
        }
        
        /* 4 Columns (Desktop) */
        .row-cols-4 {
          grid-template-columns: repeat(4, 1fr);
        }
        .row-cols-4::before {
          content: '';
          position: absolute;
          top: 48px;
          left: 12.5%;
          right: 12.5%;
          height: 2px;
          background: #e5e7eb;
          z-index: 1;
        }
        .row-cols-4.row-even .vertical-connector-right {
          position: absolute;
          top: 48px;
          bottom: -50px;
          right: 12.5%;
          width: 2px;
          background: #e5e7eb;
          z-index: 1;
        }
        .row-cols-4.row-odd .vertical-connector-left {
          position: absolute;
          top: 48px;
          bottom: -50px;
          left: 12.5%;
          width: 2px;
          background: #e5e7eb;
          z-index: 1;
        }

        /* 2 Columns (Tablet) */
        .row-cols-2 {
          grid-template-columns: repeat(2, 1fr);
        }
        .row-cols-2::before {
          content: '';
          position: absolute;
          top: 48px;
          left: 25%;
          right: 25%;
          height: 2px;
          background: #e5e7eb;
          z-index: 1;
        }
        .row-cols-2.row-even .vertical-connector-right {
          position: absolute;
          top: 48px;
          bottom: -50px;
          right: 25%;
          width: 2px;
          background: #e5e7eb;
          z-index: 1;
        }
        .row-cols-2.row-odd .vertical-connector-left {
          position: absolute;
          top: 48px;
          bottom: -50px;
          left: 25%;
          width: 2px;
          background: #e5e7eb;
          z-index: 1;
        }

        /* 1 Column (Mobile) */
        .row-cols-1 {
          grid-template-columns: 1fr;
          justify-items: center;
          padding: 20px 0;
        }
        .row-cols-1::before {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          left: 50%;
          width: 2px;
          background: #e5e7eb;
          z-index: 1;
          transform: translateX(-50%);
        }

        /* Node Elements */
        .timeline-node {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .timeline-dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--accent-color, #c8102e);
          border: 3px solid #fff;
          box-shadow: 0 4px 10px rgba(200, 16, 46, 0.25);
          margin-bottom: 12px;
          z-index: 3;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .timeline-dot:hover {
          transform: scale(1.3);
          background: #111827;
          box-shadow: 0 4px 12px rgba(17, 24, 39, 0.35);
        }
        .timeline-year {
          font-family: var(--font-display, "Outfit", sans-serif);
          font-size: 15px;
          font-weight: 800;
          color: var(--accent-color, #c8102e);
          margin-bottom: 12px;
          background: #fff;
          padding: 4px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 30px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        
        /* Premium Cards styling (No Black Border) */
        .timeline-card {
          background: #fff;
          border: 1px solid #f3f4f6;
          border-radius: 16px;
          padding: 0;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.03);
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
          width: 100%;
          max-width: 260px;
          min-height: 260px;
          display: flex;
          flex-direction: column;
          cursor: pointer;
          text-align: left;
          overflow: hidden;
        }
        .timeline-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 16px 35px rgba(0, 0, 0, 0.08);
          border-color: var(--accent-color, #c8102e);
        }
        .timeline-card-subcat {
          font-size: 10px;
          font-weight: 750;
          text-transform: uppercase;
          color: var(--accent-color, #c8102e);
          margin-bottom: 8px;
          letter-spacing: 0.8px;
        }
        .timeline-card-title {
          font-size: 14px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 8px 0;
          line-height: 1.4;
          white-space: normal;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .timeline-card-lead {
          font-size: 12px;
          color: #4b5563;
          line-height: 1.5;
          margin: 0;
          white-space: normal;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
        }
        
        .timeline-start-label {
          position: absolute;
          top: -34px;
          left: 50%;
          transform: translateX(-50%);
          font-family: var(--font-display, "Outfit", sans-serif);
          font-weight: 850;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #fff;
          background: var(--accent-color, #c8102e);
          padding: 4px 12px;
          border-radius: 30px;
          box-shadow: 0 4px 10px rgba(200, 16, 46, 0.3);
          z-index: 5;
        }
        .empty-state {
          padding: 60px 20px;
          text-align: center;
          border: 1px dashed #d1d5db;
          border-radius: 16px;
          background: #fff;
          box-shadow: 0 8px 20px rgba(0,0,0,0.02);
          margin: 40px auto;
          max-width: 500px;
        }
        .kyp-preview-description-wrapper {
          position: relative;
          transition: max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
        }
        .kyp-preview-description-wrapper.collapsed {
          max-height: 120px;
        }
        .kyp-preview-description-fog {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 50px;
          background: linear-gradient(to bottom, transparent, #fff);
          pointer-events: none;
        }
        .kyp-preview-expand-btn {
          background: transparent;
          border: none;
          color: #3b82f6;
          font-weight: 700;
          cursor: pointer;
          font-size: 11px;
          padding: 4px 0;
          margin-top: 4px;
          display: inline-flex;
          align-items: center;
          align-self: flex-start;
          transition: color 0.15s;
        }
        .kyp-preview-expand-btn:hover {
          color: #1d4ed8;
          text-decoration: underline;
        }
        .timeline-outer-wrap {
          transition: all 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.45s, filter 0.45s, visibility 0s linear;
          visibility: visible;
          opacity: 1;
        }
        .timeline-outer-wrap.search-active {
          filter: blur(12px) opacity(0);
          transform: scale(0.95);
          pointer-events: none;
          visibility: hidden;
          transition: all 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.45s, filter 0.45s, visibility 0s linear 0.45s;
        }
        .timeline-outer-wrap.preview-open {
          pointer-events: auto;
        }
        @media (min-width: 992px) {
          .timeline-outer-wrap {
            transition: all 0.45s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .timeline-outer-wrap.preview-open {
            margin-right: 360px;
          }
        }

        /* Right Preview Panel (Explorer Style) */
        .kyp-preview-panel {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 360px;
          max-width: 90vw;
          background: #fff;
          box-shadow: -10px 0 35px rgba(0, 0, 0, 0.05);
          z-index: 10000;
          border-left: 1px solid #e5e7eb;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          transform: translateX(100%);
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          overflow-y: auto;
          pointer-events: auto !important;
        }
        .kyp-preview-panel.open {
          transform: translateX(0);
        }
        .kyp-preview-header {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          margin-bottom: -10px;
        }
        .kyp-preview-close {
          background: #f3f4f6;
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #4b5563;
          transition: background 0.2s;
        }
        .kyp-preview-close:hover {
          background: #e5e7eb;
          color: #111827;
        }
        .kyp-preview-media-frame {
          background: #000;
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 180px;
          border: 1px solid #e5e7eb;
        }
        .kyp-preview-cover {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .kyp-preview-filename-row {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-top: 8px;
        }
        .kyp-preview-doc-icon {
          color: #3b82f6;
          flex-shrink: 0;
          margin-top: 3px;
        }
        .kyp-preview-title {
          font-size: 15px;
          font-weight: 700;
          color: #111827;
          margin: 0;
          line-height: 1.4;
          word-break: break-word;
        }
        .kyp-preview-share-label {
          font-size: 11px;
          color: #6b7280;
          margin: 0;
        }
        .kyp-preview-share-btn {
          background: #f9fafb;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 600;
          color: #374151;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          align-self: flex-start;
          transition: background 0.15s;
        }
        .kyp-preview-share-btn:hover {
          background: #f3f4f6;
        }
        .kyp-preview-details-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
          border-top: 1px solid #f3f4f6;
          padding-top: 16px;
          margin-top: 8px;
        }
        .kyp-preview-details-heading {
          font-size: 12px;
          font-weight: 600;
          color: #374151;
          margin: 0;
        }
        .kyp-preview-details-grid {
          display: grid;
          grid-template-columns: 90px 1fr;
          row-gap: 8px;
          font-size: 11px;
          line-height: 1.5;
        }
        .kyp-preview-details-label {
          color: #6b7280;
        }
        .kyp-preview-details-value {
          color: #111827;
          word-break: break-word;
        }
        .kyp-preview-properties-btn:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }
        .kyp-preview-discussion-btn {
          border: 1px solid #d1d5db;
          background: #f9fafb;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          color: #374151;
          cursor: pointer;
          transition: background 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .kyp-preview-discussion-btn:hover {
          background: #f3f4f6;
          border-color: #9ca3af;
        }
        .kyp-preview-action-share-btn {
          border: 1px solid #d1d5db;
          background: #f9fafb;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          color: #374151;
          cursor: pointer;
          transition: background 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .kyp-preview-action-share-btn:hover {
          background: #f3f4f6;
          border-color: #9ca3af;
        }

        /* Comments Modal styling */
        .kyp-comments-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          z-index: 11000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          pointer-events: auto !important;
        }
        .kyp-comments-modal {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
          width: 100%;
          max-width: 520px;
          height: 600px;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: kyp-modal-enter 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes kyp-modal-enter {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .kyp-comments-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 24px;
          border-bottom: 1px solid #f3f4f6;
        }
        .kyp-comments-header-title {
          font-size: 15px;
          font-weight: 700;
          color: #111827;
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 80%;
        }
        .kyp-comments-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .kyp-comment-item {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        .kyp-comment-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #3b82f6;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 13px;
          flex-shrink: 0;
        }
        .kyp-comment-content-box {
          background: #f3f4f6;
          padding: 10px 14px;
          border-radius: 12px;
          border-top-left-radius: 2px;
          flex: 1;
        }
        .kyp-comment-author-name {
          font-size: 12px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 2px;
        }
        .kyp-comment-text {
          font-size: 13px;
          color: #374151;
          line-height: 1.5;
          margin: 0;
          word-break: break-word;
        }
        .kyp-comment-time {
          font-size: 10px;
          color: #9ca3af;
          margin-top: 4px;
          display: block;
        }
        .kyp-comments-footer {
          padding: 16px 24px;
          border-top: 1px solid #f3f4f6;
          background: #f9fafb;
        }
        .kyp-comments-input-form {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .kyp-comments-input {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 13px;
          outline: none;
          background: #fff;
          color: #111827;
          transition: border-color 0.15s;
        }
        .kyp-comments-input:focus {
          border-color: #3b82f6;
        }
        .kyp-comments-send-btn {
          background: #3b82f6;
          color: #fff;
          border: none;
          width: 38px;
          height: 38px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s;
          flex-shrink: 0;
        }
        .kyp-comments-send-btn:hover {
          background: #2563eb;
        }
        .kyp-comments-send-btn:disabled {
          background: #d1d5db;
          cursor: not-allowed;
        }
      `}</style>

      <div className="container">
        {/* Main Header */}
        <div className="kyp-header">
          <h1 className="kyp-title">Know Your Past Timeline</h1>
          <a href="/about" className="explore-link">
            EXPLORE HISTORY →
          </a>
        </div>

        <div className={`timeline-outer-wrap ${searchActive ? 'search-active' : ''} ${previewOpen ? 'preview-open' : ''}`}>
          {/* Timeline Content */}

        {/* Loading Spinner */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div className="nm-spinner-ring" style={{ margin: '0 auto 12px auto' }} />
            <span style={{ fontWeight: 800, color: '#000' }}>Retrieving archives...</span>
          </div>
        ) : events.length === 0 ? (
          <div className="empty-state">
            <h3 style={{ fontWeight: 900, margin: '0 0 6px 0', textTransform: 'uppercase' }}>No Events Found</h3>
            <p style={{ fontSize: '13px', color: '#555', margin: 0 }}>
              We couldn't find any timeline events matching your search or filters.
            </p>
          </div>
        ) : (
          /* Serpentine Timeline Wrapper */
          <div className="serpentine-container">
            {rows.map((rowEvents, rowIndex) => {
              // Determine if row elements flow direction is right-to-left
              const isReversed = itemsPerRow > 1 && rowIndex % 2 === 1;
              const visualEvents = isReversed ? [...rowEvents].reverse() : rowEvents;
              
              const isLastRow = rowIndex === rows.length - 1;
              const rowClass = `serpentine-row row-cols-${itemsPerRow} ${rowIndex % 2 === 0 ? 'row-even' : 'row-odd'}`;

              return (
                <div key={rowIndex} className={rowClass}>
                  {/* Vertical connect line down on the right (for even rows) */}
                  {!isLastRow && itemsPerRow === 4 && rowIndex % 2 === 0 && (
                    <div className="vertical-connector-right" />
                  )}
                  {!isLastRow && itemsPerRow === 2 && rowIndex % 2 === 0 && (
                    <div className="vertical-connector-right" />
                  )}

                  {/* Vertical connect line down on the left (for odd rows) */}
                  {!isLastRow && itemsPerRow === 4 && rowIndex % 2 === 1 && (
                    <div className="vertical-connector-left" />
                  )}
                  {!isLastRow && itemsPerRow === 2 && rowIndex % 2 === 1 && (
                    <div className="vertical-connector-left" />
                  )}

                  {visualEvents.map((event, colIndex) => {
                    // Check if it's the actual absolute first chronological event (Event index 0)
                    const isFirstChronologicalEvent = !isReversed 
                      ? (rowIndex === 0 && colIndex === 0)
                      : false; // Start is always column 0 in row 0, which is never reversed.

                    return (
                      <div key={event._id} className="timeline-node">
                        {/* Start Banner indicator */}
                        {isFirstChronologicalEvent && (
                          <div className="timeline-start-label">Start</div>
                        )}
                        
                        <div className="timeline-dot" />
                        <div className="timeline-year">{event.historicalYear || 'N/A'}</div>
                         <div 
                          className="timeline-card"
                          onClick={() => handleCardClick(event)}
                          onDoubleClick={() => handleCardDoubleClick(event.slug)}
                        >
                          {event.coverImage ? (
                            <div style={{ width: '100%', height: '110px', overflow: 'hidden', borderBottom: '1px solid #f3f4f6' }}>
                              <img 
                                src={getImgSrc(event.coverImage)} 
                                alt="" 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                              />
                            </div>
                          ) : (
                            <div style={{ width: '100%', height: '110px', background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f3f4f6' }}>
                              <FiFileText size={30} style={{ color: '#9ca3af' }} />
                            </div>
                          )}

                          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, textAlign: 'left' }}>
                            <span className="timeline-card-subcat">
                              {event.subCategory || 'Event'}
                            </span>
                            <h3 className="timeline-card-title">
                              {event.title}
                            </h3>
                            <p className="timeline-card-lead">
                              {event.lead}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>

      {/* Right Details/Preview Pane Overlay */}
      <div className={`kyp-preview-panel ${previewOpen ? 'open' : ''}`}>
        {selectedPreviewEvent && (
          <>
            <div className="kyp-preview-header">
              <button 
                className="kyp-preview-close" 
                onClick={() => setPreviewOpen(false)}
              >
                <FiX size={16} />
              </button>
            </div>

            {selectedPreviewEvent.coverImage && (
              <div className="kyp-preview-media-frame">
                <img 
                  src={getImgSrc(selectedPreviewEvent.coverImage)} 
                  alt="" 
                  className="kyp-preview-cover" 
                />
              </div>
            )}

            <div className="kyp-preview-filename-row">
              <FiFileText size={18} className="kyp-preview-doc-icon" />
              <h2 className="kyp-preview-title">{selectedPreviewEvent.title}</h2>
            </div>

            {/* Description collapsible segment with fog effect */}
            <div className="kyp-preview-details-section" style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: '16px' }}>
              <h3 className="kyp-preview-details-heading" style={{ marginBottom: '8px' }}>Description</h3>
              {isContentExceedingLimit(selectedPreviewEvent.content) ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="kyp-preview-description-wrapper collapsed">
                    <div 
                      className="kyp-preview-content"
                      dangerouslySetInnerHTML={{ __html: selectedPreviewEvent.content }}
                    />
                    <div className="kyp-preview-description-fog" />
                  </div>
                  <button 
                    type="button" 
                    className="kyp-preview-expand-btn"
                    onClick={() => {
                      setPreviewOpen(false);
                      navigate(`/article/${selectedPreviewEvent.slug}`);
                    }}
                  >
                    Show More
                  </button>
                </div>
              ) : (
                <div 
                  className="kyp-preview-content"
                  dangerouslySetInnerHTML={{ __html: selectedPreviewEvent.content || selectedPreviewEvent.lead }}
                />
              )}
            </div>

            {/* Structured action buttons below description */}
            <div className="kyp-preview-actions-bar" style={{ display: 'flex', gap: '8px', marginTop: 'auto', flexWrap: 'wrap' }}>
              <button 
                type="button"
                className="kyp-preview-properties-btn"
                onClick={() => {
                  setPreviewOpen(false);
                  navigate(`/article/${selectedPreviewEvent.slug}`);
                }}
                style={{ flex: 1.2, minWidth: '130px', border: '1px solid #d1d5db', background: 'transparent', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#374151', cursor: 'pointer' }}
              >
                See in Full Screen
              </button>

              <button 
                type="button"
                className="kyp-preview-discussion-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenComments(selectedPreviewEvent);
                }}
                style={{ flex: 1, minWidth: '110px' }}
              >
                <FiMessageSquare size={13} style={{ marginRight: '6px' }} /> Discussions
              </button>

              <button 
                type="button"
                className="kyp-preview-action-share-btn"
                onClick={(e) => handleShareClick(selectedPreviewEvent, e)}
                style={{ flex: 0.8, minWidth: '90px' }}
              >
                <FiShare2 size={13} style={{ marginRight: '6px' }} /> Share
              </button>
            </div>
          </>
        )}
      </div>

      {/* Real-time Comments Dialog Popup */}
      {commentsModalOpen && commentArticle && (
        <div className="kyp-comments-backdrop" onClick={() => setCommentsModalOpen(false)}>
          <div className="kyp-comments-modal" onClick={e => e.stopPropagation()}>
            <div className="kyp-comments-header">
              <h3 className="kyp-comments-header-title">{commentArticle.title}</h3>
              <button 
                type="button"
                onClick={() => setCommentsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center' }}
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="kyp-comments-body">
              {commentsLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div className="nm-spinner-ring" style={{ margin: '0 auto 12px auto' }} />
                  <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>Loading comments...</span>
                </div>
              ) : comments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
                  <FiMessageSquare size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                  <p style={{ fontSize: '13px', margin: 0 }}>No comments yet. Be the first to speak!</p>
                </div>
              ) : (
                comments.map((comment) => {
                  const authorName = comment.author?.name || 'Anonymous';
                  const avatarLetter = authorName.charAt(0).toUpperCase();
                  
                  return (
                    <div key={comment._id} className="kyp-comment-item">
                      <div className="kyp-comment-avatar">
                        {avatarLetter}
                      </div>
                      <div className="kyp-comment-content-box">
                        <div className="kyp-comment-author-name">{authorName}</div>
                        <p className="kyp-comment-text">{comment.text}</p>
                        <span className="kyp-comment-time">
                          {new Date(comment.createdAt).toLocaleDateString('en-GB')} {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="kyp-comments-footer">
              {user ? (
                <form className="kyp-comments-input-form" onSubmit={handleAddComment}>
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="kyp-comments-input"
                    maxLength={500}
                  />
                  <button 
                    type="submit" 
                    className="kyp-comments-send-btn"
                    disabled={!newCommentText.trim()}
                  >
                    <FiSend size={15} />
                  </button>
                </form>
              ) : (
                <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', fontWeight: 600 }}>
                  Please <a href="/login" style={{ color: '#3b82f6', textDecoration: 'underline' }}>login</a> to join the discussion.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Standardized Bottom Dock Pill */}
      <BottomNavPill
        activeTab="timeline"
        category="kyp"
        onPublishSuccess={fetchEvents}
        customTabs={[{ id: 'timeline', label: 'Timeline', icon: FiClock }]}
        showSearch={true}
        search={search}
        setSearch={setSearch}
        subCategory={subCategory}
        setSubCategory={setSubCategory}
        yearRange={yearRange}
        setYearRange={setYearRange}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        customStartYear={customStartYear}
        setCustomStartYear={setCustomStartYear}
        customEndYear={customEndYear}
        setCustomEndYear={setCustomEndYear}
        onSearchToggle={setSearchActive}
      />
    </main>
  );
};

export default KnowYourPastPage;
