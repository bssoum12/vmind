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

interface ClientRevenue {
  rank: number;
  client: string;
  caTotal: number;
  caTotalFormatted: string;
  nbDossiers: number;
}

interface VfinTopClientsCardProps {
  activeAgentId?: string;
}

export const VfinTopClientsCard: React.FC<VfinTopClientsCardProps> = ({ activeAgentId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hovered, setHovered] = useState(false);
  const [clients, setClients] = useState<ClientRevenue[]>([]);
  const [period, setPeriod] = useState<string>("");
  const [animProgress, setAnimProgress] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    setError("");

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const clientId = process.env.NEXT_PUBLIC_CLIENT_ID || "DEMO";

      const response = await fetch(`${baseUrl}/api/tools/get-top-clients-revenue`, {
        method: "POST",
        headers: { "Content-Type": "application/json",
          "Authorization": `Bearer ${getAuthToken()}`, },
        body: JSON.stringify({ client_id: clientId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      if (json.ok && json.data && Array.isArray(json.data.data)) {
        setClients(json.data.data);
        if (json.data.period) setPeriod(json.data.period);
      } else {
        throw new Error(json.error || "Impossible de charger les données");
      }
    } catch (err: any) {
      console.error("[VfinTopClientsCard] Error:", err);
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
        <span>Top 5 Clients — CA</span>
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
            CHARGEMENT DU TOP CLIENTS…
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
      ) : clients.length === 0 ? (
        <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "var(--muted)", padding: "4px 0" }}>
          AUCUNE DONNÉE POUR CE MOIS
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
              {/* Client Info (Rank & Name) */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", marginRight: "10px" }}>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "8.5px",
                    fontWeight: 800,
                    fontFamily: "var(--font-mono)",
                    color: c.rank === 1 ? "#FFD700" : (c.rank === 2 ? "#C0C0C0" : (c.rank === 3 ? "#E67E22" : (c.rank === 4 ? "#A3B1F9" : "#00D2D3"))),
                    backgroundColor: c.rank === 1 ? "rgba(255, 215, 0, 0.1)" : (c.rank === 2 ? "rgba(192, 192, 192, 0.1)" : (c.rank === 3 ? "rgba(230, 126, 34, 0.1)" : (c.rank === 4 ? "rgba(163, 177, 249, 0.1)" : "rgba(0, 210, 211, 0.1)"))),
                    border: c.rank === 1 ? "1px solid rgba(255, 215, 0, 0.25)" : (c.rank === 2 ? "1px solid rgba(192, 192, 192, 0.25)" : (c.rank === 3 ? "1px solid rgba(230, 126, 34, 0.25)" : (c.rank === 4 ? "1px solid rgba(163, 177, 249, 0.25)" : "1px solid rgba(0, 210, 211, 0.25)"))),
                    borderRadius: "6px",
                    width: "24px",
                    height: "24px",
                    flexShrink: 0,
                    boxShadow: "inset 0 0 4px rgba(0, 0, 0, 0.5)",
                  }}
                >
                  #{c.rank}
                </span>
                <span
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 600,
                    color: "var(--white)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "140px",
                  }}
                  title={c.client}
                >
                  {c.client}
                </span>
              </div>

              {/* Client Metric (CA Total & Count) */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--white)", fontFamily: "var(--font-mono)" }}>
                  {fmt(c.caTotal * animProgress)} <span style={{ fontSize: "8px", fontWeight: 500, color: "var(--muted)" }}>TND</span>
                </span>
                <span style={{ fontSize: "7.5px", color: "var(--muted)", fontFamily: "var(--font-mono)", marginTop: "1px" }}>
                  {Math.round(c.nbDossiers * animProgress)} dossier{Math.round(c.nbDossiers * animProgress) > 1 ? "s" : ""}
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
        <span>{period ? period.toUpperCase() : "—"}</span>
        <span>SUIVI DE FRET</span>
      </div>
    </div>
  );
};
