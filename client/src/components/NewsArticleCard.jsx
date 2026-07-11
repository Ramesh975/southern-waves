import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { FiHeart, FiCornerUpLeft, FiMessageCircle, FiShare2 } from 'react-icons/fi';
import { articleAPI } from '../services/api';
import toast from 'react-hot-toast';

const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:5000';

const getImgSrc = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${SOCKET_URL}${path}`;
};

const timeAgo = (date) => {
  if (!date) return '';
  try { return formatDistanceToNow(new Date(date), { addSuffix: true }); } catch { return ''; }
};

const NewsArticleCard = ({ article, onReply, onComment, highlight }) => {
  const cardRef = React.useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [likes, setLikes] = useState(article.likes || []);
  const hasLiked = user && likes.includes(user._id);

  const handleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      return toast.error('Please log in to respond to posts');
    }
    try {
      const res = await articleAPI.like(article._id);
      if (res.data?.success) {
        setLikes(res.data.likes);
      }
    } catch (err) {
      toast.error('Failed to register reaction');
    }
  };

  React.useEffect(() => {
    if (highlight && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      cardRef.current.classList.add('article-highlight-pulse');
      const t = setTimeout(() => {
        cardRef.current?.classList.remove('article-highlight-pulse');
      }, 2800);
      return () => clearTimeout(t);
    }
  }, [highlight]);

  const handleReply = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onReply(article);
  };

  const handleCommentClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onComment(article);
  };

  return (
    <article
      ref={cardRef}
      className={`nm-article-card${highlight ? ' article-highlight-pulse' : ''}`}
      data-article-id={article._id}
    >
      <Link to={`/article/${article.slug}`} className="nm-card-link">
        {article.coverImage && (
          <div className="nm-card-thumb">
            <img src={getImgSrc(article.coverImage)} alt={article.title} loading="lazy" />
            {article.isBreaking && <span className="nm-badge breaking">⚡ Breaking</span>}
            {article.isFeatured && !article.isBreaking && <span className="nm-badge featured">★ Featured</span>}
          </div>
        )}
        <div className="nm-card-body">
          <div className="nm-card-meta-top">
            <span className="nm-card-category">{article.category}</span>
            <span className="nm-card-date">{timeAgo(article.publishedAt)}</span>
          </div>
          <h3 className="nm-card-title">{article.title}</h3>
          <p className="nm-card-lead">{article.lead}</p>
          <div className="nm-card-author">
            <img
              src={getImgSrc(article.author?.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(article.author?.name || 'A')}&size=24&background=random`}
              alt={article.author?.name}
              className="nm-card-author-avatar"
            />
            <span>By {article.author?.name}</span>
          </div>
        </div>
      </Link>
      <div className="nm-card-actions">
        <button className={`nm-action-btn hype${hasLiked ? ' active' : ''}`} onClick={handleLike}>
          <FiHeart size={15} />
          <span>{likes.length}</span>
        </button>
        <button className="nm-action-btn reply" onClick={handleReply}>
          <FiCornerUpLeft size={15} />
          <span>Reply</span>
        </button>
        <button className="nm-action-btn comment" onClick={handleCommentClick}>
          <FiMessageCircle size={15} />
          <span>Comment</span>
        </button>
        <button className="nm-action-btn share" onClick={() => {
          navigator.share?.({ title: article.title, url: `/article/${article.slug}` });
        }}>
          <FiShare2 size={15} />
        </button>
      </div>
      {article.tags?.length > 0 && (
        <div className="nm-card-tags">
          {article.tags.slice(0, 3).map(tag => (
            <Link key={tag} to={`/tag/${tag}`} className="nm-tag-chip">#{tag}</Link>
          ))}
        </div>
      )}
    </article>
  );
};

export default NewsArticleCard;
export { getImgSrc, timeAgo };
