import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { commentAPI } from '../services/api';
import { FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getImgSrc, timeAgo } from './NewsArticleCard';
import io from 'socket.io-client';

const CommentsPopupModal = ({ article, onClose }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const { user } = useAuth();
  const modalRef = useRef(null);

  useEffect(() => {
    if (!article) return;
    setIsClosing(false);
    const fetchComments = async () => {
      setLoading(true);
      try {
        const res = await commentAPI.getForArticle(article._id);
        setComments(res.data?.data || []);
      } catch (err) {
        console.error('Failed to load comments:', err);
        toast.error('Failed to load comments');
      } finally {
        setLoading(false);
      }
    };
    fetchComments();
  }, [article]);

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
      console.log(`CommentsPopupModal joined article room: article:${article._id}`);
    });

    socket.on('comment:new', (newComment) => {
      setComments((prev) => {
        if (prev.some((c) => c._id === newComment._id)) return prev;
        return [newComment, ...prev];
      });
    });

    socket.on('connect_error', (err) => {
      console.error('CommentsPopupModal socket connection error:', err);
    });

    return () => {
      socket.emit('article:leaveRoom', { articleId: article._id });
      socket.disconnect();
    };
  }, [article?._id]);

  const handleClose = () => {
    setIsClosing(true);
    // Wait for the absorb close animation to finish (300ms)
    setTimeout(() => {
      onClose();
    }, 300);
  };

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

  if (!article) return null;

  return (
    <div 
      className={`nm-modal-backdrop ${isClosing ? 'closing' : ''}`} 
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div 
        ref={modalRef}
        className={`nm-comments-modal ${isClosing ? 'closing' : ''}`}
      >
        <div className="nm-comments-modal-header">
          <span className="nm-comments-modal-cat">{article.category}</span>
          <button className="nm-comments-modal-close" onClick={handleClose}>
            <FiX size={20} />
          </button>
        </div>

        <div className="nm-comments-modal-body">
          {/* Article preview details */}
          <div className="nm-comments-modal-article-info">
            {article.coverImage && (
              <img
                src={getImgSrc(article.coverImage)}
                alt=""
                className="nm-comments-modal-cover"
              />
            )}
            <h2 className="nm-comments-modal-title">{article.title}</h2>
          </div>

          <div className="nm-comments-modal-divider" />

          {/* Comment Submission Form (Above Comments) */}
          <div className="nm-comments-modal-form-section">
            <h3 className="nm-comments-modal-section-title">Discussion ({comments.length})</h3>
            {user ? (
              <form onSubmit={handleSubmit} className="nm-comments-modal-form">
                <textarea
                  placeholder="Join the discussion..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  maxLength={1000}
                  required
                  className="nm-comments-modal-textarea"
                />
                <button
                  type="submit"
                  disabled={submitting || !commentText.trim()}
                  className="nm-comments-modal-submit-btn"
                >
                  {submitting ? 'Posting...' : 'Post Comment'}
                </button>
              </form>
            ) : (
              <p className="nm-comments-modal-login-prompt">
                Please <Link to="/login" onClick={handleClose} className="nm-comments-modal-login-link">Login</Link> to join the discussion.
              </p>
            )}
          </div>

          {/* Comments List */}
          <div className="nm-comments-modal-list">
            {loading ? (
              <div className="nm-mini-spinner" style={{ margin: '30px auto' }} />
            ) : comments.length === 0 ? (
              <p className="nm-comments-modal-empty">No comments yet. Be the first to share your thoughts!</p>
            ) : (
              comments.map((comment) => (
                <div key={comment._id} className="nm-comments-modal-item">
                  <img
                    src={getImgSrc(comment.author?.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author?.name || 'U')}&background=random`}
                    alt={comment.author?.name}
                    className="nm-comments-modal-item-avatar"
                  />
                  <div className="nm-comments-modal-item-content">
                    <div className="nm-comments-modal-item-meta">
                      <span className="nm-comments-modal-item-author">{comment.author?.name}</span>
                      <span className="nm-comments-modal-item-date">{timeAgo(comment.createdAt)}</span>
                    </div>
                    <p className="nm-comments-modal-item-text">{comment.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentsPopupModal;
