import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiStar, FiLock, FiLayers, FiHash, FiAward, FiCheckCircle } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { articleAPI } from '../services/api';
import NewsArticleCard from './NewsArticleCard';

const ForYouTab = ({ highlightId, onReply, onComment }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [recommendations, setRecommendations] = useState([]);
  const [interests, setInterests] = useState({ categories: [], tags: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    articleAPI.getRecommendations()
      .then((res) => {
        setRecommendations(res.data?.data || []);
        setInterests(res.data?.userInterests || { categories: [], tags: [] });
      })
      .catch((err) => {
        console.error('Failed to fetch recommendations:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user]);

  // Color mapping helper for category interest bars
  const getCategoryColor = (cat) => {
    const colors = {
      news: '#0055a4',
      editorial: '#ef4444',
      features: '#10b981',
      kyp: '#8b5cf6',
      'tea-shop': '#f59e0b',
      'pictures-speak': '#ec4899'
    };
    return colors[cat.toLowerCase()] || '#6b7280';
  };

  const getGreeting = () => {
    const hrs = new Date().getHours();
    let greet = 'Good Day';
    if (hrs < 12) greet = 'Good Morning';
    else if (hrs < 18) greet = 'Good Afternoon';
    else greet = 'Good Evening';
    return user ? `${greet}, ${user.name}` : `${greet}!`;
  };

  if (loading) {
    return (
      <div className="nm-loading">
        <div className="nm-spinner-ring" />
        <span>Analyzing your reading history & updates...</span>
      </div>
    );
  }

  // GUEST STATE
  if (!user) {
    return (
      <div className="nm-foryou-guest-container">
        {/* Glassmorphic Callout Box */}
        <div className="nm-foryou-lock-overlay">
          <div className="nm-lock-card">
            <div className="nm-lock-icon-wrapper">
              <FiLock size={32} className="nm-lock-icon" />
            </div>
            <h2 className="nm-lock-title">Unlock Your Personal Wave</h2>
            <p className="nm-lock-subtitle">
              Sign in to build your reading profile! Get AI-curated article recommendations based on your views, likes, and bookmarks.
            </p>
            <button className="nm-lock-btn-cta" onClick={() => navigate('/login')}>
              <FiStar size={16} /> Sign In to Personalize
            </button>
          </div>
        </div>

        {/* Blurred Demo Content Background */}
        <div className="nm-foryou-blur-bg">
          <div className="nm-section-header">
            <FiStar size={15} />
            <span className="nm-section-title">Personalized Briefing</span>
          </div>
          <div className="nm-demo-blur-list">
            {[1, 2, 3].map(i => (
              <div key={i} className="nm-demo-blur-card">
                <div className="nm-demo-line short" />
                <div className="nm-demo-line long" />
                <div className="nm-demo-line medium" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const hasInterests = interests.categories.length > 0 || interests.tags.length > 0;

  return (
    <div className="nm-foryou-layout">
      {/* Dynamic Header Greeting */}
      <div className="nm-foryou-greeting-band">
        <div className="nm-foryou-greeting-text">
          <h2 className="nm-foryou-hello">{getGreeting()} 🌊</h2>
          <p className="nm-foryou-tagline">Here is your tailored briefing based on your reading behavior.</p>
        </div>
        <div 
          className="nm-foryou-badge-pill" 
          onClick={() => window.dispatchEvent(new CustomEvent('open-account-settings', { detail: { tab: 'recommendations' } }))}
          style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <FiStar className="nm-sparkle-spin" />
          <span>Tune Feed Settings</span>
        </div>
      </div>

      <div className="nm-foryou-columns">
        {/* Left Column: Recommendations Feed */}
        <div className="nm-foryou-feed">
          <div className="nm-section-header">
            <FiStar size={15} style={{ color: 'var(--nm-accent-2)' }} />
            <span className="nm-section-title">Recommended Stories</span>
            <span className="nm-section-rule" />
          </div>

          <div className="nm-feed-list">
            {recommendations.map(art => (
              <div key={art._id} className="nm-recommendation-wrapper">
                {art.recommendationRationale && (
                  <div className="nm-recommendation-rationale">
                    <span className="nm-rationale-dot" />
                    <span>{art.recommendationRationale}</span>
                  </div>
                )}
                <NewsArticleCard
                  article={art}
                  onReply={onReply}
                  onComment={onComment}
                  highlight={highlightId === art._id}
                />
              </div>
            ))}

            {recommendations.length === 0 && (
              <div className="nm-empty">
                <p>No custom recommendations yet. Read, like, and save articles to personalize this space!</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interest profile */}
        <aside className="nm-foryou-sidebar">
          <div className="nm-sidebar-widget nm-interests-widget">
            <h3 className="widget-title">Your Interest Profile</h3>
            <div className="rule-red" style={{ marginBottom: 16 }} />

            {/* Configured Preferences Widget */}
            {user.recommendationSettings && (
              <div className="nm-configured-preferences" style={{
                background: 'rgba(0,0,0,0.03)',
                border: '2px solid #000',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '20px',
                boxShadow: '3px 3px 0 #000'
              }}>
                <h4 style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#000', margin: '0 0 10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>🎯 Feed Preferences</span>
                  <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('open-account-settings', { detail: { tab: 'recommendations' } }))}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-color, #0055a4)', fontWeight: 800, fontSize: '9.5px', cursor: 'pointer', textTransform: 'uppercase', padding: 0 }}
                  >
                    Tune
                  </button>
                </h4>
                {/* Categories */}
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: '#666', display: 'block', marginBottom: '4px' }}>Sections</span>
                  {user.recommendationSettings.preferredCategories && user.recommendationSettings.preferredCategories.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {user.recommendationSettings.preferredCategories.map(cat => (
                        <span key={cat} style={{ background: '#f3f4f6', border: '1.5px solid #000', color: '#000', padding: '1px 6px', borderRadius: '4px', fontSize: '9.5px', fontWeight: 700, textTransform: 'uppercase' }}>
                          {cat}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#777', fontStyle: 'italic' }}>None selected</span>
                  )}
                </div>
                {/* Tags */}
                <div>
                  <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: '#666', display: 'block', marginBottom: '4px' }}>Favorite Topics</span>
                  {user.recommendationSettings.preferredTags && user.recommendationSettings.preferredTags.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {user.recommendationSettings.preferredTags.map(tag => (
                        <span key={tag} style={{ background: '#fff', border: '1.5px solid #000', color: '#000', padding: '1px 6px', borderRadius: '4px', fontSize: '9.5px', fontWeight: 700 }}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#777', fontStyle: 'italic' }}>None selected</span>
                  )}
                </div>
              </div>
            )}

            {hasInterests ? (
              <div className="nm-interests-content">
                {/* Category Interests */}
                {interests.categories.length > 0 && (
                  <div className="nm-interest-block">
                    <h4 className="nm-interest-block-title">
                      <FiLayers size={13} /> Top Categories
                    </h4>
                    <div className="nm-category-bars">
                      {interests.categories.map(cat => {
                        // Normalize weight relative to highest weight
                        const maxWeight = interests.categories[0].weight;
                        const percentage = Math.max(15, Math.round((cat.weight / maxWeight) * 100));
                        const color = getCategoryColor(cat.category);
                        return (
                          <div key={cat.category} className="nm-category-bar-item">
                            <div className="nm-bar-labels">
                              <span className="nm-bar-label">{cat.category.toUpperCase()}</span>
                              <span className="nm-bar-value">{cat.weight} pts</span>
                            </div>
                            <div className="nm-bar-container">
                              <div
                                className="nm-bar-fill"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: color,
                                  boxShadow: `0 0 10px ${color}33`
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tag Interests */}
                {interests.tags.length > 0 && (
                  <div className="nm-interest-block" style={{ marginTop: 24 }}>
                    <h4 className="nm-interest-block-title">
                      <FiHash size={13} /> Subscribed Tags
                    </h4>
                    <div className="nm-interest-tags-list">
                      {interests.tags.map(t => (
                        <Link key={t.tag} to={`/tag/${t.tag}`} className="nm-interest-tag-pill">
                          <span className="tag-hash">#</span>
                          <span className="tag-name">{t.tag}</span>
                          <span className="tag-weight">{t.weight}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Info Note */}
                <div className="nm-interests-footer">
                  <FiCheckCircle size={12} />
                  <span>Updates in real-time as you interact</span>
                </div>
              </div>
            ) : (
              <div className="nm-interests-empty">
                <FiAward size={24} className="nm-award-icon" />
                <p>No reading metrics compiled yet.</p>
                <span>Read some articles, write comments, or save posts to build your dynamic dashboard.</span>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ForYouTab;
