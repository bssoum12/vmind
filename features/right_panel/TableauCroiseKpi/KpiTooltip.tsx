"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { MultiKpiItem } from "@/shared/types/kpi";

interface KpiTooltipProps {
  visible: boolean;
  kpis: MultiKpiItem[];
  coords: { top: number; left: number };
  exportData: any;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

interface CardProps {
  title: string;
  value: string | number;
  footer: React.ReactNode;
  highlightColor: string;
}

const KpiCard: React.FC<CardProps> = ({ title, value, footer, highlightColor }) => {
  const [hovered, setHovered] = React.useState(false);

  let borderStyle = "1px solid rgba(0, 229, 200, 0.08)";
  let bgStyle = "rgba(10, 24, 40, 0.5)";
  let shadowStyle = "inset 0 0 12px rgba(0, 229, 200, 0.02)";

  if (hovered) {
    if (highlightColor === "green") {
      borderStyle = "1px solid rgba(0, 229, 200, 0.45)";
      bgStyle = "rgba(0, 229, 200, 0.08)";
      shadowStyle = "0 0 15px rgba(0, 229, 200, 0.15)";
    } else if (highlightColor === "yellow") {
      borderStyle = "1px solid rgba(255, 184, 0, 0.45)";
      bgStyle = "rgba(255, 184, 0, 0.08)";
      shadowStyle = "0 0 15px rgba(255, 184, 0, 0.15)";
    } else if (highlightColor === "blue") {
      borderStyle = "1px solid rgba(33, 150, 243, 0.45)";
      bgStyle = "rgba(33, 150, 243, 0.08)";
      shadowStyle = "0 0 15px rgba(33, 150, 243, 0.15)";
    } else if (highlightColor === "purple") {
      borderStyle = "1px solid rgba(123, 97, 255, 0.45)";
      bgStyle = "rgba(123, 97, 255, 0.08)";
      shadowStyle = "0 0 15px rgba(123, 97, 255, 0.15)";
    }
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: bgStyle,
        border: borderStyle,
        borderRadius: "8px",
        padding: "14px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "92px",
        transition: "all 0.3s ease",
        boxShadow: shadowStyle,
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
  exportData,
  onMouseEnter,
  onMouseLeave,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Extract key KPI fields by label safely
  const kpiActive = kpis?.find(k => k.label === "Dossiers actifs");
  const kpiClosed = kpis?.find(k => k.label === "Dossiers clôturés");
  const kpiSousNonFact = kpis?.find(k => k.label === "Sous-dossiers non facturés");
  const kpiSousTotal = kpis?.find(k => k.label === "Total sous-dossiers");
  const kpiUniteTotal = kpis?.find(k => k.label === "Unités de chargement");
  const kpiTeuTotal = kpis?.find(k => k.label === "TEU total");
  const kpiRemorqueTotal = kpis?.find(k => k.label === "Remorques");

  const activeVal = kpiActive?.value ?? 0;
  const activeDelta = kpiActive?.delta_24h ?? 0;

  const closedVal = kpiClosed?.value ?? 0;
  const closedDelta = kpiClosed?.delta_24h ?? 0;

  const sousTotalVal = kpiSousTotal?.value ?? 0;
  const sousNonFactVal = kpiSousNonFact?.value ?? 0;

  const uniteTotalVal = kpiUniteTotal?.value ?? 0;
  const teuVal = kpiTeuTotal?.value ?? 0;
  const remorqueVal = kpiRemorqueTotal?.value ?? 0;

  // Animated states
  const [animatedActiveVal, setAnimatedActiveVal] = useState(0);
  const [animatedActiveDelta, setAnimatedActiveDelta] = useState(0);
  const [animatedClosedVal, setAnimatedClosedVal] = useState(0);
  const [animatedClosedDelta, setAnimatedClosedDelta] = useState(0);
  const [animatedSousTotalVal, setAnimatedSousTotalVal] = useState(0);
  const [animatedSousNonFactVal, setAnimatedSousNonFactVal] = useState(0);
  const [animatedUniteTotalVal, setAnimatedUniteTotalVal] = useState(0);
  const [animatedTeuVal, setAnimatedTeuVal] = useState(0);
  const [animatedRemorqueVal, setAnimatedRemorqueVal] = useState(0);

  useEffect(() => {
    if (visible) {
      const duration = 1000;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = progress * (2 - progress); // Ease out quad

        setAnimatedActiveVal(activeVal * easeProgress);
        setAnimatedActiveDelta(activeDelta * easeProgress);
        setAnimatedClosedVal(closedVal * easeProgress);
        setAnimatedClosedDelta(closedDelta * easeProgress);
        setAnimatedSousTotalVal(sousTotalVal * easeProgress);
        setAnimatedSousNonFactVal(sousNonFactVal * easeProgress);
        setAnimatedUniteTotalVal(uniteTotalVal * easeProgress);
        setAnimatedTeuVal(teuVal * easeProgress);
        setAnimatedRemorqueVal(remorqueVal * easeProgress);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    } else {
      setAnimatedActiveVal(0);
      setAnimatedActiveDelta(0);
      setAnimatedClosedVal(0);
      setAnimatedClosedDelta(0);
      setAnimatedSousTotalVal(0);
      setAnimatedSousNonFactVal(0);
      setAnimatedUniteTotalVal(0);
      setAnimatedTeuVal(0);
      setAnimatedRemorqueVal(0);
    }
  }, [
    visible,
    activeVal,
    activeDelta,
    closedVal,
    closedDelta,
    sousTotalVal,
    sousNonFactVal,
    uniteTotalVal,
    teuVal,
    remorqueVal,
  ]);

  if (!visible || !mounted || !kpis || kpis.length === 0) {
    return null;
  }

  const tooltipWidth = 440;
  const leftPosition = Math.max(10, coords.left - tooltipWidth - 12);
  const tooltipHeight = 480;
  let topPosition = coords.top - 20;
  if (typeof window !== "undefined") {
    if (topPosition + tooltipHeight > window.innerHeight) {
      topPosition = window.innerHeight - tooltipHeight - 20;
    }
    topPosition = Math.max(20, topPosition);
  }

  const handleExportExcel = () => {
    if (!exportData) {
      alert("Données d'exportation non disponibles.");
      return;
    }

    const { dossiers_actifs, dossiers_clotures, sous_dossiers, unites_chargement } = exportData;

    const formatBool = (val: any) => (val === 1 || val === true ? "Oui" : "Non");
    const formatDate = (val: any) => {
      if (!val) return "";
      try {
        return new Date(val).toISOString().split('T')[0];
      } catch (e) {
        return String(val);
      }
    };

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
      <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8"/>
      <style>
        table { border-collapse: collapse; margin-bottom: 30px; font-family: 'Segoe UI', Calibri, sans-serif; font-size: 11px; }
        th { background-color: #0F2035; color: #FFFFFF; font-weight: bold; border: 1px solid #D9D9D9; padding: 8px; text-align: left; }
        td { border: 1px solid #E0E0E0; padding: 8px; color: #333333; }
        .section-header { font-size: 16px; font-weight: bold; color: #00BFA8; padding: 15px 0 5px 0; font-family: 'Segoe UI', sans-serif; }
        .billed-row { background-color: #a3ffaa; }
        .unbilled-row { background-color: #ffc6c6; }
        .teu-row { background-color: #d7b2ff; }
        .remorque-row { background-color: #b2ecff; }
      </style>
      </head>
      <body>
    `;

    // 1. Dossiers actifs
    html += `<div class="section-header">1. Dossiers Actifs</div>`;
    html += `<table>
      <thead>
        <tr>
          <th>Référence</th>
          <th>Date Création</th>
          <th>Clôturé</th>
          <th>Facturé</th>
          <th>Poids Total (kg)</th>
          <th>Volume Total (m³)</th>
          <th>Valeur Marchandise</th>
        </tr>
      </thead>
      <tbody>`;
    if (dossiers_actifs && dossiers_actifs.length > 0) {
      dossiers_actifs.forEach((row: any) => {
        html += `<tr>
          <td>${row.Reference ?? ""}</td>
          <td>${formatDate(row.CreatedOnDate)}</td>
          <td>${formatBool(row.EstCloture)}</td>
          <td>${formatBool(row.EstFacture)}</td>
          <td>${row.poidsTotal ?? 0}</td>
          <td>${row.volumeTotal ?? 0}</td>
          <td>${row.ValMarchandise ?? 0}</td>
        </tr>`;
      });
    } else {
      html += `<tr><td colspan="7" style="text-align: center; color: #999;">Aucune donnée</td></tr>`;
    }
    html += `</tbody></table>`;

    // 2. Dossiers clotures
    html += `<div class="section-header">2. Dossiers Clôturés</div>`;
    html += `<table>
      <thead>
        <tr>
          <th>Référence</th>
          <th>Date Création</th>
          <th>Clôturé</th>
          <th>Facturé</th>
          <th>Poids Total (kg)</th>
          <th>Volume Total (m³)</th>
          <th>Valeur Marchandise</th>
        </tr>
      </thead>
      <tbody>`;
    if (dossiers_clotures && dossiers_clotures.length > 0) {
      dossiers_clotures.forEach((row: any) => {
        html += `<tr>
          <td>${row.Reference ?? ""}</td>
          <td>${formatDate(row.CreatedOnDate)}</td>
          <td>${formatBool(row.EstCloture)}</td>
          <td>${formatBool(row.EstFacture)}</td>
          <td>${row.poidsTotal ?? 0}</td>
          <td>${row.volumeTotal ?? 0}</td>
          <td>${row.ValMarchandise ?? 0}</td>
        </tr>`;
      });
    } else {
      html += `<tr><td colspan="7" style="text-align: center; color: #999;">Aucune donnée</td></tr>`;
    }
    html += `</tbody></table>`;

    // 3. Sous Dossiers (Unbilled lines highlighted in light red, billed in light green)
    html += `<div class="section-header">3. Sous Dossiers</div>`;
    html += `
      <table style="border: none; margin-bottom: 10px; font-family: 'Segoe UI', sans-serif; font-size: 10px;">
        <tr>
          <td style="background-color: #eaf8eb; border: 1px solid #c8e6c9; padding: 4px 10px; font-weight: bold; color: #a3ffaa; text-align: center; width: 140px;">Facturés (Vert)</td>
          <td style="border: none; width: 10px;"></td>
          <td style="background-color: #ffeaea; border: 1px solid #ffcdd2; padding: 4px 10px; font-weight: bold; color: #ffc6c6; text-align: center; width: 140px;">Non Facturés (Rouge)</td>
        </tr>
      </table>
    `;
    html += `<table>
      <thead>
        <tr>
          <th>Référence</th>
          <th>Description</th>
          <th>Date Création</th>
          <th>Facturé</th>
          <th>Colis</th>
          <th>Poids</th>
          <th>Volume</th>
        </tr>
      </thead>
      <tbody>`;
    if (sous_dossiers && sous_dossiers.length > 0) {
      sous_dossiers.forEach((row: any) => {
        const isUnbilled = row.EstFacture === 0 || row.EstFacture === null || !row.EstFacture;
        const rowClass = isUnbilled ? 'class="unbilled-row"' : 'class="billed-row"';
        html += `<tr ${rowClass}>
          <td>${row.Reference ?? ""}</td>
          <td>${row.Description ?? ""}</td>
          <td>${formatDate(row.CreatedOnDate)}</td>
          <td>${formatBool(row.EstFacture)}</td>
          <td>${row.nbColis ?? 0}</td>
          <td>${row.poids ?? 0}</td>
          <td>${row.volume ?? 0}</td>
        </tr>`;
      });
    } else {
      html += `<tr><td colspan="7" style="text-align: center; color: #999;">Aucune donnée</td></tr>`;
    }
    html += `</tbody></table>`;

    // 4. Unites de chargement (TEU in purple, Remorque in blue)
    html += `<div class="section-header">4. Unités de Chargement</div>`;
    html += `
      <table style="border: none; margin-bottom: 10px; font-family: 'Segoe UI', sans-serif; font-size: 10px;">
        <tr>
          <td style="background-color: #f3e8ff; border: 1px solid #d1c4e9; padding: 4px 10px; font-weight: bold; color: #d7b2ff; text-align: center; width: 140px;">TEU (Violet)</td>
          <td style="border: none; width: 10px;"></td>
          <td style="background-color: #e8f4f8; border: 1px solid #b3e5fc; padding: 4px 10px; font-weight: bold; color: #b2ecff; text-align: center; width: 140px;">Remorque (Bleu)</td>
        </tr>
      </table>
    `;
    html += `<table>
      <thead>
        <tr>
          <th>Année</th>
          <th>Mois</th>
          <th>Nb TEU</th>
          <th>Nb Remorques</th>
          <th>Nb Conteneurs Total</th>
        </tr>
      </thead>
      <tbody>`;
    if (unites_chargement && unites_chargement.length > 0) {
      unites_chargement.forEach((row: any) => {
        let rowClass = "";
        if (row.NbTEU > 0 && (!row.NbRemorque || row.NbRemorque === 0)) {
          rowClass = 'class="teu-row"';
        } else if (row.NbRemorque > 0 && (!row.NbTEU || row.NbTEU === 0)) {
          rowClass = 'class="remorque-row"';
        } else if (row.NbTEU > 0 && row.NbRemorque > 0) {
          rowClass = 'class="teu-row"';
        }

        html += `<tr ${rowClass}>
          <td>${row.Annee ?? ""}</td>
          <td>${row.Mois ?? ""}</td>
          <td>${row.NbTEU ?? 0}</td>
          <td>${row.NbRemorque ?? 0}</td>
          <td>${row.NbConteneurTotal ?? 0}</td>
        </tr>`;
      });
    } else {
      html += `<tr><td colspan="5" style="text-align: center; color: #999;">Aucune donnée</td></tr>`;
    }
    html += `</tbody></table>`;

    html += `</body></html>`;

    // Trigger download
    const blob = new Blob(["\ufeff" + html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Vmind_Indicateurs_Export.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return createPortal(
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: "fixed",
        left: `${leftPosition}px`,
        top: `${topPosition}px`,
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

        pointerEvents: "auto",
        zIndex: 999999,
        maxHeight: "calc(100vh - 40px)",
        overflowY: "auto",
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
          <span style={{ color: "#00f0ff", fontWeight: 700 }}> Indicateurs clés consolidés </span>
        </div>
        <div style={{ opacity: 0.8 }}> VDATA ASSISTANT </div>
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
          value={Math.round(animatedActiveVal)}
          highlightColor="green"
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
                +{Math.round(animatedActiveDelta)}
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
          value={Math.round(animatedClosedVal)}
          highlightColor="yellow"
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
                +{Math.round(animatedClosedDelta)}
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
          value={Math.round(animatedSousTotalVal)}
          highlightColor="blue"
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
                {Math.round(animatedSousNonFactVal)}
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
          value={Math.round(animatedUniteTotalVal)}
          highlightColor="purple"
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
                  {Math.round(animatedTeuVal)}
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
                  {Math.round(animatedRemorqueVal)}
                </span>
                <span style={{ fontSize: "9px", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>Remorque</span>
              </div>
            </div>
          }
        />
      </div>

      {/* Cyber-accented Export Excel Button */}
      <button
        onClick={handleExportExcel}
        style={{
          marginTop: "16px",
          width: "100%",
          padding: "10px",
          background: "rgba(0, 229, 200, 0.06)",
          border: "1px solid rgba(0, 229, 200, 0.3)",
          borderRadius: "6px",
          color: "var(--cyan)",
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "1.5px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          transition: "all 0.2s ease",
          outline: "none",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(0, 229, 200, 0.15)";
          e.currentTarget.style.borderColor = "var(--cyan)";
          e.currentTarget.style.boxShadow = "0 0 10px rgba(0, 229, 200, 0.25)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(0, 229, 200, 0.06)";
          e.currentTarget.style.borderColor = "rgba(0, 229, 200, 0.3)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Exporter vers Excel
      </button>
    </div>,
    document.body
  );
};