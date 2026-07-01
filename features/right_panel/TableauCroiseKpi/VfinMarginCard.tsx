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
import { VfinMarginTooltip } from "./VfinMarginTooltip";

interface VfinMarginCardProps {
  activeAgentId?: string;
}

export const VfinMarginCard: React.FC<VfinMarginCardProps> = ({ activeAgentId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hovered, setHovered] = useState(false);

  // States for API data
  const [tauxCourant, setTauxCourant] = useState<number | null>(null);
  const [tauxCourantFormatted, setTauxCourantFormatted] = useState<string>("0.0");
  const [tauxPrecedent, setTauxPrecedent] = useState<number | null>(null);
  const [tauxPrecedentFormatted, setTauxPrecedentFormatted] = useState<string>("0.0");
  const [ecartTaux, setEcartTaux] = useState<number | null>(null);

  const [caCourant, setCaCourant] = useState<number>(0);
  const [margeCourant, setMargeCourant] = useState<number>(0);
  const [caPrecedent, setCaPrecedent] = useState<number>(0);
  const [margePrecedent, setMargePrecedent] = useState<number>(0);

  const [coords, setCoords] = useState<{ top: number; left: number; height?: number }>({ top: 0, left: 0 });
  const cardRef = React.useRef<HTMLDivElement>(null);
  const hideTimeout = React.useRef<NodeJS.Timeout | null>(null);

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

  const [animProgress, setAnimProgress] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    setError("");

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const clientId = process.env.NEXT_PUBLIC_CLIENT_ID || "DEMO";

      const response = await fetch(`${baseUrl}/api/tools/compare-monthly-margin`, {
        method: "POST",
        headers: { "Content-Type": "application/json",
          "Authorization": `Bearer ${getAuthToken()}`, },
        body: JSON.stringify({ client_id: clientId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      if (json.ok && json.data) {
        const kpis = json.data.kpis || [];
        const currentKpi = kpis.find((k: any) => k.label.toLowerCase().includes("courant"));
        const prevKpi = kpis.find((k: any) => k.label.toLowerCase().includes("précédent"));
        const varKpi = kpis.find((k: any) => k.label.toLowerCase().includes("variation"));

        if (currentKpi) {
          setTauxCourant(currentKpi.value);
          setTauxCourantFormatted(currentKpi.display);
        }
        if (prevKpi) {
          setTauxPrecedent(prevKpi.value);
          setTauxPrecedentFormatted(prevKpi.display);
        }
        if (varKpi) {
          setEcartTaux(varKpi.value);
        }
        
        const detailsObj = json.data.details || {};
        setCaCourant(detailsObj.caCourant ?? 0);
        setMargeCourant(detailsObj.margeCourant ?? 0);
        setCaPrecedent(detailsObj.caPrecedent ?? 0);
        setMargePrecedent(detailsObj.margePrecedent ?? 0);
      } else {
        throw new Error(json.error || "Impossible de charger le taux de marge");
      }
    } catch (err: any) {
      console.error("[VfinMarginCard] Error:", err);
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

  // Count-up progress animation
  useEffect(() => {
    if (loading || tauxCourant === null) return;
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
  }, [tauxCourant, loading]);

  if (activeAgentId !== "VFIN") {
    return null;
  }

  const themeColor = "#1D9E75"; // Green highlight matching active VFIN agent

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
      <VfinMarginTooltip
        visible={hovered}
        coords={coords}
        tauxCourant={tauxCourant !== null ? tauxCourant * animProgress : null}
        tauxCourantFormatted={tauxCourant !== null ? (tauxCourant * animProgress).toFixed(1) : "0.0"}
        tauxPrecedent={tauxPrecedent !== null ? tauxPrecedent * animProgress : null}
        tauxPrecedentFormatted={tauxPrecedent !== null ? (tauxPrecedent * animProgress).toFixed(1) : "0.0"}
        ecartTaux={ecartTaux !== null ? ecartTaux * animProgress : null}
        caCourant={caCourant * animProgress}
        margeCourant={margeCourant * animProgress}
        caPrecedent={caPrecedent * animProgress}
        margePrecedent={margePrecedent * animProgress}
        onMouseEnter={handleTooltipMouseEnter}
        onMouseLeave={handleTooltipMouseLeave}
      />

      <div
        style={{
          position: "relative",
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
          overflow: "hidden",
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
          <span>Marge brute (%)</span>
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0" }}>
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
              CHARGEMENT DU TAUX DE MARGE…
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
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Main Margin % and Evolution Badge */}
            <div>
              <div
                style={{
                  color: tauxCourant !== null && tauxCourant < 0 ? "var(--red)" : "var(--white)",
                  fontSize: "24px",
                  fontWeight: 800,
                  marginBottom: "2px",
                  lineHeight: 1,
                  fontFamily: "var(--font-body)",
                  display: "flex",
                  alignItems: "baseline",
                  gap: "4px",
                }}
              >
                <span>{tauxCourant !== null ? ((tauxCourant * animProgress).toFixed(1)) : "0.0"}</span>
                <span style={{ fontSize: "14px", color: "var(--muted)", fontWeight: 600 }}>%</span>
              </div>

              {/* Evolution vs prev month */}
              {ecartTaux !== null && (
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
                  <span>vs mois précédent :</span>
                  <span style={{ color: tauxPrecedent !== null && tauxPrecedent < 0 ? "var(--red)" : "var(--white)", fontWeight: 600 }}>
                    {tauxPrecedent !== null ? ((tauxPrecedent * animProgress).toFixed(1)) : "0.0"}%
                  </span>
                  {(() => {
                    const isUp = ecartTaux >= 0;
                    const color = isUp ? "var(--green)" : "var(--red)";
                    const sign = isUp ? "▲ +" : "▼ ";
                    const animEcart = ecartTaux * animProgress;
                    return (
                      <span style={{ color, fontWeight: 700, marginLeft: "2px" }}>
                        ({sign}{Math.abs(animEcart).toFixed(1)} pt{Math.abs(animEcart) > 1 ? "s" : ""})
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Divider line */}
            <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.06)", margin: "4px 0" }} />

            {/* Sub-label */}
            <div style={{ fontSize: "8px", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
              RATIO DE MARGE BRUTE TOTALE SUR CHIFFRE D'AFFAIRES
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
