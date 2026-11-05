'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, RotateCw, Share2, Filter, Clock } from 'lucide-react';
import { SupervisorGraphCanvas } from './SupervisorGraphCanvas';
import { NodeDiagnosticDrawer } from './NodeDiagnosticDrawer';
import { EdgeDiagnosticDrawer } from './EdgeDiagnosticDrawer';
import { SupervisorFunnelView } from './SupervisorFunnelView';
import { SupervisorHistoryView } from './SupervisorHistoryView';
import { CompanyContextModal } from '@/features/company-context';
import {
  SupervisorNode,
  SupervisorLink,
  CompanyContext,
  FleetAuditSummary,
  FleetFunnelData,
  FleetHistoryData,
  DEFAULT_FLEET_SUMMARY,
  DEFAULT_COMPANY_CONTEXT,
  DEFAULT_FLEET_HISTORY_DATA
} from '../types/supervisor.types';
import { useToast } from '@/shared/contexts/ToastContext';
import '../supervisor-workspace.scss';

interface SupervisorWorkspaceProps {
  agentId?: string;
  agentName?: string;
}

export const SupervisorWorkspace: React.FC<SupervisorWorkspaceProps> = ({
  agentId,
  agentName: initialAgentName = 'Superviseur Commercial'
}) => {
  const router = useRouter();
  const { showToast } = useToast();

  // State: start strictly with empty data so no fake nodes ever flash
  const [activeTab, setActiveTab] = useState<'canvas' | 'funnel' | 'history'>('canvas');
  const [nodes, setNodes] = useState<SupervisorNode[]>([]);
  const [links, setLinks] = useState<SupervisorLink[]>([]);
  const [funnelData, setFunnelData] = useState<FleetFunnelData | null>(null);
  const [historyData, setHistoryData] = useState<FleetHistoryData>(DEFAULT_FLEET_HISTORY_DATA);
  const [fleetSummary, setFleetSummary] = useState<FleetAuditSummary>(DEFAULT_FLEET_SUMMARY);
  const [companyContext, setCompanyContext] = useState<CompanyContext>(DEFAULT_COMPANY_CONTEXT);
  const [displayName, setDisplayName] = useState<string>(initialAgentName || 'Superviseur Commercial');
  const [isLoadingFleet, setIsLoadingFleet] = useState<boolean>(true);
  const [isRunningAudit, setIsRunningAudit] = useState<boolean>(false);

  const calculateSummary = (incomingNodes: SupervisorNode[]): FleetAuditSummary => {
    if (incomingNodes.length === 0) {
      return {
        lastAuditedAt: 'En attente',
        overallScore: 0,
        totalAgents: 0,
        healthyCount: 0,
        warningCount: 0,
        criticalCount: 0,
        unanalyzedCount: 0,
        topPriorities: []
      };
    }

    const healthy = incomingNodes.filter(n => n.status === 'HEALTHY').length;
    const warning = incomingNodes.filter(n => n.status === 'WARNING').length;
    const critical = incomingNodes.filter(n => n.status === 'CRITICAL').length;
    const unanalyzed = incomingNodes.filter(n => n.status === 'UNANALYZED').length;
    const analyzed = incomingNodes.filter(n => n.status !== 'UNANALYZED');
    const avgScore = analyzed.length > 0
      ? Math.round(analyzed.reduce((acc, n) => acc + (n.healthScore || 0), 0) / analyzed.length)
      : 0;

    return {
      lastAuditedAt: '',
      overallScore: avgScore,
      totalAgents: incomingNodes.length,
      healthyCount: healthy,
      warningCount: warning,
      criticalCount: critical,
      unanalyzedCount: unanalyzed,
      topPriorities: []
    };
  };

  const fetchRealFleet = useCallback(async () => {
    setIsLoadingFleet(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';

      // 1. Fetch supervisor details to resolve display name
      try {
        const listRes = await fetch(`${baseUrl}/api/list-agents`, { credentials: 'include' });
        if (listRes.ok) {
          const listData = await listRes.json();
          if (listData.ok && Array.isArray(listData.agents)) {
            let matched = null;
            if (agentId) {
              matched = listData.agents.find((a: any) =>
                a.uuid === agentId || String(a.agent_id) === String(agentId) || a.agent_name?.toLowerCase() === agentId.toLowerCase()
              );
            }
            if (!matched) {
              matched = listData.agents.find((a: any) => a.run_mode === 'supervisor');
            }
            if (matched) {
              setDisplayName(matched.agent_name || matched.nom || initialAgentName);
            }
          }
        }
      } catch (e) {
        console.warn('[SupervisorWorkspace] Could not resolve supervisor name:', e);
      }

      // 2. Fetch fleet graph scoped to this supervisor's supervised_agent_ids
      const targetId = agentId || 'default';
      const res = await fetch(`${baseUrl}/api/supervisor/fleet-graph/${encodeURIComponent(targetId)}`, {
        credentials: 'include'
      });

      if (res.ok) {
        const graphData = await res.json();
        const incomingNodes: SupervisorNode[] = Array.isArray(graphData.nodes) ? graphData.nodes : [];
        const incomingLinks: SupervisorLink[] = Array.isArray(graphData.links) ? graphData.links : [];

        if (graphData.supervisor?.company_context) {
          setCompanyContext(graphData.supervisor.company_context);
        }

        setNodes(incomingNodes);
        setLinks(incomingLinks);
        setFleetSummary(calculateSummary(incomingNodes));
      }

      // 3. Fetch fleet conversion funnel (KBN-13)
      try {
        const funnelRes = await fetch(`${baseUrl}/api/supervisor/fleet-funnel/${encodeURIComponent(targetId)}`, {
          credentials: 'include'
        });
        if (funnelRes.ok) {
          const fData = await funnelRes.json();
          setFunnelData(fData);
        }
      } catch (fErr) {
        console.warn('[SupervisorWorkspace] Error loading fleet funnel:', fErr);
      }

      // 4. Fetch fleet audit history (KBN-16)
      try {
        const historyRes = await fetch(`${baseUrl}/api/supervisor/fleet-history/${encodeURIComponent(targetId)}`, {
          credentials: 'include'
        });
        if (historyRes.ok) {
          const hData = await historyRes.json();
          setHistoryData(hData);
        }
      } catch (hErr) {
        console.warn('[SupervisorWorkspace] Error loading fleet history:', hErr);
      }
    } catch (err) {
      console.error('[SupervisorWorkspace] Error loading fleet graph:', err);
    } finally {
      setIsLoadingFleet(false);
    }
  }, [agentId, initialAgentName]);

  // Load real fleet data on mount
  useEffect(() => {
    fetchRealFleet();
  }, [fetchRealFleet]);

  const handleRefresh = async () => {
    await fetchRealFleet();
    showToast('Données de la flotte actualisées', 'ok');
  };

  const handleRunAuditNow = async () => {
    if (!agentId || isRunningAudit) return;
    setIsRunningAudit(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';
      const res = await fetch(`${baseUrl}/api/supervisor-agent/run-now/${encodeURIComponent(agentId)}`, {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        showToast('Audit flash terminé avec succès', 'ok');
        await fetchRealFleet();
      } else {
        const errJson = await res.json().catch(() => ({}));
        showToast(errJson.error || "Impossible d'exécuter l'audit flash", 'error');
      }
    } catch (e: any) {
      showToast("Erreur de connexion lors de l'audit flash", 'error');
    } finally {
      setIsRunningAudit(false);
    }
  };

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);

  // Computed selection objects
  const selectedNode = useMemo(() => {
    return nodes.find(n => n.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  const selectedLink = useMemo(() => {
    return links.find(l => l.id === selectedLinkId) || null;
  }, [links, selectedLinkId]);

  const handleSelectNode = (node: SupervisorNode) => {
    setSelectedNodeId(node.id);
    setSelectedLinkId(null);
  };

  const handleSelectLink = (link: SupervisorLink) => {
    setSelectedLinkId(link.id);
    setSelectedNodeId(null);
  };

  const handleClearSelection = () => {
    setSelectedNodeId(null);
    setSelectedLinkId(null);
  };

  const handleLinkEvaluationUpdated = useCallback((updatedLink: SupervisorLink, fullEvalPayload: any) => {
    setLinks(prevLinks => {
      return prevLinks.map(l => {
        const matches = (l.id === updatedLink.id) ||
          (l.sourceUuid === updatedLink.sourceUuid && l.targetUuid === updatedLink.targetUuid) ||
          (l.source === updatedLink.source && l.target === updatedLink.target);

        if (!matches) return l;

        const evalObj = fullEvalPayload?.evaluation || fullEvalPayload;
        const newScore = evalObj?.sync_score ?? evalObj?.score ?? l.alignmentScore;
        const newSummary = evalObj?.summary ?? l.summary;
        let newStatus = l.status;
        if (typeof newScore === 'number') {
          if (newScore < 50) newStatus = 'CRITICAL';
          else if (newScore < 75) newStatus = 'WARNING';
          else newStatus = 'HEALTHY';
        }

        return {
          ...l,
          alignmentScore: newScore,
          summary: newSummary,
          status: newStatus,
          evaluation: fullEvalPayload?.evaluation_data || fullEvalPayload,
          lastEvaluatedAt: fullEvalPayload?.evaluated_at || fullEvalPayload?.created_at || new Date().toISOString(),
          leadsCountAtEval: fullEvalPayload?.metrics?.transferred ?? l.throughput?.leadsTransferred,
        };
      });
    });
  }, []);

  const handleNodeEvaluationUpdated = useCallback((updatedNode: SupervisorNode, fullEvalPayload: any) => {
    setNodes(prevNodes => {
      const nextNodes = prevNodes.map(n => {
        if (n.id !== updatedNode.id) return n;

        const evalObj = fullEvalPayload?.evaluation || fullEvalPayload;
        const newScore = evalObj?.score ?? n.healthScore;
        const newSummary = evalObj?.summary ?? n.summary;
        let newStatus = n.status;
        if (typeof newScore === 'number') {
          if (newScore < 50) newStatus = 'CRITICAL';
          else if (newScore < 75) newStatus = 'WARNING';
          else newStatus = 'HEALTHY';
        }

        return {
          ...n,
          healthScore: newScore,
          summary: newSummary,
          status: newStatus,
          evaluation: fullEvalPayload?.evaluation_data || fullEvalPayload,
          lastEvaluatedAt: fullEvalPayload?.evaluated_at || fullEvalPayload?.created_at || new Date().toISOString(),
        };
      });
      setFleetSummary(calculateSummary(nextNodes));
      return nextNodes;
    });
  }, []);

  const handleSaveCompanyContext = (updated: any) => {
    setCompanyContext(updated);
  };

  const healthyCount = fleetSummary.healthyCount;
  const warningCount = fleetSummary.warningCount;
  const criticalCount = fleetSummary.criticalCount;
  const unanalyzedCount = fleetSummary.unanalyzedCount;

  return (
    <div className="supervisor-workspace-container">
      {/* 1. Header */}
      <header className="supervisor-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => router.push('/')} title="Retour à l'accueil">
            <ArrowLeft size={16} />
          </button>
          <div className="agent-title-block">
            <div className="agent-badge-row">
              <span className="role-tag">Superviseur IA</span>
            </div>
            <div className="agent-name">{displayName}</div>
          </div>
        </div>

        {/* Fleet Status Capsule */}
        <div className="header-center-pill">
          <div className="fleet-score-badge" title="Moyenne des scores d'alignement IA de vos agents par rapport à la stratégie d'entreprise">
            <span className="score-ring-dot" />
            <span className="score-text">{fleetSummary.overallScore}%</span>
            <span className="score-sub">Conformité Globale</span>
          </div>
          <div className="capsule-divider" />
          <div className="fleet-status-chips">
            <span className="status-chip healthy" title={`${healthyCount} agent(s) avec ciblage et discours parfaitement alignés (≥ 75%)`}>
              <span className="chip-dot" />
              <span>{healthyCount} Optimal{healthyCount > 1 ? 'aux' : ''}</span>
            </span>
            {warningCount > 0 && (
              <span className="status-chip warning" title={`${warningCount} agent(s) avec légers écarts à surveiller (50-74%)`}>
                <span className="chip-dot" />
                <span>{warningCount} À surveiller</span>
              </span>
            )}
            {criticalCount > 0 && (
              <span className="status-chip critical" title={`${criticalCount} agent(s) nécessitant un réajustement de mission (< 50%)`}>
                <span className="chip-dot" />
                <span>{criticalCount} À optimiser</span>
              </span>
            )}
            {unanalyzedCount > 0 && (
              <span className="status-chip unanalyzed" title={`${unanalyzedCount} agent(s) sans activité mesurée pour le moment`}>
                <span className="chip-dot" />
                <span>{unanalyzedCount} En attente</span>
              </span>
            )}
          </div>
        </div>

        {/* Tab Switcher: Réseau vs Entonnoir Global vs Historique des Audits (KBN-13) */}
        <div className="header-tab-switcher">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'canvas' ? 'active' : ''}`}
            onClick={() => setActiveTab('canvas')}
            title="Afficher la cartographie réseau interactive des agents"
          >
            <Share2 size={13} />
            <span>Réseau</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'funnel' ? 'active' : ''}`}
            onClick={() => setActiveTab('funnel')}
            title="Afficher l'entonnoir de conversion global de la flotte"
          >
            <Filter size={13} />
            <span>Entonnoir Global</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
            title="Afficher l'historique chronologique des audits et comparatifs d'alignement"
          >
            <Clock size={13} />
            <span>Historique des Audits</span>
          </button>
        </div>

        <div className="header-right">
          <button
            className="header-btn btn-secondary"
            onClick={() => setIsContextModalOpen(true)}
            title="Gérer les informations stratégiques de votre entreprise"
          >
            <Building2 size={15} />
            <span>Contexte Entreprise</span>
          </button>

          <button
            className="header-btn btn-primary"
            onClick={handleRefresh}
            disabled={isLoadingFleet}
            title="Actualiser les données de la flotte en direct"
          >
            <RotateCw size={15} className={isLoadingFleet ? 'spin-icon' : ''} />
            <span>{isLoadingFleet ? 'Actualisation...' : 'Actualiser'}</span>
          </button>
        </div>
      </header>

      {/* 2. Main Workspace View Container */}
      {activeTab === 'canvas' ? (
        <div style={{ position: 'relative', flex: 1, minHeight: 0, width: '100%', height: '100%', overflow: 'hidden' }}>
          <SupervisorGraphCanvas
            nodes={nodes}
            links={links}
            selectedNodeId={selectedNodeId}
            selectedLinkId={selectedLinkId}
            onSelectNode={handleSelectNode}
            onSelectLink={handleSelectLink}
            onClearSelection={handleClearSelection}
          />

          {/* Loading Spinner Overlay */}
          {isLoadingFleet && nodes.length === 0 && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(6, 17, 31, 0.75)',
              backdropFilter: 'blur(8px)',
              zIndex: 15,
              pointerEvents: 'none'
            }}>
              <div className="spinner-ring" style={{ width: 36, height: 36, marginBottom: 16 }} />
              <span style={{ color: '#00E5C8', fontSize: 13, fontWeight: 600, letterSpacing: '0.04em' }}>
                Chargement du cockpit de supervision…
              </span>
            </div>
          )}

          {/* Empty State Banner if 0 agents are attached */}
          {!isLoadingFleet && nodes.length === 0 && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(6, 17, 31, 0.85)',
              zIndex: 10,
              padding: 32,
              textAlign: 'center',
              pointerEvents: 'none'
            }}>
              <div style={{
                maxWidth: 440,
                padding: '28px 32px',
                borderRadius: 16,
                background: 'rgba(10, 25, 47, 0.75)',
                border: '1px solid rgba(0, 229, 200, 0.2)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
              }}>
                <div style={{ fontSize: 38, marginBottom: 12 }}>👁️</div>
                <div style={{ color: '#F0F4F8', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                  Aucun agent sous supervision
                </div>
                <div style={{ color: '#94A3B8', fontSize: 13, lineHeight: 1.6 }}>
                  Ce superviseur ne possède aucun agent de Sourcing ou de Prospection rattaché pour le moment.
                </div>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'funnel' ? (
        <div className="supervisor-funnel-tab-container">
          <SupervisorFunnelView
            funnelData={funnelData}
            isLoading={isLoadingFleet}
            onRefresh={handleRefresh}
            onOpenContextModal={() => setIsContextModalOpen(true)}
          />
        </div>
      ) : (
        <div className="supervisor-history-tab-container">
          <SupervisorHistoryView
            historyData={historyData}
            isLoading={isLoadingFleet}
            onRefresh={handleRefresh}
            onRunAuditNow={handleRunAuditNow}
            isRunningAudit={isRunningAudit}
          />
        </div>
      )}

      {/* 3. Sliding Diagnostic Drawers */}
      {selectedNode && (
        <NodeDiagnosticDrawer
          node={selectedNode}
          supervisorId={agentId}
          onClose={handleClearSelection}
          onEvaluationComplete={handleNodeEvaluationUpdated}
        />
      )}

      {selectedLink && (
        <EdgeDiagnosticDrawer
          link={selectedLink}
          supervisorId={agentId}
          onClose={handleClearSelection}
          onEvaluationComplete={handleLinkEvaluationUpdated}
        />
      )}

      {/* 4. Company Context Modal (100% Real - Saved to PostgreSQL & Upstash Redis) */}
      {isContextModalOpen && (
        <CompanyContextModal
          context={companyContext}
          onClose={() => setIsContextModalOpen(false)}
          onSaveContext={handleSaveCompanyContext}
        />
      )}
    </div>
  );
};
