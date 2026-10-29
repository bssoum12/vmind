'use client';

import React, { useState, useEffect } from 'react';
import {
  X, Activity, AlertTriangle, ArrowRight, Zap, Clock, BarChart2,
  Loader2, ShieldCheck, RefreshCw, Sparkles, Mail, Target, CheckCircle2, Layers
} from 'lucide-react';
import {
  SupervisorNode,
  ProspectPitchAlignment,
  ProspectCopywritingAnalysis,
  ProspectPotentialPyramid,
  ProspectDeliveryHealth
} from '../types/supervisor.types';
import { useToast } from '@/shared/contexts/ToastContext';

interface NodeDiagnosticDrawerProps {
  node: SupervisorNode;
  supervisorId?: string;
  onClose: () => void;
  onEvaluationComplete?: (node: SupervisorNode, data: any) => void;
}

export const NodeDiagnosticDrawer: React.FC<NodeDiagnosticDrawerProps> = ({
  node,
  supervisorId,
  onClose,
  onEvaluationComplete,
}) => {
  const { showToast } = useToast();
  const isSourcing = node.type === 'sourcing';

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<any>(() => {
    if (node.evaluation) {
      return {
        success: true,
        cached: true,
        evaluation: node.evaluation.evaluation || node.evaluation,
        metrics: node.evaluation.metrics || undefined,
        evaluated_at: node.lastEvaluatedAt
      };
    }
    return null;
  });
  const [cachedNotice, setCachedNotice] = useState<string | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [lastEvaluatedAt, setLastEvaluatedAt] = useState<string | null>(node.lastEvaluatedAt || null);
  const [showCachedModal, setShowCachedModal] = useState<boolean>(false);

  // Spec §4.1 (supersedes old §10): on open, fetch the last stored evaluation
  // read-only — no n8n call, no LLM cost — and show it immediately. The
  // Evaluate/Forcer flow below is unchanged; this only pre-fills the drawer.
  useEffect(() => {
    if (node.evaluation) {
      setEvalResult({
        success: true,
        cached: true,
        evaluation: node.evaluation.evaluation || node.evaluation,
        metrics: node.evaluation.metrics || undefined,
        evaluated_at: node.lastEvaluatedAt
      });
    } else {
      setEvalResult(null);
    }
    setCachedNotice(null);
    setEvalError(null);
    setLastEvaluatedAt(node.lastEvaluatedAt || null);

    if (!node.id) return;

    let cancelled = false;
    (async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';
        const res = await fetch(
          `${baseUrl}/api/supervisor/node-evaluation/latest?agent_uuid=${encodeURIComponent(node.id)}`,
          { credentials: 'include' }
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled || !data?.evaluation) return;

        setEvalResult(data);
        setLastEvaluatedAt(data.evaluated_at || null);
        if (onEvaluationComplete && typeof data.evaluation?.score === 'number' && data.evaluation.score !== node.healthScore) {
          onEvaluationComplete(node, data);
        }
        if (data.stale) {
          setCachedNotice(
            isSourcing
              ? 'La mission, les leads ou le contexte entreprise ont changé depuis cette évaluation. Les résultats ci-dessous peuvent être dépassés.'
              : 'De nouveaux emails, qualifications ou changements de réglages ont été détectés depuis cette évaluation.'
          );
        } else {
          setCachedNotice(null);
        }
      } catch (e) {
        console.warn('[NodeDiagnosticDrawer] Could not load the latest stored evaluation:', e);
      }
    })();

    return () => { cancelled = true; };
  }, [node.id, isSourcing, node.evaluation, node.lastEvaluatedAt]);

  const handleRunAiDiagnostic = async (force: boolean = false) => {
    if (!node.id) {
      const err = 'Identifiant de l\'agent introuvable pour ce nœud.';
      setEvalError(err);
      showToast(err, 'err');
      return;
    }

    setIsEvaluating(true);
    setEvalError(null);
    setCachedNotice(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';
      const res = await fetch(`${baseUrl}/api/supervisor/evaluate-node`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          agent_uuid: node.id,
          supervisor_agent_uuid: supervisorId || null,
          force
        })
      });

      if (!res.ok) {
        let serverMsg: string | undefined;
        try {
          const errJson = await res.json();
          serverMsg = errJson?.error;
        } catch {
          // Non-JSON error body (e.g. a raw 502 from a gateway) — fall through to the status map below.
        }

        const fallbackByStatus: Record<number, string> = {
          403: 'Vous n\'êtes pas autorisé à évaluer cet agent.',
          404: 'Agent introuvable pour cette évaluation.',
          502: 'Le service de diagnostic IA est momentanément indisponible. Réessayez plus tard.'
        };

        throw new Error(serverMsg || fallbackByStatus[res.status] || 'Erreur lors du diagnostic IA');
      }

      const data = await res.json();
      setEvalResult(data);

      if (data.cached) {
        setShowCachedModal(true);
      } else {
        setShowCachedModal(false);
        setCachedNotice(null);
        setLastEvaluatedAt(new Date().toISOString());
        showToast(force ? "Nouvelle analyse effectuée avec succès" : "Diagnostic IA de l'agent complété avec succès", 'ok');
      }

      if (onEvaluationComplete) {
        onEvaluationComplete(node, data);
      }
    } catch (err: any) {
      console.error('[NodeDiagnosticDrawer] Error evaluating node:', err);
      const errMsg = err.message || "Impossible d'exécuter le diagnostic de l'agent";
      setEvalError(errMsg);
      showToast(errMsg, 'err');
    } finally {
      setIsEvaluating(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'Conforme';
      case 'WARNING': return 'Attention';
      case 'CRITICAL': return 'Critique';
      default: return 'En attente';
    }
  };

  // Overlay the live AI node evaluation (if any) on top of the static/base
  // node data — same pattern as EdgeDiagnosticDrawer for links.
  const displayScore = evalResult?.evaluation?.score ?? node.healthScore;
  const displaySummary = evalResult?.evaluation?.summary ?? node.summary;
  const missionFit: string | undefined = evalResult?.evaluation?.mission_fit;
  const leadQualityIssues: string[] = Array.isArray(evalResult?.evaluation?.lead_quality_issues)
    ? evalResult.evaluation.lead_quality_issues
    : [];
  const aiRecommendation: string | undefined = evalResult?.evaluation?.recommendations?.ajustement_sourcing;
  const aiProspectAdjustment: string | undefined = evalResult?.evaluation?.recommendations?.ajustement_prospection;
  const aiCopywritingAdvice: string | undefined = evalResult?.evaluation?.recommendations?.conseil_copywriting;
  const pitchAlignment: ProspectPitchAlignment | null = evalResult?.evaluation?.pitch_alignment || null;
  const copywritingAnalysis: ProspectCopywritingAnalysis | null = evalResult?.evaluation?.copywriting_analysis || null;
  const qualificationCalibration: string | undefined = evalResult?.evaluation?.qualification_calibration;
  const potentialPyramid: ProspectPotentialPyramid | null = evalResult?.evaluation?.potential_pyramid || null;
  const deliveryHealth: ProspectDeliveryHealth | null = evalResult?.evaluation?.delivery_health || null;
  const evalMetrics = evalResult?.metrics;

  const parsedAiFindings = leadQualityIssues
    .map((rawIssue, idx) => {
      const text = (rawIssue || '').trim();
      const match = text.match(/^(Lead\s*#\d+)\s*:\s*([^-–—]+?)\s*[-–—]\s*(.+)$/i);
      const label = match ? match[1].trim() : null;
      const verdict = (match ? match[2] : text).toLowerCase();
      const description = match ? match[3].trim() : text;

      if (
        verdict.includes('ne correspond pas') ||
        verdict.includes('non conforme') ||
        verdict.includes('hors cible') ||
        verdict.includes('rejet')
      ) {
        return {
          key: `ai-issue-${idx}`,
          severity: 'critical' as const,
          badge: 'Non conforme',
          title: label ? `${label} — Non conforme` : 'Lead hors cible',
          description,
          priority: 0,
        };
      }

      if (
        verdict.includes('cas limite') ||
        verdict.includes('partiel') ||
        verdict.includes('ambigu') ||
        verdict.includes('incertain')
      ) {
        return {
          key: `ai-issue-${idx}`,
          severity: 'warning' as const,
          badge: 'Cas limite',
          title: label ? `${label} — Cas limite` : 'Adéquation partielle',
          description,
          priority: 1,
        };
      }

      if (verdict.includes('correspond') || verdict.includes('conforme')) {
        return {
          key: `ai-issue-${idx}`,
          severity: 'info' as const,
          badge: 'Conforme',
          title: label ? `${label} — Conforme à la mission` : 'Lead conforme',
          description,
          priority: 2,
        };
      }

      return {
        key: `ai-issue-${idx}`,
        severity: 'warning' as const,
        badge: 'Attention',
        title: label || 'Problème de qualité des leads',
        description: text,
        priority: 1,
      };
    })
    .sort((a, b) => a.priority - b.priority);

  let statusKey: string = node.status || 'UNANALYZED';
  if (evalResult && typeof displayScore === 'number') {
    statusKey = displayScore < 50 ? 'CRITICAL' : displayScore < 75 ? 'WARNING' : 'HEALTHY';
  }

  return (
    <>
      <div className="diagnostic-drawer-backdrop" onClick={onClose} />
      <aside className="diagnostic-drawer node-drawer apple-style">
        {/* Apple Minimalist Header */}
        <header className="drawer-header node-header-apple">
          <div className="header-top-row">
            <div className="header-meta">
              <span className="eyebrow-tag">
                {node.type === 'sourcing' ? 'Agent de Sourcing' : 'Agent de Prospection'}
              </span>
              <span className={`status-dot-badge ${statusKey.toLowerCase()}`}>
                <span className="dot" />
                <span>{getStatusLabel(statusKey)}</span>
              </span>
            </div>
            <button className="apple-close-btn" onClick={onClose} title="Fermer" aria-label="Fermer">
              <X size={15} />
            </button>
          </div>

          <h2 className="drawer-agent-title" title={node.name}>
            {node.name}
          </h2>
        </header>

        {/* Drawer Scrollable Content */}
        <div className="drawer-content apple-drawer-content">
          {/* 1. Hero Health Score Card */}
          <section className={`apple-hero-card ${statusKey.toLowerCase()}`}>
            <div className="hero-score-row">
              <div className="hero-score-block">
                <span className={`score-number ${statusKey.toLowerCase()}`}>
                  {statusKey === 'UNANALYZED' ? '—' : `${displayScore}%`}
                </span>
                <span className="score-caption">SANTÉ GLOBALE</span>
              </div>
              <div className="hero-status-block">
                <h3 className="hero-title">
                  {statusKey === 'HEALTHY' && 'Fonctionnement Optimal'}
                  {statusKey === 'WARNING' && 'Ajustements Recommandés'}
                  {statusKey === 'CRITICAL' && 'Intervention Requise'}
                  {statusKey === 'UNANALYZED' && 'En Attente d’Activité'}
                </h3>
                {node.missionUpdatedAt && (
                  <div className="hero-timestamp">
                    <Clock size={12} className="clock-icon" />
                    <span>Périmètre : {isSourcing ? 'leads analysés' : 'leads et emails'} depuis le {new Date(node.missionUpdatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
                {lastEvaluatedAt && (
                  <div className="hero-timestamp">
                    <Clock size={12} className="clock-icon" />
                    <span>Dernière évaluation, enregistrée le {new Date(lastEvaluatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} à {new Date(lastEvaluatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
              </div>
            </div>

            <p className="hero-summary-text">
              {displaySummary || (
                <>
                  {statusKey === 'HEALTHY' && 'Paramétrage optimal en phase avec les résultats observés.'}
                  {statusKey === 'WARNING' && 'Des déperditions sont détectées dans le traitement des leads.'}
                  {statusKey === 'CRITICAL' && 'Pertes de leads critiques. Une révision du ciblage est recommandée.'}
                  {statusKey === 'UNANALYZED' && 'Volume de leads insuffisant pour établir un score de santé consolidé.'}
                </>
              )}
            </p>

            {/* Single Action Button for both Sourcing & Prospect nodes */}
            <div className="hero-actions-row">
              <button
                className="apple-action-btn primary full"
                onClick={() => handleRunAiDiagnostic(false)}
                disabled={isEvaluating}
                title={evalResult ? "Vérifie les mises à jour et réévalue l'agent" : "Lance l'évaluation IA de cet agent"}
              >
                {isEvaluating ? (
                  <>
                    <Loader2 size={14} className="spin-icon" />
                    <span>Analyse en cours...</span>
                  </>
                ) : evalResult ? (
                  <>
                    <RefreshCw size={14} />
                    <span>Actualiser l&apos;analyse</span>
                  </>
                ) : (
                  <>
                    <Zap size={14} />
                    <span>Lancer l&apos;analyse IA</span>
                  </>
                )}
              </button>
            </div>

            {/* Informational Stale Notice (Read-only indication) */}
            {cachedNotice && (
              <div className="apple-notice-card info-only">
                <div className="notice-content">
                  <ShieldCheck size={14} className="notice-icon" />
                  <span className="notice-text">{cachedNotice}</span>
                </div>
              </div>
            )}

            {evalError && (
              <div className="apple-error-card">
                <AlertTriangle size={13} />
                <span>{evalError}</span>
              </div>
            )}
          </section>

          {/* 1b. Mission fit — AI-only section for Sourcing */}
          {missionFit && (
            <section className="apple-section summary-section">
              <div className="apple-section-header">
                <div className="section-title-wrap">
                  <Activity size={14} className="section-icon" />
                  <h4 className="apple-section-title">Adéquation avec la mission</h4>
                </div>
              </div>
              <div className="apple-card readable-text">
                <p>{missionFit}</p>
              </div>
            </section>
          )}

          {/* 1c. PROSPECT: Pitch Alignment vs Company Value Proposition */}
          {!isSourcing && pitchAlignment && (
            <section className="apple-section prospect-pitch-section">
              <div className="apple-section-header">
                <div className="section-title-wrap">
                  <Target size={14} className="section-icon" />
                  <h4 className="apple-section-title">Alignement du Discours Commercial</h4>
                </div>
                <span className={`pitch-score-pill ${pitchAlignment.score >= 75 ? 'healthy' : pitchAlignment.score >= 50 ? 'warning' : 'critical'}`}>
                  {pitchAlignment.score}% Aligné
                </span>
              </div>

              <div className="apple-card prospect-pitch-card">
                {Array.isArray(pitchAlignment.strengths) && pitchAlignment.strengths.length > 0 && (
                  <div className="pitch-block strengths">
                    <span className="pitch-block-label">
                      <CheckCircle2 size={12} /> Points Forts
                    </span>
                    <ul className="pitch-list">
                      {pitchAlignment.strengths.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {Array.isArray(pitchAlignment.weaknesses) && pitchAlignment.weaknesses.length > 0 && (
                  <div className="pitch-block weaknesses">
                    <span className="pitch-block-label">
                      <AlertTriangle size={12} /> Écarts &amp; Axes d&apos;Amélioration
                    </span>
                    <ul className="pitch-list">
                      {pitchAlignment.weaknesses.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 1d. PROSPECT: Copywriting & Cold Outreach Audit */}
          {!isSourcing && copywritingAnalysis && (
            <section className="apple-section prospect-copy-section">
              <div className="apple-section-header">
                <div className="section-title-wrap">
                  <Mail size={14} className="section-icon" />
                  <h4 className="apple-section-title">Audit Rédactionnel &amp; Accroche</h4>
                </div>
                {evalMetrics?.emails_in_sample !== undefined && (
                  <span className="apple-section-sub">
                    {evalMetrics.emails_in_sample} email(s) analysé(s)
                  </span>
                )}
              </div>

              <div className="apple-findings-stack">
                {copywritingAnalysis.subject_lines_quality && (
                  <div className="apple-finding-card info">
                    <div className="finding-top-row">
                      <span className="finding-title">Objets d&apos;Emails</span>
                      <span className="finding-severity-badge info">Impact</span>
                    </div>
                    <p className="finding-desc">{copywritingAnalysis.subject_lines_quality}</p>
                  </div>
                )}

                {copywritingAnalysis.personalization && (
                  <div className="apple-finding-card info">
                    <div className="finding-top-row">
                      <span className="finding-title">Personnalisation</span>
                      <span className="finding-severity-badge info">Ciblage</span>
                    </div>
                    <p className="finding-desc">{copywritingAnalysis.personalization}</p>
                  </div>
                )}

                {copywritingAnalysis.cta_clarity && (
                  <div className="apple-finding-card info">
                    <div className="finding-top-row">
                      <span className="finding-title">Appel à l&apos;Action (CTA)</span>
                      <span className="finding-severity-badge info">Conversion</span>
                    </div>
                    <p className="finding-desc">{copywritingAnalysis.cta_clarity}</p>
                  </div>
                )}

                {copywritingAnalysis.average_length_assessment && (
                  <div className="apple-finding-card info">
                    <div className="finding-top-row">
                      <span className="finding-title">Longueur &amp; Densité</span>
                      {evalMetrics?.avg_email_words ? (
                        <span className="finding-severity-badge info">~{evalMetrics.avg_email_words} mots</span>
                      ) : null}
                    </div>
                    <p className="finding-desc">{copywritingAnalysis.average_length_assessment}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 1e. PROSPECT: Potential Distribution Pyramid & Qualification Calibration */}
          {!isSourcing && (potentialPyramid || qualificationCalibration) && (
            <section className="apple-section prospect-pyramid-section">
              <div className="apple-section-header">
                <div className="section-title-wrap">
                  <Layers size={14} className="section-icon" />
                  <h4 className="apple-section-title">Pyramide de Potentiel &amp; Qualification</h4>
                </div>
              </div>

              {potentialPyramid && (
                <div className="apple-card pyramid-card">
                  <div className="pyramid-bar-track">
                    {potentialPyramid.eleve_ratio > 0 && (
                      <div
                        className="pyramid-segment high"
                        style={{ width: `${potentialPyramid.eleve_ratio}%` }}
                        title={`Potentiel Élevé : ${potentialPyramid.eleve_ratio}%`}
                      />
                    )}
                    {potentialPyramid.moyen_ratio > 0 && (
                      <div
                        className="pyramid-segment medium"
                        style={{ width: `${potentialPyramid.moyen_ratio}%` }}
                        title={`Potentiel Moyen : ${potentialPyramid.moyen_ratio}%`}
                      />
                    )}
                    {potentialPyramid.faible_ratio > 0 && (
                      <div
                        className="pyramid-segment low"
                        style={{ width: `${potentialPyramid.faible_ratio}%` }}
                        title={`Potentiel Faible : ${potentialPyramid.faible_ratio}%`}
                      />
                    )}
                  </div>

                  <div className="pyramid-legend">
                    <span className="legend-item high">
                      <span className="dot" /> Élevé ({potentialPyramid.eleve_ratio}%)
                    </span>
                    <span className="legend-item medium">
                      <span className="dot" /> Moyen ({potentialPyramid.moyen_ratio}%)
                    </span>
                    <span className="legend-item low">
                      <span className="dot" /> Faible ({potentialPyramid.faible_ratio}%)
                    </span>
                  </div>

                  {potentialPyramid.analysis && (
                    <p className="pyramid-analysis-text">{potentialPyramid.analysis}</p>
                  )}
                </div>
              )}

              {qualificationCalibration && (
                <div className="apple-card readable-text" style={{ marginTop: potentialPyramid ? '10px' : 0 }}>
                  <p>{qualificationCalibration}</p>
                </div>
              )}
            </section>
          )}

          {/* 2. Diagnostic Summary (static fallback — hidden once AI sections are shown above) */}
          {!missionFit && !pitchAlignment && !qualificationCalibration && node.summary && (
            <section className="apple-section summary-section">
              <div className="apple-section-header">
                <div className="section-title-wrap">
                  <Activity size={14} className="section-icon" />
                  <h4 className="apple-section-title">Diagnostic Synthétique</h4>
                </div>
              </div>
              <div className="apple-card readable-text">
                <p>{node.summary}</p>
              </div>
            </section>
          )}

          {/* 3. Performance Metrics Strip */}
          <section className="apple-section metrics-section">
            <div className="apple-section-header">
              <div className="section-title-wrap">
                <BarChart2 size={14} className="section-icon" />
                <h4 className="apple-section-title">Indicateurs de Performance</h4>
              </div>
              {evalMetrics?.cutoff_date && (
                <span className="apple-section-sub">
                  Depuis le {new Date(evalMetrics.cutoff_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>

            <div className="apple-metrics-grid">
              <div className="apple-metric-cell highlight">
                <span className="metric-val">{evalMetrics?.leads_total ?? node.metrics.totalLeads ?? 0}</span>
                <span className="metric-lbl">{node.type === 'sourcing' ? 'Leads Extraits' : 'Leads Traités'}</span>
              </div>

              {evalMetrics?.leads_in_sample !== undefined && (
                <div className="apple-metric-cell">
                  <span className="metric-val">{evalMetrics.leads_in_sample}</span>
                  <span className="metric-lbl">Échantillon Analysé</span>
                </div>
              )}

              {node.metrics.qualificationRate !== undefined && (
                <div className={`apple-metric-cell ${node.metrics.qualificationRate < 50 ? 'warning' : 'healthy'}`}>
                  <span className="metric-val">{node.metrics.qualificationRate}%</span>
                  <span className="metric-lbl">Taux de Qualification</span>
                </div>
              )}

              {(deliveryHealth?.sent_count !== undefined || node.metrics.emailsSent !== undefined) && (
                <div className="apple-metric-cell">
                  <span className="metric-val">{deliveryHealth?.sent_count ?? node.metrics.emailsSent}</span>
                  <span className="metric-lbl">Emails Envoyés</span>
                </div>
              )}

              {deliveryHealth?.failure_count !== undefined && deliveryHealth.failure_count > 0 && (
                <div className="apple-metric-cell warning">
                  <span className="metric-val">{deliveryHealth.failure_count}</span>
                  <span className="metric-lbl">Envois en Échec ({deliveryHealth.failure_rate}%)</span>
                </div>
              )}

              {node.metrics.replyRate !== undefined && (
                <div className="apple-metric-cell">
                  <span className="metric-val">{node.metrics.replyRate}%</span>
                  <span className="metric-lbl">Taux de Réponse</span>
                </div>
              )}

              {node.metrics.bounceRate !== undefined && (
                <div className={`apple-metric-cell ${node.metrics.bounceRate > 5 ? 'warning' : ''}`}>
                  <span className="metric-val">{node.metrics.bounceRate}%</span>
                  <span className="metric-lbl">Taux de Rebond</span>
                </div>
              )}
            </div>

            {!isSourcing && deliveryHealth?.analysis && (
              <div className="apple-card readable-text" style={{ marginTop: '10px' }}>
                <p>{deliveryHealth.analysis}</p>
              </div>
            )}
          </section>

          {/* 4. Detailed Findings — AI lead-quality issues take priority over static findings */}
          {(leadQualityIssues.length > 0 || (!evalResult && node.findings && node.findings.length > 0)) && (
            <section className="apple-section findings-section">
              <div className="apple-section-header">
                <div className="section-title-wrap">
                  <AlertTriangle size={14} className="section-icon" />
                  <h4 className="apple-section-title">
                    Constats Détaillés ({leadQualityIssues.length > 0 ? leadQualityIssues.length : node.findings.length})
                  </h4>
                </div>
              </div>

              <div className="apple-findings-stack">
                {parsedAiFindings.length > 0 ? (
                  parsedAiFindings.map(item => (
                    <div key={item.key} className={`apple-finding-card ${item.severity}`}>
                      <div className="finding-top-row">
                        <span className="finding-title">{item.title}</span>
                        <span className={`finding-severity-badge ${item.severity}`}>{item.badge}</span>
                      </div>
                      <p className="finding-desc">{item.description}</p>
                    </div>
                  ))
                ) : (
                  node.findings.map(finding => (
                    <div key={finding.id} className={`apple-finding-card ${finding.severity}`}>
                      <div className="finding-top-row">
                        <span className="finding-title">{finding.title}</span>
                        <span className={`finding-severity-badge ${finding.severity}`}>
                          {finding.severity === 'critical' ? 'Critique' : finding.severity === 'warning' ? 'Attention' : 'Info'}
                        </span>
                      </div>
                      <p className="finding-desc">{finding.description}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {/* 5. Strategic Recommendations */}
          {(aiRecommendation || aiProspectAdjustment || aiCopywritingAdvice || node.recommendations.length > 0) && (
            <section className="apple-section recommendations-section">
              <div className="apple-section-header">
                <div className="section-title-wrap">
                  <Zap size={14} className="section-icon" />
                  <h4 className="apple-section-title">
                    Recommandations {(aiRecommendation || aiProspectAdjustment || aiCopywritingAdvice) ? '' : `(${node.recommendations.length})`}
                  </h4>
                </div>
              </div>

              {(aiRecommendation || aiProspectAdjustment || aiCopywritingAdvice) ? (
                <div className="apple-recs-stack">
                  {aiRecommendation && (
                    <div className="apple-card rec-card sourcing">
                      <div className="rec-header">
                        <span className="rec-agent">{node.name}</span>
                        <span className="rec-tag sourcing">Sourcing</span>
                      </div>
                      <p className="rec-text">{aiRecommendation}</p>
                    </div>
                  )}

                  {aiProspectAdjustment && (
                    <div className="apple-card rec-card prospection">
                      <div className="rec-header">
                        <span className="rec-agent">Calibrage Qualification</span>
                        <span className="rec-tag prospection">Critères &amp; Seuil</span>
                      </div>
                      <p className="rec-text">{aiProspectAdjustment}</p>
                    </div>
                  )}

                  {aiCopywritingAdvice && (
                    <div className="apple-card rec-card prospection">
                      <div className="rec-header">
                        <span className="rec-agent">Optimisation des Emails</span>
                        <span className="rec-tag prospection">Rédaction</span>
                      </div>
                      <p className="rec-text">{aiCopywritingAdvice}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="apple-recs-stack">
                  {node.recommendations.map(rec => (
                    <div key={rec.id} className={`rec-card ${node.type}`}>
                      <div className="rec-header">
                        <span className="rec-agent">{rec.label}</span>
                        <span className={`rec-tag ${node.type}`}>
                          Impact {rec.impact === 'high' ? 'Élevé' : 'Moyen'}
                        </span>
                      </div>

                      <div className="rec-change-row">
                        <span className="change-from">{rec.currentValue}</span>
                        <ArrowRight size={13} className="change-arrow" />
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

        {/* Apple Cyber Confirm Dialog when no change is detected */}
        {showCachedModal && (
          <div className="apple-dialog-overlay" onClick={() => setShowCachedModal(false)}>
            <div className="apple-dialog-card" onClick={(e) => e.stopPropagation()}>
              <div className="dialog-header">
                <div className="dialog-icon-wrap">
                  <Sparkles size={20} className="dialog-icon" />
                </div>
                <div className="dialog-header-text">
                  <h3 className="dialog-title">Données déjà à jour</h3>
                  <span className="dialog-subtitle">Aucune modification détectée</span>
                </div>
              </div>

              <p className="dialog-desc">
                {isSourcing
                  ? "La mission, le volume de leads et le contexte entreprise n'ont pas changé depuis la dernière évaluation. Les résultats affichés sont déjà consolidés et pertinents."
                  : "Aucun nouvel email, aucune nouvelle qualification et aucun changement de réglages n'ont été enregistrés depuis la dernière analyse. Les résultats affichés sont déjà à jour."}
              </p>

              <div className="dialog-actions-row">
                <button
                  type="button"
                  className="dialog-btn secondary"
                  onClick={() => setShowCachedModal(false)}
                >
                  Conserver les résultats
                </button>
                <button
                  type="button"
                  className="dialog-btn primary"
                  onClick={() => {
                    setShowCachedModal(false);
                    handleRunAiDiagnostic(true);
                  }}
                  disabled={isEvaluating}
                >
                  <Zap size={13} />
                  <span>Continuer quand même</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
