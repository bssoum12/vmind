"use client";

import React, { useEffect, useState } from "react";
import { ScoreGlobalTooltip } from "./ScoreGlobalTooltip";

interface Props {
  activeAgentId?: string;
}

export const ScoreGlobalCard: React.FC<Props> = ({ activeAgentId }) => {
  const currentYear = new Date().getFullYear();
  const todayStr = new Date().toISOString().split("T")[0];
  const startOfYearStr = `${currentYear}-01-01`;

  const [startDate, setStartDate] = useState(startOfYearStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [scoreQualite, setScoreQualite] = useState<number | null>(null);
  const [statut, setStatut] = useState<string>("Critique");
  const [details, setDetails] = useState<any>(null);
  const [cardHovered, setCardHovered] = useState(false);
  const [hoveredStart, setHoveredStart] = useState(false);
  const [hoveredEnd, setHoveredEnd] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hovered, setHovered] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const cardRef = React.useRef<HTMLDivElement>(null);
  const hideTimeout = React.useRef<NodeJS.Timeout | null>(null);

  const updateCoords = () => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left,
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
    }, 250); // 250ms buffer to transition to the tooltip
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

  const fetchData = async (start: string, end: string) => {
    setLoading(true);
    setError("");

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const clientId = process.env.NEXT_PUBLIC_CLIENT_ID || "DEMO";

      const formattedStart = start.replace(/-/g, "");
      const formattedEnd = end.replace(/-/g, "");

      const response = await fetch(
        `${baseUrl}/api/tools/get-score-global-vdata-kpi`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_id: clientId,
            startDate: formattedStart,
            endDate: formattedEnd,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();

      if (!json.ok) {
        throw new Error(json.error || "Erreur serveur");
      }

      const globalScore = json.data?.details?.score_qualite_global ?? 0;
      const globalStatut = json.data?.details?.statut ?? "Critique";

      setScoreQualite(globalScore);
      setStatut(globalStatut);
      setDetails(json.data?.details || null);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
      setScoreQualite(null);
      setDetails(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeAgentId === "VDATA") {
      fetchData(startDate, endDate);
    }
  }, [activeAgentId, startDate, endDate]);

  if (activeAgentId !== "VDATA") {
    return null;
  }

  // Determine status styling
  let glowClass = "glow-card-red";
  let statusColor = "var(--red)";
  let pulseClass = "pulse-text-red";

  if (scoreQualite !== null) {
    if (scoreQualite >= 85) {
      glowClass = "glow-card-cyan";
      statusColor = "var(--green)";
      pulseClass = "pulse-text-green";
    } else if (scoreQualite >= 70) {
      glowClass = "glow-card-cyan";
      statusColor = "var(--cyan)";
      pulseClass = "pulse-text-green";
    } else if (scoreQualite >= 50) {
      glowClass = "glow-card-amber";
      statusColor = "var(--amber)";
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
        onMouseEnter={handleTooltipMouseEnter}
        onMouseLeave={handleTooltipMouseLeave}
      />

      <div
        className={glowClass}
        onMouseEnter={() => setCardHovered(true)}
        onMouseLeave={() => setCardHovered(false)}
        style={{
          padding: "14px",
          background: cardHovered ? "rgba(6, 17, 31, 0.85)" : "rgba(6, 17, 31, 0.6)",
          border: cardHovered ? `1px solid ${statusColor}40` : `1px solid ${statusColor}1c`,
          boxShadow: cardHovered ? `0 8px 24px rgba(0, 0, 0, 0.5), 0 0 15px ${statusColor}20` : "none",
          transform: cardHovered ? "translateY(-1px) scale(1.01)" : "none",
          borderRadius: "8px",
          position: "relative",
          overflow: "hidden",
          cursor: "pointer",
          backdropFilter: "blur(10px)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: statusColor,
                boxShadow: `0 0 6px ${statusColor}`,
                animation: "pulse 1.5s infinite",
              }}
            />
            <span style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
              CALCUL DU SCORE…
            </span>
          </div>
        ) : error ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ color: "var(--red)", fontSize: "9px", fontFamily: "var(--font-mono)" }}>
              {error}
            </span>
            <button
              onClick={() => fetchData(startDate, endDate)}
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
                {scoreQualite !== null ? `${scoreQualite.toFixed(2)}%` : "N/A"}
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
            </div>

            {/* Cyber-accented Date Inputs Row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginTop: "4px",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                onKeyDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker();
                  } catch (err) {}
                }}
                style={{
                  flex: 1,
                  background: "rgba(0,229,200,0.04)",
                  color: "var(--cyan)",
                  border: hoveredStart ? "1px solid rgba(0,229,200,0.4)" : "1px solid rgba(0,229,200,0.15)",
                  boxShadow: hoveredStart ? "0 0 8px rgba(0, 229, 200, 0.15)" : "none",
                  borderRadius: "6px",
                  padding: "5px 8px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  fontWeight: 600,
                  outline: "none",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={() => setHoveredStart(true)}
                onMouseLeave={() => setHoveredStart(false)}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--cyan)";
                  e.target.style.boxShadow = "0 0 6px rgba(0, 229, 200, 0.2)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(0, 229, 200, 0.15)";
                  e.target.style.boxShadow = "none";
                }}
              />
              <span
                style={{
                  color: "var(--muted)",
                  fontSize: "9px",
                  fontFamily: "var(--font-mono)",
                  flexShrink: 0,
                }}
              >
                au
              </span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                onKeyDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker();
                  } catch (err) {}
                }}
                style={{
                  flex: 1,
                  background: "rgba(0,229,200,0.04)",
                  color: "var(--cyan)",
                  border: hoveredEnd ? "1px solid rgba(0,229,200,0.4)" : "1px solid rgba(0,229,200,0.15)",
                  boxShadow: hoveredEnd ? "0 0 8px rgba(0, 229, 200, 0.15)" : "none",
                  borderRadius: "6px",
                  padding: "5px 8px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  fontWeight: 600,
                  outline: "none",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={() => setHoveredEnd(true)}
                onMouseLeave={() => setHoveredEnd(false)}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--cyan)";
                  e.target.style.boxShadow = "0 0 6px rgba(0, 229, 200, 0.2)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(0, 229, 200, 0.15)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
