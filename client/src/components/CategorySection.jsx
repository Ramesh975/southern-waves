import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { articleAPI } from '../services/api';
import { ArticleCard, getCategoryLabel, getCategoryPath } from './ArticleComponents';

const CategorySection = ({ category }) => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    articleAPI.getAll({ category, status: 'published', limit: 4 })
      .then((res) => setArticles(res.data.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [category]);

  if (loading) return <div className="widget-loader">Loading section...</div>;
  if (articles.length === 0) return null;

  const label = getCategoryLabel(category);
  const path = getCategoryPath(category);

  return (
    <section className="homepage-category-section">
      <div className="section-header">
        <h2 className="section-title-cat">{label}</h2>
        <Link to={path} className="section-view-all">View All →</Link>
      </div>
      <div className="rule-thick" style={{ marginBottom: 16, height: 2, background: 'var(--color-black)' }} />
      <div className="category-section-grid">
        {articles.map((art) => (
          <ArticleCard key={art._id} article={art} />
        ))}
      </div>
    </section>
  );
};

export default CategorySection;
