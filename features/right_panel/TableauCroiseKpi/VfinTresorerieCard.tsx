"use client";

import React, { useEffect, useState, useRef } from "react";
import { useKpis } from "../../../shared/contexts/KpiCacheContext";
import { SkeletonLoader } from "@/components/vmind/SkeletonLoader";

interface TresorerieData {
  tresorerieNette: number;
  tresorerieNetteFormatted: string;
  tendance: "positive" | "negative";
  periodLabel: string;
  encaissements: { total: number; formatted: string; facture: number; factureFormatted: string };
  decaissements: { total: number; formatted: string; enRetard: number; enRetardFormatted: string };
  creancesRestantes: number;
  creancesRestantesFormatted: string;
  decaissementsTotal: number;
  decaissementsTotalFormatted: string;
  details: { deltaNet: number };
}

interface VfinTresorerieCardProps {
  activeAgentId?: string;
}

export const VfinTresorerieCard: React.FC<VfinTresorerieCardProps> = ({ activeAgentId }) => {
  const { kpisByAgent, loadingByAgent, fetchKpis } = useKpis();
  const [hovered, setHovered] = useState(false);

  // Animated values
  const [animNet, setAnimNet] = useState(0);
  const [animEncaiss, setAnimEncaiss] = useState(0);
  const [animDecaiss, setAnimDecaiss] = useState(0);
  const [animCreances, setAnimCreances] = useState(0);
  const [animDettes, setAnimDettes] = useState(0);
  const [animFacture, setAnimFacture] = useState(0);
  const [animRetard, setAnimRetard] = useState(0);

  // Read current active data from Context
  const agentData = kpisByAgent["vfin"] || {};
  const toolData = agentData.get_tresorerie_kpi || {};

  const data: TresorerieData | null = toolData.ok && toolData.data ? toolData.data : null;

  const loading = loadingByAgent["vfin"] && !toolData.ok;
  const error = !loading && !toolData.ok && agentData.error ? agentData.error : "";

  // Count-up animation when data arrives
  useEffect(() => {
    if (!data) return;
    const duration = 1200;
    const start = performance.now();
    const targetNet = data.tresorerieNette;
    const targetEnc = data.encaissements.total;
    const targetDec = data.decaissements.total;
    const targetCre = data.creancesRestantes;
    const targetDet = data.decaissementsTotal;
    const targetFac = data.encaissements.facture;
    const targetRet = data.decaissements.enRetard;

    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = t * (2 - t);
      setAnimNet(targetNet * ease);
      setAnimEncaiss(targetEnc * ease);
      setAnimDecaiss(targetDec * ease);
      setAnimCreances(targetCre * ease);
      setAnimDettes(targetDet * ease);
      setAnimFacture(targetFac * ease);
      setAnimRetard(targetRet * ease);
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [data]);

  if (activeAgentId !== "VFIN") return null;

  const isPositive = data ? data.tendance === "positive" : true;
  const themeColorHex = isPositive ? "#1D9E75" : "#FF4757";

  const fmt = (n: number) =>
    n.toLocaleString("fr-TN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Gauge bar: ratio of encaissements vs decaissements
  const total = data ? (data.encaissements.total + data.decaissements.total) : 0;
  const encaissRatio = total > 0 ? (data!.encaissements.total / total) * 100 : 50;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        marginTop: "16px",
        overflow: "hidden",
        padding: "16px",
        backgroundColor: hovered ? "rgba(6, 17, 31, 0.88)" : "rgba(6, 17, 31, 0.72)",
        backgroundImage: `
          radial-gradient(${themeColorHex}08 1px, transparent 0),
          radial-gradient(${themeColorHex}03 1px, transparent 0)
        `,
        backgroundSize: "12px 12px",
        backgroundPosition: "0 0, 6px 6px",
        border: hovered ? `1px solid ${themeColorHex}60` : `1px solid ${themeColorHex}2b`,
        borderRadius: "8px",
        boxShadow: hovered
          ? `0 10px 35px rgba(0,0,0,0.55), inset 0 0 16px ${themeColorHex}18, 0 0 15px ${themeColorHex}20`
          : `0 10px 35px rgba(0,0,0,0.55), inset 0 0 16px ${themeColorHex}08`,
        transform: hovered ? "translateY(-1px) scale(1.005)" : "none",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        cursor: "default",
      }}
    >
      {/* Corner Brackets */}
      {[["top","left"],["top","right"],["bottom","left"],["bottom","right"]].map(([v,h]) => (
        <div key={`${v}-${h}`} style={{
          position: "absolute", [v]: 0, [h]: 0,
          width: "10px", height: "10px",
          [`border${v.charAt(0).toUpperCase()+v.slice(1)}`]: `2px solid ${themeColorHex}`,
          [`border${h.charAt(0).toUpperCase()+h.slice(1)}`]: `2px solid ${themeColorHex}`,
          borderRadius: v === "top" && h === "left" ? "2px 0 0 0" : v === "top" && h === "right" ? "0 2px 0 0" : v === "bottom" && h === "left" ? "0 0 0 2px" : "0 0 2px 0",
          boxShadow: `0 0 5px ${themeColorHex}60`,
        }} />
      ))}

      {/* Scanline top */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "1.5px",
        background: `linear-gradient(90deg, transparent, ${themeColorHex}, transparent)`,
        opacity: 0.7,
      }} />

      {/* Header */}
      <div style={{
        fontSize: "9px", color: "var(--muted)", fontFamily: "var(--font-mono)",
        letterSpacing: "1.5px", textTransform: "uppercase",
        marginBottom: "12px", fontWeight: 600,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span>Trésorerie (TND)</span>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "8px 0" }}>
          <SkeletonLoader height="28px" width="50%" />
          <SkeletonLoader height="10px" width="80%" />
          <SkeletonLoader height="6px" width="100%" style={{ borderRadius: "3px" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "4px" }}>
            <SkeletonLoader height="36px" width="100%" />
            <SkeletonLoader height="36px" width="100%" />
          </div>
        </div>
      ) : error ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{ color: "var(--red)", fontSize: "9px", fontFamily: "var(--font-mono)" }}>{error}</span>
          <button onClick={() => fetchKpis('vfin', true)} style={{ background: "none", border: "none", color: "var(--cyan)", cursor: "pointer", fontSize: "8px", fontFamily: "var(--font-mono)", textDecoration: "underline", padding: 0 }}>Réessayer</button>
        </div>
      ) : data ? (
        <>
          {/* Main Net Value */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", marginBottom: "4px" }}>
            <span style={{
              fontSize: "22px", fontWeight: 800, fontFamily: "var(--font-mono)",
              color: "var(--white)", lineHeight: 1, letterSpacing: "-0.5px",
            }}>
              {fmt(animNet)}
            </span>
            <span style={{ fontSize: "9px", color: "var(--muted)", fontFamily: "var(--font-mono)", marginBottom: "3px" }}>TND</span>
          </div>

          {/* Trend badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
            <span style={{
              fontSize: "9px", fontFamily: "var(--font-mono)", fontWeight: 700,
              color: themeColorHex, display: "flex", alignItems: "center", gap: "3px"
            }}>
              {isPositive ? (
                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l8 16H4z"/></svg>
              ) : (
                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 20l-8-16h16z"/></svg>
              )}
              {isPositive ? "TENDANCE POSITIVE" : "TENDANCE NÉGATIVE"}
            </span>
            <span style={{ fontSize: "8px", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
              vs année {new Date().getFullYear() - 1} :{" "}
              <span style={{ color: data.details.deltaNet >= 0 ? "#1D9E75" : "#FF4757", fontWeight: 600 }}>
                {data.details.deltaNet >= 0 ? "+" : ""}{fmt(data.details.deltaNet)} TND
              </span>
            </span>
          </div>

          {/* Encaissements / Décaissements gauge bar */}
          <div style={{ marginBottom: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ fontSize: "8px", color: "#1D9E75", fontFamily: "var(--font-mono)" }}>
                ▲ Encaissements
              </span>
              <span style={{ fontSize: "8px", color: "#FF4757", fontFamily: "var(--font-mono)" }}>
                Décaissements ▼
              </span>
            </div>
            <div style={{ height: "6px", borderRadius: "3px", background: "rgba(255,255,255,0.04)", overflow: "hidden", display: "flex" }}>
              {/* Encaissements Segment */}
              <div style={{
                height: "100%",
                width: `${encaissRatio}%`,
                background: "linear-gradient(90deg, #1D9E75, #00E676)",
                transition: "width 1.2s ease",
                boxShadow: "0 0 6px rgba(29, 158, 117, 0.4)",
              }} />
              {/* Décaissements Segment */}
              <div style={{
                height: "100%",
                width: `${data ? (data.decaissements.total / total) * 100 : 50}%`,
                background: "linear-gradient(90deg, #FF4757, #FF6B81)",
                transition: "width 1.2s ease",
                boxShadow: "0 0 6px rgba(255, 71, 87, 0.4)",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
              <span style={{ fontSize: "8px", color: "var(--white)", fontFamily: "var(--font-mono)" }}>
                {fmt(animEncaiss)}
              </span>
              <span style={{ fontSize: "8px", color: "var(--white)", fontFamily: "var(--font-mono)" }}>
                {fmt(animDecaiss)}
              </span>
            </div>
          </div>

          {/* Sub-metrics grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
            {[
              { 
                label: "Créances clients (solde net)", 
                value: animCreances, 
                color: "#1D9E75", 
                borderColor: "#1D9E75",
                bgTint: "rgba(29, 158, 117, 0.03)",
                borderTint: "rgba(29, 158, 117, 0.15)",
                scope: "Balance actuelle",
                icon: (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                )
              },
              { 
                label: "Dettes fournisseurs (solde net)", 
                value: animDettes, 
                color: "#FF4757", 
                borderColor: "#FF4757",
                bgTint: "rgba(255, 71, 87, 0.03)",
                borderTint: "rgba(255, 71, 87, 0.15)",
                scope: "Balance actuelle",
                icon: (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="9" cy="21" r="1"/>
                    <circle cx="20" cy="21" r="1"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                  </svg>
                )
              },
              { 
                label: "Total facturé clients", 
                value: animFacture, 
                color: "#38bdf8", 
                borderColor: "#38bdf8",
                bgTint: "rgba(56, 189, 248, 0.03)",
                borderTint: "rgba(56, 189, 248, 0.15)",
                scope: "Balance actuelle",
                icon: (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                )
              },
              { 
                label: "Échéances dépassées (brut)", 
                value: animRetard, 
                color: "#FF7A00", 
                borderColor: "#FF7A00",
                bgTint: "rgba(255, 122, 0, 0.03)",
                borderTint: "rgba(255, 122, 0, 0.15)",
                scope: "Factures non réglées à date",
                icon: (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                )
              },
            ].map((item: any) => (
              <div key={item.label} style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: item.bgTint,
                border: `1px solid ${item.borderTint}`,
                borderLeft: `2.5px solid ${item.borderColor}`,
                borderRadius: "5px",
                padding: "6px 8px",
                boxShadow: `0 4px 15px rgba(0, 0, 0, 0.25)`,
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = item.bgTint.replace("0.03", "0.07");
                e.currentTarget.style.boxShadow = `0 4px 20px ${item.borderColor}10`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = item.bgTint;
                e.currentTarget.style.boxShadow = `0 4px 15px rgba(0, 0, 0, 0.25)`;
              }}
              >
                {/* Left: Icon Badge */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "24px",
                  height: "24px",
                  borderRadius: "4px",
                  background: "rgba(0,0,0,0.3)",
                  border: `1px solid ${item.borderColor}30`,
                  color: item.borderColor,
                  flexShrink: 0,
                }}>
                  {item.icon}
                </div>

                {/* Right: Values & Texts */}
                <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", flexGrow: 1 }}>
                  <div style={{ 
                    fontSize: "10px", 
                    fontWeight: 700, 
                    color: item.color, 
                    fontFamily: "var(--font-mono)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}>
                    {fmt(item.value)}{" "}
                    <span style={{ fontSize: "7px", color: "var(--muted)", fontWeight: 500 }}>TND</span>
                  </div>
                  <div style={{ 
                    fontSize: "7.5px", 
                    color: "rgba(255, 255, 255, 0.8)", 
                    fontWeight: 500,
                    marginTop: "2px",
                    lineHeight: 1.1,
                  }} title={item.label}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: "6.5px", color: "rgba(255,255,255,0.22)", marginTop: "1px", fontStyle: "italic" }}>
                    {item.scope}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "6px 0" }} />

          {/* Footer */}
          <div style={{ fontSize: "8px", color: "var(--muted)", fontFamily: "var(--font-mono)", display: "flex", justifyContent: "space-between" }}>
            <span>{data.periodLabel.toUpperCase()}</span>
            <span>TRÉSORERIE RÉELLE</span>
          </div>
        </>
      ) : null}
    </div>
  );
};
