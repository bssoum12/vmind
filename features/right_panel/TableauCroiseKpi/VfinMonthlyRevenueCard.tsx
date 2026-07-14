"use client";

import React, { useEffect, useState } from "react";
import { useKpis } from "../../../shared/contexts/KpiCacheContext";
import { SkeletonLoader } from "@/components/vmind/SkeletonLoader";

interface VfinMonthlyRevenueCardProps {
  activeAgentId?: string;
}

export const VfinMonthlyRevenueCard: React.FC<VfinMonthlyRevenueCardProps> = ({ activeAgentId }) => {
  const { kpisByAgent, loadingByAgent, fetchKpis, error: globalError } = useKpis();
  const [hovered, setHovered] = useState(false);
  const [animProgress, setAnimProgress] = useState(0);

  // Read current active data from Context
  const agentData = kpisByAgent["vfin"] || {};
  
  const revToolData = agentData.get_monthly_validated_revenue || {};
  const compToolData = agentData.compare_monthly_revenue || {};

  const revKpis = revToolData.ok && revToolData.kpis ? revToolData.kpis : [];
  const compKpis = compToolData.ok && compToolData.kpis ? compToolData.kpis : [];

  const caKpi = revKpis.find((k: any) => k.label.includes("CA"));
  const margeKpi = revKpis.find((k: any) => k.label.includes("Marge"));
  const rateKpi = revKpis.find((k: any) => k.label.includes("Taux"));

  const caTotal = caKpi ? caKpi.value : null;
  const margeTotal = margeKpi ? margeKpi.value : null;
  const tauxMarge = rateKpi ? rateKpi.value : null;

  const prevCaKpi = compKpis.find((k: any) => k.label.includes("précédent"));
  const evoKpi = compKpis.find((k: any) => k.label.includes("Évolution"));

  // Fallback to compare_monthly_margin details if compare_monthly_revenue is missing
  const marginToolData = agentData.compare_monthly_margin || {};
  const marginDetails = marginToolData.data?.details || marginToolData.details || {};

  let caPrecedent = prevCaKpi ? prevCaKpi.value : null;
  let evolutionPct = evoKpi ? evoKpi.value : null;

  if (caPrecedent === null && marginDetails.caPrecedent !== undefined) {
    caPrecedent = marginDetails.caPrecedent;
    if (caPrecedent > 0 && caTotal !== null) {
      evolutionPct = ((caTotal - caPrecedent) / caPrecedent) * 100;
    } else {
      evolutionPct = 0;
    }
  }

  const loading = loadingByAgent["vfin"] && !revToolData.ok;
  const error = !loading && !revToolData.ok && globalError ? globalError : "";

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
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "8px 0" }}>
          <SkeletonLoader height="28px" width="60%" />
          <SkeletonLoader height="12px" width="40%" />
          <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.06)", margin: "4px 0" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <SkeletonLoader height="8px" width="40%" style={{ marginBottom: "4px" }} />
              <SkeletonLoader height="12px" width="80%" />
            </div>
            <div>
              <SkeletonLoader height="8px" width="40%" style={{ marginBottom: "4px" }} />
              <SkeletonLoader height="12px" width="80%" />
            </div>
          </div>
        </div>
      ) : error ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{ color: "var(--red)", fontSize: "9px", fontFamily: "var(--font-mono)" }}>
            {error}
          </span>
          <button
            onClick={() => fetchKpis('vfin', true)}
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
