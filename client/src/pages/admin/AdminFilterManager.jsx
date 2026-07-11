import { useState, useEffect } from 'react';
import { filterAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2, FiToggleLeft, FiToggleRight, FiSearch, FiShield, FiAlertOctagon, FiTag, FiHash, FiUser, FiCalendar } from 'react-icons/fi';

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'profanity', label: '🤬 Profanity', color: '#ef4444' },
  { value: 'hate-speech', label: '☠️ Hate Speech', color: '#db2777' },
  { value: 'scam', label: '💸 Scam', color: '#f59e0b' },
  { value: 'cyberbullying', label: '🥊 Cyberbullying', color: '#6366f1' },
  { value: 'spam', label: '📧 Spam', color: '#22c55e' },
];

const SEVERITIES = ['low', 'medium', 'high'];

const AdminFilterManager = () => {
  const [words, setWords] = useState([]);
  const [defaults, setDefaults] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('custom'); // 'custom' | 'defaults' | 'tags'

  // Add form state for words
  const [newWord, setNewWord] = useState('');
  const [newCategory, setNewCategory] = useState('profanity');
  const [newSeverity, setNewSeverity] = useState('medium');
  const [adding, setAdding] = useState(false);

  // Blocked tags states
  const [blockedTags, setBlockedTags] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [addingTag, setAddingTag] = useState(false);

  const fetchWords = async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeCategory !== 'all') params.category = activeCategory;
      if (searchQuery) params.search = searchQuery;
      const [wordsRes, defaultsRes] = await Promise.all([
        filterAPI.getWords(params),
        filterAPI.getDefaults(),
      ]);
      setWords(wordsRes.data.data || []);
      setDefaults(defaultsRes.data.data || {});
    } catch (err) {
      toast.error('Failed to load filter words');
    } finally {
      setLoading(false);
    }
  };

  const fetchBlockedTags = async () => {
    setTagsLoading(true);
    try {
      const res = await filterAPI.getBlockedTags();
      setBlockedTags(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load blocked tags');
    } finally {
      setTagsLoading(false);
    }
  };

  useEffect(() => { 
    if (activeTab === 'custom') {
      fetchWords(); 
    } else if (activeTab === 'tags') {
      fetchBlockedTags();
    }
  }, [activeCategory, activeTab]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (activeTab === 'custom') {
      fetchWords();
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newWord.trim()) return;
    setAdding(true);
    try {
      const res = await filterAPI.addWord({ word: newWord.trim(), category: newCategory, severity: newSeverity });
      setWords(prev => [res.data.data, ...prev]);
      setNewWord('');
      toast.success(`"${res.data.data.word}" added to filter list!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add word');
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (word) => {
    try {
      const res = await filterAPI.updateWord(word._id, { isActive: !word.isActive });
      setWords(prev => prev.map(w => w._id === word._id ? res.data.data : w));
      toast.success(`"${word.word}" ${res.data.data.isActive ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error('Failed to update word');
    }
  };

  const handleDelete = async (wordId, wordText) => {
    if (!window.confirm(`Remove "${wordText}" from filter list?`)) return;
    try {
      await filterAPI.deleteWord(wordId);
      setWords(prev => prev.filter(w => w._id !== wordId));
      toast.success('Word removed from filter list');
    } catch (err) {
      toast.error('Failed to remove word');
    }
  };

  // Blocked tags handlers
  const handleAddTag = async (e) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    setAddingTag(true);
    try {
      const res = await filterAPI.addBlockedTag(newTagName.trim());
      setBlockedTags(prev => [res.data.data, ...prev].sort((a, b) => a.tag.localeCompare(b.tag)));
      setNewTagName('');
      toast.success(`Tag #${res.data.data.tag} has been blocked!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to block tag');
    } finally {
      setAddingTag(false);
    }
  };

  const handleDeleteTag = async (tagId, tagName) => {
    if (!window.confirm(`Unblock tag #${tagName}?`)) return;
    try {
      await filterAPI.deleteBlockedTag(tagId);
      setBlockedTags(prev => prev.filter(t => t._id !== tagId));
      toast.success(`Tag #${tagName} is now unblocked.`);
    } catch (err) {
      toast.error('Failed to unblock tag');
    }
  };

  const catColor = (cat) => {
    const found = CATEGORIES.find(c => c.value === cat);
    return found?.color || '#6b7280';
  };

  const severityColors = { low: '#22c55e', medium: '#f59e0b', high: '#ef4444' };

  const filteredTags = blockedTags.filter(t => {
    if (!searchQuery) return true;
    return t.tag?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredDefaults = Object.entries(defaults || {}).reduce((acc, [category, wordList]) => {
    const matched = wordList.filter(w => {
      if (!searchQuery) return true;
      return w.toLowerCase().includes(searchQuery.toLowerCase());
    });
    if (matched.length > 0 || !searchQuery) {
      acc[category] = matched;
    }
    return acc;
  }, {});

  return (
    <>
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Filter Manager</h1>
          <p className="admin-subtitle">
            Manage words, phrases, and tags that trigger content moderation
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid var(--admin-border)', marginBottom: 24 }}>
        {[
          { id: 'custom', label: 'Custom Filters', icon: <FiShield size={14} /> },
          { id: 'tags', label: 'Blocked Tags', icon: <FiTag size={14} /> },
          { id: 'defaults', label: 'Default Word List', icon: <FiAlertOctagon size={14} /> },
        ].map(tab => (
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
          </button>
        ))}
      </div>

      {/* Tab 1: Custom Filter Words */}
      {activeTab === 'custom' && (
        <>
          {/* Add new word */}
          <div className="admin-card" style={{ padding: '20px 24px', marginBottom: 24 }}>
            <h3 className="admin-card-title" style={{ marginBottom: 16 }}>Add New Filter Word</h3>
            <form onSubmit={handleAdd} style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 2, minWidth: 200 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, color: 'var(--admin-text-muted)' }}>
                  Word or Phrase
                </label>
                <input
                  type="text"
                  placeholder="e.g. wire transfer"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  className="admin-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ flex: 1, minWidth: 150 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, color: 'var(--admin-text-muted)' }}>
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="admin-input admin-select"
                  style={{ width: '100%' }}
                >
                  {CATEGORIES.slice(1).map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1, minWidth: 130 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, color: 'var(--admin-text-muted)' }}>
                  Severity
                </label>
                <select
                  value={newSeverity}
                  onChange={(e) => setNewSeverity(e.target.value)}
                  className="admin-input admin-select"
                  style={{ width: '100%', textTransform: 'capitalize' }}
                >
                  {SEVERITIES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={adding || !newWord.trim()}
                className="btn-admin-primary"
                style={{ height: 42, opacity: (!newWord.trim() || adding) ? 0.6 : 1 }}
              >
                <FiPlus size={16} /> {adding ? 'Adding...' : 'Add Word'}
              </button>
            </form>
          </div>

          {/* Filters and List */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`btn-admin-secondary`}
                  style={{
                    borderRadius: 20,
                    background: activeCategory === cat.value ? 'var(--admin-text-main)' : 'var(--admin-card-bg)',
                    color: activeCategory === cat.value ? 'var(--admin-card-bg)' : 'var(--admin-text-muted)',
                    borderColor: activeCategory === cat.value ? 'var(--admin-text-main)' : 'var(--admin-border)',
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, minWidth: 260 }}>
              <input
                type="text"
                placeholder="Search custom words..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="admin-input"
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn-admin-secondary" style={{ padding: '0 14px' }}>
                <FiSearch size={16} />
              </button>
            </form>
          </div>

          {loading ? (
            <div className="loading-spinner"><div className="spinner" /></div>
          ) : words.length === 0 ? (
            <div className="admin-card ad-empty">
              No custom filters found.
            </div>
          ) : (
            <div className="admin-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Word / Phrase</th>
                    <th>Category</th>
                    <th>Severity</th>
                    <th>Added By</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {words.map(word => (
                    <tr key={word._id}>
                      <td style={{ fontWeight: 700, color: 'var(--admin-text-main)' }}>{word.word}</td>
                      <td>
                        <span className="admin-badge" style={{ background: catColor(word.category) + '20', color: catColor(word.category) }}>
                          {word.category}
                        </span>
                      </td>
                      <td>
                        <span className="admin-badge" style={{ background: severityColors[word.severity] + '20', color: severityColors[word.severity] }}>
                          {word.severity}
                        </span>
                      </td>
                      <td style={{ color: 'var(--admin-text-muted)' }}>
                        {word.createdBy?.name || 'System'}
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggle(word)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: word.isActive ? '#16a34a' : 'var(--admin-text-subtle)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}
                        >
                          {word.isActive ? <FiToggleRight size={20} /> : <FiToggleLeft size={20} />}
                          {word.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                        {new Date(word.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <button
                          onClick={() => handleDelete(word._id, word.word)}
                          className="btn-admin-danger" style={{ padding: '6px 12px', fontSize: 11 }}
                        >
                          <FiTrash2 size={12} /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Tab 2: Blocked Tags Manager */}
      {activeTab === 'tags' && (
        <>
          {/* Add blocked tag form */}
          <div className="admin-card" style={{ padding: '20px 24px', marginBottom: 24 }}>
            <h3 className="admin-card-title" style={{ marginBottom: 16 }}>Block a Tag</h3>
            <form onSubmit={handleAddTag} style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, color: 'var(--admin-text-muted)' }}>
                  Tag Name (without '#')
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: 14, fontSize: 15, fontWeight: 700, color: 'var(--admin-text-subtle)' }}>#</span>
                  <input
                    type="text"
                    placeholder="e.g. politics"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className="admin-input"
                    style={{ width: '100%', paddingLeft: 32 }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={addingTag || !newTagName.trim()}
                className="btn-admin-primary"
                style={{ height: 42, opacity: (!newTagName.trim() || addingTag) ? 0.6 : 1 }}
              >
                <FiPlus size={16} /> {addingTag ? 'Blocking...' : 'Block Tag'}
              </button>
            </form>
          </div>
          {/* Search Blocked Tags */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: 20 }}>
            <FiSearch style={{ position: 'absolute', left: 12, color: 'var(--admin-text-subtle)' }} size={16} />
            <input
              type="text"
              placeholder="Search blocked tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-input"
              style={{ paddingLeft: 36, fontSize: '13px' }}
            />
          </div>

          {tagsLoading ? (
            <div className="loading-spinner"><div className="spinner" /></div>
          ) : filteredTags.length === 0 ? (
            <div className="admin-card ad-empty">
              {searchQuery ? "No blocked tags match your search query." : "No tags are currently blocked. Admins can select any tag to restrict."}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {filteredTags.map(tag => (
                <div key={tag._id} className="admin-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <FiHash size={18} color="var(--accent-color)" />
                      <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--admin-text-main)' }}>{tag.tag}</span>
                      <span className="admin-badge badge-danger">Banned</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--admin-text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FiUser size={14} /> Blocked by: <strong>{tag.createdBy?.name || 'System'}</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FiCalendar size={14} /> Banned on: {new Date(tag.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteTag(tag._id, tag.tag)}
                    className="btn-admin-danger" style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <FiTrash2 size={14} /> Unblock Tag
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab 3: Default Words */}
      {activeTab === 'defaults' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
            <p style={{ fontSize: 14, color: 'var(--admin-text-muted)', margin: 0, flex: 1, lineHeight: 1.6 }}>
              These words are built into the system and are always active. They cannot be removed, but you can add custom words above.
            </p>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '280px' }}>
              <FiSearch style={{ position: 'absolute', left: 12, color: 'var(--admin-text-subtle)' }} size={16} />
              <input
                type="text"
                placeholder="Search default words..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="admin-input"
                style={{ paddingLeft: 36, fontSize: '13px' }}
              />
            </div>
          </div>
          {Object.entries(filteredDefaults).map(([category, wordList]) => (
            <div key={category} className="admin-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span className="admin-badge" style={{ background: catColor(category) + '20', color: catColor(category) }}>
                  {category}
                </span>
                <span style={{ fontSize: 13, color: 'var(--admin-text-muted)', fontWeight: 600 }}>{wordList.length} words</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {wordList.map(w => (
                  <code key={w} style={{
                    fontSize: 12, fontFamily: 'var(--font-mono, monospace)',
                    background: 'var(--admin-hover-bg)', padding: '4px 10px', borderRadius: 6,
                    color: 'var(--admin-text-main)', border: '1px solid var(--admin-border)'
                  }}>
                    {w}
                  </code>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default AdminFilterManager;
