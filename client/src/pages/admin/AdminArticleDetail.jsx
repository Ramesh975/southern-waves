import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { articleAPI, filterAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getImageUrl } from '../../components/ArticleComponents';
import {
  FiArrowLeft, FiEdit3, FiExternalLink, FiTrash2,
  FiEye, FiHeart, FiMessageSquare, FiShare2, FiClock,
  FiShield, FiLock, FiUnlock, FiAlertOctagon, FiCheckCircle,
  FiActivity, FiTag, FiUser, FiCalendar, FiTrendingUp
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import './AdminArticleDetail.css';

const AdminArticleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, isEditor, isModerator } = useAuth();

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [status, setStatus] = useState('published');
  const [isPushed, setIsPushed] = useState(false);

  // Fetch article data
  useEffect(() => {
    setLoading(true);
    // Fetch article by ID or slug
    articleAPI.getAll({ adminView: 'true', limit: 100 })
      .then(res => {
        const found = (res.data?.data || []).find(a => a._id === id || a.slug === id);
        if (found) {
          setArticle(found);
          setStatus(found.status || 'published');
          setIsPushed(!!found.isPushedToHome);
        } else {
          // Try fetching by slug/id directly
          articleAPI.getBySlug(id)
            .then(directRes => {
              const art = directRes.data?.data || directRes.data;
              setArticle(art);
              setStatus(art.status || 'published');
              setIsPushed(!!art.isPushedToHome);
            })
            .catch(() => {
              toast.error('Article not found');
            });
        }
      })
      .catch(err => {
        console.error('Failed to load article:', err);
        toast.error('Failed to load article details');
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Handle status update
  const handleStatusChange = async (newStatus) => {
    if (!article) return;
    setUpdating(true);
    try {
      await articleAPI.update(article._id, { status: newStatus });
      setStatus(newStatus);
      setArticle(prev => ({ ...prev, status: newStatus }));
      toast.success(`Article status updated to ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  // Handle spotlight push toggle
  const handleTogglePush = async () => {
    if (!article) return;
    setUpdating(true);
    try {
      const nextPush = !isPushed;
      await articleAPI.update(article._id, { isPushedToHome: nextPush });
      setIsPushed(nextPush);
      setArticle(prev => ({ ...prev, isPushedToHome: nextPush }));
      toast.success(nextPush ? 'Pushed to Home Spotlight 🚀' : 'Removed from Spotlight');
    } catch (err) {
      toast.error('Failed to update spotlight status');
    } finally {
      setUpdating(false);
    }
  };

  // Handle lock toggle
  const handleToggleLock = async () => {
    if (!article) return;
    try {
      const nextLock = !article.isLocked;
      await filterAPI.lockArticle(article._id, nextLock);
      setArticle(prev => ({ ...prev, isLocked: nextLock }));
      toast.success(nextLock ? 'Article editing locked' : 'Article unlocked');
    } catch (err) {
      toast.error('Failed to update lock status');
    }
  };

  // Handle ban toggle
  const handleToggleBan = async () => {
    if (!article) return;
    try {
      const nextBan = !article.isBanned;
      await filterAPI.banArticle(article._id, nextBan);
      setArticle(prev => ({ ...prev, isBanned: nextBan }));
      toast.success(nextBan ? 'Article banned from public display' : 'Article unbanned');
    } catch (err) {
      toast.error('Failed to update ban status');
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete "${article.title}"?`)) return;
    try {
      await articleAPI.delete(article._id);
      toast.success('Article deleted successfully');
      navigate('/admin/articles');
    } catch (err) {
      toast.error('Failed to delete article');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div className="nm-mini-spinner" style={{ margin: '0 auto 16px' }} />
        <div style={{ fontWeight: 700, color: 'var(--admin-text-muted)' }}>Loading post management data...</div>
      </div>
    );
  }

  if (!article) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <h2>Article Not Found</h2>
        <Link to="/admin/articles" className="btn-admin-primary" style={{ marginTop: 16, display: 'inline-block' }}>
          ← Return to Articles List
        </Link>
      </div>
    );
  }

  const wordCount = article.content ? article.content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="ad-detail-container">
      {/* ── Top Navigation Bar ── */}
      <div className="ad-detail-top-nav">
        <Link to="/admin/articles" className="ad-detail-back-btn">
          <FiArrowLeft size={16} />
          <span>All Articles</span>
        </Link>

        <div className="ad-detail-header-actions">
          <Link to={`/admin/edit-article/${article._id}`} className="ad-mgmt-btn ad-mgmt-btn-secondary">
            <FiEdit3 size={15} /> Edit in Full Editor
          </Link>
          <a
            href={`/article/${article.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ad-mgmt-btn ad-mgmt-btn-primary"
          >
            <FiExternalLink size={15} /> View Live Post
          </a>
          {isAdmin && (
            <button onClick={handleDelete} className="ad-mgmt-btn ad-mgmt-btn-danger">
              <FiTrash2 size={15} /> Delete
            </button>
          )}
        </div>
      </div>

      {/* ── Main Content & Management Grid ── */}
      <div className="ad-detail-grid">
        {/* Left: Article Overview & Full Preview */}
        <div className="ad-detail-hero-card">
          {article.coverImage && (
            <div className="ad-detail-cover-wrapper">
              <img
                src={getImageUrl(article.coverImage)}
                alt={article.title}
                className="ad-detail-cover-img"
              />
            </div>
          )}

          <div className="ad-detail-meta-row">
            <span className="admin-badge badge-neutral" style={{ textTransform: 'uppercase', fontWeight: 800 }}>
              {article.category || 'NEWS'}
            </span>
            <span className={`admin-badge ${status === 'published' ? 'badge-success' : status === 'draft' ? 'badge-warning' : 'badge-danger'}`}>
              {status.toUpperCase()}
            </span>
            {isPushed && (
              <span className="admin-badge badge-info">
                🚀 Spotlight Active
              </span>
            )}
            {article.isLocked && (
              <span className="admin-badge badge-danger">
                🔒 Locked
              </span>
            )}
            {article.isBanned && (
              <span className="admin-badge badge-danger">
                ⛔ Banned
              </span>
            )}
          </div>

          <h1 className="ad-detail-title">{article.title}</h1>

          {article.lead && (
            <div className="ad-detail-lead">
              "{article.lead}"
            </div>
          )}

          {/* Rendered HTML Preview */}
          <div className="ad-detail-content-preview">
            <div 
              className="article-body-content"
              dangerouslySetInnerHTML={{ __html: article.content || '<p>No content provided.</p>' }} 
            />
          </div>
        </div>

        {/* Right: Sidebar Management Hub, Moderation & Analytics */}
        <div className="ad-detail-sidebar">
          {/* 1. Post Analytics Hub */}
          <div className="ad-detail-side-card">
            <h3 className="ad-detail-card-title">
              <span>Post Analytics</span>
              <FiActivity size={16} color="var(--accent-color)" />
            </h3>

            <div className="ad-post-analytics-grid">
              <div className="ad-post-stat-box">
                <span className="ad-post-stat-val">{(article.views || 0).toLocaleString()}</span>
                <span className="ad-post-stat-lbl"><FiEye size={12} /> Views</span>
              </div>
              <div className="ad-post-stat-box">
                <span className="ad-post-stat-val">{(article.likes?.length || article.likesCount || 0).toLocaleString()}</span>
                <span className="ad-post-stat-lbl"><FiHeart size={12} /> Likes</span>
              </div>
              <div className="ad-post-stat-box">
                <span className="ad-post-stat-val">{(article.commentsCount || 0).toLocaleString()}</span>
                <span className="ad-post-stat-lbl"><FiMessageSquare size={12} /> Comments</span>
              </div>
              <div className="ad-post-stat-box">
                <span className="ad-post-stat-val">{(article.shares || 0).toLocaleString()}</span>
                <span className="ad-post-stat-lbl"><FiShare2 size={12} /> Shares</span>
              </div>
            </div>

            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--admin-border)', fontSize: '11.5px', color: 'var(--admin-text-muted)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Word Count:</span>
                <strong style={{ color: 'var(--admin-text-main)' }}>{wordCount} words</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Estimated Read:</span>
                <strong style={{ color: 'var(--admin-text-main)' }}>{readTime} min read</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Created:</span>
                <strong style={{ color: 'var(--admin-text-main)' }}>{new Date(article.createdAt).toLocaleDateString()}</strong>
              </div>
            </div>
          </div>

          {/* 2. Management Tasks */}
          <div className="ad-detail-side-card">
            <h3 className="ad-detail-card-title">
              <span>Management Tasks</span>
              <FiCheckCircle size={16} color="var(--accent-color)" />
            </h3>

            <div className="ad-mgmt-action-list">
              <div className="ad-mgmt-select-group">
                <label className="ad-mgmt-label">Publishing Status</label>
                <select
                  className="ad-mgmt-select"
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={updating}
                >
                  <option value="published">Published (Public)</option>
                  <option value="draft">Draft (Private)</option>
                  <option value="pending_review">Pending Review</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <button
                onClick={handleTogglePush}
                disabled={updating}
                className={`ad-mgmt-btn ${isPushed ? 'ad-mgmt-btn-danger' : 'ad-mgmt-btn-secondary'}`}
                style={{ marginTop: 4 }}
              >
                {isPushed ? 'Remove from Home Spotlight' : 'Push to Home Spotlight 🚀'}
              </button>

              <Link
                to={`/admin/edit-article/${article._id}`}
                className="ad-mgmt-btn ad-mgmt-btn-secondary"
              >
                <FiEdit3 size={14} /> Full Edit & Media Replace
              </Link>
            </div>
          </div>

          {/* 3. Moderation & Security Audit */}
          <div className="ad-detail-side-card">
            <h3 className="ad-detail-card-title">
              <span>Moderation & Security</span>
              <FiShield size={16} color="var(--accent-color)" />
            </h3>

            <div className="ad-mgmt-action-list">
              <div className={`ad-mod-audit-box ${article.isFlagged ? 'flagged' : 'safe'}`}>
                <strong>{article.isFlagged ? '⚠️ Content Flagged' : '✓ Clean Audit'}</strong>
                <span>
                  {article.isFlagged
                    ? (article.flagReason || 'Flagged for sensitivity review')
                    : 'Passed automated keyword and profanity checks.'}
                </span>
              </div>

              {(isAdmin || isModerator) && (
                <>
                  <button
                    onClick={handleToggleLock}
                    className="ad-mgmt-btn ad-mgmt-btn-secondary"
                  >
                    {article.isLocked ? <><FiUnlock size={14} /> Unlock Article</> : <><FiLock size={14} /> Lock Article</>}
                  </button>

                  <button
                    onClick={handleToggleBan}
                    className={`ad-mgmt-btn ${article.isBanned ? 'ad-mgmt-btn-secondary' : 'ad-mgmt-btn-danger'}`}
                  >
                    <FiAlertOctagon size={14} />
                    {article.isBanned ? 'Unban Article' : 'Ban Article from Public'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 4. Author Details */}
          <div className="ad-detail-side-card">
            <h3 className="ad-detail-card-title">
              <span>Author Info</span>
              <FiUser size={16} color="var(--accent-color)" />
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="nav-profile-pic" style={{ width: 42, height: 42 }}>
                <img
                  src={article.author?.avatar ? getImageUrl(article.author.avatar) : `https://ui-avatars.com/api/?name=${encodeURIComponent(article.author?.name || 'Author')}&background=c8102e&color=fff`}
                  alt={article.author?.name}
                />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--admin-text-main)' }}>{article.author?.name || 'Unknown Author'}</div>
                <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>{article.author?.email}</div>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-color)', marginTop: 2 }}>
                  {article.author?.role || 'Student Contributor'}
                </div>
              </div>
            </div>

            {article.author?.username && (
              <div style={{ marginTop: 12 }}>
                <Link
                  to={`/author/${article.author.username}`}
                  target="_blank"
                  className="ad-mgmt-btn ad-mgmt-btn-secondary"
                  style={{ fontSize: 11, padding: '6px 10px' }}
                >
                  <FiExternalLink size={12} /> View Public Author Profile
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminArticleDetail;
