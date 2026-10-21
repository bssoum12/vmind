import { VmindN8nResponse } from '../types/vmind';
import { getBrowserTimezone } from '@/shared/utils/timezone';

function getVmindSessionId() {
  let sessionId = typeof window !== 'undefined' ? sessionStorage.getItem("vmind_session_id") : null;

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    if (typeof window !== 'undefined') {
      sessionStorage.setItem("vmind_session_id", sessionId);
    }
  }

  return sessionId;
}

export const secureFetch = (url: string | URL, init: RequestInit = {}) => {
  return fetch(url, {
    ...init,
    credentials: 'include'
  });
};

const getAuthHeaders = (baseHeaders: Record<string, string> = {}): Record<string, string> => {
  return baseHeaders;
};

/**
 * Appelle n8n via le Proxy du Backend pour éviter les problèmes de CORS
 */
export async function sendVmindMessage(
  message: string,
  conversationId: string,
  agentId: string,
  clientId = "DEMO",
  signal?: AbortSignal,
  connectionId?: number | string | null,
  selectedSkills?: string[]
): Promise<VmindN8nResponse> {
  const sessionId = getVmindSessionId();

  // On utilise une variable d'environnement pour Vercel, ou localhost par défaut
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://localhost:3001";
  const proxyUrl = `${baseUrl}/api/n8n-proxy`;

  const agentCode = (agentId || "VFIN").toUpperCase();
  console.log("🚀 [n8n-api] PAYLOAD ENVOYÉ:", { message, client_id: clientId, connection_id: connectionId, vmind_session_id: sessionId, conversation_id: conversationId, agent_id: agentId, agent: agentCode, selected_skills: selectedSkills });

  try {
    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        message,
        client_id: clientId,
        connection_id: connectionId,
        vmind_session_id: sessionId,
        conversation_id: conversationId,
        agent_id: agentId,
        agent: agentCode,
        ...(selectedSkills && selectedSkills.length > 0 ? { selected_skills: selectedSkills.slice(0, 3) } : {})
      }),
      signal
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      let rawMsg = errData.message || `Erreur de communication (${response.status})`;
      if (rawMsg.includes("n8n responded with status") || rawMsg.includes("status 500") || response.status === 500) {
        rawMsg = "Erreur de traitement. Veuillez relancer la demande d'analyse.";
      } else if (rawMsg.toLowerCase().includes("fetch failed") || rawMsg.toLowerCase().includes("failed to fetch") || rawMsg.toLowerCase().includes("econnrefused")) {
        rawMsg = "Erreur de connexion. Le service d'analyse est temporairement inaccessible.";
      }
      throw new Error(rawMsg);
    }

    const data = await response.json();
    console.log("📥 [n8n-api] RÉPONSE BRUTE PROXY:", data);

    // n8n returns an array of items. We want the first one's JSON content or the item itself.
    let finalData = data;
    if (Array.isArray(data)) {
      if (data.length > 0) {
        // If n8n structure is [{ json: { ... } }] or directly [{ ... }]
        finalData = data[0].json || data[0];
      } else {
        throw new Error("n8n a renvoyé un tableau vide.");
      }
    }

    console.log("📩 [n8n-api] DONNÉES DÉBALLÉES (FINAL):", finalData);

    // The vmind-max-reminders event is now handled by Server-Sent Events (SSE)
    // from the Node.js backend to decouple it from the chat entirely.

    return finalData;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log("🛑 [n8n-api] Fetch aborted by AbortController (user switched conversation).");
      return { ok: false, error: 'ABORTED', message: 'Requete annulée' } as unknown as VmindN8nResponse;
    }
    console.error("❌ [n8n-api] FETCH ERROR:", error);
    let msg = error?.message || "";
    if (msg.toLowerCase().includes("fetch failed") || msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("econnrefused")) {
      throw new Error("Erreur de connexion. Le service d'analyse est temporairement inaccessible.");
    }
    throw error;
  }
}

export async function deployAgent(config: any, clientId = "DEMO"): Promise<any> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://localhost:3001";
  const webhookUrl = `${baseUrl}/api/deploy-agent`;
  
  console.log("🚀 [n8n-api] DEPLOYING AGENT WITH PAYLOAD TO BACKEND SCHEDULER:", config);

  // Wrap in the array format expected by the backend
  const payloadArray = [
    {
      ...config,
      client_id: clientId,
      user_id: clientId
    }
  ];

  const response = await secureFetch(webhookUrl, {
    method: "POST",
    headers: getAuthHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(payloadArray)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || errData.error || `Erreur lors du déploiement via le scheduler Vmind: ${response.statusText}`);
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    return { status: "success", rawText: text };
  }
}

/**
 * Appelle le Backend pour réinitialiser les compteurs de relance des factures ignorées
 */
export async function resetReminders(invoiceRefs: string[]): Promise<any> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://localhost:3001";
  const url = `${baseUrl}/api/recovery/reset-reminders`;
  
  console.log("🔄 [n8n-api] RESETTING REMINDERS FOR:", invoiceRefs);

  const response = await secureFetch(url, {
    method: "POST",
    headers: getAuthHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify({ invoice_refs: invoiceRefs })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Erreur de réinitialisation (${response.status})`);
  }

  return response.json();
}

// ─── Agent Management APIs ──────────
// ──────────────────────────────────────────
 
const getBaseUrl = () => process.env.NEXT_PUBLIC_API_URL || "https://localhost:3001";

let inFlightGetAgents: Promise<any[]> | null = null;
let cachedAgents: { data: any[]; timestamp: number } | null = null;
let inFlightMarketplaceStats: Promise<MarketplaceStatsResponse> | null = null;
let cachedMarketplaceStats: { data: MarketplaceStatsResponse; timestamp: number } | null = null;
const CACHE_TTL_MS = 2500; // 2.5 seconds cache to deduplicate rapid successive calls

export function invalidateAgentsCache(): void {
  cachedAgents = null;
  cachedMarketplaceStats = null;
  cachedLeadsRange = null;
}

/**
 * Fetches all deployed agents from Redis (via backend) with deduplication & caching
 */
export async function getAgents(forceRefresh: boolean = false): Promise<any[]> {
  const now = Date.now();
  if (!forceRefresh && cachedAgents && (now - cachedAgents.timestamp < CACHE_TTL_MS)) {
    return cachedAgents.data;
  }
  if (inFlightGetAgents) {
    return inFlightGetAgents;
  }
  inFlightGetAgents = (async () => {
    try {
      const res = await secureFetch(`${getBaseUrl()}/api/list-agents`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error(`Impossible de récupérer la liste des agents (${res.status})`);
      const data = await res.json();
      const agents = data.agents || [];
      cachedAgents = { data: agents, timestamp: Date.now() };
      return agents;
    } finally {
      inFlightGetAgents = null;
    }
  })();
  return inFlightGetAgents;
}

export interface MarketplaceStatsResponse {
  ok: boolean;
  templateDeployments: Record<string, number>;
  sidebarStats: {
    executionsToday: number;
    activeAgentsCount: number;
    successRate: number;
  };
}

export async function getMarketplaceStats(forceRefresh: boolean = false): Promise<MarketplaceStatsResponse> {
  const now = Date.now();
  if (!forceRefresh && cachedMarketplaceStats && (now - cachedMarketplaceStats.timestamp < CACHE_TTL_MS)) {
    return cachedMarketplaceStats.data;
  }
  if (inFlightMarketplaceStats) {
    return inFlightMarketplaceStats;
  }
  inFlightMarketplaceStats = (async () => {
    try {
      const res = await secureFetch(`${getBaseUrl()}/api/analytics/marketplace-stats`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return { ok: false, templateDeployments: {}, sidebarStats: { executionsToday: 0, activeAgentsCount: 0, successRate: 97 } };
      const data = await res.json();
      cachedMarketplaceStats = { data, timestamp: Date.now() };
      return data;
    } catch (_) {
      return { ok: false, templateDeployments: {}, sidebarStats: { executionsToday: 0, activeAgentsCount: 0, successRate: 97 } };
    } finally {
      inFlightMarketplaceStats = null;
    }
  })();
  return inFlightMarketplaceStats;
}

/**
 * Pauses an agent — removes its QStash schedule but keeps config in Redis
 */
export async function pauseAgent(agentName: string): Promise<any> {
  const res = await secureFetch(`${getBaseUrl()}/api/pause-agent/${encodeURIComponent(agentName)}`, {
    method: "POST",
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erreur lors de la mise en pause de l'agent (${res.status})`);
  }
  const result = await res.json();
  invalidateAgentsCache();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vmind_agent_updated'));
  }
  return result;
}

/**
 * Resumes a paused agent — recreates its QStash schedule from stored trigger_rules
 */
export async function resumeAgent(agentName: string, params?: any): Promise<any> {
  const finalParams = {
    ...(params || {}),
    workflow_timezone: params?.workflow_timezone || getBrowserTimezone()
  };
  const res = await secureFetch(`${getBaseUrl()}/api/resume-agent/${encodeURIComponent(agentName)}`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(finalParams)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erreur lors de la reprise de l'agent (${res.status})`);
  }
  const result = await res.json();
  invalidateAgentsCache();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vmind_agent_updated'));
  }
  return result;
}

/**
 * Deletes an agent completely (removes from Redis + cancels QStash schedule)
 */
export async function deleteAgent(agentName: string): Promise<any> {
  const res = await secureFetch(`${getBaseUrl()}/api/delete-agent/${encodeURIComponent(agentName)}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erreur lors de la suppression de l'agent (${res.status})`);
  }
  const result = await res.json();
  invalidateAgentsCache();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vmind_agent_updated'));
  }
  return result;
}

/**
 * Updates only the recovery_config of a deployed agent.
 * If the agent has a running schedule, it is recreated with the new config.
 */
export async function updateAgentConfig(agentName: string, recoveryConfig: object): Promise<any> {
  const res = await secureFetch(`${getBaseUrl()}/api/update-agent-config/${encodeURIComponent(agentName)}`, {
    method: "PATCH",
    headers: { 
      "Content-Type": "application/json",
      ...getAuthHeaders()
    },
    body: JSON.stringify({
      recovery_config: recoveryConfig,
      workflow_timezone: getBrowserTimezone()
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erreur lors de la mise à jour de la configuration (${res.status})`);
  }
  return res.json();
}

/**
 * Triggers an immediate (one-shot) run of an agent, outside of its schedule
 */
export async function runAgentNow(agentName: string): Promise<any> {
  const res = await secureFetch(`${getBaseUrl()}/api/run-now/${encodeURIComponent(agentName)}`, {
    method: "POST",
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `Erreur lors du lancement de l'agent (${res.status})`);
  }
  return res.json();
}

/**
 * Get lead stats for a specific prospect agent
 */
export async function getProspectAgentStats(agentId: string): Promise<any> {
  const res = await secureFetch(`${getBaseUrl()}/api/stats/${encodeURIComponent(agentId)}`, {
    method: "GET",
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erreur lors de la récupération des statistiques (${res.status})`);
  }
  return res.json();
}

/**
 * Instantly qualify prospects for this agent (manually)
 */
export async function qualifyManualProspects(agentId: string, mode: 'pending_only' | 'all'): Promise<any> {
  const res = await secureFetch(`${getBaseUrl()}/api/prospect-agent/qualify-manual/${encodeURIComponent(agentId)}`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ mode })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erreur lors de la qualification manuelle des prospects (${res.status})`);
  }
  return res.json();
}

/**
 * Trigger AI Qualification (N8N_WEBHOOK_QUALIFY) for all pending leads
 */
export async function triggerAIQualificationAllPending(agentId: string): Promise<any> {
  const res = await secureFetch(`${getBaseUrl()}/api/prospect-agent/qualify-all-pending-ai/${encodeURIComponent(agentId)}`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
      'Idempotency-Key': `qualify-all-pending:${agentId}`
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erreur lors de la qualification automatique des prospects (${res.status})`);
  }
  return res.json();
}



/**
 * Appelle l'agent n8n KPI via le Proxy sécurisé du Backend
 */
export async function fetchN8nKpis(
  params: {
    allowed_agents: string;
    client_id: string;
    startDate: string;
    endDate: string;
    target_tool?: string;
    forceRefresh?: boolean;
    horizon?: string;
    connection_id?: number | string | null;
    erp_type?: string;
  },
  signal?: AbortSignal
): Promise<any> {
  const proxyUrl = `${getBaseUrl()}/api/n8n-proxy/kpis-agent`;
  const erp_name = params.erp_type || "tralis";

  const response = await secureFetch(proxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders()
    },
    body: JSON.stringify({
      allowed_agents: params.allowed_agents,
      erp_name,
      erp_type: erp_name,
      connection_id: params.connection_id,
      startDate: params.startDate,
      endDate: params.endDate,
      target_tool: params.target_tool,
      forceRefresh: params.forceRefresh,
      horizon: params.horizon || '1m'
    }),
    signal
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Erreur Proxy KPI (${response.status})`);
  }

  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (err) {
    console.warn("[KPI API] Response from proxy is not valid JSON:", text);
    return {};
  }
}

/**
 * Trigger immediate execution for Sourcing Agent
 */
export async function triggerSourcingRun(
  agentId: string, 
  params: {
    sourcingSummary?: string;
    totalLeads?: number;
    leadsPerCompany?: number;
    ignoreDuplicates?: boolean;
    target_agent_ids?: (string | number)[];
    update_defaults?: boolean;
    [key: string]: any;
  }
): Promise<any> {
  const res = await secureFetch(`${getBaseUrl()}/api/sourcing-agent/run/${encodeURIComponent(agentId)}`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erreur lors du déclenchement de l'agent de sourcing (${res.status})`);
  }
  return res.json();
}

export interface SourcingExecutionConfig {
  min: number;
  max: number;
  allowExistingCompaniesVisible: boolean;
}

let inFlightLeadsRange: Promise<SourcingExecutionConfig> | null = null;
let cachedLeadsRange: { data: SourcingExecutionConfig; timestamp: number } | null = null;

/**
 * Fetches the admin-configured execution parameters (leads range + options visibility) for Sourcing Agents.
 */
export async function getSourcingLeadsRange(forceFresh: boolean = false): Promise<SourcingExecutionConfig> {
  const now = Date.now();
  if (!forceFresh && cachedLeadsRange && (now - cachedLeadsRange.timestamp < 3000)) {
    return cachedLeadsRange.data;
  }
  if (inFlightLeadsRange) {
    return inFlightLeadsRange;
  }
  inFlightLeadsRange = (async () => {
    try {
      const res = await secureFetch(`${getBaseUrl()}/api/sourcing-agent/leads-range`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && typeof data.min === 'number' && typeof data.max === 'number') {
          const config = { 
            min: data.min, 
            max: data.max,
            allowExistingCompaniesVisible: data.allow_existing_companies_visible !== false
          };
          cachedLeadsRange = { data: config, timestamp: Date.now() };
          return config;
        }
      }
    } catch (err) {
      console.warn('[getSourcingLeadsRange] Error retrieving leads range, using default 1-15:', err);
    } finally {
      inFlightLeadsRange = null;
    }
    return { min: 1, max: 15, allowExistingCompaniesVisible: true };
  })();
  return inFlightLeadsRange;
}

/**
 * Trigger immediate execution for Prospect Agent (Auto Mode)
 */
export async function triggerProspectAutoMode(agentId: string): Promise<any> {
  const res = await secureFetch(`${getBaseUrl()}/api/run/${encodeURIComponent(agentId)}`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ mode: "auto" })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erreur lors du déclenchement de l'agent de prospection (${res.status})`);
  }
  return res.json();
}

