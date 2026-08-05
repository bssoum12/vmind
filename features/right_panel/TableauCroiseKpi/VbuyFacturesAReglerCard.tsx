"use client";

import React, { useState, useEffect } from 'react';
import { getVbuyKpiFacturesARegler } from '@/shared/api/n8n-api';
import { AlertTriangle, Clock, RefreshCw, DollarSign, Building2, CheckCircle2, ChevronRight, Info } from 'lucide-react';
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

  const [horizon, setHorizon] = useState<'1d' | '1w' | '1m' | '3m' | '6m' | undefined>(undefined);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCardHovered, setIsCardHovered] = useState<boolean>(false);

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
  const byHorizon = payload?.by_horizon || [];
  const topSuppliers = payload?.top_suppliers_a_regler || [];

  const formatTND = (val: any) => {
    const num = typeof val === 'number' ? val : parseFloat(val) || 0;
    const truncated = Math.trunc(num * 1000) / 1000;
    return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(truncated) + ' TND';
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 27, 75, 0.6) 100%)',
      border: '1px solid rgba(255, 71, 87, 0.35)',
      borderRadius: '12px',
      padding: '16px',
      color: '#fff',
      boxShadow: '0 8px 32px rgba(255, 71, 87, 0.15)',
      backdropFilter: 'blur(12px)',
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
        width: '120px',
        height: '120px',
        background: 'radial-gradient(circle, rgba(255,71,87,0.2) 0%, rgba(0,0,0,0) 70%)',
        pointerEvents: 'none'
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: 'rgba(255, 71, 87, 0.15)',
            border: '1px solid rgba(255, 71, 87, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FF4757'
          }}>
            <DollarSign size={18} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#F8FAFC', letterSpacing: '0.3px' }}>
              VBUY — Factures Fournisseurs à Régler
            </div>
            <div style={{ fontSize: '10px', color: '#94A3B8', fontFamily: 'monospace' }}>
              Direct SQL • Exécution sans n8n
            </div>
          </div>
        </div>

        <button
          onClick={loadKpi}
          disabled={loading}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
            padding: '6px',
            color: '#94A3B8',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
          title="Rafraîchir KPI"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Horizon Filter Bar */}
      <div style={{
        display: 'flex',
        gap: '4px',
        background: 'rgba(15, 23, 42, 0.6)',
        padding: '3px',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        marginBottom: '14px'
      }}>
        {[
          { label: 'Tous', value: undefined },
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
                flex: 1,
                padding: '4px 2px',
                fontSize: '10px',
                fontWeight: isSelected ? 700 : 500,
                color: isSelected ? '#FFFFFF' : '#94A3B8',
                background: isSelected ? 'rgba(255, 71, 87, 0.3)' : 'transparent',
                border: isSelected ? '1px solid rgba(255, 71, 87, 0.5)' : '1px solid transparent',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '11px' }}>
          <RefreshCw size={18} className="animate-spin" style={{ margin: '0 auto 8px', color: '#FF4757' }} />
          Calcul du solde des factures fournisseurs...
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
            onMouseEnter={() => setIsCardHovered(true)}
            onMouseLeave={() => setIsCardHovered(false)}
            style={{
              background: isCardHovered
                ? 'linear-gradient(135deg, rgba(255, 71, 87, 0.08) 0%, rgba(245, 158, 11, 0.08) 100%)'
                : 'rgba(255, 255, 255, 0.03)',
              border: isCardHovered
                ? '1px solid rgba(255, 71, 87, 0.35)'
                : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '14px',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer',
              boxShadow: isCardHovered ? '0 4px 20px rgba(255, 71, 87, 0.12)' : 'none',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                Total à Régler
              </span>
              <span style={{
                fontSize: '9px',
                color: isCardHovered ? '#FF808B' : '#64748B',
                background: isCardHovered ? 'rgba(255, 71, 87, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                padding: '2px 8px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s'
              }}>
                <Info size={10} />
                {isCardHovered ? 'Détails actifs' : 'Survoler pour détails'}
              </span>
            </div>

            <div style={{ fontSize: '19px', fontWeight: 900, color: '#F8FAFC', fontFamily: 'monospace', letterSpacing: '-0.3px' }}>
              <AnimatedNumber value={summary.total_a_regler_tnd} formatter={formatTND} />
            </div>

            <div style={{ fontSize: '9px', color: '#64748B', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span><AnimatedNumber value={summary.count_total} /> facture(s) en attente</span>
              {summary.count_echue > 0 && (
                <span style={{ color: '#FF4757', fontWeight: 600 }}>• <AnimatedNumber value={summary.count_echue} /> en retard</span>
              )}
            </div>

            {/* Floating Popover Widget Opening to the Left */}
            {isCardHovered && (
              <div style={{
                position: 'absolute',
                right: 'calc(100% + 14px)',
                top: 0,
                width: '260px',
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(26, 26, 46, 0.98) 100%)',
                border: '1px solid rgba(255, 71, 87, 0.45)',
                borderRadius: '12px',
                padding: '14px',
                boxShadow: '-8px 12px 32px rgba(0, 0, 0, 0.6), 0 0 24px rgba(255, 71, 87, 0.2)',
                backdropFilter: 'blur(16px)',
                zIndex: 9999,
                animation: 'popoverSlideLeft 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                pointerEvents: 'none'
              }}>
                {/* Pointer Arrow pointing to the card on right */}
                <div style={{
                  position: 'absolute',
                  right: '-6px',
                  top: '20px',
                  width: '10px',
                  height: '10px',
                  background: '#1A1A2E',
                  borderRight: '1px solid rgba(255, 71, 87, 0.45)',
                  borderTop: '1px solid rgba(255, 71, 87, 0.45)',
                  transform: 'rotate(45deg)'
                }} />

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#F8FAFC',
                  marginBottom: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                  borderBottom: '1px dashed rgba(255, 255, 255, 0.12)',
                  paddingBottom: '8px'
                }}>
                  <Info size={13} style={{ color: '#FF4757' }} />
                  Détails du Solde
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Factures Échues */}
                  <div style={{
                    background: summary.count_echue > 0 ? 'rgba(255, 71, 87, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    border: summary.count_echue > 0 ? '1px solid rgba(255, 71, 87, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
                    borderRadius: '8px',
                    padding: '10px 12px'
                  }}>
                    <div style={{ fontSize: '10px', color: summary.count_echue > 0 ? '#FF808B' : '#6EE7B7', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                      {summary.count_echue > 0 ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                      Factures Échues
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 900, color: summary.count_echue > 0 ? '#FF4757' : '#10B981', fontFamily: 'monospace' }}>
                      <AnimatedNumber value={summary.total_echue_tnd} formatter={formatTND} />
                    </div>
                    <div style={{ fontSize: '9px', color: summary.count_echue > 0 ? '#FFA8B0' : '#A7F3D0', marginTop: '2px' }}>
                      <AnimatedNumber value={summary.count_echue} /> facture(s) en retard
                    </div>
                  </div>

                  {/* À Échéance Proche */}
                  {summary.total_echeance_proche_tnd > 0 && (
                    <div style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      borderRadius: '8px',
                      padding: '10px 12px'
                    }}>
                      <div style={{ fontSize: '10px', color: '#FCD34D', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                        <Clock size={12} style={{ color: '#F59E0B' }} />
                        À Échéance Proche
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 900, color: '#F59E0B', fontFamily: 'monospace' }}>
                        <AnimatedNumber value={summary.total_echeance_proche_tnd} formatter={formatTND} />
                      </div>
                      <div style={{ fontSize: '9px', color: '#FDE68A', marginTop: '2px' }}>
                        <AnimatedNumber value={summary.count_proche} /> facture(s) proche(s)
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Breakdown by Horizon */}
          {byHorizon.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#CBD5E1', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Échéancier de Paiement
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {byHorizon.map((h: any) => (
                  <div key={h.key} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    background: h.key === 'echues' ? 'rgba(255, 71, 87, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    borderRadius: '6px',
                    fontSize: '11px'
                  }}>
                    <span style={{ color: h.key === 'echues' ? '#FF808B' : '#E2E8F0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={12} style={{ color: h.key === 'echues' ? '#FF4757' : '#94A3B8' }} />
                      {h.label} (<AnimatedNumber value={h.count} />)
                    </span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: h.key === 'echues' ? '#FF4757' : '#F8FAFC' }}>
                      <AnimatedNumber value={h.amount} formatter={formatTND} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Suppliers */}
          {topSuppliers.length > 0 && (
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#CBD5E1', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Top Fournisseurs à Régler
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {topSuppliers.slice(0, 3).map((sup: any, idx: number) => (
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
                    <span style={{ color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Building2 size={12} style={{ color: '#FF4757' }} />
                      {sup.supplier_name}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'monospace', fontWeight: 700, color: '#F8FAFC' }}>
                      <AnimatedNumber value={sup.total_tnd} formatter={formatTND} />
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
