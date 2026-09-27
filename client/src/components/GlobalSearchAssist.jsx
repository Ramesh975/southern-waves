import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { articleAPI, authAPI, filterAPI } from '../services/api';
import { getImageUrl } from './ArticleComponents';
import {
  FiSearch, FiX, FiFileText, FiUser, FiSettings,
  FiSliders, FiShield, FiCheckCircle,
  FiEdit3, FiEye, FiActivity, FiArrowRight, FiCommand,
  FiTrendingUp, FiClock, FiPlusCircle, FiLogOut, FiMoon,
  FiSun, FiExternalLink, FiCornerDownLeft, FiFolder
} from 'react-icons/fi';
import './GlobalSearchAssist.css';

const FILTER_TABS = [
  { id: 'all', label: 'All Results' },
  { id: 'articles', label: 'Articles' },
  { id: 'drafts', label: 'Drafts' },
  { id: 'pending', label: 'Pending Reviews' },
  { id: 'restricted', label: 'Restricted / Banned' },
  { id: 'users', label: 'Users & Roles' },
  { id: 'settings', label: 'Settings & Admin' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'actions', label: 'Quick Actions' },
];

const STATIC_SYSTEM_ACTIONS = [
  {
    id: 'act-new-article',
    title: 'Create New Article',
    subtitle: 'Open the rich text editor to compose and publish',
    category: 'actions',
    icon: FiPlusCircle,
    path: '/admin/new-article',
    adminOnly: true,
  },
  {
    id: 'act-dashboard',
    title: 'Admin Dashboard',
    subtitle: 'System stats, published metrics, and live overview',
    category: 'settings',
    icon: FiActivity,
    path: '/admin',
    adminOnly: true,
  },
  {
    id: 'act-articles-mgmt',
    title: 'Manage Articles',
    subtitle: 'View, filter, edit, or archive all site articles',
    category: 'articles',
    icon: FiFileText,
    path: '/admin/articles',
    adminOnly: true,
  },
  {
    id: 'act-users-mgmt',
    title: 'User Management',
    subtitle: 'Inspect user accounts, manage roles, and block accounts',
    category: 'users',
    icon: FiUser,
    path: '/admin/users',
    adminOnly: true,
  },
  {
    id: 'act-submissions',
    title: 'Pending Submissions',
    subtitle: 'Review student submissions and draft proposals',
    category: 'pending',
    icon: FiClock,
    path: '/admin/submissions',
    adminOnly: true,
  },
  {
    id: 'act-moderation',
    title: 'Content Moderation',
    subtitle: 'Audit flagged content, sensitivity locks, and ban status',
    category: 'restricted',
    icon: FiShield,
    path: '/admin/moderation',
    adminOnly: true,
  },
  {
    id: 'act-filter-manager',
    title: 'Filter & Profanity Manager',
    subtitle: 'Configure automated blacklisted keywords and banned tags',
    category: 'settings',
    icon: FiSliders,
    path: '/admin/filters',
    adminOnly: true,
  },
  {
    id: 'act-security',
    title: 'Security & System Center',
    subtitle: 'System logs, backup controls, and access security',
    category: 'settings',
    icon: FiShield,
    path: '/admin/security',
    adminOnly: true,
  },
  {
    id: 'act-stories',
    title: 'Fast Stories Hub',
    subtitle: 'Browse 24-hour visual interactive student stories',
    category: 'actions',
    icon: FiEye,
    path: '/stories',
  },
  {
    id: 'act-news',
    title: 'Campus News Section',
    subtitle: 'Explore latest breaking university news & feeds',
    category: 'articles',
    icon: FiFolder,
    path: '/news',
  },
  {
    id: 'act-author-studio',
    title: 'Author Studio & Analytics',
    subtitle: 'Your personal writing studio, engagement, and reach metrics',
    category: 'analytics',
    icon: FiTrendingUp,
    path: '/author-studio',
  },
];

export const GlobalSearchAssist = ({ isOpen, onClose }) => {
  const { user, isAdmin, isEditor, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  // Live dynamic results from API
  const [articles, setArticles] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [pendingArticles, setPendingArticles] = useState([]);
  const [flaggedArticles, setFlaggedArticles] = useState([]);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sw_global_recent_searches') || '[]');
    } catch {
      return [];
    }
  });

  const inputRef = useRef(null);
  const resultsContainerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
      setActiveFilter('all');
    }
  }, [isOpen]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('toggle-global-search'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch data on query change with debouncing
  useEffect(() => {
    if (!isOpen) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      const q = query.trim();
      setLoading(true);

      try {
        const promises = [];

        // 1. Articles Search
        promises.push(
          articleAPI.getAll({
            search: q || undefined,
            limit: 25,
          }).then(res => res.data?.data || []).catch(() => [])
        );

        // 2. Users Search
        promises.push(
          authAPI.getAllUsers({
            search: q || undefined,
            limit: 15,
          }).then(res => {
            const all = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data?.users) ? res.data.users : Array.isArray(res.data) ? res.data : [];
            return all.slice(0, 15);
          }).catch(() => [])
        );

        // 3. Pending reviews
        if (isAdmin || isEditor || isModerator) {
          promises.push(
            filterAPI.getPending({ search: q || undefined, limit: 10 }).then(res => res.data?.data || []).catch(() => [])
          );
          promises.push(
            filterAPI.getFlagged({ search: q || undefined, limit: 10 }).then(res => res.data?.data || []).catch(() => [])
          );
        } else {
          promises.push(Promise.resolve([]));
          promises.push(Promise.resolve([]));
        }

        const [fetchedArticles, fetchedUsers, fetchedPending, fetchedFlagged] = await Promise.all(promises);

        setArticles(fetchedArticles);
        setUsersList(fetchedUsers);
        setPendingArticles(fetchedPending);
        setFlaggedArticles(fetchedFlagged);
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => clearTimeout(debounceTimerRef.current);
  }, [query, isOpen, isAdmin, isEditor]);

  // Aggregate results based on active filter
  const categorizedResults = useMemo(() => {
    const q = query.toLowerCase().trim();

    // 1. Static System Actions matching query
    const filteredActions = STATIC_SYSTEM_ACTIONS.filter(act => {
      if (act.adminOnly && !isAdmin && !isEditor) return false;
      if (!q) return true;
      return act.title.toLowerCase().includes(q) || act.subtitle.toLowerCase().includes(q);
    });

    // 2. Categorize Articles
    const published = articles.filter(a => a.status === 'published' && !a.isFlagged && !a.isBanned);
    const drafts = articles.filter(a => a.status === 'draft');
    const pending = [...pendingArticles, ...articles.filter(a => a.status === 'pending_review')];
    const restricted = [
      ...flaggedArticles,
      ...articles.filter(a => a.isFlagged || a.isBanned || a.isLocked),
      ...usersList.filter(u => u.isBlocked)
    ];

    return {
      actions: filteredActions,
      articles: published,
      drafts,
      pending,
      restricted,
      users: usersList,
      settings: filteredActions.filter(a => a.category === 'settings'),
      analytics: filteredActions.filter(a => a.category === 'analytics'),
    };
  }, [query, articles, usersList, pendingArticles, flaggedArticles, isAdmin, isEditor]);

  // Flatten items for keyboard navigation based on selected tab
  const flatItems = useMemo(() => {
    const items = [];

    if (activeFilter === 'all') {
      if (categorizedResults.actions.length > 0) {
        categorizedResults.actions.forEach(a => items.push({ ...a, type: 'action', group: 'Quick Actions & Settings' }));
      }
      if (categorizedResults.articles.length > 0) {
        categorizedResults.articles.forEach(a => items.push({ ...a, type: 'article', group: 'Published Articles' }));
      }
      if (categorizedResults.drafts.length > 0) {
        categorizedResults.drafts.forEach(d => items.push({ ...d, type: 'draft', group: 'Drafts' }));
      }
      if (categorizedResults.pending.length > 0) {
        categorizedResults.pending.forEach(p => items.push({ ...p, type: 'pending', group: 'Pending Review' }));
      }
      if (categorizedResults.restricted.length > 0) {
        categorizedResults.restricted.forEach(r => items.push({ ...r, type: 'restricted', group: 'Restricted & Flagged' }));
      }
      if (categorizedResults.users.length > 0) {
        categorizedResults.users.forEach(u => items.push({ ...u, type: 'user', group: 'Users & Roles' }));
      }
    } else if (activeFilter === 'articles') {
      categorizedResults.articles.forEach(a => items.push({ ...a, type: 'article', group: 'Articles' }));
    } else if (activeFilter === 'drafts') {
      categorizedResults.drafts.forEach(d => items.push({ ...d, type: 'draft', group: 'Drafts' }));
    } else if (activeFilter === 'pending') {
      categorizedResults.pending.forEach(p => items.push({ ...p, type: 'pending', group: 'Pending Reviews' }));
    } else if (activeFilter === 'restricted') {
      categorizedResults.restricted.forEach(r => items.push({ ...r, type: 'restricted', group: 'Restricted / Flagged' }));
    } else if (activeFilter === 'users') {
      categorizedResults.users.forEach(u => items.push({ ...u, type: 'user', group: 'Users' }));
    } else if (activeFilter === 'settings') {
      categorizedResults.settings.forEach(s => items.push({ ...s, type: 'action', group: 'Settings & Administration' }));
    } else if (activeFilter === 'analytics') {
      categorizedResults.analytics.forEach(a => items.push({ ...a, type: 'action', group: 'Analytics & Reporting' }));
    } else if (activeFilter === 'actions') {
      categorizedResults.actions.forEach(a => items.push({ ...a, type: 'action', group: 'Quick Actions' }));
    }

    return items;
  }, [activeFilter, categorizedResults]);

  // Save query to recents
  const saveRecent = useCallback((text) => {
    if (!text || text.trim().length < 2) return;
    const clean = text.trim();
    setRecentSearches(prev => {
      const next = [clean, ...prev.filter(x => x.toLowerCase() !== clean.toLowerCase())].slice(0, 5);
      try {
        localStorage.setItem('sw_global_recent_searches', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Execute selected item
  const handleSelect = (item) => {
    if (query.trim()) saveRecent(query);
    onClose();

    if (item.type === 'action') {
      if (item.action) {
        item.action();
      } else if (item.path) {
        navigate(item.path);
      }
    } else if (item.type === 'article' || item.type === 'draft' || item.type === 'pending' || item.type === 'restricted') {
      if (isAdmin || isEditor || isModerator) {
        if (item._id) {
          navigate(`/admin/article/${item._id}`);
        } else if (item.slug) {
          navigate(`/article/${item.slug}`);
        }
      } else {
        if (item.slug) {
          navigate(`/article/${item.slug}`);
        } else if (item._id) {
          navigate(`/admin/edit-article/${item._id}`);
        }
      }
    } else if (item.type === 'user') {
      if (item.username || item._id) {
        navigate(`/author/${item.username || item._id}`);
      }
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(flatItems.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + flatItems.length) % Math.max(flatItems.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems[selectedIndex]) {
        handleSelect(flatItems[selectedIndex]);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const currentIdx = FILTER_TABS.findIndex(t => t.id === activeFilter);
      const nextIdx = e.shiftKey
        ? (currentIdx - 1 + FILTER_TABS.length) % FILTER_TABS.length
        : (currentIdx + 1) % FILTER_TABS.length;
      setActiveFilter(FILTER_TABS[nextIdx].id);
      setSelectedIndex(0);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="gsa-backdrop" onClick={onClose}>
      <div 
        className="gsa-container" 
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Top Search Input Header */}
        <div className="gsa-header">
          <FiSearch className="gsa-search-icon" size={22} />
          <input
            ref={inputRef}
            type="text"
            className="gsa-input"
            placeholder="Search articles, users, drafts, settings, actions... (Ctrl+K)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <div className="gsa-header-actions">
            {query && (
              <button 
                className="gsa-close-btn" 
                onClick={() => setQuery('')}
                title="Clear search"
              >
                <FiX size={16} />
              </button>
            )}
            <span className="gsa-shortcut-badge">ESC</span>
          </div>
        </div>

        {/* Filter Tabs Bar */}
        <div className="gsa-filters-bar">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              className={`gsa-filter-chip ${activeFilter === tab.id ? 'active' : ''}`}
              onClick={() => {
                setActiveFilter(tab.id);
                setSelectedIndex(0);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Results Body */}
        <div className="gsa-results-body" ref={resultsContainerRef}>
          {loading ? (
            <div className="gsa-empty">
              <div className="nm-mini-spinner" style={{ margin: '0 auto 12px' }} />
              <div className="gsa-empty-desc">Searching across Southern Waves ecosystem...</div>
            </div>
          ) : flatItems.length === 0 ? (
            <div className="gsa-empty">
              <FiSearch className="gsa-empty-icon" size={32} />
              <div className="gsa-empty-title">No matching results found</div>
              <div className="gsa-empty-desc">
                Try searching for article titles, author names, role filters, or admin settings.
              </div>
            </div>
          ) : (
            <div>
              {/* Grouping header */}
              {flatItems.map((item, index) => {
                const isSelected = index === selectedIndex;
                const showGroupTitle = index === 0 || flatItems[index - 1].group !== item.group;

                return (
                  <React.Fragment key={item._id || item.id || index}>
                    {showGroupTitle && (
                      <div className="gsa-group-title">
                        <span>{item.group}</span>
                      </div>
                    )}

                    <div
                      className={`gsa-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <div className="gsa-item-left">
                        {item.type === 'article' || item.type === 'draft' || item.type === 'pending' || item.type === 'restricted' ? (
                          item.coverImage ? (
                            <img
                              src={getImageUrl(item.coverImage)}
                              alt=""
                              className="gsa-item-thumb"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="gsa-item-icon-box">
                              <FiFileText size={18} />
                            </div>
                          )
                        ) : item.type === 'user' ? (
                          item.avatar ? (
                            <img
                              src={getImageUrl(item.avatar)}
                              alt=""
                              className="gsa-item-thumb"
                              style={{ borderRadius: '50%' }}
                              onError={(e) => {
                                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'User')}&background=c8102e&color=fff`;
                              }}
                            />
                          ) : (
                            <div className="gsa-item-icon-box" style={{ borderRadius: '50%' }}>
                              <FiUser size={18} />
                            </div>
                          )
                        ) : (
                          <div className="gsa-item-icon-box">
                            {item.icon ? <item.icon size={18} /> : <FiCommand size={18} />}
                          </div>
                        )}

                        <div className="gsa-item-text">
                          <div className="gsa-item-title">{item.title || item.name}</div>
                          <div className="gsa-item-subtitle">
                            {item.type === 'article' && (
                              <>
                                <span className="gsa-badge gsa-badge-published">Published</span>
                                <span>{item.category?.toUpperCase()}</span>
                                {item.author?.name && <span>• {item.author.name}</span>}
                              </>
                            )}
                            {item.type === 'draft' && (
                              <>
                                <span className="gsa-badge gsa-badge-draft">Draft</span>
                                <span>{item.category?.toUpperCase() || 'ARTICLE'}</span>
                              </>
                            )}
                            {item.type === 'pending' && (
                              <>
                                <span className="gsa-badge gsa-badge-pending">Needs Review</span>
                                <span>{item.category?.toUpperCase() || 'SUBMISSION'}</span>
                              </>
                            )}
                            {item.type === 'restricted' && (
                              <>
                                <span className="gsa-badge gsa-badge-restricted">Flagged / Locked</span>
                                <span>{item.flagReason || 'Moderation Alert'}</span>
                              </>
                            )}
                            {item.type === 'user' && (
                              <>
                                <span className="gsa-badge gsa-badge-role">{item.role || 'Student'}</span>
                                <span>{item.email}</span>
                                {item.isBlocked && <span className="gsa-badge gsa-badge-restricted">Blocked</span>}
                              </>
                            )}
                            {item.type === 'action' && (
                              <span>{item.subtitle}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Action Trigger Buttons */}
                      <div className="gsa-item-actions" onClick={(e) => e.stopPropagation()}>
                        {(item.type === 'article' || item.type === 'draft') && (
                          <>
                            {item._id && (
                              <button
                                className="gsa-btn-action"
                                onClick={() => {
                                  onClose();
                                  navigate((isAdmin || isEditor) ? `/admin/article/${item._id}` : `/article/${item.slug}`);
                                }}
                              >
                                <FiEye size={12} /> {(isAdmin || isEditor) ? 'Manage' : 'View'}
                              </button>
                            )}
                            {item._id && (isAdmin || isEditor) && (
                              <button
                                className="gsa-btn-action"
                                onClick={() => {
                                  onClose();
                                  navigate(`/admin/edit-article/${item._id}`);
                                }}
                              >
                                <FiEdit3 size={12} /> Edit
                              </button>
                            )}
                          </>
                        )}

                        {item.type === 'user' && (
                          <button
                            className="gsa-btn-action"
                            onClick={() => {
                              onClose();
                              navigate(`/admin/users`);
                            }}
                          >
                            <FiSliders size={12} /> Manage
                          </button>
                        )}

                        {item.type === 'action' && (
                          <button
                            className="gsa-btn-action"
                            onClick={() => handleSelect(item)}
                          >
                            Jump <FiArrowRight size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Shortcut Instructions */}
        <div className="gsa-footer">
          <div className="gsa-footer-hints">
            <div className="gsa-key-hint">
              <span className="gsa-key">↑</span>
              <span className="gsa-key">↓</span>
              <span>Navigate</span>
            </div>
            <div className="gsa-key-hint">
              <span className="gsa-key">↵</span>
              <span>Select</span>
            </div>
            <div className="gsa-key-hint">
              <span className="gsa-key">TAB</span>
              <span>Filter</span>
            </div>
            <div className="gsa-key-hint">
              <span className="gsa-key">ESC</span>
              <span>Close</span>
            </div>
          </div>

          <div>
            <span style={{ fontWeight: 700, color: 'var(--accent-color, #c8102e)' }}>Southern Waves</span> Search Assist
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearchAssist;
