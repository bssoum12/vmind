"use client";

import React from 'react';
import { jwtDecode } from 'jwt-decode';
import { MiniKpi } from '../../components/ui/MiniKpi';
import { AGENTS } from '../../shared/constants/data';
import { LogEntry } from '../../shared/types';
import { VolumeLineChart } from './VolumeLineChart';
import { DeliveryRateKpi } from './DeliveryRateKpi';
import { MultiIndicatorsCard } from './TableauCroiseKpi/MultiIndicatorsCard';
import { ScoreGlobalCard } from './TableauCroiseKpi/ScoreGlobalCard';
import { LatestReportCard } from './TableauCroiseKpi/LatestReportCard';
import { AlertsCard } from './TableauCroiseKpi/AlertsCard';
import { VfinMonthlyRevenueCard } from './TableauCroiseKpi/VfinMonthlyRevenueCard';
import { VfinOverdueCard } from './TableauCroiseKpi/VfinOverdueCard';
import { VfinSixMonthChartCard } from './TableauCroiseKpi/VfinSixMonthChartCard';
import { VfinMarginCard } from './TableauCroiseKpi/VfinMarginCard';
import { VfinTopClientsCard } from './TableauCroiseKpi/VfinTopClientsCard';
import { VsellTopClientsCard } from './TableauCroiseKpi/VsellTopClientsCard';
import { VsellNewClientsCard } from './TableauCroiseKpi/VsellNewClientsCard';
import { VsellInactiveClientsCard } from './TableauCroiseKpi/VsellInactiveClientsCard';
import { VsellRevenuClientBarChart } from './TableauCroiseKpi/VsellRevenuClientBarChart';
import { VsellFidelisationChartCard } from './TableauCroiseKpi/VsellFidelisationChartCard';
import { VsellPipelineFunnelCard } from './TableauCroiseKpi/VsellPipelineFunnelCard';
import { VfinTresorerieCard } from './TableauCroiseKpi/VfinTresorerieCard';
import { VbuyFacturesAReglerCard } from './TableauCroiseKpi/VbuyFacturesAReglerCard';
import { VbuyAchatsDuMoisCard } from './TableauCroiseKpi/VbuyAchatsDuMoisCard';
import { VbuyFournisseursEnRetardCard } from './TableauCroiseKpi/VbuyFournisseursEnRetardCard';
import { VbuyCommandesEnAttenteCard } from './TableauCroiseKpi/VbuyCommandesEnAttenteCard';
import { VbuyRepartitionCategoriePieCard } from './TableauCroiseKpi/VbuyRepartitionCategoriePieCard';
import { VmoveDossiersOuvertsCard } from './TableauCroiseKpi/VmoveDossiersOuvertsCard';
import { VmoveDossiersEnRetardCard } from './TableauCroiseKpi/VmoveDossiersEnRetardCard';
import { VmoveVolumeTransporteurCard } from './TableauCroiseKpi/VmoveVolumeTransporteurCard';
import { VmoveBlNonFacturesCard } from './TableauCroiseKpi/VmoveBlNonFacturesCard';
import { VmoveActiveFlowsMapCard } from './TableauCroiseKpi/VmoveActiveFlowsMapCard';
import { KpiCacheProvider, useKpis } from '../../shared/contexts/KpiCacheContext';
import { KpiEmptyState } from './KpiEmptyState';

/**
 * Visibilité des cartes KPI (02/11/2026).
 * false = carte MASQUÉE mais conservée (composant, import et code intacts) : les vues/outils MCP
 * actuels ne fournissent pas encore ses données. Repasser à true quand la vue vw_AI_* correspondante
 * existera et que le skill de l'agent contiendra la recette (voir rapport VDATA).
 */
export const KPI_CARD_VISIBILITY = {
  VDATA_SCORE_GLOBAL: false,          // mouvements planifiés (OMC) + score impayés
  VDATA_TAUX_LIVRAISON: false,        // OMC_Mouvement_planifies / OMC_Mouvement
  VDATA_ALERTES: false,               // Framework_Log + dossiers sans expédition
  VDATA_DERNIER_RAPPORT: false,       // rapport PDF mensuel (hors KPI)
  VDATA_PERFORMANCE_DOMAINES: false,  // dépend du score qualité global
  VDATA_VOLUME_DOSSIERS: true,        // skill vdata-kpis : get_dossier_volume_evolution
  VDATA_TABLEAU_CROISE: true,         // skill vdata-kpis : get_tableau_croise (dossiers actifs / clôturés)
  VMOVE_BL_NON_FACTURES: false,       // croisement dossiers × factures : non disponible dans les vues
  VMOVE_FLUX_ACTIFS: false,           // Framework_Pays / Framework_Ville : hors vues
  VMOVE_DOSSIERS_OUVERTS: true,       // skill vmove-kpis : dossiers_ouverts
  VMOVE_DOSSIERS_RETARD: true,        // skill vmove-kpis : dossiers_retard
  VMOVE_VOLUME_TRANSPORTEUR: true,    // skill vmove-kpis : volume_transporteur
  VFIN_CA_VALIDE: true,               // skill vfin-kpis : ca_valide
  VFIN_IMPAYES: true,                 // skill vfin-kpis : impayes
  VFIN_EVOLUTION_CA: true,            // skill vfin-kpis : evolution_ca
  VFIN_TAUX_MARGE: true,              // skill vfin-kpis : taux_marge
  VFIN_TOP_CLIENTS: true,             // skill vfin-kpis : top_clients
  VFIN_TRESORERIE: false,             // Treasury_vwRealTransaction : hors vues
  VSELL_TOP_CLIENTS: true,            // skill vsell-kpis : top_clients
  VSELL_NOUVEAUX_CLIENTS: true,       // skill vsell-kpis : nouveaux_clients
  VSELL_CLIENTS_INACTIFS: true,       // skill vsell-kpis : clients_inactifs
  VSELL_CA_PAR_CLIENT: true,          // skill vsell-kpis : ca_par_client
  VSELL_FIDELISATION: true,           // skill vsell-kpis : fidelisation
  VSELL_PIPELINE: false,              // TRADE_Opportunite / TRADE_stepOpportunite : hors vues
};

interface RightPanelProps {
  logs: LogEntry[];
  onInsertPrompt: (text: string) => void;
  activeAgentId?: string;
}

const RightPanelContent: React.FC<RightPanelProps> = ({ logs, onInsertPrompt, activeAgentId }) => {
  const { startDate, endDate, updateGlobalDates, error, clearError, notice, clearNotice, fetchKpis, kpisByAgent, loadingByAgent, lastUpdatedByAgent } = useKpis();
  const [isErpConnected, setIsErpConnected] = React.useState<boolean>(false);
  const [allowedAgents, setAllowedAgents] = React.useState<string[]>([]);
  const [isAdmin, setIsAdmin] = React.useState<boolean>(false);

  const agentKey = (activeAgentId || 'vdata').toLowerCase();
  const agentData = kpisByAgent[agentKey];
  const isLoading = Boolean(loadingByAgent[agentKey]);
  const isInProgress = Boolean(agentData?._inProgress);

  const lastUpdatedIso = lastUpdatedByAgent[agentKey] || agentData?._updatedAt;
  const formattedLastUpdate = React.useMemo(() => {
    if (!lastUpdatedIso) return null;
    try {
      const d = new Date(lastUpdatedIso);
      if (isNaN(d.getTime())) return null;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month} à ${hours}:${mins}`;
    } catch {
      return null;
    }
  }, [lastUpdatedIso]);

  const hasKpiData = React.useMemo(() => {
    if (!agentData) return false;
    if (agentData._stored === false && !agentData.data && !agentData.kpis && !agentData.get_score_global_vdata_kpi) {
      return false;
    }
    const meaningfulKeys = Object.keys(agentData).filter(k => !k.startsWith('_'));
    return meaningfulKeys.length > 0;
  }, [agentData]);

  const showEmptyState = !hasKpiData;

  const checkPermissions = (event?: any) => {
    if (typeof window === 'undefined') return;

    let connected = false;
    let currentAllowed: string[] = [];
    let isUserAdmin = false;

    // Priorité au détail de l'événement en direct mcp-session-updated (en mémoire)
    const sessionDetail = event?.detail;
    if (sessionDetail && sessionDetail.connected === true) {
      connected = true;
      const user = sessionDetail.user || sessionDetail;
      const agents = sessionDetail.allowedAgents || user?.allowedAgents;
      if (Array.isArray(agents) && agents.length > 0) {
        currentAllowed = agents;
      }
      const roles = Array.isArray(user?.roles) ? user.roles : [user?.roles || ''];
      isUserAdmin = roles.some((r: string) => ['Administrator', 'Administrators', 'Admin', 'Superusers'].includes(r));
    } else if (sessionDetail?.user) {
      // Événement d'authentification VMIND sans connecteur ERP actif
      const user = sessionDetail.user;
      const roles = Array.isArray(user?.roles) ? user.roles : [user?.roles || ''];
      isUserAdmin = roles.some((r: string) => ['Administrator', 'Administrators', 'Admin', 'Superusers'].includes(r));
      connected = false;
    }

    setIsAdmin(isUserAdmin);
    setAllowedAgents(currentAllowed);
    setIsErpConnected(connected);
  };

  React.useEffect(() => {
    checkPermissions();
    const handleUpdate = (e: Event) => checkPermissions(e);
    window.addEventListener('mcp-session-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('mcp-session-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const isKpiAuthorized = isErpConnected && (isAdmin || allowedAgents.includes(activeAgentId || 'VDATA'));

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

  // Extract domain performances dynamically from n8n IA execution cache
  React.useEffect(() => {
    const vdataData = kpisByAgent["vdata"] || kpisByAgent["VDATA"] || {};
    const toolData = vdataData.get_score_global_vdata_kpi || vdataData;
    const kpis = toolData?.kpis || toolData?.data?.kpis;

    if (kpis && Array.isArray(kpis)) {
      const scoreGlobal = kpis.find((k: any) => k.label === 'Score qualité global')?.value ?? 0;
      const scoreLivraison = kpis.find((k: any) => k.label === 'Taux livraison')?.value ?? 0;
      const scoreFinance = kpis.find((k: any) => k.label === 'Score impayés')?.value ?? 0;

      setPerformances(prev => ({
        ...prev,
        VDATA: scoreGlobal,
        VMOVE: scoreLivraison,
        VFIN: scoreFinance,
      }));
    }
  }, [kpisByAgent]);

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

  const currentAgentConfig = activeAgentId && activeAgentId !== 'VMIND'
    ? (AGENTS as any)[activeAgentId.toUpperCase()]
    : AGENTS.VDATA;
  const agentColor = currentAgentConfig?.color || '#00E5C8';
  const agentBgColor = currentAgentConfig?.bgColor || 'rgba(0, 229, 200, 0.10)';
  const agentBorderColor = currentAgentConfig?.borderColor || 'rgba(0, 229, 200, 0.25)';

  return (
    <div className="right-panel">
      {/* KPIs Live */}
      <div className="rp-section">
        {/* Header with Section Title & Prominent Refresh Action */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', gap: '8px' }}>
          <div className="rp-title" style={{ margin: 0, flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeAgentId === 'VDATA' 
                ? 'DONNÉES & ANALYTICS' 
                : activeAgentId === 'VFIN' 
                  ? 'FINANCE & COMPTABILITÉ' 
                  : activeAgentId === 'VSELL'
                    ? 'COMMERCIAL'
                    : activeAgentId === 'VBUY'
                      ? 'ACHATS & FOURNISSEURS'
                      : activeAgentId === 'VMOVE'
                        ? 'LOGISTIQUE & LIVRAISONS'
                        : activeAgentId === 'VSTOCK'
                          ? 'STOCKS & INVENTAIRE'
                          : 'INDICATEURS CLÉS'}
            </span>
          </div>
          {isKpiAuthorized && (
            <button
              onClick={() => {
                const agentKey = (activeAgentId || 'vdata').toLowerCase();
                fetchKpis(agentKey, true);
              }}
              disabled={loadingByAgent[(activeAgentId || 'vdata').toLowerCase()]}
              title="Actualiser les indicateurs en direct depuis l'ERP (n8n)"
              style={{
                background: loadingByAgent[(activeAgentId || 'vdata').toLowerCase()] ? `${agentColor}0A` : agentBgColor,
                border: `1px solid ${agentColor}55`,
                borderRadius: '6px',
                color: agentColor,
                cursor: loadingByAgent[(activeAgentId || 'vdata').toLowerCase()] ? 'not-allowed' : 'pointer',
                padding: '5px 10px',
                fontSize: '11px',
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
                flexShrink: 0,
                boxShadow: `0 2px 8px ${agentColor}20`
              }}
              onMouseOver={(e) => !loadingByAgent[(activeAgentId || 'vdata').toLowerCase()] && (e.currentTarget.style.background = `${agentColor}35`)}
              onMouseOut={(e) => !loadingByAgent[(activeAgentId || 'vdata').toLowerCase()] && (e.currentTarget.style.background = agentBgColor)}
            >
              <span style={{ 
                display: 'inline-block', 
                fontSize: '12px',
                animation: loadingByAgent[(activeAgentId || 'vdata').toLowerCase()] ? 'spin 1s linear infinite' : 'none' 
              }}>
                🔄
              </span>
              <span>{loadingByAgent[(activeAgentId || 'vdata').toLowerCase()] ? 'Actualisation...' : 'Actualiser'}</span>
            </button>
          )}
        </div>

        {/* Timestamp de dernière mise à jour stockée en base */}
        {isKpiAuthorized && formattedLastUpdate && (
          <div style={{
            fontSize: '10.5px',
            color: 'var(--muted)',
            fontFamily: 'var(--font-mono)',
            marginBottom: '14px',
            marginTop: '-6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ color: agentColor, fontSize: '10px' }}>●</span>
            <span>Dernière actualisation : {formattedLastUpdate}</span>
          </div>
        )}

        {!isKpiAuthorized ? (
          !isErpConnected ? (
            <div style={{
              padding: '24px 16px',
              backgroundColor: 'rgba(6, 17, 31, 0.7)',
              backgroundImage: `radial-gradient(${agentColor}0A 1px, transparent 0)`,
              backgroundSize: '12px 12px',
              border: `1px solid ${agentBorderColor}`,
              borderRadius: '10px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
              margin: '8px 0 16px 0'
            }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: agentBgColor,
                border: `1px solid ${agentBorderColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                🔌
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--white)' }}>
                Connecteur ERP Requis
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: '1.5', maxWidth: '280px' }}>
                Connexion au connecteur ERP requise pour afficher les indicateurs de performance en temps réel et débloquer les outils avancés de cet agent.
              </div>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('switch-assistant-view', { detail: 'connectors' }));
                }}
                style={{
                  marginTop: '4px',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  background: agentBgColor,
                  border: `1px solid ${agentColor}50`,
                  color: agentColor,
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = `${agentColor}33`}
                onMouseOut={(e) => e.currentTarget.style.background = agentBgColor}
              >
                Accéder aux Connecteurs →
              </button>
            </div>
          ) : (
            <div style={{
              padding: '20px 16px',
              backgroundColor: 'rgba(255, 170, 0, 0.04)',
              border: '1px solid rgba(255, 170, 0, 0.2)',
              borderRadius: '10px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              margin: '8px 0 16px 0'
            }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: 'rgba(255, 170, 0, 0.1)',
                border: '1px solid rgba(255, 170, 0, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px'
              }}>
                🔒
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffaa00' }}>
                Accès aux données restreint
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: '1.5' }}>
                Accès aux données et indicateurs TraLIS non autorisé pour cet agent. Il est possible d'échanger avec l'agent pour des questions métier ou de contacter un administrateur.
              </div>
            </div>
          )
        ) : (
          <>
            {/* Global Date Picker (VDATA, VBUY, VMOVE, VFIN, VSELL) */}
            {(activeAgentId === 'VDATA' || activeAgentId === 'VBUY' || activeAgentId === 'VMOVE' || activeAgentId === 'VFIN' || activeAgentId === 'VSELL') && (
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

            {/* Global Notice Banner (e.g. Cooldown) */}
            {notice && (
              <div style={{
                background: agentBgColor,
                border: `1px solid ${agentBorderColor}`,
                color: agentColor,
                fontSize: '11px',
                padding: '8px 12px',
                borderRadius: '6px',
                marginBottom: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⏳</span>
                  <span>{notice}</span>
                </div>
                <button 
                  onClick={clearNotice} 
                  style={{ background: 'none', border: 'none', color: agentColor, cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', padding: '0 4px' }}
                >
                  ✕
                </button>
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

            {/* Affichage de l'état En attente si aucune donnée n'est stockée en base */}
            {showEmptyState ? (
              <KpiEmptyState 
                agentId={activeAgentId || 'VDATA'} 
                onLaunch={() => fetchKpis(agentKey, true)} 
                isLoading={isLoading || isInProgress} 
              />
            ) : (
              <>
                {/* Indicateur discret si un recalcul tourne en tâche de fond alors que des données sont déjà affichées */}
                {(isLoading || isInProgress) && (
                  <div style={{
                    padding: '10px 14px',
                    background: agentBgColor,
                    border: `1px solid ${agentBorderColor}`,
                    borderRadius: '8px',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <div style={{
                      width: '14px',
                      height: '14px',
                      border: `2px solid ${agentColor}33`,
                      borderTop: `2px solid ${agentColor}`,
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      flexShrink: 0
                    }} />
                    <span style={{ fontSize: '11px', color: agentColor, lineHeight: 1.4 }}>
                      Actualisation en cours en arrière-plan. La navigation vers d'autres spécialistes reste possible sans interrompre le traitement.
                    </span>
                  </div>
                )}

                {KPI_CARD_VISIBILITY.VDATA_SCORE_GLOBAL && <ScoreGlobalCard activeAgentId={activeAgentId} />}
                {KPI_CARD_VISIBILITY.VSELL_TOP_CLIENTS && <VsellTopClientsCard activeAgentId={activeAgentId} />}
                {KPI_CARD_VISIBILITY.VSELL_NOUVEAUX_CLIENTS && <VsellNewClientsCard activeAgentId={activeAgentId} />}
                {KPI_CARD_VISIBILITY.VSELL_CLIENTS_INACTIFS && <VsellInactiveClientsCard activeAgentId={activeAgentId} />}
                {KPI_CARD_VISIBILITY.VSELL_CA_PAR_CLIENT && <VsellRevenuClientBarChart activeAgentId={activeAgentId} />}
                {KPI_CARD_VISIBILITY.VSELL_FIDELISATION && <VsellFidelisationChartCard activeAgentId={activeAgentId} />}
                {KPI_CARD_VISIBILITY.VSELL_PIPELINE && <VsellPipelineFunnelCard activeAgentId={activeAgentId} />}
                {KPI_CARD_VISIBILITY.VFIN_CA_VALIDE && <VfinMonthlyRevenueCard activeAgentId={activeAgentId} />}
                {KPI_CARD_VISIBILITY.VFIN_IMPAYES && <VfinOverdueCard activeAgentId={activeAgentId} />}
                {KPI_CARD_VISIBILITY.VFIN_EVOLUTION_CA && <VfinSixMonthChartCard activeAgentId={activeAgentId} />}
                {KPI_CARD_VISIBILITY.VFIN_TAUX_MARGE && <VfinMarginCard activeAgentId={activeAgentId} />}
                {KPI_CARD_VISIBILITY.VFIN_TOP_CLIENTS && <VfinTopClientsCard activeAgentId={activeAgentId} />}
                {KPI_CARD_VISIBILITY.VFIN_TRESORERIE && <VfinTresorerieCard activeAgentId={activeAgentId} />}
                <VbuyFacturesAReglerCard activeAgentId={activeAgentId} onInsertPrompt={onInsertPrompt} />
                <VbuyAchatsDuMoisCard activeAgentId={activeAgentId} onInsertPrompt={onInsertPrompt} />
                <VbuyFournisseursEnRetardCard activeAgentId={activeAgentId} onInsertPrompt={onInsertPrompt} />
                <VbuyCommandesEnAttenteCard activeAgentId={activeAgentId} onInsertPrompt={onInsertPrompt} />
                <VbuyRepartitionCategoriePieCard activeAgentId={activeAgentId} onInsertPrompt={onInsertPrompt} />
                {KPI_CARD_VISIBILITY.VMOVE_BL_NON_FACTURES && <VmoveBlNonFacturesCard activeAgentId={activeAgentId} onInsertPrompt={onInsertPrompt} />}
                {KPI_CARD_VISIBILITY.VMOVE_FLUX_ACTIFS && <VmoveActiveFlowsMapCard activeAgentId={activeAgentId} onInsertPrompt={onInsertPrompt} />}
                {KPI_CARD_VISIBILITY.VMOVE_DOSSIERS_OUVERTS && <VmoveDossiersOuvertsCard activeAgentId={activeAgentId} onInsertPrompt={onInsertPrompt} />}
                {KPI_CARD_VISIBILITY.VMOVE_DOSSIERS_RETARD && <VmoveDossiersEnRetardCard activeAgentId={activeAgentId} onInsertPrompt={onInsertPrompt} />}
                {KPI_CARD_VISIBILITY.VMOVE_VOLUME_TRANSPORTEUR && <VmoveVolumeTransporteurCard activeAgentId={activeAgentId} onInsertPrompt={onInsertPrompt} />}
                {KPI_CARD_VISIBILITY.VDATA_VOLUME_DOSSIERS && <VolumeLineChart activeAgentId={activeAgentId} />}
                {KPI_CARD_VISIBILITY.VDATA_TAUX_LIVRAISON && <DeliveryRateKpi activeAgentId={activeAgentId} />}
                {KPI_CARD_VISIBILITY.VDATA_TABLEAU_CROISE && <MultiIndicatorsCard activeAgentId={activeAgentId} />}
                {KPI_CARD_VISIBILITY.VDATA_DERNIER_RAPPORT && <LatestReportCard activeAgentId={activeAgentId} />}
                {KPI_CARD_VISIBILITY.VDATA_ALERTES && <AlertsCard activeAgentId={activeAgentId} />}
              </>
            )}
          </>
        )}
      </div>

      {/* Performance par Domaine */}
      {activeAgentId === 'VDATA' && isKpiAuthorized && KPI_CARD_VISIBILITY.VDATA_PERFORMANCE_DOMAINES && (
        <div className="rp-section" style={{ marginTop: '20px' }}>
          <div className="rp-title" style={{ marginBottom: '14px' }}>Performance par Domaine</div>
        
        <div
          style={{
            padding: '16px',
            background: 'linear-gradient(145deg, rgba(13, 17, 26, 0.96) 0%, rgba(10, 24, 28, 0.96) 100%)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '16px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 10px 35px rgba(0, 0, 0, 0.55), inset 0 0 20px rgba(0, 240, 255, 0.05)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
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
      {logs && logs.length > 0 && (
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
      )}
    </div>
  );
};

export const RightPanel: React.FC<RightPanelProps> = (props) => (
  <RightPanelContent {...props} />
);
