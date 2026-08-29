import { useState, useEffect, useRef } from 'react';

/**
 * useScrollProgress
 * Tracks normalized scroll progress (0.0 -> 1.0) through a container or window,
 * synchronized with requestAnimationFrame for buttery smooth 60fps performance.
 * 
 * @param {React.RefObject} targetRef - Optional ref for a scroll container. Defaults to document scroll.
 * @param {number} totalDistanceMeters - Total distance route length in meters.
 * @returns {{ progress: number, currentMeters: number, remainingMeters: number }}
 */
export const useScrollProgress = (targetRef = null, totalDistanceMeters = 5600) => {
  const [progress, setProgress] = useState(0);
  const rafIdRef = useRef(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setProgress(0.5);
      return;
    }

    const calculateProgress = () => {
      let currentProgress = 0;

      if (targetRef && targetRef.current) {
        const el = targetRef.current;
        const rect = el.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const totalHeight = rect.height - windowHeight;
        
        if (totalHeight > 0) {
          const scrolled = -rect.top;
          currentProgress = Math.min(Math.max(scrolled / totalHeight, 0), 1);
        }
      } else {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (docHeight > 0) {
          currentProgress = Math.min(Math.max(scrollTop / docHeight, 0), 1);
        }
      }

      setProgress(currentProgress);
    };

    const handleScroll = () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = requestAnimationFrame(calculateProgress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    calculateProgress();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [targetRef]);

  const currentMeters = Math.round(progress * totalDistanceMeters);
  const remainingMeters = Math.max(0, totalDistanceMeters - currentMeters);

  return {
    progress,
    currentMeters,
    remainingMeters,
  };
};

export default useScrollProgress;
