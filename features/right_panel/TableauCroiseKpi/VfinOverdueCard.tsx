"use client";

import React, { useEffect, useState, useRef } from "react";
import { useKpis } from "../../../shared/contexts/KpiCacheContext";
import { SkeletonLoader } from "@/components/vmind/SkeletonLoader";

interface UnpaidInterval {
  key: string;
  label: string;
  color: string;
  amount: number;
  amountFormatted: string;
  percentage: number;
  nbClients: number;
}

interface VfinOverdueCardProps {
  activeAgentId?: string;
}

export const VfinOverdueCard: React.FC<VfinOverdueCardProps> = ({ activeAgentId }) => {
  const { kpisByAgent, loadingByAgent, fetchKpis, error: globalError } = useKpis();
  const [hovered, setHovered] = useState(false);
  const [activeIntervalKey, setActiveIntervalKey] = useState<string | null>(null);
  const [donutHovered, setDonutHovered] = useState(false);
  const [animProgress, setAnimProgress] = useState(0);

  const cardRef = useRef<HTMLDivElement>(null);

  // Read current active data from Context
  const agentData = kpisByAgent["vfin"] || {};
  const toolData = agentData.get_overdue_balance || {};

  const kpis = toolData.ok && toolData.kpis ? toolData.kpis : [];
  const intervals: UnpaidInterval[] = toolData.intervals || toolData.data?.intervals || [];

  const totalKpi = kpis.find((k: any) => k.label.toLowerCase().includes("montant"));
  const clientsKpi = kpis.find((k: any) => k.label.toLowerCase().includes("client"));

  const totalImpayes = totalKpi ? totalKpi.value : 0;
  const totalFormatted = totalKpi ? totalKpi.display : "0,00";
  const nbClients = clientsKpi ? clientsKpi.value : 0;

  const loading = loadingByAgent["vfin"] && !toolData.ok;
  const error = !loading && !toolData.ok && globalError ? globalError : "";

  // Count-up progress animation
  useEffect(() => {
    if (loading || totalImpayes === 0) return;
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
  }, [totalImpayes, loading]);

  if (activeAgentId !== "VFIN") {
    return null;
  }

  const themeColor = "#FF4757"; // Coral/Red highlight matching the Outstanding/Overdue Debt theme
  const fmt = (n: number) => n.toLocaleString("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  const formatCompact = (val: number): string => {
    if (val >= 1000000) {
      return (val / 1000000).toFixed(1) + "M";
    } else if (val >= 1000) {
      return (val / 1000).toFixed(1) + "K";
    }
    return val.toLocaleString("fr-TN", { maximumFractionDigits: 0 });
  };

  // Math for Premium SVG Donut
  const radius = 28;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius; // 175.93

  let cumulativePercentage = 0;
  const segmentCircles = intervals.map((item) => {
    // Resolve CSS variables to actual hex colors for consistent SVG rendering
    const resolvedColor = item.color === "var(--red)" ? "#FF4757" : item.color === "var(--green)" ? "#1D9E75" : item.color;
    
    const gapLength = totalImpayes > 0 && item.percentage > 0 ? 2.5 : 0; 
    const segmentLength = (item.percentage / 100) * circumference;
    const dashArray = `${Math.max(0, segmentLength - gapLength)} ${circumference}`;
    const rotation = (cumulativePercentage / 100) * 360 - 90;
    cumulativePercentage += item.percentage;

    return {
      ...item,
      color: resolvedColor,
      dashArray,
      rotation
    };
  });

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        marginTop: "16px",
        overflow: "hidden",
        padding: "16px",
        backgroundColor: hovered ? "rgba(6, 17, 31, 0.85)" : "rgba(6, 17, 31, 0.7)",
        backgroundImage: `
          radial-gradient(${themeColor}08 1px, transparent 0),
          radial-gradient(${themeColor}03 1px, transparent 0)
        `,
        backgroundSize: "12px 12px",
        backgroundPosition: "0 0, 6px 6px",
        border: hovered ? `1px solid ${themeColor}60` : `1px solid ${themeColor}2b`,
        borderRadius: "8px",
        boxShadow: hovered 
          ? `0 10px 35px rgba(0, 0, 0, 0.55), inset 0 0 16px ${themeColor}15, 0 0 15px ${themeColor}20` 
          : `0 10px 35px rgba(0, 0, 0, 0.55), inset 0 0 16px ${themeColor}08`,
        transform: hovered ? "translateY(-1px) scale(1.005)" : "none",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Glowing Corner Brackets */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "10px", height: "10px", borderTop: `2px solid ${themeColor}`, borderLeft: `2px solid ${themeColor}`, borderRadius: "2px 0 0 0", boxShadow: `0 0 5px ${themeColor}60` }} />
      <div style={{ position: "absolute", top: 0, right: 0, width: "10px", height: "10px", borderTop: `2px solid ${themeColor}`, borderRight: `2px solid ${themeColor}`, borderRadius: "0 2px 0 0", boxShadow: `0 0 5px ${themeColor}60` }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, width: "10px", height: "10px", borderBottom: `2px solid ${themeColor}`, borderLeft: `2px solid ${themeColor}`, borderRadius: "0 0 0 2px", boxShadow: `0 0 5px ${themeColor}60` }} />
      <div style={{ position: "absolute", bottom: 0, right: 0, width: "10px", height: "10px", borderBottom: `2px solid ${themeColor}`, borderRight: `2px solid ${themeColor}`, borderRadius: "0 0 2px 0", boxShadow: `0 0 5px ${themeColor}60` }} />
      
      {/* scanline top */}
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
          marginBottom: "16px",
          fontWeight: 600,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>Répartition des impayés</span>
      </div>

      {loading ? (
        <div style={{ display: "flex", gap: "16px", alignItems: "center", padding: "8px 0" }}>
          <SkeletonLoader height="72px" width="72px" style={{ borderRadius: "50%" }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
            <SkeletonLoader height="16px" width="80%" />
            <SkeletonLoader height="12px" width="50%" />
            <SkeletonLoader height="10px" width="60%" />
          </div>
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
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* SVG Donut */}
          <div 
            style={{ position: "relative", width: "72px", height: "72px", flexShrink: 0 }}
            onMouseEnter={() => setDonutHovered(true)}
            onMouseLeave={() => {
              setDonutHovered(false);
              setActiveIntervalKey(null);
            }}
          >
            <svg width="72" height="72" viewBox="0 0 72 72">
              <defs>
                <filter id="donutGlow">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {/* Back track ring */}
              <circle cx="36" cy="36" r={radius} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={strokeWidth} />
              
              {segmentCircles.map((seg, idx) => {
                const isActive = activeIntervalKey === seg.key;
                const isAnyActive = activeIntervalKey !== null;
                const strokeOp = isAnyActive ? (isActive ? 1.0 : 0.25) : 0.85;
                
                return (
                  <circle
                    key={seg.key}
                    cx="36"
                    cy="36"
                    r={radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={isActive ? strokeWidth + 2.0 : strokeWidth}
                    strokeDasharray={seg.dashArray}
                    transform={`rotate(${seg.rotation} 36 36)`}
                    strokeLinecap="round"
                    style={{
                      transition: "all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)",
                      cursor: "pointer",
                      opacity: strokeOp,
                      filter: isActive ? "url(#donutGlow)" : "none"
                    }}
                    onMouseEnter={() => setActiveIntervalKey(seg.key)}
                  />
                );
              })}
            </svg>
            
            {/* Center Summary details */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                pointerEvents: "none"
              }}
            >
              {activeIntervalKey ? (
                (() => {
                  const activeSeg = intervals.find(i => i.key === activeIntervalKey);
                  return (
                    <>
                      <span style={{ fontSize: "10px", fontWeight: 800, color: "#ffffff", fontFamily: "var(--font-mono)" }}>
                        {activeSeg ? `${activeSeg.percentage.toFixed(0)}%` : ""}
                      </span>
                      <span style={{ fontSize: "6px", color: "var(--muted)", fontWeight: 500, fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
                        {activeSeg ? activeSeg.label : ""}
                      </span>
                    </>
                  );
                })()
              ) : (
                <>
                  <span style={{ fontSize: "9px", fontWeight: 800, color: "#ffffff", fontFamily: "var(--font-mono)" }}>
                    {formatCompact(totalImpayes)}
                  </span>
                  <span style={{ fontSize: "6px", color: "var(--muted)", fontWeight: 500, fontFamily: "var(--font-mono)" }}>
                    TOTAL
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Legend Grid */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
            {segmentCircles.map((seg) => {
              const isActive = activeIntervalKey === seg.key;
              const isAnyActive = activeIntervalKey !== null;
              const textOpacity = isAnyActive ? (isActive ? 1.0 : 0.35) : 0.85;

              return (
                <div
                  key={seg.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "8px",
                    fontFamily: "var(--font-mono)",
                    cursor: "pointer",
                    opacity: textOpacity,
                    transition: "opacity 0.2s"
                  }}
                  onMouseEnter={() => setActiveIntervalKey(seg.key)}
                  onMouseLeave={() => setActiveIntervalKey(null)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", minWidth: 0 }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "1px", background: seg.color, flexShrink: 0 }} />
                    <span style={{ color: "var(--muted)", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {seg.label}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                    <span style={{ color: "var(--white)", fontWeight: 600 }}>
                      {seg.amountFormatted}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
