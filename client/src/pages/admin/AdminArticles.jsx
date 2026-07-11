import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { articleAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { FiSearch } from 'react-icons/fi';

const AdminArticles = () => {
  const { isAdmin } = useAuth();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchArticles = () => {
    setLoading(true);
    articleAPI.getAll({ limit: 100, status: filter || undefined })
      .then((res) => setArticles(res.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchArticles(); }, [filter]);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await articleAPI.delete(id);
      toast.success('Article deleted');
      fetchArticles();
    } catch {
      toast.error('Failed to delete article');
    }
  };

  const handleTogglePush = async (id, currentVal) => {
    try {
      await articleAPI.update(id, { isPushedToHome: !currentVal });
      toast.success(currentVal ? 'Removed from home spotlight' : 'Pushed to home spotlight!');
      fetchArticles();
    } catch (err) {
      toast.error('Failed to update push status');
    }
  };

  const getCategoryColor = (cat) => {
    const colors = {
      news: '#fee2e2',
      editorial: '#dbeafe',
      features: '#dcfce7',
      kyp: '#fef9c3',
      'tea-shop': '#fce7f3',
      'pictures-speak': '#ede9fe',
    };
    return colors[cat] || '#f3f4f6';
  };

  const filteredArticles = articles.filter(a => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const titleMatch = a.title?.toLowerCase().includes(query);
    const authorMatch = a.author?.name?.toLowerCase().includes(query);
    const categoryMatch = a.category?.toLowerCase().includes(query);
    return titleMatch || authorMatch || categoryMatch;
  });

  return (
    <>
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Articles</h1>
          <p className="admin-subtitle">Manage, edit, and push articles to the homepage spotlight.</p>
        </div>
        <Link to="/admin/new-article" className="btn-admin-primary">
          + New Article
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="admin-card" style={{ padding: '20px', display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
          {['', 'published', 'draft', 'archived'].map((s) => (
            <button
              key={s}
              className={`btn-admin-secondary`}
              style={{ 
                borderColor: filter === s ? 'var(--accent-color)' : 'var(--admin-border)', 
                color: filter === s ? 'var(--accent-color)' : 'var(--admin-text-main)',
                background: filter === s ? 'rgba(200, 16, 46, 0.05)' : 'transparent',
                padding: '8px 16px',
                fontSize: '12px'
              }}
              onClick={() => { setFilter(s); setSearchQuery(''); }}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%', maxWidth: '300px' }}>
          <FiSearch style={{ position: 'absolute', left: 12, color: 'var(--admin-text-subtle)' }} size={16} />
          <input
            type="text"
            placeholder="Search articles by title or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="admin-input"
            style={{ paddingLeft: 36, fontSize: '13px' }}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : (
        <div className="admin-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th className="hide-mobile">Author</th>
                <th>Status</th>
                <th className="hide-mobile">Views</th>
                <th className="hide-mobile">Date</th>
                {isAdmin && <th>Spotlight Pushed</th>}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredArticles.map((a) => (
                <tr key={a._id}>
                  <td style={{ maxWidth: 260 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.4 }}>{a.title}</span>
                    {a.isFeatured && <span className="admin-badge badge-info" style={{ marginLeft: 6 }}>⭐ Featured</span>}
                    {a.isTrending && <span className="admin-badge badge-danger" style={{ marginLeft: 4 }}>🔥 Hot</span>}
                    {a.isPushedToHome && <span className="admin-badge badge-success" style={{ marginLeft: 4 }}>🚀 SPOTLIGHT</span>}
                  </td>
                  <td>
                    <span className="admin-badge" style={{ background: getCategoryColor(a.category) }}>
                      {a.category}
                    </span>
                  </td>
                  <td className="hide-mobile" style={{ fontSize: 12 }}>{a.author?.name}</td>
                  <td>
                    <span className={`admin-badge ${a.status === 'published' ? 'badge-success' : a.status === 'draft' ? 'badge-warning' : 'badge-neutral'}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="hide-mobile" style={{ fontSize: 13 }}>{a.views.toLocaleString()}</td>
                  <td className="hide-mobile" style={{ fontSize: 11, color: 'var(--color-gray-500)' }}>
                    {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : new Date(a.createdAt).toLocaleDateString()}
                  </td>
                  {isAdmin && (
                    <td>
                      <button
                        onClick={() => handleTogglePush(a._id, a.isPushedToHome)}
                        className={`admin-badge ${a.isPushedToHome ? 'badge-danger' : 'badge-neutral'}`}
                        style={{ cursor: 'pointer', border: '1px solid transparent' }}
                      >
                        {a.isPushedToHome ? 'Remove 🚀' : 'Push'}
                      </button>
                    </td>
                  )}
                  <td>
                    <Link to={`/admin/edit-article/${a._id}`} className="admin-badge badge-warning" style={{ marginRight: 8, textDecoration: 'none' }}>Edit</Link>
                    <Link to={`/article/${a.slug}`} target="_blank" className="admin-badge badge-info" style={{ marginRight: 8, textDecoration: 'none' }}>View</Link>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(a._id, a.title)}
                        className="admin-badge badge-danger"
                        style={{ cursor: 'pointer' }}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredArticles.length === 0 && (
                <tr><td colSpan={isAdmin ? 8 : 7} style={{ textAlign: 'center', color: 'var(--color-gray-500)', padding: 32 }}>No articles found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default AdminArticles;
