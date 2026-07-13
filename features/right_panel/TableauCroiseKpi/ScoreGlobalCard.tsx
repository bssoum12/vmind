"use client";

import React, { useEffect, useState } from "react";
import { ScoreGlobalTooltip } from "./ScoreGlobalTooltip";
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

interface Props {
  activeAgentId?: string;
}

export const ScoreGlobalCard: React.FC<Props> = ({ activeAgentId }) => {
  const { kpisByAgent, loadingByAgent, fetchKpis } = useKpis();
  
  const [prevScoreQualite, setPrevScoreQualite] = useState<number | null>(null);
  const [prevDetails, setPrevDetails] = useState<any>(null);
  const [prevYear, setPrevYear] = useState<number>(new Date().getFullYear() - 1);
  
  const [cardHovered, setCardHovered] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; height?: number }>({ top: 0, left: 0 });
  const cardRef = React.useRef<HTMLDivElement>(null);
  const hideTimeout = React.useRef<NodeJS.Timeout | null>(null);
  const [animProgress, setAnimProgress] = useState(0);

  // Read current active year data from Context
  const agentData = kpisByAgent["vdata"] || {};
  const toolData = agentData.get_score_global_vdata_kpi || {};
  
  const scoreQualite = toolData.ok && toolData.kpis ? (toolData.kpis.find((k: any) => k.label === "Score qualité global")?.value ?? null) : null;
  const statut = toolData.details?.statut ?? "Critique";
  const details = toolData.details || null;
  
  const loading = loadingByAgent["vdata"] && !toolData.ok;
  const error = !loading && !toolData.ok && agentData.error ? agentData.error : "";

  // Count-up progress animation
  useEffect(() => {
    if (loading || scoreQualite === null) return;
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
  }, [scoreQualite, loading]);

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

  const fetchPrevYearData = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const clientId = process.env.NEXT_PUBLIC_CLIENT_ID || "DEMO";
      const pYear = new Date().getFullYear() - 1;
      setPrevYear(pYear);
      const prevStart = `${pYear}0101`;
      const prevEnd = `${pYear}1231`;

      const prevResponse = await fetch(
        `${baseUrl}/api/tools/get-score-global-vdata-kpi`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${getAuthToken()}`,
          },
          body: JSON.stringify({
            client_id: clientId,
            startDate: prevStart,
            endDate: prevEnd,
          }),
        }
      );

      if (prevResponse.ok) {
        const prevJson = await prevResponse.json();
        if (prevJson.ok) {
          setPrevScoreQualite(prevJson.data?.details?.score_qualite_global ?? null);
          setPrevDetails(prevJson.data?.details ?? null);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch prev year score global:", e);
    }
  };

  useEffect(() => {
    if (activeAgentId === "VDATA") {
      fetchPrevYearData();
    }
  }, [activeAgentId]);

  if (activeAgentId !== "VDATA") {
    return null;
  }

  // Determine status styling
  let glowClass = "glow-card-red";
  let statusColor = "#ff3b30";
  let pulseClass = "pulse-text-red";

  if (scoreQualite !== null) {
    if (scoreQualite >= 85) {
      glowClass = "glow-card-cyan";
      statusColor = "#00e5c8";
      pulseClass = "pulse-text-green";
    } else if (scoreQualite >= 70) {
      glowClass = "glow-card-cyan";
      statusColor = "#00f0ff";
      pulseClass = "pulse-text-green";
    } else if (scoreQualite >= 50) {
      glowClass = "glow-card-amber";
      statusColor = "#ffb800";
      pulseClass = "pulse-text-amber";
    }
  }

  return (
    <div
      ref={cardRef}
      style={{
        position: "relative",
        marginTop: "16px",
        overflow: "visible",
        zIndex: 11,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <ScoreGlobalTooltip
        visible={hovered}
        coords={coords}
        details={details}
        prevScore={prevScoreQualite}
        prevDetails={prevDetails}
        prevYear={prevYear}
        onMouseEnter={handleTooltipMouseEnter}
        onMouseLeave={handleTooltipMouseLeave}
      />

      <div
        className={glowClass}
        onMouseEnter={() => setCardHovered(true)}
        onMouseLeave={() => setCardHovered(false)}
        style={{
          padding: "16px",
          backgroundColor: cardHovered ? "rgba(6, 17, 31, 0.85)" : "rgba(6, 17, 31, 0.7)",
          backgroundImage: `
            radial-gradient(${statusColor}08 1px, transparent 0),
            radial-gradient(${statusColor}03 1px, transparent 0)
          `,
          backgroundSize: "12px 12px",
          backgroundPosition: "0 0, 6px 6px",
          border: cardHovered ? `1px solid ${statusColor}60` : `1px solid ${statusColor}2b`,
          boxShadow: cardHovered 
            ? `0 10px 35px rgba(0, 0, 0, 0.55), inset 0 0 16px ${statusColor}15, 0 0 15px ${statusColor}20` 
            : `0 10px 35px rgba(0, 0, 0, 0.55), inset 0 0 16px ${statusColor}08`,
          transform: cardHovered ? "translateY(-1px) scale(1.005)" : "none",
          borderRadius: "8px",
          position: "relative",
          overflow: "hidden",
          cursor: "pointer",
          backdropFilter: "blur(10px)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Glowing Corner Brackets (matching status color) */}
        <div style={{ position: "absolute", top: 0, left: 0, width: "10px", height: "10px", borderTop: `2px solid ${statusColor}`, borderLeft: `2px solid ${statusColor}`, borderRadius: "2px 0 0 0", boxShadow: `0 0 5px ${statusColor}60` }} />
        <div style={{ position: "absolute", top: 0, right: 0, width: "10px", height: "10px", borderTop: `2px solid ${statusColor}`, borderRight: `2px solid ${statusColor}`, borderRadius: "0 2px 0 0", boxShadow: `0 0 5px ${statusColor}60` }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, width: "10px", height: "10px", borderBottom: `2px solid ${statusColor}`, borderLeft: `2px solid ${statusColor}`, borderRadius: "0 0 0 2px", boxShadow: `0 0 5px ${statusColor}60` }} />
        <div style={{ position: "absolute", bottom: 0, right: 0, width: "10px", height: "10px", borderBottom: `2px solid ${statusColor}`, borderRight: `2px solid ${statusColor}`, borderRadius: "0 0 2px 0", boxShadow: `0 0 5px ${statusColor}60` }} />

        {/* Subtle top indicator bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "1.5px",
            background: `linear-gradient(90deg, transparent, ${statusColor}, transparent)`,
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
          }}
        >
          Score Qualité Global
        </div>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", height: "54px" }}>
            <SkeletonLoader height="26px" width="50%" />
            <SkeletonLoader height="12px" width="30%" />
          </div>
        ) : error ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ color: "var(--red)", fontSize: "9px", fontFamily: "var(--font-mono)" }}>
              {error}
            </span>
            <button
              onClick={() => fetchKpis('vdata', true, 'get_score_global_vdata_kpi')}
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
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Score & Status stacked vertically */}
            <div>
              <div
                className={pulseClass}
                style={{
                  color: "var(--white)",
                  fontSize: "24px",
                  fontWeight: 800,
                  marginBottom: "2px",
                  lineHeight: 1,
                  fontFamily: "var(--font-body)",
                }}
              >
                {scoreQualite !== null ? `${(scoreQualite * animProgress).toFixed(2)}%` : "N/A"}
              </div>
              <div
                style={{
                  color: statusColor,
                  fontSize: "9px",
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                }}
              >
                {statut}
              </div>
              {scoreQualite !== null && prevScoreQualite !== null && (
                <div
                  style={{
                    fontSize: "9px",
                    fontFamily: "var(--font-mono)",
                    color: "rgba(255, 255, 255, 0.4)",
                    marginTop: "6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span>vs {prevYear} :</span>
                  <span style={{ color: "var(--white)", fontWeight: 600 }}>
                    {((prevScoreQualite || 0) * animProgress).toFixed(2)}%
                  </span>
                  {(() => {
                    const currentScore = (scoreQualite || 0) * animProgress;
                    const currentPrev = (prevScoreQualite || 0) * animProgress;
                    const diff = currentScore - currentPrev;
                    const color = diff >= 0 ? "var(--green)" : "var(--red)";
                    const sign = diff >= 0 ? "▲ +" : "▼ ";
                    return (
                      <span style={{ color, fontWeight: 700, marginLeft: "2px" }}>
                        ({sign}{diff.toFixed(2)}%)
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
