"use client";

import React from "react";
import { MultiKpiItem } from "@/shared/types/kpi";

interface KpiTooltipProps {
  visible: boolean;
  kpis: MultiKpiItem[];
  coords: { top: number; left: number };
}

interface CardProps {
  title: string;
  value: string | number;
  footer: React.ReactNode;
}

const KpiCard: React.FC<CardProps> = ({ title, value, footer }) => {
  return (
    <div
      style={{
        background: "rgba(10, 24, 40, 0.5)",
        border: "1px solid rgba(0, 229, 200, 0.08)",
        borderRadius: "8px",
        padding: "14px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "92px",
        transition: "all 0.2s ease-in-out",
        boxShadow: "inset 0 0 12px rgba(0, 229, 200, 0.02)",
      }}
    >
      <div>
        <div
          style={{
            fontSize: "10px",
            color: "var(--muted)",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.5px",
            marginBottom: "6px",
            textTransform: "uppercase",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: "24px",
            fontWeight: 800,
            color: "var(--white)",
            fontFamily: "var(--font-body)",
            lineHeight: 1,
            textShadow: "0 0 10px rgba(240, 244, 248, 0.15)",
          }}
        >
          {value}
        </div>
      </div>
      <div
        style={{
          marginTop: "10px",
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "4px",
        }}
      >
        {footer}
      </div>
    </div>
  );
};

export const KpiTooltip: React.FC<KpiTooltipProps> = ({
  visible,
  kpis,
  coords,
}) => {
  if (!visible || kpis.length === 0) {
    return null;
  }

  // Extract key KPI fields by label
  const kpiActive = kpis.find(k => k.label === "Dossiers actifs");
  const kpiClosed = kpis.find(k => k.label === "Dossiers clôturés");
  const kpiSousNonFact = kpis.find(k => k.label === "Sous-dossiers non facturés");
  const kpiSousTotal = kpis.find(k => k.label === "Total sous-dossiers");
  const kpiUniteTotal = kpis.find(k => k.label === "Unités de chargement");
  const kpiTeuTotal = kpis.find(k => k.label === "TEU total");
  const kpiRemorqueTotal = kpis.find(k => k.label === "Remorques");

  const activeVal = kpiActive?.value ?? 0;
  const activeDelta = kpiActive?.delta_24h ?? 0;

  const closedVal = kpiClosed?.value ?? 0;
  const closedDelta = kpiClosed?.delta_24h ?? 0;

  const sousTotalVal = kpiSousTotal?.value ?? 0;
  const sousNonFactVal = kpiSousNonFact?.value ?? 0;

  const uniteTotalVal = kpiUniteTotal?.value ?? 0;
  const teuVal = kpiTeuTotal?.value ?? 0;
  const remorqueVal = kpiRemorqueTotal?.value ?? 0;

  const tooltipWidth = 440;
  const leftPosition = coords.left - tooltipWidth - 12;

  return (
    <div
      style={{
        position: "fixed",
        left: `${leftPosition}px`,
        top: `${coords.top}px`,
        width: `${tooltipWidth}px`,

        background: "rgba(6, 17, 31, 0.98)",
        border: "1px solid rgba(0, 229, 200, 0.15)",
        borderRadius: "10px",

        padding: "16px",
        backdropFilter: "blur(12px)",

        boxShadow: "0 15px 45px rgba(0,0,0,0.5), 0 0 20px rgba(0,229,200,0.05)",

        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(10px)",

        transition: "opacity .2s ease, transform .2s ease",

        pointerEvents: "none",
        zIndex: 99999,
      }}
    >
      <div
        style={{
          fontSize: "10px",
          color: "var(--muted)",
          fontFamily: "var(--font-mono)",
          textTransform: "uppercase",
          letterSpacing: "1.5px",
          marginBottom: "12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>Indicateurs clés consolidés</span>
        <span style={{ color: "var(--cyan)", opacity: 0.8 }}>VDATA ASSISTANT</span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
        }}
      >
        {/* Card 1: Dossiers Actifs */}
        <KpiCard
          title="Dossiers actifs"
          value={activeVal}
          footer={
            <>
              <span
                style={{
                  background: "rgba(0, 230, 118, 0.12)",
                  color: "var(--green)",
                  border: "1px solid rgba(0, 230, 118, 0.2)",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontSize: "9px",
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                }}
              >
                +{activeDelta}
              </span>
              <span style={{ fontSize: "9px", color: "var(--muted)", fontFamily: "var(--font-mono)", marginLeft: "4px" }}>
                24h
              </span>
            </>
          }
        />

        {/* Card 2: Dossiers Clôturés */}
        <KpiCard
          title="Dossiers clôturés"
          value={closedVal}
          footer={
            <>
              <span
                style={{
                  background: "rgba(255, 184, 0, 0.12)",
                  color: "var(--amber)",
                  border: "1px solid rgba(255, 184, 0, 0.2)",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontSize: "9px",
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                }}
              >
                +{closedDelta}
              </span>
              <span style={{ fontSize: "9px", color: "var(--muted)", fontFamily: "var(--font-mono)", marginLeft: "4px" }}>
                24h
              </span>
            </>
          }
        />

        {/* Card 3: Sous Dossiers */}
        <KpiCard
          title="Sous Dossiers"
          value={sousTotalVal}
          footer={
            <>
              <span
                style={{
                  background: "rgba(255, 71, 87, 0.12)",
                  color: "var(--red)",
                  border: "1px solid rgba(255, 71, 87, 0.2)",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontSize: "9px",
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                }}
              >
                {sousNonFactVal}
              </span>
              <span style={{ fontSize: "9px", color: "var(--muted)", fontFamily: "var(--font-mono)", marginLeft: "4px" }}>
                non facturés
              </span>
            </>
          }
        />

        {/* Card 4: Unités de Chargement */}
        <KpiCard
          title="Unités de chargement"
          value={uniteTotalVal}
          footer={
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <span
                  style={{
                    background: "rgba(123, 97, 255, 0.15)",
                    color: "var(--purple)",
                    border: "1px solid rgba(123, 97, 255, 0.25)",
                    padding: "2px 5px",
                    borderRadius: "4px",
                    fontSize: "9px",
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {teuVal}
                </span>
                <span style={{ fontSize: "9px", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>TEU</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <span
                  style={{
                    background: "rgba(33, 150, 243, 0.15)",
                    color: "var(--blue)",
                    border: "1px solid rgba(33, 150, 243, 0.25)",
                    padding: "2px 5px",
                    borderRadius: "4px",
                    fontSize: "9px",
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {remorqueVal}
                </span>
                <span style={{ fontSize: "9px", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>Remorque</span>
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
};