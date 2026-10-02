'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ConnectorsCatalog } from './components/ConnectorsCatalog';
import { TralisConnectorPanel } from './components/TralisConnectorPanel';
import { OdooConnectorPanel } from './components/OdooConnectorPanel';
import { ComingSoonPanel } from './components/ComingSoonPanel';
import { jwtDecode } from 'jwt-decode';
import { broadcastMcpSessionUpdate } from '@/shared/utils/sessionBroadcast';

// ─── Shared MCP session state ─────────────────────────────────────────────────
// Lifted to the Hub so it survives navigation between connectors.

export interface McpSession {
  user: {
    username: string;
    client_id: string;
    roles: string[];
    allowedAgents: string[];
  };
  tools: string[];
  allTools?: any[];
}

export const ConnectorsHub: React.FC = () => {
  const [activeConnector, setActiveConnector] = useState<string>('tralis');

  // ── Global TraLIS MCP session — persists across connector navigation ──────
  const [tralisStatus,  setTralisStatus]  = useState<'loading' | 'idle' | 'connected' | 'error'>('loading');
  const [tralisSession, setTralisSession] = useState<McpSession | null>(null);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL ;

  /**
   * Source de vérité : appelé une fois au montage du Hub.
   * Valide la session avec le backend via cookie HttpOnly.
   */
  const initTralisMcp = useCallback(async () => {
    console.log('[ConnectorsHub] Récupération du statut du connecteur TraLIS depuis le backend');
    try {
      const res = await fetch(`${baseUrl}/api/connectors/tralis/status`, {
        credentials: 'include'
      });

      // Nettoyage proactif de tout vestige legacy de localStorage
      localStorage.removeItem('vmind_session');
      localStorage.removeItem('vmind_mcp_token');
      localStorage.removeItem('vmind_connector_status');
      localStorage.removeItem('vmind_client_id');
      localStorage.removeItem('vmind_allowed_agents');

      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.connected) {
          console.log('[ConnectorsHub] ✅ Session TraLIS active restaurée via le backend');

          const ALL_AGENTS = ['VDATA', 'VFIN', 'VSELL', 'VSTOCK', 'VBUY', 'VMOVE'];
          const receivedRoles: string[] = data.roles || ['Administrator'];
          const isAdmin = receivedRoles.some((r: string) =>
            ['Administrator', 'Administrators', 'Admin', 'Superusers', 'SuperAdmin'].includes(r)
          );
          const receivedAgents: string[] = data.allowedAgents || [];
          const resolvedAgents = receivedAgents.length > 0 ? receivedAgents : (isAdmin ? ALL_AGENTS : []);

          setTralisSession({
            user: {
              username: data.erp_username || '',
              client_id: data.client_id || 'DEMO',
              roles: receivedRoles,
              allowedAgents: resolvedAgents
            },
            tools: data.tools || [],
            allTools: data.allTools || []
          });
          setTralisStatus('connected');
          window.dispatchEvent(new CustomEvent('mcp-session-updated', { detail: data }));
          return;
        }
      }

      // Si aucune session active n'est trouvée ou si la validation a échoué
      setTralisSession(null);
      setTralisStatus('idle');
      window.dispatchEvent(new CustomEvent('mcp-session-updated', { detail: null }));
    } catch (err) {
      console.error('[ConnectorsHub] Erreur lors de l\'initialisation des connecteurs:', err);
      setTralisStatus('error');
    }
  }, [baseUrl]);

  // Run ONCE when the Hub first mounts (not on every panel switch)
  useEffect(() => { initTralisMcp(); }, [initTralisMcp]);

  // Synchronisation inter-onglets : écoute les modifications propagées par BroadcastChannel
  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail;
      if (detail && (detail.connected || detail.user)) {
        const ALL_AGENTS = ['VDATA', 'VFIN', 'VSELL', 'VSTOCK', 'VBUY', 'VMOVE'];
        const receivedRoles: string[] = detail.user?.roles || detail.roles || ['Administrator'];
        const isAdmin = receivedRoles.some((r: string) =>
          ['Administrator', 'Administrators', 'Admin', 'Superusers', 'SuperAdmin'].includes(r)
        );
        const receivedAgents: string[] = detail.user?.allowedAgents || detail.allowedAgents || [];
        const resolvedAgents = receivedAgents.length > 0 ? receivedAgents : (isAdmin ? ALL_AGENTS : []);

        setTralisSession({
          user: {
            username: detail.user?.username || detail.erp_username || '',
            client_id: detail.user?.client_id || detail.client_id || 'DEMO',
            roles: receivedRoles,
            allowedAgents: resolvedAgents
          },
          tools: detail.tools || [],
          allTools: detail.allTools || []
        });
        setTralisStatus('connected');
      } else if (detail === null || detail?.connected === false) {
        setTralisSession(null);
        setTralisStatus('idle');
      }
    };

    window.addEventListener('mcp-session-updated', handleSync);
    return () => window.removeEventListener('mcp-session-updated', handleSync);
  }, []);

  /** Called by TralisConnectorPanel after a successful login */
  const handleTralisMcpConnected = (token: string, rawData: any) => {
    // Nettoyage proactif de tout vestige legacy de localStorage
    localStorage.removeItem('vmind_session');
    localStorage.removeItem('vmind_mcp_token');
    localStorage.removeItem('vmind_connector_status');
    localStorage.removeItem('vmind_client_id');
    localStorage.removeItem('vmind_allowed_agents');

    const ALL_AGENTS = ['VDATA', 'VFIN', 'VSELL', 'VSTOCK', 'VBUY', 'VMOVE'];
    const roles: string[] = rawData.user?.roles || rawData.roles || ['Administrator'];
    const isAdmin = roles.some((r: string) =>
      ['Administrator', 'Administrators', 'Admin', 'Superusers', 'SuperAdmin'].includes(r)
    );
    const resolvedAgents: string[] = rawData.user?.allowedAgents || rawData.allowedAgents || (isAdmin ? ALL_AGENTS : []);

    const normalizedSession: McpSession = {
      user: {
        username: rawData.user?.username || rawData.erp_username || 'host',
        client_id: rawData.user?.client_id || rawData.client_id || 'LOCAL',
        roles,
        allowedAgents: resolvedAgents
      },
      tools: rawData.tools || [],
      allTools: rawData.allTools || []
    };

    console.log('[ConnectorsHub] 🔗 connecté — user:', normalizedSession.user.username, 'agents:', resolvedAgents);
    setTralisSession(normalizedSession);
    setTralisStatus('connected');
    broadcastMcpSessionUpdate({ ...normalizedSession, connected: true });
  };

  /** Called by TralisConnectorPanel on explicit disconnect */
  const handleTralisMcpDisconnected = async () => {
    let remainingAgents: string[] = [];
    try {
      const res = await fetch(`${baseUrl}/api/connectors/tralis/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.allowedAgents)) {
          remainingAgents = data.allowedAgents;
        }
      }
    } catch (err) {
      console.error('[ConnectorsHub] Failed to disconnect on backend:', err);
    }
    localStorage.removeItem('vmind_session');
    localStorage.removeItem('vmind_mcp_token');
    localStorage.removeItem('vmind_connector_status');
    localStorage.removeItem('vmind_client_id');
    localStorage.removeItem('vmind_allowed_agents');
    console.log('[ConnectorsHub] 🔌 Déconnecté TraLIS — agents restants:', remainingAgents);
    setTralisSession(null);
    setTralisStatus('idle');
    broadcastMcpSessionUpdate(null);
  };

  return (
    <div className="connectors-hub-wrap">
      <ConnectorsCatalog
        activeConnector={activeConnector}
        onSelectConnector={setActiveConnector}
        tralisConnected={tralisStatus === 'connected'}
      />

      <div className="connectors-content-panel">
        {/* 
          IMPORTANT: We always render TralisConnectorPanel (hidden via CSS when 
          inactive) so it never unmounts and never loses its parent-managed state.
          Other panels (ComingSoon etc.) are cheap to mount/unmount.
        */}
        <div style={{ display: activeConnector === 'tralis' ? 'block' : 'none' }}>
          <TralisConnectorPanel
            status={tralisStatus}
            session={tralisSession}
            onConnected={handleTralisMcpConnected}
            onDisconnected={handleTralisMcpDisconnected}
          />
        </div>

        <div style={{ display: activeConnector === 'odoo' ? 'block' : 'none' }}>
          <OdooConnectorPanel />
        </div>

        {activeConnector === 'web' && <ComingSoonPanel name="Recherche Web" />}
      </div>
    </div>
  );
};
