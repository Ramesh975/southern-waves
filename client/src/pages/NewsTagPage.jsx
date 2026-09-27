import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { articleAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { format } from 'date-fns';
import { 
  BiHeart, 
  BiComment, 
  BiShareAlt, 
  BiChat, 
  BiHash, 
  BiNews
} from 'react-icons/bi';
import { 
  FiHeart, 
  FiCornerUpLeft, 
  FiHash, 
  FiTrendingUp, 
  FiCompass,
  FiClock
} from 'react-icons/fi';
import BottomNavPill from '../components/BottomNavPill';
import CommentsPopupModal from '../components/CommentsPopupModal';
import { getImgSrc } from '../components/NewsArticleCard';
import toast from 'react-hot-toast';
import '../NewsTag.css';

const NewsTagPage = ({ defaultCategory }) => {
  const { tag } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openRoom, setIsOpen } = useChat();

  const searchParams = new URLSearchParams(location.search);
  const isTrending = searchParams.get('trending') === 'true';

  // Decode URI component to remove %20 and format clean title
  const rawTag = tag || '';
  let cleanTag = rawTag;
  try {
    cleanTag = decodeURIComponent(rawTag).trim();
  } catch (e) {
    cleanTag = rawTag.trim();
  }
  const displayTag = cleanTag.replace(/^#/, '');

  const [articles, setArticles] = useState([]);
  const [trending, setTrending] = useState([]);
  const [trendingTags, setTrendingTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCommentArticle, setActiveCommentArticle] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = {};
        if (displayTag) params.tag = displayTag;
        else if (defaultCategory) params.category = defaultCategory;
        if (isTrending) params.trending = 'true';

        const [articlesRes, trendingRes, tagsRes] = await Promise.all([
          articleAPI.getAll({ ...params, limit: 30 }),
          articleAPI.getTrending(),
          articleAPI.getTrendingTags(),
        ]);

        setArticles(articlesRes.data?.data || []);
        setTrending(trendingRes.data?.data || []);
        setTrendingTags(tagsRes.data?.data || []);
      } catch (error) {
        console.error('Error fetching tag data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [displayTag, isTrending, defaultCategory]);

  const handleLike = async (e, articleId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error('Please login to hype stories');
      return;
    }

    const userId = user._id || user.id;

    // Optimistically update article state
    setArticles(prev => prev.map(a => {
      if (a._id !== articleId) return a;
      const currentLikes = a.likes || [];
      const isLiked = currentLikes.some(id => (id._id || id || '').toString() === userId.toString());
      const newLikes = isLiked
        ? currentLikes.filter(id => (id._id || id || '').toString() !== userId.toString())
        : [...currentLikes, userId];
      return { ...a, likes: newLikes };
    }));

    try {
      const res = await articleAPI.like(articleId);
      if (res.data?.success && res.data.likes) {
        setArticles(prev => prev.map(a => a._id === articleId ? { ...a, likes: res.data.likes } : a));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update hype');
    }
  };

  const handleShare = (e, article) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/article/${article.slug}`;
    if (navigator.share) {
      navigator.share({ title: article.title, text: article.lead || article.title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleChatTag = (e, article) => {
    e.preventDefault();
    e.stopPropagation();
    let roomParam = '';
    if (article?.tags && article.tags.length > 0) {
      const firstTag = (typeof article.tags[0] === 'string' ? article.tags[0] : article.tags[0]?.tag || '').replace(/^#/, '');
      roomParam = `tag:${firstTag.toLowerCase()}`;
    } else {
      roomParam = `category:${(article?.category || defaultCategory || 'news').toLowerCase()}`;
    }
    navigate(`/chat?room=${encodeURIComponent(roomParam)}`);
  };

  const handleReplyToPost = (e, article) => {
    e.preventDefault();
    e.stopPropagation();
    let roomParam = '';
    if (article?.tags && article.tags.length > 0) {
      const firstTag = (typeof article.tags[0] === 'string' ? article.tags[0] : article.tags[0]?.tag || '').replace(/^#/, '');
      roomParam = `tag:${firstTag.toLowerCase()}`;
    } else {
      roomParam = `category:${(article?.category || defaultCategory || 'news').toLowerCase()}`;
    }
    navigate(`/chat?room=${encodeURIComponent(roomParam)}&replyToPost=${encodeURIComponent(article.title)}`);
  };

  const handleOpenComment = (e, article) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveCommentArticle(article);
  };

  const formatArticleDate = (dateStr) => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      return format(d, 'MMM dd, yyyy');
    } catch (e) {
      return 'Recently';
    }
  };

  return (
    <main className="newstag-page container">
      {/* Tag Page Hero Header */}
      <div className="newstag-header-banner">
        <div className="newstag-header-inner">
          <div className="newstag-topic-pill">
            <BiHash size={16} />
            <span>TOPIC TAG</span>
          </div>
          <h1 className="newstag-main-title">#{displayTag.toUpperCase()}</h1>
          <p className="newstag-tagline">
            Curated coverage, live discussions, and community reporting tagged under <strong>#{displayTag}</strong>.
          </p>
          <div className="newstag-meta-stats">
            <span className="newstag-stat-pill">
              <BiNews size={14} /> {articles.length} {articles.length === 1 ? 'Story' : 'Stories'}
            </span>
            <button 
              className="newstag-join-chat-btn"
              onClick={() => navigate(`/chat?room=tag:${encodeURIComponent(displayTag.toLowerCase())}`)}
            >
              <BiChat size={15} /> Join #{displayTag} Chat
            </button>
          </div>
        </div>
      </div>

      {/* ─── MAIN 2-COLUMN GRID: Tag Articles Feed (First Result) + Sidebar ─── */}
      <div className="newstag-grid">
        {/* Left Column: Feed */}
        <div className="newstag-feed">
          {loading ? (
            <div className="newstag-loading-skeleton">
              <div className="newstag-skeleton-card" />
              <div className="newstag-skeleton-card" />
              <div className="newstag-skeleton-card" />
            </div>
          ) : articles.length === 0 ? (
            <div className="newstag-empty-state">
              <div className="newstag-empty-icon">
                <FiHash size={36} />
              </div>
              <h3 className="newstag-empty-title">No Stories Found for #{displayTag}</h3>
              <p className="newstag-empty-text">
                Be the first to publish or join the conversation around this topic.
              </p>
              <div className="newstag-empty-actions">
                <button 
                  className="newstag-empty-btn primary"
                  onClick={() => navigate('/news')}
                >
                  <FiCompass size={16} /> Explore All News
                </button>
                <button 
                  className="newstag-empty-btn secondary"
                  onClick={() => navigate(`/chat?room=tag:${encodeURIComponent(displayTag.toLowerCase())}`)}
                >
                  <BiChat size={16} /> Start #{displayTag} Chat
                </button>
              </div>
            </div>
          ) : (
            articles.map((article) => {
              const hasLiked = user && article.likes && article.likes.includes(user.id || user._id);
              const likeCount = article.likes?.length || 0;

              return (
                <article key={article._id} className="newstag-article-card">
                  <div className="newstag-article-meta">
                    <img
                      src={getImgSrc(article.author?.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(article.author?.name || 'A')}&size=36&background=random`}
                      alt={article.author?.name || 'Author'}
                      className="newstag-author-avatar"
                    />
                    <div className="newstag-author-details">
                      <div className="newstag-author-name">
                        By {article.author?.name || 'Editorial Desk'}
                      </div>
                      <div className="newstag-date">
                        <FiClock size={12} style={{ display: 'inline', marginRight: 4 }} />
                        {formatArticleDate(article.publishedAt || article.createdAt)}
                      </div>
                    </div>
                    {article.category && (
                      <span className="newstag-category-chip">
                        {article.category}
                      </span>
                    )}
                  </div>

                  <Link to={`/article/${article.slug}`} className="newstag-article-content-link">
                    <h2 className="newstag-article-title">{article.title}</h2>
                    {article.lead && (
                      <p className="newstag-article-excerpt">{article.lead}</p>
                    )}
                  </Link>

                  {article.coverImage && (
                    <Link to={`/article/${article.slug}`} className="newstag-cover-wrapper">
                      <img 
                        src={getImgSrc(article.coverImage)} 
                        alt={article.title} 
                        className="newstag-cover-image"
                        loading="lazy" 
                      />
                    </Link>
                  )}

                  {/* Tag chips */}
                  {article.tags && article.tags.length > 0 && (
                    <div className="newstag-chips-row">
                      {article.tags.map((t) => {
                        const rawT = typeof t === 'string' ? t : (t?.tag || '');
                        let cleanT = rawT;
                        try {
                          cleanT = decodeURIComponent(rawT).trim();
                        } catch (e) {
                          cleanT = rawT.trim();
                        }
                        const tDisplay = cleanT.replace(/^#/, '');
                        if (!tDisplay) return null;
                        const isCurrent = tDisplay.toLowerCase() === displayTag.toLowerCase();
                        return (
                          <Link 
                            key={rawT} 
                            to={`/tag/${encodeURIComponent(tDisplay)}`} 
                            className={`newstag-chip-pill ${isCurrent ? 'active' : ''}`}
                          >
                            #{tDisplay}
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  <div className="newstag-actions">
                    <button 
                      className={`newstag-btn hype ${hasLiked ? 'active' : ''}`}
                      onClick={(e) => handleLike(e, article._id)}
                      title="Hype this story"
                    >
                      <BiHeart size={18} />
                      <span>{likeCount > 0 ? likeCount : 'Hype'}</span>
                    </button>
                    <button 
                      className="newstag-btn" 
                      onClick={(e) => handleReplyToPost(e, article)}
                      title="Reply in chat"
                    >
                      <FiCornerUpLeft size={16} />
                      <span>Reply</span>
                    </button>
                    <button 
                      className="newstag-btn"
                      onClick={(e) => handleOpenComment(e, article)}
                      title="View discussion & comments"
                    >
                      <BiComment size={17} />
                      <span>Comment</span>
                    </button>
                    <button 
                      className="newstag-btn"
                      onClick={(e) => handleShare(e, article)}
                      title="Share story"
                    >
                      <BiShareAlt size={17} />
                      <span>Share</span>
                    </button>
                    <button 
                      className="newstag-btn chat-tag" 
                      onClick={(e) => handleChatTag(e, article)}
                      title="Open Tag Discussion Room"
                    >
                      <BiChat size={17} />
                      <span>Chat Tag Room</span>
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Right Column: Hyped (Trending) & Tags Cloud */}
        <aside className="newstag-sidebar">
          <div className="newstag-sidebar-card">
            <h3 className="newstag-sidebar-title">
              <FiTrendingUp size={16} /> Mostly Hyped News
            </h3>
            
            <div className="newstag-hyped-list">
              {trending.slice(0, 5).map((article, index) => (
                <div key={article._id} className="newstag-hyped-item">
                  <div className="newstag-hyped-rank">#{index + 1}</div>
                  <div className="newstag-hyped-content">
                    <Link to={`/article/${article.slug}`}>
                      <h4 className="newstag-hyped-title">{article.title}</h4>
                    </Link>
                    <div className="newstag-hyped-meta">
                      <span className="newstag-hyped-author">By {article.author?.name || 'Southern Waves'}</span>
                      <Link to={`/article/${article.slug}`} className="newstag-view-btn">View</Link>
                    </div>
                  </div>
                  {article.coverImage && (
                    <Link to={`/article/${article.slug}`} className="newstag-hyped-thumb-link">
                      <img src={getImgSrc(article.coverImage)} alt={article.title} className="newstag-hyped-image" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Trending Tags Cloud */}
          {trendingTags.length > 0 && (
            <div className="newstag-sidebar-card" style={{ marginTop: 24 }}>
              <h3 className="newstag-sidebar-title">
                <FiHash size={16} /> Explore Trending Tags
              </h3>
              <div className="newstag-sidebar-tags-cloud">
                {trendingTags.slice(0, 12).map((t) => {
                  const rawName = typeof t === 'string' ? t : (t?.tag || '');
                  let cleanName = rawName;
                  try {
                    cleanName = decodeURIComponent(rawName).trim();
                  } catch (e) {
                    cleanName = rawName.trim();
                  }
                  const tDisplay = cleanName.replace(/^#/, '');
                  if (!tDisplay) return null;
                  const isCurrent = tDisplay.toLowerCase() === displayTag.toLowerCase();
                  return (
                    <Link
                      key={rawName}
                      to={`/tag/${encodeURIComponent(tDisplay)}`}
                      className={`newstag-sidebar-tag-pill ${isCurrent ? 'active' : ''}`}
                    >
                      #{tDisplay}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Comments Modal */}
      {activeCommentArticle && (
        <CommentsPopupModal
          article={activeCommentArticle}
          onClose={() => setActiveCommentArticle(null)}
        />
      )}

      {/* Reusable Nav Pill Widget */}
      <BottomNavPill />
    </main>
  );
};

export default NewsTagPage;
