'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  AlertCircle
} from 'lucide-react';

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

  const [nameError, setNameError] = useState<string | null>(null);
  const [companyContext, setCompanyContext] = useState<any>(() => {
    return agentToEdit?.company_context || agentToEdit?.config?.company_context || null;
  });

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
        showToast('Superviseur déployé avec succès. Ouverture de l’espace...', 'ok');
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
              onClick={() => step === 3 && setStep(2)}
              style={{ cursor: step === 3 ? 'pointer' : 'default' }}
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
            <div className={`wstep ${step === 3 ? 'active' : ''}`}>
              <div className="wstep-inner">
                <div className="wstep-num" style={{ width: '34px', height: '34px', fontSize: '13px', fontWeight: 700 }}>
                  3
                </div>
                <div
                  className="wstep-label"
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'none',
                    letterSpacing: '0',
                    marginTop: '4px',
                    color: step === 3 ? '#00E5C8' : '#8FA3B8',
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

          {/* ── STEP 3: CONFIRMATION & DÉPLOIEMENT ── */}
          {step === 3 && (
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
                  {/* Option 1: Déployer & Ouvrir */}
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
                        {isDeploying ? 'Déploiement…' : 'Déployer & Ouvrir'}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#8FA3B8', marginTop: '2px' }}>
                        Enregistre et ouvre immédiatement le cockpit
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
                        Enregistre dans vos agents sans ouvrir
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Back Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <Button onClick={() => setStep(2)} disabled={isDeploying} style={{ fontSize: '13px', padding: '10px 18px' }}>
                  <ArrowLeft size={14} style={{ marginRight: 6 }} />
                  Retour au Contexte Entreprise
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
