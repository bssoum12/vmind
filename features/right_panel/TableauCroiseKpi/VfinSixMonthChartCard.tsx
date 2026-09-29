"use client";

import React, { useEffect, useState } from "react";
import { useKpis } from "../../../shared/contexts/KpiCacheContext";
import { SkeletonLoader } from "@/components/vmind/SkeletonLoader";

interface TrendDataPoint {
  annee: number;
  mois: number;
  label: string;
  ca: number;
  marge: number;
}

interface VfinSixMonthChartCardProps {
  activeAgentId?: string;
}

export const VfinSixMonthChartCard: React.FC<VfinSixMonthChartCardProps> = ({ activeAgentId }) => {
  const { kpisByAgent, loadingByAgent, fetchKpis, error: globalError } = useKpis();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [cardHovered, setCardHovered] = useState(false);

  // Read current active data from Context
  const agentData = kpisByAgent["vfin"] || {};
  const toolData = agentData.get_six_month_revenue_trend || {};

  const data: TrendDataPoint[] = Array.isArray(toolData.data) 
    ? toolData.data 
    : (toolData.data?.data || []);

  const loading = loadingByAgent["vfin"] && !toolData.ok;
  const error = !loading && !toolData.ok && globalError ? globalError : "";

  if (activeAgentId !== "VFIN") {
    return null;
  }

  const themeColor = "#1D9E75"; // Green highlight matching active VFIN agent

  // Chart dimensions & layout
  const cardWidth = 248;
  const chartHeight = 65;
  const paddingX = 10;
  const paddingY = 8;
  const plotWidth = cardWidth - (paddingX * 2);
  const plotHeight = chartHeight - (paddingY * 2);

  const allVals = data.flatMap(d => [d.ca, d.marge]);
  const maxVal = allVals.length > 0 ? Math.max(...allVals) : 0;
  const minVal = allVals.length > 0 ? Math.min(0, ...allVals) : 0;
  const valRange = maxVal - minVal === 0 ? 100000 : (maxVal - minVal) * 1.15;

  // Short labels formatting
  const getShortLabel = (label: string) => {
    const parts = label.split(" ");
    return parts[0] || label;
  };

  const points = data.map((d, i) => {
    const x = paddingX + (i * (plotWidth / (data.length - 1 || 1)));
    const yCa = paddingY + plotHeight - (((d.ca - minVal) / valRange) * plotHeight);
    const yMarge = paddingY + plotHeight - (((d.marge - minVal) / valRange) * plotHeight);
    return { x, yCa, yMarge, ...d };
  });

  const yBaseline = paddingY + plotHeight - (((0 - minVal) / valRange) * plotHeight);

  const caLinePath = points.length > 0 
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yCa.toFixed(1)}`).join(' ') 
    : '';

  const margeLinePath = points.length > 0
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yMarge.toFixed(1)}`).join(' ')
    : '';

  return (
    <div
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => setCardHovered(false)}
      style={{
        position: "relative",
        marginTop: "16px",
        overflow: "hidden",
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
      }}
    >
      {/* Glowing Corner Brackets */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "10px", height: "10px", borderTop: `2px solid ${themeColor}`, borderLeft: `2px solid ${themeColor}`, borderRadius: "2px 0 0 0", boxShadow: `0 0 5px ${themeColor}60` }} />
      <div style={{ position: "absolute", top: 0, right: 0, width: "10px", height: "10px", borderTop: `2px solid ${themeColor}`, borderRight: `2px solid ${themeColor}`, borderRadius: "0 2px 0 0", boxShadow: `0 0 5px ${themeColor}60` }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, width: "10px", height: "10px", borderBottom: `2px solid ${themeColor}`, borderLeft: `2px solid ${themeColor}`, borderRadius: "0 0 0 2px", boxShadow: `0 0 5px ${themeColor}60` }} />
      <div style={{ position: "absolute", bottom: 0, right: 0, width: "10px", height: "10px", borderBottom: `2px solid ${themeColor}`, borderRight: `2px solid ${themeColor}`, borderRadius: "0 0 2px 0", boxShadow: `0 0 5px ${themeColor}60` }} />
      
      {/* linear top scanline */}
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

      <div
        style={{
          fontSize: "9px",
          color: "var(--muted)",
          fontFamily: "var(--font-mono)",
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          marginBottom: "12px",
          fontWeight: 600,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>Évolution CA & Marge (6 mois)</span>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", height: "72px", justifyContent: "center" }}>
          <SkeletonLoader height="40px" width="100%" />
          <SkeletonLoader height="12px" width="60%" />
        </div>
      ) : error ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{ color: "var(--red)", fontSize: "9px", fontFamily: "var(--font-mono)" }}>
            {error}
          </span>
          <button
            onClick={() => fetchKpis('vfin', true)}
            style={{
              background: "none",
              border: "none",
              color: "var(--cyan)",
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
      ) : data.length === 0 ? (
        <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "var(--muted)", fontStyle: "italic" }}>
          Aucune donnée disponible
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          {/* Custom HTML Premium Tooltip */}
          {hoveredIndex !== null && points[hoveredIndex] && (
            <div 
              style={{
                position: 'absolute',
                left: `${Math.max(10, Math.min(cardWidth - 140, points[hoveredIndex].x - 65))}px`,
                top: `${points[hoveredIndex].yCa - 42}px`,
                background: 'rgba(10, 24, 40, 0.95)',
                border: `1px solid ${themeColor}`,
                boxShadow: `0 0 12px ${themeColor}40`,
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
                <strong style={{ color: 'var(--white)' }}>{points[hoveredIndex].label}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--muted)' }}>CA :</span> <strong style={{ color: themeColor }}>{points[hoveredIndex].ca.toLocaleString("fr-TN", { maximumFractionDigits: 0 })}</strong> TND
              </div>
              <div>
                <span style={{ color: 'var(--muted)' }}>Marge :</span> <strong style={{ color: '#ff7a00' }}>{points[hoveredIndex].marge.toLocaleString("fr-TN", { maximumFractionDigits: 0 })}</strong> TND
              </div>
            </div>
          )}

          {/* SVG Multi Line Chart */}
          <svg width="100%" height={chartHeight} viewBox={`0 0 ${cardWidth} ${chartHeight}`} style={{ display: 'block', overflow: 'visible' }}>
            <defs>
              <filter id="vfin-neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Grid lines */}
            <line x1={paddingX} y1={paddingY} x2={cardWidth - paddingX} y2={paddingY} stroke="rgba(255,255,255,0.03)" strokeWidth="0.8" />
            <line x1={paddingX} y1={paddingY + plotHeight} x2={cardWidth - paddingX} y2={paddingY + plotHeight} stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />

            {/* Zero Baseline Line (Dashed) */}
            {minVal < 0 && (
              <line 
                x1={paddingX} 
                y1={yBaseline} 
                x2={cardWidth - paddingX} 
                y2={yBaseline} 
                stroke="rgba(255,255,255,0.18)" 
                strokeDasharray="3 3" 
                strokeWidth="0.8" 
              />
            )}

            {/* Hover Vertical Guide Line */}
            {hoveredIndex !== null && points[hoveredIndex] && (
              <line 
                x1={points[hoveredIndex].x} 
                y1={paddingY} 
                x2={points[hoveredIndex].x} 
                y2={chartHeight - paddingY} 
                stroke="rgba(255,255,255,0.15)" 
                strokeDasharray="2 2" 
                strokeWidth="1"
              />
            )}

            {/* Marge Path Line (Neon Orange) - Drawn first (under) */}
            {margeLinePath && (
              <path 
                d={margeLinePath} 
                fill="none" 
                stroke="#ff7a00" 
                strokeWidth="1.5" 
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* CA Path Line (Green) - Drawn second (on top) */}
            {caLinePath && (
              <path 
                d={caLinePath} 
                fill="none" 
                stroke={themeColor} 
                strokeWidth="1.8" 
                filter="url(#vfin-neon-glow)" 
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Marge Data Points Dots - Drawn first */}
            {points.map((p, i) => (
              <circle
                key={`dot-marge-${i}`}
                cx={p.x}
                cy={p.yMarge}
                r={hoveredIndex === i ? 3.5 : 2}
                fill="#ff7a00"
                stroke="rgba(6, 17, 31, 0.95)"
                strokeWidth="0.8"
              />
            ))}

            {/* CA Data Points Dots - Drawn second (on top) */}
            {points.map((p, i) => (
              <circle
                key={`dot-ca-${i}`}
                cx={p.x}
                cy={p.yCa}
                r={hoveredIndex === i ? 3.5 : 2}
                fill={themeColor}
                stroke="rgba(6, 17, 31, 0.95)"
                strokeWidth="0.8"
              />
            ))}

            {/* Interactive invisible bars for hover triggers */}
            {points.map((p, i) => {
              const rectWidth = plotWidth / (points.length - 1 || 1);
              const xStart = p.x - (rectWidth / 2);
              return (
                <rect
                  key={`hover-${i}`}
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

          {/* Legend indicator badges */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "7px", fontFamily: "var(--font-mono)", marginTop: "4px" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <div style={{ width: "6px", height: "1.5px", backgroundColor: themeColor }} />
                <span style={{ color: "var(--muted)", textTransform: "uppercase" }}>CA</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <div style={{ width: "6px", height: "1.5px", backgroundColor: "#ff7a00" }} />
                <span style={{ color: "var(--muted)", textTransform: "uppercase" }}>Marge</span>
              </div>
            </div>
            
            <div style={{ color: "rgba(255,255,255,0.3)" }}>
              {getShortLabel(data[0].label)} → {getShortLabel(data[data.length - 1].label)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
