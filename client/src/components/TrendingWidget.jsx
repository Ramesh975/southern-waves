import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { articleAPI } from '../services/api';

const TrendingWidget = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    articleAPI.getTrending()
      .then((res) => setArticles(res.data.data.slice(0, 5)))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="widget-loader">Loading...</div>;

  return (
    <div className="sidebar-widget">
      <h3 className="widget-title">Trending Stories</h3>
      <div className="rule-red" style={{ marginBottom: 16 }} />
      <div className="widget-list">
        {articles.map((item, index) => (
          <div key={item._id} className="widget-item">
            <span className="widget-rank">0{index + 1}</span>
            <div className="widget-item-info">
              <Link to={`/article/${item.slug}`} className="widget-item-title">
                {item.title}
              </Link>
              <div className="widget-item-meta">
                {item.category.toUpperCase()} • By {item.author?.name}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrendingWidget;
