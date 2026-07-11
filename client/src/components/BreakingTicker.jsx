import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { articleAPI } from '../services/api';

const BreakingTicker = () => {
  const [trendingArticles, setTrendingArticles] = useState([]);

  useEffect(() => {
    articleAPI.getTrending()
      .then((res) => {
        setTrendingArticles(res.data.data.slice(0, 6));
      })
      .catch((err) => console.error('Failed to fetch trending news:', err));
  }, []);

  if (trendingArticles.length === 0) return null;

  return (
    <div className="trending-top-bar">
      <span className="trending-label">TRENDING:</span>
      <div className="trending-links">
        {trendingArticles.map((item, index) => (
          <span key={item._id} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link to={`/article/${item.slug}`}>
              {item.category.toUpperCase()}
            </Link>
            {index < trendingArticles.length - 1 && <span style={{ color: 'var(--color-gray-300)' }}>|</span>}
          </span>
        ))}
      </div>
    </div>
  );
};

export default BreakingTicker;
