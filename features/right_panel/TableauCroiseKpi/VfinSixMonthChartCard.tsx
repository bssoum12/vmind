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

interface TrendDataPoint {
  annee: number;
  mois: number;
  label: string;
  ca: number;
  marge: number;
}

interface VfinSixMonthChartCardProps {
  activeAgentId?: string;
}

export const VfinSixMonthChartCard: React.FC<VfinSixMonthChartCardProps> = ({ activeAgentId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [cardHovered, setCardHovered] = useState(false);
  const [data, setData] = useState<TrendDataPoint[]>([]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const clientId = process.env.NEXT_PUBLIC_CLIENT_ID || "DEMO";

      const response = await fetch(`${baseUrl}/api/tools/get-six-month-revenue-trend`, {
        method: "POST",
        headers: { "Content-Type": "application/json",
          "Authorization": `Bearer ${getAuthToken()}`, },
        body: JSON.stringify({ client_id: clientId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const resJson = await response.json();
      if (resJson.ok && resJson.data && Array.isArray(resJson.data.data)) {
        setData(resJson.data.data);
      } else {
        throw new Error(resJson.error || "Impossible de charger l'historique");
      }
    } catch (err: any) {
      console.error("[VfinSixMonthChartCard] Error:", err);
      setError(err.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeAgentId === "VFIN") {
      fetchData();
    }
  }, [activeAgentId]);

  if (activeAgentId !== "VFIN") {
    return null;
  }

  const themeColor = "#1D9E75"; // Green highlight matching active VFIN agent

  // Chart dimensions & layout
  const cardWidth = 248;
  const chartHeight = 65;
  const paddingX = 10;
  const paddingY = 8;
  const plotWidth = cardWidth - (paddingX * 2);
  const plotHeight = chartHeight - (paddingY * 2);

  const maxCa = data.length > 0 ? Math.max(...data.map((d) => d.ca)) : 0;
  const displayMax = maxCa === 0 ? 100000 : Math.ceil(maxCa * 1.1);

  // Short labels formatting
  const getShortLabel = (label: string) => {
    const parts = label.split(" ");
    return parts[0] || label;
  };

  return (
    <div
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => setCardHovered(false)}
      style={{
        position: "relative",
        marginTop: "16px",
        overflow: "visible",
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
        zIndex: 10,
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
        <span>CA 6 Derniers Mois (TND)</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            fetchData();
          }}
          title="Actualiser"
          style={{
            background: "none",
            border: "none",
            color: themeColor,
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
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "16px 0" }}>
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: themeColor,
              boxShadow: `0 0 6px ${themeColor}`,
              animation: "pulse 1.5s infinite",
            }}
          />
          <span style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
            CHARGEMENT DE L'HISTORIQUE…
          </span>
        </div>
      ) : error ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{ color: "var(--red)", fontSize: "9px", fontFamily: "var(--font-mono)" }}>
            {error}
          </span>
          <button
            onClick={fetchData}
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
      ) : data.length === 0 ? (
        <div style={{ fontSize: "9px", color: "var(--muted)", fontFamily: "var(--font-mono)", padding: "8px 0" }}>
          Aucune donnée disponible
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          
          {/* Responsive Bars & Grid Layout */}
          <div style={{ position: "relative", height: "65px", marginTop: "12px" }}>
            
            {/* Grid Backdrop Lines */}
            <div style={{ position: "absolute", top: 0, left: `${paddingX}px`, right: `${paddingX}px`, height: "1px", borderTop: "1px dashed rgba(255,255,255,0.04)" }} />
            <div style={{ position: "absolute", top: "50%", left: `${paddingX}px`, right: `${paddingX}px`, height: "1px", borderTop: "1px dashed rgba(255,255,255,0.04)" }} />
            <div style={{ position: "absolute", bottom: 0, left: `${paddingX}px`, right: `${paddingX}px`, height: "1px", borderTop: "1px solid rgba(255,255,255,0.08)" }} />

            {/* Bars Container */}
            <div 
              style={{ 
                display: "flex", 
                height: "100%", 
                alignItems: "flex-end", 
                paddingLeft: `${paddingX}px`, 
                paddingRight: `${paddingX}px`, 
                position: "relative", 
                zIndex: 2 
              }}
            >
              {data.map((d, i) => {
                const pct = d.ca / displayMax;
                const barHeight = Math.max(pct * 100, 3); // Min 3% height for flat months
                const isHovered = hoveredIndex === i;

                return (
                  <div
                    key={`${d.mois}-${d.annee}`}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      height: "100%",
                      justifyContent: "flex-end",
                      position: "relative",
                    }}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    {/* Tooltip centered over this specific bar */}
                    {isHovered && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: `calc(${barHeight}% + 6px)`,
                          backgroundColor: "rgba(6, 17, 31, 0.95)",
                          border: `1px solid ${themeColor}`,
                          boxShadow: `0 4px 12px rgba(0,0,0,0.5), 0 0 8px ${themeColor}20`,
                          padding: "5px 8px",
                          borderRadius: "4px",
                          fontSize: "9px",
                          fontFamily: "var(--font-mono)",
                          whiteSpace: "nowrap",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          pointerEvents: "none",
                          zIndex: 100,
                        }}
                      >
                        <span style={{ color: "var(--white)", fontWeight: 700 }}>
                          {d.ca.toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND
                        </span>
                        <span style={{ color: "var(--muted)", fontSize: "8px" }}>
                          {d.label}
                        </span>
                      </div>
                    )}

                    {/* The Bar itself */}
                    <div
                      style={{
                        width: "16px",
                        height: `${barHeight}%`,
                        borderRadius: "3px 3px 0 0",
                        background: isHovered
                          ? `linear-gradient(180deg, #00FF87 0%, ${themeColor} 100%)`
                          : `linear-gradient(180deg, #00E676 0%, ${themeColor}50 100%)`,
                        boxShadow: isHovered ? `0 0 10px ${themeColor}60` : "none",
                        transition: "all 0.2s ease-in-out",
                        cursor: "pointer",
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Month Labels beneath bars (Perfect alignment with flex: 1 matching bars slots) */}
          <div
            style={{
              display: "flex",
              fontSize: "8px",
              color: "var(--muted)",
              fontFamily: "var(--font-mono)",
              marginTop: "6px",
              paddingLeft: `${paddingX}px`,
              paddingRight: `${paddingX}px`,
            }}
          >
            {data.map((d, i) => (
              <span
                key={i}
                style={{
                  flex: 1,
                  textAlign: "center",
                  color: hoveredIndex === i ? "var(--white)" : "var(--muted)",
                  fontWeight: hoveredIndex === i ? 700 : 400,
                  transition: "color 0.2s",
                }}
              >
                {getShortLabel(d.label)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
