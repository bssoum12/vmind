"use client";

import React, { useEffect, useState } from 'react';

interface ChartDataPoint {
  label: string;
  value: number;
}

interface VolumeLineChartProps {
  activeAgentId?: string;
}

export const VolumeLineChart: React.FC<VolumeLineChartProps> = ({ activeAgentId }) => {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const clientId = process.env.NEXT_PUBLIC_CLIENT_ID || "DEMO";
      
      const response = await fetch(`${baseUrl}/api/tools/get-dossier-volume-evolution`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          months: 12
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const resJson = await response.json();
      if (resJson.ok && resJson.data && resJson.data.chart && resJson.data.chart.data) {
        setData(resJson.data.chart.data);
      } else {
        throw new Error(resJson.error?.message || "Format de données invalide");
      }
    } catch (err: any) {
      console.error("Error fetching dossier volume evolution:", err);
      setError(err.message || "Impossible de charger les données");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeAgentId === 'VDATA') {
      fetchData();
    }
  }, [activeAgentId]);

  if (activeAgentId !== 'VDATA') return null;

  // Chart dimensions & layout
  const width = 248;
  const height = 55;
  const paddingX = 12;
  const paddingY = 8;

  const chartWidth = width - (paddingX * 2);
  const chartHeight = height - (paddingY * 2);

  const maxVal = data.length > 0 ? Math.max(...data.map(d => d.value)) : 0;
  const displayMax = maxVal === 0 ? 10 : Math.ceil(maxVal * 1.15); // Add margin at the top

  // Calculate coordinates for SVG
  const points = data.map((d, i) => {
    const x = paddingX + (i * (chartWidth / (data.length - 1 || 1)));
    const y = paddingY + chartHeight - ((d.value / displayMax) * chartHeight);
    return { x, y, ...d };
  });

  // SVG Line path string
  const linePath = points.length > 0 
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') 
    : '';

  // SVG Area path string (for gradient fill under the line)
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(height - paddingY).toFixed(1)} L ${points[0].x.toFixed(1)} ${(height - paddingY).toFixed(1)} Z`
    : '';

  // Format short month labels (e.g. "juil. 2025" -> "Juil")
  const getShortLabel = (label: string) => {
    const parts = label.split(/[.\s]/);
    if (parts.length > 0) {
      const month = parts[0];
      return month.charAt(0).toUpperCase() + month.slice(1, 3);
    }
    return label;
  };

  return (
    <div className="volume-line-chart-wrapper" style={{ marginTop: '16px', position: 'relative' }}>
      <div style={{ fontSize: '9px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>VOLUME DOSSIERS 12 MOIS</span>
        {loading && <span className="chart-pulse-dot" style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--cyan)', boxShadow: '0 0 6px var(--cyan)', animation: 'pulse 1.5s infinite' }}></span>}
      </div>

      {loading ? (
        <div style={{ height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 229, 200, 0.02)', borderRadius: '4px', border: '1px dashed rgba(0, 229, 200, 0.1)' }}>
          <div style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>CHARGEMENT DES DONNÉES...</div>
        </div>
      ) : error ? (
        <div style={{ height: '72px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 71, 87, 0.02)', borderRadius: '4px', border: '1px dashed rgba(255, 71, 87, 0.15)', padding: '8px' }}>
          <div style={{ fontSize: '8px', fontFamily: 'var(--font-mono)', color: 'var(--red)', textAlign: 'center', marginBottom: '4px' }}>{error}</div>
          <button onClick={fetchData} style={{ background: 'none', border: 'none', color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: '8px', textDecoration: 'underline', cursor: 'pointer' }}>Réessayer</button>
        </div>
      ) : data.length === 0 ? (
        <div style={{ height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 229, 200, 0.02)', borderRadius: '4px', border: '1px dashed rgba(0, 229, 200, 0.1)' }}>
          <div style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>AUCUNE DONNÉE DISPONIBLE</div>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* Custom HTML Premium Tooltip */}
          {hoveredIndex !== null && points[hoveredIndex] && (
            <div 
              style={{
                position: 'absolute',
                left: `${Math.max(10, Math.min(width - 120, points[hoveredIndex].x - 60))}px`,
                top: `${points[hoveredIndex].y - 32}px`,
                background: 'rgba(10, 24, 40, 0.95)',
                border: '1px solid var(--cyan)',
                boxShadow: '0 0 12px rgba(0, 229, 200, 0.25)',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '8px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--white)',
                pointerEvents: 'none',
                zIndex: 10,
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                backdropFilter: 'blur(4px)'
              }}
            >
              <span style={{ color: 'var(--muted)' }}>{points[hoveredIndex].label}</span> : <strong style={{ color: 'var(--cyan)' }}>{points[hoveredIndex].value}</strong> dossiers
            </div>
          )}

          {/* SVG Chart */}
          <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }}>
            <defs>
              {/* Neon Glow Filter */}
              <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Gradient fill under line */}
              <linearGradient id="chart-glow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines */}
            <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="rgba(0, 229, 200, 0.05)" strokeWidth="1" />
            <line x1={paddingX} y1={paddingY + chartHeight / 2} x2={width - paddingX} y2={paddingY + chartHeight / 2} stroke="rgba(0, 229, 200, 0.03)" strokeWidth="1" strokeDasharray="2 2" />
            <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="rgba(0, 229, 200, 0.08)" strokeWidth="1" />

            {/* Area under the line */}
            {areaPath && (
              <path d={areaPath} fill="url(#chart-glow)" />
            )}

            {/* Hover Vertical Guide Line */}
            {hoveredIndex !== null && points[hoveredIndex] && (
              <line 
                x1={points[hoveredIndex].x} 
                y1={paddingY} 
                x2={points[hoveredIndex].x} 
                y2={height - paddingY} 
                stroke="rgba(0, 229, 200, 0.2)" 
                strokeDasharray="2 2" 
                strokeWidth="1"
              />
            )}

            {/* Main Path Line */}
            {linePath && (
              <path 
                d={linePath} 
                fill="none" 
                stroke="var(--cyan)" 
                strokeWidth="1.8" 
                filter="url(#neon-glow)" 
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data Point Circles */}
            {points.map((p, i) => {
              const isHovered = hoveredIndex === i;
              return (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 4.5 : 2.5}
                  fill={isHovered ? "var(--cyan)" : "var(--navy2)"}
                  stroke="var(--cyan)"
                  strokeWidth={isHovered ? 1.5 : 1.2}
                  style={{ transition: 'all 0.15s ease', cursor: 'pointer' }}
                />
              );
            })}

            {/* Interactive invisible bars for easy hover target selection */}
            {points.map((p, i) => {
              const rectWidth = chartWidth / (points.length - 1 || 1);
              const xStart = p.x - (rectWidth / 2);
              return (
                <rect
                  key={`hover-${i}`}
                  x={xStart}
                  y={0}
                  width={rectWidth}
                  height={height}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
          </svg>

          {/* X-axis Labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: '4px', padding: `0 ${paddingX}px` }}>
            <span>{getShortLabel(data[0].label)}</span>
            <span>{getShortLabel(data[Math.floor(data.length / 2)].label)}</span>
            <span>{getShortLabel(data[data.length - 1].label)} ●</span>
          </div>
        </div>
      )}
    </div>
  );
};
