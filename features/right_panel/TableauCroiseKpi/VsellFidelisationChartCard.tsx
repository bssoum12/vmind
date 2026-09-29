"use client";

import React, { useEffect, useState } from "react";
import { useKpis } from "../../../shared/contexts/KpiCacheContext";
import { SkeletonLoader } from "@/components/vmind/SkeletonLoader";

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

interface TrendPoint {
  label: string;
  rate: number;
  ratePrev: number;
  activeClients: number;
  totalClients: number;
  activeClientsPrev: number;
  totalClientsPrev: number;
}

interface VsellFidelisationChartCardProps {
  activeAgentId?: string;
}

export const VsellFidelisationChartCard: React.FC<VsellFidelisationChartCardProps> = ({ activeAgentId }) => {
  const { kpisByAgent, loadingByAgent, fetchKpis, error: globalError } = useKpis();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [cardHovered, setCardHovered] = useState(false);
  const [animProgress, setAnimProgress] = useState(0);

  // Read n8n context data
  const agentData = kpisByAgent["vsell"] || kpisByAgent["VSELL"] || {};
  const toolData = agentData.get_fidelisation_rate_trend || {};
  const data: TrendPoint[] = toolData.ok && Array.isArray(toolData.data) 
    ? toolData.data 
    : (Array.isArray(agentData.fidelisation_trend) ? agentData.fidelisation_trend : []);
  const averageRate: number = typeof toolData.averageRate === 'number' 
    ? toolData.averageRate 
    : (typeof agentData.fidelisation_average === 'number' ? agentData.fidelisation_average : 0);

  const loading = loadingByAgent["vsell"] || loadingByAgent["VSELL"] || false;
  const error = !loading && data.length === 0 && globalError ? globalError : null;

  // Count-up progress animation
  useEffect(() => {
    if (loading || !Array.isArray(data) || data.length === 0) return;
    setAnimProgress(0);
    const duration = 1200;
    const start = performance.now();
    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = t * (2 - t);
      setAnimProgress(ease);
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [data, loading]);

  if (activeAgentId !== "VSELL") {
    return null;
  }

  const themeColor = "#FFB800"; // Warm Amber/Gold highlight matching VSELL theme

  // Chart layout dimensions
  const cardWidth = 248;
  const chartHeight = 65;
  const paddingX = 10;
  const paddingY = 8;
  const plotWidth = cardWidth - (paddingX * 2);
  const plotHeight = chartHeight - (paddingY * 2);

  const safeData = Array.isArray(data) ? data : [];
  const rates = safeData.flatMap(d => [d.rate, d.ratePrev]);
  const maxVal = rates.length > 0 ? Math.max(...rates) : 100;
  const minVal = rates.length > 0 ? Math.min(...rates) : 0;
  
  // Calculate padded vertical bounds
  const valMin = Math.max(0, minVal - 5);
  const valMax = Math.min(100, maxVal + 5);
  const valRange = valMax - valMin === 0 ? 100 : (valMax - valMin);

  const points = safeData.map((d, i) => {
    const x = paddingX + (i * (plotWidth / (safeData.length - 1 || 1)));
    const yRate = paddingY + plotHeight - (((d.rate - valMin) / valRange) * plotHeight);
    const yRatePrev = paddingY + plotHeight - (((d.ratePrev - valMin) / valRange) * plotHeight);
    return { x, yRate, yRatePrev, ...d };
  });

  const rateLinePath = points.length > 0 
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yRate.toFixed(1)}`).join(' ') 
    : '';

  const ratePrevLinePath = points.length > 0
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yRatePrev.toFixed(1)}`).join(' ')
    : '';

  return (
    <div
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => setCardHovered(false)}
      style={{
        position: "relative",
        marginTop: "16px",
        overflow: "visible",
        padding: "16px",
        backgroundColor: cardHovered ? "rgba(6, 17, 31, 0.85)" : "rgba(6, 17, 31, 0.7)",
        backgroundImage: `
          radial-gradient(${themeColor}08 1px, transparent 0),
          radial-gradient(${themeColor}03 1px, transparent 0)
        `,
        backgroundSize: "12px 12px",
        backgroundPosition: "0 0, 6px 6px",
        border: cardHovered ? `1px solid ${themeColor}60` : `1px solid ${themeColor}2b`,
        borderRadius: "8px",
        boxShadow: cardHovered 
          ? `0 10px 35px rgba(0, 0, 0, 0.55), inset 0 0 16px ${themeColor}15, 0 0 15px ${themeColor}20` 
          : `0 10px 35px rgba(0, 0, 0, 0.55), inset 0 0 16px ${themeColor}08`,
        transform: cardHovered ? "translateY(-1px) scale(1.005)" : "none",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        cursor: "pointer",
        zIndex: 10,
      }}
    >
      {/* Glowing Corner Brackets */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "10px", height: "10px", borderTop: `2px solid ${themeColor}`, borderLeft: `2px solid ${themeColor}`, borderRadius: "2px 0 0 0", boxShadow: `0 0 5px ${themeColor}60` }} />
      <div style={{ position: "absolute", top: 0, right: 0, width: "10px", height: "10px", borderTop: `2px solid ${themeColor}`, borderRight: `2px solid ${themeColor}`, borderRadius: "0 2px 0 0", boxShadow: `0 0 5px ${themeColor}60` }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, width: "10px", height: "10px", borderBottom: `2px solid ${themeColor}`, borderLeft: `2px solid ${themeColor}`, borderRadius: "0 0 0 2px", boxShadow: `0 0 5px ${themeColor}60` }} />
      <div style={{ position: "absolute", bottom: 0, right: 0, width: "10px", height: "10px", borderBottom: `2px solid ${themeColor}`, borderRight: `2px solid ${themeColor}`, borderRadius: "0 0 2px 0", boxShadow: `0 0 5px ${themeColor}60` }} />
      
      {/* Scanline top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1.5px",
          background: `linear-gradient(90deg, transparent, ${themeColor}, transparent)`,
          opacity: 0.7,
        }}
      />

      {/* Header */}
      <div
        style={{
          fontSize: "9px",
          color: "var(--muted)",
          fontFamily: "var(--font-mono)",
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          marginBottom: "6px",
          fontWeight: 600,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>Taux de fidélisation (%)</span>
        <span style={{ color: themeColor, fontSize: "8px", fontWeight: 700 }}>VSELL</span>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "8px 0" }}>
          <SkeletonLoader height="28px" width="50%" />
          <SkeletonLoader height="40px" width="100%" />
        </div>
      ) : error ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{ color: "var(--red)", fontSize: "9px", fontFamily: "var(--font-mono)" }}>
            {error}
          </span>
          <button
            onClick={() => fetchKpis('vsell', true)}
            style={{
              background: "none",
              border: "none",
              color: themeColor,
              cursor: "pointer",
              fontSize: "8px",
              fontFamily: "var(--font-mono)",
              textDecoration: "underline",
              padding: 0,
              textAlign: "left",
            }}
          >
            Réessayer
          </button>
        </div>
      ) : safeData.length === 0 ? (
        <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "var(--muted)", padding: "4px 0" }}>
          AUCUNE DONNÉE DISPONIBLE
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          
          {/* Main Average Value */}
          <div>
            <div
              style={{
                color: "var(--white)",
                fontSize: "24px",
                fontWeight: 800,
                marginBottom: "2px",
                lineHeight: 1,
                fontFamily: "var(--font-body)",
                display: "flex",
                alignItems: "baseline",
                gap: "4px",
              }}
            >
              <span>{(averageRate * animProgress).toFixed(2)}</span>
              <span style={{ fontSize: "14px", color: "var(--muted)", fontWeight: 600 }}>%</span>
            </div>
            <div style={{ fontSize: "7.5px", color: "var(--muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
              Moyenne des 6 derniers mois (12m glissants)
            </div>
          </div>

          {/* SVG Line Chart Container */}
          <div style={{ position: "relative", height: `${chartHeight}px`, marginTop: "4px" }}>
            
            {/* Hover Tooltip Overlay */}
            {hoveredIndex !== null && points[hoveredIndex] && (
              <div 
                style={{
                  position: 'absolute',
                  left: `${Math.max(10, Math.min(cardWidth - 145, points[hoveredIndex].x - 68))}px`,
                  top: `${Math.max(-45, points[hoveredIndex].yRate - 52)}px`,
                  background: 'rgba(10, 24, 40, 0.98)',
                  border: `1px solid ${themeColor}`,
                  boxShadow: `0 0 15px ${themeColor}40`,
                  borderRadius: '4px',
                  padding: '5px 8px',
                  fontSize: '8px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--white)',
                  pointerEvents: 'none',
                  zIndex: 20,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.1s ease',
                  backdropFilter: 'blur(6px)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '2px', marginBottom: '2px' }}>
                  <strong style={{ color: 'var(--white)' }}>{points[hoveredIndex].label}</strong>
                </div>
                 <div>
                  <span style={{ color: 'var(--muted)' }}>Taux Actuel :</span> <strong style={{ color: themeColor }}>{points[hoveredIndex].rate.toFixed(2)}%</strong>
                  <span style={{ color: 'var(--muted)', fontSize: '7.5px' }}> ({points[hoveredIndex].activeClients}/{points[hoveredIndex].totalClients})</span>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)' }}>Taux en {(() => {
                    const labelParts = points[hoveredIndex].label.split(" ");
                    const yearVal = parseInt(labelParts[1]);
                    return !isNaN(yearVal) ? yearVal - 1 : "N-1";
                  })()} :</span> <strong style={{ color: '#aaa' }}>{points[hoveredIndex].ratePrev.toFixed(2)}%</strong>
                  <span style={{ color: 'var(--muted)', fontSize: '7.5px' }}> ({points[hoveredIndex].activeClientsPrev}/{points[hoveredIndex].totalClientsPrev})</span>
                </div>
                {points[hoveredIndex].ratePrev !== undefined && (
                  <div style={{ color: (points[hoveredIndex].rate - points[hoveredIndex].ratePrev) >= 0 ? '#10b981' : '#ef4444', fontWeight: 700, marginTop: '1px' }}>
                    Evolution : {(points[hoveredIndex].rate - points[hoveredIndex].ratePrev) >= 0 ? '▲ +' : '▼ '}{Math.abs(points[hoveredIndex].rate - points[hoveredIndex].ratePrev).toFixed(2)}%
                  </div>
                )}
              </div>
            )}

            {/* SVG Plot */}
            <svg width="100%" height={chartHeight} viewBox={`0 0 ${cardWidth} ${chartHeight}`} style={{ display: 'block', overflow: 'visible' }}>
              
              {/* Grid Lines */}
              <line x1={paddingX} y1={paddingY} x2={cardWidth - paddingX} y2={paddingY} stroke="rgba(255,255,255,0.02)" strokeWidth="0.8" />
              <line x1={paddingX} y1={paddingY + plotHeight} x2={cardWidth - paddingX} y2={paddingY + plotHeight} stroke="rgba(255,255,255,0.05)" strokeWidth="0.8" />

              {/* Hover Vertical Guide Line */}
              {hoveredIndex !== null && points[hoveredIndex] && (
                <line 
                  x1={points[hoveredIndex].x} 
                  y1={paddingY} 
                  x2={points[hoveredIndex].x} 
                  y2={chartHeight - paddingY} 
                  stroke="rgba(255,255,255,0.12)" 
                  strokeDasharray="2 2" 
                  strokeWidth="1"
                />
              )}

              {/* Previous Year Line (Dimmed Grey/Dashed) */}
              {ratePrevLinePath && (
                <path 
                  d={ratePrevLinePath} 
                  fill="none" 
                  stroke="rgba(255, 255, 255, 0.2)" 
                  strokeWidth="1" 
                  strokeDasharray="3 3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Current Year Line (Glowing Gold/Amber) */}
              {rateLinePath && (
                <path 
                  d={rateLinePath} 
                  fill="none" 
                  stroke={themeColor} 
                  strokeWidth="1.8" 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Previous Year Dots */}
              {points.map((p, i) => (
                <circle
                  key={`dot-prev-${i}`}
                  cx={p.x}
                  cy={p.yRatePrev}
                  r={2}
                  fill="#777"
                  stroke="rgba(6, 17, 31, 0.95)"
                  strokeWidth="0.6"
                />
              ))}

              {/* Current Year Dots */}
              {points.map((p, i) => (
                <circle
                  key={`dot-curr-${i}`}
                  cx={p.x}
                  cy={p.yRate}
                  r={hoveredIndex === i ? 4 : 2.5}
                  fill={themeColor}
                  stroke="rgba(6, 17, 31, 0.95)"
                  strokeWidth="0.8"
                  style={{ transition: 'r 0.1s ease' }}
                />
              ))}

              {/* Invisible bars for hover triggers */}
              {points.map((p, i) => {
                const rectWidth = plotWidth / (points.length - 1 || 1);
                const xStart = p.x - (rectWidth / 2);
                return (
                  <rect
                    key={`trigger-${i}`}
                    x={xStart}
                    y={0}
                    width={rectWidth}
                    height={chartHeight}
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                );
              })}
            </svg>
          </div>

          {/* Chart Legend */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "7px", fontFamily: "var(--font-mono)" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <div style={{ width: "6px", height: "1.5px", backgroundColor: themeColor }} />
                <span style={{ color: "var(--muted)", textTransform: "uppercase" }}>Taux Actuel</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <div style={{ width: "6px", height: "1px", borderTop: "1px dashed rgba(255,255,255,0.4)" }} />
                <span style={{ color: "var(--muted)", textTransform: "uppercase" }}>
                  Année {(() => {
                    const lastPoint = safeData[safeData.length - 1];
                    if (!lastPoint) return "N-1";
                    const parts = lastPoint.label.split(" ");
                    const yr = parseInt(parts[1]);
                    return !isNaN(yr) ? (yr - 1) : "N-1";
                  })()}
                </span>
              </div>
            </div>
            <div style={{ color: "rgba(255,255,255,0.3)" }}>
              {safeData[0]?.label} → {safeData[safeData.length - 1]?.label}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
