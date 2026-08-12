"use client";

import React, { useState, useEffect } from 'react';
import { useKpis } from '@/shared/contexts/KpiCacheContext';
import { RefreshCw, Building2, ChevronRight, ChevronDown, Info, ShoppingBag } from 'lucide-react';
import { AnimatedNumber } from './AnimatedNumber';

interface VbuyCommandesEnAttenteCardProps {
  activeAgentId?: string;
  clientId?: string;
  onInsertPrompt?: (prompt: string) => void;
}

export const VbuyCommandesEnAttenteCard: React.FC<VbuyCommandesEnAttenteCardProps> = ({
  activeAgentId,
  clientId = "DEMO",
  onInsertPrompt
}) => {
  const isVisible = !activeAgentId || activeAgentId.toUpperCase() === 'VBUY' || activeAgentId.toUpperCase() === 'VMIND';

  const { kpisByAgent, loadingByAgent, fetchKpis, error: globalError } = useKpis();
  const agentData = kpisByAgent["vbuy"] || kpisByAgent["VBUY"] || {};
  const n8nToolData = agentData.get_vbuy_kpi_commandes_en_attente;

  const [expandedDetails, setExpandedDetails] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);

  if (!isVisible) return null;

  const effectiveLoading = (loadingByAgent["vbuy"] || loadingByAgent["VBUY"]) && !n8nToolData;
  const error = !effectiveLoading && !n8nToolData && globalError ? globalError : "";
  const payload = n8nToolData?.data || n8nToolData || {};
  const summary = payload?.summary || {
    nb_commandes_en_attente: 0,
    nb_fournisseurs_concernes: 0,
    total_montant_en_attente_tnd: 0
  };

  const topSuppliers = payload?.top_suppliers_en_attente || [];
  const commandesEnAttente = payload?.commandes_en_attente || [];
  const pageSize = 4;
  const totalPages = Math.max(1, Math.ceil(commandesEnAttente.length / pageSize));
  const paginatedCommandes = commandesEnAttente.slice((page - 1) * pageSize, page * pageSize);

  const formatNumberOnly = (val: any) => {
    const num = typeof val === 'number' ? val : parseFloat(val) || 0;
    const truncated = Math.trunc(num * 1000) / 1000;
    return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(truncated);
  };

  return (
    <div style={{
      background: 'linear-gradient(145deg, rgba(13, 17, 26, 0.96) 0%, rgba(10, 20, 32, 0.96) 100%)',
      border: '1px solid rgba(59, 130, 246, 0.35)',
      borderRadius: '16px',
      padding: '16px 18px',
      color: '#fff',
      boxShadow: '0 10px 35px rgba(0, 0, 0, 0.55), inset 0 0 20px rgba(59, 130, 246, 0.05)',
      backdropFilter: 'blur(16px)',
      position: 'relative',
      overflow: 'visible',
      marginBottom: '16px'
    }}>
      {/* Glow Effect */}
      <div style={{
        position: 'absolute',
        top: '-40px',
        right: '-40px',
        width: '120px',
        height: '120px',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)',
        pointerEvents: 'none',
        borderRadius: '50%'
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShoppingBag size={15} style={{ color: '#3B82F6' }} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#F8FAFC', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
              COMMANDES EN ATTENTE
            </div>
            <div style={{ fontSize: '9px', color: '#94A3B8', fontWeight: 500 }}>
              Commandes non encore reçues ({summary.mois || 'Août 2023'})
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            fontSize: '9px',
            fontWeight: 800,
            color: '#3B82F6',
            background: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            padding: '2px 7px',
            borderRadius: '10px'
          }}>
            VBUY
          </span>
          <button
            onClick={() => fetchKpis('vbuy', true, 'get_vbuy_kpi_commandes_en_attente')}
            disabled={effectiveLoading}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Rafraîchir les données via n8n"
          >
            <RefreshCw size={13} style={{ animation: effectiveLoading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {effectiveLoading ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: '#94A3B8', fontSize: '11px' }}>
          Chargement des commandes en attente...
        </div>
      ) : error ? (
        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', color: '#FCA5A5', fontSize: '11px' }}>
          {error}
        </div>
      ) : (
        <>
          {/* Hero Card metric */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(10, 18, 30, 0.8) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '12px',
            padding: '14px',
            marginBottom: '14px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '10px', color: '#CBD5E1', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
                  Commandes non reçues
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#3B82F6', fontFamily: 'monospace', lineHeight: 1.1 }}>
                  <AnimatedNumber value={summary.nb_commandes_en_attente} />
                  <span style={{ fontSize: '12px', color: '#93C5FD', marginLeft: '6px', fontWeight: 700 }}>commande(s)</span>
                </div>
              </div>

              {commandesEnAttente.length > 0 && (
                <button
                  onClick={() => setExpandedDetails(!expandedDetails)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#93C5FD',
                    background: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.35)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <Info size={12} />
                  <span>{expandedDetails ? 'Masquer' : 'Commandes'}</span>
                  {expandedDetails ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
              )}
            </div>

            {/* Sub-metrics Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px',
              marginTop: '12px',
              paddingTop: '10px',
              borderTop: '1px dashed rgba(59, 130, 246, 0.25)'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '9px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  Fournisseurs
                </span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#3B82F6', fontFamily: 'monospace', marginTop: '2px' }}>
                  <AnimatedNumber value={summary.nb_fournisseurs_concernes} />
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '9px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  Total (TND)
                </span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#F8FAFC', fontFamily: 'monospace', marginTop: '2px' }}>
                  <AnimatedNumber value={summary.total_montant_en_attente_tnd} formatter={formatNumberOnly} />
                </span>
              </div>
            </div>
          </div>

          {/* Inline Side Widget / Expandable Section */}
          {expandedDetails && (
            <div style={{
              marginBottom: '14px',
              padding: '12px',
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#93C5FD', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Détails des commandes en attente ({commandesEnAttente.length})
                </span>
                <span style={{ fontSize: '9px', color: '#94A3B8' }}>Page {page}/{totalPages}</span>
              </div>

              {paginatedCommandes.map((c: any, i: number) => (
                <div
                  key={i}
                  onClick={() => onInsertPrompt && onInsertPrompt(`Détails commande d'achat ${c.reference}`)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    padding: '8px 10px',
                    background: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '8px',
                    fontSize: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, color: '#93C5FD', fontFamily: 'monospace' }}>{c.reference}</span>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: '#3B82F6', background: 'rgba(59, 130, 246, 0.15)', padding: '1px 6px', borderRadius: '4px' }}>
                      {c.statut_commande || 'En cours'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#CBD5E1' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '8px' }}>
                      {c.fournisseur}
                    </span>
                    <span style={{ fontWeight: 800, color: '#F8FAFC', fontFamily: 'monospace', flexShrink: 0 }}>
                      {formatNumberOnly(c.total_tnd)}
                    </span>
                  </div>

                  {c.date_limite_prevue && (
                    <div style={{ fontSize: '8px', color: '#94A3B8' }}>
                      Date limite promise: {c.date_limite_prevue}
                    </div>
                  )}
                </div>
              ))}

              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{
                      background: page === 1 ? 'rgba(255,255,255,0.03)' : 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      color: page === 1 ? '#64748B' : '#93C5FD',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      cursor: page === 1 ? 'not-allowed' : 'pointer',
                      fontSize: '9px',
                      fontWeight: 700
                    }}
                  >
                    ‹ Préc.
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    style={{
                      background: page >= totalPages ? 'rgba(255,255,255,0.03)' : 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      color: page >= totalPages ? '#64748B' : '#93C5FD',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      cursor: page >= totalPages ? 'not-allowed' : 'pointer',
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

          {/* Top 5 Suppliers with Pending Orders */}
          {topSuppliers.length > 0 && (
            <div>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#CBD5E1', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Top Fournisseurs en Attente (TND)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {topSuppliers.slice(0, 5).map((sup: any, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => onInsertPrompt && onInsertPrompt(`Détails commandes en attente fournisseur ${sup.supplier_name}`)}
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
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                  >
                    <span style={{ color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1, marginRight: '8px', overflow: 'hidden' }}>
                      <Building2 size={12} style={{ color: '#3B82F6', flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sup.supplier_name}</span>
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        color: '#3B82F6',
                        background: 'rgba(59, 130, 246, 0.12)',
                        padding: '1px 5px',
                        borderRadius: '4px'
                      }}>
                        {sup.count_commandes} cmd.
                      </span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#F8FAFC' }}>
                        <AnimatedNumber value={sup.total_tnd} formatter={formatNumberOnly} />
                      </span>
                    </div>
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
