"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface ScoreGlobalTooltipProps {
  visible: boolean;
  coords: { top: number; left: number };
  details: any;
  prevScore?: number | null;
  prevDetails?: any;
  prevYear?: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const ScoreGlobalTooltip: React.FC<ScoreGlobalTooltipProps> = ({
  visible,
  coords,
  details,
  prevScore,
  prevDetails,
  prevYear,
  onMouseEnter,
  onMouseLeave,
}) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [animatedDelivery, setAnimatedDelivery] = useState(0);
  const [animatedImpayes, setAnimatedImpayes] = useState(0);
  const [hoveredDelivery, setHoveredDelivery] = useState(false);
  const [hoveredImpayes, setHoveredImpayes] = useState(false);

  const [animatedTotalMouvements, setAnimatedTotalMouvements] = useState(0);
  const [animatedATemps, setAnimatedATemps] = useState(0);
  const [animatedEnRetard, setAnimatedEnRetard] = useState(0);
  const [animatedNombreFactures, setAnimatedNombreFactures] = useState(0);
  const [animatedMontantFacture, setAnimatedMontantFacture] = useState(0);
  const [animatedFacturesImpayees, setAnimatedFacturesImpayees] = useState(0);
  const [animatedMontantImpaye, setAnimatedMontantImpaye] = useState(0);
  const [animatedTauxImpayes, setAnimatedTauxImpayes] = useState(0);

  const scoreQualite = details?.score_qualite_global ?? 0;
  const tauxLivraison = details?.taux_livraison ?? 0;
  const scoreImpayes = details?.score_impayes ?? 0;
  const statut = details?.statut ?? "Inconnu";

  const totalMouvements = details?.total_mouvements ?? 0;
  const mouvementsATemps = details?.mouvements_a_temps ?? 0;
  const mouvementsEnRetard = details?.mouvements_en_retard ?? 0;
  const nombreFactures = details?.nombre_factures ?? 0;
  const tauxImpayes = details?.taux_impayes ?? 0;
  const montantTotalImpaye = details?.montant_total_impaye ?? 0;
  const montantTotalFacture = details?.montant_total_facture ?? 0;
  const nombreFacturesImpayees = details?.nombre_factures_impayees ?? 0;

  // Arc calculations
  const circumference = 376.99; // 2 * PI * 60
  const arcLength = 282.74; // 270 degrees arc (circumference * 0.75)
  const animatedPct = Math.max(0, Math.min(animatedScore, 100)) / 100;

  useEffect(() => {
    if (visible) {
      // Animate count up score
      const duration = 1000;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = progress * (2 - progress); // Ease out quad

        setAnimatedScore(scoreQualite * easeProgress);
        setAnimatedDelivery(tauxLivraison * easeProgress);
        setAnimatedImpayes(scoreImpayes * easeProgress);

        setAnimatedTotalMouvements(totalMouvements * easeProgress);
        setAnimatedATemps(mouvementsATemps * easeProgress);
        setAnimatedEnRetard(mouvementsEnRetard * easeProgress);
        setAnimatedNombreFactures(nombreFactures * easeProgress);
        setAnimatedMontantFacture(montantTotalFacture * easeProgress);
        setAnimatedFacturesImpayees(nombreFacturesImpayees * easeProgress);
        setAnimatedMontantImpaye(montantTotalImpaye * easeProgress);
        setAnimatedTauxImpayes(tauxImpayes * easeProgress);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    } else {
      setAnimatedScore(0);
      setAnimatedDelivery(0);
      setAnimatedImpayes(0);
      setAnimatedTotalMouvements(0);
      setAnimatedATemps(0);
      setAnimatedEnRetard(0);
      setAnimatedNombreFactures(0);
      setAnimatedMontantFacture(0);
      setAnimatedFacturesImpayees(0);
      setAnimatedMontantImpaye(0);
      setAnimatedTauxImpayes(0);
    }
  }, [
    visible,
    scoreQualite,
    tauxLivraison,
    scoreImpayes,
    totalMouvements,
    mouvementsATemps,
    mouvementsEnRetard,
    nombreFactures,
    montantTotalFacture,
    nombreFacturesImpayees,
    montantTotalImpaye,
    tauxImpayes
  ]);

  if (!visible) return null;

  // Determine status color and styling
  let statusColor = "var(--red)";
  let statusText = "CRITIQUE";
  let statusClass = "pulse-text-red";
  let IconElement = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={statusClass}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );

  if (scoreQualite >= 85) {
    statusColor = "var(--green)";
    statusText = "EXCELLENT";
    statusClass = "pulse-text-green";
    IconElement = (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={statusClass}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    );
  } else if (scoreQualite >= 70) {
    statusColor = "var(--cyan)";
    statusText = "BON";
    statusClass = "pulse-text-green";
    IconElement = (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={statusClass}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 8 12 12 16 14" />
      </svg>
    );
  } else if (scoreQualite >= 50) {
    statusColor = "var(--amber)";
    statusText = "À SURVEILLER";
    statusClass = "pulse-text-amber";
    IconElement = (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={statusClass}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    );
  }

  const gradientEndColor =
    statusColor === "var(--green)"
      ? "#85ff7a"
      : statusColor === "var(--cyan)"
      ? "#5cffea"
      : statusColor === "var(--amber)"
      ? "#ffd05b"
      : "#ff6b8b";

  const tooltipWidth = 520;
  const leftPosition = Math.max(10, coords.left - tooltipWidth - 12);

  // Dynamic top positioning to prevent overflowing the viewport
  const tooltipHeight = 580; // Estimated height for ScoreGlobalTooltip
  let topPosition = coords.top - 20;
  if (typeof window !== "undefined") {
    if (topPosition + tooltipHeight > window.innerHeight) {
      topPosition = window.innerHeight - tooltipHeight - 20;
    }
    topPosition = Math.max(20, topPosition);
  }

  const formatAmount = (amount: number): string => {
    return amount.toLocaleString('fr-FR', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }) + " TND";
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, x: 15 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95, x: 15 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: "fixed",
        left: `${leftPosition}px`,
        top: `${topPosition}px`,
        width: `${tooltipWidth}px`,

        background: "rgba(6, 17, 31, 0.98)",
        border: `1px solid ${statusColor}40`,
        borderRadius: "12px",

        padding: "20px",
        backdropFilter: "blur(14px)",

        boxShadow: `0 20px 50px rgba(0,0,0,0.6), 0 0 30px ${statusColor}0D`,

        pointerEvents: "auto",
        zIndex: 99999,
      }}
    >
      {/* Cyber HUD Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(0, 240, 255, 0.15)",
          paddingBottom: "8px",
          marginBottom: "16px",
          fontSize: "8px",
          color: "rgba(0, 240, 255, 0.8)",
          letterSpacing: "1px",
          textTransform: "uppercase",
          fontFamily: "var(--font-mono), monospace",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ display: "inline-block", width: "4px", height: "4px", background: "#00f0ff", borderRadius: "50%", boxShadow: "0 0 4px #00f0ff" }} />
          <span style={{ color: "#00f0ff", fontWeight: 700 }}> SCORE QUALITÉ GLOBAL </span>
        </div>
        <div style={{ opacity: 0.8 }}> VDATA ASSISTANT </div>
      </div>

      {/* Main Row: Gauge & Score Composition */}
      <div
        style={{
          display: "flex",
          gap: "24px",
          alignItems: "center",
          marginBottom: "20px",
          position: "relative",
        }}
      >
        {/* Left Column: Gauge */}
        <div
          style={{
            position: "relative",
            width: "190px",
            height: "190px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <style>{`
            @keyframes gaugeGlowPulse {
              0% {
                filter: drop-shadow(0 0 3px ${statusColor}60);
              }
              50% {
                filter: drop-shadow(0 0 12px ${statusColor}) drop-shadow(0 0 3px ${statusColor}60);
              }
              100% {
                filter: drop-shadow(0 0 3px ${statusColor}60);
              }
            }
            @keyframes innerCirclePulse {
              0% {
                opacity: 0.2;
              }
              50% {
                opacity: 0.85;
              }
              100% {
                opacity: 0.2;
              }
            }
            .gauge-premium-arc {
              animation: gaugeGlowPulse 2.5s infinite ease-in-out;
            }
            .gauge-inner-pulse {
              animation: innerCirclePulse 3s infinite ease-in-out;
            }
          `}</style>
          <svg width="190" height="190" viewBox="0 0 190 190" style={{ overflow: "visible" }}>
            <defs>
              <radialGradient id="gaugeInnerGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={statusColor} stopOpacity="0.3" />
                <stop offset="70%" stopColor={statusColor} stopOpacity="0.05" />
                <stop offset="100%" stopColor={statusColor} stopOpacity="0" />
              </radialGradient>
              <linearGradient id="progressGradient" x1="0" y1="190" x2="190" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={statusColor} />
                <stop offset="100%" stopColor={gradientEndColor} />
              </linearGradient>
            </defs>

            {/* Background Inner Radial Glow */}
            <circle
              cx="95"
              cy="95"
              r="75"
              fill="url(#gaugeInnerGlow)"
              className="gauge-inner-pulse"
            />

            {/* Dial Ticks (Speedometer Ticks) */}
            <circle
              cx="95"
              cy="95"
              r="88"
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="2"
              strokeDasharray="1 5"
            />

            {/* Inner track border */}
            <circle
              cx="95"
              cy="95"
              r="74"
              fill="none"
              stroke="rgba(255,255,255,0.02)"
              strokeWidth="1"
            />

            {/* Background Arc */}
            <circle
              cx="95"
              cy="95"
              r="80"
              fill="none"
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="10"
              strokeDasharray="376.99 125.66"
              transform="rotate(135 95 95)"
              strokeLinecap="round"
            />

            {/* Progress Arc */}
            <circle
              cx="95"
              cy="95"
              r="80"
              fill="none"
              stroke="url(#progressGradient)"
              strokeWidth="10"
              strokeDasharray={`${376.99 * animatedPct} 502.65`}
              transform="rotate(135 95 95)"
              strokeLinecap="round"
              className="gauge-premium-arc"
            />

            {/* Top glass reflection arc */}
            <path
              d="M 45,45 A 70,70 0 0,1 145,45"
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>

          {/* Inner Gauge Text */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              paddingBottom: "4px",
            }}
          >
            {/* Split Typographic Percentage */}
            <div
              style={{
                fontSize: "32px",
                fontWeight: 850,
                color: "var(--white)",
                lineHeight: 1,
                fontFamily: "var(--font-body)",
                display: "flex",
                alignItems: "baseline",
                letterSpacing: "-0.5px",
                textShadow: "0 2px 10px rgba(0,0,0,0.5)",
              }}
            >
              <span>{Math.floor(animatedScore)}</span>
              <span style={{ fontSize: "20px", fontWeight: 700 }}>
                .{(animatedScore % 1).toFixed(2).substring(2)}
              </span>
              <span
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.6)",
                  marginLeft: "2px",
                }}
              >
                %
              </span>
            </div>

            {/* Cyber Pill Status Badge */}
            <div
              style={{
                fontSize: "8px",
                fontWeight: 800,
                color: statusColor,
                letterSpacing: "1px",
                marginTop: "6px",
                fontFamily: "var(--font-mono)",
                textAlign: "center",
                background: `${statusColor}0f`,
                border: `1px solid ${statusColor}2a`,
                padding: "2px 8px",
                borderRadius: "10px",
                boxShadow: `0 0 8px ${statusColor}0a`,
                textTransform: "uppercase",
              }}
            >
              {statusText}
            </div>

            {/* Premium Capsule for Icon */}
            <div
              style={{
                marginTop: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: `${statusColor}08`,
                border: `1px solid ${statusColor}1c`,
                boxShadow: `0 0 6px ${statusColor}05`,
                color: statusColor,
              }}
            >
              {IconElement}
            </div>

            {prevScore !== undefined && prevScore !== null && (
              <div
                style={{
                  marginTop: "10px",
                  fontSize: "8px",
                  fontFamily: "var(--font-mono)",
                  color: "rgba(255, 255, 255, 0.4)",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "2px",
                  width: "110px",
                }}
              >
                <span>vs {prevYear || "l'an dernier"} :</span>
                <span style={{ color: "var(--white)", fontWeight: 700 }}>
                  {prevScore.toFixed(2)}%
                </span>
                {(() => {
                  const diff = (details?.score_qualite_global ?? 0) - prevScore;
                  const color = diff >= 0 ? "#00e5c8" : "#ff3b30";
                  const sign = diff >= 0 ? "+" : "";
                  return (
                    <span style={{ color, fontWeight: 700 }}>
                      ({sign}{diff.toFixed(2)}%)
                    </span>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Accolade SVG (Absolute Connector) */}
        <div
          style={{
            position: "absolute",
            left: "180px",
            top: "0",
            bottom: "0",
            width: "34px",
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
          }}
        >
          <svg width="34" height="190" viewBox="0 0 34 190" style={{ overflow: "visible" }}>
            <path
              d="M 5,95 L 11,95 Q 17,95 17,89 L 17,68 Q 17,62 23,62 L 29,62"
              stroke="#00e5c8"
              strokeWidth="1.5"
              fill="none"
              style={{ filter: "drop-shadow(0 0 3px rgba(0, 229, 200, 0.4))" }}
            />
            <path
              d="M 11,95 Q 17,95 17,101 L 17,152 Q 17,158 23,158 L 29,158"
              stroke="#ffb800"
              strokeWidth="1.5"
              fill="none"
              style={{ filter: "drop-shadow(0 0 3px rgba(255, 184, 0, 0.4))" }}
            />
            <circle cx="5" cy="95" r="2" fill="#00e5c8" style={{ filter: "drop-shadow(0 0 4px #00e5c8)" }} />
            <circle cx="29" cy="62" r="2" fill="#00e5c8" style={{ filter: "drop-shadow(0 0 4px #00e5c8)" }} />
            <circle cx="29" cy="158" r="2" fill="#ffb800" style={{ filter: "drop-shadow(0 0 4px #ffb800)" }} />
          </svg>
        </div>

        {/* Right Column: Score Composition */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
          <div
            style={{
              fontSize: "9px",
              color: "#00e5c8",
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              fontWeight: 600,
              marginBottom: "2px",
            }}
          >
            Composition du score
          </div>

          {/* Card 1: Livraison */}
          <div
            onMouseEnter={() => setHoveredDelivery(true)}
            onMouseLeave={() => setHoveredDelivery(false)}
            style={{
              background: hoveredDelivery ? "rgba(0, 229, 200, 0.08)" : "rgba(6, 17, 31, 0.4)",
              border: hoveredDelivery ? "1px solid rgba(0, 229, 200, 0.45)" : "1px solid rgba(255, 255, 255, 0.05)",
              boxShadow: hoveredDelivery ? "0 0 15px rgba(0, 229, 200, 0.15)" : "none",
              borderRadius: "10px",
              padding: "12px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              transition: "all 0.3s ease",
            }}
          >
            {/* Left Circle Icon */}
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: hoveredDelivery ? "rgba(0, 229, 200, 0.12)" : "rgba(0, 229, 200, 0.03)",
                border: hoveredDelivery ? "1px solid rgba(0, 229, 200, 0.5)" : "1px solid rgba(0, 229, 200, 0.25)",
                boxShadow: hoveredDelivery ? "0 0 12px rgba(0, 229, 200, 0.3)" : "0 0 10px rgba(0, 229, 200, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#00e5c8",
                flexShrink: 0,
                transition: "all 0.3s ease",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </div>

            {/* Right details */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "#00e5c8", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                LIVRAISON À TEMPS
              </div>
              <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.4)", marginTop: "1px" }}>
                60% du score
              </div>
              
              {/* Value + Progress bar row */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "6px" }}>
                <div style={{ fontSize: "20px", fontWeight: 800, color: "#fff", lineHeight: 1, fontFamily: "var(--font-body)", marginRight: "8px", flexShrink: 0 }}>
                  {animatedDelivery.toFixed(2)}%
                </div>
                
                {/* Progress bar container */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ height: "3px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "1.5px", position: "relative" }}>
                    <div
                      style={{
                        height: "100%",
                        background: "#00e5c8",
                        borderRadius: "1.5px",
                        width: `${animatedDelivery}%`,
                        position: "relative",
                        boxShadow: "0 0 6px rgba(0, 229, 200, 0.5)",
                      }}
                    >
                      {/* Glowing dot thumb */}
                      <div
                        style={{
                          position: "absolute",
                          right: "-3px",
                          top: "-1.5px",
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: "#fff",
                          boxShadow: "0 0 8px #00e5c8, 0 0 3px #fff",
                        }}
                      />
                    </div>
                  </div>
                  {/* Min / Max labels */}
                  <div style={{ display: "flex", justifyContent: "flex-end", fontSize: "8px", color: "rgba(255,255,255,0.3)", marginTop: "2px" }}>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              {/* Sub-label */}
              <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.4)", marginTop: "4px", fontFamily: "var(--font-mono)" }}>
                {mouvementsATemps} à temps / {mouvementsEnRetard} en retard
              </div>
            </div>
          </div>

          {/* Card 2: Finance */}
          <div
            onMouseEnter={() => setHoveredImpayes(true)}
            onMouseLeave={() => setHoveredImpayes(false)}
            style={{
              background: hoveredImpayes ? "rgba(255, 184, 0, 0.08)" : "rgba(6, 17, 31, 0.4)",
              border: hoveredImpayes ? "1px solid rgba(255, 184, 0, 0.45)" : "1px solid rgba(255, 255, 255, 0.05)",
              boxShadow: hoveredImpayes ? "0 0 15px rgba(255, 184, 0, 0.15)" : "none",
              borderRadius: "10px",
              padding: "12px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              transition: "all 0.3s ease",
            }}
          >
            {/* Left Circle Icon */}
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: hoveredImpayes ? "rgba(255, 184, 0, 0.12)" : "rgba(255, 184, 0, 0.03)",
                border: hoveredImpayes ? "1px solid rgba(255, 184, 0, 0.5)" : "1px solid rgba(255, 184, 0, 0.25)",
                boxShadow: hoveredImpayes ? "0 0 12px rgba(255, 184, 0, 0.3)" : "0 0 10px rgba(255, 184, 0, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffb800",
                flexShrink: 0,
                transition: "all 0.3s ease",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M3 5v6c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                <path d="M3 11v6c0 1.66 4 3 9 3s9-1.34 9-3v-6" />
              </svg>
            </div>

            {/* Right details */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "#ffb800", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                FINANCE (IMPAYÉS)
              </div>
              <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.4)", marginTop: "1px" }}>
                40% du score
              </div>
              
              {/* Value + Progress bar row */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "6px" }}>
                <div style={{ fontSize: "20px", fontWeight: 800, color: "#fff", lineHeight: 1, fontFamily: "var(--font-body)", marginRight: "8px", flexShrink: 0 }}>
                  {animatedImpayes.toFixed(2)}%
                </div>
                
                {/* Progress bar container */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ height: "3px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "1.5px", position: "relative" }}>
                    <div
                      style={{
                        height: "100%",
                        background: "#ffb800",
                        borderRadius: "1.5px",
                        width: `${animatedImpayes}%`,
                        position: "relative",
                        boxShadow: "0 0 6px rgba(255, 184, 0, 0.5)",
                      }}
                    >
                      {/* Glowing dot thumb */}
                      <div
                        style={{
                          position: "absolute",
                          right: "-3px",
                          top: "-1.5px",
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: "#fff",
                          boxShadow: "0 0 8px #ffb800, 0 0 3px #fff",
                        }}
                      />
                    </div>
                  </div>
                  {/* Min / Max labels */}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8px", color: "rgba(255,255,255,0.3)", marginTop: "2px" }}>
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              {/* Sub-label */}
              <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.4)", marginTop: "4px", fontFamily: "var(--font-mono)" }}>
                {tauxImpayes.toFixed(2)}% d'impayés
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Formula Explanation */}
      <div
        style={{
          background: "rgba(255,255,255,0.01)",
          border: "1px solid rgba(255,255,255,0.04)",
          borderRadius: "6px",
          padding: "10px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "8px",
          fontFamily: "var(--font-mono)",
          fontSize: "9px",
          color: "var(--muted)",
          marginBottom: "20px",
        }}
      >
        <span style={{ color: "var(--cyan)", fontWeight: 600 }}>({tauxLivraison.toFixed(2)}% <span style={{ fontSize: "8px", opacity: 0.7 }}>Livraison</span> × 60%)</span>
        <span>+</span>
        <span style={{ color: "var(--amber)", fontWeight: 600 }}>({scoreImpayes.toFixed(2)}% <span style={{ fontSize: "8px", opacity: 0.7 }}>Finance</span> × 40%)</span>
        <span>=</span>
        <span style={{ color: statusColor, fontWeight: 700, fontSize: "10px" }}>{scoreQualite.toFixed(2)}% <span style={{ fontSize: "8px", opacity: 0.7 }}>Score Global</span></span>
      </div>

      {/* Key Details (Détails Clés) */}
      <div>
        <div
          style={{
            fontSize: "9px",
            color: "var(--cyan)",
            fontFamily: "var(--font-mono)",
            textTransform: "uppercase",
            letterSpacing: "1px",
            marginBottom: "10px",
            fontWeight: 600,
          }}
        >
          Détails clés
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "8px",
          }}
        >
          {/* Metric 1 */}
          <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: "6px", padding: "8px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--white)", fontFamily: "var(--font-mono)" }}>
              {Math.round(animatedTotalMouvements)}
            </div>
            <div style={{ fontSize: "8px", color: "var(--muted)", marginTop: "2px" }}>Mouvements analysés</div>
          </div>
          {/* Metric 2 */}
          <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: "6px", padding: "8px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--green)", fontFamily: "var(--font-mono)" }}>
              {Math.round(animatedATemps)}
            </div>
            <div style={{ fontSize: "8px", color: "var(--muted)", marginTop: "2px" }}>Livrés à temps</div>
          </div>
          {/* Metric 3 */}
          <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: "6px", padding: "8px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--red)", fontFamily: "var(--font-mono)" }}>
              {Math.round(animatedEnRetard)}
            </div>
            <div style={{ fontSize: "8px", color: "var(--muted)", marginTop: "2px" }}>En retard</div>
          </div>
          {/* Metric 4 */}
          <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: "6px", padding: "8px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--white)", fontFamily: "var(--font-mono)" }}>
              {Math.round(animatedNombreFactures)}
            </div>
            <div style={{ fontSize: "8px", color: "var(--muted)", marginTop: "2px" }}>Factures émises</div>
          </div>
          {/* Metric 5 */}
          <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: "6px", padding: "8px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--white)", fontFamily: "var(--font-mono)" }}>
              {formatAmount(animatedMontantFacture)}
            </div>
            <div style={{ fontSize: "8px", color: "var(--muted)", marginTop: "2px" }}>Montant total facturé</div>
          </div>
          {/* Metric 6 */}
          <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: "6px", padding: "8px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--red)", fontFamily: "var(--font-mono)" }}>
              {formatAmount(animatedMontantImpaye)}
            </div>
            <div style={{ fontSize: "8px", color: "var(--muted)", marginTop: "2px" }}>Montant total impayé</div>
          </div>
          {/* Metric 7 */}
          <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: "6px", padding: "8px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--amber)", fontFamily: "var(--font-mono)" }}>
              {Math.round(animatedFacturesImpayees)}
            </div>
            <div style={{ fontSize: "8px", color: "var(--muted)", marginTop: "2px" }}>Factures impayées</div>
          </div>
          {/* Metric 8 */}
          <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: "6px", padding: "8px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--amber)", fontFamily: "var(--font-mono)" }}>
              {animatedTauxImpayes.toFixed(2)}%
            </div>
            <div style={{ fontSize: "8px", color: "var(--muted)", marginTop: "2px" }}>Taux d'impayés</div>
          </div>
          {/* Metric 9 */}
          <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: "6px", padding: "8px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--green)", fontFamily: "var(--font-mono)" }}>
              {animatedImpayes.toFixed(2)}%
            </div>
            <div style={{ fontSize: "8px", color: "var(--muted)", marginTop: "2px" }}>Score impayés</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
