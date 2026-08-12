"use client";

import React, { useState, useEffect } from 'react';
import { getVbuyKpiRepartitionParCategorie } from '@/shared/api/n8n-api';
import { PieChart as PieIcon, RefreshCw } from 'lucide-react';
import { AnimatedNumber } from './AnimatedNumber';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface VbuyRepartitionCategoriePieCardProps {
  activeAgentId?: string;
  clientId?: string;
  onInsertPrompt?: (prompt: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Exploitation': '#3B82F6',  // Blue
  'Consommable': '#10B981',   // Emerald Green
  'Parc': '#F59E0B',          // Amber / Orange
  'Informatique': '#8B5CF6',    // Purple / Indigo
  'Non Spécifié': '#64748B'    // Slate Grey
};

const DEFAULT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#64748B'];

export const VbuyRepartitionCategoriePieCard: React.FC<VbuyRepartitionCategoriePieCardProps> = ({
  activeAgentId,
  clientId = "DEMO",
  onInsertPrompt
}) => {
  const isVisible = !activeAgentId || activeAgentId.toUpperCase() === 'VBUY' || activeAgentId.toUpperCase() === 'VMIND';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<any | null>(null);

  const loadKpi = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getVbuyKpiRepartitionParCategorie(clientId);
      setData(res);
    } catch (err: any) {
      console.error("[VBUY REPARTITION CATEGORIE CARD] Error:", err);
      setError(err?.message || "Erreur lors du chargement de la répartition par catégorie");
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

  const payload = data?.data || data || {};
  const summary = payload?.summary || {
    total_depenses_tnd: 0,
    total_factures: 0,
    nb_categories: 0,
    mois: "Avril 2026"
  };

  const categories = payload?.categories || [];
  const totalFacturesCount = summary.total_factures || categories.reduce((sum: number, c: any) => sum + (c.count_factures || 0), 0);

  const formatNumberOnly = (val: any) => {
    const num = typeof val === 'number' ? val : parseFloat(val) || 0;
    const truncated = Math.trunc(num * 1000) / 1000;
    return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(truncated);
  };

  const formatPercentage = (val: any) => {
    const num = typeof val === 'number' ? val : parseFloat(val) || 0;
    return `${(Math.round(num * 10) / 10).toFixed(1)}%`;
  };

  const chartData = categories.map((c: any) => ({
    name: c.category_name,
    value: c.total_tnd,
    percentage: c.percentage,
    count: c.count_factures
  }));

  return (
    <div style={{
      background: 'linear-gradient(145deg, rgba(13, 17, 26, 0.96) 0%, rgba(18, 12, 28, 0.96) 100%)',
      border: '1px solid rgba(139, 92, 246, 0.35)',
      borderRadius: '16px',
      padding: '16px 18px',
      color: '#fff',
      boxShadow: '0 10px 35px rgba(0, 0, 0, 0.55), inset 0 0 20px rgba(139, 92, 246, 0.05)',
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
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)',
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
            background: 'rgba(139, 92, 246, 0.15)',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <PieIcon size={15} style={{ color: '#8B5CF6' }} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#F8FAFC', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
              RÉPARTITION PAR CATÉGORIE
            </div>
            <div style={{ fontSize: '9px', color: '#94A3B8', fontWeight: 500 }}>
              Dépenses par type de dépense ({summary.mois || 'Avril 2026'})
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            fontSize: '9px',
            fontWeight: 800,
            color: '#8B5CF6',
            background: 'rgba(139, 92, 246, 0.12)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            padding: '2px 7px',
            borderRadius: '10px'
          }}>
            VBUY
          </span>
          <button
            onClick={loadKpi}
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Rafraîchir les données"
          >
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: '#94A3B8', fontSize: '11px' }}>
          Chargement de la répartition par catégorie...
        </div>
      ) : error ? (
        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', color: '#FCA5A5', fontSize: '11px' }}>
          {error}
        </div>
      ) : (
        <>
          {/* Donut Chart Container */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(15, 12, 25, 0.8) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.25)',
            borderRadius: '12px',
            padding: '12px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            {/* Pie Donut Chart */}
            <div style={{ width: '130px', height: '130px', position: 'relative', flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                    onMouseEnter={(_, index) => setHoveredCategory(chartData[index])}
                    onMouseLeave={() => setHoveredCategory(null)}
                  >
                    {chartData.map((entry: any, index: number) => {
                      const color = CATEGORY_COLORS[entry.name] || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
                      const isSelected = hoveredCategory?.name === entry.name;
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={color}
                          style={{
                            filter: isSelected ? 'brightness(1.25) drop-shadow(0 0 6px ' + color + ')' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        />
                      );
                    })}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Dynamic Clean Center Donut Label */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
                width: '74px',
                overflow: 'hidden'
              }}>
                {hoveredCategory ? (
                  <>
                    <div style={{
                      fontSize: '8px',
                      fontWeight: 800,
                      color: CATEGORY_COLORS[hoveredCategory.name] || '#C4B5FD',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {hoveredCategory.name}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: 900,
                      color: '#F8FAFC',
                      fontFamily: 'monospace',
                      marginTop: '1px'
                    }}>
                      {formatPercentage(hoveredCategory.percentage)}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '8px', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600 }}>
                      TOTAL
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: 900, color: '#C4B5FD', fontFamily: 'monospace', marginTop: '1px' }}>
                      {summary.total_depenses_tnd > 1000 ? `${(summary.total_depenses_tnd / 1000).toFixed(1)}k` : summary.total_depenses_tnd}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right Summary Panel */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#CBD5E1', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                {hoveredCategory ? hoveredCategory.name : 'Dépenses totales'}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: hoveredCategory ? (CATEGORY_COLORS[hoveredCategory.name] || '#C4B5FD') : '#C4B5FD', fontFamily: 'monospace', lineHeight: 1.1 }}>
                <AnimatedNumber value={hoveredCategory ? hoveredCategory.value : summary.total_depenses_tnd} formatter={formatNumberOnly} />
                <span style={{ fontSize: '10px', color: '#DDD6FE', marginLeft: '4px', fontWeight: 700 }}>TND</span>
              </div>
              <div style={{ fontSize: '9px', color: '#94A3B8' }}>
                {hoveredCategory
                  ? `${hoveredCategory.count} facture(s) (${formatPercentage(hoveredCategory.percentage)})`
                  : `${totalFacturesCount} facture(s) au total (${summary.nb_categories} catégories)`
                }
              </div>
            </div>
          </div>

          {/* Detailed Category Legend Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {categories.map((cat: any, idx: number) => {
              const color = CATEGORY_COLORS[cat.category_name] || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
              const isHovered = hoveredCategory?.name === cat.category_name;

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredCategory(chartData[idx])}
                  onMouseLeave={() => setHoveredCategory(null)}
                  onClick={() => onInsertPrompt && onInsertPrompt(`Détails dépenses catégorie d'achat ${cat.category_name}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    background: isHovered ? `${color}18` : 'rgba(255, 255, 255, 0.02)',
                    border: isHovered ? `1px solid ${color}60` : 'rgba(255, 255, 255, 0.04)',
                    borderRadius: '6px',
                    fontSize: '11px',
                    cursor: onInsertPrompt ? 'pointer' : 'default',
                    transition: 'all 0.15s'
                  }}
                >
                  <span style={{ color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1, marginRight: '8px', overflow: 'hidden' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{cat.category_name}</span>
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{
                      fontSize: '9px',
                      fontWeight: 800,
                      color: color,
                      background: `${color}20`,
                      border: `1px solid ${color}40`,
                      padding: '1px 5px',
                      borderRadius: '4px',
                      fontFamily: 'monospace'
                    }}>
                      {formatPercentage(cat.percentage)}
                    </span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#F8FAFC' }}>
                      <AnimatedNumber value={cat.total_tnd} formatter={formatNumberOnly} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
