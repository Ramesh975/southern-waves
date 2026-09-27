import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { articleAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  FiTrendingUp,
  FiTrash2,
  FiCheckCircle,
  FiX,
  FiSearch,
  FiRefreshCw,
  FiGrid,
  FiList,
  FiHeart,
  FiShare2,
  FiUser,
  FiClock,
  FiFileText,
  FiExternalLink,
  FiInfo,
  FiLayers,
  FiTag
} from 'react-icons/fi';

const CATEGORY_OPTIONS = [
  { value: 'news', label: 'News', desc: 'Campus & community announcements' },
  { value: 'editorial', label: 'Editorial', desc: 'In-depth opinion & commentary' },
  { value: 'features', label: 'Features', desc: 'Long-form stories & cultural deep dives' },
  { value: 'kyp', label: 'Know Your Past (KYP)', desc: 'Historical & heritage retrospectives' },
  { value: 'pictures-speak', label: "Picture's Speak", desc: 'Photojournalism & visual stories' },
];

const SUB_TYPE_OPTIONS = [
  { id: 'all', label: 'All Submissions', icon: FiLayers },
  { id: 'trending', label: '🔥 Trending', icon: FiTrendingUp },
  { id: 'mind', label: '☕ Mind', icon: FiFileText },
  { id: 'spoken', label: '🎙️ Spoken', icon: FiTag },
  { id: 'ground', label: '📡 Ground', icon: FiTag },
];

const AdminSubmissions = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState('engagement');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  // Promotion Modal State
  const [selectedPost, setSelectedPost] = useState(null);
  const [promoTitle, setPromoTitle] = useState('');
  const [promoLead, setPromoLead] = useState('');
  const [promoCategory, setPromoCategory] = useState('news');
  const [promoIsFeatured, setPromoIsFeatured] = useState(false);
  const [promoting, setPromoting] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      // Fetch articles in category 'tea-shop'
      const res = await articleAPI.getAll({ category: 'tea-shop', adminView: 'true', limit: 100 });
      
      // Filter for posts created by students (role 'student')
      const studentPosts = (res.data?.data || []).filter(
        (post) => post.author?.role === 'student'
      );

      setSubmissions(studentPosts);
    } catch (err) {
      toast.error('Failed to load student submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPromoteModal = (post) => {
    setSelectedPost(post);
    setPromoTitle(post.title || '');
    setPromoLead(post.lead || '');
    setPromoCategory('news');
    setPromoIsFeatured(false);
  };

  const handlePromoteConfirm = async (e) => {
    e.preventDefault();
    if (!promoTitle.trim() || !promoLead.trim()) {
      return toast.error('Please enter both title and lead description');
    }

    setPromoting(true);
    try {
      await articleAPI.update(selectedPost._id, {
        title: promoTitle.trim(),
        lead: promoLead.trim(),
        category: promoCategory,
        status: 'published',
        isFeatured: promoIsFeatured,
      });

      toast.success(`Submission promoted to ${promoCategory.toUpperCase()} successfully!`);
      setSelectedPost(null);
      fetchSubmissions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Promotion failed');
    } finally {
      setPromoting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to dismiss and delete this student submission?')) return;

    try {
      await articleAPI.delete(id);
      toast.success('Submission removed');
      fetchSubmissions();
    } catch (err) {
      toast.error('Failed to delete submission');
    }
  };

  // KPI Metrics Calculation
  const stats = useMemo(() => {
    const total = submissions.length;
    const trending = submissions.filter(p => ((p.likes?.length || 0) + (p.shares || 0)) >= 5).length;
    const totalLikes = submissions.reduce((acc, p) => acc + (p.likes?.length || 0), 0);
    const uniqueStudents = new Set(submissions.map(p => p.author?._id || p.author?.name).filter(Boolean)).size;
    return { total, trending, totalLikes, uniqueStudents };
  }, [submissions]);

  // Filtering & Sorting
  const processedSubmissions = useMemo(() => {
    return submissions
      .filter((post) => {
        // Tab filtering
        if (activeTab === 'trending') {
          const eng = (post.likes?.length || 0) + (post.shares || 0);
          if (eng < 5) return false;
        } else if (activeTab === 'mind') {
          if (post.subCategory !== 'mind') return false;
        } else if (activeTab === 'spoken') {
          if (post.subCategory !== 'spoken') return false;
        } else if (activeTab === 'ground') {
          if (post.subCategory !== 'ground') return false;
        }

        // Search query filtering
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const titleMatch = post.title?.toLowerCase().includes(q);
        const leadMatch = post.lead?.toLowerCase().includes(q);
        const authorMatch = post.author?.name?.toLowerCase().includes(q);
        const subCatMatch = post.subCategory?.toLowerCase().includes(q);
        return titleMatch || leadMatch || authorMatch || subCatMatch;
      })
      .sort((a, b) => {
        const engA = (a.likes?.length || 0) + (a.shares || 0);
        const engB = (b.likes?.length || 0) + (b.shares || 0);
        if (sortBy === 'engagement') return engB - engA;
        if (sortBy === 'likes') return (b.likes?.length || 0) - (a.likes?.length || 0);
        if (sortBy === 'shares') return (b.shares || 0) - (a.shares || 0);
        if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
        return 0;
      });
  }, [submissions, activeTab, searchQuery, sortBy]);

  const getSubCategoryBadge = (subCat) => {
    switch (subCat) {
      case 'mind':
        return <span className="ad-badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>☕ Mind</span>;
      case 'spoken':
        return <span className="ad-badge" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>🎙️ Spoken</span>;
      case 'ground':
        return <span className="ad-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>📡 Ground</span>;
      default:
        return <span className="ad-badge">🍵 Tea Shop</span>;
    }
  };

  return (
    <div className="admin-submissions-page" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Section */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 className="admin-title" style={{ margin: 0 }}>Student Submissions</h1>
            <span
              className="ad-badge"
              style={{
                background: 'var(--color-primary-subtle)',
                color: 'var(--color-primary)',
                fontWeight: 700,
                fontSize: 12,
                padding: '4px 10px',
                borderRadius: '12px'
              }}
            >
              {submissions.length} Total
            </span>
          </div>
          <p style={{ marginTop: 6, marginBottom: 0, color: 'var(--admin-text-muted)', fontSize: 14 }}>
            Review, curate, and elevate student-created campus voices and discussions from the Tea Shop into official publications.
          </p>
        </div>

        <button
          onClick={fetchSubmissions}
          className="btn-admin-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px' }}
          disabled={loading}
        >
          <FiRefreshCw className={loading ? 'spin-icon' : ''} size={15} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* KPI Analytics Cards */}
      <div className="admin-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div className="admin-card" style={{ padding: '20px 22px', borderLeft: '4px solid var(--color-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Submissions
            </span>
            <FiFileText size={18} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--admin-text-main)', fontFamily: 'var(--font-display)' }}>
            {stats.total}
          </div>
          <span style={{ fontSize: 12, color: 'var(--admin-text-subtle)' }}>Posts awaiting review</span>
        </div>

        <div className="admin-card" style={{ padding: '20px 22px', borderLeft: '4px solid var(--color-red)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              High Engagement
            </span>
            <FiTrendingUp size={18} style={{ color: 'var(--color-red)' }} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--admin-text-main)', fontFamily: 'var(--font-display)' }}>
            {stats.trending}
          </div>
          <span style={{ fontSize: 12, color: 'var(--admin-text-subtle)' }}>5+ combined interactions</span>
        </div>

        <div className="admin-card" style={{ padding: '20px 22px', borderLeft: '4px solid #eab308' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Student Likes
            </span>
            <FiHeart size={18} style={{ color: '#eab308' }} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--admin-text-main)', fontFamily: 'var(--font-display)' }}>
            {stats.totalLikes}
          </div>
          <span style={{ fontSize: 12, color: 'var(--admin-text-subtle)' }}>Total community appreciations</span>
        </div>

        <div className="admin-card" style={{ padding: '20px 22px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Student Creators
            </span>
            <FiUser size={18} style={{ color: '#10b981' }} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--admin-text-main)', fontFamily: 'var(--font-display)' }}>
            {stats.uniqueStudents}
          </div>
          <span style={{ fontSize: 12, color: 'var(--admin-text-subtle)' }}>Unique campus contributors</span>
        </div>
      </div>

      {/* Controls & Filter Toolbar */}
      <div className="admin-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Category Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', borderBottom: '1px solid var(--admin-border)', paddingBottom: 14 }}>
          {SUB_TYPE_OPTIONS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  border: isActive ? '1px solid var(--color-primary)' : '1px solid var(--admin-border)',
                  backgroundColor: isActive ? 'var(--color-primary)' : 'var(--admin-bg-secondary, rgba(255,255,255,0.04))',
                  color: isActive ? '#ffffff' : 'var(--admin-text-main)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search, Sort, and View Mode Switches */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          {/* Search Bar */}
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 460 }}>
            <FiSearch style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-subtle)' }} size={16} />
            <input
              type="text"
              placeholder="Search by title, description, or author name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-input"
              style={{ width: '100%', paddingLeft: 38, paddingRight: searchQuery ? 36 : 12, height: 40 }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--admin-text-muted)', cursor: 'pointer' }}
                title="Clear search"
              >
                <FiX size={15} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Sort Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="admin-input admin-select"
                style={{ height: 38, padding: '4px 28px 4px 10px', fontSize: 13 }}
              >
                <option value="engagement">🔥 Most Engaged</option>
                <option value="likes">❤️ Most Liked</option>
                <option value="shares">🔄 Most Shared</option>
                <option value="newest">🕒 Newest First</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div style={{ display: 'inline-flex', border: '1px solid var(--admin-border)', borderRadius: 6, overflow: 'hidden' }}>
              <button
                onClick={() => setViewMode('table')}
                style={{
                  padding: '7px 12px',
                  border: 'none',
                  background: viewMode === 'table' ? 'var(--color-primary)' : 'transparent',
                  color: viewMode === 'table' ? '#fff' : 'var(--admin-text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Table List View"
              >
                <FiList size={16} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                style={{
                  padding: '7px 12px',
                  border: 'none',
                  background: viewMode === 'grid' ? 'var(--color-primary)' : 'transparent',
                  color: viewMode === 'grid' ? '#fff' : 'var(--admin-text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Card Grid View"
              >
                <FiGrid size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="loading-spinner" style={{ padding: '60px 0' }}><div className="spinner" /></div>
      ) : processedSubmissions.length === 0 ? (
        <div className="admin-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div className="ad-empty">
            <FiFileText size={48} style={{ opacity: 0.3, marginBottom: 12, color: 'var(--admin-text-muted)' }} />
            <h3 style={{ fontSize: 18, marginBottom: 6, color: 'var(--admin-text-main)' }}>No Submissions Found</h3>
            <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--admin-text-muted)', maxWidth: 440, margin: '0 auto' }}>
              {searchQuery
                ? `No submissions matched "${searchQuery}". Try adjusting your search or switching filter tabs.`
                : 'There are currently no active student submissions in this category.'}
            </p>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE LIST VIEW */
        <div className="admin-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '42%' }}>Submission Details</th>
                <th style={{ width: '16%' }}>Author</th>
                <th style={{ width: '12%' }}>Format</th>
                <th style={{ width: '12%' }}>Engagement</th>
                <th style={{ width: '10%' }}>Submitted</th>
                <th style={{ width: '8%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {processedSubmissions.map((post) => {
                const engagement = (post.likes?.length || 0) + (post.shares || 0);
                const isTrending = engagement >= 5;

                return (
                  <tr key={post._id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <Link
                          to={`/admin/submission/${post._id}`}
                          style={{
                            textDecoration: 'none',
                            color: 'var(--admin-text-main)',
                            fontWeight: 700,
                            fontSize: 14,
                            lineHeight: 1.3,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                          className="submission-title-link"
                          title="Open Submission Review & Management"
                        >
                          <span>{post.title}</span>
                        </Link>
                        
                        {/* High-contrast, multi-line visible lead description */}
                        <div
                          style={{
                            fontSize: 12.5,
                            lineHeight: 1.45,
                            color: 'var(--admin-text-muted)',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            wordBreak: 'break-word'
                          }}
                          title={post.lead}
                        >
                          {post.lead || '(No description summary provided)'}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {post.author?.profilePicture ? (
                          <img
                            src={post.author.profilePicture}
                            alt={post.author.name}
                            style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: '50%',
                              backgroundColor: 'var(--color-primary-subtle)',
                              color: 'var(--color-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 11,
                              fontWeight: 700
                            }}
                          >
                            {(post.author?.name || 'S')[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-main)' }}>
                            {post.author?.name || 'Anonymous Student'}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--admin-text-subtle)', textTransform: 'capitalize' }}>
                            {post.author?.role || 'student'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>{getSubCategoryBadge(post.subCategory)}</td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontWeight: 700,
                            fontSize: 13,
                            color: isTrending ? 'var(--color-red)' : 'var(--admin-text-main)'
                          }}
                        >
                          {isTrending && <FiTrendingUp size={14} />}
                          {engagement} interactions
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--admin-text-subtle)' }}>
                          ❤️ {post.likes?.length || 0} &nbsp;•&nbsp; 🔄 {post.shares || 0}
                        </span>
                      </div>
                    </td>

                    <td style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <FiClock size={12} />
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <Link
                          to={`/admin/submission/${post._id}`}
                          className="btn-admin-secondary"
                          style={{
                            padding: '6px 12px',
                            fontSize: 12,
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            textDecoration: 'none'
                          }}
                          title="Review submission details & author statistics"
                        >
                          <FiFileText size={13} />
                          <span>Review</span>
                        </Link>
                        <button
                          className="btn-admin-secondary"
                          style={{
                            padding: '6px 12px',
                            fontSize: 12,
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            background: 'var(--color-primary-subtle)',
                            color: 'var(--color-primary)',
                            borderColor: 'var(--color-primary)'
                          }}
                          onClick={() => handleOpenPromoteModal(post)}
                          title="Promote to official section"
                        >
                          <FiCheckCircle size={13} />
                          <span>Promote</span>
                        </button>
                        <button
                          className="btn-admin-danger"
                          style={{
                            padding: '6px 10px',
                            fontSize: 12,
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                          onClick={() => handleDelete(post._id)}
                          title="Delete submission"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* CARD GRID VIEW */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
          {processedSubmissions.map((post) => {
            const engagement = (post.likes?.length || 0) + (post.shares || 0);
            const isTrending = engagement >= 5;

            return (
              <div
                key={post._id}
                className="admin-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: 18,
                  position: 'relative',
                  borderTop: isTrending ? '3px solid var(--color-red)' : '1px solid var(--admin-border)'
                }}
              >
                {/* Top Info Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  {getSubCategoryBadge(post.subCategory)}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: isTrending ? 'var(--color-red)' : 'var(--admin-text-subtle)', fontWeight: isTrending ? 700 : 500 }}>
                    {isTrending && <FiTrendingUp size={13} />}
                    <span>{engagement} eng.</span>
                  </div>
                </div>

                {/* Title & Full Lead */}
                <Link
                  to={`/admin/submission/${post._id}`}
                  style={{
                    textDecoration: 'none',
                    color: 'var(--admin-text-main)',
                    fontWeight: 700,
                    fontSize: 15,
                    lineHeight: 1.35,
                    marginBottom: 8,
                    display: 'block'
                  }}
                  title="Open Submission Review & Management"
                >
                  {post.title}
                </Link>

                <p
                  style={{
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: 'var(--admin-text-muted)',
                    margin: '0 0 16px 0',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    flex: 1
                  }}
                >
                  {post.lead || '(No description provided)'}
                </p>

                {/* Author & Metrics footer */}
                <div style={{ borderTop: '1px solid var(--admin-border)', paddingTop: 12, marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FiUser size={13} style={{ color: 'var(--admin-text-subtle)' }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--admin-text-main)' }}>
                      {post.author?.name || 'Student'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--admin-text-subtle)' }}>
                    <span>❤️ {post.likes?.length || 0}</span>
                    <span>🔄 {post.shares || 0}</span>
                  </div>
                </div>

                {/* Actions row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginTop: 14 }}>
                  <Link
                    to={`/admin/submission/${post._id}`}
                    className="btn-admin-secondary"
                    style={{
                      padding: '7px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      textDecoration: 'none'
                    }}
                    title="Review submission details & author statistics"
                  >
                    <FiFileText size={13} />
                    <span>Review</span>
                  </Link>
                  <button
                    className="btn-admin-primary"
                    style={{ padding: '7px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    onClick={() => handleOpenPromoteModal(post)}
                  >
                    <FiCheckCircle size={13} />
                    <span>Promote</span>
                  </button>
                  <button
                    className="btn-admin-danger"
                    style={{ padding: '7px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center' }}
                    onClick={() => handleDelete(post._id)}
                    title="Delete"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PROMOTION DIALOG MODAL */}
      {selectedPost && (
        <div className="admin-modal-overlay" onClick={() => setSelectedPost(null)}>
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
              <button className="ad-collapse-btn" onClick={() => setSelectedPost(null)}>
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
                  Author: <strong style={{ color: 'var(--admin-text-main)' }}>{selectedPost.author?.name || 'Student'}</strong> (Attribution will be maintained)
                </span>
              </div>

              {/* Title */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, color: 'var(--admin-text-muted)' }}>
                  Headline / Title <span style={{ color: 'var(--color-red)' }}>*</span>
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
                  Lead Description / Deck <span style={{ color: 'var(--color-red)' }}>*</span>
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
                  Target Section / Category <span style={{ color: 'var(--color-red)' }}>*</span>
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
                        <div style={{ fontSize: 11, color: 'var(--admin-text-subtle)' }}>
                          {opt.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Optional Flags */}
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
                  onClick={() => setSelectedPost(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-admin-primary"
                  disabled={promoting}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <FiCheckCircle size={15} />
                  <span>{promoting ? 'Promoting...' : 'Promote & Publish Story'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BOTTOM EXPLAINER GUIDE CARD */}
      <div
        className="admin-card"
        style={{
          marginTop: 12,
          padding: '24px 28px',
          background: 'var(--admin-bg-secondary, rgba(255,255,255,0.02))',
          border: '1px solid var(--admin-border)',
          borderRadius: 8
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <FiInfo size={20} style={{ color: 'var(--color-primary)' }} />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--admin-text-main)', fontFamily: 'var(--font-display)', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
            Understanding the Student Submissions &amp; Tea Shop Workflow
          </h3>
        </div>

        <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--admin-text-muted)', margin: '0 0 16px 0' }}>
          This moderation dashboard is the editorial bridge between campus voices and Southern Waves official journalism. Student authors can freely publish informal thoughts, perspectives, and real-time campus observations into the <strong>Tea Shop</strong> (including Mind discussions, Spoken quotes, and Ground updates). 
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <div style={{ padding: '12px 14px', background: 'var(--admin-bg, rgba(0,0,0,0.15))', borderRadius: 6, border: '1px solid var(--admin-border)' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', display: 'block', marginBottom: 4 }}>
              1. Community Discovery
            </span>
            <span style={{ fontSize: 12, color: 'var(--admin-text-muted)', lineHeight: 1.45 }}>
              Posts with high engagement (❤️ Likes &amp; 🔄 Shares) naturally bubble up to the top of this list, highlighting what matters to the student body.
            </span>
          </div>

          <div style={{ padding: '12px 14px', background: 'var(--admin-bg, rgba(0,0,0,0.15))', borderRadius: 6, border: '1px solid var(--admin-border)' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', display: 'block', marginBottom: 4 }}>
              2. Editorial Promotion
            </span>
            <span style={{ fontSize: 12, color: 'var(--admin-text-muted)', lineHeight: 1.45 }}>
              Clicking <strong>Promote</strong> allows editors to refine the headline and deck summary, assign the piece to official sections (News, Editorial, Features, KYP), and publish it with author attribution intact.
            </span>
          </div>

          <div style={{ padding: '12px 14px', background: 'var(--admin-bg, rgba(0,0,0,0.15))', borderRadius: 6, border: '1px solid var(--admin-border)' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', display: 'block', marginBottom: 4 }}>
              3. Quality Moderation
            </span>
            <span style={{ fontSize: 12, color: 'var(--admin-text-muted)', lineHeight: 1.45 }}>
              Inappropriate, irrelevant, or spam submissions can be permanently dismissed using the delete action to keep the ecosystem clean and constructive.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSubmissions;

