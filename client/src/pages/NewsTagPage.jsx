import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { articleAPI } from '../services/api';
import { format } from 'date-fns';
import { BiHeart, BiTime, BiComment, BiShareAlt, BiChat, BiX, BiCategory } from 'react-icons/bi';
import BottomNavPill from '../components/BottomNavPill';
import '../NewsTag.css';

const NewsTagPage = ({ defaultCategory }) => {
  const { tag } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isTrending = searchParams.get('trending') === 'true';

  const displayTitle = tag || (isTrending ? 'Trending' : defaultCategory);
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch articles for this tag or category
        const params = {};
        if (tag) params.tag = tag;
        else if (defaultCategory) params.category = defaultCategory;
        if (isTrending) params.trending = 'true';

        const articlesRes = await articleAPI.getAll(params);
        setArticles(articlesRes.data?.data || []);

        // Fetch mostly hyped (trending) news
        const trendingRes = await articleAPI.getTrending();
        setTrending(trendingRes.data?.data || []);
      } catch (error) {
        console.error('Error fetching tag data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tag, isTrending, defaultCategory]);

  const handleChatTag = (article) => {
    let roomParam = '';
    if (article.tags && article.tags.length > 0) {
      roomParam = `tag:${article.tags[0].toLowerCase()}`;
    } else {
      roomParam = `category:${(article.category || defaultCategory || 'news').toLowerCase()}`;
    }
    navigate(`/chat?room=${roomParam}`);
  };

  const handleReplyToPost = (article) => {
    let roomParam = '';
    if (article.tags && article.tags.length > 0) {
      roomParam = `tag:${article.tags[0].toLowerCase()}`;
    } else {
      roomParam = `category:${(article.category || defaultCategory || 'news').toLowerCase()}`;
    }
    navigate(`/chat?room=${roomParam}&replyToPost=${encodeURIComponent(article.title)}`);
  };

  if (loading) {
    return (
      <main className="newstag-page container">
        <div style={{ textAlign: 'center', padding: '100px 0' }}>Loading...</div>
      </main>
    );
  }

  return (
    <main className="newstag-page container">
      <div className="newstag-grid">
        {/* Left Column: Feed */}
        <div className="newstag-feed">
          {articles.length === 0 ? (
            <p>No articles found for tag: {tag}</p>
          ) : (
            articles.map((article) => (
              <article key={article._id} className="newstag-article">
                <div className="newstag-article-meta">
                  <img
                    src={article.author.avatar || '/default-avatar.png'}
                    alt={article.author.name}
                    className="newstag-author-avatar"
                  />
                  <div>
                    <div className="newstag-author-name">By {article.author.name}</div>
                    <div className="newstag-date">
                      {article.publishedAt ? format(new Date(article.publishedAt), 'MMM dd, yyyy') : 'Unknown Date'}
                    </div>
                  </div>
                </div>

                <Link to={`/article/${article.slug}`}>
                  <h2 className="newstag-article-title">{article.title}</h2>
                  <p className="newstag-article-excerpt">{article.lead}</p>
                </Link>

                <div className="newstag-actions">
                  <button className="newstag-btn hype">
                    <BiHeart size={18} /> Hype
                  </button>
                  <button className="newstag-btn" onClick={() => handleReplyToPost(article)}>
                    <BiComment size={18} /> Reply
                  </button>
                  <button className="newstag-btn">
                    <BiComment size={18} /> Comment
                  </button>
                  <button className="newstag-btn">
                    <BiShareAlt size={18} /> Share
                  </button>
                  <button className="newstag-btn chat-tag" onClick={() => handleChatTag(article)}>
                    <BiChat size={18} /> Chat Replay talk Tag
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        {/* Right Column: Hyped (Trending) */}
        <aside className="newstag-sidebar">
          <h3 className="newstag-sidebar-title">Mostly Hyped News</h3>
          
          {trending.slice(0, 5).map((article, index) => (
            <div key={article._id} className="newstag-hyped-item">
              <div className="newstag-hyped-rank">#{index + 1}</div>
              <div className="newstag-hyped-content">
                <Link to={`/article/${article.slug}`}>
                  <h4 className="newstag-hyped-title">{article.title}</h4>
                </Link>
                <div className="newstag-hyped-meta">
                  <span className="newstag-author-name">By {article.author?.name}</span>
                  <Link to={`/article/${article.slug}`} className="newstag-view-btn">View</Link>
                </div>
              </div>
              {article.coverImage && (
                <Link to={`/article/${article.slug}`}>
                  <img src={article.coverImage} alt={article.title} className="newstag-hyped-image" />
                </Link>
              )}
            </div>
          ))}
        </aside>
      </div>

      {/* Reusable Nav Pill Widget */}
      <BottomNavPill />
    </main>
  );
};

export default NewsTagPage;
