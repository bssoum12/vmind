"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, Calendar, FileText, ChevronRight, ChevronLeft, X, Truck, Loader2, Award, Users, CheckCircle2 } from 'lucide-react';
import { AnimatedNumber } from './AnimatedNumber';

interface VmoveVolumeTransporteurCardProps {
  activeAgentId?: string;
  clientId?: string;
  onInsertPrompt?: (prompt: string) => void;
}

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

export const VmoveVolumeTransporteurCard: React.FC<VmoveVolumeTransporteurCardProps> = ({
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
  const [selectedCarrierFilter, setSelectedCarrierFilter] = useState<string>("ALL");
  const [isWidgetOpen, setIsWidgetOpen] = useState<boolean>(false);

  // Hover state for carrier ranking -> list interaction
  const [hoveredCarrier, setHoveredCarrier] = useState<string | null>(null);

  // Pagination State (5 items per page)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 5;

  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonth, selectedYear, isWidgetOpen, hoveredCarrier, selectedCarrierFilter]);

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

      const res = await fetch(`${baseUrl}/api/tools/get-vmove-volume-transporteur-kpi`, {
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
      console.error("[VMOVE-TRANSPORTEUR-CARD] Direct DB Fetch Error:", err);
      setError(err?.message || "Impossible de charger le volume par transporteur.");
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
    total_transporteurs: 0,
    total_dossiers_clotures: 0,
    top_transporteur_nom: 'N/A',
    top_transporteur_dossiers: 0,
    top_transporteur_pct: 0,
    annee: selectedYear,
    mois: selectedMonth
  };

  const rankingList: any[] = dbData?.ranking || [];
  const detailsList: any[] = dbData?.details || [];

  // Dynamic filtering of widget details based on carrier hover or click
  const activeCarrier = hoveredCarrier || (selectedCarrierFilter !== "ALL" ? selectedCarrierFilter : null);
  const filteredWidgetDetails = detailsList.filter((d: any) => {
    if (activeCarrier) {
      const dCarrier = String(d.transporteur || 'Non défini').trim().toUpperCase();
      const targetCarrier = String(activeCarrier).trim().toUpperCase();
      return dCarrier === targetCarrier || dCarrier.includes(targetCarrier) || targetCarrier.includes(dCarrier);
    }
    return true;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredWidgetDetails.length / ITEMS_PER_PAGE) || 1;
  const paginatedDetails = filteredWidgetDetails.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const totalClotures = summary.total_dossiers_clotures || detailsList.length;

  // Positioning calculations for the Left-floating Cyber HUD Widget
  const widgetWidth = 580;
  let leftPosition = coords.left - widgetWidth - 16;
  if (leftPosition < 16) leftPosition = 16;
  let topPosition = coords.top;
  if (typeof window !== 'undefined' && topPosition + 520 > window.innerHeight) {
    topPosition = Math.max(16, window.innerHeight - 540);
  }

  return (
    <div
      ref={cardRef}
      style={{
        background: 'linear-gradient(135deg, rgba(8, 22, 36, 0.95) 0%, rgba(14, 30, 48, 0.95) 100%)',
        border: '1px solid rgba(0, 229, 200, 0.35)',
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
        background: 'radial-gradient(circle, rgba(0, 229, 200, 0.18) 0%, transparent 70%)',
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
            background: 'linear-gradient(135deg, rgba(0, 229, 200, 0.25) 0%, rgba(14, 165, 233, 0.15) 100%)',
            border: '1px solid rgba(0, 229, 200, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 12px rgba(0, 229, 200, 0.35)',
            flexShrink: 0
          }}>
            <Truck size={16} color="#00E5C8" />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.2px', margin: 0, color: '#F1F5F9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Volume par Transporteur
            </h3>
            <p style={{ fontSize: '10px', color: '#94A3B8', margin: 0, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Dossiers Clôturés
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchDirectDbData(selectedYear, selectedMonth)}
          disabled={loading}
          title="Rafraîchir les données SQL"
          style={{
            background: 'rgba(0, 229, 200, 0.08)',
            border: '1px solid rgba(0, 229, 200, 0.25)',
            borderRadius: '6px',
            padding: '4px 8px',
            color: '#00E5C8',
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
        background: 'rgba(8, 22, 36, 0.75)',
        border: '1px solid rgba(0, 229, 200, 0.22)',
        borderRadius: '10px',
        padding: '6px 8px',
        marginBottom: '14px',
        boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.4)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#00E5C8', flexShrink: 0 }}>
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
            background: 'rgba(14, 30, 48, 0.8)',
            color: '#F1F5F9',
            border: '1px solid rgba(0, 229, 200, 0.3)',
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
            <option key={m.value} value={m.value} style={{ background: '#081624', color: '#FFF' }}>
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
            background: 'rgba(14, 30, 48, 0.8)',
            color: '#00E5C8',
            border: '1px solid rgba(0, 229, 200, 0.3)',
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
            <option key={y} value={y} style={{ background: '#081624', color: '#FFF' }}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Primary Metric KPI Summary Banner (2 Cards) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
        marginBottom: '16px'
      }}>
        {/* Card #1: Total Dossiers Clôturés */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 229, 200, 0.15) 0%, rgba(14, 165, 233, 0.05) 100%)',
          border: '1px solid rgba(0, 229, 200, 0.35)',
          borderRadius: '12px',
          padding: '8px 10px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.25)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
            <CheckCircle2 size={11} color="#00E5C8" />
            <span style={{ fontSize: '9px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              Clôturés
            </span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#00E5C8', lineHeight: 1.1, letterSpacing: '-0.5px' }}>
            <AnimatedNumber value={totalClotures} />
          </div>
          <span style={{ fontSize: '8px', color: '#64748B', display: 'block', marginTop: '2px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {selectedMonth > 0 ? MONTHS_LIST[selectedMonth]?.label : "Année"} {selectedYear}
          </span>
        </div>

        {/* Card #2: Transporteurs Actifs */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.12) 0%, rgba(139, 92, 246, 0.04) 100%)',
          border: '1px solid rgba(167, 139, 250, 0.35)',
          borderRadius: '12px',
          padding: '8px 10px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.25)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
            <Users size={11} color="#A78BFA" />
            <span style={{ fontSize: '9px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              Transporteurs
            </span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#A78BFA', lineHeight: 1.1, letterSpacing: '-0.5px' }}>
            <AnimatedNumber value={summary.total_transporteurs || 0} />
          </div>
          <span style={{ fontSize: '8px', color: '#A78BFA', display: 'block', marginTop: '2px', fontWeight: 600 }}>
            prestataires
          </span>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && !dbData ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '200px',
          gap: '12px',
          color: '#00E5C8'
        }}>
          <Loader2 size={26} className="animate-spin" />
          <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 500 }}>Classement SQL des transporteurs...</span>
        </div>
      ) : (
        /* 4. CARRIER RANKING LIST (BAR CHART STYLE) */
        <div style={{
          background: 'rgba(8, 22, 36, 0.65)',
          border: '1px solid rgba(0, 229, 200, 0.2)',
          borderRadius: '12px',
          padding: '12px',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#00E5C8', letterSpacing: '0.2px' }}>
              Classement par Volume Traité
            </span>
            {selectedCarrierFilter !== "ALL" && (
              <button
                onClick={() => setSelectedCarrierFilter("ALL")}
                style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '10px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Réinitialiser
              </button>
            )}
          </div>

          {rankingList.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {rankingList.slice(0, 6).map((item: any, idx: number) => {
                const isSelected = selectedCarrierFilter === item.name;
                const isHovered = hoveredCarrier === item.name;
                const maxCount = rankingList[0]?.count || 1;
                const fillPct = Math.max(8, (item.count / maxCount) * 100);

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredCarrier(item.name)}
                    onMouseLeave={() => setHoveredCarrier(null)}
                    onClick={() => setSelectedCarrierFilter(isSelected ? "ALL" : item.name)}
                    style={{
                      cursor: 'pointer',
                      padding: '6px 8px',
                      borderRadius: '8px',
                      background: (isSelected || isHovered) ? 'rgba(0, 229, 200, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${(isSelected || isHovered) ? 'rgba(0, 229, 200, 0.4)' : 'rgba(255, 255, 255, 0.05)'}`,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontSize: '11px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <span style={{
                          fontSize: '9px',
                          fontWeight: 800,
                          color: idx === 0 ? '#FBBF24' : idx === 1 ? '#CBD5E1' : idx === 2 ? '#FB923C' : '#94A3B8',
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          background: 'rgba(255,255,255,0.06)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          #{idx + 1}
                        </span>
                        <span style={{ fontWeight: 700, color: '#F1F5F9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.name}>
                          {item.name}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <span style={{ fontWeight: 800, color: '#00E5C8' }}>{item.count}</span>
                        <span style={{ fontSize: '9px', color: '#64748B' }}>({item.pct}%)</span>
                      </div>
                    </div>

                    {/* Progress Fill Bar */}
                    <div style={{
                      height: '5px',
                      width: '100%',
                      background: 'rgba(255,255,255,0.06)',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${fillPct}%`,
                        background: idx === 0 ? 'linear-gradient(90deg, #FBBF24, #F59E0B)' : 'linear-gradient(90deg, #00E5C8, #0EA5E9)',
                        borderRadius: '3px',
                        transition: 'width 0.3s ease',
                        boxShadow: idx === 0 ? '0 0 8px rgba(251, 191, 36, 0.4)' : '0 0 8px rgba(0, 229, 200, 0.4)'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px', color: '#64748B', fontSize: '11px' }}>
              Aucun dossier clôturé pour cette période
            </div>
          )}
        </div>
      )}

      {/* 5. Primary Action Button */}
      <button
        onClick={handleButtonClick}
        style={{
          width: '100%',
          marginTop: '14px',
          padding: '10px 14px',
          background: 'linear-gradient(90deg, rgba(0, 229, 200, 0.22) 0%, rgba(14, 165, 233, 0.22) 100%)',
          border: '1px solid rgba(0, 229, 200, 0.45)',
          borderRadius: '10px',
          color: '#00E5C8',
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.2px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          boxShadow: '0 4px 16px rgba(0, 229, 200, 0.2)',
          transition: 'all 0.2s ease'
        }}
      >
        <FileText size={14} /> Voir le registre des {totalClotures} dossiers clôturés
        <ChevronRight size={14} />
      </button>

      {/* 6. FLOATING CYBER HUD WIDGET (ATTACHED TO THE LEFT OF THE CARD) */}
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
              background: 'rgba(8, 22, 36, 0.98)',
              border: '1px solid rgba(0, 229, 200, 0.4)',
              borderRadius: '16px',
              padding: '20px',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.85), 0 0 35px rgba(0, 229, 200, 0.15)',
              color: '#F8FAFC',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            {/* Cyber HUD Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid rgba(0, 229, 200, 0.25)',
              paddingBottom: '10px',
              marginBottom: '14px',
              fontSize: '10px',
              color: '#00E5C8',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-mono), monospace'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'inline-block', width: '6px', height: '6px', background: '#00E5C8', borderRadius: '50%', boxShadow: '0 0 8px #00E5C8' }} />
                <span style={{ color: '#00E5C8', fontWeight: 800 }}>REGISTRE PAR TRANSPORTEUR</span>
                {activeCarrier && (
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(0, 229, 200, 0.2)',
                    border: '1px solid rgba(0, 229, 200, 0.4)',
                    color: '#FFF',
                    fontWeight: 700,
                    fontSize: '9px'
                  }}>
                    • {activeCarrier.toUpperCase()} ({filteredWidgetDetails.length})
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

            {/* Quick Metrics Stats Bar inside Widget (3 Columns) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              marginBottom: '16px',
              background: 'rgba(14, 30, 48, 0.7)',
              border: '1px solid rgba(0, 229, 200, 0.2)',
              borderRadius: '10px',
              padding: '10px 12px'
            }}>
              <div>
                <span style={{ fontSize: '9px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block' }}>Total Clôturés</span>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#00E5C8' }}>{totalClotures}</span>
              </div>
              <div>
                <span style={{ fontSize: '9px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block' }}>Transporteurs</span>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#A78BFA' }}>{summary.total_transporteurs}</span>
              </div>
              <div>
                <span style={{ fontSize: '9px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block' }}>Période</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#CBD5E1' }}>{selectedMonth > 0 ? MONTHS_LIST[selectedMonth]?.label : "Année"} {selectedYear}</span>
              </div>
            </div>

            {/* Non-Scrollable Table (5 Items per Page with Dynamic Carrier Filtering) */}
            <div style={{ overflowX: 'hidden', marginBottom: '14px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: '#E2E8F0', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.12)', textAlign: 'left', color: '#94A3B8', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <th style={{ padding: '8px 4px', width: '22%' }}>Réf Dossier</th>
                    <th style={{ padding: '8px 4px', width: '28%' }}>Client</th>
                    <th style={{ padding: '8px 4px', width: '24%' }}>Transporteur</th>
                    <th style={{ padding: '8px 4px', width: '14%' }}>Sens</th>
                    <th style={{ padding: '8px 4px', width: '12%', textAlign: 'right' }}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedDetails.length > 0 ? (
                    paginatedDetails.map((d: any, idx: number) => {
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                          <td style={{ padding: '10px 4px', fontWeight: 800, color: '#00E5C8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={d.reference_dossier}>
                            {d.reference_dossier}
                          </td>
                          <td style={{ padding: '10px 4px', fontWeight: 600, color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={d.client || 'Client Inconnu'}>
                            {d.client || 'Client Inconnu'}
                          </td>
                          <td style={{ padding: '10px 4px', fontWeight: 700, color: '#FBBF24', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={d.transporteur || 'Non défini'}>
                            {d.transporteur || 'Non défini'}
                          </td>
                          <td style={{ padding: '10px 4px', color: '#CBD5E1', fontSize: '10px', fontWeight: 600 }}>
                            {d.sens_operation || 'N/A'}
                          </td>
                          <td style={{ padding: '10px 4px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '10px',
                              fontWeight: 800,
                              background: 'rgba(52, 211, 153, 0.18)',
                              color: '#34D399',
                              border: '1px solid rgba(52, 211, 153, 0.4)'
                            }}>
                              Clôturé
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#94A3B8' }}>
                        Aucun dossier clôturé pour ce transporteur.
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
                borderTop: '1px solid rgba(0, 229, 200, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: '#94A3B8'
              }}>
                <span>Page <strong style={{ color: '#00E5C8' }}>{currentPage}</strong> sur <strong style={{ color: '#FFF' }}>{totalPages}</strong> ({filteredWidgetDetails.length} dossiers affichés)</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    style={{
                      background: currentPage === 1 ? 'rgba(255,255,255,0.03)' : 'rgba(0, 229, 200, 0.15)',
                      border: '1px solid rgba(0, 229, 200, 0.3)',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      color: currentPage === 1 ? '#64748B' : '#00E5C8',
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
                      background: currentPage === totalPages ? 'rgba(255,255,255,0.03)' : 'rgba(0, 229, 200, 0.15)',
                      border: '1px solid rgba(0, 229, 200, 0.3)',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      color: currentPage === totalPages ? '#64748B' : '#00E5C8',
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
