import { useState, useEffect } from 'react';
import { commentAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { FiSearch } from 'react-icons/fi';

const AdminComments = () => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchComments = () => {
    setLoading(true);
    commentAPI.getPending()
      .then((res) => setComments(res.data.data))
      .catch(() => toast.error('Failed to load comments'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchComments(); }, []);

  const handleApprove = async (id) => {
    try {
      await commentAPI.approve(id);
      toast.success('Comment approved!');
      fetchComments();
    } catch {
      toast.error('Failed to approve comment');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await commentAPI.delete(id);
      toast.success('Comment deleted');
      fetchComments();
    } catch {
      toast.error('Failed to delete comment');
    }
  };

  const filteredComments = comments.filter(c => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const textMatch = c.text?.toLowerCase().includes(query);
    const authorMatch = c.author?.name?.toLowerCase().includes(query) || c.author?.email?.toLowerCase().includes(query);
    const articleMatch = c.article?.title?.toLowerCase().includes(query);
    return textMatch || authorMatch || articleMatch;
  });

  return (
    <>
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Pending Comments</h1>
          <p className="admin-subtitle">Review and approve reader comments before they appear on articles.</p>
        </div>
        <div>
          <span className="admin-badge badge-warning" style={{ fontSize: '13px', padding: '6px 12px' }}>{comments.length} Pending</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="admin-card" style={{ padding: '16px 24px', marginBottom: 24 }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <FiSearch style={{ position: 'absolute', left: 14, color: 'var(--admin-text-subtle)' }} size={16} />
          <input
            type="text"
            placeholder="Search pending comments by text, author name/email, or article title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="admin-input"
            style={{ width: '100%', paddingLeft: 38 }}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : (
        <div className="admin-card" style={{ padding: 0 }}>
          {filteredComments.length === 0 ? (
            <div className="ad-empty">
              <p style={{ fontSize: 48, marginBottom: 16 }}>🎉</p>
              <p>{searchQuery ? "No comments match your search query." : "No pending comments. All caught up!"}</p>
            </div>
          ) : filteredComments.map((c) => (
            <div key={c._id} className="ad-list-row">
              <div className="ad-comment-avatar">{c.author?.name?.charAt(0)?.toUpperCase() || '?'}</div>
              <div className="ad-comment-body">
                <div className="ad-comment-meta">
                  <strong>{c.author?.name || 'Anonymous'}</strong>
                  <span>({c.author?.email})</span>
                  <span>{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--accent-color)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                  On: {c.article?.title}
                </p>
                <p className="ad-comment-text" style={{ maxWidth: 700 }}>{c.text}</p>
              </div>
              <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                <button className="btn-admin-primary" onClick={() => handleApprove(c._id)}>✓ Approve</button>
                <button className="btn-admin-danger" onClick={() => handleDelete(c._id)}>✕ Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default AdminComments;
