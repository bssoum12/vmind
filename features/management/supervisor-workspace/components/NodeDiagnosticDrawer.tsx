'use client';

import React from 'react';
import { X, Activity, AlertTriangle, ArrowRight, Zap, Clock, BarChart2 } from 'lucide-react';
import { SupervisorNode } from '../types/supervisor.types';

interface NodeDiagnosticDrawerProps {
  node: SupervisorNode;
  onClose: () => void;
}

export const NodeDiagnosticDrawer: React.FC<NodeDiagnosticDrawerProps> = ({
  node,
  onClose,
}) => {
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'Conforme';
      case 'WARNING': return 'Attention';
      case 'CRITICAL': return 'Critique';
      default: return 'En attente';
    }
  };

  const statusKey = node.status || 'UNANALYZED';

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
                  {statusKey === 'UNANALYZED' ? '—' : `${node.healthScore}%`}
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
                    <span>Périmètre : leads analysés depuis le {new Date(node.missionUpdatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
              </div>
            </div>

            <p className="hero-summary-text">
              {statusKey === 'HEALTHY' && 'Paramétrage optimal en phase avec les résultats observés.'}
              {statusKey === 'WARNING' && 'Des déperditions sont détectées dans le traitement des leads.'}
              {statusKey === 'CRITICAL' && 'Pertes de leads critiques. Une révision du ciblage est recommandée.'}
              {statusKey === 'UNANALYZED' && 'Volume de leads insuffisant pour établir un score de santé consolidé.'}
            </p>
          </section>

          {/* 2. Diagnostic Summary */}
          {node.summary && (
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
            </div>

            <div className="apple-metrics-grid">
              <div className="apple-metric-cell highlight">
                <span className="metric-val">{node.metrics.totalLeads ?? 0}</span>
                <span className="metric-lbl">{node.type === 'sourcing' ? 'Leads Extraits' : 'Leads Traités'}</span>
              </div>

              {node.metrics.qualificationRate !== undefined && (
                <div className={`apple-metric-cell ${node.metrics.qualificationRate < 50 ? 'warning' : 'healthy'}`}>
                  <span className="metric-val">{node.metrics.qualificationRate}%</span>
                  <span className="metric-lbl">Taux de Qualification</span>
                </div>
              )}

              {node.metrics.emailsSent !== undefined && (
                <div className="apple-metric-cell">
                  <span className="metric-val">{node.metrics.emailsSent}</span>
                  <span className="metric-lbl">Emails Envoyés</span>
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
          </section>

          {/* 4. Detailed Findings */}
          {node.findings && node.findings.length > 0 && (
            <section className="apple-section findings-section">
              <div className="apple-section-header">
                <div className="section-title-wrap">
                  <AlertTriangle size={14} className="section-icon" />
                  <h4 className="apple-section-title">Constats Détaillés ({node.findings.length})</h4>
                </div>
              </div>

              <div className="apple-findings-stack">
                {node.findings.map(finding => (
                  <div key={finding.id} className={`apple-finding-card ${finding.severity}`}>
                    <div className="finding-top-row">
                      <span className="finding-title">{finding.title}</span>
                      <span className={`finding-severity-badge ${finding.severity}`}>
                        {finding.severity === 'critical' ? 'Critique' : finding.severity === 'warning' ? 'Attention' : 'Info'}
                      </span>
                    </div>
                    <p className="finding-desc">{finding.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 5. Strategic Recommendations */}
          <section className="apple-section recommendations-section">
            <div className="apple-section-header">
              <div className="section-title-wrap">
                <Zap size={14} className="section-icon" />
                <h4 className="apple-section-title">Recommandations ({node.recommendations.length})</h4>
              </div>
            </div>

            {node.recommendations.length === 0 ? (
              <div className="apple-card empty">
                ✓ Aucun ajustement nécessaire. La configuration de cet agent est optimale.
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
        </div>
      </aside>
    </>
  );
};
