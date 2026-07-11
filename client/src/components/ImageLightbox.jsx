import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * ImageLightbox — Full-screen image viewer with zoom, pinch-to-zoom, drag, and ESC dismiss.
 * Props: src, alt, onClose
 */
const ImageLightbox = ({ src, alt = '', onClose }) => {
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const overlayRef = useRef(null);
  const lastPinchDistRef = useRef(null);
  const lastScaleRef = useRef(1);

  const resetTransform = useCallback(() => {
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
    lastScaleRef.current = 1;
  }, []);

  const zoomIn = useCallback(() => setScale(s => Math.min(s * 1.4, 8)), []);
  const zoomOut = useCallback(() => {
    setScale(s => {
      const next = Math.max(s / 1.4, 1);
      if (next === 1) { setTranslateX(0); setTranslateY(0); }
      return next;
    });
  }, []);

  // Keyboard support
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') zoomIn();
      if (e.key === '-') zoomOut();
      if (e.key === '0') resetTransform();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose, resetTransform, zoomIn, zoomOut]);

  // Scroll wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  };

  // Mouse drag (when zoomed)
  const handleMouseDown = (e) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - translateX, y: e.clientY - translateY });
  };
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setTranslateX(e.clientX - dragStart.x);
    setTranslateY(e.clientY - dragStart.y);
  };
  const handleMouseUp = () => setIsDragging(false);

  // Touch pinch zoom + drag
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDistRef.current = Math.sqrt(dx * dx + dy * dy);
      lastScaleRef.current = scale;
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - translateX, y: e.touches[0].clientY - translateY });
    }
  };
  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && lastPinchDistRef.current !== null) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const newScale = Math.min(Math.max(lastScaleRef.current * (dist / lastPinchDistRef.current), 1), 8);
      setScale(newScale);
      if (newScale === 1) { setTranslateX(0); setTranslateY(0); }
    } else if (e.touches.length === 1 && isDragging) {
      setTranslateX(e.touches[0].clientX - dragStart.x);
      setTranslateY(e.touches[0].clientY - dragStart.y);
    }
  };
  const handleTouchEnd = () => { lastPinchDistRef.current = null; setIsDragging(false); };

  // Click outside to close
  const handleOverlayClick = (e) => { if (e.target === overlayRef.current) onClose(); };

  const controlBtn = {
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    width: 40,
    height: 40,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: 18,
    fontWeight: 700,
    backdropFilter: 'blur(8px)',
    transition: 'background 0.15s',
    flexShrink: 0,
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      onWheel={handleWheel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0,0,0,0.93)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'lightboxFadeIn 0.2s ease forwards',
      }}
    >
      {/* Controls */}
      <div style={{
        position: 'fixed',
        top: 14,
        right: 14,
        display: 'flex',
        gap: 8,
        zIndex: 100001,
        alignItems: 'center',
      }}>
        <button
          onClick={(e) => { e.stopPropagation(); zoomOut(); }}
          title="Zoom out (−)"
          style={controlBtn}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
        >−</button>

        <span style={{
          background: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff',
          fontSize: 11,
          fontWeight: 800,
          borderRadius: 8,
          padding: '0 14px',
          height: 40,
          display: 'flex',
          alignItems: 'center',
          minWidth: 56,
          justifyContent: 'center',
          letterSpacing: 0.5,
          backdropFilter: 'blur(8px)',
        }}>
          {Math.round(scale * 100)}%
        </span>

        <button
          onClick={(e) => { e.stopPropagation(); zoomIn(); }}
          title="Zoom in (+)"
          style={controlBtn}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
        >+</button>

        <button
          onClick={(e) => { e.stopPropagation(); resetTransform(); }}
          title="Reset zoom (0)"
          style={{ ...controlBtn, fontSize: 10, fontWeight: 900, letterSpacing: 0.5, width: 'auto', paddingInline: 12 }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
        >1:1</button>

        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          title="Close (ESC)"
          style={{ ...controlBtn, background: 'rgba(200,16,46,0.8)', border: '1px solid rgba(200,16,46,0.6)', width: 'auto', paddingInline: 16, fontSize: 13, gap: 6 }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(200,16,46,1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(200,16,46,0.8)'}
        >
          ✕ Close
        </button>
      </div>

      {/* Hint text */}
      <div style={{
        position: 'fixed',
        bottom: 18,
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.35)',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.5,
        textAlign: 'center',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}>
        Scroll or pinch to zoom · Drag when zoomed · ESC to close
      </div>

      {/* Image */}
      <img
        src={src}
        alt={alt}
        style={{
          maxWidth: '90vw',
          maxHeight: '85vh',
          objectFit: 'contain',
          borderRadius: 8,
          boxShadow: '0 32px 96px rgba(0,0,0,0.7)',
          transform: scale > 1
            ? `scale(${scale}) translate(${translateX / scale}px, ${translateY / scale}px)`
            : 'scale(1)',
          transition: isDragging ? 'none' : 'transform 0.2s ease, opacity 0.3s ease',
          cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          opacity: isLoaded ? 1 : 0,
          display: 'block',
        }}
        onLoad={() => setIsLoaded(true)}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        draggable={false}
      />

      {/* Loading indicator */}
      {!isLoaded && (
        <div style={{
          position: 'absolute',
          color: 'rgba(255,255,255,0.5)',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}>
          Loading image…
        </div>
      )}
    </div>
  );
};

export default ImageLightbox;

