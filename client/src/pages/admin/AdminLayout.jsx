import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  FiHome, FiFileText, FiUsers, FiPlusCircle,
  FiLogOut, FiSun, FiMoon, FiInbox, FiMenu, FiX,
  FiBell, FiSearch, FiChevronRight, FiSettings, FiExternalLink,
  FiArrowLeft, FiChevronDown, FiMessageSquare, FiBookmark, FiLayout,
  FiUser, FiShield, FiAlertOctagon, FiUpload, FiSliders
} from 'react-icons/fi';
import { IoContrast } from 'react-icons/io5';
import { useChat } from '../../context/ChatContext';
import { articleAPI, commentAPI, filterAPI } from '../../services/api';
import '../../components/NavbarModern.css';
import './AdminLayout.css';
import AccountSettingsModal from '../../components/AccountSettingsModal';

const AdminLayout = () => {
  const { user, isAdmin, isEditor, isModerator, logout, refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isOpen, setIsOpen, setActiveTab, replies, totalUnread, notifications, unreadNotificationsCount, markNotificationRead, markAllNotificationsRead } = useChat();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [signOutConfirm, setSignOutConfirm] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  
  const [pendingReviewsCount, setPendingReviewsCount] = useState(0);
  const [pendingCommentsCount, setPendingCommentsCount] = useState(0);
  const [submissionsCount, setSubmissionsCount] = useState(0);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({
    'Overview': true,
    'Content': true,
    'Moderation': true,
    'Administration': true,
    'System Operations': true
  });

  const toggleGroup = (groupLabel) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupLabel]: !prev[groupLabel]
    }));
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isAdmin || isModerator || isEditor) {
      filterAPI.getPending()
        .then(res => setPendingReviewsCount(res.data.data?.length || 0))
        .catch(() => {});
      
      commentAPI.getPending()
        .then(res => setPendingCommentsCount(res.data.data?.length || 0))
        .catch(() => {});

      articleAPI.getAll({ category: 'tea-shop', adminView: 'true', limit: 50 })
        .then(res => {
          const studentPosts = res.data.data?.filter(p => p.author?.role === 'student') || [];
          setSubmissionsCount(studentPosts.length);
        })
        .catch(() => {});
    }
  }, [isAdmin, isModerator, isEditor]);

  const showLabels = sidebarOpen || isMobile;

  const adminRef = useRef(null);
  const timeoutRef = useRef(null);

  const currentPath = location.pathname;

  const checkActive = (path) => {
    if (currentPath === path) return true;
    if (path !== '/' && currentPath.startsWith(path + '/')) return true;
    return false;
  };

  const renderAdminNavLink = (to, text) => {
    const isActive = checkActive(to);
    return (
      <Link to={to} className={`concept-nav-link ${isActive ? 'active' : ''}`}>
        <span className="nav-bullet">&gt;</span> {text}
        {isActive && <span className="active-badge">Active</span>}
      </Link>
    );
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setMenuOpen(true);
    setNotifOpen(false);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setMenuOpen(false);
    }, 150);
  };

  useEffect(() => {
    if (!isAdmin && !isEditor && !isModerator) navigate('/login');
  }, [isAdmin, isEditor, isModerator, navigate]);

  useEffect(() => {
    setMobileSidebarOpen(false);
    setMenuOpen(false);
    setNotifOpen(false);
    setProfileMenuOpen(false);
  }, [location.pathname]);

  // Click outside detection for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      const profileWrapper = document.querySelector('.nav-user-profile-wrapper');
      if (profileWrapper && !profileWrapper.contains(event.target)) {
        setProfileMenuOpen(false);
      }
      const notificationsWrapper = document.querySelector('.ad-notif-wrap');
      if (notificationsWrapper && !notificationsWrapper.contains(event.target)) {
        setNotifOpen(false);
      }
      if (adminRef.current && !adminRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navGroups = [
    {
      label: 'Overview',
      items: [
        { to: '/admin', label: 'Dashboard', icon: <FiHome size={16} />, end: true },
        { to: '/settings', label: 'Settings', icon: <FiSettings size={16} /> },
      ],
    },
    {
      label: 'Content',
      items: [
        { to: '/admin/articles', label: 'Articles', icon: <FiFileText size={16} /> },
        { to: '/admin/new-article', label: 'New Article', icon: <FiPlusCircle size={16} />, highlight: true },
        { to: '/admin/submissions', label: 'Submissions', icon: <FiInbox size={16} />, count: submissionsCount },
      ],
    },
    ...(isAdmin || user?.role === 'moderator' || user?.role === 'editor' ? [{
      label: 'Moderation',
      items: [
        { to: '/admin/moderation', label: 'Content Moderation', icon: <FiShield size={16} />, hide: !isAdmin && user?.role !== 'moderator', count: pendingReviewsCount },
        { to: '/admin/filters', label: 'Filter Manager', icon: <FiAlertOctagon size={16} />, hide: !isAdmin && user?.role !== 'moderator' },
        { to: '/admin/comments', label: 'Comments', icon: <FiMessageSquare size={16} />, count: pendingCommentsCount },
        { to: '/admin/security', label: 'Content Security', icon: <FiShield size={16} /> },
      ].filter(item => !item.hide),
    }] : []),
    ...(isAdmin || user?.role === 'moderator' || user?.role === 'editor' ? [{
      label: 'System Operations',
      items: [
        { to: '/admin/system', label: 'System Control', icon: <FiSliders size={16} /> }
      ]
    }] : []),
    ...(isAdmin ? [{
      label: 'Administration',
      items: [
        { to: '/admin/users', label: 'Users', icon: <FiUsers size={16} /> },
        { to: '/admin/notifications', label: 'Push Notifications', icon: <FiBell size={16} /> },
      ],
    }] : []),
  ];

  const filteredNavGroups = navGroups.map(group => {
    const matchedItems = group.items.filter(item => 
      item.label.toLowerCase().includes(sidebarSearch.toLowerCase())
    );
    return {
      ...group,
      items: matchedItems
    };
  }).filter(group => group.items.length > 0);

  const roleLabel = isAdmin ? 'Admin' : isModerator ? 'Moderator' : 'Editor';
  const roleColor = isAdmin ? '#0055a4' : isModerator ? '#dc2626' : '#2563eb';

  if (!isAdmin && !isEditor && !isModerator) return null;

  return (
    <div className={`ad-shell ${sidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`} ref={adminRef}>

      {/* ── Sidebar ── */}
      <aside className={`ad-sidebar ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
        {/* Logo */}
        <div className="ad-sidebar-brand">
          <div className="ad-brand-mark">🌊</div>
          {showLabels && (
            <div className="ad-brand-text">
              <span className="ad-brand-name">SW Admin</span>
              <span className="ad-brand-sub">Southern Waves</span>
            </div>
          )}
          {!isMobile ? (
            <button
              className="ad-collapse-btn"
              onClick={() => setSidebarOpen(v => !v)}
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <FiChevronRight size={14} style={{ transform: sidebarOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
            </button>
          ) : (
            <button
              className="ad-mobile-close-btn"
              onClick={() => setMobileSidebarOpen(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#fff',
                width: 28, height: 28,
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'background-color 0.2s'
              }}
            >
              <FiX size={16} />
            </button>
          )}
        </div>

        {/* User Card */}
        <div className="ad-user-card">
          <div className="ad-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          {showLabels && (
            <div className="ad-user-info">
              <span className="ad-user-name">{user?.name}</span>
              <span className="ad-role-badge" style={{ background: roleColor }}>{roleLabel}</span>
            </div>
          )}
        </div>

        {/* Sidebar Search */}
        {showLabels && (
          <div style={{ padding: '8px 12px 16px', position: 'relative' }}>
            <FiSearch style={{ position: 'absolute', left: 24, top: 18, color: 'rgba(255, 255, 255, 0.4)' }} size={13} />
            <input
              type="text"
              placeholder="Quick search menu..."
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 28px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#fff',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
            />
          </div>
        )}

        {/* Nav Groups */}
        <nav className="ad-nav">
          {filteredNavGroups.map((group) => {
            const isExpanded = expandedGroups[group.label];
            return (
              <div key={group.label} className="ad-nav-group" style={{ marginBottom: showLabels ? '12px' : '4px' }}>
                {showLabels ? (
                  <div 
                    onClick={() => toggleGroup(group.label)}
                    style={{ 
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                      cursor: 'pointer', padding: '8px 16px 4px', userSelect: 'none'
                    }}
                  >
                    <span className="ad-nav-group-label" style={{ padding: 0, margin: 0 }}>{group.label}</span>
                    <FiChevronDown 
                      size={12} 
                      style={{ 
                        color: 'rgba(255, 255, 255, 0.4)',
                        transform: isExpanded ? 'none' : 'rotate(-90deg)', 
                        transition: 'transform 0.2s' 
                      }} 
                    />
                  </div>
                ) : (
                  <div style={{ height: '8px' }} />
                )}
                
                {(isExpanded || !showLabels) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {group.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={() => {
                          if (isMobile) setMobileSidebarOpen(false);
                        }}
                        className={({ isActive }) =>
                          `ad-nav-item${isActive ? ' active' : ''}${item.highlight ? ' highlight' : ''}`
                        }
                        title={!showLabels ? item.label : undefined}
                      >
                        <span className="ad-nav-icon">{item.icon}</span>
                        {showLabels && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <span className="ad-nav-label">{item.label}</span>
                            {item.count > 0 && (
                              <span style={{ 
                                background: item.to.includes('moderation') ? '#f59e0b' : '#ef4444', 
                                color: '#fff', 
                                fontSize: '10px', 
                                fontWeight: 800, 
                                borderRadius: '10px', 
                                padding: '2px 6px',
                                minWidth: '18px',
                                textAlign: 'center',
                                lineHeight: 1
                              }}>
                                {item.count}
                              </span>
                            )}
                          </div>
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="ad-sidebar-footer">
          <Link to="/" className="ad-nav-item" onClick={() => { if (isMobile) setMobileSidebarOpen(false); }} title={!showLabels ? 'View Site' : undefined}>
            <span className="ad-nav-icon"><FiExternalLink size={16} /></span>
            {showLabels && <span className="ad-nav-label">View Site</span>}
          </Link>
          <button className="ad-nav-item" onClick={toggleTheme} title={!showLabels ? 'Toggle Theme' : undefined}>
            <span className="ad-nav-icon">
              {theme === 'light' ? <FiMoon size={16} /> : theme === 'dark' ? <IoContrast size={16} /> : <FiSun size={16} />}
            </span>
            {showLabels && (
              <span className="ad-nav-label">
                {theme === 'light' ? 'Dark Mode' : theme === 'dark' ? 'Black Mode' : 'Light Mode'}
              </span>
            )}
          </button>
          <button className="ad-nav-item logout-btn" onClick={handleLogout} title={!showLabels ? 'Log Out' : undefined}>
            <span className="ad-nav-icon"><FiLogOut size={16} /></span>
            {showLabels && <span className="ad-nav-label">Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileSidebarOpen && (
        <div className="ad-mobile-overlay" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* ── Main ── */}
      <div className="ad-main">
        {/* Top Header */}
        <header className="ad-topbar navbar-modern">
          <div className="navbar-modern-row ad-topbar-row">
            <div className="ad-topbar-left">
              <button
                className="ad-hamburger nav-icon-btn"
                onClick={() => setMobileSidebarOpen(v => !v)}
                style={{ marginRight: 8 }}
              >
                {mobileSidebarOpen ? <FiX size={20} /> : <FiMenu size={20} />}
              </button>
              
              <button className="nav-icon-btn back-btn" onClick={() => navigate(-1)} aria-label="Go Back">
                <FiArrowLeft size={20} />
              </button>

              <div className="nav-accent-bar"></div>

              <div className="nav-title-group">
                <Link to="/" className="nav-brand-label">Southern Waves.</Link>
                <h1 className="nav-dynamic-title">
                  {location.pathname === '/admin' ? 'Dashboard'
                    : location.pathname.includes('articles') ? 'Articles'
                    : location.pathname.includes('new-article') ? 'New Article'
                    : location.pathname.includes('edit-article') ? 'Edit Article'
                    : location.pathname.includes('submissions') ? 'Submissions'
                    : location.pathname.includes('comments') ? 'Comments'
                    : location.pathname.includes('moderation') ? 'Content Moderation'
                    : location.pathname.includes('filters') ? 'Filter Manager'
                    : location.pathname.includes('security') ? 'Security'
                    : location.pathname.includes('notifications') ? 'Notifications'
                    : location.pathname.includes('users') ? 'Users'
                    : 'Admin'}
                </h1>
              </div>
            </div>

            <div className="ad-topbar-right">
              <div 
                className="nav-dropdown-wrapper"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <button 
                  className={`nav-more-btn ${menuOpen ? 'active' : ''}`}
                  onClick={() => { setMenuOpen(!menuOpen); setNotifOpen(false); }}
                >
                  <span>more</span>
                  <FiChevronDown className="more-chevron" size={16} />
                </button>
              </div>

              <button className="nav-icon-btn theme-toggle" onClick={toggleTheme} aria-label="Toggle Theme">
                {theme === 'light' ? <FiMoon size={20} /> : theme === 'dark' ? <IoContrast size={20} /> : <FiSun size={20} />}
              </button>

              {/* Messages Button */}
              {user && (
                <button 
                  className="nav-icon-btn message-btn" 
                  onClick={() => {
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

              {/* Notifications */}
              <div className="ad-notif-wrap" style={{ position: 'relative' }}>
                <button 
                  className={`nav-icon-btn ${notifOpen ? 'active' : ''}`}
                  onClick={() => {
                    setNotifOpen(!notifOpen);
                    setProfileMenuOpen(false);
                    setMenuOpen(false);
                  }}
                  title="University Alerts"
                >
                  <FiBell size={20} />
                  {unreadNotificationsCount > 0 && (
                    <span className="notification-badge">{unreadNotificationsCount}</span>
                  )}
                </button>
                {notifOpen && (
                  <NotificationsPopover 
                    notifications={notifications}
                    markNotificationRead={markNotificationRead}
                    markAllNotificationsRead={markAllNotificationsRead}
                    setNotificationsOpen={setNotifOpen}
                  />
                )}
              </div>

              {/* Avatar Profile */}
              <div className="nav-user-profile-wrapper" style={{ position: 'relative' }}>
                <div 
                  className="nav-user-profile" 
                  onClick={() => {
                    setProfileMenuOpen(!profileMenuOpen);
                    setMenuOpen(false);
                    setNotifOpen(false);
                  }} 
                  title="Account options"
                >
                  <span className="nav-username">{user?.name?.split(' ')[0]}</span>
                  {/* ADMIN TAG next to profile */}
                  <span style={{
                    fontSize: '9px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    background: 'var(--color-black)',
                    color: 'var(--color-white)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    marginRight: '6px',
                    display: 'inline-block'
                  }}>
                    {user?.role === 'admin' ? 'Admin' : 'Editor'}
                  </span>
                  <div className="nav-profile-pic">
                    {user?.avatar ? (
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
                        src={user?.avatar || '/default-avatar.png'} 
                        alt={user?.name} 
                        className="profile-popover-avatar"
                      />
                      <div className="profile-popover-info">
                        <h4 className="profile-popover-name">{user?.name}</h4>
                        <p className="profile-popover-email">{user?.email}</p>
                        <p className="profile-popover-role">{user?.role}</p>
                      </div>
                    </div>

                    <div className="profile-popover-menu-list">
                      {/* Option 1: Dashboard and Saved Articles */}
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
            </div>
          </div>

          {/* Admin Mega Menu Dropdown */}
          <div 
            className={`nav-mega-dropdown ${menuOpen ? 'open' : ''}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{ top: '100%' }}
          >
            <div className="nav-mega-dropdown-inner concept-layout">
              <div className="mega-concept-grid">
                {/* Column 1 */}
                <div className="mega-column">
                  <div className="mega-column-links">
                    {renderAdminNavLink('/admin', 'Dashboard')}
                    {renderAdminNavLink('/admin/submissions', 'Submissions')}
                  </div>
                </div>

                {/* Column 2 */}
                <div className="mega-column">
                  <div className="mega-column-links">
                    {renderAdminNavLink('/admin/articles', 'Articles')}
                    {isAdmin ? renderAdminNavLink('/admin/users', 'Users') : renderAdminNavLink('/admin/comments', 'Comments')}
                  </div>
                </div>

                {/* Column 3 */}
                <div className="mega-column">
                  <div className="mega-column-links">
                    {renderAdminNavLink('/admin/new-article', 'New Article')}
                    <Link to="/" className="concept-nav-link" onClick={() => setMenuOpen(false)}>
                      <span className="nav-bullet">&gt;</span> Exit Admin
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="ad-page-content">
          <Outlet />
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
    </div>
  );
};

const NotificationsPopover = ({ notifications, markNotificationRead, markAllNotificationsRead, setNotificationsOpen }) => {
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const filtered = notifications.filter(n => {
    if (filter === 'all') return true;
    return n.type === filter;
  });

  const getLabel = (type) => {
    if (type === 'board_news') return 'Board News';
    if (type === 'sensitivity') return 'Critical Alert';
    return 'Announcement';
  };

  const getTypeStyle = (type, isRead) => {
    if (type === 'sensitivity') {
      return {
        borderLeft: '4px solid #c8102e',
        background: isRead ? 'rgba(200, 16, 46, 0.02)' : 'rgba(200, 16, 46, 0.06)'
      };
    }
    if (type === 'board_news') {
      return {
        borderLeft: '4px solid var(--accent-color)',
        background: isRead ? 'transparent' : 'rgba(0, 122, 255, 0.04)'
      };
    }
    return {
      borderLeft: '4px solid #4b5563',
      background: isRead ? 'transparent' : 'rgba(75, 85, 99, 0.04)'
    };
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="profile-popover notifications-popover" style={{ width: '360px', padding: '16px', gap: '12px', textAlign: 'left', right: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-gray-200)', paddingBottom: '8px' }}>
        <h4 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-black)' }}>University Alerts</h4>
        {notifications.some(n => !n.isRead) && (
          <button 
            onClick={markAllNotificationsRead}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-color)',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
              textTransform: 'uppercase'
            }}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
        {[
          { id: 'all', label: 'All' },
          { id: 'board_news', label: 'News' },
          { id: 'announcement', label: 'Announcements' },
          { id: 'sensitivity', label: 'Critical' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={(e) => {
              e.stopPropagation();
              setFilter(tab.id); 
              setExpandedId(null); 
            }}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '12px',
              border: filter === tab.id ? '1.5px solid var(--color-black)' : '1.5px solid var(--color-gray-300)',
              background: filter === tab.id ? 'var(--color-black)' : 'transparent',
              color: filter === tab.id ? 'var(--color-white)' : 'var(--color-gray-700)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto', paddingRight: '2px' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', fontSize: '13px', color: 'var(--color-gray-500)' }}>
            No alerts found.
          </div>
        ) : (
          filtered.map(n => (
            <div
              key={n._id}
              onClick={(e) => {
                e.stopPropagation();
                setExpandedId(expandedId === n._id ? null : n._id);
                if (!n.isRead) markNotificationRead(n._id);
              }}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--color-gray-200)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                textAlign: 'left',
                ...getTypeStyle(n.type, n.isRead)
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: n.type === 'sensitivity' ? '#fee2e2' : n.type === 'board_news' ? '#e0f2fe' : '#f3f4f6',
                  color: n.type === 'sensitivity' ? '#991b1b' : n.type === 'board_news' ? '#0369a1' : '#374151'
                }}>
                  {getLabel(n.type)}
                </span>
                <span style={{ fontSize: '9px', color: 'var(--color-gray-500)', fontWeight: 500 }}>
                  {formatTime(n.createdAt)}
                </span>
              </div>
              <div style={{ fontWeight: n.isRead ? 600 : 800, fontSize: '12px', color: 'var(--color-black)' }}>
                {n.title}
              </div>
              <div style={{
                fontSize: '11.5px',
                color: 'var(--color-gray-600)',
                lineHeight: 1.4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebKitLineClamp: expandedId === n._id ? 'initial' : 2,
                WebKitBoxOrient: 'vertical'
              }}>
                {n.message}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminLayout;
