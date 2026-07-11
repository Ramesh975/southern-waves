import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API, { articleAPI } from '../services/api';
import { getImageUrl } from '../components/ArticleComponents';
import TrendingWidget from '../components/TrendingWidget';
import MostReadWidget from '../components/MostReadWidget';
import CategorySection from '../components/CategorySection';
import PictureSpeakModal from '../components/PictureSpeakModal';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { FiStar, FiLock, FiChevronRight, FiTrendingUp, FiEye, FiHeart, FiMaximize2 } from 'react-icons/fi';
import './NewsMenu.css';

const HomePage = () => {
  const [articles, setArticles] = useState([]);
  const [editorialSpotlight, setEditorialSpotlight] = useState(null);
  const [featuresArticles, setFeaturesArticles] = useState([]);
  const [kypArticles, setKypArticles] = useState([]);
  const [teaShopArticles, setTeaShopArticles] = useState([]);
  const [picsArticles, setPicsArticles] = useState([]);
  const [pushedArticles, setPushedArticles] = useState([]);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [submittingNewsletter, setSubmittingNewsletter] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [foryouArticles, setForyouArticles] = useState([]);
  const [homeInterests, setHomeInterests] = useState(null);
  const [foryouLoading, setForyouLoading] = useState(true);

  const [trendingArticles, setTrendingArticles] = useState([]);
  const [newsArticles, setNewsArticles] = useState([]);
  const [trendingTags, setTrendingTags] = useState([]);
  const [mostViewedArticles, setMostViewedArticles] = useState([]);
  const [mostLikedArticles, setMostLikedArticles] = useState([]);
  const [activeStreamTab, setActiveStreamTab] = useState('recommended');
  const [selectedPicId, setSelectedPicId] = useState(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [currentPushIndex, setCurrentPushIndex] = useState(0);

  useEffect(() => {
    if (pushedArticles.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentPushIndex((prev) => (prev + 1) % pushedArticles.length);
    }, 6000); // 6s auto slide
    return () => clearInterval(interval);
  }, [pushedArticles.length]);

  useEffect(() => {
    const fallback = { data: { data: [] } };
    Promise.all([
      articleAPI.getAll({ status: 'published', limit: 12 }).catch(err => { console.error('Error fetching all articles:', err); return fallback; }),
      articleAPI.getAll({ category: 'editorial', status: 'published', limit: 1 }).catch(err => { console.error('Error fetching editorial spotlight:', err); return fallback; }),
      articleAPI.getAll({ category: 'features', status: 'published', limit: 4 }).catch(err => { console.error('Error fetching features articles:', err); return fallback; }),
      articleAPI.getAll({ category: 'kyp', status: 'published', limit: 6 }).catch(err => { console.error('Error fetching kyp articles:', err); return fallback; }),
      articleAPI.getAll({ category: 'tea-shop', status: 'published', limit: 3 }).catch(err => { console.error('Error fetching tea-shop articles:', err); return fallback; }),
      articleAPI.getAll({ category: 'pictures-speak', status: 'published', limit: 6 }).catch(err => { console.error('Error fetching pictures-speak articles:', err); return fallback; }),
      articleAPI.getTrending().catch(err => { console.error('Error fetching trending articles:', err); return fallback; }),
      articleAPI.getTrendingTags().catch(err => { console.error('Error fetching trending tags:', err); return fallback; }),
      articleAPI.getMostRead({ limit: 6 }).catch(err => { console.error('Error fetching most read articles:', err); return fallback; }),
      articleAPI.getMostLiked({ limit: 6 }).catch(err => { console.error('Error fetching most liked articles:', err); return fallback; }),
      articleAPI.getAll({ pushedToHome: 'true', status: 'published', limit: 5 }).catch(err => { console.error('Error fetching pushed spotlight articles:', err); return fallback; }),
      articleAPI.getAll({ category: 'news', status: 'published', limit: 6 }).catch(err => { console.error('Error fetching news articles:', err); return fallback; }),
    ])
      .then(([allRes, edSpotRes, featRes, kypRes, teaRes, picsRes, trendRes, tagsRes, mostReadRes, mostLikedRes, pushRes, newsRes]) => {
        const getArray = (res) => Array.isArray(res?.data?.data) ? res.data.data : [];
        
        setArticles(getArray(allRes));
        setEditorialSpotlight(getArray(edSpotRes)[0] || null);
        setFeaturesArticles(getArray(featRes));
        setKypArticles(getArray(kypRes));
        setTeaShopArticles(getArray(teaRes));
        setPicsArticles(getArray(picsRes));
        setTrendingArticles(getArray(trendRes).slice(0, 6));
        setTrendingTags(getArray(tagsRes).slice(0, 10));
        setMostViewedArticles(getArray(mostReadRes));
        setMostLikedArticles(getArray(mostLikedRes));
        setPushedArticles(getArray(pushRes));
        setNewsArticles(getArray(newsRes));
      })
      .catch((err) => {
        console.error('Failed to load homepage data:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setForyouLoading(true);
    articleAPI.getRecommendations()
      .then((res) => {
        setForyouArticles(res.data?.data || []);
        setHomeInterests(res.data?.userInterests || null);
      })
      .catch((err) => console.error('Failed to load homepage recommendations:', err))
      .finally(() => setForyouLoading(false));
  }, [user]);

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    setSubmittingNewsletter(true);
    try {
      await API.post('/newsletter/subscribe', { email: newsletterEmail });
      toast.success('Subscribed successfully! Check your inbox.');
      setNewsletterEmail('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Subscription failed');
    } finally {
      setSubmittingNewsletter(false);
    }
  };

  const featuredArticles = articles.filter(a => a.isFeatured).slice(0, 5);
  if (featuredArticles.length === 0 && articles.length > 0) {
    featuredArticles.push(...articles.slice(0, 5));
  }
  const currentHero = featuredArticles[currentSlideIndex] || articles[0];
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
            {/* 4. Sketch Layout */}
            <div className="sketch-home-grid">
              
              {/* LEFT COLUMN: Spotlight Carousel & Latest News */}
              <div className="sketch-left-column">
                
                {/* Spotlight Carousel (Max 5 pushed articles) */}
                {pushedArticles.length > 0 ? (
                  <div className="home-pushed-spotlight-banner">
                    {/* Full-width Background Image */}
                    {pushedArticles[currentPushIndex].coverImage && (
                      <img 
                        src={getImageUrl(pushedArticles[currentPushIndex].coverImage)} 
                        alt={pushedArticles[currentPushIndex].title} 
                        className="home-pushed-spotlight-bg-img" 
                      />
                    )}
                    
                    {/* Dark Gradient Fog Overlay */}
                    <div className="home-pushed-spotlight-fog-overlay" />

                    {/* Active Slide Content Overlaid */}
                    <div className="home-pushed-spotlight-content-overlaid">
                      <div className="home-pushed-spotlight-badge">
                        <span className="home-pushed-badge-pulse" />
                        ADMIN'S SPECIAL SPOTLIGHT
                      </div>
                      <h2 className="home-pushed-spotlight-title">
                        <Link to={`/article/${pushedArticles[currentPushIndex].slug}`}>
                          {pushedArticles[currentPushIndex].title}
                        </Link>
                      </h2>
                      <p className="home-pushed-spotlight-lead">
                        {pushedArticles[currentPushIndex].lead}
                      </p>
                      <div className="home-pushed-spotlight-meta">
                        <span>By <strong>{pushedArticles[currentPushIndex].author?.name || 'Staff'}</strong></span>
                        <span>•</span>
                        <span>{getTimeAgo(pushedArticles[currentPushIndex].publishedAt || pushedArticles[currentPushIndex].createdAt)}</span>
                        <span>•</span>
                        <span className="home-pushed-spotlight-category">
                          {pushedArticles[currentPushIndex].category?.toUpperCase()}
                        </span>
                      </div>
                      <Link to={`/article/${pushedArticles[currentPushIndex].slug}`} className="home-pushed-spotlight-btn">
                        Read Spotlight Story <span>→</span>
                      </Link>
                    </div>

                    {/* Carousel Navigation Dots */}
                    {pushedArticles.length > 1 && (
                      <div className="home-pushed-carousel-dots">
                        {pushedArticles.map((_, idx) => (
                          <button 
                            key={idx}
                            className={`home-pushed-carousel-dot ${idx === currentPushIndex ? 'active' : ''}`}
                            onClick={() => setCurrentPushIndex(idx)}
                            aria-label={`Go to slide ${idx + 1}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Fallback to regular featured carousel if no spotlight articles are pushed */
                  currentHero && (
                    <div className="sketch-hero-carousel">
                      <img className="sketch-hero-img" src={getImageUrl(currentHero.coverImage)} alt={currentHero.title} />
                      <div className="sketch-hero-fog-overlay">
                        <h1 className="sketch-hero-title">
                          <Link to={`/article/${currentHero.slug}`}>{currentHero.title}</Link>
                        </h1>
                        <p className="sketch-hero-lead">{currentHero.lead}</p>
                      </div>
                      
                      {/* Dots */}
                      {featuredArticles.length > 1 && (
                        <div className="sketch-hero-dots">
                          {featuredArticles.map((_, idx) => (
                            <button 
                              key={idx} 
                              className={`sketch-hero-dot ${idx === currentSlideIndex ? 'active' : ''}`}
                              onClick={() => setCurrentSlideIndex(idx)}
                              aria-label={`Go to slide ${idx + 1}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                )}

                {/* Latest News */}
                <div className="sketch-latest-news">
                  <div className="sketch-latest-news-header-wrap">
                    <h2 className="sketch-latest-news-header">Latest News</h2>
                    <Link to="/news?recent=true" className="latest-news-view-all">View All</Link>
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
                                <img src={getImageUrl(firstArt.coverImage)} alt={firstArt.title} className="latest-news-big-img" />
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

                      {/* Right 2x2 Grid of Smaller Cards */}
                      {recentArticles.length > 1 && (
                        <div className="latest-news-right-grid">
                          {recentArticles.slice(1, 5).map(art => (
                            <div key={art._id} className="latest-news-small-card">
                              <Link to={`/article/${art.slug}`} className="latest-news-small-img-link">
                                {art.coverImage && (
                                  <img src={getImageUrl(art.coverImage)} alt={art.title} className="latest-news-small-img" />
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

              {/* RIGHT COLUMN: Trending List & Tags */}
              <div className="sketch-right-column">
                
                <h2 className="sketch-trending-header">TRENDING</h2>
                <div className="sketch-trending-list">
                  {trendingArticles.map((art) => (
                    <div key={art._id} className="sketch-trending-item">
                      {art.coverImage && (
                        <img src={getImageUrl(art.coverImage)} alt={art.title} className="sketch-trending-img" />
                      )}
                      <div className="sketch-trending-content">
                        <h3 className="sketch-trending-title">
                          <Link to={`/article/${art.slug}`}>{art.title}</Link>
                        </h3>
                        <p style={{ fontSize: 12, margin: '4px 0', color: 'var(--color-gray-700)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {art.lead}
                        </p>
                        <div className="sketch-trending-meta">
                          {new Date(art.publishedAt || art.createdAt).toLocaleDateString()} • By {art.author?.name}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <h2 className="sketch-tags-header">Trending tags</h2>
                <div className="sketch-tags-list">
                  {trendingTags.map((t) => (
                    <Link key={t.tag} to={`/tag/${t.tag}`} className="sketch-tag-pill">
                      {t.tag}
                    </Link>
                  ))}
                </div>

              </div>
            </div>

            {/* The Luxury Streams Tab Panel */}
            <section className="home-foryou-section" style={{ marginTop: 48 }}>
              
              {/* Luxury Tabs Header */}
              <div className="section-header" style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'stretch' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 className="section-title-cat" style={{ fontFamily: 'Playfair Display, serif', fontWeight: 800, fontSize: 24, margin: 0 }}>
                    THE CURRENT STREAM
                  </h2>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Live Campus Feeds
                  </span>
                </div>
                
                {/* Tab selector bar */}
                <div className="luxury-feed-tabs" style={{ display: 'flex', borderBottom: '2px solid var(--color-black)', paddingBottom: '0', overflowX: 'auto', gap: '8px' }}>
                  <button 
                    onClick={() => setActiveStreamTab('recommended')}
                    className={`luxury-tab-btn ${activeStreamTab === 'recommended' ? 'active' : ''}`}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: '12px 16px',
                      fontSize: '12px',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      borderBottom: activeStreamTab === 'recommended' ? '4px solid var(--accent-color, #ff0055)' : '4px solid transparent',
                      color: activeStreamTab === 'recommended' ? 'var(--accent-color, #ff0055)' : 'var(--color-gray-600)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <FiStar /> Recommended
                  </button>
                  <button 
                    onClick={() => setActiveStreamTab('trending')}
                    className={`luxury-tab-btn ${activeStreamTab === 'trending' ? 'active' : ''}`}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: '12px 16px',
                      fontSize: '12px',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      borderBottom: activeStreamTab === 'trending' ? '4px solid var(--accent-color, #ff0055)' : '4px solid transparent',
                      color: activeStreamTab === 'trending' ? 'var(--accent-color, #ff0055)' : 'var(--color-gray-600)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <FiTrendingUp /> Trending Now
                  </button>
                  <button 
                    onClick={() => setActiveStreamTab('viewed')}
                    className={`luxury-tab-btn ${activeStreamTab === 'viewed' ? 'active' : ''}`}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: '12px 16px',
                      fontSize: '12px',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      borderBottom: activeStreamTab === 'viewed' ? '4px solid var(--accent-color, #ff0055)' : '4px solid transparent',
                      color: activeStreamTab === 'viewed' ? 'var(--accent-color, #ff0055)' : 'var(--color-gray-600)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <FiEye /> Most Viewed
                  </button>
                  <button 
                    onClick={() => setActiveStreamTab('liked')}
                    className={`luxury-tab-btn ${activeStreamTab === 'liked' ? 'active' : ''}`}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: '12px 16px',
                      fontSize: '12px',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      borderBottom: activeStreamTab === 'liked' ? '4px solid var(--accent-color, #ff0055)' : '4px solid transparent',
                      color: activeStreamTab === 'liked' ? 'var(--accent-color, #ff0055)' : 'var(--color-gray-600)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <FiHeart /> Most Liked
                  </button>
                </div>
              </div>

              <div className="home-foryou-grid" style={{ marginTop: '24px' }}>
                {/* Left 2/3: Active Stream Articles Feed */}
                <div className="home-foryou-feed-col">
                  {loading || (activeStreamTab === 'recommended' && foryouLoading) ? (
                    <div className="nm-mini-spinner" style={{ margin: '40px auto' }} />
                  ) : (activeStreamTab === 'recommended' ? foryouArticles : activeStreamTab === 'trending' ? trendingArticles : activeStreamTab === 'viewed' ? mostViewedArticles : mostLikedArticles).length === 0 ? (
                    <div className="nm-empty" style={{ padding: '40px 0', textAlign: 'center', border: '1px dashed var(--color-gray-300)' }}>
                      No articles in this feed right now.
                    </div>
                  ) : (
                    <div className="home-foryou-cards" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {(activeStreamTab === 'recommended' ? foryouArticles : activeStreamTab === 'trending' ? trendingArticles : activeStreamTab === 'viewed' ? mostViewedArticles : mostLikedArticles).slice(0, 4).map(art => (
                        <div key={art._id} className="home-foryou-card" style={{ display: 'flex', gap: '20px', padding: '16px', border: '1px solid var(--color-gray-200)', background: 'var(--color-white)', transition: 'transform 0.2s, box-shadow 0.2s' }}>
                          {art.coverImage && (
                            <div className="home-foryou-card-img-wrapper" style={{ width: '140px', height: '90px', flexShrink: 0, overflow: 'hidden' }}>
                              <img src={getImageUrl(art.coverImage)} alt={art.title} className="home-foryou-card-img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          )}
                          <div className="home-foryou-card-content" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                            {art.recommendationRationale && activeStreamTab === 'recommended' && (
                              <span className="home-foryou-card-rationale" style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--accent-color, #ff0055)', fontWeight: '800', marginBottom: '4px' }}>
                                {art.recommendationRationale}
                              </span>
                            )}
                            {activeStreamTab === 'trending' && (
                              <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#10b981', fontWeight: '800', marginBottom: '4px' }}>
                                🔥 Trending Score: {Math.round(art.trendingScore || 0)}
                              </span>
                            )}
                            {activeStreamTab === 'viewed' && (
                              <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#06b6d4', fontWeight: '800', marginBottom: '4px' }}>
                                👁️ {art.views || 0} Views
                              </span>
                            )}
                            {activeStreamTab === 'liked' && (
                              <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#ec4899', fontWeight: '800', marginBottom: '4px' }}>
                                ❤️ {art.likes?.length || 0} Hypes
                              </span>
                            )}
                            <h3 className="home-foryou-card-title" style={{ fontSize: '16px', margin: '0 0 6px 0', fontWeight: '800', fontFamily: 'var(--font-serif), Georgia, serif' }}>
                              <Link to={`/article/${art.slug}`} style={{ color: 'var(--color-black)', textDecoration: 'none' }}>{art.title}</Link>
                            </h3>
                            <p className="home-foryou-card-excerpt" style={{ fontSize: '12px', color: 'var(--color-gray-600)', margin: '0 0 8px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {art.lead}
                            </p>
                            <div className="home-foryou-card-meta" style={{ fontSize: '11px', display: 'flex', gap: '8px', color: 'var(--color-gray-500)', marginTop: 'auto' }}>
                              <span>By {art.author?.name || 'Student'}</span>
                              <span>•</span>
                              <span>{getTimeAgo(art.publishedAt || art.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right 1/3: Personalization Dashboard Callout / Interests */}
                <div className="home-foryou-side-col">
                  {!user ? (
                    <div className="home-foryou-promo-card">
                      <div className="promo-icon-wrapper">
                        <FiLock size={20} />
                      </div>
                      <h4>Unlock Custom Feed</h4>
                      <p>Sign in to build your campus reading profile and receive smart, tailored updates based on your interests.</p>
                      <Link to="/login" className="promo-btn">
                        Sign In Now
                      </Link>
                    </div>
                  ) : (
                    <div className="home-foryou-profile-card">
                      <h4>Your Interests</h4>
                      <p style={{ fontSize: 11, color: 'var(--color-gray-500)', margin: '0 0 16px 0' }}>AI-inferred from saves, likes, and views</p>
                      
                      {homeInterests && (homeInterests.categories?.length > 0 || homeInterests.tags?.length > 0) ? (
                        <div className="home-foryou-interests-list">
                          {homeInterests.categories?.slice(0, 3).map(cat => (
                            <div key={cat.category} className="home-foryou-interest-bar">
                              <div className="interest-bar-info">
                                <span className="interest-bar-name">{cat.category.toUpperCase()}</span>
                                <span className="interest-bar-val">{cat.weight} pts</span>
                              </div>
                              <div className="interest-bar-track">
                                <div 
                                  className="interest-bar-fill" 
                                  style={{ 
                                    width: `${Math.min(100, Math.max(15, (cat.weight / (homeInterests.categories[0]?.weight || 1)) * 100))}%`,
                                    backgroundColor: 'var(--nm-accent)'
                                  }} 
                                  />
                              </div>
                            </div>
                          ))}
                          
                          <div className="home-foryou-interest-tags" style={{ marginTop: 16 }}>
                            {homeInterests.tags?.slice(0, 4).map(t => (
                              <Link key={t.tag} to={`/tag/${t.tag}`} className="home-foryou-tag">
                                #{t.tag}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="home-foryou-profile-empty">
                          <FiStar size={20} style={{ color: 'var(--color-gray-300)', marginBottom: 8 }} />
                          <p style={{ fontSize: 12, margin: 0 }}>Start reading to build your profile</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <div className="rule-thick" style={{ margin: '40px 0 24px' }} />

            {/* Main Content Layout with Sticky Sidebar Widget Column */}
            <div className="homepage-main-layout">
              {/* Category Sections */}
              <div className="homepage-sections-area">
                {/* 6. Repeatable CategorySection for News, Editorial, Features */}
                <CategorySection category="news" />
                <div className="rule" style={{ margin: '32px 0' }} />
                <CategorySection category="editorial" />
                <div className="rule" style={{ margin: '32px 0' }} />
                <CategorySection category="features" />
              </div>

              {/* Sidebar Widgets Column */}
              <aside className="homepage-sidebar-area">
                <div className="sticky-sidebar">
                  <TrendingWidget />
                </div>
              </aside>
            </div>

            {/* 7. Pull-quote style Editorial spotlight block */}
            {editorialSpotlight && (
              <section className="editorial-spotlight-section">
                <div className="rule-thick" style={{ marginBottom: 16 }} />
                <div className="spotlight-header">EDITORIAL SPOTLIGHT</div>
                <div className="spotlight-body">
                  <blockquote className="spotlight-quote">
                    “{getExcerpt(editorialSpotlight.body)}”
                  </blockquote>
                  <div className="spotlight-meta">
                    <h3 className="spotlight-title">
                      <Link to={`/article/${editorialSpotlight.slug}`}>{editorialSpotlight.title}</Link>
                    </h3>
                    <p className="spotlight-author">Written by <strong>{editorialSpotlight.author?.name}</strong></p>
                  </div>
                </div>
                <div className="rule-thick" style={{ marginTop: 24 }} />
              </section>
            )}

            {/* 8. Magazine-style alternating full-bleed image/text blocks for Features */}
            {featuresArticles.length > 0 && (
              <section className="features-alternating-section" style={{ marginTop: 48 }}>
                <div className="section-header">
                  <h2 className="section-title-cat">Features Showcases</h2>
                </div>
                <div className="rule-thick" style={{ marginBottom: 32, height: 2, background: 'var(--color-black)' }} />
                <div className="alternating-rows">
                  {featuresArticles.map((art, index) => {
                    const isEven = index % 2 === 0;
                    return (
                      <div key={art._id} className={`alternating-row ${isEven ? 'row-normal' : 'row-reverse'}`}>
                        <div className="alternating-img-container">
                          <img src={getImageUrl(art.coverImage)} alt={art.title} className="alternating-img" />
                        </div>
                        <div className="alternating-text-container">
                          <span className="alternating-cat">FEATURES</span>
                          <h3 className="alternating-title">
                            <Link to={`/article/${art.slug}`}>{art.title}</Link>
                          </h3>
                          <p className="alternating-lead">{art.lead}</p>
                          <Link to={`/article/${art.slug}`} className="btn-read-more">Read Showcase →</Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* 9. Newsletter signup band */}
      <section className="newsletter-band">
        <div className="container newsletter-band-inner">
          <div className="newsletter-text">
            <h3 className="newsletter-title">Subscribe to the Wave</h3>
            <p className="newsletter-subtitle">Get the latest campus news, student laws, and circle happenings sent directly to your inbox weekly.</p>
          </div>
          <form className="newsletter-form" onSubmit={handleNewsletterSubmit}>
            <input
              type="email"
              className="newsletter-input"
              placeholder="Enter your student email..."
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              required
            />
            <button type="submit" className="newsletter-btn" disabled={submittingNewsletter}>
              {submittingNewsletter ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>
        </div>
      </section>

      <div className="container">
        {loading ? null : (
          <>
            {/* 10. KYP timeline (horizontal scrollable dot-and-line) */}
            {kypArticles.length > 0 && (
              <section className="kyp-timeline-section" style={{ marginTop: 48 }}>
                <div className="section-header">
                  <h2 className="section-title-cat">Know Your Past Timeline</h2>
                  <Link to="/know-your-past" className="section-view-all">Explore History →</Link>
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
                      <img src={getImageUrl(art.coverImage)} alt={art.title} className="gallery-photo-img" />
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

            {/* Featured in Bottom Row with Small Height and Spinning Effect */}
            {featuredArticles.length > 0 && (
              <section className="home-featured-bottom-row-section" style={{ marginTop: 48, marginBottom: 24 }}>
                <h3 className="section-title-cat">⭐ FEATURED SPOTLIGHTS</h3>
                <div className="rule-thick" style={{ marginBottom: 20, height: 2, background: 'var(--color-black)' }} />
                <div className="featured-bottom-row-scroll-container">
                  <div className="featured-bottom-row-track">
                    {featuredArticles.map(art => (
                      <Link key={art._id} to={`/article/${art.slug}`} className="featured-bottom-row-card">
                        {art.coverImage && (
                          <div className="featured-bottom-row-img-wrapper">
                            <img src={getImageUrl(art.coverImage)} alt={art.title} className="featured-bottom-row-img" />
                          </div>
                        )}
                        <div className="featured-bottom-row-info">
                          <h4 className="featured-bottom-row-title">{art.title}</h4>
                          <span className="featured-bottom-row-cat">{art.category?.toUpperCase()}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Fullscreen Popup Modal */}
      {selectedPicId && (
        <PictureSpeakModal 
          articleId={selectedPicId} 
          onClose={() => setSelectedPicId(null)} 
          articlesList={picsArticles}
        />
      )}
    </main>
  );
};

export default HomePage;
