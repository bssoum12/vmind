"use client";

import React, { useEffect, useState, useRef } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Info, Truck } from 'lucide-react';
import { DeliveryRateTooltip } from './TableauCroiseKpi/DeliveryRateTooltip';
import { useKpis } from '../../shared/contexts/KpiCacheContext';
import { AnimatedNumber } from './TableauCroiseKpi/AnimatedNumber';

interface DeliveryKpiData {
  value: number;
  display: string;
  status: 'success' | 'warning' | 'danger' | string;
}

interface DeliveryRateKpiProps {
  activeAgentId?: string;
}

export const DeliveryRateKpi: React.FC<DeliveryRateKpiProps> = ({ activeAgentId }) => {
  const { kpisByAgent, loadingByAgent, fetchKpis, startDate, endDate, error: globalError } = useKpis();

  const [prevTaux, setPrevTaux] = useState<number | null>(null);
  const [prevYear, setPrevYear] = useState<number>(new Date().getFullYear() - 1);

  const [cardHovered, setCardHovered] = useState(false);
  const [animatedPercent, setAnimatedPercent] = useState(0);

  // Tooltip position state
  const [coords, setCoords] = useState<{ top: number; left: number; height?: number }>({ top: 0, left: 0 });
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const hideTimeout = useRef<NodeJS.Timeout | null>(null);

  // Read current active data from Context
  const agentData = kpisByAgent["vdata"] || kpisByAgent["VDATA"] || {};
  const toolData = agentData.get_delivery_rate || agentData.data || agentData || {};

  const kpis = toolData.ok && toolData.kpis ? toolData.kpis : (toolData.data?.kpis || []);
  const details = toolData.details || toolData.data?.details || null;
  const tableRows = toolData.table?.rows || toolData.data?.table?.rows || [];

  const kpi: DeliveryKpiData | null = kpis.length > 0 ? {
    value: kpis[0].value,
    display: kpis[0].display,
    status: kpis[0].status
  } : null;

  const totalMouvements = details?.total_mouvements_realises || 0;
  const mouvementsATemps = details?.mouvements_a_temps || 0;
  const mouvementsEnRetard = details?.mouvements_en_retard || 0;
  const lateDeliveries = tableRows;

  const effectiveLoading = (loadingByAgent["vdata"] || loadingByAgent["VDATA"]) && !toolData.ok;
  const error = !effectiveLoading && !toolData.ok && globalError ? globalError : "";
  const noData = !effectiveLoading && toolData.ok && kpis.length === 0;

  function getAuthToken() {
    if (typeof window === 'undefined') return '';
    const mcpToken = localStorage.getItem('vmind_mcp_token');
    if (mcpToken) return mcpToken;
    try {
      const sessionStr = localStorage.getItem('vmind_session');
      if (!sessionStr) return '';
      if (sessionStr.startsWith('eyJ')) return sessionStr;
      const parsed = JSON.parse(sessionStr);
      return parsed?.token || parsed?.access_token || parsed?.user?.token || '';
    } catch(e) { return ''; }
  }

  const fetchPrevYearRate = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';
      const clientId = process.env.NEXT_PUBLIC_CLIENT_ID || 'DEMO';
      const pYear = parseInt(startDate.substring(0, 4)) - 1;
      setPrevYear(pYear);
      const prevStart = `${pYear}${startDate.substring(4)}`;
      const prevEnd = `${pYear}${endDate.substring(4)}`;

      const prevResponse = await fetch(`${baseUrl}/api/tools/get-delivery-rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ 
          client_id: clientId,
          startDate: prevStart,
          endDate: prevEnd
        }),
      });

      if (prevResponse.ok) {
        const prevJson = await prevResponse.json();
        if (prevJson.ok && prevJson.data && prevJson.data.kpis && prevJson.data.kpis.length > 0) {
          setPrevTaux(prevJson.data.kpis[0].value);
        } else {
          setPrevTaux(null);
        }
      } else {
        setPrevTaux(null);
      }
    } catch (err: any) {
      console.warn("Failed to fetch prev year delivery rate:", err);
      setPrevTaux(null);
    }
  };

  useEffect(() => {
    if (activeAgentId === 'VDATA' && startDate && endDate) {
      const timer = setTimeout(() => {
        fetchPrevYearRate();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [activeAgentId, startDate, endDate]);

  useEffect(() => {
    if (kpi) {
      const duration = 1000;
      const startTime = performance.now();
      const targetPercent = Math.min(kpi.value, 100);

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = progress * (2 - progress);

        setAnimatedPercent(targetPercent * easeProgress);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    } else {
      setAnimatedPercent(0);
    }
  }, [kpi]);

  const updateCoords = () => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left,
        height: rect.height,
      });
    }
  };

  const handleMouseEnter = () => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = null;
    }
    updateCoords();
    setCardHovered(true);
    setTooltipVisible(true);
  };

  const handleMouseLeave = () => {
    setCardHovered(false);
    hideTimeout.current = setTimeout(() => {
      setTooltipVisible(false);
    }, 250);
  };

  const handleTooltipMouseEnter = () => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = null;
    }
    setTooltipVisible(true);
  };

  const handleTooltipMouseLeave = () => {
    hideTimeout.current = setTimeout(() => {
      setTooltipVisible(false);
    }, 250);
  };

  useEffect(() => {
    if (!tooltipVisible) return;
    const handleUpdate = () => {
      updateCoords();
    };
    const panel = document.querySelector(".right-panel");
    if (panel) {
      panel.addEventListener("scroll", handleUpdate, { passive: true });
    }
    window.addEventListener("scroll", handleUpdate, { passive: true });
    window.addEventListener("resize", handleUpdate, { passive: true });
    return () => {
      if (panel) {
        panel.removeEventListener("scroll", handleUpdate);
      }
      window.removeEventListener("scroll", handleUpdate);
      window.removeEventListener("resize", handleUpdate);
    };
  }, [tooltipVisible]);

  if (activeAgentId !== 'VDATA') return null;

  // Color based on status
  const statusColor =
    kpi?.status === 'success'
      ? '#00e5c8'
      : kpi?.status === 'warning'
      ? '#ffb800'
      : kpi?.status === 'danger'
      ? '#ff3b30'
      : '#00f0ff';

  // Progress arc (for the SVG gauge)
  const radius = 26;
  const circumference = 2 * Math.PI * radius; // ~163.36
  const strokeDashoffset = circumference - (animatedPercent / 100) * circumference;

  const isPositiveVsPrev = prevTaux !== null && kpi ? kpi.value >= prevTaux : true;
  const diffVsPrev = prevTaux !== null && kpi ? Math.abs(kpi.value - prevTaux) : null;

  return (
    <div
      ref={cardRef}
      style={{
        background: 'linear-gradient(145deg, rgba(13, 17, 26, 0.96) 0%, rgba(10, 26, 24, 0.96) 100%)',
        border: `1px solid ${statusColor}45`,
        borderRadius: '16px',
        padding: '16px 18px',
        color: '#fff',
        boxShadow: `0 10px 35px rgba(0, 0, 0, 0.55), inset 0 0 20px ${statusColor}10`,
        backdropFilter: 'blur(16px)',
        position: 'relative',
        overflow: 'visible',
        marginBottom: '16px'
      }}
    >
      {/* Detail Tooltip */}
      <DeliveryRateTooltip
        visible={tooltipVisible}
        coords={coords}
        totalMouvements={totalMouvements}
        mouvementsATemps={mouvementsATemps}
        mouvementsEnRetard={mouvementsEnRetard}
        lateDeliveries={lateDeliveries}
        statusColor={statusColor}
        prevTaux={prevTaux}
        prevYear={prevYear}
        onMouseEnter={handleTooltipMouseEnter}
        onMouseLeave={handleTooltipMouseLeave}
      />

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
            LIVRAISON À TEMPS
          </span>
          <span style={{
            fontSize: '9px',
            fontWeight: 800,
            color: '#00E5C8',
            background: 'rgba(0, 229, 200, 0.15)',
            border: '1px solid rgba(0, 229, 200, 0.35)',
            padding: '1px 6px',
            borderRadius: '4px',
            letterSpacing: '0.5px'
          }}>
            VDATA
          </span>
        </div>

        <button
          onClick={() => fetchKpis('vdata', true, 'get_delivery_rate')}
          title="Rafraîchir KPI via n8n"
          disabled={effectiveLoading}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748B',
            cursor: effectiveLoading ? 'not-allowed' : 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#00E5C8'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#64748B'}
        >
          <RefreshCw size={12} className={effectiveLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {effectiveLoading ? (
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
          <span>Chargement du taux de livraison...</span>
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
      ) : noData ? (
        <div style={{ fontSize: '10px', color: '#64748B', fontStyle: 'italic', padding: '12px', textAlign: 'center' }}>
          Aucune donnée pour cette période
        </div>
      ) : kpi ? (
        <div
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            background: cardHovered
              ? `linear-gradient(135deg, ${statusColor}18 0%, rgba(6, 182, 212, 0.08) 100%)`
              : 'rgba(255, 255, 255, 0.02)',
            border: cardHovered
              ? `1px solid ${statusColor}60`
              : '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '14px',
            padding: '14px 16px',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer',
            boxShadow: cardHovered ? `0 6px 24px ${statusColor}25` : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* SVG Circular Gauge */}
            <div style={{ position: 'relative', width: '68px', height: '68px', flexShrink: 0 }}>
              <svg width="68" height="68" viewBox="0 0 68 68">
                <defs>
                  <linearGradient id="vdataDeliveryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor={statusColor} />
                  </linearGradient>
                  <filter id="vdata-delivery-glow">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {/* Background track */}
                <circle
                  cx="34"
                  cy="34"
                  r={radius}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeWidth="4.5"
                />
                {/* Ticks ring */}
                <circle
                  cx="34"
                  cy="34"
                  r="21"
                  fill="none"
                  stroke={`${statusColor}25`}
                  strokeWidth="2.5"
                  strokeDasharray="1.5 3.5"
                />
                {/* Progress arc */}
                <circle
                  cx="34"
                  cy="34"
                  r={radius}
                  fill="none"
                  stroke="url(#vdataDeliveryGrad)"
                  strokeWidth="4.5"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  transform="rotate(-90 34 34)"
                  filter="url(#vdata-delivery-glow)"
                />
              </svg>
              {/* Value label in center */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    color: '#ffffff',
                    textShadow: `0 0 8px ${statusColor}a0`,
                    lineHeight: 1,
                  }}
                >
                  {animatedPercent.toFixed(1)}
                  <span style={{ fontSize: '9px', fontWeight: 700, color: statusColor }}>%</span>
                </span>
              </div>
            </div>

            {/* Right side text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                  CONFORMITÉ DÉLAIS
                </span>
                <span style={{
                  fontSize: '9px',
                  color: cardHovered ? '#6EE7B7' : '#64748B',
                  background: cardHovered ? 'rgba(0, 229, 200, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                  border: cardHovered ? '1px solid rgba(0, 229, 200, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s',
                  flexShrink: 0
                }}>
                  <Info size={10} style={{ color: cardHovered ? '#00E5C8' : '#94A3B8' }} />
                  {cardHovered ? 'Détails' : 'Détails'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Cyber status badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: `${statusColor}18`,
                    border: `1px solid ${statusColor}40`,
                    borderRadius: '4px',
                    padding: '2px 6px',
                  }}
                >
                  <div
                    style={{
                      width: '4px',
                      height: '4px',
                      borderRadius: '50%',
                      background: statusColor,
                      boxShadow: `0 0 5px ${statusColor}`,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: '8px',
                      fontFamily: 'var(--font-mono)',
                      color: statusColor,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontWeight: 800,
                    }}
                  >
                    {kpi.status === 'success'
                      ? 'Objectif atteint'
                      : kpi.status === 'warning'
                      ? 'À surveiller'
                      : 'En alerte'}
                  </span>
                </div>

                {/* Ratio count */}
                <span
                  style={{
                    fontSize: '9px',
                    fontFamily: 'monospace',
                    color: '#E2E8F0',
                    fontWeight: 700
                  }}
                >
                  {mouvementsATemps}/{totalMouvements} dossiers
                </span>
              </div>

              {prevTaux !== null && (
                <div
                  style={{
                    fontSize: '9px',
                    fontFamily: 'var(--font-mono)',
                    color: isPositiveVsPrev ? '#10B981' : '#FF4757',
                    fontWeight: 700,
                    marginTop: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  {isPositiveVsPrev ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span>{isPositiveVsPrev ? '+' : '-'}{diffVsPrev?.toFixed(1)}% vs {prevYear}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
