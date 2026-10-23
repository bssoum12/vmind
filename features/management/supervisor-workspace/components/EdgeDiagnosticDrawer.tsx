'use client';

import React, { useState } from 'react';
import { 
  X, GitFork, ArrowRight, CheckCircle2, XCircle, Sliders, AlertOctagon, 
  Sparkles, Loader2, AlertTriangle, ShieldCheck, Zap 
} from 'lucide-react';
import { SupervisorLink } from '../types/supervisor.types';

interface EdgeDiagnosticDrawerProps {
  link: SupervisorLink;
  onClose: () => void;
}

export const EdgeDiagnosticDrawer: React.FC<EdgeDiagnosticDrawerProps> = ({
  link,
  onClose,
}) => {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<any>(null);
  const [evalError, setEvalError] = useState<string | null>(null);

  const sourceUuid = link.sourceUuid || (typeof link.source === 'string' ? link.source : (link.source as any)?.id);
  const targetUuid = link.targetUuid || (typeof link.target === 'string' ? link.target : (link.target as any)?.id);

  const handleRunAiDiagnostic = async () => {
    if (!sourceUuid || !targetUuid) {
      setEvalError("Identifiants des agents introuvables pour cette liaison.");
      return;
    }

    setIsEvaluating(true);
    setEvalError(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';
      const res = await fetch(`${baseUrl}/api/supervisor/evaluate-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          source_agent_uuid: sourceUuid,
          target_agent_uuid: targetUuid
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Erreur lors du diagnostic IA');
      }

      const data = await res.json();
      setEvalResult(data);
    } catch (err: any) {
      console.error('[EdgeDiagnosticDrawer] Error evaluating link:', err);
      setEvalError(err.message || 'Impossible d\'exécuter le diagnostic de liaison');
    } finally {
      setIsEvaluating(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'Liaison Alignée';
      case 'WARNING': return 'Friction détectée';
      case 'CRITICAL': return 'Incohérence majeure';
      default: return 'Non analysée';
    }
  };

  const displayScore = evalResult?.evaluation?.sync_score ?? link.alignmentScore;
  const displaySummary = evalResult?.evaluation?.summary ?? link.summary;
  const rejectionsAnalysis = evalResult?.evaluation?.rejections_analysis;
  const aiCriteriaMatrix = evalResult?.evaluation?.criteria_matrix;
  const aiRecommendations = evalResult?.evaluation?.recommendations;

  return (
    <>
      <div className="diagnostic-drawer-backdrop" onClick={onClose} />
      <aside className="diagnostic-drawer">
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-title-group">
            <div className="drawer-tag-row">
              <span className="drawer-type-badge link">
                <GitFork size={11} style={{ marginRight: '4px' }} />
                Liaison Pipeline
              </span>
              <span className={`status-badge ${link.status}`}>
                {getStatusLabel(link.status)}
              </span>
            </div>
            <h2 className="drawer-name" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span>{link.sourceName}</span>
              <ArrowRight size={16} style={{ color: '#00E5C8' }} />
              <span>{link.targetName}</span>
            </h2>
          </div>
          <button className="drawer-close-btn" onClick={onClose} title="Fermer">
            <X size={18} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="drawer-content">
          {/* OmniRoute Action Button */}
          <div style={{ marginBottom: '16px' }}>
            <button
              className="link-audit-btn"
              onClick={handleRunAiDiagnostic}
              disabled={isEvaluating}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 16px',
                borderRadius: '8px',
                background: evalResult 
                  ? 'linear-gradient(135deg, rgba(0, 229, 200, 0.12) 0%, rgba(157, 78, 221, 0.15) 100%)'
                  : 'linear-gradient(135deg, rgba(0, 229, 200, 0.22) 0%, rgba(157, 78, 221, 0.25) 100%)',
                border: '1px solid rgba(0, 229, 200, 0.45)',
                color: '#F0F4F8',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isEvaluating ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 18px rgba(0, 229, 200, 0.12)'
              }}
            >
              {isEvaluating ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Diagnostic approfondi en cours...</span>
                </>
              ) : evalResult ? (
                <>
                  <Sparkles size={16} style={{ color: '#00E5C8' }} />
                  <span>Actualiser le Diagnostic IA</span>
                </>
              ) : (
                <>
                  <Zap size={16} style={{ color: '#00E5C8' }} />
                  <span>Lancer le Diagnostic IA Approfondi</span>
                </>
              )}
            </button>
            {evalError && (
              <div style={{ marginTop: '8px', color: '#FF4757', fontSize: '12px', textAlign: 'center' }}>
                ⚠️ {evalError}
              </div>
            )}
          </div>

          {/* Alignment Score Card */}
          <div className="health-score-card">
            <div className="gauge-text">
              <span className="gauge-label">Score de Synchronisation Inter-Agents</span>
              <span className="gauge-status-desc">
                {link.status === 'HEALTHY' && 'Les critères de sourcing alimentent adéquatement l\'agent de prospection.'}
                {link.status === 'WARNING' && 'Quelques discordances de filtres réduisent le débit qualifié.'}
                {link.status === 'CRITICAL' && 'Perte de leads : le ciblage amont est en décalage avec les critères aval.'}
                {link.status === 'UNANALYZED' && 'Liaison en attente d\'analyse comparative.'}
              </span>
            </div>
            <div className={`gauge-score-value ${link.status.toLowerCase()}`}>
              {displayScore === null || displayScore === undefined ? '—' : `${displayScore}%`}
            </div>
          </div>

          {/* Diagnostic Summary */}
          {displaySummary && (
            <div className="drawer-section">
              <div className="section-heading">
                <AlertOctagon size={15} />
                <span>Diagnostic de Cohérence</span>
              </div>
              <div className="summary-box">
                {displaySummary}
              </div>
            </div>
          )}

          {/* Root-cause Rejections Analysis (from OmniRoute) */}
          {rejectionsAnalysis && (
            <div className="drawer-section">
              <div className="section-heading">
                <AlertTriangle size={15} style={{ color: '#FF4757' }} />
                <span>Analyse de la Cause Racine des Rejets</span>
              </div>
              <div 
                className="summary-box" 
                style={{ 
                  borderLeft: '3px solid #FF4757', 
                  background: 'rgba(255, 71, 87, 0.08)', 
                  color: '#F0F4F8',
                  lineHeight: '1.5'
                }}
              >
                {rejectionsAnalysis}
              </div>
            </div>
          )}

          {/* Throughput & Funnel */}
          {link.throughput && (
            <div className="drawer-section">
              <div className="section-heading">
                <Sliders size={15} />
                <span>Débit du Pipeline</span>
              </div>
              <div className="funnel-grid">
                <div className="funnel-card">
                  <span className="funnel-label">Leads Transférés</span>
                  <span className="funnel-number">{link.throughput.leadsTransferred}</span>
                </div>
                <div className="funnel-card">
                  <span className="funnel-label">Leads Qualifiés</span>
                  <span className="funnel-number" style={{ color: '#00E5A0' }}>
                    {link.throughput.leadsQualified}
                  </span>
                </div>
                <div className="funnel-card">
                  <span className="funnel-label">Taux d'Acceptation</span>
                  <span className="funnel-number" style={{ color: link.throughput.conversionRate < 50 ? '#FF4757' : '#00E5A0' }}>
                    {link.throughput.conversionRate}%
                  </span>
                </div>
                <div className="funnel-card">
                  <span className="funnel-label">Leads Non Retenus</span>
                  <span className="funnel-number" style={{ color: '#FF4757' }}>
                    {link.throughput.leadsRejected}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* AI Criteria Alignment Matrix (If evaluated via OmniRoute) */}
          {Array.isArray(aiCriteriaMatrix) && aiCriteriaMatrix.length > 0 ? (
            <div className="drawer-section">
              <div className="section-heading">
                <Sparkles size={15} style={{ color: '#00E5C8' }} />
                <span>Matrice d'Alignement Sémantique</span>
              </div>
              <div className="criteria-matrix">
                {aiCriteriaMatrix.map((item: any, idx: number) => {
                  const isMatch = item.statut === 'aligne';
                  const isPartial = item.statut === 'partiel';
                  return (
                    <div key={idx} className="matrix-row" style={{ flexDirection: 'column', gap: '8px', alignItems: 'stretch' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div className="matrix-dimension" style={{ fontWeight: 600, color: '#F0F4F8' }}>
                          {isMatch ? (
                            <CheckCircle2 size={14} style={{ color: '#00E5A0', flexShrink: 0 }} />
                          ) : isPartial ? (
                            <AlertTriangle size={14} style={{ color: '#FFB800', flexShrink: 0 }} />
                          ) : (
                            <XCircle size={14} style={{ color: '#FF4757', flexShrink: 0 }} />
                          )}
                          <span>{item.critere}</span>
                        </div>
                        <span 
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            background: isMatch ? 'rgba(0, 229, 160, 0.15)' : isPartial ? 'rgba(255, 184, 0, 0.15)' : 'rgba(255, 71, 87, 0.15)',
                            color: isMatch ? '#00E5A0' : isPartial ? '#FFB800' : '#FF4757',
                            border: `1px solid ${isMatch ? 'rgba(0, 229, 160, 0.3)' : isPartial ? 'rgba(255, 184, 0, 0.3)' : 'rgba(255, 71, 87, 0.3)'}`
                          }}
                        >
                          {item.statut === 'aligne' ? 'Aligné' : item.statut === 'partiel' ? 'Partiel' : 'Discordant'}
                        </span>
                      </div>

                      <div className="matrix-values">
                        <div className="val-pill" style={{ flex: 1 }}>
                          <span className="agent-role-mini">Sourcing</span>
                          <span className="val-text" style={{ fontSize: '11px' }}>{item.sourcing}</span>
                        </div>
                        <ArrowRight size={12} style={{ color: '#8FA3B8', flexShrink: 0 }} />
                        <div className="val-pill" style={{ flex: 1 }}>
                          <span className="agent-role-mini">Prospect</span>
                          <span className="val-text" style={{ fontSize: '11px' }}>{item.prospect}</span>
                        </div>
                      </div>

                      {item.explication && (
                        <div style={{ fontSize: '11px', color: '#8FA3B8', padding: '4px 8px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px' }}>
                          💡 {item.explication}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Baseline Criteria Alignment Matrix */
            link.alignmentMatrix && link.alignmentMatrix.length > 0 && (
              <div className="drawer-section">
                <div className="section-heading">
                  <CheckCircle2 size={15} />
                  <span>Matrice d'Alignement des Filtres</span>
                </div>
                <div className="criteria-matrix">
                  {link.alignmentMatrix.map((item, idx) => (
                    <div key={idx} className="matrix-row">
                      <div className="matrix-dimension">
                        {item.isMatch ? (
                          <CheckCircle2 size={13} style={{ color: '#00E5A0', flexShrink: 0 }} />
                        ) : (
                          <XCircle size={13} style={{ color: '#FF4757', flexShrink: 0 }} />
                        )}
                        <span>{item.dimension}</span>
                      </div>
                      <div className="matrix-values">
                        <div className="val-pill">
                          <span className="agent-role-mini">Sourcing</span>
                          <span className="val-text">{item.sourcingValue}</span>
                        </div>
                        <ArrowRight size={12} style={{ color: '#8FA3B8', flexShrink: 0 }} />
                        <div className="val-pill">
                          <span className="agent-role-mini">Prospect</span>
                          <span className="val-text">{item.prospectValue}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

          {/* AI Concrete Recommendations (OmniRoute) */}
          {aiRecommendations ? (
            <div className="drawer-section">
              <div className="section-heading">
                <Sliders size={15} />
                <span>Recommandations d'Ajustements IA</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {aiRecommendations.ajustement_sourcing && (
                  <div className="recommendation-card" style={{ borderLeft: '3px solid #00E5C8' }}>
                    <div className="rec-header">
                      <div>
                        <div style={{ fontSize: '11px', color: '#00E5C8', fontWeight: 700 }}>
                          Agent Fournisseur : {link.sourceName}
                        </div>
                        <span className="rec-label">Ajustement du Ciblage Sourcing</span>
                      </div>
                      <span className="impact-badge high">Action Immédiate</span>
                    </div>
                    <p className="rationale-text" style={{ marginTop: '8px' }}>
                      {aiRecommendations.ajustement_sourcing}
                    </p>
                  </div>
                )}
                {aiRecommendations.ajustement_prospection && (
                  <div className="recommendation-card" style={{ borderLeft: '3px solid #C77DFF' }}>
                    <div className="rec-header">
                      <div>
                        <div style={{ fontSize: '11px', color: '#C77DFF', fontWeight: 700 }}>
                          Agent Qualificateur : {link.targetName}
                        </div>
                        <span className="rec-label">Ajustement des Critères ICP</span>
                      </div>
                      <span className="impact-badge medium">Optimisation</span>
                    </div>
                    <p className="rationale-text" style={{ marginTop: '8px' }}>
                      {aiRecommendations.ajustement_prospection}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Baseline Friction Recommendations */
            <div className="drawer-section">
              <div className="section-heading">
                <Sliders size={15} />
                <span>Ajustements Recommandés ({link.recommendations.length})</span>
              </div>
              {link.recommendations.length === 0 ? (
                <div className="summary-box" style={{ color: '#00E5A0', textAlign: 'center' }}>
                  ✓ Aucun conflit détecté sur cette liaison. Les deux agents collaborent de façon optimale.
                </div>
              ) : (
                link.recommendations.map(rec => (
                  <div key={rec.id} className="recommendation-card">
                    <div className="rec-header">
                      <div>
                        <div style={{ fontSize: '11px', color: '#00E5C8', fontWeight: 700 }}>
                          Agent Cible : {rec.targetAgentName}
                        </div>
                        <span className="rec-label">{rec.label}</span>
                      </div>
                      <span className={`impact-badge ${rec.impact}`}>
                        Impact {rec.impact === 'high' ? 'Élevé' : 'Moyen'}
                      </span>
                    </div>

                    <div className="diff-row">
                      <span className="diff-from">{rec.currentValue}</span>
                      <ArrowRight size={14} className="diff-arrow" />
                      <span className="diff-to">{rec.suggestedValue}</span>
                    </div>

                    <p className="rationale-text">
                      <strong>Pourquoi :</strong> {rec.rationale}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

