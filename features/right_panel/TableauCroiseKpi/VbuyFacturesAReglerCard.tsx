"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getVbuyKpiFacturesARegler } from '@/shared/api/n8n-api';
import { AlertTriangle, Clock, RefreshCw, Building2, ChevronRight, Info } from 'lucide-react';
import { AnimatedNumber } from './AnimatedNumber';

interface VbuyFacturesAReglerCardProps {
  activeAgentId?: string;
  clientId?: string;
  onInsertPrompt?: (prompt: string) => void;
}

export const VbuyFacturesAReglerCard: React.FC<VbuyFacturesAReglerCardProps> = ({
  activeAgentId,
  clientId = "DEMO",
  onInsertPrompt
}) => {
  const isVisible = !activeAgentId || activeAgentId.toUpperCase() === 'VBUY' || activeAgentId.toUpperCase() === 'VMIND';

  const [horizon, setHorizon] = useState<'1d' | '1w' | '1m' | '3m' | '6m'>('1d');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCardHovered, setIsCardHovered] = useState<boolean>(false);
  const [cardCoords, setCardCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [mounted, setMounted] = useState<boolean>(false);
  const [expandedSection, setExpandedSection] = useState<'proches' | 'echues' | null>(null);
  const [pageProches, setPageProches] = useState<number>(1);
  const [pageEchues, setPageEchues] = useState<number>(1);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnterCard = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setCardCoords({ top: rect.top, left: rect.left });
    setIsCardHovered(true);
  };

  const handleMouseLeaveCard = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsCardHovered(false);
    }, 150);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadKpi = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getVbuyKpiFacturesARegler(clientId, horizon);
      setData(res);
    } catch (err: any) {
      console.error("[VBUY KPI CARD] Error:", err);
      setError(err?.message || "Erreur lors du chargement des KPIs VBUY");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isVisible) {
      loadKpi();
    }
  }, [horizon, clientId, isVisible]);

  if (!isVisible) return null;

  const payload = data?.data || data;
  const kpis = payload?.kpis || [];
  const kpiTotal = kpis.find((k: any) => k.label === 'Factures à régler');
  const kpiEchue = kpis.find((k: any) => k.label === 'Factures échues');
  const kpiProche = kpis.find((k: any) => k.label === 'À échéance proche');

  const summary = {
    total_a_regler_tnd: payload?.summary?.total_a_regler_tnd ?? kpiTotal?.value ?? 0,
    total_echue_tnd: payload?.summary?.total_echue_tnd ?? kpiEchue?.value ?? 0,
    total_echeance_proche_tnd: payload?.summary?.total_echeance_proche_tnd ?? kpiProche?.value ?? 0,
    count_total: payload?.summary?.count_total ?? payload?.details?.nb_factures ?? 0,
    count_echue: payload?.summary?.count_echue ?? 0,
    count_proche: payload?.summary?.count_proche ?? 0,
  };
  const rawByHorizon = payload?.by_horizon || [];
  const byHorizon = rawByHorizon.length > 0 
    ? rawByHorizon 
    : [
        { key: 'echues', label: 'Factures Échues', amount: summary.total_echue_tnd, count: summary.count_echue },
        { key: 'proches', label: 'À Échéance Proche', amount: summary.total_echeance_proche_tnd, count: summary.count_proche }
      ].filter(h => h.count > 0 || h.amount > 0);

  const topSuppliers = payload?.top_suppliers_a_regler || [];
  const facturesProches: any[] = payload?.factures_proches || [];
  const facturesEchues: any[] = payload?.factures_echues || [];

  const pageSize = 5;

  const totalPagesProches = Math.max(1, Math.ceil(facturesProches.length / pageSize));
  const paginatedProches = facturesProches.slice((pageProches - 1) * pageSize, pageProches * pageSize);

  const totalPagesEchues = Math.max(1, Math.ceil(facturesEchues.length / pageSize));
  const paginatedEchues = facturesEchues.slice((pageEchues - 1) * pageSize, pageEchues * pageSize);

  const formatTND = (val: any) => {
    const num = typeof val === 'number' ? val : parseFloat(val) || 0;
    const truncated = Math.trunc(num * 1000) / 1000;
    return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(truncated) + ' TND';
  };

  const formatNumberOnly = (val: any) => {
    const num = typeof val === 'number' ? val : parseFloat(val) || 0;
    const truncated = Math.trunc(num * 1000) / 1000;
    return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(truncated);
  };

  return (
    <div style={{
      background: 'linear-gradient(145deg, rgba(13, 17, 26, 0.96) 0%, rgba(22, 10, 24, 0.96) 100%)',
      border: '1px solid rgba(255, 71, 87, 0.3)',
      borderRadius: '16px',
      padding: '16px 18px',
      color: '#fff',
      boxShadow: '0 10px 35px rgba(0, 0, 0, 0.55), inset 0 0 20px rgba(255, 71, 87, 0.05)',
      backdropFilter: 'blur(16px)',
      position: 'relative',
      overflow: 'visible',
      marginBottom: '16px'
    }}>
      <style>{`
        @keyframes popoverSlideLeft {
          from {
            opacity: 0;
            transform: translateX(12px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
      `}</style>
      
      {/* Ambient background glow */}
      <div style={{
        position: 'absolute',
        top: '-40px',
        right: '-40px',
        width: '140px',
        height: '140px',
        background: 'radial-gradient(circle, rgba(255, 71, 87, 0.22) 0%, rgba(0,0,0,0) 70%)',
        pointerEvents: 'none'
      }} />

      {/* Header */}
      <div
        style={{
          fontSize: "9px",
          color: "var(--muted)",
          fontFamily: "var(--font-mono)",
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          marginBottom: "12px",
          fontWeight: 600,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>Factures Fournisseurs à Régler</span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#FF4757", fontSize: "9px", fontWeight: 800, letterSpacing: '0.5px' }}>VBUY</span>
          <button
            onClick={loadKpi}
            disabled={loading}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '4px 7px',
              color: '#94A3B8',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Rafraîchir KPI"
          >
            <RefreshCw 
              size={12} 
              className={loading ? "animate-spin" : ""} 
              style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} 
            />
          </button>
        </div>
      </div>

      {/* Horizon Filter Bar */}
      <div style={{
        display: 'flex',
        gap: '4px',
        background: 'rgba(11, 15, 25, 0.8)',
        padding: '3px',
        borderRadius: '10px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        marginBottom: '14px'
      }}>
        {[
          { label: '24h', value: '1d' },
          { label: '7j', value: '1w' },
          { label: '30j', value: '1m' },
          { label: '90j', value: '3m' },
          { label: '180j', value: '6m' },
        ].map((item) => {
          const isSelected = horizon === item.value;
          return (
            <button
              key={item.label}
              onClick={() => setHorizon(item.value as any)}
              style={{
                flex: '1 1 0px',
                minWidth: 0,
                padding: '5px 1px',
                fontSize: '10px',
                fontWeight: isSelected ? 700 : 500,
                color: isSelected ? '#FFFFFF' : '#94A3B8',
                background: isSelected 
                  ? 'linear-gradient(135deg, rgba(255, 71, 87, 0.35) 0%, rgba(255, 71, 87, 0.15) 100%)' 
                  : 'transparent',
                border: isSelected ? '1px solid #FF4757' : '1px solid transparent',
                boxShadow: isSelected ? '0 0 12px rgba(255, 71, 87, 0.4)' : 'none',
                borderRadius: '7px',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{
          padding: '28px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          color: '#94A3B8',
          fontSize: '11px'
        }}>
          <RefreshCw 
            size={18} 
            className="animate-spin" 
            style={{ color: '#FF4757', flexShrink: 0, animation: 'spin 1s linear infinite' }} 
          />
          <span>Calcul du solde des factures fournisseurs...</span>
        </div>
      ) : error ? (
        <div style={{
          padding: '12px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          fontSize: '11px',
          color: '#FCA5A5'
        }}>
          {error}
        </div>
      ) : (
        <>
          {/* Main KPI Card (Total à Régler) with Floating Hover Details to the Left */}
          <div
            onMouseEnter={handleMouseEnterCard}
            onMouseMove={(e) => {
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
              }
              const rect = e.currentTarget.getBoundingClientRect();
              setCardCoords({ top: rect.top, left: rect.left });
            }}
            onMouseLeave={handleMouseLeaveCard}
            style={{
              background: isCardHovered
                ? 'linear-gradient(135deg, rgba(255, 71, 87, 0.1) 0%, rgba(245, 158, 11, 0.06) 100%)'
                : 'rgba(255, 255, 255, 0.02)',
              border: isCardHovered
                ? '1px solid rgba(255, 71, 87, 0.4)'
                : '1px solid rgba(255, 255, 255, 0.07)',
              borderRadius: '14px',
              padding: '14px 16px',
              marginBottom: '14px',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer',
              boxShadow: isCardHovered ? '0 6px 24px rgba(255, 71, 87, 0.15)' : 'none',
              position: 'relative'
            }}
          >
            {/* Split row: Metrics on Left, 3D Glowing Invoice Graphic on Right */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
              
              {/* Left Column: Metrics */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Header subtext & Details pill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', minWidth: 0 }}>
                  <span style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    TOTAL À RÉGLER
                  </span>
                  <span style={{
                    fontSize: '9px',
                    color: isCardHovered ? '#FF808B' : '#64748B',
                    background: isCardHovered ? 'rgba(255, 71, 87, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                    border: isCardHovered ? '1px solid rgba(255, 71, 87, 0.35)' : '1px solid rgba(255, 71, 87, 0.08)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}>
                    <Info size={10} style={{ color: isCardHovered ? '#FF4757' : '#94A3B8' }} />
                    {isCardHovered ? 'Détails actifs' : 'Détails'}
                  </span>
                </div>

                {/* Main Total Amount */}
                <div style={{
                  fontSize: '16px',
                  fontWeight: 900,
                  color: '#FFFFFF',
                  fontFamily: 'monospace',
                  letterSpacing: '-0.4px',
                  marginBottom: '10px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  <AnimatedNumber value={summary.total_a_regler_tnd} formatter={formatTND} />
                </div>

                {/* 3-Column Metric Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', alignItems: 'flex-start' }}>
                  {/* Col 1: Total En Attente */}
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2 }}>
                      <AnimatedNumber value={summary.count_total} />
                    </div>
                    <div style={{ fontSize: '9px', color: '#64748B', lineHeight: 1.2, marginTop: '2px' }}>
                      facture(s)<br />en attente
                    </div>
                  </div>

                  {/* Col 2: En Retard */}
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#FF4757', lineHeight: 1.2 }}>
                      {summary.count_echue}
                    </div>
                    <div style={{ fontSize: '9px', color: '#FF4757', fontWeight: 600, lineHeight: 1.2, marginTop: '2px' }}>
                      en retard
                    </div>
                  </div>

                  {/* Col 3: Proche(s) */}
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#F59E0B', lineHeight: 1.2 }}>
                      {summary.count_proche}
                    </div>
                    <div style={{ fontSize: '9px', color: '#F59E0B', fontWeight: 600, lineHeight: 1.2, marginTop: '2px' }}>
                      proche(s)
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: 3D Glowing Red Invoice Graphic */}
              <div style={{
                position: 'relative',
                width: '68px',
                height: '68px',
                flexShrink: 0,
                marginTop: '10px',
                alignSelf: 'flex-end',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '12px',
                background: 'radial-gradient(circle, rgba(255, 71, 87, 0.25) 0%, transparent 70%)',
                overflow: 'hidden'
              }}>
                <img 
                  src="/glowing_invoice_3d.jpg" 
                  alt="Factures Fournisseurs" 
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: 'drop-shadow(0 0 12px rgba(255, 71, 87, 0.6))',
                    transform: isCardHovered ? 'scale(1.08)' : 'scale(1)',
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }} 
                />
              </div>

            </div>

            {/* Floating Popover Widget Opening to the Left (Matches Image 2 reference) */}
            {isCardHovered && mounted && createPortal(
              <div 
                onMouseEnter={handleMouseEnterCard}
                onMouseLeave={handleMouseLeaveCard}
                style={{
                  position: 'fixed',
                  left: `${Math.max(10, cardCoords.left - 290)}px`,
                  top: `${Math.max(10, cardCoords.top)}px`,
                  width: '275px',
                  background: 'linear-gradient(145deg, rgba(11, 15, 25, 0.98) 0%, rgba(22, 12, 26, 0.98) 100%)',
                  border: '1px solid rgba(255, 71, 87, 0.4)',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  boxShadow: '-10px 14px 36px rgba(0, 0, 0, 0.75), 0 0 24px rgba(255, 71, 87, 0.25)',
                  backdropFilter: 'blur(20px)',
                  zIndex: 999999,
                  animation: 'popoverSlideLeft 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                  pointerEvents: 'auto'
                }}>
                {/* Pointer Arrow pointing to the card on right */}
                <div style={{
                  position: 'absolute',
                  right: '-6px',
                  top: '22px',
                  width: '10px',
                  height: '10px',
                  background: '#160C1A',
                  borderRight: '1px solid rgba(255, 71, 87, 0.4)',
                  borderTop: '1px solid rgba(255, 71, 87, 0.4)',
                  transform: 'rotate(45deg)'
                }} />

                {/* Popover Header with glowing right accent line */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#F8FAFC',
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  <Info size={13} style={{ color: '#FF4757', marginRight: '6px' }} />
                  DÉTAILS DU SOLDE
                  <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(255, 71, 87, 0.4), transparent)', marginLeft: '8px' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  
                  {/* Box 1: Factures Échues (Red Theme) */}
                  <div 
                    onClick={() => {
                      setExpandedSection(prev => prev === 'echues' ? null : 'echues');
                      if (onInsertPrompt && facturesEchues.length > 0) {
                        const refs = facturesEchues.map((f: any) => f.reference || f.reference_fournisseur).filter(Boolean);
                        onInsertPrompt(`Factures fournisseurs échues (${refs.length}): ${refs.join(', ')}`);
                      }
                    }}
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 71, 87, 0.12) 0%, rgba(20, 10, 15, 0.9) 100%)',
                      border: '1px solid rgba(255, 71, 87, 0.45)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                      {/* Left Round Avatar Icon */}
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(255, 71, 87, 0.3) 0%, rgba(255, 71, 87, 0.1) 100%)',
                        border: '1px solid rgba(255, 71, 87, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <AlertTriangle size={18} style={{ color: '#FF4757' }} />
                      </div>

                      {/* Middle Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '9px', fontWeight: 800, color: '#FF808B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                          FACTURES ÉCHUES
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 900, color: '#FF4757', fontFamily: 'monospace', lineHeight: 1.1 }}>
                          <AnimatedNumber value={summary.total_echue_tnd} formatter={formatTND} />
                        </div>
                        <div style={{ fontSize: '9px', color: '#FFA8B0', marginTop: '2px' }}>
                          <AnimatedNumber value={summary.count_echue} /> facture(s) en retard
                        </div>
                      </div>

                      {/* Right Chevron Arrow */}
                      <ChevronRight 
                        size={16} 
                        style={{ 
                          color: '#FF4757', 
                          flexShrink: 0,
                          transform: expandedSection === 'echues' ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s'
                        }} 
                      />
                    </div>

                    {/* Expandable Real Invoices References List */}
                    {expandedSection === 'echues' && (
                      <div style={{
                        marginTop: '4px',
                        paddingTop: '8px',
                        borderTop: '1px dashed rgba(255, 71, 87, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}>
                        <div style={{ fontSize: '9px', fontWeight: 800, color: '#FF808B', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          Références des factures échues ({summary.count_echue || facturesEchues.length}) :
                        </div>
                        {paginatedEchues.length > 0 ? (
                          paginatedEchues.map((f: any, i: number) => (
                            <div
                              key={i}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onInsertPrompt) {
                                  onInsertPrompt(`Détails facture fournisseur Réf: ${f.reference || f.reference_fournisseur}`);
                                }
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '6px 8px',
                                background: 'rgba(255, 71, 87, 0.1)',
                                border: '1px solid rgba(255, 71, 87, 0.25)',
                                borderRadius: '6px',
                                fontSize: '10px',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <span style={{ fontWeight: 800, color: '#FF808B', fontFamily: 'monospace' }}>
                                  {f.reference || f.reference_fournisseur}
                                </span>
                                <span style={{ fontSize: '8px', color: '#E2E8F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {f.fournisseur}
                                </span>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '6px' }}>
                                <div style={{ fontWeight: 800, color: '#FF4757', fontFamily: 'monospace' }}>
                                  {formatTND(f.montant_tnd)}
                                </div>
                                <div style={{ fontSize: '8px', color: '#CBD5E1' }}>
                                  Échéance: {f.date_echeance || 'N/A'}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div style={{ fontSize: '10px', color: '#FFA8B0', fontStyle: 'italic', padding: '4px' }}>
                            Aucune facture échue trouvée.
                          </div>
                        )}

                        {/* Pagination Bar for Factures Échues */}
                        {totalPagesEchues > 1 && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: '4px',
                            paddingTop: '6px',
                            borderTop: '1px solid rgba(255, 71, 87, 0.2)',
                            fontSize: '9px'
                          }}>
                            <button
                              disabled={pageEchues === 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPageEchues(p => Math.max(1, p - 1));
                              }}
                              style={{
                                background: pageEchues === 1 ? 'rgba(255,255,255,0.03)' : 'rgba(255, 71, 87, 0.2)',
                                border: '1px solid rgba(255, 71, 87, 0.35)',
                                color: pageEchues === 1 ? '#64748B' : '#FF808B',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                cursor: pageEchues === 1 ? 'not-allowed' : 'pointer',
                                fontSize: '9px',
                                fontWeight: 700
                              }}
                            >
                              ‹ Préc.
                            </button>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#FFA8B0' }}>
                              Page {pageEchues} / {totalPagesEchues}
                            </span>
                            <button
                              disabled={pageEchues >= totalPagesEchues}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPageEchues(p => Math.min(totalPagesEchues, p + 1));
                              }}
                              style={{
                                background: pageEchues >= totalPagesEchues ? 'rgba(255,255,255,0.03)' : 'rgba(255, 71, 87, 0.2)',
                                border: '1px solid rgba(255, 71, 87, 0.35)',
                                color: pageEchues >= totalPagesEchues ? '#64748B' : '#FF808B',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                cursor: pageEchues >= totalPagesEchues ? 'not-allowed' : 'pointer',
                                fontSize: '9px',
                                fontWeight: 700
                              }}
                            >
                              Suiv. ›
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Box 2: À Échéance Proche (Amber Theme) */}
                  <div 
                    onClick={() => {
                      setExpandedSection(prev => prev === 'proches' ? null : 'proches');
                      if (onInsertPrompt && facturesProches.length > 0) {
                        const refs = facturesProches.map((f: any) => f.reference || f.reference_fournisseur).filter(Boolean);
                        onInsertPrompt(`Factures fournisseurs à échéance proche (${refs.length}): ${refs.join(', ')}`);
                      }
                    }}
                    style={{
                      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(25, 20, 10, 0.9) 100%)',
                      border: '1px solid rgba(245, 158, 11, 0.45)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                      {/* Left Round Avatar Icon */}
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(245, 158, 11, 0.3) 0%, rgba(245, 158, 11, 0.1) 100%)',
                        border: '1px solid rgba(245, 158, 11, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Clock size={18} style={{ color: '#F59E0B' }} />
                      </div>

                      {/* Middle Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '9px', fontWeight: 800, color: '#FCD34D', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                          À ÉCHÉANCE PROCHE
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 900, color: '#F59E0B', fontFamily: 'monospace', lineHeight: 1.1 }}>
                          <AnimatedNumber value={summary.total_echeance_proche_tnd} formatter={formatTND} />
                        </div>
                        <div style={{ fontSize: '9px', color: '#FDE68A', marginTop: '2px' }}>
                          <AnimatedNumber value={summary.count_proche} /> facture(s) proche(s)
                        </div>
                      </div>

                      {/* Right Chevron Arrow */}
                      <ChevronRight 
                        size={16} 
                        style={{ 
                          color: '#F59E0B', 
                          flexShrink: 0,
                          transform: expandedSection === 'proches' ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s'
                        }} 
                      />
                    </div>

                    {/* Expandable Real Invoices References List */}
                    {expandedSection === 'proches' && (
                      <div style={{
                        marginTop: '4px',
                        paddingTop: '8px',
                        borderTop: '1px dashed rgba(245, 158, 11, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}>
                        <div style={{ fontSize: '9px', fontWeight: 800, color: '#FCD34D', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          Références des factures ({summary.count_proche || facturesProches.length}) :
                        </div>
                        {paginatedProches.length > 0 ? (
                          paginatedProches.map((f: any, i: number) => (
                            <div
                              key={i}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onInsertPrompt) {
                                  onInsertPrompt(`Détails facture fournisseur Réf: ${f.reference || f.reference_fournisseur}`);
                                }
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '6px 8px',
                                background: 'rgba(245, 158, 11, 0.1)',
                                border: '1px solid rgba(245, 158, 11, 0.25)',
                                borderRadius: '6px',
                                fontSize: '10px',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <span style={{ fontWeight: 800, color: '#FCD34D', fontFamily: 'monospace' }}>
                                  {f.reference || f.reference_fournisseur}
                                </span>
                                <span style={{ fontSize: '8px', color: '#E2E8F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {f.fournisseur}
                                </span>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '6px' }}>
                                <div style={{ fontWeight: 800, color: '#F59E0B', fontFamily: 'monospace' }}>
                                  {formatTND(f.montant_tnd)}
                                </div>
                                <div style={{ fontSize: '8px', color: '#CBD5E1' }}>
                                  Échéance: {f.date_echeance || 'N/A'}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div style={{ fontSize: '10px', color: '#FDE68A', fontStyle: 'italic', padding: '4px' }}>
                            Aucune facture à échéance proche trouvée.
                          </div>
                        )}

                        {/* Pagination Bar for À Échéance Proche */}
                        {totalPagesProches > 1 && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: '4px',
                            paddingTop: '6px',
                            borderTop: '1px solid rgba(245, 158, 11, 0.2)',
                            fontSize: '9px'
                          }}>
                            <button
                              disabled={pageProches === 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPageProches(p => Math.max(1, p - 1));
                              }}
                              style={{
                                background: pageProches === 1 ? 'rgba(255,255,255,0.03)' : 'rgba(245, 158, 11, 0.2)',
                                border: '1px solid rgba(245, 158, 11, 0.35)',
                                color: pageProches === 1 ? '#64748B' : '#FCD34D',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                cursor: pageProches === 1 ? 'not-allowed' : 'pointer',
                                fontSize: '9px',
                                fontWeight: 700
                              }}
                            >
                              ‹ Préc.
                            </button>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#FDE68A' }}>
                              Page {pageProches} / {totalPagesProches}
                            </span>
                            <button
                              disabled={pageProches >= totalPagesProches}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPageProches(p => Math.min(totalPagesProches, p + 1));
                              }}
                              style={{
                                background: pageProches >= totalPagesProches ? 'rgba(255,255,255,0.03)' : 'rgba(245, 158, 11, 0.2)',
                                border: '1px solid rgba(245, 158, 11, 0.35)',
                                color: pageProches >= totalPagesProches ? '#64748B' : '#FCD34D',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                cursor: pageProches >= totalPagesProches ? 'not-allowed' : 'pointer',
                                fontSize: '9px',
                                fontWeight: 700
                              }}
                            >
                              Suiv. ›
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              </div>,
              document.body
            )}
          </div>



          {/* Top Suppliers */}
          {topSuppliers.length > 0 && (
            <div>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#CBD5E1', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Top Fournisseurs à Régler (TND)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {topSuppliers.slice(0, 5).map((sup: any, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => onInsertPrompt && onInsertPrompt(`Détails factures fournisseur ${sup.supplier_name}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                      borderRadius: '6px',
                      fontSize: '11px',
                      cursor: onInsertPrompt ? 'pointer' : 'default',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 71, 87, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                  >
                    <span style={{ color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1, marginRight: '8px', overflow: 'hidden' }}>
                      <Building2 size={12} style={{ color: '#FF4757', flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sup.supplier_name}</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'monospace', fontWeight: 700, color: '#F8FAFC', flexShrink: 0 }}>
                      <AnimatedNumber value={sup.total_tnd} formatter={formatNumberOnly} />
                      {onInsertPrompt && <ChevronRight size={12} style={{ color: '#94A3B8' }} />}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
