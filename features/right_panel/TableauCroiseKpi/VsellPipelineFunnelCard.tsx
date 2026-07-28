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

interface PipelineStage {
  stageId: number;
  stageName: string;
  count: number;
  amount: number;
  amountFormatted: string;
}

interface VsellPipelineFunnelCardProps {
  activeAgentId?: string;
}

export const VsellPipelineFunnelCard: React.FC<VsellPipelineFunnelCardProps> = ({ activeAgentId }) => {
  const { kpisByAgent, loadingByAgent, fetchKpis, error: globalError } = useKpis();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [cardHovered, setCardHovered] = useState(false);
  const [animProgress, setAnimProgress] = useState(0);

  // Read n8n context data
  const agentData = kpisByAgent["vsell"] || kpisByAgent["VSELL"] || {};
  const toolData = agentData.get_pipeline_commercial_summary || {};
  const stages: PipelineStage[] = toolData.ok && Array.isArray(toolData.stages) 
    ? toolData.stages 
    : (Array.isArray(agentData.pipeline_summary?.stages) ? agentData.pipeline_summary.stages : []);
  const totalAmount: number = typeof toolData.totalPipelineAmount === 'number' 
    ? toolData.totalPipelineAmount 
    : (typeof agentData.pipeline_summary?.totalAmount === 'number' ? agentData.pipeline_summary.totalAmount : 0);
  const totalCount: number = typeof toolData.totalOpportunities === 'number' 
    ? toolData.totalOpportunities 
    : (typeof agentData.pipeline_summary?.totalOpportunities === 'number' ? agentData.pipeline_summary.totalOpportunities : 0);

  const loading = loadingByAgent["vsell"] || loadingByAgent["VSELL"] || false;
  const error = !loading && stages.length === 0 && globalError ? globalError : null;

  // Count-up progress animation
  useEffect(() => {
    if (loading || !Array.isArray(stages) || stages.length === 0) return;
    setAnimProgress(0);
    const duration = 1000;
    const start = performance.now();
    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = t * (2 - t);
      setAnimProgress(ease);
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [stages, loading]);

  if (activeAgentId !== "VSELL") {
    return null;
  }

  const themeColor = "#FFB800"; // Warm Amber/Gold matching VSELL
  const safeStages = Array.isArray(stages) ? stages : [];
  const maxAmount = safeStages.length > 0 ? Math.max(...safeStages.map(s => s.amount), 1) : 1;

  const fmtCurrency = (val: number) => 
    val.toLocaleString('fr-TN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
        <span>Pipeline Commercial (TND)</span>
        <span style={{ color: themeColor, fontSize: "8px", fontWeight: 700 }}>VSELL</span>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "8px 0" }}>
          <SkeletonLoader height="28px" width="50%" />
          <SkeletonLoader height="16px" width="100%" />
          <SkeletonLoader height="16px" width="100%" />
          <SkeletonLoader height="16px" width="100%" />
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
      ) : safeStages.length === 0 ? (
        <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "var(--muted)", padding: "4px 0" }}>
          AUCUNE OPPORTUNITÉ EN COURS
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          
          {/* Main Total Metric */}
          <div>
            <div
              style={{
                color: "var(--white)",
                fontSize: "22px",
                fontWeight: 800,
                marginBottom: "2px",
                lineHeight: 1,
                fontFamily: "var(--font-body)",
                display: "flex",
                alignItems: "baseline",
                gap: "4px",
              }}
            >
              <span>{fmtCurrency(totalAmount * animProgress)}</span>
              <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>TND</span>
            </div>
            <div style={{ fontSize: "7.5px", color: "var(--muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
              {totalCount} opportunité{totalCount > 1 ? 's' : ''} active{totalCount > 1 ? 's' : ''} en cours
            </div>
          </div>

          {/* Stages Funnel List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
            {safeStages.map((stg, i) => {
              const isHovered = hoveredIndex === i;
              const barPct = maxAmount > 0 ? Math.min(100, Math.max(8, (stg.amount / maxAmount) * 100)) : 0;
              
              // Stage color accents
              const stageColors = [
                "#3b82f6", // Prospection - Blue
                "#a855f7", // Analyses - Purple
                "#FFB800", // Proposition - Gold/Amber
                "#10b981", // Négociation - Emerald Green
              ];
              const accentColor = stageColors[i % stageColors.length];

              return (
                <div
                  key={stg.stageId}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "3px",
                    padding: "4px 6px",
                    borderRadius: "4px",
                    backgroundColor: isHovered ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.01)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "8.5px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          backgroundColor: accentColor,
                          boxShadow: `0 0 6px ${accentColor}`,
                          display: "inline-block"
                        }}
                      />
                      <span style={{ color: "var(--white)", fontWeight: 600, fontFamily: "var(--font-body)" }}>
                        {stg.stageName}
                      </span>
                      <span
                        style={{
                          fontSize: "7px",
                          padding: "1px 4px",
                          borderRadius: "3px",
                          backgroundColor: `${accentColor}18`,
                          color: accentColor,
                          border: `1px solid ${accentColor}40`,
                          fontFamily: "var(--font-mono)",
                          fontWeight: 700,
                        }}
                      >
                        {stg.count} opp.
                      </span>
                    </div>

                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        color: "var(--white)",
                        fontSize: "8.5px",
                      }}
                    >
                      {fmtCurrency(stg.amount * animProgress)} <span style={{ color: "var(--muted)", fontSize: "7px" }}>TND</span>
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div
                    style={{
                      height: "4px",
                      width: "100%",
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      borderRadius: "2px",
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${barPct * animProgress}%`,
                        background: `linear-gradient(90deg, ${accentColor}40, ${accentColor})`,
                        borderRadius: "2px",
                        boxShadow: isHovered ? `0 0 8px ${accentColor}` : 'none',
                        transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                    />
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
