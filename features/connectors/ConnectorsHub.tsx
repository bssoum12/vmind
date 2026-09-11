'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ConnectorsCatalog } from './components/ConnectorsCatalog';
import { TralisConnectorPanel } from './components/TralisConnectorPanel';
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

    console.log('[ConnectorsHub] Récupération des sessions de connecteurs actives depuis PostgreSQL');
    try {
      const res = await fetch(`${baseUrl}/api/connectors/active-sessions`, {
        headers: { Authorization: `Bearer ${vmindToken}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.sessions)) {
          const tralisSessionData = data.sessions.find((s: any) => s.connector_type === 'tralis');
          if (tralisSessionData && tralisSessionData.connector_token) {
            const token = tralisSessionData.connector_token;
            // Valider le token MCP
            const meRes = await fetch(`${baseUrl}/api/mcp/auth/me`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (meRes.ok) {
              const meData = await meRes.json();
              console.log('[ConnectorsHub] ✅ Session MCP restaurée via la base de données');
              localStorage.setItem('vmind_mcp_token', token);
              if (meData.user && Array.isArray(meData.user.allowedAgents)) {
                localStorage.setItem('vmind_allowed_agents', JSON.stringify(meData.user.allowedAgents));
              }
              setTralisSession(meData);
              setTralisStatus('connected');
              window.dispatchEvent(new Event('mcp-session-updated'));
              return;
            }
          }
        }
      }

      // Si aucune session active n'est trouvée ou si la validation a échoué
      localStorage.removeItem('vmind_mcp_token');
      localStorage.removeItem('vmind_allowed_agents');
      setTralisSession(null);
      setTralisStatus('idle');
      window.dispatchEvent(new Event('mcp-session-updated'));
    } catch (err) {
      console.error('[ConnectorsHub] Erreur lors de l\'initialisation des connecteurs:', err);
      setTralisStatus('error');
    }
  }, [baseUrl]);

  // Run ONCE when the Hub first mounts (not on every panel switch)
  useEffect(() => { initTralisMcp(); }, [initTralisMcp]);

  /** Called by TralisConnectorPanel after a successful login */
  const handleTralisMcpConnected = (token: string, data: McpSession) => {
    localStorage.setItem('vmind_mcp_token', token);
    if (data.user && Array.isArray(data.user.allowedAgents)) {
      localStorage.setItem('vmind_allowed_agents', JSON.stringify(data.user.allowedAgents));
    }
    console.log('[ConnectorsHub] 🔗 connecté — user:', data.user?.username);
    setTralisSession(data);
    setTralisStatus('connected');
    window.dispatchEvent(new Event('mcp-session-updated'));
  };

  /** Called by TralisConnectorPanel on explicit disconnect */
  const handleTralisMcpDisconnected = async () => {
    const vmindToken = getVmindSessionToken();
    let remainingAgents: string[] = [];
    if (vmindToken) {
      try {
        const res = await fetch(`${baseUrl}/api/connectors/disconnect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${vmindToken}`
          },
          body: JSON.stringify({ connector_type: 'tralis' })
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
    localStorage.setItem('vmind_allowed_agents', JSON.stringify(remainingAgents));
    console.log('[ConnectorsHub] 🔌 déconnecté MCP — agents restants après union:', remainingAgents);
    setTralisSession(null);
    setTralisStatus('idle');
    window.dispatchEvent(new Event('mcp-session-updated'));
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

        {activeConnector === 'odoo' && <ComingSoonPanel name="Odoo MCP" />}
        {activeConnector === 'web'   && <ComingSoonPanel name="Recherche Web" />}
      </div>
    </div>
  );
};
