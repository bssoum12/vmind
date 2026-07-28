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

interface InactiveClientItem {
  rank: number;
  client: string;
  caTotalHistorique: number;
  caTotalHistoriqueFormatted: string;
  joursInactivite: number;
  totalDossiers: number;
  lastOpDate: string;
}

interface VsellInactiveClientsCardProps {
  activeAgentId?: string;
}

export const VsellInactiveClientsCard: React.FC<VsellInactiveClientsCardProps> = ({ activeAgentId }) => {
  const { kpisByAgent, loadingByAgent, fetchKpis, error: globalError } = useKpis();
  const [hovered, setHovered] = useState(false);
  const [animProgress, setAnimProgress] = useState(0);

  // Read n8n context data
  const agentData = kpisByAgent["vsell"] || kpisByAgent["VSELL"] || {};
  const toolData = agentData.get_clients_inactive_60_days || {};
  const clients: InactiveClientItem[] = toolData.ok && Array.isArray(toolData.data) 
    ? toolData.data 
    : (Array.isArray(agentData.inactive_clients) ? agentData.inactive_clients : []);

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
  const alertColor = "#ef4444"; // Red for inactivity alert
  const fmt = (n: number) => n.toLocaleString("fr-TN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
          marginBottom: "12px",
          fontWeight: 600,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>Clients Inactifs &gt; 60 Jours</span>
        <span style={{ color: alertColor, fontSize: "8px", fontWeight: 700 }}>RISQUE DE PERTE</span>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "8px 0" }}>
          <SkeletonLoader height="36px" width="100%" />
          <SkeletonLoader height="36px" width="100%" />
          <SkeletonLoader height="36px" width="100%" />
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
          AUCUN CLIENT INACTIF &gt; 60J TROUVÉ
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {clients.map((c) => (
            <div
              key={c.rank}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 8px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.04)",
                borderRadius: "4px",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.borderColor = `${themeColor}30`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)";
              }}
            >
              {/* Client Info (Rank & Name & Inactivity days) */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", marginRight: "10px" }}>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "8.5px",
                    fontWeight: 800,
                    fontFamily: "var(--font-mono)",
                    color: alertColor,
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.25)",
                    borderRadius: "6px",
                    width: "24px",
                    height: "24px",
                    flexShrink: 0,
                    boxShadow: "inset 0 0 4px rgba(0, 0, 0, 0.5)",
                  }}
                >
                  ⚠
                </span>
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: "10.5px",
                      fontWeight: 600,
                      color: "var(--white)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "130px",
                    }}
                    title={c.client}
                  >
                    {c.client}
                  </span>
                  <span style={{ fontSize: "7.5px", color: alertColor, fontFamily: "var(--font-mono)", fontWeight: 700, marginTop: "1px" }}>
                    {Math.round(c.joursInactivite * animProgress)} jours d'inactivité
                  </span>
                </div>
              </div>

              {/* Client Metric (Dernière date active + CA historique) */}
              <div style={{ display: "flex", flexDirection: "column", flexShrink: 0, alignItems: "flex-end" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--white)", fontFamily: "var(--font-mono)" }}>
                  {fmt(c.caTotalHistorique)} <span style={{ fontSize: "8px", fontWeight: 500, color: "var(--muted)" }}>TND</span>
                </span>
                <span style={{ fontSize: "7.5px", color: "var(--muted)", fontFamily: "var(--font-mono)", marginTop: "1px" }}>
                  Dernier : {c.lastOpDate}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Divider */}
      <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.06)", margin: "8px 0" }} />

      {/* Footer */}
      <div style={{ fontSize: "8px", color: "var(--muted)", fontFamily: "var(--font-mono)", display: "flex", justifyContent: "space-between" }}>
        <span>SUIVI COMMERCIAL</span>
        <span>SUIVI DE FRET</span>
      </div>
    </div>
  );
};
