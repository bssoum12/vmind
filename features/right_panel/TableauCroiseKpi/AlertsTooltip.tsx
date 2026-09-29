"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

interface AlertsTooltipProps {
  visible: boolean;
  bugs: number;
  nonConform: number;
  total: number;
  coords: { top: number; left: number; height?: number };
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const AlertsTooltip: React.FC<AlertsTooltipProps> = ({
  visible,
  bugs,
  nonConform,
  total,
  coords,
  onMouseEnter,
  onMouseLeave,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Animated states for numbers
  const [animatedBugs, setAnimatedBugs] = useState(0);
  const [animatedNonConform, setAnimatedNonConform] = useState(0);
  const [tooltipHeight, setTooltipHeight] = useState(260);
  const [windowHeight, setWindowHeight] = useState(900);
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
  }, [visible, bugs, nonConform]);

  useEffect(() => {
    if (visible) {
      const duration = 1200;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = progress * (2 - progress); // Ease out quad

        setAnimatedBugs(bugs * easeProgress);
        setAnimatedNonConform(nonConform * easeProgress);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    } else {
      setAnimatedBugs(0);
      setAnimatedNonConform(0);
    }
  }, [visible, bugs, nonConform]);

  if (!visible || !mounted) return null;

  const tooltipWidth = 530;
  const leftPosition = Math.max(10, coords.left - tooltipWidth - 16);

  // Calculate viewport-aware top position and determine vertical direction
  const isBottomHalf = coords.top > windowHeight / 2;
  const cardHeight = coords.height || 155;
  const targetTop = isBottomHalf
    ? coords.top + cardHeight - tooltipHeight
    : coords.top;
  const topPosition = Math.max(16, Math.min(targetTop, windowHeight - tooltipHeight - 16));

  // Calculate ratio for progress bars
  const totalSum = bugs + nonConform;
  const bugsRatio = totalSum > 0 ? (animatedBugs / totalSum) * 100 : 0;
  const nonConformRatio = totalSum > 0 ? (animatedNonConform / totalSum) * 100 : 0;

  // Formatting helper for big totals
  const formatNum = (val: number) => Math.round(val).toLocaleString("fr-FR");

  return createPortal(
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
        border: "1px solid rgba(0, 240, 255, 0.22)",
        borderRadius: "10px",
        padding: "16px 20px 20px 20px",
        backdropFilter: "blur(18px)",
        boxShadow: "0 25px 60px rgba(0, 0, 0, 0.75), 0 0 35px rgba(255, 59, 48, 0.04), inset 0 0 20px rgba(0, 240, 255, 0.02)",
        pointerEvents: "auto",
        zIndex: 999999,
        fontFamily: "var(--font-mono), monospace",
        transformOrigin: isBottomHalf ? "bottom right" : "top right",
      }}
    >
      <style>{`
        @keyframes flow-stripes {
          from { background-position: 0 0; }
          to { background-position: 24px 0; }
        }
        @keyframes slow-pulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.45; }
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
          <span style={{ color: "#00f0ff", fontWeight: 700 }}> DIAGNOSTIC DES ALERTES </span>
        </div>
        <div style={{ opacity: 0.8 }}> MOIS COURANT </div>
      </div>

      {/* Grid container */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
        }}
      >
        {/* Card 1: BUGS ERP */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(255, 59, 48, 0.03) 0%, rgba(255, 59, 48, 0.01) 100%)",
            border: "1px solid rgba(255, 59, 48, 0.16)",
            borderRadius: "8px",
            padding: "16px",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "linear-gradient(135deg, rgba(255, 59, 48, 0.06) 0%, rgba(255, 59, 48, 0.02) 100%)";
            e.currentTarget.style.borderColor = "rgba(255, 59, 48, 0.4)";
            e.currentTarget.style.boxShadow = "0 0 16px rgba(255, 59, 48, 0.12), inset 0 0 8px rgba(255, 59, 48, 0.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "linear-gradient(135deg, rgba(255, 59, 48, 0.03) 0%, rgba(255, 59, 48, 0.01) 100%)";
            e.currentTarget.style.borderColor = "rgba(255, 59, 48, 0.16)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {/* Asymmetrical Cyber Corner Bracket */}
          <div style={{ position: "absolute", top: 0, right: 0, width: "12px", height: "12px", borderRight: "1px solid rgba(255, 59, 48, 0.4)", borderTop: "1px solid rgba(255, 59, 48, 0.4)" }} />

          {/* Icon and Title Row */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Hexagon Wrapper */}
            <div style={{ position: "relative", width: "36px", height: "32px", flexShrink: 0 }}>
              <svg width="36" height="32" viewBox="0 0 36 32">
                <polygon
                  points="9,0 27,0 36,16 27,32 9,32 0,16"
                  fill="rgba(255, 59, 48, 0.06)"
                  stroke="rgba(255, 59, 48, 0.4)"
                  strokeWidth="1.2"
                />
              </svg>
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "36px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ff3b30",
                  filter: "drop-shadow(0 0 4px rgba(255, 59, 48, 0.6))",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect width="8" height="14" x="8" y="6" rx="4" />
                  <path d="m19 7-3 2M5 7l3 2M19 19l-3-2M5 19l3-2M20 13h-4M4 13h4M12 6V3M12 20v-2" />
                </svg>
              </div>
            </div>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#ff7b70",
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              BUGS ERP
            </span>
          </div>

          {/* Number Display */}
          <div>
            <div
              style={{
                fontSize: "32px",
                fontWeight: 800,
                lineHeight: 1.1,
                fontFamily: "var(--font-body), sans-serif",
                background: "linear-gradient(180deg, #ffffff 40%, #ff3b30 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 0 8px rgba(255, 59, 48, 0.5))",
                letterSpacing: "-0.5px",
              }}
            >
              {formatNum(animatedBugs)}
            </div>
            <div
              style={{
                fontSize: "8px",
                color: "rgba(255, 255, 255, 0.35)",
                marginTop: "4px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              LOGS D'ERREURS DETECTES
            </div>
          </div>

          {/* Premium Segmented Progress Bar */}
          <div style={{ marginTop: "4px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "8px",
                color: "rgba(255, 59, 48, 0.7)",
                marginBottom: "4px",
              }}
            >
              <span>INTENSITE</span>
              <span>{Math.round(bugsRatio)}%</span>
            </div>
            <div
              style={{
                height: "6px",
                background: "rgba(255, 59, 48, 0.06)",
                borderRadius: "1px",
                border: "1px solid rgba(255, 59, 48, 0.15)",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Pulsing neon flowing stripes */}
              <div
                style={{
                  height: "100%",
                  width: `${bugsRatio}%`,
                  backgroundImage: "linear-gradient(90deg, #ff3b30, #ff7b70)",
                  boxShadow: "0 0 6px #ff3b30",
                  transition: "width 0.15s linear",
                }}
              />
              {/* Flowing overlay */}
              {bugsRatio > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    height: "100%",
                    width: `${bugsRatio}%`,
                    backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.15), rgba(255,255,255,0.15) 4px, transparent 4px, transparent 8px)",
                    backgroundSize: "24px 24px",
                    animation: "flow-stripes 0.8s linear infinite",
                  }}
                />
              )}
            </div>
          </div>

          {/* Micro HUD Labels */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "7px",
              color: "rgba(255, 255, 255, 0.25)",
              borderTop: "1px dashed rgba(255, 59, 48, 0.12)",
              paddingTop: "6px",
              textTransform: "uppercase",
            }}
          >
            <span>SÉVÉRITÉ : P1/CRIT</span>
          </div>
        </div>

        {/* Card 2: DOSSIERS SANS MARCHANDISE */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(0, 240, 255, 0.03) 0%, rgba(0, 240, 255, 0.01) 100%)",
            border: "1px solid rgba(0, 240, 255, 0.16)",
            borderRadius: "8px",
            padding: "16px",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "linear-gradient(135deg, rgba(0, 240, 255, 0.06) 0%, rgba(0, 240, 255, 0.02) 100%)";
            e.currentTarget.style.borderColor = "rgba(0, 240, 255, 0.45)";
            e.currentTarget.style.boxShadow = "0 0 16px rgba(0, 240, 255, 0.15), inset 0 0 8px rgba(0, 240, 255, 0.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "linear-gradient(135deg, rgba(0, 240, 255, 0.03) 0%, rgba(0, 240, 255, 0.01) 100%)";
            e.currentTarget.style.borderColor = "rgba(0, 240, 255, 0.16)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {/* Asymmetrical Cyber Corner Bracket */}
          <div style={{ position: "absolute", top: 0, right: 0, width: "12px", height: "12px", borderRight: "1px solid rgba(0, 240, 255, 0.4)", borderTop: "1px solid rgba(0, 240, 255, 0.4)" }} />

          {/* Icon and Title Row */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Hexagon Wrapper */}
            <div style={{ position: "relative", width: "36px", height: "32px", flexShrink: 0 }}>
              <svg width="36" height="32" viewBox="0 0 36 32">
                <polygon
                  points="9,0 27,0 36,16 27,32 9,32 0,16"
                  fill="rgba(0, 240, 255, 0.06)"
                  stroke="rgba(0, 240, 255, 0.4)"
                  strokeWidth="1.2"
                />
              </svg>
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "36px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#00f0ff",
                  filter: "drop-shadow(0 0 4px rgba(0, 240, 255, 0.6))",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  <line x1="8" y1="11" x2="16" y2="16" />
                </svg>
              </div>
            </div>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#00f0ff",
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              NON-CONFORMES
            </span>
          </div>

          {/* Number Display */}
          <div>
            <div
              style={{
                fontSize: "32px",
                fontWeight: 800,
                lineHeight: 1.1,
                fontFamily: "var(--font-body), sans-serif",
                background: "linear-gradient(180deg, #ffffff 40%, #00f0ff 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 0 8px rgba(0, 240, 255, 0.5))",
                letterSpacing: "-0.5px",
              }}
            >
              {formatNum(animatedNonConform)}
            </div>
            <div
              style={{
                fontSize: "8px",
                color: "rgba(255, 255, 255, 0.35)",
                marginTop: "4px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              DOSSIERS SANS MARCHANDISE
            </div>
          </div>

          {/* Premium Segmented Progress Bar */}
          <div style={{ marginTop: "4px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "8px",
                color: "rgba(0, 240, 255, 0.7)",
                marginBottom: "4px",
              }}
            >
              <span>PROPORTION</span>
              <span>{Math.round(nonConformRatio)}%</span>
            </div>
            <div
              style={{
                height: "6px",
                background: "rgba(0, 240, 255, 0.06)",
                borderRadius: "1px",
                border: "1px solid rgba(0, 240, 255, 0.15)",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Pulsing neon flowing stripes */}
              <div
                style={{
                  height: "100%",
                  width: `${nonConformRatio}%`,
                  backgroundImage: "linear-gradient(90deg, #00BFA8, #00f0ff)",
                  boxShadow: "0 0 6px #00f0ff",
                  transition: "width 0.15s linear",
                }}
              />
              {/* Flowing overlay */}
              {nonConformRatio > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    height: "100%",
                    width: `${nonConformRatio}%`,
                    backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.15), rgba(255,255,255,0.15) 4px, transparent 4px, transparent 8px)",
                    backgroundSize: "24px 24px",
                    animation: "flow-stripes 0.8s linear infinite",
                  }}
                />
              )}
            </div>
          </div>

          {/* Micro HUD Labels */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "7px",
              color: "rgba(255, 255, 255, 0.25)",
              borderTop: "1px dashed rgba(0, 240, 255, 0.12)",
              paddingTop: "6px",
              textTransform: "uppercase",
            }}
          >
            <span>STATUT : REQ_CONFORMITÉ</span>
          </div>
        </div>
      </div>
    </motion.div>,
    document.body
  );
};
