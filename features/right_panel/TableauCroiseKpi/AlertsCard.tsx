"use client";

import React, { useEffect, useState, useRef } from "react";
import { AlertsTooltip } from "./AlertsTooltip";
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

interface AlertsCardProps {
  activeAgentId?: string;
}

export const AlertsCard: React.FC<AlertsCardProps> = ({ activeAgentId }) => {
  const { kpisByAgent, loadingByAgent, fetchKpis } = useKpis();

  const [hovered, setHovered] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; height?: number }>({ top: 0, left: 0 });

  const cardRef = useRef<HTMLDivElement>(null);
  const hideTimeout = useRef<NodeJS.Timeout | null>(null);

  // Animated states for count-up
  const [animatedTotal, setAnimatedTotal] = useState(0);

  // Read current active data from Context
  const agentData = kpisByAgent["vdata"] || {};
  const toolData = agentData.get_alerts_kpi_vdata || {};
  
  const bugs = toolData.ok && toolData.kpis ? (toolData.kpis.find((k: any) => k.label === "Bugs ERP")?.value ?? 0) : 0;
  const nonConform = toolData.ok && toolData.kpis ? (toolData.kpis.find((k: any) => k.label === "Dossiers non conformes")?.value ?? 0) : 0;
  const totalAlerts = toolData.ok && toolData.kpis ? (toolData.kpis.find((k: any) => k.label === "Total alertes")?.value ?? 0) : 0;

  const loading = loadingByAgent["vdata"] && !toolData.ok;
  const error = !loading && !toolData.ok && agentData.error ? agentData.error : "";

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
  };

  const handleMouseLeave = () => {
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

  // Count-up animation loop for main total alerts number
  useEffect(() => {
    if (loading) return;
    const duration = 1200;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = progress * (2 - progress); // Ease out quad

      setAnimatedTotal(totalAlerts * easeProgress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [totalAlerts, loading]);

  if (activeAgentId !== "VDATA") {
    return null;
  }

  // Format total alerts cleanly with thousands separator
  const formattedTotal = Math.round(animatedTotal).toLocaleString("fr-FR");
  const totalLength = formattedTotal.length;

  // Scale down font size dynamically as the number gets larger to prevent overflow/collisions
  const numberFontSize = totalLength > 7 ? "28px" : totalLength > 6 ? "32px" : totalLength > 5 ? "38px" : "44px";

  // Dynamic hazard level configuration
  let threatText = "SITUATION : NOMINALE";
  let threatColor = "#00e5c8"; // Mint green
  let threatBg = "rgba(0, 229, 200, 0.05)";
  let threatBorder = "rgba(0, 229, 200, 0.25)";
  let pulseDotColor = "#00e5c8";

  if (totalAlerts > 1000) {
    threatText = "ALERTE : CRITIQUE";
    threatColor = "#ff3b30";
    threatBg = "rgba(255, 59, 48, 0.08)";
    threatBorder = "rgba(255, 59, 48, 0.35)";
    pulseDotColor = "#ff3b30";
  } else if (totalAlerts > 100) {
    threatText = "ALERTE : GRAVE";
    threatColor = "#ff9500";
    threatBg = "rgba(255, 149, 0, 0.08)";
    threatBorder = "rgba(255, 149, 0, 0.35)";
    pulseDotColor = "#ff9500";
  } else if (totalAlerts > 0) {
    threatText = "ALERTE : ÉLEVÉE";
    threatColor = "#ffcc00";
    threatBg = "rgba(255, 204, 0, 0.08)";
    threatBorder = "rgba(255, 204, 0, 0.35)";
    pulseDotColor = "#ffcc00";
  }

  const radarColor = totalAlerts === 0 ? "#00e5c8" : "#ff3b30";
  const radarColorDim = totalAlerts === 0 ? "rgba(0, 229, 200, 0.1)" : "rgba(255, 59, 48, 0.1)";

  return (
    <div
      ref={cardRef}
      style={{
        position: "relative",
        marginTop: "16px",
        overflow: "visible",
        zIndex: 10,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
        @keyframes pulse-dot-A {
          0%, 35% { fill: var(--radar-color-dim); opacity: 0.2; }
          37.5% { fill: #ffffff; opacity: 1; filter: drop-shadow(0 0 6px var(--radar-color)); }
          37.6% { fill: var(--radar-color); opacity: 1; filter: drop-shadow(0 0 3px var(--radar-color)); }
          37.6%, 50% { fill: var(--radar-color); opacity: 0.8; filter: drop-shadow(0 0 2px var(--radar-color)); }
          75%, 100% { fill: var(--radar-color-dim); opacity: 0.2; filter: none; }
        }
        @keyframes pulse-dot-B {
          0%, 10% { fill: var(--radar-color-dim); opacity: 0.2; }
          12.5% { fill: #ffffff; opacity: 1; filter: drop-shadow(0 0 6px var(--radar-color)); }
          12.6% { fill: var(--radar-color); opacity: 1; filter: drop-shadow(0 0 3px var(--radar-color)); }
          12.6%, 25% { fill: var(--radar-color); opacity: 0.8; filter: drop-shadow(0 0 2px var(--radar-color)); }
          50%, 100% { fill: var(--radar-color-dim); opacity: 0.2; filter: none; }
        }
        @keyframes pulse-dot-C {
          0%, 55% { fill: var(--radar-color-dim); opacity: 0.2; }
          58.3% { fill: #ffffff; opacity: 1; filter: drop-shadow(0 0 6px var(--radar-color)); }
          58.4% { fill: var(--radar-color); opacity: 1; filter: drop-shadow(0 0 3px var(--radar-color)); }
          58.4%, 70% { fill: var(--radar-color); opacity: 0.8; filter: drop-shadow(0 0 2px var(--radar-color)); }
          90%, 100% { fill: var(--radar-color-dim); opacity: 0.2; filter: none; }
        }
        @keyframes pulse-dot-D {
          0%, 72% { fill: var(--radar-color-dim); opacity: 0.2; }
          75% { fill: #ffffff; opacity: 1; filter: drop-shadow(0 0 6px var(--radar-color)); }
          75.1% { fill: var(--radar-color); opacity: 1; filter: drop-shadow(0 0 3px var(--radar-color)); }
          75.1%, 85% { fill: var(--radar-color); opacity: 0.8; filter: drop-shadow(0 0 2px var(--radar-color)); }
          100% { fill: var(--radar-color-dim); opacity: 0.2; filter: none; }
        }
        @keyframes pulse-dot-E {
          0%, 10% { fill: var(--radar-color); opacity: 0.8; filter: drop-shadow(0 0 2px var(--radar-color)); }
          15%, 88% { fill: var(--radar-color-dim); opacity: 0.2; filter: none; }
          91.7% { fill: #ffffff; opacity: 1; filter: drop-shadow(0 0 6px var(--radar-color)); }
          91.8% { fill: var(--radar-color); opacity: 1; filter: drop-shadow(0 0 3px var(--radar-color)); }
          91.8%, 100% { fill: var(--radar-color); opacity: 0.8; filter: drop-shadow(0 0 2px var(--radar-color)); }
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

      {/* Cyber Card Container */}
      <div
        style={{
          padding: "16px",
          backgroundColor: "rgba(6, 17, 31, 0.7)",
          backgroundImage: `
            radial-gradient(rgba(0, 240, 255, 0.04) 1px, transparent 0),
            radial-gradient(rgba(255, 59, 48, 0.03) 1px, transparent 0)
          `,
          backgroundSize: "12px 12px",
          backgroundPosition: "0 0, 6px 6px",
          border: "1px solid rgba(0, 240, 255, 0.16)",
          borderRadius: "8px",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 10px 35px rgba(0, 0, 0, 0.55), inset 0 0 16px rgba(0, 240, 255, 0.04)",
          minHeight: "155px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* Glowing Corner Brackets */}
        <div style={{ position: "absolute", top: 0, left: 0, width: "10px", height: "10px", borderTop: "2px solid #00f0ff", borderLeft: "2px solid #00f0ff", borderRadius: "2px 0 0 0", boxShadow: "0 0 5px rgba(0, 240, 255, 0.4)" }} />
        <div style={{ position: "absolute", top: 0, right: 0, width: "10px", height: "10px", borderTop: "2px solid #00f0ff", borderRight: "2px solid #00f0ff", borderRadius: "0 2px 0 0", boxShadow: "0 0 5px rgba(0, 240, 255, 0.4)" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, width: "10px", height: "10px", borderBottom: "2px solid #00f0ff", borderLeft: "2px solid #00f0ff", borderRadius: "0 0 0 2px", boxShadow: "0 0 5px rgba(0, 240, 255, 0.4)" }} />
        <div style={{ position: "absolute", bottom: 0, right: 0, width: "10px", height: "10px", borderBottom: "2px solid #00f0ff", borderRight: "2px solid #00f0ff", borderRadius: "0 0 2px 0", boxShadow: "0 0 5px rgba(0, 240, 255, 0.4)" }} />

        {/* Header Title */}
        <div>
          <div
            style={{
              fontSize: "9px",
              color: "var(--muted)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              marginBottom: "10px",
            }}
          >
            Total Alertes
          </div>
        </div>

        {/* Center Section: Big Number & Pulse Waveform & Radar Scan */}
        {error ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ color: "var(--red)", fontSize: "9px", fontFamily: "var(--font-mono)" }}>
              {error}
            </span>
            <button
              onClick={() => fetchKpis('vdata', true, 'get_alerts_kpi_vdata')}
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: "10px",
              position: "relative",
              minHeight: "44px",
            }}
          >
            {/* Big glow number with dynamic font size */}
            {loading ? (
              <SkeletonLoader height="36px" width="70px" style={{ marginRight: "10px" }} />
            ) : (
              <div
                style={{
                  fontSize: numberFontSize,
                  fontWeight: 800,
                  fontFamily: "var(--font-body), sans-serif",
                  lineHeight: 1,
                  color: "#ffffff",
                  textShadow: totalAlerts === 0
                    ? "0 0 12px rgba(0, 229, 200, 0.85), 0 0 20px rgba(0, 229, 200, 0.4)"
                    : "0 0 12px rgba(255, 59, 48, 0.9), 0 0 20px rgba(255, 59, 48, 0.5)",
                  marginRight: "10px",
                  zIndex: 2,
                  letterSpacing: "-0.5px",
                  transition: "font-size 0.3s ease",
                  flexShrink: 0,
                }}
              >
                {formattedTotal}
              </div>
            )}

            {/* Heartbeat Line (SS1 design matching, animated) */}
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
                  <linearGradient id="heartbeat-grad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={totalAlerts === 0 ? "#00e5c8" : "#ff3b30"} stopOpacity="0.4" />
                    <stop offset="50%" stopColor={totalAlerts === 0 ? "#a3fff4" : "#ffffff"} stopOpacity="1" />
                    <stop offset="100%" stopColor={totalAlerts === 0 ? "#00e5c8" : "#ff3b30"} stopOpacity="0.4" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 18 L 14 18 L 17 8 L 20 28 L 23 3 L 26 25 L 29 18 L 50 18"
                  fill="none"
                  stroke="url(#heartbeat-grad)"
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

            {/* Radar scan grid overlay on the right (SS1 design matching) */}
            <div
              style={{
                position: "absolute",
                right: "-12px",
                top: "-22px",
                width: "120px",
                height: "100px",
                pointerEvents: "none",
              }}
            >
              <svg width="120" height="100" viewBox="0 0 120 100">
                <defs>
                  <linearGradient id="radar-tail-grad" x1="1" y1="0.5" x2="0.8" y2="0.1">
                    <stop offset="0%" stopColor={totalAlerts === 0 ? "#00e5c8" : "#ff3b30"} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={totalAlerts === 0 ? "#00e5c8" : "#ff3b30"} stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Concentric sweep grid lines */}
                <circle cx="80" cy="50" r="15" fill="none" stroke={totalAlerts === 0 ? "rgba(0, 229, 200, 0.12)" : "rgba(255, 59, 48, 0.12)"} strokeWidth="0.8" />
                <circle cx="80" cy="50" r="30" fill="none" stroke={totalAlerts === 0 ? "rgba(0, 229, 200, 0.12)" : "rgba(255, 59, 48, 0.12)"} strokeWidth="0.8" strokeDasharray="3,3" />
                <circle cx="80" cy="50" r="45" fill="none" stroke={totalAlerts === 0 ? "rgba(0, 229, 200, 0.12)" : "rgba(255, 59, 48, 0.12)"} strokeWidth="0.8" />
                <circle cx="80" cy="50" r="60" fill="none" stroke={totalAlerts === 0 ? "rgba(0, 229, 200, 0.08)" : "rgba(255, 59, 48, 0.08)"} strokeWidth="0.8" />

                {/* Radial spokes (every 30 degrees) */}
                {[...Array(12)].map((_, i) => {
                  const angleRad = (i * 30 * Math.PI) / 180;
                  const x2 = 80 + 60 * Math.cos(angleRad);
                  const y2 = 50 + 60 * Math.sin(angleRad);
                  return (
                    <line
                      key={i}
                      x1="80"
                      y1="50"
                      x2={x2}
                      y2={y2}
                      stroke={totalAlerts === 0 ? "rgba(0, 229, 200, 0.08)" : "rgba(255, 59, 48, 0.08)"}
                      strokeWidth="0.8"
                    />
                  );
                })}

                {/* Fixed pulsing blip dots (synchronized with the needle sweep) */}
                <circle cx="60" cy="76" r="2" style={{ animation: "pulse-dot-A 4s infinite linear" }} />
                <circle cx="110" cy="80" r="2" style={{ animation: "pulse-dot-B 4s infinite linear" }} />
                <circle cx="50" cy="35" r="2" style={{ animation: "pulse-dot-C 4s infinite linear" }} />
                <circle cx="85" cy="15" r="2" style={{ animation: "pulse-dot-D 4s infinite linear" }} />
                <circle cx="120" cy="30" r="2" style={{ animation: "pulse-dot-E 4s infinite linear" }} />

                {/* Rotating radar group (clockwise needle + trailing fade tail) */}
                <g style={{ transformOrigin: "80px 50px", animation: "radar-sweep 4s linear infinite" }}>
                  {/* Sweep gradient sector tail */}
                  <path
                    d="M 80,50 L 140,50 A 60,60 0 0,0 122.4,7.6 Z"
                    fill="url(#radar-tail-grad)"
                  />
                  {/* Rotating Sweep Needle Line */}
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

                {/* Pulsing center coordinate dot */}
                <circle
                  cx="80"
                  cy="50"
                  r="3"
                  fill="#ffffff"
                  style={{
                    filter: `drop-shadow(0 0 6px ${totalAlerts === 0 ? "#00e5c8" : "#ff3b30"})`,
                    animation: "pulse-dot 1.8s infinite ease-in-out",
                  }}
                />
                <circle
                  cx="80"
                  cy="50"
                  r="1.2"
                  fill={totalAlerts === 0 ? "#00e5c8" : "#ff3b30"}
                />
              </svg>
            </div>
          </div>
        )}

        {/* Footer capsule warning pill */}
        {loading ? (
          <SkeletonLoader height="22px" width="120px" style={{ marginTop: "12px" }} />
        ) : (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: threatBg,
              border: `1px solid ${threatBorder}`,
              borderRadius: "4px",
              padding: "4px 10px",
              alignSelf: "flex-start",
              marginTop: "12px",
              boxShadow: `0 0 8px ${threatBorder}20`,
              animation: totalAlerts > 0 ? "flash-threat 2s infinite ease-in-out" : "none",
              transition: "all 0.3s ease",
            }}
          >
            {totalAlerts === 0 ? (
              // Compliance Nominal check icon
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={threatColor} strokeWidth="3.5" style={{ filter: `drop-shadow(0 0 2px ${threatColor})` }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              // Warning exclamation icon
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={threatColor} strokeWidth="3" style={{ filter: `drop-shadow(0 0 2px ${threatColor})` }}>
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            )}

            <span
              style={{
                fontSize: "8px",
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                color: threatColor,
                letterSpacing: "1px",
                textTransform: "uppercase",
                textShadow: `0 0 4px ${threatColor}40`,
              }}
            >
              {threatText}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
