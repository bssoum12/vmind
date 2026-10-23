'use client';

import React from 'react';
import { X, Activity, AlertTriangle, Sliders, ArrowRight, Zap } from 'lucide-react';
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
      case 'HEALTHY': return 'Sain & Conforme';
      case 'WARNING': return 'Attention requise';
      case 'CRITICAL': return 'Incohérence critique';
      default: return 'Non analysé';
    }
  };

  return (
    <>
      <div className="diagnostic-drawer-backdrop" onClick={onClose} />
      <aside className="diagnostic-drawer">
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-title-group">
            <div className="drawer-tag-row">
              <span className={`drawer-type-badge ${node.type}`}>
                {node.type === 'sourcing' ? '⚡ Agent de Sourcing' : '🎯 Agent de Prospection'}
              </span>
              <span className={`status-badge ${node.status}`}>
                {getStatusLabel(node.status)}
              </span>
            </div>
            <h2 className="drawer-name">{node.name}</h2>
          </div>
          <button className="drawer-close-btn" onClick={onClose} title="Fermer">
            <X size={18} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="drawer-content">
          {/* Health Score Card */}
          <div className="health-score-card">
            <div className="gauge-text">
              <span className="gauge-label">Indice de Santé & Conformité</span>
              <span className="gauge-status-desc">
                {node.status === 'HEALTHY' && 'Paramétrage optimal en phase avec les résultats.'}
                {node.status === 'WARNING' && 'Des ajustements sont recommandés pour optimiser le pipe.'}
                {node.status === 'CRITICAL' && 'Pertes de leads détectées : intervention requise.'}
                {node.status === 'UNANALYZED' && 'Données d\'activité insuffisantes pour calculer un score.'}
              </span>
            </div>
            <div className={`gauge-score-value ${node.status.toLowerCase()}`}>
              {node.status === 'UNANALYZED' ? '—' : `${node.healthScore}%`}
            </div>
          </div>

          {/* Diagnostic Summary */}
          {node.summary && (
            <div className="drawer-section">
              <div className="section-heading">
                <Activity size={15} />
                <span>Diagnostic de l'Agent</span>
              </div>
              <div className="summary-box">
                {node.summary}
              </div>
            </div>
          )}

          {/* Metrics & Performance Strip */}
          <div className="drawer-section">
            <div className="section-heading">
              <Sliders size={15} />
              <span>Indicateurs de Performance</span>
            </div>
            <div className="funnel-grid">
              <div className="funnel-card">
                <span className="funnel-label">{node.type === 'sourcing' ? 'Leads Extraits' : 'Leads Traités'}</span>
                <span className="funnel-number">{node.metrics.totalLeads}</span>
              </div>
              {node.metrics.qualificationRate !== undefined && (
                <div className="funnel-card">
                  <span className="funnel-label">Taux de Qualification</span>
                  <span className="funnel-number" style={{ color: node.metrics.qualificationRate < 50 ? '#FF4757' : '#00E5A0' }}>
                    {node.metrics.qualificationRate}%
                  </span>
                </div>
              )}
              {node.metrics.emailsSent !== undefined && (
                <div className="funnel-card">
                  <span className="funnel-label">Emails Envoyés</span>
                  <span className="funnel-number">{node.metrics.emailsSent}</span>
                </div>
              )}
              {node.metrics.replyRate !== undefined && (
                <div className="funnel-card">
                  <span className="funnel-label">Taux de Réponse</span>
                  <span className="funnel-number" style={{ color: '#00E5C8' }}>
                    {node.metrics.replyRate}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Findings List */}
          {node.findings && node.findings.length > 0 && (
            <div className="drawer-section">
              <div className="section-heading">
                <AlertTriangle size={15} />
                <span>Constats Détaillés ({node.findings.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {node.findings.map(finding => (
                  <div
                    key={finding.id}
                    style={{
                      background: finding.severity === 'critical' ? 'rgba(255, 71, 87, 0.08)' : finding.severity === 'warning' ? 'rgba(255, 184, 0, 0.08)' : 'rgba(0, 229, 200, 0.06)',
                      border: `1px solid ${finding.severity === 'critical' ? 'rgba(255, 71, 87, 0.25)' : finding.severity === 'warning' ? 'rgba(255, 184, 0, 0.25)' : 'rgba(0, 229, 200, 0.2)'}`,
                      borderRadius: '8px',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: finding.severity === 'critical' ? '#FF4757' : finding.severity === 'warning' ? '#FFB800' : '#00E5C8' }}>
                      {finding.severity === 'critical' ? '🔴' : finding.severity === 'warning' ? '⚠️' : 'ℹ️'}
                      <span>{finding.title}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.5, color: '#94A3B8' }}>
                      {finding.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations Diff Cards */}
          <div className="drawer-section">
            <div className="section-heading">
              <Zap size={15} />
              <span>Recommandations Stratégiques ({node.recommendations.length})</span>
            </div>
            {node.recommendations.length === 0 ? (
              <div className="summary-box" style={{ color: '#00E5A0', textAlign: 'center' }}>
                ✓ Aucun ajustement nécessaire. La configuration de cet agent est optimale.
              </div>
            ) : (
              node.recommendations.map(rec => (
                <div key={rec.id} className="recommendation-card">
                  <div className="rec-header">
                    <span className="rec-label">{rec.label}</span>
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
        </div>
      </aside>
    </>
  );
};
