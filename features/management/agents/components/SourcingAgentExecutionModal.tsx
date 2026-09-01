import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Check, Search, Target, Database, Info } from 'lucide-react';
import { LiveAgent } from '../AgentsView';
import { OnboardingChat } from '../../wizard/components/OnboardingChat';
import { VMindGuide } from '@/shared/management/components/VMindGuide';
import { triggerSourcingRun } from '@/shared/api/n8n-api';

interface SourcingAgentExecutionModalProps {
  agent: LiveAgent;
  onClose: () => void;
  onSuccess?: () => void;
  onToast: (msg: string, type?: 'ok' | 'err') => void;
  hideTargetAgentsSelection?: boolean;
}

export function SourcingAgentExecutionModal({ agent, onClose, onSuccess, onToast, hideTargetAgentsSelection = false }: SourcingAgentExecutionModalProps) {
  const savedMission = (
    agent?.config?.agent_mission || 
    (agent as any)?.agent_mission || 
    (agent as any)?.parameters?.agent_mission || 
    (agent as any)?.agentSettings?.agent_mission || 
    ''
  ).trim();

  const [sourcingSummary, setSourcingSummary] = useState<string>(() => savedMission || '');
  const [step, setStep] = useState<'chat' | 'config'>('chat');

  // Sourcing Execution Parameters
  const [allowExistingCompanies, setAllowExistingCompanies] = useState(false);
  const [leadsToFind, setLeadsToFind] = useState<number>(50);
  const [leadsPerCompany, setLeadsPerCompany] = useState<number>(2);
  const [isExecuting, setIsExecuting] = useState(false);

  const [availableProspectAgents, setAvailableProspectAgents] = useState<any[]>([]);
  const [isCustomizingTargets, setIsCustomizingTargets] = useState(false);
  const [selectedTargetAgentIds, setSelectedTargetAgentIds] = useState<string[]>(() => {
    const rawIds = agent?.config?.target_agent_ids || (agent as any)?.target_agent_ids || [];
    return Array.isArray(rawIds) ? rawIds.map(id => String(id)) : [];
  });

  React.useEffect(() => {
    const fetchProspectAgents = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const tokenStr = localStorage.getItem('vmind_session');
        let token = tokenStr;
        if (tokenStr?.trim().startsWith("{")) {
          try { token = JSON.parse(tokenStr).token; } catch (e) { }
        }
        const res = await fetch(`${baseUrl}/api/list-agents`, {
          headers: { ...(token && { 'Authorization': `Bearer ${token}` }) }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.agents)) {
            setAvailableProspectAgents(data.agents.filter((a: any) => a.run_mode === 'prospection' || (!a.run_mode && a.run_mode !== 'sourcing' && a.run_mode !== 'recouvrement')));
          }
        }
      } catch (err) {
        console.error("Failed to fetch prospect agents:", err);
      }
    };
    fetchProspectAgents();
  }, []);

  const getAgentTargetId = (pa: any): string => {
    if (!pa) return '';
    return String(pa.uuid || pa.agent_id || pa.id || pa.agent_name || '');
  };

  const isAgentSelected = (pa: any): boolean => {
    if (!pa || !selectedTargetAgentIds || selectedTargetAgentIds.length === 0) return false;
    const paUuid = String(pa.uuid || '').toLowerCase();
    const paAgentId = String(pa.agent_id || '').toLowerCase();
    const paName = String(pa.agent_name || pa.nom || '').toLowerCase();

    return selectedTargetAgentIds.some(id => {
      const sId = String(id).toLowerCase();
      return (paUuid && sId === paUuid) || (paAgentId && sId === paAgentId) || (paName && sId === paName);
    });
  };

  React.useEffect(() => {
    const mission = (
      agent?.config?.agent_mission || 
      (agent as any)?.agent_mission || 
      (agent as any)?.parameters?.agent_mission || 
      (agent as any)?.agentSettings?.agent_mission || 
      ''
    ).trim();
    if (mission && !sourcingSummary) {
      setSourcingSummary(mission);
    }
  }, [agent]);

  const toggleTargetAgent = (pa: any) => {
    if (!pa) return;
    const targetUuid = String(pa.uuid || pa.agent_id || pa.agent_name);
    setSelectedTargetAgentIds(prev => {
      if (isAgentSelected(pa)) {
        return prev.filter(id => {
          const sId = String(id).toLowerCase();
          return sId !== String(pa.uuid || '').toLowerCase() &&
                 sId !== String(pa.agent_id || '').toLowerCase() &&
                 sId !== String(pa.agent_name || pa.nom || '').toLowerCase();
        });
      } else {
        return [...prev, targetUuid];
      }
    });
  };

  const handleChatConfirm = (summary: string) => {
    setSourcingSummary(summary);
    setStep('config');
  };

  const handleExecute = async () => {
    // Validate inputs
    if (!hideTargetAgentsSelection && (!selectedTargetAgentIds || selectedTargetAgentIds.length === 0)) {
      onToast("Veuillez sélectionner au moins un Target Agent pour recevoir les leads.", "err");
      return;
    }
    if (leadsToFind <= 0 || leadsToFind > 100) {
      onToast("Le nombre de leads doit être entre 1 et 100", "err");
      return;
    }
    if (leadsPerCompany < 1 || leadsPerCompany > 10) {
      onToast("Le nombre de leads par entreprise doit être entre 1 et 10", "err");
      return;
    }
    if (leadsPerCompany > leadsToFind) {
      onToast("Le nombre de leads par entreprise ne peut pas dépasser le volume total de leads.", "err");
      return;
    }

    setIsExecuting(true);

    try {
      const publicId = agent.uuid || agent.agent_id?.toString() || agent.session_id;
      await triggerSourcingRun(publicId, {
        sourcingSummary,
        totalLeads: leadsToFind,
        leadsPerCompany,
        ignoreDuplicates: allowExistingCompanies,
        target_agent_ids: selectedTargetAgentIds,
        update_defaults: true
      });
      onToast(`La campagne de Sourcing a été lancée pour "${agent.agent_name}" !`, "ok");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      onToast(err.message || "Erreur lors du lancement de la campagne", "err");
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        <VMindGuide
          isOpen={true}
          mood={step === 'chat' ? 'focused' : 'convinced'}
          title="Guide de Sourcing"
          message={
            step === 'chat'
              ? "Étape 1 : Définition de la Cible. Discutez avec moi pour définir le profil exact de votre candidat idéal et les industries ciblées. Je me chargerai ensuite de trouver les meilleurs profils correspondants."
              : "Étape 2 : Configuration. Vérifiez le résumé de notre échange et ajustez les paramètres avant que je ne lance la recherche de leads."
          }
        />

        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          style={{
            background: 'rgba(15, 20, 25, 0.8)', width: 850, borderRadius: 24,
            padding: 32, boxShadow: '0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.05)',
            position: 'relative', zIndex: 100000, overflow: 'hidden',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column'
          }}
        >
          {/* Subtle background glow */}
          <div style={{ position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', width: 300, height: 150, background: 'var(--cyan)', filter: 'blur(100px)', opacity: 0.15, borderRadius: '50%' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>
                Exécution & Recherche de Profils
              </h3>
              <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>
                Agent ciblé : <strong style={{ color: 'var(--cyan)' }}>{agent.agent_name}</strong>
              </p>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text)', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
              ✕
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24, paddingRight: 4 }}>

            {step === 'chat' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, background: 'rgba(255,255,255,0.1)', borderRadius: '50%', color: '#fff', fontSize: 10 }}>1</span>
                    Étape 1 : Ciblage & Stratégie
                  </div>
                </div>

                <div style={{ height: '480px', flex: 1 }}>
                  <OnboardingChat
                    key={`${agent?.uuid || agent?.agent_name}_${sourcingSummary ? 'with_mission' : 'empty'}`}
                    initialMission={sourcingSummary}
                    onConfirm={handleChatConfirm}
                    apiEndpoint="/api/sourcing-agent/execution-chat"
                  />
                </div>
              </motion.div>
            )}

            {step === 'config' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#00E5C8', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, background: 'rgba(0,229,200,0.2)', borderRadius: '50%', color: '#00E5C8', fontSize: 10 }}>2</span>
                  Étape 2 : Paramétrage & Lancement
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>

                  {/* Left Column: Summary */}
                  <div style={{ flex: 1, minWidth: 300 }}>
                    <div style={{ padding: '18px 20px', background: 'rgba(0, 229, 200, 0.05)', border: '1px solid rgba(0, 229, 200, 0.25)', borderRadius: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Target size={18} color="#00E5C8" />
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#00E5C8' }}>Ciblage Enregistré</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setStep('chat')}
                          style={{
                            background: 'rgba(0, 229, 200, 0.1)',
                            border: '1px solid rgba(0, 229, 200, 0.3)',
                            color: '#00E5C8',
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(0, 229, 200, 0.2)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(0, 229, 200, 0.1)';
                          }}
                        >
                          <span>Modifier avec l'IA 💬</span>
                        </button>
                      </div>
                      <div style={{ fontSize: 13, color: '#F0F4F8', lineHeight: 1.6, whiteSpace: 'pre-wrap', background: 'rgba(6, 17, 31, 0.5)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        {sourcingSummary || 'Ciblage automatique basé sur la mission configurée.'}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Parameters */}
                  <div style={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>

                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: 16, borderRadius: 12 }}>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Total Leads
                        </label>
                        <input
                          type="number"
                          min={1} max={100}
                          value={leadsToFind}
                          onChange={(e) => {
                            const newTotal = Math.max(1, Math.min(100, parseInt(e.target.value) || 1));
                            setLeadsToFind(newTotal);
                            if (leadsPerCompany > newTotal) {
                              setLeadsPerCompany(Math.min(10, newTotal));
                            }
                          }}
                          style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 14px', borderRadius: 8, color: '#fff', outline: 'none', fontSize: 14 }}
                        />
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6 }}>Max 100 leads par exécution</div>
                      </div>

                      <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: 16, borderRadius: 12 }}>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Leads / Entreprise
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={Math.min(10, leadsToFind)}
                          value={leadsPerCompany}
                          onChange={(e) => {
                            const maxAllowed = Math.min(10, leadsToFind);
                            const val = parseInt(e.target.value) || 1;
                            setLeadsPerCompany(Math.max(1, Math.min(maxAllowed, val)));
                          }}
                          style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 14px', borderRadius: 8, color: '#fff', outline: 'none', fontSize: 14 }}
                        />
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6 }}>
                          Max {Math.min(10, leadsToFind)} leads/entreprise (≤ Total)
                        </div>
                      </div>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'} onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}>
                      <div style={{ paddingTop: 2 }}>
                        <input
                          type="checkbox"
                          checked={allowExistingCompanies}
                          onChange={(e) => setAllowExistingCompanies(e.target.checked)}
                          style={{ width: 16, height: 16, accentColor: 'var(--cyan)', cursor: 'pointer' }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>Autoriser les entreprises déjà prospectées</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.4 }}>
                          Permet de sourcer de nouveaux contacts dans des sociétés existantes de votre base de données.
                        </div>
                      </div>
                    </label>

                    {/* Target Prospect Agents Selection (only shown when not hidden, e.g. from Dashboard execution) */}
                    {!hideTargetAgentsSelection && (
                      <div style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        padding: 16,
                        borderRadius: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label style={{ fontSize: 11, color: 'var(--cyan)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                            <span>🎯</span> Target Agents ({selectedTargetAgentIds.length})
                          </label>

                          <button
                            type="button"
                            onClick={() => setIsCustomizingTargets(prev => !prev)}
                            style={{
                              background: isCustomizingTargets ? 'rgba(0, 229, 200, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                              border: isCustomizingTargets ? '1px solid var(--cyan)' : '1px solid rgba(255, 255, 255, 0.1)',
                              color: isCustomizingTargets ? 'var(--cyan)' : '#F0F4F8',
                              padding: '4px 10px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              transition: 'all 0.2s'
                            }}
                          >
                            <span>{isCustomizingTargets ? '✓ Terminer' : '⚙️ Modifier les Target Agents'}</span>
                          </button>
                        </div>

                        {/* Current Target Agents Summary Pills */}
                        {!isCustomizingTargets && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                            {selectedTargetAgentIds.length === 0 ? (
                              <div style={{
                                padding: '8px 12px',
                                borderRadius: 8,
                                background: 'rgba(255, 71, 87, 0.08)',
                                border: '1px dashed rgba(255, 71, 87, 0.35)',
                                color: '#FF4757',
                                fontSize: 12,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                width: '100%'
                              }}>
                                <span>⚠️</span>
                                <span>Au moins 1 Target Agent requis pour lancer la prospection. Cliquez sur <strong>Modifier</strong> ci-dessus.</span>
                              </div>
                            ) : (
                              availableProspectAgents
                                .filter(pa => isAgentSelected(pa))
                                .map(pa => (
                                  <span
                                    key={pa.uuid || pa.agent_id || pa.agent_name}
                                    style={{
                                      fontSize: 11,
                                      padding: '3px 8px',
                                      borderRadius: 6,
                                      background: 'rgba(0, 229, 200, 0.1)',
                                      color: '#00E5C8',
                                      border: '1px solid rgba(0, 229, 200, 0.25)',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4
                                    }}
                                  >
                                    🎯 {pa.agent_name}
                                  </span>
                                ))
                            )}
                          </div>
                        )}

                        {/* Interactive Selection List (when customizing) */}
                        {isCustomizingTargets && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}
                          >
                            <div style={{ fontSize: 12, color: '#F0F4F8', lineHeight: 1.4 }}>
                              Sélectionnez les <strong>Prospect Agents</strong> qui recevront et qualifieront les leads extraits :
                            </div>

                            {availableProspectAgents.length === 0 ? (
                              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                                Aucun agent de prospection actif disponible.
                              </div>
                            ) : (
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                                maxHeight: 150,
                                overflowY: 'auto',
                                background: 'rgba(0, 0, 0, 0.2)',
                                padding: '8px 10px',
                                borderRadius: 8,
                                border: '1px solid rgba(255, 255, 255, 0.05)'
                              }}>
                                {availableProspectAgents.map((pa: any) => {
                                  const isChecked = isAgentSelected(pa);
                                  return (
                                    <label
                                      key={pa.uuid || pa.agent_id || pa.agent_name}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        cursor: 'pointer',
                                        fontSize: 12,
                                        color: isChecked ? '#00E5C8' : '#F0F4F8',
                                        padding: '6px 8px',
                                        borderRadius: 6,
                                        background: isChecked ? 'rgba(0, 229, 200, 0.08)' : 'transparent',
                                        border: isChecked ? '1px solid rgba(0, 229, 200, 0.2)' : '1px solid transparent',
                                        transition: 'all 0.15s'
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleTargetAgent(pa)}
                                        style={{ accentColor: 'var(--cyan)', cursor: 'pointer', width: 14, height: 14 }}
                                      />
                                      <span style={{ fontWeight: isChecked ? 600 : 400 }}>{pa.agent_name}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </div>
                    )}

                  </div>
                </div>

                <div style={{ marginTop: 24 }}>
                  {(() => {
                    const isTargetMissing = !hideTargetAgentsSelection && selectedTargetAgentIds.length === 0;
                    return (
                      <button
                        onClick={handleExecute}
                        disabled={isExecuting || isTargetMissing}
                        className="btn"
                        style={{
                          width: '100%',
                          background: isTargetMissing ? 'rgba(255, 255, 255, 0.1)' : 'var(--cyan)',
                          color: isTargetMissing ? 'var(--muted)' : '#000',
                          border: 'none',
                          padding: '16px',
                          borderRadius: 12,
                          fontSize: 15,
                          fontWeight: 600,
                          cursor: isExecuting || isTargetMissing ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 12,
                          transition: 'all 0.2s',
                          opacity: isExecuting || isTargetMissing ? 0.6 : 1,
                          boxShadow: isTargetMissing ? 'none' : '0 4px 12px rgba(0, 229, 200, 0.2)'
                        }}
                      >
                        {isExecuting ? (
                          <>
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                              <Database size={20} />
                            </motion.div>
                            Lancement de la recherche...
                          </>
                        ) : isTargetMissing ? (
                          <>
                            <span>⚠️</span>
                            Sélectionnez au moins 1 Target Agent pour lancer
                          </>
                        ) : (
                          <>
                            <Play size={18} fill="#000" />
                            Lancer l'extraction de Leads
                          </>
                        )}
                      </button>
                    );
                  })()}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
