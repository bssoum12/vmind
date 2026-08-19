"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, Layers, Calendar, FileText, ChevronRight, ChevronLeft, X, AlertTriangle, Clock, Loader2, TrendingDown, CheckCircle } from 'lucide-react';
import { AnimatedNumber } from './AnimatedNumber';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface VmoveDossiersEnRetardCardProps {
  activeAgentId?: string;
  clientId?: string;
  onInsertPrompt?: (prompt: string) => void;
}

const SENS_COLORS: Record<string, { main: string; glow: string; bg: string }> = {
  'Import': { main: '#F87171', glow: 'rgba(248, 113, 113, 0.4)', bg: 'rgba(248, 113, 113, 0.12)' },
  'Export': { main: '#FBBF24', glow: 'rgba(251, 191, 36, 0.4)', bg: 'rgba(251, 191, 36, 0.12)' },
  'National': { main: '#FB923C', glow: 'rgba(251, 146, 60, 0.4)', bg: 'rgba(251, 146, 60, 0.12)' },
  'N/A': { main: '#94A3B8', glow: 'rgba(148, 163, 184, 0.3)', bg: 'rgba(148, 163, 184, 0.1)' }
};

const NATURE_COLORS: Record<string, { main: string; glow: string }> = {
  'Complet': { main: '#A78BFA', glow: 'rgba(167, 139, 250, 0.35)' },
  'Groupage': { main: '#F472B6', glow: 'rgba(244, 114, 182, 0.35)' },
  'Co-chargement': { main: '#38BDF8', glow: 'rgba(56, 189, 248, 0.35)' },
  'N/A': { main: '#64748B', glow: 'rgba(100, 116, 139, 0.25)' }
};

const MONTHS_LIST = [
  { value: 0, label: "Tous les mois (Cumul)" },
  { value: 1, label: "Janvier" },
  { value: 2, label: "Février" },
  { value: 3, label: "Mars" },
  { value: 4, label: "Avril" },
  { value: 5, label: "Mai" },
  { value: 6, label: "Juin" },
  { value: 7, label: "Juillet" },
  { value: 8, label: "Août" },
  { value: 9, label: "Septembre" },
  { value: 10, label: "Octobre" },
  { value: 11, label: "Novembre" },
  { value: 12, label: "Décembre" }
];

function getAuthToken(): string {
  if (typeof window === 'undefined') return '';
  const mcpToken = localStorage.getItem('vmind_mcp_token');
  if (mcpToken && mcpToken !== 'null') return mcpToken;
  try {
    const sessionStr = localStorage.getItem('vmind_session');
    if (!sessionStr || sessionStr === 'null') return '';
    if (sessionStr.startsWith('eyJ')) return sessionStr;
    const parsed = JSON.parse(sessionStr);
    return parsed?.token || parsed?.access_token || parsed?.user?.token || sessionStr || '';
  } catch (e) {
    return '';
  }
}

export const VmoveDossiersEnRetardCard: React.FC<VmoveDossiersEnRetardCardProps> = ({
  activeAgentId,
  clientId = "DEMO",
  onInsertPrompt
}) => {
  const isVisible = !activeAgentId || activeAgentId.toUpperCase() === 'VMOVE' || activeAgentId.toUpperCase() === 'VMIND';

  const cardRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Selected filters
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(2); // Default Février 2026
  const [selectedSensFilter, setSelectedSensFilter] = useState<string>("ALL");
  const [isWidgetOpen, setIsWidgetOpen] = useState<boolean>(false);

  // Hover states for chart -> list interaction
  const [hoveredSens, setHoveredSens] = useState<string | null>(null);
  const [hoveredNature, setHoveredNature] = useState<string | null>(null);

  // Pagination State (5 items per page)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 5;

  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonth, selectedYear, isWidgetOpen, hoveredSens, hoveredNature, selectedSensFilter]);

  // Click outside to close widget
  useEffect(() => {
    if (!isWidgetOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        widgetRef.current &&
        !widgetRef.current.contains(event.target as Node) &&
        cardRef.current &&
        !cardRef.current.contains(event.target as Node)
      ) {
        setIsWidgetOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isWidgetOpen]);

  const updateCoords = () => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setCoords({
        top: Math.max(16, rect.top),
        left: rect.left
      });
    }
  };

  const handleButtonClick = () => {
    updateCoords();
    setIsWidgetOpen(prev => !prev);
  };

  // Direct DB Fetch State
  const [dbData, setDbData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const fetchDirectDbData = async (annee: number, mois: number) => {
    setLoading(true);
    setError("");
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://localhost:3001";
      const token = getAuthToken();

      const res = await fetch(`${baseUrl}/api/tools/get-vmove-dossiers-en-retard-kpi`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          client_id: clientId,
          annee: Number(annee),
          mois: Number(mois)
        })
      });

      if (!res.ok) {
        throw new Error(`Erreur SQL HTTP ${res.status}`);
      }

      const json = await res.json();
      const fetchedData = json.data || json;
      setDbData(fetchedData);
    } catch (err: any) {
      console.error("[VMOVE-RETARD-CARD] Direct DB Fetch Error:", err);
      setError(err?.message || "Impossible de charger les dossiers en retard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isVisible) {
      fetchDirectDbData(selectedYear, selectedMonth);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  // Use fetched DB data
  const summary = dbData?.summary || {
    total_dossiers_retard: 0,
    avg_retard_jours: 0,
    max_retard_jours: 0,
    annee: selectedYear,
    mois: selectedMonth
  };

  const rawBySens = dbData?.by_sens || [];
  const rawByNature = dbData?.by_nature || [];
  const detailsList: any[] = dbData?.details || [];

  // Helper to determine if a value represents missing/unassigned data
  const isMissingOrNA = (val: any) => {
    if (!val) return true;
    const s = String(val).trim().toUpperCase();
    return s === '' || s === 'N/A' || s === 'NON DÉFINI' || s === 'NON DEFINI' || s === 'NULL' || s === 'UNDEFINED';
  };

  // Dynamic filtering of widget details based on chart hover or click
  const activeSensFilter = hoveredSens || (selectedSensFilter !== "ALL" ? selectedSensFilter : null);
  const filteredWidgetDetails = detailsList.filter((d: any) => {
    if (hoveredNature) {
      const targetNat = String(hoveredNature).trim().toUpperCase();
      if (isMissingOrNA(targetNat)) {
        return isMissingOrNA(d.nature_transport || d.transport);
      }
      const dNat = String(d.nature_transport || d.transport || '').trim().toUpperCase();
      return dNat.includes(targetNat) || targetNat.includes(dNat);
    }
    if (activeSensFilter) {
      const targetSens = String(activeSensFilter).trim().toUpperCase();
      if (isMissingOrNA(targetSens)) {
        return isMissingOrNA(d.sens_operation || d.sens);
      }
      const dSens = String(d.sens_operation || d.sens || '').trim().toUpperCase();
      const cleanDSens = dSens.substring(0, 3);
      const cleanTarget = targetSens.substring(0, 3);
      return cleanDSens === cleanTarget || dSens.includes(targetSens) || targetSens.includes(dSens);
    }
    return true;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredWidgetDetails.length / ITEMS_PER_PAGE) || 1;
  const paginatedDetails = filteredWidgetDetails.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const totalRetard = summary.total_dossiers_retard || detailsList.length;

  // Positioning calculations for the Left-floating Cyber HUD Widget
  const widgetWidth = 580;
  let leftPosition = coords.left - widgetWidth - 16;
  if (leftPosition < 16) leftPosition = 16;
  let topPosition = coords.top;
  if (typeof window !== 'undefined' && topPosition + 520 > window.innerHeight) {
    topPosition = Math.max(16, window.innerHeight - 540);
  }

  const activeHoverLabel = hoveredNature
    ? `NATURE: ${hoveredNature.toUpperCase()}`
    : hoveredSens
    ? `SENS: ${hoveredSens.toUpperCase()}`
    : selectedSensFilter !== "ALL"
    ? `SENS: ${selectedSensFilter.toUpperCase()}`
    : null;

  return (
    <div
      ref={cardRef}
      style={{
        background: 'linear-gradient(135deg, rgba(24, 10, 18, 0.95) 0%, rgba(35, 14, 25, 0.95) 100%)',
        border: '1px solid rgba(248, 113, 113, 0.35)',
        borderRadius: '16px',
        padding: '14px',
        color: '#F8FAFC',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: '16px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      {/* Background Ambient Glow Accent */}
      <div style={{
        position: 'absolute',
        top: '-60px',
        right: '-60px',
        width: '160px',
        height: '160px',
        background: 'radial-gradient(circle, rgba(248, 113, 113, 0.18) 0%, transparent 70%)',
        pointerEvents: 'none',
        borderRadius: '50%'
      }} />

      {/* 1. Header Section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(248, 113, 113, 0.25) 0%, rgba(225, 29, 72, 0.15) 100%)',
            border: '1px solid rgba(248, 113, 113, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 12px rgba(248, 113, 113, 0.35)',
            flexShrink: 0
          }}>
            <AlertTriangle size={16} color="#F87171" />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.2px', margin: 0, color: '#F1F5F9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Dossiers en Retard
            </h3>
            <p style={{ fontSize: '10px', color: '#94A3B8', margin: 0, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Suivi des Délais ETA / ATA 
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchDirectDbData(selectedYear, selectedMonth)}
          disabled={loading}
          title="Rafraîchir les données SQL"
          style={{
            background: 'rgba(248, 113, 113, 0.08)',
            border: '1px solid rgba(248, 113, 113, 0.25)',
            borderRadius: '6px',
            padding: '4px 8px',
            color: '#F87171',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '10px',
            fontWeight: 600,
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            flexShrink: 0
          }}
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          <span>{loading ? "..." : "Actualiser"}</span>
        </button>
      </div>

      {/* 2. Premium Dropdown Controls (Month & Year) */}
      <div style={{
        display: 'flex',
        gap: '6px',
        alignItems: 'center',
        background: 'rgba(24, 10, 18, 0.75)',
        border: '1px solid rgba(248, 113, 113, 0.22)',
        borderRadius: '10px',
        padding: '6px 8px',
        marginBottom: '14px',
        boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.4)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#F87171', flexShrink: 0 }}>
          <Calendar size={13} />
          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Période:</span>
        </div>

        {/* Month Selector */}
        <select
          value={selectedMonth}
          onChange={(e) => {
            const val = Number(e.target.value);
            setSelectedMonth(val);
            fetchDirectDbData(selectedYear, val);
          }}
          style={{
            background: 'rgba(40, 16, 28, 0.8)',
            color: '#F1F5F9',
            border: '1px solid rgba(248, 113, 113, 0.3)',
            borderRadius: '6px',
            padding: '4px 6px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            flex: 1,
            minWidth: 0,
            outline: 'none'
          }}
        >
          {MONTHS_LIST.map((m) => (
            <option key={m.value} value={m.value} style={{ background: '#180A12', color: '#FFF' }}>
              {m.label}
            </option>
          ))}
        </select>

        {/* Year Selector */}
        <select
          value={selectedYear}
          onChange={(e) => {
            const val = Number(e.target.value);
            setSelectedYear(val);
            fetchDirectDbData(val, selectedMonth);
          }}
          style={{
            background: 'rgba(40, 16, 28, 0.8)',
            color: '#F87171',
            border: '1px solid rgba(248, 113, 113, 0.3)',
            borderRadius: '6px',
            padding: '4px 6px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            flexShrink: 0,
            outline: 'none'
          }}
        >
          {[2022, 2023, 2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y} style={{ background: '#180A12', color: '#FFF' }}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Primary Metric KPI Summary Banner (3-Card Layout) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '8px',
        marginBottom: '16px'
      }}>
        {/* Metric Card #1: Delayed Dossiers Count */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(248, 113, 113, 0.15) 0%, rgba(225, 29, 72, 0.05) 100%)',
          border: '1px solid rgba(248, 113, 113, 0.35)',
          borderRadius: '12px',
          padding: '8px 10px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.25)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
            <TrendingDown size={11} color="#F87171" />
            <span style={{ fontSize: '9px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              Retards
            </span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#F87171', lineHeight: 1.1, letterSpacing: '-0.5px' }}>
            <AnimatedNumber value={totalRetard} />
          </div>
          <span style={{ fontSize: '8px', color: '#64748B', display: 'block', marginTop: '2px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {selectedMonth > 0 ? MONTHS_LIST[selectedMonth]?.label : "Année"} {selectedYear}
          </span>
        </div>

        {/* Metric Card #2: Taux de Ponctualité (%) */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.12) 0%, rgba(16, 185, 129, 0.04) 100%)',
          border: '1px solid rgba(52, 211, 153, 0.35)',
          borderRadius: '12px',
          padding: '8px 10px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.25)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
            <CheckCircle size={11} color="#34D399" />
            <span style={{ fontSize: '9px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              Ponctualité
            </span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#34D399', lineHeight: 1.1, letterSpacing: '-0.5px' }}>
            {summary.taux_ponctualite_pct ?? 100}%
          </div>
          <span style={{ fontSize: '8px', color: '#34D399', display: 'block', marginTop: '2px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {summary.total_dossiers_a_temps ?? 0} / {summary.total_dossiers_evalues ?? 0} à l'heure
          </span>
        </div>

        {/* Metric Card #3: Retard Moyen & Max */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          borderRadius: '12px',
          padding: '8px 10px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.25)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
            <Clock size={11} color="#FBBF24" />
            <span style={{ fontSize: '9px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              Délai Moyen
            </span>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#F1F5F9', lineHeight: 1.2 }}>
            +{summary.avg_retard_jours} <span style={{ fontSize: '9px', color: '#94A3B8', fontWeight: 600 }}>j.</span>
          </div>
          <div style={{ fontSize: '9px', color: '#FBBF24', fontWeight: 700, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Max: +{summary.max_retard_jours} j.
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && !dbData ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '220px',
          gap: '12px',
          color: '#F87171'
        }}>
          <Loader2 size={26} className="animate-spin" />
          <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 500 }}>Analyse des retards SQL Server en cours...</span>
        </div>
      ) : (
        <>
          {/* 4. PIE CHART #1: REPARTITION PAR SENS (RETARDS) */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={13} color="#F87171" /> 1. Retards par Sens
              </span>
              <span style={{ fontSize: '9px', color: '#64748B', fontWeight: 600 }}>Import / Export / National</span>
            </div>

            <div style={{ height: '150px', width: '100%', position: 'relative' }}>
              {isMounted && rawBySens.length > 0 ? (
                <ResponsiveContainer width="100%" height={150} minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie
                      data={rawBySens}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={62}
                      paddingAngle={5}
                      dataKey="value"
                      onMouseEnter={(_, index) => setHoveredSens(rawBySens[index]?.name || null)}
                      onMouseLeave={() => setHoveredSens(null)}
                    >
                      {rawBySens.map((entry: any, index: number) => {
                        const styleConfig = SENS_COLORS[entry.name] || SENS_COLORS['N/A'];
                        const isHovered = hoveredSens === entry.name;
                        return (
                          <Cell
                            key={`retard-sens-cell-${index}`}
                            fill={styleConfig.main}
                            stroke={isHovered ? '#FFFFFF' : 'rgba(24, 10, 18, 0.9)'}
                            strokeWidth={isHovered ? 3 : 2}
                            style={{
                              filter: isHovered ? `drop-shadow(0 0 10px ${styleConfig.glow})` : 'none',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const pct = totalRetard > 0 ? ((data.value / totalRetard) * 100).toFixed(1) : '0';
                          const styleConfig = SENS_COLORS[data.name] || SENS_COLORS['N/A'];
                          return (
                            <div style={{
                              background: 'rgba(24, 10, 18, 0.95)',
                              border: `1px solid ${styleConfig.main}`,
                              padding: '8px 12px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              color: '#FFF',
                              boxShadow: `0 4px 20px ${styleConfig.glow}`
                            }}>
                              <strong style={{ color: styleConfig.main }}>{data.name}</strong>
                              <div>Dossiers en retard: <b>{data.value}</b> ({pct}%)</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748B', fontSize: '11px' }}>
                  Aucun dossier en retard pour cette période
                </div>
              )}
            </div>

            {/* Interactive Legend Pills with Quantity Details */}
            {rawBySens.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                {rawBySens.map((s: any) => {
                  const pct = totalRetard > 0 ? ((s.value / totalRetard) * 100).toFixed(0) : '0';
                  const styleConfig = SENS_COLORS[s.name] || SENS_COLORS['N/A'];
                  const isSelected = selectedSensFilter === s.name;
                  const isHovered = hoveredSens === s.name;
                  return (
                    <div
                      key={s.name}
                      onMouseEnter={() => setHoveredSens(s.name)}
                      onMouseLeave={() => setHoveredSens(null)}
                      onClick={() => setSelectedSensFilter(isSelected ? "ALL" : s.name)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '10px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '3px 8px',
                        borderRadius: '16px',
                        background: (isSelected || isHovered) ? styleConfig.bg : 'rgba(40, 16, 28, 0.6)',
                        border: `1px solid ${(isSelected || isHovered) ? styleConfig.main : 'rgba(148, 163, 184, 0.2)'}`,
                        transition: 'all 0.2s ease',
                        boxShadow: (isSelected || isHovered) ? `0 0 10px ${styleConfig.glow}` : 'none'
                      }}
                    >
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: styleConfig.main }} />
                      <span style={{ color: '#F1F5F9' }}>{s.name}</span>
                      <span style={{ color: styleConfig.main, fontWeight: 700 }}>{s.value}</span>
                      <span style={{ color: '#64748B', fontSize: '9px' }}>({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 5. PIE CHART #2: DETAIL PAR NATURE DE TRANSPORT (RETARDS) */}
          <div style={{
            background: 'rgba(24, 10, 18, 0.65)',
            border: '1px solid rgba(248, 113, 113, 0.2)',
            borderRadius: '12px',
            padding: '12px',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#F87171', letterSpacing: '0.2px' }}>
                2. Retards par Nature ({selectedSensFilter === "ALL" ? "Tous les Sens" : selectedSensFilter})
              </span>
              {selectedSensFilter !== "ALL" && (
                <button
                  onClick={() => setSelectedSensFilter("ALL")}
                  style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '10px', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Réinitialiser
                </button>
              )}
            </div>

            <div style={{ height: '130px', width: '100%', position: 'relative' }}>
              {isMounted && rawByNature.length > 0 ? (
                <ResponsiveContainer width="100%" height={130} minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie
                      data={rawByNature}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                      paddingAngle={4}
                      dataKey="value"
                      onMouseEnter={(_, index) => setHoveredNature(rawByNature[index]?.name || null)}
                      onMouseLeave={() => setHoveredNature(null)}
                    >
                      {rawByNature.map((entry: any, index: number) => {
                        const styleConfig = NATURE_COLORS[entry.name] || NATURE_COLORS['N/A'];
                        const isHovered = hoveredNature === entry.name;
                        return (
                          <Cell
                            key={`retard-nat-cell-${index}`}
                            fill={styleConfig.main}
                            stroke={isHovered ? '#FFFFFF' : 'rgba(24, 10, 18, 0.9)'}
                            strokeWidth={isHovered ? 3 : 2}
                            style={{
                              filter: isHovered ? `drop-shadow(0 0 10px ${styleConfig.glow})` : 'none',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const styleConfig = NATURE_COLORS[data.name] || NATURE_COLORS['N/A'];
                          return (
                            <div style={{
                              background: 'rgba(24, 10, 18, 0.95)',
                              border: `1px solid ${styleConfig.main}`,
                              padding: '6px 10px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              color: '#FFF',
                              boxShadow: `0 4px 15px ${styleConfig.glow}`
                            }}>
                              <strong style={{ color: styleConfig.main }}>{data.name}</strong>
                              <div>Dossiers en retard: <b>{data.value}</b></div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748B', fontSize: '11px' }}>
                  Aucune donnée nature
                </div>
              )}
            </div>

            {/* Legend for Pie #2 with Quantity Highlights */}
            {rawByNature.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
                {rawByNature.map((n: any) => {
                  const styleConfig = NATURE_COLORS[n.name] || NATURE_COLORS['N/A'];
                  const isHovered = hoveredNature === n.name;
                  return (
                    <div
                      key={n.name}
                      onMouseEnter={() => setHoveredNature(n.name)}
                      onMouseLeave={() => setHoveredNature(null)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '10px',
                        color: isHovered ? styleConfig.main : '#CBD5E1',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '2px 6px',
                        borderRadius: '12px',
                        background: isHovered ? `${styleConfig.main}20` : 'transparent',
                        border: `1px solid ${isHovered ? styleConfig.main : 'transparent'}`,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: styleConfig.main }} />
                      <span>{n.name}: <b style={{ color: '#FFF' }}>{n.value}</b></span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* 6. Primary Action Button */}
      <button
        onClick={handleButtonClick}
        style={{
          width: '100%',
          marginTop: '14px',
          padding: '10px 14px',
          background: 'linear-gradient(90deg, rgba(248, 113, 113, 0.22) 0%, rgba(225, 29, 72, 0.22) 100%)',
          border: '1px solid rgba(248, 113, 113, 0.45)',
          borderRadius: '10px',
          color: '#F87171',
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.2px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          boxShadow: '0 4px 16px rgba(248, 113, 113, 0.2)',
          transition: 'all 0.2s ease'
        }}
      >
        <FileText size={14} /> Voir la liste des {totalRetard} dossiers en retard
        <ChevronRight size={14} />
      </button>

      {/* 7. FLOATING CYBER HUD WIDGET (ATTACHED TO THE LEFT OF THE CARD) */}
      {isWidgetOpen && isMounted && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'transparent',
            zIndex: 99999,
            pointerEvents: 'none'
          }}
        >
          <div
            ref={widgetRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: `${leftPosition}px`,
              top: `${topPosition}px`,
              width: `${widgetWidth}px`,
              pointerEvents: 'auto',
              background: 'rgba(24, 10, 18, 0.98)',
              border: '1px solid rgba(248, 113, 113, 0.4)',
              borderRadius: '16px',
              padding: '20px',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.85), 0 0 35px rgba(248, 113, 113, 0.15)',
              color: '#F8FAFC',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            {/* Cyber HUD Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid rgba(248, 113, 113, 0.25)',
              paddingBottom: '10px',
              marginBottom: '14px',
              fontSize: '10px',
              color: '#F87171',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-mono), monospace'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'inline-block', width: '6px', height: '6px', background: '#F87171', borderRadius: '50%', boxShadow: '0 0 8px #F87171' }} />
                <span style={{ color: '#F87171', fontWeight: 800 }}>DOSSIERS EN RETARD</span>
                {activeHoverLabel && (
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(248, 113, 113, 0.2)',
                    border: '1px solid rgba(248, 113, 113, 0.4)',
                    color: '#FFF',
                    fontWeight: 700,
                    fontSize: '9px'
                  }}>
                    • SURVOL : {activeHoverLabel} ({filteredWidgetDetails.length})
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ opacity: 0.75 }}>VMOVE ASSISTANT</span>
                <button
                  onClick={() => setIsWidgetOpen(false)}
                  title="Fermer"
                  style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '14px', padding: 0 }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Quick Metrics Stats Bar inside Widget (5 Columns) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '8px',
              marginBottom: '16px',
              background: 'rgba(40, 16, 28, 0.7)',
              border: '1px solid rgba(248, 113, 113, 0.2)',
              borderRadius: '10px',
              padding: '10px 12px'
            }}>
              <div>
                <span style={{ fontSize: '9px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block' }}>Total Retards</span>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#F87171' }}>{totalRetard}</span>
              </div>
              <div>
                <span style={{ fontSize: '9px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block' }}>Ponctualité</span>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#34D399' }}>{summary.taux_ponctualite_pct ?? 100}%</span>
              </div>
              <div>
                <span style={{ fontSize: '9px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block' }}>Retard Moyen</span>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#FBBF24' }}>+{summary.avg_retard_jours} j.</span>
              </div>
              <div>
                <span style={{ fontSize: '9px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block' }}>Retard Max</span>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#EF4444' }}>+{summary.max_retard_jours} j.</span>
              </div>
              <div>
                <span style={{ fontSize: '9px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block' }}>Période</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#CBD5E1' }}>{selectedMonth > 0 ? MONTHS_LIST[selectedMonth]?.label : "Année"} {selectedYear}</span>
              </div>
            </div>

            {/* Non-Scrollable Table (5 Items per Page with Dynamic Hover Filtering) */}
            <div style={{ overflowX: 'hidden', marginBottom: '14px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: '#E2E8F0', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.12)', textAlign: 'left', color: '#94A3B8', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <th style={{ padding: '8px 4px', width: '22%' }}>Réf Dossier</th>
                    <th style={{ padding: '8px 4px', width: '28%' }}>Client</th>
                    <th style={{ padding: '8px 4px', width: '14%' }}>Sens</th>
                    <th style={{ padding: '8px 4px', width: '14%' }}>ETA / ATA</th>
                    <th style={{ padding: '8px 4px', width: '22%', textAlign: 'right' }}>Retard</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedDetails.length > 0 ? (
                    paginatedDetails.map((d: any, idx: number) => {
                      const sensConfig = SENS_COLORS[d.sens_operation] || SENS_COLORS['N/A'];
                      const delay = Number(d.jours_retard) || 0;
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                          <td style={{ padding: '10px 4px', fontWeight: 800, color: '#F87171', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={d.reference_dossier}>
                            {d.reference_dossier}
                          </td>
                          <td style={{ padding: '10px 4px', fontWeight: 600, color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={d.client || 'Client Inconnu'}>
                            {d.client || 'Client Inconnu'}
                          </td>
                          <td style={{ padding: '10px 4px' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 700,
                              display: 'inline-block',
                              background: sensConfig.bg,
                              color: sensConfig.main,
                              border: `1px solid ${sensConfig.main}40`
                            }}>
                              {d.sens_operation || 'N/A'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 4px', color: '#CBD5E1', fontSize: '10px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <div>ETA: {d.eta || 'N/A'}</div>
                            <div style={{ color: '#F87171', fontWeight: 700 }}>ATA: {d.ata || 'N/A'}</div>
                          </td>
                          <td style={{ padding: '10px 4px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 900,
                              background: 'rgba(239, 68, 68, 0.18)',
                              color: '#EF4444',
                              border: '1px solid rgba(239, 68, 68, 0.4)'
                            }}>
                              +{delay} Jours
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#94A3B8' }}>
                        Aucun dossier en retard pour cette sélection.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer */}
            {filteredWidgetDetails.length > 0 && (
              <div style={{
                paddingTop: '10px',
                borderTop: '1px solid rgba(248, 113, 113, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: '#94A3B8'
              }}>
                <span>Page <strong style={{ color: '#F87171' }}>{currentPage}</strong> sur <strong style={{ color: '#FFF' }}>{totalPages}</strong> ({filteredWidgetDetails.length} retards affichés)</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    style={{
                      background: currentPage === 1 ? 'rgba(255,255,255,0.03)' : 'rgba(248, 113, 113, 0.15)',
                      border: '1px solid rgba(248, 113, 113, 0.3)',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      color: currentPage === 1 ? '#64748B' : '#F87171',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10px',
                      fontWeight: 700
                    }}
                  >
                    <ChevronLeft size={12} /> Précédent
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    style={{
                      background: currentPage === totalPages ? 'rgba(255,255,255,0.03)' : 'rgba(248, 113, 113, 0.15)',
                      border: '1px solid rgba(248, 113, 113, 0.3)',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      color: currentPage === totalPages ? '#64748B' : '#F87171',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10px',
                      fontWeight: 700
                    }}
                  >
                    Suivant <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
