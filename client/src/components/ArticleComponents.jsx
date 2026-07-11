import { Link } from 'react-router-dom';
import { format } from 'date-fns';

const PLACEHOLDER_IMG = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect fill="%23e0e0e0" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23888" font-size="14" font-family="sans-serif"%3ENo Image%3C/text%3E%3C/svg%3E';

const getApiBase = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const cleanUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
  return cleanUrl.endsWith('/api') ? cleanUrl.slice(0, -4) : cleanUrl;
};

const API_BASE = getApiBase();

export const getImageUrl = (path) => {
  if (!path) return PLACEHOLDER_IMG;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) return path;
  return `${API_BASE}${path}`;
};

export const getCategoryPath = (category) => {
  const map = {
    news: '/news',
    editorial: '/editorial',
    features: '/features',
    kyp: '/know-your-past',
    'tea-shop': '/tea-shop',
    'pictures-speak': '/pictures-speak',
  };
  return map[category] || '/';
};

export const getCategoryLabel = (category) => {
  const map = {
    news: 'News',
    editorial: 'Editorial',
    features: 'Features',
    kyp: 'Know Your Past',
    'tea-shop': 'Tea Shop',
    'pictures-speak': "Picture's Speak",
  };
  return map[category] || category;
};

// Large hero-style article card
export const ArticleHero = ({ article }) => {
  if (!article) return null;
  return (
    <article className="article-hero">
      <Link to={`/article/${article.slug}`}>
        <img
          className="article-hero-image"
          src={getImageUrl(article.coverImage)}
          alt={article.title}
        />
      </Link>
      <h2 className="article-hero-title">
        <Link to={`/article/${article.slug}`}>{article.title}</Link>
      </h2>
      <p className="article-hero-lead">{article.lead}</p>
    </article>
  );
};

// Small card with thumbnail
export const ArticleCard = ({ article }) => {
  if (!article) return null;
  return (
    <article className="article-card">
      <Link to={`/article/${article.slug}`}>
        <img className="article-card-img" src={getImageUrl(article.coverImage)} alt={article.title} />
      </Link>
      <div className="article-card-content">
        <p className="article-card-category">{getCategoryLabel(article.category)}</p>
        <p className="article-card-title">
          <Link to={`/article/${article.slug}`}>{article.title}</Link>
        </p>
      </div>
    </article>
  );
};

// Trending sidebar item
export const TrendingItem = ({ article, rank }) => {
  if (!article) return null;
  return (
    <div className="trending-item">
      <span className="trending-rank">#{rank}</span>
      <Link to={`/article/${article.slug}`}>
        <img className="trending-img" src={getImageUrl(article.coverImage)} alt={article.title} />
      </Link>
      <p className="trending-title">
        <Link to={`/article/${article.slug}`}>{article.title}</Link>
      </p>
    </div>
  );
};

// Full category page layout
const CategoryPage = ({ category, title, articles, loading }) => {
  const featured = articles[0];
  const rest = articles.slice(1);

  return (
    <main>
      <div className="container">
        <div className="page-category-header">
          <div className="rule-thick" />
          <h1 className="page-category-title">{title}</h1>
          <div className="rule-thick" style={{ marginTop: 8 }} />
        </div>

        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : (
          <div className="category-layout">
            <div>
              {featured && <ArticleHero article={featured} />}
              <div className="rule" style={{ margin: '16px 0' }} />
              {rest.map((a) => (
                <ArticleCard key={a._id} article={a} />
              ))}
            </div>
            <aside className="sidebar">
              <div className="sidebar-section">
                <p className="sidebar-label">Trending</p>
                <div className="rule-red" style={{ marginBottom: 12 }} />
                {articles.slice(0, 4).map((a, i) => (
                  <TrendingItem key={a._id} article={a} rank={i + 1} />
                ))}
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
};

export default CategoryPage;
