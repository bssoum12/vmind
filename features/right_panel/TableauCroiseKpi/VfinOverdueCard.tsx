"use client";

import React, { useEffect, useState, useRef } from "react";

interface UnpaidInterval {
  key: string;
  label: string;
  color: string;
  amount: number;
  amountFormatted: string;
  percentage: number;
  nbClients: number;
}

interface VfinOverdueCardProps {
  activeAgentId?: string;
}

export const VfinOverdueCard: React.FC<VfinOverdueCardProps> = ({ activeAgentId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hovered, setHovered] = useState(false);
  const [activeIntervalKey, setActiveIntervalKey] = useState<string | null>(null);
  const [donutHovered, setDonutHovered] = useState(false);
  const [animProgress, setAnimProgress] = useState(0);

  const [totalImpayes, setTotalImpayes] = useState<number>(0);
  const [totalFormatted, setTotalFormatted] = useState<string>("0,00");
  const [nbClients, setNbClients] = useState<number>(0);
  const [intervals, setIntervals] = useState<UnpaidInterval[]>([]);

  const cardRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    setLoading(true);
    setError("");

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const clientId = process.env.NEXT_PUBLIC_CLIENT_ID || "DEMO";

      const response = await fetch(`${baseUrl}/api/tools/get-overdue-balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      if (json.ok && json.data) {
        const resultData = json.data;
        
        const kpis = resultData.kpis || [];
        const totalKpi = kpis.find((k: any) => k.label.toLowerCase().includes("montant"));
        const clientsKpi = kpis.find((k: any) => k.label.toLowerCase().includes("client"));

        setTotalImpayes(totalKpi ? totalKpi.value : 0);
        setTotalFormatted(totalKpi ? totalKpi.display : "0,00");
        setNbClients(clientsKpi ? clientsKpi.value : 0);
        setIntervals(resultData.intervals || []);
      } else {
        throw new Error(json.error || "Impossible de charger les données");
      }
    } catch (err: any) {
      console.error("[VfinOverdueCard] Error:", err);
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
    if (loading || totalImpayes === 0) return;
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
  }, [totalImpayes, loading]);

  if (activeAgentId !== "VFIN") {
    return null;
  }

  const themeColor = "#FF4757"; // Coral/Red highlight matching the Outstanding/Overdue Debt theme
  const fmt = (n: number) => n.toLocaleString("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  const formatCompact = (val: number): string => {
    if (val >= 1000000) {
      return (val / 1000000).toFixed(1) + "M";
    } else if (val >= 1000) {
      return (val / 1000).toFixed(1) + "K";
    }
    return val.toLocaleString("fr-TN", { maximumFractionDigits: 0 });
  };

  // Math for Premium SVG Donut
  const radius = 28;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius; // 175.93

  let cumulativePercentage = 0;
  const segmentCircles = intervals.map((item) => {
    // Resolve CSS variables to actual hex colors for consistent SVG rendering
    const resolvedColor = item.color === "var(--red)" ? "#FF4757" : item.color === "var(--green)" ? "#1D9E75" : item.color;
    
    const gapLength = totalImpayes > 0 && item.percentage > 0 ? 2.5 : 0; 
    const segmentLength = (item.percentage / 100) * circumference;
    const dashArray = `${Math.max(0, segmentLength - gapLength)} ${circumference}`;
    const rotation = (cumulativePercentage / 100) * 360 - 90;
    cumulativePercentage += item.percentage;

    return {
      ...item,
      color: resolvedColor,
      dashArray,
      rotation
    };
  });

  return (
    <div
      ref={cardRef}
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
          marginBottom: "16px",
          fontWeight: 600,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>Répartition des impayés</span>
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
            CHARGEMENT DE LA RÉPARTITION…
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
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          
          {/* Left: Premium SVG Donut Chart */}
          <div 
            onMouseEnter={() => setDonutHovered(true)}
            onMouseLeave={() => setDonutHovered(false)}
            style={{ 
              position: "relative", 
              flexShrink: 0, 
              width: "80px", 
              height: "80px", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center" 
            }}
          >
            <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(0deg)" }}>
              <defs>
                <filter id="segment-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              
              {/* Background Track */}
              <circle
                cx="40"
                cy="40"
                r={radius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.04)"
                strokeWidth={strokeWidth}
              />
              
              {/* Curved Glowing Segments */}
              {segmentCircles.map((seg) => {
                const isSelected = activeIntervalKey === seg.key;
                return (
                  <circle
                    key={seg.key}
                    cx="40"
                    cy="40"
                    r={radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={seg.dashArray}
                    strokeDashoffset="0"
                    style={{
                      transform: `rotate(${seg.rotation}deg)`,
                      transformOrigin: "40px 40px",
                      transition: "opacity 0.3s ease",
                      pointerEvents: "none",
                      filter: isSelected ? "url(#segment-glow)" : "none",
                      opacity: activeIntervalKey === null || isSelected ? 1 : 0.3,
                    }}
                  />
                );
              })}
            </svg>

            {/* Inner Info Card */}
            <div
              style={{
                position: "absolute",
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                backgroundColor: "rgba(6, 17, 31, 0.98)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "inset 0 0 6px rgba(0,0,0,0.6)",
                pointerEvents: "none",
              }}
            >
              <span
                style={{
                  fontSize: donutHovered 
                    ? "7.5px" 
                    : "10px",
                  fontWeight: 800,
                  fontFamily: "var(--font-mono)",
                  color: "var(--white)",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  transition: "font-size 0.2s ease",
                }}
              >
                {donutHovered ? fmt(totalImpayes * animProgress) : formatCompact(totalImpayes * animProgress)}
              </span>
              <span
                style={{
                  fontSize: "7px",
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted)",
                  marginTop: "1px",
                }}
              >
                TND
              </span>
            </div>
          </div>

          {/* Right: Intervals Breakdown */}
          <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
            {intervals.map((item) => {
              const isSelected = activeIntervalKey === item.key;
              const resolvedColor = item.color === "var(--red)" ? "#FF4757" : item.color === "var(--green)" ? "#1D9E75" : item.color;
              const animatedAmount = item.amount * animProgress;
              const animatedNbClients = Math.round(item.nbClients * animProgress);
              
              return (
                <div
                  key={item.key}
                  onMouseEnter={() => setActiveIntervalKey(item.key)}
                  onMouseLeave={() => setActiveIntervalKey(null)}
                  style={{
                    position: "relative",
                    padding: "5px 6px",
                    background: isSelected ? "rgba(255, 255, 255, 0.04)" : "rgba(255, 255, 255, 0.015)",
                    border: isSelected ? `1px solid ${resolvedColor}40` : "1px solid rgba(255, 255, 255, 0.03)",
                    borderRadius: "4px",
                    cursor: "pointer",
                    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                    opacity: activeIntervalKey === null || isSelected ? 1 : 0.6,
                  }}
                >
                  {/* Inner container for text/dots */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {/* Top line: Label + Percentage */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            backgroundColor: resolvedColor,
                            boxShadow: isSelected ? `0 0 6px ${resolvedColor}` : `0 0 3px ${resolvedColor}`,
                            transition: "all 0.2s",
                          }}
                        />
                        <span
                          style={{
                            fontSize: "9.5px",
                            color: "var(--white)",
                            fontWeight: 600,
                          }}
                        >
                          {item.label}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: "9.5px",
                          fontWeight: 700,
                          fontFamily: "var(--font-mono)",
                          color: resolvedColor,
                        }}
                      >
                        {item.percentage}%
                      </span>
                    </div>

                    {/* Bottom line: Amount + Clients count */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "3px" }}>
                      <span
                        style={{
                          fontSize: "9.5px",
                          fontWeight: 600,
                          fontFamily: "var(--font-mono)",
                          color: "rgba(255, 255, 255, 0.7)",
                        }}
                      >
                        {fmt(animatedAmount)}{" "}
                        <span style={{ fontSize: "7px", color: "var(--muted)", fontWeight: 500 }}>TND</span>
                      </span>
                      <span
                        style={{
                          fontSize: "7.5px",
                          fontFamily: "var(--font-mono)",
                          color: "rgba(255, 255, 255, 0.25)",
                        }}
                      >
                        {animatedNbClients} client{animatedNbClients > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* Divider */}
      <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.06)", margin: "10px 0 6px 0" }} />

      {/* Footer */}
      <div
        style={{
          fontSize: "8px",
          color: "var(--muted)",
          fontFamily: "var(--font-mono)",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>TOTAL IMPAYÉS : {fmt(totalImpayes * animProgress)} TND</span>
        <span style={{ color: "rgba(255, 255, 255, 0.3)" }}>
          {Math.round(nbClients * animProgress)} clients au total
        </span>
      </div>
    </div>
  );
};
