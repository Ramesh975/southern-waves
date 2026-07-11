import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { articleAPI, commentAPI, uploadsAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  FiUpload, FiPlus, FiEdit2, FiTrash2, FiEye, FiSearch,
  FiFilter, FiTrendingUp, FiMessageSquare, FiBookmark, FiLayout,
  FiX, FiCheckCircle, FiHeart, FiShare2, FiShield, FiAlertOctagon,
  FiUsers, FiLayers, FiCamera
} from 'react-icons/fi';
import WordEditor from '../components/WordEditor';
import { getImageUrl } from '../components/ArticleComponents';
import './MyUploadsPage.css';

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'news', label: '📰 News' },
  { value: 'editorial', label: '✍️ Editorial' },
  { value: 'features', label: '🎬 Features' },
  { value: 'kyp', label: '📖 Know Your Past' },
  { value: 'tea-shop', label: '☕ Tea Shop' },
  { value: 'pictures-speak', label: "📷 Picture's Speak" },
];

const MyUploadsPage = () => {
  const { user, isAdmin, isEditor, isModerator } = useAuth();
  const navigate = useNavigate();

  // Dashboard state
  const [stats, setStats] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [likedArticles, setLikedArticles] = useState([]);
  const [myComments, setMyComments] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState('my-submissions');

  // Filters state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal Editor state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // null means creating
  const [editorLoading, setEditorLoading] = useState(false);
  const [coverImage, setCoverImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [form, setForm] = useState({
    title: '',
    lead: '',
    body: '',
    category: 'news',
    subCategory: '',
    historicalYear: '',
    tags: '',
    status: 'draft',
    isFeatured: false,
    isTrending: false,
    isBreaking: false,
    isPushedToHome: false,
  });

  // Fetch Stats
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await uploadsAPI.getStats();
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load statistical reports:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch Consolidated Tab Data
  const fetchTabData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'my-submissions') {
        const params = {
          page,
          limit: 12,
          search: search || undefined,
          category: category || undefined,
          status: status || undefined,
          author: user?._id,
          adminView: 'true' // show drafts and pendings
        };
        const res = await articleAPI.getAll(params);
        if (res.data.success) {
          setUploads(res.data.data);
          setTotalPages(res.data.totalPages || 1);
        }
      } 
      else if (activeTab === 'liked-posts') {
        const params = {
          page,
          limit: 12,
          search: search || undefined,
          category: category || undefined,
          likedBy: user?._id,
          adminView: 'true'
        };
        const res = await articleAPI.getAll(params);
        if (res.data.success) {
          setLikedArticles(res.data.data);
          setTotalPages(res.data.totalPages || 1);
        }
      }
      else if (activeTab === 'my-comments') {
        const res = await commentAPI.getMyComments();
        if (res.data.success) {
          setMyComments(res.data.data);
          setTotalPages(1);
        }
      }
      else if (activeTab === 'moderation-queue' && isModerator) {
        const params = {
          page,
          limit: 50,
          adminView: 'true',
          status: 'pending'
        };
        const res = await articleAPI.getAll(params);
        if (res.data.success) {
          // Filter flagged posts or posts in pending review status
          const data = res.data.data.filter(a => a.isFlagged || a.status === 'pending');
          setUploads(data);
          setTotalPages(res.data.totalPages || 1);
        }
      }
      else if (activeTab === 'all-submissions' && (isEditor || isAdmin)) {
        const params = {
          page,
          limit: 12,
          search: search || undefined,
          category: category || undefined,
          status: status || undefined,
          adminView: 'true'
        };
        const res = await articleAPI.getAll(params);
        if (res.data.success) {
          setUploads(res.data.data);
          setTotalPages(res.data.totalPages || 1);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load tab contents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchTabData();
    }
  }, [user, page, category, status, search, activeTab]);

  // Open editor modal for creation
  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({
      title: '',
      lead: '',
      body: '',
      category: user?.role === 'student' ? 'tea-shop' : 'news',
      subCategory: '',
      historicalYear: '',
      tags: '',
      status: user?.role === 'student' ? 'published' : 'draft',
      isFeatured: false,
      isTrending: false,
      isBreaking: false,
      isPushedToHome: false,
    });
    setCoverImage(null);
    setImagePreview('');
    setModalOpen(true);
  };

  // Open editor modal for editing
  const handleOpenEdit = (article) => {
    setEditingId(article._id);
    setForm({
      title: article.title,
      lead: article.lead,
      body: article.body,
      category: article.category,
      subCategory: article.subCategory || '',
      historicalYear: article.historicalYear || '',
      tags: article.tags?.join(', ') || '',
      status: article.status,
      isFeatured: article.isFeatured || false,
      isTrending: article.isTrending || false,
      isBreaking: article.isBreaking || false,
      isPushedToHome: article.isPushedToHome || false,
    });
    setCoverImage(null);
    if (article.coverImage) {
      setImagePreview(getImageUrl(article.coverImage));
    } else {
      setImagePreview('');
    }
    setModalOpen(true);
  };

  // Handle Cover Image upload change
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCoverImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // Remove Cover Image
  const handleRemoveImage = () => {
    setCoverImage(null);
    setImagePreview('');
    setForm(prev => ({ ...prev, coverImage: '' }));
  };

  // Handle Modal Save (Create / Update)
  const handleSaveUpload = async (e) => {
    e.preventDefault();
    if (!form.title || !form.lead || !form.body || !form.category) {
      return toast.error('Please fill in all required fields');
    }

    setEditorLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          formData.append(key, val);
        }
      });

      if (coverImage) {
        formData.append('coverImage', coverImage);
      }

      let res;
      if (editingId) {
        res = await articleAPI.update(editingId, formData);
        toast.success('Upload updated successfully!');
      } else {
        res = await articleAPI.create(formData);
        if (user?.role === 'student' && res.data?.data?.status === 'published') {
          toast.success('Story published in the Tea Shop! ☕');
        } else if (res.data?.data?.status === 'pending') {
          toast.success('Story submitted for review! ✍️');
        } else {
          toast.success('Upload created successfully!');
        }
      }

      setModalOpen(false);
      fetchTabData();
      fetchStats();
    } catch (err) {
      const errMsg = err?.response?.data?.message;
      if (errMsg === 'Not Allowed Tags') {
        toast.error('⚠️ Your article contains tags that are restricted by guidelines.', {
          duration: 5000,
          style: { background: '#fee2e2', color: '#991b1b', border: '1.5px solid #fecaca' }
        });
      } else {
        toast.error(errMsg || 'Failed to save content');
      }
    } finally {
      setEditorLoading(false);
    }
  };

  // Handle Delete
  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) return;

    try {
      await articleAPI.delete(id);
      toast.success('Content deleted successfully');
      fetchTabData();
      fetchStats();
    } catch (err) {
      toast.error('Failed to delete content');
    }
  };

  // Quick Action: Publish or submit for review
  const handleQuickStatusChange = async (article, newStatus) => {
    try {
      await articleAPI.update(article._id, { status: newStatus });
      toast.success(`Status updated to ${newStatus.toUpperCase()}`);
      fetchTabData();
      fetchStats();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  // Unlike handler
  const handleUnlike = async (articleId) => {
    try {
      await articleAPI.like(articleId);
      toast.success('Post removed from likes');
      fetchTabData();
      fetchStats();
    } catch (err) {
      toast.error('Failed to unlike post');
    }
  };

  // Delete comment handler
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment? This cannot be undone.')) return;
    try {
      await commentAPI.delete(commentId);
      toast.success('Comment deleted successfully');
      fetchTabData();
      fetchStats();
    } catch (err) {
      toast.error('Failed to delete comment');
    }
  };

  // Category styling helper
  const getCategoryColor = (cat) => {
    const colors = {
      news: '#fee2e2',
      editorial: '#dbeafe',
      features: '#dcfce7',
      kyp: '#fef9c3',
      'tea-shop': '#fce7f3',
      'pictures-speak': '#ede9fe',
    };
    return colors[cat] || '#f3f4f6';
  };

  const roleColors = {
    admin: '#dc2626',
    editor: '#2563eb',
    moderator: '#10b981',
    student: '#4b5563',
  };

  const currentRole = stats?.role || user?.role || 'student';
  const ownStats = stats?.ownStats || { total: 0, published: 0, pending: 0, draft: 0, archived: 0, views: 0, likes: 0, comments: 0, shares: 0 };
  
  // Calculate percentage of published articles
  const publishedRatio = ownStats.total > 0 ? (ownStats.published / ownStats.total) : 0;
  const publishedPercent = Math.round(publishedRatio * 100);
  const strokeOffset = 220 - (220 * publishedRatio);

  // Client-side filtering for comments search
  const filteredComments = myComments.filter(comment => {
    const term = search.toLowerCase();
    const commentTextMatches = comment.text?.toLowerCase().includes(term);
    const articleTitleMatches = comment.article?.title?.toLowerCase().includes(term);
    return commentTextMatches || articleTitleMatches;
  });

  return (
    <div className="my-uploads-container">
      {/* ── Header ── */}
      <div className="my-uploads-header">
        <div className="my-uploads-title-area">
          <h1 className="my-uploads-title">My Uploads & Media</h1>
          <span className="my-uploads-subtitle">Manage your submissions, track analytics, and review system performance.</span>
        </div>
        <button className="btn-upload-trigger" onClick={handleOpenCreate}>
          <FiPlus size={16} /> New Upload
        </button>
      </div>

      {/* ── Role Banner ── */}
      <div className="role-integration-banner">
        <div className="role-banner-info">
          <span className="role-badge-large" style={{ background: roleColors[currentRole] }}>
            {currentRole} Mode
          </span>
          <div className="role-banner-text">
            <h4>Rule-Based Access Integration</h4>
            <p>
              {currentRole === 'student' && 'You can write Tea Shop posts & Photos. View and manage your own content.'}
              {currentRole === 'moderator' && 'You can write and manage own content, plus review community flagged posts.'}
              {currentRole === 'editor' && 'You can edit, publish and review any student submissions across the system.'}
              {currentRole === 'admin' && 'You have full access to manage all content, users, and platform statistics.'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="stats-grid">
        {/* Total Uploads */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-number">{ownStats.total}</div>
              <div className="stat-label">Total Uploaded Items</div>
            </div>
            <div className="chart-container" style={{ width: 60, height: 60 }}>
              <svg className="chart-svg" width="60" height="60" viewBox="0 0 80 80">
                <circle className="chart-bg-circle" cx="40" cy="40" r="35" />
                <circle
                  className="chart-indicator-circle"
                  cx="40"
                  cy="40"
                  r="35"
                  style={{ strokeDashoffset: strokeOffset, stroke: roleColors[currentRole] }}
                />
                <text className="chart-text" x="40" y="40">{publishedPercent}%</text>
              </svg>
            </div>
          </div>
          <div style={{ marginTop: 'auto', fontSize: 11, color: 'var(--color-gray-500)' }}>
            {ownStats.published} Published • {ownStats.pending} Pending
          </div>
        </div>

        {/* Views */}
        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <FiEye size={20} />
          </div>
          <div className="stat-number">{ownStats.views.toLocaleString()}</div>
          <div className="stat-label">Total Content Views</div>
          <div style={{ marginTop: 'auto', fontSize: 11, color: 'var(--color-gray-500)' }}>
            Across all your authored stories
          </div>
        </div>

        {/* Likes */}
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ color: '#ec4899', background: '#fdf2f8' }}>
            <FiHeart size={20} />
          </div>
          <div className="stat-number">{ownStats.likes.toLocaleString()}</div>
          <div className="stat-label">Total Likes & Appreciations</div>
          <div style={{ marginTop: 'auto', fontSize: 11, color: 'var(--color-gray-500)' }}>
            Likes from student peers
          </div>
        </div>

        {/* Discussion & Shares */}
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ color: '#8b5cf6', background: '#f5f3ff' }}>
            <FiMessageSquare size={20} />
          </div>
          <div className="stat-number">{(ownStats.comments || 0) + (ownStats.shares || 0)}</div>
          <div className="stat-label">Discussion & Shares</div>
          <div style={{ marginTop: 'auto', fontSize: 11, color: 'var(--color-gray-500)' }}>
            {ownStats.comments || 0} Comments • {ownStats.shares || 0} Shares
          </div>
        </div>
      </div>

      {/* ── Role Specific Integration Panels ── */}
      {!statsLoading && stats && (
        <>
          {currentRole === 'moderator' && stats.moderatorStats && (
            <div className="role-integration-banner" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', marginBottom: 40 }}>
              <div className="role-banner-info">
                <span className="role-badge-large" style={{ background: '#10b981' }}>MODERATOR INBOX</span>
                <div className="role-banner-text">
                  <h4>Community Content Safety Queue</h4>
                  <p>
                    There are <strong>{stats.moderatorStats.flaggedArticles}</strong> flagged articles and <strong>{stats.moderatorStats.pendingComments}</strong> comments pending review.
                  </p>
                </div>
              </div>
              <button 
                className="btn-upload-trigger" 
                style={{ background: '#10b981', borderColor: '#10b981' }}
                onClick={() => {
                  setActiveTab(activeTab === 'moderation-queue' ? 'my-submissions' : 'moderation-queue');
                }}
              >
                {activeTab === 'moderation-queue' ? 'Show My Uploads' : 'View Flagged Queue'}
              </button>
            </div>
          )}

          {currentRole === 'editor' && stats.editorStats && (
            <div className="role-integration-banner" style={{ background: '#eff6ff', borderColor: '#bfdbfe', marginBottom: 40 }}>
              <div className="role-banner-info">
                <span className="role-badge-large" style={{ background: '#2563eb' }}>EDITORIAL DESK</span>
                <div className="role-banner-text">
                  <h4>Review & Approval Queue</h4>
                  <p>
                    There are <strong>{stats.editorStats.pendingSubmissions}</strong> student articles pending approval. Total platform items: {stats.editorStats.totalArticles}.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button 
                  className="btn-upload-trigger" 
                  style={{ background: '#2563eb', borderColor: '#2563eb' }}
                  onClick={() => {
                    setActiveTab(activeTab === 'all-submissions' ? 'my-submissions' : 'all-submissions');
                  }}
                >
                  {activeTab === 'all-submissions' ? 'Show My Uploads' : 'View Platform Submissions'}
                </button>
                <button className="btn-upload-trigger" style={{ background: '#1e293b', borderColor: '#1e293b' }} onClick={() => navigate('/admin/submissions')}>
                  Review Page
                </button>
              </div>
            </div>
          )}

          {currentRole === 'admin' && stats.adminStats && (
            <div style={{ background: 'var(--color-white)', border: '2px solid var(--color-black)', borderRadius: '16px', padding: '24px', marginBottom: '40px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', textTransform: 'uppercase', marginBottom: '16px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiShield size={18} color="var(--color-red)" /> System Administration Dashboard Reports
              </h3>
              <div className="stats-grid" style={{ marginBottom: 0 }}>
                <div style={{ background: 'var(--color-gray-100)', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{stats.adminStats.totalUsers}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-gray-500)', textTransform: 'uppercase', fontWeight: 700 }}>Users Registry</div>
                  <div style={{ fontSize: '10px', color: 'var(--color-gray-600)', marginTop: '4px' }}>
                    S: {stats.adminStats.roleDistribution.student || 0} • M: {stats.adminStats.roleDistribution.moderator || 0} • E: {stats.adminStats.roleDistribution.editor || 0} • A: {stats.adminStats.roleDistribution.admin || 0}
                  </div>
                </div>
                <div style={{ background: 'var(--color-gray-100)', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{stats.adminStats.totalArticles}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-gray-500)', textTransform: 'uppercase', fontWeight: 700 }}>Articles Base</div>
                  <div style={{ fontSize: '10px', color: 'var(--color-gray-600)', marginTop: '4px' }}>
                    P: {stats.adminStats.publishedArticles} • Rev: {stats.adminStats.pendingSubmissions} • Flag: {stats.adminStats.flaggedArticles}
                  </div>
                </div>
                <div style={{ background: 'var(--color-gray-100)', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{stats.adminStats.totalViews.toLocaleString()}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-gray-500)', textTransform: 'uppercase', fontWeight: 700 }}>Platform Views</div>
                  <div style={{ fontSize: '10px', color: 'var(--color-gray-600)', marginTop: '4px' }}>Total page impressions</div>
                </div>
                <div style={{ background: 'var(--color-gray-100)', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{stats.adminStats.totalComments}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-gray-500)', textTransform: 'uppercase', fontWeight: 700 }}>Discussions Hub</div>
                  <div style={{ fontSize: '10px', color: 'var(--color-gray-600)', marginTop: '4px' }}>Comments and user debates</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
                <button className="btn-upload-trigger" style={{ background: 'var(--color-black)' }} onClick={() => setActiveTab(activeTab === 'all-submissions' ? 'my-submissions' : 'all-submissions')}>
                  {activeTab === 'all-submissions' ? 'Show My Uploads Only' : 'Manage Platform Content'}
                </button>
                <button className="btn-upload-trigger" style={{ background: '#2563eb', borderColor: '#2563eb' }} onClick={() => navigate('/admin')}>
                  Go to SW Admin Panel
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Filters and Controls Panel ── */}
      <div className="controls-panel">
        <div className="search-filter-row">
          {/* Keyword Search */}
          <div className="search-input-wrapper">
            <FiSearch className="search-input-icon" size={16} />
            <input
              type="text"
              placeholder={activeTab === 'my-comments' ? "Search comments by text or title..." : "Search uploads by title, lead, tags..."}
              className="search-field"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Status Select (only applicable to article lists) */}
          {activeTab !== 'my-comments' && activeTab !== 'liked-posts' && (
            <select
              className="filter-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="draft">Drafts</option>
              <option value="pending">Pending Review</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          )}
        </div>

        {/* Categorical filter pills */}
        {activeTab !== 'my-comments' && (
          <div className="categories-scroll-wrapper">
            <span className="categories-scroll-label">Filter by Category</span>
            <div className="categories-pills">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  className={`category-pill${category === cat.value ? ' active' : ''}`}
                  onClick={() => setCategory(cat.value)}
                >
                  {cat.label || 'All'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* View Switch Headers */}
      <div className="dashboard-tabs">
        <div 
          className={`dashboard-tab${activeTab === 'my-submissions' ? ' active' : ''}`}
          onClick={() => setActiveTab('my-submissions')}
        >
          My Submissions
        </div>
        
        <div 
          className={`dashboard-tab${activeTab === 'liked-posts' ? ' active' : ''}`}
          onClick={() => setActiveTab('liked-posts')}
        >
          Liked Posts
        </div>
        
        <div 
          className={`dashboard-tab${activeTab === 'my-comments' ? ' active' : ''}`}
          onClick={() => setActiveTab('my-comments')}
        >
          My Comments
        </div>

        {isModerator && (
          <div 
            className={`dashboard-tab${activeTab === 'moderation-queue' ? ' active' : ''}`}
            onClick={() => setActiveTab('moderation-queue')}
          >
            Moderation Queue
          </div>
        )}
        
        {(isEditor || isAdmin) && (
          <div 
            className={`dashboard-tab${activeTab === 'all-submissions' ? ' active' : ''}`}
            onClick={() => setActiveTab('all-submissions')}
          >
            All Submissions (Admin View)
          </div>
        )}
      </div>

      {/* ── Content Grid ── */}
      {loading ? (
        <div className="loading-spinner" style={{ margin: '80px auto' }}><div className="spinner" /></div>
      ) : (
        <>
          {/* TAB 1: My Submissions & General Submissions list */}
          {(activeTab === 'my-submissions' || activeTab === 'all-submissions' || activeTab === 'moderation-queue') && (
            uploads.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🌊</div>
                <h3 className="empty-state-title">No Uploads Found</h3>
                <p className="empty-state-text">
                  We couldn't find any uploads matching your search filters.
                </p>
                <button className="btn-upload-trigger" onClick={handleOpenCreate}>
                  + Create Upload
                </button>
              </div>
            ) : (
              <div className="articles-grid">
                {uploads.map(article => (
                  <div key={article._id} className="upload-card">
                    {/* Image Thumbnail */}
                    <div className="upload-card-image-wrapper">
                      {article.coverImage ? (
                        <img
                          className="upload-card-image"
                          src={getImageUrl(article.coverImage)}
                          alt={article.title}
                        />
                      ) : (
                        <div className="upload-card-no-image">SW</div>
                      )}
                      
                      <div className="upload-card-badges">
                        <span className="badge-cat" style={{ background: getCategoryColor(article.category) }}>
                          {article.category}
                        </span>
                        <span className={`badge-status ${article.status}`}>
                          {article.status}
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="upload-card-content">
                      <div className="upload-card-meta">
                        <span>Author: {article.author?.name || 'Unknown'}</span>
                        <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                      </div>
                      
                      <h3 className="upload-card-title">{article.title}</h3>
                      <p className="upload-card-lead">{article.lead}</p>

                      <div className="upload-card-stats">
                        <span className="upload-card-stat"><FiEye size={13} /> {article.views || 0}</span>
                        <span className="upload-card-stat"><FiHeart size={13} /> {article.likes?.length || 0}</span>
                        <span className="upload-card-stat"><FiShare2 size={13} /> {article.shares || 0}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="upload-card-actions">
                      <a
                        className="upload-card-action-btn"
                        href={`/article/${article.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FiEye size={14} /> View
                      </a>
                      
                      {(article.author?._id === user?._id || isAdmin || isEditor) && (
                        <button
                          className="upload-card-action-btn"
                          onClick={() => handleOpenEdit(article)}
                        >
                          <FiEdit2 size={14} /> Edit
                        </button>
                      )}

                      {article.status === 'draft' && article.author?._id === user?._id && (
                        <button
                          className="upload-card-action-btn"
                          onClick={() => handleQuickStatusChange(article, 'pending')}
                          style={{ color: 'var(--accent-color)' }}
                        >
                          <FiCheckCircle size={14} /> Submit
                        </button>
                      )}

                      {article.status === 'pending' && (isEditor || isAdmin) && (
                        <button
                          className="upload-card-action-btn"
                          onClick={() => handleQuickStatusChange(article, 'published')}
                          style={{ color: '#10b981' }}
                        >
                          <FiCheckCircle size={14} /> Publish
                        </button>
                      )}

                      {(article.author?._id === user?._id || isAdmin) && (
                        <button
                          className="upload-card-action-btn delete"
                          onClick={() => handleDelete(article._id, article.title)}
                        >
                          <FiTrash2 size={14} /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* TAB 2: Liked Posts */}
          {activeTab === 'liked-posts' && (
            likedArticles.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon" style={{ color: '#ec4899' }}>💖</div>
                <h3 className="empty-state-title">No Liked Posts</h3>
                <p className="empty-state-text">
                  You haven't liked any articles yet. Explore the homepage or news menu to read and like stories!
                </p>
                <button className="btn-upload-trigger" style={{ background: '#ec4899', borderColor: '#ec4899' }} onClick={() => navigate('/')}>
                  Explore Articles
                </button>
              </div>
            ) : (
              <div className="articles-grid">
                {likedArticles.map(article => (
                  <div key={article._id} className="upload-card">
                    {/* Image Thumbnail */}
                    <div className="upload-card-image-wrapper">
                      {article.coverImage ? (
                        <img
                          className="upload-card-image"
                          src={getImageUrl(article.coverImage)}
                          alt={article.title}
                        />
                      ) : (
                        <div className="upload-card-no-image">SW</div>
                      )}
                      
                      <div className="upload-card-badges">
                        <span className="badge-cat" style={{ background: getCategoryColor(article.category) }}>
                          {article.category}
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="upload-card-content">
                      <div className="upload-card-meta">
                        <span>Author: {article.author?.name || 'Unknown'}</span>
                        <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                      </div>
                      
                      <h3 className="upload-card-title">{article.title}</h3>
                      <p className="upload-card-lead">{article.lead}</p>
                    </div>

                    {/* Actions */}
                    <div className="upload-card-actions">
                      <a
                        className="upload-card-action-btn"
                        href={`/article/${article.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ flex: 2 }}
                      >
                        <FiEye size={14} /> Read Article
                      </a>
                      
                      <button
                        className="upload-card-action-btn delete"
                        onClick={() => handleUnlike(article._id)}
                        style={{ color: '#ec4899' }}
                      >
                        <FiHeart size={14} /> Unlike
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* TAB 3: My Comments */}
          {activeTab === 'my-comments' && (
            filteredComments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon" style={{ color: '#8b5cf6' }}>💬</div>
                <h3 className="empty-state-title">No Comments Found</h3>
                <p className="empty-state-text">
                  {search ? 'No comments match your search term.' : 'You haven\'t posted any comments yet.'}
                </p>
                <button className="btn-upload-trigger" style={{ background: '#8b5cf6', borderColor: '#8b5cf6' }} onClick={() => navigate('/')}>
                  Join the Debate
                </button>
              </div>
            ) : (
              <div className="articles-grid">
                {filteredComments.map(comment => (
                  <div key={comment._id} className="comment-item-card">
                    <div className="comment-item-header">
                      Posted on:{' '}
                      {comment.article ? (
                        <a 
                          className="comment-item-link" 
                          href={`/article/${comment.article.slug}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          {comment.article.title}
                        </a>
                      ) : (
                        <span style={{ fontStyle: 'italic' }}>Deleted Article</span>
                      )}
                    </div>
                    
                    <p className="comment-item-text">
                      "{comment.text}"
                    </p>

                    <div className="comment-item-footer">
                      <span>{new Date(comment.createdAt).toLocaleString()}</span>
                      
                      <button
                        className="comment-delete-btn"
                        onClick={() => handleDeleteComment(comment._id)}
                      >
                        <FiTrash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}

      {/* ── Custom Inline Editor Modal ── */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content-card">
            <button className="modal-close-btn" onClick={() => setModalOpen(false)}>
              <FiX size={24} />
            </button>

            <h2 className="modal-title">
              {editingId ? 'Edit Content' : 'Create New Upload'}
            </h2>

            <form onSubmit={handleSaveUpload} className="form-grid">
              {/* Title */}
              <div className="form-group-full">
                <label className="form-label">Article Title *</label>
                <input
                  type="text"
                  placeholder="Enter a punchy, magazine-style title"
                  className="form-input"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  maxLength={120}
                  required
                />
              </div>

              {/* Lead Summary */}
              <div className="form-group-full">
                <label className="form-label">Lead Summary / Subheading *</label>
                <textarea
                  placeholder="Summarize the core of the story in 1-2 engaging sentences..."
                  className="form-textarea"
                  rows={2}
                  value={form.lead}
                  onChange={(e) => setForm({ ...form, lead: e.target.value })}
                  maxLength={400}
                  required
                />
              </div>

              {/* Body Content using Rich WordEditor */}
              <div className="form-group-full">
                <label className="form-label">Story Body Content *</label>
                <WordEditor
                  value={form.body}
                  onChange={(val) => setForm({ ...form, body: val })}
                  placeholder="Tell your story. Include background information, student opinions, or event logs..."
                />
              </div>

              {/* Category Selection */}
              <div>
                <label className="form-label">Category *</label>
                {user?.role === 'student' ? (
                  <select
                    className="form-input"
                    value={form.category}
                    onChange={(e) => {
                      const cat = e.target.value;
                      setForm({
                        ...form,
                        category: cat,
                        status: cat === 'pictures-speak' ? 'pending' : 'published',
                      });
                    }}
                  >
                    <option value="tea-shop">☕ Tea Shop (Publishes Immediately)</option>
                    <option value="pictures-speak">📷 Picture's Speak (Requires Review)</option>
                  </select>
                ) : (
                  <select
                    className="form-input"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="news">📰 News</option>
                    <option value="editorial">✍️ Editorial</option>
                    <option value="features">🎬 Features</option>
                    <option value="kyp">📖 Know Your Past</option>
                    <option value="tea-shop">☕ Tea Shop</option>
                    <option value="pictures-speak">📷 Picture's Speak</option>
                  </select>
                )}
              </div>

              {/* Sub-Category (Optional) */}
              <div>
                <label className="form-label">Sub-Category (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Campus, Film Review, Sports"
                  className="form-input"
                  value={form.subCategory}
                  onChange={(e) => setForm({ ...form, subCategory: e.target.value })}
                />
              </div>

              {/* Historical Year (Required for KYP) */}
              {form.category === 'kyp' && (
                <div>
                  <label className="form-label">Historical Event Year *</label>
                  <input
                    type="number"
                    placeholder="e.g. 1968"
                    className="form-input"
                    value={form.historicalYear}
                    onChange={(e) => setForm({ ...form, historicalYear: e.target.value })}
                    required
                  />
                </div>
              )}

              {/* Tags */}
              <div className={form.category === 'kyp' ? '' : 'form-group-full'}>
                <label className="form-label">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. senate, fees, protest, union"
                  className="form-input"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                />
              </div>

              {/* Cover Image Upload */}
              <div className="form-group-full">
                <label className="form-label">Cover Image / Media Upload</label>
                {imagePreview ? (
                  <div className="image-preview-wrapper">
                    <img className="image-preview" src={imagePreview} alt="Cover preview" />
                    <button type="button" className="image-preview-remove" onClick={handleRemoveImage}>
                      <FiX size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="upload-image-dropzone">
                    <FiCamera size={24} className="icon-upload" />
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--accent-color)' }}>Upload a cover image</span> or drag and drop
                      <p style={{ fontSize: 11, color: 'var(--color-gray-500)', marginTop: 4 }}>PNG, JPG, JPEG up to 10MB</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleImageChange}
                    />
                  </label>
                )}
              </div>

              {/* Elevated Options */}
              {(isEditor || isAdmin) && (
                <div className="form-group-full" style={{ borderTop: '1px solid var(--color-gray-200)', paddingTop: 20 }}>
                  <label className="form-label" style={{ color: 'var(--accent-color)' }}>Elevated Administrative Controls</label>
                  
                  <div className="form-grid" style={{ marginTop: 12 }}>
                    <div>
                      <label className="form-label">Publication Status</label>
                      <select
                        className="form-input"
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                      >
                        <option value="draft">Draft</option>
                        <option value="pending">Pending Review</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>

                    <div className="toggles-group" style={{ alignContent: 'center', display: 'flex', gap: 16 }}>
                      <div 
                        className={`toggle-item${form.isFeatured ? ' active' : ''}`}
                        onClick={() => setForm({ ...form, isFeatured: !form.isFeatured })}
                      >
                        <div className="toggle-switch-box" />
                        <span className="toggle-label">⭐ Spotlight</span>
                      </div>

                      <div 
                        className={`toggle-item${form.isTrending ? ' active' : ''}`}
                        onClick={() => setForm({ ...form, isTrending: !form.isTrending })}
                      >
                        <div className="toggle-switch-box" />
                        <span className="toggle-label">🔥 Trending</span>
                      </div>

                      <div 
                        className={`toggle-item${form.isBreaking ? ' active' : ''}`}
                        onClick={() => setForm({ ...form, isBreaking: !form.isBreaking })}
                      >
                        <div className="toggle-switch-box" />
                        <span className="toggle-label">🚨 Breaking</span>
                      </div>

                      {isAdmin && (
                        <div 
                          className={`toggle-item${form.isPushedToHome ? ' active' : ''}`}
                          onClick={() => setForm({ ...form, isPushedToHome: !form.isPushedToHome })}
                        >
                          <div className="toggle-switch-box" />
                          <span className="toggle-label">🚀 Home Spotlight</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Form Submissions */}
              <div className="form-group-full modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setModalOpen(false)}
                  disabled={editorLoading}
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  className="btn-save"
                  disabled={editorLoading}
                >
                  {editorLoading ? 'Saving content...' : editingId ? 'Update Upload' : 'Publish Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyUploadsPage;
