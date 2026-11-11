'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  X, Activity, AlertTriangle, ArrowRight, Zap, Clock, BarChart2,
  Loader2, ShieldCheck, RefreshCw, Sparkles, Mail, Target, CheckCircle2,
  ExternalLink, Copy, Check
} from 'lucide-react';
import {
  SupervisorNode,
  ProspectPitchAlignment,
  ProspectCopywritingAnalysis,
  ProspectDeliveryHealth,
  HotLeadAlertItem
} from '../types/supervisor.types';
import { useToast } from '@/shared/contexts/ToastContext';

interface NodeDiagnosticDrawerProps {
  node: SupervisorNode;
  supervisorId?: string;
  onClose: () => void;
  onEvaluationComplete?: (node: SupervisorNode, data: any) => void;
  unattendedLeads?: HotLeadAlertItem[];
  alertsLoadError?: boolean;
}

export const NodeDiagnosticDrawer: React.FC<NodeDiagnosticDrawerProps> = ({
  node,
  supervisorId,
  onClose,
  onEvaluationComplete,
  unattendedLeads = [],
  alertsLoadError = false,
}) => {
  const router = useRouter();
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
  const [activeDrawerTab, setActiveDrawerTab] = useState<'diagnostic' | 'leads'>('diagnostic');
  const [copiedLeadId, setCopiedLeadId] = useState<number | null>(null);

  const formatUnattendedDelay = (hours: number): string => {
    if (!hours || hours < 24) {
      return `${hours || 0}h`;
    }
    const days = Math.floor(hours / 24);
    return `${days} jour${days > 1 ? 's' : ''}`;
  };

  const handleCopyEmail = (email: string, leadId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!email) return;
    navigator.clipboard.writeText(email);
    setCopiedLeadId(leadId);
    showToast(`E-mail copié : ${email}`, 'ok');
    setTimeout(() => setCopiedLeadId(null), 1800);
  };

  const handleOpenLeadWorkspace = (lead: HotLeadAlertItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetUuid = lead.agentUuid || node.id;
    if (!targetUuid || !lead.leadId) return;
    const currentPath = typeof window !== 'undefined' ? (window.location.pathname + (window.location.search || '')) : '';
    router.push(`/prospect-agent-workspace/${targetUuid}?tab=leads&leadId=${lead.leadId}&from=${encodeURIComponent(currentPath)}`);
  };

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
        const supParam = supervisorId ? `&supervisor_agent_uuid=${encodeURIComponent(supervisorId)}` : '';
        const res = await fetch(
          `${baseUrl}/api/supervisor/node-evaluation/latest?agent_uuid=${encodeURIComponent(node.id)}${supParam}`,
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
              : 'De nouveaux emails ou des changements de mission / contexte entreprise ont été détectés depuis cette évaluation.'
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
  const aiCopywritingAdvice: string | undefined = evalResult?.evaluation?.recommendations?.conseil_copywriting;
  const pitchAlignment: ProspectPitchAlignment | null = evalResult?.evaluation?.pitch_alignment || null;
  const copywritingAnalysis: ProspectCopywritingAnalysis | null = evalResult?.evaluation?.copywriting_analysis || null;
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
            <div className="header-actions">
              <button
                type="button"
                className="apple-action-btn-header"
                onClick={() => {
                  const targetBase = isSourcing
                    ? `/sourcing-agent-workspace/${node.id}`
                    : `/prospect-agent-workspace/${node.id}`;
                  const returnUrl = supervisorId
                    ? `/supervisor-agent-workspace/${encodeURIComponent(supervisorId)}`
                    : '/supervisor-agent-workspace';
                  router.push(`${targetBase}?from=${encodeURIComponent(returnUrl)}`);
                }}
                title="Accéder à l'espace de travail de cet agent"
              >
                <span>Espace de travail</span>
                <ExternalLink size={13} />
              </button>
              <button className="apple-close-btn" onClick={onClose} title="Fermer" aria-label="Fermer">
                <X size={15} />
              </button>
            </div>
          </div>

          <h2 className="drawer-agent-title" title={node.name}>
            {node.name}
          </h2>
        </header>

        {/* Drawer Scrollable Content */}
        <div className="drawer-content apple-drawer-content">
          {/* Subtabs Switcher (Only for Prospect Agents) */}
          {!isSourcing && (
            <div className="drawer-subtabs-bar">
              <button
                type="button"
                className={`drawer-subtab-btn ${activeDrawerTab === 'diagnostic' ? 'active' : ''}`}
                onClick={() => setActiveDrawerTab('diagnostic')}
              >
                <Activity size={13} />
                <span>Diagnostic IA</span>
              </button>
              <button
                type="button"
                className={`drawer-subtab-btn ${activeDrawerTab === 'leads' ? 'active' : ''}`}
                onClick={() => setActiveDrawerTab('leads')}
              >
                <Clock size={13} />
                <span>Leads en Attente</span>
                {unattendedLeads.length > 0 && (
                  <span className="drawer-subtab-badge">{unattendedLeads.length}</span>
                )}
              </button>
            </div>
          )}

          {activeDrawerTab === 'leads' && !isSourcing ? (
            <div className="drawer-unattended-leads-pane">
              <div className="pane-header-info">
                <span className="pane-kicker">Prospects qualifiés</span>
                <span className="pane-subtitle">
                  {alertsLoadError
                    ? 'Impossible de récupérer les leads en attente'
                    : unattendedLeads.length > 0
                    ? `${unattendedLeads.length} prospect${unattendedLeads.length > 1 ? 's' : ''} qualifié${unattendedLeads.length > 1 ? 's' : ''} en attente de premier contact`
                    : 'Tous les prospects qualifiés ont été contactés'}
                </span>
              </div>

              {alertsLoadError ? (
                <div className="drawer-leads-empty-state" style={{ borderColor: 'rgba(255, 71, 87, 0.3)' }}>
                  <AlertTriangle size={32} style={{ color: '#FF4757', marginBottom: 8 }} />
                  <div className="empty-title" style={{ color: '#F0F4F8' }}>Erreur de chargement</div>
                  <p className="empty-desc" style={{ color: '#94A3B8' }}>
                    Impossible de récupérer les leads en attente pour cet agent. Veuillez réessayer ultérieurement.
                  </p>
                </div>
              ) : unattendedLeads.length === 0 ? (
                <div className="drawer-leads-empty-state">
                  <CheckCircle2 size={32} className="empty-icon-ok" />
                  <div className="empty-title">Aucun lead en attente</div>
                  <p className="empty-desc">
                    Tous les prospects qualifiés de la dernière mission active ont été contactés dans les délais impartis.
                  </p>
                </div>
              ) : (
                <div className="mini-table-card">
                  <table className="mini-leads-table">
                    <thead>
                      <tr>
                        <th style={{ width: '56%' }}>PROSPECT</th>
                        <th style={{ width: '18%' }}>INACTIVITÉ</th>
                        <th style={{ width: '26%', textAlign: 'right' }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unattendedLeads.map((lead) => {
                        const fullName = `${lead.prenom || ''} ${lead.nom || ''}`.trim() || 'Prospect sans nom';
                        return (
                          <tr key={lead.leadId}>
                            {/* Prospect: Name, Company & Email with Copy */}
                            <td className="col-lead-info">
                              <div className="lead-identity">
                                <span className="lead-name" title={fullName}>{fullName}</span>
                                {lead.entreprise && (
                                  <span className="lead-company" title={lead.entreprise}>{lead.entreprise}</span>
                                )}
                                {lead.email && (
                                  <div
                                    className="email-copy-wrap"
                                    onClick={(e) => handleCopyEmail(lead.email, lead.leadId, e)}
                                    title="Cliquer pour copier l'e-mail"
                                  >
                                    <span className="email-text">{lead.email}</span>
                                    <button type="button" className="inline-copy-btn" aria-label="Copier l'email">
                                      {copiedLeadId === lead.leadId ? (
                                        <Check size={12} className="text-emerald" />
                                      ) : (
                                        <Copy size={12} />
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Inactivity Delay in days */}
                            <td className="col-lead-delay">
                              <span className={`delay-text ${lead.urgency === 'CRITICAL' ? 'critical' : lead.urgency === 'WARNING' ? 'warning' : 'recent'}`}>
                                {formatUnattendedDelay(lead.hoursUnattended)}
                              </span>
                            </td>

                            {/* Action to open in agent workspace */}
                            <td className="col-lead-action" style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className="row-action-btn"
                                onClick={(e) => handleOpenLeadWorkspace(lead, e)}
                                title="Ouvrir ce lead dans l'espace de prospection"
                              >
                                <span>Ouvrir</span>
                                <ExternalLink size={12} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <>
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
                    <span>Périmètre : {isSourcing ? 'leads analysés' : 'emails analysés'} depuis le {new Date(node.missionUpdatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
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
                      <span className="finding-title">Invitation à Échanger</span>
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

          {/* 2. Diagnostic Summary (static fallback — hidden once AI sections are shown above) */}
          {!missionFit && !pitchAlignment && !copywritingAnalysis && node.summary && (
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
              {isSourcing ? (
                <>
                  <div
                    className="apple-metric-cell highlight"
                    title="Total de leads extraits lors de la dernière mission active (l'historique cumulé reste préservé en base)"
                  >
                    <span className="metric-val">{evalMetrics?.leads_total ?? node.metrics.totalLeads ?? 0}</span>
                    <span className="metric-lbl">Leads Extraits</span>
                  </div>

                  {evalMetrics?.leads_in_sample !== undefined && (
                    <div
                      className="apple-metric-cell"
                      title="Échantillon de leads récents analysés par l'IA du superviseur pour évaluer l'alignement stratégique"
                    >
                      <span className="metric-val">{evalMetrics.leads_in_sample}</span>
                      <span className="metric-lbl">Échantillon Évalué</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="apple-metric-cell highlight">
                    <span className="metric-val">{deliveryHealth?.total_count ?? evalMetrics?.activity_total ?? node.metrics.emailsSent ?? 0}</span>
                    <span className="metric-lbl">Emails Rédigés</span>
                  </div>

                  <div className="apple-metric-cell">
                    <span className="metric-val">{deliveryHealth?.sent_count ?? node.metrics.emailsSent ?? 0}</span>
                    <span className="metric-lbl">Emails Envoyés</span>
                  </div>

                  {deliveryHealth?.draft_count !== undefined && (
                    <div className="apple-metric-cell">
                      <span className="metric-val">{deliveryHealth.draft_count}</span>
                      <span className="metric-lbl">Brouillons</span>
                    </div>
                  )}

                  {deliveryHealth?.failure_count !== undefined && deliveryHealth.failure_count > 0 && (
                    <div className="apple-metric-cell warning">
                      <span className="metric-val">{deliveryHealth.failure_count}</span>
                      <span className="metric-lbl">Envois en Échec ({deliveryHealth.failure_rate}%)</span>
                    </div>
                  )}
                </>
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
          {(aiRecommendation || aiCopywritingAdvice || node.recommendations.length > 0) && (
            <section className="apple-section recommendations-section">
              <div className="apple-section-header">
                <div className="section-title-wrap">
                  <Zap size={14} className="section-icon" />
                  <h4 className="apple-section-title">
                    Recommandations {(aiRecommendation || aiCopywritingAdvice) ? '' : `(${node.recommendations.length})`}
                  </h4>
                </div>
              </div>

              {(aiRecommendation || aiCopywritingAdvice) ? (
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
            </>
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
                  : "Aucun nouvel email ni changement de mission ou de contexte entreprise n'ont été enregistrés depuis la dernière analyse. Les résultats affichés sont déjà à jour."}
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
