import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useChat } from '../context/ChatContext';
import { articleAPI, authAPI } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import { FiArrowLeft, FiChevronDown, FiChevronRight, FiBell, FiSun, FiMoon, FiUser, FiMenu, FiX, FiSearch, FiArrowRight, FiMessageSquare, FiBookmark, FiLogOut, FiLayout, FiSettings, FiUpload, FiLayers, FiZap, FiCheck, FiCheckCircle, FiExternalLink, FiCompass, FiGlobe, FiFeather, FiCoffee, FiEdit3, FiCamera, FiClock, FiAward } from 'react-icons/fi';
import { IoContrast } from 'react-icons/io5';
import './NavbarModern.css';
import AccountSettingsModal from './AccountSettingsModal';
import { getImageUrl } from './ArticleComponents';
import NotificationDrawer from './NotificationDrawer';

const ROUTE_NAMES = {
  '/': 'Home',
  '/news': 'News',
  '/editorial': 'Editorial',
  '/features': 'Features',
  '/university-row': 'University Row',
  '/tea-shop': 'Tea Shop',
  '/pictures-speak': "Pictures Speak",
  '/know-your-past': 'Know Your Past',
  '/stories': 'Fast Stories',
  '/about': 'About Us',
  '/login': 'Student Login',
  '/register': 'Sign Up',
  '/admin': 'Dashboard'
};

const HOME_NAV_ITEMS = [
  { path: '/news', label: 'News' },
  { path: '/editorial', label: 'Editorial' },
  { path: '/features', label: 'Features' },
  { path: '/pictures-speak', label: "Picture's Speak" },
  { path: '/tea-shop', label: 'Tea Shop' },
  { path: '/university-row', label: 'University Row' },
  { path: '/know-your-past', label: 'Know Your Past' },
  { path: '/stories', label: 'Fast Stories' },
  { path: '/about', label: 'About Us' },
];

const DynamicHomeNav = () => {
  const containerRef = useRef(null);
  const measureRef = useRef(null);
  const dropdownRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(HOME_NAV_ITEMS.length);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const calculateVisible = useCallback(() => {
    if (!containerRef.current || !measureRef.current) return;
    const containerWidth = containerRef.current.offsetWidth;
    if (containerWidth <= 0) return;

    const measureEls = Array.from(measureRef.current.children);
    if (!measureEls.length) return;

    const moreBtnEl = measureEls[measureEls.length - 1];
    const moreBtnWidth = moreBtnEl ? moreBtnEl.offsetWidth + 16 : 56;

    let totalAll = 0;
    const widths = [];
    for (let i = 0; i < HOME_NAV_ITEMS.length; i++) {
      const el = measureEls[i];
      const w = el ? el.offsetWidth + 18 : 95;
      widths.push(w);
      totalAll += w;
    }

    if (totalAll <= containerWidth) {
      setVisibleCount(HOME_NAV_ITEMS.length);
      return;
    }

    const available = containerWidth - moreBtnWidth;
    let accumulated = 0;
    let count = 0;

    for (let i = 0; i < widths.length; i++) {
      if (accumulated + widths[i] <= available) {
        accumulated += widths[i];
        count++;
      } else {
        break;
      }
    }

    setVisibleCount(Math.max(1, count));
  }, []);

  useEffect(() => {
    calculateVisible();
    const handleResize = () => calculateVisible();
    window.addEventListener('resize', handleResize);

    let observer;
    if (containerRef.current && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => calculateVisible());
      observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (observer) observer.disconnect();
    };
  }, [calculateVisible]);

  const visibleItems = HOME_NAV_ITEMS.slice(0, visibleCount);
  const overflowItems = HOME_NAV_ITEMS.slice(visibleCount);

  return (
    <div className="navbar-secondary-bar">
      {/* Hidden off-screen measurement elements to dynamically compute exact widths */}
      <div 
        ref={measureRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          visibility: 'hidden',
          pointerEvents: 'none',
          top: '-9999px',
          left: '-9999px',
          display: 'flex',
          gap: '18px',
          whiteSpace: 'nowrap'
        }}
      >
        {HOME_NAV_ITEMS.map((item) => (
          <span key={item.path} className="sec-nav-link" style={{ display: 'inline-block' }}>
            {item.label}
          </span>
        ))}
        <span className="sec-nav-more-btn" style={{ display: 'inline-flex' }}>
          <span className="sec-more-dots">•••</span>
        </span>
      </div>

      <div className="navbar-secondary-bar-inner dynamic-bar-inner" ref={containerRef}>
        {visibleItems.map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path} 
            className={({ isActive }) => `sec-nav-link ${isActive ? 'active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}

        {overflowItems.length > 0 && (
          <div className="sec-nav-dropdown-wrapper" ref={dropdownRef}>
            <button 
              type="button"
              className={`sec-nav-more-btn ${dropdownOpen ? 'active' : ''}`}
              onClick={() => setDropdownOpen((prev) => !prev)}
              title="More sections"
              aria-label="More navigation links"
              aria-expanded={dropdownOpen}
            >
              <span className="sec-more-dots">•••</span>
            </button>

            {dropdownOpen && (
              <div className="sec-nav-dropdown-menu">
                {overflowItems.map((item) => (
                  <NavLink 
                    key={item.path} 
                    to={item.path} 
                    className={({ isActive }) => `sec-dropdown-link ${isActive ? 'active' : ''}`}
                    onClick={() => setDropdownOpen(false)}
                  >
                    <span className="sec-dropdown-bullet">&gt;</span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const Navbar = () => {
  const { user, logout, refreshUser, impersonating, revertToAdmin } = useAuth();
  const { theme, setTheme, toggleTheme, styleMode } = useTheme();
  const { isOpen, setIsOpen, openRoom, setActiveRoom, setActiveTab, replies, totalUnread, notifications, unreadNotificationsCount, markNotificationRead, markAllNotificationsRead, dismissNotification, fetchNotifications } = useChat();
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
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 520);
  const navbarRef = useRef(null);
  const searchInputRef = useRef(null);
  const timeoutRef = useRef(null);
  const searchCacheRef = useRef({});

  const currentPath = location.pathname;

  const getPageName = (path) => {
    if (ROUTE_NAMES[path]) return ROUTE_NAMES[path];
    
    if (path.startsWith('/tag/')) {
      const rawTag = path.split('/')[2];
      if (!rawTag) return 'Tag';
      try {
        const decoded = decodeURIComponent(rawTag).trim();
        const clean = decoded.replace(/^#/, '').trim();
        return clean ? `# ${clean}` : 'Tag';
      } catch (e) {
        const clean = rawTag.replace(/^#/, '').trim();
        return clean ? `# ${clean}` : 'Tag';
      }
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
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 520);
    };
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
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
      const notificationsPopover = document.querySelector('.notifications-popover');
      if (
        notificationsWrapper && 
        !notificationsWrapper.contains(event.target) &&
        (!notificationsPopover || !notificationsPopover.contains(event.target))
      ) {
        setNotificationsOpen(false);
      }
      if (navbarRef.current && !navbarRef.current.contains(event.target)) {
        setMenuOpen(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
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

            {/* Theme Mode Toggle & Popover */}
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
                title="Theme Mode (Light, Light Dark, Pure Dark)"
                aria-label="Theme Mode"
              >
                {theme === 'light' ? <FiSun size={18} /> : theme === 'dark' ? <FiMoon size={18} /> : <IoContrast size={18} />}
              </button>

              {customizerOpen && (
                <div className="appearance-popover" style={{ minWidth: '220px' }}>
                  <div className="popover-header">
                    <h3>Theme Mode</h3>
                  </div>

                  <div className="popover-section">
                    <div className="theme-toggle-row">
                      {[
                        { id: 'light', label: 'Light', icon: <FiSun size={14} /> },
                        { id: 'dark', label: 'Light Dark', icon: <FiMoon size={14} /> },
                        { id: 'black', label: 'Pure Dark', icon: <IoContrast size={14} /> }
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
                isMobile ? (
                  createPortal(
                    <>
                      <div 
                        className="mobile-notifications-backdrop" 
                        onClick={() => setNotificationsOpen(false)} 
                      />
                      <NotificationsPopover 
                        notifications={notifications}
                        markNotificationRead={markNotificationRead}
                        markAllNotificationsRead={markAllNotificationsRead}
                        dismissNotification={dismissNotification}
                        setNotificationsOpen={setNotificationsOpen}
                        fetchNotifications={fetchNotifications}
                        currentUser={user}
                        navigate={navigate}
                        openRoom={openRoom}
                        setIsOpen={setIsOpen}
                      />
                    </>,
                    document.body
                  )
                ) : (
                  <NotificationsPopover 
                    notifications={notifications}
                    markNotificationRead={markNotificationRead}
                    markAllNotificationsRead={markAllNotificationsRead}
                    dismissNotification={dismissNotification}
                    setNotificationsOpen={setNotificationsOpen}
                    fetchNotifications={fetchNotifications}
                    currentUser={user}
                    navigate={navigate}
                    openRoom={openRoom}
                    setIsOpen={setIsOpen}
                  />
                )
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
                    <img 
                      src={user.avatar ? getImageUrl(user.avatar) : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=c8102e&color=fff&size=80`} 
                      alt={user.name}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=c8102e&color=fff&size=80`;
                      }}
                    />
                  </div>
                </div>

                {/* Profile menu popover */}
                {profileMenuOpen && (
                  <div className="profile-popover">
                    <div className="profile-popover-header">
                      <img 
                        src={user.avatar ? getImageUrl(user.avatar) : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=c8102e&color=fff&size=100`} 
                        alt={user.name} 
                        className="profile-popover-avatar"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=c8102e&color=fff&size=100`;
                        }}
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
                            to="/author/me" 
                            className="profile-popover-item"
                            onClick={() => setProfileMenuOpen(false)}
                          >
                            <FiUpload size={16} />
                            <span>Author Studio & Posts</span>
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
                            to="/author/me" 
                            className="profile-popover-item"
                            onClick={() => setProfileMenuOpen(false)}
                          >
                            <FiUpload size={16} />
                            <span>Author Studio & Posts</span>
                          </Link>
                        </>
                      )}

                      {/* Option 2: Notifications */}
                      <Link 
                        to="/notifications" 
                        className="profile-popover-item" 
                        onClick={() => {
                          setProfileMenuOpen(false);
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                          <FiBell size={16} />
                          <span>Notifications</span>
                        </div>
                        {unreadNotificationsCount > 0 && (
                          <span style={{ background: 'var(--accent-color)', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '2px 7px', borderRadius: '10px' }}>
                            {unreadNotificationsCount}
                          </span>
                        )}
                      </Link>

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
              {/* Column 1: News, Editorial & University Row */}
              <div className="mega-column">
                <div className="mega-column-links">
                  {renderNavLink('/news', 'News')}
                  {renderNavLink('/editorial', 'Editorial')}
                  {renderNavLink('/university-row', 'University Row')}
                </div>
              </div>

              {/* Column 2: Feature & Picture's Speak */}
              <div className="mega-column">
                <div className="mega-column-links">
                  {renderNavLink('/features', 'Features')}
                  {renderNavLink('/pictures-speak', "Pictures Speak")}
                </div>
              </div>

              {/* Column 3: Tea Shop, Know Your Past, Fast Stories & About Us */}
              <div className="mega-column">
                <div className="mega-column-links">
                  {renderNavLink('/tea-shop', 'Tea Shop')}
                  {renderNavLink('/know-your-past', 'Know Your Past')}
                  {renderNavLink('/stories', 'Fast Stories')}
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
                              onError={(e) => { e.target.style.display = 'none'; }}
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
                              {trendingTags.slice(0, 5).map(tag => {
                                const cleanTag = typeof tag === 'string' ? tag.replace(/^#/, '') : '';
                                return (
                                  <button key={cleanTag} className="navbar-tag-pill" onClick={() => handleQuickLinkClick(`/tag/${encodeURIComponent(cleanTag)}`)} style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 12px', background: 'var(--color-gray-100)', border: 'none', borderRadius: '20px', fontSize: '12px', fontWeight: 600, color: 'var(--color-gray-600)', cursor: 'pointer', transition: 'all 0.2s' }}>
                                    #{cleanTag}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {recommendedTags.length > 0 && (
                          <div className="navbar-suggestions-section" style={{ marginTop: 12 }}>
                            <span className="navbar-suggestions-label" style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-gray-400)', marginBottom: '8px' }}>✨ Recommended Tags</span>
                            <div className="navbar-tags-flex" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {recommendedTags.slice(0, 5).map(tag => {
                                const cleanTag = typeof tag === 'string' ? tag.replace(/^#/, '') : '';
                                return (
                                  <button key={cleanTag} className="navbar-tag-pill" onClick={() => handleQuickLinkClick(`/tag/${encodeURIComponent(cleanTag)}`)} style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 12px', background: 'var(--color-gray-100)', border: 'none', borderRadius: '20px', fontSize: '12px', fontWeight: 600, color: 'var(--color-gray-600)', cursor: 'pointer', transition: 'all 0.2s' }}>
                                    #{cleanTag}
                                  </button>
                                );
                              })}
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
        {currentPath === '/' && <DynamicHomeNav />}
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
            <div>
              <span className="brand-text">Southern Waves</span>
              <div className="mobile-slide-accent-stripes" style={{ marginTop: '6px' }}>
                <div className="mobile-accent-stripe long" />
                <div className="mobile-accent-stripe short" />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                className="nav-icon-btn close-btn" 
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/search');
                }}
                aria-label="Search"
                title="Search Articles"
              >
                <FiSearch size={18} />
              </button>
              <button 
                className="nav-icon-btn close-btn" 
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <FiX size={20} />
              </button>
            </div>
          </div>

          <div className="mobile-popup-links">
            <button
              type="button"
              className="mobile-link search-link"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/search');
              }}
            >
              <div className="mobile-link-left">
                <span className="mobile-link-icon search-icon"><FiSearch size={16} /></span>
                <span className="mobile-link-text">Search Articles</span>
              </div>
              <FiChevronRight size={15} className="mobile-link-arrow" />
            </button>
            <NavLink to="/news" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
              <div className="mobile-link-left">
                <span className="mobile-link-icon"><FiGlobe size={16} /></span>
                <span className="mobile-link-text">News</span>
              </div>
              <FiChevronRight size={15} className="mobile-link-arrow" />
            </NavLink>
            <NavLink to="/features" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
              <div className="mobile-link-left">
                <span className="mobile-link-icon"><FiFeather size={16} /></span>
                <span className="mobile-link-text">Features</span>
              </div>
              <FiChevronRight size={15} className="mobile-link-arrow" />
            </NavLink>
            <NavLink to="/university-row" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
              <div className="mobile-link-left">
                <span className="mobile-link-icon"><FiAward size={16} /></span>
                <span className="mobile-link-text">University Row</span>
              </div>
              <FiChevronRight size={15} className="mobile-link-arrow" />
            </NavLink>
            <NavLink to="/tea-shop" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
              <div className="mobile-link-left">
                <span className="mobile-link-icon"><FiCoffee size={16} /></span>
                <span className="mobile-link-text">Tea Shop</span>
              </div>
              <FiChevronRight size={15} className="mobile-link-arrow" />
            </NavLink>
            <NavLink to="/editorial" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
              <div className="mobile-link-left">
                <span className="mobile-link-icon"><FiEdit3 size={16} /></span>
                <span className="mobile-link-text">Editorial</span>
              </div>
              <FiChevronRight size={15} className="mobile-link-arrow" />
            </NavLink>
            <NavLink to="/pictures-speak" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
              <div className="mobile-link-left">
                <span className="mobile-link-icon"><FiCamera size={16} /></span>
                <span className="mobile-link-text">Pictures Speak</span>
              </div>
              <FiChevronRight size={15} className="mobile-link-arrow" />
            </NavLink>
            <NavLink to="/know-your-past" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
              <div className="mobile-link-left">
                <span className="mobile-link-icon"><FiClock size={16} /></span>
                <span className="mobile-link-text">Know Your Past</span>
              </div>
              <FiChevronRight size={15} className="mobile-link-arrow" />
            </NavLink>
            <NavLink to="/stories" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
              <div className="mobile-link-left">
                <span className="mobile-link-icon story-icon"><FiZap size={16} /></span>
                <span className="mobile-link-text">Fast Stories</span>
              </div>
              <FiChevronRight size={15} className="mobile-link-arrow" />
            </NavLink>
          </div>

          <hr className="mobile-divider" />

          <div className="mobile-popup-actions">
            {/* Side-by-Side Modern Action Cards for Messages and Alerts */}
            <div className="mobile-popup-pills">
              {user && (
                <button 
                  type="button"
                  className="mobile-action-card" 
                  onClick={() => {
                    setActiveRoom(null);
                    setIsOpen(true);
                    setActiveTab('all');
                    setMobileMenuOpen(false);
                  }}
                >
                  <div className="mobile-action-left">
                    <div className="mobile-action-icon msg-icon">
                      <FiMessageSquare size={16} />
                    </div>
                    <span className="mobile-action-label">Messages</span>
                  </div>
                  {totalUnread > 0 && (
                    <span className="mobile-action-badge">{totalUnread > 99 ? '99+' : totalUnread}</span>
                  )}
                </button>
              )}

              <button 
                type="button"
                className="mobile-action-card" 
                onClick={() => {
                  setIsOpen(true);
                  setActiveTab('board_alerts');
                  setMobileMenuOpen(false);
                }}
              >
                <div className="mobile-action-left">
                  <div className="mobile-action-icon alert-icon">
                    <FiBell size={16} />
                  </div>
                  <span className="mobile-action-label">Alerts</span>
                </div>
                {unreadNotificationsCount > 0 && (
                  <span className="mobile-action-badge alert-badge">{unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}</span>
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
                  {/* Theme Mode */}
                  <div>
                    <span className="section-label" style={{ display: 'block', marginBottom: '6px' }}>Theme Mode</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                      {[
                        { id: 'light', label: 'Light', icon: <FiSun size={14} /> },
                        { id: 'dark', label: 'Light Dark', icon: <FiMoon size={14} /> },
                        { id: 'black', label: 'Pure Dark', icon: <IoContrast size={14} /> }
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
                </div>
              )}
            </div>

            <hr className="mobile-divider" />

            {user ? (
              <div className="mobile-popup-user">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div className="nav-profile-pic">
                    <img 
                      src={user.avatar ? getImageUrl(user.avatar) : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=c8102e&color=fff&size=80`} 
                      alt={user.name}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=c8102e&color=fff&size=80`;
                      }}
                    />
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

                  {/* Author Studio & Posts */}
                  <Link 
                    to="/author/me" 
                    className="profile-popover-item"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{ padding: '8px 12px' }}
                  >
                    <FiUpload size={16} />
                    <span>Author Studio & Posts</span>
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

const CATEGORY_COLORS = {
  announcement: '#3b82f6',
  board_news: '#0ea5e9',
  sensitivity: '#ef4444',
  appeal: '#f59e0b',
  message: '#22c55e',
  editorial: '#a855f7',
};

const triggerSnapParticles = (el, color = '#ef4444') => {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const count = 36;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'snap-particle';
    const dx = (Math.random() - 0.5) * 180;
    const dy = (Math.random() - 0.5) * 120 - 40;
    const rot = (Math.random() - 0.5) * 720;
    p.style.cssText = `
      left: ${rect.left + Math.random() * rect.width}px;
      top: ${rect.top + Math.random() * rect.height}px;
      background: ${color};
      --snap-translate: translate(${dx}px, ${dy}px);
      --snap-rotate: ${rot}deg;
      animation-delay: ${Math.random() * 150}ms;
    `;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 900);
  }
};

const SwipableNotifItem = ({ n, onMarkRead, onDelete, children }) => {
  const [dragX, setDragX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [swipeOut, setSwipeOut] = useState(null); // 'left' | 'right'
  const [dismissed, setDismissed] = useState(false);
  const startXRef = useRef(null);
  const cardRef = useRef(null);

  if (dismissed) return null;

  const handleTouchStart = (e) => {
    startXRef.current = e.touches[0].clientX;
    setSwiping(true);
  };

  const handleTouchMove = (e) => {
    if (startXRef.current === null) return;
    const delta = e.touches[0].clientX - startXRef.current;
    setDragX(Math.max(-120, Math.min(120, delta)));
  };

  const handleTouchEnd = async () => {
    if (startXRef.current === null) return;
    const delta = dragX;
    setSwiping(false);
    startXRef.current = null;

    if (delta < -55) {
      // Swipe left = mark as read
      setSwipeOut('left');
      setTimeout(() => {
        onMarkRead(n._id);
        setDismissed(true);
        setSwipeOut(null);
      }, 300);
    } else if (delta > 55) {
      // Swipe right = snap dismiss
      triggerSnapParticles(cardRef.current, CATEGORY_COLORS[n.type] || '#6b7280');
      setSwipeOut('right');
      setTimeout(() => {
        if (onDelete) onDelete(n._id);
        else onMarkRead(n._id);
        setDismissed(true);
        setSwipeOut(null);
      }, 320);
    } else {
      setDragX(0);
    }
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('textarea')) return;
    startXRef.current = e.clientX;
    setSwiping(true);
    
    const handleMouseMove = (moveEvent) => {
      if (startXRef.current === null) return;
      const delta = moveEvent.clientX - startXRef.current;
      setDragX(Math.max(-120, Math.min(120, delta)));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      handleTouchEnd();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const showLeftHint = dragX < -20;
  const showRightHint = dragX > 20;

  const cardClass = [
    'notif-swipe-card',
    swiping ? '' : 'releasing',
    swipeOut === 'left' ? 'swiping-out-left' : '',
    swipeOut === 'right' ? 'swiping-out-right' : '',
  ].join(' ');

  return (
    <div className="notif-swipe-wrapper">
      <div className={`notif-swipe-hint left ${showLeftHint ? 'visible' : ''}`}>✓</div>
      <div className={`notif-swipe-hint right ${showRightHint ? 'visible' : ''}`}>🗑</div>
      <div
        ref={cardRef}
        className={cardClass}
        style={{ 
          transform: swipeOut ? undefined : `translateX(${dragX}px)`,
          cursor: swiping ? 'grabbing' : 'grab' 
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        {children}
      </div>
    </div>
  );
};

const NotificationsPopover = (props) => <NotificationDrawer {...props} />;

const _LegacyNotificationsPopover = ({ 
  notifications, 
  markNotificationRead, 
  markAllNotificationsRead, 
  setNotificationsOpen, 
  fetchNotifications, 
  currentUser,
  navigate,
  openRoom,
  setIsOpen 
}) => {
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const [expandedId, setExpandedId] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [responseTexts, setResponseTexts] = useState({});

  const isModOrAdmin = currentUser && ['admin', 'moderator', 'editor'].includes(currentUser.role);

  // ONLY show unread notifications in the popover
  const filtered = notifications.filter(n => !n.isRead);

  const getLabel = (type) => {
    if (type === 'board_news') return 'News';
    if (type === 'sensitivity') return 'Critical';
    if (type === 'appeal') return 'Appeal';
    if (type === 'message') return 'Chat';
    if (type === 'editorial') return 'Editorial';
    return 'Announcement';
  };

  const formatTime = (dateString) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const handleResolveAppeal = async (e, n, action) => {
    e.stopPropagation();
    const reason = responseTexts[n._id] || '';
    setActionLoadingId(n._id);
    try {
      await articleAPI.resolveAppeal(n.referenceId, { action, reason });
      toast.success(`Appeal ${action}d successfully.`);
      if (fetchNotifications) fetchNotifications();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to resolve appeal.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleItemClick = (n) => {
    if (!n.isRead) markNotificationRead(n._id);
    if (n.actionUrl) {
      setNotificationsOpen(false);
      if (n.actionUrl.startsWith('http')) {
        window.open(n.actionUrl, '_blank');
      } else {
        navigate(n.actionUrl);
      }
    } else if (n.type === 'message') {
      setNotificationsOpen(false);
      if (openRoom && setIsOpen) {
        openRoom('group', 'news');
        setIsOpen(true);
      }
    } else {
      setExpandedId(expandedId === n._id ? null : n._id);
    }
  };

  return (
    <div className="notifications-popover" onClick={e => e.stopPropagation()}>
      {/* Popover Header with Notification Assist */}
      <div className="notif-popover-header">
        <div className="notif-popover-title-row">
          <FiBell size={17} color="var(--accent-color)" />
          <h4 className="notif-popover-title">Notification Assist</h4>
          {unreadCount > 0 && (
            <span className="notif-popover-count-badge">{unreadCount} new</span>
          )}
        </div>
        <button 
          onClick={() => setNotificationsOpen(false)}
          className="notif-popover-close-btn"
          title="Close"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-gray-500)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px',
            borderRadius: '50%',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-gray-100)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >
          <FiX size={18} />
        </button>
      </div>

      {/* Notification Items List */}
      <div className="notif-popover-list">
        {filtered.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', fontSize: '13px', color: 'var(--color-gray-500)', fontWeight: 600 }}>
            ✨ No unread notifications.
          </div>
        ) : (
          filtered.map(n => {
            const isExpanded = expandedId === n._id;
            const senderUser = typeof n.sender === 'object' ? n.sender : null;
            
            return (
              <SwipableNotifItem key={n._id} n={n} onMarkRead={markNotificationRead} onDelete={null}>
              <div
                onClick={() => handleItemClick(n)}
                className="notif-popover-item unread"
              >
                {/* Meta details */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className={`notif-popover-tag notif-popover-tag-${n.type}`}>
                    {getLabel(n.type)}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '10.5px', color: 'var(--color-gray-400)', fontWeight: 600 }}>
                      {formatTime(n.createdAt)}
                    </span>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent-color)' }} />
                  </div>
                </div>

                {/* Sender & Title Layout */}
                <div style={{ display: 'flex', gap: '9px', alignItems: 'center' }}>
                  {senderUser && (
                    <img 
                      src={senderUser.avatar ? getImageUrl(senderUser.avatar) : `https://ui-avatars.com/api/?name=${encodeURIComponent(senderUser.name || 'U')}&background=random&size=60`} 
                      alt="" 
                      style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px solid var(--color-gray-200)', objectFit: 'cover', flexShrink: 0 }} 
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderUser.name || 'U')}&background=random&size=60`;
                      }}
                    />
                  )}
                  <div style={{ fontWeight: 850, fontSize: '13px', color: 'var(--color-black)', lineHeight: 1.35 }}>
                    {n.title}
                  </div>
                </div>

                {/* Message Body */}
                <div style={{
                  fontSize: '12px',
                  color: 'var(--color-gray-500)',
                  lineHeight: 1.45,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebKitLineClamp: isExpanded ? 'initial' : 2,
                  WebKitBoxOrient: 'vertical',
                  fontWeight: 500
                }}>
                  {n.message}
                </div>

                {/* Card Action Bar */}
                <div className="notif-popover-item-actions">
                  <button
                    type="button"
                    className="notif-popover-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      markNotificationRead(n._id);
                    }}
                    title="Mark as read"
                  >
                    <FiCheck size={12} color="var(--accent-color)" />
                    <span>Mark Read</span>
                  </button>

                  {n.type === 'message' && (
                    <button
                      type="button"
                      className="notif-popover-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNotificationsOpen(false);
                        if (openRoom && setIsOpen) {
                          openRoom('group', 'news');
                          setIsOpen(true);
                        }
                      }}
                      style={{ color: 'var(--accent-color)' }}
                    >
                      <FiMessageSquare size={12} />
                      <span>Chat / Reply</span>
                    </button>
                  )}

                  {n.actionUrl && (
                    <button
                      type="button"
                      className="notif-popover-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNotificationsOpen(false);
                        if (n.actionUrl.startsWith('http')) {
                          window.open(n.actionUrl, '_blank');
                        } else {
                          navigate(n.actionUrl);
                        }
                      }}
                    >
                      <FiExternalLink size={12} />
                      <span>Open</span>
                    </button>
                  )}
                </div>

                {/* Expanded Action Panel for Appeals */}
                {isExpanded && n.type === 'appeal' && isModOrAdmin && (
                  <div 
                    onClick={e => e.stopPropagation()} 
                    style={{ 
                      marginTop: '8px', 
                      paddingTop: '8px', 
                      borderTop: '1px solid var(--color-gray-200)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <textarea
                      value={responseTexts[n._id] || ''}
                      onChange={(e) => setResponseTexts({ ...responseTexts, [n._id]: e.target.value })}
                      placeholder="Type response reason to send back to user..."
                      rows={2}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: 'var(--color-white)',
                        border: '1px solid var(--color-gray-300)',
                        borderRadius: '6px',
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
                          padding: '5px 10px',
                          background: 'transparent',
                          border: '1px solid #dc2626',
                          borderRadius: '4px',
                          color: '#dc2626',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          opacity: actionLoadingId !== null ? 0.6 : 1
                        }}
                      >
                        Reject
                      </button>
                      <button
                        onClick={(e) => handleResolveAppeal(e, n, 'approve')}
                        disabled={actionLoadingId !== null}
                        style={{
                          padding: '5px 10px',
                          background: '#16a34a',
                          border: '1px solid #16a34a',
                          borderRadius: '4px',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          opacity: actionLoadingId !== null ? 0.6 : 1
                        }}
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                )}
              </div>
              </SwipableNotifItem>
            );
          })
        )}
      </div>

      {/* Pop-up Footer: History Link, Clear All (Mark Read), Settings Gear */}
      <div className="notif-popover-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 8px 4px 8px', borderTop: '1px solid var(--color-gray-100)' }}>
        {/* Left button: Notification History Link */}
        <button 
          onClick={() => {
            setNotificationsOpen(false);
            if (navigate) navigate('/notifications');
          }}
          className="notif-footer-icon-btn"
          title="Notification History"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'var(--color-gray-100)',
            color: 'var(--color-black)',
            transition: 'background 0.2s',
            border: 'none',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-gray-200)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-gray-100)'}
        >
          <FiCompass size={17} />
        </button>

        {/* Center button: Clear all (Mark all read) */}
        {filtered.length > 0 ? (
          <button 
            onClick={markAllNotificationsRead}
            className="notif-popover-clear-all-btn"
            style={{
              background: 'var(--color-gray-900)',
              color: 'var(--color-white)',
              border: 'none',
              borderRadius: '24px',
              padding: '10px 36px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-color)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-gray-900)'}
          >
            Clear all
          </button>
        ) : (
          <span style={{ fontSize: '12.5px', color: 'var(--color-gray-400)', fontWeight: 600 }}>All caught up!</span>
        )}

        {/* Right button: Settings Gear */}
        <button 
          onClick={() => {
            setNotificationsOpen(false);
            if (navigate) navigate('/settings');
          }}
          className="notif-footer-icon-btn"
          title="Notification Settings"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'var(--color-gray-100)',
            color: 'var(--color-black)',
            border: 'none',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-gray-200)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-gray-100)'}
        >
          <FiSettings size={16} />
        </button>
      </div>
    </div>
  );
};

export default Navbar;
