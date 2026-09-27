import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI, articleAPI, commentAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  FiEdit2, FiTrash2, FiEye, FiSearch, FiPlus, FiShare2, FiHeart,
  FiMessageSquare, FiBookmark, FiLock, FiUnlock, FiCalendar,
  FiAward, FiBookOpen, FiClock, FiCheckCircle, FiAlertCircle,
  FiUser, FiLayers, FiFilter, FiExternalLink, FiSettings, FiGrid, FiList,
  FiTrendingUp, FiActivity, FiToggleLeft, FiToggleRight, FiZap,
  FiCheckSquare, FiSquare, FiCopy, FiArrowRight, FiMic, FiFeather,
  FiRadio, FiCamera, FiBarChart2, FiSliders, FiRefreshCw
} from 'react-icons/fi';
import QuickPublishModal from '../components/QuickPublishModal';
import AuthorAnalyticsGraph from '../components/AuthorAnalyticsGraph';
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
  { value: '', label: 'All Stories', key: 'all' },
  { value: 'published', label: 'Published', key: 'published' },
  { value: 'draft', label: 'Drafts', key: 'draft' },
  { value: 'pending', label: 'Under Review', key: 'pending' },
  { value: 'archived', label: 'Archived', key: 'archived' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'views', label: 'Most Reads / Views' },
  { value: 'likes', label: 'Most Hypes & Likes' },
  { value: 'comments', label: 'Most Discussions' },
];

const AuthorProfilePage = () => {
  const { identifier } = useParams();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Author & Profile State
  const [authorData, setAuthorData] = useState(null);
  const [authorStats, setAuthorStats] = useState({
    totalArticles: 0,
    totalAllArticles: 0,
    publishedCount: 0,
    draftCount: 0,
    pendingCount: 0,
    archivedCount: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    engagementRate: 0
  });
  const [authorAnalytics, setAuthorAnalytics] = useState({
    timeline: [],
    categoryDistribution: [],
    topArticles: []
  });
  const [isOwner, setIsOwner] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showFullBio, setShowFullBio] = useState(false);

  // Content & Studio State
  // Tabs: 'overview' (Analytics & Visual Graph), 'management' (Post Management), 'liked' (Saved/Liked), 'comments' (My Comments)
  const [activeTab, setActiveTab] = useState('overview');
  const [articles, setArticles] = useState([]);
  const [likedArticles, setLikedArticles] = useState([]);
  const [myComments, setMyComments] = useState([]);
  const [loadingContent, setLoadingContent] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'

  // Filter & Sort States
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Batch Selection State
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [batchOperating, setBatchOperating] = useState(false);

  // QuickPublishModal Editor State for Post Creation / Editing in Author Studio
  const [quickPublishOpen, setQuickPublishOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [quickLaunchType, setQuickLaunchType] = useState(null);
  const [quickLaunchCategory, setQuickLaunchCategory] = useState('news');

  const effectiveIdentifier = useMemo(() => {
    if (identifier) return identifier;
    if (location.pathname === '/author/me' || location.pathname === '/author-studio' || location.pathname === '/my-uploads') {
      return 'me';
    }
    return user ? (user.username || user._id) : null;
  }, [identifier, location.pathname, user]);

  // Fetch Author Profile & Stats
  const loadAuthorProfile = useCallback(async () => {
    if (authLoading) return;

    if (!effectiveIdentifier || (effectiveIdentifier === 'me' && !user)) {
      if (!user) {
        navigate('/login?redirect=' + encodeURIComponent(location.pathname));
        return;
      }
    }

    setProfileLoading(true);
    try {
      const targetId = effectiveIdentifier === 'me' ? 'me' : effectiveIdentifier;
      const res = await authAPI.getAuthorProfile(targetId);
      if (res.data.success) {
        const fetchedAuthor = res.data.data.author;
        setAuthorData(fetchedAuthor);
        setAuthorStats(res.data.data.stats || {});
        setAuthorAnalytics(res.data.data.analytics || {});
        
        const ownerCheck = Boolean(
          res.data.data.isOwner ||
          (user && (user._id === fetchedAuthor._id || user.username === fetchedAuthor.username))
        );
        setIsOwner(ownerCheck);

        // If not owner, default to overview or published
        if (!ownerCheck && (activeTab === 'management' || activeTab === 'liked' || activeTab === 'comments')) {
          setActiveTab('overview');
        }
      }
    } catch (err) {
      console.error('Failed to load author profile:', err);
      toast.error(err.response?.data?.message || 'Author not found');
    } finally {
      setProfileLoading(false);
    }
  }, [effectiveIdentifier, user, authLoading, navigate, location.pathname, activeTab]);

  useEffect(() => {
    loadAuthorProfile();
  }, [loadAuthorProfile]);

  // Fetch Tab Content
  const fetchTabContent = useCallback(async () => {
    if (!authorData?._id) return;
    setLoadingContent(true);
    setSelectedIds(new Set()); // Clear batch selection on reload
    try {
      if (activeTab === 'overview' || activeTab === 'management') {
        const params = {
          page,
          limit: activeTab === 'overview' ? 6 : 20,
          search: search || undefined,
          category: selectedCategory || undefined,
          status: isOwner ? (selectedStatus || undefined) : 'published',
          author: authorData._id,
          adminView: isOwner ? 'true' : undefined
        };
        const res = await articleAPI.getAll(params);
        if (res.data.success) {
          let list = res.data.data || [];
          
          // Client-side sorting for responsive UX
          if (sortBy === 'newest') {
            list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          } else if (sortBy === 'oldest') {
            list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          } else if (sortBy === 'views') {
            list.sort((a, b) => (b.views || 0) - (a.views || 0));
          } else if (sortBy === 'likes') {
            list.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
          } else if (sortBy === 'comments') {
            list.sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0));
          }

          setArticles(list);
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
  }, [authorData?._id, activeTab, isOwner, page, search, selectedCategory, selectedStatus, sortBy]);

  useEffect(() => {
    if (authorData?._id) {
      fetchTabContent();
    }
  }, [authorData?._id, activeTab, page, search, selectedCategory, selectedStatus, sortBy, fetchTabContent]);

  const isStudent = user?.role === 'student';

  // Quick Post Launchers
  const handleOpenCreateWithFormat = (type, category) => {
    setEditingArticle(null);
    if (isStudent) {
      setQuickLaunchType(type || 'mind');
      setQuickLaunchCategory('tea-shop');
    } else {
      setQuickLaunchType(type);
      setQuickLaunchCategory(category || 'news');
    }
    setQuickPublishOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingArticle(null);
    if (isStudent) {
      setQuickLaunchType('mind');
      setQuickLaunchCategory('tea-shop');
    } else {
      setQuickLaunchType(null);
      setQuickLaunchCategory('news');
    }
    setQuickPublishOpen(true);
  };

  const handleOpenEdit = (article) => {
    setEditingArticle(article);
    setQuickLaunchType(null);
    setQuickPublishOpen(true);
  };

  // Delete Article Action
  const handleDeleteArticle = async (articleId) => {
    if (!window.confirm('Are you sure you want to permanently delete this story? This action cannot be reversed.')) return;
    try {
      await articleAPI.delete(articleId);
      toast.success('Story deleted successfully');
      setArticles((prev) => prev.filter((a) => a._id !== articleId));
      loadAuthorProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete story');
    }
  };

  // Toggle Single Story Status
  const handleToggleStoryStatus = async (article) => {
    const nextStatus = article.status === 'published' ? 'draft' : 'published';
    try {
      const formData = new FormData();
      formData.append('status', nextStatus);
      await articleAPI.update(article._id, formData);
      toast.success(`Story status changed to ${nextStatus.toUpperCase()}`);
      
      // Optimistic update
      setArticles(prev => prev.map(a => a._id === article._id ? { ...a, status: nextStatus } : a));
      loadAuthorProfile();
    } catch (err) {
      toast.error('Failed to update story status');
    }
  };

  // Batch Selection Handlers
  const handleToggleSelectAll = () => {
    if (selectedIds.size === articles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(articles.map(a => a._id)));
    }
  };

  const handleToggleSelectId = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Batch Status Change
  const handleBatchStatusChange = async (targetStatus) => {
    if (!selectedIds.size) return;
    setBatchOperating(true);
    const toastId = toast.loading(`Updating ${selectedIds.size} stories...`);
    try {
      for (const id of selectedIds) {
        const formData = new FormData();
        formData.append('status', targetStatus);
        await articleAPI.update(id, formData);
      }
      toast.success(`Updated ${selectedIds.size} stories to ${targetStatus.toUpperCase()}`, { id: toastId });
      setSelectedIds(new Set());
      fetchTabContent();
      loadAuthorProfile();
    } catch (err) {
      toast.error('Error during batch update', { id: toastId });
    } finally {
      setBatchOperating(false);
    }
  };

  // Batch Delete
  const handleBatchDelete = async () => {
    if (!selectedIds.size) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} selected stories? This cannot be undone.`)) return;
    
    setBatchOperating(true);
    const toastId = toast.loading(`Deleting ${selectedIds.size} stories...`);
    try {
      for (const id of selectedIds) {
        await articleAPI.delete(id);
      }
      toast.success(`Deleted ${selectedIds.size} stories`, { id: toastId });
      setSelectedIds(new Set());
      fetchTabContent();
      loadAuthorProfile();
    } catch (err) {
      toast.error('Error during bulk deletion', { id: toastId });
    } finally {
      setBatchOperating(false);
    }
  };

  // Share Profile
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
      toast.success('Author studio link copied to clipboard!');
    }
  };

  // Copy Link to Story
  const handleCopyStoryLink = (slug) => {
    const url = `${window.location.origin}/article/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Story link copied to clipboard!');
  };

  if (profileLoading) {
    return (
      <main className="as-studio-page as-loading-state">
        <div className="as-spinner-container">
          <div className="nm-spinner-ring" />
          <h3 className="as-loading-heading">Loading Southern Waves Author Studio...</h3>
          <p className="as-loading-sub">Preparing analytics, stories, and editorial controls</p>
        </div>
      </main>
    );
  }

  if (!authorData) {
    return (
      <main className="as-studio-page as-not-found-state">
        <div className="as-not-found-card">
          <FiAlertCircle size={52} color="var(--accent-color, #c8102e)" style={{ marginBottom: '16px' }} />
          <h2 className="as-not-found-title">Author Profile Unavailable</h2>
          <p className="as-not-found-desc">
            The requested author profile could not be found or requires authentication.
          </p>
          <div className="as-not-found-actions">
            <Link to="/" className="as-btn-primary">
              Back to Newsroom
            </Link>
            {!user && (
              <Link to="/login" className="as-btn-secondary">
                Sign In to Studio
              </Link>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="as-studio-page">
      {/* ── Ambient Top Creator Banner with Mesh Gradient ── */}
      <div className="as-creator-banner">
        <div className="as-banner-glow" />
        <div className="as-banner-mesh" />
      </div>

      {/* ── Top Executive Header Section ── */}
      <section className="as-header-section">
        <div className="container" style={{ maxWidth: '1240px' }}>
          
          <div className="as-studio-grid">
            
            {/* ── LEFT COLUMN: Author Identity & Academic Persona ── */}
            <div className="as-profile-card">
              <div className="as-avatar-wrapper">
                <img
                  src={authorData.avatar ? getImageUrl(authorData.avatar) : `https://ui-avatars.com/api/?name=${encodeURIComponent(authorData.name)}&background=c8102e&color=fff&size=200`}
                  alt={authorData.name}
                  className="as-avatar-img"
                />
                <span className="as-avatar-status-dot" title="Active Author" />
                {isOwner && (
                  <Link
                    to="/settings"
                    className="as-settings-btn"
                    title="Customize Profile & Settings"
                  >
                    <FiSettings size={15} />
                  </Link>
                )}
              </div>

              {/* Author Name + Role + Badges */}
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
                      YOU (STUDIO)
                    </span>
                  )}
                </div>
              </div>

              {/* Academic & Platform Metadata */}
              <div className="as-academic-meta">
                {authorData.university && (
                  <div className="as-meta-row">
                    <span className="as-meta-icon">🏛️</span>
                    <strong>{authorData.university}</strong>
                  </div>
                )}
                {authorData.academicMajor && (
                  <div className="as-meta-row">
                    <span className="as-meta-icon">🎓</span>
                    <span>{authorData.academicMajor} {authorData.yearOfStudy ? `(${authorData.yearOfStudy})` : ''}</span>
                  </div>
                )}
                <div className="as-meta-row as-meta-muted">
                  <span className="as-meta-icon">📅</span>
                  <span>Joined {new Date(authorData.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                </div>
              </div>

              {/* Bio with Expander */}
              {authorData.bio && (
                <div className="as-bio-box">
                  <p className={`as-bio-text ${showFullBio ? '' : 'as-bio-clamp'}`}>
                    {authorData.bio}
                  </p>
                  {authorData.bio.length > 110 && (
                    <button
                      onClick={() => setShowFullBio((prev) => !prev)}
                      className="as-bio-toggle"
                    >
                      {showFullBio ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </div>
              )}

              {/* Profile Action Buttons */}
              <div className="as-profile-actions-strip">
                <button
                  onClick={handleShareProfile}
                  className="as-btn-share-full"
                  title="Share Studio Link"
                >
                  <FiShare2 size={14} /> Share Studio
                </button>
              </div>
            </div>

            {/* ── RIGHT COLUMN: Studio Control Bar & 5 KPI Metric Cards ── */}
            <div className="as-right-col">
              
              {/* Studio Header Action Bar */}
              <div className="as-studio-bar">
                <div className="as-studio-headline">
                  <h2 className="as-studio-title">
                    Author Studio & Management
                  </h2>
                  <p className="as-studio-caption">
                    Centralized command center for your stories, analytics, and readership
                  </p>
                </div>

                <div className="as-studio-actions">
                  {isOwner && (
                    <button
                      onClick={handleOpenCreate}
                      className="as-btn-create-primary"
                    >
                      <FiPlus size={16} /> Add New Post
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Format Creation Launchpad (Only for Owner) */}
              {isOwner && (
                <div className="as-format-launchpad">
                  <span className="as-launchpad-label">
                    {isStudent ? 'Tea Shop Formats:' : 'Quick Create:'}
                  </span>
                  <div className="as-launchpad-chips">
                    {isStudent ? (
                      /* Students are strictly allowed to create related Tea Shop posts */
                      <>
                        <button
                          onClick={() => handleOpenCreateWithFormat('mind', 'tea-shop')}
                          className="as-launchpad-chip chip-mind"
                          title="Quick Reflection or Quote in Tea Shop"
                        >
                          <FiFeather size={13} /> Mind
                        </button>
                        <button
                          onClick={() => handleOpenCreateWithFormat('spoken', 'tea-shop')}
                          className="as-launchpad-chip chip-spoken"
                          title="Spoken-word Narrative or Audio Monologue in Tea Shop"
                        >
                          <FiMic size={13} /> Spoken
                        </button>
                        <button
                          onClick={() => handleOpenCreateWithFormat('ground', 'tea-shop')}
                          className="as-launchpad-chip chip-ground"
                          title="Live Ground Report with Photo in Tea Shop"
                        >
                          <FiRadio size={13} /> Ground
                        </button>
                      </>
                    ) : (
                      /* Staff (Editor, Admin, Moderator) Formats */
                      <>
                        <button
                          onClick={() => handleOpenCreateWithFormat('article', 'news')}
                          className="as-launchpad-chip chip-news"
                          title="Full Journalism Article"
                        >
                          <FiBookOpen size={13} /> News
                        </button>
                        <button
                          onClick={() => handleOpenCreateWithFormat('editorial', 'editorial')}
                          className="as-launchpad-chip chip-editorial"
                          title="Staff Editorial Column"
                        >
                          <FiEdit2 size={13} /> Editorial
                        </button>
                        <button
                          onClick={() => handleOpenCreateWithFormat('features', 'features')}
                          className="as-launchpad-chip chip-features"
                          title="Long-form Feature"
                        >
                          <FiLayers size={13} /> Features
                        </button>
                        <button
                          onClick={() => handleOpenCreateWithFormat('picture', 'pictures-speak')}
                          className="as-launchpad-chip chip-photo"
                          title="Curated Photo Journal"
                        >
                          <FiCamera size={13} /> Photo
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ── 5 Glassmorphic KPI Cards ── */}
              <div className="as-kpi-grid">
                
                {/* 1. Published Stories */}
                <div className="as-kpi-card" onClick={() => { setActiveTab('management'); setSelectedStatus('published'); }}>
                  <div className="as-kpi-top">
                    <span className="as-kpi-label">Published Stories</span>
                    <div className="as-kpi-icon-wrap" style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8' }}>
                      <FiBookOpen size={16} />
                    </div>
                  </div>
                  <div className="as-kpi-value-row">
                    <span className="as-kpi-val">{authorStats.publishedCount ?? authorStats.totalArticles ?? 0}</span>
                    <span className="as-kpi-tag-live">Active</span>
                  </div>
                </div>

                {/* 2. Drafts & In-Progress (Owner) / Total Articles */}
                <div className="as-kpi-card" onClick={() => { setActiveTab('management'); setSelectedStatus('draft'); }}>
                  <div className="as-kpi-top">
                    <span className="as-kpi-label">{isOwner ? 'Drafts & Working' : 'Total Output'}</span>
                    <div className="as-kpi-icon-wrap" style={{ background: 'rgba(167, 139, 250, 0.12)', color: '#a78bfa' }}>
                      <FiEdit2 size={16} />
                    </div>
                  </div>
                  <div className="as-kpi-value-row">
                    <span className="as-kpi-val">{isOwner ? (authorStats.draftCount || 0) : (authorStats.totalArticles || 0)}</span>
                    {isOwner && authorStats.pendingCount > 0 && (
                      <span className="as-kpi-tag-pending" title="Stories under review">
                        +{authorStats.pendingCount} Review
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Total Story Reads */}
                <div className="as-kpi-card" onClick={() => setActiveTab('overview')}>
                  <div className="as-kpi-top">
                    <span className="as-kpi-label">Story Impressions</span>
                    <div className="as-kpi-icon-wrap" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e' }}>
                      <FiEye size={16} />
                    </div>
                  </div>
                  <div className="as-kpi-value-row">
                    <span className="as-kpi-val">{(authorStats.totalViews || 0).toLocaleString()}</span>
                    <span className="as-kpi-spark">Reads</span>
                  </div>
                </div>

                {/* 4. Total Hypes & Likes */}
                <div className="as-kpi-card" onClick={() => setActiveTab('overview')}>
                  <div className="as-kpi-top">
                    <span className="as-kpi-label">Reader Hypes</span>
                    <div className="as-kpi-icon-wrap" style={{ background: 'rgba(244, 63, 94, 0.12)', color: '#f43f5e' }}>
                      <FiHeart size={16} />
                    </div>
                  </div>
                  <div className="as-kpi-value-row">
                    <span className="as-kpi-val">{(authorStats.totalLikes || 0).toLocaleString()}</span>
                    <span className="as-kpi-spark">Reactions</span>
                  </div>
                </div>

                {/* 5. Audience Engagement Rate */}
                <div className="as-kpi-card as-kpi-card-highlight" onClick={() => setActiveTab('overview')}>
                  <div className="as-kpi-top">
                    <span className="as-kpi-label">Audience Ratio</span>
                    <div className="as-kpi-icon-wrap" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }}>
                      <FiZap size={16} />
                    </div>
                  </div>
                  <div className="as-kpi-value-row">
                    <span className="as-kpi-val">{authorStats.engagementRate || 0}%</span>
                    <span className="as-kpi-tag-eng">Impact</span>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ── Main Tabbed Content Navigation & Control Bar ── */}
      <section className="container" style={{ maxWidth: '1240px', marginTop: '28px' }}>
        
        {/* Navigation Tabs Header */}
        <div className="as-tabs-header">
          <div className="as-tabs-list">
            
            {/* Tab 1: Studio Overview & Visual Analytics Graph */}
            <button
              onClick={() => { setActiveTab('overview'); setPage(1); }}
              className={`as-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            >
              <FiBarChart2 size={16} />
              <span>Studio & Analytics</span>
            </button>

            {/* Tab 2: Post Management Studio */}
            <button
              onClick={() => { setActiveTab('management'); setPage(1); }}
              className={`as-tab-btn ${activeTab === 'management' ? 'active' : ''}`}
            >
              <FiSliders size={16} />
              <span>
                {isOwner ? 'Post Management Suite' : 'Published Stories'}
              </span>
              <span className="as-tab-count-badge">
                {isOwner ? (authorStats.totalAllArticles || authorStats.totalArticles || 0) : (authorStats.totalArticles || 0)}
              </span>
            </button>

            {/* Tab 3: Saved & Liked */}
            {isOwner && (
              <button
                onClick={() => { setActiveTab('liked'); setPage(1); }}
                className={`as-tab-btn ${activeTab === 'liked' ? 'active' : ''}`}
              >
                <FiHeart size={16} />
                <span>Saved & Liked</span>
              </button>
            )}

            {/* Tab 4: My Comments */}
            {isOwner && (
              <button
                onClick={() => { setActiveTab('comments'); setPage(1); }}
                className={`as-tab-btn ${activeTab === 'comments' ? 'active' : ''}`}
              >
                <FiMessageSquare size={16} />
                <span>My Discussions</span>
              </button>
            )}
          </div>

          {/* Right Controls: View Switcher (Grid / Table) */}
          {(activeTab === 'management' || activeTab === 'overview') && (
            <div className="as-view-switcher">
              <button
                onClick={() => setViewMode('grid')}
                className={`as-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                title="Grid Cards View"
              >
                <FiGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`as-view-btn ${viewMode === 'table' ? 'active' : ''}`}
                title="Data Table Management View"
              >
                <FiList size={15} />
              </button>
            </div>
          )}
        </div>

        {/* ── TAB 1: STUDIO OVERVIEW & VISUAL ANALYTICS GRAPH ── */}
        {activeTab === 'overview' && (
          <div className="as-overview-tab-pane">
            <AuthorAnalyticsGraph
              analytics={authorAnalytics}
              stats={authorStats}
              authorName={authorData.name}
              onSelectCategory={(cat) => {
                setSelectedCategory(cat);
                setActiveTab('management');
              }}
              onOpenCreate={handleOpenCreate}
            />

            {/* Recent Stories Strip Preview */}
            <div className="as-overview-recent-strip">
              <div className="as-strip-header">
                <div className="as-strip-title-box">
                  <FiBookOpen size={18} color="var(--accent-color, #c8102e)" />
                  <h3>Recent Stories in Studio</h3>
                </div>
                <button
                  onClick={() => setActiveTab('management')}
                  className="as-strip-link-btn"
                >
                  Manage All Stories ({authorStats.totalArticles || 0}) <FiArrowRight size={14} />
                </button>
              </div>

              {loadingContent ? (
                <div className="as-pane-loading">
                  <div className="nm-spinner-ring" />
                  <p>Loading recent stories...</p>
                </div>
              ) : articles.length === 0 ? (
                <div className="as-empty-state-card">
                  <FiBookOpen size={40} color="#94a3b8" />
                  <h4>No Stories Published Yet</h4>
                  <p>Start your author journey by publishing your first story.</p>
                  {isOwner && (
                    <button onClick={handleOpenCreate} className="as-btn-create-primary" style={{ marginTop: '12px' }}>
                      + Add New Post
                    </button>
                  )}
                </div>
              ) : (
                <div className="as-story-grid">
                  {articles.slice(0, 3).map((art) => (
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
                          <span>{new Date(art.publishedAt || art.createdAt).toLocaleDateString()}</span>
                          {isOwner && (
                            <span className={`as-status-badge status-${art.status || 'draft'}`}>
                              {art.status?.toUpperCase()}
                            </span>
                          )}
                        </div>

                        <h3 className="as-story-title">
                          <Link to={`/article/${art.slug}`}>
                            {art.title}
                          </Link>
                        </h3>

                        <p className="as-story-lead">
                          {art.lead}
                        </p>

                        <div className="as-story-footer">
                          <div className="as-story-stats">
                            <span title="Views">👁️ {art.views || 0}</span>
                            <span title="Likes">❤️ {art.likes ? art.likes.length : 0}</span>
                            <span title="Comments">💬 {art.commentCount || 0}</span>
                          </div>

                          <div className="as-story-actions-group">
                            <Link to={`/article/${art.slug}`} className="as-action-link-btn" title="View Story">
                              <FiEye size={13} /> View
                            </Link>
                            {isOwner && (
                              <button onClick={() => handleOpenEdit(art)} className="as-action-link-btn" title="Edit Story">
                                <FiEdit2 size={13} /> Edit
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: POST MANAGEMENT SUITE ── */}
        {activeTab === 'management' && (
          <div className="as-management-suite">
            
            {/* Filter Deck: Search, Status Tabs, Category, Sort */}
            <div className="as-management-control-deck">
              
              {/* Row 1: Status Filter Tabs with Counts */}
              <div className="as-status-filter-pills">
                {STATUS_FILTERS.map((st) => {
                  const isActive = selectedStatus === st.value;
                  let count = 0;
                  if (st.value === '') count = authorStats.totalAllArticles || authorStats.totalArticles || 0;
                  else if (st.value === 'published') count = authorStats.publishedCount ?? authorStats.totalArticles ?? 0;
                  else if (st.value === 'draft') count = authorStats.draftCount || 0;
                  else if (st.value === 'pending') count = authorStats.pendingCount || 0;
                  else if (st.value === 'archived') count = authorStats.archivedCount || 0;

                  return (
                    <button
                      key={st.key}
                      onClick={() => { setSelectedStatus(st.value); setPage(1); }}
                      className={`as-status-pill-btn ${isActive ? 'active' : ''} ${st.key}`}
                    >
                      <span className="as-status-pill-dot" />
                      <span>{st.label}</span>
                      <span className="as-status-pill-count">({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Row 2: Search Input + Category Filter + Sort Dropdown */}
              <div className="as-mgmt-tools-row">
                
                {/* Search Bar */}
                <div className="as-mgmt-search-wrap">
                  <FiSearch className="as-mgmt-search-icon" />
                  <input
                    type="text"
                    placeholder="Search stories by title, keywords..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="as-mgmt-search-input"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="as-search-clear">
                      ✕
                    </button>
                  )}
                </div>

                {/* Category Dropdown */}
                <div className="as-mgmt-select-wrap">
                  <select
                    value={selectedCategory}
                    onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
                    className="as-mgmt-select"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                {/* Sort Dropdown */}
                <div className="as-mgmt-select-wrap">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="as-mgmt-select"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Refresh Content Button */}
                <button
                  onClick={fetchTabContent}
                  className="as-mgmt-refresh-btn"
                  title="Refresh Posts"
                >
                  <FiRefreshCw size={14} className={loadingContent ? 'as-spin' : ''} />
                </button>
              </div>

              {/* Batch Action Bar (Visible when items selected) */}
              {isOwner && selectedIds.size > 0 && (
                <div className="as-batch-action-bar">
                  <div className="as-batch-info">
                    <FiCheckSquare size={16} color="var(--accent-color, #c8102e)" />
                    <span><strong>{selectedIds.size}</strong> stories selected</span>
                  </div>
                  <div className="as-batch-btns">
                    <button
                      onClick={() => handleBatchStatusChange('published')}
                      disabled={batchOperating}
                      className="as-batch-btn publish"
                    >
                      Publish Selected
                    </button>
                    <button
                      onClick={() => handleBatchStatusChange('draft')}
                      disabled={batchOperating}
                      className="as-batch-btn draft"
                    >
                      Switch to Draft
                    </button>
                    <button
                      onClick={handleBatchDelete}
                      disabled={batchOperating}
                      className="as-batch-btn delete"
                    >
                      Delete Selected
                    </button>
                    <button
                      onClick={() => setSelectedIds(new Set())}
                      className="as-batch-btn cancel"
                    >
                      Deselect
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Content Render ── */}
            {loadingContent ? (
              <div className="as-pane-loading">
                <div className="nm-spinner-ring" />
                <p>Loading post management records...</p>
              </div>
            ) : articles.length === 0 ? (
              <div className="as-empty-state-card">
                <FiBookOpen size={48} color="#94a3b8" />
                <h3>No Matching Stories Found</h3>
                <p>
                  {search || selectedCategory || selectedStatus
                    ? 'No stories match your current filters. Try resetting the search or category filter.'
                    : 'You have not authored stories in this view yet.'}
                </p>
                {isOwner && (
                  <button onClick={handleOpenCreate} className="as-btn-create-primary" style={{ marginTop: '16px' }}>
                    + Create New Story
                  </button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              /* ── High-Fidelity Card Grid View ── */
              <div className="as-story-grid">
                {articles.map((art) => {
                  const isSelected = selectedIds.has(art._id);
                  return (
                    <div
                      key={art._id}
                      className={`as-story-card ${isSelected ? 'as-card-selected' : ''}`}
                    >
                      {/* Selection Checkbox on Card */}
                      {isOwner && (
                        <button
                          onClick={() => handleToggleSelectId(art._id)}
                          className="as-card-checkbox"
                          title={isSelected ? 'Deselect story' : 'Select story'}
                        >
                          {isSelected ? <FiCheckSquare size={17} color="var(--accent-color, #c8102e)" /> : <FiSquare size={17} />}
                        </button>
                      )}

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
                          <span>{new Date(art.publishedAt || art.createdAt).toLocaleDateString()}</span>
                          {isOwner && (
                            <span className={`as-status-badge status-${art.status || 'draft'}`}>
                              {art.status?.toUpperCase()}
                            </span>
                          )}
                        </div>

                        <h3 className="as-story-title">
                          <Link to={`/article/${art.slug}`}>
                            {art.title}
                          </Link>
                        </h3>

                        <p className="as-story-lead">
                          {art.lead}
                        </p>

                        <div className="as-story-footer">
                          <div className="as-story-stats">
                            <span title="Views">👁️ {art.views || 0}</span>
                            <span title="Likes">❤️ {art.likes ? art.likes.length : 0}</span>
                            <span title="Comments">💬 {art.commentCount || 0}</span>
                          </div>

                          <div className="as-story-actions-group">
                            <Link to={`/article/${art.slug}`} className="as-action-link-btn" title="View Story">
                              <FiEye size={13} />
                            </Link>

                            <button
                              onClick={() => handleCopyStoryLink(art.slug)}
                              className="as-action-link-btn"
                              title="Copy Story Link"
                            >
                              <FiCopy size={13} />
                            </button>

                            {isOwner && (
                              <>
                                <button
                                  onClick={() => handleToggleStoryStatus(art)}
                                  className={`as-status-toggle-btn ${art.status === 'published' ? 'active' : 'draft'}`}
                                  title="Toggle Active / Draft"
                                >
                                  {art.status === 'published' ? <FiToggleRight size={16} color="var(--color-success, #16a34a)" /> : <FiToggleLeft size={16} />}
                                </button>

                                <button
                                  onClick={() => handleOpenEdit(art)}
                                  className="as-action-link-btn"
                                  title="Edit with QuickPublishModal"
                                >
                                  <FiEdit2 size={13} />
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
                  );
                })}
              </div>
            ) : (
              /* ── High-Density Data Table View ── */
              <div className="as-table-container">
                <table className="as-manage-table">
                  <thead>
                    <tr>
                      {isOwner && (
                        <th style={{ width: '40px', textAlign: 'center' }}>
                          <button
                            onClick={handleToggleSelectAll}
                            className="as-table-select-all"
                            title="Select / Deselect All"
                          >
                            {selectedIds.size === articles.length ? <FiCheckSquare size={16} /> : <FiSquare size={16} />}
                          </button>
                        </th>
                      )}
                      <th>Story Title</th>
                      <th>Category</th>
                      <th>Status</th>
                      {isOwner && <th>Live Toggle</th>}
                      <th>Performance</th>
                      <th>Published</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {articles.map((art) => {
                      const isSelected = selectedIds.has(art._id);
                      return (
                        <tr key={art._id} className={isSelected ? 'as-row-selected' : ''}>
                          {isOwner && (
                            <td style={{ textAlign: 'center' }}>
                              <button
                                onClick={() => handleToggleSelectId(art._id)}
                                className="as-table-select-row"
                              >
                                {isSelected ? <FiCheckSquare size={16} color="var(--accent-color, #c8102e)" /> : <FiSquare size={16} />}
                              </button>
                            </td>
                          )}
                          <td style={{ maxWidth: '320px' }}>
                            <div className="as-table-title-cell">
                              <Link to={`/article/${art.slug}`} className="as-table-title-link">
                                {art.title}
                              </Link>
                              {art.lead && <p className="as-table-lead-preview">{art.lead}</p>}
                            </div>
                          </td>
                          <td>
                            <span className="as-table-cat-badge">
                              {getCategoryLabel(art.category)}
                            </span>
                          </td>
                          <td>
                            <span className={`as-status-badge status-${art.status || 'draft'}`}>
                              {art.status?.toUpperCase()}
                            </span>
                          </td>
                          {isOwner && (
                            <td>
                              <button
                                onClick={() => handleToggleStoryStatus(art)}
                                className={`as-status-toggle-btn ${art.status === 'published' ? 'active' : 'draft'}`}
                                title="Toggle Story Live / Draft"
                              >
                                {art.status === 'published' ? (
                                  <>
                                    <FiToggleRight size={17} color="var(--color-success, #16a34a)" />
                                    <span>Active</span>
                                  </>
                                ) : (
                                  <>
                                    <FiToggleLeft size={17} />
                                    <span>Draft</span>
                                  </>
                                )}
                              </button>
                            </td>
                          )}
                          <td>
                            <div className="as-table-perf-cell">
                              <span>👁️ {art.views || 0}</span>
                              <span>❤️ {art.likes ? art.likes.length : 0}</span>
                              <span>💬 {art.commentCount || 0}</span>
                            </div>
                          </td>
                          <td style={{ fontSize: '12px', color: 'var(--color-gray-500)', whiteSpace: 'nowrap' }}>
                            {new Date(art.publishedAt || art.createdAt).toLocaleDateString()}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="as-table-action-btns">
                              <Link to={`/article/${art.slug}`} className="as-action-link-btn" title="View Story">
                                <FiEye size={13} />
                              </Link>
                              <button
                                onClick={() => handleCopyStoryLink(art.slug)}
                                className="as-action-link-btn"
                                title="Copy Link"
                              >
                                <FiCopy size={13} />
                              </button>
                              {isOwner && (
                                <>
                                  <button
                                    onClick={() => handleOpenEdit(art)}
                                    className="as-action-link-btn"
                                    title="Edit Story"
                                  >
                                    <FiEdit2 size={13} />
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
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: SAVED & LIKED STORIES ── */}
        {activeTab === 'liked' && (
          <div className="as-liked-pane">
            {likedArticles.length === 0 ? (
              <div className="as-empty-state-card">
                <FiHeart size={44} color="#f87171" style={{ marginBottom: '12px' }} />
                <h3>No Saved or Liked Stories</h3>
                <p>Stories you bookmark or react to will appear in this collection.</p>
              </div>
            ) : (
              <div className="as-story-grid">
                {likedArticles.map((art) => (
                  <div key={art._id} className="as-story-card" style={{ padding: '18px' }}>
                    <span className="as-story-cat-chip" style={{ position: 'static', display: 'inline-block', marginBottom: '8px' }}>
                      {getCategoryLabel(art.category)}
                    </span>
                    <h4 className="as-story-title" style={{ margin: '6px 0', fontSize: '16px' }}>
                      <Link to={`/article/${art.slug}`}>
                        {art.title}
                      </Link>
                    </h4>
                    <p className="as-story-lead">{art.lead}</p>
                    <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginTop: '8px' }}>
                      By {art.author?.name || 'Author'} • 👁️ {art.views || 0} reads
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 4: MY COMMENTS & DISCUSSIONS ── */}
        {activeTab === 'comments' && (
          <div className="as-comments-pane">
            {myComments.length === 0 ? (
              <div className="as-empty-state-card">
                <FiMessageSquare size={44} color="#38bdf8" style={{ marginBottom: '12px' }} />
                <h3>No Community Responses Yet</h3>
                <p>Discussions and feedback you contribute will be recorded here.</p>
              </div>
            ) : (
              <div className="as-comments-stream">
                {myComments.map((c) => (
                  <div key={c._id} className="as-comment-card">
                    <div className="as-comment-meta">
                      <span>On Story: <strong>{c.article?.title || 'Story'}</strong></span>
                      <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="as-comment-text">{c.text}</p>
                    {c.article?.slug && (
                      <Link to={`/article/${c.article.slug}`} className="as-comment-story-link">
                        Jump to Discussion <FiArrowRight size={13} />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </section>

      {/* ── Integrated QuickPublishModal Editor for Author Studio ── */}
      {quickPublishOpen && (
        <QuickPublishModal
          editingArticle={editingArticle}
          defaultType={quickLaunchType}
          defaultCategory={quickLaunchCategory}
          onClose={() => {
            setQuickPublishOpen(false);
            setEditingArticle(null);
            setQuickLaunchType(null);
          }}
          onPublishSuccess={() => {
            fetchTabContent();
            loadAuthorProfile();
            toast.success(editingArticle ? 'Story updated!' : 'Story published successfully!');
          }}
        />
      )}
    </main>
  );
};

export default AuthorProfilePage;
