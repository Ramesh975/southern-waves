import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { articleAPI } from '../services/api';
import TrendingWidget from '../components/TrendingWidget';
import { getImageUrl } from '../components/ArticleComponents';
import { FiFilter, FiShield, FiEye, FiEyeOff, FiX } from 'react-icons/fi';

// Client-side bad word categories for safe search filtering
const FILTER_CATEGORIES = {
  profanity: ['fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'crap', 'dick', 'cock', 'slut', 'whore'],
  'hate-speech': ['kill all', 'genocide', 'white power', 'sub-human', 'inferior race', 'ethnic cleansing'],
  scam: ['click here to win', 'lottery winner', 'send money', 'bitcoin investment', 'double your money', 'get rich quick', 'free money'],
  cyberbullying: ['kill yourself', 'kys', 'go kill yourself', 'nobody loves you', 'you are worthless', 'end your life'],
};

const matchesFilterWord = (text, word) => {
  const normalText = text.toLowerCase();
  return normalText.includes(word.toLowerCase());
};

const checkArticleAgainstFilters = (article, activeFilters, personalList) => {
  const combined = `${article.title || ''} ${article.lead || ''} ${article.body || ''}`.toLowerCase();

  // Check active category filters
  for (const cat of activeFilters) {
    const words = FILTER_CATEGORIES[cat] || [];
    for (const w of words) {
      if (combined.includes(w.toLowerCase())) {
        return { flagged: true, reason: cat };
      }
    }
  }

  // Check personal blocklist
  if (personalList.length > 0) {
    for (const w of personalList) {
      const trimmed = w.trim().toLowerCase();
      if (trimmed && combined.includes(trimmed)) {
        return { flagged: true, reason: 'personal filter' };
      }
    }
  }

  return { flagged: false, reason: null };
};

const SearchPage = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const queryParams = new URLSearchParams(location.search);
  const q = queryParams.get('q') || '';
  const tag = queryParams.get('tag') || '';

  const [searchInput, setSearchInput] = useState(q || tag);
  const searchInputRef = useRef(null);

  // Safe search state
  const [showFilters, setShowFilters] = useState(false);
  const [safeSearchEnabled, setSafeSearchEnabled] = useState(false);
  const [activeFilters, setActiveFilters] = useState(
    Object.keys(FILTER_CATEGORIES)
  );
  const [personalBlocklist, setPersonalBlocklist] = useState('');
  const [revealedArticles, setRevealedArticles] = useState(new Set());

  const personalList = personalBlocklist.split(',').map(w => w.trim()).filter(Boolean);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const params = { status: 'published' };
        if (q) params.search = q;
        if (tag) params.tag = tag;

        if (q || tag) {
          const res = await articleAPI.getAll(params);
          setArticles(res.data.data);
        } else {
          setArticles([]);
        }
      } catch (error) {
        console.error('Failed to fetch search results:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
    setSearchInput(q || tag);
    setRevealedArticles(new Set());
  }, [q, tag]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setSearchInput('');
      searchInputRef.current?.blur();
    }
  };

  const toggleFilter = (cat) => {
    setActiveFilters(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const toggleReveal = (id) => {
    setRevealedArticles(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hasResults = articles.length > 0;
  const showNoResults = !loading && (q || tag) && !hasResults;

  const filterColors = {
    profanity: '#ef4444',
    'hate-speech': '#db2777',
    scam: '#f59e0b',
    cyberbullying: '#6366f1',
  };

  return (
    <main className="search-page">
      {(q || tag) && (
        <div className="search-header-query">
          {tag ? `TAG ARCHIVES: ${tag}` : q}
        </div>
      )}

      <div className="container">
        <div className="search-page-layout">
          <div className="search-left-column">

            {showNoResults && (
              <div className="search-no-results">
                <h1>Nothing Found!</h1>
                <p>
                  Apologies, but no results were found for the requested archive. Try using the search with a relevant phrase to find the post you are looking for.
                </p>
              </div>
            )}

            {/* Giant Search Input Box */}
            <div className="giant-search-wrapper">
              <form onSubmit={handleSearchSubmit}>
                <input
                  ref={searchInputRef}
                  type="text"
                  className="giant-search-input"
                  placeholder="Search..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </form>
              <div className="giant-search-helper">
                Type above and press <em>Enter</em> to search. Press <em>Esc</em> to cancel.
              </div>
            </div>

            {/* Safe Search Settings */}
            <div style={{
              marginBottom: 20,
              border: '1px solid var(--color-gray-200)',
              borderRadius: 10,
              overflow: 'hidden',
            }}>
              <button
                onClick={() => setShowFilters(!showFilters)}
                style={{
                  width: '100%', padding: '12px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: safeSearchEnabled ? 'rgba(99,102,241,0.06)' : 'var(--color-gray-100)',
                  border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                  color: 'var(--color-black)',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FiShield size={15} color={safeSearchEnabled ? '#6366f1' : 'var(--color-gray-500)'} />
                  Safe Search & Filters
                  {safeSearchEnabled && (
                    <span style={{ fontSize: 10, background: '#6366f1', color: '#fff', padding: '1px 8px', borderRadius: 10, fontWeight: 800 }}>
                      ON
                    </span>
                  )}
                </span>
                <FiFilter size={14} color="var(--color-gray-400)" />
              </button>

              {showFilters && (
                <div style={{ padding: '16px 20px', background: 'var(--color-white)' }}>
                  {/* Master toggle */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                    <div
                      onClick={() => setSafeSearchEnabled(!safeSearchEnabled)}
                      style={{
                        width: 42, height: 22, borderRadius: 11,
                        background: safeSearchEnabled ? '#6366f1' : 'var(--color-gray-300)',
                        position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      <div style={{
                        position: 'absolute', top: 2, left: safeSearchEnabled ? 22 : 2,
                        width: 18, height: 18, borderRadius: '50%', background: '#fff',
                        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }} />
                    </div>
                    Enable Safe Search
                  </label>

                  {safeSearchEnabled && (
                    <>
                      <div style={{ marginBottom: 12 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-gray-500)', marginBottom: 8 }}>
                          Filter Categories
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {Object.keys(FILTER_CATEGORIES).map(cat => (
                            <button
                              key={cat}
                              onClick={() => toggleFilter(cat)}
                              style={{
                                padding: '4px 12px', fontSize: 11, fontWeight: 700, borderRadius: 20,
                                border: `1.5px solid ${activeFilters.includes(cat) ? filterColors[cat] : 'var(--color-gray-300)'}`,
                                background: activeFilters.includes(cat) ? filterColors[cat] + '15' : 'transparent',
                                color: activeFilters.includes(cat) ? filterColors[cat] : 'var(--color-gray-500)',
                                cursor: 'pointer', transition: 'all 0.2s', textTransform: 'capitalize',
                              }}
                            >
                              {activeFilters.includes(cat) ? '✓ ' : ''}{cat.replace('-', ' ')}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-gray-500)', marginBottom: 6 }}>
                          Personal Blocklist <span style={{ fontWeight: 400, textTransform: 'none' }}>(comma-separated)</span>
                        </p>
                        <input
                          type="text"
                          value={personalBlocklist}
                          onChange={e => setPersonalBlocklist(e.target.value)}
                          placeholder="e.g. gambling, violence, drugs"
                          style={{
                            width: '100%', boxSizing: 'border-box', padding: '8px 12px',
                            border: '1px solid var(--color-gray-300)', borderRadius: 6,
                            fontSize: 13, outline: 'none', color: 'var(--color-black)',
                            background: 'var(--color-white)',
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Loading Indicator */}
            {loading && <div className="loading-spinner"><div className="spinner" /></div>}

            {/* Results Grid */}
            {hasResults && (
              <div className="search-results-list">
                {articles.map((art) => {
                  const filtered = safeSearchEnabled
                    ? checkArticleAgainstFilters(art, activeFilters, personalList)
                    : { flagged: false };
                  const isRevealed = revealedArticles.has(art._id);

                  if (filtered.flagged && !isRevealed) {
                    return (
                      <div key={art._id} className="apple-card" style={{ position: 'relative', overflow: 'hidden' }}>
                        {/* Blurred background */}
                        <div style={{ filter: 'blur(4px)', pointerEvents: 'none', opacity: 0.3, flex: 1 }}>
                          <div style={{ width: 80, height: 60, background: 'var(--color-gray-200)', borderRadius: 6, flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ height: 12, background: 'var(--color-gray-200)', borderRadius: 4, marginBottom: 8, width: '60%' }} />
                            <div style={{ height: 16, background: 'var(--color-gray-200)', borderRadius: 4, marginBottom: 6, width: '80%' }} />
                            <div style={{ height: 12, background: 'var(--color-gray-200)', borderRadius: 4, width: '40%' }} />
                          </div>
                        </div>
                        {/* Overlay */}
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.06))',
                          backdropFilter: 'blur(2px)',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          gap: 8, padding: 20,
                        }}>
                          <FiShield size={20} color="#6366f1" />
                          <p style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', textAlign: 'center', margin: 0 }}>
                            Content hidden — matches your {filtered.reason} filter
                          </p>
                          <button
                            onClick={() => toggleReveal(art._id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              padding: '5px 12px', fontSize: 11, fontWeight: 700,
                              background: 'rgba(99,102,241,0.15)', color: '#6366f1',
                              border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20,
                              cursor: 'pointer',
                            }}
                          >
                            <FiEye size={12} /> Reveal anyway
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={art._id} className="apple-card">
                      {art.coverImage && (
                        <Link to={`/article/${art.slug}`} style={{ flexShrink: 0 }}>
                          <img src={getImageUrl(art.coverImage)} alt={art.title} className="apple-card-img" />
                        </Link>
                      )}
                      <div className="apple-card-content">
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="apple-card-cat">{art.category.toUpperCase()}</div>
                            {filtered.flagged && isRevealed && (
                              <button
                                onClick={() => toggleReveal(art._id)}
                                style={{ fontSize: 10, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                              >
                                <FiEyeOff size={10} /> Hide
                              </button>
                            )}
                          </div>
                          <h2 className="apple-card-title">
                            <Link to={`/article/${art.slug}`}>{art.title}</Link>
                          </h2>
                          <p className="apple-card-lead">{art.lead}</p>
                        </div>
                        <div className="apple-card-meta">
                          {new Date(art.publishedAt || art.createdAt).toLocaleDateString()} • By {art.author?.name}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>

          {/* RIGHT COLUMN: Trending Sidebar */}
          <aside className="search-sidebar-column">
            <div className="sticky-sidebar">
              <TrendingWidget />
            </div>
          </aside>

        </div>
      </div>
    </main>
  );
};

export default SearchPage;
