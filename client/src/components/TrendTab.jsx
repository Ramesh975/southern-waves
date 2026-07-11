import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiTrendingUp, FiHash, FiArrowRight, FiCornerUpLeft } from 'react-icons/fi';
import NewsArticleCard, { getImgSrc, timeAgo } from './NewsArticleCard';
import { articleAPI } from '../services/api';

const TrendTab = ({ articles, trending, trendingTags, highlightId, onReply, onComment }) => {
  const [activeTag, setActiveTag] = useState(null);
  const [tagArticles, setTagArticles] = useState([]);
  const [loadingTag, setLoadingTag] = useState(false);
  const [showAllArticles, setShowAllArticles] = useState(false);

  useEffect(() => {
    setShowAllArticles(false);
  }, [activeTag]);

  const handleTagClick = async (tag) => {
    if (activeTag === tag) {
      setActiveTag(null);
      setTagArticles([]);
      return;
    }
    setActiveTag(tag);
    setLoadingTag(true);
    try {
      const res = await articleAPI.getAll({ tag, limit: 30 });
      setTagArticles(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load articles for tag:', err);
      setTagArticles([]);
    } finally {
      setLoadingTag(false);
    }
  };

  const hero = trending[0];
  const hasMoreArticles = tagArticles.length > 5;

  return (
    <div className="nm-trend-layout">
      {/* Hero Fog Card */}
      {hero && (
        <div
          className="nm-fog-card"
          style={{ '--hero-img': hero.coverImage ? `url(${getImgSrc(hero.coverImage)})` : 'none' }}
        >
          <div className="nm-fog-bg" />
          <div className="nm-fog-overlay" />
          <div className="nm-fog-content">
            <div className="nm-fog-left">
              <div className="nm-fog-badges">
                <span className="nm-badge trending">🔥 #1 Trending</span>
                <span className="nm-fog-cat">{hero.category}</span>
              </div>
              <div className="nm-carousel-dots" style={{ justifyContent: 'flex-start', marginBottom: 12 }}>
                {trending.slice(0, 5).map((_, i) => (
                  <div key={i} className={`nm-dot${i === 0 ? ' active' : ''}`} />
                ))}
              </div>
              <h2 className="nm-fog-title">{hero.title}</h2>
              <p className="nm-fog-desc">{hero.lead}</p>
              <div className="nm-fog-actions">
                <Link to={`/article/${hero.slug}`} className="nm-carousel-read-btn">
                  Read Story <FiArrowRight size={14} />
                </Link>
                <button className="nm-carousel-reply-btn" onClick={() => onReply(hero)}>
                  <FiCornerUpLeft size={14} /> Reply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="nm-trend-columns">
        {/* Trending Feed */}
        <div className="nm-trend-feed">
          <div className="nm-section-header">
            <FiTrendingUp size={15} />
            <span className="nm-section-title">Hot &amp; Trending</span>
          </div>
          {trending.map(art => (
            <NewsArticleCard key={art._id} article={art} onReply={onReply} onComment={onComment} highlight={highlightId === art._id} />
          ))}
        </div>

        {/* Trending Tags + related articles */}
        <aside className="nm-trend-tags-panel">
          <div className="nm-section-header">
            <FiHash size={15} />
            <span className="nm-section-title">Trending Tags</span>
          </div>
          <div className="nm-trending-tags-wrapper">
            {trendingTags.map(({ tag, count }) => {
              const isActive = activeTag === tag;
              return (
                <div key={tag} className={`nm-trending-tag-group${isActive ? ' active' : ''}`}>
                  <button
                    className={`nm-trending-tag-btn${isActive ? ' active' : ''}`}
                    onClick={() => handleTagClick(tag)}
                  >
                    <span className="nm-trending-tag-name">#{tag}</span>
                    <span className="nm-trending-tag-count">{count} {count === 1 ? 'article' : 'articles'}</span>
                  </button>

                  <div className={`nm-trending-tag-articles-collapse${isActive ? ' open' : ''}${isActive && showAllArticles ? ' expanded' : ''}`}>
                    {isActive && (
                      <div className="nm-tag-results-inline">
                        {loadingTag ? (
                          <div className="nm-mini-spinner" style={{ margin: '16px auto' }} />
                        ) : tagArticles.length === 0 ? (
                          <div className="nm-empty" style={{ padding: '12px 0' }}>No articles found.</div>
                        ) : (
                          <>
                            <div className={`nm-tag-results-list-wrapper${hasMoreArticles && !showAllArticles ? ' has-fog' : ''}`}>
                              {tagArticles.map(art => (
                                <Link key={art._id} to={`/article/${art.slug}`} className="nm-tag-result-item" onClick={(e) => e.stopPropagation()}>
                                  <div className="nm-tag-result-info">
                                    <span className="nm-tag-result-title">{art.title}</span>
                                    <span className="nm-tag-result-meta">
                                      By {art.author?.name} · {timeAgo(art.publishedAt)}
                                    </span>
                                  </div>
                                  {art.coverImage && (
                                    <img src={getImgSrc(art.coverImage)} alt="" className="nm-tag-result-thumb" />
                                  )}
                                </Link>
                              ))}
                            </div>

                            {hasMoreArticles && !showAllArticles && (
                              <button
                                className="nm-tag-results-more-btn"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setShowAllArticles(true);
                                }}
                              >
                                More Articles
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default TrendTab;
