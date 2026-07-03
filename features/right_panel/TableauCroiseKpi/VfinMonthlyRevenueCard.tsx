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

interface VfinMonthlyRevenueCardProps {
  activeAgentId?: string;
}

export const VfinMonthlyRevenueCard: React.FC<VfinMonthlyRevenueCardProps> = ({ activeAgentId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hovered, setHovered] = useState(false);

  // States for API data
  const [caTotal, setCaTotal] = useState<number | null>(null);
  const [caFormatted, setCaFormatted] = useState<string>("0,00");
  const [margeTotal, setMargeTotal] = useState<number | null>(null);
  const [margeFormatted, setMargeFormatted] = useState<string>("0,00");
  const [tauxMarge, setTauxMarge] = useState<number | null>(null);

  const [caPrecedent, setCaPrecedent] = useState<number | null>(null);
  const [caPrecedentFormatted, setCaPrecedentFormatted] = useState<string>("0,00");
  const [evolutionPct, setEvolutionPct] = useState<number | null>(null);

  const [animProgress, setAnimProgress] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    setError("");

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const clientId = process.env.NEXT_PUBLIC_CLIENT_ID || "DEMO";

      // 1. Fetch current month validated revenue
      const revResponse = await fetch(`${baseUrl}/api/tools/get-monthly-validated-revenue`, {
        method: "POST",
        headers: { "Content-Type": "application/json",
          "Authorization": `Bearer ${getAuthToken()}`, },
        body: JSON.stringify({ client_id: clientId }),
      });

      // 2. Fetch comparison with previous month
      const compResponse = await fetch(`${baseUrl}/api/tools/compare-monthly-revenue`, {
        method: "POST",
        headers: { "Content-Type": "application/json",
          "Authorization": `Bearer ${getAuthToken()}`, },
        body: JSON.stringify({ client_id: clientId }),
      });

      if (!revResponse.ok || !compResponse.ok) {
        throw new Error("Erreur de connexion aux API financières.");
      }

      const revJson = await revResponse.json();
      const compJson = await compResponse.json();

      if (revJson.ok && revJson.data) {
        const kpis = revJson.data.kpis || [];
        const caKpi = kpis.find((k: any) => k.label.includes("CA"));
        const margeKpi = kpis.find((k: any) => k.label.includes("Marge"));
        const rateKpi = kpis.find((k: any) => k.label.includes("Taux"));

        if (caKpi) {
          setCaTotal(caKpi.value);
          setCaFormatted(caKpi.display);
        }
        if (margeKpi) {
          setMargeTotal(margeKpi.value);
          setMargeFormatted(margeKpi.display);
        }
        if (rateKpi) {
          setTauxMarge(rateKpi.value);
        }
      } else {
        throw new Error(revJson.error || "Impossible de charger le CA validé");
      }

      if (compJson.ok && compJson.data) {
        const kpis = compJson.data.kpis || [];
        const prevCaKpi = kpis.find((k: any) => k.label.includes("précédent"));
        const evoKpi = kpis.find((k: any) => k.label.includes("Évolution"));

        if (prevCaKpi) {
          setCaPrecedent(prevCaKpi.value);
          setCaPrecedentFormatted(prevCaKpi.display);
        }
        if (evoKpi) {
          setEvolutionPct(evoKpi.value);
        }
      }
    } catch (err: any) {
      console.error("[VfinMonthlyRevenueCard] Error:", err);
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
    if (loading || caTotal === null) return;
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
  }, [caTotal, loading]);

  if (activeAgentId !== "VFIN") {
    return null;
  }

  const themeColor = "#1D9E75"; // Green highlight matching active VFIN agent
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
      
      {/* Linear top scanline */}
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
        <span>CA Mois (TND)</span>
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
            CHARGEMENT DES DONNÉES FINANCIÈRES…
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
          {/* Main CA and Evolution Badge */}
          <div>
            <div
              style={{
                color: "var(--white)",
                fontSize: "24px",
                fontWeight: 800,
                marginBottom: "2px",
                lineHeight: 1,
                fontFamily: "var(--font-body)",
                display: "flex",
                alignItems: "baseline",
                gap: "8px",
              }}
            >
              <span>{fmt((caTotal || 0) * animProgress)}</span>
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 500 }}>TND</span>
            </div>

            {/* Evolution vs prev month */}
            {evolutionPct !== null && (
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
                <span style={{ color: "var(--white)", fontWeight: 600 }}>
                  {fmt((caPrecedent || 0) * animProgress)} TND
                </span>
                {(() => {
                  const isUp = evolutionPct >= 0;
                  const color = isUp ? "var(--green)" : "var(--red)";
                  const sign = isUp ? "▲ +" : "▼ ";
                  const animEvo = (evolutionPct || 0) * animProgress;
                  return (
                    <span style={{ color, fontWeight: 700, marginLeft: "2px" }}>
                      ({sign}{Math.abs(animEvo).toFixed(1)}%)
                    </span>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Divider line */}
          <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.06)", margin: "4px 0" }} />

          {/* Margins details grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <div style={{ fontSize: "8px", color: "var(--muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
                Marge brute
              </div>
              <div style={{ 
                fontSize: "11px", 
                color: margeTotal !== null && margeTotal < 0 ? "var(--red)" : "var(--white)", 
                fontWeight: 600, 
                marginTop: "2px" 
              }}>
                {fmt((margeTotal || 0) * animProgress)} <span style={{ fontSize: "9px", color: "var(--muted)", fontWeight: 400 }}>TND</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: "8px", color: "var(--muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
                Taux de marge
              </div>
              <div style={{ 
                fontSize: "11px", 
                color: tauxMarge !== null && tauxMarge < 0 ? "var(--red)" : themeColor, 
                fontWeight: 700, 
                marginTop: "2px" 
              }}>
                {tauxMarge !== null ? `${((tauxMarge || 0) * animProgress).toFixed(1)}%` : "N/A"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
