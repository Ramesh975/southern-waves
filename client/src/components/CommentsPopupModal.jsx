import React, { useState, useRef } from 'react';
import { FiX } from 'react-icons/fi';
import { getImgSrc } from './NewsArticleCard';
import ArticleComments from './ArticleComments';

const CommentsPopupModal = ({ article, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);
  const modalRef = useRef(null);

  const handleClose = () => {
    setIsClosing(true);
    // Wait for the absorb close animation to finish (300ms)
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (!article) return null;

  return (
    <div 
      className={`nm-modal-backdrop ${isClosing ? 'closing' : ''}`} 
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div 
        ref={modalRef}
        className={`nm-comments-modal ${isClosing ? 'closing' : ''}`}
      >
        <div className="nm-comments-modal-header">
          <span className="nm-comments-modal-cat">{article.category}</span>
          <button className="nm-comments-modal-close" onClick={handleClose} aria-label="Close modal">
            <FiX size={20} />
          </button>
        </div>

        <div className="nm-comments-modal-body">
          {/* Article preview details */}
          <div className="nm-comments-modal-article-info">
            {article.coverImage && (
              <img
                src={getImgSrc(article.coverImage)}
                alt=""
                className="nm-comments-modal-cover"
              />
            )}
            <div className="nm-comments-modal-article-text">
              <h2 className="nm-comments-modal-title">{article.title}</h2>
              {article.lead && (
                <p className="nm-comments-modal-lead">{article.lead}</p>
              )}
            </div>
          </div>

          <div className="nm-comments-modal-divider" />

          {/* YouTube-style Comments Component (Popup Version) */}
          <ArticleComments
            articleId={article._id}
            articleAuthorId={article.author?._id || article.author}
            isLocked={article.isLocked || article.commentsDisabled}
            isPopup={true}
            title="Discussion"
          />
        </div>
      </div>
    </div>
  );
};

export default CommentsPopupModal;
