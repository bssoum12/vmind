'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/management/components/Button';
import { useToast } from '@/shared/contexts/ToastContext';
import { getBrowserTimezone } from '@/shared/utils/timezone';
import { AgentMultiSelect } from './components/AgentMultiSelect';
import { CompanyContextModal, getCompanyContext } from '@/features/company-context';
import {
  Bot,
  Check,
  ArrowRight,
  ArrowLeft,
  Zap,
  Globe,
  AlertCircle,
  CalendarClock,
  Mail
} from 'lucide-react';

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
  { value: 'Midnight', label: '00:00 (Minuit)' },
  { value: '1am', label: '01:00 (1h du matin)' },
  { value: '2am', label: '02:00 (2h du matin)' },
  { value: '3am', label: '03:00 (3h du matin)' },
  { value: '4am', label: '04:00 (4h du matin)' },
  { value: '5am', label: '05:00 (5h du matin)' },
  { value: '6am', label: '06:00 (06h du matin)' },
  { value: '7am', label: '07:00 (07h du matin)' },
  { value: '8am', label: '08:00 (08h du matin)' },
  { value: '9am', label: '09:00 (09h du matin)' },
  { value: '10am', label: '10:00 (10h du matin)' },
  { value: '11am', label: '11:00 (11h du matin)' },
  { value: '12pm', label: '12:00 (Midi)' },
  { value: '1pm', label: '13:00 (13h)' },
  { value: '2pm', label: '14:00 (14h)' },
  { value: '3pm', label: '15:00 (15h)' },
  { value: '4pm', label: '16:00 (16h)' },
  { value: '5pm', label: '17:00 (17h)' },
  { value: '6pm', label: '18:00 (18h)' },
  { value: '7pm', label: '19:00 (19h)' },
  { value: '8pm', label: '20:00 (20h)' },
  { value: '9pm', label: '21:00 (21h)' },
  { value: '10pm', label: '22:00 (22h)' },
  { value: '11pm', label: '23:00 (23h)' }
];

const weekdayOptions = [
  { value: 'Monday', label: 'Lun' },
  { value: 'Tuesday', label: 'Mar' },
  { value: 'Wednesday', label: 'Mer' },
  { value: 'Thursday', label: 'Jeu' },
  { value: 'Friday', label: 'Ven' },
  { value: 'Saturday', label: 'Sam' },
  { value: 'Sunday', label: 'Dim' }
];

const intervalOptions = [
  { value: 'Days', label: 'Jours' },
  { value: 'Weeks', label: 'Semaines' },
  { value: 'Hours', label: 'Heures' },
  { value: 'Minutes', label: 'Minutes' },
  { value: 'Seconds', label: 'Secondes' },
  { value: 'Months', label: 'Mois' }
];

interface WizardSupervisorViewProps {
  templateId: string;
  onCancel: () => void;
  agentToEdit?: any;
  initialStep?: number;
}

export const WizardSupervisorView: React.FC<WizardSupervisorViewProps> = ({
  templateId,
  onCancel,
  agentToEdit,
  initialStep = 1,
}) => {
  const router = useRouter();
  const { showToast } = useToast();
  const isEditMode = Boolean(agentToEdit);

  const [step, setStep] = useState<number>(initialStep || 1);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [availableAgents, setAvailableAgents] = useState<any[]>([]);
  const [loadingAgents, setLoadingAgents] = useState<boolean>(true);

  // Form State
  const [agentName, setAgentName] = useState<string>(() => {
    if (isEditMode && (agentToEdit.agent_name || agentToEdit.nom)) {
      return agentToEdit.agent_name || agentToEdit.nom;
    }
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `Superviseur Commercial - ${randomSuffix}`;
  });

  const [supervisedAgentIds, setSupervisedAgentIds] = useState<string[]>(() => {
    if (isEditMode) {
      const existing = agentToEdit.supervised_agent_ids || agentToEdit.config?.supervised_agent_ids || [];
      return Array.isArray(existing) ? existing.map(String) : [];
    }
    return [];
  });

  const [emailRecap, setEmailRecap] = useState<string>(() => {
    return (agentToEdit?.email_recap || agentToEdit?.config?.email_recap || '');
  });

  const [triggerRules, setTriggerRules] = useState<TriggerRule[]>(() => {
    if (Array.isArray(agentToEdit?.trigger_rules) && agentToEdit.trigger_rules.length > 0) {
      // M-8: only the first rule is ever used by the backend (/start reads
      // triggerRules[0]), so a supervisor saved earlier with 2+ rules must
      // not resurface the extras here — the wizard enforces a single rule.
      return agentToEdit.trigger_rules.slice(0, 1);
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

  const [nameError, setNameError] = useState<string | null>(null);
  const [companyContext, setCompanyContext] = useState<any>(() => {
    return agentToEdit?.company_context || agentToEdit?.config?.company_context || null;
  });

  const emailPrefetchedRef = useRef(false);

  // Pre-fill user email from vmind_users ONLY once on initial mount if empty
  useEffect(() => {
    if (emailPrefetchedRef.current) return;
    emailPrefetchedRef.current = true;

    // If agent already has an email configured (e.g. edit mode), do not overwrite it
    if (agentToEdit?.email_recap || agentToEdit?.config?.email_recap) {
      return;
    }

    (async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';
        const res = await fetch(`${baseUrl}/api/supervisor-agent/user-email`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.email) {
            setEmailRecap((prev) => (prev ? prev : data.email));
          }
        }
      } catch (e) {
        console.warn('Could not prefetch user email in supervisor wizard:', e);
      }
    })();
  }, []);

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
    setTriggerRules(prev => prev.filter((_, idx) => idx !== index));
  };

  const updateTriggerRuleAtIndex = (index: number, field: keyof TriggerRule, value: any) => {
    setTriggerRules(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const toggleWeekdayAtIndex = (index: number, day: string) => {
    const rule = triggerRules[index];
    const currentDays = [...(rule.triggerOnWeekdays || [])];
    const updatedDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    updateTriggerRuleAtIndex(index, 'triggerOnWeekdays', updatedDays);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const existing = await getCompanyContext();
        if (!cancelled && existing) {
          setCompanyContext((prev: any) => prev || existing);
        }
      } catch (err) {
        console.warn('Could not pre-fetch company context:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [isCheckingName, setIsCheckingName] = useState<boolean>(false);

  // Load active sales agents (Prospection & Sourcing) owned by user
  useEffect(() => {
    const fetchUserAgents = async () => {
      setLoadingAgents(true);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';
        const res = await fetch(`${baseUrl}/api/list-agents`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.agents)) {
            const salesAgents = data.agents.filter((a: any) => {
              const mode = (a.run_mode || '').trim().toLowerCase();
              return (
                mode === 'prospection' ||
                mode === 'prospect' ||
                mode === 'prospect_agent' ||
                mode === 'sourcing' ||
                mode === 'sourcing_agent'
              );
            });
            setAvailableAgents(salesAgents);

            if (!isEditMode && supervisedAgentIds.length === 0 && salesAgents.length > 0) {
              const defaultIds = salesAgents
                .map((a: any) => a.uuid || a.agent_id || a.id || a.agent_name)
                .filter(Boolean)
                .map(String);
              setSupervisedAgentIds(defaultIds);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load agents for supervisor:', err);
      } finally {
        setLoadingAgents(false);
      }
    };

    fetchUserAgents();
  }, []);

  // Validate Step 1 before going to Step 2
  const handleProceedToConfirmation = async () => {
    const trimmed = agentName.trim();
    if (!trimmed) {
      setNameError("Le nom de l'agent est requis");
      return;
    }

    setIsCheckingName(true);
    setNameError(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';
      const excludeParam = isEditMode && (agentToEdit.uuid || agentToEdit.agent_id)
        ? `?excludeUuid=${encodeURIComponent(agentToEdit.uuid || agentToEdit.agent_id)}`
        : '';
      const checkRes = await fetch(`${baseUrl}/api/supervisor-agent/check-name/${encodeURIComponent(trimmed)}${excludeParam}`, {
        credentials: 'include',
      });

      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (!checkData.available) {
          setNameError("Ce nom d'agent est déjà utilisé globalement. Veuillez en choisir un autre.");
          setIsCheckingName(false);
          return;
        }
      }
    } catch {
      // Continue if network check fails
    } finally {
      setIsCheckingName(false);
    }

    setStep(2);
  };

  const hasValidCompanyContext = useMemo(() => {
    if (!companyContext) return false;
    const summary = (companyContext.summary || companyContext.presentation || '').trim();
    return summary.length >= 20;
  }, [companyContext]);

  // Deployment action: either 'run_now' or 'deploy_only'
  const handleExecuteDeployment = async (actionType: 'run_now' | 'deploy_only') => {
    if (!hasValidCompanyContext) {
      showToast('Le contexte d’entreprise est obligatoire pour déployer le superviseur.', 'err');
      setStep(2);
      return;
    }

    setIsDeploying(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';
      const payload = {
        agent_name: agentName.trim(),
        agent_mission: '',
        supervised_agent_ids: supervisedAgentIds,
        workflow_timezone: getBrowserTimezone(),
        run_mode: 'supervisor',
        company_context: companyContext || {},
        email_recap: emailRecap.trim(),
        trigger_rules: triggerRules,
      };

      const url = isEditMode
        ? `${baseUrl}/api/supervisor-agent/update/${agentToEdit.uuid || agentToEdit.agent_id}`
        : `${baseUrl}/api/supervisor-agent/deploy`;
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors du déploiement du superviseur');
      }

      const publicUuid = data.agent_id || data.uuid || (isEditMode ? (agentToEdit.uuid || agentToEdit.agent_id) : '');

      if (actionType === 'run_now') {
        showToast('Superviseur déployé avec succès. Lancement de l’audit initial...', 'ok');
        try {
          await fetch(`${baseUrl}/api/supervisor-agent/run-now/${encodeURIComponent(publicUuid)}`, {
            method: 'POST',
            credentials: 'include'
          });
        } catch (e) {
          console.warn('Initial audit notice:', e);
        }
        router.push(`/supervisor-agent-workspace/${publicUuid}`);
      } else {
        showToast('Superviseur déployé avec succès dans vos agents.', 'ok');
        router.push('/?view=agents');
      }
    } catch (err: any) {
      console.error('Supervisor deployment failed:', err);
      showToast(err.message || 'Échec du déploiement du superviseur', 'err');
    } finally {
      setIsDeploying(false);
    }
  };

  const selectedAgentObjects = useMemo(() => {
    const idSet = new Set(supervisedAgentIds.map(id => String(id).trim().toLowerCase()));
    return availableAgents.filter((a: any) => {
      const keys = [a.uuid, a.agent_id, a.id, a.nom, a.agent_name]
        .filter(Boolean)
        .map(k => String(k).trim().toLowerCase());
      return keys.some(k => idSet.has(k));
    });
  }, [availableAgents, supervisedAgentIds]);

  return (
    <div id="view-wizard" className="anim" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ── Fixed Page Header ── */}
      <div className="page-head" style={{ padding: '16px 28px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: '#050B16', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(0, 229, 200, 0.12)',
              border: '1px solid rgba(0, 229, 200, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              flexShrink: 0
            }}>
              👁️
            </div>
            <div>
              <div className="page-title" id="wiz-title" style={{ fontSize: '16.5px', fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isEditMode ? 'Configuration: Superviseur Commercial (Modification)' : 'Configuration: Superviseur Commercial'}
                <span style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '2px 7px',
                  borderRadius: '5px',
                  background: 'rgba(0, 229, 200, 0.15)',
                  color: '#00E5C8',
                  border: '1px solid rgba(0, 229, 200, 0.3)',
                }}>
                  Flotte IA
                </span>
              </div>
              <div className="page-sub" style={{ fontSize: '12px', color: '#8FA3B8', marginTop: '2px' }}>
                Supervisez et synchronisez les performances de votre flotte commerciale
              </div>
            </div>
          </div>
          <div className="page-actions">
            <Button onClick={onCancel} style={{ fontSize: '13px', padding: '8px 16px' }}>
              ← Annuler
            </Button>
          </div>
        </div>
      </div>

      {/* ── Scrollable Body Area ── */}
      <div className="scroll" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="wizard-wrap" style={{ maxWidth: '880px', margin: '0 auto', padding: '24px 20px 48px' }}>

          {/* ── Native VMIND Wizard Stepper ── */}
          <div className="wizard-steps" id="wiz-steps" style={{ marginBottom: '22px' }}>
            {/* Step 1 */}
            <div
              className={`wstep ${step === 1 ? 'active' : step > 1 ? 'done' : ''}`}
              onClick={() => step > 1 && setStep(1)}
              style={{ cursor: step > 1 ? 'pointer' : 'default' }}
            >
              <div className="wstep-inner">
                <div className="wstep-num" style={{ width: '34px', height: '34px', fontSize: '13px', fontWeight: 700 }}>
                  {step > 1 ? <Check size={14} strokeWidth={3} /> : '1'}
                </div>
                <div
                  className="wstep-label"
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'none',
                    letterSpacing: '0',
                    marginTop: '4px',
                    color: step === 1 ? '#00E5C8' : (step > 1 ? '#00E5C8' : '#8FA3B8'),
                  }}
                >
                  Configuration & Périmètre
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div
              className={`wstep ${step === 2 ? 'active' : step > 2 ? 'done' : ''}`}
              onClick={() => step > 2 && setStep(2)}
              style={{ cursor: step > 2 ? 'pointer' : 'default' }}
            >
              <div className="wstep-inner">
                <div className="wstep-num" style={{ width: '34px', height: '34px', fontSize: '13px', fontWeight: 700 }}>
                  {step > 2 ? <Check size={14} strokeWidth={3} /> : '2'}
                </div>
                <div
                  className="wstep-label"
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'none',
                    letterSpacing: '0',
                    marginTop: '4px',
                    color: step === 2 ? '#00E5C8' : (step > 2 ? '#00E5C8' : '#8FA3B8'),
                  }}
                >
                  Contexte Entreprise
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div
              className={`wstep ${step === 3 ? 'active' : step > 3 ? 'done' : ''}`}
              onClick={() => step > 3 && setStep(3)}
              style={{ cursor: step > 3 ? 'pointer' : 'default' }}
            >
              <div className="wstep-inner">
                <div className="wstep-num" style={{ width: '34px', height: '34px', fontSize: '13px', fontWeight: 700 }}>
                  {step > 3 ? <Check size={14} strokeWidth={3} /> : '3'}
                </div>
                <div
                  className="wstep-label"
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'none',
                    letterSpacing: '0',
                    marginTop: '4px',
                    color: step === 3 ? '#00E5C8' : (step > 3 ? '#00E5C8' : '#8FA3B8'),
                  }}
                >
                  Planification & Notifications
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className={`wstep ${step === 4 ? 'active' : ''}`}>
              <div className="wstep-inner">
                <div className="wstep-num" style={{ width: '34px', height: '34px', fontSize: '13px', fontWeight: 700 }}>
                  4
                </div>
                <div
                  className="wstep-label"
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'none',
                    letterSpacing: '0',
                    marginTop: '4px',
                    color: step === 4 ? '#00E5C8' : '#8FA3B8',
                  }}
                >
                  Confirmation & Déploiement
                </div>
              </div>
            </div>
          </div>

          {/* ── STEP 1: CONFIGURATION & PÉRIMÈTRE ── */}
          {step === 1 && (
            <div className="anim" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Card 1: Identity */}
              <div className="wcard" style={{ padding: '20px 24px', marginBottom: 0 }}>
                <div
                  className="wcard-title"
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    textTransform: 'none',
                    letterSpacing: '0.01em',
                    color: '#FFFFFF',
                    marginBottom: '14px',
                  }}
                >
                  <span className="dot" style={{ width: '8px', height: '8px' }} />
                  Identité du Superviseur
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, color: '#E2E8F0' }}>
                    Nom de l&apos;agent <span className="req" style={{ fontSize: '12px', color: '#00E5C8' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={agentName}
                    onChange={(e) => {
                      setAgentName(e.target.value);
                      if (nameError) setNameError(null);
                    }}
                    placeholder="Ex: Superviseur Commercial - Alpha"
                    style={{
                      fontSize: '13.5px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      borderColor: nameError ? '#FF4757' : undefined,
                    }}
                  />
                  {nameError ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#FF4757', fontSize: '12px', marginTop: '4px' }}>
                      <AlertCircle size={13} />
                      <span>{nameError}</span>
                    </div>
                  ) : (
                    <span className="form-hint" style={{ fontSize: '12px', color: '#8FA3B8', marginTop: '4px' }}>
                      Nom unique visible dans votre cockpit de pilotage
                    </span>
                  )}
                </div>
              </div>

              {/* Card 2: Fleet Selection */}
              <div className="wcard" style={{ padding: '20px 24px', marginBottom: 0 }}>
                <div
                  className="wcard-title"
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    textTransform: 'none',
                    letterSpacing: '0.01em',
                    color: '#FFFFFF',
                    marginBottom: '6px',
                  }}
                >
                  <span className="dot" style={{ width: '8px', height: '8px' }} />
                  Flotte Commerciale sous Supervision ({supervisedAgentIds.length} agents)
                </div>

                <div style={{ marginBottom: '14px', fontSize: '12.5px', color: '#8FA3B8', lineHeight: 1.45 }}>
                  Sélectionnez les agents de prospection et de sourcing que ce superviseur coordonnera et évaluera.
                </div>

                <AgentMultiSelect
                  selectedAgentIds={supervisedAgentIds}
                  onChange={setSupervisedAgentIds}
                  availableAgents={availableAgents}
                  isLoading={loadingAgents}
                />
              </div>

              {/* Bottom Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <Button onClick={onCancel} style={{ fontSize: '13px', padding: '10px 20px' }}>
                  Annuler
                </Button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleProceedToConfirmation}
                  disabled={isCheckingName || !agentName.trim()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 22px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    borderRadius: '8px',
                  }}
                >
                  <span>Continuer vers le Contexte Entreprise</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: CONTEXTE ENTREPRISE ── */}
          {step === 2 && (
            <div className="anim">
              <div className="wcard" style={{ padding: '22px 24px' }}>
                <div
                  className="wcard-title"
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    textTransform: 'none',
                    letterSpacing: '0.01em',
                    color: '#FFFFFF',
                    marginBottom: '14px',
                  }}
                >
                  <span className="dot" style={{ width: '8px', height: '8px' }} />
                  Contexte d&apos;Entreprise (Obligatoire)
                </div>

                <CompanyContextModal
                  inline={true}
                  context={companyContext}
                  onClose={() => {}}
                  onBack={() => setStep(1)}
                  onSaveContext={(ctx) => {
                    setCompanyContext(ctx);
                    setStep(3);
                  }}
                />
              </div>
            </div>
          )}

          {/* ── STEP 3: PLANIFICATION & NOTIFICATIONS ── */}
          {step === 3 && (
            <div id="step3-planification" className="anim">
              <div className="wcard">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div className="wcard-title" style={{ margin: 0 }}>
                    <span className="dot" style={{ backgroundColor: '#00E5C8' }}></span>
                    Règles de Planification Automatique
                  </div>
                  <button
                    type="button"
                    onClick={addTriggerRule}
                    disabled={triggerRules.length >= 1}
                    title={triggerRules.length >= 1 ? 'Une seule règle de planification est prise en charge pour le moment.' : undefined}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: triggerRules.length >= 1 ? 'not-allowed' : 'pointer',
                      opacity: triggerRules.length >= 1 ? 0.4 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span>+</span> Ajouter une règle
                  </button>
                </div>

                <p style={{ margin: '0 0 16px', fontSize: '11px', color: '#8a94a6' }}>
                  Une seule règle de planification est prise en charge pour le moment.
                </p>

                {triggerRules.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#b2bec3', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    Aucune règle de déclenchement définie. L&apos;agent ne s&apos;exécutera pas automatiquement.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {triggerRules.map((rule, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '20px',
                          backgroundColor: 'rgba(0,0,0,0.25)',
                          borderRadius: '8px',
                          border: '1px solid rgba(255,255,255,0.07)',
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'rgba(255,255,255,0.7)' }}>
                            ⚡ Règle d&apos;Intervalle #{index + 1}
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
                              opacity: 0.8,
                              transition: 'opacity 0.2s'
                            }}
                            title="Supprimer la règle"
                          >
                            🗑️
                          </button>
                        </div>

                        <div className="form-row">
                          <div className="form-group" style={{ flex: '1 1 100%' }}>
                            <label className="form-label" style={{ fontWeight: 'bold' }}>Intervalle de Déclenchement</label>
                            <select
                              className="form-input"
                              value={rule.interval}
                              onChange={(e) => updateTriggerRuleAtIndex(index, 'interval', e.target.value)}
                            >
                              {intervalOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* DYNAMIC SUBFIELDS BY RULE TYPE */}
                        <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>

                          {/* SECONDS */}
                          {rule.interval === 'Seconds' && (
                            <div className="form-group anim">
                              <label className="form-label">Secondes entre les Déclenchements (1 - 59)</label>
                              <input
                                type="number"
                                className="form-input"
                                min="1"
                                max="59"
                                value={rule.secondsBetween}
                                onChange={(e) => updateTriggerRuleAtIndex(index, 'secondsBetween', Number(e.target.value))}
                              />
                            </div>
                          )}

                          {/* MINUTES */}
                          {rule.interval === 'Minutes' && (
                            <div className="form-group anim">
                              <label className="form-label">Minutes entre les Déclenchements (1 - 59)</label>
                              <input
                                type="number"
                                className="form-input"
                                min="1"
                                max="59"
                                value={rule.minutesBetween}
                                onChange={(e) => updateTriggerRuleAtIndex(index, 'minutesBetween', Number(e.target.value))}
                              />
                            </div>
                          )}

                          {/* HOURS */}
                          {rule.interval === 'Hours' && (
                            <div className="form-row anim">
                              <div className="form-group">
                                <label className="form-label">Heures entre les Déclenchements (1 - 23)</label>
                                <input
                                  type="number"
                                  className="form-input"
                                  min="1"
                                  max="23"
                                  value={rule.hoursBetween}
                                  onChange={(e) => updateTriggerRuleAtIndex(index, 'hoursBetween', Number(e.target.value))}
                                />
                              </div>
                              <div className="form-group">
                                <label className="form-label">Minute d&apos;Exécution</label>
                                <input
                                  type="number"
                                  className="form-input"
                                  min="0"
                                  max="59"
                                  value={rule.triggerAtMinute}
                                  onChange={(e) => updateTriggerRuleAtIndex(index, 'triggerAtMinute', Number(e.target.value))}
                                />
                              </div>
                            </div>
                          )}

                          {/* DAYS */}
                          {rule.interval === 'Days' && (
                            <div className="form-row anim">
                              <div className="form-group">
                                <label className="form-label">Jours entre les Déclenchements (1 - 31)</label>
                                <input
                                  type="number"
                                  className="form-input"
                                  min="1"
                                  max="31"
                                  value={rule.daysBetween}
                                  onChange={(e) => updateTriggerRuleAtIndex(index, 'daysBetween', Number(e.target.value))}
                                />
                              </div>
                              <div className="form-group">
                                <label className="form-label">Heure d&apos;Exécution</label>
                                <select
                                  className="form-input"
                                  value={rule.triggerAtHour}
                                  onChange={(e) => updateTriggerRuleAtIndex(index, 'triggerAtHour', e.target.value)}
                                >
                                  {hourOptions.map(h => (
                                    <option key={h.value} value={h.value}>{h.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="form-group">
                                <label className="form-label">Minute d&apos;Exécution</label>
                                <input
                                  type="number"
                                  className="form-input"
                                  min="0"
                                  max="59"
                                  value={rule.triggerAtMinute}
                                  onChange={(e) => updateTriggerRuleAtIndex(index, 'triggerAtMinute', Number(e.target.value))}
                                />
                              </div>
                            </div>
                          )}

                          {/* WEEKS */}
                          {rule.interval === 'Weeks' && (
                            <div className="anim">
                              <div className="form-row">
                                <div className="form-group" style={{ flex: 1 }}>
                                  <label className="form-label">Semaines entre les Déclenchements</label>
                                  <input
                                    type="number"
                                    className="form-input"
                                    min="1"
                                    value={rule.weeksBetween}
                                    onChange={(e) => updateTriggerRuleAtIndex(index, 'weeksBetween', Number(e.target.value))}
                                  />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                  <label className="form-label">Heure d&apos;Exécution</label>
                                  <select
                                    className="form-input"
                                    value={rule.triggerAtHour}
                                    onChange={(e) => updateTriggerRuleAtIndex(index, 'triggerAtHour', e.target.value)}
                                  >
                                    {hourOptions.map(h => (
                                      <option key={h.value} value={h.value}>{h.label}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                  <label className="form-label">Minute d&apos;Exécution</label>
                                  <input
                                    type="number"
                                    className="form-input"
                                    min="0"
                                    max="59"
                                    value={rule.triggerAtMinute}
                                    onChange={(e) => updateTriggerRuleAtIndex(index, 'triggerAtMinute', Number(e.target.value))}
                                  />
                                </div>
                              </div>
                              <div
                                className="form-group"
                                style={{ marginTop: '10px' }}
                              >
                                <label className="form-label">Jours Autorisés de la Semaine</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                                  {weekdayOptions.map(day => {
                                    const isSelected = (rule.triggerOnWeekdays || []).includes(day.value);
                                    return (
                                      <button
                                        key={day.value}
                                        type="button"
                                        onClick={() => toggleWeekdayAtIndex(index, day.value)}
                                        style={{
                                          padding: '6px 12px',
                                          borderRadius: '20px',
                                          fontSize: '11px',
                                          fontWeight: 'bold',
                                          cursor: 'pointer',
                                          backgroundColor: isSelected ? '#00e5c8' : 'rgba(255,255,255,0.06)',
                                          color: isSelected ? 'white' : '#b2bec3',
                                          border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                          transition: 'all 0.2s ease'
                                        }}
                                      >
                                        {day.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* MONTHS */}
                          {rule.interval === 'Months' && (
                            <div className="anim">
                              <div className="form-row">
                                <div className="form-group">
                                  <label className="form-label">Mois entre les Déclenchements</label>
                                  <input
                                    type="number"
                                    className="form-input"
                                    min="1"
                                    value={rule.monthsBetween}
                                    onChange={(e) => updateTriggerRuleAtIndex(index, 'monthsBetween', Number(e.target.value))}
                                  />
                                </div>
                                <div className="form-group">
                                  <label className="form-label">Jour du Mois (1 - 31)</label>
                                  <input
                                    type="number"
                                    className="form-input"
                                    min="1"
                                    max="31"
                                    value={rule.triggerAtDayOfMonth}
                                    onChange={(e) => updateTriggerRuleAtIndex(index, 'triggerAtDayOfMonth', Number(e.target.value))}
                                  />
                                  <div className="form-hint" style={{ fontSize: '9px', color: '#ff7675' }}>
                                    Remarque: Si le mois n&apos;a pas ce jour, le déclenchement n&apos;aura pas lieu.
                                  </div>
                                </div>
                              </div>
                              <div className="form-row" style={{ marginTop: '10px' }}>
                                <div className="form-group">
                                  <label className="form-label">Heure d&apos;Exécution</label>
                                  <select
                                    className="form-input"
                                    value={rule.triggerAtHour}
                                    onChange={(e) => updateTriggerRuleAtIndex(index, 'triggerAtHour', e.target.value)}
                                  >
                                    {hourOptions.map(h => (
                                      <option key={h.value} value={h.value}>{h.label}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="form-group">
                                  <label className="form-label">Minute d&apos;Exécution</label>
                                  <input
                                    type="number"
                                    className="form-input"
                                    min="0"
                                    max="59"
                                    value={rule.triggerAtMinute}
                                    onChange={(e) => updateTriggerRuleAtIndex(index, 'triggerAtMinute', Number(e.target.value))}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Email Récapitulatif Card */}
              <div className="wcard" style={{ marginTop: '20px' }}>
                <div className="wcard-title">
                  <span className="dot" style={{ backgroundColor: '#00E5C8' }}></span>
                  Email Récapitulatif
                </div>
                <div className="form-group">
                  <label className="form-label">Adresse email pour le bilan d&apos;audit</label>
                  <input
                    type="email"
                    className="form-input"
                    value={emailRecap}
                    onChange={(e) => setEmailRecap(e.target.value)}
                    placeholder="contact@entreprise.com"
                  />
                  <span className="form-hint">
                    Adresse email sur laquelle vous recevrez le bilan consolidé des performances et de l&apos;alignement de votre flotte.
                  </span>
                </div>
              </div>

              {/* Bottom Navigation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                <Button onClick={() => setStep(2)}>← Retour au Contexte</Button>
                <Button variant="primary" onClick={() => setStep(4)}>Confirmation & Déploiement →</Button>
              </div>
            </div>
          )}

          {/* ── STEP 4: CONFIRMATION & DÉPLOIEMENT ── */}
          {step === 4 && (
            <div className="anim" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Summary Card */}
              <div className="wcard" style={{ padding: '20px 24px', marginBottom: 0 }}>
                <div
                  className="wcard-title"
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    textTransform: 'none',
                    letterSpacing: '0.01em',
                    color: '#FFFFFF',
                    marginBottom: '14px',
                  }}
                >
                  <span className="dot" style={{ width: '8px', height: '8px' }} />
                  Récapitulatif de Déploiement
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Summary Rows */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                  }}>
                    <div style={{
                      padding: '12px 16px',
                      background: 'var(--navy4)',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                    }}>
                      <div style={{ fontSize: '11px', color: '#8FA3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                        Superviseur
                      </div>
                      <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#FFFFFF', marginTop: '3px' }}>
                        {agentName}
                      </div>
                    </div>

                    <div style={{
                      padding: '12px 16px',
                      background: 'var(--navy4)',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                    }}>
                      <div style={{ fontSize: '11px', color: '#8FA3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                        Flotte Assignée
                      </div>
                      <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#00E5C8', marginTop: '3px' }}>
                        {supervisedAgentIds.length} agent(s) sous supervision
                      </div>
                    </div>

                    <div style={{
                      padding: '12px 16px',
                      background: 'var(--navy4)',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                    }}>
                      <div style={{ fontSize: '11px', color: '#8FA3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                        Fréquence d&apos;Audit
                      </div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#FFFFFF', marginTop: '3px' }}>
                        {triggerRules[0]?.interval === 'Hours' && `Toutes les ${triggerRules[0].hoursBetween} heure(s)`}
                        {triggerRules[0]?.interval === 'Days' && `Tous les ${triggerRules[0].daysBetween} jour(s) à ${triggerRules[0].triggerAtHour || '08:00'}`}
                        {triggerRules[0]?.interval === 'Weeks' && `Toutes les ${triggerRules[0].weeksBetween} semaine(s)`}
                        {triggerRules[0]?.interval === 'Months' && `Tous les mois (jour ${triggerRules[0].triggerAtDayOfMonth})`}
                        {triggerRules[0]?.interval === 'Seconds' && `Toutes les ${triggerRules[0].secondsBetween}s`}
                        {triggerRules[0]?.interval === 'Minutes' && `Toutes les ${triggerRules[0].minutesBetween} min`}
                      </div>
                    </div>

                    <div style={{
                      padding: '12px 16px',
                      background: 'var(--navy4)',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                    }}>
                      <div style={{ fontSize: '11px', color: '#8FA3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                        Email Bilan
                      </div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#00E5C8', marginTop: '3px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {emailRecap || 'Non configuré'}
                      </div>
                    </div>
                  </div>

                  {/* Supervised Agents List */}
                  {selectedAgentObjects.length > 0 && (
                    <div style={{
                      padding: '12px 16px',
                      background: 'var(--navy4)',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                    }}>
                      <div style={{ fontSize: '11.5px', color: '#8FA3B8', marginBottom: '8px', fontWeight: 600 }}>
                        Agents supervisés :
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {selectedAgentObjects.map((agent: any) => (
                          <span
                            key={agent.uuid || agent.agent_id || agent.agent_name}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              background: 'var(--cyana)',
                              border: '1px solid rgba(0, 229, 200, 0.25)',
                              color: '#FFFFFF',
                              fontSize: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontWeight: 500,
                            }}
                          >
                            <span>{agent.run_mode === 'sourcing' ? '🕵️' : '🎯'}</span>
                            <span>{agent.agent_name || agent.nom}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Company Context Validation Status */}
                  {hasValidCompanyContext ? (
                    <div style={{
                      padding: '13px 16px',
                      background: 'var(--cyana)',
                      borderRadius: '8px',
                      border: '1px solid rgba(0, 229, 200, 0.3)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#00E5C8', fontWeight: 700, fontSize: '13px' }}>
                          <Globe size={14} />
                          <span>Contexte Entreprise Configuré</span>
                          {companyContext?.website && (
                            <span style={{ color: '#8FA3B8', fontWeight: 400, fontSize: '12px' }}>({companyContext.website})</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#00E5C8',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          Modifier
                        </button>
                      </div>
                      <div style={{ color: '#E2E8F0', fontSize: '12.5px', lineHeight: 1.5, maxHeight: '68px', overflowY: 'auto' }}>
                        {companyContext?.summary?.slice(0, 260)}...
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      padding: '12px 16px',
                      background: 'rgba(255, 71, 87, 0.1)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 71, 87, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <span style={{ color: '#FF4757', fontSize: '12.5px', fontWeight: 600 }}>
                        ⚠️ Contexte d’entreprise requis avant de pouvoir déployer.
                      </span>
                      <Button onClick={() => setStep(2)} style={{ fontSize: '12px' }}>
                        Configurer
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Deployment Activation Options */}
              <div className="wcard" style={{ padding: '22px 26px', marginBottom: 0 }}>
                <div
                  className="wcard-title"
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 700,
                    textTransform: 'none',
                    letterSpacing: '0.01em',
                    color: '#FFFFFF',
                    marginBottom: '14px',
                  }}
                >
                  <span className="dot" style={{ width: '8px', height: '8px' }} />
                  Options de Déploiement
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {/* Option 1: Déployer & Lancer l'Audit */}
                  <button
                    type="button"
                    disabled={isDeploying || !hasValidCompanyContext}
                    onClick={() => handleExecuteDeployment('run_now')}
                    style={{
                      padding: '14px 18px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, rgba(0, 229, 200, 0.15) 0%, rgba(0, 180, 216, 0.2) 100%)',
                      border: '1.5px solid var(--cyan)',
                      color: 'var(--white)',
                      cursor: (isDeploying || !hasValidCompanyContext) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      opacity: (isDeploying || !hasValidCompanyContext) ? 0.45 : 1,
                    }}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'var(--cyan)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Zap size={18} color="#04101E" strokeWidth={2.5} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>
                        {isDeploying ? 'Déploiement…' : "Déployer & Lancer l'Audit"}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#8FA3B8', marginTop: '2px' }}>
                        Enregistre, exécute l&apos;audit immédiat et envoie le rapport
                      </div>
                    </div>
                  </button>

                  {/* Option 2: Déployer Uniquement */}
                  <button
                    type="button"
                    disabled={isDeploying || !hasValidCompanyContext}
                    onClick={() => handleExecuteDeployment('deploy_only')}
                    style={{
                      padding: '14px 18px',
                      borderRadius: '10px',
                      background: 'var(--navy4)',
                      border: '1px solid var(--border)',
                      color: 'var(--white)',
                      cursor: (isDeploying || !hasValidCompanyContext) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      opacity: (isDeploying || !hasValidCompanyContext) ? 0.45 : 1,
                    }}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Bot size={18} color="var(--cyan)" />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>
                        {isDeploying ? 'Déploiement…' : 'Déployer Uniquement'}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#8FA3B8', marginTop: '2px' }}>
                        Enregistre dans vos agents sans exécuter
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Back Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <Button onClick={() => setStep(3)} disabled={isDeploying} style={{ fontSize: '13px', padding: '10px 18px' }}>
                  <ArrowLeft size={14} style={{ marginRight: 6 }} />
                  Retour à la Planification
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default WizardSupervisorView;
