import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { articleAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import WordEditor from '../../components/WordEditor';
import { getImageUrl } from '../../components/ArticleComponents';

const CATEGORIES = [
  { value: 'news', label: 'News' },
  { value: 'editorial', label: 'Editorial' },
  { value: 'features', label: 'Features' },
  { value: 'kyp', label: 'Know Your Past' },
  { value: 'tea-shop', label: 'Tea Shop' },
  { value: 'pictures-speak', label: "Picture's Speak" },
];

const ArticleEditor = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState({
    title: '',
    lead: '',
    body: '',
    category: 'news',
    subCategory: '',
    historicalYear: '',
    tags: '',
    status: 'draft',
    isFeatured: false,
    isTrending: false,
    isPushedToHome: false,
  });
  const [coverImage, setCoverImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);

  useEffect(() => {
    if (isEdit) {
      articleAPI.getAll({ limit: 100 }).then((res) => {
        const article = res.data.data.find((a) => a._id === id);
        if (article) {
          setForm({
            title: article.title,
            lead: article.lead,
            body: article.body,
            category: article.category,
            subCategory: article.subCategory || '',
            historicalYear: article.historicalYear || '',
            tags: article.tags?.join(', ') || '',
            status: article.status,
            isFeatured: article.isFeatured,
            isTrending: article.isTrending,
            isPushedToHome: article.isPushedToHome || false,
          });
          if (article.coverImage) setPreviewUrl(getImageUrl(article.coverImage));
        }
        setFetchLoading(false);
      });
    }
  }, [id, isEdit]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCoverImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.lead || !form.body || !form.category) {
      return toast.error('Please fill in all required fields');
    }
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      if (coverImage) formData.append('coverImage', coverImage);

      if (isEdit) {
        await articleAPI.update(id, formData);
        toast.success('Article updated!');
      } else {
        await articleAPI.create(formData);
        toast.success('Article created!');
      }
      navigate('/admin/articles');
    } catch (err) {
      const errMsg = err?.response?.data?.message;
      if (errMsg === 'Not Allowed Tags') {
        toast.error('⚠️ Your article contains tags that are restricted/banned by the administrator.', {
          duration: 5000,
          style: { background: '#fee2e2', color: '#991b1b', border: '1.5px solid #fecaca' }
        });
      } else {
        toast.error(errMsg || 'Failed to save article');
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <>
      <div className="admin-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="admin-title">{isEdit ? 'Edit Article' : 'New Article'}</h1>
          <p className="admin-subtitle">{isEdit ? 'Update existing content' : 'Create a new content piece for the platform'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="admin-card" style={{ padding: '32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '40px' }}>
            <div>
              {/* Title */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px', color: 'var(--admin-text-main)' }}>
                  Title * <span style={{ fontWeight: 400, color: 'var(--admin-text-subtle)', textTransform: 'none' }}>(6-9 words recommended)</span>
                </label>
                <input
                  className="admin-input"
                  style={{ width: '100%', fontSize: '15px', fontWeight: 600, padding: '12px 16px' }}
                  placeholder="Article title (6–9 words)"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  maxLength={120}
                />
              </div>

              {/* Lead */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px', color: 'var(--admin-text-main)' }}>
                  Lead / Summary * <span style={{ fontWeight: 400, color: 'var(--admin-text-subtle)', textTransform: 'none' }}>(15-18 words)</span>
                </label>
                <textarea
                  className="admin-input"
                  style={{ width: '100%', minHeight: '100px', resize: 'vertical', fontSize: '14px', lineHeight: 1.5, padding: '12px 16px' }}
                  placeholder="Brief summary (15–18 words)"
                  value={form.lead}
                  onChange={(e) => setForm({ ...form, lead: e.target.value })}
                  required
                  maxLength={400}
                />
              </div>

              {/* Body */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px', color: 'var(--admin-text-main)' }}>
                  Article Body *
                </label>
                <div style={{ border: '1px solid var(--admin-border)', borderRadius: '12px', overflow: 'hidden' }}>
                  <WordEditor
                    value={form.body}
                    onChange={(val) => setForm({ ...form, body: val })}
                    placeholder="Write your article body here..."
                  />
                </div>
              </div>
            </div>

            <div>
              {/* Cover Image */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px', color: 'var(--admin-text-main)' }}>
                  Cover Image
                </label>
                <label 
                  htmlFor="cover-image-input" 
                  style={{ 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    border: '2px dashed var(--admin-border)', borderRadius: '12px', background: 'var(--admin-hover-bg)',
                    cursor: 'pointer', overflow: 'hidden', minHeight: '160px', position: 'relative', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-color)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--admin-border)'}
                >
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                  ) : (
                    <div style={{ color: 'var(--admin-text-muted)', fontSize: '13px', textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>📷</div>
                      Click to upload cover image
                    </div>
                  )}
                  <input
                    id="cover-image-input"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleImageChange}
                  />
                </label>
              </div>

              {/* Category */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px', color: 'var(--admin-text-main)' }}>Category *</label>
                <select
                  className="admin-input"
                  style={{ width: '100%', cursor: 'pointer' }}
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  required
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Historical Event Year */}
              {form.category === 'kyp' && (
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px', color: 'var(--admin-text-main)' }}>Historical Event Year *</label>
                  <input
                    type="number"
                    className="admin-input"
                    style={{ width: '100%' }}
                    placeholder="e.g. 1965"
                    value={form.historicalYear}
                    onChange={(e) => setForm({ ...form, historicalYear: e.target.value })}
                    required
                  />
                </div>
              )}

              {/* Sub-category */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px', color: 'var(--admin-text-main)' }}>Sub-Category / Type</label>
                {form.category === 'columns' ? (
                  <select
                    className="admin-input"
                    style={{ width: '100%', cursor: 'pointer' }}
                    value={form.subCategory}
                    onChange={(e) => setForm({ ...form, subCategory: e.target.value })}
                    required
                  >
                    <option value="">-- Select Column --</option>
                    <option value="bazinga">Bazinga (Satire)</option>
                    <option value="advice">Sex Amma (Advice)</option>
                    <option value="style">Auburn Umbrella (Style)</option>
                    <option value="food">Campus Eats (Food)</option>
                  </select>
                ) : form.category === 'seasons' ? (
                  <select
                    className="admin-input"
                    style={{ width: '100%', cursor: 'pointer' }}
                    value={form.subCategory}
                    onChange={(e) => setForm({ ...form, subCategory: e.target.value })}
                    required
                  >
                    <option value="">-- Select Season --</option>
                    <option value="admissions">Admission Season</option>
                    <option value="fests">Fest Season</option>
                    <option value="careers">Internship Diaries</option>
                  </select>
                ) : (
                  <input
                    className="admin-input"
                    style={{ width: '100%' }}
                    placeholder="e.g. Film Review, Campus, Circular"
                    value={form.subCategory}
                    onChange={(e) => setForm({ ...form, subCategory: e.target.value })}
                  />
                )}
              </div>

              {/* Tags */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px', color: 'var(--admin-text-main)' }}>Tags <span style={{ fontWeight: 400, color: 'var(--admin-text-subtle)', textTransform: 'none' }}>(comma-separated)</span></label>
                <input
                  className="admin-input"
                  style={{ width: '100%' }}
                  placeholder="protest, campus, fee hike"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                />
              </div>

              {/* Status */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px', color: 'var(--admin-text-main)' }}>Status</label>
                <select
                  className="admin-input"
                  style={{ width: '100%', cursor: 'pointer' }}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* Flags */}
              <div style={{ marginBottom: '32px', background: 'var(--admin-hover-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--admin-border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '12px' }}>
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--accent-color)' }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text-main)' }}>Featured (show on homepage)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: user?.role === 'admin' ? '12px' : '0' }}>
                  <input
                    type="checkbox"
                    checked={form.isTrending}
                    onChange={(e) => setForm({ ...form, isTrending: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--accent-color)' }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text-main)' }}>Mark as Trending</span>
                </label>
                {user?.role === 'admin' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.isPushedToHome}
                      onChange={(e) => setForm({ ...form, isPushedToHome: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: '#ef4444' }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444' }}>Push to Homepage Spotlight</span>
                  </label>
                )}
              </div>

              <button type="submit" className="btn-admin-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '14px' }}>
                {loading ? 'Saving...' : isEdit ? 'Update Article' : 'Publish Article'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </>
  );
};

export default ArticleEditor;
