'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Zap, Plus, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SourcingLauncherModalProps {
  isOpen: boolean;
  onClose: () => void;
  prospectAgent: any;
  sourcingAgents: any[];
  onSelectAndRun: (sourcingAgent: any) => void;
}

export const SourcingLauncherModal: React.FC<SourcingLauncherModalProps> = ({
  isOpen,
  onClose,
  prospectAgent,
  sourcingAgents,
  onSelectAndRun,
}) => {
  const router = useRouter();

  if (!isOpen) return null;

  const currentProspectId = String(prospectAgent?.uuid || prospectAgent?.agent_id || '').toLowerCase();
  const currentProspectName = prospectAgent?.agent_name || prospectAgent?.nom || 'Votre Agent de Prospection';

  const isAgentTargetingCurrent = (sa: any): boolean => {
    const rawTargets = sa?.config?.target_agent_ids || sa?.target_agent_ids || [];
    if (!Array.isArray(rawTargets)) return false;
    return rawTargets.some((id: any) => {
      const sId = String(id).toLowerCase();
      return (
        sId === currentProspectId ||
        sId === String(prospectAgent?.uuid || '').toLowerCase() ||
        sId === String(prospectAgent?.agent_id || '').toLowerCase() ||
        sId === String(prospectAgent?.agent_name || prospectAgent?.nom || '').toLowerCase()
      );
    });
  };

  const handleSelect = (sa: any) => {
    if (sa.is_executing) return;

    const currentTargetIds = Array.isArray(sa?.config?.target_agent_ids)
      ? sa.config.target_agent_ids
      : (Array.isArray(sa?.target_agent_ids) ? sa.target_agent_ids : []);

    const updatedTargets = Array.from(
      new Set([...currentTargetIds.map(String), String(prospectAgent?.uuid || prospectAgent?.agent_id)])
    );

    const updatedAgent = {
      ...sa,
      target_agent_ids: updatedTargets,
      config: {
        ...(sa.config || {}),
        target_agent_ids: updatedTargets,
      },
    };

    onSelectAndRun(updatedAgent);
    onClose();
  };

  const handleCreateNewSourcingAgent = () => {
    if (typeof window !== 'undefined') {
      const targetId = String(prospectAgent?.uuid || prospectAgent?.agent_id || '');
      sessionStorage.setItem('vmind_sourcing_target_agent', targetId);
      sessionStorage.setItem('vmind_current_view', 'wizard');
      sessionStorage.setItem('vmind_wizard_template', 'sourcing');
      sessionStorage.setItem('vmind_mode', 'MANAGEMENT');
      localStorage.setItem('vmind_mode', 'MANAGEMENT');
      window.location.href = `/?view=wizard&template=sourcing&targetAgent=${encodeURIComponent(targetId)}`;
    }
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(6, 17, 31, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          style={{
            background: 'linear-gradient(160deg, rgba(8, 20, 38, 0.98) 0%, rgba(4, 12, 24, 0.99) 100%)',
            border: '1px solid rgba(0, 229, 200, 0.25)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 229, 200, 0.08)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '650px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: '1.5rem 1.75rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255, 255, 255, 0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: 'rgba(0, 229, 200, 0.1)',
                  border: '1px solid rgba(0, 229, 200, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#00E5C8',
                }}
              >
                <Search size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#F0F4F8' }}>
                  Recherche IA de Nouveaux Leads
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#94A3B8' }}>
                  Alimenter le pipeline de : <strong style={{ color: '#00E5C8' }}>{currentProspectName}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94A3B8',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.color = '#fff')}
              onMouseOut={(e) => (e.currentTarget.style.color = '#94A3B8')}
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div
            style={{
              padding: '1.75rem',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            {sourcingAgents.length === 0 ? (
              /* Case 1: No Sourcing Agents exist in account */
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    background: 'rgba(0, 229, 200, 0.08)',
                    border: '1px solid rgba(0, 229, 200, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#00E5C8',
                    margin: '0 auto 1.25rem auto',
                  }}
                >
                  <Zap size={28} />
                </div>
                <h4 style={{ color: '#F0F4F8', fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>
                  Aucun Sourcing Agent Détecté
                </h4>
                <p
                  style={{
                    color: '#94A3B8',
                    fontSize: '0.85rem',
                    lineHeight: '1.5',
                    maxWidth: '460px',
                    margin: '0 auto 1.5rem auto',
                  }}
                >
                  Pour alimenter automatiquement cet agent commercial avec des décideurs ciblés, vous devez déployer un <strong>Sourcing Agent</strong> qui explorera le web pour vous.
                </p>
                <button
                  type="button"
                  onClick={handleCreateNewSourcingAgent}
                  className="btn btn-primary"
                  style={{
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    margin: '0 auto',
                  }}
                >
                  <Plus size={16} />
                  <span>Déployer un Sourcing Agent</span>
                </button>
              </div>
            ) : (
              /* Case 2: Available Sourcing Agents */
              <>
                <div style={{ fontSize: '0.82rem', color: '#94A3B8', lineHeight: 1.4 }}>
                  Sélectionnez le <strong>Sourcing Agent</strong> à exécuter. Il utilisera automatiquement le profil ICP de <strong>{currentProspectName}</strong> pour extraire des prospects ciblés et les injecter directement dans ce pipeline :
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {sourcingAgents.map((sa) => {
                    const isTargeting = isAgentTargetingCurrent(sa);
                    return (
                      <div
                        key={sa.uuid || sa.agent_id || sa.agent_name}
                        style={{
                          padding: '1rem 1.25rem',
                          borderRadius: '12px',
                          background: isTargeting ? 'rgba(0, 229, 200, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                          border: isTargeting ? '1px solid rgba(0, 229, 200, 0.3)' : '1px solid rgba(255, 255, 255, 0.07)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '1rem',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <strong style={{ color: '#F0F4F8', fontSize: '0.92rem' }}>
                              {sa.agent_name}
                            </strong>
                            {isTargeting ? (
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  background: 'rgba(0, 229, 200, 0.15)',
                                  color: '#00E5C8',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <ShieldCheck size={11} /> Connecté à cet agent
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  color: '#94A3B8',
                                }}
                              >
                                Non connecté
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.75rem', color: '#64748B' }}>
                            {sa.is_executing ? (
                              <span style={{ color: '#00E5C8', fontWeight: 600 }}>⚡ En cours d'exécution...</span>
                            ) : (
                              <span>
                                Statut : <span style={{ color: '#F0F4F8' }}>{sa.statut || 'Prêt'}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={!!sa.is_executing}
                          onClick={() => handleSelect(sa)}
                          className={`btn ${sa.is_executing ? 'btn-secondary' : 'btn-primary'}`}
                          style={{
                            padding: '0.5rem 1rem',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            flexShrink: 0,
                            opacity: sa.is_executing ? 0.6 : 1,
                            cursor: sa.is_executing ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {sa.is_executing ? (
                            <>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00E5C8', boxShadow: '0 0 6px #00E5C8' }} />
                              <span>En cours...</span>
                            </>
                          ) : (
                            <>
                              <Zap size={14} />
                              <span>{isTargeting ? 'Lancer' : 'Connecter & Lancer'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                    Besoin d'un autre profil de recherche ?
                  </span>
                  <button
                    type="button"
                    onClick={handleCreateNewSourcingAgent}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(0, 229, 200, 0.25)',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: '#00E5C8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Plus size={13} />
                    <span>Nouveau Sourcing Agent</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
