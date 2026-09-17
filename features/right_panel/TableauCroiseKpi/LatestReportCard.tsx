"use client";

import React, { useState } from "react";
import { RefreshCw, FileText, ExternalLink } from "lucide-react";
import { useKpis } from "@/shared/contexts/KpiCacheContext";

interface LatestReportCardProps {
  activeAgentId?: string;
}

export const LatestReportCard: React.FC<LatestReportCardProps> = ({ activeAgentId }) => {
  const { kpisByAgent, loadingByAgent, fetchKpis, error: globalError } = useKpis();
  const [isHovered, setIsHovered] = useState(false);

  const agentData = kpisByAgent["vdata"] || kpisByAgent["VDATA"] || {};
  const report = agentData.get_latest_report || null;
  const effectiveLoading = (loadingByAgent["vdata"] || loadingByAgent["VDATA"]) && !report;
  const error = !effectiveLoading && !report && globalError ? globalError : "";

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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: 'linear-gradient(145deg, rgba(13, 17, 26, 0.96) 0%, rgba(20, 14, 32, 0.96) 100%)',
        border: '1px solid rgba(123, 97, 255, 0.3)',
        borderRadius: '16px',
        padding: '16px 18px',
        color: '#fff',
        boxShadow: '0 10px 35px rgba(0, 0, 0, 0.55), inset 0 0 20px rgba(123, 97, 255, 0.05)',
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
            DERNIER RAPPORT
          </span>
          <span style={{
            fontSize: '9px',
            fontWeight: 800,
            color: '#A78BFA',
            background: 'rgba(167, 139, 250, 0.15)',
            border: '1px solid rgba(167, 139, 250, 0.35)',
            padding: '1px 6px',
            borderRadius: '4px',
            letterSpacing: '0.5px'
          }}>
            VDATA
          </span>
        </div>

        <button
          onClick={() => fetchKpis('vdata', true, 'get_latest_report')}
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
          onMouseEnter={(e) => e.currentTarget.style.color = '#A78BFA'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#64748B'}
        >
          <RefreshCw size={12} className={effectiveLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {effectiveLoading ? (
        <div style={{
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          color: '#64748B',
          fontSize: '11px'
        }}>
          <RefreshCw size={14} className="animate-spin" />
          <span>Chargement du dernier rapport...</span>
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
      ) : report ? (
        <div style={{
          background: isHovered
            ? 'linear-gradient(135deg, rgba(123, 97, 255, 0.12) 0%, rgba(139, 92, 246, 0.05) 100%)'
            : 'rgba(255, 255, 255, 0.02)',
          border: isHovered
            ? '1px solid rgba(123, 97, 255, 0.4)'
            : '1px solid rgba(255, 255, 255, 0.07)',
          borderRadius: '14px',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          transition: 'all 0.2s',
        }}>
          {/* PDF Icon Avatar */}
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#EF4444",
              flexShrink: 0,
              boxShadow: "0 0 12px rgba(239, 68, 68, 0.15)",
            }}
          >
            <FileText size={18} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                color: "#F8FAFC",
                fontSize: "12px",
                fontWeight: 700,
                textOverflow: "ellipsis",
                overflow: "hidden",
                whiteSpace: "nowrap",
                marginBottom: "2px",
              }}
            >
              {report.periodLabel || "Rapport d'analyse périodique"}
            </div>
            <div
              style={{
                color: "#94A3B8",
                fontSize: "9px",
                fontFamily: "var(--font-mono)",
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
              padding: "6px 10px",
              background: "rgba(123, 97, 255, 0.15)",
              border: "1px solid rgba(123, 97, 255, 0.35)",
              borderRadius: "6px",
              color: "#C4B5FD",
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              transition: "all 0.2s",
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(123, 97, 255, 0.28)";
              e.currentTarget.style.color = "#FFFFFF";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(123, 97, 255, 0.15)";
              e.currentTarget.style.color = "#C4B5FD";
            }}
          >
            <ExternalLink size={11} />
            <span>Ouvrir</span>
          </a>
        </div>
      ) : (
        <div style={{ color: "#64748B", fontSize: "10px", fontStyle: "italic", textAlign: "center", padding: "12px" }}>
          Aucun rapport généré pour le moment
        </div>
      )}
    </div>
  );
};
