import { secureFetch } from './n8n-api';

const getBaseUrl = () => process.env.NEXT_PUBLIC_API_URL || "https://localhost:3001";

export interface ErpType {
  id: string;
  display_name: string;
  icon_url: string;
  default_mcp_url: string;
  auth_mode: string;
  capabilities: Record<string, boolean>;
  enabled: boolean;
  sort_order: number;
}

export interface UserConnection {
  id: number;
  connector_type: string;
  client_id: string;
  display_name?: string | null;
  mcp_url?: string | null;
  status: string;
  is_default: boolean;
  last_used_at?: string | null;
  last_error?: string | null;
  capabilities?: Record<string, any> | null;
  token_expires_at?: string | null;
  created_at?: string;
  erp_display_name?: string;
  erp_icon_url?: string;
}

/**
 * Récupère le catalogue des types d'ERP disponibles
 */
export async function fetchErpTypes(): Promise<ErpType[]> {
  const res = await secureFetch(`${getBaseUrl()}/api/mcp-connections/erp-types`);
  if (!res.ok) {
    throw new Error(`Impossible de récupérer les types d'ERP (${res.status})`);
  }
  const data = await res.json();
  return data.erp_types || [];
}

/**
 * Récupère la liste des connexions ERP configurées pour l'utilisateur
 */
export async function fetchUserConnections(): Promise<UserConnection[]> {
  const res = await secureFetch(`${getBaseUrl()}/api/mcp-connections`);
  if (!res.ok) {
    throw new Error(`Impossible de récupérer les connexions utilisateur (${res.status})`);
  }
  const data = await res.json();
  return data.connections || [];
}

/**
 * Démarre le flux OAuth 2.1 avec PKCE pour un connecteur ERP
 */
export async function startMcpConnection(
  connectorType: string,
  mcpUrl?: string,
  clientId?: string
): Promise<{ authorization_url: string; state: string }> {
  const res = await secureFetch(`${getBaseUrl()}/api/mcp-connections/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      connector_type: connectorType,
      mcp_url: mcpUrl,
      client_id: clientId
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erreur lors de l'initialisation de la connexion (${res.status})`);
  }

  return res.json();
}

/**
 * Active une connexion spécifique comme connexion active par défaut
 */
export async function activateConnection(connectionId: number): Promise<void> {
  const res = await secureFetch(`${getBaseUrl()}/api/mcp-connections/${connectionId}/activate`, {
    method: 'POST'
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erreur lors de l'activation de la connexion (${res.status})`);
  }
}

/**
 * Déconnecte une connexion ERP existante
 */
export async function disconnectConnection(connectionId: number): Promise<void> {
  const res = await secureFetch(`${getBaseUrl()}/api/mcp-connections/${connectionId}/disconnect`, {
    method: 'POST'
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erreur lors de la déconnexion (${res.status})`);
  }
}

export interface DiscoveredTool {
  name: string;
  description: string;
  inputSchema?: {
    type?: string;
    properties?: Record<string, { type?: string; description?: string }>;
    required?: string[];
  };
}

/**
 * Récupère dynamiquement les outils disponibles sur le serveur MCP connecté (standard MCP tools/list)
 */
export async function fetchConnectionTools(connectionId: number): Promise<DiscoveredTool[]> {
  const res = await secureFetch(`${getBaseUrl()}/api/mcp-connections/${connectionId}/tools`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Impossible de récupérer les outils du connecteur (${res.status})`);
  }
  const data = await res.json();
  return data.tools || [];
}
