import React, { useState, useRef, useEffect, useCallback } from 'react';
import { toast, resolveValue } from 'react-hot-toast';
import './LiquidGlassToast.css';

/**
 * Liquid Glass Toast UI Component
 * Features:
 * - Option A visual layout (circular icon, bold title, description, progress bar)
 * - Fluid water effect physics (absorb entrance, water shake cancel/dismiss)
 * - Mobile-friendly swipe-to-dismiss gesture with spring tension rebound
 * - Light & Dark theme frosted glassmorphism
 */
const LiquidGlassToast = ({ toast: t }) => {
  const [isShaking, setIsShaking] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startTimeRef = useRef(0);
  const cardRef = useRef(null);

  // Extract content
  const resolvedContent = resolveValue(t.message, t);

  // Determine type & config
  let toastType = t.type || 'blank';
  let defaultTitle = 'Information';
  let accentColor = 'var(--liquid-toast-info)';
  let glowColor = 'var(--liquid-toast-info-glow)';

  // Check if content indicates warning
  if (
    toastType === 'blank' &&
    typeof resolvedContent === 'string' &&
    (resolvedContent.includes('⚠️') || resolvedContent.toLowerCase().includes('warning'))
  ) {
    toastType = 'warning';
  }

  switch (toastType) {
    case 'success':
      defaultTitle = 'Success';
      accentColor = 'var(--liquid-toast-success)';
      glowColor = 'var(--liquid-toast-success-glow)';
      break;
    case 'error':
      defaultTitle = 'Error';
      accentColor = 'var(--liquid-toast-error)';
      glowColor = 'var(--liquid-toast-error-glow)';
      break;
    case 'warning':
      defaultTitle = 'Warning';
      accentColor = 'var(--liquid-toast-warning)';
      glowColor = 'var(--liquid-toast-warning-glow)';
      break;
    case 'loading':
      defaultTitle = 'Please Wait';
      accentColor = 'var(--liquid-toast-loading)';
      glowColor = 'var(--liquid-toast-loading-glow)';
      break;
    default:
      defaultTitle = 'Notice';
      accentColor = 'var(--liquid-toast-info)';
      glowColor = 'var(--liquid-toast-info-glow)';
      break;
  }

  // Parse Title and Description
  let title = t.title || '';
  let description = '';

  if (typeof resolvedContent === 'object' && resolvedContent !== null) {
    title = resolvedContent.title || title || defaultTitle;
    description = resolvedContent.description || resolvedContent.message || '';
  } else if (typeof resolvedContent === 'string') {
    let cleanText = resolvedContent.trim();
    // Clean leading emojis
    cleanText = cleanText.replace(/^[⚠️🚨📢💡ℹ️✅❌]\s*/, '');

    if (cleanText.includes('\n')) {
      const parts = cleanText.split('\n');
      title = title || parts[0];
      description = parts.slice(1).join(' ');
    } else if (cleanText.includes(': ') && !cleanText.startsWith('http')) {
      const parts = cleanText.split(': ');
      title = title || parts[0];
      description = parts.slice(1).join(': ');
    } else {
      title = title || defaultTitle;
      description = cleanText;
    }
  } else {
    title = title || defaultTitle;
    description = String(resolvedContent || '');
  }

  // Handle water shake dismiss
  const handleCancelShake = useCallback((e) => {
    if (e) e.stopPropagation();
    if (isShaking) return;
    setIsShaking(true);
    setTimeout(() => {
      toast.dismiss(t.id);
    }, 360);
  }, [isShaking, t.id]);

  // Handle Swipe Gesture (Mobile & Desktop Pointer)
  const handlePointerDown = (e) => {
    if (isShaking) return;
    setIsDragging(true);
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    startTimeRef.current = Date.now();
    if (e.target.setPointerCapture) {
      try {
        e.target.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const diffX = e.clientX - startXRef.current;
    const diffY = e.clientY - startYRef.current;

    // Favor horizontal swipe
    if (Math.abs(diffX) > Math.abs(diffY)) {
      setDragX(diffX);
    }
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);

    const timeElapsed = Date.now() - startTimeRef.current;
    const velocity = Math.abs(dragX) / (timeElapsed || 1);

    // If dragged beyond threshold (75px) or flicked with velocity
    if (Math.abs(dragX) > 75 || velocity > 0.42) {
      // Swiped away — animate in direction of swipe then dismiss
      const exitTarget = dragX > 0 ? 380 : -380;
      setDragX(exitTarget);
      setTimeout(() => {
        toast.dismiss(t.id);
      }, 200);
    } else {
      // Spring back like surface tension / water elasticity
      setDragX(0);
    }
  };

  const handlePointerCancel = () => {
    setIsDragging(false);
    setDragX(0);
  };

  // Duration for progress bar
  const duration = typeof t.duration === 'number' && t.duration > 0 ? t.duration : 3500;
  const showProgress = toastType !== 'loading' && duration < 60000;

  // Render Icon according to Option A
  const renderIcon = () => {
    if (toastType === 'success') {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    }
    if (toastType === 'error') {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
    }
    if (toastType === 'warning') {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    }
    if (toastType === 'loading') {
      return (
        <svg className="liquid-toast-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      );
    }
    // Info / Notice
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    );
  };

  // Dynamic drag transform
  const dragStyle = isDragging
    ? {
        transform: `translate3d(${dragX}px, 0, 0) rotate(${dragX * 0.04}deg) scale(${1 - Math.min(Math.abs(dragX) * 0.0006, 0.15)})`,
        opacity: Math.max(0.15, 1 - Math.min(Math.abs(dragX) / 220, 0.7)),
        transition: 'none',
      }
    : dragX !== 0
    ? {
        transform: `translate3d(${dragX}px, 0, 0) rotate(${dragX * 0.04}deg)`,
        opacity: Math.abs(dragX) > 200 ? 0 : 1,
        transition: 'transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease',
      }
    : {
        transform: 'translate3d(0, 0, 0)',
        opacity: 1,
        transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
      };

  return (
    <div
      className="liquid-toast-wrapper"
      style={{
        '--toast-accent': accentColor,
        '--toast-glow': glowColor,
        ...dragStyle,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <div
        ref={cardRef}
        className={`liquid-toast-card ${
          isShaking || !t.visible ? 'liquid-toast-shake-dismiss' : 'liquid-toast-absorb'
        }`}
      >
        {/* Specular Light Wave Sheen */}
        <div className="liquid-toast-sheen" />

        {/* Content Row */}
        <div className="liquid-toast-main-row">
          {/* Circular Water Bubble Icon */}
          <div className="liquid-toast-icon-bubble">
            {renderIcon()}
          </div>

          {/* Proper Description & Title */}
          <div className="liquid-toast-text-box">
            <span className="liquid-toast-title">{title}</span>
            {description && <span className="liquid-toast-desc">{description}</span>}
          </div>

          {/* Cancel Close Button with Water Ripple */}
          <button
            type="button"
            className="liquid-toast-close-btn"
            onClick={handleCancelShake}
            aria-label="Dismiss toast"
            title="Dismiss"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Option A Bottom Liquid Progress Bar */}
        {showProgress && (
          <div className="liquid-toast-progress-track">
            <div
              className="liquid-toast-progress-bar"
              style={{
                animationDuration: `${duration}ms`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default LiquidGlassToast;
