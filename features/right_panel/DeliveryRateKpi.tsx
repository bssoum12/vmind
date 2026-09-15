"use client";

import React, { useEffect, useState, useRef } from 'react';
import { DeliveryRateTooltip } from './TableauCroiseKpi/DeliveryRateTooltip';
import { useKpis } from '../../shared/contexts/KpiCacheContext';
import { SkeletonLoader } from '../../components/vmind/SkeletonLoader';

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
  const toolData = agentData.get_delivery_rate || agentData || {};

  const kpis = toolData.ok && toolData.kpis ? toolData.kpis : [];
  const details = toolData.details || null;
  const tableRows = toolData.table?.rows || [];

  const kpi: DeliveryKpiData | null = kpis.length > 0 ? {
    value: kpis[0].value,
    display: kpis[0].display,
    status: kpis[0].status
  } : null;

  const totalMouvements = details?.total_mouvements_realises || 0;
  const mouvementsATemps = details?.mouvements_a_temps || 0;
  const mouvementsEnRetard = details?.mouvements_en_retard || 0;
  const lateDeliveries = tableRows;

  const loading = loadingByAgent["vdata"] && !toolData.ok;
  const error = !loading && !toolData.ok && globalError ? globalError : "";
  const noData = !loading && toolData.ok && kpis.length === 0;

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
        const easeProgress = progress * (2 - progress); // Ease out quad

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

  // Follow scroll and resize events when tooltip is visible
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

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        marginTop: '16px',
        overflow: 'visible',
        zIndex: 9,
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

      {/* Cyber Card Container */}
      <div
        style={{
          padding: '16px',
          backgroundColor: cardHovered ? 'rgba(6, 17, 31, 0.85)' : 'rgba(6, 17, 31, 0.7)',
          backgroundImage: `
            radial-gradient(${statusColor}08 1px, transparent 0),
            radial-gradient(${statusColor}03 1px, transparent 0)
          `,
          backgroundSize: "12px 12px",
          backgroundPosition: "0 0, 6px 6px",
          border: cardHovered ? `1px solid ${statusColor}60` : `1px solid ${statusColor}2b`,
          boxShadow: cardHovered 
            ? `0 10px 35px rgba(0, 0, 0, 0.55), inset 0 0 16px ${statusColor}15, 0 0 15px ${statusColor}20` 
            : `0 10px 35px rgba(0, 0, 0, 0.55), inset 0 0 16px ${statusColor}08`,
          transform: cardHovered ? "translateY(-1px) scale(1.005)" : "none",
          borderRadius: '8px',
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: 'pointer',
        }}
      >
        {/* Glowing Corner Brackets */}
        <div style={{ position: "absolute", top: 0, left: 0, width: "10px", height: "10px", borderTop: `2px solid ${statusColor}`, borderLeft: `2px solid ${statusColor}`, borderRadius: "2px 0 0 0", boxShadow: `0 0 5px ${statusColor}60` }} />
        <div style={{ position: "absolute", top: 0, right: 0, width: "10px", height: "10px", borderTop: `2px solid ${statusColor}`, borderRight: `2px solid ${statusColor}`, borderRadius: "0 2px 0 0", boxShadow: `0 0 5px ${statusColor}60` }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, width: "10px", height: "10px", borderBottom: `2px solid ${statusColor}`, borderLeft: `2px solid ${statusColor}`, borderRadius: "0 0 0 2px", boxShadow: `0 0 5px ${statusColor}60` }} />
        <div style={{ position: "absolute", bottom: 0, right: 0, width: "10px", height: "10px", borderBottom: `2px solid ${statusColor}`, borderRight: `2px solid ${statusColor}`, borderRadius: "0 0 2px 0", boxShadow: `0 0 5px ${statusColor}60` }} />

        {/* Section Title */}
        <div
          style={{
            fontSize: '9px',
            color: 'var(--muted)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}
        >
          Livraison à temps
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <SkeletonLoader height="68px" width="68px" style={{ borderRadius: '50%' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <SkeletonLoader height="16px" width="90%" />
              <SkeletonLoader height="12px" width="60%" />
            </div>
          </div>
        ) : error ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ color: "var(--red)", fontSize: "9px", fontFamily: "var(--font-mono)" }}>
              {error}
            </span>
            <button
              onClick={() => fetchKpis('vdata', true, 'get_delivery_rate')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--cyan)',
                fontFamily: 'var(--font-mono)',
                fontSize: '8px',
                textDecoration: 'underline',
                cursor: 'pointer',
                padding: 0,
                textAlign: 'left',
              }}
            >
              Réessayer
            </button>
          </div>
        ) : noData ? (
          <div style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--muted)', fontStyle: 'italic' }}>
            Aucune donnée pour cette période
          </div>
        ) : kpi ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* SVG Circular Gauge */}
            <div style={{ position: 'relative', width: '68px', height: '68px', flexShrink: 0 }}>
              <svg width="68" height="68" viewBox="0 0 68 68">
                <defs>
                  <linearGradient id="cardDeliveryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor={statusColor} />
                  </linearGradient>
                  <filter id="card-delivery-glow">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
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
                  stroke="rgba(255, 255, 255, 0.04)"
                  strokeWidth="4.5"
                />
                {/* Ticks ring */}
                <circle
                  cx="34"
                  cy="34"
                  r="21"
                  fill="none"
                  stroke={`${statusColor}1a`}
                  strokeWidth="2.5"
                  strokeDasharray="1.5 3.5"
                />
                {/* Progress arc */}
                <circle
                  cx="34"
                  cy="34"
                  r={radius}
                  fill="none"
                  stroke="url(#cardDeliveryGrad)"
                  strokeWidth="4.5"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  transform="rotate(-90 34 34)"
                  filter="url(#card-delivery-glow)"
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
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 800,
                    color: '#ffffff',
                    textShadow: `0 0 8px ${statusColor}a0`,
                    lineHeight: 1,
                  }}
                >
                  {animatedPercent.toFixed(2).replace('.', ',')}
                  <span style={{ fontSize: '9px', fontWeight: 600, color: statusColor }}>%</span>
                </span>
              </div>
            </div>

            {/* Right side text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '11px',
                  fontFamily: 'var(--font-body)',
                  color: 'var(--white)',
                  fontWeight: 500,
                  lineHeight: 1.35,
                  marginBottom: '6px',
                }}
              >
                Dossiers livrés dans les délais contractuels
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Cyber status badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: `${statusColor}14`,
                    border: `1px solid ${statusColor}33`,
                    borderRadius: '3px',
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
                      fontWeight: 700,
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
                    fontSize: '8px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--muted)',
                    letterSpacing: '0.5px',
                  }}
                >
                  {mouvementsATemps} / {totalMouvements} DOSSIERS
                </span>
              </div>
              {kpi && prevTaux !== null && (
                <div
                  style={{
                    fontSize: '9px',
                    fontFamily: 'var(--font-mono)',
                    color: 'rgba(255, 255, 255, 0.4)',
                    marginTop: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>vs {prevYear} :</span>
                  <span style={{ color: 'var(--white)', fontWeight: 600 }}>
                    {prevTaux.toFixed(2)}%
                  </span>
                  {(() => {
                    const diff = kpi.value - prevTaux;
                    const color = diff >= 0 ? 'var(--green)' : 'var(--red)';
                    const sign = diff >= 0 ? '▲ +' : '▼ ';
                    return (
                      <span style={{ color, fontWeight: 700, marginLeft: '2px' }}>
                        ({sign}{diff.toFixed(2)}%)
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
