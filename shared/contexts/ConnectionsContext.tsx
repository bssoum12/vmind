'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  ErpType,
  UserConnection,
  fetchErpTypes,
  fetchUserConnections,
  startMcpConnection,
  activateConnection,
  disconnectConnection
} from '../api/connections-api';
import { useToast } from './ToastContext';

interface ConnectionsContextType {
  erpTypes: ErpType[];
  connections: UserConnection[];
  activeConnection: UserConnection | null;
  loading: boolean;
  refreshConnections: () => Promise<void>;
  selectActiveConnection: (connectionId: number) => Promise<void>;
  connectErp: (connectorType: string, mcpUrl?: string) => Promise<void>;
  disconnect: (connectionId: number) => Promise<void>;
}

const ConnectionsContext = createContext<ConnectionsContextType | undefined>(undefined);

export function ConnectionsProvider({ children }: { children: React.ReactNode }) {
  const [erpTypes, setErpTypes] = useState<ErpType[]>([]);
  const [connections, setConnections] = useState<UserConnection[]>([]);
  const [activeConnection, setActiveConnection] = useState<UserConnection | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { showToast } = useToast();

  const refreshConnections = useCallback(async () => {
    try {
      const [types, userConns] = await Promise.all([
        fetchErpTypes().catch(() => []),
        fetchUserConnections().catch(() => [])
      ]);

      setErpTypes(types);
      setConnections(userConns);

      // Détermine la connexion active :
      // 1. Connexion avec is_default = true et status = 'connected'
      // 2. Première connexion avec status = 'connected'
      const active = userConns.find(c => c.is_default && c.status === 'connected')
        || userConns.find(c => c.status === 'connected')
        || null;

      setActiveConnection(active);
    } catch (err: any) {
      console.warn('[CONNECTIONS-CTX] Erreur rafraîchissement:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshConnections();

    // Écoute des retours d'authentification OAuth 2.1 via fenêtres popup
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'VMIND_MCP_CONNECTED') {
        if (event.data.success) {
          showToast('Connecteur ERP synchronisé avec succès !', 'success');
          refreshConnections();
        } else {
          showToast(event.data.error || 'Échec de connexion au serveur MCP', 'error');
        }
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [refreshConnections, showToast]);

  const selectActiveConnection = async (connectionId: number) => {
    try {
      await activateConnection(connectionId);
      await refreshConnections();
      showToast('Connecteur actif mis à jour', 'info');
    } catch (err: any) {
      showToast(err.message || 'Impossible d\'activer cette connexion', 'error');
    }
  };

  const connectErp = async (connectorType: string, mcpUrl?: string) => {
    try {
      const result = await startMcpConnection(connectorType, mcpUrl);
      if (result.authorization_url) {
        const width = 600;
        const height = 720;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
          result.authorization_url,
          'vmind_mcp_oauth',
          `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
        );

        if (!popup) {
          // Si le bloqueur de popup bloque, redirection classique
          window.location.href = result.authorization_url;
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Erreur lors du lancement de la connexion OAuth', 'error');
      throw err;
    }
  };

  const disconnect = async (connectionId: number) => {
    try {
      await disconnectConnection(connectionId);
      await refreshConnections();
      showToast('Connecteur déconnecté', 'info');
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la déconnexion', 'error');
    }
  };

  return (
    <ConnectionsContext.Provider
      value={{
        erpTypes,
        connections,
        activeConnection,
        loading,
        refreshConnections,
        selectActiveConnection,
        connectErp,
        disconnect
      }}
    >
      {children}
    </ConnectionsContext.Provider>
  );
}

export function useConnections() {
  const context = useContext(ConnectionsContext);
  if (!context) {
    throw new Error('useConnections doit être utilisé au sein d\'un ConnectionsProvider');
  }
  return context;
}
