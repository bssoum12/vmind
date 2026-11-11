'use client';

import React, { useEffect } from 'react';
import {
  X,
  Users,
  Layers,
  ShieldCheck,
  FileText,
  Send,
  ChevronRight,
  Phone,
  Info,
  CornerDownRight,
  Bot,
  Target,
  AlertTriangle,
} from 'lucide-react';
import { FleetFunnelData } from '../types/supervisor.types';

interface SupervisorPipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  funnelData: FleetFunnelData | null;
  isLoading?: boolean;
  hasError?: boolean;
}

export const SupervisorPipelineModal: React.FC<SupervisorPipelineModalProps> = ({
  isOpen,
  onClose,
  funnelData,
  isLoading = false,
  hasError = false,
}) => {
  // Close on Escape key press (Apple design standard)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const summary = funnelData?.summary || {
    totalSourced: 0,
    totalTransferred: 0,
    totalQualified: 0,
    totalRejected: 0,
    totalEvaluated: 0,
    totalDrafts: 0,
    totalEmailsSent: 0,
    emailErrors: 0,
    totalPhonesRevealed: 0,
    totalPhonesAvailable: 0,
    globalConversionRate: 0,
    qualificationRate: 0,
    contactRate: 0,
  };

  const agentPairs = funnelData?.agentPairs || [];

  return (
    <div
      className="supervisor-pipeline-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Pipeline Commercial & Métriques Flotte"
    >
      {/* Standalone Cyber-Glass Modal Card */}
      <div
        className="supervisor-pipeline-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Grid Background */}
        <div className="modal-cyber-grid" />
        <div className="modal-ambient-glow" />

        {/* Header */}
        <header className="pipeline-modal-header">
          <div className="header-meta">
            <div className="meta-eyebrow">
              <span className="eyebrow-pill">Périmètre mission active</span>
              <span className="eyebrow-sep">·</span>
              <span className="eyebrow-text">
                {agentPairs.length} {agentPairs.length > 1 ? 'binômes surveillés' : 'binôme surveillé'}
              </span>
              {summary.totalPhonesRevealed > 0 && (
                <>
                  <span className="eyebrow-sep">·</span>
                  <span className="eyebrow-text phone">
                    <Phone size={10} />
                    <span>
                      {summary.totalPhonesRevealed}
                      {summary.totalPhonesAvailable > 0 ? `/${summary.totalPhonesAvailable}` : ''} mobiles
                    </span>
                  </span>
                </>
              )}
            </div>
            <h2 className="modal-title">Pipeline Commercial & Conversions</h2>
            <p className="modal-subtitle">
              Chaîne de conversion consolidée et transferts opérationnels directs entre agents de sourcing et de prospection.
            </p>
          </div>

          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            title="Fermer (Échap)"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </header>

        {/* Modal Scrollable Content */}
        <div className="pipeline-modal-content">
          {hasError && (
            <div
              style={{
                marginBottom: '18px',
                padding: '12px 16px',
                borderRadius: '10px',
                background: 'rgba(255, 71, 87, 0.1)',
                border: '1px solid rgba(255, 71, 87, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: '#FF6B7A',
                fontSize: '13px',
              }}
            >
              <AlertTriangle size={18} style={{ color: '#FF4757', flexShrink: 0 }} />
              <span>
                Impossible de synchroniser les dernières métriques du pipeline commercial. Les volumes affichés peuvent être incomplets.
              </span>
            </div>
          )}

          {/* 1. Linear Conversion Stages (Clean, Spacious, NO Kicker & NO Badge Spam) */}
          <section className="pipeline-stages-section">
            <div className="section-label-row">
              <span className="section-kicker">Chaîne de Conversion Linéaire</span>
            </div>

            <div className="pipeline-stages-track">
              {/* Stage 1: Sourcés */}
              <div
                className="pipeline-stage-card cyan"
                title="Nombre total de prospects identifiés lors de la dernière mission active"
              >
                <div className="stage-top">
                  <div className="stage-monogram">
                    <Users size={18} />
                  </div>
                  <span className="stage-name">Sourcés</span>
                </div>
                <div className="stage-val-row">
                  <span className="stage-val">{summary.totalSourced.toLocaleString()}</span>
                  <span className="stage-sub">identifiés</span>
                </div>
              </div>

              <div className="stage-arrow">
                <ChevronRight size={14} />
              </div>

              {/* Stage 2: Transférés */}
              <div
                className="pipeline-stage-card blue"
                title="Prospects transmis aux agents de prospection cibles"
              >
                <div className="stage-top">
                  <div className="stage-monogram">
                    <Layers size={18} />
                  </div>
                  <span className="stage-name">Transférés</span>
                </div>
                <div className="stage-val-row">
                  <span className="stage-val">{summary.totalTransferred.toLocaleString()}</span>
                  <span className="stage-sub">transmis</span>
                </div>
              </div>

              <div className="stage-arrow">
                <ChevronRight size={14} />
              </div>

              {/* Stage 3: Qualifiés */}
              <div
                className="pipeline-stage-card emerald highlight"
                title={`${summary.totalQualified} prospects validés`}
              >
                <div className="stage-top">
                  <div className="stage-monogram">
                    <ShieldCheck size={18} />
                  </div>
                  <span className="stage-name">Qualifiés</span>
                </div>
                <div className="stage-val-row">
                  <span className="stage-val text-emerald">
                    {summary.totalQualified.toLocaleString()}
                  </span>
                  <span className="stage-sub">validés</span>
                </div>
              </div>

              <div className="stage-arrow">
                <ChevronRight size={14} />
              </div>

              {/* Stage 4: Brouillons */}
              <div
                className="pipeline-stage-card orange"
                title="Messages d'approche personnalisés préparés par l'IA"
              >
                <div className="stage-top">
                  <div className="stage-monogram">
                    <FileText size={18} />
                  </div>
                  <span className="stage-name">Brouillons</span>
                </div>
                <div className="stage-val-row">
                  <span className="stage-val">{summary.totalDrafts.toLocaleString()}</span>
                  <span className="stage-sub">prêts</span>
                </div>
              </div>

              <div className="stage-arrow">
                <ChevronRight size={14} />
              </div>

              {/* Stage 5: Envoyés */}
              <div
                className="pipeline-stage-card purple"
                title="E-mails de prospection délivrés aux contacts ciblés"
              >
                <div className="stage-top">
                  <div className="stage-monogram">
                    <Send size={18} />
                  </div>
                  <span className="stage-name">Envoyés</span>
                </div>
                <div className="stage-val-row">
                  <span className="stage-val text-purple">
                    {summary.totalEmailsSent.toLocaleString()}
                  </span>
                  <span className="stage-sub">délivrés</span>
                </div>
              </div>
            </div>
          </section>

          {/* 2. Detailed Binômes Performance Table (Clean Typography, Rule 70 Compliant) */}
          <section className="pipeline-binomes-table-section">
            <div className="table-header-row">
              <div className="table-title-group">
                <h3 className="table-title">Performance Détaillée par Binôme</h3>
                <span className="table-badge">
                  {agentPairs.length} {agentPairs.length > 1 ? 'liaisons actives' : 'liaison active'}
                </span>
              </div>
            </div>

            {agentPairs.length === 0 ? (
              <div className="binome-empty-state">
                <Info size={20} className="empty-icon" />
                <div className="empty-text">
                  <span className="empty-title">Aucune liaison active pour le moment</span>
                  <span className="empty-desc">
                    Les binômes s&apos;afficheront ici dès qu&apos;un agent de sourcing commencera à transmettre des leads à un prospecteur.
                  </span>
                </div>
              </div>
            ) : (
              <div className="binome-table-wrapper">
                <table className="binome-table">
                  <thead>
                    <tr>
                      <th style={{ width: '25%' }}>SOURCING</th>
                      <th style={{ width: '25%' }}>PROSPECTION</th>
                      <th className="num" style={{ width: '10%' }}>TRANSFÉRÉS</th>
                      <th className="num" style={{ width: '12%' }}>QUALIFIÉS</th>
                      <th className="num" style={{ width: '9%' }}>MOBILES</th>
                      <th className="num" style={{ width: '9%' }}>BROUILLONS</th>
                      <th className="num" style={{ width: '10%' }}>ENVOYÉS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agentPairs.map((pair, idx) => (
                      <tr
                        key={`${pair.sourceUuid || pair.sourceAgentId}-${pair.targetUuid || pair.targetAgentId}-${idx}`}
                      >
                        {/* Source Agent */}
                        <td className="col-agent">
                          <div className="agent-chip sourcing">
                            <div className="chip-monogram">
                              <Bot size={12} />
                            </div>
                            <div className="chip-text">
                              <span className="role-tag">SOURCING</span>
                              <span className="agent-name" title={pair.sourceName}>
                                {pair.sourceName}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Target Agent */}
                        <td className="col-agent">
                          <div className="agent-chip prospect">
                            <CornerDownRight size={12} className="handoff-arrow" />
                            <div className="chip-monogram">
                              <Target size={12} />
                            </div>
                            <div className="chip-text">
                              <span className="role-tag">PROSPECTION</span>
                              <span className="agent-name" title={pair.targetName}>
                                {pair.targetName}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Transferred */}
                        <td className="num">
                          <span className="cell-num">{pair.transferredCount.toLocaleString()}</span>
                        </td>

                        {/* Qualified: Clean count only */}
                        <td className="num">
                          <span className="cell-num bold">{pair.qualifiedCount.toLocaleString()}</span>
                        </td>

                        {/* Mobiles */}
                        <td className="num">
                          <span className="cell-num bold">{pair.phonesRevealedCount}</span>
                          {pair.phonesAvailableCount > 0 && (
                            <span className="cell-num-sub">/{pair.phonesAvailableCount}</span>
                          )}
                        </td>

                        {/* Drafts */}
                        <td className="num">
                          <span className="cell-num">{pair.draftsCount.toLocaleString()}</span>
                        </td>

                        {/* Emails Sent: Clean count only */}
                        <td className="num">
                          <span className="cell-num bold">{pair.emailsSentCount.toLocaleString()}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 3. Scope Notice Footer */}
          <footer className="pipeline-modal-footer">
            <div className="footer-glow-bar" />
            <Info size={15} className="footer-info-icon" />
            <span className="footer-info-text">
              <strong>Périmètre d&apos;analyse :</strong> Seuls les prospects issus de la dernière mission active de chaque agent sont évalués dans cette vue consolidée. Vos leads historiques restent préservés et intacts en base de données sans être altérés.
            </span>
          </footer>
        </div>
      </div>
    </div>
  );
};
