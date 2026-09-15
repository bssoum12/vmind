"use client";

import React, { useEffect, useState } from 'react';
import { useKpis } from '../../shared/contexts/KpiCacheContext';
import { SkeletonLoader } from '../../components/vmind/SkeletonLoader';

function getAuthToken() {
  if (typeof window === 'undefined') return '';
  const mcpToken = localStorage.getItem('vmind_mcp_token');
  if (mcpToken) return mcpToken;
  try {
    const sessionStr = localStorage.getItem('vmind_session');
    if (!sessionStr) return '';
    if (sessionStr.startsWith('eyJ')) return sessionStr;
    const parsed = JSON.parse(sessionStr);
    return parsed?.token || parsed?.access_token || parsed?.user?.token || '';
  } catch(e) { return ''; }
}

interface ChartDataPoint {
  label: string;
  value: number;
}

interface VolumeLineChartProps {
  activeAgentId?: string;
}

export const VolumeLineChart: React.FC<VolumeLineChartProps> = ({ activeAgentId }) => {
  const { kpisByAgent, loadingByAgent, fetchKpis, startDate, endDate, error: globalError } = useKpis();

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [cardHovered, setCardHovered] = useState(false);

  const [totalDossiersPrev, setTotalDossiersPrev] = useState<number | null>(null);
  const [prevYear, setPrevYear] = useState<number>(new Date().getFullYear() - 1);

  // Read current active data from Context
  const agentData = kpisByAgent["vdata"] || kpisByAgent["VDATA"] || {};
  const toolData = agentData.get_dossier_volume_evolution || agentData || {};

  const activeData: ChartDataPoint[] = toolData.chart?.data || [];
  const totalDossiersCurrent = activeData.reduce((acc, d) => acc + d.value, 0);

  const loading = (loadingByAgent["vdata"] || loadingByAgent["VDATA"]) && !toolData.ok;
  const error = !loading && !toolData.ok && globalError ? globalError : "";

  const fetchPrevYearVolume = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://localhost:3001";
      const clientId = process.env.NEXT_PUBLIC_CLIENT_ID || "DEMO";
      const pYear = parseInt(startDate.substring(0, 4)) - 1;
      setPrevYear(pYear);
      const prevStart = `${pYear}${startDate.substring(4)}`;
      const prevEnd = `${pYear}${endDate.substring(4)}`;

      const response = await fetch(`${baseUrl}/api/tools/get-dossier-volume-evolution`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          client_id: clientId,
          startDate: prevStart,
          endDate: prevEnd
        }),
      });

      if (response.ok) {
        const resJson = await response.json();
        if (resJson.ok && resJson.data && resJson.data.chart && resJson.data.chart.data) {
          const sum = resJson.data.chart.data.reduce((acc: number, d: any) => acc + d.value, 0);
          setTotalDossiersPrev(sum);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch prev year volume:", e);
    }
  };

  useEffect(() => {
    if (activeAgentId === 'VDATA' && startDate && endDate) {
      const timer = setTimeout(() => {
        fetchPrevYearVolume();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [activeAgentId, startDate, endDate]);

  if (activeAgentId !== 'VDATA') return null;

  // Chart dimensions & layout
  const width = 248;
  const height = 55;
  const paddingX = 12;
  const paddingY = 8;

  const chartWidth = width - (paddingX * 2);
  const chartHeight = height - (paddingY * 2);

  const chartDataPoints = activeData;
  const maxVal = chartDataPoints.length > 0 ? Math.max(...chartDataPoints.map(d => d.value)) : 0;
  const displayMax = maxVal === 0 ? 10 : Math.ceil(maxVal * 1.15); // Add margin at the top

  // Calculate coordinates for SVG
  const points = chartDataPoints.map((d, i) => {
    const x = paddingX + (i * (chartWidth / (chartDataPoints.length - 1 || 1)));
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
    <div 
      className="volume-line-chart-wrapper" 
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => setCardHovered(false)}
      style={{ 
        marginTop: '16px', 
        position: 'relative',
        padding: '16px',
        backgroundColor: cardHovered ? "rgba(6, 17, 31, 0.85)" : "rgba(6, 17, 31, 0.7)",
        backgroundImage: `
          radial-gradient(rgba(0, 240, 255, 0.04) 1px, transparent 0),
          radial-gradient(rgba(0, 240, 255, 0.02) 1px, transparent 0)
        `,
        backgroundSize: "12px 12px",
        backgroundPosition: "0 0, 6px 6px",
        border: cardHovered ? "1px solid rgba(0, 240, 255, 0.35)" : "1px solid rgba(0, 240, 255, 0.16)",
        borderRadius: "8px",
        boxShadow: cardHovered 
          ? "0 10px 35px rgba(0, 0, 0, 0.55), inset 0 0 16px rgba(0, 240, 255, 0.08), 0 0 15px rgba(0, 240, 255, 0.1)" 
          : "0 10px 35px rgba(0, 0, 0, 0.55), inset 0 0 16px rgba(0, 240, 255, 0.04)",
        transform: cardHovered ? "translateY(-1px) scale(1.005)" : "none",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        overflow: "hidden",
        cursor: "pointer",
      }}
    >
      {/* Glowing Corner Brackets */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "10px", height: "10px", borderTop: "2px solid #00f0ff", borderLeft: "2px solid #00f0ff", borderRadius: "2px 0 0 0", boxShadow: "0 0 5px rgba(0, 240, 255, 0.4)" }} />
      <div style={{ position: "absolute", top: 0, right: 0, width: "10px", height: "10px", borderTop: "2px solid #00f0ff", borderRight: "2px solid #00f0ff", borderRadius: "0 2px 0 0", boxShadow: "0 0 5px rgba(0, 240, 255, 0.4)" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, width: "10px", height: "10px", borderBottom: "2px solid #00f0ff", borderLeft: "2px solid #00f0ff", borderRadius: "0 0 0 2px", boxShadow: "0 0 5px rgba(0, 240, 255, 0.4)" }} />
      <div style={{ position: "absolute", bottom: 0, right: 0, width: "10px", height: "10px", borderBottom: "2px solid #00f0ff", borderRight: "2px solid #00f0ff", borderRadius: "0 0 2px 0", boxShadow: "0 0 5px rgba(0, 240, 255, 0.4)" }} />

      <div style={{ fontSize: '9px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>VOLUME DOSSIERS</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
        {loading ? (
          <SkeletonLoader height="22px" width="100px" />
        ) : (
          <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--white)", fontFamily: "var(--font-body)", lineHeight: 1.1 }}>
            {totalDossiersCurrent !== 0 ? `${totalDossiersCurrent} dossiers` : "— dossiers"}
          </div>
        )}
        {!loading && totalDossiersCurrent !== 0 && totalDossiersPrev !== null && (
          <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
            vs {prevYear} : <span style={{ color: "var(--white)", fontWeight: 600 }}>{totalDossiersPrev}</span>
            {(() => {
              const diff = totalDossiersCurrent - totalDossiersPrev;
              const pct = totalDossiersPrev > 0 ? (diff / totalDossiersPrev) * 100 : 0;
              const color = diff >= 0 ? "var(--green)" : "var(--red)";
              const sign = diff >= 0 ? "▲ +" : "▼ ";
              return (
                <span style={{ color, fontWeight: 700, marginLeft: "4px" }}>
                  ({sign}{pct.toFixed(1)}%)
                </span>
              );
            })()}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ height: '72px', display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
          <SkeletonLoader height="40px" width="100%" />
          <SkeletonLoader height="12px" width="60%" />
        </div>
      ) : error ? (
        <div style={{ height: '72px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 71, 87, 0.02)', borderRadius: '4px', border: '1px dashed rgba(255, 71, 87, 0.15)', padding: '8px' }}>
          <div style={{ fontSize: '8px', fontFamily: 'var(--font-mono)', color: 'var(--red)', textAlign: 'center', marginBottom: '4px' }}>{error}</div>
          <button onClick={() => fetchKpis('vdata', true, 'get_dossier_volume_evolution')} style={{ background: 'none', border: 'none', color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: '8px', textDecoration: 'underline', cursor: 'pointer' }}>Réessayer</button>
        </div>
      ) : chartDataPoints.length === 0 ? (
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
                left: `${Math.max(10, Math.min(width - 150, points[hoveredIndex].x - 75))}px`,
                top: `${points[hoveredIndex].y - 42}px`,
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
                backdropFilter: 'blur(4px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <div>
                <span style={{ color: 'var(--muted)' }}>{points[hoveredIndex].label}</span> : <strong style={{ color: 'var(--cyan)' }}>{points[hoveredIndex].value}</strong> dossiers
              </div>
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
            <span>{chartDataPoints.length > 0 ? getShortLabel(chartDataPoints[0].label) : ''}</span>
            <span>{chartDataPoints.length > 0 ? getShortLabel(chartDataPoints[Math.floor(chartDataPoints.length / 2)].label) : ''}</span>
            <span>{chartDataPoints.length > 0 ? `${getShortLabel(chartDataPoints[chartDataPoints.length - 1].label)} ●` : ''}</span>
          </div>
        </div>
      )}
    </div>
  );
};
