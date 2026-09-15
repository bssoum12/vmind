'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Link2, Shield, ShieldCheck, X, Database, ChevronDown, ChevronUp, Eye, EyeOff, FileEdit, Zap } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserInfo {
  username: string;
  client_id: string;
  roles: string[];
  allowedAgents: string[];
}

type AuthLevel = 'always' | 'approval' | 'denied';
type AccessType = 'read' | 'write' | 'sensitive';

interface ToolMeta {
  name: string;
  description: string;
  agent: string;
  accessType: AccessType;
  authLevel: AuthLevel;
}


// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Robustly extract the VMIND session token from localStorage.
 * Handles multiple storage formats gracefully.
 */
function getVmindSessionToken(): string | null {
  try {
    const raw = localStorage.getItem('vmind_session');
    if (!raw) {
      console.warn('[Connectors] vmind_session: clé absente dans localStorage');
      return null;
    }

    // Try direct string (raw JWT)
    if (raw.startsWith('eyJ')) {
      console.log('[Connectors] vmind_session: format token direct trouvé');
      return raw;
    }

    const parsed = JSON.parse(raw);
    // Various formats: { token }, { access_token }, { user: { token } }, { data: { token } }
    const token =
      parsed?.token ||
      parsed?.access_token ||
      parsed?.user?.token ||
      parsed?.data?.token ||
      null;

    if (token) {
      console.log('[Connectors] vmind_session: token extrait avec succès (format JSON)');
    } else {
      console.warn('[Connectors] vmind_session: clé trouvée mais aucun token valide dans la structure JSON', Object.keys(parsed));
    }
    return token;
  } catch (err) {
    console.error('[Connectors] vmind_session: erreur de parsing JSON', err);
    return null;
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const AUTH_BADGE: Record<AuthLevel, { label: string; bg: string; color: string }> = {
  always:   { label: 'Toujours autoriser',      bg: 'rgba(0, 229, 200, 0.1)',  color: '#00E5C8' },
  approval: { label: 'Nécessite approbation',   bg: 'rgba(255, 193, 7, 0.1)',  color: '#ffc107' },
  denied:   { label: 'Non autorisé',            bg: 'rgba(255, 71, 87, 0.1)',  color: '#ff4757' },
};

const ACCESS_ICON: Record<AccessType, React.ReactNode> = {
  read:      <Eye size={13} />,
  write:     <FileEdit size={13} />,
  sensitive: <Zap size={13} />,
};

const ACCESS_LABEL: Record<AccessType, string> = {
  read:      'Lecture seule',
  write:     'Écriture',
  sensitive: 'Action sensible',
};

const AGENT_COLORS: Record<string, { bg: string; color: string }> = {
  VFIN:  { bg: 'rgba(0, 229, 200, 0.1)',  color: '#00E5C8' },
  VDATA: { bg: 'rgba(130, 80, 255, 0.1)', color: '#8250FF' },
  VSELL: { bg: 'rgba(255, 130, 0, 0.1)',  color: '#FF8200' },
  VMOVE: { bg: 'rgba(50, 170, 255, 0.1)', color: '#32AAFF' },
  VBUY:  { bg: 'rgba(255, 71, 87, 0.1)',  color: '#ff4757' },
  VSTOCK:{ bg: 'rgba(0, 200, 100, 0.1)',  color: '#00C864' },
};

function ToolRow({ tool, isAuthorized }: { tool: ToolMeta; isAuthorized: boolean }) {
  const badge = isAuthorized ? AUTH_BADGE[tool.authLevel] : AUTH_BADGE['denied'];
  const agentStyle = AGENT_COLORS[tool.agent] || { bg: 'rgba(255,255,255,0.05)', color: '#8FA3B8' };
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="tool-row-item"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 18px',
        gap: '12px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        transition: 'all 0.2s ease',
        opacity: isAuthorized ? 1 : 0.45,
        background: isHovered ? 'rgba(0, 229, 200, 0.04)' : 'transparent',
        position: 'relative',
        cursor: 'default',
        flexWrap: 'wrap',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Left: Icon + Name + Description */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '220px' }}>
        <div style={{
          color: isAuthorized ? '#00E5C8' : '#4A5E72',
          flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '28px', height: '28px', borderRadius: '6px',
          background: 'rgba(0, 229, 200, 0.06)',
          border: '1px solid rgba(0, 229, 200, 0.15)',
        }}>
          {ACCESS_ICON[tool.accessType]}
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: isAuthorized ? '#FFFFFF' : '#6A7E95', fontFamily: 'monospace' }}>
              {tool.name}
            </span>
            <span style={{ fontSize: '10px', color: '#6A7E95', background: 'rgba(255,255,255,0.04)', padding: '1px 6px', borderRadius: '4px' }}>
              {ACCESS_LABEL[tool.accessType]}
            </span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#8FA3B8', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {tool.description}
          </div>
        </div>
      </div>

      {/* Right: Agent Badge & Auth Badge (fluid hover transition) */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        flexShrink: 0, marginLeft: 'auto',
        transition: 'all 0.2s ease',
      }}>
        <div style={{
          padding: '3px 8px', borderRadius: '6px', fontSize: '10.5px', fontWeight: 800,
          background: agentStyle.bg, color: agentStyle.color,
          border: `1px solid ${agentStyle.color}40`,
          letterSpacing: '0.04em',
        }}>
          {tool.agent}
        </div>

        <div style={{
          padding: '4px 10px', borderRadius: '14px', fontSize: '11px', fontWeight: 600,
          background: badge.bg, color: badge.color,
          border: `1px solid ${badge.color}35`,
          whiteSpace: 'nowrap',
        }}>
          {badge.label}
        </div>
      </div>
    </div>
  );
}

function ToolSection({ title, tools, authorizedNames, collapsible = false }: {
  title: string;
  tools: ToolMeta[];
  authorizedNames: Set<string>;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(true);
  if (tools.length === 0) return null;

  return (
    <div style={{
      background: 'rgba(5, 12, 24, 0.4)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '12px',
      overflow: 'hidden',
      marginBottom: '16px',
    }}>
      <div
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 20px',
          background: 'rgba(255,255,255,0.02)',
          borderBottom: open ? '1px solid rgba(255,255,255,0.05)' : 'none',
          cursor: collapsible ? 'pointer' : 'default',
        }}
        onClick={() => collapsible && setOpen(v => !v)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={15} color="#8FA3B8" />
          <span style={{ fontSize: '13px', fontWeight: 700 }}>{title}</span>
          <span style={{ fontSize: '12px', color: '#6A7E95', background: 'rgba(255,255,255,0.05)', padding: '1px 8px', borderRadius: '10px' }}>
            {tools.length}
          </span>
        </div>
        {collapsible && (open ? <ChevronUp size={16} color="#6A7E95" /> : <ChevronDown size={16} color="#6A7E95" />)}
      </div>
      {open && (
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
          <div style={{ minWidth: '540px' }}>
            {tools.map(tool => (
              <ToolRow key={tool.name} tool={tool} isAuthorized={authorizedNames.has(tool.name)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Props (state is now owned by ConnectorsHub) ─────────────────────────────

interface TralisConnectorPanelProps {
  status: 'loading' | 'idle' | 'connected' | 'error';
  session: McpSession | null;
  onConnected: (token: string, data: McpSession) => void;
  onDisconnected: () => void;
}

// Import McpSession type from Hub
import type { McpSession } from '../ConnectorsHub';

// ─── Main Panel ──────────────────────────────────────────────────────────────

export const TralisConnectorPanel: React.FC<TralisConnectorPanelProps> = ({
  status,
  session,
  onConnected,
  onDisconnected,
}) => {
  // Local UI state only (modal, form fields)
  const [showModal, setShowModal]         = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword]   = useState(false);
  const [loginClientId, setLoginClientId] = useState('DEMO');
  const [loginLoading, setLoginLoading]   = useState(false);
  const [loginError, setLoginError]       = useState('');
  const [errorMessage]                    = useState('Impossible de joindre le serveur MCP.');
  const [serverTools, setServerTools]     = useState<ToolMeta[]>(session?.allTools || []);

  useEffect(() => {
    if (session?.allTools && session.allTools.length > 0) {
      setServerTools(session.allTools);
    }
  }, [session?.allTools]);

  useEffect(() => {
    const fetchTools = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001'}/api/mcp/tools/metadata`);
        const data = await res.json();
        if (data.ok && Array.isArray(data.tools) && data.tools.length > 0) {
          setServerTools(data.tools);
        }
      } catch (err) {
        console.error('Failed to fetch tools metadata:', err);
      }
    };
    fetchTools();
  }, []);

  // Cloudflare Turnstile state
  const [turnstileToken, setTurnstileToken] = useState('');
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

  useEffect(() => {
    if (showModal) {
      setTurnstileToken('');
      setLoginError('');
    }
  }, [showModal]);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';

  // Convenience aliases
  const userInfo           = session?.user ?? null;
  const authorizedToolNames = new Set<string>(session?.tools ?? []);

  // ── Option A: Use current VMIND session ────────────────────────────────────
  const handleUseCurrentSession = async () => {
    setLoginLoading(true);
    setLoginError('');

    const token = getVmindSessionToken();
    if (!token) {
      setLoginError('Session VMIND introuvable. Veuillez vous reconnecter à VMIND.');
      setLoginLoading(false);
      return;
    }

    try {
      const res = await fetch(`${baseUrl}/api/mcp/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        console.log('[Connectors] Session VMIND acceptée par MCP — user:', data.user?.username);
        setShowModal(false);
        setLoginError('');
        onConnected(token, data);
      } else {
        const msg = data?.error || `Erreur ${res.status} : session non autorisée sur le serveur MCP.`;
        console.warn('[Connectors] Session VMIND refusée par MCP:', msg);
        setLoginError(msg);
      }
    } catch (err) {
      console.error('[Connectors] Erreur réseau lors de la validation:', err);
      setLoginError((err as any)?.message || "Connexion impossible : le serveur backend (https://localhost:3001) ne répond pas. Vérifiez que le serveur est démarré.");
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Option B: Manual login ─────────────────────────────────────────────────
  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const vmindToken = getVmindSessionToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (vmindToken) {
        headers['Authorization'] = `Bearer ${vmindToken}`;
      }

      const res = await fetch(`${baseUrl}/api/mcp/auth/login`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          username: loginUsername, 
          password: loginPassword, 
          client_id: loginClientId,
          turnstileToken 
        }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        console.log('[Connectors] Connexion manuelle réussie — user:', data.user?.username);
        setShowModal(false);
        setLoginError('');
        onConnected(data.token, data);
      } else {
        setLoginError(data?.error || 'Identifiants invalides.');
      }
    } catch (err) {
      setLoginError((err as any)?.message || "Connexion impossible : le serveur backend (https://localhost:3001) ne répond pas. Vérifiez que le serveur est démarré.");
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Disconnect — delegates to Hub ─────────────────────────────────────────
  const handleDisconnect = () => onDisconnected();

  // ── Build tool sections ────────────────────────────────────────────────────
  const dynamicMetadata = [...serverTools];
  if (authorizedToolNames && authorizedToolNames.size > 0) {
    authorizedToolNames.forEach(toolName => {
      // Exclude special dynamic client tools that duplicate existing logic
      if (toolName.startsWith('Client1_') || toolName.startsWith('MCP_Client1_')) return;
      
      if (!dynamicMetadata.find(t => t.name === toolName)) {
        let guessedAgent = 'VDATA';
        if (toolName.includes('vmove')) guessedAgent = 'VMOVE';
        else if (toolName.includes('vfin')) guessedAgent = 'VFIN';
        else if (toolName.includes('vsell')) guessedAgent = 'VSELL';
        else if (toolName.includes('vbuy')) guessedAgent = 'VBUY';
        else if (toolName.includes('vstock')) guessedAgent = 'VSTOCK';
        
        dynamicMetadata.push({
          name: toolName,
          description: toolName.replace(/_/g, ' '),
          agent: guessedAgent,
          accessType: 'read',
          authLevel: 'always'
        });
      }
    });
  }

  const readTools      = dynamicMetadata.filter(t => t.accessType === 'read');
  const sensitiveTools = dynamicMetadata.filter(t => t.accessType === 'sensitive' || t.accessType === 'write');

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="connector-panel-inner">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '12px',
            background: 'rgba(0, 229, 200, 0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(0, 229, 200, 0.15)',
          }}>
            <Database size={24} color="#00E5C8" />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 4px 0' }}>TraLIS MCP</h1>
            <div style={{ fontSize: '13px', color: '#8FA3B8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {status === 'loading' && <span>Vérification du statut…</span>}
              {status === 'idle' && (
                <span style={{ color: '#ffc107', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <AlertTriangle size={13} /> Connecteur non activé
                </span>
              )}
              {status === 'connected' && (
                <span style={{ color: '#00E5C8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <CheckCircle2 size={13} />
                  Connecté — {userInfo?.username}&nbsp;·&nbsp;Tenant&nbsp;{userInfo?.client_id || 'DEMO'}
                </span>
              )}
              {status === 'error' && (
                <span style={{ color: '#ff4757', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <AlertTriangle size={13} /> {errorMessage}
                </span>
              )}
            </div>
          </div>
        </div>

        {status === 'connected' ? (
          <button onClick={handleDisconnect} style={{
            background: 'transparent', color: '#8FA3B8',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '8px 16px', borderRadius: '8px',
            fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            transition: 'color 0.2s',
          }}
            onMouseOver={e => e.currentTarget.style.color = '#fff'}
            onMouseOut={e => e.currentTarget.style.color = '#8FA3B8'}
          >
            Déconnecter
          </button>
        ) : status !== 'loading' && (
          <button onClick={() => setShowModal(true)} style={{
            background: 'linear-gradient(90deg, #00E5C8 0%, #21F3D6 100%)',
            color: '#021010', border: 'none',
            padding: '8px 16px', borderRadius: '8px',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
            boxShadow: '0 0 10px rgba(0, 229, 200, 0.2)',
          }}>
            <Link2 size={14} /> Connecter
          </button>
        )}
      </div>

      <p style={{ color: '#8FA3B8', fontSize: '13px', lineHeight: 1.65, marginBottom: '36px', maxWidth: '680px' }}>
        Le connecteur TraLIS MCP permet à VMIND d'exécuter des outils directement sur votre ERP, en respectant vos rôles et permissions TraLIS.
        Une fois activé, l'IA consulte ces autorisations en temps réel et adapte ses réponses à votre profil.
      </p>

      {/* ── CONNECTED : Infos + Tool sections ─────────────────────────────── */}
      {status === 'connected' && userInfo && (
        <>
          {/* Account info */}
          <div style={{
            display: 'flex', gap: '24px', flexWrap: 'wrap',
            padding: '16px 20px',
            background: 'rgba(5, 12, 24, 0.4)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px', marginBottom: '28px',
          }}>
            {[
              { label: 'Compte', value: userInfo.username },
              { label: 'Tenant', value: userInfo.client_id || 'DEMO' },
              { 
                label: 'Rôles TraLIS', 
                value: Array.isArray(userInfo.roles) 
                  ? userInfo.roles.join(', ') 
                  : (typeof userInfo.roles === 'string' ? userInfo.roles : '—') 
              },
              { 
                label: 'Agents autorisés', 
                value: Array.isArray(userInfo.allowedAgents) 
                  ? userInfo.allowedAgents.join(', ') 
                  : '—' 
              },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: '11px', color: '#6A7E95', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{label}</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Section title */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Autorisations des outils</h2>
            <span style={{ fontSize: '12px', color: '#6A7E95' }}>
              {authorizedToolNames.size} outil{authorizedToolNames.size !== 1 ? 's' : ''} autorisé{authorizedToolNames.size !== 1 ? 's' : ''} sur {dynamicMetadata.length} disponibles
            </span>
          </div>

          <ToolSection
            title="Outils en lecture seule"
            tools={readTools}
            authorizedNames={authorizedToolNames}
            collapsible
          />
          <ToolSection
            title="Actions sensibles"
            tools={sensitiveTools}
            authorizedNames={authorizedToolNames}
            collapsible
          />
        </>
      )}

      {/* ── IDLE: teaser of what tools are available ───────────────────────── */}
      {status === 'idle' && (
        <div style={{
          padding: '32px', textAlign: 'center',
          background: 'rgba(5, 12, 24, 0.3)',
          border: '1px dashed rgba(255,255,255,0.08)',
          borderRadius: '12px', color: '#6A7E95',
        }}>
          <Shield size={32} style={{ marginBottom: '16px', opacity: 0.4 }} />
          <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600, color: '#8FA3B8' }}>
            Connecteur non activé
          </p>
        </div>
      )}

      {/* ── LOGIN MODAL ─────────────────────────────────────────────────────── */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(2, 6, 14, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            background: 'linear-gradient(160deg, rgba(12, 28, 52, 1) 0%, rgba(6, 15, 30, 1) 100%)',
            border: '1px solid rgba(0, 229, 200, 0.35)',
            borderRadius: '24px',
            width: '100%', maxWidth: '440px',
            padding: '32px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            position: 'relative',
          }}>
            <button onClick={() => setShowModal(false)} style={{
              position: 'absolute', top: 20, right: 20,
              background: 'transparent', border: 'none', color: '#6A7E95', cursor: 'pointer',
            }}>
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px 0' }}>Connexion au connecteur MCP</h2>
            <p style={{ color: '#8FA3B8', fontSize: '13px', marginBottom: '28px', lineHeight: 1.55 }}>
              Choisissez une méthode pour activer l'accès sécurisé de l'IA à votre ERP TraLIS.
            </p>

            {/* Option A (Hidden for presentation) */}
            <button onClick={handleUseCurrentSession} disabled={loginLoading} style={{
              display: 'none',
              width: '100%',
              background: 'linear-gradient(90deg, #00E5C8 0%, #21F3D6 100%)',
              color: '#021010', border: 'none',
              padding: '13px', borderRadius: '12px',
              fontSize: '14px', fontWeight: 800, cursor: 'pointer',
              marginBottom: '20px',
              boxShadow: '0 0 20px rgba(0, 229, 200, 0.15)',
              justifyContent: 'center', alignItems: 'center', gap: '8px',
              opacity: loginLoading ? 0.7 : 1,
            }}>
              {loginLoading ? 'Validation en cours…' : 'Utiliser ma session VMIND actuelle'}
            </button>

            <div style={{ display: 'none', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.08)' }} />
              <span style={{ fontSize: '11px', color: '#6A7E95', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>ou compte TraLIS différent</span>
              <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.08)' }} />
            </div>

            {/* Option B */}
            <form onSubmit={handleManualLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { label: 'Identifiant', type: 'text', value: loginUsername, onChange: setLoginUsername, placeholder: 'Username ou Email', required: true },
                { label: 'Mot de passe', type: 'password', value: loginPassword, onChange: setLoginPassword, placeholder: '••••••••', required: true },
              ].map(field => {
                const isPassword = field.label === 'Mot de passe';
                return (
                <div key={field.label}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#8FA3B8', marginBottom: '6px', fontWeight: 600 }}>
                    {field.label}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={isPassword && showPassword ? 'text' : field.type}
                      value={field.value}
                      onChange={e => field.onChange(e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                      style={{
                        width: '100%', padding: '11px 14px', boxSizing: 'border-box',
                        background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '10px', color: '#fff', fontSize: '14px', outline: 'none',
                        paddingRight: isPassword ? '40px' : '14px'
                      }}
                    />
                    {isPassword && (
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', color: '#6A7E95', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
                        }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    )}
                  </div>
                </div>
              )})}

              {/* ── CLOUDFLARE ZERO TRUST / TURNSTILE VERIFICATION ── */}
              <div style={{
                padding: '12px 14px',
                background: 'rgba(5, 15, 30, 0.75)',
                border: '1px solid rgba(0, 229, 200, 0.22)',
                borderRadius: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                boxShadow: 'inset 0 0 16px rgba(0, 229, 200, 0.04)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M18.5 19H6.5C4.01 19 2 16.99 2 14.5c0-2.22 1.6-4.07 3.73-4.43C6.35 6.54 9.38 4 13 4c3.95 0 7.23 2.96 7.74 6.84C22.28 11.41 23.5 12.82 23.5 14.5c0 2.49-2.01 4.5-5 4.5z" fill="url(#cf-grad-modal)" />
                      <defs>
                        <linearGradient id="cf-grad-modal" x1="2" y1="4" x2="23.5" y2="19" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#F6821F" />
                          <stop offset="1" stopColor="#FAAE40" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>Cloudflare Turnstile</span>
                        <span style={{ fontSize: '9px', background: 'rgba(246, 130, 31, 0.15)', color: '#F6821F', padding: '1px 5px', borderRadius: '4px', border: '1px solid rgba(246, 130, 31, 0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Zero Trust</span>
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#6A7E95' }}>
                        Sécurisation de la passerelle connecteur ERP
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={14} color={turnstileToken ? '#00E5C8' : '#6A7E95'} />
                    <span style={{ fontSize: '10.5px', fontWeight: 600, color: turnstileToken ? '#00E5C8' : '#8FA3B8' }}>
                      {turnstileToken ? 'Vérifié' : 'Requis'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', minHeight: '65px', alignItems: 'center' }}>
                  <Turnstile
                    key={showModal ? 'modal-open' : 'modal-closed'}
                    siteKey={siteKey}
                    options={{ theme: 'dark', size: 'normal' }}
                    onSuccess={(token) => setTurnstileToken(token)}
                    onExpire={() => setTurnstileToken('')}
                    onError={() => setTurnstileToken('')}
                  />
                </div>
              </div>

              {loginError && (
                <div style={{
                  color: '#ff4757', fontSize: '13px',
                  background: 'rgba(255, 71, 87, 0.08)', border: '1px solid rgba(255, 71, 87, 0.2)',
                  padding: '10px 14px', borderRadius: '8px',
                  display: 'flex', alignItems: 'flex-start', gap: '8px',
                }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span>{loginError}</span>
                </div>
              )}

              <button 
                type="submit" 
                disabled={loginLoading || !turnstileToken} 
                style={{
                  width: '100%',
                  background: (!turnstileToken || loginLoading)
                    ? 'rgba(255,255,255,0.05)'
                    : 'linear-gradient(90deg, #00E5C8 0%, #21F3D6 100%)',
                  color: (!turnstileToken || loginLoading) ? '#8FA3B8' : '#021010',
                  border: (!turnstileToken || loginLoading) ? '1px solid rgba(255,255,255,0.12)' : 'none',
                  padding: '13px', borderRadius: '12px',
                  fontSize: '14px', fontWeight: 700, 
                  cursor: (!turnstileToken || loginLoading) ? 'not-allowed' : 'pointer',
                  marginTop: '4px', transition: 'all 0.2s',
                  opacity: loginLoading ? 0.7 : 1,
                  boxShadow: (turnstileToken && !loginLoading) ? '0 0 18px rgba(0, 229, 200, 0.25)' : 'none',
                }}
              >
                {loginLoading ? 'Connexion…' : 'Se connecter'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
