import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FiEye, FiHeart, FiMessageSquare, FiBookOpen, FiTrendingUp,
  FiCalendar, FiAward, FiBarChart2, FiLayers, FiArrowUpRight,
  FiZap, FiActivity
} from 'react-icons/fi';
import { getCategoryLabel } from './ArticleComponents';

// Category color mappings matching Southern Waves theme
const CATEGORY_COLORS = {
  'news': '#0055a4',
  'editorial': '#f59e0b',
  'features': '#8b5cf6',
  'university-row': '#10b981',
  'kyp': '#3b82f6',
  'tea-shop': '#ec4899',
  'pictures-speak': '#f43f5e',
  'other': '#64748b'
};

const METRIC_CONFIG = {
  views: {
    label: 'Story Reads & Impressions',
    shortLabel: 'Views',
    icon: FiEye,
    stroke: '#38bdf8',
    gradientId: 'viewsGrad',
    glowColor: 'rgba(56, 189, 248, 0.45)',
    unit: 'reads',
  },
  likes: {
    label: 'Reader Hypes & Likes',
    shortLabel: 'Hypes',
    icon: FiHeart,
    stroke: '#f87171',
    gradientId: 'likesGrad',
    glowColor: 'rgba(248, 113, 113, 0.45)',
    unit: 'hypes',
  },
  comments: {
    label: 'Responses & Discussions',
    shortLabel: 'Responses',
    icon: FiMessageSquare,
    stroke: '#34d399',
    gradientId: 'commentsGrad',
    glowColor: 'rgba(52, 211, 153, 0.45)',
    unit: 'replies',
  },
  storiesPublished: {
    label: 'Stories Published',
    shortLabel: 'Published',
    icon: FiBookOpen,
    stroke: '#a78bfa',
    gradientId: 'storiesGrad',
    glowColor: 'rgba(167, 139, 250, 0.45)',
    unit: 'stories',
  },
};

/**
 * High-Level Interactive Visual Analytics Graph
 */
const AuthorAnalyticsGraph = ({
  analytics = {},
  stats = {},
  authorName = 'Author',
  onSelectCategory,
  onOpenCreate
}) => {
  const [activeMetric, setActiveMetric] = useState('views');
  const [timeRange, setTimeRange] = useState('30d'); // '7d', '30d', 'all'
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [hoverCoords, setHoverCoords] = useState(null);

  const rawTimeline = useMemo(() => analytics.timeline || [], [analytics.timeline]);
  const categoryDistribution = useMemo(() => analytics.categoryDistribution || [], [analytics.categoryDistribution]);
  const topArticles = useMemo(() => analytics.topArticles || [], [analytics.topArticles]);

  // Filter timeline according to selected timeframe
  const filteredTimeline = useMemo(() => {
    if (!rawTimeline.length) {
      // Fallback 14 simulated points if timeline is empty
      const points = [];
      const now = new Date();
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        points.push({
          date: d.toISOString().split('T')[0],
          label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          views: 0,
          likes: 0,
          comments: 0,
          storiesPublished: 0
        });
      }
      return points;
    }

    if (timeRange === '7d') {
      return rawTimeline.slice(-7);
    }
    if (timeRange === '30d') {
      return rawTimeline.slice(-30);
    }
    return rawTimeline;
  }, [rawTimeline, timeRange]);

  // Metric Calculation
  const metricValues = useMemo(() => {
    return filteredTimeline.map(pt => pt[activeMetric] || 0);
  }, [filteredTimeline, activeMetric]);

  const maxVal = useMemo(() => {
    const mx = Math.max(...metricValues, 0);
    return mx === 0 ? 10 : Math.ceil(mx * 1.15);
  }, [metricValues]);

  const minVal = 0;

  const totalPeriodValue = useMemo(() => {
    return metricValues.reduce((a, b) => a + b, 0);
  }, [metricValues]);

  const avgPeriodValue = useMemo(() => {
    if (!metricValues.length) return 0;
    return (totalPeriodValue / metricValues.length).toFixed(1);
  }, [totalPeriodValue, metricValues.length]);

  const peakPoint = useMemo(() => {
    if (!filteredTimeline.length) return null;
    let best = filteredTimeline[0];
    filteredTimeline.forEach(pt => {
      if ((pt[activeMetric] || 0) > (best[activeMetric] || 0)) {
        best = pt;
      }
    });
    return best;
  }, [filteredTimeline, activeMetric]);

  // Chart Dimensions
  const svgWidth = 800;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingTop = 25;
  const paddingBottom = 35;
  const plotWidth = svgWidth - paddingX * 2;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  // Compute Coordinates for each data point
  const points = useMemo(() => {
    const len = filteredTimeline.length;
    if (len === 0) return [];
    return filteredTimeline.map((pt, i) => {
      const x = paddingX + (len === 1 ? plotWidth / 2 : (i / (len - 1)) * plotWidth);
      const val = pt[activeMetric] || 0;
      const ratio = (val - minVal) / (maxVal - minVal || 1);
      const y = paddingTop + plotHeight - (ratio * plotHeight);
      return { x, y, val, data: pt, index: i };
    });
  }, [filteredTimeline, activeMetric, minVal, maxVal, plotWidth, plotHeight, paddingX, paddingTop]);

  // Build Cubic Bezier Spline Path
  const { pathD, areaD } = useMemo(() => {
    if (!points.length) return { pathD: '', areaD: '' };
    if (points.length === 1) {
      const p = points[0];
      return {
        pathD: `M ${p.x - 20} ${p.y} L ${p.x + 20} ${p.y}`,
        areaD: `M ${p.x - 20} ${p.y} L ${p.x + 20} ${p.y} L ${p.x + 20} ${paddingTop + plotHeight} L ${p.x - 20} ${paddingTop + plotHeight} Z`
      };
    }

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const cx1 = curr.x + (next.x - curr.x) / 2.5;
      const cy1 = curr.y;
      const cx2 = next.x - (next.x - curr.x) / 2.5;
      const cy2 = next.y;
      d += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${next.x} ${next.y}`;
    }

    const baselineY = paddingTop + plotHeight;
    const area = `${d} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`;

    return { pathD: d, areaD: area };
  }, [points, paddingTop, plotHeight]);

  const activeConf = METRIC_CONFIG[activeMetric] || METRIC_CONFIG.views;
  const ActiveIcon = activeConf.icon;

  // Handle Chart Hover
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const scaleX = svgWidth / rect.width;
    const adjustedX = mouseX * scaleX;

    // Find closest point
    let closest = null;
    let minDist = Infinity;
    points.forEach(p => {
      const dist = Math.abs(p.x - adjustedX);
      if (dist < minDist) {
        minDist = dist;
        closest = p;
      }
    });

    if (closest && minDist < 60) {
      setHoveredPoint(closest);
      setHoverCoords({
        screenX: ((closest.x / svgWidth) * rect.width),
        screenY: ((closest.y / svgHeight) * rect.height)
      });
    } else {
      setHoveredPoint(null);
      setHoverCoords(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
    setHoverCoords(null);
  };

  return (
    <div className="as-analytics-executive-deck">
      {/* ── Top Bar: Metric Switchers & Timeframe Selectors ── */}
      <div className="as-graph-header">
        <div className="as-graph-title-group">
          <div className="as-graph-icon-bubble">
            <FiActivity size={18} color={activeConf.stroke} />
          </div>
          <div>
            <h3 className="as-graph-main-title">
              Visual Performance Engine
            </h3>
            <span className="as-graph-subtitle">
              Live engagement trajectory & readership patterns
            </span>
          </div>
        </div>

        {/* Timeframe Pill Group */}
        <div className="as-timeframe-pills">
          <button
            onClick={() => setTimeRange('7d')}
            className={`as-tf-btn ${timeRange === '7d' ? 'active' : ''}`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`as-tf-btn ${timeRange === '30d' ? 'active' : ''}`}
          >
            30 Days
          </button>
          <button
            onClick={() => setTimeRange('all')}
            className={`as-tf-btn ${timeRange === 'all' ? 'active' : ''}`}
          >
            All History
          </button>
        </div>
      </div>

      {/* ── Metric Type Selectors (Views, Likes, Comments, Stories) ── */}
      <div className="as-metric-selectors">
        {Object.entries(METRIC_CONFIG).map(([key, conf]) => {
          const Icon = conf.icon;
          const isActive = activeMetric === key;
          const currentTotal = filteredTimeline.reduce((s, pt) => s + (pt[key] || 0), 0);
          return (
            <button
              key={key}
              onClick={() => setActiveMetric(key)}
              className={`as-metric-chip ${isActive ? 'active' : ''}`}
              style={{
                borderColor: isActive ? conf.stroke : undefined,
                boxShadow: isActive ? `0 4px 18px ${conf.glowColor}` : undefined
              }}
            >
              <div className="as-chip-top">
                <span className="as-chip-dot" style={{ backgroundColor: conf.stroke }} />
                <span className="as-chip-name">{conf.shortLabel}</span>
                <Icon size={14} className="as-chip-icon" style={{ color: conf.stroke }} />
              </div>
              <div className="as-chip-value">
                {currentTotal.toLocaleString()}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Main SVG Graph Canvas ── */}
      <div
        className="as-svg-canvas-wrapper"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="as-interactive-svg"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={activeConf.gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={activeConf.stroke} stopOpacity="0.4" />
              <stop offset="60%" stopColor={activeConf.stroke} stopOpacity="0.08" />
              <stop offset="100%" stopColor={activeConf.stroke} stopOpacity="0.0" />
            </linearGradient>
            <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Horizontal Grid Lines & Y-Axis Labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = paddingTop + plotHeight - (ratio * plotHeight);
            const labelVal = Math.round(minVal + ratio * (maxVal - minVal));
            return (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={svgWidth - paddingX}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity="0.07"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="as-svg-grid-text"
                >
                  {labelVal}
                </text>
              </g>
            );
          })}

          {/* Gradient Area Fill */}
          {areaD && (
            <path
              d={areaD}
              fill={`url(#${activeConf.gradientId})`}
              className="as-chart-area-fill"
            />
          )}

          {/* Bezier Spline Stroke */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke={activeConf.stroke}
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="as-chart-spline"
              filter="url(#glowFilter)"
            />
          )}

          {/* X-Axis Dates */}
          {points.map((p, idx) => {
            // Show every few labels depending on point count
            const step = points.length > 20 ? 5 : (points.length > 10 ? 2 : 1);
            if (idx % step !== 0 && idx !== points.length - 1) return null;
            return (
              <text
                key={idx}
                x={p.x}
                y={svgHeight - 10}
                textAnchor="middle"
                className="as-svg-date-label"
              >
                {p.data.label}
              </text>
            );
          })}

          {/* Data Points / Dots */}
          {points.map((p, idx) => {
            const isHovered = hoveredPoint && hoveredPoint.index === idx;
            const hasStory = p.data.storiesPublished > 0;
            return (
              <g key={idx} className="as-point-group">
                {hasStory && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 8 : 5}
                    fill="#a78bfa"
                    stroke="#ffffff"
                    strokeWidth="2"
                    opacity="0.9"
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 6 : (hasStory ? 3.5 : (points.length <= 15 ? 3 : 2))}
                  fill={isHovered ? activeConf.stroke : '#ffffff'}
                  stroke={activeConf.stroke}
                  strokeWidth="2"
                  className="as-svg-point"
                />
              </g>
            );
          })}

          {/* Vertical Crosshair Line on Hover */}
          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              y1={paddingTop}
              x2={hoveredPoint.x}
              y2={paddingTop + plotHeight}
              stroke={activeConf.stroke}
              strokeWidth="1.5"
              strokeDasharray="3 3"
              opacity="0.8"
            />
          )}
        </svg>

        {/* Floating Glassmorphic Tooltip */}
        {hoveredPoint && hoverCoords && (
          <div
            className="as-chart-tooltip"
            style={{
              left: `${hoverCoords.screenX}px`,
              top: `${Math.max(10, hoverCoords.screenY - 80)}px`
            }}
          >
            <div className="as-tooltip-date">
              <FiCalendar size={11} style={{ marginRight: '4px' }} />
              {hoveredPoint.data.label}
            </div>
            <div className="as-tooltip-main" style={{ color: activeConf.stroke }}>
              <ActiveIcon size={13} style={{ marginRight: '6px' }} />
              <strong>{hoveredPoint.val}</strong> {activeConf.unit}
            </div>
            {hoveredPoint.data.storiesPublished > 0 && (
              <div className="as-tooltip-sub">
                ✍️ {hoveredPoint.data.storiesPublished} stories published
              </div>
            )}
            <div className="as-tooltip-footer">
              <span>👁️ {hoveredPoint.data.views || 0}</span>
              <span>❤️ {hoveredPoint.data.likes || 0}</span>
              <span>💬 {hoveredPoint.data.comments || 0}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Summary KPI Footer for Graph ── */}
      <div className="as-graph-kpi-footer">
        <div className="as-gkpi-item">
          <span className="as-gkpi-label">Period Aggregate</span>
          <span className="as-gkpi-val" style={{ color: activeConf.stroke }}>
            {totalPeriodValue.toLocaleString()} {activeConf.shortLabel}
          </span>
        </div>
        <div className="as-gkpi-item">
          <span className="as-gkpi-label">Daily Average</span>
          <span className="as-gkpi-val">
            ~{avgPeriodValue} / day
          </span>
        </div>
        {peakPoint && (
          <div className="as-gkpi-item">
            <span className="as-gkpi-label">Peak Activity</span>
            <span className="as-gkpi-val">
              {peakPoint[activeMetric] || 0} ({peakPoint.label})
            </span>
          </div>
        )}
        <div className="as-gkpi-item">
          <span className="as-gkpi-label">Audience Ratio</span>
          <span className="as-gkpi-val" style={{ color: '#34d399' }}>
            {stats.engagementRate || 0}% Engagement
          </span>
        </div>
      </div>

      {/* ── Two-Column Breakdown: Category Matrix + Top Stories ── */}
      <div className="as-breakdown-row">
        
        {/* Left: Category Distribution Bars */}
        <div className="as-breakdown-card">
          <div className="as-card-heading">
            <FiLayers size={16} color="var(--accent-color, #c8102e)" />
            <h4>Section Distribution & Reach</h4>
          </div>

          {categoryDistribution.length === 0 ? (
            <p className="as-empty-subtext">No category metrics available yet.</p>
          ) : (
            <div className="as-category-bar-list">
              {categoryDistribution.map((catItem) => {
                const totalAll = stats.totalArticles || 1;
                const pct = Math.round((catItem.count / totalAll) * 100);
                const color = CATEGORY_COLORS[catItem.category] || '#64748b';
                return (
                  <div
                    key={catItem.category}
                    className="as-cat-bar-item"
                    onClick={() => onSelectCategory && onSelectCategory(catItem.category)}
                    title={`Click to filter stories in ${catItem.category}`}
                  >
                    <div className="as-cat-bar-header">
                      <div className="as-cat-bar-title">
                        <span className="as-cat-dot" style={{ backgroundColor: color }} />
                        <span className="as-cat-name">{getCategoryLabel(catItem.category)}</span>
                      </div>
                      <div className="as-cat-bar-metrics">
                        <span>{catItem.count} {catItem.count === 1 ? 'story' : 'stories'}</span>
                        <span className="as-cat-pct">({pct}%)</span>
                        <span className="as-cat-reads">👁️ {catItem.views || 0}</span>
                      </div>
                    </div>
                    <div className="as-cat-progress-track">
                      <div
                        className="as-cat-progress-fill"
                        style={{
                          width: `${Math.max(5, Math.min(100, pct))}%`,
                          backgroundColor: color
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Top Performing Stories */}
        <div className="as-breakdown-card">
          <div className="as-card-heading">
            <FiAward size={16} color="#f59e0b" />
            <h4>High-Impact Stories</h4>
          </div>

          {topArticles.length === 0 ? (
            <div className="as-empty-story-spot">
              <p className="as-empty-subtext">Publish stories to unlock leaderboard analytics.</p>
              {onOpenCreate && (
                <button onClick={onOpenCreate} className="as-mini-create-btn">
                  + Create First Story
                </button>
              )}
            </div>
          ) : (
            <div className="as-top-stories-list">
              {topArticles.map((art, index) => {
                return (
                  <div key={art._id} className="as-top-story-item">
                    <div className="as-rank-badge">
                      #{index + 1}
                    </div>
                    <div className="as-top-story-info">
                      <Link
                        to={`/article/${art.slug}`}
                        className="as-top-story-title"
                        title={art.title}
                      >
                        {art.title}
                      </Link>
                      <div className="as-top-story-meta">
                        <span className="as-top-story-cat">
                          {getCategoryLabel(art.category)}
                        </span>
                        <span>•</span>
                        <span>👁️ {art.views || 0} reads</span>
                        <span>•</span>
                        <span>❤️ {art.likesCount || 0}</span>
                        <span>•</span>
                        <span>💬 {art.commentCount || 0}</span>
                      </div>
                    </div>
                    <Link
                      to={`/article/${art.slug}`}
                      className="as-rank-arrow-btn"
                      title="Read Story"
                    >
                      <FiArrowUpRight size={15} />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthorAnalyticsGraph;
