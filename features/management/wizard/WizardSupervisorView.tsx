'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/management/components/Button';
import { useToast } from '@/shared/contexts/ToastContext';
import { getBrowserTimezone } from '@/shared/utils/timezone';
import { AgentMultiSelect } from './components/AgentMultiSelect';
import {
  Bot,
  Check,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Zap,
  Sparkles,
  Layers,
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

  const [agentMission, setAgentMission] = useState<string>(() => {
    if (isEditMode) {
      return agentToEdit.config?.agent_mission || agentToEdit.agent_mission || '';
    }
    return 'Superviser l’alignement stratégique des agents, auditer la qualité des leads et maximiser le taux de conversion global de la flotte.';
  });

  const [supervisedAgentIds, setSupervisedAgentIds] = useState<string[]>(() => {
    if (isEditMode) {
      const existing = agentToEdit.supervised_agent_ids || agentToEdit.config?.supervised_agent_ids || [];
      return Array.isArray(existing) ? existing.map(String) : [];
    }
    return [];
  });

  const [nameError, setNameError] = useState<string | null>(null);
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
            // Strictly filter to ONLY Prospect and Sourcing agents owned by the user
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

            // Default to selecting all available agents if new deployment and none preselected
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

  // Deployment action: either 'run_now' or 'deploy_only'
  const handleExecuteDeployment = async (actionType: 'run_now' | 'deploy_only') => {
    setIsDeploying(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';
      const payload = {
        agent_name: agentName.trim(),
        agent_mission: agentMission.trim(),
        supervised_agent_ids: supervisedAgentIds,
        workflow_timezone: getBrowserTimezone(),
        run_mode: 'supervisor',
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
      <div className="page-head" style={{ padding: '20px 28px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: '#050B16', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(157, 78, 221, 0.16)',
              border: '1.5px solid rgba(157, 78, 221, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: '0 0 16px rgba(157, 78, 221, 0.25)',
              flexShrink: 0
            }}>
              👁️
            </div>
            <div>
              <div className="page-title" id="wiz-title" style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isEditMode ? 'Configuration: Superviseur Commercial (Modification)' : 'Configuration: Superviseur Commercial'}
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: 'rgba(157, 78, 221, 0.2)',
                  color: '#C77DFF',
                  border: '1px solid rgba(157, 78, 221, 0.4)',
                }}>
                  Flotte IA
                </span>
              </div>
              <div className="page-sub" style={{ fontSize: '12.5px', color: '#8FA3B8', marginTop: '2px' }}>
                Supervisez, auditez et optimisez la coordination de votre flotte d&apos;agents commerciaux
              </div>
            </div>
          </div>
          <div className="page-actions">
            <Button onClick={onCancel}>← Retour Marketplace</Button>
          </div>
        </div>
      </div>

      {/* ── Scrollable Body Area ── */}
      <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>
        <div className="wizard-wrap" style={{ maxWidth: '880px', margin: '0 auto', paddingBottom: '60px' }}>
          
          {/* Steps Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: step === 1 ? '#00E5C8' : '#8FA3B8',
            }}>
              <span style={{
                width: 26, height: 26, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: step === 1 ? '#00E5C8' : (step > 1 ? 'rgba(0, 229, 200, 0.2)' : 'rgba(255, 255, 255, 0.08)'),
                color: step === 1 ? '#04101E' : (step > 1 ? '#00E5C8' : '#8FA3B8'),
                fontWeight: 700,
                fontSize: '12px',
              }}>
                {step > 1 ? <Check size={14} strokeWidth={3} /> : '1'}
              </span>
              <span>Configuration & Périmètre</span>
            </div>

            <div style={{ flex: 1, height: '2px', background: step > 1 ? '#00E5C8' : 'rgba(255, 255, 255, 0.08)', transition: 'background 0.3s' }} />

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: step === 2 ? '#00E5C8' : '#8FA3B8',
            }}>
              <span style={{
                width: 26, height: 26, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: step === 2 ? '#00E5C8' : 'rgba(255, 255, 255, 0.08)',
                color: step === 2 ? '#04101E' : '#8FA3B8',
                fontWeight: 700,
                fontSize: '12px',
              }}>
                2
              </span>
              <span>Confirmation & Déploiement</span>
            </div>
          </div>

          {/* ── STEP 1: CONFIGURATION & FLEET SELECTION ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {/* Identity Card */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(10, 25, 47, 0.7) 0%, rgba(6, 17, 31, 0.85) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '16px',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '15px',
                }}>
                  <Bot size={18} color="#00E5C8" />
                  <span>Identité du Superviseur</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#C8D6E5' }}>
                    Nom de l&apos;agent <span style={{ color: '#00E5C8' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => {
                      setAgentName(e.target.value);
                      if (nameError) setNameError(null);
                    }}
                    placeholder="Ex: Superviseur Commercial - Alpha"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: 'rgba(6, 17, 31, 0.8)',
                      border: `1.5px solid ${nameError ? '#FF4757' : 'rgba(255, 255, 255, 0.1)'}`,
                      color: '#FFFFFF',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => !nameError && (e.target.style.borderColor = '#00E5C8')}
                    onBlur={(e) => !nameError && (e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)')}
                  />
                  {nameError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#FF4757', fontSize: '12px', marginTop: '4px' }}>
                      <AlertCircle size={13} />
                      <span>{nameError}</span>
                    </div>
                  )}
                </div>

                {/* Mission Objective */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '18px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#C8D6E5' }}>
                    Objectif & Mission de Supervision
                  </label>
                  <textarea
                    rows={3}
                    value={agentMission}
                    onChange={(e) => setAgentMission(e.target.value)}
                    placeholder="Définissez les directives d'audit et la stratégie globale de la flotte..."
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: 'rgba(6, 17, 31, 0.8)',
                      border: '1.5px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      lineHeight: 1.5,
                      outline: 'none',
                      resize: 'vertical',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#00E5C8')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)')}
                  />
                </div>
              </div>

              {/* Scope / Fleet Selection Card */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(10, 25, 47, 0.7) 0%, rgba(6, 17, 31, 0.85) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Layers size={18} color="#00E5C8" />
                    <span style={{ color: '#FFFFFF', fontWeight: 600, fontSize: '15px' }}>
                      Agents Commerciaux sous Supervision
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#8FA3B8' }}>
                    Sélectionnez les agents que ce superviseur coordonnera
                  </div>
                </div>

                {/* Guidance Banner */}
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: 'rgba(0, 229, 200, 0.06)',
                  border: '1px solid rgba(0, 229, 200, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '18px',
                  fontSize: '12.5px',
                  color: '#C8D6E5',
                  lineHeight: 1.4,
                }}>
                  <Sparkles size={16} color="#00E5C8" style={{ flexShrink: 0 }} />
                  <span>
                    Le graphe de supervision et les métriques de conversion afficheront <strong>uniquement les agents cochés ci-dessous</strong>.
                  </span>
                </div>

                {/* Multi-Select Component */}
                <AgentMultiSelect
                  selectedAgentIds={supervisedAgentIds}
                  onChange={setSupervisedAgentIds}
                  availableAgents={availableAgents}
                  isLoading={loadingAgents}
                />
              </div>

              {/* Step 1 Actions */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '12px',
                paddingTop: '20px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <Button onClick={onCancel}>
                  Annuler
                </Button>

                <button
                  type="button"
                  onClick={handleProceedToConfirmation}
                  disabled={isCheckingName || !agentName.trim()}
                  style={{
                    padding: '12px 28px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #00E5C8 0%, #00B4D8 100%)',
                    border: 'none',
                    color: '#04101E',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: (isCheckingName || !agentName.trim()) ? 'not-allowed' : 'pointer',
                    opacity: (isCheckingName || !agentName.trim()) ? 0.6 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 0 20px rgba(0, 229, 200, 0.35)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span>Continuer vers la Confirmation</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: CONFIRMATION & EXECUTION CHOICE ── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {/* Overview Card */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(10, 25, 47, 0.7) 0%, rgba(6, 17, 31, 0.85) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '28px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '20px',
                }}>
                  <ShieldCheck size={22} color="#00E5C8" />
                  <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                    Récapitulatif de Déploiement
                  </h2>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '16px',
                  marginBottom: '24px',
                }}>
                  <div style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: 'rgba(6, 17, 31, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}>
                    <div style={{ fontSize: '11.5px', color: '#8FA3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Nom du Superviseur
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', marginTop: '4px' }}>
                      {agentName}
                    </div>
                  </div>

                  <div style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: 'rgba(6, 17, 31, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}>
                    <div style={{ fontSize: '11.5px', color: '#8FA3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Agents sous Supervision
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#00E5C8', marginTop: '4px' }}>
                      {supervisedAgentIds.length} agent(s) assigné(s)
                    </div>
                  </div>
                </div>

                {/* Supervised Agents List */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#C8D6E5', marginBottom: '10px' }}>
                    Flotte assignée à ce superviseur :
                  </div>
                  {selectedAgentObjects.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {selectedAgentObjects.map((agent: any) => (
                        <span
                          key={agent.uuid || agent.agent_id || agent.agent_name}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: 'rgba(0, 229, 200, 0.1)',
                            border: '1px solid rgba(0, 229, 200, 0.25)',
                            color: '#F0F4F8',
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
                  ) : (
                    <div style={{
                      fontSize: '12px',
                      color: '#FFB800',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'rgba(255, 184, 0, 0.08)',
                      border: '1px solid rgba(255, 184, 0, 0.2)',
                    }}>
                      Aucun agent sélectionné. Le superviseur sera déployé en mode autonome sans flotte rattachée.
                    </div>
                  )}
                </div>

                {agentMission && (
                  <div style={{
                    padding: '14px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    fontSize: '12.5px',
                    color: '#8FA3B8',
                    lineHeight: 1.5,
                  }}>
                    <strong style={{ color: '#C8D6E5' }}>Mission :</strong> {agentMission}
                  </div>
                )}
              </div>

              {/* Execution / Deployment Choice Card */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(12, 28, 48, 0.95) 0%, rgba(6, 17, 31, 0.98) 100%)',
                border: '1.5px solid rgba(0, 229, 200, 0.3)',
                borderRadius: '16px',
                padding: '28px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4), 0 0 25px rgba(0, 229, 200, 0.12)',
              }}>
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 6px 0' }}>
                    Modalité d&apos;Activation
                  </h3>
                  <p style={{ fontSize: '13px', color: '#8FA3B8', margin: 0, lineHeight: 1.4 }}>
                    Choisissez si vous souhaitez ouvrir immédiatement l&apos;espace de travail pour lancer un audit, ou simplement enregistrer le superviseur dans votre liste d&apos;agents.
                  </p>
                </div>

                {/* The Two Distinct Action Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                  {/* 1. Déployer & Lancer l'Audit */}
                  <button
                    type="button"
                    disabled={isDeploying}
                    onClick={() => handleExecuteDeployment('run_now')}
                    style={{
                      padding: '16px 20px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #00E5C8 0%, #00B4D8 100%)',
                      border: 'none',
                      color: '#04101E',
                      cursor: isDeploying ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      textAlign: 'left',
                      boxShadow: '0 4px 20px rgba(0, 229, 200, 0.35)',
                      transition: 'all 0.2s ease',
                      opacity: isDeploying ? 0.7 : 1,
                    }}
                    onMouseOver={(e) => {
                      if (!isDeploying) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 229, 200, 0.45)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isDeploying) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 229, 200, 0.35)';
                      }
                    }}
                  >
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'rgba(4, 16, 30, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Zap size={20} color="#04101E" strokeWidth={2.5} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#04101E' }}>
                        {isDeploying ? 'Déploiement en cours…' : 'Déployer & Ouvrir l’Espace'}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'rgba(4, 16, 30, 0.8)', marginTop: '2px', fontWeight: 500 }}>
                        Enregistre le superviseur et ouvre le cockpit de supervision
                      </div>
                    </div>
                  </button>

                  {/* 2. Déployer Uniquement */}
                  <button
                    type="button"
                    disabled={isDeploying}
                    onClick={() => handleExecuteDeployment('deploy_only')}
                    style={{
                      padding: '16px 20px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1.5px solid rgba(255, 255, 255, 0.15)',
                      color: '#F0F4F8',
                      cursor: isDeploying ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      opacity: isDeploying ? 0.7 : 1,
                    }}
                    onMouseOver={(e) => {
                      if (!isDeploying) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isDeploying) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                      }
                    }}
                  >
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Bot size={20} color="#00E5C8" />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>
                        {isDeploying ? 'Déploiement en cours…' : 'Déployer Uniquement'}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#8FA3B8', marginTop: '2px' }}>
                        Enregistre l’agent sans ouvrir l’espace
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Back Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <Button onClick={() => setStep(1)} disabled={isDeploying}>
                  <ArrowLeft size={14} style={{ marginRight: 6 }} />
                  Retour aux paramètres
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
