import { useState, useEffect } from 'react';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { FiSlash, FiCheckCircle, FiChevronDown, FiAlertCircle, FiX, FiClock } from 'react-icons/fi';

const ROLES = ['student', 'editor', 'moderator', 'admin'];

const BLOCK_DURATIONS = [
  { label: '1 Hour', value: '1' },
  { label: '6 Hours', value: '6' },
  { label: '12 Hours', value: '12' },
  { label: '1 Day', value: '24' },
  { label: '3 Days', value: '72' },
  { label: '7 Days', value: '168' },
  { label: '30 Days', value: '720' },
  { label: 'Indefinite', value: 'forever' },
];

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Block modal state
  const [blockModal, setBlockModal] = useState(null); // user to block
  const [blockReason, setBlockReason] = useState('');
  const [blockDuration, setBlockDuration] = useState('24');
  const [blocking, setBlocking] = useState(false);

  const fetchUsers = () => {
    setLoading(true);
    authAPI.getAllUsers()
      .then((res) => setUsers(res.data.data))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (id, role) => {
    try {
      await authAPI.updateUserRole(id, role);
      toast.success('Role updated!');
      fetchUsers();
    } catch {
      toast.error('Failed to update role');
    }
  };

  const handleBlock = async (e) => {
    e.preventDefault();
    if (!blockModal) return;
    setBlocking(true);
    try {
      await authAPI.blockUser(blockModal._id, { reason: blockReason, duration: blockDuration });
      toast.success(`${blockModal.name} has been blocked.`);
      setBlockModal(null);
      setBlockReason('');
      setBlockDuration('24');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to block user');
    } finally {
      setBlocking(false);
    }
  };

  const handleUnblock = async (user) => {
    try {
      await authAPI.unblockUser(user._id);
      toast.success(`${user.name} unblocked.`);
      fetchUsers();
    } catch {
      toast.error('Failed to unblock user');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = !searchQuery || u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesStatus = filterStatus === 'all'
      ? true
      : filterStatus === 'blocked' ? u.isBlocked
      : !u.isBlocked;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const isEffectivelyBlocked = (u) => {
    if (!u.isBlocked) return false;
    if (u.blockedUntil && new Date() > new Date(u.blockedUntil)) return false;
    return true;
  };

  const roleColors = {
    admin: 'badge-red',
    moderator: 'badge-blue',
    editor: 'badge-blue',
    student: 'badge-draft',
  };

  return (
    <>
      <div className="admin-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="admin-title">User Management</h1>
          <p className="admin-subtitle">{users.length} total users registered in the system</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {[
          { label: 'Total Users', value: users.length, color: 'var(--accent-color)' },
          { label: 'Blocked', value: users.filter(isEffectivelyBlocked).length, color: '#ef4444' },
          { label: 'Appeals', value: users.filter(u => u.isBlocked && u.appealRequested).length, color: '#f59e0b' },
          { label: 'Moderators', value: users.filter(u => u.role === 'moderator').length, color: '#10b981' },
        ].map(s => (
          <div key={s.label} className="admin-card" style={{ padding: '24px' }}>
            <div style={{ fontSize: '32px', fontWeight: 800, color: s.color, marginBottom: '8px', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="admin-card" style={{ padding: '20px', display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by name or email..."
          className="admin-input"
          style={{ flex: 1, minWidth: '250px' }}
        />
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          className="admin-input"
          style={{ width: 'auto', cursor: 'pointer' }}
        >
          <option value="all">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="admin-input"
          style={{ width: 'auto', cursor: 'pointer' }}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : (
        <div className="admin-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Change Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const blocked = isEffectivelyBlocked(u);
                const hasAppeal = u.isBlocked && u.appealRequested;
                return (
                  <tr key={u._id} style={{ background: blocked ? 'rgba(239,68,68,0.03)' : 'transparent' }}>
                    <td style={{ fontWeight: 600 }}>
                      {u.name}
                      {hasAppeal && (
                        <span style={{
                          marginLeft: 6, fontSize: 10, background: '#fef3c7', color: '#92400e',
                          padding: '1px 6px', borderRadius: 4, fontWeight: 700, verticalAlign: 'middle',
                        }}>
                          ⚠️ APPEAL
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--color-gray-600)' }}>{u.email}</td>
                    <td><span className="admin-badge" style={{ background: 'var(--admin-hover-bg)', color: 'var(--accent-color)', border: '1px solid var(--accent-color)' }}>{u.role}</span></td>
                    <td>
                      <select
                        className="admin-input"
                        style={{ width: '120px', padding: '6px 10px', fontSize: '12px', cursor: 'pointer' }}
                        value={u.role}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        disabled={u.role === 'admin'}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {blocked ? (
                        <div>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <FiSlash size={12} /> Blocked
                          </span>
                          {u.blockedUntil && (
                            <span style={{ fontSize: '11px', color: 'var(--admin-text-subtle)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <FiClock size={10} /> Until {new Date(u.blockedUntil).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <FiCheckCircle size={12} /> Active
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--admin-text-subtle)' }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {blocked ? (
                          <button
                            className="btn-admin-primary"
                            style={{ padding: '6px 12px', fontSize: '11px', background: '#10b981' }}
                            onClick={() => handleUnblock(u)}
                          >
                            <FiCheckCircle size={12} /> Unblock
                          </button>
                        ) : (
                          u.role !== 'admin' && (
                            <button
                              className="btn-admin-danger"
                              style={{ padding: '6px 12px', fontSize: '11px' }}
                              onClick={() => { setBlockModal(u); setBlockReason(''); setBlockDuration('24'); }}
                            >
                              <FiSlash size={12} /> Block
                            </button>
                          )
                        )}
                        {hasAppeal && (
                          <span style={{ fontSize: '11px', color: '#d97706', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <FiAlertCircle size={12} /> Has appeal
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-gray-500)', padding: 32 }}>No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Block Modal */}
      {blockModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
          }}
          onClick={() => setBlockModal(null)}
        >
          <div
            className="admin-card"
            onClick={e => e.stopPropagation()}
            style={{
              padding: '32px', width: '100%', maxWidth: '500px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 className="admin-card-title" style={{ margin: 0 }}>
                🛑 Block User
              </h3>
              <button style={{ background: 'var(--admin-hover-bg)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--admin-text-main)' }} onClick={() => setBlockModal(null)}>
                <FiX size={18} />
              </button>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
              Blocking <strong style={{ color: 'var(--admin-text-main)' }}>{blockModal.name}</strong> ({blockModal.email}) will prevent them from posting any content until the block expires or is manually lifted.
            </p>

            <form onSubmit={handleBlock}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '12px', color: 'var(--admin-text-main)' }}>
                  Block Duration
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {BLOCK_DURATIONS.map(d => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setBlockDuration(d.value)}
                      style={{
                        padding: '8px 16px', fontSize: '12px', fontWeight: 700, borderRadius: '8px',
                        border: `1px solid ${blockDuration === d.value ? 'var(--accent-color)' : 'var(--admin-border)'}`,
                        background: blockDuration === d.value ? 'var(--accent-color)' : 'var(--admin-hover-bg)',
                        color: blockDuration === d.value ? '#ffffff' : 'var(--admin-text-main)',
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', color: 'var(--admin-text-main)' }}>
                  Reason <span style={{ color: 'var(--admin-text-subtle)', textTransform: 'none', fontWeight: 400 }}>(shown to user)</span>
                </label>
                <textarea
                  value={blockReason}
                  onChange={e => setBlockReason(e.target.value)}
                  placeholder="e.g. Posted content violating community guidelines regarding profanity..."
                  rows={4}
                  className="admin-input"
                  style={{ width: '100%', resize: 'vertical' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <button type="button" className="btn-admin-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setBlockModal(null)}>
                  Cancel
                </button>
                <button type="submit" disabled={blocking} className="btn-admin-danger" style={{ flex: 1, justifyContent: 'center' }}>
                  {blocking ? 'Blocking...' : 'Block User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminUsers;
