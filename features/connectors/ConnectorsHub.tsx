'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ConnectorsCatalog } from './components/ConnectorsCatalog';
import { TralisConnectorPanel } from './components/TralisConnectorPanel';
import { OdooConnectorPanel } from './components/OdooConnectorPanel';
import { GenericErpConnectorPanel } from './components/GenericErpConnectorPanel';
import { ComingSoonPanel } from './components/ComingSoonPanel';
import { broadcastMcpSessionUpdate } from '@/shared/utils/sessionBroadcast';
import { useConnections } from '@/shared/contexts/ConnectionsContext';

export interface McpSession {
  // The VMIND user: the only identity used for names and permissions
  user: {
    username: string;
    client_id: string;
    roles: string[];
    allowedAgents: string[];
  };
  // The ERP login of the connection, shown only as connection information
  erp: {
    username: string;
    roles: string[];
  };
  tools: string[];
  allTools?: any[];
}

const ALL_AGENTS = ['VDATA', 'VFIN', 'VSELL', 'VSTOCK', 'VBUY', 'VMOVE'];
const ADMIN_ROLES = ['Administrator', 'Administrators', 'Admin', 'Superusers', 'SuperAdmin'];

const toRoleList = (raw: unknown): string[] =>
  Array.isArray(raw) ? raw.filter((r): r is string => typeof r === 'string') : typeof raw === 'string' && raw ? [raw] : [];

function buildMcpSession(status: any, vmindUser: any): McpSession {
  const roles = toRoleList(vmindUser?.roles ?? vmindUser?.role);
  const isAdmin = roles.some((r) => ADMIN_ROLES.includes(r));
  const receivedAgents: string[] = Array.isArray(status.allowedAgents) ? status.allowedAgents : [];
  return {
    user: {
      username: vmindUser?.username || '',
      client_id: status.client_id || 'DEMO',
      roles,
      allowedAgents: receivedAgents.length > 0 ? receivedAgents : isAdmin ? ALL_AGENTS : [],
    },
    erp: {
      username: status.erp_username || '',
      roles: toRoleList(status.roles),
    },
    tools: status.tools || [],
    allTools: status.allTools || [],
  };
}

export const ConnectorsHub: React.FC = () => {
  const [activeConnector, setActiveConnector] = useState<string>('tralis');
  const { erpTypes } = useConnections();

  const [tralisStatus, setTralisStatus] = useState<'loading' | 'idle' | 'connected' | 'error'>('loading');
  const [tralisSession, setTralisSession] = useState<McpSession | null>(null);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';

  const initTralisMcp = useCallback(async () => {
    try {
      const res = await fetch(`${baseUrl}/api/connectors/tralis/status`, {
        credentials: 'include'
      });

      localStorage.removeItem('vmind_session');
      localStorage.removeItem('vmind_mcp_token');
      localStorage.removeItem('vmind_connector_status');
      localStorage.removeItem('vmind_client_id');
      localStorage.removeItem('vmind_allowed_agents');

      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.connected) {
          const meRes = await fetch(`${baseUrl}/api/auth/vmind/me`, { credentials: 'include' }).catch(() => null);
          const me = meRes?.ok ? await meRes.json() : null;
          const sessionObj = buildMcpSession(data, me?.user);

          setTralisSession(sessionObj);
          setTralisStatus('connected');
          // The ERP roles stay out of the broadcast: listeners must only see the VMIND user's roles
          const { roles: _erpRoles, ...statusWithoutErpRoles } = data;
          broadcastMcpSessionUpdate({ ...statusWithoutErpRoles, ...sessionObj, connected: true });
          return;
        }
      }

      setTralisSession(null);
      setTralisStatus('idle');
      broadcastMcpSessionUpdate(null);
    } catch (err) {
      console.error('[ConnectorsHub] Erreur lors de l\'initialisation des connecteurs:', err);
      setTralisStatus('error');
    }
  }, [baseUrl]);

  useEffect(() => { initTralisMcp(); }, [initTralisMcp]);

  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'VMIND_MCP_CONNECTED') {
        if (event.data.success) {
          initTralisMcp();
        }
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [initTralisMcp]);

  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail;
      if (detail && detail.connected === true) {
        // A broadcast from this hub carries the VMIND user and the ERP login: use it as it is,
        // even with an empty tool list (TraLIS quota reached), so it never triggers a new status call
        if (!detail.user || !detail.erp) {
          initTralisMcp();
          return;
        }
        setTralisSession({
          user: detail.user,
          erp: detail.erp,
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
  }, [initTralisMcp]);

  const handleTralisMcpConnected = useCallback((_token: string, _data: any) => {
    initTralisMcp();
  }, [initTralisMcp]);

  // Stable entre les rendus pour ne pas relancer la découverte des outils du panneau
  const handleTralisMcpDisconnected = useCallback(async () => {
    try {
      await fetch(`${baseUrl}/api/connectors/tralis/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
    } catch (err) {
      console.error('[ConnectorsHub] Failed to disconnect on backend:', err);
    }
    localStorage.removeItem('vmind_session');
    localStorage.removeItem('vmind_mcp_token');
    localStorage.removeItem('vmind_connector_status');
    localStorage.removeItem('vmind_client_id');
    localStorage.removeItem('vmind_allowed_agents');
    setTralisSession(null);
    setTralisStatus('idle');
    broadcastMcpSessionUpdate(null);
  }, [baseUrl]);

  return (
    <div className="connectors-hub-wrap">
      <ConnectorsCatalog
        activeConnector={activeConnector}
        onSelectConnector={setActiveConnector}
        tralisConnected={tralisStatus === 'connected'}
      />

      <div className="connectors-content-panel">
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

        {erpTypes
          .filter(e => e.id !== 'tralis' && e.id !== 'odoo')
          .map(erp => (
            <div key={erp.id} style={{ display: activeConnector === erp.id ? 'block' : 'none' }}>
              <GenericErpConnectorPanel erpType={erp} />
            </div>
          ))}

        {activeConnector === 'web' && <ComingSoonPanel name="Recherche Web" />}
      </div>
    </div>
  );
};
