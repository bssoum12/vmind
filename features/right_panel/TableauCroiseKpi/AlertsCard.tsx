"use client";

import React, { useEffect, useState, useRef } from "react";
import { RefreshCw, AlertTriangle, CheckCircle2, Activity, Info } from "lucide-react";
import { AlertsTooltip } from "./AlertsTooltip";
import { useKpis } from "../../../shared/contexts/KpiCacheContext";
import { AnimatedNumber } from "./AnimatedNumber";

interface AlertsCardProps {
  activeAgentId?: string;
}

export const AlertsCard: React.FC<AlertsCardProps> = ({ activeAgentId }) => {
  const { kpisByAgent, loadingByAgent, fetchKpis, error: globalError } = useKpis();

  const [hovered, setHovered] = useState(false);
  const [isCardHovered, setIsCardHovered] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; height?: number }>({ top: 0, left: 0 });

  const cardRef = useRef<HTMLDivElement>(null);
  const hideTimeout = useRef<NodeJS.Timeout | null>(null);

  // Read current active data from Context
  const agentData = kpisByAgent["vdata"] || kpisByAgent["VDATA"] || {};
  const toolData = agentData.get_alerts_kpi_vdata || agentData.data || agentData || {};
  
  const kpisList = toolData.ok && toolData.kpis ? toolData.kpis : (toolData.data?.kpis || []);
  const bugs = kpisList.find((k: any) => k.label === "Bugs ERP")?.value ?? 0;
  const nonConform = kpisList.find((k: any) => k.label === "Dossiers non conformes")?.value ?? 0;
  const totalAlerts = kpisList.find((k: any) => k.label === "Total alertes")?.value ?? 0;

  const effectiveLoading = (loadingByAgent["vdata"] || loadingByAgent["VDATA"]) && !toolData.ok;
  const error = !effectiveLoading && !toolData.ok && globalError ? globalError : "";

  const updateCoords = () => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left,
        height: rect.height,
      });
    }
  };

  const handleMouseEnter = () => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = null;
    }
    updateCoords();
    setHovered(true);
    setIsCardHovered(true);
  };

  const handleMouseLeave = () => {
    setIsCardHovered(false);
    hideTimeout.current = setTimeout(() => {
      setHovered(false);
    }, 250);
  };

  const handleTooltipMouseEnter = () => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = null;
    }
    setHovered(true);
  };

  const handleTooltipMouseLeave = () => {
    hideTimeout.current = setTimeout(() => {
      setHovered(false);
    }, 250);
  };

  useEffect(() => {
    if (!hovered) return;
    const handleUpdate = () => {
      updateCoords();
    };
    const panel = document.querySelector(".right-panel");
    if (panel) {
      panel.addEventListener("scroll", handleUpdate, { passive: true });
    }
    window.addEventListener("scroll", handleUpdate, { passive: true });
    window.addEventListener("resize", handleUpdate, { passive: true });
    return () => {
      if (panel) {
        panel.removeEventListener("scroll", handleUpdate);
      }
      window.removeEventListener("scroll", handleUpdate);
      window.removeEventListener("resize", handleUpdate);
    };
  }, [hovered]);

  if (activeAgentId !== "VDATA") {
    return null;
  }

  // Dynamic hazard level configuration
  let threatText = "SITUATION : NOMINALE";
  let threatColor = "#00e5c8";
  let threatBg = "rgba(0, 229, 200, 0.08)";
  let threatBorder = "rgba(0, 229, 200, 0.35)";

  if (totalAlerts > 1000) {
    threatText = "ALERTE : CRITIQUE";
    threatColor = "#ff3b30";
    threatBg = "rgba(255, 59, 48, 0.12)";
    threatBorder = "rgba(255, 59, 48, 0.4)";
  } else if (totalAlerts > 100) {
    threatText = "ALERTE : GRAVE";
    threatColor = "#ff9500";
    threatBg = "rgba(255, 149, 0, 0.12)";
    threatBorder = "rgba(255, 149, 0, 0.4)";
  } else if (totalAlerts > 0) {
    threatText = "ALERTE : ÉLEVÉE";
    threatColor = "#ffcc00";
    threatBg = "rgba(255, 204, 0, 0.12)";
    threatBorder = "rgba(255, 204, 0, 0.4)";
  }

  const radarColor = totalAlerts === 0 ? "#00e5c8" : "#ff3b30";
  const radarColorDim = totalAlerts === 0 ? "rgba(0, 229, 200, 0.1)" : "rgba(255, 59, 48, 0.1)";

  return (
    <div
      ref={cardRef}
      style={{
        background: 'linear-gradient(145deg, rgba(13, 17, 26, 0.96) 0%, rgba(26, 12, 18, 0.96) 100%)',
        border: `1px solid ${totalAlerts === 0 ? 'rgba(0, 229, 200, 0.3)' : 'rgba(255, 59, 48, 0.35)'}`,
        borderRadius: '16px',
        padding: '16px 18px',
        color: '#fff',
        boxShadow: `0 10px 35px rgba(0, 0, 0, 0.55), inset 0 0 20px ${totalAlerts === 0 ? 'rgba(0, 229, 200, 0.05)' : 'rgba(255, 59, 48, 0.06)'}`,
        backdropFilter: 'blur(16px)',
        position: 'relative',
        overflow: 'visible',
        marginBottom: '16px'
      }}
    >
      <style>{`
        :root {
          --radar-color: ${radarColor};
          --radar-color-dim: ${radarColorDim};
        }
        @keyframes radar-sweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes heartbeat {
          0%, 100% { opacity: 0.6; filter: drop-shadow(0 0 1px #ff3b30); }
          50% { opacity: 1; filter: drop-shadow(0 0 5px #ff3b30); }
        }
        @keyframes heartbeat-dash {
          to {
            stroke-dashoffset: -200;
          }
        }
        @keyframes flash-threat {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 1; filter: drop-shadow(0 0 2px ${threatColor}); }
        }
      `}</style>

      <AlertsTooltip
        visible={hovered}
        bugs={bugs}
        nonConform={nonConform}
        total={totalAlerts}
        coords={coords}
        onMouseEnter={handleTooltipMouseEnter}
        onMouseLeave={handleTooltipMouseLeave}
      />

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
            TOTAL ALERTES
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
          onClick={() => fetchKpis('vdata', true, 'get_alerts_kpi_vdata')}
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
          onMouseEnter={(e) => e.currentTarget.style.color = '#FF4757'}
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
          <span>Chargement des alertes système...</span>
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
        <div
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            background: isCardHovered
              ? `linear-gradient(135deg, ${threatColor}15 0%, rgba(13, 17, 26, 0.9) 100%)`
              : 'rgba(255, 255, 255, 0.02)',
            border: isCardHovered
              ? `1px solid ${threatColor}50`
              : '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '14px',
            padding: '14px 16px',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer',
            boxShadow: isCardHovered ? `0 6px 24px ${threatColor}20` : 'none',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
              INCIDENTS DÉTECTÉS
            </span>
            <span style={{
              fontSize: '9px',
              color: isCardHovered ? '#6EE7B7' : '#64748B',
              background: isCardHovered ? 'rgba(0, 229, 200, 0.18)' : 'rgba(255, 255, 255, 0.04)',
              border: isCardHovered ? '1px solid rgba(0, 229, 200, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
              padding: '2px 8px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s',
              flexShrink: 0
            }}>
              <Info size={10} style={{ color: isCardHovered ? '#00E5C8' : '#94A3B8' }} />
              {isCardHovered ? 'Détails actifs' : 'Détails'}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: "8px",
              position: "relative",
              minHeight: "44px",
            }}
          >
            {/* Big glow number */}
            <div
              style={{
                fontSize: "36px",
                fontWeight: 900,
                fontFamily: "monospace",
                lineHeight: 1,
                color: "#ffffff",
                textShadow: totalAlerts === 0
                  ? "0 0 12px rgba(0, 229, 200, 0.85)"
                  : "0 0 12px rgba(255, 59, 48, 0.9)",
                marginRight: "10px",
                zIndex: 2,
                letterSpacing: "-1px",
                flexShrink: 0,
              }}
            >
              <AnimatedNumber value={totalAlerts} />
            </div>

            {/* Heartbeat Line */}
            <div
              style={{
                width: "45px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                zIndex: 2,
                animation: "heartbeat 0.8s infinite ease-in-out",
                flexShrink: 0,
              }}
            >
              <svg width="45" height="36" viewBox="0 0 50 36">
                <defs>
                  <linearGradient id="vdata-heartbeat-grad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={totalAlerts === 0 ? "#00e5c8" : "#ff3b30"} stopOpacity="0.4" />
                    <stop offset="50%" stopColor={totalAlerts === 0 ? "#a3fff4" : "#ffffff"} stopOpacity="1" />
                    <stop offset="100%" stopColor={totalAlerts === 0 ? "#00e5c8" : "#ff3b30"} stopOpacity="0.4" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 18 L 14 18 L 17 8 L 20 28 L 23 3 L 26 25 L 29 18 L 50 18"
                  fill="none"
                  stroke="url(#vdata-heartbeat-grad)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="200"
                  style={{
                    animation: "heartbeat-dash 2.5s linear infinite",
                  }}
                />
              </svg>
            </div>

            {/* Radar scan grid overlay on the right */}
            <div
              style={{
                position: "absolute",
                right: "-12px",
                top: "-22px",
                width: "110px",
                height: "90px",
                pointerEvents: "none",
                opacity: 0.85
              }}
            >
              <svg width="110" height="90" viewBox="0 0 120 100">
                <defs>
                  <linearGradient id="vdata-radar-tail-grad" x1="1" y1="0.5" x2="0.8" y2="0.1">
                    <stop offset="0%" stopColor={totalAlerts === 0 ? "#00e5c8" : "#ff3b30"} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={totalAlerts === 0 ? "#00e5c8" : "#ff3b30"} stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Concentric sweep grid lines */}
                <circle cx="80" cy="50" r="15" fill="none" stroke={totalAlerts === 0 ? "rgba(0, 229, 200, 0.12)" : "rgba(255, 59, 48, 0.12)"} strokeWidth="0.8" />
                <circle cx="80" cy="50" r="30" fill="none" stroke={totalAlerts === 0 ? "rgba(0, 229, 200, 0.12)" : "rgba(255, 59, 48, 0.12)"} strokeWidth="0.8" strokeDasharray="3,3" />
                <circle cx="80" cy="50" r="45" fill="none" stroke={totalAlerts === 0 ? "rgba(0, 229, 200, 0.12)" : "rgba(255, 59, 48, 0.12)"} strokeWidth="0.8" />

                {/* Rotating radar needle */}
                <g style={{ transformOrigin: "80px 50px", animation: "radar-sweep 4s linear infinite" }}>
                  <path
                    d="M 80,50 L 140,50 A 60,60 0 0,0 122.4,7.6 Z"
                    fill="url(#vdata-radar-tail-grad)"
                  />
                  <line
                    x1="80"
                    y1="50"
                    x2="140"
                    y2="50"
                    stroke={totalAlerts === 0 ? "#00e5c8" : "#ff3b30"}
                    strokeWidth="1.5"
                    style={{
                      filter: `drop-shadow(0 0 4px ${totalAlerts === 0 ? "#00e5c8" : "#ff3b30"})`,
                    }}
                  />
                </g>

                <circle
                  cx="80"
                  cy="50"
                  r="2.5"
                  fill="#ffffff"
                  style={{
                    filter: `drop-shadow(0 0 6px ${totalAlerts === 0 ? "#00e5c8" : "#ff3b30"})`,
                  }}
                />
              </svg>
            </div>
          </div>

          {/* Footer capsule warning pill */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: threatBg,
              border: `1px solid ${threatBorder}`,
              borderRadius: "6px",
              padding: "4px 10px",
              alignSelf: "flex-start",
              marginTop: "12px",
              boxShadow: `0 0 8px ${threatBorder}20`,
              animation: totalAlerts > 0 ? "flash-threat 2s infinite ease-in-out" : "none",
            }}
          >
            {totalAlerts === 0 ? (
              <CheckCircle2 size={12} style={{ color: threatColor }} />
            ) : (
              <AlertTriangle size={12} style={{ color: threatColor }} />
            )}

            <span
              style={{
                fontSize: "9px",
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                color: threatColor,
                letterSpacing: "0.8px",
                textTransform: "uppercase",
              }}
            >
              {threatText}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
