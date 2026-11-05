'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  RotateCw,
  Info,
  Users,
  Layers,
  ShieldCheck,
  FileText,
  Send,
  CornerDownRight,
} from 'lucide-react';
import {
  FleetFunnelData,
  FleetFunnelStageMetric,
  AgentPairFunnelRow,
} from '../types/supervisor.types';

interface SupervisorFunnelViewProps {
  funnelData: FleetFunnelData | null;
  isLoading: boolean;
  onRefresh: () => void;
  onOpenContextModal?: () => void;
}

export const SupervisorFunnelView: React.FC<SupervisorFunnelViewProps> = ({
  funnelData,
  isLoading,
  onRefresh,
}) => {
  if (isLoading && !funnelData) {
    return (
      <div className="funnel-loading-container">
        <div className="apple-spinner-ring" />
        <span className="loading-text">Calcul de l'entonnoir commercial…</span>
      </div>
    );
  }

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

  const stages: FleetFunnelStageMetric[] = funnelData?.stages || [];
  const agentPairs: AgentPairFunnelRow[] = funnelData?.agentPairs || [];

  const getStageIcon = (id: string) => {
    switch (id) {
      case 'sourced':
        return <Users size={16} />;
      case 'transferred':
        return <Layers size={16} />;
      case 'qualified':
        return <ShieldCheck size={16} />;
      case 'drafted':
        return <FileText size={16} />;
      case 'contacted':
      case 'sent':
        return <Send size={16} />;
      default:
        return <Users size={16} />;
    }
  };

  return (
    <div className="supervisor-funnel-view">
      {/* ── 1. Top Section Header ── */}
      <div className="funnel-view-header">
        <div className="header-text-block">
          <h2 className="view-title">Entonnoir Global</h2>
          <p className="view-subtitle">
            Flux commercial direct consolidé entre les agents de sourcing et de prospection supervisés.
          </p>
        </div>
        <button
          className="refresh-button"
          onClick={onRefresh}
          disabled={isLoading}
          title="Rafraîchir les métriques"
        >
          <RotateCw size={13} className={isLoading ? 'spin-icon' : ''} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* ── 2. The Main Funnel Pipeline Card ── */}
      <div className="funnel-hero-card">
        {summary.totalSourced === 0 ? (
          <div className="funnel-empty-state">
            <Info size={20} className="text-cyan" />
            <span className="empty-title">Aucun lead mesuré dans cette flotte</span>
            <span className="empty-desc">
              Lancez un agent de sourcing pour alimenter le flux commercial.
            </span>
          </div>
        ) : (
          <>
            {/* The 5 Horizontal Pipeline Stages */}
            <div className="funnel-stages-row">
              {stages.map((stage, idx) => (
                <div key={stage.id} className="stage-column">
                  <div className="stage-top-meta">
                    <div className="stage-icon-and-step">
                      <span className="stage-icon" style={{ color: stage.color || '#00E5C8' }}>
                        {getStageIcon(stage.id)}
                      </span>
                      <span className="stage-step-num">Étape {idx + 1}</span>
                    </div>
                    <span className="stage-pct">{stage.pct}%</span>
                  </div>

                  <span className="stage-title">{stage.label}</span>

                  <div className="stage-number-row">
                    <span className="stage-big-num">{stage.count.toLocaleString()}</span>
                    <span className="stage-unit">leads</span>
                  </div>

                  <div className="stage-bar-track">
                    <motion.div
                      className="stage-bar-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(stage.pct, 4)}%` }}
                      transition={{ duration: 0.5, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
                      style={{ background: stage.color || '#00E5C8' }}
                    />
                  </div>

                  {stage.subtext && (
                    <span className="stage-subtext-detail">{stage.subtext}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Factual Bottom Strip (Real Numbers Only, No Fake Scores) */}
            <div className="funnel-facts-strip">
              <div className="fact-item">
                <span className="fact-label">Taux d'Adéquation ICP</span>
                <span className="fact-value">{summary.qualificationRate}%</span>
                <span className="fact-sub">
                  {summary.totalQualified} qualifiés / {summary.totalEvaluated || summary.totalTransferred} évalués
                </span>
              </div>

              <div className="fact-item">
                <span className="fact-label">Mobiles Directs Démasqués</span>
                <span className="fact-value">{summary.totalPhonesRevealed}</span>
                <span className="fact-sub">
                  {summary.totalPhonesAvailable > 0
                    ? `sur ${summary.totalPhonesAvailable} numéros disponibles (${summary.totalSourced} contacts au total)`
                    : `aucun numéro disponible (${summary.totalSourced} contacts au total)`}
                </span>
              </div>

              <div className="fact-item">
                <span className="fact-label">Brouillons Rédigés par l'IA</span>
                <span className="fact-value">{summary.totalDrafts}</span>
                <span className="fact-sub">
                  prêts pour relecture / envoi
                </span>
              </div>

              <div className="fact-item">
                <span className="fact-label">E-mails Envoyés</span>
                <span className="fact-value">{summary.totalEmailsSent}</span>
                <span className="fact-sub">
                  {summary.totalEmailsSent === 0
                    ? 'aucun e-mail envoyé'
                    : summary.emailErrors > 0
                    ? `${summary.emailErrors} échecs d'envoi`
                    : 'expédiés aux contacts qualifiés'}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── 3. Performance par Binôme (Direct Factual Table) ── */}
      <div className="funnel-table-card">
        <div className="table-header-block">
          <h3 className="table-section-title">Performance Détaillée par Binôme d'Agents</h3>
          <p className="table-section-desc">
            Volumes réels de leads transférés, qualifiés et contactés entre chaque agent de sourcing et son prospecteur cible.
          </p>
        </div>

        {agentPairs.length === 0 ? (
          <div className="funnel-empty-state">
            <Info size={18} className="text-cyan" />
            <span className="empty-title">Aucune liaison configurée</span>
            <span className="empty-desc">
              Aucun binôme entre agents de sourcing et de prospection dans cette flotte supervisée.
            </span>
          </div>
        ) : (
          <div className="funnel-table-scroll-wrapper">
            <table className="clean-funnel-table">
              <thead>
                <tr>
                  <th>Agent Sourcing</th>
                  <th>Agent Prospection</th>
                  <th className="th-num">Transférés</th>
                  <th className="th-num">Qualifiés ICP</th>
                  <th className="th-num">Mobiles Démasqués</th>
                  <th className="th-num">Brouillons IA</th>
                  <th className="th-num">Envoyés</th>
                </tr>
              </thead>
              <tbody>
                {agentPairs.map((pair, idx) => (
                  <tr key={idx}>
                    <td>
                      <span className="agent-name-text">{pair.sourceName}</span>
                    </td>
                    <td>
                      <div className="prospect-target-cell">
                        <CornerDownRight size={13} className="cell-arrow" />
                        <span className="agent-name-text">{pair.targetName}</span>
                      </div>
                    </td>
                    <td className="td-num">
                      <span className="bold-num">{pair.transferredCount}</span>
                    </td>
                    <td className="td-num">
                      <div className="num-with-ratio">
                        <span className="bold-num">{pair.qualifiedCount}</span>
                        <span className="ratio-pct">({pair.qualificationRate}%)</span>
                      </div>
                    </td>
                    <td className="td-num">
                      <div className="num-with-ratio">
                        <span className="bold-num">{pair.phonesRevealedCount}</span>
                        <span className="ratio-pct">/ {pair.phonesAvailableCount} disp.</span>
                      </div>
                    </td>
                    <td className="td-num">
                      <span className="bold-num">{pair.draftsCount}</span>
                    </td>
                    <td className="td-num">
                      <div className="num-with-ratio">
                        <span className="bold-num">{pair.emailsSentCount}</span>
                        <span className="ratio-pct">({pair.contactRate}%)</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
