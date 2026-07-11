import { useState, useEffect } from 'react';
import { articleAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { FiTrendingUp, FiTrash2, FiCheckCircle, FiX, FiSearch } from 'react-icons/fi';

const CATEGORY_OPTIONS = [
  { value: 'news', label: 'News' },
  { value: 'editorial', label: 'Editorial' },
  { value: 'features', label: 'Features' },
  { value: 'kyp', label: 'Know Your Past' },
  { value: 'pictures-speak', label: "Picture's Speak" },
];

const AdminSubmissions = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Promotion Modal State
  const [selectedPost, setSelectedPost] = useState(null);
  const [promoTitle, setPromoTitle] = useState('');
  const [promoLead, setPromoLead] = useState('');
  const [promoCategory, setPromoCategory] = useState('news');
  const [promoting, setPromoting] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      // Fetch articles in category 'tea-shop'
      // We pass adminView=true so the backend includes all tea-shop posts
      const res = await articleAPI.getAll({ category: 'tea-shop', adminView: 'true', limit: 50 });
      
      // Filter for posts created by students (role 'student')
      const studentPosts = res.data.data.filter(
        (post) => post.author?.role === 'student'
      );

      // Sort by engagement: Likes + Shares (descending)
      studentPosts.sort((a, b) => {
        const aEngagement = (a.likes?.length || 0) + (a.shares || 0);
        const bEngagement = (b.likes?.length || 0) + (b.shares || 0);
        return bEngagement - aEngagement;
      });

      setSubmissions(studentPosts);
    } catch (err) {
      toast.error('Failed to load student submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPromoteModal = (post) => {
    setSelectedPost(post);
    setPromoTitle(post.title);
    setPromoLead(post.lead);
    setPromoCategory('news');
  };

  const handlePromoteConfirm = async (e) => {
    e.preventDefault();
    if (!promoTitle || !promoLead) {
      return toast.error('Please enter title and lead summary');
    }

    setPromoting(true);
    try {
      // Update post category, title, lead, status to published
      await articleAPI.update(selectedPost._id, {
        title: promoTitle,
        lead: promoLead,
        category: promoCategory,
        status: 'published',
      });

      toast.success(`Post promoted to ${promoCategory.toUpperCase()} successfully!`);
      setSelectedPost(null);
      fetchSubmissions(); // reload list
    } catch (err) {
      toast.error(err.response?.data?.message || 'Promotion failed');
    } finally {
      setPromoting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to dismiss and delete this submission?')) return;

    try {
      await articleAPI.delete(id);
      toast.success('Submission deleted');
      fetchSubmissions();
    } catch (err) {
      toast.error('Failed to delete submission');
    }
  };

  const filteredSubmissions = submissions.filter(post => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const titleMatch = post.title?.toLowerCase().includes(query);
    const leadMatch = post.lead?.toLowerCase().includes(query);
    const authorMatch = post.author?.name?.toLowerCase().includes(query);
    return titleMatch || leadMatch || authorMatch;
  });

  return (
    <>
      <div className="admin-header" style={{ marginBottom: '12px' }}>
        <h1 className="admin-title">Student Submissions</h1>
      </div>

      <p style={{ marginBottom: 24, color: 'var(--admin-text-muted)', fontSize: 14 }}>
        Moderate posts submitted by students in the Tea Shop. Highly liked and shared posts can be promoted to standard categories.
      </p>

      {/* Search Input Bar */}
      <div className="admin-card" style={{ padding: '16px 24px', marginBottom: 24 }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <FiSearch style={{ position: 'absolute', left: 14, color: 'var(--admin-text-subtle)' }} size={16} />
          <input
            type="text"
            placeholder="Search student submissions by title, description, or author name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="admin-input"
            style={{ width: '100%', paddingLeft: 38 }}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="admin-card">
          <div className="ad-empty">
            <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--admin-text-muted)' }}>
              {searchQuery ? "No submissions match your search query." : "No student submissions to review."}
            </p>
          </div>
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Post Details</th>
                <th>Author</th>
                <th>Likes</th>
                <th>Shares</th>
                <th>Total Engagement</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.map((post) => {
                const engagement = (post.likes?.length || 0) + (post.shares || 0);
                return (
                  <tr key={post._id}>
                    <td style={{ maxWidth: 300 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, display: 'block' }}>{post.title}</span>
                      <span style={{ fontSize: 11, color: 'var(--color-gray-500)', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {post.lead}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{post.author?.name}</span>
                    </td>
                    <td>{post.likes?.length || 0}</td>
                    <td>{post.shares || 0}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700, color: engagement >= 5 ? 'var(--color-red)' : 'inherit' }}>
                        {engagement >= 5 && <FiTrendingUp size={14} />} {engagement}
                      </span>
                    </td>
                    <td style={{ fontSize: 11 }}>{new Date(post.createdAt).toLocaleDateString()}</td>
                    <td style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn-admin-secondary"
                        style={{ padding: '6px 12px', fontSize: 11 }}
                        onClick={() => handleOpenPromoteModal(post)}
                      >
                        <FiCheckCircle size={12} /> Promote
                      </button>
                      <button
                        className="btn-admin-danger"
                        style={{ padding: '6px 12px', fontSize: 11 }}
                        onClick={() => handleDelete(post._id)}
                      >
                        <FiTrash2 size={12} /> Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* PROMOTION DIALOG MODAL */}
      {selectedPost && (
        <div className="admin-modal-overlay" onClick={() => setSelectedPost(null)}>
          <div className="admin-modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', textTransform: 'uppercase', fontSize: 18, margin: 0 }}>Promote Submission</h3>
              <button className="ad-collapse-btn" onClick={() => setSelectedPost(null)}>
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handlePromoteConfirm}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, color: 'var(--admin-text-muted)' }}>Title</label>
                <input
                  type="text"
                  className="admin-input"
                  value={promoTitle}
                  onChange={(e) => setPromoTitle(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, color: 'var(--admin-text-muted)' }}>Lead Summary</label>
                <textarea
                  className="admin-input"
                  rows={3}
                  value={promoLead}
                  onChange={(e) => setPromoLead(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, color: 'var(--admin-text-muted)' }}>Target Category</label>
                <select
                  className="admin-input admin-select"
                  value={promoCategory}
                  onChange={(e) => setPromoCategory(e.target.value)}
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-admin-secondary"
                  onClick={() => setSelectedPost(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-admin-primary"
                  disabled={promoting}
                >
                  {promoting ? 'Promoting...' : 'Promote & Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminSubmissions;
