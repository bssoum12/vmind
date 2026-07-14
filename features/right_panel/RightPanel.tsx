"use client";


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
import React from 'react';
import { MiniKpi } from '../../components/ui/MiniKpi';
import { AGENTS } from '../../shared/constants/data';
import { LogEntry } from '../../shared/types';
import { VolumeLineChart } from './VolumeLineChart';
import { DeliveryRateKpi } from './DeliveryRateKpi';
import {MultiIndicatorsCard} from './TableauCroiseKpi/MultiIndicatorsCard' ;
import {ScoreGlobalCard} from './TableauCroiseKpi/ScoreGlobalCard' ;
import {LatestReportCard} from './TableauCroiseKpi/LatestReportCard';
import {AlertsCard} from './TableauCroiseKpi/AlertsCard';
import { VfinMonthlyRevenueCard } from './TableauCroiseKpi/VfinMonthlyRevenueCard';
import { VfinOverdueCard } from './TableauCroiseKpi/VfinOverdueCard';
import { VfinSixMonthChartCard } from './TableauCroiseKpi/VfinSixMonthChartCard';
import { VfinMarginCard } from './TableauCroiseKpi/VfinMarginCard';
import { VfinTopClientsCard } from './TableauCroiseKpi/VfinTopClientsCard';
import { VfinTresorerieCard } from './TableauCroiseKpi/VfinTresorerieCard';
interface RightPanelProps {
  logs: LogEntry[];
  onInsertPrompt: (text: string) => void;
  activeAgentId?: string;
}

import { KpiCacheProvider, useKpis } from '../../shared/contexts/KpiCacheContext';

const RightPanelContent: React.FC<RightPanelProps> = ({ logs, onInsertPrompt, activeAgentId }) => {
  const { startDate, endDate, updateGlobalDates, error, clearError, fetchKpis } = useKpis();
  const [performances, setPerformances] = React.useState<Record<string, number>>({
    VDATA: 0,
    VFIN: 0,
    VSELL: 0,
    VSTOCK: 0,
    VBUY: 0,
    VMOVE: 0,
  });

  const [animatedPct, setAnimatedPct] = React.useState<Record<string, number>>({
    VDATA: 0,
    VFIN: 0,
    VSELL: 0,
    VSTOCK: 0,
    VBUY: 0,
    VMOVE: 0,
  });

  const fetchDomainPerformance = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const clientId = process.env.NEXT_PUBLIC_CLIENT_ID || 'DEMO';

      const response = await fetch(`${baseUrl}/api/tools/get-score-global-vdata-kpi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`, },
        body: JSON.stringify({ 
          client_id: clientId,
          startDate,
          endDate
        }),
      });

      if (response.ok) {
        const resJson = await response.json();
        if (resJson.ok && resJson.data) {
          const kpis = resJson.data.kpis;
          const scoreGlobal = kpis?.find((k: any) => k.label === 'Score qualité global')?.value ?? 0;
          const scoreLivraison = kpis?.find((k: any) => k.label === 'Taux livraison')?.value ?? 0;
          const scoreFinance = kpis?.find((k: any) => k.label === 'Score impayés')?.value ?? 0;

          setPerformances(prev => ({
            ...prev,
            VDATA: scoreGlobal,
            VMOVE: scoreLivraison,
            VFIN: scoreFinance,
          }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch domain performances:", err);
    }
  };

  React.useEffect(() => {
    if (activeAgentId === 'VDATA') {
      fetchDomainPerformance();
    }
  }, [activeAgentId, startDate, endDate]);

  React.useEffect(() => {
    const duration = 1200;
    const startTime = performance.now();
    const startValues = { ...animatedPct };

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = progress * (2 - progress); // Ease out quad

      setAnimatedPct({
        VDATA: startValues.VDATA + (performances.VDATA - startValues.VDATA) * easeProgress,
        VFIN: startValues.VFIN + (performances.VFIN - startValues.VFIN) * easeProgress,
        VSELL: startValues.VSELL + (performances.VSELL - startValues.VSELL) * easeProgress,
        VSTOCK: startValues.VSTOCK + (performances.VSTOCK - startValues.VSTOCK) * easeProgress,
        VBUY: startValues.VBUY + (performances.VBUY - startValues.VBUY) * easeProgress,
        VMOVE: startValues.VMOVE + (performances.VMOVE - startValues.VMOVE) * easeProgress,
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [performances]);

  // Convert YYYYMMDD string to YYYY-MM-DD input date value format
  const toInputValue = (dateStr: string) => {
    if (dateStr.length !== 8) return '';
    return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
  };

  return (
    <div className="right-panel">
      {/* KPIs Live */}
      <div className="rp-section">
        <div className="rp-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            {activeAgentId === 'VDATA' 
              ? 'DONNEES & ANALYTICS - Temps Réel' 
              : activeAgentId === 'VFIN' 
                ? 'FINANCE & COMPTABILITE - Temps Réel' 
                : 'KPIs Temps Réel'}
          </span>
        </div>

        {/* Global Date Picker for VDATA only */}
        {activeAgentId === 'VDATA' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <label style={{ fontSize: '9px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '4px' }}>Début</label>
              <input 
                type="date" 
                value={toInputValue(startDate)}
                onChange={(e) => {
                  const val = e.target.value.replace(/-/g, '');
                  if (val.length === 8) updateGlobalDates(val, endDate);
                }}
                style={{
                  background: 'var(--navy3)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  color: 'var(--white)',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  padding: '4px 8px',
                  outline: 'none'
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <label style={{ fontSize: '9px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '4px' }}>Fin</label>
              <input 
                type="date" 
                value={toInputValue(endDate)}
                onChange={(e) => {
                  const val = e.target.value.replace(/-/g, '');
                  if (val.length === 8) updateGlobalDates(startDate, val);
                }}
                style={{
                  background: 'var(--navy3)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  color: 'var(--white)',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  padding: '4px 8px',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div style={{ 
            background: 'rgba(255, 71, 87, 0.12)', 
            border: '1px solid rgba(255, 71, 87, 0.3)', 
            color: 'var(--red)', 
            fontSize: '10px', 
            padding: '6px 12px', 
            borderRadius: '4px', 
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{error}</span>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button 
                onClick={() => {
                  const lowerAgent = (activeAgentId || 'VDATA').toLowerCase();
                  fetchKpis(lowerAgent, true);
                }} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--red)', 
                  cursor: 'pointer', 
                  fontWeight: 'bold', 
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
                  transform: 'translateY(-0.5px)'
                }}
                title="Réessayer"
              >
                ↻
              </button>
              <button onClick={clearError} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', padding: 0 }}>✕</button>
            </div>
          </div>
        )}
        {activeAgentId !== 'VDATA' && activeAgentId !== 'VFIN' && (
          <>
            <MiniKpi label="Trésorerie" dotColor="var(--green)" val="842K TND" delta="▲ +3.2%" deltaType="up" />
            <MiniKpi label="Impayés" dotColor="var(--red)" val="218K TND" delta="▲ +8 clients" deltaType="warning" />
            <MiniKpi label="Dossiers Ouverts" dotColor="var(--amber)" val="43" delta="⚠ 7 en retard" deltaType="warning" />
            <MiniKpi label="CA Mois" dotColor="var(--cyan)" val="1.847M" delta="▲ +12.3%" deltaType="up" />
            <MiniKpi label="BL Non Facturés" dotColor="var(--purple)" val="14" delta="▼ à traiter" deltaType="down" />

            <div style={{ marginTop: '12px', fontSize: '9px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
              CA 6 DERNIERS MOIS (TND)
            </div>
            <div className="mini-chart">
              <div className="bar" style={{ height: '55%' }}></div>
              <div className="bar" style={{ height: '70%' }}></div>
              <div className="bar" style={{ height: '60%' }}></div>
              <div className="bar" style={{ height: '80%' }}></div>
              <div className="bar" style={{ height: '65%' }}></div>
              <div className="bar current" style={{ height: '100%' }}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: '3px' }}>
              <span>Nov</span><span>Déc</span><span>Jan</span><span>Fév</span><span>Mar</span><span>Avr ●</span>
            </div>
          </>
        )}
        <ScoreGlobalCard activeAgentId={activeAgentId} />
        <VfinMonthlyRevenueCard activeAgentId={activeAgentId} />
        <VfinOverdueCard activeAgentId={activeAgentId} />
        <VfinSixMonthChartCard activeAgentId={activeAgentId} />
        <VfinMarginCard activeAgentId={activeAgentId} />
        <VfinTopClientsCard activeAgentId={activeAgentId} />
        <VfinTresorerieCard activeAgentId={activeAgentId} />
        <VolumeLineChart activeAgentId={activeAgentId} />
        <DeliveryRateKpi activeAgentId={activeAgentId} /> 
        <MultiIndicatorsCard activeAgentId={activeAgentId} />
        <LatestReportCard activeAgentId={activeAgentId} />
        <AlertsCard activeAgentId={activeAgentId} />
      </div>

      {/* Performance par Domaine */}
      {activeAgentId === 'VDATA' && (
        <div className="rp-section">
          <div className="rp-title" style={{ marginBottom: '14px' }}>Performance par Domaine</div>
        
        <div
          style={{
            padding: '16px 14px',
            backgroundColor: 'rgba(6, 17, 31, 0.7)',
            backgroundImage: `
              radial-gradient(rgba(0, 240, 255, 0.04) 1px, transparent 0)
            `,
            backgroundSize: "12px 12px",
            backgroundPosition: "0 0",
            border: '1px solid rgba(0, 240, 255, 0.16)',
            borderRadius: '8px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 10px 35px rgba(0, 0, 0, 0.55), inset 0 0 16px rgba(0, 240, 255, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Glowing Corner Brackets */}
          <div style={{ position: "absolute", top: 0, left: 0, width: "8px", height: "8px", borderTop: "2px solid #00f0ff", borderLeft: "2px solid #00f0ff", borderRadius: "2px 0 0 0", boxShadow: "0 0 4px rgba(0, 240, 255, 0.3)" }} />
          <div style={{ position: "absolute", top: 0, right: 0, width: "8px", height: "8px", borderTop: "2px solid #00f0ff", borderRight: "2px solid #00f0ff", borderRadius: "0 2px 0 0", boxShadow: "0 0 4px rgba(0, 240, 255, 0.3)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, width: "8px", height: "8px", borderBottom: "2px solid #00f0ff", borderLeft: "2px solid #00f0ff", borderRadius: "0 0 0 2px", boxShadow: "0 0 4px rgba(0, 240, 255, 0.3)" }} />
          <div style={{ position: "absolute", bottom: 0, right: 0, width: "8px", height: "8px", borderBottom: "2px solid #00f0ff", borderRight: "2px solid #00f0ff", borderRadius: "0 0 2px 0", boxShadow: "0 0 4px rgba(0, 240, 255, 0.3)" }} />

          {Object.values(AGENTS).map((agent) => {
            let metricLabel = "Performance globale";
            let statusText = "Optimal";
            let statusColor = "#00e5c8";
            const score = animatedPct[agent.id] || 0;

            if (agent.id === 'VDATA') {
              metricLabel = "Score qualité global";
            } else if (agent.id === 'VFIN') {
              metricLabel = "Recouvrement factures clients";
            } else if (agent.id === 'VSELL') {
              metricLabel = "Conversion opportunités CRM";
            } else if (agent.id === 'VSTOCK') {
              metricLabel = "Taux de rotation & dispo stock";
            } else if (agent.id === 'VBUY') {
              metricLabel = "Délai & conformité fournisseurs";
            } else if (agent.id === 'VMOVE') {
              metricLabel = "Taux de livraison à temps";
            }

            if (score >= 85) {
              statusText = "Optimal";
              statusColor = "#00e5c8";
            } else if (score >= 70) {
              statusText = "Moyen";
              statusColor = "#ffb800";
            } else {
              statusText = "Alerte";
              statusColor = "#ff3b30";
            }

            if (agent.id === 'VMOVE' && score < 70) {
              statusText = "Critique";
            }

            return (
              <div
                key={agent.id}
                onClick={() => onInsertPrompt(`Analyse situation ${agent.name}`)}
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease-in-out',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.boxShadow = 'inset 0 0 8px rgba(0, 240, 255, 0.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {/* Left: icon/tag + description */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '3px',
                        background: agent.bgColor,
                        color: agent.color,
                        border: `1px solid ${agent.borderColor}`,
                        fontSize: '8px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 0 4px ${agent.color}20`,
                      }}
                    >
                      {agent.icon}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: 'var(--white)',
                          fontFamily: 'var(--font-body)',
                          lineHeight: 1.2,
                        }}
                      >
                        {agent.desc}
                      </span>
                      <span
                        style={{
                          fontSize: '7px',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--muted)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.2px',
                        }}
                      >
                        {metricLabel}
                      </span>
                    </div>
                  </div>

                  {/* Right: score + status badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color: '#ffffff',
                        textShadow: `0 0 4px ${agent.color}40`,
                      }}
                    >
                      {score.toFixed(2).replace('.', ',')}%
                    </span>
                    <span
                      style={{
                        fontSize: '7px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color: statusColor,
                        background: `${statusColor}14`,
                        border: `1px solid ${statusColor}33`,
                        borderRadius: '3px',
                        padding: '1px 4px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.2px',
                      }}
                    >
                      {statusText}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    height: '4px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.02)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${score}%`,
                      background: `linear-gradient(90deg, ${agent.color}, ${statusColor})`,
                      boxShadow: `0 0 6px ${statusColor}30`,
                      borderRadius: '2px',
                      transition: 'width 0.1s linear',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )}

      {/* Activity Log */}
      <div className="rp-section">
        <div className="rp-title">Journal d'Activité</div>
        <div id="activity-log">
          {logs.map((log) => (
            <div key={log.id} className="log-item">
              <div className="log-time">{log.time}</div>
              <div className="log-text"><span>{log.agent}</span> — {log.action}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const RightPanel: React.FC<RightPanelProps> = (props) => (
  <RightPanelContent {...props} />
);
