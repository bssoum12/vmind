'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ConnectorsCatalog } from './components/ConnectorsCatalog';
import { TralisConnectorPanel } from './components/TralisConnectorPanel';
import { OdooConnectorPanel } from './components/OdooConnectorPanel';
import { ComingSoonPanel } from './components/ComingSoonPanel';
import { jwtDecode } from 'jwt-decode';

function getVmindSessionToken(): string | null {
  try {
    const raw = localStorage.getItem('vmind_session');
    if (!raw) return null;
    if (raw.startsWith('eyJ')) return raw;
    const parsed = JSON.parse(raw);
    return parsed?.token || parsed?.access_token || parsed?.user?.token || parsed?.data?.token || null;
  } catch (err) {
    return null;
  }
}

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

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';

  /**
   * Single source of truth: called once on Hub mount.
   * Reads vmind_mcp_token from localStorage and validates with backend.
   * If valid  → keeps Hub-level state as "connected" forever until explicit disconnect.
   * If invalid → removes token silently, sets idle.
   */
  const initTralisMcp = useCallback(async () => {
    const vmindToken = getVmindSessionToken();
    if (!vmindToken) {
      console.log('[ConnectorsHub] vmind_session absent → idle');
      setTralisStatus('idle');
      return;
    }

    console.log('[ConnectorsHub] Récupération du statut du connecteur TraLIS depuis le backend');
    try {
      const res = await fetch(`${baseUrl}/api/connectors/tralis/status`, {
        headers: { Authorization: `Bearer ${vmindToken}` },
      });

      // Nettoyage proactif de tout vestige legacy de localStorage
      localStorage.removeItem('vmind_mcp_token');
      localStorage.removeItem('vmind_connector_status');
      localStorage.removeItem('vmind_client_id');
      localStorage.removeItem('vmind_allowed_agents');

      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.connected) {
          console.log('[ConnectorsHub] ✅ Session TraLIS active restaurée via le backend');
          setTralisSession({
            user: {
              username: data.erp_username || '',
              client_id: data.client_id || 'DEMO',
              roles: data.roles || ['Administrator'],
              allowedAgents: data.allowedAgents || []
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

  /** Called by TralisConnectorPanel after a successful login */
  const handleTralisMcpConnected = (token: string, data: McpSession) => {
    // Nettoyage proactif de tout vestige legacy de localStorage
    localStorage.removeItem('vmind_mcp_token');
    localStorage.removeItem('vmind_connector_status');
    localStorage.removeItem('vmind_client_id');
    localStorage.removeItem('vmind_allowed_agents');

    console.log('[ConnectorsHub] 🔗 connecté — user:', data.user?.username);
    setTralisSession(data);
    setTralisStatus('connected');
    window.dispatchEvent(new CustomEvent('mcp-session-updated', { detail: data }));
  };

  /** Called by TralisConnectorPanel on explicit disconnect */
  const handleTralisMcpDisconnected = async () => {
    const vmindToken = getVmindSessionToken();
    let remainingAgents: string[] = [];
    if (vmindToken) {
      try {
        const res = await fetch(`${baseUrl}/api/connectors/tralis/disconnect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${vmindToken}`
          }
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
    }
    localStorage.removeItem('vmind_mcp_token');
    localStorage.removeItem('vmind_connector_status');
    localStorage.removeItem('vmind_client_id');
    localStorage.removeItem('vmind_allowed_agents');
    console.log('[ConnectorsHub] 🔌 Déconnecté TraLIS — agents restants:', remainingAgents);
    setTralisSession(null);
    setTralisStatus('idle');
    window.dispatchEvent(new CustomEvent('mcp-session-updated', { detail: null }));
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
