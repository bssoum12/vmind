'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ZoomIn, ZoomOut, Maximize2, RefreshCw } from 'lucide-react';
import { forceCollide, forceRadial } from 'd3-force';
import { SupervisorNode, SupervisorLink } from '../types/supervisor.types';

// ─── Properly forward ref through next/dynamic ───────────────────────────────
// next/dynamic does NOT forward refs. We wrap the real component so the ref
// arrives as a normal prop (`forwardedRef`), which we pass down as `ref`.
const ForceGraph2D = dynamic(
  async () => {
    const mod = await import('react-force-graph-2d');
    const FG = mod.default;
    // eslint-disable-next-line react/display-name
    return function WrappedForceGraph({ forwardedRef, ...props }: any) {
      return <FG ref={forwardedRef} {...props} />;
    };
  },
  {
    ssr: false,
    loading: () => (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94A3B8',
        fontSize: '13px'
      }}>
        Initialisation de la matrice des agents...
      </div>
    )
  }
) as React.ComponentType<any>;

interface SupervisorGraphCanvasProps {
  nodes: SupervisorNode[];
  links: SupervisorLink[];
  selectedNodeId?: string | null;
  selectedLinkId?: string | null;
  onSelectNode: (node: SupervisorNode) => void;
  onSelectLink: (link: SupervisorLink) => void;
  onClearSelection: () => void;
}

export const SupervisorGraphCanvas: React.FC<SupervisorGraphCanvasProps> = ({
  nodes,
  links,
  selectedNodeId,
  selectedLinkId,
  onSelectNode,
  onSelectLink,
  onClearSelection
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Fast map to resolve string node IDs to node objects
  const nodesById = useMemo(() => {
    const map: Record<string, SupervisorNode> = {};
    nodes.forEach(n => {
      map[n.id] = n;
    });
    return map;
  }, [nodes]);

  // Resize observer to keep canvas responsive
  useEffect(() => {
    if (!containerRef.current) return;
    const updateDimensions = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        // Guard against 0-height collapse
        if (w > 0 && h > 0) {
          setDimensions({ width: w, height: h });
        }
      }
    };

    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // ─── Stable graphData identity ──────────────────────────────────────────────
  // Only rebuild when the actual node/link IDs change, NOT on every render.
  // This prevents the layout from resetting when the parent re-renders on
  // selection changes (which create new array references).
  const nodeIdKey = useMemo(() => nodes.map(n => n.id).join(','), [nodes]);
  const linkIdKey = useMemo(() => links.map(l => l.id).join(','), [links]);

  const graphData = useMemo(() => {
    return {
      nodes: nodes.map(n => ({
        ...n,
        // Slight organic random perturbation so physics starts bouncing instantly
        x: (n.x ?? 0) + (Math.random() * 20 - 10),
        y: (n.y ?? 0) + (Math.random() * 20 - 10)
      })),
      links: links.map(l => ({ ...l }))
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeIdKey, linkIdKey]);

  // Keep mutable ForceGraph2D node/link objects synchronized with the latest
  // scores, statuses, and summaries from React state WITHOUT resetting their
  // live D3 physics coordinates (x, y, vx, vy).
  useEffect(() => {
    graphData.nodes.forEach((gn: any) => {
      const latest = nodes.find(n => n.id === gn.id);
      if (latest) {
        gn.healthScore = latest.healthScore;
        gn.status = latest.status;
        gn.summary = latest.summary;
        gn.name = latest.name;
        gn.evaluation = latest.evaluation;
        gn.lastEvaluatedAt = latest.lastEvaluatedAt;
      }
    });

    graphData.links.forEach((gl: any) => {
      const latest = links.find(l => l.id === gl.id);
      if (latest) {
        gl.alignmentScore = latest.alignmentScore;
        gl.status = latest.status;
        gl.summary = latest.summary;
        gl.evaluation = latest.evaluation;
        gl.lastEvaluatedAt = latest.lastEvaluatedAt;
      }
    });
  }, [nodes, links, graphData]);

  // Status colors helper
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'HEALTHY': return '#00E5A0';
      case 'WARNING': return '#FFB800';
      case 'CRITICAL': return '#FF4757';
      default: return '#64748B';
    }
  }, []);

  // ─── Force configuration ────────────────────────────────────────────────────
  const forcesConfigured = useRef(false);

  const configureForces = useCallback((fg: any) => {
    if (!fg) return;

    // 1. Remove default crushing center force
    fg.d3Force('center', null);

    // 2. Organic repulsive charge — moderate so nodes don't fly apart
    const charge = fg.d3Force('charge');
    if (charge) {
      charge.strength(-800);
      charge.distanceMax(900);
    }

    // 3. SOFT elastic springs — low strength = rubber-band stretch, not rigid rods
    //    This is the #1 factor for squishy Obsidian feel.
    const link = fg.d3Force('link');
    if (link) {
      link.distance(260);
      link.strength(0.25);
    }

    // 4. Collision detection: 90px radius → nodes cannot get closer than 180px
    fg.d3Force(
      'collide',
      forceCollide(90).strength(1.0).iterations(3)
    );

    // 5. Gentle radial gravity to keep everything near viewport center
    fg.d3Force('radial', forceRadial(0, 0, 180).strength(0.05));

    fg.d3ReheatSimulation();
  }, []);

  // ─── Dynamic Zoom Limits relative to fleet agent count ──────────────────────
  // Prevents zooming out to infinity: adapts limits gracefully based on fleet density
  const { minZoomLimit, maxZoomLimit } = useMemo(() => {
    const count = graphData.nodes.length;
    if (count <= 6) {
      return { minZoomLimit: 0.70, maxZoomLimit: 3.0 };
    }
    if (count <= 12) {
      return { minZoomLimit: 0.55, maxZoomLimit: 2.8 };
    }
    if (count <= 30) {
      return { minZoomLimit: 0.38, maxZoomLimit: 2.4 };
    }
    if (count <= 60) {
      return { minZoomLimit: 0.26, maxZoomLimit: 2.0 };
    }
    return { minZoomLimit: 0.16, maxZoomLimit: 1.8 };
  }, [graphData.nodes.length]);

  // ─── Adaptive Auto-Fit: Centers & Zooms dynamically relative to agent count ───
  const autoFitGraph = useCallback((duration = 500) => {
    const fg = fgRef.current;
    const container = containerRef.current;
    if (!fg || !container) return;

    const activeNodes = graphData.nodes;
    if (!activeNodes || activeNodes.length === 0) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let validCount = 0;

    activeNodes.forEach((n: any) => {
      const nx = typeof n.x === 'number' ? n.x : 0;
      const ny = typeof n.y === 'number' ? n.y : 0;
      if (!isNaN(nx) && !isNaN(ny)) {
        minX = Math.min(minX, nx);
        maxX = Math.max(maxX, nx);
        minY = Math.min(minY, ny);
        maxY = Math.max(maxY, ny);
        validCount++;
      }
    });

    if (validCount === 0 || minX === Infinity) {
      fg.centerAt(0, 0, duration);
      fg.zoom(1.2, duration);
      return;
    }

    // Account for node radius, glow aura, and text badges below nodes
    const marginX = 80;
    const marginY = 85;
    const graphWidth = Math.max(maxX - minX + marginX * 2, 120);
    const graphHeight = Math.max(maxY - minY + marginY * 2, 120);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const viewW = dimensions.width || container.clientWidth || 1200;
    const viewH = dimensions.height || container.clientHeight || 800;

    // Target filling ~86% of available width and ~82% of height
    const targetW = viewW * 0.86;
    const targetH = viewH * 0.82;

    const zoomX = targetW / graphWidth;
    const zoomY = targetH / graphHeight;

    // Scale dynamically bounded by fleet-relative zoom limits
    let targetZoom = Math.min(zoomX, zoomY);
    targetZoom = Math.max(minZoomLimit, Math.min(targetZoom, maxZoomLimit));

    fg.centerAt(centerX, centerY, duration);
    fg.zoom(targetZoom, duration);
  }, [graphData, dimensions, minZoomLimit, maxZoomLimit]);

  // Configure forces once the graph instance is ready and smoothly auto-fit to fill the viewport
  const handleEngineTick = useCallback(() => {
    if (fgRef.current && !forcesConfigured.current) {
      forcesConfigured.current = true;
      configureForces(fgRef.current);
      // Progressive auto-fit: immediate framing, settling transition, and final settle
      setTimeout(() => autoFitGraph(300), 120);
      setTimeout(() => autoFitGraph(500), 550);
      setTimeout(() => autoFitGraph(400), 1100);
    }
  }, [configureForces, autoFitGraph]);

  // Re-fit smoothly on window / container resize once initial forces settled
  useEffect(() => {
    if (forcesConfigured.current && dimensions.width > 0 && dimensions.height > 0) {
      const timer = setTimeout(() => {
        autoFitGraph(300);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [dimensions, autoFitGraph]);

  // When nodes arrive or update from the server, configure forces and smoothly auto-fit
  useEffect(() => {
    if (graphData.nodes.length > 0 && fgRef.current) {
      configureForces(fgRef.current);
      const t1 = setTimeout(() => autoFitGraph(300), 120);
      const t2 = setTimeout(() => autoFitGraph(500), 550);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [nodeIdKey, configureForces, autoFitGraph, graphData.nodes.length]);

  // Custom link color helper
  const getLinkColor = useCallback((link: any) => {
    if (link.id === selectedLinkId) return '#00E5C8';
    return getStatusColor(link.status);
  }, [selectedLinkId, getStatusColor]);

  // ─── Apple-style continuous rounded capsule helper ─────────────────────────
  const drawRoundedCapsule = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number
  ) => {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, radius);
    } else {
      const r = Math.min(radius, w / 2, h / 2);
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }
  }, []);

  // ─── Custom AI Agent node rendering (Apple Design Aesthetics) ───────────────
  const drawNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isSelected = node.id === selectedNodeId;
    const statusColor = getStatusColor(node.status);
    const isSourcing = node.type === 'sourcing';
    const coreColor = isSourcing ? '#00E5C8' : '#9D4EDD';
    const radius = isSelected ? 24 : 20;

    const x = node.x ?? 0;
    const y = node.y ?? 0;

    // ── 1. Soft Aperture Glow (Apple Intelligence luminescent field) ──
    ctx.save();
    const glowGrad = ctx.createRadialGradient(x, y, radius * 0.8, x, y, radius + (isSelected ? 16 : 10));
    glowGrad.addColorStop(0, isSelected
      ? 'rgba(0, 229, 200, 0.45)'
      : node.status === 'CRITICAL'
        ? 'rgba(255, 71, 87, 0.3)'
        : node.status === 'WARNING'
          ? 'rgba(255, 184, 0, 0.25)'
          : isSourcing ? 'rgba(0, 229, 200, 0.18)' : 'rgba(157, 78, 221, 0.18)');
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.beginPath();
    ctx.arc(x, y, radius + (isSelected ? 16 : 10), 0, 2 * Math.PI);
    ctx.fillStyle = glowGrad;
    ctx.fill();
    ctx.restore();

    // ── 2. Subtle Status Ring ──
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius + 1.5, 0, 2 * Math.PI);
    ctx.strokeStyle = isSelected ? '#00E5C8' : statusColor;
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    if (node.status === 'UNANALYZED') {
      ctx.setLineDash([3, 3]);
    }
    ctx.stroke();
    ctx.restore();

    // ── 3. Inner Translucent Glass Lens ──
    ctx.save();
    const lensGrad = ctx.createRadialGradient(x, y - radius * 0.4, 0, x, y, radius);
    lensGrad.addColorStop(0, '#10223E');
    lensGrad.addColorStop(1, '#071222');
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = lensGrad;
    ctx.fill();

    // Subtle inner top rim light
    ctx.beginPath();
    ctx.arc(x, y, radius - 0.5, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 0.75;
    ctx.stroke();
    ctx.restore();

    // ── 4. AI Agent Vector Glyph (Clean Apple Iconography) ──
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = coreColor;
    ctx.fillStyle = coreColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (isSourcing) {
      // ── SOURCING: Concentric Signal Rays ──
      ctx.beginPath();
      ctx.arc(0, 3, 2.2, 0, 2 * Math.PI);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, 3, 6, -Math.PI * 0.8, -Math.PI * 0.2);
      ctx.lineWidth = 1.6;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 3, 10, -Math.PI * 0.8, -Math.PI * 0.2);
      ctx.lineWidth = 1.6;
      ctx.stroke();
    } else {
      // ── PROSPECT: Neural Spark Crosshair ──
      ctx.beginPath();
      ctx.arc(0, 0, 2.2, 0, 2 * Math.PI);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, 0, 6.5, 0, 2 * Math.PI);
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Delicate 4-axis ticks
      const tIn = 7.5;
      const tOut = 11.5;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(0, -tIn); ctx.lineTo(0, -tOut); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, tIn); ctx.lineTo(0, tOut); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-tIn, 0); ctx.lineTo(-tOut, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tIn, 0); ctx.lineTo(tOut, 0); ctx.stroke();
    }
    ctx.restore();

    // ── 5. Sleek "AI" Micro-Badge (Top-Right) ──
    ctx.save();
    const badgeX = x + radius * 0.68;
    const badgeY = y - radius * 0.68;
    const badgeR = 6.5;

    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeR, 0, 2 * Math.PI);
    ctx.fillStyle = coreColor;
    ctx.fill();

    ctx.font = 'bold 7px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#06111F';
    ctx.fillText('AI', badgeX, badgeY);
    ctx.restore();

    // ── 6. Type Chip (Bottom-Center) ──
    ctx.save();
    const chipY = y + radius - 2;
    ctx.beginPath();
    ctx.arc(x, chipY, 5.5, 0, 2 * Math.PI);
    ctx.fillStyle = '#081426';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, chipY, 5.5, 0, 2 * Math.PI);
    ctx.strokeStyle = coreColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = 'bold 7px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = coreColor;
    ctx.fillText(isSourcing ? 'S' : 'P', x, chipY);
    ctx.restore();

    // ── 7. Apple Translucent Frosted Label & Health Pill ──
    const label = node.name;
    if (globalScale > 0.3) {
      ctx.save();
      ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const textWidth = ctx.measureText(label).width;
      const boxW = textWidth + 14;
      const boxH = 20;
      const boxY = y + radius + 11;
      const boxX = x - boxW / 2;

      // Soft frosted glass pill for node name
      ctx.fillStyle = 'rgba(6, 17, 31, 0.78)';
      drawRoundedCapsule(ctx, boxX, boxY, boxW, boxH, 10);
      ctx.fill();

      ctx.strokeStyle = isSelected ? 'rgba(0, 229, 200, 0.6)' : 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 0.75;
      drawRoundedCapsule(ctx, boxX, boxY, boxW, boxH, 10);
      ctx.stroke();

      ctx.fillStyle = isSelected ? '#00E5C8' : '#F0F4F8';
      ctx.fillText(label, x, boxY + boxH / 2);

      // Health Score Micro-Pill below name
      if (node.status !== 'UNANALYZED') {
        const scoreLabel = `${node.healthScore}%`;
        ctx.font = 'bold 9.5px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
        const scoreNumWidth = ctx.measureText(scoreLabel).width;
        const scorePillW = scoreNumWidth + 20;
        const scorePillH = 16;
        const scorePillY = boxY + boxH + 4;
        const scorePillX = x - scorePillW / 2;

        ctx.fillStyle = 'rgba(8, 20, 38, 0.8)';
        drawRoundedCapsule(ctx, scorePillX, scorePillY, scorePillW, scorePillH, 8);
        ctx.fill();

        ctx.strokeStyle = `${statusColor}60`;
        ctx.lineWidth = 0.75;
        drawRoundedCapsule(ctx, scorePillX, scorePillY, scorePillW, scorePillH, 8);
        ctx.stroke();

        // Tiny status dot
        ctx.beginPath();
        ctx.arc(scorePillX + 7, scorePillY + scorePillH / 2, 2.5, 0, 2 * Math.PI);
        ctx.fillStyle = statusColor;
        ctx.fill();

        // Score percentage
        ctx.fillStyle = statusColor;
        ctx.textAlign = 'left';
        ctx.fillText(scoreLabel, scorePillX + 13, scorePillY + scorePillH / 2);
      }
      ctx.restore();
    }
  }, [selectedNodeId, getStatusColor, drawRoundedCapsule]);

  // ─── Custom link rendering (Apple Aesthetics & Translucent Capsules) ────────
  const drawLink = useCallback((link: any, ctx: CanvasRenderingContext2D) => {
    // Resolve start and end safely (whether object or string ID)
    const start = typeof link.source === 'object' ? link.source : nodesById[link.source];
    const end = typeof link.target === 'object' ? link.target : nodesById[link.target];

    if (!start || !end) return;
    const startX = typeof start.x === 'number' ? start.x : 0;
    const startY = typeof start.y === 'number' ? start.y : 0;
    const endX = typeof end.x === 'number' ? end.x : 0;
    const endY = typeof end.y === 'number' ? end.y : 0;

    const isSelected = link.id === selectedLinkId;
    const color = getLinkColor(link);

    ctx.save();

    // 1. Glowing outer beam
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = isSelected
      ? 'rgba(0, 229, 200, 0.5)'
      : color === '#00E5A0' ? 'rgba(0, 229, 160, 0.2)'
      : color === '#FFB800' ? 'rgba(255, 184, 0, 0.2)'
      : color === '#FF4757' ? 'rgba(255, 71, 87, 0.2)'
      : 'rgba(100, 116, 139, 0.2)';
    ctx.lineWidth = isSelected ? 10 : 6;
    ctx.stroke();

    // 2. Main neon core line
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = isSelected ? '#00E5C8' : color;
    ctx.lineWidth = isSelected ? 3 : 2;
    if (link.status === 'UNANALYZED') {
      ctx.setLineDash([5, 5]);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Directional Midpoint Arrow (Sourcing -> Prospect)
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const angle = Math.atan2(endY - startY, endX - startX);
    const arrowSize = 10;

    ctx.beginPath();
    ctx.moveTo(midX + Math.cos(angle) * 7, midY + Math.sin(angle) * 7);
    ctx.lineTo(
      midX - arrowSize * Math.cos(angle - Math.PI / 6),
      midY - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      midX - arrowSize * Math.cos(angle + Math.PI / 6),
      midY - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = isSelected ? '#00E5C8' : color;
    ctx.fill();

    // 4. Alignment Score capsule floating above arrow
    if (link.status !== 'UNANALYZED' && link.alignmentScore !== undefined) {
      const pillText = `${link.alignmentScore}% Alignement`;
      ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
      const textWidth = ctx.measureText(pillText).width;
      const pillW = textWidth + 18;
      const pillH = 20;
      const pillY = midY - 18;
      const pillX = midX - pillW / 2;

      ctx.fillStyle = 'rgba(6, 17, 31, 0.85)';
      drawRoundedCapsule(ctx, pillX, pillY - pillH / 2, pillW, pillH, 10);
      ctx.fill();

      ctx.strokeStyle = isSelected ? '#00E5C8' : `${color}80`;
      ctx.lineWidth = 1;
      drawRoundedCapsule(ctx, pillX, pillY - pillH / 2, pillW, pillH, 10);
      ctx.stroke();

      // Dot + Text
      ctx.beginPath();
      ctx.arc(pillX + 8, pillY, 2.5, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isSelected ? '#00E5C8' : '#F0F4F8';
      ctx.fillText(pillText, pillX + 14, pillY);
    }

    ctx.restore();
  }, [nodesById, selectedLinkId, getLinkColor, drawRoundedCapsule]);

  // ─── Toolbar actions ────────────────────────────────────────────────────────
  const handleZoomIn = () => {
    if (fgRef.current) {
      const cur = fgRef.current.zoom();
      const next = Math.min(cur * 1.3, maxZoomLimit);
      fgRef.current.zoom(next, 300);
    }
  };

  const handleZoomOut = () => {
    if (fgRef.current) {
      const cur = fgRef.current.zoom();
      const next = Math.max(cur / 1.3, minZoomLimit);
      fgRef.current.zoom(next, 300);
    }
  };

  const handleFit = () => {
    autoFitGraph(400);
  };

  const handleReheat = () => {
    if (fgRef.current) fgRef.current.d3ReheatSimulation();
  };

  return (
    <div className="supervisor-graph-wrapper" ref={containerRef}>
      {/* Apple-style Segmented Glass Control Capsule */}
      <div className="graph-apple-controls">
        <button className="control-btn" title="Zoom avant" onClick={handleZoomIn}>
          <ZoomIn size={15} />
        </button>
        <button className="control-btn" title="Zoom arrière" onClick={handleZoomOut}>
          <ZoomOut size={15} />
        </button>
        <div className="control-divider" />
        <button className="control-btn" title="Recentrer la vue" onClick={handleFit}>
          <Maximize2 size={15} />
        </button>
        <button className="control-btn" title="Relancer la simulation physique" onClick={handleReheat}>
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Apple-style Minimal Glass Legend */}
      <div className="graph-apple-legend">
        <div className="legend-chip">
          <span className="dot sourcing" />
          <span>Sourcing</span>
        </div>
        <div className="legend-chip">
          <span className="dot prospect" />
          <span>Prospection</span>
        </div>
        <div className="legend-sep" />
        <div className="legend-chip">
          <span className="dot healthy" />
          <span>Sain</span>
        </div>
        <div className="legend-chip">
          <span className="dot warning" />
          <span>Alerte</span>
        </div>
        <div className="legend-chip">
          <span className="dot critical" />
          <span>Incohérence</span>
        </div>
      </div>

      {/* Graph Canvas */}
      <div className="graph-canvas-container">
        <ForceGraph2D
          forwardedRef={fgRef}
          minZoom={minZoomLimit}
          maxZoom={maxZoomLimit}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeId="id"
          nodeCanvasObject={drawNode}
          /* 'replace' → the library draws NOTHING for links; our drawLink handles
             the full line, glow, arrow, and score pill. No double-drawing. */
          linkCanvasObjectMode={() => 'replace'}
          linkCanvasObject={drawLink}
          nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x ?? 0, node.y ?? 0, 26, 0, 2 * Math.PI, false);
            ctx.fill();
          }}
          onNodeClick={(node: any) => onSelectNode(node as SupervisorNode)}
          onLinkClick={(link: any) => onSelectLink(link as SupervisorLink)}
          onBackgroundClick={onClearSelection}
          enableNodeDrag={true}
          /* Do NOT reheat during drag — let the soft springs naturally stretch
             and pull connected nodes in real-time. This creates the rubber-band
             "squish" where neighbors follow the drag with visible elastic lag. */
          onNodeDragEnd={(node: any) => {
            // Unpin on release → node snaps back with springy overshoot wobble
            node.fx = undefined;
            node.fy = undefined;
            fgRef.current?.d3ReheatSimulation();
          }}
          onEngineTick={handleEngineTick}
          linkHoverPrecision={14}
          /* Very slow alpha decay = simulation wobbles for a long time before settling */
          d3AlphaDecay={0.005}
          /* Very low friction = nodes carry momentum, overshoot, and bounce back.
             This is the #2 factor (after link.strength) for the squishy feel. */
          d3VelocityDecay={0.08}
          cooldownTicks={Infinity}
          cooldownTime={Infinity}
        />
      </div>
    </div>
  );
};
