'use client';

import React, { useState } from 'react';
import { 
  X, GitFork, ArrowRight, CheckCircle2, XCircle, Sliders, AlertOctagon, 
  Sparkles, Loader2, AlertTriangle, ShieldCheck, Zap,
  Building2, MapPin, Briefcase, Users, Check, RefreshCw, BarChart2
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
      setEvalError('Identifiants des agents introuvables pour cette liaison.');
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

  const getDimensionIcon = (dim: string) => {
    const lower = (dim || '').toLowerCase();
    if (lower.includes('secteur') || lower.includes('industrie')) return <Building2 size={13} />;
    if (lower.includes('zone') || lower.includes('géo') || lower.includes('pays') || lower.includes('localisation')) return <MapPin size={13} />;
    if (lower.includes('sénior') || lower.includes('poste') || lower.includes('titre') || lower.includes('fonction')) return <Briefcase size={13} />;
    if (lower.includes('taille') || lower.includes('effectif')) return <Users size={13} />;
    return <Sliders size={13} />;
  };

  const displayScore = evalResult?.evaluation?.sync_score ?? link.alignmentScore;
  const displaySummary = evalResult?.evaluation?.summary ?? link.summary;
  const rejectionsAnalysis = evalResult?.evaluation?.rejections_analysis;
  const aiCriteriaMatrix = evalResult?.evaluation?.criteria_matrix;
  const aiRecommendations = evalResult?.evaluation?.recommendations;

  const statusKey = link.status || 'UNANALYZED';

  return (
    <>
      <div className="diagnostic-drawer-backdrop" onClick={onClose} />
      <aside className="diagnostic-drawer edge-drawer">
        {/* Drawer Header with Connected Flow Bridge */}
        <header className="drawer-header edge-header">
          <div className="edge-header-top">
            <div className="drawer-context-pill">
              <GitFork size={12} className="context-icon" />
              <span>Diagnostic de flux inter-agents</span>
              <span className={`edge-status-pill ${statusKey}`}>
                <span className="pulse-dot" />
                {getStatusLabel(statusKey)}
              </span>
            </div>
            <button className="drawer-close-btn" onClick={onClose} title="Fermer" aria-label="Fermer">
              <X size={17} />
            </button>
          </div>

          <div className="agent-flow-bridge">
            <div className="flow-agent-chip sourcing">
              <span className="chip-role">SOURCING</span>
              <span className="chip-name" title={link.sourceName}>{link.sourceName}</span>
            </div>

            <div className="flow-bridge-connector">
              <div className="flow-track" />
              <div className="flow-volume-tag">
                <ArrowRight size={12} className="flow-arrow" />
                <span>{link.throughput?.leadsTransferred || 0} leads</span>
              </div>
              <div className="flow-track" />
            </div>

            <div className="flow-agent-chip prospect">
              <span className="chip-role">PROSPECTION</span>
              <span className="chip-name" title={link.targetName}>{link.targetName}</span>
            </div>
          </div>
        </header>

        {/* Drawer Scrollable Content */}
        <div className="drawer-content">

          {/* Unified Hero Synchronization & Action Card */}
          <div className={`hero-sync-card ${statusKey.toLowerCase()}`}>
            <div className="hero-sync-top">
              <div className={`score-badge ${statusKey.toLowerCase()}`}>
                <span className="score-val">
                  {displayScore === null || displayScore === undefined ? '—' : `${displayScore}%`}
                </span>
                <span className="score-tag">SYNCHRO</span>
              </div>

              <div className="hero-sync-details">
                <h3 className="hero-sync-title">
                  {statusKey === 'HEALTHY' && 'Liaison Parfaitement Alignée'}
                  {statusKey === 'WARNING' && 'Friction Légère Détectée'}
                  {statusKey === 'CRITICAL' && 'Incohérence de Filtrage Détectée'}
                  {statusKey === 'UNANALYZED' && 'Liaison en Attente d\'Analyse'}
                </h3>
                <p className="hero-sync-desc">
                  {displaySummary || (
                    statusKey === 'HEALTHY'
                      ? 'Les critères de sourcing alimentent de manière fluide le profil cible de prospection.'
                      : 'Un décalage de critères entre la source et la cible impacte le débit utile du pipeline.'
                  )}
                </p>
              </div>
            </div>

            {/* AI Evaluation Button */}
            <div className="hero-ai-action">
              <button
                className={`ai-trigger-btn ${evalResult ? 'evaluated' : ''}`}
                onClick={handleRunAiDiagnostic}
                disabled={isEvaluating}
              >
                {isEvaluating ? (
                  <>
                    <Loader2 size={15} className="spin-icon" />
                    <span>Diagnostic approfondi en cours...</span>
                  </>
                ) : evalResult ? (
                  <>
                    <RefreshCw size={14} className="ai-icon" />
                    <span>Diagnostic IA actualisé • Relancer</span>
                  </>
                ) : (
                  <>
                    <Zap size={14} className="ai-icon" />
                    <span>Lancer le diagnostic IA approfondi</span>
                  </>
                )}
              </button>
              {evalError && (
                <div className="ai-error-banner">
                  <AlertTriangle size={13} />
                  <span>{evalError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Pipeline Throughput Funnel */}
          {link.throughput && (
            <section className="drawer-section">
              <div className="section-header">
                <div className="section-title-wrap">
                  <Sliders size={14} className="section-icon" />
                  <h4 className="section-title">Débit & Entonnoir de Transfert</h4>
                </div>
                <span className="section-kpi-badge">
                  {link.throughput.conversionRate}% retenus
                </span>
              </div>

              <div className="throughput-flow-strip">
                <div className="throughput-step">
                  <span className="t-label">Transférés</span>
                  <span className="t-val text-cyan">{link.throughput.leadsTransferred}</span>
                  <span className="t-sub">Sourcing amont</span>
                </div>

                <div className="throughput-bridge">
                  <div className="bridge-track">
                    <div 
                      className="bridge-fill" 
                      style={{ 
                        width: `${Math.min(100, Math.max(0, link.throughput.conversionRate))}%`,
                        background: link.throughput.conversionRate < 50 ? '#FF4757' : 'linear-gradient(90deg, #00E5C8, #00E5A0)'
                      }} 
                    />
                  </div>
                  <span className="bridge-stat">
                    <ArrowRight size={11} />
                    {link.throughput.conversionRate}% qualifiés
                  </span>
                </div>

                <div className="throughput-step">
                  <span className="t-label">Qualifiés</span>
                  <span className="t-val text-emerald">{link.throughput.leadsQualified}</span>
                  <span className="t-sub">Prospection aval</span>
                </div>

                <div className="throughput-step rejected">
                  <span className="t-label">Écartés</span>
                  <span className={`t-val ${link.throughput.leadsRejected > 0 ? 'text-coral' : 'text-muted'}`}>
                    {link.throughput.leadsRejected}
                  </span>
                  <span className="t-sub">Non qualifiés</span>
                </div>
              </div>
            </section>
          )}

          {/* Root-cause Rejections Analysis */}
          {rejectionsAnalysis && (
            <section className="drawer-section">
              <div className="section-header">
                <div className="section-title-wrap">
                  <AlertTriangle size={14} style={{ color: '#FF4757' }} />
                  <h4 className="section-title">Cause Racine des Rejets</h4>
                </div>
                <span className="section-kpi-badge warning">Analyse IA</span>
              </div>
              <div className="root-cause-card">
                <p>{rejectionsAnalysis}</p>
              </div>
            </section>
          )}

          {/* Criteria Alignment Matrix */}
          <section className="drawer-section">
            <div className="section-header">
              <div className="section-title-wrap">
                <CheckCircle2 size={14} className="section-icon text-cyan" />
                <h4 className="section-title">
                  {Array.isArray(aiCriteriaMatrix) && aiCriteriaMatrix.length > 0
                    ? 'Matrice d\'Alignement Sémantique IA'
                    : 'Matrice de Correspondance des Filtres'}
                </h4>
              </div>
              <span className="section-kpi-badge">
                {Array.isArray(aiCriteriaMatrix) && aiCriteriaMatrix.length > 0 ? 'Deep AI' : 'Filtres ICP'}
              </span>
            </div>

            <div className="matrix-cards-list">
              {Array.isArray(aiCriteriaMatrix) && aiCriteriaMatrix.length > 0 ? (
                // AI Evaluated Matrix
                aiCriteriaMatrix.map((item: any, idx: number) => {
                  const isMatch = item.statut === 'aligne';
                  const isPartial = item.statut === 'partiel';
                  const matchStatus = isMatch ? 'match' : isPartial ? 'partial' : 'mismatch';

                  return (
                    <div key={idx} className={`matrix-card ${matchStatus}`}>
                      <div className="matrix-card-top">
                        <div className="matrix-dim-header">
                          <span className="dim-icon">{getDimensionIcon(item.critere)}</span>
                          <span className="dim-title">{item.critere}</span>
                        </div>
                        <span className={`matrix-status-chip ${matchStatus}`}>
                          {isMatch ? (
                            <>
                              <CheckCircle2 size={11} />
                              <span>Aligné</span>
                            </>
                          ) : isPartial ? (
                            <>
                              <AlertTriangle size={11} />
                              <span>Partiel</span>
                            </>
                          ) : (
                            <>
                              <XCircle size={11} />
                              <span>Discordance</span>
                            </>
                          )}
                        </span>
                      </div>

                      <div className="matrix-compare-grid">
                        <div className="compare-col sourcing">
                          <span className="col-badge sourcing">
                            <span className="dot cyan" /> SOURCING
                          </span>
                          <span className="col-content">{item.sourcing || 'Non spécifié'}</span>
                        </div>

                        <div className="compare-arrow">
                          <ArrowRight size={13} />
                        </div>

                        <div className="compare-col prospect">
                          <span className="col-badge prospect">
                            <span className="dot purple" /> PROSPECTION
                          </span>
                          <span className="col-content">{item.prospect || 'Tous profils'}</span>
                        </div>
                      </div>

                      {item.explication && (
                        <div className="matrix-note-row">
                          <span className="note-bulb">💡</span>
                          <span className="note-text">{item.explication}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : link.alignmentMatrix && link.alignmentMatrix.length > 0 ? (
                // Baseline Link Alignment Matrix
                link.alignmentMatrix.map((item, idx) => {
                  const matchStatus = item.isMatch ? 'match' : 'mismatch';
                  return (
                    <div key={idx} className={`matrix-card ${matchStatus}`}>
                      <div className="matrix-card-top">
                        <div className="matrix-dim-header">
                          <span className="dim-icon">{getDimensionIcon(item.dimension)}</span>
                          <span className="dim-title">{item.dimension}</span>
                        </div>
                        <span className={`matrix-status-chip ${matchStatus}`}>
                          {item.isMatch ? (
                            <>
                              <CheckCircle2 size={11} />
                              <span>Aligné</span>
                            </>
                          ) : (
                            <>
                              <XCircle size={11} />
                              <span>Discordance</span>
                            </>
                          )}
                        </span>
                      </div>

                      <div className="matrix-compare-grid">
                        <div className="compare-col sourcing">
                          <span className="col-badge sourcing">
                            <span className="dot cyan" /> SOURCING
                          </span>
                          <span className="col-content">{item.sourcingValue || 'Mission amont'}</span>
                        </div>

                        <div className="compare-arrow">
                          <ArrowRight size={13} />
                        </div>

                        <div className="compare-col prospect">
                          <span className="col-badge prospect">
                            <span className="dot purple" /> PROSPECTION
                          </span>
                          <span className="col-content">{item.prospectValue || 'Tous profils'}</span>
                        </div>
                      </div>

                      {item.note && (
                        <div className="matrix-note-row">
                          <span className="note-bulb">ℹ️</span>
                          <span className="note-text">{item.note}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="matrix-empty-card">
                  <span>Aucun critère spécifique requis pour cette liaison.</span>
                </div>
              )}
            </div>
          </section>

          {/* Recommendations & Adjustments */}
          <section className="drawer-section">
            <div className="section-header">
              <div className="section-title-wrap">
                <Sliders size={14} className="section-icon" />
                <h4 className="section-title">
                  {aiRecommendations ? 'Recommandations d\'Optimisation IA' : 'Ajustements Recommandés'}
                </h4>
              </div>
            </div>

            {aiRecommendations ? (
              <div className="recommendations-container">
                {aiRecommendations.ajustement_sourcing && (
                  <div className="rec-card sourcing-card">
                    <div className="rec-card-header">
                      <div className="rec-meta">
                        <span className="rec-agent-tag sourcing">{link.sourceName}</span>
                        <h5 className="rec-subject">Ajustement du Ciblage Sourcing</h5>
                      </div>
                      <span className="rec-impact high">Action Immédiate</span>
                    </div>
                    <p className="rec-body">{aiRecommendations.ajustement_sourcing}</p>
                  </div>
                )}
                {aiRecommendations.ajustement_prospection && (
                  <div className="rec-card prospect-card">
                    <div className="rec-card-header">
                      <div className="rec-meta">
                        <span className="rec-agent-tag prospect">{link.targetName}</span>
                        <h5 className="rec-subject">Ajustement des Critères ICP</h5>
                      </div>
                      <span className="rec-impact medium">Optimisation</span>
                    </div>
                    <p className="rec-body">{aiRecommendations.ajustement_prospection}</p>
                  </div>
                )}
              </div>
            ) : link.recommendations.length === 0 ? (
              <div className="perfect-alignment-card">
                <div className="perfect-icon-glow">
                  <ShieldCheck size={26} />
                </div>
                <div className="perfect-text-wrap">
                  <h5 className="perfect-title">Liaison Optimale & Sans Friction</h5>
                  <p className="perfect-desc">
                    Les critères de l&apos;agent de sourcing alimentent à 100% le profil cible de prospection.
                    Aucun conflit ni déperdition de leads n&apos;a été détecté sur cette liaison.
                  </p>
                </div>
              </div>
            ) : (
              <div className="recommendations-container">
                {link.recommendations.map(rec => (
                  <div key={rec.id} className="rec-card standard-card">
                    <div className="rec-card-header">
                      <div className="rec-meta">
                        <span className="rec-agent-tag default">{rec.targetAgentName || 'Agent'}</span>
                        <h5 className="rec-subject">{rec.label}</h5>
                      </div>
                      <span className={`rec-impact ${rec.impact}`}>
                        Impact {rec.impact === 'high' ? 'Élevé' : 'Moyen'}
                      </span>
                    </div>

                    <div className="rec-diff-row">
                      <span className="diff-from">{rec.currentValue}</span>
                      <ArrowRight size={13} className="diff-arrow" />
                      <span className="diff-to">{rec.suggestedValue}</span>
                    </div>

                    <p className="rec-body">
                      <strong>Raison :</strong> {rec.rationale}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </aside>
    </>
  );
};
