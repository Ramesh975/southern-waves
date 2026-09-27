import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { articleAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getImageUrl } from '../../components/ArticleComponents';
import { PaginationControls } from '../../components/PaginationControls';
import toast from 'react-hot-toast';
import {
  FiSearch, FiGrid, FiList, FiColumns, FiPlusCircle,
  FiEdit3, FiTrash2, FiEye, FiChevronDown, FiX,
  FiFilter, FiZap, FiStar, FiPackage, FiClock
} from 'react-icons/fi';

const STATUS_FILTERS = [
  { key: '', label: 'All', icon: <FiPackage size={13} /> },
  { key: 'published', label: 'Published', icon: <FiZap size={13} /> },
  { key: 'pending_review', label: 'Pending', icon: <FiStar size={13} /> },
  { key: 'draft', label: 'Draft', icon: <FiEdit3 size={13} /> },
  { key: 'archived', label: 'Archived', icon: <FiFilter size={13} /> },
];

const CATEGORY_COLORS = {
  news: { bg: '#fef2f2', text: '#b91c1c', dot: '#ef4444' },
  editorial: { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
  features: { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e' },
  kyp: { bg: '#fefce8', text: '#a16207', dot: '#eab308' },
  'tea-shop': { bg: '#fdf2f8', text: '#9d174d', dot: '#ec4899' },
  'pictures-speak': { bg: '#f5f3ff', text: '#6d28d9', dot: '#8b5cf6' },
  'university-row': { bg: '#fff7ed', text: '#c2410c', dot: '#f97316' },
};

const STATUS_STYLE = {
  published: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  draft: { bg: '#fefce8', text: '#a16207', border: '#fde68a' },
  pending_review: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  archived: { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' },
};

/* ── Article Card (Grid View - Default) ── */
const ArticleCard = ({ a, isAdmin, onDelete, onTogglePush, animDelay = 0 }) => {
  const cat = CATEGORY_COLORS[a.category] || { bg: '#f3f4f6', text: '#374151', dot: '#9ca3af' };
  const status = STATUS_STYLE[a.status] || STATUS_STYLE.archived;

  return (
    <div className="aa-card" style={{ animationDelay: `${animDelay}ms` }}>
      {/* Cover Image */}
      <Link to={`/admin/article/${a._id}`} className="aa-card-cover-link">
        <div className="aa-card-cover">
          {a.coverImage ? (
            <img src={getImageUrl(a.coverImage)} alt={a.title} loading="lazy" />
          ) : (
            <div className="aa-card-cover-placeholder">
              <FiFileTextIcon />
            </div>
          )}
          {/* Overlay badges */}
          <div className="aa-card-cover-badges">
            {a.isPushedToHome && <span className="aa-cover-badge spotlight">🚀 Spotlight</span>}
            {a.isFeatured && <span className="aa-cover-badge featured">⭐ Featured</span>}
            {a.isTrending && <span className="aa-cover-badge trending">🔥 Hot</span>}
          </div>
          <div className="aa-card-cover-status" style={{ background: status.bg, color: status.text, borderColor: status.border }}>
            {a.status?.replace('_', ' ')}
          </div>
        </div>
      </Link>

      {/* Card Body */}
      <div className="aa-card-body">
        <div className="aa-card-meta-row">
          <span className="aa-cat-chip" style={{ background: cat.bg, color: cat.text }}>
            <span className="aa-cat-dot" style={{ background: cat.dot }} />
            {a.category}
          </span>
          <span className="aa-card-views">
            <FiEye size={12} /> {(a.views || 0).toLocaleString()} views
          </span>
        </div>

        {/* Title allows multiple rows cleanly */}
        <Link to={`/admin/article/${a._id}`} className="aa-card-title">
          {a.title}
        </Link>

        <div className="aa-card-author">
          <div className="aa-author-dot">{a.author?.name?.charAt(0)?.toUpperCase() || 'A'}</div>
          <span className="aa-author-name">{a.author?.name || 'Unknown'}</span>
          <span className="aa-card-date">
            <FiClock size={11} style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }} />
            {new Date(a.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Card Actions */}
      <div className="aa-card-actions">
        <Link to={`/admin/article/${a._id}`} className="aa-action-btn aa-action-view">
          <FiEye size={13} /> Manage
        </Link>
        <Link to={`/admin/edit-article/${a._id}`} className="aa-action-btn aa-action-edit">
          <FiEdit3 size={13} /> Edit
        </Link>
        {isAdmin && (
          <>
            <button
              onClick={() => onTogglePush(a._id, a.isPushedToHome)}
              className={`aa-action-btn ${a.isPushedToHome ? 'aa-action-unpush' : 'aa-action-push'}`}
              title={a.isPushedToHome ? 'Remove from spotlight' : 'Push to spotlight'}
            >
              {a.isPushedToHome ? 'Un-Push' : '🚀 Push'}
            </button>
            <button
              onClick={() => onDelete(a._id, a.title)}
              className="aa-action-btn aa-action-delete"
              title="Delete article"
            >
              <FiTrash2 size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const FiFileTextIcon = () => (
  <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

/* ── Article List Row (List View) ── */
const ArticleListRow = ({ a, isAdmin, onDelete, onTogglePush, animDelay = 0 }) => {
  const cat = CATEGORY_COLORS[a.category] || { bg: '#f3f4f6', text: '#374151', dot: '#9ca3af' };
  const status = STATUS_STYLE[a.status] || STATUS_STYLE.archived;

  return (
    <div className="aa-list-row" style={{ animationDelay: `${animDelay}ms` }}>
      {/* Cover Thumbnail */}
      <div className="aa-list-thumb">
        {a.coverImage ? (
          <img src={getImageUrl(a.coverImage)} alt={a.title} loading="lazy" />
        ) : (
          <div className="aa-list-thumb-placeholder"><FiFileTextIcon /></div>
        )}
      </div>

      {/* Main Info with Multi-Row Title */}
      <div className="aa-list-info">
        <div className="aa-list-badges">
          <span className="aa-cat-chip" style={{ background: cat.bg, color: cat.text }}>
            <span className="aa-cat-dot" style={{ background: cat.dot }} />
            {a.category}
          </span>
          <span className="aa-status-chip" style={{ background: status.bg, color: status.text, borderColor: status.border }}>
            {a.status?.replace('_', ' ')}
          </span>
          {a.isPushedToHome && <span className="aa-cover-badge spotlight" style={{ position: 'static', fontSize: 10, padding: '2px 6px' }}>🚀 Spotlight</span>}
          {a.isFeatured && <span className="aa-cover-badge featured" style={{ position: 'static', fontSize: 10, padding: '2px 6px' }}>⭐ Featured</span>}
        </div>
        <Link to={`/admin/article/${a._id}`} className="aa-list-title">
          {a.title}
        </Link>
        <div className="aa-list-meta">
          <span>{a.author?.name || 'Unknown'}</span>
          <span>·</span>
          <span>{new Date(a.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          <span>·</span>
          <span><FiEye size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> {(a.views || 0).toLocaleString()} views</span>
        </div>
      </div>

      {/* Actions */}
      <div className="aa-list-actions">
        <Link to={`/admin/article/${a._id}`} className="aa-action-btn aa-action-view">
          <FiEye size={13} /> Manage
        </Link>
        <Link to={`/admin/edit-article/${a._id}`} className="aa-action-btn aa-action-edit">
          <FiEdit3 size={13} /> Edit
        </Link>
        {isAdmin && (
          <>
            <button onClick={() => onTogglePush(a._id, a.isPushedToHome)} className={`aa-action-btn ${a.isPushedToHome ? 'aa-action-unpush' : 'aa-action-push'}`}>
              {a.isPushedToHome ? 'Un-Push' : '🚀 Push'}
            </button>
            <button onClick={() => onDelete(a._id, a.title)} className="aa-action-btn aa-action-delete">
              <FiTrash2 size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

/* ── Compact Row (Dense View) ── */
const ArticleCompactRow = ({ a, isAdmin, onDelete, onTogglePush, animDelay = 0 }) => {
  const cat = CATEGORY_COLORS[a.category] || { bg: '#f3f4f6', text: '#374151', dot: '#9ca3af' };
  const status = STATUS_STYLE[a.status] || STATUS_STYLE.archived;
  return (
    <div className="aa-compact-row" style={{ animationDelay: `${animDelay}ms` }}>
      <div className="aa-compact-status-bar" style={{ background: status.text }} />
      <div className="aa-compact-title">
        <Link to={`/admin/article/${a._id}`}>{a.title}</Link>
        {a.isPushedToHome && <span>🚀</span>}
        {a.isFeatured && <span>⭐</span>}
      </div>
      <span className="aa-cat-chip aa-compact-cat" style={{ background: cat.bg, color: cat.text }}>
        <span className="aa-cat-dot" style={{ background: cat.dot }} />
        {a.category}
      </span>
      <span className="aa-compact-author">{a.author?.name || '—'}</span>
      <span className="aa-compact-views"><FiEye size={11} /> {(a.views || 0).toLocaleString()}</span>
      <div className="aa-compact-actions">
        <Link to={`/admin/article/${a._id}`} className="aa-action-btn aa-action-view" title="Manage"><FiEye size={12} /></Link>
        <Link to={`/admin/edit-article/${a._id}`} className="aa-action-btn aa-action-edit" title="Edit"><FiEdit3 size={12} /></Link>
        {isAdmin && (
          <button onClick={() => onDelete(a._id, a.title)} className="aa-action-btn aa-action-delete" title="Delete"><FiTrash2 size={12} /></button>
        )}
      </div>
    </div>
  );
};

const ALL_CATEGORIES = ['news', 'editorial', 'features', 'kyp', 'tea-shop', 'pictures-speak', 'university-row'];

/* ── Main Component ── */
const AdminArticles = () => {
  const { isAdmin } = useAuth();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalArticles, setTotalArticles] = useState(0);
  const searchRef = useRef(null);

  // Debounce search query (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchArticles = () => {
    setLoading(true);
    articleAPI.getAll({
      page,
      limit: 24,
      status: filter || undefined,
      category: categoryFilter || undefined,
      search: debouncedSearch || undefined,
      sort: sortBy || undefined,
      adminView: 'true',
    })
      .then((res) => {
        setArticles(res.data?.data || []);
        setTotalPages(res.data?.totalPages || 1);
        setTotalArticles(res.data?.total || 0);
      })
      .catch(() => toast.error('Failed to load articles'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchArticles();
  }, [page, filter, categoryFilter, debouncedSearch, sortBy]);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await articleAPI.delete(id);
      toast.success('Article deleted');
      fetchArticles();
    } catch {
      toast.error('Failed to delete article');
    }
  };

  const handleTogglePush = async (id, currentVal) => {
    try {
      await articleAPI.update(id, { isPushedToHome: !currentVal });
      toast.success(currentVal ? 'Removed from spotlight' : 'Pushed to spotlight! 🚀');
      fetchArticles();
    } catch {
      toast.error('Failed to update push status');
    }
  };

  const categories = ALL_CATEGORIES;

  return (
    <>
      <style>{`
        /* ── Admin Articles Page ── */
        .aa-page { display: flex; flex-direction: column; gap: 0; }

        /* Header */
        .aa-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .aa-header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

        /* Toolbar Container */
        .aa-toolbar {
          background: var(--admin-card-bg);
          border: 1px solid var(--admin-border);
          border-radius: 16px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 18px;
          box-shadow: var(--admin-shadow-sm);
          transition: all 0.3s ease;
        }

        /* Top Row of Toolbar */
        .aa-toolbar-top {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        /* Status Filter Pills - smooth scrollable row */
        .aa-status-filters {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding: 2px 0;
          flex: 1;
        }
        .aa-status-filters::-webkit-scrollbar { display: none; }

        .aa-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 24px;
          border: 1.5px solid var(--admin-border);
          background: transparent;
          color: var(--admin-text-muted);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          white-space: nowrap;
          flex-shrink: 0;
        }
        .aa-status-pill:hover {
          border-color: var(--accent-color);
          color: var(--accent-color);
          transform: translateY(-1px);
        }
        .aa-status-pill.active {
          background: var(--accent-color);
          border-color: var(--accent-color);
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(200,16,46,0.28);
          transform: translateY(-1px);
        }

        /* Search Bar */
        .aa-search-wrapper {
          position: relative;
          min-width: 180px;
          flex: 1;
          max-width: 320px;
        }
        .aa-search-wrapper svg {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--admin-text-subtle);
          pointer-events: none;
        }
        .aa-search-input {
          width: 100%;
          padding: 9px 36px 9px 36px;
          border: 1.5px solid var(--admin-border);
          border-radius: 10px;
          background: var(--admin-bg);
          color: var(--admin-text-main);
          font-size: 13px;
          outline: none;
          transition: all 0.2s ease;
        }
        .aa-search-input:focus {
          border-color: var(--accent-color);
          box-shadow: 0 0 0 3px rgba(200,16,46,0.1);
        }
        .aa-search-clear {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--admin-text-subtle);
          cursor: pointer;
          padding: 2px;
          display: flex;
          align-items: center;
        }

        /* Controls Right (Filters toggle + View mode) */
        .aa-toolbar-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* View Mode Toggle */
        .aa-view-toggle {
          display: flex;
          gap: 3px;
          background: var(--admin-bg);
          border: 1.5px solid var(--admin-border);
          border-radius: 10px;
          padding: 3px;
        }
        .aa-view-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          color: var(--admin-text-muted);
          border-radius: 7px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.18s ease;
        }
        .aa-view-btn.active {
          background: var(--accent-color);
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(200,16,46,0.25);
        }

        /* Advanced Filter Row */
        .aa-filter-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          padding-top: 10px;
          border-top: 1px dashed var(--admin-border);
          animation: aa-slideDown 0.25s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes aa-slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .aa-filter-label {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--admin-text-muted);
          white-space: nowrap;
        }
        .aa-filter-chips { display: flex; gap: 6px; flex-wrap: wrap; }
        .aa-filter-chip {
          padding: 5px 12px;
          border-radius: 20px;
          border: 1.5px solid var(--admin-border);
          background: transparent;
          color: var(--admin-text-muted);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .aa-filter-chip:hover { border-color: var(--accent-color); color: var(--accent-color); }
        .aa-filter-chip.active { background: rgba(200,16,46,0.08); border-color: var(--accent-color); color: var(--accent-color); }
        .aa-sort-select {
          padding: 7px 12px;
          border: 1.5px solid var(--admin-border);
          border-radius: 9px;
          background: var(--admin-card-bg);
          color: var(--admin-text-main);
          font-size: 12px;
          font-weight: 700;
          outline: none;
          cursor: pointer;
          margin-left: auto;
        }

        /* Results Info Bar */
        .aa-results-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
          font-size: 12px;
          color: var(--admin-text-muted);
          padding: 0 4px;
        }
        .aa-results-count strong { color: var(--admin-text-main); font-weight: 800; }

        /* ── GRID VIEW (DEFAULT) ── */
        .aa-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
          gap: 18px;
        }

        .aa-card {
          background: var(--admin-card-bg);
          border: 1px solid var(--admin-border);
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
          box-shadow: var(--admin-shadow-sm);
          animation: aa-fadeUp 0.35s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes aa-fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .aa-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.12);
          border-color: var(--accent-color);
        }

        .aa-card-cover-link { display: block; text-decoration: none; }
        .aa-card-cover {
          position: relative;
          width: 100%;
          height: 165px;
          background: var(--admin-hover-bg);
          overflow: hidden;
        }
        .aa-card-cover img {
          width: 100%; height: 100%;
          object-fit: cover;
          transition: transform 0.4s cubic-bezier(0.16,1,0.3,1);
        }
        .aa-card:hover .aa-card-cover img { transform: scale(1.06); }
        .aa-card-cover-placeholder {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          color: var(--admin-text-subtle);
          background: linear-gradient(135deg, var(--admin-hover-bg), var(--admin-border));
        }
        .aa-card-cover-badges {
          position: absolute; top: 10px; left: 10px;
          display: flex; flex-wrap: wrap; gap: 5px;
          z-index: 2;
        }
        .aa-cover-badge {
          font-size: 10.5px; font-weight: 800; padding: 3px 8px;
          border-radius: 12px; backdrop-filter: blur(8px);
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        .aa-cover-badge.spotlight { background: rgba(234,179,8,0.95); color: #fff; }
        .aa-cover-badge.featured { background: rgba(59,130,246,0.95); color: #fff; }
        .aa-cover-badge.trending { background: rgba(239,68,68,0.95); color: #fff; }
        .aa-card-cover-status {
          position: absolute; bottom: 10px; right: 10px;
          font-size: 10px; font-weight: 800; text-transform: uppercase;
          padding: 3px 8px; border-radius: 10px; border: 1px solid;
          letter-spacing: 0.5px; z-index: 2;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        }

        .aa-card-body {
          padding: 16px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .aa-card-meta-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .aa-cat-chip {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 10px; font-weight: 800; text-transform: uppercase;
          padding: 3px 9px; border-radius: 12px; letter-spacing: 0.5px;
        }
        .aa-cat-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .aa-card-views { font-size: 11.5px; color: var(--admin-text-muted); display: flex; align-items: center; gap: 4px; font-weight: 600; }

        /* Multiple row title with nice line-height */
        .aa-card-title {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          font-weight: 800;
          font-size: 15px;
          line-height: 1.45;
          color: var(--admin-text-main);
          text-decoration: none;
          margin-bottom: 12px;
          word-break: break-word;
          white-space: normal;
          transition: color 0.15s;
        }
        .aa-card-title:hover { color: var(--accent-color); }

        .aa-card-author {
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; color: var(--admin-text-muted);
          margin-top: auto; padding-top: 8px;
          border-top: 1px dashed var(--admin-border);
        }
        .aa-author-dot {
          width: 22px; height: 22px; border-radius: 50%;
          background: var(--accent-color); color: #fff;
          font-size: 10px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .aa-author-name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .aa-card-date { margin-left: auto; font-size: 11px; color: var(--admin-text-subtle); white-space: nowrap; }

        .aa-card-actions {
          display: grid;
          grid-template-columns: 1fr 1fr auto auto;
          gap: 6px;
          padding: 10px 14px 14px;
          border-top: 1px solid var(--admin-border);
          background: rgba(0,0,0,0.015);
        }

        /* ── ACTION BUTTONS ── */
        .aa-action-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 5px;
          padding: 7px 10px; border-radius: 8px; font-size: 12px; font-weight: 750;
          border: 1px solid transparent; cursor: pointer; text-decoration: none;
          transition: all 0.18s cubic-bezier(0.16,1,0.3,1);
          white-space: nowrap;
        }
        .aa-action-view { background: rgba(59,130,246,0.08); color: #2563eb; border-color: rgba(59,130,246,0.25); }
        .aa-action-view:hover { background: #2563eb; color: #fff; border-color: #2563eb; transform: translateY(-1px); }
        .aa-action-edit { background: rgba(234,179,8,0.08); color: #b45309; border-color: rgba(234,179,8,0.25); }
        .aa-action-edit:hover { background: #d97706; color: #fff; border-color: #d97706; transform: translateY(-1px); }
        .aa-action-push { background: rgba(34,197,94,0.08); color: #15803d; border-color: rgba(34,197,94,0.25); }
        .aa-action-push:hover { background: #16a34a; color: #fff; border-color: #16a34a; transform: translateY(-1px); }
        .aa-action-unpush { background: rgba(249,115,22,0.08); color: #c2410c; border-color: rgba(249,115,22,0.25); }
        .aa-action-unpush:hover { background: #ea580c; color: #fff; border-color: #ea580c; transform: translateY(-1px); }
        .aa-action-delete { background: rgba(239,68,68,0.08); color: #dc2626; border-color: rgba(239,68,68,0.25); padding: 7px 10px; }
        .aa-action-delete:hover { background: #dc2626; color: #fff; border-color: #dc2626; transform: scale(1.06); }

        /* ── LIST VIEW ── */
        .aa-list { display: flex; flex-direction: column; gap: 12px; }

        .aa-list-row {
          display: flex;
          align-items: center;
          gap: 16px;
          background: var(--admin-card-bg);
          border: 1px solid var(--admin-border);
          border-radius: 14px;
          padding: 14px 16px;
          transition: all 0.22s cubic-bezier(0.16,1,0.3,1);
          box-shadow: var(--admin-shadow-sm);
          animation: aa-fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) both;
        }
        .aa-list-row:hover {
          border-color: var(--accent-color);
          box-shadow: 0 6px 20px rgba(0,0,0,0.07);
          transform: translateX(3px);
        }
        .aa-list-thumb {
          width: 80px; height: 60px; border-radius: 10px;
          overflow: hidden; flex-shrink: 0;
          background: var(--admin-hover-bg);
        }
        .aa-list-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .aa-list-thumb-placeholder {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          color: var(--admin-text-subtle);
        }
        .aa-list-info { flex: 1; min-width: 0; }
        .aa-list-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; }
        .aa-status-chip {
          font-size: 10px; font-weight: 800; text-transform: uppercase;
          padding: 2px 8px; border-radius: 10px; border: 1px solid;
        }
        /* Multiple row title in list view */
        .aa-list-title {
          display: block;
          font-weight: 800;
          font-size: 14.5px;
          line-height: 1.4;
          color: var(--admin-text-main);
          text-decoration: none;
          margin-bottom: 6px;
          white-space: normal;
          word-break: break-word;
          transition: color 0.15s;
        }
        .aa-list-title:hover { color: var(--accent-color); }
        .aa-list-meta {
          display: flex; align-items: center; gap: 6px;
          font-size: 11.5px; color: var(--admin-text-subtle);
          flex-wrap: wrap;
        }
        .aa-list-actions { display: flex; gap: 6px; flex-shrink: 0; flex-wrap: wrap; align-items: center; }

        /* ── COMPACT VIEW ── */
        .aa-compact { display: flex; flex-direction: column; gap: 5px; }
        .aa-compact-header {
          display: grid;
          grid-template-columns: 6px 1fr 120px 120px 80px 110px;
          gap: 10px; padding: 8px 14px;
          font-size: 10px; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.5px; color: var(--admin-text-muted);
          border-bottom: 2px solid var(--admin-border);
          margin-bottom: 4px;
        }
        .aa-compact-row {
          display: grid;
          grid-template-columns: 6px 1fr 120px 120px 80px 110px;
          gap: 10px; align-items: center;
          background: var(--admin-card-bg);
          border: 1px solid var(--admin-border);
          border-radius: 10px; padding: 10px 14px;
          transition: all 0.18s ease;
          animation: aa-fadeUp 0.28s cubic-bezier(0.16,1,0.3,1) both;
        }
        .aa-compact-row:hover {
          border-color: var(--accent-color);
          background: rgba(200,16,46,0.02);
          transform: translateX(2px);
        }
        .aa-compact-status-bar { width: 5px; height: 28px; border-radius: 3px; flex-shrink: 0; }
        .aa-compact-title { display: flex; align-items: center; gap: 6px; min-width: 0; }
        .aa-compact-title a {
          font-weight: 700; font-size: 13px; color: var(--admin-text-main);
          text-decoration: none; white-space: normal; line-height: 1.35;
          transition: color 0.15s;
        }
        .aa-compact-title a:hover { color: var(--accent-color); }
        .aa-compact-title span { font-size: 12px; flex-shrink: 0; }
        .aa-compact-cat { font-size: 10px; padding: 2px 7px; }
        .aa-compact-author { font-size: 12px; color: var(--admin-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .aa-compact-views { font-size: 12px; color: var(--admin-text-muted); display: flex; align-items: center; gap: 3px; }
        .aa-compact-actions { display: flex; gap: 4px; justify-content: flex-end; }

        /* Empty State */
        .aa-empty {
          text-align: center; padding: 60px 24px;
          background: var(--admin-card-bg);
          border: 2px dashed var(--admin-border);
          border-radius: 16px;
          color: var(--admin-text-muted);
        }
        .aa-empty-icon { font-size: 48px; margin-bottom: 12px; }
        .aa-empty h3 { font-size: 16px; font-weight: 800; color: var(--admin-text-main); margin-bottom: 6px; }
        .aa-empty p { font-size: 13px; margin-bottom: 20px; }

        /* Loading */
        .aa-loading { display: flex; flex-direction: column; gap: 12px; }
        .aa-skeleton {
          border-radius: 14px;
          background: linear-gradient(90deg, var(--admin-hover-bg) 25%, var(--admin-border) 50%, var(--admin-hover-bg) 75%);
          background-size: 200% 100%;
          animation: aa-shimmer 1.4s infinite linear;
        }
        @keyframes aa-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        /* ============================================================
           MOBILE RESPONSIVE TWEAKS (≤768px & ≤480px)
           ============================================================ */
        @media (max-width: 768px) {
          .aa-header { margin-bottom: 16px; gap: 12px; }
          .aa-toolbar { padding: 12px; gap: 10px; border-radius: 14px; }
          .aa-toolbar-top { gap: 8px; flex-direction: column; align-items: stretch; }
          .aa-toolbar-controls { justify-content: space-between; width: 100%; }
          .aa-search-wrapper { max-width: 100%; min-width: 100%; }
          .aa-status-filters { width: 100%; padding-bottom: 4px; }
          .aa-status-pill { padding: 6px 12px; font-size: 11px; }

          /* Grid View on Mobile */
          .aa-grid { grid-template-columns: 1fr; gap: 14px; }
          .aa-card-cover { height: 180px; }
          .aa-card-title { font-size: 15px; -webkit-line-clamp: 4; }
          .aa-card-actions { grid-template-columns: 1fr 1fr auto auto; }

          /* List View on Mobile - Stacks gracefully */
          .aa-list-row {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
            padding: 14px;
          }
          .aa-list-thumb { width: 100%; height: 140px; }
          .aa-list-title { font-size: 15px; }
          .aa-list-actions {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr 1fr auto auto;
            gap: 6px;
            padding-top: 10px;
            border-top: 1px solid var(--admin-border);
          }

          .aa-compact-header, .aa-compact-row {
            grid-template-columns: 5px 1fr 80px 80px;
          }
          .aa-compact-header > *:nth-child(4),
          .aa-compact-row > *:nth-child(4),
          .aa-compact-header > *:nth-child(5),
          .aa-compact-row > *:nth-child(5) { display: none; }
        }

        @media (max-width: 480px) {
          .aa-toolbar { padding: 10px; }
          .aa-card-body { padding: 14px; }
          .aa-card-title { font-size: 14.5px; }
          .aa-card-actions { grid-template-columns: 1fr 1fr auto auto; gap: 4px; }
          .aa-action-btn { font-size: 11px; padding: 6px 8px; }
          .aa-list-actions { grid-template-columns: 1fr 1fr auto auto; gap: 4px; }
        }
      `}</style>

      <div className="aa-page">
        {/* ── Header ── */}
        <div className="aa-header">
          <div>
            <h1 className="admin-title">Articles</h1>
            <p className="admin-subtitle">Manage, edit, and push articles to the homepage spotlight.</p>
          </div>
          <div className="aa-header-actions">
            <Link to="/admin/new-article" className="btn-admin-primary">
              <FiPlusCircle size={15} /> New Article
            </Link>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="aa-toolbar">
          <div className="aa-toolbar-top">
            {/* Status Filter Pills - Scrollable */}
            <div className="aa-status-filters">
              {STATUS_FILTERS.map(s => (
                <button
                  key={s.key}
                  className={`aa-status-pill${filter === s.key ? ' active' : ''}`}
                  onClick={() => { setFilter(s.key); setSearchQuery(''); }}
                >
                  {s.icon}
                  {s.label}
                  {s.key === '' && articles.length > 0 && (
                    <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 10, padding: '0 6px', fontSize: 10 }}>
                      {articles.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="aa-search-wrapper">
              <FiSearch size={15} />
              <input
                ref={searchRef}
                type="text"
                className="aa-search-input"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="aa-search-clear" onClick={() => setSearchQuery('')}>
                  <FiX size={13} />
                </button>
              )}
            </div>

            {/* Controls (Filters + View Toggles) */}
            <div className="aa-toolbar-controls">
              <button
                className={`aa-status-pill${showFilters ? ' active' : ''}`}
                onClick={() => setShowFilters(v => !v)}
                title="Advanced Filters"
                style={{ flexShrink: 0 }}
              >
                <FiChevronDown size={13} style={{ transform: showFilters ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                Filters
              </button>

              {/* View Mode Toggle */}
              <div className="aa-view-toggle">
                <button className={`aa-view-btn${viewMode === 'grid' ? ' active' : ''}`} onClick={() => setViewMode('grid')} title="Grid View">
                  <FiGrid size={15} />
                </button>
                <button className={`aa-view-btn${viewMode === 'list' ? ' active' : ''}`} onClick={() => setViewMode('list')} title="List View">
                  <FiList size={15} />
                </button>
                <button className={`aa-view-btn${viewMode === 'compact' ? ' active' : ''}`} onClick={() => setViewMode('compact')} title="Compact View">
                  <FiColumns size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* ── Advanced Filters Row ── */}
          {showFilters && (
            <div className="aa-filter-row">
              <span className="aa-filter-label">Category:</span>
              <div className="aa-filter-chips">
                <button className={`aa-filter-chip${categoryFilter === '' ? ' active' : ''}`} onClick={() => setCategoryFilter('')}>All</button>
                {categories.map(c => (
                  <button key={c} className={`aa-filter-chip${categoryFilter === c ? ' active' : ''}`} onClick={() => setCategoryFilter(c)}>
                    {c}
                  </button>
                ))}
              </div>
              <select className="aa-sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="views">Most Views</option>
                <option value="title">A → Z</option>
              </select>
            </div>
          )}
        </div>

        {/* ── Results Bar ── */}
        <div className="aa-results-bar">
          <span className="aa-results-count">
            Showing <strong>{articles.length}</strong> of {totalArticles} articles
            {debouncedSearch && <> · Query: "<em>{debouncedSearch}</em>"</>}
          </span>
          {(searchQuery || categoryFilter || filter) && (
            <button
              style={{ background: 'none', border: 'none', color: 'var(--accent-color)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              onClick={() => { setSearchQuery(''); setCategoryFilter(''); setFilter(''); setPage(1); }}
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="aa-loading">
            {[...Array(viewMode === 'grid' ? 6 : 4)].map((_, i) => (
              <div
                key={i}
                className="aa-skeleton"
                style={{
                  height: viewMode === 'grid' ? 280 : 70,
                  animationDelay: `${i * 60}ms`
                }}
              />
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="aa-empty">
            <div className="aa-empty-icon">📭</div>
            <h3>No articles found</h3>
            <p>{debouncedSearch ? `No results for "${debouncedSearch}"` : 'No articles match the current filters.'}</p>
            <Link to="/admin/new-article" className="btn-admin-primary">
              <FiPlusCircle size={14} /> Create New Article
            </Link>
          </div>
        ) : (
          <>
            {/* Grid View (Default) */}
            {viewMode === 'grid' && (
              <div className="aa-grid">
                {articles.map((a, i) => (
                  <ArticleCard
                    key={a._id}
                    a={a}
                    isAdmin={isAdmin}
                    onDelete={handleDelete}
                    onTogglePush={handleTogglePush}
                    animDelay={Math.min(i * 35, 300)}
                  />
                ))}
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="aa-list">
                {articles.map((a, i) => (
                  <ArticleListRow
                    key={a._id}
                    a={a}
                    isAdmin={isAdmin}
                    onDelete={handleDelete}
                    onTogglePush={handleTogglePush}
                    animDelay={Math.min(i * 30, 250)}
                  />
                ))}
              </div>
            )}

            {/* Compact View */}
            {viewMode === 'compact' && (
              <div className="aa-compact">
                <div className="aa-compact-header">
                  <span />
                  <span>Title</span>
                  <span>Category</span>
                  <span>Author</span>
                  <span>Views</span>
                  <span style={{ textAlign: 'right' }}>Actions</span>
                </div>
                {articles.map((a, i) => (
                  <ArticleCompactRow
                    key={a._id}
                    a={a}
                    isAdmin={isAdmin}
                    onDelete={handleDelete}
                    onTogglePush={handleTogglePush}
                    animDelay={Math.min(i * 25, 200)}
                  />
                ))}
              </div>
            )}

            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalArticles}
              pageSize={24}
              onPageChange={setPage}
              isLoading={loading}
            />
          </>
        )}
      </div>
    </>
  );
};

export default AdminArticles;
