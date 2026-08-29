import React, { useMemo } from 'react';

/**
 * HighwayBackground
 * Full-bleed converging perspective wireframe highway grid with vanishing point at ~62% horizon.
 * Blends the road trapezoid directly into the ground grid with seamless linear-gradient fade,
 * dashed highway striping, and live theme/accent synchronization.
 * 
 * @param {number} progress - Normalized scroll journey progress (0.0 -> 1.0)
 * @param {string} accent - Active accent color key or hex
 * @param {string} mode - Active theme mode ('light', 'dark', 'black')
 */
const HighwayBackground = ({ progress = 0, accent = 'blue', mode = 'dark' }) => {
  const HORIZON_Y = 62; // Vanishing point at 62% down viewport
  const RUNG_COUNT = 14;
  const LANE_COUNT = 12;

  // Dynamic transversal depth rungs with forward parallax drift
  const rungs = useMemo(() => {
    const drift = (progress * 8) % 1;
    const items = [];

    for (let i = 0; i < RUNG_COUNT; i++) {
      const normalized = Math.min(Math.max((i + drift) / RUNG_COUNT, 0), 1);
      const curve = Math.pow(normalized, 2.3);
      const y = HORIZON_Y + curve * (100 - HORIZON_Y);
      const opacity = Math.min(Math.max(curve * 0.85, 0.06), 0.8);
      const strokeWidth = 0.8 + curve * 2.2;

      items.push({ id: i, y, opacity, strokeWidth });
    }
    return items;
  }, [progress]);

  // Converging perspective ground lane lines
  const lanes = useMemo(() => {
    const lines = [];
    const centerX = 50;
    const centerY = HORIZON_Y;

    for (let i = 0; i <= LANE_COUNT; i++) {
      const bottomX = (i / LANE_COUNT) * 100;
      const distFromCenter = Math.abs(bottomX - 50);
      const isRoadBoundary = Math.abs(bottomX - 32) < 2 || Math.abs(bottomX - 68) < 2;

      lines.push({
        id: `lane-${i}`,
        x1: centerX,
        y1: centerY,
        x2: bottomX,
        y2: 100,
        isRoadBoundary,
        opacity: isRoadBoundary ? 0.9 : distFromCenter < 18 ? 0.35 : 0.22,
        strokeWidth: isRoadBoundary ? 2.2 : 1.0,
      });
    }
    return lines;
  }, []);

  // Position of location traveler marker along the perspective axis
  const markerY = HORIZON_Y + Math.pow(progress, 1.8) * (94 - HORIZON_Y);
  const markerScale = 0.6 + progress * 0.6;

  // Center dash offset based on scroll progress for moving highway effect
  const dashOffset = (progress * 50) % 10;

  return (
    <div
      className="highway-bg-canvas"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    >
      {/* Sky & Horizon Gradient Mesh */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            mode === 'light'
              ? `radial-gradient(ellipse at 50% ${HORIZON_Y}%, color-mix(in srgb, var(--accent-color) 16%, #f8fafc) 0%, #f1f5f9 55%, #e2e8f0 100%)`
              : mode === 'black'
              ? `radial-gradient(ellipse at 50% ${HORIZON_Y}%, color-mix(in srgb, var(--accent-color) 20%, #000000) 0%, #000000 65%, #000000 100%)`
              : `radial-gradient(ellipse at 50% ${HORIZON_Y}%, color-mix(in srgb, var(--accent-color) 18%, #09090b) 0%, #09090b 65%, #030304 100%)`,
          transition: 'background 0.3s ease',
        }}
      />

      {/* SVG Perspective Grid & Integrated Highway Road */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: mode === 'light' ? 0.8 : 0.95,
        }}
      >
        <defs>
          {/* Horizon Glow Beam */}
          <linearGradient id="horizonGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent-color)" stopOpacity="0" />
            <stop offset="35%" stopColor="var(--accent-color)" stopOpacity="0.3" />
            <stop offset="50%" stopColor="var(--accent-color)" stopOpacity="1" />
            <stop offset="65%" stopColor="var(--accent-color)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--accent-color)" stopOpacity="0" />
          </linearGradient>

          {/* Road Surface Gradient & Horizon Fade Mask */}
          <linearGradient id="roadSurface" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={mode === 'light' ? '#e2e8f0' : '#08080a'} stopOpacity="0" />
            <stop offset="25%" stopColor={mode === 'light' ? '#cbd5e1' : '#0c0c10'} stopOpacity="0.6" />
            <stop offset="100%" stopColor={mode === 'light' ? '#94a3b8' : '#121216'} stopOpacity="0.9" />
          </linearGradient>

          {/* Road Edge Beam Gradient */}
          <linearGradient id="roadEdgeGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-color)" stopOpacity="0.1" />
            <stop offset="40%" stopColor="var(--accent-color)" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
          </linearGradient>

          <filter id="highwayGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── 1. PERSPECTIVE ROAD TRAPEZOID SURFACE (Blended into Ground) ── */}
        <polygon
          points={`48,${HORIZON_Y} 52,${HORIZON_Y} 68,100 32,100`}
          fill="url(#roadSurface)"
        />

        {/* ── 2. CONVERGING GROUND GRID LINES ── */}
        {lanes.map((lane) => (
          <line
            key={lane.id}
            x1={lane.x1}
            y1={lane.y1}
            x2={lane.x2}
            y2={lane.y2}
            stroke={lane.isRoadBoundary ? 'url(#roadEdgeGlow)' : 'var(--accent-color)'}
            strokeWidth={lane.strokeWidth * 0.22}
            opacity={lane.opacity}
          />
        ))}

        {/* ── 3. TRANSVERSAL DEPTH RUNGS (Grid Lines Crossing Road) ── */}
        {rungs.map((rung) => (
          <line
            key={rung.id}
            x1="0"
            y1={rung.y}
            x2="100"
            y2={rung.y}
            stroke="var(--accent-color)"
            strokeWidth={rung.strokeWidth * 0.18}
            opacity={rung.opacity}
          />
        ))}

        {/* ── 4. WHITE DASHED CENTER HIGHWAY STRIPING ── */}
        <line
          x1="50"
          y1={HORIZON_Y}
          x2="50"
          y2="100"
          stroke="#ffffff"
          strokeWidth="0.65"
          strokeDasharray="1.8 1.6"
          strokeDashoffset={dashOffset}
          opacity="0.95"
          filter="url(#highwayGlow)"
        />

        {/* ── 5. HORIZON GLOW BEAM ── */}
        <line
          x1="0"
          y1={HORIZON_Y}
          x2="100"
          y2={HORIZON_Y}
          stroke="url(#horizonGlow)"
          strokeWidth="1.0"
          filter="url(#highwayGlow)"
        />

        {/* ── 6. ACTIVE JOURNEY TRAVELER BEACON ON ROAD AXIS ── */}
        <g
          transform={`translate(50, ${markerY}) scale(${markerScale})`}
          filter="url(#highwayGlow)"
        >
          {/* Outer Pulsing Aura Ring */}
          <circle
            cx="0"
            cy="0"
            r="3.2"
            fill="none"
            stroke="var(--accent-color)"
            strokeWidth="0.6"
            opacity="0.85"
          />
          {/* Inner Glowing Traveler Dot */}
          <circle cx="0" cy="0" r="1.6" fill="#ffffff" />
          <circle cx="0" cy="0" r="0.9" fill="var(--accent-color)" />
        </g>
      </svg>

      {/* Horizon Ambient Lighting */}
      <div
        style={{
          position: 'absolute',
          top: `${HORIZON_Y - 3}%`,
          left: 0,
          right: 0,
          height: '6%',
          background: 'linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--accent-color) 16%, transparent) 50%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

export default HighwayBackground;
