'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/shared/management/components/Button';
import { AGENT_TEMPLATES } from '@/shared/management/constants/data';
import { VMindGuide, VMindGuideArrow, GuideMood } from '@/shared/management/components/VMindGuide';
import { CyberIcon } from '@/shared/management/components/CyberIcon';
import { Target, Users, Check, Bot, Zap, Save, CheckCircle2, Play, CalendarClock, X, ArrowLeft, AlertTriangle } from 'lucide-react';
import { SourcingAgentExecutionModal } from '../agents/components/SourcingAgentExecutionModal';
import { SourcingAgentScheduleModal } from '../agents/components/SourcingAgentScheduleModal';
import { LiveAgent } from '../agents/AgentsView';

import { useToast } from '@/shared/contexts/ToastContext';

interface WizardViewProps {
  templateId: string;
  onCancel: () => void;
  agentToEdit?: any;
  initialStep?: number;
}

const VIRTUAL_MIND_GUIDE: Record<string, { title: string; text: string }> = {
  nom: { title: "Nom de l'Agent", text: "Donnez un nom unique à votre agent de sourcing." },
  agent_name: { title: "Identité de l'Agent", text: "Donnez un nom unique à votre agent. Ce nom vous aidera à l'identifier facilement dans votre espace de travail." },
  agent_mission: { title: "Mission de l'Agent", text: "Définissez ce que l'agent doit accomplir. Soyez clair sur le profil des candidats ou leads ciblés." },
  target_agents: { title: "Agents Prospect Cibles", text: "Sélectionnez les agents de prospection auxquels cet agent de sourcing transmettra automatiquement ses leads trouvés." },
  trigger_rules: { title: "Planification Autonome", text: "Définissez quand votre agent doit s'activer de manière autonome." }
};

interface TriggerRule {
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

export const WizardSourcingView: React.FC<WizardViewProps> = ({ templateId, onCancel, agentToEdit, initialStep }) => {
  const { showToast } = useToast();
  const [step, setStep] = useState(initialStep || 1);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [availableProspectAgents, setAvailableProspectAgents] = useState<any[]>([]);
  const [loadingProspectAgents, setLoadingProspectAgents] = useState(false);

  const [isDeploying, setIsDeploying] = useState(false);
  const [deployed, setDeployed] = useState(false);

  const [showActivationDialogue, setShowActivationDialogue] = useState(false);
  const [activationChoice, setActivationChoice] = useState<'prompt' | 'activate'>('prompt');
  const [deployedAgent, setDeployedAgent] = useState<LiveAgent | null>(null);
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const template = AGENT_TEMPLATES.find(t => t.id === templateId);
  const isEditMode = Boolean(agentToEdit && (agentToEdit.uuid || (agentToEdit.agent_id && agentToEdit.agent_name && agentToEdit.agent_id !== 'sourcing' && agentToEdit.agent_id !== 'sourcing_agent')));
  const editUuid = isEditMode ? (agentToEdit.uuid || agentToEdit.agent_id) : null;

  interface SourcingFormData {
    agent_name: string;
    run_mode: string;
    workflow_timezone: string;
    target_agent_ids: (number | string)[];
    sourcing_config: {
      agent_mission: string;
    };
    trigger_rules: TriggerRule[];
  }

  const [formData, setFormData] = useState<SourcingFormData>(() => {
    let initialTargetIds: (number | string)[] = [];

    if (agentToEdit) {
      const cfg = agentToEdit.config || {};
      const rawTargetIds = cfg.target_agent_ids || agentToEdit.target_agent_ids || [];
      if (Array.isArray(rawTargetIds)) {
        initialTargetIds = rawTargetIds.map((id: any) => {
          if (typeof id === 'number' && !isNaN(id)) return id;
          if (typeof id === 'string' && /^\d+$/.test(id)) return parseInt(id, 10);
          return String(id);
        }).filter((id: any) => id !== null && id !== undefined && id !== '' && !Number.isNaN(id));
      }
    }

    if (initialTargetIds.length === 0 && typeof window !== 'undefined') {
      const savedLinkUuid = sessionStorage.getItem('vmind_guide_link_prospect_uuid');
      const savedLinkName = sessionStorage.getItem('vmind_guide_link_prospect_name');
      if (savedLinkUuid) {
        initialTargetIds = [savedLinkUuid];
      } else if (savedLinkName) {
        initialTargetIds = [savedLinkName];
      } else {
        const savedAgentStr = sessionStorage.getItem('vmind_editing_agent');
        if (savedAgentStr) {
          try {
            const parsed = JSON.parse(savedAgentStr);
            const rawTargets = parsed.target_agent_ids || parsed.config?.target_agent_ids;
            if (Array.isArray(rawTargets) && rawTargets.length > 0) {
              initialTargetIds = rawTargets.map((id: any) => String(id)).filter(Boolean);
            }
          } catch (e) {}
        }
      }
      sessionStorage.removeItem('vmind_guide_link_prospect_uuid');
      sessionStorage.removeItem('vmind_guide_link_prospect_name');
    }

    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const defaultName = template?.name || 'Agent de Sourcing';

    if (isEditMode) {
      const cfg = agentToEdit.config || {};
      return {
        agent_name: agentToEdit.agent_name || `${defaultName} - ${randomSuffix}`,
        run_mode: agentToEdit.run_mode || 'sourcing',
        workflow_timezone: agentToEdit.workflow_timezone || 'Africa/Tunis',
        target_agent_ids: initialTargetIds,
        sourcing_config: {
          agent_mission: cfg.agent_mission || ''
        },
        trigger_rules: agentToEdit.trigger_rules && agentToEdit.trigger_rules.length > 0
          ? agentToEdit.trigger_rules
          : [
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
          ]
      };
    }

    return {
      agent_name: `${defaultName} - ${randomSuffix}`,
      run_mode: 'sourcing',
      workflow_timezone: 'Africa/Tunis',
      target_agent_ids: initialTargetIds,
      sourcing_config: {
        agent_mission: ''
      },
      trigger_rules: [
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
      ] as TriggerRule[]
    };
  });

  useEffect(() => {
    const fetchProspectAgents = async () => {
      setLoadingProspectAgents(true);
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
            const prospects = data.agents.filter((a: any) => a.run_mode === 'prospection' || (!a.run_mode && a.run_mode !== 'sourcing' && a.run_mode !== 'recouvrement'));
            setAvailableProspectAgents(prospects);

            // If we have initial target IDs (e.g. from referral), ensure exact UUID matching
            setFormData(prev => {
              if (!prev.target_agent_ids || prev.target_agent_ids.length === 0) return prev;
              const updatedTargetIds = prev.target_agent_ids.map(targetId => {
                const strTarget = String(targetId).trim().toLowerCase();
                const matched = prospects.find((p: any) => {
                  const keys = [
                    p.uuid,
                    p.agent_id,
                    p.id,
                    p.nom,
                    p.agent_name,
                    p.internal_agent_id,
                    p.sql_agent_id
                  ].filter(Boolean).map(k => String(k).trim().toLowerCase());
                  return keys.includes(strTarget);
                });
                return matched ? (matched.uuid || matched.agent_id || targetId) : targetId;
              });
              return { ...prev, target_agent_ids: updatedTargetIds };
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch prospect agents for sourcing target selection:", err);
      } finally {
        setLoadingProspectAgents(false);
      }
    };

    fetchProspectAgents();
  }, []);

  const hourOptions = [
    'Midnight', '1am', '2am', '3am', '4am', '5am', '6am', '7am', '8am', '9am', '10am', '11am',
    'Noon', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm', '9pm', '10pm', '11pm'
  ];

  const weekdayOptions = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];

  const getAgentTargetId = (agent: any): number | string => {
    if (!agent) return '';
    return agent.uuid || agent.agent_id || agent.id || agent.nom || agent.agent_name || '';
  };

  const isAgentSelected = (agent: any): boolean => {
    if (!agent || !formData.target_agent_ids || formData.target_agent_ids.length === 0) return false;

    const possibleKeys = [
      agent.uuid,
      agent.agent_id,
      agent.id,
      agent.nom,
      agent.agent_name,
      agent.internal_agent_id,
      agent.sql_agent_id
    ].filter(k => k !== null && k !== undefined && k !== '' && !Number.isNaN(k))
     .map(k => String(k).trim().toLowerCase());

    return formData.target_agent_ids.some((targetId: any) => {
      const strTarget = String(targetId).trim().toLowerCase();
      return possibleKeys.includes(strTarget);
    });
  };

  const toggleTargetAgent = (agent: any) => {
    if (!agent) return;
    const targetId = getAgentTargetId(agent);
    if (!targetId && targetId !== 0) return;

    setFormData(prev => {
      const selected = isAgentSelected(agent);
      let newIds: (number | string)[];

      if (selected) {
        const keysToRemove = new Set([
          agent.uuid,
          agent.agent_id,
          agent.id,
          agent.nom,
          agent.agent_name,
          agent.internal_agent_id,
          agent.sql_agent_id
        ].filter(k => k !== null && k !== undefined && k !== '').map(k => String(k).trim().toLowerCase()));

        newIds = prev.target_agent_ids.filter((i: any) => !keysToRemove.has(String(i).trim().toLowerCase()));
      } else {
        newIds = [...prev.target_agent_ids, targetId];
      }

      return { ...prev, target_agent_ids: newIds };
    });
  };

  const addTriggerRule = () => {
    setFormData(prev => ({
      ...prev,
      trigger_rules: [
        ...prev.trigger_rules,
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
      ]
    }));
  };

  const removeTriggerRule = (index: number) => {
    setFormData(prev => ({
      ...prev,
      trigger_rules: prev.trigger_rules.filter((_, idx) => idx !== index)
    }));
  };

  const updateTriggerRuleAtIndex = (index: number, key: keyof TriggerRule, value: any) => {
    setFormData(prev => {
      const updatedRules = prev.trigger_rules.map((rule, idx) => {
        if (idx === index) {
          return {
            ...rule,
            [key]: value
          };
        }
        return rule;
      });
      return {
        ...prev,
        trigger_rules: updatedRules
      };
    });
  };

  const toggleWeekdayAtIndex = (index: number, day: string) => {
    const rule = formData.trigger_rules[index];
    const currentDays = [...rule.triggerOnWeekdays];
    const updatedDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];

    updateTriggerRuleAtIndex(index, 'triggerOnWeekdays', updatedDays);
  };

  const validateAndNext = async (nextStep: number) => {
    if (step === 1 && nextStep === 2) {
      if (!formData.agent_name.trim()) {
        showToast("Veuillez saisir un nom pour l'agent.", "err");
        return;
      }

      const currentOriginalName = agentToEdit?.agent_name || agentToEdit?.nom;
      if (isEditMode && currentOriginalName && currentOriginalName.trim().toLowerCase() === formData.agent_name.trim().toLowerCase()) {
        setStep(nextStep);
        return;
      }

      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const endpoint = `${baseUrl}/api/sourcing-agent/check-name/${encodeURIComponent(formData.agent_name.trim())}` + (editUuid ? `?excludeUuid=${encodeURIComponent(String(editUuid))}` : '');

        const token = localStorage.getItem('vmind_session');
        const res = await fetch(endpoint, {
          headers: { ...(token && { 'Authorization': `Bearer ${token}` }) }
        });

        if (!res.ok) {
          throw new Error("Erreur serveur lors de la vérification du nom.");
        }

        const data = await res.json();
        if (!data.available) {
          showToast("Un agent avec ce nom existe déjà. Veuillez choisir un autre nom.", "err");
          return;
        }
      } catch (err) {
        console.error("Failed to check agent name", err);
        showToast("Impossible de vérifier la disponibilité du nom de l'agent. Veuillez réessayer.", "err");
        return;
      }
    }

    setStep(nextStep);
  };

  const handleDeploy = async () => {
    if (!formData.agent_name.trim()) {
      showToast("Veuillez saisir un nom pour l'agent.", "err");
      if (step !== 1) setStep(1);
      return;
    }

    if (formData.target_agent_ids.length === 0) {
      showToast("Veuillez sélectionner au moins un agent de prospection pour recevoir les leads.", "err");
      if (step !== 2) setStep(2);
      return;
    }

    setIsDeploying(true);

    const now = new Date();
    const sessionId = `vsourcing_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

    const completePayload = {
      ...formData,
      session_id: sessionId,
      action: isEditMode ? 'update' : 'deploy'
    };

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const tokenStr = localStorage.getItem('vmind_session');
      let token = tokenStr;
      if (tokenStr?.trim().startsWith("{")) {
        try { token = JSON.parse(tokenStr).token; } catch (e) { }
      }

      const endpoint = isEditMode
        ? `${baseUrl}/api/sourcing-agent/update/${editUuid}`
        : `${baseUrl}/api/sourcing-agent/deploy`;

      const response = await fetch(endpoint, {
        method: isEditMode ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(completePayload)
      });

      if (!response.ok) {
        throw new Error(`Impossible de ${isEditMode ? 'mettre à jour' : 'déployer'} l'agent (${response.statusText})`);
      }

      const resData = await response.json();
      const deployedUuid = resData.uuid || resData.agent_id || editUuid || 'sourcing_agent';

      const liveAgentPayload: LiveAgent = {
        agent_id: deployedUuid,
        uuid: deployedUuid,
        agent_name: formData.agent_name,
        run_mode: 'sourcing',
        status: 'running',
        workflow_timezone: formData.workflow_timezone || 'Africa/Tunis',
        recovery_config: {},
        trigger_rules: [],
        session_id: sessionId,
        lastExecuted: Date.now(),
        config: {
          target_agent_ids: formData.target_agent_ids,
          agent_mission: formData.sourcing_config?.agent_mission || ''
        },
        target_agent_ids: formData.target_agent_ids
      };

      setDeployedAgent(liveAgentPayload);
      setActivationChoice('prompt');
      setShowActivationDialogue(true);
    } catch (error: any) {
      console.error('Deployment error:', error);
      alert(`Erreur de déploiement: ${error.message}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleDeployOnly = () => {
    setShowActivationDialogue(false);
    onCancel();
  };

  const handleRunOnceNow = () => {
    setShowActivationDialogue(false);
    setShowExecutionModal(true);
  };

  const handleScheduleNow = () => {
    setShowActivationDialogue(false);
    setShowScheduleModal(true);
  };

  const handleActivateSchedule = async (agent: LiveAgent, params: any) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const tokenStr = localStorage.getItem('vmind_session');
      let token = tokenStr;
      if (tokenStr?.trim().startsWith("{")) {
        try { token = JSON.parse(tokenStr).token; } catch (e) { }
      }

      const targetUuid = agent.uuid || agent.agent_id;
      const updateRes = await fetch(`${baseUrl}/api/sourcing-agent/update/${targetUuid}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          agent_name: agent.agent_name,
          trigger_rules: params.trigger_rules,
          target_agent_ids: params.target_agent_ids || agent.target_agent_ids,
          sourcing_config: {
            sourcingSummary: params.sourcingSummary,
            totalLeads: params.totalLeads,
            leadsPerCompany: params.leadsPerCompany,
            ignoreDuplicates: params.ignoreDuplicates
          }
        })
      });

      if (!updateRes.ok) {
        throw new Error("Échec de la mise à jour de la planification.");
      }

      const startRes = await fetch(`${baseUrl}/api/sourcing-agent/start/${targetUuid}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          target_agent_ids: params.target_agent_ids || agent.target_agent_ids
        })
      });

      if (!startRes.ok) {
        const errData = await startRes.json().catch(() => ({}));
        throw new Error(errData.error || "Échec du démarrage de l'agent.");
      }
    } catch (err: any) {
      console.error("[ACTIVATE-SCHEDULE]", err);
      alert(`Erreur lors de l'activation: ${err.message}`);
    }
  };

  return (
    <div id="view-wizard" className="anim">
      <div className="page-head">
        <div>
          <div className="page-title" id="wiz-title">
            Configuration: {template ? template.name : 'Nouvel Agent Sourcing'}
          </div>
          <div className="page-sub">Configurez votre agent de recherche de leads en 2 étapes</div>
        </div>
        <div className="page-actions">
          <Button onClick={onCancel}>← Retour Marketplace</Button>
        </div>
      </div>
      <div className="scroll">
        <div className="wizard-wrap">
          {/* STEPS */}
          <div className="wizard-steps" id="wiz-steps">
            <div className={`wstep ${step === 1 ? 'active' : step > 1 ? 'done' : ''}`}>
              <div className="wstep-inner">
                <div className="wstep-num">1</div>
                <div className="wstep-label">Identité</div>
              </div>
            </div>
            <div className={`wstep ${step === 2 ? 'active' : step > 2 ? 'done' : ''}`}>
              <div className="wstep-inner">
                <div className="wstep-num">2</div>
                <div className="wstep-label">Agents Cibles</div>
              </div>
            </div>
          </div>

          {/* STEP 1: Identité */}
          {step === 1 && (
            <div id="step1" className="anim">
              <div className="wcard">
                <div className="wcard-title"><span className="dot" style={{ backgroundColor: '#00E5C8' }}></span>Identité de l'Agent</div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Nom de l'agent <span className="req">*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.agent_name}
                      onFocus={() => setFocusedField('agent_name')}
                      onBlur={() => setFocusedField(null)}
                      onChange={(e) => setFormData({ ...formData, agent_name: e.target.value })}
                      placeholder="Ex: Sourcer IT - Paris, Chasseur SDR..."
                    />
                    <div className="form-hint">Ce nom identifie votre agent de sourcing dans le système.</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <Button variant="primary" onClick={() => validateAndNext(2)}>Distribution & Agents Cibles →</Button>
              </div>
            </div>
          )}

          {/* STEP 2: Agents Prospect Destinataires */}
          {step === 2 && (
            <div id="step2" className="anim">
              <div className="wcard">
                <div className="wcard-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Target size={18} color="#00E5C8" />
                  <span>Attribution des Leads (Agents de Prospection Destinataires)</span>
                </div>

                {/* Concise Info Banner */}
                <div style={{
                  padding: '14px 18px',
                  background: 'rgba(0, 229, 200, 0.06)',
                  border: '1px solid rgba(0, 229, 200, 0.3)',
                  borderRadius: '12px',
                  margin: '16px 0 20px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'rgba(0, 229, 200, 0.15)', color: '#00E5C8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Target size={18} color="#00E5C8" />
                  </div>
                  <div style={{ fontSize: '13px', color: '#F0F4F8', lineHeight: 1.4 }}>
                    Sélectionnez au moins un <strong>agent de prospection</strong> ci-dessous pour recevoir et contacter automatiquement les leads extraits.
                  </div>
                </div>

                {loadingProspectAgents ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#8A99AD' }}>
                    Chargement des agents de prospection...
                  </div>
                ) : availableProspectAgents.length === 0 ? (
                  <div style={{
                    padding: '28px 24px',
                    textAlign: 'center',
                    background: 'linear-gradient(160deg, rgba(8, 22, 42, 0.95) 0%, rgba(4, 12, 24, 0.98) 100%)',
                    borderRadius: '16px',
                    border: '1.5px solid rgba(0, 229, 200, 0.4)',
                    boxShadow: '0 12px 35px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 229, 200, 0.15)',
                    position: 'relative',
                    margin: '16px 0'
                  }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: 'rgba(0, 229, 200, 0.12)', border: '1px solid rgba(0, 229, 200, 0.4)',
                      color: '#00E5C8', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 14px auto', fontSize: 22
                    }}>
                      🎯
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#F0F4F8', marginBottom: 8 }}>
                      Aucun Agent de Prospection Trouvé
                    </div>
                    <div style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.6, maxWidth: 520, margin: '0 auto 20px auto' }}>
                      Votre Agent de Sourcing a besoin d&apos;au moins un <strong>Agent de Prospection (Closer)</strong> pour recevoir, évaluer et contacter automatiquement les leads extraits du web.
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap', position: 'relative' }}>
                      <VMindGuideArrow
                        direction="down"
                        color="#00E5C8"
                        style={{
                          position: 'absolute',
                          top: '-42px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          zIndex: 10
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            sessionStorage.setItem('vmind_guide_target_marketplace', 'prospection');
                          }
                          onCancel();
                        }}
                        style={{
                          padding: '11px 24px',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, #00E5C8 0%, #00B4D8 100%)',
                          border: 'none',
                          color: '#04101E',
                          fontSize: '13px',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          cursor: 'pointer',
                          boxShadow: '0 0 20px rgba(0, 229, 200, 0.45)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <CyberIcon name="zap" size={14} color="#04101E" />
                        <span>Trouver l&apos;Agent de Prospection dans le Marketplace</span>
                        <CyberIcon name="arrow-right" size={13} color="#04101E" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {availableProspectAgents.map((agent: any) => {
                      const isSelected = isAgentSelected(agent);
                      return (
                        <div
                          key={agent.uuid || agent.agent_id || agent.agent_name}
                          onClick={() => toggleTargetAgent(agent)}
                          style={{
                            padding: '16px',
                            borderRadius: '12px',
                            background: isSelected ? 'rgba(0, 229, 200, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                            border: `1.5px solid ${isSelected ? '#00E5C8' : 'rgba(255, 255, 255, 0.08)'}`,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '6px',
                              border: `1.5px solid ${isSelected ? '#00E5C8' : 'rgba(255,255,255,0.3)'}`,
                              background: isSelected ? '#00E5C8' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {isSelected && <Check size={16} color="#06111F" strokeWidth={3} />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: '#F0F4F8', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {agent.agent_name}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <Bot size={12} />
                              <span>{agent.run_mode || 'Prospection'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                <Button onClick={() => setStep(1)}>← Retour</Button>
                <Button 
                  variant="primary" 
                  onClick={handleDeploy} 
                  disabled={isDeploying || formData.target_agent_ids.length === 0}
                  style={{
                    opacity: formData.target_agent_ids.length === 0 ? 0.5 : 1,
                    cursor: formData.target_agent_ids.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isDeploying ? 'Enregistrement…' : 'Enregistrer & Continuer →'}
                </Button>
              </div>
            </div>
          )}

          {/* VirtualMind Floating Guide */}
          <VMindGuide
            isOpen={!!(focusedField && VIRTUAL_MIND_GUIDE[focusedField])}
            title={focusedField && VIRTUAL_MIND_GUIDE[focusedField] ? VIRTUAL_MIND_GUIDE[focusedField].title : undefined}
            message={focusedField && VIRTUAL_MIND_GUIDE[focusedField] ? VIRTUAL_MIND_GUIDE[focusedField].text : null}
            mood="focused"
          />

        </div>
      </div>

      {/* ── POST-DEPLOYMENT ACTIVATION DIALOGUE MODAL ── */}
      <AnimatePresence>
        {showActivationDialogue && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(6, 17, 31, 0.85)',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999,
              padding: 20
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              style={{
                width: '100%',
                maxWidth: 480,
                background: 'linear-gradient(135deg, rgba(12, 28, 48, 0.95) 0%, rgba(6, 17, 31, 0.98) 100%)',
                border: '1.5px solid rgba(0, 229, 200, 0.3)',
                borderRadius: 20,
                padding: 32,
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 229, 200, 0.1)',
                textAlign: 'center',
                position: 'relative'
              }}
            >
              <button
                onClick={handleDeployOnly}
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer'
                }}
              >
                <X size={20} />
              </button>

              <div style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: 'rgba(0, 229, 200, 0.12)',
                border: '1px solid rgba(0, 229, 200, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                color: '#00E5C8'
              }}>
                <CheckCircle2 size={28} />
              </div>

              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#F0F4F8', marginBottom: 8 }}>
                Agent Déployé avec Succès !
              </h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 28, lineHeight: 1.5 }}>
                L'agent <strong>{formData.agent_name}</strong> a été enregistré. Souhaitez-vous l'activer dès maintenant ?
              </p>

              {activationChoice === 'prompt' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button
                    onClick={() => setActivationChoice('activate')}
                    style={{
                      padding: '14px 20px',
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #00E5C8 0%, #00B8A0 100%)',
                      color: '#06111F',
                      fontWeight: 700,
                      fontSize: 14,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 15px rgba(0, 229, 200, 0.3)'
                    }}
                  >
                    <Zap size={18} />
                    <span>Activer l'Agent Maintenant</span>
                  </button>

                  <button
                    onClick={handleDeployOnly}
                    style={{
                      padding: '14px 20px',
                      borderRadius: 12,
                      background: 'rgba(255, 255, 255, 0.04)',
                      color: '#F0F4F8',
                      fontWeight: 600,
                      fontSize: 14,
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Save size={18} color="var(--muted)" />
                    <span>Déployer Uniquement (Sans activation)</span>
                  </button>
                </div>
              )}

              {activationChoice === 'activate' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ fontSize: 13, color: '#00E5C8', fontWeight: 600, marginBottom: 2 }}>
                    Comment souhaitez-vous exécuter l'agent ?
                  </div>

                  {/* Option A: Run Dialogue */}
                  <div
                    onClick={handleRunOnceNow}
                    style={{
                      padding: '16px 20px',
                      borderRadius: 14,
                      background: 'linear-gradient(135deg, rgba(0, 229, 200, 0.08) 0%, rgba(6, 17, 31, 0.6) 100%)',
                      border: '1.5px solid rgba(0, 229, 200, 0.4)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      textAlign: 'left',
                      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2), 0 0 15px rgba(0, 229, 200, 0.08)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 229, 200, 0.18) 0%, rgba(6, 17, 31, 0.8) 100%)';
                      e.currentTarget.style.borderColor = '#00E5C8';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 229, 200, 0.25)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 229, 200, 0.08) 0%, rgba(6, 17, 31, 0.6) 100%)';
                      e.currentTarget.style.borderColor = 'rgba(0, 229, 200, 0.4)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2), 0 0 15px rgba(0, 229, 200, 0.08)';
                    }}
                  >
                    <div style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: 'rgba(0, 229, 200, 0.15)',
                      border: '1px solid rgba(0, 229, 200, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#00E5C8',
                      flexShrink: 0
                    }}>
                      <Play size={20} fill="#00E5C8" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#F0F4F8', marginBottom: 3 }}>
                        Exécuter une fois maintenant
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.3 }}>
                        Lancement immédiat du ciblage et extraction d'un batch de leads
                      </div>
                    </div>
                  </div>

                  {/* Option B: Start Dialogue */}
                  <div
                    onClick={handleScheduleNow}
                    style={{
                      padding: '16px 20px',
                      borderRadius: 14,
                      background: 'linear-gradient(135deg, rgba(0, 229, 200, 0.08) 0%, rgba(6, 17, 31, 0.6) 100%)',
                      border: '1.5px solid rgba(0, 229, 200, 0.4)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      textAlign: 'left',
                      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2), 0 0 15px rgba(0, 229, 200, 0.08)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 229, 200, 0.18) 0%, rgba(6, 17, 31, 0.8) 100%)';
                      e.currentTarget.style.borderColor = '#00E5C8';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 229, 200, 0.25)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 229, 200, 0.08) 0%, rgba(6, 17, 31, 0.6) 100%)';
                      e.currentTarget.style.borderColor = 'rgba(0, 229, 200, 0.4)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2), 0 0 15px rgba(0, 229, 200, 0.08)';
                    }}
                  >
                    <div style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: 'rgba(0, 229, 200, 0.15)',
                      border: '1px solid rgba(0, 229, 200, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#00E5C8',
                      flexShrink: 0
                    }}>
                      <CalendarClock size={20} color="#00E5C8" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#F0F4F8', marginBottom: 3 }}>
                        Planifier l'exécution récurrente
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.3 }}>
                        Activation en mode autopilote continu selon votre fréquence de planification
                      </div>
                    </div>
                  </div>

                  {/* Return Button */}
                  <button
                    onClick={() => setActivationChoice('prompt')}
                    style={{
                      marginTop: 6,
                      padding: '10px 16px',
                      borderRadius: 10,
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#8A99AD',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.color = '#F0F4F8';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                      e.currentTarget.style.color = '#8A99AD';
                    }}
                  >
                    <ArrowLeft size={16} />
                    <span>Retour aux choix d'activation</span>
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VirtualMind Floating Guide */}
      <VMindGuide
        isOpen={
          !!(focusedField && VIRTUAL_MIND_GUIDE[focusedField]) ||
          (step === 2 && !loadingProspectAgents && availableProspectAgents.length === 0)
        }
        title={
          step === 2 && !loadingProspectAgents && availableProspectAgents.length === 0
            ? "Duo Indispensable : Agent de Prospection Requis"
            : focusedField && VIRTUAL_MIND_GUIDE[focusedField]
              ? VIRTUAL_MIND_GUIDE[focusedField].title
              : undefined
        }
        message={
          step === 2 && !loadingProspectAgents && availableProspectAgents.length === 0
            ? "Votre Chasseur (Sourcing Agent) a besoin d'un Closer (Prospect Agent) à qui transmettre ses leads qualifiés. Cliquez sur le bouton ci-dessous pour aller dans le Marketplace et découvrir l'Agent de Prospection !"
            : focusedField && VIRTUAL_MIND_GUIDE[focusedField]
              ? VIRTUAL_MIND_GUIDE[focusedField].text
              : null
        }
        mood={
          step === 2 && !loadingProspectAgents && availableProspectAgents.length === 0
            ? 'curious'
            : 'focused'
        }
        showBackdrop={false}
        onClose={() => setFocusedField(null)}
      >
        {step === 2 && !loadingProspectAgents && availableProspectAgents.length === 0 && (
          <div className="vmind-guide-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
            <button
              type="button"
              className="vmind-guide-btn-primary"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('vmind_guide_target_marketplace', 'prospection');
                }
                onCancel();
              }}
            >
              <CyberIcon name="zap" size={13} color="currentColor" />
              <span>Trouver dans le Marketplace</span>
              <CyberIcon name="arrow-right" size={13} color="currentColor" />
            </button>
          </div>
        )}
      </VMindGuide>

      {/* ── RUN ONCE (EXECUTION) MODAL ── */}
      {showExecutionModal && deployedAgent && (
        <SourcingAgentExecutionModal
          agent={deployedAgent}
          hideTargetAgentsSelection={true}
          onClose={() => {
            setShowExecutionModal(false);
            onCancel();
          }}
          onToast={(msg) => showToast(msg, 'ok')}
        />
      )}

      {/* ── SCHEDULE (START BUTTON POPUP) MODAL ── */}
      {showScheduleModal && deployedAgent && (
        <SourcingAgentScheduleModal
          agent={deployedAgent}
          onClose={() => {
            setShowScheduleModal(false);
            onCancel();
          }}
          onConfirm={async (params) => {
            await handleActivateSchedule(deployedAgent, params);
            setShowScheduleModal(false);
            onCancel();
          }}
          onEditSchedule={() => {
            setShowScheduleModal(false);
          }}
          onToast={(msg) => console.log(msg)}
        />
      )}
    </div>
  );
};
