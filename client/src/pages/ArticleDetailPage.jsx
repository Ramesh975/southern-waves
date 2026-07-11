import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { articleAPI, commentAPI, authAPI, filterAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { getImageUrl, getCategoryLabel, getCategoryPath } from '../components/ArticleComponents';
import ShareRail from '../components/ShareRail';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import { FiHeart, FiMessageCircle, FiCornerUpLeft, FiBookmark, FiThumbsDown, FiLock, FiSlash, FiUnlock, FiTrash2 } from 'react-icons/fi';
import ImageLightbox from '../components/ImageLightbox';

const SOCKET_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

const MAX_DEPTH = 3;

const CommentNode = ({ comment, allComments, user, onReply, onDelete, isBlocked, depth = 0 }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const replies = allComments.filter(c => c.parentComment === comment._id);

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      await onReply(comment._id, replyText);
      setReplyText('');
      setShowReplyForm(false);
    } catch (err) { /* handled by parent */ }
    finally { setSubmitting(false); }
  };

  const isAuthor = user && (comment.author?._id === user._id || comment.author === user._id);
  const showDelete = isAuthor || (user && ['admin', 'editor', 'moderator'].includes(user.role));

  if (isCollapsed) {
    return (
      <div className="cn-collapsed" onClick={() => setIsCollapsed(false)}>
        <div className="cn-collapsed-avatar">
          {comment.author?.avatar
            ? <img src={getImageUrl(comment.author.avatar)} alt={comment.author.name} />
            : comment.author?.name?.[0]?.toUpperCase()}
        </div>
        <span className="cn-collapsed-name">{comment.author?.name}</span>
        <span className="cn-collapsed-badge">
          {replies.length > 0
            ? `${replies.length} repl${replies.length === 1 ? 'y' : 'ies'} hidden`
            : 'collapsed'}
        </span>
        <span className="cn-collapsed-expand">↓ expand</span>
      </div>
    );
  }

  return (
    <div className="cn-root">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="cn-header">
        <button className="cn-collapse-btn" onClick={() => setIsCollapsed(true)} title="Collapse thread">
          <span>−</span>
        </button>
        <div className="cn-avatar">
          {comment.author?.avatar
            ? <img src={getImageUrl(comment.author.avatar)} alt={comment.author.name} />
            : comment.author?.name?.[0]?.toUpperCase()}
        </div>
        <div className="cn-meta">
          <span className="cn-author">{comment.author?.name || 'Anonymous'}</span>
          <span className="cn-dot">·</span>
          <span className="cn-time">{format(new Date(comment.createdAt), 'MMM d · h:mm a')}</span>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────── */}
      <div className="cn-body">
        {/* Vertical thread line — only when there are replies */}
        {(replies.length > 0 || showReplyForm) && (
          <div className="cn-guide" onClick={() => setIsCollapsed(true)} title="Collapse" />
        )}

        <div className="cn-content">
          <p className="cn-text">{comment.text}</p>

          {/* ── Action Bar ─────────────────────────────── */}
          <div className="cn-actions">
            {user && !isBlocked && (
              <button
                className={`cn-action-btn reply-btn${showReplyForm ? ' active' : ''}`}
                onClick={() => setShowReplyForm(v => !v)}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 17 4 12 9 7"/>
                  <path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
                </svg>
                {showReplyForm ? 'Cancel' : 'Reply'}
              </button>
            )}
            {showDelete && (
              <button className="cn-action-btn delete-btn" onClick={() => onDelete(comment._id)}>
                <FiTrash2 size={11} />
                Delete
              </button>
            )}
          </div>

          {/* ── Inline Reply Form ──────────────────────── */}
          {showReplyForm && (
            <form onSubmit={handleReplySubmit} className="cn-reply-form">
              <p className="cn-reply-label">↳ Replying to <strong>{comment.author?.name}</strong></p>
              <textarea
                autoFocus
                placeholder="Write your reply…"
                rows={3}
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                className="cn-reply-textarea"
                required
              />
              <div className="cn-reply-form-actions">
                <button type="button" className="cn-reply-cancel" onClick={() => setShowReplyForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="cn-reply-submit" disabled={submitting || !replyText.trim()}>
                  {submitting ? 'Posting…' : 'Post Reply'}
                </button>
              </div>
            </form>
          )}

          {/* ── Nested Replies ─────────────────────────── */}
          {replies.length > 0 && (
            <div className={`cn-replies${depth >= MAX_DEPTH ? ' cn-replies--flat' : ''}`}>
              {replies.map(reply => (
                <CommentNode
                  key={reply._id}
                  comment={reply}
                  allComments={allComments}
                  user={user}
                  onReply={onReply}
                  onDelete={onDelete}
                  isBlocked={isBlocked}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


const ArticleDetailPage = () => {
  const { slug } = useParams();
  const { user, isModerator, isEditor, isBlocked } = useAuth();
  const { setIsOpen, setReplyToArticle } = useChat();
  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [fontScale, setFontScale] = useState(1);
  const [isSaved, setIsSaved] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const socketRef = useRef(null);
  // Moderation state
  const [isLocked, setIsLocked] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [moderating, setModerating] = useState(false);
  const [globalCommentLock, setGlobalCommentLock] = useState(false);
  const [commentsDisabled, setCommentsDisabled] = useState(false);
  const [chatDisabled, setChatDisabled] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const handleReplyClick = () => {
    if (!article) return;
    if (!user) {
      toast.error('Please login to discuss in chat');
      return;
    }
    setReplyToArticle(article);
    setIsOpen(true);
  };

  const handleCommentClick = () => {
    document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (user && article) {
      const saved = user.savedArticles?.some(a => (a._id || a) === article._id);
      setIsSaved(saved);
    }
  }, [user, article]);

  const handleToggleSave = async () => {
    if (!user) {
      toast.error('Please login to save articles');
      return;
    }
    try {
      if (isSaved) {
        await authAPI.unsaveArticle(article._id);
        setIsSaved(false);
        toast.success('Article removed from saved');
      } else {
        await authAPI.saveArticle(article._id);
        setIsSaved(true);
        toast.success('Article saved for later');
      }
      // Trigger a re-fetch of user if needed, or rely on local state
    } catch (err) {
      toast.error('Failed to update saved status');
    }
  };

  const hasLiked = user && article?.likes?.includes(user._id);
  const hasDisliked = user && article?.dislikes?.includes(user._id);

  const handleReaction = async (type) => {
    if (!user) {
      toast.error('Please login to react to this article');
      return;
    }

    try {
      let res;
      if (type === 'like') {
        res = await articleAPI.like(article._id);
      } else {
        res = await articleAPI.dislike(article._id);
      }

      setArticle((prev) => ({
        ...prev,
        likes: res.data.likes,
        dislikes: res.data.dislikes,
      }));
    } catch (err) {
      toast.error('Failed to update reaction');
    }
  };

  useEffect(() => {
    setLoading(true);
    setShowAllComments(false); // Reset comment collapse when navigating
    articleAPI.getBySlug(slug)
      .then((res) => {
        const fetchedArticle = res.data.data;
        setArticle(fetchedArticle);
        setRelated(res.data.related || []);
        setComments(res.data.comments || []);
        setIsLocked(fetchedArticle.isLocked || fetchedArticle.commentsDisabled || false);
        setIsBanned(fetchedArticle.isBanned || false);
        setCommentsDisabled(fetchedArticle.commentsDisabled || false);
        setChatDisabled(fetchedArticle.chatDisabled || false);

        // Fetch global lock settings
        filterAPI.getSettings()
          .then((settingsRes) => {
            if (settingsRes.data?.success) {
              setGlobalCommentLock(settingsRes.data.data.globalCommentLock || false);
            }
          })
          .catch((err) => {
            console.error('Failed to load global lock settings', err);
          });

        // Fetch user recommendations
        articleAPI.getRecommendations()
          .then((recRes) => {
            setRecommendations(recRes.data.data || []);
          })
          .catch((err) => {
            console.error('Failed to fetch recommendations', err);
          });
      })
      .catch(() => toast.error('Article not found'))
      .finally(() => setLoading(false));
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    if (!article?._id) return;

    // Connect socket and join this article's room for real-time comments
    const socket = io(SOCKET_URL, { 
      withCredentials: true,
      forceNew: true,
      multiplex: false 
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('article:joinRoom', { articleId: article._id });
      console.log(`ArticleDetailPage joined article room: article:${article._id}`);
    });

    socket.on('comment:new', (newComment) => {
      setComments((prev) => {
        if (prev.some((c) => c._id === newComment._id)) return prev;
        return [...prev, newComment];
      });
    });

    socket.on('connect_error', (err) => {
      console.error('ArticleDetailPage socket connection error:', err);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('article:leaveRoom', { articleId: article._id });
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [article?._id]);

  useEffect(() => {
    const handleScroll = () => {
      const articleBody = document.querySelector('.article-body');
      if (!articleBody) return;

      const rect = articleBody.getBoundingClientRect();
      const articleHeight = rect.height;
      // How much of the article body has scrolled past the top of the viewport
      const scrolledPast = -rect.top;
      // We only care about scrolling until the bottom of the article body reaches the bottom of the viewport
      const viewportHeight = window.innerHeight;
      const scrollableHeight = articleHeight - viewportHeight + 100; // buffer

      if (scrollableHeight <= 0) {
        setScrollProgress(0);
        return;
      }

      const progress = (scrolledPast / scrollableHeight) * 100;
      setScrollProgress(Math.min(Math.max(progress, 0), 100));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [article]);

  // Inject lightbox click handlers on images in article body
  useEffect(() => {
    if (!article) return;
    // Small timeout to let dangerouslySetInnerHTML render
    const timer = setTimeout(() => {
      const articleBody = document.querySelector('.article-body');
      if (!articleBody) return;
      const imgs = articleBody.querySelectorAll('img');
      imgs.forEach(img => {
        img.style.cursor = 'zoom-in';
        const handler = () => setLightboxSrc(img.src);
        img.addEventListener('click', handler);
        img._lightboxHandler = handler;
      });
      return () => {
        imgs.forEach(img => {
          if (img._lightboxHandler) {
            img.removeEventListener('click', img._lightboxHandler);
          }
        });
      };
    }, 100);
    return () => clearTimeout(timer);
  }, [article]);

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    if ((isLocked || globalCommentLock) && !isModerator) {
      return toast.error('Comments are temporarily locked.');
    }
    setSubmittingComment(true);
    try {
      const res = await commentAPI.add(article._id, { text: commentText });
      if (res.data?.success) {
        const postedComment = res.data.data;
        setComments(prev => {
          if (prev.some((c) => c._id === postedComment._id)) return prev;
          return [...prev, postedComment];
        });
      }
      setCommentText('');
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
    if ((isLocked || globalCommentLock) && !isModerator) {
      return toast.error('Comments are temporarily locked.');
    }
    try {
      const res = await commentAPI.add(article._id, { text, parentComment: parentCommentId });
      if (res.data?.success) {
        const newReply = res.data.data;
        setComments(prev => {
          if (prev.some((c) => c._id === newReply._id)) return prev;
          return [...prev, newReply];
        });
        toast.success('Reply posted!');
      }
    } catch (err) {
      if (err.response?.data?.blocked) {
        toast.error('Your comment contained harmful content. Your account has been temporarily suspended.');
      } else {
        toast.error(err.response?.data?.message || 'Failed to post reply');
      }
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment? This cannot be undone.')) return;
    try {
      await commentAPI.delete(commentId);
      setComments(prev => prev.filter(c => c._id !== commentId));
      toast.success('Comment deleted');
    } catch (err) {
      toast.error('Failed to delete comment');
    }
  };

  const handleLock = async () => {
    setModerating(true);
    try {
      const res = await filterAPI.lockArticle(article._id, !isLocked);
      setIsLocked(res.data.data.isLocked);
      toast.success(res.data.message);
    } catch {
      toast.error('Failed to update lock state');
    } finally {
      setModerating(false);
    }
  };

  const handleBan = async () => {
    if (!window.confirm(isBanned ? 'Unban this article?' : 'Ban this article? It will be hidden from all listings.')) return;
    setModerating(true);
    try {
      const res = await filterAPI.banArticle(article._id, !isBanned);
      setIsBanned(res.data.data.isBanned);
      toast.success(res.data.message);
    } catch {
      toast.error('Failed to update ban state');
    } finally {
      setModerating(false);
    }
  };

  const handleToggleComments = async () => {
    setModerating(true);
    try {
      const res = await filterAPI.toggleArticleSecurity(article._id, {
        commentsDisabled: !commentsDisabled,
      });
      if (res.data?.success) {
        setCommentsDisabled(!commentsDisabled);
        setIsLocked(article.isLocked || !commentsDisabled);
        toast.success(`Comments are now ${!commentsDisabled ? 'disabled' : 'enabled'} for this article.`);
      }
    } catch {
      toast.error('Failed to update article comments security');
    } finally {
      setModerating(false);
    }
  };

  const handleToggleChat = async () => {
    setModerating(true);
    try {
      const res = await filterAPI.toggleArticleSecurity(article._id, {
        chatDisabled: !chatDisabled,
      });
      if (res.data?.success) {
        setChatDisabled(!chatDisabled);
        toast.success(`Chat is now ${!chatDisabled ? 'disabled' : 'enabled'} for this article.`);
      }
    } catch {
      toast.error('Failed to update article chat security');
    } finally {
      setModerating(false);
    }
  };

  const calculateReadingTime = (htmlContent) => {
    if (!htmlContent) return 1;
    const text = htmlContent.replace(/<[^>]*>/g, '');
    const words = text.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 225));
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (!article) return <div className="container" style={{ padding: '48px 0', textAlign: 'center' }}>Article not found.</div>;

  const getDynamicPostTypeName = (art) => {
    if (!art) return '';
    if (art.category === 'tea-shop') {
      if (art.tags?.includes('spoken')) return 'Spoken';
      if (art.tags?.includes('ground')) return 'Ground';
      if (art.tags?.includes('mind')) return 'Mind';
      return 'Tea Shop';
    }
    return getCategoryLabel(art.category);
  };

  const getDynamicPostTypePath = (art) => {
    if (!art) return '/';
    if (art.category === 'tea-shop') {
      if (art.tags?.includes('spoken')) return '/tea-shop?tab=spoken';
      if (art.tags?.includes('ground')) return '/tea-shop?tab=ground';
      if (art.tags?.includes('mind')) return '/tea-shop?tab=home';
      return '/tea-shop';
    }
    return getCategoryPath(art.category);
  };

  const categoryPath = getDynamicPostTypePath(article);
  const categoryLabel = getDynamicPostTypeName(article);
  const readingTime = calculateReadingTime(article.body);

  // Combine all available recommendation & related sources to build a pool
  const allUnique = [];
  const seenIds = new Set();
  [...related, ...recommendations].forEach(art => {
    if (art && art._id !== article._id && !seenIds.has(art._id)) {
      seenIds.add(art._id);
      allUnique.push(art);
    }
  });

  // Calculate scores for author stories suggestions: same author first, taste-wise/tag-wise first, then others
  const getAuthorSuggestionScore = (art) => {
    const artAuthorId = art.author?._id || art.author;
    const currentAuthorId = article.author?._id || article.author;
    const isSameAuthor = artAuthorId && currentAuthorId && artAuthorId.toString() === currentAuthorId.toString();
    const tagOverlap = art.tags?.filter(t => article.tags?.includes(t)).length || 0;
    const catMatch = art.category === article.category ? 1 : 0;

    let score = 0;
    if (isSameAuthor) {
      score += 1000;
      score += tagOverlap * 10;
      score += catMatch * 5;
    } else {
      score += tagOverlap * 5;
      score += catMatch * 2;
    }
    return score;
  };

  const sortedAuthorSuggestions = [...allUnique]
    .sort((a, b) => getAuthorSuggestionScore(b) - getAuthorSuggestionScore(a))
    .slice(0, 3);

  // Recommend by Tag section: find articles that share at least one tag
  const recommendByTagArticles = allUnique
    .filter(art => art.tags?.some(t => article.tags?.includes(t)))
    .slice(0, 3);

  // If we have fewer than 3 tag-matched articles, fill with other unique recommendations
  let finalTagRecommendations = [...recommendByTagArticles];
  if (finalTagRecommendations.length < 3) {
    const filledIds = new Set(finalTagRecommendations.map(a => a._id));
    for (const art of allUnique) {
      if (finalTagRecommendations.length >= 3) break;
      if (!filledIds.has(art._id)) {
        finalTagRecommendations.push(art);
        filledIds.add(art._id);
      }
    }
  }

  // Filter out current article and limit related to exactly 3
  const relatedArticles = related.filter((a) => a._id !== article._id).slice(0, 3);

  // Truncate title for breadcrumb
  const truncatedTitle = article.title.length > 35 ? article.title.substring(0, 35) + '...' : article.title;

  return (
    <>
      <main className="article-detail-page-v2">
      {/* Reading progress bar */}
      <div className="reading-progress-container">
        <div className="reading-progress-bar" style={{ width: `${scrollProgress}%` }} />
      </div>

      <div className="container">
        {/* Breadcrumb (Home > Category > Title) */}
        <nav className="article-breadcrumb-v2" aria-label="breadcrumb">
          <Link to="/">Home</Link>
          <span className="bc-separator">/</span>
          <Link to={categoryPath}>{categoryLabel}</Link>
          <span className="bc-separator">/</span>
          <span className="bc-current">{truncatedTitle}</span>
        </nav>

        <div className="article-reading-layout" style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          {/* Sticky Left Rail sharing bar */}
          <ShareRail title={article.title} url={window.location.href} />

          {/* Main Reading Column */}
          <article 
            className="article-main-content" 
            style={{ 
              '--article-font-scale': fontScale,
              flex: 1,
              minWidth: 0,
              paddingRight: (article.references && article.references.length > 0) ? '24px' : '0',
              borderRight: (article.references && article.references.length > 0) ? '1.5px solid var(--color-gray-200, #e5e7eb)' : 'none'
            }}
          >

            {/* ─── Moderator Action Bar ─── */}
            {(isModerator || isEditor) && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                marginBottom: 16, padding: '10px 14px',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(99,102,241,0.04))',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 8, fontSize: 12,
              }}>
                <span style={{ fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: 10, marginRight: 4 }}>
                  🛡 Moderation Controls
                </span>

                {isModerator && (
                  <button
                    onClick={handleBan}
                    disabled={moderating}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '5px 12px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 11,
                      background: isBanned ? '#22c55e' : '#ef4444', color: '#fff',
                      opacity: moderating ? 0.6 : 1,
                    }}
                  >
                    {isBanned ? <><FiSlash size={11} /> Unban Article</> : <><FiSlash size={11} /> Ban Article</>}
                  </button>
                )}

                <button
                  onClick={handleToggleComments}
                  disabled={moderating}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '5px 12px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 11,
                    background: commentsDisabled ? '#22c55e' : '#e11d48', color: '#fff',
                    opacity: moderating ? 0.6 : 1,
                  }}
                >
                  {commentsDisabled ? <><FiUnlock size={11} /> Enable Comments</> : <><FiLock size={11} /> Disable Comments</>}
                </button>
                <button
                  onClick={handleToggleChat}
                  disabled={moderating}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '5px 12px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 11,
                    background: chatDisabled ? '#22c55e' : '#e11d48', color: '#fff',
                    opacity: moderating ? 0.6 : 1,
                  }}
                >
                  {chatDisabled ? <><FiUnlock size={11} /> Enable Discussion Chat</> : <><FiLock size={11} /> Disable Discussion Chat</>}
                </button>

                {isLocked && <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>⚠️ Locked</span>}
                {isBanned && <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>⚠️ Banned</span>}
              </div>
            )}

            {/* Locked banner for non-moderators */}
            {isLocked && !isModerator && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', marginBottom: 16,
                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 8, fontSize: 12, color: '#ef4444', fontWeight: 700,
              }}>
                <FiLock size={13} /> Comments have been locked on this article by a moderator.
              </div>
            )}

            {/* Eyebrow category */}
            <span className="article-eyebrow">{categoryLabel.toUpperCase()}</span>

            {/* Headline */}
            <h1 className="article-headline-v2">{article.title}</h1>

            {/* Dek / Subheading */}
            {article.dek && <p className="article-dek-v2">{article.dek}</p>}

            {/* Byline Row */}
            <div className="article-byline-v2">
              <div className="author-avatar-circle">
                {article.author?.avatar ? (
                  <img src={getImageUrl(article.author.avatar)} alt={article.author.name} />
                ) : (
                  article.author?.name?.[0]?.toUpperCase()
                )}
              </div>
              <div className="author-meta-info">
                <span className="author-name">By <strong>{article.author?.name}</strong></span>
                <div className="publish-date-read">
                  <span>{format(new Date(article.publishedAt || article.createdAt), 'MMMM dd, yyyy')}</span>
                  <span className="meta-dot">•</span>
                  <span>⏱️ {readingTime} min read</span>
                </div>
              </div>
            </div>

            {/* Premium Unified Toolbar */}
            <div className="article-toolbar-v2">
              <div className="toolbar-left">
                {/* LIKE — always available to logged-in users including blocked */}
                <button
                  onClick={() => handleReaction('like')}
                  className={`toolbar-btn hype-btn ${hasLiked ? 'active' : ''}`}
                  title={hasLiked ? "Unlike" : "Hype Story"}
                >
                  <FiHeart size={18} fill={hasLiked ? "currentColor" : "none"} />
                  <span>{article.likes?.length || 0}</span>
                </button>

                {/* DISLIKE — blocked users cannot interact */}
                <button
                  onClick={() => isBlocked ? null : handleReaction('dislike')}
                  className={`toolbar-btn dislike-btn ${hasDisliked ? 'active' : ''} ${isBlocked ? 'blocked-action' : ''}`}
                  title={isBlocked ? "Your account is suspended" : hasDisliked ? "Undislike" : "Dislike Story"}
                  style={{ opacity: isBlocked ? 0.4 : 1, cursor: isBlocked ? 'not-allowed' : 'pointer' }}
                >
                  <FiThumbsDown size={18} fill={hasDisliked ? "currentColor" : "none"} />
                  <span>{article.dislikes?.length || 0}</span>
                </button>

                {/* COMMENT SCROLL — blocked users see disabled state */}
                <button
                  onClick={() => isBlocked ? null : handleCommentClick()}
                  className={`toolbar-btn comment-btn ${isBlocked ? 'blocked-action' : ''}`}
                  title={isBlocked ? "Your account is suspended" : "View comments"}
                  style={{ opacity: isBlocked ? 0.4 : 1, cursor: isBlocked ? 'not-allowed' : 'pointer' }}
                >
                  <FiMessageCircle size={18} />
                  <span>{comments.length}</span>
                </button>

                {/* REPLY / CHAT — blocked users cannot use chat */}
                <button
                  onClick={() => isBlocked ? null : handleReplyClick()}
                  className={`toolbar-btn reply-btn ${isBlocked ? 'blocked-action' : ''}`}
                  title={isBlocked ? "Your account is suspended" : "Discuss in Chat"}
                  style={{ opacity: isBlocked ? 0.4 : 1, cursor: isBlocked ? 'not-allowed' : 'pointer' }}
                >
                  <FiCornerUpLeft size={18} />
                  <span>Reply</span>
                </button>
              </div>

              <div className="toolbar-right">
                {/* Font Scale controls */}
                <div className="font-scale-control">
                  <button onClick={() => setFontScale(p => Math.max(p - 0.1, 0.8))} title="Decrease text size">A-</button>
                  <span className="scale-percent">{Math.round(fontScale * 100)}%</span>
                  <button onClick={() => setFontScale(p => Math.min(p + 0.1, 1.5))} title="Increase text size">A+</button>
                </div>

                <button
                  onClick={handleToggleSave}
                  className={`toolbar-btn save-btn ${isSaved ? 'active' : ''}`}
                  title={isSaved ? "Saved" : "Save for later"}
                >
                  {isSaved ? <FiBookmark size={18} fill="currentColor" /> : <FiBookmark size={18} />}
                  <span>{isSaved ? 'Saved' : 'Save'}</span>
                </button>
              </div>
            </div>

            {/* Full-width Cover Image & Caption */}
            {article.coverImage && (
              <div className="featured-image-wrapper">
                <img
                  className="article-full-cover"
                  src={getImageUrl(article.coverImage)}
                  alt={article.title}
                />
                {article.imageCaption && (
                  <figcaption className="featured-image-caption">
                    {article.imageCaption}
                  </figcaption>
                )}
              </div>
            )}

            {/* Body Content */}
            <div
              className="article-body"
              style={{ lineHeight: 1.6, fontSize: '16px' }}
              dangerouslySetInnerHTML={{ __html: article.body }}
            />



            {/* Tags row */}
            {article.tags?.length > 0 && (
              <div className="article-tags-row">
                {article.tags.map((tag) => (
                  <Link key={tag} to={`/tag/${tag}`} className="tag-pill-link">
                    #{tag}
                  </Link>
                ))}
              </div>
            )}

            <div className="rule-thick" style={{ margin: '32px 0' }} />

              {/* Comments Section */}
              <section className="comments-section" id="comments">
                <h2 className="comments-title">Comments ({comments.length})</h2>

                {(isLocked || globalCommentLock) && !isModerator ? (
                  <div style={{
                    padding: '14px 18px',
                    background: '#fef2f2',
                    border: '2.5px solid var(--color-black)',
                    boxShadow: '4px 4px 0 var(--color-black)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    fontSize: 13,
                    color: '#ef4444',
                    fontWeight: 700,
                    marginBottom: 20
                  }}>
                    <span style={{ fontSize: 18 }}>🔒</span>
                    {globalCommentLock 
                      ? "Comments have been temporarily disabled globally by the administrator."
                      : "Comments have been disabled for this content."
                    }
                  </div>
                ) : user && !isBlocked ? (
                <form className="comment-form" onSubmit={handleComment}>
                  <textarea
                    placeholder="Share your thoughts..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    maxLength={1000}
                    required
                  />
                  <br />
                  <button type="submit" className="btn-submit" disabled={submittingComment}>
                    {submittingComment ? 'Posting...' : 'Post Comment'}
                  </button>
                </form>
              ) : user && isBlocked ? (
                <div style={{
                  padding: '14px 18px', borderRadius: 8, marginBottom: 20,
                  background: 'rgba(239,68,68,0.05)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
                  color: '#ef4444', fontWeight: 600,
                }}>
                  <span style={{ fontSize: 16 }}>🛑</span>
                  Your account is currently suspended. You can read articles and like/save content, but cannot post comments until the suspension is lifted.
                </div>
              ) : (
                <p style={{ fontSize: 14, color: 'var(--color-gray-600)', marginBottom: 24 }}>
                  <Link to="/login" style={{ color: 'var(--color-red)', fontWeight: 600 }}>Login</Link> to post a comment.
                </p>
              )}

              <div style={{ marginTop: 24, position: 'relative' }}>
                {comments.length === 0 ? (
                  <p style={{ fontSize: 14, color: 'var(--color-gray-500)' }}>No comments yet. Be the first!</p>
                ) : (
                  <div className={`comments-list-wrapper ${!showAllComments && comments.length > 6 ? 'collapsed' : ''}`}>
                    <div className="comments-list-inner">
                      {comments.filter(c => !c.parentComment).map((c) => (
                        <CommentNode
                          key={c._id}
                          comment={c}
                          allComments={comments}
                          user={user}
                          onReply={handleReplyComment}
                          onDelete={handleDeleteComment}
                          isBlocked={isBlocked}
                        />
                      ))}
                    </div>
                    {!showAllComments && comments.length > 6 && (
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

            <div className="rule-thick" style={{ margin: '48px 0 32px' }} />

            {/* Author Bio Card */}
            {article.author && (
              <div className="author-profile-card">
                <div className="author-card-main-info">
                  <div className="author-card-avatar">
                    {article.author.avatar ? (
                      <img src={getImageUrl(article.author.avatar)} alt={article.author.name} />
                    ) : (
                      article.author.name[0].toUpperCase()
                    )}
                  </div>
                  <div className="author-card-details">
                    <span className="author-card-label">ABOUT THE AUTHOR</span>
                    <h4 className="author-card-name">{article.author.name}</h4>
                    <p className="author-card-role">{article.author.role}</p>
                    {article.author.bio && <p className="author-card-bio">{article.author.bio}</p>}
                  </div>
                </div>

                {sortedAuthorSuggestions.length > 0 && (
                  <div className="author-stories-suggestions-section">
                    <h5 className="author-suggestions-title">Author's Stories & Suggestions</h5>
                    <div className="author-suggestions-list">
                      {sortedAuthorSuggestions.map((art) => (
                        <div key={art._id} className="author-suggested-item">
                          <img className="author-suggested-thumb" src={getImageUrl(art.coverImage)} alt={art.title} />
                          <div className="author-suggested-content">
                            <span className="author-suggested-meta">
                              {art.category.toUpperCase()}
                              {art.tags?.some(t => article.tags?.includes(t)) && (
                                <span className="suggestion-badge-match">Related</span>
                              )}
                            </span>
                            <h6 className="author-suggested-title">
                              <Link to={`/article/${art.slug}`}>{art.title}</Link>
                            </h6>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="rule-thick" style={{ margin: '48px 0 32px' }} />

            {/* Recommend by Tag section */}
            {finalTagRecommendations.length > 0 && (
              <section className="recommend-by-tag-section">
                <h3 className="section-title-cat" style={{ fontSize: 18 }}>Recommended by Tag</h3>
                <div className="rule" style={{ margin: '8px 0 24px' }} />
                <div className="recommend-by-tag-grid">
                  {finalTagRecommendations.map((art) => (
                    <div key={art._id} className="tag-recommend-card">
                      <Link to={`/article/${art.slug}`} className="tag-recommend-img-link">
                        <img className="tag-recommend-img" src={getImageUrl(art.coverImage)} alt={art.title} />
                      </Link>
                      <div className="tag-recommend-info">
                        <span className="tag-recommend-cat">{art.category.toUpperCase()}</span>
                        <h4 className="tag-recommend-title">
                          <Link to={`/article/${art.slug}`}>{art.title}</Link>
                        </h4>
                        <div className="tag-recommend-tags">
                          {art.tags?.slice(0, 3).map(t => (
                            <Link key={t} to={`/tag/${t}`} className="tag-recommend-tag">#{t}</Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="rule-thick" style={{ margin: '48px 0 32px' }} />

            {/* Related articles (2-card row) */}
            {relatedArticles.length > 0 && (
              <section className="related-articles-section">
                <h3 className="section-title-cat" style={{ fontSize: 18 }}>Related Stories</h3>
                <div className="rule" style={{ margin: '8px 0 24px' }} />
                <div className="related-articles-grid-2">
                  {relatedArticles.slice(0, 2).map((art) => (
                    <div key={art._id} className="related-card-expert">
                      <Link to={`/article/${art.slug}`} className="related-card-link-wrapper">
                        <div className="related-card-image-bg">
                          <img src={getImageUrl(art.coverImage)} alt={art.title} />
                          <div className="related-card-overlay-expert">
                            <span className="related-card-cat-expert">{art.category.toUpperCase()}</span>
                            <h4 className="related-card-title-expert">{art.title}</h4>
                            <div className="related-card-read-time">⏱️ {calculateReadingTime(art.body)} min read</div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </article>

          {/* Right Sidebar for References */}
          {article.references && article.references.length > 0 && (
            <aside 
              className="article-references-sidebar"
              style={{
                width: '300px',
                flexShrink: 0,
                position: 'sticky',
                top: '100px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                paddingLeft: '24px',
                boxSizing: 'border-box'
              }}
            >
              <h4 className="reference-sidebar-title">
                References ({article.references.length})
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {article.references.map((ref) => {
                  const refArt = ref.article;
                  if (!refArt) return null;

                  return (
                    <div key={refArt._id} className="reference-card">
                      <span className="reference-badge">
                        {refArt.category}
                      </span>
                      
                      <Link 
                        to={`/article/${refArt.slug}`}
                        className="reference-title-link"
                      >
                        {refArt.title}
                      </Link>

                      {ref.note && (
                        <div className="reference-note">
                          "{ref.note}"
                        </div>
                      )}

                      {refArt.coverImage && (
                        <img 
                          src={getImageUrl(refArt.coverImage)} 
                          alt="" 
                          style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.05)', marginTop: '4px' }} 
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </aside>
          )}

          <style>{`
            .reference-sidebar-title {
              font-family: var(--font-display, inherit);
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              color: var(--color-gray-500, #6b7280);
              margin: 0 0 16px 0;
              padding-bottom: 8px;
              border-bottom: 1.5px solid rgba(0, 0, 0, 0.06);
              text-align: left;
              position: relative;
            }
            [data-theme="dark"] .reference-sidebar-title,
            [data-theme="black"] .reference-sidebar-title {
              border-bottom-color: rgba(255, 255, 255, 0.06);
            }
            .reference-sidebar-title::after {
              content: '';
              position: absolute;
              bottom: -1.5px;
              left: 0;
              width: 40px;
              height: 1.5px;
              background: var(--accent-color, #0055a4);
            }

            .reference-card {
              background: var(--color-paper, #ffffff);
              border: 1px solid rgba(0, 0, 0, 0.08);
              border-radius: 14px;
              padding: 18px;
              display: flex;
              flex-direction: column;
              gap: 10px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
              transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            }
            [data-theme="dark"] .reference-card,
            [data-theme="black"] .reference-card {
              border-color: rgba(255, 255, 255, 0.08);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            .reference-card:hover {
              transform: translateY(-3px);
              border-color: var(--accent-color, #0055a4);
              box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
            }
            [data-theme="dark"] .reference-card:hover,
            [data-theme="black"] .reference-card:hover {
              box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
            }

            .reference-badge {
              font-size: 9px;
              font-weight: 800;
              text-transform: uppercase;
              padding: 3px 8px;
              background: rgba(0, 85, 164, 0.06);
              color: var(--accent-color, #0055a4);
              border-radius: 100px;
              align-self: flex-start;
              letter-spacing: 0.5px;
            }

            .reference-title-link {
              font-size: 14.5px;
              font-weight: 700;
              color: var(--color-black);
              text-decoration: none;
              line-height: 1.4;
              display: block;
              text-align: left;
              transition: color 0.2s;
            }
            .reference-title-link:hover {
              color: var(--accent-color, #0055a4);
              text-decoration: none !important;
            }

            .reference-note {
              font-size: 11.5px;
              color: var(--color-gray-600, #4b5563);
              background: rgba(0, 0, 0, 0.02);
              border-left: 3px solid var(--accent-color, #0055a4);
              padding: 8px 12px;
              border-radius: 4px;
              margin-top: 4px;
              font-style: italic;
              line-height: 1.4;
              text-align: left;
            }
            [data-theme="dark"] .reference-note,
            [data-theme="black"] .reference-note {
              background: rgba(255, 255, 255, 0.02);
            }

            @media (max-width: 992px) {
              .article-reading-layout {
                flex-direction: column !important;
              }
              .article-references-sidebar {
                width: 100% !important;
                padding-left: 0 !important;
                margin-top: 24px;
                position: relative !important;
                top: 0 !important;
              }
              .article-main-content {
                border-right: none !important;
                padding-right: 0 !important;
              }
            }
          `}</style>
        </div>
      </div>
    </main>

    {/* ── Image Lightbox ── */}
    {lightboxSrc && (
      <ImageLightbox
        src={lightboxSrc}
        alt="Article image"
        onClose={() => setLightboxSrc(null)}
      />
    )}
    </>
  );
};

export default ArticleDetailPage;
