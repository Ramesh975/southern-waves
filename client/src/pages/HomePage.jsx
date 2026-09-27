import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import API, { articleAPI } from '../services/api';
import { getImageUrl } from '../components/ArticleComponents';
import PictureSpeakModal from '../components/PictureSpeakModal';
import WebStoriesSection from '../components/WebStoriesSection';
import WebStoryModal from '../components/WebStoryModal';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { 
  FiStar, 
  FiLock, 
  FiChevronRight, 
  FiTrendingUp, 
  FiEye, 
  FiHeart, 
  FiMaximize2,
  FiGrid,
  FiList,
  FiExternalLink,
  FiCheck,
  FiArrowRight
} from 'react-icons/fi';
import './NewsMenu.css';

const HomePage = () => {
  const [articles, setArticles] = useState([]);
  const [editorialSpotlight, setEditorialSpotlight] = useState(null);
  const [editorialArticles, setEditorialArticles] = useState([]);
  const [featuresArticles, setFeaturesArticles] = useState([]);
  const [kypArticles, setKypArticles] = useState([]);
  const [teaShopArticles, setTeaShopArticles] = useState([]);
  const [picsArticles, setPicsArticles] = useState([]);
  const [pushedArticles, setPushedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const [trendingArticles, setTrendingArticles] = useState([]);
  const [newsArticles, setNewsArticles] = useState([]);
  const [trendingTags, setTrendingTags] = useState([]);
  const [mostViewedArticles, setMostViewedArticles] = useState([]);
  const [mostLikedArticles, setMostLikedArticles] = useState([]);
  const [monitorFilter, setMonitorFilter] = useState('trends'); // 'trends' | 'viewed' | 'liked'
  const [monitorView, setMonitorView] = useState('grid'); // 'grid' | 'list'
  const [selectedPicId, setSelectedPicId] = useState(null);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(null);
  const [currentPushIndex, setCurrentPushIndex] = useState(0);

  // Web Stories dynamic personalized pagination state
  const [webStories, setWebStories] = useState([]);
  const [storyPage, setStoryPage] = useState(1);
  const [hasMoreStories, setHasMoreStories] = useState(true);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [loadingMoreStories, setLoadingMoreStories] = useState(false);

  useEffect(() => {
    articleAPI.getHomeFeed()
      .then((res) => {
        const d = res?.data?.data || {};
        const edList = Array.isArray(d.editorial) ? d.editorial : [];
        
        setArticles(d.articles || []);
        setEditorialSpotlight(edList[0] || null);
        setEditorialArticles(edList);
        setFeaturesArticles(d.features || []);
        setKypArticles(d.kyp || []);
        setTeaShopArticles(d.teaShop || []);
        setPicsArticles(d.pics || []);
        setTrendingArticles(d.trending || []);
        setTrendingTags((d.trendingTags || []).slice(0, 10));
        setMostViewedArticles(d.mostRead || []);
        setMostLikedArticles(d.mostLiked || []);
        setPushedArticles(d.pushed || []);
        setNewsArticles(d.news || []);
      })
      .catch((err) => {
        console.error('Failed to load homepage feed:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  // Compute Active Monitor articles list based on active filter
  const activeMonitorArticles = useMemo(() => {
    if (monitorFilter === 'viewed') {
      return mostViewedArticles.length > 0 ? mostViewedArticles : articles;
    }
    if (monitorFilter === 'liked') {
      return mostLikedArticles.length > 0 ? mostLikedArticles : articles;
    }
    return trendingArticles.length > 0 ? trendingArticles : articles;
  }, [monitorFilter, mostViewedArticles, mostLikedArticles, trendingArticles, articles]);


  // Combine Admin Spotlight (pushed to home) and Features/Featured articles for the First Row
  const spotlightFeatures = useMemo(() => {
    const combined = [...pushedArticles];
    const seen = new Set(pushedArticles.map(a => a._id));

    featuresArticles.forEach(a => {
      if (a && a._id && !seen.has(a._id)) {
        combined.push(a);
        seen.add(a._id);
      }
    });

    articles.filter(a => a.isFeatured).forEach(a => {
      if (a && a._id && !seen.has(a._id)) {
        combined.push(a);
        seen.add(a._id);
      }
    });

    if (combined.length === 0 && articles.length > 0) {
      combined.push(...articles.slice(0, 5));
    }
    return combined;
  }, [pushedArticles, featuresArticles, articles]);

  const currentSpotlight = spotlightFeatures[currentPushIndex % (spotlightFeatures.length || 1)] || null;

  useEffect(() => {
    if (spotlightFeatures.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentPushIndex((prev) => (prev + 1) % spotlightFeatures.length);
    }, 6000); // 6s auto slide
    return () => clearInterval(interval);
  }, [spotlightFeatures.length]);

  // Fetch personalized web stories based on user history & feed settings (batches of 8)
  const fetchWebStories = useCallback(async (pageToLoad = 1, append = false) => {
    try {
      if (append) {
        setLoadingMoreStories(true);
      } else {
        setStoriesLoading(true);
      }

      const res = await articleAPI.getWebStories({ page: pageToLoad, limit: 8 });
      const newStories = res.data?.data || [];
      const hasMore = res.data?.hasMore ?? (newStories.length === 8);

      if (append) {
        setWebStories((prev) => {
          const existingIds = new Set(prev.map(s => s._id));
          const filtered = newStories.filter(s => !existingIds.has(s._id));
          return [...prev, ...filtered];
        });
      } else {
        setWebStories(newStories);
      }

      setStoryPage(pageToLoad);
      setHasMoreStories(hasMore);
    } catch (err) {
      console.error('Failed to load personalized web stories:', err);
    } finally {
      setStoriesLoading(false);
      setLoadingMoreStories(false);
    }
  }, []);

  useEffect(() => {
    fetchWebStories(1, false);
  }, [fetchWebStories, user?._id]);

  const loadMoreStories = useCallback(() => {
    if (loadingMoreStories || !hasMoreStories) return;
    fetchWebStories(storyPage + 1, true);
  }, [fetchWebStories, storyPage, hasMoreStories, loadingMoreStories]);

  const recentArticles = newsArticles.slice(0, 6);

  // Helper to extract first 200 chars of HTML content
  const getExcerpt = (htmlContent) => {
    if (!htmlContent) return '';
    const plainText = htmlContent.replace(/<[^>]*>/g, '');
    return plainText.substring(0, 200) + '...';
  };

  // Helper for "time ago" logic
  const getTimeAgo = (dateStr) => {
    const diff = Math.floor((new Date() - new Date(dateStr)) / 60000); // in minutes
    if (diff < 60) return `${diff}m ago`;
    const hrs = Math.floor(diff / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <main className="homepage-paper">
      <div className="container" style={{ marginTop: 24 }}>
        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : (
          <>
            {/* ── FIRST ROW: Spotlight & Features (Left, Big) + Web Stories (Right, Horizontal) ── */}
            <div className="home-first-row-grid">
              {/* Left Column: Spotlight / Features Carousel */}
              <div className="home-first-row-spotlight-col">
                {currentSpotlight ? (
                  <div className="home-pushed-spotlight-banner">
                    {currentSpotlight.coverImage && (
                      <img 
                        src={getImageUrl(currentSpotlight.coverImage)} 
                        alt={currentSpotlight.title} 
                        className="home-pushed-spotlight-bg-img" 
                      />
                    )}
                    <div className="home-pushed-spotlight-fog-overlay" />
                    <div className="home-pushed-spotlight-content-overlaid">
                      <div className="home-pushed-spotlight-badge">
                        <span className="home-pushed-badge-pulse" />
                        {currentSpotlight.isPushedToHome ? "ADMIN'S SPECIAL SPOTLIGHT" : "FEATURED SPOTLIGHT"}
                      </div>
                      <h2 className="home-pushed-spotlight-title">
                        <Link to={`/article/${currentSpotlight.slug}`}>
                          {currentSpotlight.title}
                        </Link>
                      </h2>
                      <p className="home-pushed-spotlight-lead">
                        {currentSpotlight.lead}
                      </p>
                      <div className="home-pushed-spotlight-meta">
                        <span>By <strong>{currentSpotlight.author?.name || 'Staff'}</strong></span>
                        <span>•</span>
                        <span>{getTimeAgo(currentSpotlight.publishedAt || currentSpotlight.createdAt)}</span>
                        <span>•</span>
                        <span className="home-pushed-spotlight-category">
                          {currentSpotlight.category?.toUpperCase()}
                        </span>
                      </div>
                      <Link to={`/article/${currentSpotlight.slug}`} className="home-pushed-spotlight-btn">
                        Read Spotlight Story <span>→</span>
                      </Link>
                    </div>

                    {spotlightFeatures.length > 1 && (
                      <div className="home-pushed-carousel-dots">
                        {spotlightFeatures.map((_, idx) => (
                          <button 
                            key={idx}
                            className={`home-pushed-carousel-dot ${idx === (currentPushIndex % spotlightFeatures.length) ? 'active' : ''}`}
                            onClick={() => setCurrentPushIndex(idx)}
                            aria-label={`Go to slide ${idx + 1}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Right Column: Web Stories Horizontal Card Feed */}
              <div className="home-first-row-stories-col">
                <WebStoriesSection 
                  articles={webStories} 
                  onSelectStory={(index) => setSelectedStoryIndex(index)}
                  hasMore={hasMoreStories}
                  loadingMore={loadingMoreStories}
                  onLoadMore={loadMoreStories}
                  initialLoading={storiesLoading}
                />
              </div>
            </div>

            {/* ── SECOND ROW: Latest News (Left) + Vertical Divider + Trends (5) (Right) ── */}
            <div className="home-second-row-wrapper">
              {/* Left Column: Latest News Split Layout */}
              <div className="home-second-row-latest-col">
                <div className="sketch-latest-news">
                  <div className="sketch-section-header-wrap">
                    <h2 className="sketch-section-title">Latest News</h2>
                    <Link to="/news?recent=true" className="sketch-explore-btn">
                      Explore <FiArrowRight size={13} />
                    </Link>
                  </div>
                  
                  {recentArticles.length > 0 && (
                    <div className="home-latest-news-split-layout">
                      {/* Left Big Card */}
                      {(() => {
                        const firstArt = recentArticles[0];
                        return (
                          <div className="latest-news-left-big-card">
                            <Link to={`/article/${firstArt.slug}`} className="latest-news-big-img-link">
                              {firstArt.coverImage && (
                                <img src={getImageUrl(firstArt.coverImage)} alt={firstArt.title} className="latest-news-big-img" loading="lazy" decoding="async" />
                              )}
                              <span className="latest-news-big-cat-badge">{firstArt.category?.toUpperCase()}</span>
                            </Link>
                            <h3 className="latest-news-big-title">
                              <Link to={`/article/${firstArt.slug}`}>{firstArt.title}</Link>
                            </h3>
                            <div className="latest-news-big-meta">
                              BY <strong>{firstArt.author?.name?.toUpperCase() || 'STAFF'}</strong> • {new Date(firstArt.publishedAt || firstArt.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}
                            </div>
                            <p className="latest-news-big-lead">
                              {firstArt.lead}
                            </p>
                          </div>
                        );
                      })()}

                      {/* Right Sub-articles */}
                      {recentArticles.length > 1 && (
                        <div className="latest-news-right-grid">
                          {recentArticles.slice(1, 4).map(art => (
                            <div key={art._id} className="latest-news-small-card">
                              <Link to={`/article/${art.slug}`} className="latest-news-small-img-link">
                                {art.coverImage && (
                                  <img src={getImageUrl(art.coverImage)} alt={art.title} className="latest-news-small-img" loading="lazy" decoding="async" />
                                )}
                              </Link>
                              <h4 className="latest-news-small-title">
                                <Link to={`/article/${art.slug}`}>{art.title}</Link>
                              </h4>
                              <div className="latest-news-small-meta">
                                {new Date(art.publishedAt || art.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Center Vertical Divider */}
              <div className="home-row2-divider" />

              {/* Right Column: Trends (5) Top 5 List */}
              <div className="home-second-row-trending-col">
                <div className="sketch-section-header-wrap">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h2 className="sketch-section-title">Trends (5)</h2>
                    <span className="sketch-top5-badge">TOP 5</span>
                  </div>
                  <Link to="/news?tab=trending" className="sketch-explore-btn">
                    Explore <FiArrowRight size={13} />
                  </Link>
                </div>

                <div className="sketch-trends-5-list">
                  {trendingArticles.slice(0, 5).map((art, idx) => (
                    <div key={art._id || idx} className="sketch-trends-5-item">
                      <span className="sketch-trends-rank-num">#{idx + 1}</span>
                      {art.coverImage && (
                        <img src={getImageUrl(art.coverImage)} alt={art.title} className="sketch-trends-5-img" loading="lazy" decoding="async" />
                      )}
                      <div className="sketch-trends-5-content">
                        <h3 className="sketch-trends-5-title">
                          <Link to={`/article/${art.slug}`}>{art.title}</Link>
                        </h3>
                        <div className="sketch-trends-5-meta">
                          <span>By {art.author?.name || 'Staff'}</span>
                          <span>•</span>
                          <span>{getTimeAgo(art.publishedAt || art.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── THIRD ROW: Active Monitor (Filters, View Switcher, Tags, Grid/List) ── */}
            <section className="active-monitor-section">
              <div className="active-monitor-header-row">
                <div className="active-monitor-heading-group">
                  <h2 className="active-monitor-title">Active Monitor</h2>
                  <span className="active-monitor-pulse-badge">
                    <span className="active-monitor-pulse-dot" /> Live Campus Stream
                  </span>
                </div>
              </div>

              {/* Controls: filters -> and switch view := / ⊞ */}
              <div className="active-monitor-controls-row">
                <div className="active-monitor-filters-group">
                  <span className="active-monitor-filters-label">filters →</span>
                  <button
                    type="button"
                    onClick={() => setMonitorFilter('trends')}
                    className={`active-monitor-filter-pill ${monitorFilter === 'trends' ? 'active' : ''}`}
                  >
                    {monitorFilter === 'trends' && <FiCheck size={14} />}
                    <span>Trends</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMonitorFilter('viewed')}
                    className={`active-monitor-filter-pill ${monitorFilter === 'viewed' ? 'active' : ''}`}
                  >
                    <FiEye size={14} />
                    <span>Most Viewed</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMonitorFilter('liked')}
                    className={`active-monitor-filter-pill ${monitorFilter === 'liked' ? 'active' : ''}`}
                  >
                    <FiHeart size={14} />
                    <span>Most Liked</span>
                  </button>
                </div>

                <div className="active-monitor-view-toggle" title="Switch layout view">
                  <button
                    type="button"
                    onClick={() => setMonitorView('grid')}
                    className={`active-monitor-view-btn ${monitorView === 'grid' ? 'active' : ''}`}
                    aria-label="Grid View"
                    title="Grid View (⊞)"
                  >
                    <FiGrid size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMonitorView('list')}
                    className={`active-monitor-view-btn ${monitorView === 'list' ? 'active' : ''}`}
                    aria-label="List View"
                    title="List View (:=)"
                  >
                    <FiList size={15} />
                  </button>
                </div>
              </div>

              {/* Tags Row: Most searched tags */}
              {trendingTags.length > 0 && (
                <div className="active-monitor-tags-bar">
                  <span className="active-monitor-tags-label">Most Searched Tags:</span>
                  {trendingTags.slice(0, 8).map((t) => {
                    const rawName = typeof t === 'string' ? t : (t?.tag || '');
                    let cleanName = rawName;
                    try {
                      cleanName = decodeURIComponent(rawName).trim();
                    } catch (e) {
                      cleanName = rawName.trim();
                    }
                    const displayTag = cleanName.replace(/^#/, '');
                    if (!displayTag) return null;
                    return (
                      <Link key={rawName} to={`/tag/${encodeURIComponent(displayTag)}`} className="active-monitor-tag-pill">
                        #{displayTag}
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Articles Display (Grid or List) */}
              {activeMonitorArticles.length === 0 ? (
                <div className="nm-empty">No articles available in this monitor feed right now.</div>
              ) : monitorView === 'grid' ? (
                <div className="active-monitor-grid">
                  {activeMonitorArticles.slice(0, 6).map((art) => (
                    <div key={art._id} className="active-monitor-grid-card">
                      <div className="active-monitor-card-img-wrap">
                        {art.coverImage ? (
                          <img src={getImageUrl(art.coverImage)} alt={art.title} className="active-monitor-card-img" loading="lazy" decoding="async" />
                        ) : (
                          <div className="home-web-story-img-placeholder" />
                        )}
                        <span className="active-monitor-card-badge">{art.category?.toUpperCase() || 'NEWS'}</span>
                        <Link 
                          to={`/article/${art.slug}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="active-monitor-card-open-btn"
                          title="Open article in new tab"
                        >
                          <FiExternalLink size={13} />
                        </Link>
                      </div>
                      <div className="active-monitor-card-body">
                        <h3 className="active-monitor-card-title">
                          <Link to={`/article/${art.slug}`}>{art.title}</Link>
                        </h3>
                        <p className="active-monitor-card-lead">{art.lead}</p>
                        <div className="active-monitor-card-footer">
                          <span>By {art.author?.name || 'Staff'} • {getTimeAgo(art.publishedAt || art.createdAt)}</span>
                          {monitorFilter === 'viewed' && (
                            <span style={{ fontWeight: 700, color: 'var(--accent-color)' }}>
                              👁 {art.views || 0}
                            </span>
                          )}
                          {monitorFilter === 'liked' && (
                            <span style={{ fontWeight: 700, color: '#ec4899' }}>
                              ❤️ {art.likes?.length || 0}
                            </span>
                          )}
                          {monitorFilter === 'trends' && (
                            <span style={{ fontWeight: 700, color: '#10b981' }}>
                              🔥 {Math.round(art.trendingScore || 0)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="active-monitor-list">
                  {activeMonitorArticles.slice(0, 6).map((art) => (
                    <div key={art._id} className="active-monitor-list-card">
                      {art.coverImage && (
                        <img src={getImageUrl(art.coverImage)} alt={art.title} className="active-monitor-list-thumb" loading="lazy" decoding="async" />
                      )}
                      <div className="active-monitor-list-content">
                        <h3 className="active-monitor-list-title">
                          <Link to={`/article/${art.slug}`}>{art.title}</Link>
                        </h3>
                        <p className="active-monitor-list-lead">{art.lead}</p>
                        <div className="active-monitor-list-meta">
                          <span className="nm-badge" style={{ background: 'var(--color-gray-100)', color: 'var(--accent-color)', fontSize: '9px' }}>
                            {art.category?.toUpperCase() || 'NEWS'}
                          </span>
                          <span>By {art.author?.name || 'Staff'}</span>
                          <span>•</span>
                          <span>{getTimeAgo(art.publishedAt || art.createdAt)}</span>
                        </div>
                      </div>
                      <div className="active-monitor-list-action">
                        <Link 
                          to={`/article/${art.slug}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="sketch-explore-btn"
                          title="Open article in new tab"
                        >
                          <span>Read</span>
                          <FiExternalLink size={12} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── FOURTH ROW: 3-Column Curated Layout (News | Features | Editorial) ── */}
            <section className="curated-desk-section">
              <div className="curated-desk-banner">
                <h2 className="curated-desk-main-title">Curated Desk</h2>
                <span className="curated-desk-tagline">News • Features • Editorial</span>
              </div>

              <div className="curated-desk-grid">
                {/* Column 1: News (Title + Desc) */}
                <div className="curated-column">
                  <div className="curated-column-header">
                    <h3 className="curated-column-title">News</h3>
                    <Link to="/news?category=news" className="curated-column-explore">Explore →</Link>
                  </div>
                  <div className="curated-items-stack">
                    {newsArticles.slice(0, 4).map((art) => (
                      <article key={art._id} className="curated-news-item">
                        <h4 className="curated-item-title">
                          <Link to={`/article/${art.slug}`}>{art.title}</Link>
                        </h4>
                        <p className="curated-item-desc">{art.lead}</p>
                        <div className="curated-item-meta">
                          <span>By {art.author?.name || 'Staff'}</span>
                          <span>•</span>
                          <span>{getTimeAgo(art.publishedAt || art.createdAt)}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="curated-column-divider" />

                {/* Column 2: Features (Title + Desc + Thumbnail image [ ]) */}
                <div className="curated-column">
                  <div className="curated-column-header">
                    <h3 className="curated-column-title">Features</h3>
                    <Link to="/news?category=features" className="curated-column-explore">Explore →</Link>
                  </div>
                  <div className="curated-items-stack">
                    {featuresArticles.slice(0, 4).map((art) => (
                      <article key={art._id} className="curated-feature-item">
                        {art.coverImage && (
                          <img src={getImageUrl(art.coverImage)} alt={art.title} className="curated-feature-img" loading="lazy" decoding="async" />
                        )}
                        <div className="curated-feature-content">
                          <h4 className="curated-item-title">
                            <Link to={`/article/${art.slug}`}>{art.title}</Link>
                          </h4>
                          <p className="curated-item-desc">{art.lead}</p>
                          <div className="curated-item-meta">
                            <span>By {art.author?.name || 'Staff'}</span>
                            <span>•</span>
                            <span>{getTimeAgo(art.publishedAt || art.createdAt)}</span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="curated-column-divider" />

                {/* Column 3: Editorial (Title + Quote/Desc + Author) */}
                <div className="curated-column">
                  <div className="curated-column-header">
                    <h3 className="curated-column-title">Editorial</h3>
                    <Link to="/news?category=editorial" className="curated-column-explore">Explore →</Link>
                  </div>
                  <div className="curated-items-stack">
                    {(editorialArticles.length > 0 ? editorialArticles : articles.filter(a => a.category === 'editorial')).slice(0, 4).map((art) => (
                      <article key={art._id} className="curated-editorial-item">
                        <h4 className="curated-item-title">
                          <Link to={`/article/${art.slug}`}>{art.title}</Link>
                        </h4>
                        <p className="curated-editorial-quote">
                          “{getExcerpt(art.body || art.lead)}”
                        </p>
                        <div className="curated-editorial-author">
                          By {art.author?.name || 'Editorial Board'}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      <div className="container">
        {loading ? null : (
          <>
            {/* 10. KYP timeline (horizontal scrollable dot-and-line) */}
            {kypArticles.length > 0 && (
              <section className="kyp-timeline-section" style={{ marginTop: 48 }}>
                <div className="section-header">
                  <h2 className="section-title-cat">Know Your Past Timeline</h2>
                  <Link to="/explore-history" className="section-view-all">Explore History →</Link>
                </div>
                <div className="rule-thick" style={{ marginBottom: 32, height: 2, background: 'var(--color-black)' }} />
                <div className="timeline-horizontal-scroll">
                  <div className="timeline-line" />
                  <div className="timeline-cards">
                    {kypArticles.map((art) => (
                      <div key={art._id} className="timeline-card-item">
                        <div className="timeline-dot" />
                        <span className="timeline-date">{new Date(art.publishedAt || art.createdAt).getFullYear()}</span>
                        <div className="timeline-card-box">
                          <h4 className="timeline-card-title">
                            <Link to={`/article/${art.slug}`}>{art.title}</Link>
                          </h4>
                          <p className="timeline-card-excerpt">{art.lead.slice(0, 80)}...</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* 11. Tea Shop circular board + Pictures Speak photo grid */}
            <div className="tea-and-pics-grid" style={{ marginTop: 48, marginBottom: 48 }}>
              {/* Tea Shop chalkboard circular board */}
              <section className="tea-shop-board-section">
                <h3 className="section-title-cat">☕ Tea Shop circulars</h3>
                <div className="rule-thick" style={{ marginBottom: 20, height: 2, background: 'var(--color-black)' }} />
                <div className="tea-shop-chalkboard">
                  <div className="chalkboard-title">University Circulars & Minds</div>
                  <div className="chalkboard-items">
                    {teaShopArticles.map((art) => (
                      <div key={art._id} className="chalkboard-item">
                        <span className="chalk-bullet">📌</span>
                        <div className="chalk-content">
                          <Link to={`/article/${art.slug}`} className="chalk-link">{art.title}</Link>
                          <span className="chalk-date">{new Date(art.publishedAt || art.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Pictures Speak photo grid */}
              <section className="pictures-speak-grid-section">
                <h3 className="section-title-cat">📷 Picture's Speak</h3>
                <div className="rule-thick" style={{ marginBottom: 20, height: 2, background: 'var(--color-black)' }} />
                <div className="pics-speak-gallery-grid">
                  {picsArticles.map((art) => (
                    <div 
                      key={art._id} 
                      className="gallery-photo-card"
                      onClick={() => setSelectedPicId(art.slug)}
                      style={{ cursor: 'pointer' }}
                    >
                      <img src={getImageUrl(art.coverImage)} alt={art.title} className="gallery-photo-img" loading="lazy" decoding="async" />
                      <div className="gallery-photo-overlay">
                        <h4 className="gallery-photo-title">
                          <span style={{ color: '#fff' }}>{art.title}</span>
                        </h4>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

          </>
        )}
      </div>

      {/* Fullscreen Popup Modal for Picture's Speak */}
      {selectedPicId && (
        <PictureSpeakModal 
          articleId={selectedPicId} 
          onClose={() => setSelectedPicId(null)} 
          articlesList={picsArticles}
        />
      )}

      {/* Center of Screen Interactive Web Story Modal */}
      {selectedStoryIndex !== null && (
        <WebStoryModal 
          stories={webStories} 
          initialIndex={selectedStoryIndex} 
          onClose={() => setSelectedStoryIndex(null)}
          hasMore={hasMoreStories}
          loadingMore={loadingMoreStories}
          onLoadMore={loadMoreStories}
        />
      )}
    </main>
  );
};

export default HomePage;
