import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CalendarClock, Settings, Play, Database, Target } from 'lucide-react';
import { LiveAgent } from '../AgentsView';
import { OnboardingChat } from '../../wizard/components/OnboardingChat';
import { VMindGuide } from '@/shared/management/components/VMindGuide';
import { extractIcpFromAgent, buildSourcingConclusionFromIcp } from '../../wizard/helpers/sourcingIcpHelper';
import { CyberIcon } from '@/shared/management/components/CyberIcon';

export interface TriggerRule {
  interval: string;
  secondsBetween: number;
  minutesBetween: number;
  hoursBetween: number;
  daysBetween: number;
  weeksBetween: number;
  monthsBetween: number;
  triggerAtMinute: number;
  triggerAtHour: string;
  triggerOnWeekdays: string[];
  triggerAtDayOfMonth: number;
}

const hourOptions = [
  '12am', '1am', '2am', '3am', '4am', '5am', '6am', '7am', '8am', '9am', '10am', '11am',
  '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm', '9pm', '10pm', '11pm'
];

const weekdayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface SourcingAgentScheduleModalProps {
  agent: LiveAgent;
  onClose: () => void;
  onConfirm: (params?: any) => void;
  onEditSchedule?: () => void;
  onToast: (msg: string, type?: 'ok' | 'err') => void;
}

export function SourcingAgentScheduleModal({ agent, onClose, onConfirm, onEditSchedule, onToast }: SourcingAgentScheduleModalProps) {
  const savedMission = (
    agent?.config?.agent_mission || 
    (agent as any)?.agent_mission || 
    (agent as any)?.parameters?.agent_mission || 
    (agent as any)?.agentSettings?.agent_mission || 
    ''
  ).trim();

  const [sourcingSummary, setSourcingSummary] = useState<string>(() => savedMission || '');
  const [step, setStep] = useState<'chat' | 'config' | 'schedule'>('chat');

  // Sourcing Execution Parameters
  const [allowExistingCompanies, setAllowExistingCompanies] = useState(false);
  const [leadsToFind, setLeadsToFind] = useState<number>(50);
  const [leadsPerCompany, setLeadsPerCompany] = useState<number>(2);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [triggerRules, setTriggerRules] = useState<TriggerRule[]>(() => {
    if (Array.isArray(agent.trigger_rules) && agent.trigger_rules.length > 0) {
      return agent.trigger_rules;
    }
    return [
      {
        interval: 'Days',
        secondsBetween: 30,
        minutesBetween: 5,
        hoursBetween: 1,
        daysBetween: 1,
        weeksBetween: 1,
        monthsBetween: 1,
        triggerAtMinute: 0,
        triggerAtHour: '8am',
        triggerOnWeekdays: ['Monday'],
        triggerAtDayOfMonth: 1
      }
    ];
  });

  const [availableProspectAgents, setAvailableProspectAgents] = useState<any[]>([]);
  const [isLoadingProspects, setIsLoadingProspects] = useState<boolean>(true);
  const [isCustomizingTargets, setIsCustomizingTargets] = useState(false);
  const [selectedTargetAgentIds, setSelectedTargetAgentIds] = useState<string[]>(() => {
    const ids = agent?.config?.target_agent_ids || (agent as any)?.target_agent_ids || [];
    return Array.isArray(ids) ? ids.map(id => String(id)) : [];
  });

  const userModifiedChatRef = React.useRef(false);

  const [targetIcpProposal, setTargetIcpProposal] = useState<{
    targetAgentName: string;
    autoConclusion: string;
    targetAgentId: string;
  } | null>(null);
  const [dismissedProposalAgentIds, setDismissedProposalAgentIds] = useState<string[]>([]);
  const [chatKey, setChatKey] = useState<number>(0);

  React.useEffect(() => {
    let isMounted = true;
    const fetchProspectAgents = async () => {
      try {
        setIsLoadingProspects(true);
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const tokenStr = localStorage.getItem('vmind_session');
        let token = tokenStr;
        if (tokenStr?.trim().startsWith("{")) {
          try { token = JSON.parse(tokenStr).token; } catch (e) { }
        }
        const res = await fetch(`${baseUrl}/api/list-agents`, {
          headers: { ...(token && { 'Authorization': `Bearer ${token}` }) }
        });
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.agents)) {
            setAvailableProspectAgents(data.agents.filter((a: any) => a.run_mode === 'prospection' || (!a.run_mode && a.run_mode !== 'sourcing' && a.run_mode !== 'recouvrement')));
          }
        }
      } catch (err) {
        console.error("Failed to fetch prospect agents:", err);
      } finally {
        if (isMounted) {
          setIsLoadingProspects(false);
        }
      }
    };
    fetchProspectAgents();
    return () => { isMounted = false; };
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

  // Detect if selected target Prospect Agent has an ICP differing from current plan, without silently overwriting
  React.useEffect(() => {
    if (selectedTargetAgentIds.length === 1 && availableProspectAgents.length > 0) {
      const targetId = selectedTargetAgentIds[0].toLowerCase();
      const targetAgent = availableProspectAgents.find((pa: any) => {
        const paUuid = String(pa.uuid || '').toLowerCase();
        const paAgentId = String(pa.agent_id || '').toLowerCase();
        const paName = String(pa.agent_name || pa.nom || '').toLowerCase();
        return (paUuid && paUuid === targetId) || (paAgentId && paAgentId === targetId) || (paName && paName === targetId);
      });

      if (targetAgent) {
        const icp = extractIcpFromAgent(targetAgent);
        if (icp) {
          const autoConclusion = buildSourcingConclusionFromIcp(icp);
          const targetKey = String(targetAgent.uuid || targetAgent.agent_id || targetAgent.agent_name || '').toLowerCase();
          const isDifferent = autoConclusion && autoConclusion.trim() !== (sourcingSummary || '').trim();
          const isDismissed = dismissedProposalAgentIds.includes(targetKey);

          if (isDifferent && !isDismissed) {
            setTargetIcpProposal({
              targetAgentName: targetAgent.agent_name || targetAgent.nom || 'Agent Cible',
              autoConclusion,
              targetAgentId: targetKey
            });
            return;
          }
        }
      }
    }

    setTargetIcpProposal(null);
  }, [selectedTargetAgentIds, availableProspectAgents, sourcingSummary, dismissedProposalAgentIds]);

  const handleApplyTargetIcp = () => {
    if (!targetIcpProposal) return;
    const newSummary = targetIcpProposal.autoConclusion;
    setSourcingSummary(newSummary);
    setChatKey(prev => prev + 1);
    userModifiedChatRef.current = false;
    onToast(`Plan de recherche aligné sur l'ICP de « ${targetIcpProposal.targetAgentName} » !`, 'ok');
    setTargetIcpProposal(null);
  };

  const handleDismissTargetIcp = () => {
    if (targetIcpProposal) {
      setDismissedProposalAgentIds(prev => [...prev, targetIcpProposal.targetAgentId]);
    }
    setTargetIcpProposal(null);
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
    const targetKey = targetUuid.toLowerCase();

    // Re-enable prompt if user explicitly checks this agent again
    setDismissedProposalAgentIds(prev => prev.filter(k => k !== targetKey));

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

  const addTriggerRule = () => {
    setTriggerRules(prev => [
      ...prev,
      {
        interval: 'Days',
        secondsBetween: 30,
        minutesBetween: 5,
        hoursBetween: 1,
        daysBetween: 1,
        weeksBetween: 1,
        monthsBetween: 1,
        triggerAtMinute: 0,
        triggerAtHour: '8am',
        triggerOnWeekdays: ['Monday'],
        triggerAtDayOfMonth: 1
      }
    ]);
  };

  const removeTriggerRule = (index: number) => {
    setTriggerRules(prev => prev.filter((_, i) => i !== index));
  };

  const updateTriggerRuleAtIndex = (index: number, key: keyof TriggerRule, value: any) => {
    setTriggerRules(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: value };
      return copy;
    });
  };

  const toggleWeekdayAtIndex = (index: number, day: string) => {
    setTriggerRules(prev => {
      const copy = [...prev];
      const currentDays = copy[index].triggerOnWeekdays || [];
      const updatedDays = currentDays.includes(day)
        ? currentDays.filter(d => d !== day)
        : [...currentDays, day];
      copy[index] = { ...copy[index], triggerOnWeekdays: updatedDays };
      return copy;
    });
  };

  const handleChatConfirm = (summary: string) => {
    setSourcingSummary(summary);
    setStep('config');
  };

  const handleConfigConfirm = () => {
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
    setStep('schedule');
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm({
        sourcingSummary,
        totalLeads: leadsToFind,
        leadsPerCompany,
        ignoreDuplicates: allowExistingCompanies,
        target_agent_ids: selectedTargetAgentIds,
        update_defaults: true,
        trigger_rules: triggerRules
      });
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  const getReadableCron = () => {
    if (!agent.trigger_rules || agent.trigger_rules.length === 0) return 'Aucune planification définie';
    const r = agent.trigger_rules[0];
    const interval = r.interval;
    const minPad = String(r.triggerAtMinute ?? 0).padStart(2, '0');
    
    if (interval === 'Minutes') {
      const step = Number(r.minutesBetween) || 5;
      return step <= 1 ? 'Toutes les minutes' : `Toutes les ${step} min`;
    }
    if (interval === 'Hours') {
      const step = Number(r.hoursBetween) || 1;
      const minInfo = r.triggerAtMinute !== undefined && r.triggerAtMinute !== null ? ` (à min ${minPad})` : '';
      return step <= 1 ? `Chaque heure${minInfo}` : `Toutes les ${step} h${minInfo}`;
    }
    if (interval === 'Days') {
      const step = Number(r.daysBetween) || 1;
      const hour = r.triggerAtHour || '08';
      return step <= 1 ? `Chaque jour à ${hour}h${minPad}` : `Tous les ${step} jours à ${hour}h${minPad}`;
    }
    if (interval === 'Weeks') {
      const days = (r.triggerOnWeekdays || ['Monday']).join(', ');
      const hour = r.triggerAtHour || '08';
      return `Hebdo (${days}) à ${hour}h${minPad}`;
    }
    if (interval === 'Months') {
      const dom = r.triggerAtDayOfMonth || 1;
      const hour = r.triggerAtHour || '08';
      return `Mensuel (le ${dom}) à ${hour}h${minPad}`;
    }
    return interval;
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
          title="Mode Autopilote Sourcing"
          message={
            step === 'chat'
              ? "Étape 1 : Définition de la Cible. Vérifiez avec moi le profil exact de votre candidat idéal."
              : step === 'config'
                ? "Étape 2 : Configuration. Vérifiez le résumé de notre échange et ajustez les paramètres avant d'activer la planification."
                : "Étape 3 : Activation de la Planification. L'agent se réveillera automatiquement aux horaires prévus pour exécuter sa mission de sourcing sans aucune intervention de votre part."
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
          <div style={{ position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', width: 300, height: 150, background: 'var(--cyan)', filter: 'blur(100px)', opacity: 0.15, borderRadius: '50%' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>
                Activation du Sourcing Continu
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
              <X size={18} />
            </button>
          </div>

          {/* Step Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <button
              onClick={() => setStep('chat')}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                border: `1px solid ${step === 'chat' ? 'rgba(0, 229, 200, 0.4)' : 'rgba(255,255,255,0.08)'}`,
                cursor: 'pointer',
                background: step === 'chat' ? 'rgba(0, 229, 200, 0.15)' : 'rgba(255,255,255,0.03)',
                color: step === 'chat' ? '#00E5C8' : 'var(--muted)',
                transition: 'all 0.2s ease'
              }}
            >
              💬 Étape 1 : Assistant Ciblage
            </button>
            <button
              onClick={() => setStep('config')}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                border: `1px solid ${step === 'config' ? 'rgba(0, 229, 200, 0.4)' : 'rgba(255,255,255,0.08)'}`,
                cursor: 'pointer',
                background: step === 'config' ? 'rgba(0, 229, 200, 0.15)' : 'rgba(255,255,255,0.03)',
                color: step === 'config' ? '#00E5C8' : 'var(--muted)',
                transition: 'all 0.2s ease'
              }}
            >
              ⚙️ Étape 2 : Configuration
            </button>
            <button
              onClick={() => {
                if (selectedTargetAgentIds.length === 0) {
                  onToast("Veuillez d'abord sélectionner au moins un Target Agent à l'Étape 2.", "err");
                  setStep('config');
                } else {
                  setStep('schedule');
                }
              }}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                border: `1px solid ${step === 'schedule' ? 'rgba(0, 229, 200, 0.4)' : 'rgba(255,255,255,0.08)'}`,
                cursor: 'pointer',
                background: step === 'schedule' ? 'rgba(0, 229, 200, 0.15)' : 'rgba(255,255,255,0.03)',
                color: step === 'schedule' ? '#00E5C8' : 'var(--muted)',
                transition: 'all 0.2s ease'
              }}
            >
              📅 Étape 3 : Planification
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

                {targetIcpProposal && (
                  <div style={{
                    marginBottom: 14,
                    padding: '12px 16px',
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, rgba(0, 229, 200, 0.08) 0%, rgba(6, 17, 31, 0.85) 100%)',
                    border: '1px solid rgba(0, 229, 200, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    boxShadow: '0 4px 18px rgba(0, 229, 200, 0.08)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: 'rgba(0, 229, 200, 0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#00E5C8', flexShrink: 0
                      }}>
                        <CyberIcon name="target" size={16} color="#00E5C8" />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#F0F4F8' }}>
                          Aligner le ciblage sur « {targetIcpProposal.targetAgentName} » ?
                        </div>
                        <div style={{ fontSize: 11, color: '#8FA3B8', marginTop: 2, lineHeight: 1.4 }}>
                          Cet agent dispose d'un ciblage (ICP) défini. Souhaitez-vous synchroniser votre plan de recherche avec ses critères ?
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={handleApplyTargetIcp}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 8,
                          background: 'linear-gradient(135deg, #00E5C8 0%, #00B4D8 100%)',
                          color: '#04101E',
                          border: 'none',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          boxShadow: '0 0 12px rgba(0, 229, 200, 0.25)',
                          transition: 'all 0.2s'
                        }}
                      >
                        <CyberIcon name="zap" size={12} color="#04101E" />
                        <span>Aligner sur l'ICP</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDismissTargetIcp}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          background: 'rgba(255, 255, 255, 0.06)',
                          color: '#8FA3B8',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        Conserver mon plan
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ flex: 1, minHeight: 400, border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden' }}>
                  {isLoadingProspects && !sourcingSummary ? (
                    <div style={{ height: '100%', minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'var(--navy2)' }}>
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                        <Target size={24} color="var(--cyan)" />
                      </motion.div>
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>Synchronisation des paramètres du profil cible...</span>
                    </div>
                  ) : (
                    <OnboardingChat
                      key={`chat_${agent?.uuid || agent?.agent_name}_${chatKey}_${sourcingSummary}`}
                      initialMission={sourcingSummary}
                      onConfirm={handleChatConfirm}
                      onModify={() => { userModifiedChatRef.current = true; }}
                      apiEndpoint="/api/sourcing-agent/execution-chat"
                    />
                  )}
                </div>
              </motion.div>
            )}

            {step === 'config' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, color: '#00E5C8', fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, background: 'rgba(0,229,200,0.2)', borderRadius: '50%', color: '#00E5C8', fontSize: 11 }}>2</span>
                  Configuration des Paramètres de Sourcing
                </div>

                {targetIcpProposal && (
                  <div style={{
                    marginBottom: 16,
                    padding: '12px 16px',
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, rgba(0, 229, 200, 0.08) 0%, rgba(6, 17, 31, 0.85) 100%)',
                    border: '1px solid rgba(0, 229, 200, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    boxShadow: '0 4px 18px rgba(0, 229, 200, 0.08)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: 'rgba(0, 229, 200, 0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#00E5C8', flexShrink: 0
                      }}>
                        <CyberIcon name="target" size={16} color="#00E5C8" />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#F0F4F8' }}>
                          Aligner le ciblage sur « {targetIcpProposal.targetAgentName} » ?
                        </div>
                        <div style={{ fontSize: 11, color: '#8FA3B8', marginTop: 2, lineHeight: 1.4 }}>
                          Cet agent dispose d'un ciblage (ICP) défini. Souhaitez-vous synchroniser votre plan de recherche avec ses critères ?
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={handleApplyTargetIcp}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 8,
                          background: 'linear-gradient(135deg, #00E5C8 0%, #00B4D8 100%)',
                          color: '#04101E',
                          border: 'none',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          boxShadow: '0 0 12px rgba(0, 229, 200, 0.25)',
                          transition: 'all 0.2s'
                        }}
                      >
                        <CyberIcon name="zap" size={12} color="#04101E" />
                        <span>Aligner sur l'ICP</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDismissTargetIcp}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          background: 'rgba(255, 255, 255, 0.06)',
                          color: '#8FA3B8',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        Conserver mon plan
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Summary from Chat */}
                  <div style={{ background: 'rgba(0, 229, 200, 0.04)', padding: 18, borderRadius: 12, border: '1px solid rgba(0, 229, 200, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Target size={16} color="#00E5C8" />
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#00E5C8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Ciblage Enregistré
                        </label>
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
                        Modifier avec l'IA 💬
                      </button>
                    </div>
                    <div style={{ margin: 0, fontSize: 13, color: '#F0F4F8', whiteSpace: 'pre-wrap', lineHeight: 1.6, maxHeight: 120, overflowY: 'auto', background: 'rgba(6, 17, 31, 0.5)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      {sourcingSummary || "Recherche ciblée par défaut selon les paramètres de l'agent."}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {/* Leads to Find */}
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#F0F4F8', marginBottom: 6 }}>
                        Volume de leads par exécution (Max 100)
                      </label>
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>
                        Nombre de candidats à sourcer à chaque cycle planifié.
                      </span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={leadsToFind}
                        onChange={(e) => {
                          const newTotal = Math.max(1, Math.min(100, parseInt(e.target.value) || 1));
                          setLeadsToFind(newTotal);
                          if (leadsPerCompany > newTotal) {
                            setLeadsPerCompany(Math.min(10, newTotal));
                          }
                        }}
                        style={{
                          width: '100%',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          padding: '10px 14px',
                          borderRadius: 8,
                          color: '#F0F4F8',
                          fontSize: 14,
                          fontWeight: 600,
                          outline: 'none'
                        }}
                      />
                    </div>

                    {/* Leads per Company */}
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#F0F4F8', marginBottom: 6 }}>
                        Leads par entreprise (Max {Math.min(10, leadsToFind)})
                      </label>
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>
                        Limite maximale de profils extraits par société ciblée (≤ Total).
                      </span>
                      <input
                        type="number"
                        min="1"
                        max={Math.min(10, leadsToFind)}
                        value={leadsPerCompany}
                        onChange={(e) => {
                          const maxAllowed = Math.min(10, leadsToFind);
                          const val = parseInt(e.target.value) || 1;
                          setLeadsPerCompany(Math.max(1, Math.min(maxAllowed, val)));
                        }}
                        style={{
                          width: '100%',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          padding: '10px 14px',
                          borderRadius: 8,
                          color: '#F0F4F8',
                          fontSize: 14,
                          fontWeight: 600,
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  {/* Options */}
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={allowExistingCompanies}
                        onChange={(e) => setAllowExistingCompanies(e.target.checked)}
                        style={{ accentColor: 'var(--cyan)', width: 16, height: 16, cursor: 'pointer' }}
                      />
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#F0F4F8', display: 'block' }}>
                          Autoriser les entreprises déjà prospectées
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginTop: 2 }}>
                          Permet de sourcer de nouveaux contacts dans des sociétés existantes de votre base de données.
                        </span>
                      </div>
                    </label>

                    {/* Target Prospect Agents Section */}
                    <div style={{
                      marginTop: 4,
                      padding: 14,
                      borderRadius: 10,
                      background: 'rgba(0, 229, 200, 0.04)',
                      border: '1px solid rgba(0, 229, 200, 0.15)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Target size={16} color="#00E5C8" />
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#F0F4F8' }}>
                            Target Agents (Destinataires des Leads)
                          </span>
                          <span style={{
                            fontSize: 11,
                            padding: '2px 6px',
                            borderRadius: 10,
                            background: selectedTargetAgentIds.length > 0 ? 'rgba(0, 229, 200, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                            color: selectedTargetAgentIds.length > 0 ? '#00E5C8' : '#38BDF8',
                            fontWeight: 600
                          }}>
                            {selectedTargetAgentIds.length > 0 
                              ? `${selectedTargetAgentIds.length} sélectionné${selectedTargetAgentIds.length > 1 ? 's' : ''}`
                              : 'Mode Autonome'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsCustomizingTargets(!isCustomizingTargets)}
                          style={{
                            background: isCustomizingTargets ? 'var(--cyan)' : 'rgba(255, 255, 255, 0.05)',
                            color: isCustomizingTargets ? '#000' : 'var(--muted)',
                            border: `1px solid ${isCustomizingTargets ? 'var(--cyan)' : 'rgba(255, 255, 255, 0.1)'}`,
                            borderRadius: 6,
                            padding: '4px 10px',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            {isCustomizingTargets ? (
                              <>
                                <CyberIcon name="check" size={11} />
                                <span>Terminer</span>
                              </>
                            ) : (
                              <>
                                <CyberIcon name="settings" size={11} />
                                <span>Modifier</span>
                              </>
                            )}
                          </span>
                        </button>
                      </div>

                      {/* Current Target Agents Summary Pills */}
                      {!isCustomizingTargets && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                          {selectedTargetAgentIds.length === 0 ? (
                            <div style={{
                              padding: '8px 12px',
                              borderRadius: 8,
                              background: 'rgba(56, 189, 248, 0.08)',
                              border: '1px dashed rgba(56, 189, 248, 0.35)',
                              color: '#38BDF8',
                              fontSize: 12,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              width: '100%'
                            }}>
                              <CyberIcon name="zap" size={12} color="#38BDF8" />
                              <span><strong>Mode autonome :</strong> Aucun agent de prospection assigné. Cliquez sur <strong>Modifier</strong> pour en sélectionner.</span>
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
                  </div>
                </div>

                <div style={{ marginTop: 24 }}>
                  <button
                    onClick={handleConfigConfirm}
                    className="btn"
                    style={{
                      width: '100%',
                      background: 'var(--cyan)',
                      color: '#000',
                      border: 'none',
                      padding: '16px',
                      borderRadius: 12,
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 12,
                      transition: 'all 0.2s',
                      boxShadow: '0 4px 12px rgba(0, 229, 200, 0.2)'
                    }}
                  >
                    Suivant : Validation de la Planification →
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'schedule' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, color: '#00E5C8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, background: 'rgba(0,229,200,0.2)', borderRadius: '50%', color: '#00E5C8', fontSize: 11 }}>3</span>
                    Règles d'Exécution Automatique
                  </div>
                  <button
                    type="button"
                    onClick={addTriggerRule}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'rgba(0, 229, 200, 0.1)',
                      border: '1px solid rgba(0, 229, 200, 0.3)',
                      borderRadius: '8px',
                      color: '#00E5C8',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span>+</span> Ajouter une règle
                  </button>
                </div>

                {triggerRules.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: 'var(--muted)', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    Aucune règle de déclenchement définie. L'agent s'exécutera uniquement à la demande.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                    {triggerRules.map((rule, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '20px',
                          backgroundColor: 'rgba(0,0,0,0.25)',
                          borderRadius: '12px',
                          border: '1px solid rgba(255,255,255,0.08)',
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'rgba(255,255,255,0.8)' }}>
                            ⚡ Règle d'Intervalle #{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeTriggerRule(index)}
                            style={{
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: '#ff7675',
                              cursor: 'pointer',
                              fontSize: '14px',
                              padding: '4px',
                              opacity: 0.8
                            }}
                            title="Supprimer la règle"
                          >
                            🗑️
                          </button>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                          <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>
                            Fréquence d'exécution
                          </label>
                          <select
                            style={{
                              width: '100%',
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              padding: '10px 14px',
                              borderRadius: 8,
                              color: '#fff',
                              outline: 'none',
                              fontSize: 13
                            }}
                            value={rule.interval}
                            onChange={(e) => updateTriggerRuleAtIndex(index, 'interval', e.target.value)}
                          >
                            <option value="Seconds">Secondes</option>
                            <option value="Minutes">Minutes</option>
                            <option value="Hours">Heures</option>
                            <option value="Days">Jours</option>
                            <option value="Weeks">Semaines</option>
                            <option value="Months">Mois</option>
                          </select>
                        </div>

                        <div style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                          {rule.interval === 'Seconds' && (
                            <div>
                              <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Délai en secondes entre chaque exécution (1 - 59)</label>
                              <input
                                type="number"
                                min="1" max="59"
                                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 14px', borderRadius: 8, color: '#fff', outline: 'none', fontSize: 13 }}
                                value={rule.secondsBetween}
                                onChange={(e) => updateTriggerRuleAtIndex(index, 'secondsBetween', Number(e.target.value))}
                              />
                            </div>
                          )}

                          {rule.interval === 'Minutes' && (
                            <div>
                              <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Délai en minutes entre chaque exécution (1 - 59)</label>
                              <input
                                type="number"
                                min="1" max="59"
                                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 14px', borderRadius: 8, color: '#fff', outline: 'none', fontSize: 13 }}
                                value={rule.minutesBetween}
                                onChange={(e) => updateTriggerRuleAtIndex(index, 'minutesBetween', Number(e.target.value))}
                              />
                            </div>
                          )}

                          {rule.interval === 'Hours' && (
                            <div style={{ display: 'flex', gap: 12 }}>
                              <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Délai en heures entre chaque exécution (1 - 23)</label>
                                <input
                                  type="number"
                                  min="1" max="23"
                                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 14px', borderRadius: 8, color: '#fff', outline: 'none', fontSize: 13 }}
                                  value={rule.hoursBetween}
                                  onChange={(e) => updateTriggerRuleAtIndex(index, 'hoursBetween', Number(e.target.value))}
                                />
                              </div>
                              <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Minute précise d'exécution</label>
                                <input
                                  type="number"
                                  min="0" max="59"
                                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 14px', borderRadius: 8, color: '#fff', outline: 'none', fontSize: 13 }}
                                  value={rule.triggerAtMinute}
                                  onChange={(e) => updateTriggerRuleAtIndex(index, 'triggerAtMinute', Number(e.target.value))}
                                />
                              </div>
                            </div>
                          )}

                          {rule.interval === 'Days' && (
                            <div style={{ display: 'flex', gap: 12 }}>
                              <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Intervalle en jours entre chaque exécution (1 - 31)</label>
                                <input
                                  type="number"
                                  min="1" max="31"
                                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 14px', borderRadius: 8, color: '#fff', outline: 'none', fontSize: 13 }}
                                  value={rule.daysBetween}
                                  onChange={(e) => updateTriggerRuleAtIndex(index, 'daysBetween', Number(e.target.value))}
                                />
                              </div>
                              <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Heure d'exécution</label>
                                <select
                                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 14px', borderRadius: 8, color: '#fff', outline: 'none', fontSize: 13 }}
                                  value={rule.triggerAtHour}
                                  onChange={(e) => updateTriggerRuleAtIndex(index, 'triggerAtHour', e.target.value)}
                                >
                                  {hourOptions.map(h => (
                                    <option key={h} value={h}>{h}</option>
                                  ))}
                                </select>
                              </div>
                              <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Minute précise d'exécution</label>
                                <input
                                  type="number"
                                  min="0" max="59"
                                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 14px', borderRadius: 8, color: '#fff', outline: 'none', fontSize: 13 }}
                                  value={rule.triggerAtMinute}
                                  onChange={(e) => updateTriggerRuleAtIndex(index, 'triggerAtMinute', Number(e.target.value))}
                                />
                              </div>
                            </div>
                          )}

                          {rule.interval === 'Weeks' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                              <div>
                                <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Intervalle en semaines entre chaque exécution (1 - 52)</label>
                                <input
                                  type="number"
                                  min="1" max="52"
                                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 14px', borderRadius: 8, color: '#fff', outline: 'none', fontSize: 13 }}
                                  value={rule.weeksBetween}
                                  onChange={(e) => updateTriggerRuleAtIndex(index, 'weeksBetween', Number(e.target.value))}
                                />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Jours d'exécution dans la semaine</label>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                  {weekdayOptions.map(day => (
                                    <div
                                      key={day}
                                      onClick={() => toggleWeekdayAtIndex(index, day)}
                                      style={{
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        backgroundColor: rule.triggerOnWeekdays.includes(day) ? 'rgba(0, 229, 200, 0.2)' : 'rgba(255,255,255,0.05)',
                                        border: `1px solid ${rule.triggerOnWeekdays.includes(day) ? '#00e5c8' : 'transparent'}`,
                                        color: rule.triggerOnWeekdays.includes(day) ? '#fff' : '#b2bec3',
                                        transition: 'all 0.2s'
                                      }}
                                    >
                                      {day}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {rule.interval === 'Months' && (
                            <div style={{ display: 'flex', gap: 12 }}>
                              <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Intervalle en mois entre chaque exécution (1 - 12)</label>
                                <input
                                  type="number"
                                  min="1" max="12"
                                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 14px', borderRadius: 8, color: '#fff', outline: 'none', fontSize: 13 }}
                                  value={rule.monthsBetween}
                                  onChange={(e) => updateTriggerRuleAtIndex(index, 'monthsBetween', Number(e.target.value))}
                                />
                              </div>
                              <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Jour du mois (1 - 31)</label>
                                <input
                                  type="number"
                                  min="1" max="31"
                                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 14px', borderRadius: 8, color: '#fff', outline: 'none', fontSize: 13 }}
                                  value={rule.triggerAtDayOfMonth}
                                  onChange={(e) => updateTriggerRuleAtIndex(index, 'triggerAtDayOfMonth', Number(e.target.value))}
                                />
                              </div>
                              <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Heure d'exécution</label>
                                <select
                                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 14px', borderRadius: 8, color: '#fff', outline: 'none', fontSize: 13 }}
                                  value={rule.triggerAtHour}
                                  onChange={(e) => updateTriggerRuleAtIndex(index, 'triggerAtHour', e.target.value)}
                                >
                                  {hourOptions.map(h => (
                                    <option key={h} value={h}>{h}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: 20 }}>
                  {(() => {
                    const isStandalone = selectedTargetAgentIds.length === 0;
                    const isDisabled = isSubmitting || triggerRules.length === 0;
                    return (
                      <button
                        onClick={handleConfirm}
                        disabled={isDisabled}
                        style={{
                          width: '100%', padding: '16px', borderRadius: 12, border: 'none',
                          background: isDisabled ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #00E5C8, #00A69C)',
                          color: isDisabled ? 'rgba(255,255,255,0.4)' : '#06111F',
                          fontWeight: 700, fontSize: 15, cursor: isDisabled ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          boxShadow: isDisabled ? 'none' : '0 4px 15px rgba(0, 229, 200, 0.3)',
                          transition: 'all 0.2s'
                        }}
                      >
                        {isSubmitting ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                              ⏳
                            </motion.div>
                            Activation en cours...
                          </span>
                        ) : isStandalone ? (
                          <>
                            <Play size={18} fill="currentColor" />
                            Activer le Sourcing Continu (Mode Autonome)
                          </>
                        ) : (
                          <>
                            <Play size={18} fill="currentColor" />
                            Activer le Sourcing Continu
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
