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
    <main style={{ minHeight: '90vh', background: 'var(--color-background, #f8fafc)', paddingBottom: '80px', fontFamily: 'var(--font-sans, "Inter", sans-serif)' }}>
      {/* ── Top Header Section: Southern Waves Author Studio ── */}
      <section style={{
        background: '#ffffff',
        borderBottom: '1.5px solid var(--color-gray-200, #e2e8f0)',
        padding: '36px 0 28px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
      }}>
        <div className="container" style={{ maxWidth: '1200px' }}>
          
          {/* Main Top Studio Grid matching user handwritten diagram */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(280px, 340px) 1fr',
            gap: '36px',
            alignItems: 'start'
          }}>
            
            {/* ── LEFT COLUMN: Image of Profile + Name (Role) + Info + Bio ── */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              background: 'var(--color-gray-50, #f8fafc)',
              padding: '24px',
              borderRadius: '16px',
              border: '1px solid var(--color-gray-200, #e2e8f0)'
            }}>
              {/* Profile Image Circle */}
              <div style={{ position: 'relative', marginBottom: '16px', alignSelf: 'center' }}>
                <img
                  src={authorData.avatar ? getImageUrl(authorData.avatar) : `https://ui-avatars.com/api/?name=${encodeURIComponent(authorData.name)}&background=c8102e&color=fff&size=200`}
                  alt={authorData.name}
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '4px solid #ffffff',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                  }}
                />
                {isOwner && (
                  <Link
                    to="/settings"
                    style={{
                      position: 'absolute',
                      bottom: '4px',
                      right: '4px',
                      background: 'var(--accent-color, #c8102e)',
                      color: '#ffffff',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                      textDecoration: 'none'
                    }}
                    title="Edit Profile in Settings"
                  >
                    <FiSettings size={15} />
                  </Link>
                )}
              </div>

              {/* Author Name + (Role) */}
              <div style={{ textAlign: 'center', width: '100%', marginBottom: '12px' }}>
                <h1 style={{
                  fontFamily: 'var(--font-display, "Outfit", sans-serif)',
                  fontSize: '24px',
                  fontWeight: 900,
                  margin: '0 0 4px',
                  color: 'var(--color-black, #0f172a)'
                }}>
                  {authorData.name}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{
                    background: 'rgba(200,16,46,0.1)',
                    border: '1px solid rgba(200,16,46,0.2)',
                    color: 'var(--accent-color, #c8102e)',
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: '10px'
                  }}>
                    {authorData.role?.toUpperCase() || 'STUDENT'}
                  </span>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                    @{authorData.username}
                  </span>
                  {isOwner && (
                    <span style={{ background: '#10b981', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px' }}>
                      YOU
                    </span>
                  )}
                </div>
              </div>

              {/* Other Tags & Academic Info */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                width: '100%',
                fontSize: '12.5px',
                color: '#475569',
                paddingTop: '12px',
                borderTop: '1px solid #e2e8f0',
                marginBottom: '12px'
              }}>
                {authorData.university && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🏛️</span>
                    <strong style={{ color: '#0f172a' }}>{authorData.university}</strong>
                  </div>
                )}
                {authorData.academicMajor && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🎓</span>
                    <span>{authorData.academicMajor} {authorData.yearOfStudy ? `(${authorData.yearOfStudy})` : ''}</span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
                  <span>📅</span>
                  <span>Joined {new Date(authorData.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                </div>
              </div>

              {/* Bio with <more> / <less> expander */}
              {authorData.bio && (
                <div style={{ width: '100%', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                  <p style={{
                    fontSize: '13px',
                    lineHeight: 1.55,
                    color: '#334155',
                    margin: 0,
                    display: showFullBio ? 'block' : '-webkit-box',
                    WebkitLineClamp: showFullBio ? 'unset' : 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {authorData.bio}
                  </p>
                  {authorData.bio.length > 120 && (
                    <button
                      onClick={() => setShowFullBio((prev) => !prev)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-color, #c8102e)',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        padding: '4px 0 0',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                    >
                      {showFullBio ? '<less>' : '<more >'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ── RIGHT COLUMN: Top Bar (Published count + General Search + Buttons) + Analytics Box ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Studio Header Bar matching sketch */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                paddingBottom: '16px',
                borderBottom: '1.5px solid #e2e8f0'
              }}>
                {/* Published Stat */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' }}>
                    Published :
                  </span>
                  <span style={{
                    fontSize: '20px',
                    fontWeight: 900,
                    color: 'var(--accent-color, #c8102e)',
                    background: 'rgba(200,16,46,0.08)',
                    padding: '2px 10px',
                    borderRadius: '8px'
                  }}>
                    {authorStats.totalArticles || 0}
                  </span>
                </div>

                {/* General Search Input */}
                <div style={{
                  position: 'relative',
                  flex: 1,
                  minWidth: '200px',
                  maxWidth: '360px'
                }}>
                  <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="General search stories..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 36px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      background: '#fff',
                      boxSizing: 'border-box'
                    }}
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '12px' }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Vertical Divider line from sketch */}
                <div style={{ width: '1px', height: '32px', background: '#cbd5e1' }} />

                {/* Action Buttons: [Add new post] + [Share profile] */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {isOwner && (
                    <button
                      onClick={handleOpenCreate}
                      style={{
                        background: 'var(--accent-color, #c8102e)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 18px',
                        fontSize: '13px',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(200,16,46,0.35)'
                      }}
                    >
                      <FiPlus size={16} /> Add New Post
                    </button>
                  )}

                  <button
                    onClick={handleShareProfile}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      color: '#0f172a',
                      borderRadius: '8px',
                      padding: '9px 14px',
                      fontSize: '13px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }}
                    title="Share Author Profile"
                  >
                    <FiShare2 size={14} /> Share Profile
                  </button>
                </div>
              </div>

              {/* ── Analytics Box (matching sketch box with curve & metrics) ── */}
              <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                color: '#ffffff',
                borderRadius: '16px',
                padding: '20px 24px',
                boxShadow: '0 10px 30px rgba(15,23,42,0.15)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiActivity size={18} color="#38bdf8" />
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#f8fafc' }}>
                      Author Analytics
                    </h3>
                  </div>
                  <span style={{ fontSize: '11px', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                    Live Metric Stream
                  </span>
                </div>

                {/* SVG Visual Performance Wave Curve matching sketch */}
                <div style={{ width: '100%', height: '70px', position: 'relative', marginBottom: '16px' }}>
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
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '12px'
                }}>
                  <div style={{ background: 'rgba(255,255,255,0.07)', padding: '10px 14px', borderRadius: '10px' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Stories Published</span>
                    <span style={{ fontSize: '20px', fontWeight: 900, color: '#ffffff' }}>{authorStats.totalArticles || 0}</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.07)', padding: '10px 14px', borderRadius: '10px' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Total Story Reads</span>
                    <span style={{ fontSize: '20px', fontWeight: 900, color: '#38bdf8' }}>{authorStats.totalViews || 0}</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.07)', padding: '10px 14px', borderRadius: '10px' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Total Hypes / Likes</span>
                    <span style={{ fontSize: '20px', fontWeight: 900, color: '#f87171' }}>{authorStats.totalLikes || 0}</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.07)', padding: '10px 14px', borderRadius: '10px' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Responses</span>
                    <span style={{ fontSize: '20px', fontWeight: 900, color: '#34d399' }}>{authorStats.totalComments || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Tabbed Content Area (Published Stories / Management / Saved & Liked / My Comments) ── */}
      <section className="container" style={{ maxWidth: '1200px', marginTop: '28px' }}>
        
        {/* Navigation Tabs Header matching sketch */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '2px solid var(--color-gray-200, #e2e8f0)',
          paddingBottom: '2px',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
            
            {/* Tab 1: Published Stories */}
            <button
              onClick={() => { setActiveTab('published'); setPage(1); }}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'published' ? '3px solid var(--accent-color, #c8102e)' : '3px solid transparent',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: 800,
                color: activeTab === 'published' ? 'var(--accent-color, #c8102e)' : '#64748b',
                cursor: 'pointer'
              }}
            >
              📰 Published Stories ({authorStats.totalArticles || 0})
            </button>

            {/* Tab 2: Management (Edit, Delete, Stories Enable/Disable) */}
            {isOwner && (
              <button
                onClick={() => { setActiveTab('management'); setPage(1); }}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'management' ? '3px solid var(--accent-color, #c8102e)' : '3px solid transparent',
                  padding: '10px 16px',
                  fontSize: '14px',
                  fontWeight: 800,
                  color: activeTab === 'management' ? 'var(--accent-color, #c8102e)' : '#64748b',
                  cursor: 'pointer'
                }}
              >
                🛠️ Management Studio
              </button>
            )}

            {/* Tab 3: Saved & Liked */}
            {isOwner && (
              <button
                onClick={() => { setActiveTab('liked'); setPage(1); }}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'liked' ? '3px solid var(--accent-color, #c8102e)' : '3px solid transparent',
                  padding: '10px 16px',
                  fontSize: '14px',
                  fontWeight: 800,
                  color: activeTab === 'liked' ? 'var(--accent-color, #c8102e)' : '#64748b',
                  cursor: 'pointer'
                }}
              >
                💖 Saved & Liked
              </button>
            )}

            {/* Tab 4: My Comments */}
            {isOwner && (
              <button
                onClick={() => { setActiveTab('comments'); setPage(1); }}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'comments' ? '3px solid var(--accent-color, #c8102e)' : '3px solid transparent',
                  padding: '10px 16px',
                  fontSize: '14px',
                  fontWeight: 800,
                  color: activeTab === 'comments' ? 'var(--accent-color, #c8102e)' : '#64748b',
                  cursor: 'pointer'
                }}
              >
                💬 My Comments
              </button>
            )}
          </div>

          {/* Right side: View Mode Toggle (Grid / List Icons matching sketch) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '4px', background: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
              <button
                onClick={() => setViewMode('grid')}
                style={{
                  background: viewMode === 'grid' ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  color: viewMode === 'grid' ? 'var(--accent-color, #c8102e)' : '#64748b'
                }}
                title="Grid View"
              >
                <FiGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                style={{
                  background: viewMode === 'table' ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  color: viewMode === 'table' ? 'var(--accent-color, #c8102e)' : '#64748b'
                }}
                title="List / Table View"
              >
                <FiList size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Category & Status Filter Bar */}
        {(activeTab === 'published' || activeTab === 'management') && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '20px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: '#fff'
                }}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>

              {activeTab === 'management' && isOwner && (
                <select
                  value={selectedStatus}
                  onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 600,
                    background: '#fff'
                  }}
                >
                  {STATUS_FILTERS.map((st) => (
                    <option key={st.value} value={st.value}>{st.label}</option>
                  ))}
                </select>
              )}
            </div>

            {search && (
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                Filtering by: &quot;<strong>{search}</strong>&quot; ({articles.length} found)
              </span>
            )}
          </div>
        )}

        {/* ── Content Render ── */}
        {loadingContent ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div className="nm-spinner-ring" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 700, color: '#64748b' }}>Loading stories...</p>
          </div>
        ) : (activeTab === 'published' || activeTab === 'management') ? (
          articles.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: '#ffffff',
              borderRadius: '16px',
              border: '1.5px dashed #cbd5e1'
            }}>
              <FiBookOpen size={40} color="#94a3b8" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, margin: '0 0 6px' }}>No Stories Found</h3>
              <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 16px' }}>
                {isOwner ? 'You have not created stories matching this filter.' : 'This author has not published stories in this section yet.'}
              </p>
              {isOwner && (
                <button
                  onClick={handleOpenCreate}
                  style={{
                    background: 'var(--accent-color, #c8102e)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  + Add New Story
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            /* ── Card Grid View (with View, Edit, Delete buttons) ── */
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '24px'
            }}>
              {articles.map((art) => (
                <div
                  key={art._id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                >
                  {art.coverImage ? (
                    <div style={{ height: '170px', overflow: 'hidden', position: 'relative' }}>
                      <img
                        src={getImageUrl(art.coverImage)}
                        alt={art.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <span style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        background: 'rgba(0,0,0,0.8)',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        padding: '3px 8px',
                        borderRadius: '6px'
                      }}>
                        {getCategoryLabel(art.category)}
                      </span>
                    </div>
                  ) : (
                    <div style={{ height: '100px', background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', padding: '16px', position: 'relative' }}>
                      <span style={{
                        background: 'rgba(0,0,0,0.5)',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        padding: '3px 8px',
                        borderRadius: '6px'
                      }}>
                        {getCategoryLabel(art.category)}
                      </span>
                    </div>
                  )}

                  <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                        {new Date(art.publishedAt || art.createdAt).toLocaleDateString()}
                      </span>
                      {isOwner && (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: art.status === 'published' ? '#dcfce7' : art.status === 'flagged' ? '#fee2e2' : '#f1f5f9',
                          color: art.status === 'published' ? '#166534' : art.status === 'flagged' ? '#991b1b' : '#475569'
                        }}>
                          {art.status?.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <h3 style={{
                      fontFamily: 'var(--font-display, "Outfit", sans-serif)',
                      fontSize: '17px',
                      fontWeight: 800,
                      lineHeight: 1.35,
                      margin: '0 0 8px',
                      color: '#0f172a'
                    }}>
                      <Link to={`/article/${art.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        {art.title}
                      </Link>
                    </h3>

                    <p style={{
                      fontSize: '13px',
                      color: '#475569',
                      lineHeight: 1.5,
                      margin: '0 0 16px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {art.lead}
                    </p>

                    {/* Footer Action Bar with View, Edit, Delete Buttons */}
                    <div style={{
                      marginTop: 'auto',
                      paddingTop: '12px',
                      borderTop: '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: '#64748b' }}>
                        <span title="Views">👁️ {art.views || 0}</span>
                        <span title="Likes">❤️ {art.likes ? art.likes.length : 0}</span>
                        <span title="Responses">💬 {art.commentCount || 0}</span>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        {/* View Button */}
                        <Link
                          to={`/article/${art.slug}`}
                          style={{
                            background: '#f1f5f9',
                            color: '#0f172a',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="View Story"
                        >
                          <FiEye size={13} /> View
                        </Link>

                        {/* Owner Edit & Delete Buttons */}
                        {isOwner && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(art)}
                              style={{
                                background: '#f1f5f9',
                                border: 'none',
                                color: '#334155',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Edit Story"
                            >
                              <FiEdit2 size={13} /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteArticle(art._id)}
                              style={{
                                background: '#fee2e2',
                                border: 'none',
                                color: '#dc2626',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
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
            /* ── Table / Management View (with Delete, Edit, Story Enable/Disable Toggle) ── */
            <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflowX: 'auto', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                    <th style={{ padding: '14px 18px', fontWeight: 800, color: '#0f172a' }}>Story Title</th>
                    <th style={{ padding: '14px 18px', fontWeight: 800, color: '#0f172a' }}>Category</th>
                    <th style={{ padding: '14px 18px', fontWeight: 800, color: '#0f172a' }}>Status</th>
                    {isOwner && <th style={{ padding: '14px 18px', fontWeight: 800, color: '#0f172a' }}>Story Enable/Disable</th>}
                    <th style={{ padding: '14px 18px', fontWeight: 800, color: '#0f172a' }}>Performance</th>
                    <th style={{ padding: '14px 18px', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map((art) => (
                    <tr key={art._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 18px', fontWeight: 700, maxWidth: '280px' }}>
                        <Link to={`/article/${art.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          {art.title}
                        </Link>
                      </td>
                      <td style={{ padding: '14px 18px' }}>{getCategoryLabel(art.category)}</td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px',
                          background: art.status === 'published' ? '#dcfce7' : art.status === 'flagged' ? '#fee2e2' : '#f1f5f9',
                          color: art.status === 'published' ? '#166534' : art.status === 'flagged' ? '#991b1b' : '#475569'
                        }}>
                          {art.status}
                        </span>
                      </td>

                      {/* Story Enable / Disable toggle button */}
                      {isOwner && (
                        <td style={{ padding: '14px 18px' }}>
                          <button
                            onClick={() => handleToggleStoryStatus(art)}
                            style={{
                              background: art.status === 'published' ? '#dcfce7' : '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              borderRadius: '20px',
                              padding: '4px 10px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              cursor: 'pointer',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              color: art.status === 'published' ? '#166534' : '#64748b'
                            }}
                            title="Toggle Story Publish / Draft"
                          >
                            {art.status === 'published' ? <FiToggleRight size={16} color="#16a34a" /> : <FiToggleLeft size={16} color="#94a3b8" />}
                            <span>{art.status === 'published' ? 'Active' : 'Disabled'}</span>
                          </button>
                        </td>
                      )}

                      <td style={{ padding: '14px 18px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        👁️ {art.views || 0} • ❤️ {art.likes ? art.likes.length : 0} • 💬 {art.commentCount || 0}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <Link to={`/article/${art.slug}`} style={{ padding: '6px 10px', background: '#f1f5f9', borderRadius: '6px', color: '#0f172a', textDecoration: 'none' }} title="View Story">
                            <FiEye size={14} />
                          </Link>
                          {isOwner && (
                            <>
                              <button onClick={() => handleOpenEdit(art)} style={{ padding: '6px 10px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#334155' }} title="Edit Story">
                                <FiEdit2 size={14} />
                              </button>
                              <button onClick={() => handleDeleteArticle(art._id)} style={{ padding: '6px 10px', background: '#fee2e2', border: 'none', borderRadius: '6px', color: '#dc2626', cursor: 'pointer' }} title="Delete Story">
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
          )
        ) : activeTab === 'liked' ? (
          likedArticles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <FiHeart size={40} color="#94a3b8" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontWeight: 800 }}>No Saved / Liked Stories</h3>
              <p style={{ color: '#64748b', fontSize: '13px' }}>Stories you hype or bookmark will appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {likedArticles.map((art) => (
                <div key={art._id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '18px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent-color, #c8102e)', textTransform: 'uppercase' }}>
                    {getCategoryLabel(art.category)}
                  </span>
                  <h4 style={{ margin: '6px 0', fontSize: '16px', fontWeight: 800 }}>
                    <Link to={`/article/${art.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {art.title}
                    </Link>
                  </h4>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px' }}>{art.lead}</p>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>By {art.author?.name || 'Author'}</div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Tab 4: My Comments */
          myComments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <FiMessageSquare size={40} color="#94a3b8" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontWeight: 800 }}>No Comments Yet</h3>
              <p style={{ color: '#64748b', fontSize: '13px' }}>Responses and discussions you participate in will show up here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {myComments.map((c) => (
                <div key={c._id} style={{ background: '#fff', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', color: '#64748b' }}>
                    <span>On Story: <strong>{c.article?.title || 'Article'}</strong></span>
                    <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '14px', color: '#0f172a' }}>{c.text}</p>
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
