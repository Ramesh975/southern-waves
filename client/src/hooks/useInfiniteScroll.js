import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * useInfiniteScroll
 * Robust multi-trigger infinite scroll hook.
 * Uses a callback ref to bind IntersectionObserver the moment the sentinel element mounts,
 * combined with a passive window scroll listener fallback.
 *
 * @param {Object} options
 * @param {Function} options.onLoadMore - Callback to fetch the next batch
 * @param {boolean} options.hasMore - Whether more items are available to fetch
 * @param {boolean} options.isLoading - Whether a batch is currently being fetched
 * @param {string} [options.rootMargin='450px'] - Pre-fetch margin before bottom
 * @param {number} [options.threshold=0] - Intersection threshold
 * @returns {Function} sentinelRef - Callback ref to attach to the sentinel element
 */
export const useInfiniteScroll = ({
  onLoadMore,
  hasMore,
  isLoading,
  rootMargin = '450px',
  threshold = 0,
}) => {
  const [sentinelNode, setSentinelNode] = useState(null);
  const loadingRef = useRef(isLoading);
  const hasMoreRef = useRef(hasMore);
  const onLoadMoreRef = useRef(onLoadMore);

  // Keep refs always up to date
  loadingRef.current = isLoading;
  hasMoreRef.current = hasMore;
  onLoadMoreRef.current = onLoadMore;

  // Callback ref: Called by React whenever the sentinel DOM element attaches or detaches
  const sentinelRef = useCallback((node) => {
    setSentinelNode(node);
  }, []);

  // 1. Primary Trigger: IntersectionObserver on sentinel
  useEffect(() => {
    if (!sentinelNode) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry && entry.isIntersecting && hasMoreRef.current && !loadingRef.current) {
          if (typeof onLoadMoreRef.current === 'function') {
            onLoadMoreRef.current();
          }
        }
      },
      {
        root: null,
        rootMargin,
        threshold,
      }
    );

    observer.observe(sentinelNode);

    return () => {
      observer.disconnect();
    };
  }, [sentinelNode, rootMargin, threshold]);

  // 2. Secondary Trigger: Window scroll event fallback
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (!loadingRef.current && hasMoreRef.current) {
            const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
            const windowHeight = window.innerHeight;
            const docHeight = document.documentElement.scrollHeight;

            // Trigger when within 600px of bottom
            if (windowHeight + scrollY >= docHeight - 600) {
              if (typeof onLoadMoreRef.current === 'function') {
                onLoadMoreRef.current();
              }
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return sentinelRef;
};

export default useInfiniteScroll;
