'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, Building2, Sliders, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { SupervisorGraphCanvas } from './SupervisorGraphCanvas';
import { NodeDiagnosticDrawer } from './NodeDiagnosticDrawer';
import { EdgeDiagnosticDrawer } from './EdgeDiagnosticDrawer';
import { FullFleetAuditModal } from './FullFleetAuditModal';
import { CompanyContextModal } from './CompanyContextModal';
import {
  INITIAL_NODES,
  INITIAL_LINKS,
  INITIAL_FLEET_SUMMARY,
  INITIAL_COMPANY_CONTEXT
} from '../mock/mockSupervisorData';
import { SupervisorNode, SupervisorLink, CompanyContext, FleetAuditSummary } from '../types/supervisor.types';
import '../supervisor-workspace.scss';

interface SupervisorWorkspaceProps {
  agentId?: string;
  agentName?: string;
}

export const SupervisorWorkspace: React.FC<SupervisorWorkspaceProps> = ({
  agentId = 'mock-supervisor-01',
  agentName = 'Superviseur Commercial - A9B2X1'
}) => {
  const router = useRouter();

  // State
  const [nodes, setNodes] = useState<SupervisorNode[]>(INITIAL_NODES);
  const [links, setLinks] = useState<SupervisorLink[]>(INITIAL_LINKS);
  const [fleetSummary, setFleetSummary] = useState<FleetAuditSummary>(INITIAL_FLEET_SUMMARY);
  const [companyContext, setCompanyContext] = useState<CompanyContext>(INITIAL_COMPANY_CONTEXT);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);

  const [isFleetAuditOpen, setIsFleetAuditOpen] = useState(false);
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);

  // Computed selection objects
  const selectedNode = useMemo(() => {
    return nodes.find(n => n.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  const selectedLink = useMemo(() => {
    return links.find(l => l.id === selectedLinkId) || null;
  }, [links, selectedLinkId]);

  // Node selection
  const handleSelectNode = (node: SupervisorNode) => {
    setSelectedNodeId(node.id);
    setSelectedLinkId(null);
  };

  // Link selection
  const handleSelectLink = (link: SupervisorLink) => {
    setSelectedLinkId(link.id);
    setSelectedNodeId(null);
  };

  // Clear selection
  const handleClearSelection = () => {
    setSelectedNodeId(null);
    setSelectedLinkId(null);
  };

  // Apply recommendation handler (Dynamic real-time improvement simulation)
  const handleApplyRecommendation = (recId: string) => {
    // 1. Update nodes
    setNodes(prevNodes =>
      prevNodes.map(node => {
        const hasRec = node.recommendations.some(r => r.id === recId);
        if (!hasRec) return node;

        const updatedRecs = node.recommendations.map(r =>
          r.id === recId ? { ...r, applied: true } : r
        );

        // Check if all recommendations are now applied
        const allApplied = updatedRecs.every(r => r.applied);
        const newScore = Math.min(95, node.healthScore + 20);
        const newStatus = allApplied ? 'HEALTHY' : 'WARNING';

        return {
          ...node,
          recommendations: updatedRecs,
          healthScore: newScore,
          status: newStatus
        };
      })
    );

    // 2. Update links
    setLinks(prevLinks =>
      prevLinks.map(link => {
        const hasRec = link.recommendations.some(r => r.id === recId);
        if (!hasRec) return link;

        const updatedRecs = link.recommendations.map(r =>
          r.id === recId ? { ...r, applied: true } : r
        );

        const newScore = Math.min(92, link.alignmentScore + 25);
        const allApplied = updatedRecs.every(r => r.applied);
        const newStatus = allApplied ? 'HEALTHY' : 'WARNING';

        return {
          ...link,
          recommendations: updatedRecs,
          alignmentScore: newScore,
          status: newStatus
        };
      })
    );

    // Boost overall fleet score
    setFleetSummary(prev => ({
      ...prev,
      overallScore: Math.min(96, prev.overallScore + 6)
    }));
  };

  // Targeted audit simulation (single node)
  const handleTriggerTargetedAudit = async (nodeId: string) => {
    await new Promise(resolve => setTimeout(resolve, 1400));

    setNodes(prevNodes =>
      prevNodes.map(n => {
        if (n.id !== nodeId) return n;
        return {
          ...n,
          status: 'HEALTHY',
          healthScore: 89,
          summary: 'Audit ciblé complété. Les paramètres ont été vérifiés avec succès et sont conformes aux objectifs de prospection.',
          findings: [
            {
              id: `find-audit-${Date.now()}`,
              severity: 'info',
              title: 'Paramètres vérifiés',
              description: 'Cadence d\'exécution et filtres géographiques en harmonie avec le marché cible.'
            }
          ]
        };
      })
    );
  };

  // Targeted audit simulation (single link)
  const handleTriggerTargetedLinkAudit = async (linkId: string) => {
    await new Promise(resolve => setTimeout(resolve, 1400));

    setLinks(prevLinks =>
      prevLinks.map(l => {
        if (l.id !== linkId) return l;
        return {
          ...l,
          status: 'HEALTHY',
          alignmentScore: 90,
          summary: 'Audit de synchronisation terminé. La liaison entre les deux agents a été analysée avec succès.',
          alignmentMatrix: [
            {
              dimension: 'Compatibilité Globale',
              sourcingValue: 'Format Standardisé',
              prospectValue: 'Critères Valides',
              isMatch: true,
              note: 'Les contacts transférés correspondent désormais aux attentes de l\'ICP.'
            }
          ]
        };
      })
    );
  };

  // Full fleet audit completion
  const handleCompleteFullAudit = () => {
    setNodes(prev =>
      prev.map(n => (n.status === 'UNANALYZED' ? { ...n, status: 'HEALTHY', healthScore: 84 } : n))
    );
    setLinks(prev =>
      prev.map(l => (l.status === 'UNANALYZED' ? { ...l, status: 'HEALTHY', alignmentScore: 88 } : l))
    );
    setFleetSummary(prev => ({
      ...prev,
      lastAuditedAt: 'À l\'instant',
      overallScore: 88,
      unanalyzedCount: 0,
      healthyCount: 4,
      warningCount: 1,
      criticalCount: 1
    }));
  };

  // Counts
  const healthyCount = nodes.filter(n => n.status === 'HEALTHY').length;
  const warningCount = nodes.filter(n => n.status === 'WARNING').length;
  const criticalCount = nodes.filter(n => n.status === 'CRITICAL').length;
  const unanalyzedCount = nodes.filter(n => n.status === 'UNANALYZED').length;

  return (
    <div className="supervisor-workspace-container">
      {/* 1. Apple-Style Unified Translucent Header */}
      <header className="supervisor-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => router.push('/')} title="Retour à l'accueil">
            <ArrowLeft size={16} />
          </button>
          <div className="agent-title-block">
            <div className="agent-badge-row">
              <span className="role-tag">Superviseur IA</span>
              <span className="status-dot" />
              <span className="last-audit">Audit : {fleetSummary.lastAuditedAt}</span>
            </div>
            <div className="agent-name">{agentName}</div>
          </div>
        </div>

        {/* Center: Apple-style Translucent Segmented Fleet Status Capsule */}
        <div className="header-center-pill">
          <div className="fleet-score-badge">
            <span className="score-ring-dot" />
            <span className="score-text">{fleetSummary.overallScore}%</span>
            <span className="score-sub">Santé Flotte</span>
          </div>
          <div className="capsule-divider" />
          <div className="fleet-status-chips">
            <span className="status-chip healthy" title={`${healthyCount} agents sains`}>
              <span className="chip-dot" />
              <span>{healthyCount} Sain{healthyCount > 1 ? 's' : ''}</span>
            </span>
            {warningCount > 0 && (
              <span className="status-chip warning" title={`${warningCount} avertissements`}>
                <span className="chip-dot" />
                <span>{warningCount} Alerte{warningCount > 1 ? 's' : ''}</span>
              </span>
            )}
            {criticalCount > 0 && (
              <span className="status-chip critical" title={`${criticalCount} incohérences`}>
                <span className="chip-dot" />
                <span>{criticalCount} Incohérence{criticalCount > 1 ? 's' : ''}</span>
              </span>
            )}
            {unanalyzedCount > 0 && (
              <span className="status-chip unanalyzed" title={`${unanalyzedCount} non analysés`}>
                <span className="chip-dot" />
                <span>{unanalyzedCount} En attente</span>
              </span>
            )}
          </div>
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
            onClick={() => setIsFleetAuditOpen(true)}
            title="Lancer une analyse complète de tous les agents et dépendances"
          >
            <Sparkles size={15} />
            <span>Lancer un Audit</span>
          </button>
        </div>
      </header>

      {/* 3. Obsidian-Style Interactive Graph Canvas */}
      <SupervisorGraphCanvas
        nodes={nodes}
        links={links}
        selectedNodeId={selectedNodeId}
        selectedLinkId={selectedLinkId}
        onSelectNode={handleSelectNode}
        onSelectLink={handleSelectLink}
        onClearSelection={handleClearSelection}
      />

      {/* 4. Sliding Diagnostic Drawers */}
      {selectedNode && (
        <NodeDiagnosticDrawer
          node={selectedNode}
          onClose={handleClearSelection}
          onApplyRecommendation={handleApplyRecommendation}
          onTriggerTargetedAudit={handleTriggerTargetedAudit}
        />
      )}

      {selectedLink && (
        <EdgeDiagnosticDrawer
          link={selectedLink}
          onClose={handleClearSelection}
          onApplyRecommendation={handleApplyRecommendation}
          onTriggerTargetedAudit={handleTriggerTargetedLinkAudit}
        />
      )}

      {/* 5. Modals */}
      {isFleetAuditOpen && (
        <FullFleetAuditModal
          summary={fleetSummary}
          onClose={() => setIsFleetAuditOpen(false)}
          onCompleteAudit={handleCompleteFullAudit}
        />
      )}

      {isContextModalOpen && (
        <CompanyContextModal
          context={companyContext}
          onClose={() => setIsContextModalOpen(false)}
          onSaveContext={setCompanyContext}
        />
      )}
    </div>
  );
};
