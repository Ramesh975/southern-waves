import React, { useState, useEffect } from 'react';
import { articleAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FiX, FiUpload, FiCheck, FiMic, FiFeather, FiRadio,
  FiFileText, FiCamera, FiBook, FiSearch, FiBookOpen
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import WordEditor from './WordEditor';

const POST_TYPES = [
  {
    id: 'article',
    label: 'Article',
    icon: FiFileText,
    color: 'var(--nm-accent)',
    desc: 'Full news article with body',
    category: 'news',
    fields: ['title', 'lead', 'body', 'category', 'image', 'tags'],
  },
  {
    id: 'mind',
    label: 'Mind',
    icon: FiFeather,
    color: '#8b5cf6',
    desc: 'A quick thought or opinion',
    category: 'tea-shop',
    fields: ['title', 'lead', 'tags'],
    tag: 'mind',
  },
  {
    id: 'spoken',
    label: 'Spoken',
    icon: FiMic,
    color: '#06b6d4',
    desc: 'Voice your perspective',
    category: 'tea-shop',
    fields: ['title', 'lead', 'tags'],
    tag: 'spoken',
  },
  {
    id: 'ground',
    label: 'Ground',
    icon: FiRadio,
    color: '#10b981',
    desc: 'Share on the ground feed',
    category: 'tea-shop',
    fields: ['title', 'lead', 'body', 'image', 'tags'],
    tag: 'ground',
  },
  {
    id: 'editorial',
    label: 'Editorial',
    icon: FiBook,
    color: '#f59e0b',
    desc: 'Opinion & editorial piece',
    category: 'editorial',
    fields: ['title', 'lead', 'body', 'category', 'image', 'tags'],
  },
  {
    id: 'picture',
    label: 'Picture',
    icon: FiCamera,
    color: '#ec4899',
    desc: 'Picture speaks post',
    category: 'pictures-speak',
    fields: ['title', 'lead', 'image', 'tags'],
  },
  {
    id: 'event',
    label: 'Timeline Event',
    icon: FiBookOpen,
    color: '#3b82f6',
    desc: 'Know Your Past timeline event',
    category: 'kyp',
    fields: ['title', 'lead', 'body', 'category', 'image', 'tags'],
  },
];

const CATEGORIES = [
  { value: 'news',            label: '📰 News' },
  { value: 'editorial',       label: '✍️ Editorial' },
  { value: 'features',        label: '🎬 Features' },
  { value: 'kyp',             label: '📖 Know Our Past' },
  { value: 'tea-shop',        label: '☕ Tea Shop' },
  { value: 'pictures-speak',  label: "📷 Picture's Speak" },
];

const QuickPublishModal = ({ defaultCategory = 'news', defaultType, onClose, onCloseStart, onPublishSuccess }) => {
  const { user } = useAuth();
  const isAdminOrEditor = user && (user.role === 'admin' || user.role === 'editor');
  
  const visiblePostTypes = isAdminOrEditor
    ? POST_TYPES.filter(pt => pt.category !== 'tea-shop')
    : [
        ...POST_TYPES.filter(pt => pt.category === 'tea-shop'),
        ...(defaultCategory === 'pictures-speak' ? [POST_TYPES.find(pt => pt.id === 'picture')] : [])
      ].filter(Boolean);

  const [selectedType, setSelectedType] = useState(() => {
    if (defaultType) {
      const found = POST_TYPES.find(pt => pt.id === defaultType);
      if (found) {
        const isAllowed = isAdminOrEditor
          ? found.category !== 'tea-shop'
          : (found.category === 'tea-shop' || (defaultCategory === 'pictures-speak' && found.id === 'picture'));
        if (isAllowed) return found;
      }
    }
    return null;
  });

  const getInitialStatus = () => {
    if (isAdminOrEditor) return 'published';
    const cat = selectedType ? (selectedType.id === 'article' ? defaultCategory : selectedType.category) : defaultCategory;
    return cat === 'pictures-speak' ? 'pending' : 'published';
  };

  const [form, setForm] = useState(() => ({
    title: '',
    lead: '',
    body: '',
    category: selectedType ? (selectedType.id === 'article' ? defaultCategory : selectedType.category) : defaultCategory,
    historicalYear: '',
    status: getInitialStatus(),
    isFeatured: false,
    isTrending: false,
    tags: selectedType && selectedType.tag ? selectedType.tag : '',
    references: [], // Array of { article: ID, note: String }
  }));

  const [articlesList, setArticlesList] = useState([]);
  const [refSearchQuery, setRefSearchQuery] = useState('');
  const [references, setReferences] = useState([]); // Array of { article: Object, note: String }
  const [coverImage, setCoverImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [multipleImages, setMultipleImages] = useState([]); // [{ file, previewUrl, caption }]
  const [loading, setLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [mobileTab, setMobileTab] = useState('form'); // 'form' | 'refs' — used on mobile only

  useEffect(() => {
    articleAPI.getAll({ limit: 100 })
      .then(res => {
        const list = res.data?.data || [];
        setArticlesList(list);
        
        // If editing article has pre-saved references
        if (form.references && Array.isArray(form.references)) {
          const mapped = form.references.map(ref => {
            const matchedArt = list.find(a => a._id === (ref.article?._id || ref.article));
            return matchedArt ? { article: matchedArt, note: ref.note || '' } : null;
          }).filter(Boolean);
          setReferences(mapped);
        }
      })
      .catch(err => console.error('Failed to load articles for reference selection:', err));
  }, []);

  useEffect(() => {
    if (!selectedType) {
      setForm(f => ({ ...f, category: defaultCategory, references: [] }));
      setReferences([]);
      setRefSearchQuery('');
      // Reset images if we change type
      multipleImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
      setMultipleImages([]);
      setCoverImage(null);
      setPreviewUrl('');
    }
  }, [defaultCategory, selectedType]);

  const handleClose = () => {
    setIsClosing(true);
    // Cleanup preview URLs
    multipleImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    
    if (onCloseStart) {
      onCloseStart();
    }
    setTimeout(() => onClose(), 300);
  };

  const handleTypeSelect = (pt) => {
    setSelectedType(pt);
    setForm(f => {
      const cat = pt.id === 'article' ? defaultCategory : pt.category;
      const status = isAdminOrEditor ? 'published' : (cat === 'pictures-speak' ? 'pending' : 'published');
      return {
        ...f,
        category: cat,
        status: status,
        // Auto-add the type tag
        tags: pt.tag ? pt.tag : f.tags,
      };
    });
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    if (selectedType?.id === 'picture') {
      const newImages = files.map(file => ({
        file,
        previewUrl: URL.createObjectURL(file),
        caption: ''
      }));
      setMultipleImages(prev => [...prev, ...newImages]);
    } else {
      const file = files[0];
      setCoverImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveMultipleImage = (index) => {
    setMultipleImages(prev => {
      const imgToRemove = prev[index];
      if (imgToRemove) {
        URL.revokeObjectURL(imgToRemove.previewUrl);
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleCaptionChange = (index, value) => {
    setMultipleImages(prev => prev.map((img, idx) => idx === index ? { ...img, caption: value } : img));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.lead.trim()) {
      return toast.error('Title and summary are required');
    }
    if (form.category === 'kyp' && !form.historicalYear) {
      return toast.error('Historical Event Year is required for Know Your Past articles');
    }

    // Fallback lead to body for tea-shop/mind/spoken formats so DB is happy
    let finalBody = form.body.trim();
    if (!selectedType?.fields?.includes('body') || !finalBody) {
      finalBody = form.lead.trim();
    }
    if (!finalBody) {
      return toast.error('Article body is required');
    }

    const isPictureSpeaks = selectedType?.id === 'picture';
    if (isPictureSpeaks && multipleImages.length === 0) {
      return toast.error('At least one image is required for Picture Speaks');
    }

    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'body') {
          formData.append(k, finalBody);
        } else if (k === 'references') {
          // Serialize multiple references
          const serializedRefs = references.map(ref => ({
            article: ref.article._id,
            note: ref.note || ''
          }));
          formData.append(k, JSON.stringify(serializedRefs));
        } else {
          formData.append(k, v);
        }
      });

      if (isPictureSpeaks) {
        // First image as coverImage fallback
        formData.append('coverImage', multipleImages[0].file);
        
        // Append all images
        multipleImages.forEach(img => {
          formData.append('images', img.file);
        });

        // Append stringified captions
        const captionsArray = multipleImages.map(img => img.caption);
        formData.append('captions', JSON.stringify(captionsArray));
      } else {
        if (coverImage) formData.append('coverImage', coverImage);
      }

      const res = await articleAPI.create(formData);
      if (res.data?.success) {
        toast.success(`${selectedType?.label || 'Article'} published! 🎉`);
        if (onPublishSuccess) onPublishSuccess(res.data.data);
        handleClose();
      }
    } catch (err) {
      console.error(err);
      if (err.response?.data?.blocked) {
        toast.error(
          '⚠️ Your post was flagged and your account has been temporarily suspended.',
          { duration: 5000, style: { background: '#fef3c7', color: '#92400e', border: '2px solid #f59e0b' } }
        );
        if (refreshUser) await refreshUser();
        handleClose();
      } else {
        toast.error(err.response?.data?.message || 'Failed to publish');
      }
    } finally {
      setLoading(false);
    }
  };

  const activeFields = selectedType?.fields || ['title', 'lead', 'body', 'category', 'image', 'tags'];

  return (
    <>
      <style>{`
        .nm-multi-upload-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .nm-multi-thumbnails {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 12px;
          margin-bottom: 8px;
        }
        .nm-multi-thumb-card {
          border: 1px solid var(--color-gray-200);
          background-color: var(--color-gray-50);
          border-radius: 6px;
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        [data-theme="dark"] .nm-multi-thumb-card {
          border-color: var(--color-gray-800);
          background-color: rgba(255,255,255,0.02);
        }
        .nm-multi-thumb-img-wrap {
          position: relative;
          aspect-ratio: 4/3;
          border-radius: 4px;
          overflow: hidden;
        }
        .nm-multi-thumb-img-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .nm-multi-thumb-remove {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 22px;
          height: 22px;
          background-color: rgba(0, 0, 0, 0.7);
          color: #fff;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s;
        }
        .nm-multi-thumb-remove:hover {
          background-color: #ef4444;
        }
        .nm-multi-thumb-caption {
          border: 1px solid var(--color-gray-300);
          border-radius: 4px;
          padding: 4px 6px;
          font-size: 11px !important;
          width: 100%;
          box-sizing: border-box;
        }
        [data-theme="dark"] .nm-multi-thumb-caption {
          border-color: var(--color-gray-800);
          background-color: var(--color-dark);
          color: #fff;
        }
        .nm-multi-upload-label {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 2px dashed var(--nm-accent, #ec4899);
          color: var(--nm-accent, #ec4899);
          padding: 10px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: background-color 0.2s;
        }
        .nm-multi-upload-label:hover {
          background-color: rgba(236, 72, 153, 0.05);
        }
      `}</style>
      <div
        className={`nm-modal-backdrop quick-publish-backdrop ${isClosing ? 'closing' : ''}`}
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        <div className={`nm-quick-publish-modal ${isClosing ? 'closing' : ''}`}>
        <div className="nm-quick-publish-header">
          <div>
            <h3>
              {selectedType ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {React.createElement(selectedType.icon, { size: 18, style: { color: selectedType.color } })}
                  {selectedType.label}
                </span>
              ) : 'Create Post'}
            </h3>
            <p>{selectedType ? selectedType.desc : 'Choose the type of content to create'}</p>
          </div>
          <button className="nm-quick-publish-close" onClick={handleClose} aria-label="Close modal">
            <FiX size={22} />
          </button>
        </div>

        {/* Post Type Selector */}
        {!selectedType ? (
          <div className="nm-post-type-grid">
            {visiblePostTypes.map(pt => {
              const Icon = pt.icon;
              return (
                <button
                  key={pt.id}
                  className="nm-post-type-card"
                  style={{ '--pt-color': pt.color }}
                  onClick={() => handleTypeSelect(pt)}
                >
                  <div className="nm-post-type-icon">
                    <Icon size={22} />
                  </div>
                  <span className="nm-post-type-label">{pt.label}</span>
                  <span className="nm-post-type-desc">{pt.desc}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="nm-quick-publish-form">
          <div className="nm-quick-publish-body">

            {/* ── Mobile Tab Switcher (hidden on desktop via CSS) ── */}
            <div className="nm-mobile-tab-bar">
              <button
                type="button"
                className={`nm-mobile-tab-btn${mobileTab === 'form' ? ' active' : ''}`}
                onClick={() => setMobileTab('form')}
              >
                Form
              </button>
              <button
                type="button"
                className={`nm-mobile-tab-btn${mobileTab === 'refs' ? ' active' : ''}`}
                onClick={() => setMobileTab('refs')}
              >
                References
                {references.length > 0 && (
                  <span className="nm-mobile-tab-badge">{references.length}</span>
                )}
              </button>
            </div>

            <div className="nm-quick-publish-left" data-mobile-tab={mobileTab === 'form' ? 'active' : 'hidden'}>

              {/* Back button */}
              <button
                type="button"
                className="nm-post-type-back"
                onClick={() => setSelectedType(null)}
              >
                ← Change Type
              </button>

              {/* Title */}
              <div className="nm-publish-form-group">
                <label>Title *</label>
                <input
                  type="text"
                  placeholder={
                    selectedType.id === 'mind' ? 'Your quick thought...'
                    : selectedType.id === 'spoken' ? 'What are you speaking up about?'
                    : 'Catchy headline (6-9 words recommended)...'
                  }
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  maxLength={120}
                />
              </div>

              {/* Category (only if article/editorial) */}
              {activeFields.includes('category') && (
                <div className="nm-publish-form-group">
                  <label>Section *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    required
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Historical Event Year */}
              {form.category === 'kyp' && (
                <div className="nm-publish-form-group">
                  <label>Historical Event Year *</label>
                  <input
                    type="number"
                    placeholder="e.g. 1965"
                    value={form.historicalYear || ''}
                    onChange={(e) => setForm({ ...form, historicalYear: e.target.value })}
                    required
                  />
                </div>
              )}

              {/* Lead / Summary */}
              <div className="nm-publish-form-group">
                <label>
                  {selectedType.id === 'mind' || selectedType.id === 'spoken'
                    ? 'Your Message *'
                    : 'Summary / Lead *'}
                </label>
                <textarea
                  placeholder={
                    selectedType.id === 'mind' ? 'Express your mind...'
                    : selectedType.id === 'spoken' ? 'Speak your truth...'
                    : 'Brief summary of the story...'
                  }
                  value={form.lead}
                  onChange={(e) => setForm({ ...form, lead: e.target.value })}
                  required
                  rows={selectedType.id === 'mind' || selectedType.id === 'spoken' ? 4 : 2}
                  maxLength={400}
                />
              </div>

              {/* Body — only for full articles */}
              {activeFields.includes('body') && (
                <div className="nm-publish-form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Article Body *</label>
                  <WordEditor 
                    value={form.body} 
                    onChange={(val) => setForm({ ...form, body: val })}
                    placeholder="Write the full body here..."
                  />
                </div>
              )}

              {/* Tags */}
              {activeFields.includes('tags') && (
                <div className="nm-publish-form-group">
                  <label>Tags (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. campus, politics, education"
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  />
                </div>
              )}


              {/* Cover/Multiple images */}
              {activeFields.includes('image') && (
                <div className="nm-publish-form-group">
                  <label>{selectedType?.id === 'picture' ? 'Story Photos (Minimum 1)' : 'Cover Image'}</label>
                  
                  {selectedType?.id === 'picture' ? (
                    <div className="nm-multi-upload-container">
                      <div className="nm-multi-thumbnails">
                        {multipleImages.map((img, idx) => (
                          <div key={idx} className="nm-multi-thumb-card">
                            <div className="nm-multi-thumb-img-wrap">
                              <img src={img.previewUrl} alt={`Uploaded ${idx + 1}`} />
                              <button 
                                type="button" 
                                className="nm-multi-thumb-remove"
                                onClick={() => handleRemoveMultipleImage(idx)}
                              >
                                <FiX size={14} />
                              </button>
                            </div>
                            <input 
                              type="text" 
                              className="nm-multi-thumb-caption" 
                              placeholder={`Caption for image #${idx + 1}...`}
                              value={img.caption}
                              onChange={(e) => handleCaptionChange(idx, e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                      
                      <label className="nm-multi-upload-label">
                        <FiUpload size={20} />
                        <span>+ Add More Images</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          multiple 
                          onChange={handleImageChange} 
                          style={{ display: 'none' }} 
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="nm-image-upload-zone">
                      {previewUrl ? (
                        <div className="nm-image-upload-preview">
                          <img src={previewUrl} alt="Preview" />
                          <button type="button" onClick={() => { setCoverImage(null); setPreviewUrl(''); }} className="nm-remove-preview">
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label className="nm-image-upload-label">
                          <FiUpload size={24} />
                          <span>Upload cover image</span>
                          <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>

          {/* References right panel */}
          <div className="nm-quick-publish-right" data-mobile-tab={mobileTab === 'refs' ? 'active' : 'hidden'}>
            <div className="nm-ref-panel-header">
              <FiBookOpen size={14} />
              <h4>References</h4>
              {references.length > 0 && (
                <span className="nm-ref-count-badge">{references.length}</span>
              )}
            </div>

            <div className="nm-ref-panel-body">
              {/* Search wrap */}
              <div className="nm-ref-search-wrap">
                <FiSearch size={13} className="nm-ref-search-icon" />
                <input
                  type="text"
                  className="nm-ref-search-input"
                  placeholder="Search by title or category..."
                  value={refSearchQuery}
                  onChange={(e) => setRefSearchQuery(e.target.value)}
                />

                {/* Dropdown */}
                {refSearchQuery.trim() && (
                  <div className="nm-ref-dropdown">
                    {(() => {
                      const filtered = articlesList.filter(art =>
                        art.status === 'published' &&
                        (art.title.toLowerCase().includes(refSearchQuery.toLowerCase()) ||
                         art.category.toLowerCase().includes(refSearchQuery.toLowerCase()))
                      ).slice(0, 6);

                      if (filtered.length === 0) {
                        return <div className="nm-ref-dropdown-empty">No matching articles found</div>;
                      }

                      return filtered.map(art => (
                        <div
                          key={art._id}
                          className="nm-ref-dropdown-item"
                          onClick={() => {
                            if (references.some(r => r.article._id === art._id)) {
                              toast.error('Already added as a reference');
                              return;
                            }
                            setReferences(prev => [...prev, { article: art, note: '' }]);
                            setRefSearchQuery('');
                          }}
                        >
                          <span className="nm-ref-dropdown-cat">{art.category}</span>
                          {art.title}
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>

              {/* Selected Reference Cards */}
              {references.length === 0 ? (
                <div className="nm-ref-empty">
                  <FiBookOpen size={28} />
                  <p>Search and add articles as references. Each can have its own note.</p>
                </div>
              ) : (
                references.map((ref, idx) => (
                  <div key={ref.article._id} className="nm-ref-card">
                    <div className="nm-ref-card-top">
                      <div className="nm-ref-card-info">
                        <span className="nm-ref-card-cat">{ref.article.category}</span>
                        <div className="nm-ref-card-title">{ref.article.title}</div>
                      </div>
                      <button
                        type="button"
                        className="nm-ref-card-remove"
                        onClick={() => setReferences(prev => prev.filter((_, i) => i !== idx))}
                      >
                        <FiX size={12} />
                      </button>
                    </div>
                    <input
                      type="text"
                      className="nm-ref-card-note"
                      placeholder="Add a note for this reference (optional)..."
                      value={ref.note}
                      onChange={(e) => {
                        const val = e.target.value;
                        setReferences(prev => prev.map((item, i) => i === idx ? { ...item, note: val } : item));
                      }}
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          </div>

          <div className="nm-quick-publish-footer">
            <button type="button" className="nm-publish-cancel-btn" onClick={() => setSelectedType(null)}>
              ← Back
            </button>
            <button type="submit" disabled={loading} className="nm-publish-submit-btn" style={{ '--btn-color': selectedType?.color }}>
              {loading ? 'Publishing...' : (
                <>
                  <FiCheck size={16} /> Publish {selectedType?.label}
                </>
              )}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
    </>
  );
};

export default QuickPublishModal;
