'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ConnectorsCatalog } from './components/ConnectorsCatalog';
import { TralisConnectorPanel } from './components/TralisConnectorPanel';
import { ComingSoonPanel } from './components/ComingSoonPanel';

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

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  /**
   * Single source of truth: called once on Hub mount.
   * Reads vmind_mcp_token from localStorage and validates with backend.
   * If valid  → keeps Hub-level state as "connected" forever until explicit disconnect.
   * If invalid → removes token silently, sets idle.
   */
  const initTralisMcp = useCallback(async () => {
    const token = localStorage.getItem('vmind_mcp_token');
    if (!token) {
      console.log('[ConnectorsHub] vmind_mcp_token absent → idle');
      setTralisStatus('idle');
      return;
    }

    console.log('[ConnectorsHub] vmind_mcp_token présent → validation /api/mcp/auth/me');
    try {
      const res = await fetch(`${baseUrl}/api/mcp/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        console.log('[ConnectorsHub] ✅ session MCP restaurée — user:', data.user?.username);
        setTralisSession(data);
        setTralisStatus('connected');
        window.dispatchEvent(new Event('mcp-session-updated'));
      } else {
        console.warn('[ConnectorsHub] ❌ token MCP invalide (', res.status, ') → suppression');
        localStorage.removeItem('vmind_mcp_token');
        setTralisStatus('idle');
        window.dispatchEvent(new Event('mcp-session-updated'));
      }
    } catch (err) {
      console.error('[ConnectorsHub] erreur réseau:', err);
      setTralisStatus('error');
    }
  }, [baseUrl]);

  // Run ONCE when the Hub first mounts (not on every panel switch)
  useEffect(() => { initTralisMcp(); }, [initTralisMcp]);

  /** Called by TralisConnectorPanel after a successful login */
  const handleTralisMcpConnected = (token: string, data: McpSession) => {
    localStorage.setItem('vmind_mcp_token', token);
    console.log('[ConnectorsHub] 🔗 connecté — user:', data.user?.username);
    setTralisSession(data);
    setTralisStatus('connected');
    window.dispatchEvent(new Event('mcp-session-updated'));
  };

  /** Called by TralisConnectorPanel on explicit disconnect */
  const handleTralisMcpDisconnected = () => {
    localStorage.removeItem('vmind_mcp_token');
    console.log('[ConnectorsHub] 🔌 déconnecté MCP — vmind_session conservée');
    setTralisSession(null);
    setTralisStatus('idle');
    window.dispatchEvent(new Event('mcp-session-updated'));
  };

  return (
    <div style={{
      display: 'flex',
      width: '100%',
      height: '100%',
      backgroundColor: '#050B16',
      color: '#fff',
      fontFamily: "'Inter', sans-serif",
    }}>
      <ConnectorsCatalog
        activeConnector={activeConnector}
        onSelectConnector={setActiveConnector}
        tralisConnected={tralisStatus === 'connected'}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
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
