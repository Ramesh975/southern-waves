import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { FiCheck, FiArrowRight } from 'react-icons/fi';

const CATEGORIES = [
  { id: 'news', label: 'News', icon: '📰', desc: 'Campus issues, student initiatives, laws' },
  { id: 'editorial', label: 'Editorial', icon: '✍️', desc: 'In-depth reviews and opinions' },
  { id: 'features', label: 'Features', icon: '🎬', desc: 'Human interest stories, art, and book reviews' },
  { id: 'kyp', label: 'Know Our Past', icon: '📖', desc: 'Historical student movements and archives' },
  { id: 'tea-shop', label: 'Tea Shop', icon: '☕', desc: 'Student voices, gossip, and local vibes' },
  { id: 'pictures-speak', label: 'Pictures Speak', icon: '📷', desc: 'Untold stories captured through the lens' }
];

const POPULAR_TAGS = [
  'campus-life', 'student-politics', 'technology', 'sports', 
  'career-tips', 'exam-prep', 'arts-culture', 'health-wellness',
  'internships', 'books', 'events', 'exams', 'hostel-life'
];

const OnboardingPage = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [selectedCats, setSelectedCats] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [customTag, setCustomTag] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleCategory = (id) => {
    setSelectedCats(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleTag = (tag) => {
    const cleanTag = tag.toLowerCase().trim();
    setSelectedTags(prev => 
      prev.includes(cleanTag) ? prev.filter(t => t !== cleanTag) : [...prev, cleanTag]
    );
  };

  const handleAddCustomTag = (e) => {
    e.preventDefault();
    const clean = customTag.toLowerCase().trim().replace(/#/g, '');
    if (!clean) return;
    if (selectedTags.includes(clean)) {
      toast.error('Tag already selected');
    } else {
      setSelectedTags(prev => [...prev, clean]);
      setCustomTag('');
    }
  };

  const handleSave = async () => {
    if (selectedCats.length === 0) {
      return toast.error('Please choose at least one category to customize your feed!');
    }

    setSaving(true);
    try {
      await authAPI.updateProfile({
        recommendationSettings: {
          preferredCategories: selectedCats,
          preferredTags: selectedTags
        }
      });
      await refreshUser();
      toast.success('Your wave is ready! Welcome aboard!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="onboarding-page-container" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      background: 'radial-gradient(circle at 10% 20%, rgba(0, 0, 0, 0.05) 0%, rgba(200, 200, 255, 0.15) 90%), #fafafa',
      fontFamily: 'var(--font-sans, "Inter", sans-serif)'
    }}>
      <style>{`
        .onboarding-card {
          background: #ffffff;
          border: 3px solid #000000;
          box-shadow: 8px 8px 0px #000000;
          border-radius: 12px;
          padding: 40px;
          max-width: 800px;
          width: 100%;
          animation: onboardingSlideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes onboardingSlideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .onboarding-title {
          font-family: var(--font-display, "Outfit", sans-serif);
          font-size: 32px;
          font-weight: 900;
          text-transform: uppercase;
          margin-bottom: 8px;
          color: #000000;
          text-align: center;
        }
        .onboarding-subtitle {
          font-size: 16px;
          color: #666;
          text-align: center;
          margin-bottom: 32px;
        }
        .section-title {
          font-size: 16px;
          font-weight: 800;
          text-transform: uppercase;
          margin-bottom: 16px;
          color: #000;
          border-bottom: 2px dashed #000;
          padding-bottom: 6px;
          letter-spacing: 0.5px;
        }
        .category-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }
        .category-card {
          border: 2px solid #000;
          border-radius: 8px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          background: #fff;
          position: relative;
        }
        .category-card:hover {
          transform: translate(-3px, -3px);
          box-shadow: 4px 4px 0px #000;
        }
        .category-card.selected {
          background: #f3f4f6;
          border-color: #000;
          transform: translate(-3px, -3px);
          box-shadow: 4px 4px 0px #000;
        }
        .category-icon {
          font-size: 24px;
          margin-bottom: 8px;
        }
        .category-label {
          font-weight: 800;
          font-size: 15px;
          margin-bottom: 4px;
          color: #000;
        }
        .category-desc {
          font-size: 12px;
          color: #555;
          line-height: 1.4;
        }
        .check-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          background: #000;
          color: #fff;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justifyContent: center;
          font-size: 12px;
          border: 1px solid #000;
        }
        .tag-pool {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 16px;
        }
        .tag-pill {
          border: 2px solid #000;
          border-radius: 20px;
          padding: 6px 14px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          background: #fff;
          transition: all 0.15s ease;
        }
        .tag-pill:hover {
          background: #f5f5f5;
        }
        .tag-pill.selected {
          background: #000;
          color: #fff;
        }
        .custom-tag-form {
          display: flex;
          gap: 10px;
          max-width: 400px;
          margin-bottom: 40px;
        }
        .custom-tag-input {
          flex: 1;
          padding: 10px 14px;
          border: 2px solid #000;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
          outline: none;
        }
        .custom-tag-btn {
          padding: 10px 16px;
          background: #fff;
          border: 2px solid #000;
          font-weight: 700;
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.15s ease;
        }
        .custom-tag-btn:hover {
          background: #f0f0f0;
        }
        .btn-continue {
          width: 100%;
          padding: 16px;
          background: #000000;
          color: #ffffff;
          border: 2px solid #000000;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 800;
          text-transform: uppercase;
          cursor: pointer;
          display: flex;
          align-items: center;
          justifyContent: center;
          gap: 8px;
          box-shadow: 4px 4px 0px #666;
          transition: all 0.15s ease;
        }
        .btn-continue:hover {
          transform: translate(-3px, -3px);
          box-shadow: 6px 6px 0px #000;
        }
        .btn-continue:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
      `}</style>

      <div className="onboarding-card">
        <h1 className="onboarding-title">Welcome to Southern Waves 🌊</h1>
        <p className="onboarding-subtitle">
          Hello {user?.firstName || user?.name || 'there'}! Let's tailor your experience by configuring your recommendation preferences.
        </p>

        {/* Categories Section */}
        <div>
          <h2 className="section-title">1. Choose Preferred Sections</h2>
          <div className="category-grid">
            {CATEGORIES.map(cat => {
              const isSelected = selectedCats.includes(cat.id);
              return (
                <div 
                  key={cat.id} 
                  className={`category-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleCategory(cat.id)}
                >
                  {isSelected && (
                    <div className="check-badge">
                      <FiCheck size={12} />
                    </div>
                  )}
                  <div className="category-icon">{cat.icon}</div>
                  <div className="category-label">{cat.label}</div>
                  <div className="category-desc">{cat.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tags Section */}
        <div>
          <h2 className="section-title">2. Select Interest Topics</h2>
          <div className="tag-pool">
            {POPULAR_TAGS.map(tag => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  className={`tag-pill ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleTag(tag)}
                >
                  #{tag}
                </button>
              );
            })}
          </div>

          {/* Custom Tag Input */}
          <form onSubmit={handleAddCustomTag} className="custom-tag-form">
            <input
              type="text"
              className="custom-tag-input"
              placeholder="Add another topic (e.g. academic)"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
            />
            <button type="submit" className="custom-tag-btn">
              Add Tag
            </button>
          </form>
        </div>

        {/* Submit */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-continue"
        >
          {saving ? 'Configuring Feed...' : 'Enter Southern Waves'}
          <FiArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default OnboardingPage;
