import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { articleAPI } from '../services/api';
import {
  FiHome, FiTrendingUp, FiClock, FiMessageSquare,
  FiSearch, FiX, FiPlus, FiMic, FiRadio, FiMoreHorizontal,
  FiStar, FiSliders
} from 'react-icons/fi';
import SearchResultsPanel from './SearchResultsPanel';
import QuickPublishModal from './QuickPublishModal';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'home',   label: 'Home',   icon: FiHome },
  { id: 'trend',  label: 'Trend',  icon: FiTrendingUp },
  { id: 'recent', label: 'Recent', icon: FiClock },
  { id: 'foryou', label: 'For You', icon: FiStar },
  { id: 'spoken', label: 'Spoken', icon: FiMic },
  { id: 'ground', label: 'Ground', icon: FiRadio },
];

const BottomNavPill = ({
  activeTab,
  setActiveTab,
  category: propCategory,
  onPublishSuccess,
  customTabs,
  onTabClick,
  showSearch,
  showPublish,
  search = '',
  setSearch = () => {},
  subCategory = '',
  setSubCategory = () => {},
  yearRange = 'all',
  setYearRange = () => {},
  sortOrder = 'historicalYearAsc',
  setSortOrder = () => {},
  onSearchToggle,
  customStartYear = '',
  setCustomStartYear = () => {},
  customEndYear = '',
  setCustomEndYear = () => {}
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { setIsOpen, openRoom, isOpen } = useChat();

  const [searchOpen, setSearchOpen] = useState(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const filterPanelRef = useRef(null);

  // Notify parent component of search active state changes
  useEffect(() => {
    if (onSearchToggle) {
      onSearchToggle(searchOpen);
    }
  }, [searchOpen, onSearchToggle]);

  // Derive active category from location path (moved to top to prevent TDZ bugs)
  const getCategoryFromPath = () => {
    if (propCategory) return propCategory;
    const path = location.pathname;
    if (path === '/news') return 'news';
    if (path === '/editorial') return 'editorial';
    if (path === '/features') return 'features';
    if (path === '/tea-shop') return 'tea-shop';
    if (path === '/pictures-speak') return 'pictures-speak';
    if (path === '/know-your-past') return 'kyp';
    return 'news';
  };

  const category = getCategoryFromPath();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [trendingTags, setTrendingTags] = useState([]);
  const [recommendedTags, setRecommendedTags] = useState([]);
  const [recentArticles, setRecentArticles] = useState([]);
  const [recommendedArticles, setRecommendedArticles] = useState([]);
  const [initialLoading, setInitialLoading] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  
  const searchCacheRef = useRef({});
  const inputRef = useRef(null);

  // Synchronize search pill text changes to filter the parent timeline component
  useEffect(() => {
    if (category === 'kyp') {
      setSearch(searchQuery);
    }
  }, [searchQuery, category, setSearch]);

  // Prevent overlapping overlays: close filters when search opens
  useEffect(() => {
    if (searchOpen) {
      setFilterPanelOpen(false);
    }
  }, [searchOpen]);

  // Prevent overlapping overlays: close search when filters open
  useEffect(() => {
    if (filterPanelOpen) {
      setSearchOpen(false);
    }
  }, [filterPanelOpen]);

  useEffect(() => {
    if (!filterPanelOpen) return;
    const handleOutsideClick = (e) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target)) {
        setFilterPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [filterPanelOpen]);

  useEffect(() => {
    if (!moreOpen) return;
    const close = () => setMoreOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [moreOpen]);

  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [isPillVisible, setIsPillVisible] = useState(true);
  const [isBubbleEntering, setIsBubbleEntering] = useState(false);
  const lastScrollYRef = useRef(0);
  const idleTimerRef = useRef(null);

  // Auto-restore bottom pill when chat modal or publish modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsPillVisible(true);
      lastScrollYRef.current = window.scrollY || window.pageYOffset || 0;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!publishOpen && !isModalOpen) {
      setIsPillVisible(true);
      lastScrollYRef.current = window.scrollY || window.pageYOffset || 0;
    }
  }, [publishOpen, isModalOpen]);

  // Auto-hide when scrolling down, show when scrolling up or idle for 5s across all pages
  useEffect(() => {
    const handleScrollActivity = (currentY) => {
      if (searchOpen || filterPanelOpen || publishOpen || isModalOpen || isOpen) {
        setIsPillVisible(true);
        return;
      }

      const delta = currentY - lastScrollYRef.current;

      // If at the very top of page, keep pill visible
      if (currentY <= 30) {
        setIsPillVisible(true);
      } else if (delta > 8) {
        // User is scrolling DOWN -> Automatically Hide
        setIsPillVisible(false);
      } else if (delta < -8) {
        // User is scrolling UP -> Show with bubble animation
        setIsPillVisible(prev => {
          if (!prev) {
            setIsBubbleEntering(true);
            setTimeout(() => setIsBubbleEntering(false), 600);
          }
          return true;
        });
      }

      lastScrollYRef.current = currentY;

      // Reset 5s Idle Timer: Show pill if user is idle for 5 seconds
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = setTimeout(() => {
        setIsPillVisible(prev => {
          if (!prev) {
            setIsBubbleEntering(true);
            setTimeout(() => setIsBubbleEntering(false), 600);
          }
          return true;
        });
      }, 5000);
    };

    const onWindowScroll = () => {
      if (isOpen || publishOpen || isModalOpen) return;
      handleScrollActivity(window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0);
    };

    const onViewerScroll = (e) => {
      if (isOpen || publishOpen || isModalOpen) return;
      const target = e.target;
      if (!target) return;
      // Ignore scroll inside chat, modals, menus, and sidebars
      if (target.closest && (
        target.closest('.chat-modal') ||
        target.closest('.msg-app') ||
        target.closest('.message-app-container') ||
        target.closest('.qpm-overlay') ||
        target.closest('.quick-publish-modal') ||
        target.closest('.mobile-popup-content') ||
        target.closest('.ad-sidebar') ||
        target.closest('.nm-search-results-panel')
      )) {
        return;
      }
      if (target.scrollTop !== undefined) {
        handleScrollActivity(target.scrollTop);
      }
    };

    window.addEventListener('scroll', onWindowScroll, { passive: true });
    document.addEventListener('scroll', onViewerScroll, { passive: true, capture: true });

    return () => {
      window.removeEventListener('scroll', onWindowScroll);
      document.removeEventListener('scroll', onViewerScroll, { capture: true });
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [searchOpen, filterPanelOpen, publishOpen, isModalOpen, isOpen]);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);



  const handlePublishClick = () => {
    setPublishOpen(true);
    setTimeout(() => {
      setIsModalOpen(true);
    }, 10);
  };

  const getDefaultPostType = () => {
    if (category === 'tea-shop') {
      if (activeTab === 'spoken') return 'spoken';
      if (activeTab === 'ground') return 'ground';
      return 'mind';
    }
    if (category === 'editorial') return 'editorial';
    if (category === 'university-row') return 'university';
    if (category === 'features') return 'features';
    if (category === 'kyp') return 'event';
    if (category === 'pictures-speak') return 'picture';
    return user?.role === 'student' ? 'mind' : 'article';
  };

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [searchOpen]);

  const handleTabClick = (tabId) => {
    if (onTabClick) {
      onTabClick(tabId);
    } else if (setActiveTab) {
      setActiveTab(tabId);
    } else {
      let params = '';
      if (tabId === 'trend')  params = '?trending=true';
      else if (tabId === 'recent') params = '?recent=true';
      else if (tabId === 'foryou') params = '?foryou=true';
      else if (tabId === 'spoken') params = '?tab=spoken';
      else if (tabId === 'ground') params = '?tab=ground';
      navigate(`/news${params}`);
    }
  };

  const handleChatClick = () => {
    if (!user) {
      toast.error('Please login to discuss in chat');
      return;
    }
    const room = category === 'news' ? 'news'
      : category === 'editorial' ? 'editorial'
      : category === 'features' ? 'features'
      : category === 'kyp' ? 'know-your-past'
      : category === 'tea-shop' ? 'tea-shop'
      : category === 'pictures-speak' ? 'pictures-speak'
      : 'news';

    openRoom('group', room);
    setIsOpen(true);
  };

  // Perform search api call using fast caching
  const doSearch = useCallback(async (q) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }

    const cacheKey = `${category || 'all'}:${trimmed.toLowerCase()}`;
    if (searchCacheRef.current[cacheKey]) {
      setSearchResults(searchCacheRef.current[cacheKey]);
      return;
    }

    setSearchLoading(true);
    try {
      const params = { search: trimmed, limit: 8 };
      if (category) params.category = category;
      const res = await articleAPI.getAll(params);
      const data = res.data?.data || [];
      searchCacheRef.current[cacheKey] = data; // Cache search result
      setSearchResults(data);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [category]);

  useEffect(() => {
    if (!searchOpen) return;
    const t = setTimeout(() => doSearch(searchQuery), 350);
    return () => clearTimeout(t);
  }, [searchQuery, searchOpen, doSearch]);

  // Load suggestions (trending tags, recommended tags, recent, and recommendations) when search opens
  useEffect(() => {
    if (!searchOpen) return;
    if (trendingTags.length > 0 || recommendedTags.length > 0 || recentArticles.length > 0 || recommendedArticles.length > 0) return;

    setInitialLoading(true);
    const isKyp = category === 'kyp';

    const tagsPromise = isKyp
      ? Promise.resolve({ data: { data: ['1947', '1950', '1975', '1990', '2000'] } })
      : articleAPI.getTrendingTags({ limit: 8 }).catch(() => ({ data: { data: [] } }));

    const recentPromise = articleAPI.getAll({ 
      limit: 4, 
      sort: '-createdAt', 
      category: isKyp ? 'kyp' : undefined 
    }).catch(() => ({ data: { data: [] } }));

    const recPromise = articleAPI.getRecommendations({ 
      limit: 4, 
      category: isKyp ? 'kyp' : undefined 
    }).catch(() => ({ data: { data: [] } }));

    Promise.all([tagsPromise, recentPromise, recPromise]).then(([tagsRes, recentRes, recRes]) => {
      // 1. Trending/Year tags
      const tagsData = tagsRes.data?.data || tagsRes.data || [];
      const extractedTags = tagsData.map(t => typeof t === 'string' ? t : t.tag).filter(Boolean);
      setTrendingTags(extractedTags.slice(0, 8));

      // 2. Recommended/Era tags
      if (isKyp) {
        setRecommendedTags(['Pre-1950', '1950-2000', 'Post-2000']);
      } else {
        const recTagsData = recRes.data?.userInterests?.tags || [];
        const extractedRecTags = recTagsData.map(t => typeof t === 'string' ? t : t.tag).filter(Boolean);
        const defaultRecTags = ['fee hike', 'protest', 'campus', 'politics', 'exam'];
        setRecommendedTags(extractedRecTags.length > 0 ? extractedRecTags.slice(0, 8) : defaultRecTags);
      }

      // 3. Articles
      setRecentArticles(recentRes.data?.data || []);
      setRecommendedArticles(recRes.data?.data || []);
    }).catch(err => {
      console.error('Failed to load search suggestions:', err);
    }).finally(() => {
      setInitialLoading(false);
    });
  }, [searchOpen, trendingTags.length, recommendedTags.length, recentArticles.length, recommendedArticles.length, category]);

  const isTeaShop = category === 'tea-shop';
  const visibleTabs = isTeaShop
    ? TABS.filter(tab => {
        if (screenWidth < 500) {
          return tab.id !== 'trend' && tab.id !== 'recent' && tab.id !== 'foryou';
        }
        if (screenWidth < 768) {
          return tab.id !== 'recent';
        }
        return true;
      })
    : TABS.filter(tab => {
        if (tab.id === 'spoken' || tab.id === 'ground') return false;
        if (screenWidth < 500 && tab.id === 'recent') return false;
        return true;
      });

  const hiddenTabs = isTeaShop
    ? TABS.filter(tab => {
        if (screenWidth < 500) {
          return tab.id === 'trend' || tab.id === 'recent' || tab.id === 'foryou';
        }
        if (screenWidth < 768) {
          return tab.id === 'recent';
        }
        return false;
      })
    : TABS.filter(tab => {
        if (screenWidth < 500 && tab.id === 'recent') return true;
        return false;
      });

  const canPublish = user && (
    category === 'tea-shop'
      ? user.role === 'student'
      : (['admin', 'editor', 'moderator'].includes(user.role) || category === 'pictures-speak')
  );

  const tabsToRender = customTabs || visibleTabs;
  const hiddenTabsToRender = customTabs ? [] : hiddenTabs;

  return (
    <>
      <style>{`
        .kyp-advanced-filter-panel {
          position: absolute;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          width: 90vw;
          max-width: 440px;
          background: var(--color-paper);
          border-radius: 16px;
          box-shadow: var(--shadow-xl);
          border: 1px solid var(--color-gray-200);
          color: var(--color-black);
          padding: 20px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          gap: 16px;
          animation: slideUpFade 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: auto !important;
        }
        @keyframes slideUpFade {
          from { opacity: 0; transform: translate(-50%, 15px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .kyp-advanced-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .kyp-advanced-icon {
          position: absolute;
          left: 12px;
          color: var(--color-gray-400);
          pointer-events: none;
        }
        .kyp-advanced-search-input {
          width: 100%;
          padding: 10px 10px 10px 36px;
          border: 1px solid var(--color-gray-200);
          border-radius: 8px;
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s;
          background: var(--color-white);
          color: var(--color-black);
        }
        .kyp-advanced-search-input:focus {
          border-color: var(--accent-color);
        }
        .kyp-advanced-select {
          width: 100%;
          padding: 10px;
          border: 1px solid var(--color-gray-200);
          border-radius: 8px;
          font-size: 13px;
          outline: none;
          background: var(--color-white);
          color: var(--color-black);
          cursor: pointer;
        }
        .kyp-segmented-control {
          display: flex;
          background: var(--color-gray-100);
          border: 1px solid var(--color-gray-200);
          padding: 3px;
          border-radius: 8px;
          gap: 2px;
        }
        .kyp-segmented-btn {
          flex: 1;
          border: none;
          background: transparent;
          padding: 8px 4px;
          font-size: 11px;
          font-weight: 700;
          border-radius: 6px;
          cursor: pointer;
          color: var(--color-gray-600);
          transition: all 0.15s ease;
          text-align: center;
        }
        .kyp-segmented-btn:hover {
          color: var(--color-black);
        }
        .kyp-segmented-btn.active {
          background: var(--color-white);
          color: var(--color-black);
          box-shadow: var(--shadow-sm);
        }
        .kyp-advanced-add-btn {
          width: 100%;
          padding: 10px;
          background: var(--accent-color);
          color: #fff;
          font-weight: 750;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.2s;
        }
        .kyp-advanced-add-btn:hover {
          background: var(--accent-color-hover);
        }
      `}</style>
      <div 
        className={`nm-bottom-dock${(isOpen || publishOpen || isModalOpen) ? ' nm-dock-hidden' : ''}${searchOpen ? ' search-active' : ''}${!isPillVisible ? ' nm-dock-hidden' : ''}${isBubbleEntering ? ' nm-dock-bubble-in' : ''}`}
        style={(isOpen || publishOpen || isModalOpen) ? { display: 'none', pointerEvents: 'none', visibility: 'hidden' } : {}}
      >
        {/* Hidden tabs popup menu */}
        {moreOpen && hiddenTabsToRender.length > 0 && (
          <div className="nm-more-popup" onClick={e => e.stopPropagation()}>
            {hiddenTabsToRender.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  className={`nm-more-popup-item${isActive ? ' active' : ''}`}
                  onClick={() => {
                    setMoreOpen(false);
                    handleTabClick(tab.id);
                  }}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Advanced KYP popover filter panel */}
        {category === 'kyp' && filterPanelOpen && (
          <div className="kyp-advanced-filter-panel" ref={filterPanelRef} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0', paddingBottom: '8px' }}>
              <span style={{ fontWeight: 850, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#000' }}>Filter Archives</span>
              <button 
                type="button" 
                onClick={() => setFilterPanelOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', display: 'flex', alignItems: 'center' }}
              >
                <FiX size={18} />
              </button>
            </div>
            
            {/* Sub-Category dropdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#888' }}>Sub-Category</label>
              <select
                value={subCategory}
                onChange={e => setSubCategory(e.target.value)}
                className="kyp-advanced-select"
              >
                <option value="">All Categories</option>
                {[
                  'Movement', 'Agitation', 'Milestone', 'Crisis', 'Architecture', 'Culture', 'Sports', 'Other'
                ].map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            {/* Eras Segmented Control */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#888' }}>Historical Era</label>
              <div className="kyp-segmented-control" style={{ flexWrap: 'wrap' }}>
                {[
                  { val: 'all', label: 'All' },
                  { val: 'pre-1950', label: 'Pre-1950' },
                  { val: '1950-2000', label: '1950-2000' },
                  { val: 'post-2000', label: 'Post-2000' },
                  { val: 'custom', label: 'Custom' }
                ].map(era => (
                  <button
                    key={era.val}
                    type="button"
                    className={`kyp-segmented-btn ${yearRange === era.val ? 'active' : ''}`}
                    onClick={() => setYearRange(era.val)}
                    style={{ minWidth: era.val === 'custom' ? '70px' : 'auto' }}
                  >
                    {era.label}
                  </button>
                ))}
              </div>

              {/* Custom Year Inputs */}
              {yearRange === 'custom' && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                  <input
                    type="number"
                    placeholder="Min Year"
                    value={customStartYear}
                    onChange={e => setCustomStartYear(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px',
                      outline: 'none',
                      background: '#fff',
                      color: '#000'
                    }}
                  />
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>to</span>
                  <input
                    type="number"
                    placeholder="Max Year"
                    value={customEndYear}
                    onChange={e => setCustomEndYear(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px',
                      outline: 'none',
                      background: '#fff',
                      color: '#000'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Sort Order Segmented Control */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#888' }}>Sort Order</label>
              <div className="kyp-segmented-control">
                {[
                  { val: 'historicalYearAsc', label: 'Oldest First' },
                  { val: 'historicalYearDesc', label: 'Newest First' }
                ].map(sort => (
                  <button
                    key={sort.val}
                    type="button"
                    className={`kyp-segmented-btn ${sortOrder === sort.val ? 'active' : ''}`}
                    onClick={() => setSortOrder(sort.val)}
                  >
                    {sort.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main navigation pill */}
        {!searchOpen && (
          category === 'kyp' ? (
            <div className="nm-dock-pill">
              <button
                className={`nm-dock-btn active`}
                onClick={() => setFilterPanelOpen(false)}
              >
                <FiClock size={20} />
                <span>Timeline</span>
              </button>
              <button
                className={`nm-dock-btn nm-more-btn ${filterPanelOpen ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setFilterPanelOpen(!filterPanelOpen);
                }}
                style={{ position: 'relative' }}
              >
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiSliders size={20} />
                  {(subCategory !== '' || yearRange !== 'all') && (
                    <span 
                      style={{
                        position: 'absolute',
                        top: '-1px',
                        right: '-1px',
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: 'var(--accent-color, #c8102e)',
                        border: '1.5px solid #fff'
                      }}
                    />
                  )}
                </div>
                <span>Filter</span>
              </button>
              <button className="nm-dock-btn" onClick={handleChatClick}>
                <FiMessageSquare size={20} />
                <span>Chat</span>
              </button>
            </div>
          ) : (
            <div className="nm-dock-pill">
              {tabsToRender.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    className={`nm-dock-btn${isActive ? ' active' : ''}`}
                    onClick={() => {
                      setMoreOpen(false);
                      handleTabClick(tab.id);
                    }}
                  >
                    <Icon size={20} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
              
              {hiddenTabsToRender.length > 0 && (
                <button
                  className={`nm-dock-btn nm-more-btn${moreOpen ? ' active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMoreOpen(!moreOpen);
                  }}
                >
                  <FiMoreHorizontal size={20} />
                  <span>More</span>
                </button>
              )}

              {!customTabs && (
                <button className="nm-dock-btn" onClick={handleChatClick}>
                  <FiMessageSquare size={20} />
                  <span>Chat</span>
                </button>
              )}
            </div>
          )
        )}

        {/* Search pill */}
        {(!customTabs || showSearch) && (
          <div className={`nm-search-pill ${searchOpen ? 'expanded' : ''}`}>
            {searchOpen ? (
              <div className="nm-search-pill-content">
                <FiSearch size={20} className="nm-search-pill-icon" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search stories, tags..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="nm-search-pill-input"
                />
                {searchQuery && (
                  <button className="nm-search-pill-clear" onClick={() => setSearchQuery('')}>
                    <FiX size={16} />
                  </button>
                )}
                <button className="nm-search-pill-close" onClick={() => setSearchOpen(false)}>
                  <FiX size={18} />
                </button>
              </div>
            ) : (
              <button className="nm-search-pill-trigger" onClick={() => setSearchOpen(true)} title="Search articles">
                <FiSearch size={20} />
              </button>
            )}
          </div>
        )}

        {/* Publish button next to search */}
        {canPublish && !searchOpen && (
          <div className={`nm-publish-dock-btn-wrapper ${isModalOpen ? 'modal-open' : ''}`}>
            <button
              className={`nm-publish-dock-btn ${isModalOpen ? 'modal-open' : ''}`}
              onClick={handlePublishClick}
              title="Publish article here"
            >
              <FiPlus size={22} />
            </button>
          </div>
        )}
      </div>

      {/* Search Results Panel */}
      <SearchResultsPanel
        visible={searchOpen}
        query={searchQuery}
        results={searchResults}
        loading={searchLoading}
        onClose={() => setSearchOpen(false)}
        trendingTags={trendingTags}
        recommendedTags={recommendedTags}
        recentArticles={recentArticles}
        recommendedArticles={recommendedArticles}
        initialLoading={initialLoading}
        category={category}
        onTagClick={category === 'kyp' ? (tag) => {
          if (tag === 'Pre-1950') {
            setYearRange('pre-1950');
          } else if (tag === '1950-2000') {
            setYearRange('1950-2000');
          } else if (tag === 'Post-2000') {
            setYearRange('post-2000');
          } else {
            setSearchQuery(tag);
          }
          setSearchOpen(false);
        } : undefined}
      />

      {/* Quick Publish Modal */}
      {publishOpen && (
        <QuickPublishModal
          defaultCategory={category}
          defaultType={getDefaultPostType()}
          onClose={() => setPublishOpen(false)}
          onCloseStart={() => setIsModalOpen(false)}
          onPublishSuccess={onPublishSuccess}
        />
      )}
    </>
  );
};

export default BottomNavPill;
