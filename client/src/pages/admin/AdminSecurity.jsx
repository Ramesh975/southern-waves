import { useState, useEffect } from 'react';
import { filterAPI, articleAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  FiShield, FiMessageSquare, FiMessageCircle, FiSearch, 
  FiInfo, FiSliders, FiActivity, FiLock, FiUnlock, FiAlertTriangle, 
  FiArrowLeft, FiEdit3, FiSave, FiAlertCircle, FiUser 
} from 'react-icons/fi';

// Premium Soft sliding toggle switch
const ToggleSwitch = ({ checked, onChange, disabled, activeColor = '#ef4444' }) => {
  return (
    <div 
      onClick={() => !disabled && onChange()}
      style={{
        width: '46px',
        height: '24px',
        borderRadius: '100px',
        background: checked ? activeColor : 'var(--color-gray-200, #e5e7eb)',
        padding: '3px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: disabled ? 0.5 : 1,
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)'
      }}
    >
      <div style={{
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        background: '#ffffff',
        boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
        transform: checked ? 'translateX(22px)' : 'translateX(0)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }} />
    </div>
  );
};

const AdminSecurity = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Global settings
  const [globalSettings, setGlobalSettings] = useState({
    globalCommentLock: false,
    globalChatLock: false,
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Article search & list
  const [articles, setArticles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalArticles, setTotalArticles] = useState(0);
  const PAGE_SIZE = 20;

  // Selected Article for Audit Page
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [articleCommentsDisabled, setArticleCommentsDisabled] = useState(false);
  const [articleChatDisabled, setArticleChatDisabled] = useState(false);
  const [securityReasonInput, setSecurityReasonInput] = useState('');
  const [savingArticleSecurity, setSavingArticleSecurity] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchArticles();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoadingSettings(true);
      const res = await filterAPI.getSettings();
      if (res.data?.success) {
        setGlobalSettings(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load global security settings');
    } finally {
      setLoadingSettings(false);
    }
  };

  const fetchArticles = async (query = '', page = 1, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoadingArticles(true);

      const params = { limit: PAGE_SIZE, page };
      if (query) params.search = query;
      const res = await articleAPI.getAll(params);
      if (res.data?.success) {
        const newArticles = res.data.data || [];
        setTotalArticles(res.data.total || 0);
        setHasMore(res.data.currentPage < res.data.totalPages);
        setCurrentPage(res.data.currentPage);
        if (append) {
          setArticles((prev) => [...prev, ...newArticles]);
        } else {
          setArticles(newArticles);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load content list');
    } finally {
      setLoadingArticles(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    fetchArticles(searchQuery, currentPage + 1, true);
  };

  const handleGlobalLockToggle = async (type) => {
    if (!isAdmin) return;
    const updatedValue = !globalSettings[type];
    setSavingSettings(true);
    try {
      const res = await filterAPI.updateSettings({
        [type]: updatedValue,
      });
      if (res.data?.success) {
        setGlobalSettings(res.data.data);
        toast.success(`System ${type === 'globalCommentLock' ? 'comment' : 'chat'} lock ${updatedValue ? 'ACTIVATED' : 'DEACTIVATED'}!`);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Unauthorized');
    } finally {
      setSavingSettings(false);
    }
  };

  // Open the Audit Detail View for an Article
  const handleOpenAuditPage = (article) => {
    setSelectedArticle(article);
    setArticleCommentsDisabled(article.commentsDisabled || false);
    setArticleChatDisabled(article.chatDisabled || false);
    setSecurityReasonInput(article.securityReason || '');
  };

  // Save specific article security locks and report reason
  const handleSaveArticleSecurity = async () => {
    if (!selectedArticle) return;
    setSavingArticleSecurity(true);
    try {
      const res = await filterAPI.toggleArticleSecurity(selectedArticle._id, {
        commentsDisabled: articleCommentsDisabled,
        chatDisabled: articleChatDisabled,
        reason: securityReasonInput.trim(),
      });
      if (res.data?.success) {
        const updatedArticle = res.data.data;
        // Update list
        setArticles((prev) =>
          prev.map((art) => (art._id === updatedArticle._id ? updatedArticle : art))
        );
        setSelectedArticle(updatedArticle);
        toast.success('Interaction security settings saved successfully!');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save security settings');
    } finally {
      setSavingArticleSecurity(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setArticles([]);
    setCurrentPage(1);
    setHasMore(false);
    fetchArticles(searchQuery, 1, false);
  };

  // Statistical calculations
  const activeGlobalLocksCount = (globalSettings.globalCommentLock ? 1 : 0) + (globalSettings.globalChatLock ? 1 : 0);
  const totalCommentsLocked = articles.filter((a) => a.commentsDisabled).length;
  const totalChatLocked = articles.filter((a) => a.chatDisabled).length;

  const displayedArticles = searchQuery.trim()
    ? articles
    : articles.filter((a) => a.commentsDisabled || a.chatDisabled);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Page Header */}
      <div className="admin-header" style={{ marginBottom: '28px' }}>
        <div>
          <h1 className="admin-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FiShield style={{ color: 'var(--color-red)' }} /> Content Security Center
          </h1>
          <p className="admin-subtitle">
            Real-time safety switches and interaction locks. Manage global lockdowns or configure specific comment and chat logs for individual columns.
          </p>
        </div>
      </div>

      {/* Modern Soft Metrics Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '20px', 
        marginBottom: '32px'
      }}>
        {/* System Health Metric Card */}
        <div className="admin-card" style={{
          background: activeGlobalLocksCount > 0 ? '#fffbeb' : 'var(--admin-card-bg)',
          padding: '20px', display: 'flex', alignItems: 'center', gap: '16px'
        }}>
          <div style={{
            background: activeGlobalLocksCount > 0 ? '#fef3c7' : '#ecfdf5',
            width: '46px', height: '46px', borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: activeGlobalLocksCount > 0 ? '#d97706' : '#10b981'
          }}>
            <FiActivity size={22} />
          </div>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--admin-text-muted)', letterSpacing: '0.5px' }}>
              System Protection State
            </span>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--admin-text-main)', marginTop: '4px' }}>
              {activeGlobalLocksCount > 0 ? `${activeGlobalLocksCount} Global Lock Active` : 'All Systems Nominal'}
            </h3>
          </div>
        </div>

        {/* Global Comments Status Card */}
        <div className="admin-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: globalSettings.globalCommentLock ? '#fee2e2' : '#f0fdf4',
            width: '46px', height: '46px', borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: globalSettings.globalCommentLock ? '#ef4444' : '#22c55e'
          }}>
            {globalSettings.globalCommentLock ? <FiLock size={20} /> : <FiUnlock size={20} />}
          </div>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--admin-text-muted)', letterSpacing: '0.5px' }}>
              Global Comment System
            </span>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--admin-text-main)', marginTop: '4px' }}>
              {globalSettings.globalCommentLock ? 'Locked & Disabled' : 'Fully Active'}
            </h3>
          </div>
        </div>

        {/* Global Chat Status Card */}
        <div className="admin-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: globalSettings.globalChatLock ? '#fee2e2' : '#f0fdf4',
            width: '46px', height: '46px', borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: globalSettings.globalChatLock ? '#ef4444' : '#22c55e'
          }}>
            {globalSettings.globalChatLock ? <FiLock size={20} /> : <FiUnlock size={20} />}
          </div>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--admin-text-muted)', letterSpacing: '0.5px' }}>
              Global Chat Rooms
            </span>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--admin-text-main)', marginTop: '4px' }}>
              {globalSettings.globalChatLock ? 'Locked & Disabled' : 'Fully Active'}
            </h3>
          </div>
        </div>
      </div>

      {/* Main Control Panel Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '32px', alignItems: 'start' }}>
        
        {/* Left Column: System-wide Controls */}
        <div>
          <div className="admin-card" style={{ padding: '24px', marginBottom: '24px' }}>
            <h2 className="admin-card-title" style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              borderBottom: '1px solid var(--admin-border)', paddingBottom: '12px', marginBottom: '20px'
            }}>
              <FiSliders size={18} style={{ color: 'var(--accent-color)' }} /> Global System Toggles
            </h2>

            {loadingSettings ? (
              <div className="loading-spinner"><div className="spinner" /></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Global Comment Control Item */}
                <div style={{
                  border: '1px solid var(--admin-border)',
                  borderRadius: '12px', padding: '18px',
                  background: globalSettings.globalCommentLock ? 'rgba(239,68,68,0.05)' : 'var(--admin-card-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <FiMessageSquare size={16} color={globalSettings.globalCommentLock ? '#ef4444' : 'var(--admin-text-muted)'} />
                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--admin-text-main)' }}>
                        Disable Comment Section
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--admin-text-muted)', lineHeight: '1.45', margin: 0 }}>
                      Temporarily lock commenting systems on all articles globally.
                    </p>
                  </div>
                  <div>
                    <ToggleSwitch 
                      checked={globalSettings.globalCommentLock} 
                      onChange={() => handleGlobalLockToggle('globalCommentLock')} 
                      disabled={savingSettings || !isAdmin}
                      activeColor="#ef4444"
                    />
                  </div>
                </div>

                {/* Global Chat Control Item */}
                <div style={{
                  border: '1px solid var(--admin-border)',
                  borderRadius: '12px', padding: '18px',
                  background: globalSettings.globalChatLock ? 'rgba(239,68,68,0.05)' : 'var(--admin-card-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <FiMessageCircle size={16} color={globalSettings.globalChatLock ? '#ef4444' : 'var(--admin-text-muted)'} />
                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--admin-text-main)' }}>
                        Disable Chat Rooms
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--admin-text-muted)', lineHeight: '1.45', margin: 0 }}>
                      Temporarily lock message transmission in all category and tag chat rooms.
                    </p>
                  </div>
                  <div>
                    <ToggleSwitch 
                      checked={globalSettings.globalChatLock} 
                      onChange={() => handleGlobalLockToggle('globalChatLock')} 
                      disabled={savingSettings || !isAdmin}
                      activeColor="#ef4444"
                    />
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Role Warning / Helper banner */}
          <div style={{
            borderRadius: '12px', padding: '16px',
            background: isAdmin ? 'rgba(99, 102, 241, 0.05)' : 'rgba(245, 158, 11, 0.05)',
            border: `1px solid ${isAdmin ? 'rgba(99, 102, 241, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
            display: 'flex', gap: '12px', alignItems: 'flex-start'
          }}>
            {isAdmin ? <FiInfo size={20} style={{ flexShrink: 0, color: 'var(--accent-color)' }} /> : <FiAlertTriangle size={20} style={{ flexShrink: 0, color: '#f59e0b' }} />}
            <div>
              <p style={{ fontWeight: 800, fontSize: '13px', marginBottom: '4px', margin: 0, color: isAdmin ? 'var(--accent-color)' : '#d97706' }}>
                {isAdmin ? 'System Administrator privileges confirmed' : 'Editor Access Mode'}
              </p>
              <p style={{ fontSize: '12px', lineHeight: '1.45', margin: 0, color: 'var(--admin-text-muted)' }}>
                {isAdmin 
                  ? 'You have complete authorization to lock and unlock chat sessions and comments globally.' 
                  : 'You do not have rights to modify global lockouts. Please contact the administrator for global lockdowns. You can still lock individual content columns below.'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic View (Overrides List OR Individual Audit Page) */}
        <div className="admin-card" style={{ padding: '24px' }}>
          
          {selectedArticle ? (
            /* ─────────────────────────────────────────────────
               INDIVIDUAL PAGE: Article Security Audit Page
            ───────────────────────────────────────────────── */
            <div style={{ textAlign: 'left' }}>
              {/* Back to list */}
              <button
                onClick={() => setSelectedArticle(null)}
                style={{
                  background: 'transparent', border: 'none', color: 'var(--accent-color)',
                  fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px',
                  cursor: 'pointer', padding: '4px 0', marginBottom: '20px'
                }}
              >
                <FiArrowLeft size={16} /> Back to Overrides List
              </button>

              <span className="admin-badge" style={{ background: 'var(--admin-hover-bg)', color: 'var(--accent-color)', border: '1px solid var(--accent-color)', marginBottom: '12px' }}>
                {selectedArticle.category}
              </span>

              <h2 className="admin-card-title" style={{ fontSize: '20px', marginBottom: '12px' }}>
                {selectedArticle.title}
              </h2>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--admin-text-muted)', marginBottom: '24px' }}>
                <FiUser /> <span>Author: <strong>{selectedArticle.author?.name || 'Unknown'}</strong></span>
                <span>•</span>
                <span>Views: {selectedArticle.views || 0}</span>
              </div>

              {/* SECTION 1: Report Reasons / Automations */}
              <div style={{
                background: selectedArticle.isFlagged ? 'rgba(239, 68, 68, 0.05)' : 'var(--admin-hover-bg)',
                border: '1px solid ' + (selectedArticle.isFlagged ? 'rgba(239, 68, 68, 0.2)' : 'var(--admin-border)'),
                borderRadius: '12px', padding: '16px', marginBottom: '24px'
              }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 800, margin: '0 0 8px 0', color: selectedArticle.isFlagged ? '#ef4444' : 'var(--admin-text-main)' }}>
                  <FiAlertCircle /> Moderation Flags / Report Reasons
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--admin-text-muted)', margin: 0, lineHeight: '1.5' }}>
                  {selectedArticle.isFlagged 
                    ? <span><strong>System Flagged:</strong> {selectedArticle.flaggedReason || 'Flagged by community standards word filters.'}</span>
                    : 'No automated moderation flags or safety reports are active on this content.'
                  }
                </p>
              </div>

              {/* SECTION 2: Security Toggle Switches */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: 'var(--admin-text-main)' }}>Safety Lock Configuration</h4>
                
                {/* Comments switch */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--admin-hover-bg)', border: '1px solid var(--admin-border)', borderRadius: '12px' }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 700, display: 'block', color: 'var(--admin-text-main)' }}>Comments Panel</span>
                    <span style={{ fontSize: '12px', color: 'var(--admin-text-subtle)' }}>Allow users to reply and comment</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <ToggleSwitch 
                      checked={!articleCommentsDisabled} 
                      onChange={() => setArticleCommentsDisabled(!articleCommentsDisabled)}
                      activeColor="#10b981"
                    />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: articleCommentsDisabled ? '#ef4444' : '#10b981', minWidth: '60px' }}>
                      {articleCommentsDisabled ? 'Disabled' : 'Enabled'}
                    </span>
                  </div>
                </div>

                {/* Chat switch */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--admin-hover-bg)', border: '1px solid var(--admin-border)', borderRadius: '12px' }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 700, display: 'block', color: 'var(--admin-text-main)' }}>Discussion Chat</span>
                    <span style={{ fontSize: '12px', color: 'var(--admin-text-subtle)' }}>Allow messages in room matching this post</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <ToggleSwitch 
                      checked={!articleChatDisabled} 
                      onChange={() => setArticleChatDisabled(!articleChatDisabled)}
                      activeColor="#10b981"
                    />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: articleChatDisabled ? '#ef4444' : '#10b981', minWidth: '60px' }}>
                      {articleChatDisabled ? 'Disabled' : 'Enabled'}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Report Reason Input / Audit log */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, marginBottom: '8px', color: 'var(--admin-text-main)' }}>
                  Override Justification / Lock Reason
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain why commenting or chat is disabled/enabled for audit logs..."
                  value={securityReasonInput}
                  onChange={(e) => setSecurityReasonInput(e.target.value)}
                  className="admin-input"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              {/* SECTION 4: Log By Whom */}
              <div style={{
                background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px', padding: '16px',
                marginBottom: '28px', fontSize: '13px', color: 'var(--accent-color)', border: '1px solid rgba(99, 102, 241, 0.2)', lineHeight: '1.5'
              }}>
                <span style={{ fontWeight: 800, display: 'block', marginBottom: '4px' }}>🛡 Security Change History Log:</span>
                {selectedArticle.securityChangedBy ? (
                  <span>
                    Last changed by: <strong>{selectedArticle.securityChangedBy.name}</strong> ({selectedArticle.securityChangedBy.role})
                    {selectedArticle.securityReason && <span><br />Reason: <em>"{selectedArticle.securityReason}"</em></span>}
                  </span>
                ) : (
                  <span>No manual safety lock overrides recorded. Using default public system settings.</span>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn-admin-primary" onClick={handleSaveArticleSecurity} disabled={savingArticleSecurity} style={{ flex: 1, justifyContent: 'center', height: 44 }}>
                  <FiSave size={16} /> {savingArticleSecurity ? 'Saving...' : 'Save Settings'}
                </button>
                <button className="btn-admin-secondary" onClick={() => setSelectedArticle(null)} style={{ padding: '0 24px', height: 44 }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* ─────────────────────────────────────────────────
               DEFAULT VIEW: Content Security Overrides list
            ───────────────────────────────────────────────── */
            <>
              {/* Statistical locked info line */}
              <div style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', 
                fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--admin-text-muted)', 
                marginBottom: '20px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '12px', flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <span style={{ color: totalCommentsLocked > 0 ? '#ef4444' : 'inherit' }}>
                    💬 Comments Locked: {totalCommentsLocked}
                  </span>
                  <span>|</span>
                  <span style={{ color: totalChatLocked > 0 ? '#ef4444' : 'inherit' }}>
                    🔒 Chat Locked: {totalChatLocked}
                  </span>
                </div>
                {totalArticles > 0 && (
                  <span style={{ color: 'var(--admin-text-subtle)' }}>
                    Showing {articles.length} of {totalArticles}
                  </span>
                )}
              </div>

              {/* Search bar */}
              <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="text"
                    placeholder="Search articles by title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="admin-input"
                    style={{ width: '100%', paddingLeft: '40px' }}
                  />
                  <FiSearch size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-subtle)' }} />
                </div>
                <button type="submit" className="btn-admin-primary" style={{ padding: '0 24px' }}>
                  Search
                </button>
              </form>

              {loadingArticles ? (
                <div className="loading-spinner"><div className="spinner" /></div>
              ) : displayedArticles.length === 0 ? (
                <div className="admin-card ad-empty" style={{ padding: '48px 24px' }}>
                  {searchQuery.trim() ? 'No content columns found matching search.' : 'No active comment or chat overrides currently configured.'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {displayedArticles.map((article) => (
                    <div
                      key={article._id}
                      className="ad-list-row"
                      onClick={() => handleOpenAuditPage(article)}
                      style={{ padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ textAlign: 'left' }}>
                          <span className="admin-badge" style={{ background: 'var(--admin-hover-bg)', color: 'var(--accent-color)', border: '1px solid var(--accent-color)' }}>
                            {article.category}
                          </span>
                          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--admin-text-main)', marginTop: '10px', lineHeight: '1.45', margin: '10px 0 0 0' }}>
                            {article.title}
                          </h3>
                        </div>
                      </div>

                      <div style={{
                        display: 'flex', justifyContent: 'flex-start', alignItems: 'center',
                        borderTop: '1px solid var(--admin-border)', paddingTop: '16px', marginTop: '4px',
                        flexWrap: 'wrap', gap: '24px'
                      }}>
                        {/* Comments status preview */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FiMessageSquare size={14} color={article.commentsDisabled ? '#ef4444' : '#10b981'} />
                          <span style={{ fontSize: '12px', fontWeight: 700, color: article.commentsDisabled ? '#ef4444' : '#10b981' }}>
                            Comments {article.commentsDisabled ? 'Disabled' : 'Enabled'}
                          </span>
                        </div>

                        {/* Chat status preview */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FiMessageCircle size={14} color={article.chatDisabled ? '#ef4444' : '#10b981'} />
                          <span style={{ fontSize: '12px', fontWeight: 700, color: article.chatDisabled ? '#ef4444' : '#10b981' }}>
                            Chat {article.chatDisabled ? 'Disabled' : 'Enabled'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Load More Button */}
                  {hasMore && (
                    <div style={{ paddingTop: '16px', textAlign: 'center' }}>
                      <button onClick={handleLoadMore} disabled={loadingMore} className="btn-admin-secondary">
                        {loadingMore ? 'Loading...' : `Load More (${totalArticles - articles.length} remaining)`}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminSecurity;
