'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RotateCw, Share2, Filter, Clock, Sparkles, BarChart3, ChevronRight } from 'lucide-react';
import { SupervisorGraphCanvas } from './SupervisorGraphCanvas';
import { NodeDiagnosticDrawer } from './NodeDiagnosticDrawer';
import { EdgeDiagnosticDrawer } from './EdgeDiagnosticDrawer';
import { SupervisorPipelineModal } from './SupervisorPipelineModal';
import { SupervisorFunnelView } from './SupervisorFunnelView';
import { SupervisorHistoryView } from './SupervisorHistoryView';
import { VMindGuide, VMindGuideArrow, GuideMood } from '@/shared/management/components/VMindGuide';
import { CyberIcon } from '@/shared/management/components/CyberIcon';
import {
  SupervisorNode,
  SupervisorLink,
  CompanyContext,
  FleetAuditSummary,
  FleetFunnelData,
  FleetHistoryData,
  FleetAlertsData,
  DEFAULT_FLEET_SUMMARY,
  DEFAULT_COMPANY_CONTEXT,
  DEFAULT_FLEET_HISTORY_DATA,
  DEFAULT_FLEET_ALERTS_DATA
} from '../types/supervisor.types';
import { useToast } from '@/shared/contexts/ToastContext';
import { useProspectSocket } from '@/features/management/prospect-workspace/hooks/useProspectSocket';
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
  const [activeTab, setActiveTab] = useState<'canvas' | 'history'>('canvas');
  const [nodes, setNodes] = useState<SupervisorNode[]>([]);
  const [links, setLinks] = useState<SupervisorLink[]>([]);
  const [funnelData, setFunnelData] = useState<FleetFunnelData | null>(null);
  const [historyData, setHistoryData] = useState<FleetHistoryData>(DEFAULT_FLEET_HISTORY_DATA);
  const [fleetSummary, setFleetSummary] = useState<FleetAuditSummary>(DEFAULT_FLEET_SUMMARY);
  const [companyContext, setCompanyContext] = useState<CompanyContext>(DEFAULT_COMPANY_CONTEXT);
  const [displayName, setDisplayName] = useState<string>(initialAgentName || 'Superviseur Commercial');
  const [isLoadingFleet, setIsLoadingFleet] = useState<boolean>(true);
  const [isRunningAudit, setIsRunningAudit] = useState<boolean>(false);
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState<boolean>(false);
  const [alertsData, setAlertsData] = useState<FleetAlertsData>(DEFAULT_FLEET_ALERTS_DATA);
  const [optimalThreshold, setOptimalThreshold] = useState<number>(75);

  // ─── Onboarding Tutorial State (VMindGuide) ────────────────────────────────
  const [tutorialStep, setTutorialStep] = useState<number>(0);

  const startTutorial = () => {
    setActiveTab('canvas');
    setSelectedNodeId(null);
    setSelectedLinkId(null);
    setIsPipelineModalOpen(false);
    setTutorialStep(1);
  };

  const nextTutorialStep = () => {
    setTutorialStep((prev) => {
      if (prev >= 8) {
        if (agentId) {
          try {
            localStorage.setItem(`vmind_guide_supervisor_${agentId}`, 'completed');
          } catch (_) {}
        }
        setActiveTab('canvas');
        return 0;
      }
      const next = prev + 1;
      if (next >= 1 && next <= 5) {
        setActiveTab('canvas');
      } else if (next >= 6 && next <= 8) {
        setActiveTab('history');
      }
      return next;
    });
  };

  const dismissTutorial = () => {
    if (agentId) {
      try {
        localStorage.setItem(`vmind_guide_supervisor_${agentId}`, 'completed');
      } catch (_) {}
    }
    setTutorialStep(0);
  };

  // Auto-launch guide for first-time visitors
  useEffect(() => {
    if (!agentId) return;
    try {
      const seen = localStorage.getItem(`vmind_guide_supervisor_${agentId}`);
      if (!seen) {
        const timer = setTimeout(() => {
          setTutorialStep(1);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch (_) {}
  }, [agentId]);

  // Ambient Keyboard Navigation (Rule 38: Space/ArrowRight = Next, Escape = Exit)
  useEffect(() => {
    if (tutorialStep <= 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return;

      if (e.key === ' ' || e.code === 'Space' || e.key === 'ArrowRight') {
        e.preventDefault();
        nextTutorialStep();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        dismissTutorial();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tutorialStep]);

  const getTutorialContent = () => {
    switch (tutorialStep) {
      case 1:
        return {
          title: "Conformité Globale de la Flotte",
          mood: 'curious' as GuideMood,
          message: "Bienvenue sur votre espace de supervision commerciale. Ce score consolidé mesure en temps réel l'alignement stratégique de l'ensemble de votre flotte (Sourcing & Prospection) par rapport à votre offre et votre cible idéale."
        };
      case 2:
        return {
          title: "Navigation & Vues Stratégiques",
          mood: 'focused' as GuideMood,
          message: "Basculez entre la Vue d'ensemble (cartographie réseau et pipeline commercial consolidé) et l'Historique (journal chronologique des audits, évolutions des scores et analyses de conformité au fil du temps)."
        };
      case 3:
        return {
          title: "Pipeline Commercial & Métriques",
          mood: 'focused' as GuideMood,
          message: "Cliquez sur 'Pipeline Commercial' pour ouvrir le popup interactif consolidé. Vous y découvrirez la chaîne de valeur de votre flotte (Sourcés ➔ Transférés ➔ Qualifiés ➔ Brouillons ➔ Envoyés) calculée sur la dernière mission active."
        };
      case 4:
        return {
          title: "Performances par Binôme",
          mood: 'convinced' as GuideMood,
          message: "Dans ce même popup, consultez le tableau détaillé 1-à-1 pour inspecter les transferts, taux d'acceptation et volumes entre chaque agent de sourcing et son prospecteur cible."
        };
      case 5:
        return {
          title: "Cartographie Relationnelle 2D",
          mood: 'curious' as GuideMood,
          message: "Ce graphe élastique modélise vos flux de prospection. Cliquez sur un Agent pour inspecter ses forces et axes d'amélioration, ou sur un Lien élastique pour évaluer l'alignement du passage de relais."
        };
      case 6:
        return {
          title: "Courbe Temporelle & Filtre par Agent",
          mood: 'curious' as GuideMood,
          message: "Par défaut, ce graphique affiche la moyenne consolidée de votre flotte ('Flotte Consolidée'). 🎯 Filtrez par Agent : Cliquez sur ce sélecteur déroulant pour basculer de la flotte globale vers la trajectoire d'un agent précis (Sourcing ou Prospection) et analyser sa progression individuelle."
        };
      case 7:
        return {
          title: "Matrice Comparative des Agents",
          mood: 'focused' as GuideMood,
          message: "Comparez vos agents de sourcing et de prospection dans un tableau consolidé : score actuel, progression (delta), tendance récente sur mini-graphique et volume d'analyses. Cliquez sur 'Inspecter' pour charger immédiatement sa courbe."
        };
      case 8:
        return {
          title: "Journal des Sessions d'Audit",
          mood: 'convinced' as GuideMood,
          message: "Retrouvez chaque audit exécuté par le superviseur (programmé ou flash). Dépliez une session pour examiner l'alignement des binômes, les taux de transmission réels et les raisons de disqualification observées."
        };
      default:
        return null;
    }
  };

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
              if (matched.is_executing) {
                setIsRunningAudit(true);
              }
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
        if (typeof graphData.optimalThreshold === 'number') {
          setOptimalThreshold(graphData.optimalThreshold);
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
          if (typeof hData.optimalThreshold === 'number') {
            setOptimalThreshold(hData.optimalThreshold);
          }
        }
      } catch (hErr) {
        console.warn('[SupervisorWorkspace] Error loading fleet history:', hErr);
      }

      // 5. Fetch operational alerts & unattended hot leads (KBN-15)
      try {
        const alertsRes = await fetch(`${baseUrl}/api/supervisor/fleet-alerts/${encodeURIComponent(targetId)}`, {
          credentials: 'include'
        });
        if (alertsRes.ok) {
          const aData = await alertsRes.json();
          setAlertsData(aData);
        }
      } catch (aErr) {
        console.warn('[SupervisorWorkspace] Error loading fleet alerts:', aErr);
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

  // Targeted lightweight refresh: only refreshes alerts & funnel without reloading graph & history
  const refreshAlertsAndFunnel = useCallback(async () => {
    const targetId = agentId || 'default';
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';
    try {
      const [alertsRes, funnelRes] = await Promise.allSettled([
        fetch(`${baseUrl}/api/supervisor/fleet-alerts/${encodeURIComponent(targetId)}`, { credentials: 'include' }),
        fetch(`${baseUrl}/api/supervisor/fleet-funnel/${encodeURIComponent(targetId)}`, { credentials: 'include' })
      ]);

      if (alertsRes.status === 'fulfilled' && alertsRes.value.ok) {
        const aData = await alertsRes.value.json();
        setAlertsData(aData);
      }
      if (funnelRes.status === 'fulfilled' && funnelRes.value.ok) {
        const fData = await funnelRes.value.json();
        setFunnelData(fData);
      }
    } catch (err) {
      console.warn('[SupervisorWorkspace] Silent alerts refresh error:', err);
    }
  }, [agentId]);

  const debounceRefreshTimer = useRef<NodeJS.Timeout | null>(null);
  useProspectSocket((payload) => {
    if (typeof payload.is_executing === 'boolean' && (payload.agent_id || payload.uuid)) {
      const targetId = String(payload.uuid || payload.agent_id || '').toLowerCase();
      const currentParamId = String(agentId || '').toLowerCase();
      const currentName = String(displayName || '').toLowerCase();

      if (targetId === currentParamId || targetId === currentName) {
        setIsRunningAudit(payload.is_executing);
        if (!payload.is_executing) {
          if (debounceRefreshTimer.current) clearTimeout(debounceRefreshTimer.current);
          debounceRefreshTimer.current = setTimeout(() => {
            fetchRealFleet();
            showToast('Audit flash terminé avec succès', 'ok');
          }, 600);
        }
      }
    }

    // Realtime notification when qualifications, emails, or leads update:
    // 1. Scoped to this fleet (discards events belonging to other agents)
    // 2. Uses targeted lightweight refresh (only alerts & funnel, not the whole fleet)
    // 3. Trailing-edge debounce (1200ms) absorbs bursts into 1 single request
    if (
      payload.table === 'prospect_agent_qualifications' ||
      payload.table === 'prospect_agent_emails_envoyes' ||
      payload.table === 'prospect_agent_leads'
    ) {
      const eventAgentId = String(payload.new?.agent_id || payload.old?.agent_id || payload.new?.uuid || '').toLowerCase();
      if (eventAgentId && nodes.length > 0) {
        const isBelongingToFleet = nodes.some(n => 
          String(n.id).toLowerCase() === eventAgentId || 
          n.name?.toLowerCase() === eventAgentId ||
          (n.agent_id && String(n.agent_id) === eventAgentId)
        );
        if (!isBelongingToFleet) {
          return;
        }
      }

      if (debounceRefreshTimer.current) clearTimeout(debounceRefreshTimer.current);
      debounceRefreshTimer.current = setTimeout(() => {
        refreshAlertsAndFunnel();
      }, 1200);
    }
  });

  const handleRefresh = async () => {
    await fetchRealFleet();
    showToast('Données de la flotte actualisées', 'ok');
  };

  const handleRunAuditNow = async () => {
    if (!agentId || isRunningAudit) return;
    setIsRunningAudit(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';
      const res = await fetch(`${baseUrl}/api/supervisor-agent/run-now/${encodeURIComponent(agentId)}?async=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ async: true }),
      });
      if (res.ok) {
        showToast('Audit flash lancé en arrière-plan', 'ok');
      } else {
        const errJson = await res.json().catch(() => ({}));
        showToast(errJson.error || "Impossible d'exécuter l'audit flash", 'error');
        setIsRunningAudit(false);
      }
    } catch (e: any) {
      showToast("Erreur de connexion lors de l'audit flash", 'error');
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
    setIsPipelineModalOpen(false);
    setSelectedNodeId(node.id);
    setSelectedLinkId(null);
  };

  const handleSelectLink = (link: SupervisorLink) => {
    setIsPipelineModalOpen(false);
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
        const effectiveOpt = optimalThreshold > 0 ? optimalThreshold : 75;
        const critCutoff = Math.min(50, Math.max(1, effectiveOpt - 1));
        if (typeof newScore === 'number') {
          if (newScore < critCutoff) newStatus = 'CRITICAL';
          else if (newScore < effectiveOpt) newStatus = 'WARNING';
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
  }, [optimalThreshold]);

  const handleNodeEvaluationUpdated = useCallback((updatedNode: SupervisorNode, fullEvalPayload: any) => {
    setNodes(prevNodes => {
      const nextNodes = prevNodes.map(n => {
        if (n.id !== updatedNode.id) return n;

        const evalObj = fullEvalPayload?.evaluation || fullEvalPayload;
        const newScore = evalObj?.score ?? n.healthScore;
        const newSummary = evalObj?.summary ?? n.summary;
        let newStatus = n.status;
        const effectiveOpt = optimalThreshold > 0 ? optimalThreshold : 75;
        const critCutoff = Math.min(50, Math.max(1, effectiveOpt - 1));
        if (typeof newScore === 'number') {
          if (newScore < critCutoff) newStatus = 'CRITICAL';
          else if (newScore < effectiveOpt) newStatus = 'WARNING';
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
  }, [optimalThreshold]);

  const handleSaveCompanyContext = (updated: any) => {
    setCompanyContext(updated);
  };

  const healthyCount = fleetSummary.healthyCount;
  const warningCount = fleetSummary.warningCount;
  const criticalCount = fleetSummary.criticalCount;
  const unanalyzedCount = fleetSummary.unanalyzedCount;

  return (
    <div className="supervisor-workspace-container">
      {/* 0. Dedicated Local Dark Tutorial Overlay (Strictly local, NO createPortal) */}
      {tutorialStep > 0 && (
        <div
          onClick={nextTutorialStep}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(3, 8, 16, 0.82)',
            zIndex: 10000,
            cursor: 'pointer',
          }}
          title="Cliquez pour continuer ou appuyez sur Échap pour quitter"
        />
      )}

      {/* 1. Header */}
      <header
        className="supervisor-header"
        style={{
          position: 'relative',
          zIndex: (tutorialStep === 1 || tutorialStep === 2) ? 10001 : 20,
        }}
      >
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
        <div
          className="header-center-pill"
          style={
            tutorialStep === 1
              ? {
                  position: 'relative',
                  zIndex: 10003,
                  boxShadow: '0 0 0 2px #00E5C8, 0 0 25px rgba(0, 229, 200, 0.65)',
                  borderColor: '#00E5C8',
                }
              : undefined
          }
        >
          {tutorialStep === 1 && (
            <VMindGuideArrow
              direction="up"
              color="#00E5C8"
              style={{
                position: 'absolute',
                bottom: '-46px',
                left: '50%',
                marginLeft: '-8px',
                zIndex: 10004,
              }}
            />
          )}
          <div className="fleet-score-badge" title="Moyenne des scores d'alignement IA calculée sur la dernière mission active de chaque agent (échantillon représentatif)">
            <span className="score-ring-dot" />
            <span className="score-text">{fleetSummary.overallScore}%</span>
            <span className="score-sub">Conformité Globale</span>
          </div>
          <div className="capsule-divider" />
          <div className="fleet-status-chips">
            <span className="status-chip healthy" title={`${healthyCount} agent(s) avec ciblage et discours parfaitement alignés (≥ ${optimalThreshold > 0 ? optimalThreshold : 75}%)`}>
              <span className="chip-dot" />
              <span>{healthyCount} Optimal{healthyCount > 1 ? 'aux' : ''}</span>
            </span>
            {warningCount > 0 && (
              <span className="status-chip warning" title={`${warningCount} agent(s) avec légers écarts à surveiller (${Math.min(50, Math.max(1, (optimalThreshold > 0 ? optimalThreshold : 75) - 1))}-${Math.max(1, (optimalThreshold > 0 ? optimalThreshold : 75) - 1)}%)`}>
                <span className="chip-dot" />
                <span>{warningCount} À surveiller</span>
              </span>
            )}
            {criticalCount > 0 && (
              <span className="status-chip critical" title={`${criticalCount} agent(s) nécessitant un réajustement de mission (< ${Math.min(50, Math.max(1, (optimalThreshold > 0 ? optimalThreshold : 75) - 1))}%)`}>
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

        {/* Tab Switcher: Vue d'ensemble vs Historique */}
        <div
          className="header-tab-switcher"
          style={
            tutorialStep === 2
              ? {
                  position: 'relative',
                  zIndex: 10003,
                  boxShadow: '0 0 0 2px #00E5C8, 0 0 25px rgba(0, 229, 200, 0.65)',
                  borderColor: '#00E5C8',
                }
              : undefined
          }
        >
          {tutorialStep === 2 && (
            <VMindGuideArrow
              direction="up"
              color="#00E5C8"
              style={{
                position: 'absolute',
                bottom: '-44px',
                left: '50%',
                marginLeft: '-8px',
                zIndex: 10004,
              }}
            />
          )}
          <button
            type="button"
            className={`tab-btn ${activeTab === 'canvas' ? 'active' : ''}`}
            onClick={() => setActiveTab('canvas')}
            title="Vue d'ensemble : cartographie réseau et pipeline commercial"
          >
            <Share2 size={13} />
            <span>Vue d'ensemble</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
            title="Afficher l'historique chronologique des audits et comparatifs d'alignement"
          >
            <Clock size={13} />
            <span>Historique</span>
          </button>
        </div>

        <div className="header-right">
          {/* Guide IA Button to replay tutorial anytime */}
          <button
            type="button"
            className="header-btn btn-secondary guide-trigger-btn"
            onClick={startTutorial}
            title="Démarrer le guide interactif du Superviseur Commercial"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Sparkles size={14} style={{ color: '#00E5C8' }} />
            <span>Guide IA</span>
          </button>

          <button
            className="header-btn btn-primary"
            onClick={handleRefresh}
            disabled={isLoadingFleet || isRunningAudit}
            title={isRunningAudit ? "Un audit est en cours d'exécution..." : "Actualiser les données de la flotte en direct"}
          >
            <RotateCw size={15} className={(isLoadingFleet || isRunningAudit) ? 'spin-icon' : ''} />
            <span>{isRunningAudit ? 'Audit en cours…' : (isLoadingFleet ? 'Actualisation...' : 'Actualiser')}</span>
          </button>
        </div>
      </header>

      {/* 2. Main Workspace View Container */}
      {activeTab === 'canvas' ? (
        <div
          className="supervisor-cockpit-viewport"
          style={
            tutorialStep >= 3 && tutorialStep <= 5
              ? { overflow: 'visible' }
              : undefined
          }
        >
          {/* 2D Force Graph Canvas Container */}
          <div
            className="supervisor-canvas-wrapper-box"
            style={
              tutorialStep === 5
                ? {
                    position: 'relative',
                    zIndex: 10001,
                    boxShadow: 'inset 0 0 0 2px #00E5C8, 0 0 30px rgba(0, 229, 200, 0.35)',
                    borderRadius: '12px',
                  }
                : undefined
            }
          >
            {/* Apple-style Glass Trigger for Consolidated Pipeline Modal */}
            <div
              className="canvas-pipeline-trigger-wrap"
              style={{
                position: 'absolute',
                top: '16px',
                right: '20px',
                zIndex: (tutorialStep === 3 || tutorialStep === 4) ? 10003 : 10,
              }}
            >
              {tutorialStep === 3 && (
                <VMindGuideArrow
                  direction="down"
                  color="#00E5C8"
                  style={{
                    position: 'absolute',
                    top: '-44px',
                    left: '50%',
                    marginLeft: '-8px',
                    zIndex: 10004,
                  }}
                />
              )}
              <button
                type="button"
                className={`canvas-pipeline-btn ${isPipelineModalOpen ? 'active' : ''}`}
                onClick={() => {
                  setSelectedNodeId(null);
                  setSelectedLinkId(null);
                  setIsPipelineModalOpen(true);
                }}
                title="Consulter le pipeline commercial consolidé et les conversions par binôme"
                style={
                  tutorialStep === 3 || tutorialStep === 4
                    ? {
                        position: 'relative',
                        zIndex: 10003,
                        background: '#00E5C8',
                        color: '#04101E',
                        fontWeight: 700,
                        boxShadow: '0 0 0 2px #00E5C8, 0 0 25px rgba(0, 229, 200, 0.75)',
                      }
                    : undefined
                }
              >
                <div className="btn-icon-box">
                  <BarChart3 size={14} className="btn-icon" />
                </div>
                <div className="btn-content-group">
                  <span className="btn-title">Pipeline Commercial</span>
                  <span className="btn-count-pill">
                    {(funnelData?.agentPairs || []).length} binôme{(funnelData?.agentPairs || []).length > 1 ? 's' : ''}
                  </span>
                </div>
                <ChevronRight size={13} className="btn-chevron" />
              </button>
            </div>

            {tutorialStep === 5 && (
              <div
                style={{
                  position: 'absolute',
                  top: '18px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 10004,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  pointerEvents: 'none',
                }}
              >
                <VMindGuideArrow direction="down" color="#00E5C8" />
                <span
                  style={{
                    background: 'rgba(6, 17, 31, 0.92)',
                    border: '1px solid #00E5C8',
                    color: '#00E5C8',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    padding: '4px 12px',
                    borderRadius: '20px',
                    boxShadow: '0 0 15px rgba(0, 229, 200, 0.3)',
                    letterSpacing: '0.02em',
                  }}
                >
                  Matrice Relationnelle 2D & Handoffs Inter-Agents
                </span>
              </div>
            )}
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
                  Chargement de la vue d'ensemble…
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
        </div>
      ) : (
        <div className="supervisor-history-tab-container">
          <SupervisorHistoryView
            historyData={historyData}
            isLoading={isLoadingFleet}
            onRefresh={handleRefresh}
            onRunAuditNow={handleRunAuditNow}
            isRunningAudit={isRunningAudit}
            tutorialStep={tutorialStep}
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
          unattendedLeads={
            (alertsData?.hotLeads || []).filter(
              (l) => l.agentUuid === selectedNode.id || (Boolean(selectedNode.agent_id) && l.agentId === selectedNode.agent_id)
            )
          }
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

      {/* 3c. Standalone Glassy Pipeline & Funnel Modal */}
      <SupervisorPipelineModal
        isOpen={isPipelineModalOpen}
        onClose={() => setIsPipelineModalOpen(false)}
        funnelData={funnelData}
        isLoading={isLoadingFleet}
      />

      {/* 4. VMind Guide Floating AI Assistant Panel */}
      {tutorialStep > 0 && (
        <VMindGuide
          isOpen={tutorialStep > 0}
          title={getTutorialContent()?.title}
          message={getTutorialContent()?.message || null}
          mood={getTutorialContent()?.mood}
          showBackdrop={false}
          onClose={dismissTutorial}
        >
          <div
            className="vmind-guide-actions"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '14px',
              width: '100%',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                color: '#64748B',
                fontFamily: 'monospace',
                fontWeight: 600,
              }}
            >
              Étape {tutorialStep} sur 8
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={dismissTutorial}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#94A3B8',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Passer
              </button>
              <button
                type="button"
                className="vmind-guide-btn-primary"
                onClick={nextTutorialStep}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 14px',
                  borderRadius: '6px',
                  background: '#00E5C8',
                  color: '#06111F',
                  fontWeight: 700,
                  fontSize: '12px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <span>{tutorialStep < 8 ? 'Suivant' : 'Terminer'}</span>
                <CyberIcon name="arrow-right" size={13} color="currentColor" />
              </button>
            </div>
          </div>
        </VMindGuide>
      )}
    </div>
  );
};
