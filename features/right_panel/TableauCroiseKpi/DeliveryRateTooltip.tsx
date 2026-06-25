"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface DeliveryRateTooltipProps {
  visible: boolean;
  coords: { top: number; left: number; height?: number };
  totalMouvements: number;
  mouvementsATemps: number;
  mouvementsEnRetard: number;
  lateDeliveries: any[];
  statusColor: string;
  prevTaux?: number | null;
  prevYear?: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const DeliveryRateTooltip: React.FC<DeliveryRateTooltipProps> = ({
  visible,
  coords,
  totalMouvements,
  mouvementsATemps,
  mouvementsEnRetard,
  lateDeliveries,
  statusColor,
  prevTaux,
  prevYear,
  onMouseEnter,
  onMouseLeave,
}) => {
  const [animatedTotal, setAnimatedTotal] = useState(0);
  const [animatedATemps, setAnimatedATemps] = useState(0);
  const [animatedEnRetard, setAnimatedEnRetard] = useState(0);
  const [animatedPct, setAnimatedPct] = useState(0);
  const [windowHeight, setWindowHeight] = useState(900);
  const [tooltipHeight, setTooltipHeight] = useState(380);
  const tooltipRef = React.useRef<HTMLDivElement>(null);

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
  }, [visible, totalMouvements, mouvementsATemps, mouvementsEnRetard]);

  const finalPct = totalMouvements > 0 ? (mouvementsATemps / totalMouvements) : 0;

  useEffect(() => {
    if (visible) {
      const duration = 1000;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = progress * (2 - progress); // Ease out quad

        setAnimatedTotal(totalMouvements * easeProgress);
        setAnimatedATemps(mouvementsATemps * easeProgress);
        setAnimatedEnRetard(mouvementsEnRetard * easeProgress);
        setAnimatedPct(finalPct * easeProgress);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    } else {
      setAnimatedTotal(0);
      setAnimatedATemps(0);
      setAnimatedEnRetard(0);
      setAnimatedPct(0);
    }
  }, [visible, totalMouvements, mouvementsATemps, mouvementsEnRetard, finalPct]);

  if (!visible) return null;

  const tooltipWidth = 530;
  const leftPosition = Math.max(10, coords.left - tooltipWidth - 16);

  // Viewport checking for vertical alignment
  const isBottomHalf = coords.top > windowHeight / 2;
  const cardHeight = coords.height || 110;
  const targetTop = isBottomHalf
    ? coords.top + cardHeight - tooltipHeight
    : coords.top;
  const topPosition = Math.max(16, Math.min(targetTop, windowHeight - tooltipHeight - 16));

  const totalSum = totalMouvements;
  const aTempsRatio = totalSum > 0 ? (animatedATemps / totalSum) * 100 : 0;
  const enRetardRatio = totalSum > 0 ? (animatedEnRetard / totalSum) * 100 : 0;

  // Arc details for circular gauge
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const arcLength = 282.74; // 270 deg arc limit
  const strokeDashoffset = arcLength - animatedPct * arcLength;

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
        left: `${leftPosition}px`,
        top: `${topPosition}px`,
        width: `${tooltipWidth}px`,
        background: "rgba(5, 12, 22, 0.97)",
        border: `1px solid ${statusColor}40`,
        borderRadius: "10px",
        padding: "16px 20px 20px 20px",
        backdropFilter: "blur(18px)",
        boxShadow: `0 25px 60px rgba(0, 0, 0, 0.75), 0 0 35px ${statusColor}10, inset 0 0 20px ${statusColor}05`,
        pointerEvents: "auto",
        zIndex: 99999,
        fontFamily: "var(--font-mono), monospace",
        transformOrigin: isBottomHalf ? "bottom right" : "top right",
      }}
    >
      <style>{`
        @keyframes flow-stripes-delivery {
          from { background-position: 0 0; }
          to { background-position: 24px 0; }
        }
      `}</style>

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
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ display: "inline-block", width: "4px", height: "4px", background: "#00f0ff", borderRadius: "50%", boxShadow: "0 0 4px #00f0ff" }} />
          <span style={{ color: "#00f0ff", fontWeight: 700 }}> ANALYSE DES DÉLAIS DE LIVRAISON </span>
        </div>
        <div style={{ opacity: 0.8 }}> MOIS COURANT </div>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "170px 1fr",
          gap: "20px",
          marginBottom: "18px",
        }}
      >
        {/* Left Side: Circular Speedometer Gauge */}
        <div
          style={{
            background: "rgba(10, 24, 40, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
            borderRadius: "8px",
            padding: "16px 12px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div style={{ position: "relative", width: "120px", height: "120px" }}>
            <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: "rotate(135deg)" }}>
              <defs>
                <linearGradient id="deliveryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor={statusColor} />
                </linearGradient>
              </defs>
              {/* Background circular track (270 degrees) */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.04)"
                strokeWidth="7"
                strokeDasharray="282.74"
                strokeDashoffset="70.68" // leaves 90 deg gap
                strokeLinecap="round"
              />
              {/* Progress Arc */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="url(#deliveryGrad)"
                strokeWidth="8"
                strokeDasharray="282.74"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{
                  filter: `drop-shadow(0 0 6px ${statusColor}50)`,
                }}
              />
            </svg>
            {/* Speedometer center display */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: 800,
                  fontFamily: "var(--font-body), sans-serif",
                  color: "#ffffff",
                  textShadow: `0 0 10px ${statusColor}40`,
                  lineHeight: 1,
                }}
              >
                {(animatedPct * 100).toFixed(2).replace('.', ',')}
                <span style={{ fontSize: "14px", fontWeight: 600, color: statusColor }}>%</span>
              </div>
              <div style={{ fontSize: "7px", color: "rgba(255, 255, 255, 0.35)", marginTop: "2px", letterSpacing: "0.5px" }}>
                À TEMPS
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: "8px",
              color: "rgba(255, 255, 255, 0.4)",
              marginTop: "8px",
              textAlign: "center",
            }}
          >
            {Math.round(animatedATemps)} / {Math.round(animatedTotal)} DOSSIERS
          </div>

          {prevTaux !== undefined && prevTaux !== null && (
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
                {prevTaux.toFixed(2)}%
              </span>
              {(() => {
                const currentPct = totalMouvements > 0 ? (mouvementsATemps / totalMouvements) * 100 : 0;
                const diff = currentPct - prevTaux;
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

        {/* Right Side: Segmented Breakdown Progress */}
        <div style={{ display: "flex", flexDirection: "column", justifySelf: "stretch", gap: "10px" }}>
          {/* Card: ON TIME */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(0, 229, 200, 0.04) 0%, rgba(0, 229, 200, 0.01) 100%)",
              border: "1px solid rgba(0, 229, 200, 0.16)",
              borderRadius: "6px",
              padding: "10px 12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--green)" }}>LIVRÉS À TEMPS</span>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#ffffff" }}>
                {Math.round(animatedATemps)} <span style={{ fontSize: "7px", color: "var(--muted)", fontWeight: 400 }}>dossiers</span>
              </span>
            </div>
            <div style={{ height: "4px", background: "rgba(0, 229, 200, 0.06)", borderRadius: "1px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${aTempsRatio}%`, background: "linear-gradient(90deg, #00BFA8, #00e5c8)", boxShadow: "0 0 4px #00e5c8" }} />
            </div>
          </div>

          {/* Card: LATE */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(255, 59, 48, 0.04) 0%, rgba(255, 59, 48, 0.01) 100%)",
              border: "1px solid rgba(255, 59, 48, 0.16)",
              borderRadius: "6px",
              padding: "10px 12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--red)" }}>LIVRÉS EN RETARD</span>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#ffffff" }}>
                {Math.round(animatedEnRetard)} <span style={{ fontSize: "7px", color: "var(--muted)", fontWeight: 400 }}>dossiers</span>
              </span>
            </div>
            <div style={{ height: "4px", background: "rgba(255, 59, 48, 0.06)", borderRadius: "1px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${enRetardRatio}%`, background: "linear-gradient(90deg, #ff3b30, #ff7b70)", boxShadow: "0 0 4px #ff3b30" }} />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
