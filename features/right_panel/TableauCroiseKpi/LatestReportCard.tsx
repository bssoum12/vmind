"use client";


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
import React, { useEffect, useState } from "react";
import { SkeletonLoader } from "@/components/vmind/SkeletonLoader";

interface LatestReportCardProps {
  activeAgentId?: string;
}

import { useKpis } from "@/shared/contexts/KpiCacheContext";

export const LatestReportCard: React.FC<LatestReportCardProps> = ({ activeAgentId }) => {
  const { kpisByAgent, loadingByAgent, fetchKpis } = useKpis();
  const [hovered, setHovered] = useState(false);

  const agentData = kpisByAgent["vdata"] || {};
  const report = agentData.get_latest_report || null;
  const loading = loadingByAgent["vdata"] && !report;

  const fetchLatestReport = (e: React.MouseEvent) => {
    e.stopPropagation();
    fetchKpis("vdata", true, "get_latest_report");
  };

  if (activeAgentId !== "VDATA") {
    return null;
  }

  const formatDate = (isoStr: string) => {
    if (!isoStr) return "";
    try {
      const d = new Date(isoStr);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${day}/${month}/${year} à ${hours}:${minutes}`;
    } catch (e) {
      return "";
    }
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        marginTop: "12px",
        overflow: "hidden",
        padding: "16px",
        backgroundColor: hovered ? "rgba(6, 17, 31, 0.85)" : "rgba(6, 17, 31, 0.7)",
        backgroundImage: `
          radial-gradient(rgba(123, 97, 255, 0.04) 1px, transparent 0),
          radial-gradient(rgba(123, 97, 255, 0.015) 1px, transparent 0)
        `,
        backgroundSize: "12px 12px",
        backgroundPosition: "0 0, 6px 6px",
        border: hovered ? "1px solid rgba(123, 97, 255, 0.35)" : "1px solid rgba(123, 97, 255, 0.16)",
        borderRadius: "8px",
        boxShadow: hovered 
          ? "0 10px 35px rgba(0, 0, 0, 0.55), inset 0 0 16px rgba(123, 97, 255, 0.08), 0 0 15px rgba(123, 97, 255, 0.1)" 
          : "0 10px 35px rgba(0, 0, 0, 0.55), inset 0 0 16px rgba(123, 97, 255, 0.04)",
        transform: hovered ? "translateY(-1px) scale(1.005)" : "none",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        cursor: "pointer",
      }}
    >
      {/* Glowing Corner Brackets (matching purple color) */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "10px", height: "10px", borderTop: "2px solid rgba(123, 97, 255, 0.7)", borderLeft: "2px solid rgba(123, 97, 255, 0.7)", borderRadius: "2px 0 0 0", boxShadow: "0 0 5px rgba(123, 97, 255, 0.4)" }} />
      <div style={{ position: "absolute", top: 0, right: 0, width: "10px", height: "10px", borderTop: "2px solid rgba(123, 97, 255, 0.7)", borderRight: "2px solid rgba(123, 97, 255, 0.7)", borderRadius: "0 2px 0 0", boxShadow: "0 0 5px rgba(123, 97, 255, 0.4)" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, width: "10px", height: "10px", borderBottom: "2px solid rgba(123, 97, 255, 0.7)", borderLeft: "2px solid rgba(123, 97, 255, 0.7)", borderRadius: "0 0 0 2px", boxShadow: "0 0 5px rgba(123, 97, 255, 0.4)" }} />
      <div style={{ position: "absolute", bottom: 0, right: 0, width: "10px", height: "10px", borderBottom: "2px solid rgba(123, 97, 255, 0.7)", borderRight: "2px solid rgba(123, 97, 255, 0.7)", borderRadius: "0 0 2px 0", boxShadow: "0 0 5px rgba(123, 97, 255, 0.4)" }} />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background: "linear-gradient(90deg, transparent, var(--purple), transparent)",
          opacity: 0.6,
        }}
      />

      <div
        style={{
          fontSize: "9px",
          color: "var(--muted)",
          fontFamily: "var(--font-mono)",
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          marginBottom: "8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>Dernier Rapport</span>
        <button
          onClick={fetchLatestReport}
          title="Actualiser"
          style={{
            background: "none",
            border: "none",
            color: "var(--purple)",
            cursor: "pointer",
            fontSize: "10px",
            padding: "2px",
            display: "flex",
            alignItems: "center",
            opacity: 0.7,
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", height: "32px" }}>
          <SkeletonLoader height="32px" width="32px" style={{ borderRadius: "4px" }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
            <SkeletonLoader height="12px" width="60%" />
            <SkeletonLoader height="8px" width="40%" />
          </div>
        </div>
      ) : report ? (
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* PDF glowing icon */}
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "4px",
              background: "rgba(255, 71, 87, 0.1)",
              border: "1px solid rgba(255, 71, 87, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--red)",
              boxShadow: "0 0 8px rgba(255, 71, 87, 0.1)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                color: "var(--white)",
                fontSize: "11px",
                fontWeight: 600,
                textOverflow: "ellipsis",
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
            >
              {report.periodLabel}
            </div>
            <div
              style={{
                color: "var(--muted)",
                fontSize: "8px",
                fontFamily: "var(--font-mono)",
                marginTop: "2px",
              }}
            >
              Généré le {formatDate(report.generatedAt)}
            </div>
          </div>

          {/* Download link button */}
          <a
            href={report.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "6px 8px",
              background: "rgba(123, 97, 255, 0.1)",
              border: "1px solid rgba(123, 97, 255, 0.3)",
              borderRadius: "4px",
              color: "var(--purple)",
              fontFamily: "var(--font-mono)",
              fontSize: "8px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(123, 97, 255, 0.2)";
              e.currentTarget.style.borderColor = "var(--purple)";
              e.currentTarget.style.boxShadow = "0 0 8px rgba(123, 97, 255, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(123, 97, 255, 0.1)";
              e.currentTarget.style.borderColor = "rgba(123, 97, 255, 0.3)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Ouvrir
          </a>
        </div>
      ) : (
        <div style={{ color: "var(--muted)", fontSize: "9px", fontFamily: "var(--font-mono)" }}>
          Aucun rapport généré pour le moment
        </div>
      )}
    </div>
  );
};
