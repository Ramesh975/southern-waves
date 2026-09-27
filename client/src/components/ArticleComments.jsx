import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { commentAPI } from '../services/api';
import { getImageUrl } from './ArticleComponents';
import { formatDistanceToNow } from 'date-fns';
import { FiMoreVertical, FiEdit2, FiTrash2, FiChevronDown, FiChevronUp, FiLock } from 'react-icons/fi';
import toast from 'react-hot-toast';
import io from 'socket.io-client';

const AVATAR_COLORS = [
  '#0284c7', '#0d9488', '#16a34a', '#ca8a04',
  '#ea580c', '#e11d48', '#9333ea', '#4f46e5'
];

export const getAvatarColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export const ThumbUpIcon = ({ filled, size = 15 }) => (
  filled ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 21h3v-10H3v10zm19-11c0-.55-.45-1-1-1h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 3 7.59 9.59C7.22 9.95 7 10.45 7 11v8c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  )
);

export const ThumbDownIcon = ({ filled, size = 15 }) => (
  filled ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3h-3v10h3V3zm-19 11c0 .55.45 1 1 1h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 21l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2z" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
    </svg>
  )
);

export const CommentNode = ({
  comment,
  allComments,
  user,
  onReply,
  onEdit,
  onDelete,
  isBlocked,
  depth = 0,
  articleAuthorId = null,
}) => {
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [savingEdit, setSavingEdit] = useState(false);

  // Likes & Reaction State
  const [likes, setLikes] = useState(comment.likes || []);
  const [isLiked, setIsLiked] = useState(
    user && (comment.likes || []).some(id => (id._id || id).toString() === (user._id || user.id).toString())
  );
  const [isDisliked, setIsDisliked] = useState(false);

  // 3-dots Menu State
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const replies = allComments.filter(c => c.parentComment === comment._id);

  // Close 3-dots menu on click outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      await onReply(comment._id, replyText);
      setReplyText('');
      setShowReplyForm(false);
      setShowReplies(true);
    } catch (err) {
      /* handled by parent */
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editText.trim()) return;
    setSavingEdit(true);
    try {
      await onEdit(comment._id, editText);
      setIsEditing(false);
    } catch (err) {
      /* handled by parent */
    } finally {
      setSavingEdit(false);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast.error('Please login to like comments');
      return;
    }
    const currentUserId = user._id || user.id;
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    if (nextLiked) {
      setIsDisliked(false);
      setLikes(prev => [...prev, currentUserId]);
    } else {
      setLikes(prev => prev.filter(id => (id._id || id).toString() !== currentUserId.toString()));
    }

    try {
      await commentAPI.like(comment._id);
    } catch {
      setIsLiked(isLiked);
    }
  };

  const handleDislike = () => {
    if (!user) {
      toast.error('Please login to react to comments');
      return;
    }
    const currentUserId = user._id || user.id;
    const nextDisliked = !isDisliked;
    setIsDisliked(nextDisliked);
    if (nextDisliked && isLiked) {
      setIsLiked(false);
      setLikes(prev => prev.filter(id => (id._id || id).toString() !== currentUserId.toString()));
      commentAPI.like(comment._id).catch(() => {});
    }
  };

  const currentUserId = user?._id || user?.id;
  const isAuthor = currentUserId && (comment.author?._id === currentUserId || comment.author === currentUserId);
  const showDelete = isAuthor || (user && ['admin', 'editor', 'moderator'].includes(user.role));
  const isArticleAuthor = articleAuthorId && (
    (comment.author?._id || comment.author)?.toString() === articleAuthorId.toString()
  );

  const authorHandle = comment.author?.username
    ? `@${comment.author.username}`
    : comment.author?.name
      ? `@${comment.author.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`
      : '@anonymous';

  const timeAgoText = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true });
    } catch {
      return 'recently';
    }
  }, [comment.createdAt]);

  const avatarColor = getAvatarColor(comment.author?.name || 'User');
  const avatarLetter = (comment.author?.name || 'U')[0].toUpperCase();

  return (
    <div className={`yt-comment-node depth-${Math.min(depth, 3)}`}>
      <div className="yt-comment-main">
        {/* Left: Avatar */}
        <div className="yt-comment-avatar">
          {comment.author?.avatar ? (
            <img
              src={getImageUrl(comment.author.avatar)}
              alt={comment.author?.name || 'User'}
              className="yt-comment-avatar-img"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const letterEl = e.currentTarget.parentElement?.querySelector('.yt-comment-avatar-letter');
                if (letterEl) letterEl.style.display = 'flex';
              }}
            />
          ) : null}
          <div
            className="yt-comment-avatar-letter"
            style={{
              backgroundColor: avatarColor,
              display: comment.author?.avatar ? 'none' : 'flex'
            }}
          >
            {avatarLetter}
          </div>
        </div>

        {/* Right: Content Column */}
        <div className="yt-comment-content">
          {/* Header Row */}
          <div className="yt-comment-header">
            <div className="yt-comment-user-info">
              <span className="yt-comment-handle">{authorHandle}</span>
              {isArticleAuthor && (
                <span className="yt-comment-author-pill">Author</span>
              )}
              <span className="yt-comment-time">{timeAgoText}</span>
              {comment.isEdited && (
                <span className="yt-comment-edited">(edited)</span>
              )}
            </div>

            {/* 3-dots Menu */}
            {(isAuthor || showDelete) && (
              <div className="yt-comment-menu-wrap" ref={menuRef}>
                <button
                  className="yt-comment-menu-btn"
                  onClick={() => setMenuOpen(v => !v)}
                  aria-label="Comment options"
                  title="More options"
                >
                  <FiMoreVertical size={16} />
                </button>

                {menuOpen && (
                  <div className="yt-comment-popover">
                    {isAuthor && (
                      <button
                        className="yt-popover-item"
                        onClick={() => {
                          setMenuOpen(false);
                          setIsEditing(true);
                          setEditText(comment.text);
                        }}
                      >
                        <FiEdit2 size={13} />
                        <span>Edit</span>
                      </button>
                    )}
                    {showDelete && (
                      <button
                        className="yt-popover-item delete-item"
                        onClick={() => {
                          setMenuOpen(false);
                          onDelete(comment._id);
                        }}
                      >
                        <FiTrash2 size={13} />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Comment Body */}
          {isEditing ? (
            <form onSubmit={handleEditSubmit} className="yt-edit-form">
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                className="yt-edit-textarea"
                rows={2}
                required
                autoFocus
              />
              <div className="yt-edit-actions">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="yt-btn-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit || !editText.trim()}
                  className="yt-btn-primary"
                >
                  {savingEdit ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          ) : (
            <p className="yt-comment-text">{comment.text}</p>
          )}

          {/* Action Bar (Thumbs Up, Thumbs Down, Reply) */}
          <div className="yt-comment-actions">
            <button
              className={`yt-action-icon-btn${isLiked ? ' active' : ''}`}
              onClick={handleLike}
              title="Like"
              aria-label="Like comment"
            >
              <ThumbUpIcon filled={isLiked} size={15} />
              {likes.length > 0 && <span className="yt-action-count">{likes.length}</span>}
            </button>

            <button
              className={`yt-action-icon-btn${isDisliked ? ' active-dislike' : ''}`}
              onClick={handleDislike}
              title="Dislike"
              aria-label="Dislike comment"
            >
              <ThumbDownIcon filled={isDisliked} size={15} />
            </button>

            {user && !isBlocked && (
              <button
                className={`yt-reply-btn${showReplyForm ? ' active' : ''}`}
                onClick={() => setShowReplyForm(v => !v)}
              >
                Reply
              </button>
            )}
          </div>

          {/* Inline Reply Form */}
          {showReplyForm && (
            <form onSubmit={handleReplySubmit} className="yt-reply-form">
              <div className="yt-reply-avatar">
                {user?.avatar ? (
                  <img src={getImageUrl(user.avatar)} alt={user.name} />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      backgroundColor: getAvatarColor(user?.name || ''),
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700
                    }}
                  >
                    {(user?.name || 'U')[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="yt-reply-input-box">
                <textarea
                  placeholder="Add a reply..."
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  className="yt-reply-textarea"
                  rows={1}
                  required
                  autoFocus
                />
                <div className="yt-reply-actions">
                  <button
                    type="button"
                    className="yt-btn-text"
                    onClick={() => setShowReplyForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="yt-btn-primary"
                    disabled={submitting || !replyText.trim()}
                  >
                    {submitting ? 'Posting...' : 'Reply'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Nested Replies Dropdown Toggle (YouTube curved branch line + X replies) */}
          {replies.length > 0 && (
            <div className="yt-replies-wrap">
              <button
                className="yt-replies-toggle-btn"
                onClick={() => setShowReplies(v => !v)}
              >
                {showReplies ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                <span>
                  {showReplies ? 'Hide ' : ''}
                  {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                </span>
              </button>

              {showReplies && (
                <div className="yt-replies-list">
                  {replies.map(reply => (
                    <CommentNode
                      key={reply._id}
                      comment={reply}
                      allComments={allComments}
                      user={user}
                      onReply={onReply}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      isBlocked={isBlocked}
                      depth={depth + 1}
                      articleAuthorId={articleAuthorId}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ArticleComments = ({
  articleId,
  articleAuthorId = null,
  initialComments = null,
  isLocked = false,
  commentsDisabled = false,
  globalCommentLock = false,
  isBlocked = false,
  isModerator = false,
  isPopup = false,
  showHeader = true,
  title = null,
  onCommentsUpdate = null,
}) => {
  const { user } = useAuth();
  const [comments, setComments] = useState(initialComments || []);
  const [loading, setLoading] = useState(!initialComments);
  const [commentText, setCommentText] = useState('');
  const [commentInputFocused, setCommentInputFocused] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);

  // Sync when initialComments updates from parent
  useEffect(() => {
    if (initialComments) {
      setComments(initialComments);
      setLoading(false);
    }
  }, [initialComments]);

  // Fetch comments if initialComments was not provided
  useEffect(() => {
    if (initialComments !== null || !articleId) return;
    let isMounted = true;
    setLoading(true);

    commentAPI.getForArticle(articleId)
      .then((res) => {
        if (!isMounted) return;
        const fetched = res.data?.data || [];
        setComments(fetched);
        if (onCommentsUpdate) onCommentsUpdate(fetched);
      })
      .catch((err) => {
        console.error('Failed to load comments:', err);
        toast.error('Failed to load comments');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [articleId, initialComments]);

  // Real-time socket connection for live comments
  useEffect(() => {
    if (!articleId) return;

    const SOCKET_URL = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace('/api', '') 
      : 'http://localhost:5000';

    const socket = io(SOCKET_URL, { 
      withCredentials: true,
      forceNew: true,
      multiplex: false 
    });

    socket.on('connect', () => {
      socket.emit('article:joinRoom', { articleId });
    });

    socket.on('comment:new', (newComment) => {
      setComments((prev) => {
        if (prev.some((c) => c._id === newComment._id)) return prev;
        const updated = [...prev, newComment];
        if (onCommentsUpdate) onCommentsUpdate(updated);
        return updated;
      });
    });

    socket.on('comment:edited', (updatedComment) => {
      setComments((prev) => {
        const updated = prev.map(c => c._id === updatedComment._id ? { ...c, text: updatedComment.text, isEdited: true } : c);
        if (onCommentsUpdate) onCommentsUpdate(updated);
        return updated;
      });
    });

    socket.on('comment:deleted', (data) => {
      const delId = data?.commentId || data;
      setComments((prev) => {
        const updated = prev.filter(c => c._id !== delId);
        if (onCommentsUpdate) onCommentsUpdate(updated);
        return updated;
      });
    });

    socket.on('connect_error', (err) => {
      console.error('ArticleComments socket error:', err);
    });

    return () => {
      socket.emit('article:leaveRoom', { articleId });
      socket.disconnect();
    };
  }, [articleId]);

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    if ((isLocked || commentsDisabled || globalCommentLock) && !isModerator) {
      return toast.error('Comments are temporarily locked.');
    }
    setSubmittingComment(true);
    try {
      const res = await commentAPI.add(articleId, { text: commentText });
      if (res.data?.success) {
        const postedComment = res.data.data;
        setComments(prev => {
          if (prev.some((c) => c._id === postedComment._id)) return prev;
          const updated = [...prev, postedComment];
          if (onCommentsUpdate) onCommentsUpdate(updated);
          return updated;
        });
      }
      setCommentText('');
      setCommentInputFocused(false);
      setShowAllComments(true);
      toast.success('Comment posted!');
    } catch (err) {
      if (err.response?.data?.blocked) {
        toast.error('Your comment contained harmful content. Your account has been temporarily suspended.');
      } else {
        toast.error(err.response?.data?.message || 'Failed to post comment');
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReplyComment = async (parentCommentId, text) => {
    if ((isLocked || commentsDisabled || globalCommentLock) && !isModerator) {
      return toast.error('Comments are temporarily locked.');
    }
    try {
      const res = await commentAPI.add(articleId, { text, parentComment: parentCommentId });
      if (res.data?.success) {
        const newReply = res.data.data;
        setComments(prev => {
          if (prev.some((c) => c._id === newReply._id)) return prev;
          const updated = [...prev, newReply];
          if (onCommentsUpdate) onCommentsUpdate(updated);
          return updated;
        });
        toast.success('Reply posted!');
      }
    } catch (err) {
      if (err.response?.data?.blocked) {
        toast.error('Your comment contained harmful content. Your account has been temporarily suspended.');
      } else {
        toast.error(err.response?.data?.message || 'Failed to post reply');
      }
      throw err;
    }
  };

  const handleEditComment = async (commentId, newText) => {
    try {
      const res = await commentAPI.edit(commentId, { text: newText });
      if (res.data?.success) {
        setComments(prev => {
          const updated = prev.map(c => c._id === commentId ? { ...c, text: newText, isEdited: true } : c);
          if (onCommentsUpdate) onCommentsUpdate(updated);
          return updated;
        });
        toast.success('Comment updated');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to edit comment');
      throw err;
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment? This cannot be undone.')) return;
    try {
      await commentAPI.delete(commentId);
      setComments(prev => {
        const updated = prev.filter(c => c._id !== commentId);
        if (onCommentsUpdate) onCommentsUpdate(updated);
        return updated;
      });
      toast.success('Comment deleted');
    } catch (err) {
      toast.error('Failed to delete comment');
    }
  };

  const isLockedState = isLocked || commentsDisabled || globalCommentLock;
  const topLevelComments = comments.filter(c => !c.parentComment);

  return (
    <section className={`article-comments ${isPopup ? 'article-comments-popup' : ''}`} id="comments">
      {showHeader && (
        <h3 className="section-title" style={{ fontSize: isPopup ? 16 : 18, marginBottom: 16 }}>
          {title || 'Comments'}{' '}
          <span style={{ fontSize: 14, color: 'var(--color-gray-500)', fontWeight: 400 }}>
            ({comments.length})
          </span>
        </h3>
      )}

      {/* Lock Notice */}
      {isLockedState ? (
        <div style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 20,
          background: 'rgba(239,68,68,0.05)',
          border: '1px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
          color: '#ef4444', fontWeight: 600,
        }}>
          <FiLock size={16} />
          Comments are currently locked for this content.
        </div>
      ) : user && !isBlocked ? (
        /* Top Main Comment Form */
        <form className="yt-main-comment-form" onSubmit={handleComment}>
          <div className="yt-main-comment-avatar">
            {user?.avatar ? (
              <img src={getImageUrl(user.avatar)} alt={user.name} />
            ) : (
              <div
                className="yt-comment-avatar-letter"
                style={{
                  backgroundColor: getAvatarColor(user?.name || 'User')
                }}
              >
                {(user?.name || 'U')[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="yt-main-comment-input-area">
            <textarea
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onFocus={() => setCommentInputFocused(true)}
              maxLength={1000}
              rows={commentInputFocused || commentText ? 2 : 1}
              className="yt-main-comment-textarea"
              required
            />
            {(commentInputFocused || commentText) && (
              <div className="yt-main-comment-actions">
                <button
                  type="button"
                  className="yt-btn-text"
                  onClick={() => {
                    setCommentText('');
                    setCommentInputFocused(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="yt-btn-primary"
                  disabled={submittingComment || !commentText.trim()}
                >
                  {submittingComment ? 'Posting...' : 'Comment'}
                </button>
              </div>
            )}
          </div>
        </form>
      ) : user && isBlocked ? (
        <div style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 20,
          background: 'rgba(239,68,68,0.05)',
          border: '1px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
          color: '#ef4444', fontWeight: 600,
        }}>
          <span style={{ fontSize: 16 }}>🛑</span>
          Your account is currently suspended. You cannot post comments until the suspension is lifted.
        </div>
      ) : (
        <p style={{ fontSize: 14, color: 'var(--color-gray-600)', marginBottom: 20 }}>
          <Link to="/login" style={{ color: 'var(--color-red, #dc2626)', fontWeight: 600 }}>Login</Link> to post a comment.
        </p>
      )}

      {/* Comments List */}
      <div style={{ marginTop: 16, position: 'relative' }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-gray-400)' }}>
            Loading comments...
          </div>
        ) : comments.length === 0 ? (
          <p style={{ fontSize: 14, color: 'var(--color-gray-500)', margin: '16px 0' }}>
            No comments yet. Be the first to share your thoughts!
          </p>
        ) : (
          <div className={`comments-list-wrapper ${!isPopup && !showAllComments && comments.length > 6 ? 'collapsed' : ''}`}>
            <div className="comments-list-inner">
              {topLevelComments.map((c) => (
                <CommentNode
                  key={c._id}
                  comment={c}
                  allComments={comments}
                  user={user}
                  onReply={handleReplyComment}
                  onEdit={handleEditComment}
                  onDelete={handleDeleteComment}
                  isBlocked={isBlocked}
                  articleAuthorId={articleAuthorId}
                />
              ))}
            </div>
            {!isPopup && !showAllComments && comments.length > 6 && (
              <div className="comments-fog-overlay">
                <button type="button" className="btn-read-more" onClick={() => setShowAllComments(true)}>
                  Read More Comments ({comments.length - 6} more)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default ArticleComments;
