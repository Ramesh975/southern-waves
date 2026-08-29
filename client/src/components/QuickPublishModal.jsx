import React, { useState, useEffect, useRef, useCallback } from 'react';
import { articleAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FiX, FiUpload, FiCheck, FiMic, FiFeather, FiRadio,
  FiFileText, FiCamera, FiBook, FiSearch, FiBookOpen,
  FiChevronDown, FiChevronUp, FiEye, FiSave, FiZap,
  FiClock, FiAlertCircle, FiCheckCircle, FiImage, FiTag,
  FiTrash2, FiBarChart2, FiLayout, FiHash
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import WordEditor from './WordEditor';

import { getImageUrl } from './ArticleComponents';

/* ─── Post-type Definitions ─── */
const POST_TYPES = [
  { id:'article',   label:'Article',        icon:FiFileText,  color:'#0055a4', desc:'Full news article with body',        category:'news',           fields:['title','lead','body','category','image','tags'] },
  { id:'university',label:'University Row', icon:FiBookOpen,  color:'#10b981', desc:'Campus affairs & university news',   category:'university-row', fields:['title','lead','body','category','image','tags'] },
  { id:'editorial', label:'Editorial',      icon:FiBook,      color:'#f59e0b', desc:'Opinion & editorial piece',          category:'editorial',      fields:['title','lead','body','category','image','tags'] },
  { id:'features',  label:'Features',       icon:FiLayout,    color:'#8b5cf6', desc:'Culture, film & lifestyle features',  category:'features',       fields:['title','lead','body','category','image','tags'] },
  { id:'picture',   label:'Picture',        icon:FiCamera,    color:'#ec4899', desc:"Picture speaks photo journal",       category:'pictures-speak', fields:['title','lead','image','tags'] },
  { id:'event',     label:'Timeline Event', icon:FiBookOpen,  color:'#3b82f6', desc:'Know Your Past timeline event',     category:'kyp',            fields:['title','lead','body','category','image','tags'] },
  { id:'mind',      label:'Mind',           icon:FiFeather,   color:'#8b5cf6', desc:'A quick thought or opinion',         category:'tea-shop',       fields:['title','lead','tags'],                           tag:'mind' },
  { id:'spoken',    label:'Spoken',         icon:FiMic,       color:'#06b6d4', desc:'Voice your perspective',             category:'tea-shop',       fields:['title','lead','tags'],                           tag:'spoken' },
  { id:'ground',    label:'Ground',         icon:FiRadio,     color:'#10b981', desc:'Share on the ground feed',           category:'tea-shop',       fields:['title','lead','body','image','tags'],            tag:'ground' },
];

const CATEGORIES = [
  { value:'news',           label:'📰 News' },
  { value:'editorial',      label:'✍️ Editorial' },
  { value:'features',       label:'🎬 Features' },
  { value:'university-row', label:'🏛️ University Row' },
  { value:'kyp',            label:'📖 Know Your Past' },
  { value:'tea-shop',       label:'☕ Tea Shop' },
  { value:'pictures-speak', label:"📷 Picture's Speak" },
];

/* ─── Helper ─── */
const stripHtml = (html) =>
  (html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

/* ─── Component ─── */
const QuickPublishModal = ({
  defaultCategory = 'news',
  defaultType,
  editingArticle = null,
  onClose,
  onCloseStart,
  onPublishSuccess
}) => {
  const { user } = useAuth();
  const isAdminOrEditor = user && (user.role === 'admin' || user.role === 'editor');

  // Allow all authors to create across any format
  const visiblePostTypes = POST_TYPES;

  const [selectedType, setSelectedType] = useState(() => {
    if (editingArticle) {
      const cat = editingArticle.category;
      if (cat === 'pictures-speak') return POST_TYPES.find(p => p.id === 'picture');
      if (cat === 'kyp') return POST_TYPES.find(p => p.id === 'event');
      if (cat === 'university-row') return POST_TYPES.find(p => p.id === 'university');
      if (cat === 'editorial') return POST_TYPES.find(p => p.id === 'editorial');
      if (cat === 'features') return POST_TYPES.find(p => p.id === 'features');
      if (cat === 'tea-shop') {
        if (editingArticle.tags?.includes('spoken')) return POST_TYPES.find(p => p.id === 'spoken');
        if (editingArticle.tags?.includes('ground')) return POST_TYPES.find(p => p.id === 'ground');
        if (editingArticle.tags?.includes('mind')) return POST_TYPES.find(p => p.id === 'mind');
        return POST_TYPES.find(p => p.category === 'tea-shop');
      }
      return POST_TYPES.find(p => p.id === 'article') || POST_TYPES[0];
    }
    if (defaultType) {
      const found = POST_TYPES.find(pt => pt.id === defaultType);
      if (found) return found;
    }
    return null;
  });

  const getInitialStatus = () => {
    if (editingArticle) return editingArticle.status || 'published';
    if (isAdminOrEditor) return 'published';
    const cat = selectedType ? (selectedType.id === 'article' ? defaultCategory : selectedType.category) : defaultCategory;
    return cat === 'pictures-speak' ? 'pending' : 'published';
  };

  /* ─── Selected Categories (Max 3, standalone for tea-shop & pictures-speak) ─── */
  const [selectedCategories, setSelectedCategories] = useState(() => {
    if (editingArticle?.categories && editingArticle.categories.length > 0) {
      return editingArticle.categories;
    }
    if (editingArticle?.category) {
      return [editingArticle.category];
    }
    return [defaultCategory || 'news'];
  });

  /* ─── Core form state ─── */
  const [form, setForm] = useState(() => ({
    title: editingArticle?.title || '',
    lead: editingArticle?.lead || '',
    body: editingArticle?.body || '',
    category: editingArticle?.category || (selectedType ? (selectedType.id === 'article' ? defaultCategory : selectedType.category) : defaultCategory),
    historicalYear: editingArticle?.historicalYear || '',
    status: getInitialStatus(),
    isFeatured: editingArticle?.isFeatured || false,
    isTrending: editingArticle?.isTrending || false,
    tags: editingArticle ? (Array.isArray(editingArticle.tags) ? editingArticle.tags.join(', ') : (editingArticle.tags || '')) : (selectedType?.tag || ''),
    references: editingArticle?.references || [],
  }));

  const [articlesList,   setArticlesList]   = useState([]);
  const [refSearchQuery, setRefSearchQuery] = useState('');
  const [references,     setReferences]     = useState([]);
  const [coverImage,     setCoverImage]     = useState(null);
  const [previewUrl,     setPreviewUrl]     = useState(() => editingArticle?.coverImage ? getImageUrl(editingArticle.coverImage) : '');
  const [multipleImages, setMultipleImages] = useState(() => {
    if (editingArticle?.images?.length) {
      return editingArticle.images.map(img => ({
        url: img.url || img,
        previewUrl: getImageUrl(img.url || img),
        caption: img.caption || '',
        isNew: false
      }));
    }
    return [];
  });
  const [loading,        setLoading]        = useState(false);
  const [isClosing,      setIsClosing]      = useState(false);

  /* ─── Enterprise UI state ─── */
  const [sidebarOpen,  setSidebarOpen]  = useState(true);
  const [mobilePanel,  setMobilePanel]  = useState('editor'); // 'editor' | 'sidebar'
  const [openSections, setOpenSections] = useState({ references:true, stats:true, checklist:true, ai:false, history:false });
  const [autosave,     setAutosave]     = useState('saved'); // 'saved' | 'saving'
  const autosaveTimer = useRef(null);
  const formId = 'qpm-article-form';

  /* ─── Computed ─── */
  const bodyText    = stripHtml(form.body);
  const wordCount   = bodyText ? bodyText.split(/\s+/).filter(Boolean).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  const charCount   = bodyText.length;

  const checkItems = [
    { id:'title', label:'Title added (5+ chars)',    done: form.title.trim().length >= 5 },
    { id:'lead',  label:'Summary written (20+ chars)',done: form.lead.trim().length >= 20 },
    { id:'body',  label:'Body content (50+ words)',  done: wordCount >= 50 },
    { id:'image', label:'Cover image uploaded',      done: !!(coverImage || previewUrl) },
    { id:'tags',  label:'Tags added',                done: form.tags.trim().length > 0 },
    { id:'cat',   label:'Section selected',          done: selectedCategories.length > 0 },
  ];
  const readiness = Math.round(checkItems.filter(c => c.done).length / checkItems.length * 100);

  /* ─── Effects ─── */
  useEffect(() => {
    articleAPI.getAll({ limit: 100 })
      .then(res => {
        const list = res.data?.data || [];
        setArticlesList(list);
        if (form.references?.length) {
          const mapped = form.references
            .map(r => { const a = list.find(x => x._id === (r.article?._id || r.article)); return a ? { article:a, note:r.note||'' } : null; })
            .filter(Boolean);
          setReferences(mapped);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedType && !editingArticle) {
      const initialCat = defaultCategory || 'news';
      setSelectedCategories([initialCat]);
      setForm(f => ({ ...f, category: initialCat, references: [] }));
      setReferences([]);
      setRefSearchQuery('');
      multipleImages.forEach(img => {
        if (img.previewUrl && img.isNew) URL.revokeObjectURL(img.previewUrl);
      });
      setMultipleImages([]);
      setCoverImage(null);
      setPreviewUrl('');
    }
  }, [defaultCategory, selectedType, editingArticle]);

  // Autosave simulation
  useEffect(() => {
    if (!selectedType || (!form.title && !form.body)) return;
    setAutosave('saving');
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => setAutosave('saved'), 1600);
    return () => clearTimeout(autosaveTimer.current);
  }, [form.title, form.body, form.lead]);

  /* ─── Handlers ─── */
  const handleClose = () => {
    setIsClosing(true);
    multipleImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (onCloseStart) onCloseStart();
    setTimeout(() => onClose(), 300);
  };

  const handleTypeSelect = (pt) => {
    setSelectedType(pt);
    const cat = pt.id === 'article' ? (defaultCategory || 'news') : pt.category;
    setSelectedCategories([cat]);
    setForm(f => {
      const status = isAdminOrEditor ? 'published' : (cat === 'pictures-speak' ? 'pending' : 'published');
      return { ...f, category: cat, status, tags: pt.tag ? pt.tag : f.tags };
    });
  };

  const handleCoverImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCoverImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleStoryImagesAdd = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const newImgs = files.map(f => ({ file:f, previewUrl:URL.createObjectURL(f), caption:'', isNew:true }));
    setMultipleImages(prev => [...prev, ...newImgs]);
  };

  // For Picture Speaks (multi-upload in cover zone)
  const handlePictureImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const newImgs = files.map(f => ({ file:f, previewUrl:URL.createObjectURL(f), caption:'' }));
    setMultipleImages(prev => [...prev, ...newImgs]);
  };

  const handleRemoveMultipleImage = (idx) => {
    setMultipleImages(prev => {
      URL.revokeObjectURL(prev[idx]?.previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleCaptionChange = (idx, val) => {
    setMultipleImages(prev => prev.map((img, i) => i === idx ? { ...img, caption:val } : img));
  };

  const insertTagAtCaret = (tag) => {
    window.dispatchEvent(new CustomEvent('wordeditor-insert', { detail:{ tag } }));
    toast.success(`${tag} inserted into editor`, { duration:1500, icon:'✏️' });
  };

  const handleToggleCategory = (catVal) => {
    const isStandalone = ['tea-shop', 'pictures-speak'].includes(catVal);

    if (selectedCategories.includes(catVal)) {
      if (selectedCategories.length === 1) {
        return toast.error('At least 1 section must remain selected.');
      }
      const updated = selectedCategories.filter((c) => c !== catVal);
      setSelectedCategories(updated);
      setForm((prev) => ({ ...prev, category: updated[0] }));
    } else {
      if (isStandalone) {
        const catObj = CATEGORIES.find((c) => c.value === catVal);
        toast(`${catObj?.label || catVal} is a standalone section and cannot be combined with other sections.`, { icon: 'ℹ️' });
        setSelectedCategories([catVal]);
        setForm((prev) => ({ ...prev, category: catVal }));
        return;
      }

      const baseCategories = selectedCategories.filter((c) => !['tea-shop', 'pictures-speak'].includes(c));

      if (baseCategories.length >= 3) {
        return toast.error('Maximum 3 sections allowed per article.');
      }
      const updated = [...baseCategories, catVal];
      setSelectedCategories(updated);
      setForm((prev) => ({ ...prev, category: updated[0] }));
    }
  };

  const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]:!prev[key] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.lead.trim()) return toast.error('Title and summary are required');
    if ((form.category === 'kyp' || selectedCategories.includes('kyp')) && !form.historicalYear) {
      return toast.error('Historical Event Year is required');
    }

    let finalBody = form.body.trim();
    if (!selectedType?.fields?.includes('body') || !finalBody) finalBody = form.lead.trim();
    if (!finalBody) return toast.error('Article body is required');

    const isPicture = selectedType?.id === 'picture' || form.category === 'pictures-speak';
    if (isPicture && multipleImages.length === 0) return toast.error('At least one image required for Picture Speaks');

    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'body') fd.append(k, finalBody);
        else if (k === 'references') fd.append(k, JSON.stringify(references.map(r => ({ article:r.article._id, note:r.note||'' }))));
        else fd.append(k, v);
      });
      fd.set('category', selectedCategories[0] || form.category || 'news');
      fd.set('categories', JSON.stringify(selectedCategories));

      if (isPicture) {
        if (multipleImages[0]?.file) fd.append('coverImage', multipleImages[0].file);
        multipleImages.forEach(img => { if (img.file) fd.append('images', img.file); });
        fd.append('captions', JSON.stringify(multipleImages.map(img => img.caption || '')));
        const imagesMeta = multipleImages.map(img =>
          img.file ? { isNew:true, caption:img.caption||'' } : { url:img.url||'', caption:img.caption||'' }
        );
        fd.set('imagesMeta', JSON.stringify(imagesMeta));
      } else {
        if (coverImage) fd.append('coverImage', coverImage);
        if (multipleImages.length > 0) {
          multipleImages.forEach(img => { if (img.file) fd.append('images', img.file); });
          fd.append('captions', JSON.stringify(multipleImages.map(img => img.caption || '')));
          const imagesMeta = multipleImages.map(img =>
            img.file ? { isNew:true, caption:img.caption||'' } : { url:img.url||'', caption:img.caption||'' }
          );
          fd.set('imagesMeta', JSON.stringify(imagesMeta));
        }
      }

      let res;
      if (editingArticle) {
        res = await articleAPI.update(editingArticle._id, fd);
        toast.success('Story updated successfully! 🚀');
      } else {
        res = await articleAPI.create(fd);
        toast.success(`${selectedType?.label || 'Article'} published! 🎉`);
      }

      if (res.data?.success) {
        if (onPublishSuccess) onPublishSuccess(res.data.data);
        handleClose();
      }
    } catch (err) {
      if (err.response?.data?.blocked) {
        toast.error('⚠️ Your post was flagged.', { duration:5000 });
        handleClose();
      } else {
        toast.error(err.response?.data?.message || 'Failed to save story');
      }
    } finally {
      setLoading(false);
    }
  };

  const activeFields = selectedType?.fields || ['title','lead','body','category','image','tags'];

  /* ──────────────────────────────────────────────
     RENDER
  ────────────────────────────────────────────── */
  return (
    <>
      {/* ── Inline CSS ── */}
      <style>{`
        /* === Overlay & Modal === */
        .qpm-overlay {
          position: fixed; inset: 0; z-index: 1100;
          background: rgba(0,0,0,0.52);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          padding: 12px;
          animation: qpm-fade-in 0.22s ease;
        }
        .qpm-overlay.closing { animation: qpm-fade-out 0.28s ease forwards; }

        @keyframes qpm-fade-in  { from { opacity:0 } to { opacity:1 } }
        @keyframes qpm-fade-out { from { opacity:1 } to { opacity:0 } }
        @keyframes qpm-slide-up {
          from { opacity:0; transform:scale(0.96) translateY(16px) }
          to   { opacity:1; transform:scale(1) translateY(0) }
        }
        @keyframes qpm-slide-down {
          from { opacity:1; transform:scale(1) translateY(0) }
          to   { opacity:0; transform:scale(0.96) translateY(16px) }
        }

        .qpm-modal {
          width: min(97vw, 1360px);
          height: min(96vh, 940px);
          background: var(--color-paper, #fff);
          border-radius: 18px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 32px 100px rgba(0,0,0,0.28), 0 0 0 1px rgba(0,0,0,0.06);
          animation: qpm-slide-up 0.32s cubic-bezier(0.22,1,0.36,1);
          position: relative;
        }
        .qpm-modal.closing { animation: qpm-slide-down 0.26s ease forwards; }
        [data-theme="dark"] .qpm-modal { background: #16161e; box-shadow: 0 32px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06); }

        /* === Type Selection Screen === */
        .qpm-type-screen {
          display: flex; flex-direction: column;
          height: 100%;
        }
        .qpm-type-screen-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          padding: 28px 32px 20px;
          border-bottom: 1px solid var(--color-gray-100, #f1f1f1);
        }
        [data-theme="dark"] .qpm-type-screen-header { border-color: rgba(255,255,255,0.06); }
        .qpm-type-screen-header h2 {
          font-family: var(--font-display, 'Outfit', sans-serif);
          font-size: 22px; font-weight: 800; letter-spacing:-0.02em;
          color: var(--color-black, #0d0d0d); margin:0 0 4px;
        }
        [data-theme="dark"] .qpm-type-screen-header h2 { color:#fff; }
        .qpm-type-screen-header p { font-size:13px; color:var(--color-gray-500,#6b7280); margin:0; }
        .qpm-type-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 12px; padding: 24px 32px; overflow-y: auto; flex:1;
        }
        .qpm-type-card {
          display: flex; flex-direction: column; align-items: center;
          gap: 10px; padding: 22px 12px;
          border: 1.5px solid var(--color-gray-200,#e5e7eb);
          border-radius: 14px; background: none; cursor: pointer;
          transition: all 0.18s ease; text-align: center;
        }
        [data-theme="dark"] .qpm-type-card { border-color: rgba(255,255,255,0.08); }
        .qpm-type-card:hover {
          border-color: var(--pt-color);
          background: color-mix(in srgb, var(--pt-color) 6%, transparent);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px color-mix(in srgb, var(--pt-color) 20%, transparent);
        }
        .qpm-type-card-icon {
          width: 44px; height: 44px; border-radius: 12px;
          background: color-mix(in srgb, var(--pt-color) 12%, transparent);
          display: flex; align-items: center; justify-content: center;
          color: var(--pt-color);
        }
        .qpm-type-card-label { font-size:14px; font-weight:700; color:var(--color-black,#0d0d0d); }
        [data-theme="dark"] .qpm-type-card-label { color:#fff; }
        .qpm-type-card-desc { font-size:11px; color:var(--color-gray-500,#6b7280); line-height:1.4; }
        .qpm-close-x {
          width:32px; height:32px; border:none; background:var(--color-gray-100,#f3f4f6);
          border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center;
          color:var(--color-gray-600,#4b5563); transition:all 0.15s; flex-shrink:0;
        }
        [data-theme="dark"] .qpm-close-x { background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.7); }
        .qpm-close-x:hover { background:var(--color-gray-200,#e5e7eb); color:var(--color-black,#0d0d0d); }
        [data-theme="dark"] .qpm-close-x:hover { background:rgba(255,255,255,0.14); color:#fff; }

        /* === Enterprise Editor Layout === */
        .qpm-editor-layout {
          display: flex; flex-direction: column; height: 100%; overflow: hidden;
        }

        /* Compact Header */
        .qpm-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; height: 52px; flex-shrink: 0;
          border-bottom: 1px solid var(--color-gray-100,#f1f1f1);
          background: var(--color-gray-50, #fafafa);
        }
        [data-theme="dark"] .qpm-header { background:#121218; border-color:rgba(255,255,255,0.06); }
        .qpm-header-left { display:flex; align-items:center; gap:8px; }
        .qpm-back-btn {
          font-size:12px; font-weight:600; padding:5px 10px;
          border:1px solid var(--color-gray-200,#e5e7eb); border-radius:7px;
          background:none; cursor:pointer; color:var(--color-gray-600,#4b5563);
          transition:all 0.15s; white-space:nowrap;
        }
        [data-theme="dark"] .qpm-back-btn { border-color:rgba(255,255,255,0.1); color:rgba(255,255,255,0.6); }
        .qpm-back-btn:hover { background:var(--color-gray-100,#f3f4f6); color:var(--color-black,#0d0d0d); }
        [data-theme="dark"] .qpm-back-btn:hover { background:rgba(255,255,255,0.07); color:#fff; }
        .qpm-breadcrumb-sep { color:var(--color-gray-300,#d1d5db); font-size:14px; }
        .qpm-type-badge {
          display:flex; align-items:center; gap:5px;
          font-size:12px; font-weight:700; padding:4px 10px;
          border-radius:20px; background:color-mix(in srgb, var(--badge-color) 12%, transparent);
          color:var(--badge-color); letter-spacing:0.01em;
        }
        .qpm-header-right { display:flex; align-items:center; gap:8px; }
        .qpm-autosave {
          font-size:11px; color:var(--color-gray-400,#9ca3af);
          display:flex; align-items:center; gap:4px;
        }
        .qpm-autosave.saving { color:#f59e0b; }
        .qpm-autosave.saved  { color:#10b981; }
        .qpm-autosave-dot {
          width:6px; height:6px; border-radius:50%;
          background: currentColor;
        }
        .qpm-sidebar-toggle-btn {
          width:28px; height:28px; border:none;
          background:var(--color-gray-100,#f3f4f6); border-radius:7px;
          cursor:pointer; display:flex; align-items:center; justify-content:center;
          color:var(--color-gray-500,#6b7280); transition:all 0.15s;
        }
        [data-theme="dark"] .qpm-sidebar-toggle-btn { background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.5); }
        .qpm-sidebar-toggle-btn:hover { background:var(--color-gray-200,#e5e7eb); }

        /* Mobile tabs */
        .qpm-mobile-tabs {
          display: none;
          border-bottom: 1px solid var(--color-gray-100,#f1f1f1);
        }
        [data-theme="dark"] .qpm-mobile-tabs { border-color:rgba(255,255,255,0.06); }
        .qpm-mobile-tab-btn {
          flex:1; padding:10px; border:none; background:none; cursor:pointer;
          font-size:13px; font-weight:600; color:var(--color-gray-500,#6b7280);
          border-bottom:2px solid transparent; transition:all 0.15s;
        }
        .qpm-mobile-tab-btn.active { color:var(--accent-color,#0055a4); border-bottom-color:var(--accent-color,#0055a4); }

        /* Main workspace */
        .qpm-workspace {
          display: flex; flex:1; overflow: hidden; min-height: 0;
        }

        /* ── Left Editor Panel ── */
        .qpm-left-panel {
          flex:1; min-width:0; display:flex; flex-direction:column; overflow:hidden;
          transition: flex 0.25s ease;
        }
        .qpm-left-scroll {
          flex:1; overflow-y:auto; padding:0;
        }
        .qpm-left-scroll::-webkit-scrollbar { width:5px; }
        .qpm-left-scroll::-webkit-scrollbar-thumb { background:var(--color-gray-200,#e5e7eb); border-radius:4px; }
        [data-theme="dark"] .qpm-left-scroll::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); }

        .qpm-editor-content {
          padding: 32px 40px 40px;
          max-width: 820px;
          width: 100%;
          margin: 0 auto;
          box-sizing: border-box;
        }

        /* Title input */
        .qpm-title-input-wrap { margin-bottom:20px; position:relative; }
        .qpm-title-input {
          width:100%; border:none; outline:none; background:none;
          font-family: var(--font-display,'Outfit',sans-serif);
          font-size:clamp(20px,3vw,30px);
          font-weight:800; letter-spacing:-0.03em;
          color:var(--color-black,#0d0d0d);
          line-height:1.25; resize:none;
          box-sizing:border-box; padding:0;
          display:block;
        }
        [data-theme="dark"] .qpm-title-input { color:#fff; }
        .qpm-title-input::placeholder { color:var(--color-gray-300,#d1d5db); }
        .qpm-title-char { position:absolute; bottom:-18px; right:0; font-size:10px; color:var(--color-gray-400,#9ca3af); }

        /* Meta row */
        .qpm-meta-row {
          display:flex; gap:12px; margin-bottom:20px; flex-wrap:wrap;
        }
        .qpm-meta-field {
          display:flex; flex-direction:column; gap:4px; min-width:140px; flex:1;
        }
        .qpm-meta-label {
          font-size:10px; font-weight:700; text-transform:uppercase;
          letter-spacing:0.08em; color:var(--color-gray-400,#9ca3af);
        }
        .qpm-meta-select, .qpm-meta-input {
          border:1.5px solid var(--color-gray-200,#e5e7eb);
          border-radius:9px; padding:8px 12px;
          font-size:13px; font-weight:500;
          background:var(--color-gray-50,#f9fafb);
          color:var(--color-black,#0d0d0d);
          outline:none; cursor:pointer; font-family:inherit;
          box-sizing:border-box; width:100%;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
          background-repeat:no-repeat; background-position:right 10px center;
          padding-right:30px; -webkit-appearance:none; appearance:none;
          transition:border-color 0.15s;
        }
        [data-theme="dark"] .qpm-meta-select, [data-theme="dark"] .qpm-meta-input {
          background-color:#1e1e2a; border-color:rgba(255,255,255,0.1); color:#fff;
        }
        .qpm-meta-select:focus, .qpm-meta-input:focus {
          border-color:var(--accent-color,#0055a4);
          box-shadow:0 0 0 3px rgba(0,85,164,0.1);
        }

        /* Divider */
        .qpm-field-divider { height:1px; background:var(--color-gray-100,#f1f1f1); margin:20px 0; }
        [data-theme="dark"] .qpm-field-divider { background:rgba(255,255,255,0.06); }

        /* Lead textarea */
        .qpm-lead-label {
          font-size:10px; font-weight:700; text-transform:uppercase;
          letter-spacing:0.08em; color:var(--color-gray-400,#9ca3af); margin-bottom:6px; display:block;
        }
        .qpm-lead-textarea {
          width:100%; border:1.5px solid var(--color-gray-200,#e5e7eb);
          border-radius:10px; padding:12px 14px;
          font-family:var(--font-serif,'Playfair Display',Georgia,serif);
          font-size:15px; line-height:1.6;
          color:var(--color-black,#0d0d0d);
          background:var(--color-gray-50,#f9fafb);
          resize:vertical; outline:none; box-sizing:border-box;
          min-height:80px; transition:border-color 0.15s, box-shadow 0.15s;
        }
        [data-theme="dark"] .qpm-lead-textarea { background:#1e1e2a; border-color:rgba(255,255,255,0.1); color:#fff; }
        .qpm-lead-textarea::placeholder { color:var(--color-gray-400,#9ca3af); font-style:italic; }
        .qpm-lead-textarea:focus {
          border-color:var(--accent-color,#0055a4);
          box-shadow:0 0 0 3px rgba(0,85,164,0.1);
          background:#fff;
        }
        [data-theme="dark"] .qpm-lead-textarea:focus { background:#202030; }

        /* Body label */
        .qpm-body-label-row {
          display:flex; align-items:center; justify-content:space-between;
          margin-bottom:8px;
        }
        .qpm-body-label {
          font-size:10px; font-weight:700; text-transform:uppercase;
          letter-spacing:0.08em; color:var(--color-gray-400,#9ca3af);
        }
        .qpm-body-stats {
          font-size:11px; color:var(--color-gray-400,#9ca3af);
          display:flex; gap:10px;
        }

        /* ── Story Images Section ── */
        .qpm-story-images {
          margin-top:28px;
          border:1.5px solid var(--color-gray-200,#e5e7eb);
          border-radius:14px; overflow:hidden;
        }
        [data-theme="dark"] .qpm-story-images { border-color:rgba(255,255,255,0.08); }

        .qpm-story-images-header {
          display:flex; align-items:center; gap:8px; padding:12px 16px;
          background:var(--color-gray-50,#f9fafb);
          border-bottom:1px solid var(--color-gray-200,#e5e7eb);
        }
        [data-theme="dark"] .qpm-story-images-header {
          background:#1a1a26; border-color:rgba(255,255,255,0.06);
        }
        .qpm-story-images-header h5 {
          flex:1; font-size:12px; font-weight:700; text-transform:uppercase;
          letter-spacing:0.07em; color:var(--color-gray-600,#4b5563); margin:0;
        }
        [data-theme="dark"] .qpm-story-images-header h5 { color:rgba(255,255,255,0.6); }
        .qpm-story-images-hint {
          font-size:11px; color:var(--color-gray-400,#9ca3af); font-style:italic;
        }

        .qpm-story-images-body { padding:14px 16px; }

        /* Cover image zone */
        .qpm-cover-zone-label {
          font-size:10px; font-weight:700; text-transform:uppercase;
          letter-spacing:0.07em; color:var(--color-gray-400,#9ca3af); margin-bottom:8px; display:block;
        }
        .qpm-cover-dropzone {
          border:2px dashed var(--color-gray-300,#d1d5db);
          border-radius:10px; min-height:90px;
          display:flex; align-items:center; justify-content:center;
          flex-direction:column; gap:6px; cursor:pointer;
          padding:16px; text-align:center; transition:all 0.18s;
          background:var(--color-gray-50,#f9fafb);
          color:var(--color-gray-500,#6b7280); margin-bottom:14px;
        }
        [data-theme="dark"] .qpm-cover-dropzone { background:#1a1a26; border-color:rgba(255,255,255,0.1); }
        .qpm-cover-dropzone:hover {
          border-color:var(--accent-color,#0055a4);
          background:color-mix(in srgb,var(--accent-color,#0055a4) 5%, transparent);
        }
        .qpm-cover-dropzone span { font-size:12px; font-weight:600; }
        .qpm-cover-dropzone small { font-size:10px; opacity:0.6; }
        .qpm-cover-preview-wrap {
          position:relative; border-radius:10px; overflow:hidden;
          max-height:160px; margin-bottom:14px;
        }
        .qpm-cover-preview-wrap img { width:100%; height:160px; object-fit:cover; display:block; }
        .qpm-cover-remove {
          position:absolute; top:8px; right:8px;
          background:rgba(0,0,0,0.65); color:#fff; border:none;
          border-radius:6px; padding:4px 8px; font-size:11px; font-weight:600;
          cursor:pointer; display:flex; align-items:center; gap:4px; transition:background 0.15s;
        }
        .qpm-cover-remove:hover { background:rgba(239,68,68,0.9); }

        /* Story image grid */
        .qpm-images-grid {
          display:grid;
          grid-template-columns:repeat(auto-fill, minmax(120px, 1fr));
          gap:10px; margin-bottom:12px;
        }
        .qpm-img-card {
          border:1.5px solid var(--color-gray-200,#e5e7eb);
          border-radius:10px; overflow:hidden; background:var(--color-gray-50,#f9fafb);
          transition:border-color 0.15s, box-shadow 0.15s;
        }
        [data-theme="dark"] .qpm-img-card { border-color:rgba(255,255,255,0.08); background:#1e1e2a; }
        .qpm-img-card:hover { border-color:var(--accent-color,#0055a4); }
        .qpm-img-thumb-wrap {
          position:relative; aspect-ratio:4/3; overflow:hidden; background:#000;
        }
        .qpm-img-thumb-wrap img { width:100%; height:100%; object-fit:cover; display:block; }
        .qpm-img-badge {
          position:absolute; bottom:4px; left:4px;
          background:rgba(0,0,0,0.72); color:#fff; font-size:9px;
          font-weight:800; padding:2px 5px; border-radius:4px; letter-spacing:0.03em;
        }
        .qpm-img-remove {
          position:absolute; top:4px; right:4px;
          width:20px; height:20px; background:rgba(0,0,0,0.65); color:#fff;
          border:none; border-radius:50%; cursor:pointer; font-size:10px;
          display:flex; align-items:center; justify-content:center; transition:background 0.15s;
        }
        .qpm-img-remove:hover { background:rgba(239,68,68,0.9); }
        .qpm-img-card-body { padding:6px 7px 8px; }
        .qpm-tag-pill {
          display:flex; align-items:center; gap:4px; padding:3px 7px;
          background:color-mix(in srgb,var(--accent-color,#0055a4) 10%,transparent);
          color:var(--accent-color,#0055a4);
          border-radius:5px; font-size:10px; font-weight:700;
          cursor:grab; user-select:none; margin-bottom:5px;
          border:1px dashed color-mix(in srgb,var(--accent-color,#0055a4) 35%,transparent);
          transition:background 0.15s; width:100%; box-sizing:border-box; justify-content:center;
        }
        .qpm-tag-pill:hover { background:color-mix(in srgb,var(--accent-color,#0055a4) 18%,transparent); }
        .qpm-tag-pill:active { cursor:grabbing; }
        .qpm-caption-input-small {
          width:100%; border:1px solid var(--color-gray-200,#e5e7eb);
          border-radius:5px; padding:4px 6px; font-size:10px;
          background:var(--color-paper,#fff); color:var(--color-black,#0d0d0d);
          outline:none; box-sizing:border-box; font-family:inherit;
        }
        [data-theme="dark"] .qpm-caption-input-small {
          background:#252530; border-color:rgba(255,255,255,0.1); color:#fff;
        }
        .qpm-caption-input-small::placeholder { color:var(--color-gray-400,#9ca3af); }

        /* Add images button */
        .qpm-add-images-zone {
          border:2px dashed var(--color-gray-200,#e5e7eb);
          border-radius:10px; padding:14px 12px;
          display:flex; align-items:center; justify-content:center; flex-direction:column;
          gap:5px; cursor:pointer; transition:all 0.18s;
          text-align:center; background:none;
        }
        [data-theme="dark"] .qpm-add-images-zone { border-color:rgba(255,255,255,0.08); }
        .qpm-add-images-zone:hover {
          border-color:var(--accent-color,#0055a4);
          background:color-mix(in srgb,var(--accent-color,#0055a4) 5%,transparent);
        }
        .qpm-add-images-zone span { font-size:12px; font-weight:600; color:var(--color-gray-600,#4b5563); }
        [data-theme="dark"] .qpm-add-images-zone span { color:rgba(255,255,255,0.6); }
        .qpm-add-images-zone small { font-size:10px; color:var(--color-gray-400,#9ca3af); }

        /* Tags field */
        .qpm-tags-field { margin-top:20px; }
        .qpm-tags-input-wrap {
          display:flex; align-items:center; gap:8px;
          border:1.5px solid var(--color-gray-200,#e5e7eb);
          border-radius:9px; padding:8px 12px; background:var(--color-gray-50,#f9fafb);
          transition:border-color 0.15s, box-shadow 0.15s;
        }
        [data-theme="dark"] .qpm-tags-input-wrap { background:#1e1e2a; border-color:rgba(255,255,255,0.1); }
        .qpm-tags-input-wrap:focus-within {
          border-color:var(--accent-color,#0055a4);
          box-shadow:0 0 0 3px rgba(0,85,164,0.1);
        }
        .qpm-tags-icon { color:var(--color-gray-400,#9ca3af); flex-shrink:0; }
        .qpm-tags-input {
          flex:1; border:none; outline:none; background:none;
          font-size:13px; font-family:inherit; color:var(--color-black,#0d0d0d);
        }
        [data-theme="dark"] .qpm-tags-input { color:#fff; }
        .qpm-tags-input::placeholder { color:var(--color-gray-400,#9ca3af); }

        /* ── Right Sidebar ── */
        .qpm-sidebar {
          width:300px; flex-shrink:0;
          border-left:1px solid var(--color-gray-100,#f1f1f1);
          display:flex; flex-direction:column; overflow:hidden;
          transition:width 0.25s ease, opacity 0.2s ease;
        }
        [data-theme="dark"] .qpm-sidebar { border-color:rgba(255,255,255,0.06); }
        .qpm-sidebar.collapsed { width:40px; overflow:hidden; }
        .qpm-sidebar-scroll {
          flex:1; overflow-y:auto; padding-bottom:20px;
        }
        .qpm-sidebar-scroll::-webkit-scrollbar { width:4px; }
        .qpm-sidebar-scroll::-webkit-scrollbar-thumb { background:var(--color-gray-200,#e5e7eb); border-radius:4px; }
        [data-theme="dark"] .qpm-sidebar-scroll::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.08); }

        .qpm-sidebar-collapse-strip {
          display:flex; align-items:center; justify-content:center;
          height:100%; cursor:pointer;
          color:var(--color-gray-400,#9ca3af);
          writing-mode:vertical-rl; font-size:10px; font-weight:700;
          text-transform:uppercase; letter-spacing:0.1em; gap:8px;
          transition:color 0.15s;
        }
        .qpm-sidebar-collapse-strip:hover { color:var(--accent-color,#0055a4); }

        /* Sidebar collapsible sections */
        .qpm-section {
          border-bottom:1px solid var(--color-gray-100,#f1f1f1);
        }
        [data-theme="dark"] .qpm-section { border-color:rgba(255,255,255,0.05); }
        .qpm-section-toggle {
          width:100%; display:flex; align-items:center; justify-content:space-between;
          padding:11px 16px; border:none; background:none; cursor:pointer;
          text-align:left; transition:background 0.15s;
        }
        .qpm-section-toggle:hover { background:var(--color-gray-50,#f9fafb); }
        [data-theme="dark"] .qpm-section-toggle:hover { background:rgba(255,255,255,0.03); }
        .qpm-section-toggle-left {
          display:flex; align-items:center; gap:7px;
          font-size:11px; font-weight:700; text-transform:uppercase;
          letter-spacing:0.07em; color:var(--color-gray-600,#4b5563);
        }
        [data-theme="dark"] .qpm-section-toggle-left { color:rgba(255,255,255,0.55); }
        .qpm-section-icon { color:var(--color-gray-400,#9ca3af); }
        .qpm-section-chevron { color:var(--color-gray-400,#9ca3af); transition:transform 0.2s; }
        .qpm-section-chevron.open { transform:rotate(180deg); }
        .qpm-section-body { padding:0 16px 14px; }

        /* Count badge */
        .qpm-count-badge {
          background:var(--accent-color,#0055a4); color:#fff;
          font-size:9px; font-weight:800; padding:1px 5px; border-radius:10px;
          margin-left:4px;
        }

        /* Readiness badge */
        .qpm-readiness-badge {
          font-size:9px; font-weight:800; padding:2px 6px; border-radius:10px;
          margin-left:4px;
          background:var(--color-gray-100,#f3f4f6); color:var(--color-gray-600,#4b5563);
        }
        .qpm-readiness-badge.perfect { background:#dcfce7; color:#16a34a; }

        /* Readiness bar */
        .qpm-readiness-bar {
          height:4px; background:var(--color-gray-100,#f3f4f6);
          border-radius:4px; overflow:hidden; margin-bottom:10px;
        }
        [data-theme="dark"] .qpm-readiness-bar { background:rgba(255,255,255,0.08); }
        .qpm-readiness-fill {
          height:100%; border-radius:4px; transition:width 0.4s ease;
          background:linear-gradient(90deg,#3b82f6,#10b981);
        }

        /* Checklist */
        .qpm-checklist { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:6px; }
        .qpm-check-item {
          display:flex; align-items:center; gap:7px;
          font-size:12px; color:var(--color-gray-500,#6b7280);
        }
        [data-theme="dark"] .qpm-check-item { color:rgba(255,255,255,0.5); }
        .qpm-check-item.done { color:var(--color-gray-800,#1f2937); }
        [data-theme="dark"] .qpm-check-item.done { color:rgba(255,255,255,0.85); }
        .qpm-check-item .ok { color:#10b981; }
        .qpm-check-item .warn { color:var(--color-gray-300,#d1d5db); }

        /* Stats grid */
        .qpm-stats-grid {
          display:grid; grid-template-columns:1fr 1fr; gap:8px;
        }
        .qpm-stat-card {
          background:var(--color-gray-50,#f9fafb); border-radius:10px; padding:10px 12px;
          border:1px solid var(--color-gray-100,#f1f1f1);
        }
        [data-theme="dark"] .qpm-stat-card { background:#1e1e2a; border-color:rgba(255,255,255,0.06); }
        .qpm-stat-value { display:block; font-size:18px; font-weight:800; color:var(--color-black,#0d0d0d); line-height:1; margin-bottom:2px; }
        [data-theme="dark"] .qpm-stat-value { color:#fff; }
        .qpm-stat-label { font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; color:var(--color-gray-400,#9ca3af); }

        /* References */
        .qpm-ref-search-wrap {
          position:relative; margin-bottom:10px;
        }
        .qpm-ref-search-icon {
          position:absolute; left:9px; top:50%; transform:translateY(-50%);
          color:var(--color-gray-400,#9ca3af); pointer-events:none;
        }
        .qpm-ref-search-input {
          width:100%; padding:8px 10px 8px 30px; box-sizing:border-box;
          border:1.5px solid var(--color-gray-200,#e5e7eb); border-radius:8px;
          font-size:12px; font-family:inherit; outline:none;
          background:var(--color-gray-50,#f9fafb); color:var(--color-black,#0d0d0d);
          transition:border-color 0.15s;
        }
        [data-theme="dark"] .qpm-ref-search-input { background:#1e1e2a; border-color:rgba(255,255,255,0.1); color:#fff; }
        .qpm-ref-search-input:focus { border-color:var(--accent-color,#0055a4); background:#fff; }
        [data-theme="dark"] .qpm-ref-search-input:focus { background:#252530; }
        .qpm-ref-dropdown {
          position:absolute; top:100%; left:0; right:0; z-index:50;
          background:var(--color-paper,#fff); border:1px solid var(--color-gray-200,#e5e7eb);
          border-radius:10px; box-shadow:0 8px 24px rgba(0,0,0,0.12);
          max-height:200px; overflow-y:auto; margin-top:4px;
        }
        [data-theme="dark"] .qpm-ref-dropdown { background:#1e1e2a; border-color:rgba(255,255,255,0.1); }
        .qpm-ref-dropdown-item {
          padding:8px 12px; cursor:pointer; font-size:12px;
          border-bottom:1px solid var(--color-gray-100,#f1f1f1); transition:background 0.12s;
          display:flex; flex-direction:column; gap:2px;
        }
        [data-theme="dark"] .qpm-ref-dropdown-item { border-color:rgba(255,255,255,0.05); }
        .qpm-ref-dropdown-item:last-child { border-bottom:none; }
        .qpm-ref-dropdown-item:hover { background:var(--color-gray-50,#f9fafb); }
        [data-theme="dark"] .qpm-ref-dropdown-item:hover { background:rgba(255,255,255,0.04); }
        .qpm-ref-dropdown-cat {
          font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em;
          color:var(--accent-color,#0055a4); opacity:0.8;
        }
        .qpm-ref-dropdown-empty { padding:12px; font-size:12px; color:var(--color-gray-400,#9ca3af); text-align:center; }
        .qpm-ref-empty {
          display:flex; flex-direction:column; align-items:center; gap:8px;
          padding:20px 12px; color:var(--color-gray-300,#d1d5db); text-align:center;
        }
        [data-theme="dark"] .qpm-ref-empty { color:rgba(255,255,255,0.15); }
        .qpm-ref-empty p { font-size:12px; line-height:1.5; margin:0; }
        .qpm-ref-card {
          border:1px solid var(--color-gray-200,#e5e7eb); border-radius:9px;
          padding:9px 10px; margin-bottom:7px; background:var(--color-gray-50,#f9fafb);
        }
        [data-theme="dark"] .qpm-ref-card { background:#1e1e2a; border-color:rgba(255,255,255,0.08); }
        .qpm-ref-card-top { display:flex; gap:6px; margin-bottom:6px; align-items:flex-start; }
        .qpm-ref-card-info { flex:1; min-width:0; }
        .qpm-ref-card-cat {
          font-size:9px; font-weight:700; text-transform:uppercase;
          letter-spacing:0.07em; color:var(--accent-color,#0055a4); display:block; margin-bottom:2px;
        }
        .qpm-ref-card-title { font-size:11px; font-weight:600; color:var(--color-black,#0d0d0d); line-height:1.4; }
        [data-theme="dark"] .qpm-ref-card-title { color:rgba(255,255,255,0.85); }
        .qpm-ref-card-remove {
          width:18px; height:18px; border:none; background:var(--color-gray-200,#e5e7eb);
          border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center;
          color:var(--color-gray-500,#6b7280); flex-shrink:0; transition:all 0.15s;
        }
        [data-theme="dark"] .qpm-ref-card-remove { background:rgba(255,255,255,0.1); color:rgba(255,255,255,0.5); }
        .qpm-ref-card-remove:hover { background:#ef4444; color:#fff; }
        .qpm-ref-card-note {
          width:100%; border:1px solid var(--color-gray-200,#e5e7eb);
          border-radius:6px; padding:5px 8px; font-size:11px; font-family:inherit;
          outline:none; background:var(--color-paper,#fff); color:var(--color-black,#0d0d0d);
          box-sizing:border-box; transition:border-color 0.15s;
        }
        [data-theme="dark"] .qpm-ref-card-note { background:#252530; border-color:rgba(255,255,255,0.08); color:#fff; }
        .qpm-ref-card-note:focus { border-color:var(--accent-color,#0055a4); }

        /* AI / History placeholder */
        .qpm-placeholder-section {
          display:flex; flex-direction:column; align-items:center; gap:6px;
          padding:20px 12px; text-align:center; color:var(--color-gray-300,#d1d5db);
        }
        [data-theme="dark"] .qpm-placeholder-section { color:rgba(255,255,255,0.15); }
        .qpm-placeholder-section p { font-size:11px; margin:0; line-height:1.4; }

        /* ── Sticky Footer ── */
        .qpm-footer {
          display:flex; align-items:center; justify-content:space-between;
          padding:12px 20px; flex-shrink:0;
          border-top:1px solid var(--color-gray-100,#f1f1f1);
          background:var(--color-paper,#fff);
        }
        [data-theme="dark"] .qpm-footer {
          background:#16161e; border-color:rgba(255,255,255,0.06);
        }
        .qpm-footer-left { display:flex; align-items:center; gap:10px; }
        .qpm-footer-right { display:flex; align-items:center; gap:8px; }

        .qpm-btn-ghost {
          padding:8px 14px; border:1px solid var(--color-gray-200,#e5e7eb);
          border-radius:9px; background:none; cursor:pointer; font-size:13px; font-weight:600;
          color:var(--color-gray-600,#4b5563); font-family:inherit; transition:all 0.15s; white-space:nowrap;
          display:flex; align-items:center; gap:6px;
        }
        [data-theme="dark"] .qpm-btn-ghost { border-color:rgba(255,255,255,0.1); color:rgba(255,255,255,0.6); }
        .qpm-btn-ghost:hover { background:var(--color-gray-50,#f9fafb); border-color:var(--color-gray-300,#d1d5db); }
        [data-theme="dark"] .qpm-btn-ghost:hover { background:rgba(255,255,255,0.06); }

        .qpm-btn-primary {
          padding:9px 20px; border:none; border-radius:9px;
          background:var(--btn-color, #0055a4); color:#fff;
          cursor:pointer; font-size:13px; font-weight:700; font-family:inherit;
          display:flex; align-items:center; gap:7px; transition:all 0.18s;
          box-shadow:0 2px 8px color-mix(in srgb,var(--btn-color,#0055a4) 35%,transparent);
          white-space:nowrap; letter-spacing:0.01em;
        }
        .qpm-btn-primary:hover {
          filter:brightness(1.1); transform:translateY(-1px);
          box-shadow:0 4px 16px color-mix(in srgb,var(--btn-color,#0055a4) 40%,transparent);
        }
        .qpm-btn-primary:active { transform:translateY(0); }
        .qpm-btn-primary:disabled { opacity:0.6; cursor:not-allowed; transform:none; }

        /* ── Responsive ── */
        @media (max-width:900px) {
          .qpm-modal { width:99vw; height:99vh; border-radius:12px; }
          .qpm-sidebar { display:none !important; }
          .qpm-mobile-tabs { display:flex; }
          .qpm-editor-content { padding:20px; }
          .qpm-mobile-hidden { display:none !important; }
        }
        @media (max-width:600px) {
          .qpm-editor-content { padding:16px; }
          .qpm-title-input { font-size:20px; }
          .qpm-btn-primary { padding:9px 14px; font-size:12px; }
          .qpm-btn-ghost { padding:8px 10px; font-size:12px; }
        }
      `}</style>

      {/* ── Backdrop ── */}
      <div
        className={`qpm-overlay${isClosing ? ' closing' : ''}`}
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        <div className={`qpm-modal${isClosing ? ' closing' : ''}`}>

          {/* ════ TYPE SELECTION SCREEN ════ */}
          {!selectedType ? (
            <div className="qpm-type-screen">
              <div className="qpm-type-screen-header">
                <div>
                  <h2>Create Content</h2>
                  <p>Choose the type of content you want to publish</p>
                </div>
                <button className="qpm-close-x" onClick={handleClose} aria-label="Close">
                  <FiX size={16} />
                </button>
              </div>
              <div className="qpm-type-grid">
                {visiblePostTypes.map(pt => {
                  const Icon = pt.icon;
                  return (
                    <button
                      key={pt.id}
                      className="qpm-type-card"
                      style={{ '--pt-color': pt.color }}
                      onClick={() => handleTypeSelect(pt)}
                    >
                      <div className="qpm-type-card-icon">
                        <Icon size={20} />
                      </div>
                      <span className="qpm-type-card-label">{pt.label}</span>
                      <span className="qpm-type-card-desc">{pt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ════ ENTERPRISE EDITOR LAYOUT ════ */
            <div className="qpm-editor-layout">

              {/* ── Compact Header ── */}
              <div className="qpm-header">
                <div className="qpm-header-left">
                  <button className="qpm-back-btn" type="button" onClick={() => setSelectedType(null)}>
                    ← Change Type
                  </button>
                  <span className="qpm-breadcrumb-sep">/</span>
                  <span className="qpm-type-badge" style={{ '--badge-color': selectedType.color }}>
                    {React.createElement(selectedType.icon, { size:12 })}
                    {selectedType.label}
                  </span>
                </div>
                <div className="qpm-header-right">
                  <span className={`qpm-autosave ${autosave}`}>
                    <span className="qpm-autosave-dot" />
                    {autosave === 'saving' ? 'Saving…' : 'Auto-saved'}
                  </span>
                  <button
                    type="button"
                    className="qpm-sidebar-toggle-btn"
                    title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                    onClick={() => setSidebarOpen(v => !v)}
                  >
                    <FiLayout size={14} />
                  </button>
                  <button className="qpm-close-x" type="button" onClick={handleClose} aria-label="Close">
                    <FiX size={15} />
                  </button>
                </div>
              </div>

              {/* Mobile Panel Tabs */}
              <div className="qpm-mobile-tabs">
                <button
                  type="button"
                  className={`qpm-mobile-tab-btn${mobilePanel === 'editor' ? ' active' : ''}`}
                  onClick={() => setMobilePanel('editor')}
                >Editor</button>
                <button
                  type="button"
                  className={`qpm-mobile-tab-btn${mobilePanel === 'sidebar' ? ' active' : ''}`}
                  onClick={() => setMobilePanel('sidebar')}
                >
                  Info {references.length > 0 && <span className="qpm-count-badge">{references.length}</span>}
                </button>
              </div>

              {/* ── Main Workspace ── */}
              <form id={formId} onSubmit={handleSubmit} className="qpm-workspace">

                {/* ── LEFT EDITOR PANEL ── */}
                <div
                  className="qpm-left-panel"
                  style={{ display: mobilePanel !== 'editor' ? 'none' : undefined }}
                >
                  <div className="qpm-left-scroll">
                    <div className="qpm-editor-content">

                      {/* ─ Title ─ */}
                      <div className="qpm-title-input-wrap">
                        <textarea
                          className="qpm-title-input"
                          placeholder={
                            selectedType.id === 'mind'   ? 'Your quick thought…'
                            : selectedType.id === 'spoken' ? 'What are you speaking up about?'
                            : 'Catchy headline (6–9 words recommended)…'
                          }
                          value={form.title}
                          onChange={(e) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                            setForm({ ...form, title: e.target.value });
                          }}
                          onInput={(e) => { e.target.style.height='auto'; e.target.style.height=e.target.scrollHeight+'px'; }}
                          rows={1}
                          required
                          maxLength={120}
                          style={{ overflow:'hidden', resize:'none' }}
                        />
                        <span className="qpm-title-char">{form.title.length}/120</span>
                      </div>

                      {/* ─ Meta row: Multi-Section Selector + Year ─ */}
                      <div className="qpm-meta-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
                        {activeFields.includes('category') && (
                          <div style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <span className="qpm-meta-label">Sections / Categories (Up to 3 allowed)</span>
                              <span style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: selectedCategories.some(c => ['tea-shop', 'pictures-speak'].includes(c))
                                  ? '#0284c7'
                                  : selectedCategories.length >= 3 ? '#d97706' : 'var(--color-gray-500)'
                              }}>
                                {selectedCategories.some(c => ['tea-shop', 'pictures-speak'].includes(c))
                                  ? '1/1 Standalone Section'
                                  : `${selectedCategories.length}/3 Selected`}
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {CATEGORIES.map((cat) => {
                                const isSelected = selectedCategories.includes(cat.value);
                                const isPrimary = selectedCategories[0] === cat.value;
                                return (
                                  <button
                                    key={cat.value}
                                    type="button"
                                    onClick={() => handleToggleCategory(cat.value)}
                                    style={{
                                      background: isSelected
                                        ? (isPrimary ? (selectedType?.color || 'var(--color-primary, #0055a4)') : 'rgba(0, 85, 164, 0.12)')
                                        : 'var(--color-gray-100, #f1f5f9)',
                                      border: isSelected
                                        ? `1.5px solid ${isPrimary ? (selectedType?.color || 'var(--color-primary, #0055a4)') : 'rgba(0, 85, 164, 0.4)'}`
                                        : '1px solid var(--color-gray-300, #cbd5e1)',
                                      color: isSelected
                                        ? (isPrimary ? '#ffffff' : (selectedType?.color || 'var(--color-primary, #0055a4)'))
                                        : 'var(--color-black, #0f172a)',
                                      padding: '5px 12px',
                                      borderRadius: 8,
                                      fontSize: 12,
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 5,
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    <span>{cat.label}</span>
                                    {isPrimary && (
                                      <span style={{ fontSize: 9, background: 'rgba(255,255,255,0.28)', padding: '1px 5px', borderRadius: 4, textTransform: 'uppercase' }}>
                                        Primary
                                      </span>
                                    )}
                                    {isSelected && !isPrimary && (
                                      <span style={{ fontSize: 9, background: 'rgba(0,0,0,0.08)', padding: '1px 5px', borderRadius: 4, textTransform: 'uppercase' }}>
                                        Cross-post
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {(form.category === 'kyp' || selectedCategories.includes('kyp')) && (
                          <div className="qpm-meta-field" style={{ maxWidth: 220, marginTop: 4 }}>
                            <span className="qpm-meta-label">Historical Event Year *</span>
                            <select
                              className="qpm-meta-select"
                              value={form.historicalYear || ''}
                              onChange={(e) => setForm({ ...form, historicalYear: e.target.value })}
                              required
                            >
                              <option value="" disabled>Select event year…</option>
                              {Array.from({ length: 2026 - 1800 + 1 }, (_, i) => 2026 - i).map(y => (
                                <option key={y} value={y}>{y}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="qpm-field-divider" />

                      {/* ─ Lead / Summary ─ */}
                      <div style={{ marginBottom: 20 }}>
                        <span className="qpm-lead-label">
                          {selectedType.id === 'mind' || selectedType.id === 'spoken' ? 'Your Message *' : 'Summary / Lead *'}
                        </span>
                        <textarea
                          className="qpm-lead-textarea"
                          placeholder={
                            selectedType.id === 'mind'   ? 'Express your mind…'
                            : selectedType.id === 'spoken' ? 'Speak your truth…'
                            : 'Brief summary of the story… (15–20 words)'
                          }
                          value={form.lead}
                          onChange={(e) => setForm({ ...form, lead: e.target.value })}
                          required
                          rows={selectedType.id === 'mind' || selectedType.id === 'spoken' ? 4 : 2}
                          maxLength={400}
                        />
                      </div>

                      {/* ─ Article Body (WordEditor) ─ */}
                      {activeFields.includes('body') && (
                        <div style={{ marginBottom:24 }}>
                          <div className="qpm-body-label-row">
                            <span className="qpm-body-label">Article Body *</span>
                            <div className="qpm-body-stats">
                              <span>{wordCount.toLocaleString()} words</span>
                              <span>·</span>
                              <span>{readingTime} min read</span>
                            </div>
                          </div>
                          <WordEditor
                            value={form.body}
                            onChange={(val) => setForm({ ...form, body: val })}
                            placeholder="Write the full story here… Drag [image-N] tags from below to embed images inline."
                            minHeight={320}
                          />
                        </div>
                      )}

                      {/* ─ Story Images & Cover Image ─ */}
                      {activeFields.includes('image') && (
                        <div className="qpm-story-images">
                          <div className="qpm-story-images-header">
                            <FiImage size={14} style={{ color:'var(--accent-color,#0055a4)' }} />
                            <h5>Story Images ({multipleImages.length})</h5>
                            {activeFields.includes('body') && (
                              <span className="qpm-story-images-hint">
                                Drag or click a tag to insert inline ↑
                              </span>
                            )}
                          </div>
                          <div className="qpm-story-images-body">

                            {/* Cover image */}
                            <span className="qpm-cover-zone-label">Cover Image</span>
                            {previewUrl ? (
                              <div className="qpm-cover-preview-wrap">
                                <img src={previewUrl} alt="Cover preview" />
                                <button
                                  type="button"
                                  className="qpm-cover-remove"
                                  onClick={() => { setCoverImage(null); setPreviewUrl(''); }}
                                >
                                  <FiX size={11} /> Remove
                                </button>
                              </div>
                            ) : (
                              <label className="qpm-cover-dropzone">
                                <FiUpload size={20} />
                                <span>Upload cover image</span>
                                <small>Supported: JPEG, PNG, GIF, WebP, SVG · Max 10MB</small>
                                <input
                                  type="file"
                                  accept="image/*"
                                  style={{ display:'none' }}
                                  onChange={handleCoverImageChange}
                                />
                              </label>
                            )}

                            {/* Picture-Speaks: multi-images in cover zone */}
                            {selectedType.id === 'picture' && (
                              <>
                                {multipleImages.length > 0 && (
                                  <div className="qpm-images-grid">
                                    {multipleImages.map((img, idx) => (
                                      <div key={idx} className="qpm-img-card">
                                        <div className="qpm-img-thumb-wrap">
                                          <img src={img.previewUrl} alt={`#${idx+1}`} />
                                          <span className="qpm-img-badge">#{idx+1}</span>
                                          <button
                                            type="button"
                                            className="qpm-img-remove"
                                            onClick={() => handleRemoveMultipleImage(idx)}
                                          >
                                            <FiX size={9} />
                                          </button>
                                        </div>
                                        <div className="qpm-img-card-body">
                                          <input
                                            type="text"
                                            className="qpm-caption-input-small"
                                            placeholder={`Caption…`}
                                            value={img.caption}
                                            onChange={(e) => handleCaptionChange(idx, e.target.value)}
                                          />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <label className="qpm-add-images-zone">
                                  <FiUpload size={18} style={{ color:'var(--accent-color,#0055a4)' }} />
                                  <span>+ Add Photos</span>
                                  <small>Supported: JPEG, PNG, GIF, WebP, SVG · Max 10MB each</small>
                                  <input type="file" accept="image/*" multiple style={{ display:'none' }} onChange={handlePictureImageChange} />
                                </label>
                              </>
                            )}

                            {/* Article story images (with drag-to-insert tags) */}
                            {selectedType.id !== 'picture' && activeFields.includes('body') && (
                              <>
                                {multipleImages.length > 0 && (
                                  <div className="qpm-images-grid" style={{ marginTop:12 }}>
                                    {multipleImages.map((img, idx) => (
                                      <div key={idx} className="qpm-img-card">
                                        <div className="qpm-img-thumb-wrap">
                                          <img src={img.previewUrl} alt={`Story image ${idx+1}`} />
                                          <span className="qpm-img-badge">img-{idx+1}</span>
                                          <button
                                            type="button"
                                            className="qpm-img-remove"
                                            onClick={() => handleRemoveMultipleImage(idx)}
                                          >
                                            <FiX size={9} />
                                          </button>
                                        </div>
                                        <div className="qpm-img-card-body">
                                          <div
                                            className="qpm-tag-pill"
                                            draggable
                                            onDragStart={(e) => {
                                              e.dataTransfer.setData('text/plain', `[image-${idx+1}]`);
                                              e.dataTransfer.effectAllowed = 'copy';
                                            }}
                                            onClick={() => insertTagAtCaret(`[image-${idx+1}]`)}
                                            title="Click or drag into editor body to embed"
                                          >
                                            ⠿ [image-{idx+1}]
                                          </div>
                                          <input
                                            type="text"
                                            className="qpm-caption-input-small"
                                            placeholder="Caption…"
                                            value={img.caption}
                                            onChange={(e) => handleCaptionChange(idx, e.target.value)}
                                          />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <label className="qpm-add-images-zone" style={{ marginTop: multipleImages.length > 0 ? 10 : 0 }}>
                                  <FiUpload size={18} style={{ color:'var(--accent-color,#0055a4)' }} />
                                  <span>+ Add Story Images</span>
                                  <small>Supported: JPEG, PNG, GIF, WebP, SVG · Max 10MB each</small>
                                  <input type="file" accept="image/*" multiple style={{ display:'none' }} onChange={handleStoryImagesAdd} />
                                </label>
                              </>
                            )}

                          </div>
                        </div>
                      )}

                      {/* ─ Tags ─ */}
                      {activeFields.includes('tags') && (
                        <div className="qpm-tags-field">
                          <span className="qpm-meta-label" style={{ display:'block', marginBottom:6 }}>Tags</span>
                          <div className="qpm-tags-input-wrap">
                            <FiHash size={13} className="qpm-tags-icon" />
                            <input
                              type="text"
                              className="qpm-tags-input"
                              placeholder="campus, politics, education (comma-separated)"
                              value={form.tags}
                              onChange={(e) => setForm({ ...form, tags: e.target.value })}
                            />
                          </div>
                        </div>
                      )}

                      {/* Bottom spacer */}
                      <div style={{ height:32 }} />

                    </div>
                  </div>
                </div>

                {/* ── RIGHT SIDEBAR ── */}
                <div
                  className={`qpm-sidebar${sidebarOpen ? '' : ' collapsed'}`}
                  style={{ display: mobilePanel !== 'sidebar' && window.innerWidth < 900 ? 'none' : undefined }}
                >
                  {sidebarOpen ? (
                    <div className="qpm-sidebar-scroll">

                      {/* References */}
                      <div className="qpm-section">
                        <button type="button" className="qpm-section-toggle" onClick={() => toggleSection('references')}>
                          <div className="qpm-section-toggle-left">
                            <FiBookOpen size={12} className="qpm-section-icon" />
                            References
                            {references.length > 0 && <span className="qpm-count-badge">{references.length}</span>}
                          </div>
                          <FiChevronDown size={13} className={`qpm-section-chevron${openSections.references ? ' open' : ''}`} />
                        </button>
                        {openSections.references && (
                          <div className="qpm-section-body">
                            <div className="qpm-ref-search-wrap">
                              <FiSearch size={12} className="qpm-ref-search-icon" />
                              <input
                                type="text"
                                className="qpm-ref-search-input"
                                placeholder="Search articles…"
                                value={refSearchQuery}
                                onChange={(e) => setRefSearchQuery(e.target.value)}
                              />
                              {refSearchQuery.trim() && (
                                <div className="qpm-ref-dropdown">
                                  {(() => {
                                    const filtered = articlesList.filter(art =>
                                      art.status === 'published' &&
                                      (art.title.toLowerCase().includes(refSearchQuery.toLowerCase()) ||
                                       art.category.toLowerCase().includes(refSearchQuery.toLowerCase()))
                                    ).slice(0,6);
                                    if (!filtered.length) return <div className="qpm-ref-dropdown-empty">No results</div>;
                                    return filtered.map(art => (
                                      <div
                                        key={art._id}
                                        className="qpm-ref-dropdown-item"
                                        onClick={() => {
                                          if (references.some(r => r.article._id === art._id)) { toast.error('Already added'); return; }
                                          setReferences(prev => [...prev, { article:art, note:'' }]);
                                          setRefSearchQuery('');
                                        }}
                                      >
                                        <span className="qpm-ref-dropdown-cat">{art.category}</span>
                                        {art.title}
                                      </div>
                                    ));
                                  })()}
                                </div>
                              )}
                            </div>
                            {references.length === 0 ? (
                              <div className="qpm-ref-empty">
                                <FiBookOpen size={26} />
                                <p>Search and add articles as references. Each can have its own note.</p>
                              </div>
                            ) : (
                              references.map((ref, idx) => (
                                <div key={ref.article._id} className="qpm-ref-card">
                                  <div className="qpm-ref-card-top">
                                    <div className="qpm-ref-card-info">
                                      <span className="qpm-ref-card-cat">{ref.article.category}</span>
                                      <div className="qpm-ref-card-title">{ref.article.title}</div>
                                    </div>
                                    <button
                                      type="button"
                                      className="qpm-ref-card-remove"
                                      onClick={() => setReferences(prev => prev.filter((_, i) => i !== idx))}
                                    >
                                      <FiX size={9} />
                                    </button>
                                  </div>
                                  <input
                                    type="text"
                                    className="qpm-ref-card-note"
                                    placeholder="Optional note…"
                                    value={ref.note}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setReferences(prev => prev.map((item, i) => i===idx ? {...item, note:val} : item));
                                    }}
                                  />
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="qpm-section">
                        <button type="button" className="qpm-section-toggle" onClick={() => toggleSection('stats')}>
                          <div className="qpm-section-toggle-left">
                            <FiBarChart2 size={12} className="qpm-section-icon" />
                            Article Stats
                          </div>
                          <FiChevronDown size={13} className={`qpm-section-chevron${openSections.stats ? ' open' : ''}`} />
                        </button>
                        {openSections.stats && (
                          <div className="qpm-section-body">
                            <div className="qpm-stats-grid">
                              <div className="qpm-stat-card">
                                <span className="qpm-stat-value">{wordCount.toLocaleString()}</span>
                                <span className="qpm-stat-label">Words</span>
                              </div>
                              <div className="qpm-stat-card">
                                <span className="qpm-stat-value">{readingTime}m</span>
                                <span className="qpm-stat-label">Read Time</span>
                              </div>
                              <div className="qpm-stat-card">
                                <span className="qpm-stat-value">{charCount.toLocaleString()}</span>
                                <span className="qpm-stat-label">Characters</span>
                              </div>
                              <div className="qpm-stat-card">
                                <span className="qpm-stat-value">{multipleImages.length}</span>
                                <span className="qpm-stat-label">Images</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Readiness Checklist */}
                      <div className="qpm-section">
                        <button type="button" className="qpm-section-toggle" onClick={() => toggleSection('checklist')}>
                          <div className="qpm-section-toggle-left">
                            <FiCheckCircle size={12} className="qpm-section-icon" />
                            Readiness
                            <span className={`qpm-readiness-badge${readiness === 100 ? ' perfect' : ''}`}>{readiness}%</span>
                          </div>
                          <FiChevronDown size={13} className={`qpm-section-chevron${openSections.checklist ? ' open' : ''}`} />
                        </button>
                        {openSections.checklist && (
                          <div className="qpm-section-body">
                            <div className="qpm-readiness-bar">
                              <div className="qpm-readiness-fill" style={{ width:`${readiness}%` }} />
                            </div>
                            <ul className="qpm-checklist">
                              {checkItems.map(item => (
                                <li key={item.id} className={`qpm-check-item${item.done ? ' done' : ''}`}>
                                  {item.done
                                    ? <FiCheckCircle size={12} className="ok" />
                                    : <FiAlertCircle size={12} className="warn" />}
                                  {item.label}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* AI Assistant */}
                      <div className="qpm-section">
                        <button type="button" className="qpm-section-toggle" onClick={() => toggleSection('ai')}>
                          <div className="qpm-section-toggle-left">
                            <FiZap size={12} className="qpm-section-icon" />
                            AI Assistant
                          </div>
                          <FiChevronDown size={13} className={`qpm-section-chevron${openSections.ai ? ' open' : ''}`} />
                        </button>
                        {openSections.ai && (
                          <div className="qpm-section-body">
                            <div className="qpm-placeholder-section">
                              <FiZap size={22} />
                              <p>AI writing suggestions coming soon.</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Version History */}
                      <div className="qpm-section">
                        <button type="button" className="qpm-section-toggle" onClick={() => toggleSection('history')}>
                          <div className="qpm-section-toggle-left">
                            <FiClock size={12} className="qpm-section-icon" />
                            Version History
                          </div>
                          <FiChevronDown size={13} className={`qpm-section-chevron${openSections.history ? ' open' : ''}`} />
                        </button>
                        {openSections.history && (
                          <div className="qpm-section-body">
                            <div className="qpm-placeholder-section">
                              <FiClock size={22} />
                              <p>No previous versions saved yet.</p>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  ) : (
                    <div
                      className="qpm-sidebar-collapse-strip"
                      onClick={() => setSidebarOpen(true)}
                      title="Expand sidebar"
                    >
                      ‹ Sidebar
                    </div>
                  )}
                </div>

              </form>

              {/* ── Sticky Footer ── */}
              <div className="qpm-footer">
                <div className="qpm-footer-left">
                  <button
                    type="button"
                    className="qpm-btn-ghost"
                    onClick={() => {
                      if (editingArticle) handleClose();
                      else setSelectedType(null);
                    }}
                  >
                    {editingArticle ? 'Cancel' : '← Back'}
                  </button>
                </div>
                <div className="qpm-footer-right">
                  <button
                    type="submit"
                    form={formId}
                    disabled={loading}
                    className="qpm-btn-primary"
                    style={{ '--btn-color': selectedType?.color || 'var(--color-primary, #0055a4)' }}
                  >
                    {loading ? 'Saving…' : (
                      <>
                        <FiCheck size={14} />
                        {editingArticle ? 'Update Story' : `Publish ${selectedType?.label || 'Article'}`}
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default QuickPublishModal;
