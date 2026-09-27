import React from 'react';
import { FiLoader, FiArrowDown, FiCheckCircle } from 'react-icons/fi';
import './InfiniteScrollFooter.css';

export const InfiniteScrollFooter = ({
  isLoading,
  hasMore,
  count = 0,
  sentinelRef,
  onLoadMore,
  endMessage,
}) => {
  return (
    <div className="infinite-scroll-footer-container">
      {/* Sentinel element observed by IntersectionObserver (positioned above for seamless pre-fetching) */}
      <div ref={sentinelRef} className="infinite-scroll-sentinel" />

      {/* Loading state: Animated spinning icon */}
      {isLoading && (
        <div className="infinite-scroll-loading-badge" role="status" aria-live="polite">
          <FiLoader className="infinite-scroll-spinner" size={18} />
          <span>Loading more stories...</span>
        </div>
      )}

      {/* Idle state with more items available: Button with load icon fallback */}
      {!isLoading && hasMore && (
        <button
          type="button"
          className="infinite-scroll-load-more-btn"
          onClick={() => {
            if (typeof onLoadMore === 'function') {
              onLoadMore();
            }
          }}
          title="Scroll down or click to load more stories"
        >
          <FiArrowDown className="infinite-scroll-down-icon" size={16} />
          <span>Load More Stories</span>
        </button>
      )}

      {/* End of feed state */}
      {!hasMore && count > 0 && (
        <div className="infinite-scroll-end-badge">
          <FiCheckCircle size={16} className="infinite-scroll-check-icon" />
          <span>{endMessage || `You're all caught up! (${count} articles loaded)`}</span>
        </div>
      )}
    </div>
  );
};

export default InfiniteScrollFooter;
