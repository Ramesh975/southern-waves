import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiHash, FiMic, FiHeart, FiCornerUpLeft, FiMessageCircle,
  FiShare2, FiTrendingUp, FiChevronRight, FiZap
} from 'react-icons/fi';
import { articleAPI } from '../services/api';
import { getImgSrc, timeAgo } from './NewsArticleCard';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const RIVALRY_TOPICS = [
  { id: 1, title: 'Education Reform', side1: 'Pro', side2: 'Con', heat: 97 },
  { id: 2, title: 'Campus Politics', side1: 'Left', side2: 'Right', heat: 84 },
  { id: 3, title: 'Exam Culture', side1: 'Needed', side2: 'Outdated', heat: 76 },
  { id: 4, title: 'Tech in Classrooms', side1: 'Yes', side2: 'No', heat: 63 },
];

const SpokenCard = ({ art, onReply, onComment }) => {
  const { user } = useAuth();
  const [likes, setLikes] = useState(art.likes || []);
  const hasLiked = user && likes.includes(user._id);

  const handleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      return toast.error('Please log in to respond to posts');
    }
    try {
      const res = await articleAPI.like(art._id);
      if (res.data?.success) {
        setLikes(res.data.likes);
      }
    } catch (err) {
      toast.error('Failed to register reaction');
    }
  };
  const authorName = art.author?.name || 'Anonymous';
  const avatarUrl = getImgSrc(art.author?.avatar)
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=random&size=36`;

  return (
    <div className="ts-spoken-card">
      <div className="ts-spoken-card-top">
        <img src={avatarUrl} alt={authorName} className="ts-spoken-avatar" />
        <div className="ts-spoken-author-block">
          <span className="ts-spoken-author">{authorName}</span>
          <span className="ts-spoken-time">{timeAgo(art.publishedAt)}</span>
        </div>
        <div className="ts-spoken-tags-inline">
          {art.tags?.slice(0, 2).map(tag => (
            <Link key={tag} to={`/tag/${tag}`} className="ts-spoken-tag">#{tag}</Link>
          ))}
        </div>
      </div>

      <Link to={`/article/${art.slug}`} className="ts-spoken-card-body">
        <p className="ts-spoken-title">{art.title}</p>
        {art.lead && <p className="ts-spoken-desc">{art.lead}</p>}
        {/* News name box from sketch */}
        <div className="ts-spoken-news-box">
          <FiMic size={11} />
          <span>{art.category === 'tea-shop' ? 'Tea Shop' : art.category}</span>
        </div>
      </Link>

      {/* Action bar from sketch: Reply Heart Comment Share */}
      <div className="ts-spoken-actions">
        <button
          className={`ts-spoken-action-btn heart${hasLiked ? ' active' : ''}`}
          onClick={handleLike}
        >
          <FiHeart size={15} />
          <span>{likes.length}</span>
        </button>
        <button className="ts-spoken-action-btn reply" onClick={() => onReply && onReply(art)}>
          <FiCornerUpLeft size={15} />
          <span>Reply</span>
        </button>
        <button className="ts-spoken-action-btn comment" onClick={() => onComment && onComment(art)}>
          <FiMessageCircle size={15} />
          <span>Comment</span>
        </button>
        <button
          className="ts-spoken-action-btn share"
          onClick={() => navigator.share?.({ title: art.title, url: `/article/${art.slug}` })}
        >
          <FiShare2 size={15} />
        </button>
      </div>
    </div>
  );
};

const SpokenTab = ({ articles = [], trendingTags = [], highlightId, onReply, onComment, category }) => {
  const navigate = useNavigate();
  const [activeTag, setActiveTag] = useState(null);
  const [tagArticles, setTagArticles] = useState([]);
  const [loadingTag, setLoadingTag] = useState(false);

  // Dynamic tag count helper
  const getTagCount = (tagName) => {
    const found = (trendingTags || []).find(t => t.tag === tagName);
    if (found) return found.count;
    return (articles || []).filter(a => a.tags?.includes(tagName)).length;
  };

  // Compile list of tags to display, ensuring first-class Tea Shop tags are always present
  const firstClassTags = ['mind', 'spoken', 'ground'];
  const displayTags = [];

  // Add first-class tags first
  firstClassTags.forEach(tag => {
    const count = getTagCount(tag);
    displayTags.push({ tag, count });
  });

  // Append other trending tags from the server
  (trendingTags || []).forEach(t => {
    if (!firstClassTags.includes(t.tag)) {
      displayTags.push(t);
    }
  });

  // filter spoken articles (articles with 'spoken' tag)
  const spokenFeed = articles.filter(a =>
    a.tags?.includes('spoken')
  );
  const displayFeed = spokenFeed.length > 0 ? spokenFeed : articles.filter(a => a.category === 'tea-shop');

  const handleTagClick = async (tag) => {
    if (activeTag === tag) {
      setActiveTag(null);
      setTagArticles([]);
      return;
    }
    setActiveTag(tag);
    setLoadingTag(true);
    try {
      const res = await articleAPI.getAll({ tag, category, limit: 20 });
      setTagArticles(res.data?.data || []);
    } catch {
      setTagArticles([]);
    } finally {
      setLoadingTag(false);
    }
  };

  return (
    <div className="ts-spoken-layout">
      {/* Left: Trending Tags + Spoken Feed */}
      <div className="ts-spoken-main">
        {/* Trending Tags Row from sketch */}
        <div className="ts-spoken-tags-scroll-row">
          <FiHash size={14} className="ts-spoken-tags-icon" />
          <div className="ts-spoken-tags-scroll">
            {displayTags.map(({ tag, count }) => (
              <button
                key={tag}
                className={`ts-spoken-filter-tag${activeTag === tag ? ' active' : ''}`}
                onClick={() => handleTagClick(tag)}
              >
                #{tag}
                <span className="ts-spoken-filter-count">{count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Feed */}
        <div className="ts-spoken-section-head">
          <FiMic size={15} />
          <span>Trending Spoken</span>
        </div>
        <div className="ts-spoken-feed">
          {(activeTag ? tagArticles : displayFeed).map(art => (
            <SpokenCard
              key={art._id}
              art={art}
              onReply={onReply}
              onComment={onComment}
            />
          ))}
          {!loadingTag && (activeTag ? tagArticles : displayFeed).length === 0 && (
            <div className="nm-empty">No spoken posts yet.</div>
          )}
          {loadingTag && <div className="nm-mini-spinner" style={{ margin: '32px auto' }} />}
        </div>
      </div>

      {/* Right: Trending Topics & Tags */}
      <aside className="ts-spoken-sidebar">
        {/* Trending Topics */}
        <div className="ts-sidebar-block">
          <div className="ts-sidebar-head">
            <FiTrendingUp size={14} />
            <span>Trending Topics</span>
          </div>
          <div className="ts-topics-list">
            {['Education', 'Politics', 'Economy', 'Science', 'Culture'].map((topic, i) => (
              <button
                key={topic}
                className="ts-topic-item"
                onClick={() => navigate(`/tag/${topic.toLowerCase()}`)}
              >
                <span className="ts-topic-rank">{i + 1}</span>
                <span className="ts-topic-name">{topic}</span>
                <FiChevronRight size={12} className="ts-topic-arr" />
              </button>
            ))}
          </div>
        </div>

        {/* Trending Tags */}
        <div className="ts-sidebar-block" style={{ marginTop: 16 }}>
          <div className="ts-sidebar-head">
            <FiHash size={14} />
            <span>Trending Tags</span>
          </div>
          <div className="ts-tags-cloud">
            {(trendingTags || []).slice(0, 10).map(({ tag, count }) => (
              <button
                key={tag}
                className="ts-cloud-tag"
                onClick={() => navigate(`/tag/${tag}`)}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        {/* Rivalry Topics from sketch */}
        <div className="ts-sidebar-block ts-rivalry-block" style={{ marginTop: 16 }}>
          <div className="ts-sidebar-head">
            <FiZap size={14} style={{ color: '#ef4444' }} />
            <span>Rivalry Topics</span>
          </div>
          {RIVALRY_TOPICS.map(rt => (
            <div key={rt.id} className="ts-rivalry-item">
              <span className="ts-rivalry-title">{rt.title}</span>
              <div className="ts-rivalry-bar-wrap">
                <div className="ts-rivalry-bar" style={{ width: `${rt.heat}%` }} />
              </div>
              <div className="ts-rivalry-sides">
                <span className="ts-rivalry-s1">{rt.side1}</span>
                <span className="ts-rivalry-s2">{rt.side2}</span>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
};

export default SpokenTab;
