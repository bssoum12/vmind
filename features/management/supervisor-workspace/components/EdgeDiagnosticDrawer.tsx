'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, GitFork, ArrowRight, CheckCircle2, XCircle, Sliders, AlertOctagon, 
  Sparkles, Loader2, AlertTriangle, ShieldCheck, Zap,
  Building2, MapPin, Briefcase, Users, Check, RefreshCw, BarChart2, Clock
} from 'lucide-react';
import { SupervisorLink } from '../types/supervisor.types';
import { useToast } from '@/shared/contexts/ToastContext';

interface EdgeDiagnosticDrawerProps {
  link: SupervisorLink;
  supervisorId?: string;
  onClose: () => void;
  onEvaluationComplete?: (link: SupervisorLink, data: any) => void;
}

export const EdgeDiagnosticDrawer: React.FC<EdgeDiagnosticDrawerProps> = ({
  link,
  supervisorId,
  onClose,
  onEvaluationComplete,
}) => {
  const { showToast } = useToast();
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<any>(() => {
    if (link.evaluation) {
      return {
        success: true,
        cached: true,
        evaluation: link.evaluation.evaluation || link.evaluation,
        metrics: link.evaluation.metrics || link.throughput,
        evaluated_at: link.lastEvaluatedAt
      };
    }
    return null;
  });
  const [cachedNotice, setCachedNotice] = useState<string | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);

  useEffect(() => {
    if (link.evaluation) {
      setEvalResult({
        success: true,
        cached: true,
        evaluation: link.evaluation.evaluation || link.evaluation,
        metrics: link.evaluation.metrics || link.throughput,
        evaluated_at: link.lastEvaluatedAt
      });
    } else {
      setEvalResult(null);
    }
    setCachedNotice(null);
    setEvalError(null);
  }, [link.id, link.evaluation, link.lastEvaluatedAt]);

  const sourceUuid = link.sourceUuid || (typeof link.source === 'string' ? link.source : (link.source as any)?.id);
  const targetUuid = link.targetUuid || (typeof link.target === 'string' ? link.target : (link.target as any)?.id);

  const handleRunAiDiagnostic = async (force: boolean = false) => {
    if (!sourceUuid || !targetUuid) {
      const err = 'Identifiants des agents introuvables pour cette liaison.';
      setEvalError(err);
      showToast(err, 'err');
      return;
    }

    setIsEvaluating(true);
    setEvalError(null);
    setCachedNotice(null);
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
          target_agent_uuid: targetUuid,
          supervisor_agent_uuid: supervisorId || null,
          force
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Erreur lors du diagnostic IA');
      }

      const data = await res.json();
      setEvalResult(data);

      if (data.cached) {
        const msg = data.message || "Aucun nouveau lead n'a été transféré depuis la dernière analyse. Les résultats précédents restent valides.";
        setCachedNotice(msg);
        showToast("Aucun nouveau lead transféré. Les résultats affichés sont à jour.", "info");
      } else {
        setCachedNotice(null);
        showToast(force ? "Nouvelle analyse IA forcée avec succès" : "Diagnostic IA de liaison complété avec succès", "ok");
      }

      if (onEvaluationComplete) {
        onEvaluationComplete(link, data);
      }
    } catch (err: any) {
      console.error('[EdgeDiagnosticDrawer] Error evaluating link:', err);
      const errMsg = err.message || 'Impossible d\'exécuter le diagnostic de liaison';
      setEvalError(errMsg);
      showToast(errMsg, 'err');
    } finally {
      setIsEvaluating(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'Alignée';
      case 'WARNING': return 'Friction';
      case 'CRITICAL': return 'Discordance';
      default: return 'En attente';
    }
  };

  const getDimensionIcon = (dim: string) => {
    const lower = (dim || '').toLowerCase();
    if (lower.includes('secteur') || lower.includes('industrie')) return <Building2 size={14} />;
    if (lower.includes('zone') || lower.includes('géo') || lower.includes('pays') || lower.includes('localisation')) return <MapPin size={14} />;
    if (lower.includes('sénior') || lower.includes('poste') || lower.includes('titre') || lower.includes('fonction')) return <Briefcase size={14} />;
    if (lower.includes('taille') || lower.includes('effectif')) return <Users size={14} />;
    return <Sliders size={14} />;
  };

  const displayScore = evalResult?.evaluation?.sync_score ?? link.alignmentScore;
  const displaySummary = evalResult?.evaluation?.summary ?? link.summary;
  const rejectionsAnalysis = evalResult?.evaluation?.rejections_analysis;
  const aiCriteriaMatrix = evalResult?.evaluation?.criteria_matrix;
  const aiRecommendations = evalResult?.evaluation?.recommendations;
  const evaluatedAt = evalResult?.evaluated_at || link.lastEvaluatedAt;

  const statusKey = link.status || 'UNANALYZED';

  return (
    <>
      <div className="diagnostic-drawer-backdrop" onClick={onClose} />
      <aside className="diagnostic-drawer edge-drawer apple-style">
        {/* Apple Minimalist Header */}
        <header className="drawer-header edge-header-apple">
          <div className="header-top-row">
            <div className="header-meta">
              <span className="eyebrow-tag">Flux Inter-Agents</span>
              <span className={`status-dot-badge ${statusKey.toLowerCase()}`}>
                <span className="dot" />
                <span>{getStatusLabel(statusKey)}</span>
              </span>
            </div>
            <button className="apple-close-btn" onClick={onClose} title="Fermer" aria-label="Fermer">
              <X size={15} />
            </button>
          </div>

          <div className="agents-connection-title">
            <span className="agent-name source" title={link.sourceName}>{link.sourceName}</span>
            <span className="connection-target-wrap">
              <ArrowRight size={14} className="arrow-icon" />
              <span className="agent-name target" title={link.targetName}>{link.targetName}</span>
            </span>
          </div>
        </header>

        {/* Drawer Scrollable Content */}
        <div className="drawer-content apple-drawer-content">

          {/* 1. Hero Alignment Score Card */}
          <section className={`apple-hero-card ${statusKey.toLowerCase()}`}>
            <div className="hero-score-row">
              <div className="hero-score-block">
                <span className={`score-number ${statusKey.toLowerCase()}`}>
                  {displayScore === null || displayScore === undefined ? '—' : `${displayScore}%`}
                </span>
                <span className="score-caption">Alignement</span>
              </div>
              <div className="hero-status-block">
                <h3 className="hero-title">
                  {statusKey === 'HEALTHY' && 'Flux optimal'}
                  {statusKey === 'WARNING' && 'Légère friction'}
                  {statusKey === 'CRITICAL' && 'Discordance de filtrage'}
                  {statusKey === 'UNANALYZED' && 'En attente d\'analyse'}
                </h3>
                {evaluatedAt && (
                  <span className="hero-timestamp">
                    Analysé le {new Date(evaluatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à {new Date(evaluatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>

            <p className="hero-summary-text">
              {displaySummary || (
                statusKey === 'HEALTHY'
                  ? 'Les critères de sourcing alimentent parfaitement le profil recherché en prospection.'
                  : 'Des discordances de critères entraînent la disqualification de leads.'
              )}
            </p>

            {/* Action buttons */}
            <div className="hero-actions-row">
              {evalResult ? (
                <div className="apple-btn-group">
                  <button
                    className="apple-action-btn secondary"
                    onClick={() => handleRunAiDiagnostic(false)}
                    disabled={isEvaluating}
                    title="Vérifie si de nouveaux leads ont été transférés"
                  >
                    {isEvaluating ? (
                      <>
                        <Loader2 size={13} className="spin-icon" />
                        <span>Vérification...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw size={13} />
                        <span>Actualiser</span>
                      </>
                    )}
                  </button>

                  <button
                    className="apple-action-btn primary"
                    onClick={() => handleRunAiDiagnostic(true)}
                    disabled={isEvaluating}
                    title="Force une réanalyse IA complète"
                  >
                    {isEvaluating ? (
                      <>
                        <Loader2 size={13} className="spin-icon" />
                        <span>Analyse...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={13} />
                        <span>Forcer l&apos;analyse</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <button
                  className="apple-action-btn primary full"
                  onClick={() => handleRunAiDiagnostic(false)}
                  disabled={isEvaluating}
                >
                  {isEvaluating ? (
                    <>
                      <Loader2 size={14} className="spin-icon" />
                      <span>Analyse IA en cours...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={14} />
                      <span>Lancer l&apos;analyse IA</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Anti-waste Notice */}
            {cachedNotice && (
              <div className="apple-notice-card">
                <div className="notice-content">
                  <ShieldCheck size={14} className="notice-icon" />
                  <span className="notice-text">{cachedNotice}</span>
                </div>
                <button
                  type="button"
                  className="notice-force-btn"
                  onClick={() => handleRunAiDiagnostic(true)}
                  disabled={isEvaluating}
                >
                  Forcer
                </button>
              </div>
            )}

            {evalError && (
              <div className="apple-error-card">
                <AlertTriangle size={13} />
                <span>{evalError}</span>
              </div>
            )}
          </section>

          {/* 2. Pipeline Flow Metrics */}
          {link.throughput && (
            <section className="apple-section pipeline-section">
              <div className="apple-section-header">
                <div className="section-title-wrap">
                  <GitFork size={14} className="section-icon" />
                  <h4 className="apple-section-title">Transfert de leads</h4>
                </div>
                {link.missionCutoffDate && (
                  <span className="apple-section-sub">
                    Depuis le {new Date(link.missionCutoffDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>

              <div className="apple-metrics-grid">
                <div className="apple-metric-cell">
                  <span className="metric-val">{link.throughput.leadsTransferred}</span>
                  <span className="metric-lbl">Transférés</span>
                </div>
                <div className="apple-metric-cell highlight">
                  <span className="metric-val">{link.throughput.leadsQualified}</span>
                  <span className="metric-lbl">
                    Qualifiés {link.throughput.leadsTransferred > 0 ? `(${link.throughput.conversionRate}%)` : ''}
                  </span>
                </div>
                <div className="apple-metric-cell">
                  <span className="metric-val muted">{link.throughput.leadsRejected}</span>
                  <span className="metric-lbl">Écartés</span>
                </div>
              </div>

              {link.throughput.leadsTransferred > 0 && (
                <div className="apple-progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.min(100, Math.max(0, link.throughput.conversionRate))}%` }}
                  />
                </div>
              )}
            </section>
          )}

          {/* 3. Rejections Root Cause (if any) */}
          {rejectionsAnalysis && (
            <section className="apple-section rejections-section">
              <div className="apple-section-header">
                <div className="section-title-wrap">
                  <AlertOctagon size={14} className="section-icon warning" />
                  <h4 className="apple-section-title">Motif des rejets</h4>
                </div>
              </div>
              <div className="apple-card readable-text rejection-card">
                <p>{rejectionsAnalysis}</p>
              </div>
            </section>
          )}

          {/* 4. Criteria Alignment Matrix */}
          <section className="apple-section criteria-section">
            <div className="apple-section-header">
              <div className="section-title-wrap">
                <Sliders size={14} className="section-icon" />
                <h4 className="apple-section-title">Adéquation des critères</h4>
              </div>
            </div>

            <div className="apple-criteria-list">
              {Array.isArray(aiCriteriaMatrix) && aiCriteriaMatrix.length > 0 ? (
                aiCriteriaMatrix.map((item: any, idx: number) => {
                  const isMatch = item.statut === 'aligne';
                  const isPartial = item.statut === 'partiel';
                  const statusClass = isMatch ? 'match' : isPartial ? 'partial' : 'mismatch';

                  return (
                    <div key={idx} className={`apple-criterion-card ${statusClass}`}>
                      <div className="criterion-top-row">
                        <div className="criterion-title-wrap">
                          <span className="criterion-icon">{getDimensionIcon(item.critere)}</span>
                          <span className="criterion-name">{item.critere}</span>
                        </div>
                        <span className={`criterion-badge ${statusClass}`}>
                          {isMatch ? 'Aligné' : isPartial ? 'Partiel' : 'Discordant'}
                        </span>
                      </div>

                      <div className="criterion-values-row">
                        <div className="value-col">
                          <span className="col-label">Sourcing</span>
                          <span className="col-value">{item.sourcing || 'Non spécifié'}</span>
                        </div>
                        <div className="value-col">
                          <span className="col-label">Prospection</span>
                          <span className="col-value">{item.prospect || 'Tous profils'}</span>
                        </div>
                      </div>

                      {item.explication && (
                        <p className="criterion-note">{item.explication}</p>
                      )}
                    </div>
                  );
                })
              ) : link.alignmentMatrix && link.alignmentMatrix.length > 0 ? (
                link.alignmentMatrix.map((item, idx) => {
                  const statusClass = item.isMatch ? 'match' : 'mismatch';
                  return (
                    <div key={idx} className={`apple-criterion-card ${statusClass}`}>
                      <div className="criterion-top-row">
                        <div className="criterion-title-wrap">
                          <span className="criterion-icon">{getDimensionIcon(item.dimension)}</span>
                          <span className="criterion-name">{item.dimension}</span>
                        </div>
                        <span className={`criterion-badge ${statusClass}`}>
                          {item.isMatch ? 'Aligné' : 'Discordant'}
                        </span>
                      </div>

                      <div className="criterion-values-row">
                        <div className="value-col">
                          <span className="col-label">Sourcing</span>
                          <span className="col-value">{item.sourcingValue || 'Mission amont'}</span>
                        </div>
                        <div className="value-col">
                          <span className="col-label">Prospection</span>
                          <span className="col-value">{item.prospectValue || 'Tous profils'}</span>
                        </div>
                      </div>

                      {item.note && (
                        <p className="criterion-note">{item.note}</p>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="apple-card empty">
                  <span>Aucun critère spécifique requis pour cette liaison.</span>
                </div>
              )}
            </div>
          </section>

          {/* 5. Recommendations */}
          {(aiRecommendations || link.recommendations.length > 0) && (
            <section className="apple-section recommendations-section">
              <div className="apple-section-header">
                <div className="section-title-wrap">
                  <Sparkles size={14} className="section-icon" />
                  <h4 className="apple-section-title">Recommandations</h4>
                </div>
              </div>

              {aiRecommendations ? (
                <div className="apple-recs-stack">
                  {aiRecommendations.ajustement_sourcing && (
                    <div className="apple-card rec-card sourcing">
                      <div className="rec-header">
                        <span className="rec-agent">{link.sourceName}</span>
                        <span className="rec-tag sourcing">Sourcing</span>
                      </div>
                      <p className="rec-text">{aiRecommendations.ajustement_sourcing}</p>
                    </div>
                  )}
                  {aiRecommendations.ajustement_prospection && (
                    <div className="apple-card rec-card prospection">
                      <div className="rec-header">
                        <span className="rec-agent">{link.targetName}</span>
                        <span className="rec-tag prospection">Prospection</span>
                      </div>
                      <p className="rec-text">{aiRecommendations.ajustement_prospection}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="apple-recs-stack">
                  {link.recommendations.map(rec => (
                    <div key={rec.id} className="apple-card rec-card">
                      <div className="rec-header">
                        <span className="rec-agent">{rec.targetAgentName || 'Agent'}</span>
                        <span className="rec-tag">{rec.label}</span>
                      </div>
                      <div className="rec-change-row">
                        <span className="change-from">{rec.currentValue}</span>
                        <ArrowRight size={12} className="change-arrow" />
                        <span className="change-to">{rec.suggestedValue}</span>
                      </div>
                      <p className="rec-text">{rec.rationale}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

        </div>
      </aside>
    </>
  );
};
