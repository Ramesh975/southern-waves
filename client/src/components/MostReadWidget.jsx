import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { articleAPI } from '../services/api';

const MostReadWidget = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    articleAPI.getMostRead({ limit: 6 })
      .then((res) => setArticles(res.data.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="widget-loader">Loading...</div>;

  return (
    <div className="sidebar-widget">
      <h3 className="most-popular-header">Most Popular</h3>
      <div className="most-popular-list">
        {articles.map((item, index) => (
          <div key={item._id} className="most-popular-item">
            <span className="most-popular-number">{index + 1}</span>
            <div className="most-popular-content">
              <Link to={`/article/${item.slug}`} className="most-popular-title">
                {item.title}
              </Link>
              <div className="most-popular-shares">
                {item.views || 0} VIEWS
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MostReadWidget;
