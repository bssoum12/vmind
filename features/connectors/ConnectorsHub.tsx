'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ConnectorsCatalog } from './components/ConnectorsCatalog';
import { GenericErpConnectorPanel } from './components/GenericErpConnectorPanel';
import { ComingSoonPanel } from './components/ComingSoonPanel';
import { broadcastMcpSessionUpdate } from '@/shared/utils/sessionBroadcast';
import { useConnections } from '@/shared/contexts/ConnectionsContext';

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

const DEFAULT_ERP_TYPES = [
  {
    id: 'tralis',
    display_name: 'TraLIS ERP',
    icon_url: '',
    default_mcp_url: 'https://untaxed-arrange-wifi.ngrok-free.dev/mcp',
    auth_mode: 'oauth2',
    capabilities: {},
    enabled: true,
    sort_order: 1
  },
  {
    id: 'sage',
    display_name: 'Sage X3',
    icon_url: '',
    default_mcp_url: '',
    auth_mode: 'oauth2',
    capabilities: {},
    enabled: true,
    sort_order: 2
  },
  {
    id: 'odoo',
    display_name: 'Odoo',
    icon_url: '',
    default_mcp_url: '',
    auth_mode: 'oauth2',
    capabilities: {},
    enabled: true,
    sort_order: 3
  },
  {
    id: 'sap',
    display_name: 'SAP S/4HANA',
    icon_url: '',
    default_mcp_url: '',
    auth_mode: 'oauth2',
    capabilities: {},
    enabled: true,
    sort_order: 4
  }
];

export const ConnectorsHub: React.FC = () => {
  const [activeConnector, setActiveConnector] = useState<string>('tralis');
  const { erpTypes, connections } = useConnections();

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
          const ALL_AGENTS = ['VDATA', 'VFIN', 'VSELL', 'VSTOCK', 'VBUY', 'VMOVE'];
          const receivedRoles: string[] = data.roles || ['Administrator'];
          const isAdmin = receivedRoles.some((r: string) =>
            ['Administrator', 'Administrators', 'Admin', 'Superusers', 'SuperAdmin'].includes(r)
          );
          const receivedAgents: string[] = data.allowedAgents || [];
          const resolvedAgents = receivedAgents.length > 0 ? receivedAgents : (isAdmin ? ALL_AGENTS : []);

          const sessionObj: McpSession = {
            user: {
              username: data.erp_username || '',
              client_id: data.client_id || 'DEMO',
              roles: receivedRoles,
              allowedAgents: resolvedAgents
            },
            tools: data.tools || [],
            allTools: data.allTools || []
          };

          setTralisSession(sessionObj);
          setTralisStatus('connected');
          broadcastMcpSessionUpdate({ ...sessionObj, ...data, connected: true });
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
        if (!detail.tools || detail.tools.length === 0 || !detail.allTools || detail.allTools.length === 0) {
          initTralisMcp();
          return;
        }

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
  }, [initTralisMcp]);

  const isTralisConnected = connections.some(c => c.connector_type === 'tralis' && c.status === 'connected') || tralisStatus === 'connected';
  const catalogErps = erpTypes.length > 0 ? erpTypes : DEFAULT_ERP_TYPES;

  return (
    <div className="connectors-hub-wrap">
      <ConnectorsCatalog
        activeConnector={activeConnector}
        onSelectConnector={setActiveConnector}
        tralisConnected={isTralisConnected}
      />

      <div className="connectors-content-panel">
        {catalogErps.map(erp => (
          <div key={erp.id} style={{ display: activeConnector === erp.id ? 'block' : 'none' }}>
            <GenericErpConnectorPanel erpType={erp} />
          </div>
        ))}

        {activeConnector === 'web' && <ComingSoonPanel name="Recherche Web" />}
      </div>
    </div>
  );
};
