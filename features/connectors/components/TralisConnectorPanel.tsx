'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Link2, Shield, ShieldCheck, X, Database, ChevronDown, ChevronUp, Eye, FileEdit, Zap, Server } from 'lucide-react';
import { TralisInstancesModal } from './TralisInstancesModal';
import { jwtDecode } from 'jwt-decode';
import { useConnections } from '@/shared/contexts/ConnectionsContext';

function checkIsVmindAdmin(userObj?: any): boolean {
  if (!userObj) return false;
  try {
    const adminRoles = ['administrator', 'administrators', 'admin', 'superusers', 'superadmin'];
    const hasAdminRole = (val: any): boolean => {
      if (!val) return false;
      if (Array.isArray(val)) {
        return val.some(r => typeof r === 'string' && adminRoles.includes(r.trim().toLowerCase()));
      }
      if (typeof val === 'string') {
        const trimmed = val.trim().toLowerCase();
        return adminRoles.includes(trimmed);
      }
      return false;
    };

    return hasAdminRole(userObj.roles) || hasAdminRole(userObj.role) || hasAdminRole(userObj.role_name);
  } catch {
    return false;
  }
}

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
const baseUrl = process.env.NEXT_PUBLIC_API_URL ;

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

function ToolSection({ title, tools, authorizedNames, collapsible = false, defaultOpen = false }: {
  title: string;
  tools: ToolMeta[];
  authorizedNames: Set<string>;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
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
  const { connections, connectErp } = useConnections();
  const [showModal, setShowModal]                 = useState(false);
  const [showInstancesModal, setShowInstancesModal] = useState(false);
  const [isVmindAdmin, setIsVmindAdmin]           = useState(false);
  const [loginErpUrl, setLoginErpUrl]             = useState('');
  const [showAdvanced, setShowAdvanced]           = useState(false);
  const [loginCustomMcpUrl, setLoginCustomMcpUrl] = useState('');
  const [oauthLoading, setOauthLoading]           = useState(false);
  const [loginError, setLoginError]               = useState('');
  const [errorMessage]                            = useState('Impossible de joindre le serveur MCP.');
  const [serverTools, setServerTools]     = useState<ToolMeta[]>(session?.allTools || []);

  // Diagnostic télémétrique & validation en direct
  const [urlValidationMsg, setUrlValidationMsg] = useState<string>('');
  const [isProbing, setIsProbing]               = useState<boolean>(false);
  const [probeResult, setProbeResult]           = useState<{
    hostname?: string;
    isHttps?: boolean;
    tenantFound?: boolean;
    tenant?: { clientId: string; displayName: string } | null;
    mcpReachable?: boolean;
    suggestedMcpUrl?: string | null;
    testedMcpUrl?: string | null;
    isCustomMcp?: boolean;
    requiresManualMcp?: boolean;
  } | null>(null);

  const probeTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const erpInputRef   = React.useRef<HTMLInputElement | null>(null);
  const probeAbortRef = React.useRef<AbortController | null>(null);
  const probeSeqRef   = React.useRef<number>(0);

  useEffect(() => {
    const fetchAdminStatus = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
        const res = await fetch(`${apiUrl}/api/auth/vmind/me`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data?.ok && data.user) {
            setIsVmindAdmin(checkIsVmindAdmin(data.user));
          }
        }
      } catch (err) {
        console.error('Failed to verify admin status in TralisConnectorPanel', err);
      }
    };

    fetchAdminStatus();

    const updateAdmin = (e?: any) => {
      const user = e?.detail?.user || (e?.detail && e.detail.connected ? e.detail : null);
      if (user) {
        setIsVmindAdmin(checkIsVmindAdmin(user));
      }
    };
    window.addEventListener('mcp-session-updated', updateAdmin);
    return () => {
      window.removeEventListener('mcp-session-updated', updateAdmin);
    };
  }, []);

  // Fermeture automatique de la modale et réinitialisation de l'état de chargement lors de la réception du message OAuth
  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'VMIND_MCP_CONNECTED') {
        setOauthLoading(false);
        if (event.data.success) {
          setShowModal(false);
          setLoginError('');
        } else if (event.data.error) {
          setLoginError(event.data.error);
        }
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, []);

  useEffect(() => {
    if (false && session?.allTools && session.allTools.length > 0) {
      setServerTools(session.allTools);
      return;
    }

    const fetchDynamicTools = async () => {
      const conn = connections.find(c => c.connector_type === 'tralis' && c.status === 'connected');
      if (conn?.id) {
        try {
          const { fetchConnectionTools } = await import('@/shared/api/connections-api');
          const discovered = await fetchConnectionTools(conn.id);
          if (Array.isArray(discovered) && discovered.length > 0) {
            const mapped: ToolMeta[] = discovered.map(t => {
              const nameLower = t.name.toLowerCase();
              let guessedAgent = 'VDATA';
              if (nameLower.includes('fin') || nameLower.includes('facture') || nameLower.includes('reglement')) guessedAgent = 'VFIN';
              else if (nameLower.includes('sell') || nameLower.includes('vente') || nameLower.includes('devis') || nameLower.includes('commande')) guessedAgent = 'VSELL';
              else if (nameLower.includes('buy') || nameLower.includes('achat') || nameLower.includes('fournisseur')) guessedAgent = 'VBUY';
              else if (nameLower.includes('stock') || nameLower.includes('article') || nameLower.includes('inventaire')) guessedAgent = 'VSTOCK';
              else if (nameLower.includes('move') || nameLower.includes('livraison') || nameLower.includes('transport')) guessedAgent = 'VMOVE';

              const isWrite = nameLower.includes('insert') || nameLower.includes('update') || nameLower.includes('delete') || nameLower.includes('post') || nameLower.includes('execute') || nameLower.includes('create');

              return {
                name: t.name,
                description: t.description || t.name.replace(/_/g, ' '),
                agent: guessedAgent,
                accessType: isWrite ? 'sensitive' : 'read',
                authLevel: isWrite ? 'approval' : 'always'
              };
            });
            setServerTools(mapped);
          }
        } catch (err) {
          console.warn('[TralisConnectorPanel] Session MCP perdue ou inaccessible. Déconnexion automatique...');
          setServerTools([]);
          if (onDisconnected) {
            onDisconnected();
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mcp-session-updated', { detail: { connected: false } }));
          }
        }
      }
    };

    if (status === 'connected') {
      fetchDynamicTools();
    }
  }, [session?.allTools, status, connections]);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL ;

  // Fonction centrale d'exécution de la sonde diagnostic (avec annulation des requêtes obsolètes)
  const executeProbe = useCallback(async (erpUrl: string, customMcpUrl?: string) => {
    const trimmed = (erpUrl || '').trim();
    const trimmedCustomMcp = (customMcpUrl || '').trim();

    if (!trimmed) {
      setUrlValidationMsg('');
      setProbeResult(null);
      setShowAdvanced(false);
      return;
    }

    const isLocal = trimmed.startsWith('http://localhost') || trimmed.startsWith('http://127.0.0.1');
    if (!trimmed.startsWith('https://') && !isLocal) {
      setUrlValidationMsg("L'URL doit obligatoirement commencer par https://");
      setProbeResult(null);
      return;
    }

    if (trimmed === 'https://' || trimmed === 'http://') {
      setUrlValidationMsg("Saisir une URL https:// complète et valide (ex. https://instance-erp.com)");
      setProbeResult(null);
      return;
    }

    try {
      const u = new URL(trimmed);
      const parts = u.hostname.split('.');
      const tld = parts[parts.length - 1];

      // Si le nom de domaine est encore en cours de frappe (pas de point ou TLD incomplet)
      if (!isLocal && (parts.length < 2 || tld.length < 2)) {
        setUrlValidationMsg("Saisir une URL https:// complète et valide (ex. https://instance-erp.com)");
        setProbeResult(null);
        return;
      }
    } catch {
      setUrlValidationMsg("Format d'URL incomplet ou invalide.");
      setProbeResult(null);
      return;
    }

    setUrlValidationMsg('');

    // Annuler immédiatement toute requête précédente en vol pour éliminer les race conditions
    if (probeAbortRef.current) {
      probeAbortRef.current.abort();
    }
    const controller = new AbortController();
    probeAbortRef.current = controller;

    // Numéro de séquence incrémental
    const currentSeq = ++probeSeqRef.current;
    setIsProbing(true);

    try {
      const res = await fetch(`${baseUrl}/api/connectors/tralis/probe`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          erp_url: trimmed,
          custom_mcp_url: trimmedCustomMcp || undefined
        }),
        signal: controller.signal
      });

      // Ignorer si une frappe plus récente a déjà écrasé cette requête
      if (currentSeq !== probeSeqRef.current) return;

      const data = await res.json();
      if (currentSeq !== probeSeqRef.current) return;

      if (res.ok && data.ok) {
        setProbeResult(data);
        if (!data.mcpReachable || data.requiresManualMcp) {
          setShowAdvanced(true);
        } else {
          setShowAdvanced(false);
        }
      } else {
        setProbeResult({
          tenantFound: false,
          mcpReachable: false,
          requiresManualMcp: true
        });
        setShowAdvanced(true);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      if (currentSeq !== probeSeqRef.current) return;

      setProbeResult({
        tenantFound: false,
        mcpReachable: false,
        requiresManualMcp: true
      });
      setShowAdvanced(true);
    } finally {
      if (currentSeq === probeSeqRef.current) {
        setIsProbing(false);
      }
    }
  }, [baseUrl]);

  // Détection unifiée et dé-bouncée (élimine les conflits de timers)
  useEffect(() => {
    if (!showModal) {
      if (probeAbortRef.current) probeAbortRef.current.abort();
      if (probeTimerRef.current) clearTimeout(probeTimerRef.current);
      setLoginError('');
      setUrlValidationMsg('');
      setProbeResult(null);
      return;
    }

    setLoginError('');

    const targetUrl = (loginErpUrl || erpInputRef.current?.value || '').trim();
    if (!targetUrl) {
      setUrlValidationMsg('');
      setProbeResult(null);
      return;
    }

    if (!loginErpUrl && erpInputRef.current?.value) {
      setLoginErpUrl(erpInputRef.current.value);
    }

    // Debounce de 450ms pour laisser la frappe se stabiliser
    if (probeTimerRef.current) clearTimeout(probeTimerRef.current);
    probeTimerRef.current = setTimeout(() => {
      executeProbe(targetUrl, loginCustomMcpUrl);
    }, 450);

    return () => {
      if (probeTimerRef.current) clearTimeout(probeTimerRef.current);
    };
  }, [loginErpUrl, loginCustomMcpUrl, showModal, executeProbe]);

  // Convenience aliases
  const userInfo           = session?.user ?? null;
  const authorizedToolNames = new Set<string>(
    serverTools.length > 0
      ? serverTools.map(t => t.name)
      : (session?.tools ?? [])
  );

  // ── Option A: Use current VMIND session ────────────────────────────────────
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
            padding: '6px',
          }}>
            <img src="/logo-tralis-mcp.png" alt="TraLIS" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isVmindAdmin && (
            <button
              onClick={() => setShowInstancesModal(true)}
              style={{
                background: 'rgba(130, 80, 255, 0.12)',
                color: '#B088FF',
                border: '1px solid rgba(130, 80, 255, 0.35)',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                boxShadow: '0 0 10px rgba(130, 80, 255, 0.15)'
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = 'rgba(130, 80, 255, 0.25)';
                e.currentTarget.style.borderColor = '#8250FF';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = 'rgba(130, 80, 255, 0.12)';
                e.currentTarget.style.borderColor = 'rgba(130, 80, 255, 0.35)';
                e.currentTarget.style.color = '#B088FF';
              }}
            >
              <Server size={14} />
              Instances TraLIS
            </button>
          )}

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
      </div>

      <p style={{ color: '#8FA3B8', fontSize: '13px', lineHeight: 1.65, marginBottom: '36px', maxWidth: '680px' }}>
        Le connecteur TraLIS MCP permet à VMIND d'exécuter des outils directement sur l'ERP, en respectant nos rôles et permissions TraLIS.
        Une fois activé, l'IA consulte ces autorisations en temps réel et adapte ses réponses à notre profil.
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
          padding: '16px',
          boxSizing: 'border-box',
        }}>
          <div style={{
            background: 'linear-gradient(160deg, rgba(12, 28, 52, 1) 0%, rgba(6, 15, 30, 1) 100%)',
            border: '1px solid rgba(0, 229, 200, 0.35)',
            borderRadius: '24px',
            width: '100%', maxWidth: '620px',
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: '28px 32px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            position: 'relative',
            boxSizing: 'border-box',
          }}>
            <button onClick={() => setShowModal(false)} style={{
              position: 'absolute', top: 20, right: 20,
              background: 'transparent', border: 'none', color: '#6A7E95', cursor: 'pointer',
            }}>
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px 0' }}>Connexion au connecteur MCP</h2>
            <p style={{ color: '#8FA3B8', fontSize: '13px', marginBottom: '20px', lineHeight: 1.55 }}>
              Activer l'accès sécurisé de l'IA à notre instance ERP TraLIS.
            </p>

            {loginError && (
              <div style={{
                marginBottom: '16px',
                padding: '10px 14px',
                background: 'rgba(255, 71, 87, 0.12)',
                border: '1px solid rgba(255, 71, 87, 0.35)',
                borderRadius: '10px',
                color: '#ff6b81',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                <span>{loginError}</span>
              </div>
            )}

            {/* Champ URL ERP TraLIS avec validation réactive */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#8FA3B8', marginBottom: '6px', fontWeight: 600 }}>
                URL de l'instance TraLIS (Optionnel si instance locale)
              </label>
              <input
                ref={erpInputRef}
                type="text"
                value={loginErpUrl}
                onChange={e => setLoginErpUrl(e.target.value)}
                placeholder="https://instance-erp.com ou http://localhost:3002"
                style={{
                  width: '100%', padding: '11px 14px', boxSizing: 'border-box',
                  background: 'rgba(0,0,0,0.3)',
                  border: urlValidationMsg ? '1px solid rgba(255, 184, 0, 0.6)' : (probeResult?.tenantFound ? '1px solid rgba(0, 229, 200, 0.6)' : '1px solid rgba(255,255,255,0.1)'),
                  borderRadius: '10px', color: '#fff', fontSize: '14px', outline: 'none',
                  transition: 'border 0.2s ease',
                }}
              />
              {urlValidationMsg && (
                <div style={{ fontSize: '11.5px', color: '#FFB800', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <AlertTriangle size={12} />
                  <span>{urlValidationMsg}</span>
                </div>
              )}
            </div>

            {/* ── VMIND INSTANCE DIAGNOSTIC & TELEMETRY HUD ── */}
            {(loginErpUrl.trim().length > 0 || probeResult) && (
              <div style={{
                background: 'rgba(5, 15, 30, 0.65)',
                border: `1px solid ${probeResult?.tenantFound ? 'rgba(0, 229, 200, 0.3)' : (probeResult ? 'rgba(255, 184, 0, 0.35)' : 'rgba(255, 255, 255, 0.08)')}`,
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginBottom: '14px',
                boxShadow: 'inset 0 0 16px rgba(0, 229, 200, 0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: isProbing ? '#00E5C8' : (probeResult?.tenantFound ? '#00E5C8' : (probeResult ? '#FFB800' : '#6A7E95')),
                      boxShadow: `0 0 8px ${isProbing ? '#00E5C8' : (probeResult?.tenantFound ? '#00E5C8' : (probeResult ? '#FFB800' : 'transparent'))}`
                    }} />
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#8FA3B8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      Diagnostic d'instance VMIND
                    </span>
                  </div>
                  {isProbing && (
                    <span style={{ fontSize: '11px', color: '#00E5C8', fontWeight: 600 }}>
                      Analyse réseau…
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {/* Metric 1: Protocole & Réseau */}
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.35)',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.04)'
                  }}>
                    <div style={{ fontSize: '10px', color: '#6A7E95', marginBottom: '2px' }}>Protocole</div>
                    <div style={{
                      fontSize: '11px', fontWeight: 700,
                      color: probeResult?.isHttps || (loginErpUrl.startsWith('https://') || loginErpUrl.includes('localhost')) ? '#00E5C8' : '#FFB800',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      {loginErpUrl.startsWith('https://') ? 'HTTPS OK' : (loginErpUrl.includes('localhost') ? 'LOCAL (DEV)' : (loginErpUrl ? 'INCOMPLET' : 'EN ATTENTE'))}
                    </div>
                  </div>

                  {/* Metric 2: Registre Tenant */}
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.35)',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.04)'
                  }}>
                    <div style={{ fontSize: '10px', color: '#6A7E95', marginBottom: '2px' }}>Registre Tenant</div>
                    <div style={{
                      fontSize: '11px', fontWeight: 700,
                      color: probeResult?.tenantFound ? '#00E5C8' : (probeResult ? '#FFB800' : '#6A7E95'),
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      {isProbing ? 'Recherche…' : (probeResult?.tenantFound ? (probeResult.tenant?.displayName || probeResult.tenant?.clientId || 'IDENTIFIÉ') : (probeResult ? 'NON RÉPERTORIÉ' : 'EN ATTENTE'))}
                    </div>
                  </div>

                  {/* Metric 3: Passerelle MCP */}
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.35)',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.04)'
                  }}>
                    <div style={{ fontSize: '10px', color: '#6A7E95', marginBottom: '2px' }}>Passerelle MCP</div>
                    <div style={{
                      fontSize: '11px', fontWeight: 700,
                      color: probeResult ? (probeResult.mcpReachable ? '#00E5C8' : '#FFB800') : '#6A7E95',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      {isProbing
                        ? 'Sondage…'
                        : probeResult
                          ? (probeResult.mcpReachable
                              ? (probeResult.isCustomMcp ? 'DÉTECTÉE (PERSONNALISÉE)' : 'DÉTECTÉE')
                              : (probeResult.isCustomMcp ? 'INJOIGNABLE (PERSO)' : (probeResult.tenantFound ? 'NON DÉTECTÉE' : 'MODE MANUEL')))
                          : 'EN ATTENTE'}
                    </div>
                  </div>
                </div>

                {/* Cyber Advisory Card si non répertorié ou passerelle MCP non joignable */}
                {probeResult && !probeResult.mcpReachable && (
                  <div style={{
                    marginTop: '4px',
                    padding: '10px 12px',
                    background: 'linear-gradient(135deg, rgba(255, 184, 0, 0.08) 0%, rgba(10, 20, 35, 0.7) 100%)',
                    border: '1px solid rgba(255, 184, 0, 0.3)',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#FFB800', fontSize: '12px', fontWeight: 700 }}>
                      <AlertTriangle size={14} />
                      <span>
                        {probeResult.isCustomMcp
                          ? 'URL MCP personnalisée injoignable'
                          : (probeResult.tenantFound
                              ? 'Passerelle MCP injoignable sur cette adresse'
                              : 'Instance non répertoriée dans notre registre')}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#8FA3B8', lineHeight: 1.45 }}>
                      {probeResult.isCustomMcp
                        ? `L'URL MCP personnalisée spécifiée (${probeResult.testedMcpUrl}) ne répond pas. Vérifier l'adresse, le port et la connectivité réseau.`
                        : (probeResult.tenantFound
                            ? `Le tenant ${probeResult.tenant?.displayName || probeResult.tenant?.clientId} est bien identifié, mais le serveur MCP ne répond pas sur ${probeResult.suggestedMcpUrl || loginErpUrl}. Si la passerelle écoute sur une URL dédiée ou un tunnel, on peut l'indiquer dans les paramètres avancés.`
                            : "Notre registre central n'a pas détecté de passerelle MCP automatique pour cet hôte. On peut basculer en mode avancé pour renseigner manuellement l'URL MCP dédiée.")}
                    </div>
                    {!showAdvanced && (
                      <button
                        type="button"
                        onClick={() => setShowAdvanced(true)}
                        style={{
                          alignSelf: 'flex-start',
                          marginTop: '2px',
                          background: 'rgba(255, 184, 0, 0.15)',
                          border: '1px solid rgba(255, 184, 0, 0.4)',
                          color: '#FFB800',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.2s'
                        }}
                      >
                        <span>Déployer les paramètres avancés</span>
                        <ChevronDown size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Paramètres avancés (URL MCP personnalisée) */}
            <div style={{ marginBottom: '18px' }}>
              <button
                type="button"
                onClick={() => setShowAdvanced(prev => !prev)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#8FA3B8',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '2px 0',
                  transition: 'color 0.2s',
                }}
                onMouseOver={e => e.currentTarget.style.color = '#00E5C8'}
                onMouseOut={e => e.currentTarget.style.color = '#8FA3B8'}
              >
                {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                <span>Paramètres avancés</span>
              </button>

              {showAdvanced && (
                <div style={{
                  marginTop: '8px',
                  padding: '12px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <label style={{ display: 'block', fontSize: '11.5px', color: '#8FA3B8', fontWeight: 600 }}>
                    URL personnalisée du serveur MCP (Optionnel)
                  </label>
                  <input
                    type="text"
                    value={loginCustomMcpUrl}
                    onChange={e => setLoginCustomMcpUrl(e.target.value)}
                    placeholder="https://mcp.exemple.com/mcp"
                    style={{
                      width: '100%', padding: '9px 12px', boxSizing: 'border-box',
                      background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: '10.5px', color: '#6A7E95', lineHeight: 1.4 }}>
                    À renseigner si le serveur MCP est déployé sur une adresse dédiée ou derrière un tunnel réseau spécifique.
                  </span>

                  {loginCustomMcpUrl.trim() && probeResult?.isCustomMcp && (
                    <div style={{
                      marginTop: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      color: probeResult.mcpReachable ? '#00E5C8' : '#FFB800'
                    }}>
                      {probeResult.mcpReachable ? (
                        <>
                          <CheckCircle2 size={13} />
                          <span>Passerelle MCP détectée et validée sur cette URL</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={13} />
                          <span>Passerelle MCP injoignable sur cette adresse</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bouton unique Connexion OAuth 2.1 */}
            <button
              type="button"
              onClick={async () => {
                try {
                  setOauthLoading(true);
                  setLoginError('');
                  const targetUrl = loginCustomMcpUrl.trim() || loginErpUrl.trim() || undefined;
                  await connectErp('tralis', targetUrl);
                  setShowModal(false);
                } catch (e: any) {
                  setLoginError(e.message || "Erreur lors de la redirection OAuth");
                } finally {
                  setOauthLoading(false);
                }
              }}
              disabled={oauthLoading}
              style={{
                width: '100%',
                background: 'linear-gradient(90deg, #00E5C8 0%, #21F3D6 100%)',
                color: '#021010', border: 'none',
                padding: '13px', borderRadius: '12px',
                fontSize: '14px', fontWeight: 800, cursor: 'pointer',
                marginBottom: '16px',
                boxShadow: '0 0 20px rgba(0, 229, 200, 0.15)',
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                opacity: oauthLoading ? 0.7 : 1,
              }}
            >
              <ShieldCheck size={16} />
              {oauthLoading ? 'Connexion en cours…' : 'Connexion OAuth 2.1 (Protocole MCP Standard)'}
            </button>

            {/* Note de sécurité VMIND */}
            <div style={{
              fontSize: '11px',
              color: '#6A7E95',
              lineHeight: 1.5,
              padding: '9px 12px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '8px'
            }}>
              <span style={{ color: '#8FA3B8', fontWeight: 600 }}>Note de sécurité :</span> Ne connecter que des passerelles et serveurs provenant d'instances de confiance. VMIND n'administre pas directement les outils tiers et ne transite aucun identifiant ni mot de passe ERP.
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE GESTION MULTI-TENANT (INSTANCES TRALIS) ──────────────── */}
      <TralisInstancesModal
        isOpen={showInstancesModal && isVmindAdmin}
        isAdmin={isVmindAdmin}
        onClose={() => setShowInstancesModal(false)}
        onTenantChanged={() => {
          console.log('[Connectors] Référentiel des instances mis à jour');
        }}
      />
    </div>
  );
};
