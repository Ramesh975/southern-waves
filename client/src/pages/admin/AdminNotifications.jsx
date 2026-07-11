import { useState, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { notificationAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { FiTrash2, FiSend, FiSearch } from 'react-icons/fi';

const AdminNotifications = () => {
  const { notifications, fetchNotifications, deleteNotification } = useChat();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('board_news');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      return toast.error('Please enter all fields');
    }

    setSubmitting(true);
    try {
      await notificationAPI.create({
        title: title.trim(),
        message: message.trim(),
        type,
      });
      toast.success('Notification pushed successfully!');
      setTitle('');
      setMessage('');
      setType('board_news');
      fetchNotifications();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to push notification');
    } finally {
      setSubmitting(false);
    }
  };

  const getLabel = (t) => {
    if (t === 'board_news') return 'Board News';
    if (t === 'sensitivity') return 'Critical Alert';
    return 'Announcement';
  };

  const getBadgeClass = (t) => {
    if (t === 'sensitivity') return 'badge-red';
    if (t === 'board_news') return 'badge-blue';
    return 'badge-draft';
  };

  const filteredNotifications = notifications.filter(n => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return n.title?.toLowerCase().includes(query) || n.message?.toLowerCase().includes(query);
  });

  return (
    <>
      <div className="admin-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="admin-title">Push Notifications</h1>
          <p className="admin-subtitle">
            Broadcast news and critical alerts to the student body in real time.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', alignItems: 'start' }}>
        
        {/* Left: Create Form */}
        <div className="admin-card" style={{ padding: '24px' }}>
          <h2 className="admin-card-title" style={{ marginBottom: '20px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '12px' }}>
            New Notification Broadcast
          </h2>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px', color: 'var(--admin-text-main)' }}>
                Notification Title
              </label>
              <input
                type="text"
                placeholder="e.g. End Semester Exam Registration Open"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                className="admin-input"
                style={{ width: '100%' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px', color: 'var(--admin-text-main)' }}>
                Notification Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="admin-input"
                style={{ width: '100%', cursor: 'pointer' }}
              >
                <option value="board_news">University Board News</option>
                <option value="announcement">General Announcement</option>
                <option value="sensitivity">Sensitivity / Critical Information</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px', color: 'var(--admin-text-main)' }}>
                Broadcast Message
              </label>
              <textarea
                placeholder="Write the details of the announcement here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={1000}
                rows={5}
                className="admin-input"
                style={{ width: '100%', resize: 'vertical' }}
                required
              />
            </div>

            <button type="submit" disabled={submitting} className="btn-admin-primary" style={{ justifyContent: 'center', marginTop: '8px' }}>
              <FiSend size={16} />
              {submitting ? 'Pushing Broadcast...' : 'Push Notification'}
            </button>
          </form>
        </div>

        {/* Right: Broadcast History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--admin-border)', paddingBottom: '12px' }}>
            <h2 className="admin-card-title" style={{ margin: 0 }}>
              Broadcast History
            </h2>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--admin-text-subtle)' }}>{filteredNotifications.length} Sent</span>
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <FiSearch style={{ position: 'absolute', left: 12, color: 'var(--admin-text-subtle)' }} size={16} />
            <input
              type="text"
              placeholder="Search history by title/text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-input"
              style={{ paddingLeft: 36, fontSize: '12px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '600px', overflowY: 'auto', paddingRight: '4px' }}>
            {filteredNotifications.length === 0 ? (
              <div className="admin-card ad-empty" style={{ padding: '32px', textAlign: 'center' }}>
                {searchQuery ? "No history matches your search query." : "No broadcast history found."}
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div key={n._id} className="ad-list-row" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="admin-badge" style={{ background: 'var(--admin-hover-bg)', color: 'var(--accent-color)', border: '1px solid var(--accent-color)' }}>
                      {getLabel(n.type)}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--admin-text-subtle)', fontWeight: 600 }}>
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--admin-text-main)' }}>{n.title}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--admin-text-muted)', margin: 0, lineHeight: 1.45 }}>{n.message}</p>

                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    borderTop: '1px solid var(--admin-border)', paddingTop: '12px', marginTop: '4px',
                    fontSize: '12px', color: 'var(--admin-text-subtle)',
                  }}>
                    <span>
                      Read by <strong>{n.readBy?.length || 0}</strong> student{(n.readBy?.length || 0) === 1 ? '' : 's'}
                    </span>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete announcement "${n.title}"?`)) {
                          deleteNotification(n._id);
                        }
                      }}
                      className="btn-admin-danger"
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                    >
                      <FiTrash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminNotifications;
