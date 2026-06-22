"use client";

import React from "react";
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
  exportData,
  onMouseEnter,
  onMouseLeave,
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

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
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

        pointerEvents: "auto",
        zIndex: 99999,
        maxHeight: "calc(100vh - 40px)",
        overflowY: "auto",
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
    </div>
  );
};