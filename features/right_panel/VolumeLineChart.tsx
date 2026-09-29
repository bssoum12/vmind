"use client";

import React, { useEffect, useState } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';
import { useKpis } from '../../shared/contexts/KpiCacheContext';
import { AnimatedNumber } from './TableauCroiseKpi/AnimatedNumber';

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

  const effectiveLoading = (loadingByAgent["vdata"] || loadingByAgent["VDATA"]) && !toolData.ok;
  const error = !effectiveLoading && !toolData.ok && globalError ? globalError : "";

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
  const height = 65;
  const paddingX = 10;
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

  const isPositiveVsPrev = totalDossiersPrev !== null ? totalDossiersCurrent >= totalDossiersPrev : true;
  const diffPctVsPrev = totalDossiersPrev && totalDossiersPrev > 0
    ? Math.abs(((totalDossiersCurrent - totalDossiersPrev) / totalDossiersPrev) * 100)
    : 0;

  return (
    <div 
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => setCardHovered(false)}
      style={{ 
        background: 'linear-gradient(145deg, rgba(13, 17, 26, 0.96) 0%, rgba(10, 20, 30, 0.96) 100%)',
        border: '1px solid rgba(0, 240, 255, 0.3)',
        borderRadius: '16px',
        padding: '16px 18px',
        color: '#fff',
        boxShadow: '0 10px 35px rgba(0, 0, 0, 0.55), inset 0 0 20px rgba(0, 240, 255, 0.05)',
        backdropFilter: 'blur(16px)',
        position: 'relative',
        overflow: 'visible',
        marginBottom: '16px'
      }}
    >
      {/* Top Header Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '9px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            color: '#E2E8F0'
          }}>
            VOLUME DOSSIERS
          </span>
          <span style={{
            fontSize: '9px',
            fontWeight: 800,
            color: '#00E5C8',
            background: 'rgba(0, 229, 200, 0.15)',
            border: '1px solid rgba(0, 229, 200, 0.35)',
            padding: '1px 6px',
            borderRadius: '4px',
            letterSpacing: '0.5px'
          }}>
            VDATA
          </span>
        </div>

        <button
          onClick={() => fetchKpis('vdata', true, 'get_dossier_volume_evolution')}
          title="Rafraîchir KPI via n8n"
          disabled={effectiveLoading}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748B',
            cursor: effectiveLoading ? 'not-allowed' : 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#00f0ff'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#64748B'}
        >
          <RefreshCw size={12} className={effectiveLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {effectiveLoading ? (
        <div style={{
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          color: '#64748B',
          fontSize: '11px'
        }}>
          <RefreshCw size={14} className="animate-spin" />
          <span>Chargement de l'évolution du volume...</span>
        </div>
      ) : error ? (
        <div style={{
          padding: '14px',
          fontSize: '11px',
          color: '#EF4444',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '8px'
        }}>
          {error}
        </div>
      ) : (
        <div style={{
          background: cardHovered
            ? 'linear-gradient(135deg, rgba(0, 240, 255, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%)'
            : 'rgba(255, 255, 255, 0.02)',
          border: cardHovered
            ? '1px solid rgba(0, 240, 255, 0.4)'
            : '1px solid rgba(255, 255, 255, 0.07)',
          borderRadius: '14px',
          padding: '14px 16px',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
            <div>
              <div style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '2px' }}>
                TOTAL DOSSIERS TRAITÉS
              </div>
              <div style={{ fontSize: "20px", fontWeight: 900, color: "#FFFFFF", fontFamily: "monospace", lineHeight: 1.1 }}>
                {totalDossiersCurrent !== 0 ? (
                  <AnimatedNumber value={totalDossiersCurrent} formatter={(v) => `${Math.round(v)} dossiers`} />
                ) : (
                  "— dossiers"
                )}
              </div>
            </div>

            {totalDossiersCurrent !== 0 && totalDossiersPrev !== null && (
              <div style={{
                fontSize: "9px",
                fontFamily: "var(--font-mono)",
                color: isPositiveVsPrev ? '#10B981' : '#FF4757',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                background: isPositiveVsPrev ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 71, 87, 0.12)',
                border: isPositiveVsPrev ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 71, 87, 0.3)',
                padding: '2px 6px',
                borderRadius: '4px'
              }}>
                {isPositiveVsPrev ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                <span>{isPositiveVsPrev ? '+' : '-'}{diffPctVsPrev.toFixed(1)}% vs {prevYear}</span>
              </div>
            )}
          </div>

          {chartDataPoints.length === 0 ? (
            <div style={{ height: '65px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: '10px' }}>
              Aucune donnée disponible
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              {/* Custom HTML Tooltip on hover */}
              {hoveredIndex !== null && points[hoveredIndex] && (
                <div 
                  style={{
                    position: 'absolute',
                    left: `${Math.max(10, Math.min(width - 150, points[hoveredIndex].x - 60))}px`,
                    top: `${points[hoveredIndex].y - 36}px`,
                    background: 'rgba(10, 24, 40, 0.95)',
                    border: '1px solid #00f0ff',
                    boxShadow: '0 0 12px rgba(0, 240, 255, 0.3)',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '9px',
                    fontFamily: 'var(--font-mono)',
                    color: '#fff',
                    pointerEvents: 'none',
                    zIndex: 10,
                    whiteSpace: 'nowrap',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <span style={{ color: '#94A3B8' }}>{points[hoveredIndex].label}</span> : <strong style={{ color: '#00f0ff' }}>{points[hoveredIndex].value}</strong> dossiers
                </div>
              )}

              {/* SVG Chart */}
              <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }}>
                <defs>
                  <filter id="volume-neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  <linearGradient id="volume-chart-glow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Gridlines */}
                <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="rgba(0, 240, 255, 0.08)" strokeWidth="1" />
                <line x1={paddingX} y1={paddingY + chartHeight / 2} x2={width - paddingX} y2={paddingY + chartHeight / 2} stroke="rgba(0, 240, 255, 0.05)" strokeWidth="1" strokeDasharray="2 2" />
                <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="rgba(0, 240, 255, 0.12)" strokeWidth="1" />

                {/* Area under the line */}
                {areaPath && (
                  <path d={areaPath} fill="url(#volume-chart-glow)" />
                )}

                {/* Main Path Line */}
                {linePath && (
                  <path 
                    d={linePath} 
                    fill="none" 
                    stroke="#00f0ff" 
                    strokeWidth="2" 
                    filter="url(#volume-neon-glow)" 
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
                      fill={isHovered ? "#00f0ff" : "#0A192F"}
                      stroke="#00f0ff"
                      strokeWidth={isHovered ? 2 : 1.2}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#64748B', fontFamily: 'var(--font-mono)', marginTop: '4px', padding: `0 ${paddingX}px` }}>
                <span>{chartDataPoints.length > 0 ? getShortLabel(chartDataPoints[0].label) : ''}</span>
                <span>{chartDataPoints.length > 0 ? getShortLabel(chartDataPoints[Math.floor(chartDataPoints.length / 2)].label) : ''}</span>
                <span style={{ color: '#00f0ff', fontWeight: 700 }}>{chartDataPoints.length > 0 ? `${getShortLabel(chartDataPoints[chartDataPoints.length - 1].label)} ●` : ''}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
