'use client';

import React, { useEffect, useState } from 'react';
import { 
  Bot, 
  Sparkles, 
  Sliders, 
  Save, 
  RotateCcw, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Loader2, 
  RefreshCw, 
  Cpu, 
  Zap, 
  Thermometer, 
  Hash, 
  Radio, 
  Send,
  X,
  ArrowRightLeft,
  Server,
  ShieldCheck,
  Check,
  ArrowLeft,
  Target,
  Globe,
  Copy,
  CheckCheck,
  Eye,
  EyeOff,
  Database,
  HelpCircle
} from 'lucide-react';
import { useToast } from '@/shared/contexts/ToastContext';

type ProviderMode = 'auto' | 'claude' | 'omniroute';
type SourcingProvider = 'prospeo' | 'hunter';

interface PromptConfig {
  key: string;
  name: string;
  prompt_text: string;
  provider_mode: ProviderMode;
  model: string;              // Primary Model (Claude)
  fallback_model: string;     // Fallback Model (OmniRoute)
  temperature: number;
  max_tokens: number;
  is_stream: boolean;
  description?: string;
  updated_at?: string;
  sourcing_provider?: SourcingProvider;
  sourcing_min_leads?: number;
  sourcing_max_leads?: number;
  sourcing_allow_existing_companies_visible?: boolean;
  supervisor_optimal_threshold?: number;
  weight_email_offer_fidelity?: number;
  weight_email_personalization?: number;
  weight_email_cta_clarity?: number;
  weight_email_delivery_health?: number;
  weight_sourcing_job_title?: number;
  weight_sourcing_seniority?: number;
  weight_sourcing_industry?: number;
  weight_sourcing_geography?: number;
  weight_sourcing_company_size?: number;
  weight_link_acceptance_rate?: number;
  weight_link_avg_icp_score?: number;
  penalty_link_false_positive?: number;
}

interface ProviderStatus {
  hasClaudeCredentials: boolean;
  claudeBaseUrl: string;
  omniRouteBaseUrl: string;
  sourcing?: {
    active_provider: SourcingProvider;
    hasProspeoUrl: boolean;
    hasHunterUrl: boolean;
    prospeoUrl: string;
    hunterUrl: string;
  };
}

export interface PromptsConfigViewProps {
  initialKey?: string;
  onBack?: () => void;
}

function getAuthHeaders(extraHeaders: Record<string, string> = {}): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...extraHeaders
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const CLAUDE_PRESETS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
  'gpt-4o'
];

const OMNIROUTE_PRESETS = [
  'reliable-providers',
  'auto/best-chat',
  'gpt-4o-mini',
  'deepseek-chat'
];

export const PromptsConfigView: React.FC<PromptsConfigViewProps> = ({ initialKey, onBack }) => {
  const { showToast } = useToast();
  const [prompts, setPrompts] = useState<PromptConfig[]>([]);
  const [activeKey, setActiveKey] = useState<string>(initialKey || 'prospect_onboarding_chat');
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);
  const [isUnauthorized, setIsUnauthorized] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);

  // Form edit state for currently active prompt
  const [formName, setFormName] = useState<string>('');
  const [formPromptText, setFormPromptText] = useState<string>('');
  const [formProviderMode, setFormProviderMode] = useState<ProviderMode>('auto');
  const [formModel, setFormModel] = useState<string>('claude-3-5-sonnet-20241022');
  const [formFallbackModel, setFormFallbackModel] = useState<string>('reliable-providers');
  const [formTemperature, setFormTemperature] = useState<number>(0.5);
  const [formMaxTokens, setFormMaxTokens] = useState<number>(1000);
  const [formIsStream, setFormIsStream] = useState<boolean>(false);
  const [formDescription, setFormDescription] = useState<string>('');
  const [formSourcingProvider, setFormSourcingProvider] = useState<SourcingProvider>('prospeo');
  const [formSourcingMinLeads, setFormSourcingMinLeads] = useState<number>(1);
  const [formSourcingMaxLeads, setFormSourcingMaxLeads] = useState<number>(15);
  const [formAllowExistingVisible, setFormAllowExistingVisible] = useState<boolean>(true);
  const [formSupervisorOptimalThreshold, setFormSupervisorOptimalThreshold] = useState<number>(75);
  // Dynamic Scoring Weights for Supervisor Audits
  const [formWeightEmailOffer, setFormWeightEmailOffer] = useState<number>(40);
  const [formWeightEmailPersonalization, setFormWeightEmailPersonalization] = useState<number>(30);
  const [formWeightEmailCta, setFormWeightEmailCta] = useState<number>(20);
  const [formWeightEmailDelivery, setFormWeightEmailDelivery] = useState<number>(10);

  const [formWeightSourcingJob, setFormWeightSourcingJob] = useState<number>(25);
  const [formWeightSourcingSeniority, setFormWeightSourcingSeniority] = useState<number>(20);
  const [formWeightSourcingIndustry, setFormWeightSourcingIndustry] = useState<number>(25);
  const [formWeightSourcingGeo, setFormWeightSourcingGeo] = useState<number>(15);
  const [formWeightSourcingSize, setFormWeightSourcingSize] = useState<number>(15);

  const [formWeightLinkAcceptance, setFormWeightLinkAcceptance] = useState<number>(50);
  const [formWeightLinkAvgIcp, setFormWeightLinkAvgIcp] = useState<number>(50);
  const [formPenaltyLinkFalsePositive, setFormPenaltyLinkFalsePositive] = useState<number>(15);

  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>('');

  // Interactive Test State
  const [showTestModal, setShowTestModal] = useState<boolean>(false);
  const [testUserMessage, setTestUserMessage] = useState<string>('');
  const [testLoading, setTestLoading] = useState<boolean>(false);
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [testMetrics, setTestMetrics] = useState<{
    durationMs?: number;
    modelUsed?: string;
    providerUsed?: 'claude' | 'omniroute';
    fallbackTriggered?: boolean;
    temperature?: number;
  } | null>(null);

  const fetchPrompts = async () => {
    setLoading(true);
    setIsUnauthorized(false);
    try {
      const res = await fetch(`${API_BASE}/api/admin/prompts`, {
        credentials: 'include',
        headers: getAuthHeaders()
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setIsUnauthorized(true);
        }
        throw new Error(`HTTP ${res.status}: Échec de récupération des prompts`);
      }

      const data = await res.json();
      if (data.ok && Array.isArray(data.prompts)) {
        setPrompts(data.prompts);
        if (data.provider_status) {
          setProviderStatus(data.provider_status);
        }

        const targetKey = initialKey || activeKey;
        const active = data.prompts.find((p: PromptConfig) => p.key === targetKey) || data.prompts[0];
        if (active) {
          loadPromptIntoForm(active);
          setActiveKey(active.key);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Erreur lors du chargement des prompts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadPromptIntoForm = (p: PromptConfig) => {
    setFormName(p.name || '');
    setFormPromptText(p.prompt_text || '');
    setFormProviderMode(p.provider_mode || 'auto');
    setFormModel(p.model || 'claude-3-5-sonnet-20241022');
    setFormFallbackModel(p.fallback_model || 'reliable-providers');
    setFormTemperature(p.temperature ?? 0.5);
    setFormMaxTokens(p.max_tokens ?? 1000);
    setFormIsStream(Boolean(p.is_stream));
    setFormDescription(p.description || '');
    setFormSourcingProvider(p.sourcing_provider || 'prospeo');
    setFormSourcingMinLeads(p.sourcing_min_leads ?? 1);
    setFormSourcingMaxLeads(p.sourcing_max_leads ?? 15);
    setFormAllowExistingVisible(p.sourcing_allow_existing_companies_visible !== false);
    setFormSupervisorOptimalThreshold(p.supervisor_optimal_threshold ?? 75);
    setFormWeightEmailOffer(p.weight_email_offer_fidelity ?? 40);
    setFormWeightEmailPersonalization(p.weight_email_personalization ?? 30);
    setFormWeightEmailCta(p.weight_email_cta_clarity ?? 20);
    setFormWeightEmailDelivery(p.weight_email_delivery_health ?? 10);
    setFormWeightSourcingJob(p.weight_sourcing_job_title ?? 25);
    setFormWeightSourcingSeniority(p.weight_sourcing_seniority ?? 20);
    setFormWeightSourcingIndustry(p.weight_sourcing_industry ?? 25);
    setFormWeightSourcingGeo(p.weight_sourcing_geography ?? 15);
    setFormWeightSourcingSize(p.weight_sourcing_company_size ?? 15);
    setFormWeightLinkAcceptance(p.weight_link_acceptance_rate ?? 50);
    setFormWeightLinkAvgIcp(p.weight_link_avg_icp_score ?? 50);
    setFormPenaltyLinkFalsePositive(p.penalty_link_false_positive ?? 15);
    setLastUpdatedAt(p.updated_at ? new Date(p.updated_at).toLocaleString('fr-FR') : '');
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  useEffect(() => {
    if (initialKey && initialKey !== activeKey) {
      setActiveKey(initialKey);
      const target = prompts.find(p => p.key === initialKey);
      if (target) {
        loadPromptIntoForm(target);
      }
    }
  }, [initialKey, prompts]);

  const handleSelectTab = (key: string) => {
    setActiveKey(key);
    const target = prompts.find(p => p.key === key);
    if (target) {
      loadPromptIntoForm(target);
    }
  };

  const handleCopyPrompt = () => {
    if (!formPromptText) return;
    navigator.clipboard.writeText(formPromptText);
    setCopiedPrompt(true);
    showToast('Instruction système copiée dans le presse-papier', 'success');
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleSave = async () => {
    if (activeKey !== 'supervisor_audit_config' && (!formPromptText.trim() || formPromptText.trim().length < 10)) {
      showToast('Le texte du prompt système doit contenir au moins 10 caractères.', 'error');
      return;
    }

    if (activeKey === 'sourcing_execution_chat' && formSourcingMinLeads > formSourcingMaxLeads) {
      showToast('Le minimum de leads ne peut pas être supérieur au maximum.', 'error');
      return;
    }

    if (activeKey === 'supervisor_audit_config') {
      if (formSupervisorOptimalThreshold < 0 || formSupervisorOptimalThreshold > 100) {
        showToast('Le seuil optimal doit être compris entre 0 (masqué) et 100%.', 'error');
        return;
      }
      const sumEmail = formWeightEmailOffer + formWeightEmailPersonalization + formWeightEmailCta + formWeightEmailDelivery;
      if (sumEmail !== 100) {
        showToast(`La somme des pondérations d'évaluation des Emails doit faire 100% (actuellement ${sumEmail}%).`, 'error');
        return;
      }
      const sumSourcing = formWeightSourcingJob + formWeightSourcingSeniority + formWeightSourcingIndustry + formWeightSourcingGeo + formWeightSourcingSize;
      if (sumSourcing !== 100) {
        showToast(`La somme des pondérations de ciblage Sourcing doit faire 100% (actuellement ${sumSourcing}%).`, 'error');
        return;
      }
      const sumLink = formWeightLinkAcceptance + formWeightLinkAvgIcp;
      if (sumLink !== 100) {
        showToast(`La somme des pondérations de Liaison doit faire 100% (actuellement ${sumLink}%).`, 'error');
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/prompts/${activeKey}`, {
        method: 'PUT',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: formName || (activeKey === 'supervisor_audit_config' ? 'Superviseur Commercial - Paramètres & Seuils d\'Audit' : formName),
          prompt_text: formPromptText || 'Configuration globale des seuils de conformité et paramètres de gouvernance pour le Superviseur Commercial.',
          provider_mode: formProviderMode,
          model: formModel,
          fallback_model: formFallbackModel,
          temperature: formTemperature,
          max_tokens: formMaxTokens,
          is_stream: formIsStream,
          description: formDescription,
          ...(activeKey === 'sourcing_execution_chat' ? { 
            sourcing_provider: formSourcingProvider,
            sourcing_min_leads: formSourcingMinLeads,
            sourcing_max_leads: formSourcingMaxLeads,
            sourcing_allow_existing_companies_visible: formAllowExistingVisible
          } : {}),
          ...(activeKey === 'supervisor_audit_config' ? {
            supervisor_optimal_threshold: formSupervisorOptimalThreshold,
            weight_email_offer_fidelity: formWeightEmailOffer,
            weight_email_personalization: formWeightEmailPersonalization,
            weight_email_cta_clarity: formWeightEmailCta,
            weight_email_delivery_health: formWeightEmailDelivery,
            weight_sourcing_job_title: formWeightSourcingJob,
            weight_sourcing_seniority: formWeightSourcingSeniority,
            weight_sourcing_industry: formWeightSourcingIndustry,
            weight_sourcing_geography: formWeightSourcingGeo,
            weight_sourcing_company_size: formWeightSourcingSize,
            weight_link_acceptance_rate: formWeightLinkAcceptance,
            weight_link_avg_icp_score: formWeightLinkAvgIcp,
            penalty_link_false_positive: formPenaltyLinkFalsePositive
          } : {})
        })
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'Échec de la sauvegarde du prompt');
      }

      if (data.provider_status) {
        setProviderStatus(data.provider_status);
      }

      showToast(`Prompt "${formName || activeKey}" sauvegardé en base et actualisé en RAM !`, 'success');

      setPrompts(prev => prev.map(p => p.key === activeKey ? data.prompt : p));
      setLastUpdatedAt(new Date().toLocaleString('fr-FR'));
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const confirmed = window.confirm(`Voulez-vous vraiment réinitialiser le prompt "${formName || activeKey}" à ses paramètres initiaux d'usine ?`);
    if (!confirmed) return;

    setResetting(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/prompts/${activeKey}/reset`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders()
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'Échec de la réinitialisation');
      }

      loadPromptIntoForm(data.prompt);
      if (data.provider_status) {
        setProviderStatus(data.provider_status);
      }
      setPrompts(prev => prev.map(p => p.key === activeKey ? data.prompt : p));
      showToast('Le prompt a été réinitialisé aux valeurs d\'origine.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la réinitialisation', 'error');
    } finally {
      setResetting(false);
    }
  };

  const handleRunTest = async () => {
    if (!testUserMessage.trim()) {
      showToast('Veuillez saisir un message de test.', 'error');
      return;
    }

    setTestLoading(true);
    setTestResponse(null);
    setTestMetrics(null);

    try {
      const startTime = Date.now();
      const res = await fetch(`${API_BASE}/api/admin/prompts/${activeKey}/test`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          user_message: testUserMessage,
          prompt_text: formPromptText,
          provider_mode: formProviderMode,
          model: formModel,
          fallback_model: formFallbackModel,
          temperature: formTemperature,
          max_tokens: formMaxTokens,
          is_stream: formIsStream
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `HTTP ${res.status}: Erreur lors du test LLM`);
      }

      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream') && res.body) {
        // Stream mode: live progressive rendering with smooth typewriter cadence
        setTestResponse(' '); // Initial non-empty character to display output terminal immediately
        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let done = false;
        let accumulated = '';
        let displayAccumulated = '';
        let streamMeta: any = null;

        const tokenQueue: string[] = [];
        let isDraining = true;

        const drainPromise = (async () => {
          while (isDraining || tokenQueue.length > 0) {
            if (tokenQueue.length > 0) {
              const token = tokenQueue.shift()!;
              displayAccumulated += token;
              setTestResponse(displayAccumulated);
              await new Promise(r => setTimeout(r, 18));
            } else {
              await new Promise(r => setTimeout(r, 10));
            }
          }
        })();

        let buffer = '';
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep partial line in buffer

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data: ')) {
                const dataStr = trimmed.slice(6).trim();
                if (dataStr === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(dataStr);
                  if (parsed.meta) {
                    streamMeta = parsed.meta;
                  }
                  if (parsed.content) {
                    accumulated += parsed.content;
                    tokenQueue.push(parsed.content);
                  }
                } catch {
                  // Ignore partial chunks
                }
              }
            }
          }
        }

        isDraining = false;
        await drainPromise;
        setTestResponse(accumulated);

        setTestMetrics({
          durationMs: streamMeta?.durationMs || (Date.now() - startTime),
          modelUsed: streamMeta?.modelUsed || (formProviderMode === 'omniroute' ? formFallbackModel : formModel),
          providerUsed: streamMeta?.providerUsed || (formProviderMode === 'omniroute' ? 'omniroute' : 'claude'),
          fallbackTriggered: Boolean(streamMeta?.fallbackTriggered),
          temperature: streamMeta?.temperature !== undefined ? streamMeta.temperature : formTemperature
        });
      } else {
        // Standard JSON mode
        const data = await res.json();
        setTestResponse(data.reply);
        setTestMetrics({
          durationMs: data.duration_ms,
          modelUsed: data.model_used,
          providerUsed: data.provider_used,
          fallbackTriggered: data.fallback_triggered,
          temperature: data.temperature !== undefined ? data.temperature : formTemperature
        });
      }
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de l\'exécution du test', 'error');
    } finally {
      setTestLoading(false);
    }
  };

  if (isUnauthorized) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', minHeight: 480, padding: 32, textAlign: 'center', color: '#CBD5E1'
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(255, 71, 87, 0.12)', border: '1px solid rgba(255, 71, 87, 0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20
        }}>
          <ShieldCheck size={32} color="#FF4757" />
        </div>
        <h2 style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 700, marginBottom: 10, letterSpacing: '-0.01em' }}>
          Accès Strictement Réservé aux Administrateurs
        </h2>
        <p style={{ maxWidth: 480, fontSize: 14.5, lineHeight: 1.6, marginBottom: 28, color: '#94A3B8' }}>
          Vous ne disposez pas des privilèges administrateur requis pour consulter ou modifier les instructions système et configurations de modèles LLM.
        </p>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 24px', borderRadius: 10,
              background: 'rgba(0, 229, 200, 0.12)', border: '1px solid #00E5C8',
              color: '#00E5C8', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <ArrowLeft size={16} />
            <span>Retour au Marketplace</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div 
      id="prompts-config-view"
      style={{
        width: '100%',
        height: '100%',
        minHeight: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '28px 36px 64px',
        boxSizing: 'border-box',
        color: '#F0F4F8',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif'
      }}
    >
      {/* View Header with Action Bar — Always accessible at the top */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
        marginBottom: 24,
        paddingBottom: 20,
        borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
        flexShrink: 0
      }}>
        <div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 14px',
                marginBottom: 12,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 8,
                color: '#CBD5E1',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#00E5C8';
                e.currentTarget.style.borderColor = 'rgba(0, 229, 200, 0.5)';
                e.currentTarget.style.background = 'rgba(0, 229, 200, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#CBD5E1';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              }}
            >
              <ArrowLeft size={15} />
              <span>Retour au Marketplace</span>
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'rgba(0, 229, 200, 0.12)',
              border: '1px solid rgba(0, 229, 200, 0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 14px rgba(0, 229, 200, 0.18)'
            }}>
              <Bot size={22} color="#00E5C8" />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
              Configuration des Prompts IA & Inférence
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: 13.5, color: '#94A3B8', lineHeight: 1.5 }}>
            Ajustez les instructions système, modèles et fournisseurs LLM. Modifications synchronisées en direct en mémoire RAM.
          </p>
        </div>

        {/* Top Action Buttons with crisp tactile contrast */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={fetchPrompts}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', borderRadius: 9,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              color: '#F0F4F8', fontSize: 13, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.09)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.14)';
            }}
            title="Actualiser depuis la base de données"
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Actualiser</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={resetting || saving || loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', borderRadius: 9,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              color: '#F0F4F8', fontSize: 13, fontWeight: 600,
              cursor: resetting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onMouseEnter={(e) => {
              if (!resetting) {
                e.currentTarget.style.background = 'rgba(255, 71, 87, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(255, 71, 87, 0.35)';
                e.currentTarget.style.color = '#FF7582';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.14)';
              e.currentTarget.style.color = '#F0F4F8';
            }}
            title="Rétablir les valeurs d'origine de ce prompt"
          >
            <RotateCcw size={15} />
            <span>Rétablir</span>
          </button>

          {activeKey !== 'supervisor_audit_config' && (
            <button
              type="button"
              onClick={() => {
                setShowTestModal(true);
                setTestUserMessage(
                  activeKey === 'prospect_onboarding_chat'
                    ? "Bonjour ! Je m'appelle Thomas, directeur commercial chez CloudSecure. Nous vendons une solution de cybersécurité pour les PME."
                    : "Directeurs logistique en France dans le secteur du transport"
                );
              }}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 9,
                background: 'rgba(0, 229, 200, 0.12)',
                border: '1px solid rgba(0, 229, 200, 0.45)',
                color: '#00E5C8', fontSize: 13, fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 0 12px rgba(0, 229, 200, 0.15)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 229, 200, 0.2)';
                e.currentTarget.style.boxShadow = '0 0 18px rgba(0, 229, 200, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 229, 200, 0.12)';
                e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 229, 200, 0.15)';
              }}
            >
              <Play size={15} />
              <span>Tester en direct</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 22px', borderRadius: 9,
              background: 'linear-gradient(135deg, #00E5C8 0%, #00C2A8 100%)',
              border: 'none',
              color: '#04111D', fontSize: 13, fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 0 18px rgba(0, 229, 200, 0.35)'
            }}
            onMouseEnter={(e) => {
              if (!saving) {
                e.currentTarget.style.boxShadow = '0 0 24px rgba(0, 229, 200, 0.55)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 0 18px rgba(0, 229, 200, 0.35)';
              e.currentTarget.style.transform = 'none';
            }}
          >
            {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            <span>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Selector — High-contrast segmented pill row */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 24, flexShrink: 0
      }}>
        <button
          onClick={() => handleSelectTab('prospect_onboarding_chat')}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '11px 18px', borderRadius: 10,
            background: activeKey === 'prospect_onboarding_chat' ? 'rgba(0, 229, 200, 0.12)' : 'rgba(255, 255, 255, 0.04)',
            border: `1px solid ${activeKey === 'prospect_onboarding_chat' ? '#00E5C8' : 'rgba(255, 255, 255, 0.12)'}`,
            color: activeKey === 'prospect_onboarding_chat' ? '#00E5C8' : '#CBD5E1',
            fontWeight: 600, fontSize: 13.5, cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: activeKey === 'prospect_onboarding_chat' ? '0 0 16px rgba(0, 229, 200, 0.18)' : 'none'
          }}
        >
          <Sparkles size={16} />
          <span> Prospection : Stratégie d'Emails</span>
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 12,
            background: activeKey === 'prospect_onboarding_chat' ? 'rgba(0, 229, 200, 0.2)' : 'rgba(255, 255, 255, 0.08)',
            color: activeKey === 'prospect_onboarding_chat' ? '#00E5C8' : '#94A3B8',
            fontWeight: 600
          }}>
            Prospect Wizard
          </span>
        </button>

        <button
          onClick={() => handleSelectTab('sourcing_execution_chat')}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '11px 18px', borderRadius: 10,
            background: activeKey === 'sourcing_execution_chat' ? 'rgba(0, 229, 200, 0.12)' : 'rgba(255, 255, 255, 0.04)',
            border: `1px solid ${activeKey === 'sourcing_execution_chat' ? '#00E5C8' : 'rgba(255, 255, 255, 0.12)'}`,
            color: activeKey === 'sourcing_execution_chat' ? '#00E5C8' : '#CBD5E1',
            fontWeight: 600, fontSize: 13.5, cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: activeKey === 'sourcing_execution_chat' ? '0 0 16px rgba(0, 229, 200, 0.18)' : 'none'
          }}
        >
          <Zap size={16} />
          <span> Sourcing: Ciblage ICP & Profils</span>
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 12,
            background: activeKey === 'sourcing_execution_chat' ? 'rgba(0, 229, 200, 0.2)' : 'rgba(255, 255, 255, 0.08)',
            color: activeKey === 'sourcing_execution_chat' ? '#00E5C8' : '#94A3B8',
            fontWeight: 600
          }}>
            Sourcing Modals
          </span>
        </button>

        <button
          onClick={() => handleSelectTab('supervisor_audit_config')}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '11px 18px', borderRadius: 10,
            background: activeKey === 'supervisor_audit_config' ? 'rgba(0, 229, 200, 0.12)' : 'rgba(255, 255, 255, 0.04)',
            border: `1px solid ${activeKey === 'supervisor_audit_config' ? '#00E5C8' : 'rgba(255, 255, 255, 0.12)'}`,
            color: activeKey === 'supervisor_audit_config' ? '#00E5C8' : '#CBD5E1',
            fontWeight: 600, fontSize: 13.5, cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: activeKey === 'supervisor_audit_config' ? '0 0 16px rgba(0, 229, 200, 0.18)' : 'none'
          }}
        >
          <Sliders size={16} />
          <span> Superviseur : Seuils & Gouvernance</span>
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 12,
            background: activeKey === 'supervisor_audit_config' ? 'rgba(0, 229, 200, 0.2)' : 'rgba(255, 255, 255, 0.08)',
            color: activeKey === 'supervisor_audit_config' ? '#00E5C8' : '#94A3B8',
            fontWeight: 600
          }}>
            Superviseur Commercial
          </span>
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 380, gap: 12, color: '#CBD5E1' }}>
          <Loader2 size={24} className="spin" color="#00E5C8" />
          <span style={{ fontSize: 14.5, fontWeight: 500 }}>Chargement des configurations...</span>
        </div>
      ) : activeKey === 'supervisor_audit_config' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 420px',
          gap: 24,
          alignItems: 'start',
          flex: 1
        }}>
          {/* Main Column: Supervisor Thresholds & Governance Parameters */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(8, 20, 38, 0.9) 0%, rgba(12, 28, 52, 0.75) 100%)',
            border: '1px solid rgba(0, 229, 200, 0.28)',
            borderRadius: 16,
            padding: 28,
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: '10%',
              right: '10%',
              height: '1px',
              background: 'linear-gradient(90deg, transparent, #00E5C8, transparent)',
              opacity: 0.6
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <Target size={18} color="#00E5C8" />
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#FFFFFF' }}>
                    Seuil Optimal de Conformité (Historique & Flotte)
                  </h2>
                </div>
                <p style={{ margin: 0, fontSize: 13.5, color: '#94A3B8', lineHeight: 1.55, maxWidth: 640 }}>
                  {formSupervisorOptimalThreshold === 0 ? (
                    <>
                      La ligne de référence <strong style={{ color: '#FF7582' }}>« Seuil optimal » est actuellement masquée</strong> sur le graphique d&apos;Historique. Le seuil par défaut (75%) reste utilisé en interne pour les pastilles de statut des agents.
                    </>
                  ) : (
                    <>
                      Définit la ligne de référence <strong style={{ color: '#00E5C8' }}>« Seuil optimal ({formSupervisorOptimalThreshold}%) »</strong> affichée sur la courbe d&apos;évolution dans l&apos;onglet Historique du Superviseur Commercial ainsi que le score minimal pour classer un agent ou un binôme en statut <strong>Optimal</strong>.
                    </>
                  )}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => setFormSupervisorOptimalThreshold(formSupervisorOptimalThreshold === 0 ? 75 : 0)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: formSupervisorOptimalThreshold === 0 ? 'rgba(0, 229, 200, 0.14)' : 'rgba(255, 71, 87, 0.12)',
                    border: `1px solid ${formSupervisorOptimalThreshold === 0 ? 'rgba(0, 229, 200, 0.45)' : 'rgba(255, 71, 87, 0.4)'}`,
                    color: formSupervisorOptimalThreshold === 0 ? '#00E5C8' : '#FF7582',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.18s ease'
                  }}
                >
                  {formSupervisorOptimalThreshold === 0 ? '+ Réactiver la ligne (75%)' : 'Masquer la ligne'}
                </button>
                <div style={{
                  padding: '10px 18px',
                  borderRadius: 12,
                  background: formSupervisorOptimalThreshold === 0 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 229, 200, 0.12)',
                  border: `1px solid ${formSupervisorOptimalThreshold === 0 ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 229, 200, 0.4)'}`,
                  color: formSupervisorOptimalThreshold === 0 ? '#94A3B8' : '#00E5C8',
                  fontSize: formSupervisorOptimalThreshold === 0 ? 15 : 22,
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  boxShadow: formSupervisorOptimalThreshold === 0 ? 'none' : '0 0 20px rgba(0, 229, 200, 0.15)',
                  flexShrink: 0
                }}>
                  {formSupervisorOptimalThreshold === 0 ? 'Masqué' : `${formSupervisorOptimalThreshold}%`}
                </div>
              </div>
            </div>

            {/* Interactive Slider + Numeric Input */}
            <div style={{
              background: 'rgba(4, 11, 22, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 12,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                opacity: formSupervisorOptimalThreshold === 0 ? 0.5 : 1,
                transition: 'opacity 0.2s ease'
              }}>
                <input
                  type="range"
                  min={1}
                  max={100}
                  step={1}
                  value={formSupervisorOptimalThreshold === 0 ? 75 : formSupervisorOptimalThreshold}
                  onChange={(e) => setFormSupervisorOptimalThreshold(Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 75)))}
                  style={{ flex: 1, accentColor: '#00E5C8', cursor: 'pointer', height: 6 }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formSupervisorOptimalThreshold}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        setFormSupervisorOptimalThreshold(Math.min(100, Math.max(0, val)));
                      }
                    }}
                    style={{
                      width: 76,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(0, 229, 200, 0.35)',
                      borderRadius: 8,
                      padding: '8px 10px',
                      color: '#FFFFFF',
                      fontSize: 15,
                      fontWeight: 700,
                      textAlign: 'center',
                      outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#94A3B8' }}>%</span>
                </div>
              </div>

              {/* Preset Quick Chips */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>Valeurs recommandées :</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setFormSupervisorOptimalThreshold(0)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 8,
                      background: formSupervisorOptimalThreshold === 0 ? 'rgba(255, 71, 87, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                      border: `1px solid ${formSupervisorOptimalThreshold === 0 ? '#FF4757' : 'rgba(255, 255, 255, 0.1)'}`,
                      color: formSupervisorOptimalThreshold === 0 ? '#FF7582' : '#94A3B8',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Masquer la ligne
                  </button>
                  {[60, 65, 70, 75, 80, 85, 90].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setFormSupervisorOptimalThreshold(preset)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 8,
                        background: formSupervisorOptimalThreshold === preset ? 'rgba(0, 229, 200, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                        border: `1px solid ${formSupervisorOptimalThreshold === preset ? '#00E5C8' : 'rgba(255, 255, 255, 0.1)'}`,
                        color: formSupervisorOptimalThreshold === preset ? '#00E5C8' : '#CBD5E1',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {preset}% {preset === 75 ? '(Défaut)' : ''}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Chart Reference Line Visual Preview */}
            <div style={{
              background: 'rgba(4, 11, 22, 0.92)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 12,
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#94A3B8' }}>
                  Aperçu en direct sur le graphique d&apos;Historique
                </span>
                <span style={{ fontSize: 11.5, color: formSupervisorOptimalThreshold === 0 ? '#94A3B8' : '#00E5C8', fontWeight: 600 }}>
                  {formSupervisorOptimalThreshold === 0 ? 'Aucune ligne de seuil affichée' : `Seuil optimal (${formSupervisorOptimalThreshold}%)`}
                </span>
              </div>

              <div style={{
                position: 'relative',
                height: 110,
                background: 'linear-gradient(180deg, rgba(0, 229, 200, 0.07) 0%, rgba(0, 229, 200, 0.01) 100%)',
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.05)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {formSupervisorOptimalThreshold === 0 ? (
                  <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
                    Ligne « Seuil optimal » masquée sur la courbe
                  </span>
                ) : (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: `${formSupervisorOptimalThreshold}%`,
                    borderTop: '1.5px dashed rgba(0, 229, 200, 0.65)',
                    transition: 'bottom 0.15s ease'
                  }}>
                    <span style={{
                      position: 'absolute',
                      right: 10,
                      top: 4,
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: '#00E5C8',
                      background: 'rgba(4, 11, 22, 0.85)',
                      padding: '1px 6px',
                      borderRadius: 4
                    }}>
                      Seuil optimal ({formSupervisorOptimalThreshold}%)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* BARÈME DE NOTATION MATHÉMATIQUE & PONDÉRATIONS DYNAMIQUES */}
            <div style={{
              background: 'rgba(4, 11, 22, 0.92)',
              border: '1px solid rgba(0, 229, 200, 0.25)',
              borderRadius: 16,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 20
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Database size={18} color="#00E5C8" />
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                    Formule &amp; Pondérations de Notation (Calcul Déterministe)
                  </h3>
                </div>
                <p style={{ fontSize: 12.5, color: '#94A3B8', marginTop: 6, marginBottom: 0, lineHeight: 1.5 }}>
                  Configurez le barème mathématique utilisé pour attribuer les notes de conformité. Les scores sont calculés par code JavaScript déterministe avec ces coefficients stricts, garantissant des résultats stables et reproductibles entre chaque exécution.
                </p>
              </div>

              {/* 1. Barème Prospection (Emails) */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 12,
                padding: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 14
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#00E5C8' }}>
                    1. Évaluation des Emails (Agent de Prospection)
                  </span>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: (formWeightEmailOffer + formWeightEmailPersonalization + formWeightEmailCta + formWeightEmailDelivery === 100)
                      ? 'rgba(0, 229, 200, 0.15)' : 'rgba(255, 71, 87, 0.2)',
                    color: (formWeightEmailOffer + formWeightEmailPersonalization + formWeightEmailCta + formWeightEmailDelivery === 100)
                      ? '#00E5C8' : '#FF4757',
                    border: `1px solid ${(formWeightEmailOffer + formWeightEmailPersonalization + formWeightEmailCta + formWeightEmailDelivery === 100) ? 'rgba(0, 229, 200, 0.3)' : '#FF4757'}`
                  }}>
                    Total : {formWeightEmailOffer + formWeightEmailPersonalization + formWeightEmailCta + formWeightEmailDelivery} / 100%
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#CBD5E1', marginBottom: 4, cursor: 'help' }}
                      title="Vérifie que le nom du produit/service et au moins un avantage concurrentiel (différenciateur clé) du Briefing sont cités dans chaque email."
                    >
                      <span>Fidélité à l&apos;Offre &amp; Différenciateurs (%)</span>
                      <HelpCircle size={12} color="#00E5C8" style={{ opacity: 0.8 }} />
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={formWeightEmailOffer}
                      onChange={(e) => setFormWeightEmailOffer(Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)))}
                      style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#FFF' }}
                    />
                    <span style={{ display: 'block', fontSize: 10.5, color: '#64748B', marginTop: 3 }}>
                      Citation du produit et arguments clés
                    </span>
                  </div>
                  <div>
                    <label
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#CBD5E1', marginBottom: 4, cursor: 'help' }}
                      title="Mesure la personnalisation de l'accroche : l'email est-il contextualisé selon le poste, l'entreprise et le secteur d'activité du destinataire ?"
                    >
                      <span>Personnalisation par Entreprise (%)</span>
                      <HelpCircle size={12} color="#00E5C8" style={{ opacity: 0.8 }} />
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={formWeightEmailPersonalization}
                      onChange={(e) => setFormWeightEmailPersonalization(Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)))}
                      style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#FFF' }}
                    />
                    <span style={{ display: 'block', fontSize: 10.5, color: '#64748B', marginTop: 3 }}>
                      Accroche adaptée au profil du prospect
                    </span>
                  </div>
                  <div>
                    <label
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#CBD5E1', marginBottom: 4, cursor: 'help' }}
                      title="Évalue si l'email se termine par une proposition concrète et facile à accepter (ex: appel de 15 minutes, créneau de démo, échange rapide)."
                    >
                      <span>Clarté de l&apos;Invitation à Échanger (%)</span>
                      <HelpCircle size={12} color="#00E5C8" style={{ opacity: 0.8 }} />
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={formWeightEmailCta}
                      onChange={(e) => setFormWeightEmailCta(Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)))}
                      style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#FFF' }}
                    />
                    <span style={{ display: 'block', fontSize: 10.5, color: '#64748B', marginTop: 3 }}>
                      Proposition de rendez-vous claire
                    </span>
                  </div>
                  <div>
                    <label
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#CBD5E1', marginBottom: 4, cursor: 'help' }}
                      title="Pénalise uniquement les erreurs techniques d'envoi et les rebonds. Les brouillons manuels et envois réussis reçoivent 100% de cette note."
                    >
                      <span>Santé &amp; Délivrabilité des Envois (%)</span>
                      <HelpCircle size={12} color="#00E5C8" style={{ opacity: 0.8 }} />
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={formWeightEmailDelivery}
                      onChange={(e) => setFormWeightEmailDelivery(Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)))}
                      style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#FFF' }}
                    />
                    <span style={{ display: 'block', fontSize: 10.5, color: '#64748B', marginTop: 3 }}>
                      Absence d&apos;erreurs et de rejets d&apos;envoi
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Barème Sourcing (Qualité des leads) */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 12,
                padding: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 14
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#00E5C8' }}>
                    2. Évaluation du Sourcing (Critères de Recherche)
                  </span>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: (formWeightSourcingJob + formWeightSourcingSeniority + formWeightSourcingIndustry + formWeightSourcingGeo + formWeightSourcingSize === 100)
                      ? 'rgba(0, 229, 200, 0.15)' : 'rgba(255, 71, 87, 0.2)',
                    color: (formWeightSourcingJob + formWeightSourcingSeniority + formWeightSourcingIndustry + formWeightSourcingGeo + formWeightSourcingSize === 100)
                      ? '#00E5C8' : '#FF4757',
                    border: `1px solid ${(formWeightSourcingJob + formWeightSourcingSeniority + formWeightSourcingIndustry + formWeightSourcingGeo + formWeightSourcingSize === 100) ? 'rgba(0, 229, 200, 0.3)' : '#FF4757'}`
                  }}>
                    Total : {formWeightSourcingJob + formWeightSourcingSeniority + formWeightSourcingIndustry + formWeightSourcingGeo + formWeightSourcingSize} / 100%
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <div>
                    <label
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#CBD5E1', marginBottom: 4, cursor: 'help' }}
                      title="Vérifie que l'intitulé de poste du profil extrait correspond bien aux fonctions recherchées dans la Mission de l'Agent de Sourcing (ex: Directeur commercial, Chef cuisinier)."
                    >
                      <span>Intitulé du Poste (%)</span>
                      <HelpCircle size={12} color="#00E5C8" style={{ opacity: 0.8 }} />
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={formWeightSourcingJob}
                      onChange={(e) => setFormWeightSourcingJob(Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)))}
                      style={{ width: '100%', padding: '8px 10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#FFF' }}
                    />
                    <span style={{ display: 'block', fontSize: 10.5, color: '#64748B', marginTop: 3 }}>
                      Adéquation fonctionnelle du poste
                    </span>
                  </div>
                  <div>
                    <label
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#CBD5E1', marginBottom: 4, cursor: 'help' }}
                      title="Vérifie le niveau hiérarchique et le pouvoir de décision (C-Suite, VP, Director, Gérant, etc.) demandé dans la mission."
                    >
                      <span>Niveau Hiérarchique (%)</span>
                      <HelpCircle size={12} color="#00E5C8" style={{ opacity: 0.8 }} />
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={formWeightSourcingSeniority}
                      onChange={(e) => setFormWeightSourcingSeniority(Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)))}
                      style={{ width: '100%', padding: '8px 10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#FFF' }}
                    />
                    <span style={{ display: 'block', fontSize: 10.5, color: '#64748B', marginTop: 3 }}>
                      Séniorité et rôle de décideur
                    </span>
                  </div>
                  <div>
                    <label
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#CBD5E1', marginBottom: 4, cursor: 'help' }}
                      title="Vérifie que l'entreprise du lead appartient au bon secteur d'activité (avec équivalence FR/EN garantie, ex: Hospitality = Hôtellerie)."
                    >
                      <span>Secteur d&apos;Activité (%)</span>
                      <HelpCircle size={12} color="#00E5C8" style={{ opacity: 0.8 }} />
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={formWeightSourcingIndustry}
                      onChange={(e) => setFormWeightSourcingIndustry(Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)))}
                      style={{ width: '100%', padding: '8px 10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#FFF' }}
                    />
                    <span style={{ display: 'block', fontSize: 10.5, color: '#64748B', marginTop: 3 }}>
                      Industrie cible de l&apos;entreprise
                    </span>
                  </div>
                  <div>
                    <label
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#CBD5E1', marginBottom: 4, cursor: 'help' }}
                      title="Vérifie que le pays ou la région de l'entreprise correspond aux zones géographiques ciblées (ex: France, Belgique, Suisse)."
                    >
                      <span>Zone Géographique (%)</span>
                      <HelpCircle size={12} color="#00E5C8" style={{ opacity: 0.8 }} />
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={formWeightSourcingGeo}
                      onChange={(e) => setFormWeightSourcingGeo(Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)))}
                      style={{ width: '100%', padding: '8px 10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#FFF' }}
                    />
                    <span style={{ display: 'block', fontSize: 10.5, color: '#64748B', marginTop: 3 }}>
                      Pays et localisation géographique
                    </span>
                  </div>
                  <div>
                    <label
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#CBD5E1', marginBottom: 4, cursor: 'help' }}
                      title="Vérifie que le nombre de salariés de l'entreprise s'inscrit dans la tranche d'effectif demandée (ex: 50 à 1 000 salariés)."
                    >
                      <span>Taille de l&apos;Entreprise (%)</span>
                      <HelpCircle size={12} color="#00E5C8" style={{ opacity: 0.8 }} />
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={formWeightSourcingSize}
                      onChange={(e) => setFormWeightSourcingSize(Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)))}
                      style={{ width: '100%', padding: '8px 10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#FFF' }}
                    />
                    <span style={{ display: 'block', fontSize: 10.5, color: '#64748B', marginTop: 3 }}>
                      Tranche d&apos;effectif salarié
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Barème Liaison Inter-Agents */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 12,
                padding: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 14
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#00E5C8' }}>
                    3. Évaluation de la Liaison Inter-Agents (Sourcing ➔ Prospection)
                  </span>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: (formWeightLinkAcceptance + formWeightLinkAvgIcp === 100)
                      ? 'rgba(0, 229, 200, 0.15)' : 'rgba(255, 71, 87, 0.2)',
                    color: (formWeightLinkAcceptance + formWeightLinkAvgIcp === 100)
                      ? '#00E5C8' : '#FF4757',
                    border: `1px solid ${(formWeightLinkAcceptance + formWeightLinkAvgIcp === 100) ? 'rgba(0, 229, 200, 0.3)' : '#FF4757'}`
                  }}>
                    Total Poids : {formWeightLinkAcceptance + formWeightLinkAvgIcp} / 100%
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <div>
                    <label
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#CBD5E1', marginBottom: 4, cursor: 'help' }}
                      title="Proportion de leads transmis par le sourcing qui sont acceptés par la prospection. Mesure l'absence de gaspillage (Quantité de leads qualifiés sur le total envoyé)."
                    >
                      <span>Part de Leads Retenus (%)</span>
                      <HelpCircle size={12} color="#00E5C8" style={{ opacity: 0.8 }} />
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={formWeightLinkAcceptance}
                      onChange={(e) => setFormWeightLinkAcceptance(Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)))}
                      style={{ width: '100%', padding: '8px 10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#FFF' }}
                    />
                    <span style={{ display: 'block', fontSize: 10.5, color: '#64748B', marginTop: 3 }}>
                      Taux d&apos;acceptation en prospection
                    </span>
                  </div>
                  <div>
                    <label
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#CBD5E1', marginBottom: 4, cursor: 'help' }}
                      title="Note moyenne sur 100 donnée par l'agent de prospection aux profils qu'il a acceptés. Mesure la proximité avec la cible idéale (Qualité et pertinence des profils retenus)."
                    >
                      <span>Correspondance Cible (%)</span>
                      <HelpCircle size={12} color="#00E5C8" style={{ opacity: 0.8 }} />
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={formWeightLinkAvgIcp}
                      onChange={(e) => setFormWeightLinkAvgIcp(Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)))}
                      style={{ width: '100%', padding: '8px 10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#FFF' }}
                    />
                    <span style={{ display: 'block', fontSize: 10.5, color: '#64748B', marginTop: 3 }}>
                      Note moyenne des profils qualifiés
                    </span>
                  </div>
                  <div>
                    <label
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#CBD5E1', marginBottom: 4, cursor: 'help' }}
                      title="Points déduits si un lead hors-cible (mauvais pays ou mauvaise taille) a été qualifié par erreur à cause d'un seuil trop permissif."
                    >
                      <span>Pénalité Faux Positifs (pts)</span>
                      <HelpCircle size={12} color="#00E5C8" style={{ opacity: 0.8 }} />
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={formPenaltyLinkFalsePositive}
                      onChange={(e) => setFormPenaltyLinkFalsePositive(Math.max(0, Math.min(50, parseInt(e.target.value, 10) || 0)))}
                      style={{ width: '100%', padding: '8px 10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#FFF' }}
                    />
                    <span style={{ display: 'block', fontSize: 10.5, color: '#64748B', marginTop: 3 }}>
                      Déduction si un hors-cible est accepté
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side Column: Summary & Save */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{
              background: 'linear-gradient(145deg, rgba(8, 20, 38, 0.9) 0%, rgba(12, 28, 52, 0.75) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 16,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sliders size={16} color="#00E5C8" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Impact des Seuils
                </span>
              </div>

              <div style={{
                background: 'rgba(4, 11, 22, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 10,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                fontSize: 12.5
              }}>
                {(() => {
                  const effectiveOpt = formSupervisorOptimalThreshold > 0 ? formSupervisorOptimalThreshold : 75;
                  const critCutoff = Math.min(50, Math.max(1, effectiveOpt - 1));
                  return (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#94A3B8', fontWeight: 600 }}>Ligne sur graphique</span>
                        <span style={{ fontFamily: 'monospace', color: formSupervisorOptimalThreshold === 0 ? '#FF7582' : '#00E5C8', fontWeight: 700 }}>
                          {formSupervisorOptimalThreshold === 0 ? 'Masquée' : `Active (${formSupervisorOptimalThreshold}%)`}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#00E5C8', fontWeight: 700 }}>● Optimal</span>
                        <span style={{ fontFamily: 'monospace', color: '#F0F4F8', fontWeight: 700 }}>≥ {effectiveOpt}%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#FFA502', fontWeight: 700 }}>● À surveiller</span>
                        <span style={{ fontFamily: 'monospace', color: '#F0F4F8', fontWeight: 700 }}>
                          {critCutoff}% – {Math.max(1, effectiveOpt - 1)}%
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#FF4757', fontWeight: 700 }}>● Critique</span>
                        <span style={{ fontFamily: 'monospace', color: '#F0F4F8', fontWeight: 700 }}>
                          &lt; {critCutoff}%
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {lastUpdatedAt && (
                <div style={{ fontSize: 11.5, color: '#94A3B8' }}>
                  Dernière synchronisation : <strong style={{ color: '#F0F4F8' }}>{lastUpdatedAt}</strong>
                </div>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || loading}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #00E5C8 0%, #00C2A8 100%)',
                  border: 'none',
                  color: '#04111D',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 0 16px rgba(0, 229, 200, 0.35)'
                }}
              >
                {saving ? <Loader2 size={15} className="spin" /> : <Save size={15} />}
                <span>{saving ? 'Sauvegarde...' : 'Sauvegarder la configuration'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'minmax(0, 1fr) 420px', 
          gap: 24, 
          alignItems: 'start',
          flex: 1
        }}>
          
          {/* Main Column: System Prompt Text Editor */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(8, 20, 38, 0.9) 0%, rgba(12, 28, 52, 0.75) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 16,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Ambient Specular Line at Top */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: '10%',
              right: '10%',
              height: '1px',
              background: 'linear-gradient(90deg, transparent, #00E5C8, transparent)',
              opacity: 0.6
            }} />

            {/* Prompt Name Row */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#00E5C8', fontWeight: 700 }}>
                  Nom & Rôle du Prompt
                </label>
                {lastUpdatedAt && (
                  <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>
                    Dernière synchro : <span style={{ color: '#F0F4F8', fontWeight: 600 }}>{lastUpdatedAt}</span>
                  </span>
                )}
              </div>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                style={{
                  background: 'rgba(5, 14, 26, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  borderRadius: 8,
                  padding: '11px 16px',
                  color: '#FFFFFF',
                  fontSize: 15,
                  fontWeight: 600,
                  width: '100%',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  caretColor: '#00E5C8'
                }}
                onFocus={(e) => e.target.style.borderColor = '#00E5C8'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.14)'}
              />
            </div>

            {/* System Prompt Instruction Textarea */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#CBD5E1', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>Instruction Système (System Prompt)</span>
                  </label>
                  <span style={{ fontSize: 11, color: '#00E5C8', background: 'rgba(0, 229, 200, 0.12)', border: '1px solid rgba(0, 229, 200, 0.3)', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                    ⚡ 0ms Latence RAM
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>
                    <b style={{ color: '#F0F4F8' }}>{formPromptText.length.toLocaleString('fr-FR')}</b> caractères · <b style={{ color: '#F0F4F8' }}>{formPromptText.split(/\s+/).filter(Boolean).length.toLocaleString('fr-FR')}</b> mots
                  </span>

                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 10px',
                      background: copiedPrompt ? 'rgba(0, 229, 200, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                      border: `1px solid ${copiedPrompt ? '#00E5C8' : 'rgba(255, 255, 255, 0.12)'}`,
                      borderRadius: 6,
                      color: copiedPrompt ? '#00E5C8' : '#CBD5E1',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    title="Copier le prompt complet"
                  >
                    {copiedPrompt ? <CheckCheck size={13} color="#00E5C8" /> : <Copy size={13} />}
                    <span>{copiedPrompt ? 'Copié !' : 'Copier'}</span>
                  </button>
                </div>
              </div>

              <textarea
                value={formPromptText}
                onChange={(e) => setFormPromptText(e.target.value)}
                rows={21}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'rgba(4, 11, 22, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  borderRadius: 10,
                  padding: '16px 18px',
                  color: '#F1F5F9',
                  fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, Monaco, monospace',
                  fontSize: 14,
                  lineHeight: '1.65',
                  resize: 'vertical',
                  outline: 'none',
                  caretColor: '#00E5C8',
                  boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.5)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#00E5C8';
                  e.target.style.boxShadow = '0 0 0 2px rgba(0, 229, 200, 0.2), inset 0 2px 8px rgba(0, 0, 0, 0.5)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.14)';
                  e.target.style.boxShadow = 'inset 0 2px 8px rgba(0, 0, 0, 0.5)';
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Description technique / Cas d'usage
              </label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Description du rôle de ce prompt dans le pipeline VMIND..."
                style={{
                  background: 'rgba(5, 14, 26, 0.75)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  color: '#CBD5E1',
                  fontSize: 13.5,
                  width: '100%',
                  boxSizing: 'border-box',
                  outline: 'none',
                  caretColor: '#00E5C8'
                }}
                onFocus={(e) => e.target.style.borderColor = '#00E5C8'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
              />
            </div>
          </div>

          {/* Side Column: Controls & Parameters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* Sourcing Engine Selector Card (Prospeo vs Hunter) - Displayed for Sourcing Prompt */}
            {activeKey === 'sourcing_execution_chat' && (
              <div style={{
                background: 'linear-gradient(145deg, rgba(8, 20, 38, 0.9) 0%, rgba(12, 28, 52, 0.75) 100%)',
                border: '1px solid rgba(0, 229, 200, 0.3)',
                borderRadius: 16,
                padding: 20,
                boxShadow: '0 8px 24px rgba(0, 229, 200, 0.08)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: 'linear-gradient(90deg, #00E5C8 0%, rgba(0, 229, 200, 0) 100%)'
                }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Target size={16} color="#00E5C8" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Moteur de Sourcing
                    </span>
                  </div>
                  <span style={{
                    fontSize: 11,
                    padding: '3px 10px',
                    borderRadius: 10,
                    fontWeight: 700,
                    background: formSourcingProvider === 'prospeo' ? 'rgba(0, 229, 200, 0.16)' : 'rgba(255, 169, 64, 0.16)',
                    color: formSourcingProvider === 'prospeo' ? '#00E5C8' : '#FFA940',
                    border: `1px solid ${formSourcingProvider === 'prospeo' ? 'rgba(0, 229, 200, 0.4)' : 'rgba(255, 169, 64, 0.4)'}`
                  }}>
                    {formSourcingProvider === 'prospeo' ? 'Prospeo Actif' : 'Hunter Actif'}
                  </span>
                </div>

                {/* 2-Option Selector: Prospeo vs Hunter */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                  background: 'rgba(4, 11, 22, 0.75)',
                  padding: 5,
                  borderRadius: 10,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  marginBottom: 14
                }}>
                  {/* Prospeo Button */}
                  <button
                    type="button"
                    onClick={() => setFormSourcingProvider('prospeo')}
                    style={{
                      padding: '12px 10px',
                      borderRadius: 8,
                      border: formSourcingProvider === 'prospeo' ? '1px solid rgba(0, 229, 200, 0.5)' : '1px solid transparent',
                      background: formSourcingProvider === 'prospeo' ? 'rgba(0, 229, 200, 0.16)' : 'transparent',
                      color: formSourcingProvider === 'prospeo' ? '#00E5C8' : '#CBD5E1',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Zap size={15} color={formSourcingProvider === 'prospeo' ? '#00E5C8' : '#CBD5E1'} />
                      <span style={{ fontSize: 13.5, fontWeight: 700 }}>Prospeo</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: formSourcingProvider === 'prospeo' ? '#99F6E4' : '#94A3B8' }}>
                      Recommandé
                    </span>
                  </button>

                  {/* Hunter Button */}
                  <button
                    type="button"
                    onClick={() => setFormSourcingProvider('hunter')}
                    style={{
                      padding: '12px 10px',
                      borderRadius: 8,
                      border: formSourcingProvider === 'hunter' ? '1px solid rgba(255, 169, 64, 0.5)' : '1px solid transparent',
                      background: formSourcingProvider === 'hunter' ? 'rgba(255, 169, 64, 0.16)' : 'transparent',
                      color: formSourcingProvider === 'hunter' ? '#FFA940' : '#CBD5E1',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Globe size={15} color={formSourcingProvider === 'hunter' ? '#FFA940' : '#CBD5E1'} />
                      <span style={{ fontSize: 13.5, fontWeight: 700 }}>Hunter</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: formSourcingProvider === 'hunter' ? '#FED7AA' : '#94A3B8' }}>
                      Moteur Alternatif
                    </span>
                  </button>
                </div>

                {/* Status & Routing Details */}
                <div style={{
                  background: 'rgba(4, 11, 22, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 8,
                  padding: '12px 14px',
                  fontSize: 12,
                  color: '#CBD5E1',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 7
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 500 }}>
                      <span style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: providerStatus?.sourcing?.hasProspeoUrl ? '#00E5C8' : '#F59E0B',
                        boxShadow: `0 0 6px ${providerStatus?.sourcing?.hasProspeoUrl ? '#00E5C8' : '#F59E0B'}`
                      }} />
                      Endpoint Prospeo :
                    </span>
                    <span style={{
                      color: providerStatus?.sourcing?.hasProspeoUrl ? '#00E5C8' : '#F59E0B',
                      fontWeight: 600,
                      fontSize: 11.5
                    }}>
                      {providerStatus?.sourcing?.hasProspeoUrl ? 'Détecté (.env)' : 'Non configuré'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 500 }}>
                      <span style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: providerStatus?.sourcing?.hasHunterUrl ? '#00E5C8' : '#F59E0B',
                        boxShadow: `0 0 6px ${providerStatus?.sourcing?.hasHunterUrl ? '#00E5C8' : '#F59E0B'}`
                      }} />
                      Endpoint Hunter :
                    </span>
                    <span style={{
                      color: providerStatus?.sourcing?.hasHunterUrl ? '#00E5C8' : '#F59E0B',
                      fontWeight: 600,
                      fontSize: 11.5
                    }}>
                      {providerStatus?.sourcing?.hasHunterUrl ? 'Détecté (.env)' : 'Non configuré'}
                    </span>
                  </div>

                  <div style={{
                    marginTop: 6,
                    paddingTop: 8,
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    fontSize: 11.5,
                    lineHeight: 1.5,
                    color: '#94A3B8'
                  }}>
                    💡 <strong style={{ color: '#F0F4F8' }}>Bascule transparente :</strong> La sauvegarde applique le routage instantanément aux prochaines exécutions et re-synchronise tous les plannings QStash actifs.
                  </div>
                </div>

                {/* Sourcing Leads Range Configuration (Min & Max Total Leads) */}
                <div style={{
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Sliders size={14} color="#00E5C8" />
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.02em' }}>
                        Plage de Leads Souhaitée (Total Leads)
                      </span>
                    </div>
                    <span style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 8,
                      background: 'rgba(0, 229, 200, 0.12)',
                      color: '#00E5C8',
                      border: '1px solid rgba(0, 229, 200, 0.3)',
                      fontWeight: 600
                    }}>
                      {formSourcingMinLeads} à {formSourcingMaxLeads} leads
                    </span>
                  </div>

                  <p style={{ margin: '0 0 12px 0', fontSize: 11.5, color: '#94A3B8', lineHeight: 1.45 }}>
                    Définit la fourchette autorisée proposée aux utilisateurs lors du lancement ou de la planification de leur agent de sourcing.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {/* Min Leads */}
                    <div style={{
                      background: 'rgba(4, 11, 22, 0.85)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 8,
                      padding: '8px 10px'
                    }}>
                      <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                        Minimum (Leads)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={formSourcingMaxLeads}
                        value={formSourcingMinLeads}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 1;
                          setFormSourcingMinLeads(Math.max(1, val));
                          if (val > formSourcingMaxLeads) {
                            setFormSourcingMaxLeads(val);
                          }
                        }}
                        style={{
                          width: '100%',
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: 6,
                          padding: '6px 10px',
                          color: '#FFFFFF',
                          fontSize: 14,
                          fontWeight: 700,
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* Max Leads */}
                    <div style={{
                      background: 'rgba(4, 11, 22, 0.85)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 8,
                      padding: '8px 10px'
                    }}>
                      <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                        Maximum (Leads)
                      </label>
                      <input
                        type="number"
                        min={formSourcingMinLeads}
                        value={formSourcingMaxLeads}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || formSourcingMinLeads;
                          setFormSourcingMaxLeads(Math.max(formSourcingMinLeads, val));
                        }}
                        style={{
                          width: '100%',
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: 6,
                          padding: '6px 10px',
                          color: '#FFFFFF',
                          fontSize: 14,
                          fontWeight: 700,
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Allow Existing Companies Option Visibility Configuration */}
                <div style={{
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Database size={14} color="#00E5C8" />
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.02em' }}>
                        Option « Entreprises Déjà Prospectées »
                      </span>
                    </div>
                    <span style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 8,
                      background: formAllowExistingVisible ? 'rgba(0, 229, 200, 0.12)' : 'rgba(255, 169, 64, 0.16)',
                      color: formAllowExistingVisible ? '#00E5C8' : '#FFA940',
                      border: `1px solid ${formAllowExistingVisible ? 'rgba(0, 229, 200, 0.3)' : 'rgba(255, 169, 64, 0.4)'}`,
                      fontWeight: 600
                    }}>
                      {formAllowExistingVisible ? 'Visible (Choix utilisateur)' : 'Masquée (Forcée à OUI)'}
                    </span>
                  </div>

                  <p style={{ margin: '0 0 10px 0', fontSize: 11.5, color: '#94A3B8', lineHeight: 1.45 }}>
                    Contrôle si la case à cocher apparaît aux utilisateurs dans les modales. Si masquée, elle est automatiquement activée à <strong>OUI</strong> en arrière-plan.
                  </p>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 8,
                    background: 'rgba(4, 11, 22, 0.75)',
                    padding: 5,
                    borderRadius: 10,
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <button
                      type="button"
                      onClick={() => setFormAllowExistingVisible(true)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: formAllowExistingVisible ? '1px solid rgba(0, 229, 200, 0.5)' : '1px solid transparent',
                        background: formAllowExistingVisible ? 'rgba(0, 229, 200, 0.16)' : 'transparent',
                        color: formAllowExistingVisible ? '#00E5C8' : '#CBD5E1',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        transition: 'all 0.18s ease'
                      }}
                    >
                      <Eye size={13} />
                      <span>Afficher l'option</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormAllowExistingVisible(false)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: !formAllowExistingVisible ? '1px solid rgba(255, 169, 64, 0.5)' : '1px solid transparent',
                        background: !formAllowExistingVisible ? 'rgba(255, 169, 64, 0.16)' : 'transparent',
                        color: !formAllowExistingVisible ? '#FFA940' : '#CBD5E1',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        transition: 'all 0.18s ease'
                      }}
                    >
                      <EyeOff size={13} />
                      <span>Masquer (Forcer OUI)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Provider Switcher Card */}
            <div style={{
              background: 'linear-gradient(145deg, rgba(8, 20, 38, 0.9) 0%, rgba(12, 28, 52, 0.75) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 16,
              padding: 20,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ArrowRightLeft size={16} color="#00E5C8" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Fournisseur LLM
                  </span>
                </div>
                <span style={{
                  fontSize: 11,
                  padding: '3px 10px',
                  borderRadius: 10,
                  fontWeight: 600,
                  background: formProviderMode === 'auto' ? 'rgba(0, 229, 200, 0.14)' : 'rgba(255, 255, 255, 0.08)',
                  color: formProviderMode === 'auto' ? '#00E5C8' : '#F0F4F8',
                  border: `1px solid ${formProviderMode === 'auto' ? 'rgba(0, 229, 200, 0.4)' : 'rgba(255, 255, 255, 0.14)'}`
                }}>
                  {formProviderMode === 'auto' ? 'Bascule Auto' : formProviderMode === 'claude' ? 'Claude Direct' : 'OmniRoute Direct'}
                </span>
              </div>

              {/* Segmented Control */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 6,
                background: 'rgba(4, 11, 22, 0.75)',
                padding: 5,
                borderRadius: 10,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                marginBottom: 14
              }}>
                <button
                  type="button"
                  onClick={() => setFormProviderMode('auto')}
                  style={{
                    padding: '10px 6px',
                    borderRadius: 7,
                    border: formProviderMode === 'auto' ? '1px solid rgba(0, 229, 200, 0.4)' : '1px solid transparent',
                    background: formProviderMode === 'auto' ? 'rgba(0, 229, 200, 0.16)' : 'transparent',
                    color: formProviderMode === 'auto' ? '#00E5C8' : '#CBD5E1',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  <Zap size={15} />
                  <span>Auto</span>
                  <span style={{ fontSize: 10.5, fontWeight: 500, color: formProviderMode === 'auto' ? '#99F6E4' : '#94A3B8' }}>Claude + Secours</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormProviderMode('claude')}
                  style={{
                    padding: '10px 6px',
                    borderRadius: 7,
                    border: formProviderMode === 'claude' ? '1px solid rgba(0, 229, 200, 0.4)' : '1px solid transparent',
                    background: formProviderMode === 'claude' ? 'rgba(0, 229, 200, 0.16)' : 'transparent',
                    color: formProviderMode === 'claude' ? '#00E5C8' : '#CBD5E1',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  <Bot size={15} />
                  <span>Claude</span>
                  <span style={{ fontSize: 10.5, fontWeight: 500, color: formProviderMode === 'claude' ? '#99F6E4' : '#94A3B8' }}>Anthropic</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormProviderMode('omniroute')}
                  style={{
                    padding: '10px 6px',
                    borderRadius: 7,
                    border: formProviderMode === 'omniroute' ? '1px solid rgba(0, 229, 200, 0.4)' : '1px solid transparent',
                    background: formProviderMode === 'omniroute' ? 'rgba(0, 229, 200, 0.16)' : 'transparent',
                    color: formProviderMode === 'omniroute' ? '#00E5C8' : '#CBD5E1',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  <Server size={15} />
                  <span>OmniRoute</span>
                  <span style={{ fontSize: 10.5, fontWeight: 500, color: formProviderMode === 'omniroute' ? '#99F6E4' : '#94A3B8' }}>Interne</span>
                </button>
              </div>

              {/* Status Note */}
              <div style={{
                background: 'rgba(4, 11, 22, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                padding: '12px 14px',
                fontSize: 12,
                color: '#CBD5E1',
                display: 'flex',
                flexDirection: 'column',
                gap: 7
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 500 }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: providerStatus?.hasClaudeCredentials ? '#00E5C8' : '#F59E0B',
                      boxShadow: `0 0 6px ${providerStatus?.hasClaudeCredentials ? '#00E5C8' : '#F59E0B'}`
                    }} />
                    Clé Claude (.env) :
                  </span>
                  <span style={{ color: providerStatus?.hasClaudeCredentials ? '#00E5C8' : '#F59E0B', fontWeight: 600 }}>
                    {providerStatus?.hasClaudeCredentials ? 'Configurée' : 'Absente (secours actif)'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 500 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00E5C8', boxShadow: '0 0 6px #00E5C8' }} />
                    OmniRoute :
                  </span>
                  <span style={{ color: '#00E5C8', fontWeight: 600 }}>
                    Prêt & Opérationnel
                  </span>
                </div>
              </div>
            </div>

            {/* Models & Hyperparameters Card */}
            <div style={{
              background: 'linear-gradient(145deg, rgba(8, 20, 38, 0.9) 0%, rgba(12, 28, 52, 0.75) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 16,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: 10 }}>
                <Cpu size={16} color="#00E5C8" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Modèles & Inférence
                </span>
              </div>

              {/* Primary Model */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12.5, color: '#CBD5E1', fontWeight: 600 }}>
                    Modèle Principal (Claude)
                  </label>
                  <span style={{ fontSize: 11, color: '#00E5C8', fontWeight: 700 }}>Priorité 1</span>
                </div>
                <input
                  type="text"
                  value={formModel}
                  onChange={(e) => setFormModel(e.target.value)}
                  placeholder="ex: claude-3-5-sonnet-20241022"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'rgba(4, 11, 22, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    borderRadius: 8,
                    padding: '9px 12px',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 600,
                    outline: 'none',
                    marginBottom: 8,
                    caretColor: '#00E5C8'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#00E5C8'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.14)'}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {CLAUDE_PRESETS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFormModel(m)}
                      style={{
                        background: formModel === m ? 'rgba(0, 229, 200, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${formModel === m ? '#00E5C8' : 'rgba(255, 255, 255, 0.1)'}`,
                        color: formModel === m ? '#00E5C8' : '#CBD5E1',
                        padding: '4px 9px',
                        borderRadius: 6,
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fallback Model */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12.5, color: '#CBD5E1', fontWeight: 600 }}>
                    Modèle de Secours (OmniRoute)
                  </label>
                  <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>Secours</span>
                </div>
                <input
                  type="text"
                  value={formFallbackModel}
                  onChange={(e) => setFormFallbackModel(e.target.value)}
                  placeholder="ex: reliable-providers"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'rgba(4, 11, 22, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    borderRadius: 8,
                    padding: '9px 12px',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 600,
                    outline: 'none',
                    marginBottom: 8,
                    caretColor: '#00E5C8'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#00E5C8'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.14)'}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {OMNIROUTE_PRESETS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFormFallbackModel(m)}
                      style={{
                        background: formFallbackModel === m ? 'rgba(0, 229, 200, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${formFallbackModel === m ? '#00E5C8' : 'rgba(255, 255, 255, 0.1)'}`,
                        color: formFallbackModel === m ? '#00E5C8' : '#CBD5E1',
                        padding: '4px 9px',
                        borderRadius: 6,
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Temperature Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12.5, color: '#CBD5E1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Thermometer size={15} color="#00E5C8" />
                    <span>Température</span>
                  </label>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: '#00E5C8', fontFamily: 'monospace' }}>
                    {formTemperature.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={formTemperature}
                  onChange={(e) => setFormTemperature(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#00E5C8', cursor: 'pointer', height: 6 }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94A3B8', marginTop: 4, fontWeight: 500 }}>
                  <span>0.0 (Précis)</span>
                  <span>0.5 (Équilibré)</span>
                  <span>1.0 (Créatif)</span>
                </div>
              </div>

              {/* Max Tokens */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12.5, color: '#CBD5E1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Hash size={15} color="#00E5C8" />
                    <span>Tokens Max</span>
                  </label>
                  <span style={{ fontSize: 11.5, color: '#94A3B8', fontWeight: 500 }}>50 – 4096</span>
                </div>
                <input
                  type="number"
                  min={50}
                  max={4096}
                  step={50}
                  value={formMaxTokens}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (isNaN(v)) {
                      setFormMaxTokens(1000);
                    } else {
                      setFormMaxTokens(Math.min(4096, Math.max(50, v)));
                    }
                  }}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'rgba(4, 11, 22, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    borderRadius: 8,
                    padding: '9px 12px',
                    color: '#FFFFFF',
                    fontSize: 13.5,
                    outline: 'none',
                    caretColor: '#00E5C8'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#00E5C8'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.14)'}
                />
              </div>

              {/* Streaming Toggle */}
              <div>
                <label style={{ fontSize: 12.5, color: '#CBD5E1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Radio size={15} color="#00E5C8" />
                  <span>Mode Streaming (SSE)</span>
                </label>
                <div
                  onClick={() => setFormIsStream(!formIsStream)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: formIsStream ? 'rgba(0, 229, 200, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${formIsStream ? 'rgba(0, 229, 200, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: formIsStream ? '#00E5C8' : '#CBD5E1' }}>
                    {formIsStream ? 'Activé (Flux progressif)' : 'Désactivé (Standard)'}
                  </span>
                  <div style={{
                    width: 34, height: 18, borderRadius: 12,
                    background: formIsStream ? '#00E5C8' : 'rgba(255, 255, 255, 0.15)',
                    position: 'relative', transition: 'all 0.18s ease'
                  }}>
                    <div style={{
                      width: 14, height: 14, borderRadius: '50%',
                      background: formIsStream ? '#04111D' : '#CBD5E1',
                      position: 'absolute', top: 2,
                      left: formIsStream ? 18 : 2,
                      transition: 'all 0.18s ease'
                    }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons at bottom of side panel */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || loading}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #00E5C8 0%, #00C2A8 100%)',
                  border: 'none',
                  color: '#04111D',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 0 16px rgba(0, 229, 200, 0.35)',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                {saving ? <Loader2 size={15} className="spin" /> : <Save size={15} />}
                <span>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowTestModal(true);
                  setTestUserMessage(
                    activeKey === 'prospect_onboarding_chat'
                      ? "Bonjour ! Je m'appelle Thomas, directeur commercial chez CloudSecure. Nous vendons une solution de cybersécurité pour les PME."
                      : "Directeurs logistique en France dans le secteur du transport"
                  );
                }}
                disabled={loading}
                style={{
                  padding: '12px 18px',
                  borderRadius: 10,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#F0F4F8',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                <Play size={15} />
                <span>Tester</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Live Test Modal — Refined Dark Glassmorphic Aesthetic */}
      {showTestModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(2, 6, 14, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          zIndex: 999999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24
        }}>
          <div style={{
            width: '100%', maxWidth: 780,
            background: 'linear-gradient(145deg, rgba(8, 20, 38, 0.98) 0%, rgba(12, 28, 52, 0.95) 100%)',
            border: '1px solid rgba(0, 229, 200, 0.35)',
            borderRadius: 16,
            padding: 24,
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 229, 200, 0.12)',
            display: 'flex', flexDirection: 'column', gap: 18,
            position: 'relative'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.12)', paddingBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'rgba(0, 229, 200, 0.12)', border: '1px solid rgba(0, 229, 200, 0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Play size={16} color="#00E5C8" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                    Test en direct : {formName || activeKey}
                  </h3>
                  <span style={{ fontSize: 12, color: '#94A3B8' }}>Simulation en conditions réelles avec le moteur sélectionné</span>
                </div>
              </div>
              <button
                onClick={() => setShowTestModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#CBD5E1',
                  borderRadius: 8,
                  cursor: 'pointer',
                  padding: '6px 8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Test Input */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#CBD5E1', fontWeight: 700 }}>
                  Message utilisateur simulé
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setTestUserMessage(
                      activeKey === 'prospect_onboarding_chat'
                        ? "Bonjour ! Je m'appelle Thomas, directeur commercial chez CloudSecure. Nous vendons une solution de cybersécurité pour les PME."
                        : "Directeurs logistique en France dans le secteur du transport"
                    )}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: 6, padding: '4px 10px', fontSize: 11.5,
                      color: '#CBD5E1', cursor: 'pointer', fontWeight: 600
                    }}
                  >
                    💼 Dialogue Onboarding
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestUserMessage("Donne-moi 3 idées d'accroches d'approche originales et percutantes pour contacter un prospect B2B.")}
                    style={{
                      background: 'rgba(0, 229, 200, 0.12)',
                      border: '1px solid rgba(0, 229, 200, 0.35)',
                      borderRadius: 6, padding: '4px 10px', fontSize: 11.5,
                      color: '#00E5C8', cursor: 'pointer', fontWeight: 700
                    }}
                  >
                    ✨ Test de Température (Créatif)
                  </button>
                </div>
              </div>
              <textarea
                value={testUserMessage}
                onChange={(e) => setTestUserMessage(e.target.value)}
                rows={3}
                placeholder="Tapez un message pour tester le prompt en conditions réelles..."
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(4, 11, 22, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  borderRadius: 8, padding: 12,
                  color: '#FFFFFF', fontSize: 13.5,
                  outline: 'none', resize: 'vertical',
                  caretColor: '#00E5C8'
                }}
                onFocus={(e) => e.target.style.borderColor = '#00E5C8'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.14)'}
              />
            </div>

            {/* Test Action */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#CBD5E1' }}>
                <Thermometer size={15} color="#00E5C8" />
                <span>Température active : <b style={{ color: '#00E5C8', fontFamily: 'monospace' }}>{formTemperature.toFixed(2)}</b></span>
              </div>
              <button
                type="button"
                onClick={handleRunTest}
                disabled={testLoading}
                style={{
                  padding: '9px 20px', borderRadius: 8,
                  background: 'linear-gradient(135deg, #00E5C8 0%, #00C2A8 100%)',
                  color: '#04111D',
                  fontWeight: 700, fontSize: 13, border: 'none',
                  cursor: testLoading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 0 16px rgba(0, 229, 200, 0.35)'
                }}
              >
                {testLoading ? (
                  <>
                    <Loader2 size={15} className="spin" />
                    <span>Inférence en cours...</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Envoyer le test</span>
                  </>
                )}
              </button>
            </div>

            {/* Response Output */}
            {testResponse && (
              <div style={{
                background: 'rgba(4, 11, 22, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 10, padding: 16,
                display: 'flex', flexDirection: 'column', gap: 12
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, color: '#CBD5E1', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ color: '#00E5C8', fontWeight: 700 }}>Réponse IA :</span>
                  {testMetrics && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 6, fontWeight: 700,
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: testMetrics.providerUsed === 'claude' ? '#00E5C8' : '#60A5FA',
                        border: '1px solid rgba(255, 255, 255, 0.12)'
                      }}>
                        {testMetrics.providerUsed === 'claude' ? 'Claude' : 'OmniRoute'}
                      </span>
                      {testMetrics.fallbackTriggered && (
                        <span style={{
                          padding: '2px 8px', borderRadius: 6, fontWeight: 700,
                          background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B',
                          border: '1px solid rgba(245, 158, 11, 0.35)',
                          display: 'inline-flex', alignItems: 'center', gap: 4
                        }}>
                          <AlertTriangle size={12} />
                          <span>Secours activé</span>
                        </span>
                      )}
                      <span>Modèle : <b style={{ color: '#F0F4F8' }}>{testMetrics.modelUsed}</b></span>
                      <span>Température : <b style={{ color: '#00E5C8', fontFamily: 'monospace' }}>{(testMetrics.temperature !== undefined ? testMetrics.temperature : formTemperature).toFixed(2)}</b></span>
                      <span>Latence : <b style={{ color: '#00E5C8' }}>{testMetrics.durationMs}ms</b></span>
                    </div>
                  )}
                </div>
                <div style={{
                  whiteSpace: 'pre-wrap', color: '#F1F5F9',
                  fontSize: 14, lineHeight: '1.65',
                  fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, Monaco, monospace',
                  maxHeight: 320, overflowY: 'auto',
                  padding: 12, borderRadius: 8,
                  background: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  {testResponse}
                </div>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 8, padding: '10px 14px',
                  fontSize: 12, color: '#94A3B8', lineHeight: 1.55
                }}>
                  💡 <strong style={{ color: '#F0F4F8' }}>Comportement de la Température :</strong> Les prompts avec des règles de cadrage strictes (ex: extraction en 4 étapes ou JSON strict) restent volontairement disciplinés même à T=1.0. Pour constater une forte diversité lexicale, testez une consigne ouverte comme <span style={{ color: '#00E5C8', fontWeight: 600 }}>✨ Test de Température (Créatif)</span>.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
