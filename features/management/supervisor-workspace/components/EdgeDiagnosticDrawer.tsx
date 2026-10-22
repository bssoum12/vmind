'use client';

import React, { useState } from 'react';
import { X, GitFork, ArrowRight, CheckCircle2, XCircle, Sliders, Check, Zap, AlertOctagon } from 'lucide-react';
import { SupervisorLink } from '../types/supervisor.types';

interface EdgeDiagnosticDrawerProps {
  link: SupervisorLink;
  onClose: () => void;
  onApplyRecommendation: (recId: string) => void;
  onTriggerTargetedAudit: (linkId: string) => Promise<void>;
}

export const EdgeDiagnosticDrawer: React.FC<EdgeDiagnosticDrawerProps> = ({
  link,
  onClose,
  onApplyRecommendation,
  onTriggerTargetedAudit
}) => {
  const [isAuditing, setIsAuditing] = useState(false);

  const handleAuditClick = async () => {
    setIsAuditing(true);
    try {
      await onTriggerTargetedAudit(link.id);
    } finally {
      setIsAuditing(false);
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
          {/* Alignment Score Card */}
          <div className="health-score-card">
            <div className="gauge-text">
              <span className="gauge-label">Score de Synchronisation Inter-Agents</span>
              <span className="gauge-status-desc">
                {link.status === 'HEALTHY' && 'Les critères de sourcing alimentent parfaitement l\'ICP du prospecteur.'}
                {link.status === 'WARNING' && 'Quelques discordances de filtres réduisent le débit qualifié.'}
                {link.status === 'CRITICAL' && 'Perte massive de leads : le ciblage amont est incompatible avec l\'ICP aval.'}
                {link.status === 'UNANALYZED' && 'Liaison en attente d\'analyse comparative.'}
              </span>
            </div>
            <div className={`gauge-score-value ${link.status.toLowerCase()}`}>
              {link.status === 'UNANALYZED' ? '—' : `${link.alignmentScore}%`}
            </div>
          </div>

          {/* Diagnostic Summary */}
          {link.summary && (
            <div className="drawer-section">
              <div className="section-heading">
                <AlertOctagon size={15} />
                <span>Diagnostic de Cohérence</span>
              </div>
              <div className="summary-box">
                {link.summary}
              </div>
            </div>
          )}

          {/* Throughput & Funnel */}
          <div className="drawer-section">
            <div className="section-heading">
              <GitFork size={15} />
              <span>Entonnoir de Conversion</span>
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
                <span className="funnel-label">Leads Rejetés</span>
                <span className="funnel-number" style={{ color: '#FF4757' }}>
                  {link.throughput.leadsRejected}
                </span>
              </div>
              <div className="funnel-card">
                <span className="funnel-label">Taux d'Entonnoir</span>
                <span className="funnel-number" style={{ color: link.throughput.conversionRate < 40 ? '#FF4757' : '#00E5C8' }}>
                  {link.throughput.conversionRate}%
                </span>
              </div>
            </div>
          </div>

          {/* Semantic ICP Alignment Matrix */}
          {link.alignmentMatrix && link.alignmentMatrix.length > 0 && (
            <div className="drawer-section">
              <div className="section-heading">
                <Sliders size={15} />
                <span>Matrice d'Adéquation des Critères</span>
              </div>
              <table className="alignment-matrix-table">
                <thead>
                  <tr>
                    <th>Dimension</th>
                    <th>Critère Sourcing</th>
                    <th>Critère Prospection</th>
                    <th>État</th>
                  </tr>
                </thead>
                <tbody>
                  {link.alignmentMatrix.map((item, idx) => (
                    <tr key={idx}>
                      <td className="dimension-cell">{item.dimension}</td>
                      <td style={{ color: '#E2E8F0' }}>{item.sourcingValue}</td>
                      <td style={{ color: '#E2E8F0' }}>{item.prospectValue}</td>
                      <td>
                        <span className={`match-status ${item.isMatch ? 'match' : 'mismatch'}`}>
                          {item.isMatch ? (
                            <>
                              <CheckCircle2 size={13} />
                              <span>OK</span>
                            </>
                          ) : (
                            <>
                              <XCircle size={13} />
                              <span>Conflit</span>
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Top Disqualification Reasons */}
          {link.topRejectionReasons && link.topRejectionReasons.length > 0 && (
            <div className="drawer-section">
              <div className="section-heading">
                <AlertOctagon size={15} />
                <span>Causes de Rejet les Plus Fréquentes</span>
              </div>
              <div className="rejection-list">
                {link.topRejectionReasons.map((reason, idx) => (
                  <div key={idx} className="rejection-item">
                    <span className="reason-text">{reason.reason}</span>
                    <span className="reason-badge">{reason.percentage}% ({reason.count})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations Diff Cards */}
          <div className="drawer-section">
            <div className="section-heading">
              <Zap size={15} />
              <span>Actions Correctives Recommandées ({link.recommendations.length})</span>
            </div>
            {link.recommendations.length === 0 ? (
              <div className="summary-box" style={{ color: '#00E5A0', textAlign: 'center' }}>
                ✓ Aucun conflit détecté sur cette liaison. Les deux agents collaborent parfaitement.
              </div>
            ) : (
              link.recommendations.map(rec => (
                <div key={rec.id} className={`recommendation-card ${rec.applied ? 'applied' : ''}`}>
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

                  <button
                    className="apply-rec-btn"
                    disabled={rec.applied}
                    onClick={() => onApplyRecommendation(rec.id)}
                  >
                    {rec.applied ? (
                      <>
                        <Check size={14} />
                        <span>Modification appliquée ✓</span>
                      </>
                    ) : (
                      <>
                        <Sliders size={14} />
                        <span>Appliquer à {rec.targetAgentName}</span>
                      </>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="drawer-footer">
          <button
            className="targeted-audit-btn"
            disabled={isAuditing}
            onClick={handleAuditClick}
          >
            <Zap size={16} />
            <span>{isAuditing ? 'Audit de liaison en cours...' : 'Analyser cette liaison uniquement'}</span>
          </button>
        </div>
      </aside>
    </>
  );
};
