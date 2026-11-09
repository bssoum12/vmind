'use client';

import React from 'react';
import {
  Users,
  Layers,
  ShieldCheck,
  FileText,
  Send,
  ChevronRight,
  Phone,
  BarChart3,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { FleetFunnelData } from '../types/supervisor.types';
import { VMindGuideArrow } from '@/shared/management/components/VMindGuide';

interface SupervisorPipelineHUDProps {
  funnelData: FleetFunnelData | null;
  isLoading: boolean;
  onOpenBinomes: () => void;
  isBinomesOpen?: boolean;
  tutorialStep?: number;
}

export const SupervisorPipelineHUD: React.FC<SupervisorPipelineHUDProps> = ({
  funnelData,
  isLoading,
  onOpenBinomes,
  isBinomesOpen = false,
  tutorialStep = 0,
}) => {
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

  // When 0 leads exist across the entire fleet
  const isEmpty = summary.totalSourced === 0 && !isLoading;

  return (
    <div
      className="supervisor-pipeline-hud"
      role="region"
      aria-label="Pipeline commercial consolidé"
      style={{
        position: 'relative',
        zIndex: (tutorialStep === 3 || tutorialStep === 4) ? 10001 : 12,
        overflow: (tutorialStep === 3 || tutorialStep === 4) ? 'visible' : undefined,
      }}
    >
      {/* ── Left: The 5 Linear Conversion Stages ── */}
      <div
        className="hud-stages-track"
        style={
          tutorialStep === 3
            ? {
                position: 'relative',
                zIndex: 10003,
                boxShadow: '0 0 0 2px #00E5C8, 0 0 25px rgba(0, 229, 200, 0.65)',
                borderRadius: '10px',
                padding: '4px 6px',
                background: 'rgba(6, 17, 31, 0.98)',
              }
            : undefined
        }
      >
        {tutorialStep === 3 && (
          <VMindGuideArrow
            direction="up"
            color="#00E5C8"
            style={{
              position: 'absolute',
              bottom: '-44px',
              left: '50%',
              marginLeft: '-8px',
              zIndex: 10004,
            }}
          />
        )}

        {/* Scope Pill: Dernière Mission Active */}
        <div
          className="hud-mission-scope-pill"
          title="Périmètre d'analyse : Seuls les prospects générés lors de la dernière mission active de chaque agent sont évalués ici (échantillon représentatif plafonné). Vos leads historiques restent préservés en base de données sans être altérés."
        >
          <span className="scope-dot" />
          <span className="scope-text">Mission active</span>
          <Info size={11} className="scope-info-icon" />
        </div>

        <div className="hud-stages-divider" />

        {/* Stage 1: Sourcés */}
        <div className="hud-stage-step" title="Nombre de prospects identifiés lors de la dernière mission active (échantillon évalué)">
          <div className="step-icon-wrap">
            <Users size={14} />
          </div>
          <div className="step-info">
            <span className="step-label">Sourcés</span>
            <span className="step-val">{summary.totalSourced.toLocaleString()}</span>
          </div>
        </div>

        <ChevronRight size={13} className="hud-step-arrow" />

        {/* Stage 2: Transférés */}
        <div className="hud-stage-step" title="Prospects de la dernière mission transmis aux agents de prospection cibles">
          <div className="step-icon-wrap">
            <Layers size={14} />
          </div>
          <div className="step-info">
            <span className="step-label">Transférés</span>
            <span className="step-val">{summary.totalTransferred.toLocaleString()}</span>
          </div>
        </div>

        <ChevronRight size={13} className="hud-step-arrow" />

        {/* Stage 3: Prospects Qualifiés */}
        <div
          className="hud-stage-step"
          title={`${summary.totalQualified} prospects conformes aux critères de qualification sur la dernière mission active (${summary.qualificationRate}%)`}
        >
          <div className="step-icon-wrap">
            <ShieldCheck size={14} />
          </div>
          <div className="step-info">
            <div className="step-label-row">
              <span className="step-label">Qualifiés</span>
              {summary.qualificationRate > 0 && (
                <span className="step-rate-badge">{summary.qualificationRate}%</span>
              )}
            </div>
            <span className="step-val">{summary.totalQualified.toLocaleString()}</span>
          </div>
        </div>

        <ChevronRight size={13} className="hud-step-arrow" />

        {/* Stage 4: Brouillons Prêts */}
        <div className="hud-stage-step" title="Messages d'approche personnalisés rédigés par l'IA pour cette mission">
          <div className="step-icon-wrap">
            <FileText size={14} />
          </div>
          <div className="step-info">
            <span className="step-label">Brouillons</span>
            <span className="step-val">{summary.totalDrafts.toLocaleString()}</span>
          </div>
        </div>

        <ChevronRight size={13} className="hud-step-arrow" />

        {/* Stage 5: E-mails Envoyés */}
        <div className="hud-stage-step" title="E-mails de prospection effectivement délivrés pour cette mission">
          <div className="step-icon-wrap">
            <Send size={14} />
          </div>
          <div className="step-info">
            <span className="step-label">Envoyés</span>
            <span className="step-val">{summary.totalEmailsSent.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* ── Center Divider ── */}
      <div className="hud-divider" />

      {/* ── Right: Direct KPIs & Binôme Drawer Trigger ── */}
      <div className="hud-kpis-and-action">
        {/* Taux de Qualification */}
        <div
          className="hud-kpi-chip"
          title={`${summary.totalQualified} qualifiés sur ${summary.totalEvaluated || summary.totalTransferred} analysés`}
        >
          <span className="kpi-chip-dot" />
          <div className="kpi-chip-content">
            <span className="kpi-chip-label">Taux de Qualification</span>
            <span className="kpi-chip-val">{summary.qualificationRate}%</span>
          </div>
        </div>

        {/* Mobiles Démasqués */}
        <div
          className="hud-kpi-chip"
          title={`${summary.totalPhonesRevealed} numéros de téléphone mobile démasqués sur ${summary.totalPhonesAvailable} disponibles`}
        >
          <Phone size={13} className="kpi-icon-phone" />
          <div className="kpi-chip-content">
            <span className="kpi-chip-label">Mobiles Démasqués</span>
            <span className="kpi-chip-val">
              {summary.totalPhonesRevealed}
              {summary.totalPhonesAvailable > 0 && (
                <span className="kpi-sub-total"> / {summary.totalPhonesAvailable}</span>
              )}
            </span>
          </div>
        </div>

        {/* Binôme Drawer Action */}
        <div
          style={{
            position: 'relative',
            zIndex: tutorialStep === 4 ? 10003 : undefined,
          }}
        >
          {tutorialStep === 4 && (
            <VMindGuideArrow
              direction="up"
              color="#00E5C8"
              style={{
                position: 'absolute',
                bottom: '-44px',
                left: '50%',
                marginLeft: '-8px',
                zIndex: 10004,
              }}
            />
          )}
          <button
            type="button"
            className={`hud-binomes-btn ${isBinomesOpen ? 'active' : ''}`}
            onClick={onOpenBinomes}
            title="Consulter les volumes et conversions détaillées par binôme d'agents"
            style={
              tutorialStep === 4
                ? {
                    position: 'relative',
                    zIndex: 10003,
                    background: '#00E5C8',
                    color: '#04101E',
                    fontWeight: 700,
                    boxShadow: '0 0 0 3px #00E5C8, 0 0 25px rgba(0, 229, 200, 0.75)',
                  }
                : undefined
            }
          >
            <BarChart3 size={14} />
            <span>Performances Binômes</span>
            {agentPairs.length > 0 && (
              <span
                className="binomes-count-pill"
                style={
                  tutorialStep === 4
                    ? {
                        background: '#04101E',
                        color: '#00E5C8',
                      }
                    : undefined
                }
              >
                {agentPairs.length}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

