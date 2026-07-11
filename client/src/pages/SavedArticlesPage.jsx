import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { format } from 'date-fns';
import { BiHeart, BiComment, BiTrash, BiChevronRight } from 'react-icons/bi';
import BottomNavPill from '../components/BottomNavPill';
import toast from 'react-hot-toast';
import '../NewsTag.css';

const SavedArticlesPage = () => {
  const [savedArticles, setSavedArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSavedArticles = async () => {
    try {
      const res = await authAPI.getMe();
      setSavedArticles(res.data.data.savedArticles || []);
    } catch (error) {
      console.error('Error fetching saved articles:', error);
      toast.error('Failed to load saved articles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedArticles();
  }, []);

  const handleUnsave = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await authAPI.unsaveArticle(id);
      setSavedArticles((prev) => prev.filter((art) => art._id !== id));
      toast.success('Article removed from saved');
    } catch (error) {
      toast.error('Failed to unsave article');
    }
  };

  if (loading) {
    return (
      <main className="newstag-page container">
        <div style={{ textAlign: 'center', padding: '100px 0', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>Loading Saved Articles...</div>
      </main>
    );
  }

  return (
    <main className="newstag-page container" style={{ minHeight: '70vh', paddingBottom: '100px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '36px',
          fontWeight: 900,
          textTransform: 'uppercase',
          color: 'var(--color-black)',
          letterSpacing: '1px',
          marginBottom: '8px'
        }}>
          Saved Articles
        </h1>
        <div style={{
          width: '60px',
          height: '4px',
          backgroundColor: 'var(--accent-color)',
          borderRadius: '2px'
        }}></div>
      </div>

      <div className="newstag-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="newstag-feed" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          {savedArticles.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 24px',
              border: '2px dashed var(--color-gray-300)',
              borderRadius: '8px',
              background: 'rgba(0,0,0,0.02)'
            }}>
              <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-gray-600)', marginBottom: '16px' }}>
                You haven't saved any articles yet.
              </p>
              <Link to="/news" className="btn-submit" style={{ textDecoration: 'none', display: 'inline-block', padding: '10px 24px' }}>
                Browse Articles
              </Link>
            </div>
          ) : (
            savedArticles.map((article) => (
              <article key={article._id} className="newstag-article" style={{
                border: '2px solid var(--color-black)',
                borderRadius: '4px',
                padding: '24px',
                marginBottom: '24px',
                boxShadow: '4px 4px 0 var(--color-black)',
                background: 'var(--color-paper)',
                position: 'relative'
              }}>
                <div className="newstag-article-meta" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <img
                    src={article.author?.avatar || '/default-avatar.png'}
                    alt={article.author?.name || 'Author'}
                    className="newstag-author-avatar"
                    style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div>
                    <div className="newstag-author-name" style={{ fontWeight: 700, fontSize: '14px' }}>
                      By {article.author?.name || 'Southern Waves Writer'}
                    </div>
                    <div className="newstag-date" style={{ fontSize: '11px', color: 'var(--color-gray-500)' }}>
                      {article.publishedAt ? format(new Date(article.publishedAt), 'MMM dd, yyyy') : 'Recently Saved'}
                    </div>
                  </div>
                  
                  {/* Category Badge */}
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: '10px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    background: 'var(--accent-color)',
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '12px'
                  }}>
                    {article.category}
                  </span>
                </div>

                <Link to={`/article/${article.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <h2 className="newstag-article-title" style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '22px',
                    fontWeight: 800,
                    marginBottom: '12px',
                    lineHeight: 1.3
                  }}>{article.title}</h2>
                  <p className="newstag-article-excerpt" style={{
                    fontSize: '14px',
                    color: 'var(--color-gray-600)',
                    lineHeight: 1.5,
                    marginBottom: '20px'
                  }}>{article.lead}</p>
                </Link>

                <div className="newstag-actions" style={{ display: 'flex', gap: '16px', borderTop: '1px solid var(--color-gray-200)', paddingTop: '16px', alignItems: 'center' }}>
                  <Link to={`/article/${article.slug}`} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '13px',
                    color: 'var(--accent-color)'
                  }}>
                    <span>Read Article</span>
                    <BiChevronRight size={18} />
                  </Link>

                  <button 
                    onClick={(e) => handleUnsave(article._id, e)}
                    style={{
                      marginLeft: 'auto',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-red, #c8102e)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 700,
                      fontSize: '13px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(200, 16, 46, 0.05)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    <BiTrash size={16} />
                    <span>Unsave</span>
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      <BottomNavPill />
    </main>
  );
};

export default SavedArticlesPage;
