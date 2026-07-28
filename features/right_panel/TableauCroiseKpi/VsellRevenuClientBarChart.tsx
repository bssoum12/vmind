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

interface ClientRevenue {
  rank: number;
  client: string;
  caTotal: number;
  caTotalFormatted: string;
  nbDossiers: number;
}

interface VsellRevenuClientBarChartProps {
  activeAgentId?: string;
}

export const VsellRevenuClientBarChart: React.FC<VsellRevenuClientBarChartProps> = ({ activeAgentId }) => {
  const { kpisByAgent, loadingByAgent, fetchKpis, error: globalError } = useKpis();
  const [hovered, setHovered] = useState(false);
  const [animProgress, setAnimProgress] = useState(0);

  // Read n8n context data
  const agentData = kpisByAgent["vsell"] || kpisByAgent["VSELL"] || {};
  const toolData = agentData.get_top_clients_revenue || {};
  const clients: ClientRevenue[] = toolData.ok && Array.isArray(toolData.data) 
    ? toolData.data 
    : (Array.isArray(agentData.top_clients) ? agentData.top_clients : []);
  const period: string = toolData.period || agentData.period || "";

  const loading = loadingByAgent["vsell"] || loadingByAgent["VSELL"] || false;
  const error = !loading && clients.length === 0 && globalError ? globalError : null;

  // Count-up progress animation
  useEffect(() => {
    if (loading || clients.length === 0) return;
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
  }, [clients, loading]);

  if (activeAgentId !== "VSELL") {
    return null;
  }

  const themeColor = "#FFB800"; // Warm Amber/Gold highlight matching VSELL theme
  const maxCa = clients.length > 0 ? Math.max(...clients.map(c => c.caTotal)) : 1;

  return (
    <div
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
        cursor: "pointer",
      }}
    >
      {/* Glowing Corner Brackets */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "10px", height: "10px", borderTop: `2px solid ${themeColor}`, borderLeft: `2px solid ${themeColor}`, borderRadius: "2px 0 0 0", boxShadow: `0 0 5px ${themeColor}60` }} />
      <div style={{ position: "absolute", top: 0, right: 0, width: "10px", height: "10px", borderTop: `2px solid ${themeColor}`, borderRight: `2px solid ${themeColor}`, borderRadius: "0 2px 0 0", boxShadow: `0 0 5px ${themeColor}60` }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, width: "10px", height: "10px", borderBottom: `2px solid ${themeColor}`, borderLeft: `2px solid ${themeColor}`, borderRadius: "0 0 0 2px", boxShadow: `0 0 5px ${themeColor}60` }} />
      <div style={{ position: "absolute", bottom: 0, right: 0, width: "10px", height: "10px", borderBottom: `2px solid ${themeColor}`, borderRight: `2px solid ${themeColor}`, borderRadius: "0 0 2px 0", boxShadow: `0 0 2px 0` }} />
      
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
          marginBottom: "16px",
          fontWeight: 600,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>Revenu par Client (Top 5)</span>
        <span style={{ color: themeColor, fontSize: "8px", fontWeight: 700 }}>GRAPH</span>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "8px 0" }}>
          <SkeletonLoader height="28px" width="100%" />
          <SkeletonLoader height="28px" width="100%" />
          <SkeletonLoader height="28px" width="100%" />
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
      ) : clients.length === 0 ? (
        <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "var(--muted)", padding: "4px 0" }}>
          AUCUNE DONNÉE POUR CE MOIS
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {clients.map((c) => {
            const pct = maxCa > 0 ? (c.caTotal / maxCa) * 100 : 0;
            return (
              <div key={c.rank} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {/* Client Label and Value */}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", fontFamily: "var(--font-mono)" }}>
                  <span style={{ color: "var(--white)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }} title={c.client}>
                    {c.client}
                  </span>
                  <span style={{ color: themeColor, fontWeight: 700 }}>
                    {c.caTotalFormatted} <span style={{ fontSize: "8px", color: "var(--muted)", fontWeight: 500 }}>TND</span>
                  </span>
                </div>
                {/* Bar line */}
                <div 
                  style={{ 
                    height: "6px", 
                    background: "rgba(255,255,255,0.03)", 
                    borderRadius: "3px", 
                    overflow: "hidden", 
                    border: "1px solid rgba(255,255,255,0.05)",
                    position: "relative" 
                  }}
                >
                  <div 
                    style={{ 
                      height: "100%", 
                      width: `${pct * animProgress}%`, 
                      background: `linear-gradient(90deg, ${themeColor}10, ${themeColor})`, 
                      borderRadius: "3px",
                      boxShadow: `0 0 6px ${themeColor}40`,
                      transition: "width 0.1s ease-out"
                    }} 
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Divider */}
      <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.06)", margin: "8px 0" }} />

      {/* Footer */}
      <div style={{ fontSize: "8px", color: "var(--muted)", fontFamily: "var(--font-mono)", display: "flex", justifyContent: "space-between" }}>
        <span>{period ? period.toUpperCase() : "—"}</span>
        <span>SUIVI DE FRET</span>
      </div>
    </div>
  );
};
