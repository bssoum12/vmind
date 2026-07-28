'use client';

import React, { useState } from 'react';
import { Button } from '@/shared/management/components/Button';
import { AGENT_TEMPLATES } from '@/shared/management/constants/data';
import { deployAgent } from '@/shared/api/n8n-api';

interface WizardViewProps {
  templateId: string;
  onCancel: () => void;
  agentToEdit?: any;
}

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

const ToggleCard = ({ 
  checked, 
  onChange, 
  title, 
  description,
  accentColor 
}: { 
  checked: boolean; 
  onChange: () => void; 
  title: string; 
  description?: string;
  accentColor: string;
}) => (
  <div 
    onClick={onChange}
    className="anim"
    style={{ 
      display: 'flex',
      alignItems: 'flex-start',
      gap: '16px',
      padding: '16px',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      backgroundColor: checked ? 'rgba(0, 229, 200, 0.05)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${checked ? accentColor + '80' : 'rgba(255,255,255,0.05)'}`,
      boxShadow: checked ? `0 0 15px ${accentColor}20` : 'none'
    }}
  >
    <div style={{ 
      flexShrink: 0,
      width: '22px', 
      height: '22px', 
      borderRadius: '6px', 
      border: `2px solid ${checked ? 'transparent' : 'rgba(255,255,255,0.3)'}`,
      backgroundColor: checked ? accentColor : 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: '2px',
      transition: 'all 0.2s ease'
    }}>
      {checked && (
        <svg style={{ width: '14px', height: '14px', color: '#000' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '14px', fontWeight: 'bold', color: checked ? '#fff' : '#d1d5db' }}>{title}</div>
      {description && <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px', lineHeight: '1.4' }}>{description}</div>}
    </div>
  </div>
);

export const WizardView: React.FC<WizardViewProps> = ({ templateId, onCancel }) => {
  const [step, setStep] = useState(1);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployed, setDeployed] = useState(false);
  const template = AGENT_TEMPLATES.find(t => t.id === templateId);
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();

  // Unified form state mapping exactly to the n8n JSON expectations
  const [formData, setFormData] = useState({
    agent_name: `${template?.name || 'Assistant'} - ${randomSuffix}`,
    run_mode: 'daily_recovery_check',
    workflow_timezone: 'Africa/Tunis',
    recovery_config: {
      tone: 'courteous',
      min_urgency: 'CRITIQUE_ONLY',
      instructions: 'Send emails to all overdue invoices except Barton Group. Add CC a.jebri@virtualdev.tn. Group by client.',
      thresholds: {
        minimum_amount: 500,
        currency: 'TND',
        days_before_first_reminder: 90,
        days_before_escalation: 7,
        max_reminders: 3
      },
      filters: {
        require_invoice_ref: true,
        require_email: true
      },
      channels: {
        email: true,
        whatsapp: true,
        sms: false,
        voice_call: false
      },
      permissions: {
        send_email: true,
        send_whatsapp: true,
        send_sms: false,
        make_voice_call: false,
        update_erp: true,
        escalate_to_human: true,
        generate_report: true,
        create_log: true
      },
      escalation_contact: {
        email: 'a.jebri@virtualdev.tn',
        phone: '+21623523939'
      }
    },
    // Multiple Trigger / scheduling configuration
    trigger_rules: [
      {
        interval: 'Days', // Seconds, Minutes, Hours, Days, Weeks, Months
        secondsBetween: 30,
        minutesBetween: 5,
        hoursBetween: 1,
        daysBetween: 1,
        weeksBetween: 1,
        monthsBetween: 1,
        triggerAtMinute: 0,
        triggerAtHour: '8am',
        triggerOnWeekdays: ['Sunday'],
        triggerAtDayOfMonth: 1
      }
    ] as TriggerRule[]
  });

  const hourOptions = [
    'Midnight', '1am', '2am', '3am', '4am', '5am', '6am', '7am', '8am', '9am', '10am', '11am',
    'Noon', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm', '9pm', '10pm', '11pm'
  ];

  const weekdayOptions = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];

  // Helper to handle nested configuration updates
  const updateThreshold = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      recovery_config: {
        ...prev.recovery_config,
        thresholds: {
          ...prev.recovery_config.thresholds,
          [key]: value
        }
      }
    }));
  };

  const updateChannel = (key: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      recovery_config: {
        ...prev.recovery_config,
        channels: {
          ...prev.recovery_config.channels,
          [key]: checked
        }
      }
    }));
  };

  const updatePermission = (key: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      recovery_config: {
        ...prev.recovery_config,
        permissions: {
          ...prev.recovery_config.permissions,
          [key]: checked
        }
      }
    }));
  };

  const updateFilter = (key: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      recovery_config: {
        ...prev.recovery_config,
        filters: {
          ...prev.recovery_config.filters,
          [key]: checked
        }
      }
    }));
  };

  const updateEscalationContact = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      recovery_config: {
        ...prev.recovery_config,
        escalation_contact: {
          ...prev.recovery_config.escalation_contact,
          [key]: value
        }
      }
    }));
  };

  const handleUrgencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    let days = 0;
    
    switch(value) {
      case 'CRITIQUE_ONLY': days = 90; break;
      case 'ELEVE_ONLY': days = 60; break;
      case 'MOYEN_ONLY': days = 30; break;
      case 'FAIBLE_ONLY': days = 0; break;
      case 'ELEVE_PLUS': days = 60; break;
      case 'MOYEN_PLUS': days = 30; break;
      case 'ALL': days = 0; break;
      default: days = 0;
    }

    setFormData(prev => ({
      ...prev,
      recovery_config: {
        ...prev.recovery_config,
        min_urgency: value,
        thresholds: {
          ...prev.recovery_config.thresholds,
          days_before_first_reminder: days
        }
      }
    }));
  };

  // Multiple Trigger Rules Handlers
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
          triggerOnWeekdays: ['Sunday'],
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

  const handleDeploy = async () => {
    setIsDeploying(true);
    
    // Generate a unique session ID following the structure: vrecov_YYYYMMDD_HHMMSS
    const now = new Date();
    const sessionId = `vrecov_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

    const completePayload = {
      ...formData,
      session_id: sessionId,
      action: 'deploy'
    };

    try {
      await deployAgent(completePayload);
      setDeployed(true);
      setTimeout(() => {
        onCancel();
      }, 4500);
    } catch (error: any) {
      console.error('Deployment error:', error);
      alert(`Erreur de déploiement: ${error.message}`);
    } finally {
      setIsDeploying(false);
    }
  };

  if (deployed) {
    return (
      <div id="view-wizard" className="anim flex items-center justify-center h-full">
        <div className="wcard text-center p-12 max-w-lg border-cyan-500/30 bg-cyan-950/10 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-pulse" />
          <div className="text-7xl mb-8 animate-bounce">🚀</div>
          <div className="text-3xl font-black text-cyan-400 mb-4 tracking-tighter">AGENT EN COURS DE DÉPLOIEMENT...</div>
          <p className="text-gray-300 mb-8 leading-relaxed">
            L'agent <strong>{formData.agent_name}</strong> est en cours d'activation.<br/>
            Le workflow n8n a été configuré avec les règles d'exécution et les seuils définis.
          </p>
          <div className="status-pill sp-running inline-flex items-center gap-2 px-6 py-3 text-sm font-bold bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 rounded-full">
            <span className="status-dot w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
            SYNCHRONISATION ACTIVED
          </div>
          <p className="text-[11px] text-gray-500 mt-12 font-mono uppercase tracking-widest">
            Redirection automatique vers le tableau de bord...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="view-wizard" className="anim">
      <div className="page-head">
        <div>
          <div className="page-title" id="wiz-title">
            Configuration: {template ? template.name : 'Nouvel Agent sur mesure'}
          </div>
          <div className="page-sub">Configurez votre employé virtuel en 4 étapes</div>
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
                <div className="wstep-label">Cibles & Seuils</div>
              </div>
            </div>
            <div className={`wstep ${step === 3 ? 'active' : step > 3 ? 'done' : ''}`}>
              <div className="wstep-inner">
                <div className="wstep-num">3</div>
                <div className="wstep-label">Message & Droits</div>
              </div>
            </div>
            <div className={`wstep ${step === 4 ? 'active' : step > 4 ? 'done' : ''}`}>
              <div className="wstep-inner">
                <div className="wstep-num">4</div>
                <div className="wstep-label">Planification</div>
              </div>
            </div>
          </div>

          {/* STEP 1: Identité */}
          {step === 1 && (
            <div id="step1" className="anim">
              <div className="wcard">
                <div className="wcard-title"><span className="dot" style={{ backgroundColor: template?.accent || '#FF4757' }}></span>Identité de l'Agent</div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Nom de l'agent <span className="req">*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.agent_name}
                      onChange={(e) => setFormData({ ...formData, agent_name: e.target.value })}
                      placeholder="Ex: Yasmine, Mohamed, Amira..."
                    />
                    <div className="form-hint">Ce nom sera affiché dans les communications envoyées aux clients</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ton de communication</label>
                    <select
                      className="form-input"
                      value={formData.recovery_config.tone}
                      onChange={(e) => setFormData({
                        ...formData,
                        recovery_config: { ...formData.recovery_config, tone: e.target.value }
                      })}
                    >
                      <option value="courteous">Professionnel et courtois</option>
                      <option value="firm">Ferme et direct</option>
                      <option value="strict">Formel strict</option>
                    </select>
                  </div>
                </div>



                <div className="form-row" style={{ marginTop: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Contact d'Escalade (Email)</label>
                    <input
                      type="email"
                      className="form-input"
                      value={formData.recovery_config.escalation_contact.email}
                      onChange={(e) => updateEscalationContact('email', e.target.value)}
                      placeholder="Ex: escalation@company.com"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact d'Escalade (Téléphone)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.recovery_config.escalation_contact.phone}
                      onChange={(e) => updateEscalationContact('phone', e.target.value)}
                      placeholder="Ex: +216..."
                    />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="primary" onClick={() => setStep(2)}>Seuils & Cibles →</Button>
              </div>
            </div>
          )}

          {/* STEP 2: Cibles */}
          {step === 2 && (
            <div id="step2" className="anim">
              <div className="wcard">
                <div className="wcard-title"><span className="dot" style={{ backgroundColor: template?.accent || '#FF4757' }}></span>Seuils & Cibles Financières</div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Montant Minimum Facture</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="number"
                        className="form-input"
                        style={{ flex: 2 }}
                        value={formData.recovery_config.thresholds.minimum_amount}
                        onChange={(e) => updateThreshold('minimum_amount', Number(e.target.value))}
                      />
                      <select
                        className="form-input"
                        style={{ flex: 1 }}
                        value={formData.recovery_config.thresholds.currency}
                        onChange={(e) => updateThreshold('currency', e.target.value)}
                      >
                        <option value="TND">TND</option>
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>
                    <div className="form-hint">L'agent ignorera les impayés inférieurs à ce montant</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Urgence Minimale Requise</label>
                    <select
                      className="form-input"
                      value={formData.recovery_config.min_urgency}
                      onChange={handleUrgencyChange}
                    >
                      <option value="CRITIQUE_ONLY">Critique uniquement (+90 jours)</option>
                      <option value="ELEVE_ONLY">Élevée uniquement (60 - 90 jours)</option>
                      <option value="MOYEN_ONLY">Moyenne uniquement (30 - 60 jours)</option>
                      <option value="FAIBLE_ONLY">Faible uniquement (0 - 30 jours)</option>
                      <option value="ELEVE_PLUS">Élevée et plus (+60 jours)</option>
                      <option value="MOYEN_PLUS">Moyenne et plus (+30 jours)</option>
                      <option value="ALL">Toutes les factures</option>
                    </select>
                  </div>
                </div>

                <div className="form-row" style={{ marginTop: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Délai avant Escalade (jours)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.recovery_config.thresholds.days_before_escalation}
                      onChange={(e) => updateThreshold('days_before_escalation', Number(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nombre Max de Relances</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.recovery_config.thresholds.max_reminders}
                      onChange={(e) => updateThreshold('max_reminders', Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button onClick={() => setStep(1)}>← Retour</Button>
                <Button variant="primary" onClick={() => setStep(3)}>Instructions & Droits →</Button>
              </div>
            </div>
          )}

          {/* STEP 3: Message & Permissions */}
          {step === 3 && (
            <div id="step3" className="anim">
              <div className="wcard">
                <div className="wcard-title"><span className="dot" style={{ backgroundColor: '#00e5c8' }}></span>Instructions Spécifiques de l'Agent</div>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">Consignes et Instructions de Recouvrement <span className="req">*</span></label>
                  <textarea
                    className="form-input"
                    style={{ minHeight: '100px', fontSize: '13px', lineHeight: '1.5' }}
                    value={formData.recovery_config.instructions}
                    onChange={(e) => setFormData({
                      ...formData,
                      recovery_config: { ...formData.recovery_config, instructions: e.target.value }
                    })}
                    placeholder="Saisissez des instructions précises pour guider l'IA lors des relances..."
                  />
                  <div className="form-hint">Exemple : "N'envoie pas de relance à Barton Group. Ajoute en CC a.jebri@virtualdev.tn."</div>
                </div>

                <div style={{ marginTop: '40px' }}>
                  <div className="wcard-title" style={{ marginBottom: '16px' }}>
                    <span className="dot" style={{ backgroundColor: '#00e5c8' }}></span>Canaux de Communication
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <ToggleCard 
                      checked={formData.recovery_config.channels.email}
                      onChange={() => updateChannel('email', !formData.recovery_config.channels.email)}
                      title="Courrier Électronique (Email)"
                      description="Envoi de relances formelles avec factures et extraits de compte en pièce jointe."
                      accentColor="#00e5c8"
                    />
                    <ToggleCard 
                      checked={formData.recovery_config.channels.whatsapp}
                      onChange={() => updateChannel('whatsapp', !formData.recovery_config.channels.whatsapp)}
                      title="WhatsApp Business"
                      description="Messages interactifs et rapides pour une meilleure réactivité du client."
                      accentColor="#00e5c8"
                    />
                  </div>
                </div>

                <div style={{ marginTop: '40px' }}>
                  <div className="wcard-title" style={{ marginBottom: '16px' }}>
                    <span className="dot" style={{ backgroundColor: '#00e5c8' }}></span>Droits et Habilitations (Mode Autonome)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <ToggleCard 
                      checked={formData.recovery_config.permissions.update_erp}
                      onChange={() => updatePermission('update_erp', !formData.recovery_config.permissions.update_erp)}
                      title="Mise à jour ERP Automatique"
                      description="Autorise l'agent à modifier les statuts des factures et enregistrer les promesses de paiement directement dans votre système comptable."
                      accentColor="#00e5c8"
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <ToggleCard 
                        checked={formData.recovery_config.permissions.generate_report}
                        onChange={() => updatePermission('generate_report', !formData.recovery_config.permissions.generate_report)}
                        title="Rapports d'Activité"
                        description="Synthèse et envoi d'un rapport global au responsable d'escalade."
                        accentColor="#00e5c8"
                      />
                      <ToggleCard 
                        checked={formData.recovery_config.permissions.create_log}
                        onChange={() => updatePermission('create_log', !formData.recovery_config.permissions.create_log)}
                        title="Traçabilité et Logs (DB)"
                        description="Enregistrement structuré de chaque tentative de contact pour des raisons légales."
                        accentColor="#00e5c8"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button onClick={() => setStep(2)}>← Retour</Button>
                <Button variant="primary" onClick={() => setStep(4)}>Planification & Fréquence →</Button>
              </div>
            </div>
          )}

          {/* STEP 4: Planification */}
          {step === 4 && (
            <div id="step4" className="anim">
              <div className="wcard">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div className="wcard-title" style={{ margin: 0 }}>
                    <span className="dot" style={{ backgroundColor: template?.accent || '#FF4757' }}></span>
                    Règles de Déclenchement (Trigger Rules n8n)
                  </div>
                  <button
                    type="button"
                    onClick={addTriggerRule}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'rgba(0, 229, 200, 0.1)',
                      border: '1px solid rgba(0, 229, 200, 0.3)',
                      borderRadius: '6px',
                      color: '#00e5c8',
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

                {formData.trigger_rules.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#b2bec3', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    Aucune règle de déclenchement définie. L'agent ne s'exécutera pas automatiquement.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {formData.trigger_rules.map((rule, index) => (
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
                        {/* Header block within rule card */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'rgba(255,255,255,0.7)' }}>
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
                              opacity: 0.8,
                              transition: 'opacity 0.2s'
                            }}
                            title="Supprimer la règle"
                          >
                            🗑️
                          </button>
                        </div>

                        {/* Fields inside card */}
                        <div className="form-row">
                          <div className="form-group" style={{ flex: '1 1 100%' }}>
                            <label className="form-label" style={{ fontWeight: 'bold' }}>Trigger Interval</label>
                            <select
                              className="form-input"
                              value={rule.interval}
                              onChange={(e) => updateTriggerRuleAtIndex(index, 'interval', e.target.value)}
                            >
                              <option value="Seconds">Seconds</option>
                              <option value="Minutes">Minutes</option>
                              <option value="Hours">Hours</option>
                              <option value="Days">Days</option>
                              <option value="Weeks">Weeks</option>
                              <option value="Months">Months</option>
                            </select>
                          </div>
                        </div>

                        {/* DYNAMIC SUBFIELDS BY RULE TYPE */}
                        <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                          
                          {/* SECONDS */}
                          {rule.interval === 'Seconds' && (
                            <div className="form-group anim">
                              <label className="form-label">Seconds Between Triggers (1 - 59)</label>
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
                              <label className="form-label">Minutes Between Triggers (1 - 59)</label>
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
                                <label className="form-label">Hours Between Triggers (1 - 23)</label>
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
                                <label className="form-label">Trigger at Minute</label>
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
                                <label className="form-label">Days Between Triggers (1 - 31)</label>
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
                                <label className="form-label">Trigger at Hour</label>
                                <select
                                  className="form-input"
                                  value={rule.triggerAtHour}
                                  onChange={(e) => updateTriggerRuleAtIndex(index, 'triggerAtHour', e.target.value)}
                                >
                                  {hourOptions.map(h => (
                                    <option key={h} value={h}>{h}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="form-group">
                                <label className="form-label">Trigger at Minute</label>
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
                                  <label className="form-label">Weeks Between Triggers</label>
                                  <input
                                    type="number"
                                    className="form-input"
                                    min="1"
                                    value={rule.weeksBetween}
                                    onChange={(e) => updateTriggerRuleAtIndex(index, 'weeksBetween', Number(e.target.value))}
                                  />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                  <label className="form-label">Trigger at Hour</label>
                                  <select
                                    className="form-input"
                                    value={rule.triggerAtHour}
                                    onChange={(e) => updateTriggerRuleAtIndex(index, 'triggerAtHour', e.target.value)}
                                  >
                                    {hourOptions.map(h => (
                                      <option key={h} value={h}>{h}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                  <label className="form-label">Trigger at Minute</label>
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
                              <div className="form-group" style={{ marginTop: '10px' }}>
                                <label className="form-label">Trigger on Weekdays</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                                  {weekdayOptions.map(day => {
                                    const isSelected = rule.triggerOnWeekdays.includes(day);
                                    return (
                                      <button
                                        key={day}
                                        type="button"
                                        onClick={() => toggleWeekdayAtIndex(index, day)}
                                        style={{
                                          padding: '6px 12px',
                                          borderRadius: '20px',
                                          fontSize: '11px',
                                          fontWeight: 'bold',
                                          cursor: 'pointer',
                                          backgroundColor: isSelected ? (template?.accent || '#FF4757') : 'rgba(255,255,255,0.06)',
                                          color: isSelected ? 'white' : '#b2bec3',
                                          border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                          transition: 'all 0.2s ease'
                                        }}
                                      >
                                        {day}
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
                                  <label className="form-label">Months Between Triggers</label>
                                  <input
                                    type="number"
                                    className="form-input"
                                    min="1"
                                    value={rule.monthsBetween}
                                    onChange={(e) => updateTriggerRuleAtIndex(index, 'monthsBetween', Number(e.target.value))}
                                  />
                                </div>
                                <div className="form-group">
                                  <label className="form-label">Trigger at Day of Month (1 - 31)</label>
                                  <input
                                    type="number"
                                    className="form-input"
                                    min="1"
                                    max="31"
                                    value={rule.triggerAtDayOfMonth}
                                    onChange={(e) => updateTriggerRuleAtIndex(index, 'triggerAtDayOfMonth', Number(e.target.value))}
                                  />
                                  <div className="form-hint" style={{ fontSize: '9px', color: '#ff7675' }}>
                                    Remarque: Si le mois n'a pas ce jour, le déclenchement n'aura pas lieu.
                                  </div>
                                </div>
                              </div>
                              <div className="form-row" style={{ marginTop: '10px' }}>
                                <div className="form-group">
                                  <label className="form-label">Trigger at Hour</label>
                                  <select
                                    className="form-input"
                                    value={rule.triggerAtHour}
                                    onChange={(e) => updateTriggerRuleAtIndex(index, 'triggerAtHour', e.target.value)}
                                  >
                                    {hourOptions.map(h => (
                                      <option key={h} value={h}>{h}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="form-group">
                                  <label className="form-label">Trigger at Minute</label>
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

                <div className="info-box" style={{ marginTop: '15px' }}>
                  ⚡ En cliquant sur déployer, l'agent de recouvrement commencera à s'exécuter sur n8n selon la planification configurée.
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <Button onClick={() => setStep(3)}>← Précédent</Button>
                <Button
                  variant="primary"
                  onClick={handleDeploy}
                  disabled={isDeploying}
                >
                  {isDeploying ? 'Déploiement en cours...' : '⚡ DÉPLOYER L\'AGENT'}
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
