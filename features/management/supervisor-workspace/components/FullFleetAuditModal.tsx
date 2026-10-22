'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { FleetAuditSummary } from '../types/supervisor.types';

interface FullFleetAuditModalProps {
  summary: FleetAuditSummary;
  onClose: () => void;
  onCompleteAudit: () => void;
}

export const FullFleetAuditModal: React.FC<FullFleetAuditModalProps> = ({
  summary,
  onClose,
  onCompleteAudit
}) => {
  const [step, setStep] = useState<'running' | 'done'>('running');
  const [progressText, setProgressText] = useState('Analyse des agents de Sourcing...');

  useEffect(() => {
    const t1 = setTimeout(() => {
      setProgressText('Évaluation des filtres et ICP des agents de Prospection...');
    }, 1200);

    const t2 = setTimeout(() => {
      setProgressText('Calcul des matrices de synchronisation inter-agents...');
    }, 2400);

    const t3 = setTimeout(() => {
      setProgressText('Génération des recommandations stratégiques...');
    }, 3600);

    const t4 = setTimeout(() => {
      setStep('done');
      onCompleteAudit();
    }, 4800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onCompleteAudit]);

  return (
    <div className="supervisor-modal-backdrop" onClick={onClose}>
      <div className="supervisor-modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Sparkles size={18} />
            <span>Audit Global de la Flotte d'Agents</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {step === 'running' ? (
            <div className="audit-progress-container">
              <div className="spinner-ring" />
              <div className="audit-step-label">{progressText}</div>
              <div className="audit-subtext">
                L'agent superviseur audite l'ensemble des 6 agents et leurs liaisons de données.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                background: 'rgba(0, 229, 200, 0.08)',
                border: '1px solid rgba(0, 229, 200, 0.25)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#00E5C8', fontWeight: 700, textTransform: 'uppercase' }}>
                    Audit Global Réalisé avec Succès
                  </div>
                  <div style={{ fontSize: '14px', color: '#F0F4F8', fontWeight: 600 }}>
                    Score d'Efficacité Globale de la Flotte
                  </div>
                </div>
                <div style={{
                  fontSize: '28px',
                  fontWeight: 800,
                  color: '#00E5C8',
                  background: 'rgba(0, 229, 200, 0.15)',
                  padding: '4px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(0, 229, 200, 0.3)'
                }}>
                  {summary.overallScore}%
                </div>
              </div>

              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#94A3B8', marginBottom: '8px', textTransform: 'uppercase' }}>
                  Priorités Stratégiques Identifiées
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {summary.topPriorities.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(12, 28, 52, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        fontSize: '13px',
                        lineHeight: 1.5,
                        color: '#CBD5E1',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px'
                      }}
                    >
                      <span style={{ color: '#00E5C8', fontWeight: 700 }}>#{idx + 1}</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step === 'done' ? (
            <button className="btn-primary" onClick={onClose}>
              Explorer le Graphe d'Optimisation
            </button>
          ) : (
            <button className="btn-secondary" onClick={onClose}>
              Annuler
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
