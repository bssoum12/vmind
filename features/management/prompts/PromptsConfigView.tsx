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
  ArrowLeft
} from 'lucide-react';
import { useToast } from '@/shared/contexts/ToastContext';

type ProviderMode = 'auto' | 'claude' | 'omniroute';

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
}

interface ProviderStatus {
  hasClaudeCredentials: boolean;
  claudeBaseUrl: string;
  omniRouteBaseUrl: string;
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL ;

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
        headers: getAuthHeaders(),
        credentials: 'include'
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

  const handleSave = async () => {
    if (!formPromptText.trim() || formPromptText.trim().length < 10) {
      showToast('Le texte du prompt système doit contenir au moins 10 caractères.', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/prompts/${activeKey}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          name: formName,
          prompt_text: formPromptText,
          provider_mode: formProviderMode,
          model: formModel,
          fallback_model: formFallbackModel,
          temperature: formTemperature,
          max_tokens: formMaxTokens,
          is_stream: formIsStream,
          description: formDescription
        })
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'Échec de la sauvegarde du prompt');
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
        headers: getAuthHeaders(),
        credentials: 'include'
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'Échec de la réinitialisation');
      }

      loadPromptIntoForm(data.prompt);
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
        headers: getAuthHeaders(),
        credentials: 'include',
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
        height: '100%', minHeight: 450, padding: 32, textAlign: 'center', color: '#8FA3B8'
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(255, 71, 87, 0.1)', border: '1px solid rgba(255, 71, 87, 0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16
        }}>
          <ShieldCheck size={28} color="#FF4757" />
        </div>
        <h2 style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
          Accès Strictement Réservé aux Administrateurs
        </h2>
        <p style={{ maxWidth: 440, fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
          Vous ne disposez pas des privilèges administrateur requis pour consulter ou modifier les instructions système et configurations de modèles LLM.
        </p>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', borderRadius: 8,
              background: 'rgba(0, 229, 200, 0.1)', border: '1px solid #00E5C8',
              color: '#00E5C8', fontSize: 13, fontWeight: 600, cursor: 'pointer'
            }}
          >
            <ArrowLeft size={14} />
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
        padding: '24px 32px 64px',
        boxSizing: 'border-box',
        color: '#E2E8F0',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* View Header with Action Bar — Always accessible at the top */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 20,
        paddingBottom: 16,
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
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
                gap: 6,
                padding: '4px 10px',
                marginBottom: 10,
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 6,
                color: '#8FA3B8',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#00E5C8';
                e.currentTarget.style.borderColor = 'rgba(0, 229, 200, 0.3)';
                e.currentTarget.style.background = 'rgba(0, 229, 200, 0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#8FA3B8';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
              }}
            >
              <ArrowLeft size={13} />
              <span>Retour au Marketplace</span>
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(0, 229, 200, 0.08)',
              border: '1px solid rgba(0, 229, 200, 0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Bot size={18} color="#00E5C8" />
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
              Configuration des Prompts IA & Inférence
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: '#8FA3B8' }}>
            Ajustez les instructions système, modèles et fournisseurs LLM. Modifications instantanées en RAM sans redémarrage.
          </p>
        </div>

        {/* Top Sticky/Accessible Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={fetchPrompts}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 12px', borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#8FA3B8', fontSize: 12, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s'
            }}
            title="Actualiser depuis la base de données"
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            <span>Actualiser</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={resetting || saving || loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 12px', borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#8FA3B8', fontSize: 12, fontWeight: 600,
              cursor: resetting ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s'
            }}
            title="Rétablir les valeurs d'origine de ce prompt"
          >
            <RotateCcw size={13} />
            <span>Rétablir</span>
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
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8,
              background: 'rgba(0, 229, 200, 0.08)',
              border: '1px solid rgba(0, 229, 200, 0.3)',
              color: '#00E5C8', fontSize: 12, fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <Play size={13} />
            <span>Tester en direct</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8,
              background: '#00E5C8',
              border: 'none',
              color: '#04111D', fontSize: 12, fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s'
            }}
          >
            {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
            <span>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Selector */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 20, flexShrink: 0
      }}>
        <button
          onClick={() => handleSelectTab('prospect_onboarding_chat')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 8,
            background: activeKey === 'prospect_onboarding_chat' ? 'rgba(0, 229, 200, 0.1)' : 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${activeKey === 'prospect_onboarding_chat' ? '#00E5C8' : 'rgba(255, 255, 255, 0.08)'}`,
            color: activeKey === 'prospect_onboarding_chat' ? '#00E5C8' : '#8FA3B8',
            fontWeight: 600, fontSize: 12, cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          <Sparkles size={14} />
          <span>🎯 Prospection — Stratégie d'Emails</span>
          <span style={{
            fontSize: 9, padding: '1px 6px', borderRadius: 10,
            background: 'rgba(255, 255, 255, 0.06)', color: activeKey === 'prospect_onboarding_chat' ? '#00E5C8' : '#8FA3B8'
          }}>
            Prospect Wizard
          </span>
        </button>

        <button
          onClick={() => handleSelectTab('sourcing_execution_chat')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 8,
            background: activeKey === 'sourcing_execution_chat' ? 'rgba(0, 229, 200, 0.1)' : 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${activeKey === 'sourcing_execution_chat' ? '#00E5C8' : 'rgba(255, 255, 255, 0.08)'}`,
            color: activeKey === 'sourcing_execution_chat' ? '#00E5C8' : '#8FA3B8',
            fontWeight: 600, fontSize: 12, cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          <Zap size={14} />
          <span>⚡ Sourcing — Ciblage ICP & Profils</span>
          <span style={{
            fontSize: 9, padding: '1px 6px', borderRadius: 10,
            background: 'rgba(255, 255, 255, 0.06)', color: activeKey === 'sourcing_execution_chat' ? '#00E5C8' : '#8FA3B8'
          }}>
            Sourcing Modals
          </span>
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320, gap: 10, color: '#8FA3B8' }}>
          <Loader2 size={20} className="spin" color="#00E5C8" />
          <span style={{ fontSize: 13 }}>Chargement des configurations...</span>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 380px', 
          gap: 20, 
          alignItems: 'start',
          flex: 1
        }}>
          
          {/* Main Column: System Prompt Text Editor */}
          <div style={{
            background: 'rgba(9, 18, 32, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 12,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#00E5C8', fontWeight: 700 }}>
                  Nom & Rôle du Prompt
                </label>
                {lastUpdatedAt && (
                  <span style={{ fontSize: 11, color: '#64748B' }}>
                    Dernière synchro : <span style={{ color: '#94A3B8' }}>{lastUpdatedAt}</span>
                  </span>
                )}
              </div>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 6,
                  padding: '8px 12px',
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: 600,
                  width: '100%',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8FA3B8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>Instruction Système (System Prompt)</span>
                  <span style={{ fontSize: 10, color: '#00E5C8', background: 'rgba(0, 229, 200, 0.08)', padding: '1px 6px', borderRadius: 4 }}>
                    0ms Latence RAM
                  </span>
                </label>
                <span style={{ fontSize: 11, color: '#64748B' }}>
                  {formPromptText.length} caractères | {formPromptText.split(/\s+/).filter(Boolean).length} mots
                </span>
              </div>

              <textarea
                value={formPromptText}
                onChange={(e) => setFormPromptText(e.target.value)}
                rows={19}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'rgba(4, 9, 16, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 8,
                  padding: 14,
                  color: '#CBD5E1',
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  fontSize: 12.5,
                  lineHeight: '1.6',
                  resize: 'vertical',
                  outline: 'none',
                  caretColor: '#00E5C8'
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Description technique / Cas d'usage
              </label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Description du rôle de ce prompt..."
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: 6,
                  padding: '7px 10px',
                  color: '#8FA3B8',
                  fontSize: 12,
                  width: '100%',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Side Column: Controls & Parameters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Provider Switcher Card (Matte & Harmonious) */}
            <div style={{
              background: 'rgba(9, 18, 32, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 12,
              padding: 16
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ArrowRightLeft size={14} color="#00E5C8" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Fournisseur LLM
                  </span>
                </div>
                <span style={{
                  fontSize: 10,
                  padding: '2px 8px',
                  borderRadius: 8,
                  fontWeight: 600,
                  background: formProviderMode === 'auto' ? 'rgba(0, 229, 200, 0.1)' : 'rgba(255, 255, 255, 0.06)',
                  color: formProviderMode === 'auto' ? '#00E5C8' : '#CBD5E1',
                  border: `1px solid ${formProviderMode === 'auto' ? 'rgba(0, 229, 200, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`
                }}>
                  {formProviderMode === 'auto' ? 'Bascule Auto' : formProviderMode === 'claude' ? 'Claude Direct' : 'OmniRoute Direct'}
                </span>
              </div>

              {/* Segmented Control */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 4,
                background: 'rgba(4, 9, 16, 0.6)',
                padding: 4,
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.06)',
                marginBottom: 12
              }}>
                <button
                  type="button"
                  onClick={() => setFormProviderMode('auto')}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 6,
                    border: 'none',
                    background: formProviderMode === 'auto' ? 'rgba(0, 229, 200, 0.15)' : 'transparent',
                    color: formProviderMode === 'auto' ? '#00E5C8' : '#8FA3B8',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                    transition: 'all 0.15s'
                  }}
                >
                  <Zap size={13} />
                  <span>Auto</span>
                  <span style={{ fontSize: 9, opacity: 0.7, fontWeight: 500 }}>Claude + Secours</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormProviderMode('claude')}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 6,
                    border: 'none',
                    background: formProviderMode === 'claude' ? 'rgba(0, 229, 200, 0.15)' : 'transparent',
                    color: formProviderMode === 'claude' ? '#00E5C8' : '#8FA3B8',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                    transition: 'all 0.15s'
                  }}
                >
                  <Bot size={13} />
                  <span>Claude</span>
                  <span style={{ fontSize: 9, opacity: 0.7, fontWeight: 500 }}>Anthropic</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormProviderMode('omniroute')}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 6,
                    border: 'none',
                    background: formProviderMode === 'omniroute' ? 'rgba(0, 229, 200, 0.15)' : 'transparent',
                    color: formProviderMode === 'omniroute' ? '#00E5C8' : '#8FA3B8',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                    transition: 'all 0.15s'
                  }}
                >
                  <Server size={13} />
                  <span>OmniRoute</span>
                  <span style={{ fontSize: 9, opacity: 0.7, fontWeight: 500 }}>Interne</span>
                </button>
              </div>

              {/* Status Note */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: 6,
                padding: '8px 10px',
                fontSize: 11,
                color: '#8FA3B8',
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: providerStatus?.hasClaudeCredentials ? '#00E5C8' : '#F59E0B' }} />
                    Clé Claude (.env) :
                  </span>
                  <span style={{ color: providerStatus?.hasClaudeCredentials ? '#00E5C8' : '#F59E0B', fontWeight: 600 }}>
                    {providerStatus?.hasClaudeCredentials ? 'Configurée' : 'Absente (secours actif)'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00E5C8' }} />
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
              background: 'rgba(9, 18, 32, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 12,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 14
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: 8 }}>
                <Cpu size={14} color="#00E5C8" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Modèles & Inférence
                </span>
              </div>

              {/* Primary Model */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ fontSize: 11, color: '#CBD5E1', fontWeight: 600 }}>
                    Modèle Principal (Claude)
                  </label>
                  <span style={{ fontSize: 10, color: '#00E5C8', fontWeight: 600 }}>Priorité 1</span>
                </div>
                <input
                  type="text"
                  value={formModel}
                  onChange={(e) => setFormModel(e.target.value)}
                  placeholder="ex: claude-3-5-sonnet-20241022"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'rgba(4, 9, 16, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 6,
                    padding: '7px 10px',
                    color: '#FFFFFF',
                    fontSize: 12,
                    fontWeight: 600,
                    outline: 'none',
                    marginBottom: 6
                  }}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {CLAUDE_PRESETS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFormModel(m)}
                      style={{
                        background: formModel === m ? 'rgba(0, 229, 200, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${formModel === m ? '#00E5C8' : 'rgba(255, 255, 255, 0.06)'}`,
                        color: formModel === m ? '#00E5C8' : '#8FA3B8',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 10,
                        cursor: 'pointer'
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fallback Model */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ fontSize: 11, color: '#CBD5E1', fontWeight: 600 }}>
                    Modèle de Secours (OmniRoute)
                  </label>
                  <span style={{ fontSize: 10, color: '#8FA3B8', fontWeight: 600 }}>Secours</span>
                </div>
                <input
                  type="text"
                  value={formFallbackModel}
                  onChange={(e) => setFormFallbackModel(e.target.value)}
                  placeholder="ex: reliable-providers"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'rgba(4, 9, 16, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 6,
                    padding: '7px 10px',
                    color: '#FFFFFF',
                    fontSize: 12,
                    fontWeight: 600,
                    outline: 'none',
                    marginBottom: 6
                  }}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {OMNIROUTE_PRESETS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFormFallbackModel(m)}
                      style={{
                        background: formFallbackModel === m ? 'rgba(0, 229, 200, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${formFallbackModel === m ? '#00E5C8' : 'rgba(255, 255, 255, 0.06)'}`,
                        color: formFallbackModel === m ? '#00E5C8' : '#8FA3B8',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 10,
                        cursor: 'pointer'
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Temperature Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ fontSize: 11, color: '#8FA3B8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Thermometer size={13} color="#00E5C8" />
                    <span>Température</span>
                  </label>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#00E5C8', fontFamily: 'monospace' }}>
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
                  style={{ width: '100%', accentColor: '#00E5C8', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#64748B', marginTop: 2 }}>
                  <span>0.0 (Précis)</span>
                  <span>0.5 (Équilibré)</span>
                  <span>1.0 (Créatif)</span>
                </div>
              </div>

              {/* Max Tokens */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ fontSize: 11, color: '#8FA3B8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Hash size={13} color="#00E5C8" />
                    <span>Tokens Max</span>
                  </label>
                  <span style={{ fontSize: 10, color: '#64748B' }}>50 – 4096</span>
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
                    background: 'rgba(4, 9, 16, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 6,
                    padding: '7px 10px',
                    color: '#FFFFFF',
                    fontSize: 12,
                    outline: 'none'
                  }}
                />
              </div>

              {/* Streaming Toggle */}
              <div>
                <label style={{ fontSize: 11, color: '#8FA3B8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <Radio size={13} color="#00E5C8" />
                  <span>Mode Streaming (SSE)</span>
                </label>
                <div
                  onClick={() => setFormIsStream(!formIsStream)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 6,
                    background: formIsStream ? 'rgba(0, 229, 200, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${formIsStream ? 'rgba(0, 229, 200, 0.3)' : 'rgba(255, 255, 255, 0.06)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 600, color: formIsStream ? '#00E5C8' : '#8FA3B8' }}>
                    {formIsStream ? 'Activé (Flux)' : 'Désactivé (Standard)'}
                  </span>
                  <div style={{
                    width: 30, height: 16, borderRadius: 10,
                    background: formIsStream ? '#00E5C8' : 'rgba(255, 255, 255, 0.1)',
                    position: 'relative', transition: 'all 0.15s'
                  }}>
                    <div style={{
                      width: 12, height: 12, borderRadius: '50%',
                      background: formIsStream ? '#04111D' : '#8FA3B8',
                      position: 'absolute', top: 2,
                      left: formIsStream ? 16 : 2,
                      transition: 'all 0.15s'
                    }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Secondary Action Buttons at bottom of side panel */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || loading}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: 8,
                  background: '#00E5C8',
                  border: 'none',
                  color: '#04111D',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                {saving ? <Loader2 size={13} className="spin" /> : <Save size={13} />}
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
                  padding: '9px 14px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#CBD5E1',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Play size={13} />
                <span>Tester</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Live Test Modal — Refined Dark Aesthetic */}
      {showTestModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(2, 6, 12, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 999999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            width: '100%', maxWidth: 700,
            background: 'rgba(8, 16, 28, 0.98)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 12,
            padding: 20,
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
            display: 'flex', flexDirection: 'column', gap: 14
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Play size={16} color="#00E5C8" />
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>
                  Test en direct : {formName || activeKey}
                </h3>
              </div>
              <button
                onClick={() => setShowTestModal(false)}
                style={{ background: 'none', border: 'none', color: '#8FA3B8', cursor: 'pointer', padding: 4 }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Test Input */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8FA3B8', fontWeight: 600 }}>
                  Message utilisateur simulé
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setTestUserMessage(
                      activeKey === 'prospect_onboarding_chat'
                        ? "Bonjour ! Je m'appelle Thomas, directeur commercial chez CloudSecure. Nous vendons une solution de cybersécurité pour les PME."
                        : "Directeurs logistique en France dans le secteur du transport"
                    )}
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 4, padding: '2px 8px', fontSize: 10,
                      color: '#94A3B8', cursor: 'pointer'
                    }}
                  >
                    💼 Dialogue Onboarding
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestUserMessage("Donne-moi 3 idées d'accroches d'approche originales et percutantes pour contacter un prospect B2B.")}
                    style={{
                      background: 'rgba(0, 229, 200, 0.08)',
                      border: '1px solid rgba(0, 229, 200, 0.25)',
                      borderRadius: 4, padding: '2px 8px', fontSize: 10,
                      color: '#00E5C8', cursor: 'pointer', fontWeight: 600
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
                placeholder="Tapez un message pour tester le prompt..."
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(4, 9, 16, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 6, padding: 10,
                  color: '#FFFFFF', fontSize: 12.5,
                  outline: 'none', resize: 'vertical'
                }}
              />
            </div>

            {/* Test Action */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#8FA3B8' }}>
                <Thermometer size={13} color="#00E5C8" />
                <span>Température active : <b style={{ color: '#00E5C8', fontFamily: 'monospace' }}>{formTemperature.toFixed(2)}</b></span>
              </div>
              <button
                type="button"
                onClick={handleRunTest}
                disabled={testLoading}
                style={{
                  padding: '7px 16px', borderRadius: 6,
                  background: '#00E5C8', color: '#04111D',
                  fontWeight: 700, fontSize: 12, border: 'none',
                  cursor: testLoading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                {testLoading ? (
                  <>
                    <Loader2 size={13} className="spin" />
                    <span>Inférence en cours...</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    <span>Envoyer le test</span>
                  </>
                )}
              </button>
            </div>

            {/* Response Output */}
            {testResponse && (
              <div style={{
                background: 'rgba(4, 9, 16, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 8, padding: 14,
                display: 'flex', flexDirection: 'column', gap: 10
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#8FA3B8', flexWrap: 'wrap', gap: 6 }}>
                  <span style={{ color: '#00E5C8', fontWeight: 700 }}>Réponse IA :</span>
                  {testMetrics && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '1px 6px', borderRadius: 4, fontWeight: 600,
                        background: 'rgba(255, 255, 255, 0.06)',
                        color: testMetrics.providerUsed === 'claude' ? '#00E5C8' : '#60A5FA',
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                      }}>
                        {testMetrics.providerUsed === 'claude' ? 'Claude' : 'OmniRoute'}
                      </span>
                      {testMetrics.fallbackTriggered && (
                        <span style={{
                          padding: '1px 6px', borderRadius: 4, fontWeight: 600,
                          background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B',
                          border: '1px solid rgba(245, 158, 11, 0.25)',
                          display: 'inline-flex', alignItems: 'center', gap: 3
                        }}>
                          <AlertTriangle size={10} />
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
                  whiteSpace: 'pre-wrap', color: '#CBD5E1',
                  fontSize: 12.5, lineHeight: '1.6', fontFamily: 'monospace',
                  maxHeight: 280, overflowY: 'auto'
                }}>
                  {testResponse}
                </div>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: 6, padding: '8px 10px',
                  fontSize: 11, color: '#64748B', lineHeight: 1.5
                }}>
                  💡 <strong style={{ color: '#8FA3B8' }}>Comportement de la Température :</strong> Les prompts avec des règles de cadrage strictes (ex: extraction en 4 étapes ou JSON strict) restent volontairement disciplinés même à T=1.0. Pour constater une forte diversité lexicale, testez une consigne ouverte comme <span style={{ color: '#00E5C8' }}>✨ Test de Température (Créatif)</span>.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
