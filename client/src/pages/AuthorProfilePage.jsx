import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI, articleAPI, commentAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  FiEdit2, FiTrash2, FiEye, FiSearch, FiPlus, FiShare2, FiHeart,
  FiMessageSquare, FiBookmark, FiLock, FiUnlock, FiCalendar,
  FiAward, FiBookOpen, FiClock, FiCheckCircle, FiAlertCircle,
  FiUser, FiLayers, FiFilter, FiExternalLink, FiSettings, FiGrid, FiList,
  FiTrendingUp, FiActivity, FiToggleLeft, FiToggleRight
} from 'react-icons/fi';
import QuickPublishModal from '../components/QuickPublishModal';
import { getImageUrl, getCategoryLabel } from '../components/ArticleComponents';
import './AuthorStudio.css';

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'news', label: '📰 News' },
  { value: 'editorial', label: '✍️ Editorial' },
  { value: 'features', label: '🎬 Features' },
  { value: 'university-row', label: '🏛️ University Row' },
  { value: 'kyp', label: '📖 Know Your Past' },
  { value: 'tea-shop', label: '☕ Tea Shop' },
  { value: 'pictures-speak', label: "📷 Picture's Speak" },
];

const STATUS_FILTERS = [
  { value: '', label: 'All Statuses' },
  { value: 'published', label: '🟢 Published' },
  { value: 'draft', label: '⚪ Draft' },
  { value: 'pending', label: '🟡 Pending Review' },
  { value: 'flagged', label: '🔴 Flagged' },
];

const AuthorProfilePage = () => {
  const { identifier } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Author & Profile State
  const [authorData, setAuthorData] = useState(null);
  const [authorStats, setAuthorStats] = useState({
    totalArticles: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0
  });
  const [isOwner, setIsOwner] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showFullBio, setShowFullBio] = useState(false);

  // Content & Studio State
  const [activeTab, setActiveTab] = useState('published'); // 'published', 'management', 'liked', 'comments'
  const [articles, setArticles] = useState([]);
  const [likedArticles, setLikedArticles] = useState([]);
  const [myComments, setMyComments] = useState([]);
  const [loadingContent, setLoadingContent] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Advanced QuickPublishModal Editor State for Post Creation / Editing in Author Studio
  const [quickPublishOpen, setQuickPublishOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);

  const effectiveIdentifier = identifier || (user ? (user.username || user._id) : null);

  // Fetch Author Profile & Stats
  const loadAuthorProfile = useCallback(async () => {
    if (!effectiveIdentifier) {
      if (!user) {
        navigate('/login');
        return;
      }
    }
    setProfileLoading(true);
    try {
      const targetId = effectiveIdentifier === 'me' ? (user?.username || user?._id) : effectiveIdentifier;
      const res = await authAPI.getAuthorProfile(targetId);
      if (res.data.success) {
        const fetchedAuthor = res.data.data.author;
        setAuthorData(fetchedAuthor);
        setAuthorStats(res.data.data.stats || {});
        const ownerCheck = !!(user && (user._id === fetchedAuthor._id || user.username === fetchedAuthor.username));
        setIsOwner(ownerCheck);
      }
    } catch (err) {
      console.error('Failed to load author profile:', err);
      toast.error(err.response?.data?.message || 'Author not found');
    } finally {
      setProfileLoading(false);
    }
  }, [effectiveIdentifier, user, navigate]);

  useEffect(() => {
    loadAuthorProfile();
  }, [loadAuthorProfile]);

  // Fetch Tab Content
  const fetchTabContent = useCallback(async () => {
    if (!authorData?._id) return;
    setLoadingContent(true);
    try {
      if (activeTab === 'published' || activeTab === 'management') {
        const params = {
          page,
          limit: 15,
          search: search || undefined,
          category: selectedCategory || undefined,
          status: activeTab === 'management' && isOwner ? (selectedStatus || undefined) : 'published',
          author: authorData._id,
          adminView: activeTab === 'management' && isOwner ? 'true' : undefined
        };
        const res = await articleAPI.getAll(params);
        if (res.data.success) {
          setArticles(res.data.data || []);
          setTotalPages(res.data.totalPages || 1);
        }
      } else if (activeTab === 'liked') {
        const params = {
          page,
          limit: 15,
          search: search || undefined,
          category: selectedCategory || undefined,
          likedBy: authorData._id,
          adminView: 'true'
        };
        const res = await articleAPI.getAll(params);
        if (res.data.success) {
          setLikedArticles(res.data.data || []);
          setTotalPages(res.data.totalPages || 1);
        }
      } else if (activeTab === 'comments') {
        const res = await commentAPI.getMyComments();
        if (res.data.success) {
          setMyComments(res.data.data || []);
          setTotalPages(1);
        }
      }
    } catch (err) {
      console.error('Failed to load tab data:', err);
    } finally {
      setLoadingContent(false);
    }
  }, [authorData?._id, activeTab, isOwner, page, search, selectedCategory, selectedStatus]);

  useEffect(() => {
    if (authorData?._id) {
      fetchTabContent();
    }
  }, [authorData?._id, activeTab, page, search, selectedCategory, selectedStatus, fetchTabContent]);

  // Post Creation & Editing Actions in Author Studio using QuickPublishModal
  const handleOpenCreate = () => {
    setEditingArticle(null);
    setQuickPublishOpen(true);
  };

  const handleOpenEdit = (article) => {
    setEditingArticle(article);
    setQuickPublishOpen(true);
  };

  const handleDeleteArticle = async (articleId) => {
    if (!window.confirm('Are you sure you want to delete this story? This action cannot be undone.')) return;
    try {
      await articleAPI.delete(articleId);
      toast.success('Story deleted');
      setArticles((prev) => prev.filter((a) => a._id !== articleId));
      loadAuthorProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete story');
    }
  };

  const handleToggleStoryStatus = async (article) => {
    const nextStatus = article.status === 'published' ? 'draft' : 'published';
    try {
      const formData = new FormData();
      formData.append('status', nextStatus);
      await articleAPI.update(article._id, formData);
      toast.success(`Story status changed to ${nextStatus.toUpperCase()}`);
      fetchTabContent();
    } catch (err) {
      toast.error('Failed to update story status');
    }
  };

  const handleShareProfile = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `${authorData?.name} — Southern Waves Author Studio`,
        text: authorData?.bio || `Explore stories by ${authorData?.name} on Southern Waves.`,
        url
      });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Author profile link copied!');
    }
  };

  if (profileLoading) {
    return (
      <main style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="nm-spinner-ring" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>Loading Southern Waves Author Studio...</h3>
        </div>
      </main>
    );
  }

  if (!authorData) {
    return (
      <main style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 20px' }}>
        <div style={{ textAlign: 'center', maxWidth: '440px' }}>
          <FiAlertCircle size={48} color="var(--accent-color, #c8102e)" style={{ marginBottom: '12px' }} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900 }}>Author Not Found</h2>
          <p style={{ color: 'var(--color-gray-600)', marginBottom: '20px' }}>This author profile does not exist or has been deactivated.</p>
          <Link to="/" style={{ padding: '10px 20px', background: 'var(--accent-color, #c8102e)', color: '#fff', borderRadius: '8px', fontWeight: 700, textDecoration: 'none' }}>
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="as-studio-page">
      {/* ── Top Header Section: Southern Waves Author Studio ── */}
      <section className="as-header-section">
        <div className="container" style={{ maxWidth: '1200px' }}>
          
          {/* Main Top Studio Grid matching user handwritten diagram */}
          <div className="as-studio-grid">
            
            {/* ── LEFT COLUMN: Image of Profile + Name (Role) + Info + Bio ── */}
            <div className="as-profile-card">
              {/* Profile Image Circle */}
              <div className="as-avatar-wrapper">
                <img
                  src={authorData.avatar ? getImageUrl(authorData.avatar) : `https://ui-avatars.com/api/?name=${encodeURIComponent(authorData.name)}&background=c8102e&color=fff&size=200`}
                  alt={authorData.name}
                  className="as-avatar-img"
                />
                {isOwner && (
                  <Link
                    to="/settings"
                    className="as-settings-btn"
                    title="Edit Profile in Settings"
                  >
                    <FiSettings size={15} />
                  </Link>
                )}
              </div>

              {/* Author Name + (Role) */}
              <div className="as-author-info-block">
                <h1 className="as-author-name">
                  {authorData.name}
                </h1>
                <div className="as-author-badges">
                  <span className="as-role-badge">
                    {authorData.role?.toUpperCase() || 'STUDENT'}
                  </span>
                  <span className="as-username-tag">
                    @{authorData.username}
                  </span>
                  {isOwner && (
                    <span className="as-you-pill">
                      YOU
                    </span>
                  )}
                </div>
              </div>

              {/* Other Tags & Academic Info */}
              <div className="as-academic-meta">
                {authorData.university && (
                  <div className="as-meta-row">
                    <span>🏛️</span>
                    <strong>{authorData.university}</strong>
                  </div>
                )}
                {authorData.academicMajor && (
                  <div className="as-meta-row">
                    <span>🎓</span>
                    <span>{authorData.academicMajor} {authorData.yearOfStudy ? `(${authorData.yearOfStudy})` : ''}</span>
                  </div>
                )}
                <div className="as-meta-row" style={{ color: 'var(--color-gray-500, #64748b)' }}>
                  <span>📅</span>
                  <span>Joined {new Date(authorData.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                </div>
              </div>

              {/* Bio with <more> / <less> expander */}
              {authorData.bio && (
                <div className="as-bio-box">
                  <p className={`as-bio-text ${showFullBio ? '' : 'as-bio-clamp'}`}>
                    {authorData.bio}
                  </p>
                  {authorData.bio.length > 120 && (
                    <button
                      onClick={() => setShowFullBio((prev) => !prev)}
                      className="as-bio-toggle"
                    >
                      {showFullBio ? '<less>' : '<more >'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ── RIGHT COLUMN: Top Bar (Published count + General Search + Buttons) + Analytics Box ── */}
            <div className="as-right-col">
              
              {/* Studio Header Bar */}
              <div className="as-studio-bar">
                {/* Published Stat */}
                <div className="as-published-stat-badge">
                  <span className="as-published-label">
                    Published :
                  </span>
                  <span className="as-published-count">
                    {authorStats.totalArticles || 0}
                  </span>
                </div>

                {/* General Search Input */}
                <div className="as-search-input-wrap">
                  <FiSearch className="as-search-icon" />
                  <input
                    type="text"
                    placeholder="General search stories..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="as-search-input"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="as-search-clear"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Action Buttons: [Add new post] + [Share profile] */}
                <div className="as-studio-actions">
                  {isOwner && (
                    <button
                      onClick={handleOpenCreate}
                      className="as-btn-create"
                    >
                      <FiPlus size={16} /> Add New Post
                    </button>
                  )}

                  <button
                    onClick={handleShareProfile}
                    className="as-btn-share"
                    title="Share Author Profile"
                  >
                    <FiShare2 size={14} /> Share Profile
                  </button>
                </div>
              </div>

              {/* ── Analytics Box ── */}
              <div className="as-analytics-card">
                <div className="as-analytics-head">
                  <div className="as-analytics-title-box">
                    <FiActivity size={18} color="#38bdf8" />
                    <h3 className="as-analytics-title">
                      Author Analytics
                    </h3>
                  </div>
                  <span className="as-live-badge">
                    Live Metric Stream
                  </span>
                </div>

                {/* SVG Visual Performance Wave Curve */}
                <div className="as-svg-wave-container">
                  <svg viewBox="0 0 500 70" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                    <defs>
                      <linearGradient id="analyticsGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#c8102e" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#c8102e" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 0 55 Q 60 15, 120 40 T 240 20 T 360 45 T 500 10 L 500 70 L 0 70 Z"
                      fill="url(#analyticsGrad)"
                    />
                    <path
                      d="M 0 55 Q 60 15, 120 40 T 240 20 T 360 45 T 500 10"
                      fill="none"
                      stroke="#c8102e"
                      strokeWidth="3"
                    />
                    {/* Data Points */}
                    <circle cx="120" cy="40" r="4" fill="#fff" stroke="#c8102e" strokeWidth="2" />
                    <circle cx="240" cy="20" r="4" fill="#fff" stroke="#c8102e" strokeWidth="2" />
                    <circle cx="360" cy="45" r="4" fill="#fff" stroke="#c8102e" strokeWidth="2" />
                    <circle cx="500" cy="10" r="4" fill="#fff" stroke="#c8102e" strokeWidth="2" />
                  </svg>
                </div>

                {/* 4 Metric Pill Cards */}
                <div className="as-metrics-grid">
                  <div className="as-metric-pill">
                    <span className="as-metric-title">Stories Published</span>
                    <span className="as-metric-val" style={{ color: '#ffffff' }}>{authorStats.totalArticles || 0}</span>
                  </div>
                  <div className="as-metric-pill">
                    <span className="as-metric-title">Total Story Reads</span>
                    <span className="as-metric-val" style={{ color: '#38bdf8' }}>{authorStats.totalViews || 0}</span>
                  </div>
                  <div className="as-metric-pill">
                    <span className="as-metric-title">Total Hypes / Likes</span>
                    <span className="as-metric-val" style={{ color: '#f87171' }}>{authorStats.totalLikes || 0}</span>
                  </div>
                  <div className="as-metric-pill">
                    <span className="as-metric-title">Responses</span>
                    <span className="as-metric-val" style={{ color: '#34d399' }}>{authorStats.totalComments || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Tabbed Content Area (Published Stories / Management / Saved & Liked / My Comments) ── */}
      <section className="container" style={{ maxWidth: '1200px', marginTop: '28px' }}>
        
        {/* Navigation Tabs Header */}
        <div className="as-tabs-header">
          <div className="as-tabs-list">
            
            {/* Tab 1: Published Stories */}
            <button
              onClick={() => { setActiveTab('published'); setPage(1); }}
              className={`as-tab-btn ${activeTab === 'published' ? 'active' : ''}`}
            >
              📰 Published Stories ({authorStats.totalArticles || 0})
            </button>

            {/* Tab 2: Management (Edit, Delete, Stories Enable/Disable) */}
            {isOwner && (
              <button
                onClick={() => { setActiveTab('management'); setPage(1); }}
                className={`as-tab-btn ${activeTab === 'management' ? 'active' : ''}`}
              >
                🛠️ Management Studio
              </button>
            )}

            {/* Tab 3: Saved & Liked */}
            {isOwner && (
              <button
                onClick={() => { setActiveTab('liked'); setPage(1); }}
                className={`as-tab-btn ${activeTab === 'liked' ? 'active' : ''}`}
              >
                💖 Saved & Liked
              </button>
            )}

            {/* Tab 4: My Comments */}
            {isOwner && (
              <button
                onClick={() => { setActiveTab('comments'); setPage(1); }}
                className={`as-tab-btn ${activeTab === 'comments' ? 'active' : ''}`}
              >
                💬 My Comments
              </button>
            )}
          </div>

          {/* Right side: View Mode Toggle (Grid / List Icons) */}
          <div className="as-view-switcher">
            <button
              onClick={() => setViewMode('grid')}
              className={`as-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              title="Grid View"
            >
              <FiGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`as-view-btn ${viewMode === 'table' ? 'active' : ''}`}
              title="List / Table View"
            >
              <FiList size={16} />
            </button>
          </div>
        </div>

        {/* Secondary Category & Status Filter Bar */}
        {(activeTab === 'published' || activeTab === 'management') && (
          <div className="as-filter-bar">
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
                className="as-filter-select"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>

              {activeTab === 'management' && isOwner && (
                <select
                  value={selectedStatus}
                  onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
                  className="as-filter-select"
                >
                  {STATUS_FILTERS.map((st) => (
                    <option key={st.value} value={st.value}>{st.label}</option>
                  ))}
                </select>
              )}
            </div>

            {search && (
              <span style={{ fontSize: '12px', color: 'var(--color-gray-500, #64748b)', fontWeight: 600 }}>
                Filtering by: &quot;<strong>{search}</strong>&quot; ({articles.length} found)
              </span>
            )}
          </div>
        )}

        {/* ── Content Render ── */}
        {loadingContent ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div className="nm-spinner-ring" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 700, color: 'var(--color-gray-500, #64748b)' }}>Loading stories...</p>
          </div>
        ) : (activeTab === 'published' || activeTab === 'management') ? (
          articles.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: 'var(--color-paper, #ffffff)',
              borderRadius: '16px',
              border: '1.5px dashed var(--color-gray-300, #cbd5e1)'
            }}>
              <FiBookOpen size={40} color="#94a3b8" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, margin: '0 0 6px' }}>No Stories Found</h3>
              <p style={{ color: 'var(--color-gray-500, #64748b)', fontSize: '13px', margin: '0 0 16px' }}>
                {isOwner ? 'You have not created stories matching this filter.' : 'This author has not published stories in this section yet.'}
              </p>
              {isOwner && (
                <button
                  onClick={handleOpenCreate}
                  className="as-btn-create"
                  style={{ margin: '0 auto' }}
                >
                  + Add New Story
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            /* ── Card Grid View (with View, Edit, Delete buttons) ── */
            <div className="as-story-grid">
              {articles.map((art) => (
                <div key={art._id} className="as-story-card">
                  {art.coverImage ? (
                    <div className="as-story-thumb">
                      <img
                        src={getImageUrl(art.coverImage)}
                        alt={art.title}
                        className="as-story-img"
                      />
                      <span className="as-story-cat-chip">
                        {getCategoryLabel(art.category)}
                      </span>
                    </div>
                  ) : (
                    <div className="as-story-thumb as-story-thumb-placeholder">
                      <span className="as-story-cat-chip">
                        {getCategoryLabel(art.category)}
                      </span>
                    </div>
                  )}

                  <div className="as-story-body">
                    <div className="as-story-meta-top">
                      <span>
                        {new Date(art.publishedAt || art.createdAt).toLocaleDateString()}
                      </span>
                      {isOwner && (
                        <span className={`as-status-badge status-${art.status || 'draft'}`}>
                          {art.status?.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <h3 className="as-story-title">
                      <Link to={`/article/${art.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        {art.title}
                      </Link>
                    </h3>

                    <p className="as-story-lead">
                      {art.lead}
                    </p>

                    {/* Footer Action Bar with View, Edit, Delete Buttons */}
                    <div className="as-story-footer">
                      <div className="as-story-stats">
                        <span title="Views">👁️ {art.views || 0}</span>
                        <span title="Likes">❤️ {art.likes ? art.likes.length : 0}</span>
                        <span title="Responses">💬 {art.commentCount || 0}</span>
                      </div>

                      <div className="as-story-actions-group">
                        {/* View Button */}
                        <Link
                          to={`/article/${art.slug}`}
                          className="as-action-link-btn"
                          title="View Story"
                        >
                          <FiEye size={13} /> View
                        </Link>

                        {/* Owner Edit & Delete Buttons */}
                        {isOwner && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(art)}
                              className="as-action-link-btn"
                              title="Edit Story"
                            >
                              <FiEdit2 size={13} /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteArticle(art._id)}
                              className="as-action-delete-btn"
                              title="Delete Story"
                            >
                              <FiTrash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ── Table / Management View (Desktop Table + Mobile Cards) ── */
            <>
              {/* Desktop Table */}
              <div className="as-table-container">
                <table className="as-manage-table">
                  <thead>
                    <tr>
                      <th>Story Title</th>
                      <th>Category</th>
                      <th>Status</th>
                      {isOwner && <th>Story Active/Draft</th>}
                      <th>Performance</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {articles.map((art) => (
                      <tr key={art._id}>
                        <td style={{ fontWeight: 700, maxWidth: '280px' }}>
                          <Link to={`/article/${art.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                            {art.title}
                          </Link>
                        </td>
                        <td>{getCategoryLabel(art.category)}</td>
                        <td>
                          <span className={`as-status-badge status-${art.status || 'draft'}`}>
                            {art.status?.toUpperCase()}
                          </span>
                        </td>

                        {/* Story Enable / Disable toggle button */}
                        {isOwner && (
                          <td>
                            <button
                              onClick={() => handleToggleStoryStatus(art)}
                              className={`as-status-toggle-btn ${art.status === 'published' ? 'active' : 'draft'}`}
                              title="Toggle Story Publish / Draft"
                            >
                              {art.status === 'published' ? <FiToggleRight size={16} color="var(--color-success, #16a34a)" /> : <FiToggleLeft size={16} />}
                              <span>{art.status === 'published' ? 'Active' : 'Draft'}</span>
                            </button>
                          </td>
                        )}

                        <td style={{ color: 'var(--color-gray-500, #64748b)', whiteSpace: 'nowrap' }}>
                          👁️ {art.views || 0} • ❤️ {art.likes ? art.likes.length : 0} • 💬 {art.commentCount || 0}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <Link to={`/article/${art.slug}`} className="as-action-link-btn" title="View Story">
                              <FiEye size={14} />
                            </Link>
                            {isOwner && (
                              <>
                                <button onClick={() => handleOpenEdit(art)} className="as-action-link-btn" title="Edit Story">
                                  <FiEdit2 size={14} />
                                </button>
                                <button onClick={() => handleDeleteArticle(art._id)} className="as-action-delete-btn" title="Delete Story">
                                  <FiTrash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards for screens <= 768px */}
              <div className="as-mobile-mgmt-list">
                {articles.map((art) => (
                  <div key={art._id} className="as-mobile-mgmt-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-color, #c8102e)' }}>
                        {getCategoryLabel(art.category)}
                      </span>
                      <span className={`as-status-badge status-${art.status || 'draft'}`}>
                        {art.status?.toUpperCase()}
                      </span>
                    </div>

                    <h4 className="as-story-title" style={{ margin: 0, fontSize: '15px' }}>
                      <Link to={`/article/${art.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        {art.title}
                      </Link>
                    </h4>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: 'var(--color-gray-500)' }}>
                      <span>👁️ {art.views || 0} • ❤️ {art.likes ? art.likes.length : 0} • 💬 {art.commentCount || 0}</span>
                      {isOwner && (
                        <button
                          onClick={() => handleToggleStoryStatus(art)}
                          className={`as-status-toggle-btn ${art.status === 'published' ? 'active' : 'draft'}`}
                        >
                          {art.status === 'published' ? <FiToggleRight size={15} color="var(--color-success, #16a34a)" /> : <FiToggleLeft size={15} />}
                          <span>{art.status === 'published' ? 'Active' : 'Draft'}</span>
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--color-gray-200)' }}>
                      <Link to={`/article/${art.slug}`} className="as-action-link-btn" style={{ flex: 1, justifyContent: 'center' }}>
                        <FiEye size={13} /> View
                      </Link>
                      {isOwner && (
                        <>
                          <button onClick={() => handleOpenEdit(art)} className="as-action-link-btn" style={{ flex: 1, justifyContent: 'center' }}>
                            <FiEdit2 size={13} /> Edit
                          </button>
                          <button onClick={() => handleDeleteArticle(art._id)} className="as-action-delete-btn" style={{ padding: '6px 12px' }}>
                            <FiTrash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )
        ) : activeTab === 'liked' ? (
          likedArticles.length === 0 ? (
            <div className="as-empty-state-card">
              <FiHeart size={40} color="var(--color-gray-400)" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontWeight: 800, color: 'var(--color-black)' }}>No Saved / Liked Stories</h3>
              <p style={{ color: 'var(--color-gray-500)', fontSize: '13px' }}>Stories you hype or bookmark will appear here.</p>
            </div>
          ) : (
            <div className="as-story-grid">
              {likedArticles.map((art) => (
                <div key={art._id} className="as-story-card" style={{ padding: '16px' }}>
                  <span className="as-story-cat-chip" style={{ position: 'static', display: 'inline-block', marginBottom: '8px' }}>
                    {getCategoryLabel(art.category)}
                  </span>
                  <h4 className="as-story-title" style={{ margin: '6px 0', fontSize: '15px' }}>
                    <Link to={`/article/${art.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {art.title}
                    </Link>
                  </h4>
                  <p className="as-story-lead">{art.lead}</p>
                  <div style={{ fontSize: '11.5px', color: 'var(--color-gray-500)' }}>By {art.author?.name || 'Author'}</div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Tab 4: My Comments */
          myComments.length === 0 ? (
            <div className="as-empty-state-card">
              <FiMessageSquare size={40} color="var(--color-gray-400)" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontWeight: 800, color: 'var(--color-black)' }}>No Comments Yet</h3>
              <p style={{ color: 'var(--color-gray-500)', fontSize: '13px' }}>Responses and discussions you participate in will show up here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {myComments.map((c) => (
                <div key={c._id} className="as-comment-card">
                  <div className="as-comment-meta">
                    <span>On Story: <strong>{c.article?.title || 'Article'}</strong></span>
                    <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="as-comment-text">{c.text}</p>
                </div>
              ))}
            </div>
          )
        )}
      </section>

      {/* ── Advanced QuickPublishModal Editor (Add New Post / Edit) ── */}
      {quickPublishOpen && (
        <QuickPublishModal
          editingArticle={editingArticle}
          defaultCategory="news"
          onClose={() => {
            setQuickPublishOpen(false);
            setEditingArticle(null);
          }}
          onPublishSuccess={() => {
            fetchTabContent();
            loadAuthorProfile();
          }}
        />
      )}
    </main>
  );
};

export default AuthorProfilePage;
