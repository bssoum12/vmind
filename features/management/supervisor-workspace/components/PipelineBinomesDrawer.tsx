'use client';

import React, { useEffect } from 'react';
import {
  X,
  CornerDownRight,
  Info,
  Users,
  Layers,
  ShieldCheck,
  Send,
  Phone,
} from 'lucide-react';
import { AgentPairFunnelRow, FleetFunnelData } from '../types/supervisor.types';

interface PipelineBinomesDrawerProps {
  agentPairs: AgentPairFunnelRow[];
  summary: FleetFunnelData['summary'];
  onClose: () => void;
}

export const PipelineBinomesDrawer: React.FC<PipelineBinomesDrawerProps> = ({
  agentPairs,
  summary,
  onClose,
}) => {
  // Close drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <>
      {/* 1. Frosted Backdrop */}
      <div
        className="diagnostic-drawer-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 2. Apple Pro Clean Minimalist Drawer */}
      <aside
        className="diagnostic-drawer edge-drawer apple-style pipeline-binomes-drawer"
        role="dialog"
        aria-label="Performance par binôme d'agents"
      >
        {/* Header */}
        <header className="drawer-header edge-header-apple">
          <div className="header-top-row">
            <div className="header-meta">
              <span className="eyebrow-tag">Pipeline Commercial</span>
              <span className="binomes-count-tag">
                {agentPairs.length} {agentPairs.length > 1 ? 'binômes actifs' : 'binôme actif'}
              </span>
            </div>
            <button
              className="apple-close-btn"
              onClick={onClose}
              title="Fermer (Échap)"
              aria-label="Fermer"
            >
              <X size={15} />
            </button>
          </div>

          <h2 className="drawer-agent-title">
            Performance par Binôme
          </h2>
          <p className="drawer-agent-sub">
            Volumes et conversions directes entre chaque agent de sourcing et son prospecteur cible.
          </p>
        </header>

        {/* Content */}
        <div className="drawer-content apple-drawer-content">
          {/* Scope Notice Banner */}
          <div className="binome-scope-banner">
            <Info size={14} className="scope-banner-icon" />
            <div className="scope-banner-content">
              <span className="scope-banner-title">Périmètre d&apos;évaluation : Dernière mission active</span>
              <span className="scope-banner-desc">
                Ces métriques mesurent exclusivement les prospects issus de la dernière mission de chaque agent (échantillon représentatif plafonné). Vos leads historiques restent précieusement conservés en base de données : le superviseur isole cette session récente pour tester avec précision la qualité de vos instructions actuelles.
              </span>
            </div>
          </div>

          {/* Executive Glass Metric Tiles */}
          <div className="binome-kpi-grid">
            <div className="kpi-card">
              <div className="kpi-card-header">
                <Users size={14} className="kpi-icon text-cyan" />
                <span className="kpi-label">Leads Sourcés</span>
              </div>
              <span className="kpi-value">{summary.totalSourced.toLocaleString()}</span>
            </div>

            <div className="kpi-card">
              <div className="kpi-card-header">
                <Layers size={14} className="kpi-icon" style={{ color: '#00B4D8' }} />
                <span className="kpi-label">Transférés</span>
              </div>
              <span className="kpi-value">{summary.totalTransferred.toLocaleString()}</span>
            </div>

            <div className="kpi-card highlight">
              <div className="kpi-card-header">
                <ShieldCheck size={14} className="kpi-icon text-emerald" />
                <span className="kpi-label">Taux de Qualification</span>
              </div>
              <div className="kpi-value-row">
                <span className="kpi-value text-emerald">{summary.qualificationRate}%</span>
                <span className="kpi-sub">({summary.totalQualified.toLocaleString()} qualifiés)</span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-card-header">
                <Send size={14} className="kpi-icon" style={{ color: '#9D4EDD' }} />
                <span className="kpi-label">E-mails Envoyés</span>
              </div>
              <div className="kpi-value-row">
                <span className="kpi-value">{summary.totalEmailsSent.toLocaleString()}</span>
                {summary.contactRate > 0 && (
                  <span className="kpi-sub">({summary.contactRate}% contactés)</span>
                )}
              </div>
            </div>
          </div>

          {/* Clean High-Density Pro Table */}
          {agentPairs.length === 0 ? (
            <div className="binome-pro-empty">
              <Info size={16} className="empty-icon" />
              <div className="empty-text">
                <span className="empty-title">Aucune liaison active</span>
                <span className="empty-desc">
                  Les binômes s&apos;affichent ici dès qu&apos;un agent de sourcing transmet des leads à un prospecteur.
                </span>
              </div>
            </div>
          ) : (
            <div className="binome-pro-table-wrapper">
              <table className="binome-pro-table">
                <thead>
                  <tr>
                    <th>Sourcing</th>
                    <th>Prospection</th>
                    <th className="num">Transférés</th>
                    <th className="num">Qualifiés</th>
                    <th className="num">Mobiles</th>
                    <th className="num">Brouillons</th>
                    <th className="num">Envoyés</th>
                  </tr>
                </thead>
                <tbody>
                  {agentPairs.map((pair, idx) => (
                    <tr
                      key={`${pair.sourceUuid || pair.sourceAgentId}-${pair.targetUuid || pair.targetAgentId}-${idx}`}
                    >
                      <td className="source-col">
                        <span className="agent-badge-sourcing">
                          <span className="dot" />
                          <span>{pair.sourceName}</span>
                        </span>
                      </td>
                      <td className="target-col">
                        <div className="target-wrap">
                          <CornerDownRight size={12} className="target-arrow" />
                          <span className="agent-badge-prospect">
                            <span className="dot" />
                            <span>{pair.targetName}</span>
                          </span>
                        </div>
                      </td>
                      <td className="num">{pair.transferredCount.toLocaleString()}</td>
                      <td className="num">
                        <span className="num-bold">{pair.qualifiedCount.toLocaleString()}</span>
                        <span className="num-pill-green">({pair.qualificationRate}%)</span>
                      </td>
                      <td className="num">
                        <span className="num-bold">{pair.phonesRevealedCount}</span>
                        {pair.phonesAvailableCount > 0 && (
                          <span className="num-muted">/{pair.phonesAvailableCount}</span>
                        )}
                      </td>
                      <td className="num">{pair.draftsCount.toLocaleString()}</td>
                      <td className="num">
                        <span className="num-bold">{pair.emailsSentCount.toLocaleString()}</span>
                        {pair.contactRate > 0 && (
                          <span className="num-pill-purple">({pair.contactRate}%)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
