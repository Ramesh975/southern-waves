import { useState, useEffect } from 'react';
import { filterAPI, authAPI } from '../../services/api';
import { getImageUrl } from '../../components/ArticleComponents';
import toast from 'react-hot-toast';
import {
  FiAlertTriangle, FiCheck, FiX, FiTrash2, FiLock, FiSlash,
  FiUser, FiClock, FiMessageSquare, FiRefreshCw, FiFlag, FiShield,
  FiSearch
} from 'react-icons/fi';

const TABS = [
  { id: 'pending', label: 'Pending Review', icon: <FiClock size={14} /> },
  { id: 'appeals', label: 'User Appeals', icon: <FiUser size={14} /> },
];

const AdminModerationPage = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [pending, setPending] = useState([]);
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState(null); // { type, item }
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pendingRes, appealsRes] = await Promise.all([
        filterAPI.getPending(),
        authAPI.getAppeals(),
      ]);
      setPending(pendingRes.data.data || []);
      setAppeals(appealsRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load moderation data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleApprove = async (article, unblockAuthor = false) => {
    try {
      await filterAPI.approveArticle(article._id, { unblockAuthor });
      setPending(prev => prev.filter(a => a._id !== article._id));
      toast.success('Article approved and published!');
      setActionModal(null);
    } catch (err) {
      toast.error('Failed to approve article');
    }
  };

  const handleDismiss = async (articleId) => {
    if (!window.confirm('Delete this flagged article permanently?')) return;
    try {
      await filterAPI.dismissArticle(articleId);
      setPending(prev => prev.filter(a => a._id !== articleId));
      toast.success('Article removed.');
    } catch (err) {
      toast.error('Failed to remove article');
    }
  };

  const handleUnblockUser = async (userId) => {
    try {
      await authAPI.unblockUser(userId);
      await fetchData();
      toast.success('User unblocked!');
      setActionModal(null);
    } catch (err) {
      toast.error('Failed to unblock user');
    }
  };

  const categoryColors = {
    profanity: { bg: '#fee2e2', color: '#991b1b' },
    'hate-speech': { bg: '#fce7f3', color: '#9d174d' },
    scam: { bg: '#fef3c7', color: '#92400e' },
    cyberbullying: { bg: '#e0e7ff', color: '#3730a3' },
    spam: { bg: '#d1fae5', color: '#065f46' },
  };

  const getCatStyle = (cat) => categoryColors[cat] || { bg: '#f3f4f6', color: '#374151' };

  const filteredPending = pending.filter(article => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const titleMatch = article.title?.toLowerCase().includes(query);
    const authorMatch = article.author?.name?.toLowerCase().includes(query);
    const reasonMatch = article.flaggedReason?.toLowerCase().includes(query);
    const leadMatch = article.lead?.toLowerCase().includes(query);
    return titleMatch || authorMatch || reasonMatch || leadMatch;
  });

  const filteredAppeals = appeals.filter(u => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const nameMatch = u.name?.toLowerCase().includes(query);
    const emailMatch = u.email?.toLowerCase().includes(query);
    const messageMatch = u.appealMessage?.toLowerCase().includes(query);
    const reasonMatch = u.blockedReason?.toLowerCase().includes(query);
    return nameMatch || emailMatch || messageMatch || reasonMatch;
  });

  return (
    <>
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Content Moderation</h1>
          <p className="admin-subtitle">Review flagged content and user appeals to maintain community standards.</p>
        </div>
        <button
          onClick={fetchData}
          className="btn-admin-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 12, fontWeight: 700 }}
        >
          <FiRefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Stats Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Pending Review', value: pending.length, icon: <FiFlag size={20} />, color: '#f59e0b' },
          { label: 'User Appeals', value: appeals.length, icon: <FiUser size={20} />, color: '#6366f1' },
          { label: 'Total Blocked', value: appeals.length, icon: <FiSlash size={20} />, color: '#ef4444' },
        ].map(s => (
          <div key={s.label} className="admin-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: s.color + '15',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: s.color,
            }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--admin-text-main)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid var(--admin-border)', marginBottom: 24 }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
            style={{
              padding: '12px 16px', fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 8,
              border: 'none', background: 'none', cursor: 'pointer',
              borderBottom: `2px solid ${activeTab === tab.id ? 'var(--accent-color)' : 'transparent'}`,
              color: activeTab === tab.id ? 'var(--accent-color)' : 'var(--admin-text-muted)',
              transition: 'all 0.2s',
            }}
          >
            {tab.icon} {tab.label}
            {tab.id === 'pending' && pending.length > 0 && (
              <span className="admin-badge badge-warning" style={{ padding: '2px 8px', fontSize: 10 }}>{pending.length}</span>
            )}
            {tab.id === 'appeals' && appeals.length > 0 && (
              <span className="admin-badge badge-info" style={{ padding: '2px 8px', fontSize: 10 }}>{appeals.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search Input Bar */}
      <div className="admin-card" style={{ padding: '16px 24px', marginBottom: 24 }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <FiSearch style={{ position: 'absolute', left: 14, color: 'var(--admin-text-subtle)' }} size={16} />
          <input
            type="text"
            placeholder={activeTab === 'pending' ? "Search pending flagged articles by title, author, or reason..." : "Search user appeals by name, email, or appeal message..."}
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
        <>
          {/* PENDING REVIEW TAB */}
          {activeTab === 'pending' && (
            <div>
              {filteredPending.length === 0 ? (
                <EmptyState icon="✅" title="No Pending Content" desc={searchQuery ? "No pending content matches your search query." : "All clear! No articles awaiting moderation review."} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {filteredPending.map(article => (
                    <FlaggedArticleCard
                      key={article._id}
                      article={article}
                      getCatStyle={getCatStyle}
                      onApprove={() => setActionModal({ type: 'approve', item: article })}
                      onDismiss={() => handleDismiss(article._id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* APPEALS TAB */}
          {activeTab === 'appeals' && (
            <div>
              {filteredAppeals.length === 0 ? (
                <EmptyState icon="👍" title="No Pending Appeals" desc={searchQuery ? "No appeals match your search query." : "No users have submitted appeals at this time."} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {filteredAppeals.map(u => (
                    <AppealCard
                      key={u._id}
                      user={u}
                      onUnblock={() => setActionModal({ type: 'unblock', item: u })}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Action Modal */}
      {actionModal && (
        <ActionModal
          modal={actionModal}
          onClose={() => setActionModal(null)}
          onApprove={handleApprove}
          onUnblock={handleUnblockUser}
        />
      )}
    </>
  );
};

const FlaggedArticleCard = ({ article, getCatStyle, onApprove, onDismiss }) => {
  const catStyle = getCatStyle(article.flaggedReason?.split(' ')[1] || 'profanity');
  const authorName = article.author?.name || 'Unknown';
  const authorRole = article.author?.role || 'student';

  return (
    <div className="admin-card" style={{ borderLeft: '4px solid #f59e0b', padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{
              ...catStyle,
              fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
              padding: '4px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4
            }}>
              <FiAlertTriangle size={12} />
              {article.flaggedReason?.split(':')[0] || 'Flagged'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>
              by {authorName} ({authorRole})
            </span>
            <span style={{ fontSize: 12, color: 'var(--admin-text-subtle)' }}>
              · {new Date(article.createdAt).toLocaleDateString()}
            </span>
          </div>
          <h3 className="admin-card-title" style={{ fontSize: 16, marginBottom: 8 }}>
            {article.title}
          </h3>
          <p style={{ fontSize: 14, color: 'var(--admin-text-muted)', lineHeight: 1.6, marginBottom: 12 }}>
            {article.lead}
          </p>
          {article.flaggedReason && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: 8, padding: '10px 14px', fontSize: 12,
              color: '#92400e', display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <FiFlag size={14} style={{ flexShrink: 0, marginTop: 2 }} />
              <span><strong>Filter match:</strong> {article.flaggedReason}</span>
            </div>
          )}
        </div>

        {article.coverImage && (
          <img
            src={getImageUrl(article.coverImage)}
            alt={article.title}
            style={{ width: 100, height: 75, objectFit: 'cover', borderRadius: 8, flexShrink: 0, border: '1px solid var(--admin-border)' }}
          />
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--admin-border)' }}>
        <button className="btn-admin-primary" style={{ background: '#16a34a', borderColor: '#16a34a' }} onClick={onApprove}>
          <FiCheck size={14} /> Approve & Publish
        </button>
        <button className="btn-admin-danger" onClick={onDismiss}>
          <FiTrash2 size={14} /> Remove
        </button>
      </div>
    </div>
  );
};

const AppealCard = ({ user, onUnblock }) => {
  const blockedUntil = user.blockedUntil ? new Date(user.blockedUntil) : null;
  const isTimedOut = blockedUntil && new Date() > blockedUntil;

  return (
    <div className="admin-card" style={{ borderLeft: '4px solid #6366f1', padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div className="ad-comment-avatar" style={{ width: 44, height: 44, fontSize: 16 }}>
              {user.name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--admin-text-main)' }}>{user.name}</div>
              <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{user.email}</div>
            </div>
            <span className="admin-badge badge-info">
              {user.role}
            </span>
          </div>

          <div style={{
            background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: 8, padding: '12px 16px', marginBottom: 12, fontSize: 13,
          }}>
            <strong style={{ color: 'var(--admin-text-main)' }}>Block Reason:</strong>
            <p style={{ margin: '4px 0 0', color: 'var(--admin-text-muted)' }}>{user.blockedReason}</p>
          </div>

          {user.blockedUntil && (
            <div style={{ fontSize: 13, fontWeight: 600, color: isTimedOut ? '#16a34a' : '#d97706', marginBottom: 12 }}>
              {isTimedOut ? '⏱️ Block period has expired (auto-unblock pending)' : `⏰ Blocked until: ${new Date(user.blockedUntil).toLocaleString()}`}
            </div>
          )}

          {user.appealMessage && (
            <div style={{
              background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: 8, padding: '12px 16px', fontSize: 13,
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6366f1', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiMessageSquare size={13} /> Appeal Message
              </div>
              <p style={{ margin: 0, color: 'var(--admin-text-main)', lineHeight: 1.6 }}>
                {user.appealMessage}
              </p>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--admin-border)' }}>
        <button className="btn-admin-primary" style={{ background: '#16a34a', borderColor: '#16a34a' }} onClick={onUnblock}>
          <FiCheck size={14} /> Approve Appeal & Unblock
        </button>
        <button className="btn-admin-secondary" onClick={() => toast('User remains blocked. Appeal denied.', { icon: '🚫' })}>
          <FiX size={14} /> Deny Appeal
        </button>
      </div>
    </div>
  );
};

const ActionModal = ({ modal, onClose, onApprove, onUnblock }) => {
  const [unblockAuthor, setUnblockAuthor] = useState(false);

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-content" onClick={e => e.stopPropagation()} style={{ padding: '32px' }}>
        {modal.type === 'approve' && (
          <>
            <div style={{ fontSize: 32, marginBottom: 12, textAlign: 'center' }}>✅</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, textAlign: 'center', marginBottom: 8, color: 'var(--admin-text-main)' }}>
              Approve Article?
            </h2>
            <p style={{ fontSize: 14, color: 'var(--admin-text-muted)', textAlign: 'center', marginBottom: 24, lineHeight: 1.5 }}>
              <strong>"{modal.item.title}"</strong> will be published immediately.
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginBottom: 24, cursor: 'pointer', color: 'var(--admin-text-main)' }}>
              <input type="checkbox" checked={unblockAuthor} onChange={e => setUnblockAuthor(e.target.checked)} />
              Also unblock the author ({modal.item.author?.name})
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-admin-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
              <button className="btn-admin-primary" style={{ flex: 1, background: '#16a34a', borderColor: '#16a34a' }} onClick={() => onApprove(modal.item, unblockAuthor)}>Approve & Publish</button>
            </div>
          </>
        )}
        {modal.type === 'unblock' && (
          <>
            <div style={{ fontSize: 32, marginBottom: 12, textAlign: 'center' }}>🔓</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, textAlign: 'center', marginBottom: 8, color: 'var(--admin-text-main)' }}>
              Unblock {modal.item.name}?
            </h2>
            <p style={{ fontSize: 14, color: 'var(--admin-text-muted)', textAlign: 'center', marginBottom: 24, lineHeight: 1.5 }}>
              Their account will be restored and they'll be able to post again. Make sure you've reviewed their appeal.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-admin-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
              <button className="btn-admin-primary" style={{ flex: 1, background: '#6366f1', borderColor: '#6366f1' }} onClick={() => onUnblock(modal.item._id)}>Approve & Unblock</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const EmptyState = ({ icon, title, desc }) => (
  <div className="admin-card ad-empty" style={{ padding: '64px 24px' }}>
    <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--admin-text-main)' }}>{title}</h3>
    <p style={{ fontSize: 14, color: 'var(--admin-text-muted)' }}>{desc}</p>
  </div>
);

export default AdminModerationPage;
