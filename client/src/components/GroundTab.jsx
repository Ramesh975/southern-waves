import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FiHeart, FiCornerUpLeft, FiMessageCircle, FiShare2,
  FiArrowRight, FiRefreshCw
} from 'react-icons/fi';
import { getImgSrc, timeAgo } from './NewsArticleCard';
import { useAuth } from '../context/AuthContext';
import { articleAPI } from '../services/api';
import toast from 'react-hot-toast';

// Ground = travel on all minds & news/articles from sketch Image 4
// Top gradient, transparent background, scrollable with better animations, comment panel

const GroundCard = ({ art, onReply, onComment, idx }) => {
  const { user } = useAuth();
  const [likes, setLikes] = useState(art.likes || []);
  const hasLiked = user && likes.includes(user._id);
  const [visible, setVisible] = useState(false);

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
  const cardRef = useRef(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (cardRef.current) obs.observe(cardRef.current);
    return () => obs.disconnect();
  }, []);

  const authorName = art.author?.name || 'Anonymous';
  const avatarUrl = getImgSrc(art.author?.avatar)
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=random&size=40`;
  const imgSrc = getImgSrc(art.coverImage);

  return (
    <div
      ref={cardRef}
      className={`ts-ground-card${visible ? ' visible' : ''}`}
      style={{ '--delay': `${idx * 0.06}s` }}
    >
      {/* Top gradient from sketch */}
      <div className="ts-ground-card-fog" />

      {/* Image behind card */}
      {imgSrc && (
        <div
          className="ts-ground-card-bg"
          style={{ backgroundImage: `url(${imgSrc})` }}
        />
      )}

      <div className="ts-ground-card-inner">
        {/* Author */}
        <div className="ts-ground-author-row">
          <img src={avatarUrl} alt={authorName} className="ts-ground-avatar" />
          <div>
            <span className="ts-ground-author">{authorName}</span>
            <span className="ts-ground-time">{timeAgo(art.publishedAt)}</span>
          </div>
          <span className="ts-ground-cat">{art.category}</span>
        </div>

        {/* Article body - image behind description, scrollable */}
        <Link to={`/article/${art.slug}`} className="ts-ground-body">
          <h3 className="ts-ground-title">{art.title}</h3>
          {art.lead && <p className="ts-ground-desc">{art.lead}</p>}
        </Link>

        {/* Actions row from sketch: reply, heart, comment, share */}
        <div className="ts-ground-actions">
          <button
            className={`ts-ground-act${hasLiked ? ' active-heart' : ''}`}
            onClick={handleLike}
          >
            <FiHeart size={15} />
            <span>{likes.length}</span>
          </button>
          <button className="ts-ground-act" onClick={() => onReply && onReply(art)}>
            <FiCornerUpLeft size={15} />
            <span>Reply</span>
          </button>
          <button className="ts-ground-act" onClick={() => onComment && onComment(art)}>
            <FiMessageCircle size={15} />
            <span>Comment</span>
          </button>
          <button
            className="ts-ground-act"
            onClick={() => navigator.share?.({ title: art.title, url: `/article/${art.slug}` })}
          >
            <FiShare2 size={15} />
          </button>
          <Link to={`/article/${art.slug}`} className="ts-ground-act ts-ground-read-link">
            <FiArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
};

const GroundTab = ({ articles, trending, highlightId, onReply, onComment }) => {
  const [feed, setFeed] = useState([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  useEffect(() => {
    // Merge articles + trending, deduplicate
    const combined = [...articles, ...trending].reduce((acc, art) => {
      if (!acc.find(a => a._id === art._id)) acc.push(art);
      return acc;
    }, []);
    const groundFeed = combined.filter(a => a.tags?.includes('ground'));
    setFeed(groundFeed.length > 0 ? groundFeed : combined.filter(a => a.category === 'tea-shop'));
  }, [articles, trending]);

  const paginated = feed.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < feed.length;

  return (
    <div className="ts-ground-layout">
      {/* Hero gradient top from sketch */}
      <div className="ts-ground-hero-grad">
        <div className="ts-ground-hero-text">
          <h2>Ground</h2>
          <p>Travel on all minds & news / articles</p>
        </div>
      </div>

      {/* Board Announcement / Notice Card */}
      <div className="ts-board-notice">
        <div className="ts-board-notice-icon">📢</div>
        <div className="ts-board-notice-content">
          <h4>Official Tea Shop Announcements</h4>
          <p>This feed displays student-run articles, general notices, and open minds. Be mindful of campus guidelines when responding to posts.</p>
        </div>
      </div>

      {/* Feed: transparent background, scrollable */}
      <div className="ts-ground-feed">
        {paginated.map((art, idx) => (
          <GroundCard
            key={art._id}
            art={art}
            idx={idx}
            onReply={onReply}
            onComment={onComment}
          />
        ))}

        {feed.length === 0 && (
          <div className="nm-empty">No articles on the ground yet.</div>
        )}

        {hasMore && (
          <button className="ts-ground-load-more" onClick={() => setPage(p => p + 1)}>
            <FiRefreshCw size={15} />
            Load More
          </button>
        )}
      </div>
    </div>
  );
};

export default GroundTab;
