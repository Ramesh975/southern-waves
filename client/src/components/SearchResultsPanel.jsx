import { Link, useNavigate } from 'react-router-dom';
import { FiHash, FiArrowRight, FiClock } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { getDisplayName } from '../utils/userUtils';
import { getImgSrc, timeAgo } from './NewsArticleCard';

const SUGGESTED_TAGS = ['fee hike', 'protest', 'campus', 'admissions', 'education', 'cultural fest', 'politics', 'exam', 'research'];

const SearchResultsPanel = ({ 
  visible, 
  query, 
  results, 
  loading, 
  onClose,
  trendingTags = [],
  recommendedTags = [],
  recentArticles = [],
  recommendedArticles = [],
  initialLoading = false,
  category,
  onTagClick
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleTagClick = (tag) => {
    const rawName = typeof tag === 'string' ? tag : (tag?.tag || '');
    let cleanName = rawName;
    try {
      cleanName = decodeURIComponent(rawName).trim();
    } catch (e) {
      cleanName = rawName.trim();
    }
    const cleanTag = cleanName.replace(/^#/, '');
    if (onTagClick) {
      onTagClick(cleanTag);
    } else {
      onClose();
      navigate(`/tag/${encodeURIComponent(cleanTag)}`);
    }
  };

  if (!visible) return null;

  return (
    <div className="nm-search-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="nm-search-results-panel">
        <div className="nm-search-results-header">
          <span>Search Results</span>
          {query && <span className="nm-search-results-query">for "{query}"</span>}
        </div>

        <div className="nm-search-results-body">
          {/* Suggested topics */}
          {!query && (
            <>
              {initialLoading ? (
                <div style={{ padding: '32px 0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <div className="nm-mini-spinner" />
                </div>
              ) : (
                <>
                  {/* Split row: Trending Tags & Recommended Tags */}
                  {(trendingTags.length > 0 || recommendedTags.length > 0) && (
                    <div className="nm-search-section nm-search-tags-split">
                      {trendingTags.length > 0 && (
                        <div className="nm-search-tags-column">
                          <p className="nm-search-suggest-label">
                            {category === 'kyp' ? '📅 Historical Years' : '🔥 Trending Tags'}
                          </p>
                          <div className="nm-search-suggest-tags">
                            {trendingTags.slice(0, 5).map(tag => (
                              <button key={tag} className="nm-search-suggest-tag" onClick={() => handleTagClick(tag)}>
                                {category === 'kyp' ? <FiClock size={12} /> : <FiHash size={12} />} {tag}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {recommendedTags.length > 0 && (
                        <div className="nm-search-tags-column">
                          <p className="nm-search-suggest-label">
                            {category === 'kyp' ? '⏳ Historical Eras' : '✨ Recommended Tags'}
                          </p>
                          <div className="nm-search-suggest-tags">
                            {recommendedTags.slice(0, 5).map(tag => (
                              <button key={tag} className="nm-search-suggest-tag" onClick={() => handleTagClick(tag)}>
                                {category === 'kyp' ? <FiClock size={12} /> : <FiHash size={12} />} {tag}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Recently Published */}
                  {recentArticles.length > 0 && (
                    <div className="nm-search-section">
                      <p className="nm-search-suggest-label">Recently Published</p>
                      <div className="nm-search-suggestions-list">
                        {recentArticles.map(art => {
                          const isKyp = art.category === 'kyp';
                          return (
                            <Link key={art._id} to={`/article/${art.slug}`} className="nm-search-suggestion-item" onClick={onClose}>
                              {art.coverImage && (
                                <img src={getImgSrc(art.coverImage)} alt="" className="nm-search-suggestion-thumb" onError={(e) => { e.target.style.display = 'none'; }} />
                              )}
                              <div className="nm-search-suggestion-info">
                                <span className="nm-search-suggestion-cat">
                                  {isKyp ? `📜 EVENT · ${art.subCategory || 'Archive'}` : art.category?.toUpperCase()}
                                </span>
                                <span className="nm-search-suggestion-title">{art.title}</span>
                                <span className="nm-search-suggestion-meta">
                                  {isKyp ? `Year: ${art.historicalYear || 'N/A'}` : `⏱️ ${timeAgo(art.publishedAt || art.createdAt)}`}
                                </span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recommended for You */}
                  {recommendedArticles.length > 0 && (
                    <div className="nm-search-section">
                      <p className="nm-search-suggest-label">Recommended for You</p>
                      <div className="nm-search-suggestions-list">
                        {recommendedArticles.map(art => {
                          const isKyp = art.category === 'kyp';
                          return (
                            <Link key={art._id} to={`/article/${art.slug}`} className="nm-search-suggestion-item" onClick={onClose}>
                              {art.coverImage && (
                                <img src={getImgSrc(art.coverImage)} alt="" className="nm-search-suggestion-thumb" onError={(e) => { e.target.style.display = 'none'; }} />
                              )}
                              <div className="nm-search-suggestion-info">
                                <span className="nm-search-suggestion-cat-recommend">
                                  {isKyp ? `📜 EVENT · ${art.subCategory || 'Archive'}` : art.category?.toUpperCase()}
                                  {!isKyp && art.recommendationRationale && (
                                    <span className="nm-search-recommendation-rationale"> · {art.recommendationRationale}</span>
                                  )}
                                </span>
                                <span className="nm-search-suggestion-title">{art.title}</span>
                                <span className="nm-search-suggestion-meta">
                                  {isKyp ? `Year: ${art.historicalYear || 'N/A'} · By ${getDisplayName(art.author, user)}` : `By ${getDisplayName(art.author, user)}`}
                                </span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Results */}
          {query && (
            <div className="nm-search-results">
              {loading ? (
                <div className="nm-mini-spinner" style={{ margin: '20px auto' }} />
              ) : results.length === 0 ? (
                <div className="nm-empty" style={{ padding: '24px 0' }}>No results for "{query}"</div>
              ) : (
                results.map(art => {
                  const isKyp = art.category === 'kyp';
                  return (
                    <Link
                      key={art._id}
                      to={`/article/${art.slug}`}
                      className="nm-search-result-item"
                      onClick={onClose}
                    >
                      {art.coverImage && (
                        <img src={getImgSrc(art.coverImage)} alt="" className="nm-search-result-thumb" onError={(e) => { e.target.style.display = 'none'; }} />
                      )}
                      <div className="nm-search-result-info">
                        <span className="nm-search-result-cat">
                          {isKyp ? `📜 EVENT · ${art.subCategory || 'Archive'}` : art.category}
                        </span>
                        <span className="nm-search-result-title">{art.title}</span>
                        <span className="nm-search-result-meta">
                          {isKyp 
                            ? `Year: ${art.historicalYear || 'N/A'} · By ${getDisplayName(art.author, user)}` 
                            : `By ${getDisplayName(art.author, user)} · ${timeAgo(art.publishedAt)}`}
                        </span>
                      </div>
                      <FiArrowRight size={14} className="nm-search-result-arrow" />
                    </Link>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchResultsPanel;
