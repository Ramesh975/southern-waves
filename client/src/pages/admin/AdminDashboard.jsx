import { useState, useEffect } from 'react';
import { articleAPI, commentAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  FiFileText, FiEye, FiCheckCircle, FiEdit3,
  FiArrowUpRight, FiTrendingUp, FiMessageSquare,
  FiPlusCircle, FiClock, FiActivity
} from 'react-icons/fi';

/* ── tiny sparkline bar chart ── */
const SparkBar = ({ values = [], color = '#c8102e', labels = [] }) => {
  const max = Math.max(...values, 1);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const handleInteraction = (e, index) => {
    const target = e.currentTarget;
    const parent = target.parentElement;
    if (!parent) return;
    
    const targetRect = target.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    
    // Calculate tooltip coordinates relative to parent
    setTooltipPos({
      x: targetRect.left - parentRect.left + targetRect.width / 2,
      y: targetRect.top - parentRect.top - 28
    });
    setHoveredIndex(index);
  };

  const handleLeave = () => {
    setHoveredIndex(null);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 40 }}>
        {values.map((v, i) => (
          <div
            key={i}
            onMouseEnter={(e) => handleInteraction(e, i)}
            onMouseMove={(e) => handleInteraction(e, i)}
            onMouseLeave={handleLeave}
            onTouchStart={(e) => handleInteraction(e, i)}
            onTouchMove={(e) => handleInteraction(e, i)}
            onTouchEnd={handleLeave}
            style={{
              flex: 1,
              height: `${(v / max) * 100}%`,
              background: color,
              borderRadius: 3,
              opacity: hoveredIndex === i ? 1 : 0.6 + (i / values.length) * 0.4,
              transition: 'height 0.5s ease, opacity 0.15s ease',
              cursor: 'pointer',
            }}
          />
        ))}
      </div>
      
      {/* Tooltip Overlay */}
      {hoveredIndex !== null && (
        <div style={{
          position: 'absolute',
          left: tooltipPos.x,
          top: tooltipPos.y,
          transform: 'translateX(-50%)',
          background: 'rgba(17, 17, 17, 0.95)',
          color: '#ffffff',
          padding: '3px 8px',
          borderRadius: '6px',
          fontSize: '10px',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 100,
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          {labels[hoveredIndex] ? `${labels[hoveredIndex]}: ` : ''}{typeof values[hoveredIndex] === 'number' ? values[hoveredIndex].toLocaleString() : values[hoveredIndex]}
          <div style={{
            position: 'absolute',
            bottom: -4,
            left: '50%',
            transform: 'translateX(-50%)',
            borderWidth: '4px 4px 0',
            borderStyle: 'solid',
            borderColor: 'rgba(17, 17, 17, 0.95) transparent transparent',
            width: 0,
            height: 0
          }} />
        </div>
      )}
    </div>
  );
};

/* ── radial progress ring ── */
const ProgressRing = ({ pct = 0, size = 80, stroke = 6, color = '#c8102e', label = '' }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(200,16,46,0.15)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
      }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#0d0d0d' }}>{pct}%</span>
        <span style={{ fontSize: 9, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
      </div>
    </div>
  );
};

/* ── category badge colors ── */
const catColor = (cat) => ({
  news: { bg: '#fee2e2', text: '#991b1b' },
  editorial: { bg: '#dbeafe', text: '#1e40af' },
  features: { bg: '#dcfce7', text: '#166534' },
  kyp: { bg: '#fef9c3', text: '#92400e' },
  'tea-shop': { bg: '#fce7f3', text: '#9d174d' },
  'pictures-speak': { bg: '#ede9fe', text: '#5b21b6' },
}[cat] || { bg: '#f3f4f6', text: '#374151' });

/* ── time ago helper ── */
const timeAgo = (date) => {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/* ────────────────────────────────────────────── */

const AdminDashboard = () => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState({ articles: 0, published: 0, drafts: 0, views: 0 });
  const [recentArticles, setRecentArticles] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weeklyViews] = useState([120, 180, 145, 210, 195, 260, 310]);

  useEffect(() => {
    Promise.all([
      articleAPI.getAll({ limit: 8 }),
      articleAPI.getAll({ status: 'published', limit: 1 }),
      articleAPI.getAll({ status: 'draft', limit: 1 }),
      commentAPI.getPending().catch(() => ({ data: { data: [] } })),
    ]).then(([all, published, drafts, cmts]) => {
      const totalViews = all.data.data.reduce((s, a) => s + (a.views || 0), 0);
      setStats({
        articles: all.data.total,
        published: published.data.total,
        drafts: drafts.data.total,
        views: totalViews,
      });
      setRecentArticles(all.data.data.slice(0, 6));
      setComments(cmts.data?.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const publishRate = stats.articles > 0 ? Math.round((stats.published / stats.articles) * 100) : 0;

  const statCards = [
    {
      label: 'Total Articles',
      value: stats.articles,
      icon: <FiFileText size={20} />,
      color: '#c8102e',
      bg: '#fff0f2',
      trend: '+12%',
      spark: [8, 12, 9, 15, 11, 18, stats.articles],
    },
    {
      label: 'Published',
      value: stats.published,
      icon: <FiCheckCircle size={20} />,
      color: '#16a34a',
      bg: '#f0fdf4',
      trend: '+8%',
      spark: [5, 8, 6, 10, 9, 12, stats.published],
    },
    {
      label: 'Drafts',
      value: stats.drafts,
      icon: <FiEdit3 size={20} />,
      color: '#d97706',
      bg: '#fffbeb',
      trend: 'Active',
      spark: [3, 4, 3, 5, 4, 6, stats.drafts],
    },
    {
      label: 'Total Views',
      value: stats.views?.toLocaleString() || 0,
      icon: <FiEye size={20} />,
      color: '#7c3aed',
      bg: '#f5f3ff',
      trend: '+24%',
      spark: weeklyViews,
    },
  ];

  return (
    <div className="ad-root">

      {/* ── Page Header ── */}
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Dashboard</h1>
          <p className="admin-subtitle">
            Welcome back, <strong>{user?.name}</strong>! Here's what's happening at Southern Waves.
          </p>
        </div>
        <div>
          <Link to="/admin/new-article" className="btn-admin-primary">
            <FiPlusCircle size={15} /> New Article
          </Link>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="stats-grid">
        {statCards.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-top">
              <div className="stat-icon" style={{ background: s.bg, color: s.color }}>
                {s.icon}
              </div>
              <span className="admin-badge" style={{ background: `${s.color}15`, color: s.color, border: `1px solid ${s.color}30` }}>
                <FiArrowUpRight size={12} /> {s.trend}
              </span>
            </div>
            <div className="stat-value">{loading ? '—' : s.value}</div>
            <div className="stat-label">{s.label}</div>
            <div style={{ marginTop: 16 }}>
              <SparkBar values={s.spark} color={s.color} labels={DAYS} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Middle Row ── */}
      <div className="ad-mid-row">

        {/* Recent Articles */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">
              <FiActivity size={16} /> Recent Articles
            </div>
            <Link to="/admin/articles" className="ad-see-all">See all →</Link>
          </div>

          <div>
            {loading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="ad-list-row skeleton-row">
                  <div className="skeleton" style={{ height: 14, width: '60%', borderRadius: 4 }} />
                  <div className="skeleton" style={{ height: 12, width: '20%', borderRadius: 4 }} />
                </div>
              ))
            ) : recentArticles.length === 0 ? (
              <div className="ad-empty">No articles yet. <Link to="/admin/new-article">Create one →</Link></div>
            ) : (
              recentArticles.map((a) => {
                const cc = catColor(a.category);
                return (
                  <div key={a._id} className="ad-list-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="ad-article-meta">
                        <span className="admin-badge" style={{ background: cc.bg, color: cc.text }}>
                          {a.category}
                        </span>
                        <span className={`ad-status-dot ${a.status}`} />
                      </div>
                      <p className="ad-article-title">{a.title}</p>
                      <div className="ad-article-footer">
                        <span><FiClock size={12} /> {timeAgo(a.createdAt)}</span>
                        <span><FiEye size={12} /> {(a.views || 0).toLocaleString()}</span>
                        <div className="ad-article-actions">
                          <Link to={`/admin/edit-article/${a._id}`} className="admin-badge badge-warning">Edit</Link>
                          <Link to={`/article/${a.slug}`} target="_blank" className="admin-badge badge-neutral">View</Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="ad-right-col">

          {/* Publish Health */}
          <div className="admin-card">
            <div className="admin-card-header">
              <div className="admin-card-title"><FiTrendingUp size={16} /> Publish Health</div>
            </div>
            <div className="ad-health-body">
              <ProgressRing pct={publishRate} label="Published" />
              <div className="ad-health-stats">
                <div className="ad-health-item">
                  <div className="ad-health-dot" style={{ background: '#16a34a' }} />
                  <div>
                    <p className="ad-health-num">{loading ? '—' : stats.published}</p>
                    <p className="ad-health-lbl">Published</p>
                  </div>
                </div>
                <div className="ad-health-item">
                  <div className="ad-health-dot" style={{ background: '#d97706' }} />
                  <div>
                    <p className="ad-health-num">{loading ? '—' : stats.drafts}</p>
                    <p className="ad-health-lbl">Drafts</p>
                  </div>
                </div>
                <div className="ad-health-item">
                  <div className="ad-health-dot" style={{ background: '#c8102e' }} />
                  <div>
                    <p className="ad-health-num">{loading ? '—' : stats.articles}</p>
                    <p className="ad-health-lbl">Total</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Views */}
          <div className="admin-card">
            <div className="admin-card-header">
              <div className="admin-card-title"><FiEye size={16} /> Weekly Views</div>
              <span className="admin-badge badge-success">↑ 24%</span>
            </div>
            <div style={{ padding: '0 8px' }}>
              <SparkBar values={weeklyViews} color="var(--accent-color)" labels={WEEKDAYS} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                  <span key={i} style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontWeight: 700 }}>{d}</span>
                ))}
              </div>
            </div>
            <p className="ad-views-total">
              {weeklyViews.reduce((a, b) => a + b, 0).toLocaleString()} <span>this week</span>
            </p>
          </div>

          {/* Quick Actions */}
          <div className="admin-card">
            <div className="admin-card-title" style={{ padding: '24px 24px 0' }}>Quick Actions</div>
            <div className="ad-quick-grid">
              {[
                { to: '/admin/new-article', label: 'Write Article', icon: <FiEdit3 size={18} />, color: '#c8102e' },
                { to: '/admin/submissions', label: 'Submissions', icon: <FiFileText size={18} />, color: '#7c3aed' },
                { to: '/admin/comments', label: 'Comments', icon: <FiMessageSquare size={18} />, color: '#d97706' },
                ...(isAdmin ? [{ to: '/admin/users', label: 'Manage Users', icon: <FiActivity size={18} />, color: '#16a34a' }] : []),
              ].map(q => (
                <Link key={q.to} to={q.to} className="ad-quick-item">
                  <div className="ad-quick-icon" style={{ background: q.color + '18', color: q.color }}>{q.icon}</div>
                  <span>{q.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Comments ── */}
      {comments.length > 0 && (
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title"><FiMessageSquare size={16} /> Recent Comments</div>
            <Link to="/admin/comments" className="ad-see-all">Manage →</Link>
          </div>
          <div>
            {comments.slice(0, 4).map((c) => (
              <div key={c._id} className="ad-list-row">
                <div className="ad-comment-avatar">{c.author?.name?.charAt(0)?.toUpperCase() || '?'}</div>
                <div className="ad-comment-body">
                  <div className="ad-comment-meta">
                    <strong>{c.author?.name || 'Anonymous'}</strong>
                    <span>{timeAgo(c.createdAt)}</span>
                    <span className={`admin-badge ${c.isApproved ? 'badge-success' : 'badge-warning'}`}>
                      {c.isApproved ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                  <p className="ad-comment-text">{c.text?.slice(0, 120)}{c.text?.length > 120 ? '…' : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
