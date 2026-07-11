import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { articleAPI } from '../services/api';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { FiHash } from 'react-icons/fi';
import toast from 'react-hot-toast';
import HomeTab from '../components/HomeTab';
import TrendTab from '../components/TrendTab';
import RecentTab from '../components/RecentTab';
import SpokenTab from '../components/SpokenTab';
import GroundTab from '../components/GroundTab';
import ForYouTab from '../components/ForYouTab';
import CommentsPopupModal from '../components/CommentsPopupModal';
import BottomNavPill from '../components/BottomNavPill';
import './NewsMenu.css';
const NewsMenuPage = ({ defaultCategory = 'news' }) => {
  const { tag } = useParams() || {};
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const isTeaShop = defaultCategory === 'tea-shop';

  const tabs = isTeaShop
    ? [
        { id: 'home',   label: 'Mind'   },
        { id: 'trend',  label: 'Trend'  },
        { id: 'recent', label: 'Recent' },
        { id: 'foryou', label: 'For You' },
        { id: 'spoken', label: 'Spoken' },
        { id: 'ground', label: 'Ground' },
      ]
    : [
        { id: 'home',   label: 'Home'   },
        { id: 'trend',  label: 'Trend'  },
        { id: 'recent', label: 'Recent' },
        { id: 'foryou', label: 'For You' },
      ];

  const {
    openRoom,
    setIsOpen,
    replyToArticle,
    setReplyToArticle,
    highlightArticleId,
    setHighlightArticleId,
  } = useChat();

  // Derive activeTab from URL query parameters (Single Source of Truth)
  const activeTab = (searchParams.get('tab') === 'spoken' && isTeaShop) ? 'spoken'
    : (searchParams.get('tab') === 'ground' && isTeaShop) ? 'ground'
    : searchParams.get('foryou') === 'true' ? 'foryou'
    : searchParams.get('trending') === 'true' ? 'trend'
    : searchParams.get('recent') === 'true' ? 'recent'
    : 'home';

  const setActiveTab = useCallback((tabId) => {
    const params = new URLSearchParams();
    if (tabId === 'trend')  params.set('trending', 'true');
    if (tabId === 'recent') params.set('recent', 'true');
    if (tabId === 'foryou') params.set('foryou', 'true');
    if (tabId === 'spoken' && isTeaShop) params.set('tab', 'spoken');
    if (tabId === 'ground' && isTeaShop) params.set('tab', 'ground');
    const newSearch = params.toString() ? `?${params.toString()}` : '';
    navigate(`${location.pathname}${newSearch}`, { replace: true });
  }, [location.pathname, navigate, isTeaShop]);

  const [articles, setArticles] = useState([]);
  const [trending, setTrending] = useState([]);
  const [trendingTags, setTrendingTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCommentArticle, setActiveCommentArticle] = useState(null);
  const pageRef = useRef(null);

  // Fetch all article data
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const params = {};
        if (tag) params.tag = tag;
        else params.category = defaultCategory;

        const [artRes, trendRes, tagsRes] = await Promise.all([
          articleAPI.getAll({ ...params, limit: 20 }),
          articleAPI.getTrending({ category: defaultCategory }),
          articleAPI.getTrendingTags({ category: defaultCategory }),
        ]);
        setArticles(artRes.data?.data || []);
        setTrending(trendRes.data?.data || []);
        setTrendingTags(tagsRes.data?.data || []);
      } catch (e) {
        console.error('NewsMenuPage fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [tag, defaultCategory]);

  // Handle reply-to-article → open chat drawer
  const handleReply = useCallback((article) => {
    if (!user) {
      toast.error('Please login to discuss in chat');
      return;
    }
    const roomName = article.category === 'kyp' ? 'know-your-past' : (article.category || 'news');
    setReplyToArticle(article);
    openRoom('group', roomName);
    setIsOpen(true);
  }, [user, openRoom, setIsOpen, setReplyToArticle]);

  // Handle highlight from chat article badge click
  useEffect(() => {
    if (!highlightArticleId) return;
    const timeout = setTimeout(() => setHighlightArticleId(null), 3500);
    return () => clearTimeout(timeout);
  }, [highlightArticleId, setHighlightArticleId]);

  const pageTitle = tag
    ? `#${tag}`
    : defaultCategory === 'editorial' ? 'Editorial'
    : defaultCategory === 'features' ? 'Features'
    : defaultCategory === 'kyp' ? 'Know Our Past'
    : defaultCategory === 'tea-shop' ? 'Tea Shop'
    : 'News';

  const handlePublishSuccess = (newArticle) => {
    if (newArticle.category === defaultCategory) {
      setArticles(prev => [newArticle, ...prev]);
    }
  };

  return (
    <main className={`nm-page ${isTeaShop ? 'nm-teashop-page' : ''}`} ref={pageRef}>
      {/* Page Header */}
      <div className="nm-page-header">
        <div className="nm-page-header-inner">
          <div className="nm-page-title-block">
            <h1 className="nm-page-title">
              {tag ? <><FiHash size={22} />{tag}</> : pageTitle}
            </h1>
            <p className="nm-page-subtitle">
              {tag
                ? `Articles tagged with #${tag}`
                : defaultCategory === 'tea-shop'
                   ? 'Students spoken by Future'
                   : 'Student-powered media coverage'}
            </p>
          </div>
          {/* Tab Switcher (desktop) */}
          <div className="nm-tab-switcher">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`nm-tab-btn${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="nm-content">
        {loading ? (
          <div className="nm-loading">
            <div className="nm-spinner-ring" />
            <span>Loading stories...</span>
          </div>
        ) : (
          <div className={`nm-tab-content nm-tab-${activeTab}`}>
            {activeTab === 'home' && (
              <HomeTab
                articles={articles}
                trending={trending}
                highlightId={highlightArticleId}
                onReply={handleReply}
                onComment={setActiveCommentArticle}
                onTabSwitch={setActiveTab}
                category={defaultCategory}
              />
            )}
            {activeTab === 'trend' && (
              <TrendTab
                articles={articles}
                trending={trending}
                trendingTags={trendingTags}
                highlightId={highlightArticleId}
                onReply={handleReply}
                onComment={setActiveCommentArticle}
              />
            )}
            {activeTab === 'recent' && (
              <RecentTab
                articles={articles}
                highlightId={highlightArticleId}
                onReply={handleReply}
                onComment={setActiveCommentArticle}
              />
            )}
            {activeTab === 'foryou' && (
              <ForYouTab
                highlightId={highlightArticleId}
                onReply={handleReply}
                onComment={setActiveCommentArticle}
              />
            )}
            {activeTab === 'spoken' && isTeaShop && (
              <SpokenTab
                articles={articles}
                trendingTags={trendingTags}
                highlightId={highlightArticleId}
                onReply={handleReply}
                onComment={setActiveCommentArticle}
                category={defaultCategory}
              />
            )}
            {activeTab === 'ground' && isTeaShop && (
              <GroundTab
                articles={articles}
                trending={trending}
                highlightId={highlightArticleId}
                onReply={handleReply}
                onComment={setActiveCommentArticle}
                category={defaultCategory}
              />
            )}
          </div>
        )}
      </div>

      {/* Standardized Bottom Dock Pill */}
      <BottomNavPill
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        category={defaultCategory}
        onPublishSuccess={handlePublishSuccess}
      />

      {/* Comments Popup Modal */}
      {activeCommentArticle && (
        <CommentsPopupModal
          article={activeCommentArticle}
          onClose={() => setActiveCommentArticle(null)}
        />
      )}
    </main>
  );
};

export default NewsMenuPage;
