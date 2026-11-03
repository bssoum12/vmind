'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Database,
  ShieldCheck,
  Link2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Unlink,
  Globe,
  Search,
  ChevronDown,
  ChevronRight,
  Terminal,
  Wrench,
  Info,
  Code2
} from 'lucide-react';
import { ErpType, UserConnection, DiscoveredTool, fetchConnectionTools } from '@/shared/api/connections-api';
import { useConnections } from '@/shared/contexts/ConnectionsContext';

interface GenericErpConnectorPanelProps {
  erpType: ErpType;
}

export const GenericErpConnectorPanel: React.FC<GenericErpConnectorPanelProps> = ({ erpType }) => {
  const { connections, activeConnection, connectErp, selectActiveConnection, disconnect } = useConnections();
  const [customMcpUrl, setCustomMcpUrl] = useState(erpType.default_mcp_url || '');
  const [loading, setLoading] = useState(false);

  // Outils découverts dynamiquement via standard MCP tools/list
  const [tools, setTools] = useState<DiscoveredTool[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [toolsError, setToolsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

  const connection = connections.find(c => c.connector_type === erpType.id);
  const isConnected = Boolean(connection && connection.status === 'connected');
  const isNeedsReauth = Boolean(connection && connection.status === 'needs_reauth');
  const isActive = activeConnection?.id === connection?.id;

  // Chargement dynamique des outils dès que le connecteur est connecté
  const loadTools = async (connId: number) => {
    try {
      setLoadingTools(true);
      setToolsError(null);
      const discovered = await fetchConnectionTools(connId);
      setTools(discovered);
    } catch (err: any) {
      console.error('[GENERIC-PANEL] Erreur découverte tools MCP:', err);
      setToolsError(err?.message || 'Impossible de récupérer la liste des outils');
      setTools([]);
    } finally {
      setLoadingTools(false);
    }
  };

  useEffect(() => {
    if (isConnected && connection?.id) {
      loadTools(connection.id);
    } else {
      setTools([]);
      setToolsError(null);
    }
  }, [isConnected, connection?.id]);

  const toggleToolExpand = (toolName: string) => {
    setExpandedTools(prev => ({
      ...prev,
      [toolName]: !prev[toolName]
    }));
  };

  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return tools;
    const q = searchQuery.toLowerCase();
    return tools.filter(
      t => t.name.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q))
    );
  }, [tools, searchQuery]);

  const handleConnect = async () => {
    try {
      setLoading(true);
      await connectErp(erpType.id, customMcpUrl.trim() || undefined);
    } catch {
      // Affiché par ConnectionsContext toast
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
    <div style={{ padding: '32px 40px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(0, 229, 200, 0.1)',
              border: '1px solid rgba(0, 229, 200, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00E5C8'
            }}
          >
            <Database size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 4px 0', color: '#fff' }}>
              Connecteur {erpType.display_name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#8FA3B8' }}>Protocole standard MCP (tools/list)</span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: isConnected ? '#00E5C8' : isNeedsReauth ? '#FFB800' : '#6A7E95',
                    boxShadow: isConnected ? '0 0 8px #00E5C8' : 'none'
                  }}
                />
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: isConnected ? '#00E5C8' : isNeedsReauth ? '#FFB800' : '#8FA3B8'
                  }}
                >
                  {isConnected ? (isActive ? 'Connecté & Actif' : 'Connecté') : isNeedsReauth ? 'Ré-authentification requise' : 'Déconnecté'}
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
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
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
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Unlink size={14} /> Déconnecter
            </button>
          </div>
        )}
      </div>

      <p style={{ color: '#8FA3B8', fontSize: '13.5px', lineHeight: 1.6, marginBottom: '28px' }}>
        Le connecteur {erpType.display_name} s'appuie sur le protocole standard Model Context Protocol (MCP).
        Les outils sont découverts dynamiquement au runtime sans catalogue figé en dur, à l'identique de Claude.
      </p>

      {/* Connected State Card */}
      {isConnected && (
        <>
          <div
            style={{
              background: 'rgba(5, 12, 24, 0.5)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '14px',
              padding: '20px 24px',
              marginBottom: '28px'
            }}
          >
            <h3
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#6A7E95',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginTop: 0,
                marginBottom: '16px'
              }}
            >
              Informations de session
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#6A7E95', marginBottom: '4px' }}>SERVEUR MCP</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', wordBreak: 'break-all' }}>
                  {connection?.mcp_url || '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#6A7E95', marginBottom: '4px' }}>TENANT / CLIENT ID</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                  {connection?.client_id || 'DEMO'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#6A7E95', marginBottom: '4px' }}>DERNIÈRE SYNCHRONISATION</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                  {connection?.last_used_at ? new Date(connection.last_used_at).toLocaleString('fr-FR') : 'Récent'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#6A7E95', marginBottom: '4px' }}>SÉCURITÉ DU JETON</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#00E5C8' }}>OAuth 2.1 (Auto-Refresh 1h)</div>
              </div>
            </div>
          </div>

          {/* Dynamic Tools Section (Standard MCP tools/list) */}
          <div
            style={{
              background: 'rgba(10, 18, 32, 0.6)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '24px 28px',
              marginBottom: '32px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', margin: 0 }}>
                    Outils MCP découverts
                  </h2>
                  <span
                    style={{
                      background: 'rgba(0, 229, 200, 0.15)',
                      color: '#00E5C8',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 700
                    }}
                  >
                    {loadingTools ? '…' : `${tools.length} disponible${tools.length > 1 ? 's' : ''}`}
                  </span>
                </div>
                <p style={{ color: '#8FA3B8', fontSize: '12.5px', margin: '4px 0 0 0' }}>
                  Outils renvoyés en temps réel par le serveur MCP via la commande standard <code>tools/list</code>
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {connection && (
                  <button
                    onClick={() => loadTools(connection.id)}
                    disabled={loadingTools}
                    title="Actualiser la liste des outils"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#8FA3B8',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px'
                    }}
                  >
                    <RefreshCw size={13} className={loadingTools ? 'animate-spin' : ''} />
                    Actualiser
                  </button>
                )}
              </div>
            </div>

            {/* Search Input */}
            {tools.length > 0 && (
              <div style={{ marginBottom: '16px', position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: '#6A7E95' }} />
                <input
                  type="text"
                  placeholder="Filtrer les outils par nom ou mot-clé..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 36px',
                    boxSizing: 'border-box',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>
            )}

            {/* Loading state */}
            {loadingTools && (
              <div style={{ padding: '36px', textAlign: 'center', color: '#8FA3B8', fontSize: '13px' }}>
                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px auto', display: 'block', color: '#00E5C8' }} />
                Interrogation du serveur MCP via JSON-RPC tools/list...
              </div>
            )}

            {/* Error state */}
            {!loadingTools && toolsError && (
              <div
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  background: 'rgba(255, 71, 87, 0.1)',
                  border: '1px solid rgba(255, 71, 87, 0.25)',
                  color: '#ff6b81',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <AlertTriangle size={18} />
                <span>{toolsError}</span>
              </div>
            )}

            {/* Empty list */}
            {!loadingTools && !toolsError && tools.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', color: '#8FA3B8', fontSize: '13px' }}>
                Aucun outil renvoyé par ce serveur MCP pour votre compte.
              </div>
            )}

            {/* Filtered Tools Grid */}
            {!loadingTools && !toolsError && filteredTools.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredTools.map(tool => {
                  const isExpanded = Boolean(expandedTools[tool.name]);
                  const properties = tool.inputSchema?.properties || {};
                  const requiredFields = new Set(tool.inputSchema?.required || []);
                  const propKeys = Object.keys(properties);

                  return (
                    <div
                      key={tool.name}
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        transition: 'border-color 0.2s'
                      }}
                    >
                      <div
                        onClick={() => toggleToolExpand(tool.name)}
                        style={{
                          padding: '14px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              color: '#00E5C8',
                              fontSize: '13.5px',
                              background: 'rgba(0, 229, 200, 0.08)',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              border: '1px solid rgba(0, 229, 200, 0.2)'
                            }}
                          >
                            {tool.name}
                          </span>
                          <span style={{ color: '#8FA3B8', fontSize: '13px' }}>
                            {tool.description || 'Aucune description fournie.'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {propKeys.length > 0 && (
                            <span style={{ fontSize: '11px', color: '#6A7E95', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                              {propKeys.length} paramètre{propKeys.length > 1 ? 's' : ''}
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronDown size={16} style={{ color: '#00E5C8' }} />
                          ) : (
                            <ChevronRight size={16} style={{ color: '#6A7E95' }} />
                          )}
                        </div>
                      </div>

                      {/* Expanded Schema Details */}
                      {isExpanded && (
                        <div
                          style={{
                            padding: '12px 16px 16px 16px',
                            borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                            background: 'rgba(0, 0, 0, 0.25)',
                            fontSize: '12px'
                          }}
                        >
                          <div style={{ color: '#6A7E95', fontWeight: 700, textTransform: 'uppercase', fontSize: '10.5px', marginBottom: '8px', letterSpacing: '0.05em' }}>
                            Paramètres attendus (JSON Schema)
                          </div>
                          {propKeys.length === 0 ? (
                            <div style={{ color: '#6A7E95', fontStyle: 'italic' }}>Aucun paramètre requis (exécution sans arguments).</div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {propKeys.map(key => {
                                const prop = properties[key];
                                const isReq = requiredFields.has(key);
                                return (
                                  <div
                                    key={key}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'baseline',
                                      gap: '8px',
                                      background: 'rgba(255,255,255,0.02)',
                                      padding: '6px 10px',
                                      borderRadius: '6px'
                                    }}
                                  >
                                    <span style={{ fontFamily: 'monospace', color: '#fff', fontWeight: 600 }}>{key}</span>
                                    <span style={{ color: '#00E5C8', fontSize: '11px' }}>({prop.type || 'string'})</span>
                                    {isReq && (
                                      <span style={{ color: '#ff4757', fontSize: '10px', fontWeight: 700, background: 'rgba(255,71,87,0.1)', padding: '1px 5px', borderRadius: '3px' }}>
                                        REQUIS
                                      </span>
                                    )}
                                    <span style={{ color: '#8FA3B8', marginLeft: 'auto', textAlign: 'right' }}>
                                      {prop.description || '—'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Disconnected / Connect form */}
      {!isConnected && (
        <div
          style={{
            background: 'rgba(10, 18, 32, 0.6)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', color: '#fff' }}>
            {isNeedsReauth ? "Renouveler l'autorisation ERP" : 'Connecter cet ERP'}
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
