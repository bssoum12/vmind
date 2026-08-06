"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getVbuyKpiAchatsDuMois } from '@/shared/api/n8n-api';
import { TrendingUp, TrendingDown, RefreshCw, Building2, ChevronRight, Info, ShoppingCart } from 'lucide-react';
import { AnimatedNumber } from './AnimatedNumber';

interface VbuyAchatsDuMoisCardProps {
  activeAgentId?: string;
  clientId?: string;
  onInsertPrompt?: (prompt: string) => void;
}

export const VbuyAchatsDuMoisCard: React.FC<VbuyAchatsDuMoisCardProps> = ({
  activeAgentId,
  clientId = "DEMO",
  onInsertPrompt
}) => {
  const isVisible = !activeAgentId || activeAgentId.toUpperCase() === 'VBUY' || activeAgentId.toUpperCase() === 'VMIND';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCardHovered, setIsCardHovered] = useState<boolean>(false);
  const [cardCoords, setCardCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [mounted, setMounted] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);

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
      const res = await getVbuyKpiAchatsDuMois(clientId);
      setData(res);
    } catch (err: any) {
      console.error("[VBUY ACHATS CARD] Error:", err);
      setError(err?.message || "Erreur lors du chargement du KPI Achats du mois");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isVisible) {
      loadKpi();
    }
  }, [clientId, isVisible]);

  if (!isVisible) return null;

  const payload = data?.data || data;
  const summary = {
    total_achats_mois_actuel_tnd: payload?.summary?.total_achats_mois_actuel_tnd ?? 0,
    nb_factures_mois_actuel: payload?.summary?.nb_factures_mois_actuel ?? 0,
    total_achats_mois_precedent_tnd: payload?.summary?.total_achats_mois_precedent_tnd ?? 0,
    nb_factures_mois_precedent: payload?.summary?.nb_factures_mois_precedent ?? 0,
    variation_pct: payload?.summary?.variation_pct ?? 0,
    nom_mois_actuel: payload?.summary?.nom_mois_actuel ?? 'Mois en cours',
    nom_mois_precedent: payload?.summary?.nom_mois_precedent ?? 'Mois précédent',
  };

  const topSuppliers: any[] = payload?.top_suppliers || [];
  const facturesMoisActuel: any[] = payload?.factures_mois_actuel || [];

  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(facturesMoisActuel.length / pageSize));
  const paginatedFactures = facturesMoisActuel.slice((page - 1) * pageSize, page * pageSize);

  const isPositiveTrend = summary.variation_pct >= 0;

  const formatTND = (val: any) => {
    const num = typeof val === 'number' ? val : parseFloat(val) || 0;
    const truncated = Math.trunc(num * 1000) / 1000;
    return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(truncated) + ' TND';
  };

  return (
    <div style={{
      background: 'linear-gradient(145deg, rgba(13, 17, 26, 0.96) 0%, rgba(10, 24, 22, 0.96) 100%)',
      border: '1px solid rgba(16, 185, 129, 0.3)',
      borderRadius: '16px',
      padding: '16px 18px',
      color: '#fff',
      boxShadow: '0 10px 35px rgba(0, 0, 0, 0.55), inset 0 0 20px rgba(16, 185, 129, 0.05)',
      backdropFilter: 'blur(16px)',
      position: 'relative',
      overflow: 'visible',
      marginBottom: '16px'
    }}>
      {/* Top Header Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '9px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            color: '#E2E8F0'
          }}>
            ACHATS DU MOIS
          </span>
          <span style={{
            fontSize: '9px',
            fontWeight: 800,
            color: '#10B981',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            padding: '1px 6px',
            borderRadius: '4px',
            letterSpacing: '0.5px'
          }}>
            VBUY
          </span>
        </div>

        <button
          onClick={loadKpi}
          title="Rafraîchir KPI"
          disabled={loading}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748B',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#10B981'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#64748B'}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div style={{
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          color: '#64748B',
          fontSize: '11px'
        }}>
          <RefreshCw size={14} className="animate-spin" />
          <span>Chargement des achats du mois...</span>
        </div>
      ) : error ? (
        <div style={{
          padding: '14px',
          fontSize: '11px',
          color: '#EF4444',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '8px'
        }}>
          {error}
        </div>
      ) : (
        <>
          {/* Main Card Container */}
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
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 182, 212, 0.06) 100%)'
                : 'rgba(255, 255, 255, 0.02)',
              border: isCardHovered
                ? '1px solid rgba(16, 185, 129, 0.4)'
                : '1px solid rgba(255, 255, 255, 0.07)',
              borderRadius: '14px',
              padding: '14px 16px',
              marginBottom: '14px',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer',
              boxShadow: isCardHovered ? '0 6px 24px rgba(16, 185, 129, 0.15)' : 'none',
              position: 'relative'
            }}
          >
            {/* Split row: Metrics on Left, 3D Glowing Purchase Graphic on Right */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
              
              {/* Left Column: Metrics */}
              <div style={{ flex: 1, minWidth: 0 }}>
                
                {/* Header subtext & Details pill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', minWidth: 0 }}>
                  <span style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    TOTAL ACHATS ({summary.nom_mois_actuel})
                  </span>
                  <span style={{
                    fontSize: '9px',
                    color: isCardHovered ? '#6EE7B7' : '#64748B',
                    background: isCardHovered ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                    border: isCardHovered ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}>
                    <Info size={10} style={{ color: isCardHovered ? '#10B981' : '#94A3B8' }} />
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
                  <AnimatedNumber value={summary.total_achats_mois_actuel_tnd} formatter={formatTND} />
                </div>

                {/* Sub-Metrics Row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap' }}>
                  {/* Col 1: Factures Validées */}
                  <div style={{ flexShrink: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2 }}>
                      <AnimatedNumber value={summary.nb_factures_mois_actuel} />
                    </div>
                    <div style={{ fontSize: '9px', color: '#64748B', lineHeight: 1.2, marginTop: '2px', whiteSpace: 'nowrap' }}>
                      facture(s) validée(s)
                    </div>
                  </div>

                  {/* Col 2: Variation M/M-1 */}
                  <div style={{ flexShrink: 0 }}>
                    <div style={{
                      fontSize: '15px',
                      fontWeight: 800,
                      color: isPositiveTrend ? '#10B981' : '#FF4757',
                      lineHeight: 1.2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}>
                      {isPositiveTrend ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      <span>{isPositiveTrend ? '+' : ''}{summary.variation_pct}%</span>
                    </div>
                    <div style={{ fontSize: '9px', color: isPositiveTrend ? '#10B981' : '#FF4757', fontWeight: 600, lineHeight: 1.2, marginTop: '2px', whiteSpace: 'nowrap' }}>
                      vs M-1
                    </div>
                  </div>
                </div>

                {/* Subtext showing Mois Précédent Amount */}
                <div style={{ marginTop: '6px', fontSize: '9px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: '#64748B' }}>{summary.nom_mois_precedent} :</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#CBD5E1' }}>
                    <AnimatedNumber value={summary.total_achats_mois_precedent_tnd} formatter={formatTND} />
                  </span>
                </div>

              </div>

              {/* Right Column: 3D Glowing Emerald Purchase Graphic */}
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
                background: 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%)',
                overflow: 'hidden'
              }}>
                <img 
                  src="/glowing_purchase_3d.jpg" 
                  alt="Achats du Mois" 
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: 'drop-shadow(0 0 12px rgba(16, 185, 129, 0.6))',
                    transform: isCardHovered ? 'scale(1.08)' : 'scale(1)',
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }} 
                />
              </div>

            </div>

            {/* Floating Popover Widget Opening to the Left */}
            {isCardHovered && mounted && createPortal(
              <div 
                onMouseEnter={handleMouseEnterCard}
                onMouseLeave={handleMouseLeaveCard}
                style={{
                  position: 'fixed',
                  left: `${Math.max(10, cardCoords.left - 290)}px`,
                  top: `${Math.max(10, cardCoords.top)}px`,
                  width: '275px',
                  background: 'linear-gradient(145deg, rgba(11, 15, 25, 0.98) 0%, rgba(10, 26, 22, 0.98) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  boxShadow: '-10px 14px 36px rgba(0, 0, 0, 0.75), 0 0 24px rgba(16, 185, 129, 0.25)',
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
                  background: '#0A1A16',
                  borderRight: '1px solid rgba(16, 185, 129, 0.4)',
                  borderTop: '1px solid rgba(16, 185, 129, 0.4)',
                  transform: 'rotate(45deg)'
                }} />

                {/* Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '12px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid rgba(16, 185, 129, 0.2)'
                }}>
                  <Info size={12} style={{ color: '#10B981' }} />
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#F8FAFC', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    DÉTAILS DES ACHATS ({summary.nom_mois_actuel})
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  
                  {/* Box: Achats du Mois (Emerald Theme) */}
                  <div 
                    onClick={() => {
                      setIsExpanded(prev => !prev);
                      if (onInsertPrompt && facturesMoisActuel.length > 0) {
                        const refs = facturesMoisActuel.map((f: any) => f.reference || f.reference_fournisseur).filter(Boolean);
                        onInsertPrompt(`Factures d'achat du mois (${refs.length}): ${refs.join(', ')}`);
                      }
                    }}
                    style={{
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(10, 25, 20, 0.9) 100%)',
                      border: '1px solid rgba(16, 185, 129, 0.45)',
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
                        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, rgba(16, 185, 129, 0.1) 100%)',
                        border: '1px solid rgba(16, 185, 129, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <ShoppingCart size={18} style={{ color: '#10B981' }} />
                      </div>

                      {/* Middle Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '9px', fontWeight: 800, color: '#6EE7B7', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                          FACTURES D'ACHAT DU MOIS
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 900, color: '#10B981', fontFamily: 'monospace', lineHeight: 1.1 }}>
                          <AnimatedNumber value={summary.total_achats_mois_actuel_tnd} formatter={formatTND} />
                        </div>
                        <div style={{ fontSize: '9px', color: '#A7F3D0', marginTop: '2px' }}>
                          <AnimatedNumber value={summary.nb_factures_mois_actuel} /> facture(s) validée(s)
                        </div>
                      </div>

                      {/* Right Chevron Arrow */}
                      <ChevronRight 
                        size={16} 
                        style={{ 
                          color: '#10B981', 
                          flexShrink: 0,
                          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s'
                        }} 
                      />
                    </div>

                    {/* Expandable Real Invoices References List with 5 Pagination */}
                    {isExpanded && (
                      <div style={{
                        marginTop: '4px',
                        paddingTop: '8px',
                        borderTop: '1px dashed rgba(16, 185, 129, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}>
                        <div style={{ fontSize: '9px', fontWeight: 800, color: '#6EE7B7', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          Références des factures ({summary.nb_factures_mois_actuel || facturesMoisActuel.length}) :
                        </div>
                        {paginatedFactures.length > 0 ? (
                          paginatedFactures.map((f: any, i: number) => (
                            <div
                              key={i}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onInsertPrompt) {
                                  onInsertPrompt(`Détails facture d'achat Réf: ${f.reference || f.reference_fournisseur}`);
                                }
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '6px 8px',
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                borderRadius: '6px',
                                fontSize: '10px',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <span style={{ fontWeight: 800, color: '#6EE7B7', fontFamily: 'monospace' }}>
                                  {f.reference || f.reference_fournisseur}
                                </span>
                                <span style={{ fontSize: '8px', color: '#E2E8F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {f.fournisseur}
                                </span>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '6px' }}>
                                <div style={{ fontWeight: 800, color: '#10B981', fontFamily: 'monospace' }}>
                                  {formatTND(f.montant_tnd)}
                                </div>
                                <div style={{ fontSize: '8px', color: '#CBD5E1' }}>
                                  Date: {f.date_facture || 'N/A'}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div style={{ fontSize: '10px', color: '#A7F3D0', fontStyle: 'italic', padding: '4px' }}>
                            Aucune facture d'achat ce mois.
                          </div>
                        )}

                        {/* Pagination Bar */}
                        {totalPages > 1 && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: '4px',
                            paddingTop: '6px',
                            borderTop: '1px solid rgba(16, 185, 129, 0.2)',
                            fontSize: '9px'
                          }}>
                            <button
                              disabled={page === 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPage(p => Math.max(1, p - 1));
                              }}
                              style={{
                                background: page === 1 ? 'rgba(255,255,255,0.03)' : 'rgba(16, 185, 129, 0.2)',
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                color: page === 1 ? '#64748B' : '#6EE7B7',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                cursor: page === 1 ? 'not-allowed' : 'pointer',
                                fontSize: '9px',
                                fontWeight: 700
                              }}
                            >
                              {'\u2039 Préc.'}
                            </button>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#A7F3D0' }}>
                              Page {page} / {totalPages}
                            </span>
                            <button
                              disabled={page >= totalPages}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPage(p => Math.min(totalPages, p + 1));
                              }}
                              style={{
                                background: page >= totalPages ? 'rgba(255,255,255,0.03)' : 'rgba(16, 185, 129, 0.2)',
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                color: page >= totalPages ? '#64748B' : '#6EE7B7',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                                fontSize: '9px',
                                fontWeight: 700
                              }}
                            >
                              {'Suiv. \u203A'}
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

          {/* Top Suppliers Section */}
          {topSuppliers.length > 0 && (
            <div>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#CBD5E1', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Top Fournisseurs du Mois
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {topSuppliers.slice(0, 3).map((sup: any, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => onInsertPrompt && onInsertPrompt(`Détails achats fournisseur ${sup.supplier_name}`)}
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
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                  >
                    <span style={{ color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
                      <Building2 size={12} style={{ color: '#10B981', flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sup.supplier_name}</span>
                    </span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#F8FAFC', flexShrink: 0, marginLeft: '8px' }}>
                      <AnimatedNumber value={sup.total_tnd} formatter={formatTND} />
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
