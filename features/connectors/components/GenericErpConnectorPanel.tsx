'use client';

import React, { useState } from 'react';
import { Database, ShieldCheck, Link2, CheckCircle2, AlertTriangle, RefreshCw, Unlink, Globe } from 'lucide-react';
import { ErpType, UserConnection } from '@/shared/api/connections-api';
import { useConnections } from '@/shared/contexts/ConnectionsContext';

interface GenericErpConnectorPanelProps {
  erpType: ErpType;
}

export const GenericErpConnectorPanel: React.FC<GenericErpConnectorPanelProps> = ({ erpType }) => {
  const { connections, activeConnection, connectErp, selectActiveConnection, disconnect } = useConnections();
  const [customMcpUrl, setCustomMcpUrl] = useState(erpType.default_mcp_url || '');
  const [loading, setLoading] = useState(false);

  const connection = connections.find(c => c.connector_type === erpType.id);
  const isConnected = connection && connection.status === 'connected';
  const isNeedsReauth = connection && connection.status === 'needs_reauth';
  const isActive = activeConnection?.id === connection?.id;

  const handleConnect = async () => {
    try {
      setLoading(true);
      await connectErp(erpType.id, customMcpUrl.trim() || undefined);
    } catch {
      // Error is caught and displayed by ConnectionsContext toast
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!connection) return;
    try {
      setLoading(true);
      await selectActiveConnection(connection.id);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection) return;
    try {
      setLoading(true);
      await disconnect(connection.id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '32px 40px', maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'rgba(0, 229, 200, 0.1)',
            border: '1px solid rgba(0, 229, 200, 0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00E5C8'
          }}>
            <Database size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 4px 0', color: '#fff' }}>
              Connecteur {erpType.display_name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#8FA3B8' }}>Protocole standard MCP</span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: isConnected ? '#00E5C8' : (isNeedsReauth ? '#FFB800' : '#6A7E95'),
                  boxShadow: isConnected ? '0 0 8px #00E5C8' : 'none'
                }} />
                <span style={{
                  fontSize: '12px', fontWeight: 600,
                  color: isConnected ? '#00E5C8' : (isNeedsReauth ? '#FFB800' : '#8FA3B8')
                }}>
                  {isConnected ? (isActive ? 'Connecté & Actif' : 'Connecté') : (isNeedsReauth ? 'Ré-authentification requise' : 'Déconnecté')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action button */}
        {isConnected && (
          <div style={{ display: 'flex', gap: '10px' }}>
            {!isActive && (
              <button
                onClick={handleActivate}
                disabled={loading}
                style={{
                  background: 'rgba(0, 229, 200, 0.15)',
                  border: '1px solid rgba(0, 229, 200, 0.3)',
                  color: '#00E5C8',
                  padding: '8px 16px', borderRadius: '8px',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <CheckCircle2 size={14} /> Définir comme actif
              </button>
            )}
            <button
              onClick={handleDisconnect}
              disabled={loading}
              style={{
                background: 'rgba(255, 71, 87, 0.1)',
                border: '1px solid rgba(255, 71, 87, 0.2)',
                color: '#ff4757',
                padding: '8px 16px', borderRadius: '8px',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <Unlink size={14} /> Déconnecter
            </button>
          </div>
        )}
      </div>

      <p style={{ color: '#8FA3B8', fontSize: '13.5px', lineHeight: 1.6, marginBottom: '28px' }}>
        Le connecteur {erpType.display_name} s'appuie sur le protocole standard Model Context Protocol (MCP).
        L'authentification s'effectue via OAuth 2.1 avec PKCE directement sur le serveur ERP, sans jamais exposer les identifiants à VMIND.
      </p>

      {/* Connected State Card */}
      {isConnected && (
        <div style={{
          background: 'rgba(5, 12, 24, 0.5)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '14px',
          padding: '20px 24px',
          marginBottom: '28px'
        }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#6A7E95', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 0, marginBottom: '16px' }}>
            Informations de session
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#6A7E95', marginBottom: '4px' }}>SERVEUR MCP</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', wordBreak: 'break-all' }}>{connection?.mcp_url || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#6A7E95', marginBottom: '4px' }}>TENANT / CLIENT ID</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{connection?.client_id || 'DEMO'}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#6A7E95', marginBottom: '4px' }}>DERNIÈRE UTILISATION</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                {connection?.last_used_at ? new Date(connection.last_used_at).toLocaleString('fr-FR') : 'Récent'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#6A7E95', marginBottom: '4px' }}>STATUT DU JETON</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#00E5C8' }}>Opaque Chiffré AES-GCM</div>
            </div>
          </div>
        </div>
      )}

      {/* Disconnected / Connect form */}
      {!isConnected && (
        <div style={{
          background: 'rgba(10, 18, 32, 0.6)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', color: '#fff' }}>
            {isNeedsReauth ? 'Renouveler l\'autorisation ERP' : 'Connecter cet ERP'}
          </h2>
          <p style={{ color: '#8FA3B8', fontSize: '13px', marginBottom: '20px', lineHeight: 1.5 }}>
            Spécifier l'adresse du serveur MCP de cet ERP pour déclencher le flux d'autorisation OAuth 2.1 avec PKCE.
          </p>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#8FA3B8', fontWeight: 600, marginBottom: '6px' }}>
              URL du serveur MCP <span style={{ color: '#00E5C8' }}>*</span>
            </label>
            <input
              type="text"
              value={customMcpUrl}
              onChange={e => setCustomMcpUrl(e.target.value)}
              placeholder="https://erp-mcp.company.com/mcp"
              style={{
                width: '100%',
                padding: '12px 14px',
                boxSizing: 'border-box',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <button
            onClick={handleConnect}
            disabled={loading || !customMcpUrl.trim()}
            style={{
              width: '100%',
              background: 'linear-gradient(90deg, #00E5C8 0%, #21F3D6 100%)',
              color: '#021010',
              border: 'none',
              padding: '14px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 0 20px rgba(0, 229, 200, 0.2)',
              opacity: loading || !customMcpUrl.trim() ? 0.6 : 1
            }}
          >
            <ShieldCheck size={18} />
            {loading ? 'Connexion en cours…' : 'Connexion sécurisée OAuth 2.1 (PKCE)'}
          </button>
        </div>
      )}
    </div>
  );
};
