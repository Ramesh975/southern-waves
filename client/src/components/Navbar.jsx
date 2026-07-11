import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useChat } from '../context/ChatContext';
import { articleAPI, authAPI } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import { FiArrowLeft, FiChevronDown, FiBell, FiSun, FiMoon, FiUser, FiMenu, FiX, FiSearch, FiArrowRight, FiMessageSquare, FiBookmark, FiLogOut, FiLayout, FiSettings, FiUpload } from 'react-icons/fi';
import { IoContrast } from 'react-icons/io5';
import './NavbarModern.css';
import AccountSettingsModal from './AccountSettingsModal';
import { getImageUrl } from './ArticleComponents';

const ROUTE_NAMES = {
  '/': 'Home',
  '/news': 'News',
  '/editorial': 'Editorial',
  '/features': 'Features',
  '/tea-shop': 'Tea Shop',
  '/pictures-speak': "Pictures Speak",
  '/know-your-past': 'Know Our Past',
  '/about': 'About Us',
  '/login': 'Student Login',
  '/register': 'Sign Up',
  '/admin': 'Dashboard'
};

const Navbar = () => {
  const { user, logout, refreshUser } = useAuth();
  const { theme, setTheme, toggleTheme, styleMode, setStyleMode, accent, setAccent, ACCENT_COLORS } = useTheme();
  const { isOpen, setIsOpen, openRoom, setActiveRoom, setActiveTab, replies, totalUnread, notifications, unreadNotificationsCount, markNotificationRead, markAllNotificationsRead, fetchNotifications } = useChat();
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [signOutConfirm, setSignOutConfirm] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileAppearanceExpanded, setMobileAppearanceExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [trendingTags, setTrendingTags] = useState([]);
  const [recommendedTags, setRecommendedTags] = useState([]);
  const [recommendedArticles, setRecommendedArticles] = useState([]);
  const [initialLoading, setInitialLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navbarRef = useRef(null);
  const searchInputRef = useRef(null);
  const timeoutRef = useRef(null);
  const searchCacheRef = useRef({});

  const currentPath = location.pathname;

  const getPageName = (path) => {
    if (ROUTE_NAMES[path]) return ROUTE_NAMES[path];
    
    if (path.startsWith('/tag/')) {
      const tag = path.split('/')[2];
      return tag ? tag.charAt(0).toUpperCase() + tag.slice(1) : 'Tag';
    }
    
    if (path.startsWith('/article/')) {
      return 'Article';
    }
    
    return 'Southern Waves';
  };

  const pageName = getPageName(currentPath);

  const checkActive = (path) => {
    if (currentPath === path) return true;
    if (path !== '/' && currentPath.startsWith(path + '/')) return true;
    return false;
  };

  const renderNavLink = (to, text) => {
    const isActive = checkActive(to);
    return (
      <Link to={to} className={`concept-nav-link ${isActive ? 'active' : ''}`}>
        <span className="nav-bullet">&gt;</span> {text}
        {isActive && <span className="active-badge">Active</span>}
      </Link>
    );
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleOpenSettings = (e) => {
      const tab = e.detail?.tab || 'profile';
      navigate(`/settings?tab=${tab}`);
    };
    window.addEventListener('open-account-settings', handleOpenSettings);
    return () => window.removeEventListener('open-account-settings', handleOpenSettings);
  }, [navigate]);


  // Close menus on route change
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
    setNotificationsOpen(false);
  }, [location]);

  // Click outside detection for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      const customizerWrapper = document.querySelector('.nav-customizer-wrapper');
      if (customizerWrapper && !customizerWrapper.contains(event.target)) {
        setCustomizerOpen(false);
      }
      const profileWrapper = document.querySelector('.nav-user-profile-wrapper');
      if (profileWrapper && !profileWrapper.contains(event.target)) {
        setProfileMenuOpen(false);
      }
      const notificationsWrapper = document.querySelector('.nav-notifications-wrapper');
      if (notificationsWrapper && !notificationsWrapper.contains(event.target)) {
        setNotificationsOpen(false);
      }
      if (navbarRef.current && !navbarRef.current.contains(event.target)) {
        setMenuOpen(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when open
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const timeAgo = (dateStr) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch (e) {
      return '';
    }
  };

  // Perform search with fast caching
  const doSearch = async (q) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }

    const cacheKey = `navbar:${trimmed.toLowerCase()}`;
    if (searchCacheRef.current[cacheKey]) {
      setSearchResults(searchCacheRef.current[cacheKey]);
      return;
    }

    setSearchLoading(true);
    try {
      const res = await articleAPI.getAll({ search: trimmed, limit: 6 });
      const data = res.data?.data || [];
      searchCacheRef.current[cacheKey] = data; // Cache search result
      setSearchResults(data);
    } catch (err) {
      console.error('Navbar search failed:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    if (!searchOpen) return;
    const t = setTimeout(() => doSearch(searchQuery), 350);
    return () => clearTimeout(t);
  }, [searchQuery, searchOpen]);

  // Load trending and recommended data when search opens
  useEffect(() => {
    if (!searchOpen) return;
    if (trendingTags.length > 0 || recommendedTags.length > 0 || recommendedArticles.length > 0) return;

    setInitialLoading(true);
    Promise.all([
      articleAPI.getTrendingTags({ limit: 6 }).catch(() => ({ data: { data: [] } })),
      articleAPI.getRecommendations({ limit: 4 }).catch(() => ({ data: { data: [] } }))
    ]).then(([tagsRes, recRes]) => {
      // 1. Trending tags
      const tagsData = tagsRes.data?.data || tagsRes.data || [];
      const extractedTags = tagsData.map(t => typeof t === 'string' ? t : t.tag).filter(Boolean);
      setTrendingTags(extractedTags.slice(0, 5));

      // 2. Recommended tags
      const recTagsData = recRes.data?.userInterests?.tags || [];
      const extractedRecTags = recTagsData.map(t => typeof t === 'string' ? t : t.tag).filter(Boolean);
      const defaultRecTags = ['fee hike', 'protest', 'campus', 'politics', 'exam'];
      setRecommendedTags(extractedRecTags.length > 0 ? extractedRecTags.slice(0, 5) : defaultRecTags);

      // 3. Recommended articles
      setRecommendedArticles(recRes.data?.data || []);
    }).catch(err => {
      console.error('Failed to load navbar search suggestions:', err);
    }).finally(() => {
      setInitialLoading(false);
    });
  }, [searchOpen, trendingTags.length, recommendedTags.length, recommendedArticles.length]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const handleQuickLinkClick = (path) => {
    navigate(path);
    setSearchOpen(false);
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setMenuOpen(true);
    setSearchOpen(false);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setMenuOpen(false);
    }, 150);
  };

  return (
    <>
      <header className={`navbar-modern ${isScrolled ? 'scrolled' : ''}`} ref={navbarRef}>
        <div className="navbar-modern-row">
          {/* Left Side */}
          <div className="navbar-modern-left">
            {currentPath !== '/' && (
              <button className="nav-icon-btn back-btn" onClick={() => navigate(-1)} aria-label="Go Back">
                <FiArrowLeft size={20} />
              </button>
            )}
            {currentPath !== '/' && <div className="nav-accent-bar"></div>}
            <div className="nav-title-group">
              <Link to="/" className={`nav-brand-label ${currentPath === '/' ? 'home-brand' : ''}`}>Southern Waves.</Link>
              {currentPath !== '/' && <h1 className="nav-dynamic-title">{pageName}</h1>}
            </div>
          </div>

          {/* Right Side */}
          <div className="navbar-modern-right">
            {/* More button moved here next to Theme / Icons as requested in sketch */}
            {currentPath !== '/' && (
              <div 
                className="nav-dropdown-wrapper"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <button 
                  className={`nav-more-btn ${menuOpen ? 'active' : ''}`}
                  onClick={() => { setMenuOpen(!menuOpen); setSearchOpen(false); }}
                >
                  <span>Explore</span>
                  <FiChevronDown className="more-chevron" size={16} />
                </button>
              </div>
            )}

            {/* Search Icon Toggle */}
            <button 
              className={`nav-icon-btn nav-search-btn ${searchOpen ? 'active' : ''}`}
              onClick={() => { setSearchOpen(!searchOpen); setMenuOpen(false); }}
              aria-label="Search"
            >
              {searchOpen ? <FiX size={20} /> : <FiSearch size={20} />}
            </button>

            {/* Accent Customizer Button */}
            <div className="nav-customizer-wrapper">
              <button 
                className={`nav-icon-btn ${customizerOpen ? 'active' : ''}`}
                onClick={() => {
                  setCustomizerOpen(!customizerOpen);
                  setMenuOpen(false);
                  setSearchOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}
                title="Change Accent Color & Themes"
                aria-label="Customize Appearance"
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-color)',
                  border: '2px solid var(--color-white)',
                  boxShadow: styleMode === 'modern' ? '0 2px 6px rgba(0,0,0,0.15)' : '0 0 0 2px var(--color-black)',
                  transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transform: customizerOpen ? 'scale(1.2)' : 'scale(1)'
                }} />
              </button>

              {customizerOpen && (
                <div className="appearance-popover">
                  <div className="popover-header">
                    <h3>Appearance</h3>
                  </div>

                  <div className="popover-section">
                    <span className="section-label">Accent Color</span>
                    <div className="accent-color-row">
                      {Object.keys(ACCENT_COLORS).map((colorKey) => {
                        const colorInfo = ACCENT_COLORS[colorKey];
                        const isSelected = accent === colorKey;
                        return (
                          <button
                            key={colorKey}
                            className={`accent-color-option ${isSelected ? 'selected' : ''}`}
                            onClick={() => setAccent(colorKey)}
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              backgroundColor: colorInfo.primary,
                              border: isSelected ? '2px solid var(--color-black)' : '1px solid rgba(0,0,0,0.1)',
                              boxShadow: isSelected ? '0 0 0 2px var(--accent-color)' : 'none',
                              cursor: 'pointer',
                              position: 'relative',
                              padding: 0
                            }}
                            title={colorInfo.name}
                          >
                            {isSelected && (
                              <span style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                fontSize: '10px',
                                fontWeight: 'bold'
                              }}>✓</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="popover-section">
                    <span className="section-label">Theme Mode</span>
                    <div className="theme-toggle-row">
                      {[
                        { id: 'light', label: 'Light', icon: <FiSun size={14} /> },
                        { id: 'dark', label: 'Dark', icon: <FiMoon size={14} /> },
                        { id: 'black', label: 'Black', icon: <IoContrast size={14} /> }
                      ].map((mode) => {
                        const isSelected = theme === mode.id;
                        return (
                          <button
                            key={mode.id}
                            className={`theme-mode-btn ${isSelected ? 'selected' : ''}`}
                            onClick={() => setTheme(mode.id)}
                            style={{ border: styleMode === 'traditional' ? '2px solid var(--color-black)' : undefined }}
                          >
                            {mode.icon}
                            <span>{mode.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="popover-section">
                    <span className="section-label">UI Mode</span>
                    <div className="ui-mode-row">
                      {[
                        { id: 'modern', label: 'Modern iOS' },
                        { id: 'traditional', label: 'Traditional' }
                      ].map((mode) => {
                        const isSelected = styleMode === mode.id;
                        return (
                          <button
                            key={mode.id}
                            className={`ui-mode-btn ${isSelected ? 'selected' : ''}`}
                            onClick={() => setStyleMode(mode.id)}
                            style={{ border: styleMode === 'traditional' ? '2px solid var(--color-black)' : undefined }}
                          >
                            <span>{mode.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Messages Button */}
            {user && (
              <button 
                className="nav-icon-btn message-btn" 
                onClick={() => {
                  if (!isOpen) {
                    setActiveRoom(null);
                  }
                  setIsOpen(!isOpen);
                  setActiveTab('all');
                }}
                title="Messages"
              >
                <FiMessageSquare size={20} />
                {totalUnread > 0 && (
                  <span className="notification-badge">{totalUnread}</span>
                )}
              </button>
            )}

            {/* Notification Button */}
            <div className="nav-notifications-wrapper" style={{ position: 'relative' }}>
              <button 
                className={`nav-icon-btn notification-btn ${notificationsOpen ? 'active' : ''}`}
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setProfileMenuOpen(false);
                  setCustomizerOpen(false);
                  setMenuOpen(false);
                  setSearchOpen(false);
                }}
                title="University Alerts"
              >
                <FiBell size={20} />
                {unreadNotificationsCount > 0 && (
                  <span className="notification-badge">{unreadNotificationsCount}</span>
                )}
              </button>

              {notificationsOpen && (
                <NotificationsPopover 
                  notifications={notifications}
                  markNotificationRead={markNotificationRead}
                  markAllNotificationsRead={markAllNotificationsRead}
                  setNotificationsOpen={setNotificationsOpen}
                  fetchNotifications={fetchNotifications}
                  currentUser={user}
                />
              )}
            </div>

            {user ? (
              <div className="nav-user-profile-wrapper" style={{ position: 'relative' }}>
                <div 
                  className="nav-user-profile" 
                  onClick={() => {
                    setProfileMenuOpen(!profileMenuOpen);
                    setCustomizerOpen(false);
                    setMenuOpen(false);
                    setSearchOpen(false);
                  }} 
                  title="Account options"
                >
                  <span className="nav-username">{user.name.split(' ')[0]}</span>
                  <div className="nav-profile-pic">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} />
                    ) : (
                      <FiUser size={18} />
                    )}
                  </div>
                </div>

                {/* Profile menu popover */}
                {profileMenuOpen && (
                  <div className="profile-popover">
                    <div className="profile-popover-header">
                      <img 
                        src={user.avatar || '/default-avatar.png'} 
                        alt={user.name} 
                        className="profile-popover-avatar"
                      />
                      <div className="profile-popover-info">
                        <h4 className="profile-popover-name">{user.name}</h4>
                        <p className="profile-popover-email">{user.email}</p>
                        <p className="profile-popover-role">{user.role}</p>
                      </div>
                    </div>

                    <div className="profile-popover-menu-list">
                      {/* Option 1: if admin/editor show Dashboard else show Saved Articles */}
                      {(user.role === 'admin' || user.role === 'editor') ? (
                        <>
                          <Link 
                            to="/admin" 
                            className="profile-popover-item"
                            onClick={() => setProfileMenuOpen(false)}
                          >
                            <FiLayout size={16} />
                            <span>Dashboard</span>
                          </Link>
                          <Link 
                            to="/saved-articles" 
                            className="profile-popover-item"
                            onClick={() => setProfileMenuOpen(false)}
                          >
                            <FiBookmark size={16} />
                            <span>Saved Articles</span>
                          </Link>
                          <Link 
                            to="/my-uploads" 
                            className="profile-popover-item"
                            onClick={() => setProfileMenuOpen(false)}
                          >
                            <FiUpload size={16} />
                            <span>My Uploads</span>
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link 
                            to="/saved-articles" 
                            className="profile-popover-item"
                            onClick={() => setProfileMenuOpen(false)}
                          >
                            <FiBookmark size={16} />
                            <span>Saved Articles</span>
                          </Link>
                          <Link 
                            to="/my-uploads" 
                            className="profile-popover-item"
                            onClick={() => setProfileMenuOpen(false)}
                          >
                            <FiUpload size={16} />
                            <span>My Uploads</span>
                          </Link>
                        </>
                      )}

                      {/* Option 2: Notifications */}
                      <button 
                        className="profile-popover-item" 
                        onClick={() => {
                          setProfileMenuOpen(false);
                          setIsOpen(true);
                          setActiveTab('board_alerts');
                        }}
                      >
                        <FiBell size={16} />
                        <span>Notifications</span>
                      </button>

                      {/* Option 3: Accounts */}
                      <button 
                        className="profile-popover-item" 
                        onClick={() => {
                          setProfileMenuOpen(false);
                          navigate('/settings');
                        }}
                      >
                        <FiSettings size={16} />
                        <span>Accounts</span>
                      </button>
                    </div>

                    {/* Option 4: Signout with Box Rounded */}
                    <button 
                      className="profile-popover-signout"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        setSignOutConfirm(true);
                      }}
                    >
                      <FiLogOut size={14} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="nav-user-profile">
                <Link to="/login" className="nav-username login-link">Login</Link>
                <Link to="/login" className="nav-profile-pic">
                  <FiUser size={18} />
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Toggle */}
            <button 
              className="nav-icon-btn mobile-menu-toggle" 
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <FiMenu size={22} />
            </button>
          </div>
        </div>

        {/* Apple-style Multi-column Mega Menu (Direct child of header for full-width overlay) */}
        <div 
          className={`nav-mega-dropdown ${menuOpen ? 'open' : ''}`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="nav-mega-dropdown-inner concept-layout">
            {/* Primary Grid: 3 Columns, 2 Rows matching handdrawn sketch */}
            <div className="mega-concept-grid">
              {/* Column 1: News & Editorial */}
              <div className="mega-column">
                <div className="mega-column-links">
                  {renderNavLink('/news', 'News')}
                  {renderNavLink('/editorial', 'Editorial')}
                </div>
              </div>

              {/* Column 2: Feature & Picture's Speak */}
              <div className="mega-column">
                <div className="mega-column-links">
                  {renderNavLink('/features', 'Features')}
                  {renderNavLink('/pictures-speak', "Pictures Speak")}
                </div>
              </div>

              {/* Column 3: Tea Shop, Know Our Past & About Us */}
              <div className="mega-column">
                <div className="mega-column-links">
                  {renderNavLink('/tea-shop', 'Tea Shop')}
                  {renderNavLink('/know-your-past', 'Know Our Past')}
                  {renderNavLink('/about', 'About Us')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Apple-style Search Dropdown (Direct child of header for full-width overlay) */}
        <div className={`nav-search-dropdown ${searchOpen ? 'open' : ''}`}>
          <div className="nav-search-dropdown-inner">
            <form onSubmit={handleSearch} className="search-input-wrapper">
              <FiSearch size={22} color="var(--color-gray-400)" />
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Search Southern Waves" 
                className="search-dropdown-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button type="button" className="btn-clear-search-navbar" onClick={() => setSearchQuery('')} aria-label="Clear query" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)' }}>
                  <FiX size={18} />
                </button>
              )}
            </form>

            <div className="search-dropdown-results-area">
              {searchQuery.trim() ? (
                /* Live Search Results */
                <div className="navbar-live-search-results">
                  {searchLoading ? (
                    <div style={{ padding: '24px 0', display: 'flex', justifyContent: 'center' }}>
                      <div className="nm-mini-spinner" />
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="navbar-search-empty" style={{ padding: '16px 0', fontSize: '14px', color: 'var(--color-gray-500)', textAlign: 'center' }}>No results found for "{searchQuery}"</div>
                  ) : (
                    <div className="navbar-search-results-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {searchResults.map(art => (
                        <Link 
                          key={art._id} 
                          to={`/article/${art.slug}`} 
                          className="navbar-search-result-item"
                          onClick={() => setSearchOpen(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '10px 14px',
                            background: 'var(--color-gray-50)',
                            border: '1px solid var(--color-gray-100)',
                            borderRadius: '12px',
                            textDecoration: 'none',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {art.coverImage && (
                            <img 
                              src={getImageUrl(art.coverImage)} 
                              alt="" 
                              className="navbar-search-result-thumb" 
                              style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                            />
                          )}
                          <div className="navbar-search-result-info" style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
                            <span className="navbar-search-result-cat" style={{ fontFamily: 'var(--font-display)', fontSize: '8px', fontWeight: 800, color: 'var(--accent-color)', letterSpacing: '0.5px' }}>{art.category?.toUpperCase()}</span>
                            <span className="navbar-search-result-title" style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 700, color: 'var(--color-black)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{art.title}</span>
                            <span className="navbar-search-result-meta" style={{ fontSize: '10px', color: 'var(--color-gray-500)' }}>By {art.author?.name} · {timeAgo(art.publishedAt || art.createdAt)}</span>
                          </div>
                          <FiArrowRight size={14} className="navbar-search-result-arrow" style={{ color: 'var(--color-gray-400)' }} />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Suggestions & Recommendations */
                <div className="navbar-search-suggestions-layout">
                  {initialLoading ? (
                    <div style={{ padding: '32px 0', display: 'flex', justifyContent: 'center' }}>
                      <div className="nm-mini-spinner" />
                    </div>
                  ) : (
                    <div className="navbar-suggestions-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                      {/* Left: Tags */}
                      <div className="navbar-suggestions-tags-col" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {trendingTags.length > 0 && (
                          <div className="navbar-suggestions-section">
                            <span className="navbar-suggestions-label" style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-gray-400)', marginBottom: '8px' }}>🔥 Trending Tags</span>
                            <div className="navbar-tags-flex" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {trendingTags.slice(0, 5).map(tag => (
                                <button key={tag} className="navbar-tag-pill" onClick={() => handleQuickLinkClick(`/tag/${tag}`)} style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 12px', background: 'var(--color-gray-100)', border: 'none', borderRadius: '20px', fontSize: '12px', fontWeight: 600, color: 'var(--color-gray-600)', cursor: 'pointer', transition: 'all 0.2s' }}>
                                  #{tag}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {recommendedTags.length > 0 && (
                          <div className="navbar-suggestions-section" style={{ marginTop: 12 }}>
                            <span className="navbar-suggestions-label" style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-gray-400)', marginBottom: '8px' }}>✨ Recommended Tags</span>
                            <div className="navbar-tags-flex" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {recommendedTags.slice(0, 5).map(tag => (
                                <button key={tag} className="navbar-tag-pill" onClick={() => handleQuickLinkClick(`/tag/${tag}`)} style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 12px', background: 'var(--color-gray-100)', border: 'none', borderRadius: '20px', fontSize: '12px', fontWeight: 600, color: 'var(--color-gray-600)', cursor: 'pointer', transition: 'all 0.2s' }}>
                                  #{tag}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right: Articles */}
                      <div className="navbar-suggestions-articles-col">
                        {recommendedArticles.length > 0 && (
                          <div className="navbar-suggestions-section">
                            <span className="navbar-suggestions-label" style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-gray-400)', marginBottom: '8px' }}>🎯 Recommended Stories</span>
                            <div className="navbar-suggested-articles-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {recommendedArticles.slice(0, 3).map(art => (
                                <Link 
                                  key={art._id} 
                                  to={`/article/${art.slug}`} 
                                  className="navbar-suggested-article-item" 
                                  onClick={() => setSearchOpen(false)}
                                  style={{
                                    display: 'block',
                                    padding: '8px 12px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--color-gray-150)',
                                    background: 'var(--color-paper)',
                                    textDecoration: 'none',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  <div className="navbar-suggested-article-title" style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 700, color: 'var(--color-black)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{art.title}</div>
                                  <div className="navbar-suggested-article-meta" style={{ fontSize: '10px', color: 'var(--color-gray-500)', marginTop: '2px' }}>{art.category?.toUpperCase()} · By {art.author?.name || 'Staff'}</div>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Quick links block underneath */}
                  <div className="search-quick-links-section" style={{ marginTop: 24, borderTop: '1px solid var(--color-gray-200)', paddingTop: '16px' }}>
                    <span className="search-quick-links-title" style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-gray-400)', marginBottom: '8px' }}>Quick Navigation</span>
                    <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
                      <button className="search-quick-link-item btn-none" style={{background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-gray-600)'}} onClick={() => handleQuickLinkClick('/tea-shop')}>
                        <FiArrowRight size={14} className="search-arrow-icon" />
                        <span>Tea Shop</span>
                      </button>
                      {user && (user.role === 'editor' || user.role === 'admin') && (
                        <button className="search-quick-link-item btn-none" style={{background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-gray-600)'}} onClick={() => handleQuickLinkClick('/admin')}>
                          <FiArrowRight size={14} className="search-arrow-icon" />
                          <span>Editor Dashboard</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {currentPath === '/' && (
          <div className="navbar-secondary-bar">
            <div className="navbar-secondary-bar-inner">
              <NavLink to="/news" className={({ isActive }) => `sec-nav-link ${isActive ? 'active' : ''}`}>News</NavLink>
              <NavLink to="/editorial" className={({ isActive }) => `sec-nav-link ${isActive ? 'active' : ''}`}>Editorial</NavLink>
              <NavLink to="/features" className={({ isActive }) => `sec-nav-link ${isActive ? 'active' : ''}`}>Features</NavLink>
              <NavLink to="/pictures-speak" className={({ isActive }) => `sec-nav-link ${isActive ? 'active' : ''}`}>Picture's Speak</NavLink>
              <NavLink to="/tea-shop" className={({ isActive }) => `sec-nav-link ${isActive ? 'active' : ''}`}>Tea Shop</NavLink>
              <NavLink to="/know-your-past" className={({ isActive }) => `sec-nav-link ${isActive ? 'active' : ''}`}>Know Our Past</NavLink>
              <NavLink to="/about" className={({ isActive }) => `sec-nav-link ${isActive ? 'active' : ''}`}>About Us</NavLink>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Popup Overlay */}
      <div 
        className={`mobile-popup-overlay ${mobileMenuOpen ? 'open' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      >
        <div 
          className="mobile-popup-content" 
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mobile-popup-header">
            <span className="brand-text">Southern Waves</span>
            <button 
              className="nav-icon-btn close-btn" 
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <FiX size={24} />
            </button>
          </div>

          {/* Mobile search bar */}
          <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', padding: '0 8px' }}>
            <FiSearch size={18} color="var(--color-gray-400)" />
            <input 
              type="text" 
              placeholder="Search..." 
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '16px', width: '100%' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          <div className="mobile-popup-links">
            <NavLink to="/news" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
              News
            </NavLink>
            <NavLink to="/features" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
              Features
            </NavLink>
            <NavLink to="/tea-shop" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
              Tea Shop
            </NavLink>
            <NavLink to="/editorial" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
              Editorial
            </NavLink>
            <NavLink to="/pictures-speak" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
              Pictures Speak
            </NavLink>
            <NavLink to="/know-your-past" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
              Know Our Past
            </NavLink>
          </div>

          <hr className="mobile-divider" />

          <div className="mobile-popup-actions">
            {/* Side-by-Side Pill Buttons for Messages and Alerts */}
            <div className="mobile-popup-pills" style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
              {user && (
                <button 
                  className="mobile-pill-btn" 
                  onClick={() => {
                    setActiveRoom(null);
                    setIsOpen(true);
                    setActiveTab('all');
                    setMobileMenuOpen(false);
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    borderRadius: '24px',
                    border: '2px solid var(--color-black)',
                    background: 'var(--color-white)',
                    color: 'var(--color-black)',
                    fontWeight: 700,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  <FiMessageSquare size={16} />
                  <span>Messages</span>
                  {totalUnread > 0 && (
                    <span className="notification-badge" style={{
                      position: 'static',
                      marginLeft: '6px',
                      animation: 'none'
                    }}>{totalUnread}</span>
                  )}
                </button>
              )}

              <button 
                className="mobile-pill-btn" 
                onClick={() => {
                  setIsOpen(true);
                  setActiveTab('board_alerts');
                  setMobileMenuOpen(false);
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '24px',
                  border: '2px solid var(--color-black)',
                  background: 'var(--color-white)',
                  color: 'var(--color-black)',
                  fontWeight: 700,
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                <FiBell size={16} />
                <span>Alerts</span>
                {unreadNotificationsCount > 0 && (
                  <span className="notification-badge" style={{
                    position: 'static',
                    marginLeft: '6px',
                    animation: 'none'
                  }}>{unreadNotificationsCount}</span>
                )}
              </button>
            </div>

            <hr className="mobile-divider" />

            {/* Appearance Section in Mobile Drawer */}
            <div className="mobile-appearance-settings" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  padding: '4px 0'
                }}
                onClick={() => setMobileAppearanceExpanded(!mobileAppearanceExpanded)}
              >
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Appearance</span>
                {mobileAppearanceExpanded ? <FiChevronDown size={18} style={{ transform: 'rotate(180deg)', transition: 'transform 0.25s' }} /> : <FiChevronDown size={18} style={{ transition: 'transform 0.25s' }} />}
              </div>

              {mobileAppearanceExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeInOverlay 0.2s ease' }}>
                  {/* Accent Color Selection */}
                  <div>
                    <span className="section-label" style={{ display: 'block', marginBottom: '6px' }}>Accent Color</span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {Object.keys(ACCENT_COLORS).map((colorKey) => {
                        const colorInfo = ACCENT_COLORS[colorKey];
                        const isSelected = accent === colorKey;
                        return (
                          <button
                            key={colorKey}
                            onClick={() => setAccent(colorKey)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              backgroundColor: colorInfo.primary,
                              border: isSelected ? '2px solid var(--color-black)' : '1px solid rgba(0,0,0,0.15)',
                              boxShadow: isSelected ? '0 0 0 2px var(--accent-color)' : 'none',
                              cursor: 'pointer',
                              position: 'relative',
                              padding: 0
                            }}
                            title={colorInfo.name}
                          >
                            {isSelected && (
                              <span style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                fontSize: '11px',
                                fontWeight: 'bold'
                              }}>✓</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Theme Mode */}
                  <div>
                    <span className="section-label" style={{ display: 'block', marginBottom: '6px' }}>Theme Mode</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                      {[
                        { id: 'light', label: 'Light', icon: <FiSun size={14} /> },
                        { id: 'dark', label: 'Dark', icon: <FiMoon size={14} /> },
                        { id: 'black', label: 'Black', icon: <IoContrast size={14} /> }
                      ].map((mode) => {
                        const isSelected = theme === mode.id;
                        return (
                          <button
                            key={mode.id}
                            onClick={() => setTheme(mode.id)}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '8px 4px',
                              borderRadius: styleMode === 'modern' ? '8px' : '4px',
                              border: styleMode === 'traditional' ? '2px solid var(--color-black)' : '1.5px solid var(--color-gray-300)',
                              background: isSelected ? 'var(--accent-color)' : 'var(--color-white)',
                              color: isSelected ? '#fff' : 'var(--color-black)',
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              cursor: 'pointer',
                              transition: 'all 0.25s ease'
                            }}
                          >
                            {mode.icon}
                            <span>{mode.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* UI Mode */}
                  <div>
                    <span className="section-label" style={{ display: 'block', marginBottom: '6px' }}>UI Mode</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      {[
                        { id: 'modern', label: 'Modern iOS' },
                        { id: 'traditional', label: 'Traditional' }
                      ].map((mode) => {
                        const isSelected = styleMode === mode.id;
                        return (
                          <button
                            key={mode.id}
                            onClick={() => setStyleMode(mode.id)}
                            style={{
                              padding: '8px',
                              borderRadius: styleMode === 'modern' ? '8px' : '4px',
                              border: styleMode === 'traditional' ? '2px solid var(--color-black)' : '1.5px solid var(--color-gray-300)',
                              background: isSelected ? 'var(--accent-color)' : 'var(--color-white)',
                              color: isSelected ? '#fff' : 'var(--color-black)',
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              textAlign: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.25s ease'
                            }}
                          >
                            <span>{mode.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <hr className="mobile-divider" />

            {user ? (
              <div className="mobile-popup-user">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div className="nav-profile-pic">
                    {user.avatar ? <img src={user.avatar} alt={user.name} /> : <FiUser size={18} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-black)' }}>{user.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-gray-500)' }}>{user.email}</div>
                    <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-color)' }}>{user.role}</div>
                  </div>
                </div>

                <div className="mobile-user-actions" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                  {/* Dashboard (if admin/editor) */}
                  {(user.role === 'admin' || user.role === 'editor') && (
                    <Link 
                      to="/admin" 
                      className="profile-popover-item"
                      onClick={() => setMobileMenuOpen(false)}
                      style={{ padding: '8px 12px' }}
                    >
                      <FiLayout size={16} />
                      <span>Dashboard</span>
                    </Link>
                  )}

                  {/* Saved Articles */}
                  <Link 
                    to="/saved-articles" 
                    className="profile-popover-item"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{ padding: '8px 12px' }}
                  >
                    <FiBookmark size={16} />
                    <span>Saved Articles</span>
                  </Link>

                  {/* My Uploads */}
                  <Link 
                    to="/my-uploads" 
                    className="profile-popover-item"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{ padding: '8px 12px' }}
                  >
                    <FiUpload size={16} />
                    <span>My Uploads</span>
                  </Link>

                  {/* Accounts */}
                  <button 
                    className="profile-popover-item" 
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/settings');
                    }}
                    style={{ padding: '8px 12px', width: '100%', border: 'none', background: 'transparent' }}
                  >
                    <FiSettings size={16} />
                    <span>Accounts</span>
                  </button>
                </div>

                <button 
                  className="profile-popover-signout"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setSignOutConfirm(true);
                  }}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <FiLogOut size={14} />
                  <span>Log Out</span>
                </button>
              </div>
            ) : (
              <Link 
                to="/login" 
                className="nav-more-btn" 
                onClick={() => setMobileMenuOpen(false)}
                style={{ textDecoration: 'none', textAlign: 'center', justifyContent: 'center' }}
              >
                Student Login
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Sign Out Confirmation Modal ── */}
      {signOutConfirm && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeInOverlay 0.2s ease'
          }}
          onClick={() => setSignOutConfirm(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--color-bg, #fff)',
              border: '2px solid var(--color-black)',
              borderRadius: '4px',
              padding: '36px 32px',
              width: '100%',
              maxWidth: '380px',
              margin: '0 16px',
              boxShadow: '8px 8px 0 var(--color-black)',
              animation: 'slideUpModal 0.25s cubic-bezier(0.34,1.56,0.64,1)'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '8px', fontSize: '32px' }}>👋</div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '22px',
              fontWeight: 800,
              textAlign: 'center',
              textTransform: 'uppercase',
              marginBottom: '8px'
            }}>
              Sign Out?
            </h2>
            <p style={{
              fontSize: '14px',
              textAlign: 'center',
              color: 'var(--color-gray-600)',
              marginBottom: '28px',
              lineHeight: 1.6
            }}>
              Are you sure you want to sign out of <strong>Southern Waves</strong>?
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                id="signout-cancel-btn"
                onClick={() => setSignOutConfirm(false)}
                style={{
                  flex: 1, padding: '12px',
                  background: 'transparent',
                  border: '2px solid var(--color-gray-300)',
                  borderRadius: '3px',
                  fontWeight: 700, fontSize: '14px',
                  cursor: 'pointer',
                  color: 'var(--color-gray-700)',
                  transition: 'border-color 0.2s, color 0.2s'
                }}
                onMouseEnter={e => { e.target.style.borderColor = 'var(--color-black)'; e.target.style.color = 'var(--color-black)'; }}
                onMouseLeave={e => { e.target.style.borderColor = 'var(--color-gray-300)'; e.target.style.color = 'var(--color-gray-700)'; }}
              >
                Cancel
              </button>
              <button
                id="signout-confirm-btn"
                onClick={async () => {
                  setSignOutConfirm(false);
                  await logout();
                  navigate('/');
                }}
                style={{
                  flex: 1, padding: '12px',
                  background: 'var(--color-black)',
                  border: '2px solid var(--color-black)',
                  borderRadius: '3px',
                  fontWeight: 700, fontSize: '14px',
                  cursor: 'pointer',
                  color: '#fff',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={e => e.target.style.opacity = '0.85'}
                onMouseLeave={e => e.target.style.opacity = '1'}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings page handles settings now ── */}
    </>
  );
};

const NotificationsPopover = ({ notifications, markNotificationRead, markAllNotificationsRead, setNotificationsOpen, fetchNotifications, currentUser }) => {
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [responseTexts, setResponseTexts] = useState({});

  // Define tab options. Admin/Moderator gets 'Appeals' tab.
  const isModOrAdmin = currentUser && ['admin', 'moderator', 'editor'].includes(currentUser.role);
  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'board_news', label: 'News' },
    { id: 'announcement', label: 'Alerts' },
    { id: 'sensitivity', label: 'Critical' },
  ];
  if (isModOrAdmin) {
    tabs.push({ id: 'appeal', label: 'Appeals' });
  }

  const filtered = notifications.filter(n => {
    if (filter === 'all') return true;
    return n.type === filter;
  });

  const getLabel = (type) => {
    if (type === 'board_news') return 'Board News';
    if (type === 'sensitivity') return 'Critical Alert';
    if (type === 'appeal') return 'User Appeal';
    return 'Announcement';
  };

  const getTypeStyle = (type, isRead) => {
    if (type === 'sensitivity') {
      return {
        borderLeft: '4px solid #ef4444',
        background: isRead ? 'var(--color-white)' : 'rgba(239, 68, 68, 0.04)'
      };
    }
    if (type === 'board_news') {
      return {
        borderLeft: '4px solid var(--accent-color)',
        background: isRead ? 'var(--color-white)' : 'rgba(59, 130, 246, 0.04)'
      };
    }
    if (type === 'appeal') {
      return {
        borderLeft: '4px solid #f59e0b',
        background: isRead ? 'var(--color-white)' : 'rgba(245, 158, 11, 0.04)'
      };
    }
    return {
      borderLeft: '4px solid #6b7280',
      background: isRead ? 'var(--color-white)' : 'rgba(107, 114, 128, 0.04)'
    };
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleResolveAppeal = async (e, n, actionType) => {
    e.stopPropagation();
    const senderId = typeof n.sender === 'object' ? n.sender?._id : n.sender;
    if (!senderId) {
      toast.error('User details not found.');
      return;
    }

    const responseNote = responseTexts[n._id] || '';
    setActionLoadingId(`${n._id}:${actionType}`);
    try {
      if (actionType === 'approve') {
        // Call unblock API
        await authAPI.unblockUser(senderId);
        toast.success('Appeal approved and user unblocked!');
      } else {
        // Call reject API with response note
        await authAPI.rejectAppeal(senderId, responseNote);
        toast.success('Appeal rejected and user notified.');
      }
      
      // Mark notification as read
      await markNotificationRead(n._id);
      
      // Refresh notifications list
      if (fetchNotifications) {
        await fetchNotifications();
      }

      // Clear this card's response note
      setResponseTexts(prev => ({ ...prev, [n._id]: '' }));
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to resolve appeal.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="profile-popover notifications-popover" style={{ 
      width: '380px', 
      padding: '20px', 
      gap: '16px', 
      textAlign: 'left',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)',
      borderRadius: '8px',
      border: '1.5px solid var(--color-black)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-gray-250)', paddingBottom: '10px' }}>
        <h4 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-black)', letterSpacing: '0.5px' }}>
          System Alerts & Actions
        </h4>
        {notifications.some(n => !n.isRead) && (
          <button 
            onClick={markAllNotificationsRead}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-color)',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              padding: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.2px'
            }}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={(e) => {
              e.stopPropagation();
              setFilter(tab.id); 
              setExpandedId(null); 
            }}
            style={{
              padding: '5px 12px',
              fontSize: '11px',
              fontWeight: 800,
              borderRadius: '20px',
              border: filter === tab.id ? '1.5px solid var(--color-black)' : '1.5px solid var(--color-gray-200)',
              background: filter === tab.id ? 'var(--color-black)' : 'transparent',
              color: filter === tab.id ? 'var(--color-white)' : 'var(--color-gray-600)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '310px', overflowY: 'auto', paddingRight: '4px' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', fontSize: '12.5px', color: 'var(--color-gray-500)', fontWeight: 500 }}>
            No updates in this section.
          </div>
        ) : (
          filtered.map(n => {
            const isExpanded = expandedId === n._id;
            const senderUser = typeof n.sender === 'object' ? n.sender : null;
            
            return (
              <div
                key={n._id}
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedId(isExpanded ? null : n._id);
                  if (!n.isRead) markNotificationRead(n._id);
                }}
                style={{
                  padding: '12px 14px',
                  borderRadius: '6px',
                  border: '1.5px solid var(--color-gray-200)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  textAlign: 'left',
                  boxShadow: n.isRead ? 'none' : '0 2px 8px rgba(0,0,0,0.02)',
                  ...getTypeStyle(n.type, n.isRead)
                }}
              >
                {/* Meta details */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '9.5px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: n.type === 'sensitivity' ? '#fee2e2' : n.type === 'board_news' ? '#e0f2fe' : n.type === 'appeal' ? '#fef3c7' : '#f3f4f6',
                    color: n.type === 'sensitivity' ? '#dc2626' : n.type === 'board_news' ? '#2563eb' : n.type === 'appeal' ? '#d97706' : '#4b5563',
                    letterSpacing: '0.2px'
                  }}>
                    {getLabel(n.type)}
                  </span>
                  <span style={{ fontSize: '9px', color: 'var(--color-gray-400)', fontWeight: 600 }}>
                    {formatTime(n.createdAt)}
                  </span>
                </div>

                {/* Sender & Title Layout */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {n.type === 'appeal' && senderUser && (
                    <img 
                      src={senderUser.avatar || '/default-avatar.png'} 
                      alt="" 
                      style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1px solid var(--color-gray-250)', objectFit: 'cover' }} 
                    />
                  )}
                  <div style={{ fontWeight: n.isRead ? 600 : 800, fontSize: '12.5px', color: 'var(--color-black)' }}>
                    {n.title}
                  </div>
                </div>

                {/* Message Body */}
                <div style={{
                  fontSize: '12px',
                  color: 'var(--color-gray-600)',
                  lineHeight: 1.4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebKitLineClamp: isExpanded ? 'initial' : 2,
                  WebKitBoxOrient: 'vertical',
                  fontWeight: 500
                }}>
                  {n.message}
                </div>

                {/* Expanded Action Panel */}
                {isExpanded && n.type === 'appeal' && isModOrAdmin && (
                  <div 
                    onClick={e => e.stopPropagation()} 
                    style={{ 
                      marginTop: '10px', 
                      paddingTop: '10px', 
                      borderTop: '1px solid var(--color-gray-200)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <label style={{ fontSize: '9.5px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-gray-500)', letterSpacing: '0.3px' }}>
                      Appeal Decision Response
                    </label>
                    <textarea
                      value={responseTexts[n._id] || ''}
                      onChange={(e) => setResponseTexts({ ...responseTexts, [n._id]: e.target.value })}
                      placeholder="Type response reason to send back to the user..."
                      rows={2}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: 'var(--color-white)',
                        border: '1.5px solid var(--color-gray-300)',
                        borderRadius: '4px',
                        padding: '6px 8px',
                        fontSize: '11px',
                        color: 'var(--color-black)',
                        resize: 'none',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={(e) => handleResolveAppeal(e, n, 'reject')}
                        disabled={actionLoadingId !== null}
                        style={{
                          padding: '6px 12px',
                          background: 'transparent',
                          border: '1.5px solid #dc2626',
                          borderRadius: '4px',
                          color: '#dc2626',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          opacity: actionLoadingId !== null ? 0.6 : 1,
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => { e.target.style.background = '#fef2f2'; }}
                        onMouseLeave={e => { e.target.style.background = 'transparent'; }}
                      >
                        {actionLoadingId === `${n._id}:reject` ? 'Rejecting...' : 'Reject Appeal'}
                      </button>
                      <button
                        onClick={(e) => handleResolveAppeal(e, n, 'approve')}
                        disabled={actionLoadingId !== null}
                        style={{
                          padding: '6px 12px',
                          background: '#16a34a',
                          border: '1.5px solid #16a34a',
                          borderRadius: '4px',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          opacity: actionLoadingId !== null ? 0.6 : 1,
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => { e.target.style.background = '#15803d'; e.target.style.borderColor = '#15803d'; }}
                        onMouseLeave={e => { e.target.style.background = '#16a34a'; e.target.style.borderColor = '#16a34a'; }}
                      >
                        {actionLoadingId === `${n._id}:approve` ? 'Approving...' : 'Approve & Unblock'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Navbar;
