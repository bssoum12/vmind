"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

interface VfinMarginTooltipProps {
  visible: boolean;
  coords: { top: number; left: number; height?: number };
  tauxCourant: number | null;
  tauxCourantFormatted: string;
  tauxPrecedent: number | null;
  tauxPrecedentFormatted: string;
  ecartTaux: number | null;
  caCourant: number;
  margeCourant: number;
  caPrecedent: number;
  margePrecedent: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const VfinMarginTooltip: React.FC<VfinMarginTooltipProps> = ({
  visible,
  coords,
  tauxCourant,
  tauxCourantFormatted,
  tauxPrecedent,
  tauxPrecedentFormatted,
  ecartTaux,
  caCourant,
  margeCourant,
  caPrecedent,
  margePrecedent,
  onMouseEnter,
  onMouseLeave,
}) => {
  const [animatedTauxCourant, setAnimatedTauxCourant] = useState(0);
  const [animatedTauxPrecedent, setAnimatedTauxPrecedent] = useState(0);
  const [animatedEcart, setAnimatedEcart] = useState(0);
  const [animatedCaCourant, setAnimatedCaCourant] = useState(0);
  const [animatedMargeCourant, setAnimatedMargeCourant] = useState(0);
  const [animatedCaPrecedent, setAnimatedCaPrecedent] = useState(0);
  const [animatedMargePrecedent, setAnimatedMargePrecedent] = useState(0);

  const [tooltipHeight, setTooltipHeight] = useState(540);
  const [windowHeight, setWindowHeight] = useState(900);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWindowHeight(window.innerHeight);
      const handleResize = () => setWindowHeight(window.innerHeight);
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  useEffect(() => {
    if (visible && tooltipRef.current) {
      const timer = setTimeout(() => {
        if (tooltipRef.current) {
          setTooltipHeight(tooltipRef.current.offsetHeight);
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [visible, tauxCourant, caCourant, margeCourant]);
  React.useEffect(() => {
    if (visible) {
      const duration = 1000;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = progress * (2 - progress); // Ease out quad

        setAnimatedTauxCourant((tauxCourant || 0) * easeProgress);
        setAnimatedTauxPrecedent((tauxPrecedent || 0) * easeProgress);
        setAnimatedEcart((ecartTaux || 0) * easeProgress);
        setAnimatedCaCourant(caCourant * easeProgress);
        setAnimatedMargeCourant(margeCourant * easeProgress);
        setAnimatedCaPrecedent(caPrecedent * easeProgress);
        setAnimatedMargePrecedent(margePrecedent * easeProgress);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    } else {
      setAnimatedTauxCourant(0);
      setAnimatedTauxPrecedent(0);
      setAnimatedEcart(0);
      setAnimatedCaCourant(0);
      setAnimatedMargeCourant(0);
      setAnimatedCaPrecedent(0);
      setAnimatedMargePrecedent(0);
    }
  }, [visible, tauxCourant, tauxPrecedent, ecartTaux, caCourant, margeCourant, caPrecedent, margePrecedent]);

  if (!visible) return null;

  const themeColor = "#1D9E75"; // Green highlight matching active VFIN agent
  const tooltipWidth = 520;
  
  // Position to the left of the card, with a 12px gap
  const leftPosition = Math.max(10, coords.left - tooltipWidth - 12);

  // Calculate viewport-aware top position and determine vertical direction
  const isBottomHalf = coords.top > windowHeight / 2;
  const cardHeight = coords.height || 140;
  const targetTop = isBottomHalf
    ? coords.top + cardHeight - tooltipHeight
    : coords.top;
  const topPosition = Math.max(16, Math.min(targetTop, windowHeight - tooltipHeight - 16));

  // Status definitions based on tauxCourant value
  const isNegative = tauxCourant !== null && tauxCourant < 0;
  const statusColor = isNegative ? "var(--red)" : "var(--green)";
  const statusText = isNegative ? "DÉFICITAIRE" : (tauxCourant === 0 ? "NEUTRE" : "EXCELLENT");
  const statusClass = isNegative ? "pulse-text-red" : "pulse-text-green";

  // Arc math for the circular gauge (376.99 is 2 * PI * 60)
  const displayPct = Math.max(0, Math.min(animatedTauxCourant, 100)) / 100;
  const arcStrokeDash = isNegative ? "376.99 0" : `${376.99 * displayPct} 502.65`;

  const formatAmount = (amount: number): string => {
    return amount.toLocaleString('fr-TN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " TND";
  };

  return (
    <motion.div
      ref={tooltipRef}
      initial={{ opacity: 0, scale: 0.95, y: isBottomHalf ? 15 : -15, x: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: isBottomHalf ? 15 : -15, x: 8 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: "fixed",
        top: `${topPosition}px`,
        left: `${leftPosition}px`,
        width: `${tooltipWidth}px`,
        backgroundColor: "rgba(6, 17, 31, 0.98)",
        backdropFilter: "blur(14px)",
        border: `1px solid ${statusColor}40`,
        borderRadius: "12px",
        boxShadow: `0 20px 50px rgba(0,0,0,0.6), 0 0 30px ${statusColor}0D`,
        zIndex: 99999,
        padding: "20px",
        fontFamily: "var(--font-mono)",
        color: "var(--white)",
        boxSizing: "border-box",
      }}
    >
      {/* CSS keyframes */}
      <style>{`
        @keyframes gaugeGlowPulse {
          0% { filter: drop-shadow(0 0 3px ${statusColor}60); }
          50% { filter: drop-shadow(0 0 12px ${statusColor}) drop-shadow(0 0 3px ${statusColor}60); }
          100% { filter: drop-shadow(0 0 3px ${statusColor}60); }
        }
        @keyframes innerCirclePulse {
          0% { opacity: 0.2; }
          50% { opacity: 0.85; }
          100% { opacity: 0.2; }
        }
        .gauge-premium-arc-vfin {
          animation: gaugeGlowPulse 2.5s infinite ease-in-out;
        }
        .gauge-inner-pulse-vfin {
          animation: innerCirclePulse 3s infinite ease-in-out;
        }
      `}</style>

      {/* Cyber HUD Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: `1px solid ${statusColor}40`,
          paddingBottom: "8px",
          marginBottom: "16px",
          fontSize: "8px",
          color: statusColor,
          letterSpacing: "1px",
          textTransform: "uppercase",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ display: "inline-block", width: "4px", height: "4px", background: statusColor, borderRadius: "50%", boxShadow: `0 0 4px ${statusColor}` }} />
          <span style={{ fontWeight: 700 }}>ANALYSE MARGE BRUTE</span>
        </div>
        <div style={{ opacity: 0.8 }}> VFIN ASSISTANT </div>
      </div>

      {/* Main Row: Gauge & Breakdown Cards */}
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
          <svg width="190" height="190" viewBox="0 0 190 190" style={{ overflow: "visible" }}>
            <defs>
              <radialGradient id="gaugeInnerGlowVfin" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={statusColor} stopOpacity="0.3" />
                <stop offset="70%" stopColor={statusColor} stopOpacity="0.05" />
                <stop offset="100%" stopColor={statusColor} stopOpacity="0" />
              </radialGradient>
              <linearGradient id="progressGradientVfin" x1="0" y1="190" x2="190" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={statusColor} />
                <stop offset="100%" stopColor={isNegative ? "var(--red)" : "#85ff7a"} />
              </linearGradient>
            </defs>

            {/* Background Inner Radial Glow */}
            <circle cx="95" cy="95" r="75" fill="url(#gaugeInnerGlowVfin)" className="gauge-inner-pulse-vfin" />

            {/* Speedometer Dial Ticks */}
            <circle cx="95" cy="95" r="88" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="2" strokeDasharray="1 5" />
            <circle cx="95" cy="95" r="74" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />

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
              stroke="url(#progressGradientVfin)"
              strokeWidth="10"
              strokeDasharray={arcStrokeDash}
              transform="rotate(135 95 95)"
              strokeLinecap="round"
              className="gauge-premium-arc-vfin"
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
            <div
              style={{
                fontSize: "26px",
                fontWeight: 850,
                color: isNegative ? "var(--red)" : "var(--white)",
                lineHeight: 1,
                fontFamily: "var(--font-body)",
                display: "flex",
                alignItems: "baseline",
                letterSpacing: "-0.5px",
                textShadow: "0 2px 10px rgba(0,0,0,0.5)",
              }}
            >
              <span>{Math.floor(animatedTauxCourant)}</span>
              <span style={{ fontSize: "16px", fontWeight: 700 }}>
                .{(Math.abs(animatedTauxCourant) % 1).toFixed(1).substring(2)}
              </span>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "rgba(255,255,255,0.6)", marginLeft: "2px" }}>%</span>
            </div>

            <div
              style={{
                fontSize: "7px",
                fontWeight: 800,
                color: statusColor,
                letterSpacing: "1px",
                marginTop: "6px",
                fontFamily: "var(--font-mono)",
                background: `${statusColor}0f`,
                border: `1px solid ${statusColor}2a`,
                padding: "2px 6px",
                borderRadius: "10px",
                textTransform: "uppercase",
              }}
            >
              {statusText}
            </div>
          </div>
        </div>

        {/* Accolade SVG Connection */}
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
              stroke="#00FF87"
              strokeWidth="1.5"
              fill="none"
              style={{ filter: "drop-shadow(0 0 3px rgba(0, 255, 135, 0.4))" }}
            />
            <path
              d="M 11,95 Q 17,95 17,101 L 17,152 Q 17,158 23,158 L 29,158"
              stroke={statusColor}
              strokeWidth="1.5"
              fill="none"
              style={{ filter: `drop-shadow(0 0 3px ${statusColor}60)` }}
            />
            <circle cx="5" cy="95" r="2" fill="#00FF87" style={{ filter: "drop-shadow(0 0 4px #00FF87)" }} />
          </svg>
        </div>

        {/* Right Column: Breakdown Indicators */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "12px", zIndex: 2 }}>
          
          {/* Card 1: CA */}
          <div
            style={{
              background: "rgba(6, 17, 31, 0.4)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              borderRadius: "10px",
              padding: "12px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "9px", fontWeight: 700, color: "#00FF87", letterSpacing: "0.5px" }}>
                CHIFFRE D'AFFAIRES (CA)
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "#fff", fontFamily: "var(--font-body)" }}>
                  {formatAmount(animatedCaCourant)}
                </div>
              </div>
              <div style={{ fontSize: "7.5px", color: "var(--muted)", marginTop: "4px" }}>
                Précédent : {formatAmount(animatedCaPrecedent)}
              </div>
            </div>
          </div>

          {/* Card 2: Marge amount */}
          <div
            style={{
              background: "rgba(6, 17, 31, 0.4)",
              border: `1px solid ${isNegative ? "rgba(255, 59, 48, 0.2)" : "rgba(255, 255, 255, 0.05)"}`,
              borderRadius: "10px",
              padding: "12px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "9px", fontWeight: 700, color: statusColor, letterSpacing: "0.5px" }}>
                MARGE BRUTE (VALEUR TN)
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
                <div style={{ fontSize: "16px", fontWeight: 800, color: isNegative ? "var(--red)" : "#fff", fontFamily: "var(--font-body)" }}>
                  {formatAmount(animatedMargeCourant)}
                </div>
              </div>
              <div style={{ fontSize: "7.5px", color: "var(--muted)", marginTop: "4px" }}>
                Précédent : {formatAmount(animatedMargePrecedent)}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Formula Explanation box */}
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
          marginBottom: "16px",
        }}
      >
        <span style={{ color: "#00FF87" }}>({formatAmount(animatedMargeCourant)} <span style={{ fontSize: "7.5px", opacity: 0.7 }}>Marge</span>)</span>
        <span>/</span>
        <span style={{ color: "var(--white)" }}>({formatAmount(animatedCaCourant)} <span style={{ fontSize: "7.5px", opacity: 0.7 }}>CA</span>)</span>
        <span>=</span>
        <span style={{ color: statusColor, fontWeight: 700, fontSize: "10px" }}>{animatedTauxCourant.toFixed(1)}% <span style={{ fontSize: "7.5px", opacity: 0.7 }}>Taux Marge</span></span>
      </div>

      {/* Grid of 9 stats boxes (Key Details) */}
      <div>
        <div style={{ fontSize: "9px", color: "#00FF87", letterSpacing: "1px", marginBottom: "8px", fontWeight: 600, textTransform: "uppercase" }}>
          Détails des indicateurs
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
          
          {/* Card 1: CA Courant */}
          <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: "6px", padding: "8px" }}>
            <div style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--white)" }}>
              {formatAmount(animatedCaCourant)}
            </div>
            <div style={{ fontSize: "7.5px", color: "var(--muted)", marginTop: "2px" }}>CA Courant</div>
          </div>

          {/* Card 2: Marge Courante */}
          <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: "6px", padding: "8px" }}>
            <div style={{ fontSize: "10.5px", fontWeight: 700, color: isNegative ? "var(--red)" : "var(--white)" }}>
              {formatAmount(animatedMargeCourant)}
            </div>
            <div style={{ fontSize: "7.5px", color: "var(--muted)", marginTop: "2px" }}>Marge Courante</div>
          </div>

          {/* Card 3: Taux Courant */}
          <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: "6px", padding: "8px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: statusColor }}>
              {animatedTauxCourant.toFixed(1)}%
            </div>
            <div style={{ fontSize: "7.5px", color: "var(--muted)", marginTop: "2px" }}>Taux Courant</div>
          </div>

          {/* Card 4: CA Précédent */}
          <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: "6px", padding: "8px" }}>
            <div style={{ fontSize: "10.5px", fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>
              {formatAmount(animatedCaPrecedent)}
            </div>
            <div style={{ fontSize: "7.5px", color: "var(--muted)", marginTop: "2px" }}>CA Précédent</div>
          </div>

          {/* Card 5: Marge Précédente */}
          <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: "6px", padding: "8px" }}>
            <div style={{ fontSize: "10.5px", fontWeight: 700, color: margePrecedent < 0 ? "var(--red)" : "rgba(255,255,255,0.6)" }}>
              {formatAmount(animatedMargePrecedent)}
            </div>
            <div style={{ fontSize: "7.5px", color: "var(--muted)", marginTop: "2px" }}>Marge Précédente</div>
          </div>

          {/* Card 6: Taux Précédent */}
          <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: "6px", padding: "8px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
              {animatedTauxPrecedent.toFixed(1)}%
            </div>
            <div style={{ fontSize: "7.5px", color: "var(--muted)", marginTop: "2px" }}>Taux Précédent</div>
          </div>

          {/* Card 7: Écart CA */}
          {(() => {
            const diffCa = animatedCaCourant - animatedCaPrecedent;
            return (
              <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: "6px", padding: "8px" }}>
                <div style={{ fontSize: "10.5px", fontWeight: 700, color: diffCa >= 0 ? "var(--green)" : "var(--red)" }}>
                  {diffCa >= 0 ? "+" : ""}{formatAmount(diffCa)}
                </div>
                <div style={{ fontSize: "7.5px", color: "var(--muted)", marginTop: "2px" }}>Écart CA</div>
              </div>
            );
          })()}

          {/* Card 8: Écart Marge */}
          {(() => {
            const diffMarge = animatedMargeCourant - animatedMargePrecedent;
            return (
              <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: "6px", padding: "8px" }}>
                <div style={{ fontSize: "10.5px", fontWeight: 700, color: diffMarge >= 0 ? "var(--green)" : "var(--red)" }}>
                  {diffMarge >= 0 ? "+" : ""}{formatAmount(diffMarge)}
                </div>
                <div style={{ fontSize: "7.5px", color: "var(--muted)", marginTop: "2px" }}>Écart Marge</div>
              </div>
            );
          })()}

          {/* Card 9: Variation Taux */}
          <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: "6px", padding: "8px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: animatedEcart >= 0 ? "var(--green)" : "var(--red)" }}>
              {animatedEcart >= 0 ? "+" : ""}{animatedEcart.toFixed(1)} pts
            </div>
            <div style={{ fontSize: "7.5px", color: "var(--muted)", marginTop: "2px" }}>Variation Taux</div>
          </div>

        </div>

        {/* Sub-label explaining source */}
        <div style={{ fontSize: "6.5px", color: "rgba(255,255,255,0.2)", marginTop: "12px", borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: "6px", display: "flex", justifyContent: "space-between" }}>
          <span>SOURCE: dbo.vw_AI_KPI_Commercial</span>
          <span>FILTRE: STATUT IN ('Validee', 'ClotureeGagnee')</span>
        </div>
      </div>
    </motion.div>
  );
};
