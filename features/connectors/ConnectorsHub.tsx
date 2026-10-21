'use client';

import React, { useState, useEffect } from 'react';
import { ConnectorsCatalog } from './components/ConnectorsCatalog';
import { GenericErpConnectorPanel } from './components/GenericErpConnectorPanel';
import { ComingSoonPanel } from './components/ComingSoonPanel';
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

export const ConnectorsHub: React.FC = () => {
  const { erpTypes, connections, loading } = useConnections();
  const [activeConnector, setActiveConnector] = useState<string>('');

  // Sélectionne dynamiquement le connecteur initial (zéro valeur en dur) :
  // 1. Connexion active (is_default)
  // 2. Première connexion connectée
  // 3. Premier ERP retourné par le catalogue de la base de données
  useEffect(() => {
    if (!activeConnector && erpTypes.length > 0) {
      const active = connections.find(c => c.is_default && c.status === 'connected')
        || connections.find(c => c.status === 'connected');
      if (active) {
        setActiveConnector(active.connector_type);
      } else {
        setActiveConnector(erpTypes[0].id);
      }
    }
  }, [erpTypes, connections, activeConnector]);

  return (
    <div className="connectors-hub-wrap">
      <ConnectorsCatalog
        activeConnector={activeConnector}
        onSelectConnector={setActiveConnector}
      />

      <div className="connectors-content-panel">
        {erpTypes.map(erp => (
          <div key={erp.id} style={{ display: activeConnector === erp.id ? 'block' : 'none' }}>
            <GenericErpConnectorPanel erpType={erp} />
          </div>
        ))}

        {activeConnector === 'web' && <ComingSoonPanel name="Recherche Web" />}

        {!loading && erpTypes.length === 0 && (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#8FA3B8' }}>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>Aucun connecteur disponible</p>
            <p style={{ fontSize: '13px' }}>Aucun type d'ERP n'est actuellement activé dans la configuration de la plateforme.</p>
          </div>
        )}
      </div>
    </div>
  );
};
