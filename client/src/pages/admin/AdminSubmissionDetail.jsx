import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { articleAPI, authAPI, filterAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getImageUrl } from '../../components/ArticleComponents';
import {
  FiArrowLeft, FiEdit3, FiExternalLink, FiTrash2,
  FiEye, FiHeart, FiShare2, FiClock, FiShield,
  FiLock, FiUnlock, FiCheckCircle, FiUser, FiCalendar,
  FiTrendingUp, FiTag, FiBookOpen, FiMail, FiPhone,
  FiLayers, FiInfo, FiX, FiActivity, FiRefreshCw, FiAlertTriangle
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import './AdminSubmissionDetail.css';

const CATEGORY_OPTIONS = [
  { value: 'news', label: 'News', desc: 'Campus & community announcements' },
  { value: 'editorial', label: 'Editorial', desc: 'In-depth opinion & commentary' },
  { value: 'features', label: 'Features', desc: 'Long-form stories & cultural deep dives' },
  { value: 'kyp', label: 'Know Your Past (KYP)', desc: 'Historical & heritage retrospectives' },
  { value: 'pictures-speak', label: "Picture's Speak", desc: 'Photojournalism & visual stories' },
];

const AdminSubmissionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authorProfile, setAuthorProfile] = useState(null);
  const [authorStats, setAuthorStats] = useState(null);
  const [authorArticles, setAuthorArticles] = useState([]);
  const [loadingAuthor, setLoadingAuthor] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Promotion Dialog State
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [promoTitle, setPromoTitle] = useState('');
  const [promoLead, setPromoLead] = useState('');
  const [promoCategory, setPromoCategory] = useState('news');
  const [promoIsFeatured, setPromoIsFeatured] = useState(false);
  const [promoting, setPromoting] = useState(false);

  // Quick Edit Dialog State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editLead, setEditLead] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editSubCategory, setEditSubCategory] = useState('mind');
  const [savingEdit, setSavingEdit] = useState(false);

  // Fetch submission data
  const fetchSubmission = async () => {
    setLoading(true);
    try {
      // Try direct getById or getBySlug
      let foundPost = null;
      try {
        const res = await articleAPI.getById(id);
        foundPost = res.data?.data || res.data;
      } catch (err) {
        // Fallback to query all tea-shop admin posts
        const allRes = await articleAPI.getAll({ category: 'tea-shop', adminView: 'true', limit: 100 });
        foundPost = (allRes.data?.data || []).find(p => p._id === id || p.slug === id);
      }

      if (!foundPost) {
        toast.error('Submission not found');
        return;
      }

      setSubmission(foundPost);
      setPromoTitle(foundPost.title || '');
      setPromoLead(foundPost.lead || '');
      setEditTitle(foundPost.title || '');
      setEditLead(foundPost.lead || '');
      setEditBody(foundPost.body || '');
      setEditSubCategory(foundPost.subCategory || 'mind');

      // Now fetch Author Profile & Aggregated Stats
      const authorIdentifier = foundPost.author?._id || foundPost.author;
      if (authorIdentifier) {
        loadAuthorData(authorIdentifier);
      }
    } catch (err) {
      console.error('Failed to load submission:', err);
      toast.error('Failed to load submission details');
    } finally {
      setLoading(false);
    }
  };

  const loadAuthorData = async (authorIdentifier) => {
    setLoadingAuthor(true);
    try {
      // 1. Author profile and aggregated stats
      try {
        const authRes = await authAPI.getAuthorProfile(authorIdentifier);
        if (authRes.data?.data) {
          setAuthorProfile(authRes.data.data.author);
          setAuthorStats(authRes.data.data.stats);
        }
      } catch (authErr) {
        console.warn('Could not fetch full author profile:', authErr);
      }

      // 2. Author's other recent submissions and posts
      try {
        const postsRes = await articleAPI.getAll({
          author: authorIdentifier,
          adminView: 'true',
          limit: 6,
        });
        setAuthorArticles(postsRes.data?.data || []);
      } catch (postsErr) {
        console.warn('Could not fetch author articles:', postsErr);
      }
    } finally {
      setLoadingAuthor(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchSubmission();
    }
  }, [id]);

  // Handle Status Update
  const handleStatusChange = async (newStatus) => {
    if (!submission) return;
    setActionLoading(true);
    try {
      await articleAPI.update(submission._id, { status: newStatus });
      setSubmission(prev => ({ ...prev, status: newStatus }));
      toast.success(`Submission status updated to ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Discussion Lock
  const handleToggleLock = async () => {
    if (!submission) return;
    setActionLoading(true);
    try {
      const nextLock = !submission.isLocked;
      await filterAPI.lockArticle(submission._id, nextLock);
      setSubmission(prev => ({ ...prev, isLocked: nextLock }));
      toast.success(nextLock ? 'Discussions locked' : 'Discussions unlocked');
    } catch (err) {
      toast.error('Failed to update discussion lock');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Ban / Restriction
  const handleToggleBan = async () => {
    if (!submission) return;
    setActionLoading(true);
    try {
      const nextBan = !submission.isBanned;
      await filterAPI.banArticle(submission._id, nextBan);
      setSubmission(prev => ({ ...prev, isBanned: nextBan }));
      toast.success(nextBan ? 'Submission banned and hidden' : 'Submission unbanned');
    } catch (err) {
      toast.error('Failed to update moderation ban status');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete submission "${submission.title}"?`)) return;
    setActionLoading(true);
    try {
      await articleAPI.delete(submission._id);
      toast.success('Submission permanently deleted');
      navigate('/admin/submissions');
    } catch (err) {
      toast.error('Failed to delete submission');
      setActionLoading(false);
    }
  };

  // Handle Promote Confirm
  const handlePromoteConfirm = async (e) => {
    e.preventDefault();
    if (!promoTitle.trim() || !promoLead.trim()) {
      return toast.error('Please enter both headline and lead summary');
    }

    setPromoting(true);
    try {
      await articleAPI.update(submission._id, {
        title: promoTitle.trim(),
        lead: promoLead.trim(),
        category: promoCategory,
        status: 'published',
        isFeatured: promoIsFeatured,
      });

      toast.success(`Submission promoted to ${promoCategory.toUpperCase()} successfully! 🚀`);
      setPromoModalOpen(false);
      fetchSubmission();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Promotion failed');
    } finally {
      setPromoting(false);
    }
  };

  // Handle Quick Edit Save
  const handleSaveQuickEdit = async (e) => {
    e.preventDefault();
    if (!editTitle.trim() || !editLead.trim()) {
      return toast.error('Title and Lead summary cannot be empty');
    }

    setSavingEdit(true);
    try {
      await articleAPI.update(submission._id, {
        title: editTitle.trim(),
        lead: editLead.trim(),
        body: editBody.trim(),
        subCategory: editSubCategory,
      });

      setSubmission(prev => ({
        ...prev,
        title: editTitle.trim(),
        lead: editLead.trim(),
        body: editBody.trim(),
        subCategory: editSubCategory,
      }));

      toast.success('Submission content updated');
      setEditModalOpen(false);
    } catch (err) {
      toast.error('Failed to update submission');
    } finally {
      setSavingEdit(false);
    }
  };

  const getSubCategoryBadge = (subCat) => {
    switch (subCat) {
      case 'mind':
        return <span className="ad-sub-badge-format ad-sub-badge-mind">☕ Mind Discussion</span>;
      case 'spoken':
        return <span className="ad-sub-badge-format ad-sub-badge-spoken">🎙️ Spoken Campus</span>;
      case 'ground':
        return <span className="ad-sub-badge-format ad-sub-badge-ground">📡 Ground Wire</span>;
      default:
        return <span className="ad-sub-badge-format ad-sub-badge-tea">🍵 Tea Shop Post</span>;
    }
  };

  const engagementScore = useMemo(() => {
    if (!submission) return 0;
    return (submission.likes?.length || submission.likesCount || 0) + (submission.shares || 0);
  }, [submission]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px' }}>
        <div className="nm-mini-spinner" style={{ margin: '0 auto 16px' }} />
        <div style={{ fontWeight: 700, color: 'var(--admin-text-muted)' }}>Loading student submission...</div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px' }}>
        <FiAlertTriangle size={48} style={{ color: 'var(--color-primary)', opacity: 0.5, marginBottom: 16 }} />
        <h2>Submission Not Found</h2>
        <p style={{ color: 'var(--admin-text-muted)', marginBottom: 24 }}>The requested submission could not be retrieved or has been removed.</p>
        <Link to="/admin/submissions" className="btn-admin-primary">
          ← Return to Submissions List
        </Link>
      </div>
    );
  }

  const author = submission.author || authorProfile || {};
  const isAuthorSelf = currentUser?._id === author._id;

  return (
    <div className="ad-sub-container">
      {/* ── Top Navigation Bar ── */}
      <div className="ad-sub-top-nav">
        <Link to="/admin/submissions" className="ad-sub-back-btn">
          <FiArrowLeft size={16} />
          <span>Back to Submissions</span>
        </Link>

        <div className="ad-sub-header-actions">
          <a
            href={`/article/${submission.slug || submission._id}`}
            target="_blank"
            rel="noreferrer"
            className="btn-admin-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
            title="Open public campus view in new tab"
          >
            <FiExternalLink size={14} />
            <span>Public View</span>
          </a>

          <button
            onClick={() => setEditModalOpen(true)}
            className="btn-admin-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <FiEdit3 size={14} />
            <span>Quick Edit</span>
          </button>

          <button
            onClick={() => setPromoModalOpen(true)}
            className="btn-admin-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <FiCheckCircle size={14} />
            <span>Promote to Journal</span>
          </button>

          <button
            onClick={handleDelete}
            className="btn-admin-danger"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
            disabled={actionLoading}
            title="Delete this submission"
          >
            <FiTrash2 size={14} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* ── Main Two-Column Layout ── */}
      <div className="ad-sub-grid">
        {/* LEFT COLUMN: Submission Content & Management Console */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Main Submission Card */}
          <div className="ad-sub-card">
            {/* Optional Cover Image */}
            {submission.coverImage && (
              <div className="ad-sub-cover-wrap">
                <img
                  src={getImageUrl(submission.coverImage)}
                  alt={submission.title}
                  className="ad-sub-cover-img"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Meta Row with Badges */}
            <div className="ad-sub-meta-bar">
              <div className="ad-sub-badges-group">
                {getSubCategoryBadge(submission.subCategory)}

                <span className={`ad-sub-badge-status ${
                  submission.status === 'published' ? 'status-pub' :
                  submission.status === 'pending' ? 'status-pend' : 'status-draft'
                }`}>
                  {submission.status || 'published'}
                </span>

                {submission.isLocked && (
                  <span className="ad-badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                    🔒 Locked
                  </span>
                )}

                {submission.isBanned && (
                  <span className="ad-badge" style={{ background: '#000', color: '#fff' }}>
                    🚫 Banned
                  </span>
                )}
              </div>

              <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <FiClock size={13} />
                <span>Submitted {new Date(submission.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}</span>
              </div>
            </div>

            {/* Title */}
            <h1 className="ad-sub-title">{submission.title}</h1>

            {/* Lead Summary Deck */}
            {submission.lead && (
              <div className="ad-sub-lead">
                {submission.lead}
              </div>
            )}

            {/* Full Body Content */}
            <div className="ad-sub-body">
              {submission.body ? (
                // If HTML content
                submission.body.includes('<') && submission.body.includes('>') ? (
                  <div dangerouslySetInnerHTML={{ __html: submission.body }} />
                ) : (
                  submission.body.split('\n\n').map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))
                )
              ) : (
                <p style={{ color: 'var(--admin-text-muted)', fontStyle: 'italic' }}>(No article body text provided)</p>
              )}
            </div>

            {/* Additional Gallery Images */}
            {submission.images && submission.images.length > 0 && (
              <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--admin-border)' }}>
                <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--admin-text-muted)', marginBottom: 12 }}>
                  Attached Gallery ({submission.images.length})
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                  {submission.images.map((img, i) => (
                    <div key={i} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--admin-border)' }}>
                      <img src={getImageUrl(img.url)} alt={img.caption || ''} style={{ width: '100%', height: 120, objectFit: 'cover' }} />
                      {img.caption && (
                        <div style={{ padding: '6px 8px', fontSize: 11, color: 'var(--admin-text-muted)' }}>{img.caption}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {submission.tags && submission.tags.length > 0 && (
              <div className="ad-sub-tags">
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 4 }}>
                  <FiTag size={13} /> Tags:
                </span>
                {submission.tags.map((tag, i) => (
                  <span key={i} className="ad-sub-tag">#{tag}</span>
                ))}
              </div>
            )}

            {/* Engagement Analytics Grid */}
            <div className="ad-sub-engagement-grid">
              <div className="ad-sub-stat-box">
                <span className="ad-sub-stat-val">{(submission.views || 0).toLocaleString()}</span>
                <span className="ad-sub-stat-lbl"><FiEye size={12} /> Views</span>
              </div>
              <div className="ad-sub-stat-box">
                <span className="ad-sub-stat-val">{(submission.likes?.length || submission.likesCount || 0).toLocaleString()}</span>
                <span className="ad-sub-stat-lbl"><FiHeart size={12} /> Likes</span>
              </div>
              <div className="ad-sub-stat-box">
                <span className="ad-sub-stat-val">{(submission.shares || 0).toLocaleString()}</span>
                <span className="ad-sub-stat-lbl"><FiShare2 size={12} /> Shares</span>
              </div>
              <div className="ad-sub-stat-box">
                <span className="ad-sub-stat-val" style={{ color: engagementScore >= 5 ? 'var(--color-primary)' : 'inherit' }}>
                  {engagementScore}
                </span>
                <span className="ad-sub-stat-lbl"><FiTrendingUp size={12} /> Total Eng.</span>
              </div>
            </div>
          </div>

          {/* Management & Moderation Control Card */}
          <div className="ad-sub-control-card">
            <div className="ad-sub-control-title">
              <FiShield size={16} style={{ color: 'var(--color-primary)' }} />
              <span>Editorial & Moderation Controls</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Status Switcher */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-main)' }}>Publication Status</div>
                  <div style={{ fontSize: 11.5, color: 'var(--admin-text-muted)' }}>Current status of this student contribution</div>
                </div>

                <div style={{ display: 'inline-flex', border: '1px solid var(--admin-border)', borderRadius: 8, overflow: 'hidden' }}>
                  {['published', 'pending', 'draft'].map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(st)}
                      disabled={actionLoading || submission.status === st}
                      style={{
                        padding: '6px 14px',
                        border: 'none',
                        background: submission.status === st ? 'var(--color-primary)' : 'transparent',
                        color: submission.status === st ? '#fff' : 'var(--admin-text-muted)',
                        fontSize: 12,
                        fontWeight: 700,
                        textTransform: 'capitalize',
                        cursor: submission.status === st ? 'default' : 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Actions Row */}
              <div className="ad-sub-control-btns" style={{ borderTop: '1px solid var(--admin-border)', paddingTop: 14 }}>
                <button
                  className="btn-admin-secondary"
                  onClick={handleToggleLock}
                  disabled={actionLoading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                >
                  {submission.isLocked ? <FiUnlock size={14} /> : <FiLock size={14} />}
                  <span>{submission.isLocked ? 'Unlock Discussions' : 'Lock Discussions'}</span>
                </button>

                <button
                  className="btn-admin-secondary"
                  onClick={handleToggleBan}
                  disabled={actionLoading}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12,
                    color: submission.isBanned ? '#10b981' : '#ef4444'
                  }}
                >
                  <FiShield size={14} />
                  <span>{submission.isBanned ? 'Unban Submission' : 'Ban From Public'}</span>
                </button>

                <button
                  className="btn-admin-secondary"
                  onClick={() => setEditModalOpen(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                >
                  <FiEdit3 size={14} />
                  <span>Edit Content</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Author Profile, Statistical Data & Last Posts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Author Profile Card */}
          <div className="ad-author-card">
            <div className="ad-author-header">
              {author.avatar ? (
                <img
                  src={getImageUrl(author.avatar)}
                  alt={author.name}
                  className="ad-author-avatar"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(author.name || 'Student')}&background=c8102e&color=fff`;
                  }}
                />
              ) : (
                <div className="ad-author-avatar">
                  {(author.name || 'S')[0].toUpperCase()}
                </div>
              )}

              <div className="ad-author-title-group">
                <h3 className="ad-author-name">{author.name || 'Anonymous Student'}</h3>
                {author.username && (
                  <span className="ad-author-username">@{author.username}</span>
                )}
                <span className="ad-author-role-pill">
                  {author.role || 'student contributor'}
                </span>
              </div>
            </div>

            {/* Author Key Info Details */}
            <div className="ad-author-details-list">
              {author.email && (
                <div className="ad-author-detail-row">
                  <span className="ad-author-detail-lbl"><FiMail size={13} /> Email</span>
                  <span className="ad-author-detail-val">{author.email}</span>
                </div>
              )}

              <div className="ad-author-detail-row">
                <span className="ad-author-detail-lbl"><FiBookOpen size={13} /> University</span>
                <span className="ad-author-detail-val">{author.university || 'General Campus'}</span>
              </div>

              {author.educationLevel && (
                <div className="ad-author-detail-row">
                  <span className="ad-author-detail-lbl"><FiLayers size={13} /> Education</span>
                  <span className="ad-author-detail-val">{author.educationLevel}</span>
                </div>
              )}

              <div className="ad-author-detail-row">
                <span className="ad-author-detail-lbl"><FiCalendar size={13} /> Joined</span>
                <span className="ad-author-detail-val">
                  {author.createdAt ? new Date(author.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Unknown'}
                </span>
              </div>
            </div>

            {/* Author Bio */}
            {author.bio && (
              <p className="ad-author-bio">"{author.bio}"</p>
            )}

            {/* Author Public Profile Link */}
            {author.username && (
              <a
                href={`/author/${author.username}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <span>View Author Studio Profile</span>
                <FiExternalLink size={12} />
              </a>
            )}

            {/* ── Author Statistical Data KPIs ── */}
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: 'var(--admin-text-main)', letterSpacing: '0.04em', marginBottom: 10 }}>
                📊 Author Statistical Performance
              </div>

              <div className="ad-author-kpi-grid">
                <div className="ad-author-kpi-box">
                  <div className="ad-author-kpi-val">
                    {authorStats ? authorStats.totalCount : authorArticles.length || 1}
                  </div>
                  <div className="ad-author-kpi-lbl">Total Posts</div>
                </div>

                <div className="ad-author-kpi-box">
                  <div className="ad-author-kpi-val">
                    {authorStats ? (authorStats.totalViews || 0).toLocaleString() : (submission.views || 0).toLocaleString()}
                  </div>
                  <div className="ad-author-kpi-lbl">Total Views</div>
                </div>

                <div className="ad-author-kpi-box">
                  <div className="ad-author-kpi-val">
                    {authorStats ? (authorStats.totalLikes || 0).toLocaleString() : (submission.likes?.length || 0).toLocaleString()}
                  </div>
                  <div className="ad-author-kpi-lbl">Total Likes</div>
                </div>

                <div className="ad-author-kpi-box">
                  <div className="ad-author-kpi-val" style={{ color: 'var(--color-primary)' }}>
                    {authorStats && authorStats.engagementRate ? `${authorStats.engagementRate}%` : `${engagementScore > 0 ? '100%' : '0%'}`}
                  </div>
                  <div className="ad-author-kpi-lbl">Engagement</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Author Recent Posts & History ── */}
          <div className="ad-author-posts-card">
            <div className="ad-author-posts-title">
              <span>Author's Recent Posts ({authorArticles.length})</span>
              <FiActivity size={14} style={{ color: 'var(--admin-text-muted)' }} />
            </div>

            {loadingAuthor ? (
              <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 12, color: 'var(--admin-text-muted)' }}>
                Loading author history...
              </div>
            ) : authorArticles.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontStyle: 'italic', padding: '10px 0' }}>
                This is the only submission recorded for this student creator.
              </div>
            ) : (
              <div>
                {authorArticles.map((art) => {
                  const isCurrent = art._id === submission._id;
                  const isSub = art.category === 'tea-shop';
                  const linkTo = isSub ? `/admin/submission/${art._id}` : `/admin/article/${art._id}`;

                  return (
                    <div key={art._id} className="ad-author-post-item" style={{ opacity: isCurrent ? 0.7 : 1 }}>
                      <Link to={linkTo} className="ad-author-post-link">
                        {isCurrent && <span style={{ color: 'var(--color-primary)', marginRight: 4 }}>• [Current]</span>}
                        {art.title}
                      </Link>

                      <div className="ad-author-post-meta">
                        <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{art.category}</span>
                        <span>•</span>
                        <span>{new Date(art.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>👁️ {art.views || 0}</span>
                        <span>•</span>
                        <span>❤️ {art.likes?.length || art.likesCount || 0}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── PROMOTION MODAL ── */}
      {promoModalOpen && (
        <div className="admin-modal-overlay" onClick={() => setPromoModalOpen(false)}>
          <div className="admin-modal-content" style={{ maxWidth: 580 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid var(--admin-border)', paddingBottom: 14 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', textTransform: 'uppercase', fontSize: 18, margin: 0, color: 'var(--admin-text-main)' }}>
                  Promote Submission
                </h3>
                <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                  Elevate this student submission to an official journal section
                </span>
              </div>
              <button className="ad-collapse-btn" onClick={() => setPromoModalOpen(false)}>
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handlePromoteConfirm}>
              {/* Original Author Attribution Banner */}
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'var(--admin-bg-secondary, rgba(255,255,255,0.03))',
                  border: '1px solid var(--admin-border)',
                  borderRadius: 6,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 12,
                  color: 'var(--admin-text-muted)'
                }}
              >
                <FiInfo size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                <span>
                  Author: <strong style={{ color: 'var(--admin-text-main)' }}>{author.name || 'Student'}</strong> (Attribution will be maintained)
                </span>
              </div>

              {/* Title */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, color: 'var(--admin-text-muted)' }}>
                  Headline / Title <span style={{ color: 'var(--color-primary)' }}>*</span>
                </label>
                <input
                  type="text"
                  className="admin-input"
                  value={promoTitle}
                  onChange={(e) => setPromoTitle(e.target.value)}
                  placeholder="Enter compelling headline..."
                  required
                />
              </div>

              {/* Lead Summary */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, color: 'var(--admin-text-muted)' }}>
                  Lead Description / Deck <span style={{ color: 'var(--color-primary)' }}>*</span>
                </label>
                <textarea
                  className="admin-input"
                  rows={3}
                  value={promoLead}
                  onChange={(e) => setPromoLead(e.target.value)}
                  placeholder="Enter lead paragraph summary..."
                  style={{ lineHeight: 1.45 }}
                  required
                />
              </div>

              {/* Target Section Selection */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, color: 'var(--admin-text-muted)' }}>
                  Target Section / Category <span style={{ color: 'var(--color-primary)' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                  {CATEGORY_OPTIONS.map((opt) => {
                    const isSelected = promoCategory === opt.value;
                    return (
                      <div
                        key={opt.value}
                        onClick={() => setPromoCategory(opt.value)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 6,
                          border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--admin-border)',
                          backgroundColor: isSelected ? 'var(--color-primary-subtle, rgba(200, 30, 30, 0.08))' : 'var(--admin-bg-secondary, rgba(255,255,255,0.02))',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? 'var(--color-primary)' : 'var(--admin-text-main)', marginBottom: 2 }}>
                          {opt.label}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>
                          {opt.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Optional Spotlight Flag */}
              <div style={{ marginBottom: 24, padding: '10px 14px', border: '1px solid var(--admin-border)', borderRadius: 6 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={promoIsFeatured}
                    onChange={(e) => setPromoIsFeatured(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }}
                  />
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-main)', display: 'block' }}>
                      Feature in Spotlight Carousel
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>
                      Pins this promoted story to the homepage highlight banner
                    </span>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid var(--admin-border)', paddingTop: 16 }}>
                <button
                  type="button"
                  className="btn-admin-secondary"
                  onClick={() => setPromoModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-admin-primary"
                  disabled={promoting}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  {promoting ? <FiRefreshCw className="spin-icon" size={14} /> : <FiCheckCircle size={14} />}
                  <span>{promoting ? 'Promoting...' : 'Promote Now'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── QUICK EDIT MODAL ── */}
      {editModalOpen && (
        <div className="admin-modal-overlay" onClick={() => setEditModalOpen(false)}>
          <div className="admin-modal-content" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid var(--admin-border)', paddingBottom: 14 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', textTransform: 'uppercase', fontSize: 18, margin: 0 }}>
                Edit Submission
              </h3>
              <button className="ad-collapse-btn" onClick={() => setEditModalOpen(false)}>
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveQuickEdit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, color: 'var(--admin-text-muted)' }}>
                  Format / Subcategory
                </label>
                <select
                  className="admin-input admin-select"
                  value={editSubCategory}
                  onChange={(e) => setEditSubCategory(e.target.value)}
                  style={{ width: '100%', height: 38 }}
                >
                  <option value="mind">☕ Mind (Student Thoughts & Opinions)</option>
                  <option value="spoken">🎙️ Spoken (Campus Dialogues & Voices)</option>
                  <option value="ground">📡 Ground (Field Reports & Bulletins)</option>
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, color: 'var(--admin-text-muted)' }}>
                  Headline / Title
                </label>
                <input
                  type="text"
                  className="admin-input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, color: 'var(--admin-text-muted)' }}>
                  Lead Description / Deck
                </label>
                <textarea
                  className="admin-input"
                  rows={2}
                  value={editLead}
                  onChange={(e) => setEditLead(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, color: 'var(--admin-text-muted)' }}>
                  Full Body Content
                </label>
                <textarea
                  className="admin-input"
                  rows={8}
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  style={{ lineHeight: 1.5, fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid var(--admin-border)', paddingTop: 16 }}>
                <button
                  type="button"
                  className="btn-admin-secondary"
                  onClick={() => setEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-admin-primary"
                  disabled={savingEdit}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  {savingEdit ? <FiRefreshCw className="spin-icon" size={14} /> : <FiCheckCircle size={14} />}
                  <span>{savingEdit ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSubmissionDetail;
