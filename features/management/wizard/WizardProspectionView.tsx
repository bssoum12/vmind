'use client';


import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/shared/management/components/Button';
import { AGENT_TEMPLATES } from '@/shared/management/constants/data';
import { VMindGuide, GuideMood } from '@/shared/management/components/VMindGuide';
import { OnboardingChat } from './components/OnboardingChat';

interface WizardViewProps {
  templateId: string;
  onCancel: () => void;
  agentToEdit?: any;
  initialStep?: number;
}

const VIRTUAL_MIND_GUIDE: Record<string, { title: string; text: string }> = {
  agent_mission: { title: "Mission de l'Agent", text: "Définissez ce que l'agent doit accomplir. Soyez clair sur le produit/service à promouvoir et les objectifs." },
  secteur_activite: { title: "Secteur d'Activité", text: "Ciblez précisément les secteurs pertinents. VMind analysera le site web du prospect pour vérifier s'il correspond à cette liste." },
  taille_entreprise: { title: "Taille de l'Entreprise", text: "Filtrez par effectif. Les TPE/PME réagissent différemment des Grands Comptes." },
  poste_contact: { title: "Cible Décisionnaire", text: "Qui souhaitez-vous contacter ? VMind identifiera la personne la plus proche de ce poste (CEO, DAF, CTO...)." },
  zone_geo: { title: "Zone Géographique", text: "Où se situent vos prospects idéaux ? L'agent adaptera sa recherche et la langue de contact en conséquence." },
  seuil_qualification: { title: "Seuil de Qualification", text: "Le score minimal sur 100 requis pour qu'un lead soit considéré comme qualifié et contacté automatiquement par l'agent." },
  ponderations: { title: "Pondérations ICP", text: "Répartissez l'importance (sur 100) entre le secteur, la taille, le poste et le pays. Cela dicte la formule de scoring IA." },
  signature_email: { title: "Signature d'Email", text: "Cette signature sera insérée automatiquement à la fin de tous les emails générés par VMind. Soyez professionnel !" },
  default_cc: { title: "Copie Conforme (CC)", text: "Ajoutez votre adresse email ou celle d'un manager pour recevoir une copie des emails envoyés aux prospects." },
  email_limits: { title: "Cadence d'Envoi", text: "Configurez le délai entre chaque email pour éviter d'être marqué comme spam. Les limites journalières protègent la réputation de votre domaine." },
  trigger_rules: { title: "Planification Autonome", text: "Définissez quand votre agent doit s'activer de manière autonome (ex: tous les lundis à 8h). N8N gère cette orchestration." }
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

function TagInput({
  tags,
  onChange,
  placeholder,
  suggestions,
  onFocus,
  onBlur
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
  suggestions: string[];
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = suggestions.filter(
    (s) => s.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(s)
  );

  const addTag = (tag: string) => {
    if (tag.trim() && !tags.includes(tag.trim())) {
      onChange([...tags, tag.trim()]);
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove));
  };

  return (
    <div className="tag-input-container" style={{ position: 'relative' }}>
      <div
        className="tag-input-box"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          padding: '0.5rem',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          backgroundColor: 'rgba(255,255,255,0.02)',
          minHeight: '42px',
          alignItems: 'center'
        }}
      >
        {tags.map((tag, idx) => (
          <span
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              backgroundColor: 'rgba(0,0,0,0.3)',
              border: '1px solid var(--border)',
              padding: '0.2rem 0.5rem',
              borderRadius: '20px',
              fontSize: '0.85rem'
            }}
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem', padding: '0 0.25rem', lineHeight: 1 }}
            >
              &times;
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={(e) => {
            setShowSuggestions(true);
            if (onFocus) onFocus();
          }}
          onBlur={(e) => {
            setTimeout(() => {
              if (inputValue.trim()) {
                addTag(inputValue);
              }
              if (onBlur) onBlur();
              setShowSuggestions(false);
            }, 200);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag(inputValue);
            } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
              removeTag(tags[tags.length - 1]);
            }
          }}
          placeholder={tags.length === 0 ? placeholder : ''}
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            flex: 1,
            minWidth: '120px',
            color: '#fff',
            fontSize: '0.9rem'
          }}
        />
      </div>
      {showSuggestions && inputValue && filteredSuggestions.length > 0 && (
        <ul
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: '#0a101d',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
            maxHeight: '150px',
            overflowY: 'auto',
            zIndex: 9999,
            listStyle: 'none',
            padding: 0,
            margin: '0.25rem 0 0 0',
            opacity: 1
          }}
        >
          {filteredSuggestions.map((s, idx) => (
            <li
              key={idx}
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(s);
              }}
              style={{
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                borderBottom: '1px solid var(--border)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const WizardProspectionView: React.FC<WizardViewProps> = ({ templateId, onCancel, agentToEdit, initialStep }) => {
  const [step, setStep] = useState(initialStep || 1);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [showStep2Guide, setShowStep2Guide] = useState(false);
  const step2GuideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerStep2Guide = () => {
    setShowStep2Guide(true);
    if (step2GuideTimeoutRef.current) {
      clearTimeout(step2GuideTimeoutRef.current);
    }
    step2GuideTimeoutRef.current = setTimeout(() => {
      setShowStep2Guide(false);
    }, 10000);
  };

  useEffect(() => {
    if (step === 2) {
      triggerStep2Guide();
    } else {
      setShowStep2Guide(false);
      if (step2GuideTimeoutRef.current) {
        clearTimeout(step2GuideTimeoutRef.current);
      }
    }
  }, [step]);


  const getMoodForField = (field: string | null): GuideMood => {
    if (!field) return 'curious';
    const convincedFields = ['seuil_qualification', 'ponderations'];
    if (convincedFields.includes(field)) return 'convinced';
    return 'focused';
  };
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployed, setDeployed] = useState(false);
  const template = AGENT_TEMPLATES.find(t => t.id === templateId);

  interface ProspectFormData {
    agent_name: string;
    run_mode: string;
    workflow_timezone: string;
    prospection_config: {
      agent_mission: string;
      icp: {
        secteur_activite: string[];
        taille_min: number;
        taille_max: number;
        poste_contact: string[];
        zone_geo: string[];
        seuil_qualification: number;
        poids_secteur: number;
        poids_taille: number;
        poids_poste: number;
        poids_pays: number;
      };
      campaign: {
        signature_email: string;
        default_cc: string;
        delai_envois: number;
        email_recap: string;
      };
    };
    trigger_rules: TriggerRule[];
  }

  const [formData, setFormData] = useState<ProspectFormData>(() => {
    if (agentToEdit && agentToEdit.config) {
      const cfg = agentToEdit.config;
      return {
        agent_name: agentToEdit.agent_name || 'Agent de Prospection',
        run_mode: agentToEdit.run_mode || 'prospection',
        workflow_timezone: agentToEdit.workflow_timezone || 'Africa/Tunis',
        prospection_config: {
          agent_mission: cfg.agent_mission || '',
          icp: {
            secteur_activite: cfg.icp?.secteur_activite || [],
            taille_min: cfg.icp?.taille_min ?? 50,
            taille_max: cfg.icp?.taille_max ?? 500,
            poste_contact: cfg.icp?.poste_contact || [],
            zone_geo: cfg.icp?.zone_geo || [],
            seuil_qualification: cfg.seuil_qualification ?? 70,
            poids_secteur: cfg.icp?.poids_secteur ?? 25,
            poids_taille: cfg.icp?.poids_taille ?? 25,
            poids_poste: cfg.icp?.poids_poste ?? 25,
            poids_pays: cfg.icp?.poids_pays ?? 25
          },
          campaign: {
            signature_email: cfg.signature_email || '',
            default_cc: cfg.default_cc || '',
            delai_envois: cfg.delai_envois ?? 30,
            email_recap: cfg.email_recap || ''
          }
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

    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const defaultName = template?.name || 'Agent de Prospection';

    return {
      agent_name: `${defaultName} - ${randomSuffix}`,
      run_mode: 'prospection',
      workflow_timezone: 'Africa/Tunis',
      prospection_config: {
        agent_mission: '',
        icp: {
          secteur_activite: [] as string[],
          taille_min: 50,
          taille_max: 500,
          poste_contact: [] as string[],
          zone_geo: [] as string[],
          seuil_qualification: 70,
          poids_secteur: 25,
          poids_taille: 25,
          poids_poste: 25,
          poids_pays: 25
        },
        campaign: {
          signature_email: '',
          default_cc: '',
          delai_envois: 30,
          email_recap: ''
        }
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

  const hourOptions = [
    'Midnight', '1am', '2am', '3am', '4am', '5am', '6am', '7am', '8am', '9am', '10am', '11am',
    'Noon', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm', '9pm', '10pm', '11pm'
  ];

  const weekdayOptions = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];

  const updateIcp = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      prospection_config: {
        ...prev.prospection_config,
        icp: {
          ...prev.prospection_config.icp,
          [key]: value
        }
      }
    }));
  };

  const updateCampaign = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      prospection_config: {
        ...prev.prospection_config,
        campaign: {
          ...prev.prospection_config.campaign,
          [key]: value
        }
      }
    }));
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
        alert("Veuillez saisir un nom pour l'agent.");
        return;
      }
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://localhost:3001";
        const endpoint = `${baseUrl}/api/prospect-agent/check-name/${encodeURIComponent(formData.agent_name)}` + (agentToEdit ? `?excludeUuid=${agentToEdit.agent_id}` : '');
        
        const token = localStorage.getItem('vmind_session');
        const res = await fetch(endpoint, {
          headers: { ...(token && { 'Authorization': `Bearer ${token}` }) }
        });

        if (!res.ok) {
          throw new Error("Erreur serveur lors de la vérification du nom.");
        }
        
        const data = await res.json();
        if (!data.available) {
          alert("Un agent avec ce nom existe déjà. Veuillez choisir un autre nom.");
          return;
        }
      } catch (err) {
        console.error("Failed to check agent name", err);
        alert("Impossible de vérifier la disponibilité du nom de l'agent. Veuillez réessayer.");
        return;
      }
    }

    if (step === 3 && nextStep === 4) {
      const sum = formData.prospection_config.icp.poids_secteur +
        formData.prospection_config.icp.poids_taille +
        formData.prospection_config.icp.poids_poste +
        formData.prospection_config.icp.poids_pays;
      if (sum !== 100) {
        alert(`La somme des pondérations de score ICP doit être exactement de 100 (actuellement: ${sum}).`);
        return;
      }
    }
    setStep(nextStep);
  };

  const handleDeploy = async () => {
    // Check name availability before deploying
    if (!formData.agent_name.trim()) {
      alert("Veuillez saisir un nom pour l'agent.");
      if (step !== 1) setStep(1);
      return;
    }
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://localhost:3001";
      const endpoint = `${baseUrl}/api/prospect-agent/check-name/${encodeURIComponent(formData.agent_name)}` + (agentToEdit ? `?excludeUuid=${agentToEdit.agent_id}` : '');
      
      const token = localStorage.getItem('vmind_session');
      const res = await fetch(endpoint, {
        headers: { ...(token && { 'Authorization': `Bearer ${token}` }) }
      });

      if (!res.ok) {
        throw new Error("Erreur serveur lors de la vérification du nom.");
      }
      
      const data = await res.json();
      if (!data.available) {
        alert("Un agent avec ce nom existe déjà. Veuillez choisir un autre nom.");
        if (step !== 1) setStep(1);
        return;
      }
    } catch (err) {
      console.error("Failed to check agent name", err);
      alert("Impossible de vérifier la disponibilité du nom de l'agent. Veuillez réessayer.");
      return;
    }

    setIsDeploying(true);

    const now = new Date();
    const sessionId = `vprosp_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

    const completePayload = {
      ...formData,
      session_id: sessionId,
      action: agentToEdit ? 'update' : 'deploy'
    };

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://localhost:3001";
      const token = localStorage.getItem('vmind_session');

      const endpoint = agentToEdit
        ? `${baseUrl}/api/prospect-agent/update/${agentToEdit.agent_id}`
        : `${baseUrl}/api/prospect-agent/deploy`;

      const response = await fetch(endpoint, {
        method: agentToEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(completePayload)
      });

      if (!response.ok) {
        throw new Error(`Failed to ${agentToEdit ? 'update' : 'deploy'} agent: ${response.statusText}`);
      }

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
        <div className="wcard text-center p-12 max-w-lg border-pink-500/30 bg-pink-950/10 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-pink-500 to-transparent animate-pulse" />
          <div className="text-7xl mb-8 animate-bounce">🚀</div>
          <div className="text-3xl font-black text-pink-400 mb-4 tracking-tighter">AGENT EN COURS DE DÉPLOIEMENT...</div>
          <p className="text-gray-300 mb-8 leading-relaxed">
            L'agent <strong>{formData.agent_name}</strong> est en cours d'activation.<br />
            Le workflow n8n a été configuré avec les règles d'exécution et les seuils définis.
          </p>
          <div className="status-pill sp-running inline-flex items-center gap-2 px-6 py-3 text-sm font-bold bg-pink-950/40 border border-pink-500/30 text-pink-400 rounded-full">
            <span className="status-dot w-2 h-2 bg-pink-400 rounded-full animate-ping" />
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
          <div className="page-sub">Configurez votre agent de prospection en 4 étapes</div>
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
                <div className="wstep-label">Briefing</div>
              </div>
            </div>
            <div className={`wstep ${step === 3 ? 'active' : step > 3 ? 'done' : ''}`}>
              <div className="wstep-inner">
                <div className="wstep-num">3</div>
                <div className="wstep-label">ICP</div>
              </div>
            </div>
            <div className={`wstep ${step === 4 ? 'active' : step > 4 ? 'done' : ''}`}>
              <div className="wstep-inner">
                <div className="wstep-num">4</div>
                <div className="wstep-label">Campagne</div>
              </div>
            </div>
            <div className={`wstep ${step === 5 ? 'active' : step > 5 ? 'done' : ''}`}>
              <div className="wstep-inner">
                <div className="wstep-num">5</div>
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
                      value={formData.agent_name} onFocus={() => setFocusedField('agent_name')} onBlur={() => setFocusedField(null)}
                      onChange={(e) => setFormData({ ...formData, agent_name: e.target.value })}
                      placeholder="Ex: Yasmine, Mohamed, Amira..."
                    />
                    <div className="form-hint">Ce nom sera affiché en interne pour identifier l'agent.</div>
                  </div>
                </div>


              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="primary" onClick={() => validateAndNext(2)}>Briefing & Objectifs →</Button>
              </div>
            </div>
          )}


          {/* STEP 2: Briefing & Objectifs */}
          {step === 2 && (
            <div id="step2" className="anim">
              <div className="wcard">
                <div className="wcard-title">
                  <span className="dot" style={{ backgroundColor: template?.accent || '#FF4757' }}></span>
                  Briefing de l'Agent
                  <span
                    onClick={triggerStep2Guide}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      color: '#aaa',
                      fontSize: '12px',
                      marginLeft: '10px',
                      cursor: 'pointer'
                    }}
                    title="Aide"
                  >?</span>
                </div>
                <p style={{ color: 'var(--text)', marginBottom: '1rem', fontSize: '0.95rem' }}>Discutez avec VMind pour définir la mission de l'agent. Il vous posera quelques questions pour comprendre votre offre et vos objectifs.</p>
                <OnboardingChat
                  initialMission={formData.prospection_config.agent_mission}
                  onConfirm={(mission) => {
                    setFormData(prev => ({
                      ...prev,
                      prospection_config: { ...prev.prospection_config, agent_mission: mission }
                    }));
                    validateAndNext(3);
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                <Button variant="secondary" onClick={() => validateAndNext(1)}>← Retour</Button>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Button variant="secondary" onClick={() => setStep(3)}>Passer (Ignorer)</Button>
                  {formData.prospection_config.agent_mission && (
                    <Button variant="primary" onClick={() => validateAndNext(3)}>Profil Client (ICP) →</Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Cibles ICP */}

          {step === 3 && (
            <div id="step3" className="anim">
              <div className="wcard">
                <div className="wcard-title"><span className="dot" style={{ backgroundColor: template?.accent || '#FF4757' }}></span>Critères ICP (Valeurs Cibles)</div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Secteur d'activité</label>
                    <TagInput
                      tags={formData.prospection_config.icp.secteur_activite}
                      onChange={(t) => updateIcp('secteur_activite', t)} onFocus={() => setFocusedField('secteur_activite')} onBlur={() => setFocusedField(null)}
                      placeholder="Ajouter un secteur..."
                      suggestions={['Transport', 'Logistique', 'Industrie', 'Commerce', 'BTP', 'Santé', 'IT', 'Finance', 'E-commerce', 'Energie', 'Services']}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Taille de l'entreprise (Min - Max)</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="number"
                        className="form-input"
                        style={{ flex: 1 }}
                        value={formData.prospection_config.icp.taille_min} onFocus={() => setFocusedField('taille_entreprise')} onBlur={() => setFocusedField(null)}
                        onChange={(e) => updateIcp('taille_min', Number(e.target.value))}
                      />
                      <input
                        type="number"
                        className="form-input"
                        style={{ flex: 1 }}
                        value={formData.prospection_config.icp.taille_max} onFocus={() => setFocusedField('taille_entreprise')} onBlur={() => setFocusedField(null)}
                        onChange={(e) => updateIcp('taille_max', Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-row" style={{ marginTop: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Poste du contact</label>
                    <TagInput
                      tags={formData.prospection_config.icp.poste_contact}
                      onChange={(t) => updateIcp('poste_contact', t)} onFocus={() => setFocusedField('poste_contact')} onBlur={() => setFocusedField(null)}
                      placeholder="Ajouter un poste..."
                      suggestions={['DAF', 'DSI', 'Directeur Ops', 'DG', 'PDG', 'Responsable Logistique', 'Directeur Commercial', 'CEO', 'CTO', 'Directeur Marketing', 'Responsable Achats']}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Zone géographique</label>
                    <TagInput
                      tags={formData.prospection_config.icp.zone_geo}
                      onChange={(t) => updateIcp('zone_geo', t)} onFocus={() => setFocusedField('zone_geo')} onBlur={() => setFocusedField(null)}
                      placeholder="Ajouter un pays..."
                      suggestions={['Tunisie', 'Maroc', 'Belgique', 'France', 'Suisse', 'Canada', 'Sénégal', 'Côte d\'Ivoire', 'Algérie', 'Monaco', 'Luxembourg']}
                    />
                  </div>
                </div>
              </div>

              <div className="wcard" style={{ marginTop: '20px' }}>
                <div className="wcard-title"><span className="dot" style={{ backgroundColor: template?.accent || '#FF4757' }}></span>Pondérations ICP (Total = 100)</div>
                <div className="form-group">
                  <label className="form-label">Seuil de Qualification de Lead ({formData.prospection_config.icp.seuil_qualification} pts)</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    style={{ width: '100%', marginBottom: '10px' }}
                    value={formData.prospection_config.icp.seuil_qualification} onFocus={() => setFocusedField('seuil_qualification')} onBlur={() => setFocusedField(null)}
                    onChange={(e) => updateIcp('seuil_qualification', parseInt(e.target.value))}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Secteur (pts)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.prospection_config.icp.poids_secteur} onFocus={() => setFocusedField('ponderations')} onBlur={() => setFocusedField(null)}
                      onChange={(e) => updateIcp('poids_secteur', Number(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Taille (pts)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.prospection_config.icp.poids_taille} onFocus={() => setFocusedField('ponderations')} onBlur={() => setFocusedField(null)}
                      onChange={(e) => updateIcp('poids_taille', Number(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Poste (pts)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.prospection_config.icp.poids_poste} onFocus={() => setFocusedField('ponderations')} onBlur={() => setFocusedField(null)}
                      onChange={(e) => updateIcp('poids_poste', Number(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Zone Geo (pts)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.prospection_config.icp.poids_pays} onFocus={() => setFocusedField('ponderations')} onBlur={() => setFocusedField(null)}
                      onChange={(e) => updateIcp('poids_pays', Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                <Button onClick={() => validateAndNext(2)}>← Retour</Button>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Button variant="secondary" onClick={() => setStep(4)}>Passer (Ignorer)</Button>
                  <Button variant="primary" onClick={() => validateAndNext(4)}>Campagne & Limites →</Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Campagne & Limites */}
          {step === 4 && (
            <div id="step4" className="anim">
              <div className="wcard">
                <div className="wcard-title"><span className="dot" style={{ backgroundColor: template?.accent || '#00e5c8' }}></span>Signature & Copie Conforme</div>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">Signature de l'Email <span className="req">*</span></label>
                  <textarea
                    className="form-input"
                    style={{ minHeight: '100px', fontSize: '13px', lineHeight: '1.5' }}
                    value={formData.prospection_config.campaign.signature_email} onFocus={() => setFocusedField('signature_email')} onBlur={() => setFocusedField(null)}
                    onChange={(e) => updateCampaign('signature_email', e.target.value)}
                    placeholder="Cordialement,&#10;L'équipe Commerciale..."
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">Copie conforme (CC) par défaut</label>
                  <TagInput
                    tags={formData.prospection_config.campaign.default_cc ? formData.prospection_config.campaign.default_cc.split(/[,;]+/).map(s => s.trim()).filter(Boolean) : []}
                    onChange={(tags) => updateCampaign('default_cc', tags.join(','))} onFocus={() => setFocusedField('default_cc')} onBlur={() => setFocusedField(null)}
                    placeholder="Ajouter une adresse email..."
                    suggestions={[]}
                  />
                </div>
              </div>

              <div className="wcard" style={{ marginTop: '20px' }}>
                <div className="wcard-title"><span className="dot" style={{ backgroundColor: template?.accent || '#00e5c8' }}></span>Règles d'Envoi</div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Délai min entre envois (s)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.prospection_config.campaign.delai_envois} onFocus={() => setFocusedField('email_limits')} onBlur={() => setFocusedField(null)}
                      onChange={(e) => updateCampaign('delai_envois', Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '10px' }}>
                  <label className="form-label">Email de récapitulatif quotidien</label>
                  <TagInput
                    tags={formData.prospection_config.campaign.email_recap ? formData.prospection_config.campaign.email_recap.split(',').map(s => s.trim()).filter(Boolean) : []}
                    onChange={(tags) => updateCampaign('email_recap', tags.join(','))} onFocus={() => setFocusedField('email_limits')} onBlur={() => setFocusedField(null)}
                    placeholder="Ajouter une adresse email..."
                    suggestions={[]}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                <Button onClick={() => validateAndNext(3)}>← Retour</Button>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Button variant="secondary" onClick={() => setStep(5)}>Passer (Ignorer)</Button>
                  <Button variant="primary" onClick={() => validateAndNext(5)}>Planification →</Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Planification */}
          {step === 5 && (
            <div id="step5" className="anim">
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
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '6px',
                      color: '#fff',
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

                        <div className="form-row">
                          <div className="form-group" style={{ flex: '1 1 100%' }}>
                            <label className="form-label" style={{ fontWeight: 'bold' }}>Trigger Interval</label>
                            <select
                              className="form-input"
                              value={rule.interval} onFocus={() => setFocusedField('trigger_rules')} onBlur={() => setFocusedField(null)}
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

                        <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>

                          {rule.interval === 'Seconds' && (
                            <div className="form-group anim">
                              <label className="form-label">Seconds Between Triggers (1 - 59)</label>
                              <input
                                type="number"
                                className="form-input"
                                min="1"
                                max="59"
                                value={rule.secondsBetween} onFocus={() => setFocusedField('trigger_rules')} onBlur={() => setFocusedField(null)}
                                onChange={(e) => updateTriggerRuleAtIndex(index, 'secondsBetween', Number(e.target.value))}
                              />
                            </div>
                          )}

                          {rule.interval === 'Minutes' && (
                            <div className="form-group anim">
                              <label className="form-label">Minutes Between Triggers (1 - 59)</label>
                              <input
                                type="number"
                                className="form-input"
                                min="1"
                                max="59"
                                value={rule.minutesBetween} onFocus={() => setFocusedField('trigger_rules')} onBlur={() => setFocusedField(null)}
                                onChange={(e) => updateTriggerRuleAtIndex(index, 'minutesBetween', Number(e.target.value))}
                              />
                            </div>
                          )}

                          {rule.interval === 'Hours' && (
                            <div className="form-row anim">
                              <div className="form-group">
                                <label className="form-label">Hours Between Triggers (1 - 23)</label>
                                <input
                                  type="number"
                                  className="form-input"
                                  min="1"
                                  max="23"
                                  value={rule.hoursBetween} onFocus={() => setFocusedField('trigger_rules')} onBlur={() => setFocusedField(null)}
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
                                  value={rule.triggerAtMinute} onFocus={() => setFocusedField('trigger_rules')} onBlur={() => setFocusedField(null)}
                                  onChange={(e) => updateTriggerRuleAtIndex(index, 'triggerAtMinute', Number(e.target.value))}
                                />
                              </div>
                            </div>
                          )}

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
                                  value={rule.triggerAtMinute} onFocus={() => setFocusedField('trigger_rules')} onBlur={() => setFocusedField(null)}
                                  onChange={(e) => updateTriggerRuleAtIndex(index, 'triggerAtMinute', Number(e.target.value))}
                                />
                              </div>
                            </div>
                          )}

                          {rule.interval === 'Weeks' && (
                            <div className="form-row anim">
                              <div className="form-group">
                                <label className="form-label">Weeks Between Triggers (1 - 52)</label>
                                <input
                                  type="number"
                                  className="form-input"
                                  min="1"
                                  max="52"
                                  value={rule.weeksBetween}
                                  onChange={(e) => updateTriggerRuleAtIndex(index, 'weeksBetween', Number(e.target.value))}
                                />
                              </div>
                              <div className="form-group" style={{ flex: '2 1 100%' }}>
                                <label className="form-label">Trigger on Weekdays</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  {weekdayOptions.map(day => (
                                    <div
                                      key={day}
                                      onClick={() => toggleWeekdayAtIndex(index, day)}
                                      style={{
                                        padding: '6px 12px',
                                        borderRadius: '4px',
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
                            <div className="form-row anim">
                              <div className="form-group">
                                <label className="form-label">Months Between Triggers (1 - 12)</label>
                                <input
                                  type="number"
                                  className="form-input"
                                  min="1"
                                  max="12"
                                  value={rule.monthsBetween}
                                  onChange={(e) => updateTriggerRuleAtIndex(index, 'monthsBetween', Number(e.target.value))}
                                />
                              </div>
                              <div className="form-group">
                                <label className="form-label">Trigger at Day of Month</label>
                                <input
                                  type="number"
                                  className="form-input"
                                  min="1"
                                  max="31"
                                  value={rule.triggerAtDayOfMonth}
                                  onChange={(e) => updateTriggerRuleAtIndex(index, 'triggerAtDayOfMonth', Number(e.target.value))}
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
                            </div>
                          )}

                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                <Button onClick={() => validateAndNext(4)}>← Retour</Button>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Button variant="secondary" onClick={handleDeploy} disabled={isDeploying}>
                    Passer et Déployer
                  </Button>
                  <Button variant="primary" onClick={handleDeploy} disabled={isDeploying || formData.trigger_rules.length === 0}>
                    {isDeploying ? 'Déploiement en cours...' : agentToEdit ? 'Sauvegarder les modifications' : '🚀 Lancer le déploiement n8n'}
                  </Button>
                </div>
              </div>
            </div>
          )}


          {/* VirtualMind Floating Guide */}
          <VMindGuide
            isOpen={!!focusedField || showStep2Guide}
            title={focusedField ? VIRTUAL_MIND_GUIDE[focusedField].title : showStep2Guide ? "Briefing de l'Agent" : undefined}
            message={focusedField ? VIRTUAL_MIND_GUIDE[focusedField].text : showStep2Guide ? "Cette section est cruciale. Les réponses que vous donnerez ici définiront le contexte global et la compréhension de l'IA. Soyez le plus précis possible, car ces informations impacteront directement la qualité des emails générés." : null}
            mood={focusedField ? getMoodForField(focusedField) : showStep2Guide ? 'convinced' : undefined}
          />

        </div>
      </div>
    </div>
  );
};
