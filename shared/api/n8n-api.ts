import { VmindN8nResponse } from '../types/vmind';

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

const getAuthHeaders = (baseHeaders: Record<string, string> = {}): Record<string, string> => {
  if (typeof window !== "undefined") {
    try {
      const sessionStr = localStorage.getItem("vmind_session");
      if (sessionStr) {
        let token = sessionStr;
        if (sessionStr.trim().startsWith("{")) {
          try {
            const parsed = JSON.parse(sessionStr);
            token = parsed?.token || parsed?.access_token || parsed?.user?.token || sessionStr;
          } catch (e) {}
        }
        if (token) {
          return { ...baseHeaders, "Authorization": `Bearer ${token}` };
        }
      }
    } catch (e) {
      console.warn("Could not retrieve session token:", e);
    }
  }
  return baseHeaders;
};

/**
 * Appelle n8n via le Proxy du Backend pour éviter les problèmes de CORS
 */
export async function sendVmindMessage(message: string, conversationId: string, agentId: string, clientId = "DEMO", signal?: AbortSignal): Promise<VmindN8nResponse> {
  const sessionId = getVmindSessionId();

  // On utilise une variable d'environnement pour Vercel, ou localhost par défaut
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://localhost:3001";
  const proxyUrl = `${baseUrl}/api/n8n-proxy`;

  console.log("🚀 [n8n-api] PAYLOAD ENVOYÉ:", { message, client_id: clientId, vmind_session_id: sessionId, conversation_id: conversationId, agent_id: agentId });

  let mcp_token;
  if (typeof window !== "undefined") {
    try {
      mcp_token = localStorage.getItem("vmind_mcp_token");
      if (!mcp_token || mcp_token === "null") {
        const sessionStr = localStorage.getItem("vmind_session");
        if (sessionStr) {
          try {
            mcp_token = JSON.parse(sessionStr).token;
          } catch(e2) {
             mcp_token = sessionStr; // Fallback in case vmind_session is just the raw token string
          }
        }
      }
    } catch (e) {
      console.warn("Could not retrieve token:", e);
    }
  }

  try {
    if (!mcp_token) {
      console.warn("⚠️ [n8n-api] Aucun mcp_token trouvé. Blocage de l'appel vers n8n.");
      return {
        ok: false,
        response_type: "error",
        message: "Veuillez activer votre session dans le Connecteur MCP (Panneau de gauche) avant de poser une question.",
        tool_used: null,
        title: "Connexion requise",
        kpis: [],
        table: { columns: [], rows: [] },
        chart: { type: null, title: "", description: "", xKey: "", yKey: "", data: [] },
        details: null,
        raw: null,
        error: "MCP_NOT_CONNECTED"
      } as VmindN8nResponse;
    }

    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(mcp_token ? { "Authorization": `Bearer ${mcp_token}` } : {})
      },
      body: JSON.stringify({
        message,
        client_id: clientId,
        vmind_session_id: sessionId,
        conversation_id: conversationId,
        agent_id: agentId,
        mcp_token
      }),
      signal
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Erreur Proxy (${response.status})`);
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

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: getAuthHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(payloadArray)
  });

  if (!response.ok) {
    throw new Error(`Erreur lors du déploiement via le scheduler Vmind: ${response.statusText}`);
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

  const response = await fetch(url, {
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



/**
 * Fetches all deployed agents from Redis (via backend)
 */
export async function getAgents(): Promise<any[]> {
  const res = await fetch(`${getBaseUrl()}/api/list-agents`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`Failed to fetch agents (${res.status})`);
  const data = await res.json();
  return data.agents || [];
}

/**
 * Pauses an agent — removes its QStash schedule but keeps config in Redis
 */
export async function pauseAgent(agentName: string): Promise<any> {
  const res = await fetch(`${getBaseUrl()}/api/pause-agent/${encodeURIComponent(agentName)}`, {
    method: "POST",
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to pause agent (${res.status})`);
  }
  return res.json();
}

/**
 * Resumes a paused agent — recreates its QStash schedule from stored trigger_rules
 */
export async function resumeAgent(agentName: string, params?: any): Promise<any> {
  const res = await fetch(`${getBaseUrl()}/api/resume-agent/${encodeURIComponent(agentName)}`, {
    method: "POST",
    headers: getAuthHeaders(params ? { "Content-Type": "application/json" } : {}),
    body: params ? JSON.stringify(params) : undefined
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to resume agent (${res.status})`);
  }
  return res.json();
}

/**
 * Deletes an agent completely (removes from Redis + cancels QStash schedule)
 */
export async function deleteAgent(agentName: string): Promise<any> {
  const res = await fetch(`${getBaseUrl()}/api/delete-agent/${encodeURIComponent(agentName)}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to delete agent (${res.status})`);
  }
  return res.json();
}

/**
 * Updates only the recovery_config of a deployed agent.
 * If the agent has a running schedule, it is recreated with the new config.
 */
export async function updateAgentConfig(agentName: string, recoveryConfig: object): Promise<any> {
  const res = await fetch(`${getBaseUrl()}/api/update-agent-config/${encodeURIComponent(agentName)}`, {
    method: "PATCH",
    headers: { 
      "Content-Type": "application/json",
      ...getAuthHeaders()
    },
    body: JSON.stringify({ recovery_config: recoveryConfig }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to update agent config (${res.status})`);
  }
  return res.json();
}

/**
 * Triggers an immediate (one-shot) run of an agent, outside of its schedule
 */
export async function runAgentNow(agentName: string): Promise<any> {
  const res = await fetch(`${getBaseUrl()}/api/run-now/${encodeURIComponent(agentName)}`, {
    method: "POST",
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to trigger agent run (${res.status})`);
  }
  return res.json();
}

/**
 * Get lead stats for a specific prospect agent
 */
export async function getProspectAgentStats(agentId: string): Promise<any> {
  const res = await fetch(`${getBaseUrl()}/api/stats/${encodeURIComponent(agentId)}`, {
    method: "GET",
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch agent stats (${res.status})`);
  }
  return res.json();
}

/**
 * Instantly qualify prospects for this agent (manually)
 */
export async function qualifyManualProspects(agentId: string, mode: 'pending_only' | 'all'): Promise<any> {
  const res = await fetch(`${getBaseUrl()}/api/prospect-agent/qualify-manual/${encodeURIComponent(agentId)}`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ mode })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to qualify prospects manually (${res.status})`);
  }
  return res.json();
}

/**
 * Trigger AI Qualification (N8N_WEBHOOK_QUALIFY) for all pending leads
 */
export async function triggerAIQualificationAllPending(agentId: string): Promise<any> {
  const res = await fetch(`${getBaseUrl()}/api/prospect-agent/qualify-all-pending-ai/${encodeURIComponent(agentId)}`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
      'Idempotency-Key': crypto.randomUUID()
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to trigger AI qualification (${res.status})`);
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
  },
  signal?: AbortSignal
): Promise<any> {
  const proxyUrl = `${getBaseUrl()}/api/n8n-proxy/kpis-agent`;
  const erp_name = "TraLis"; // Default ERP name

  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders()
    },
    body: JSON.stringify({
      allowed_agents: params.allowed_agents,
      erp_name,
      startDate: params.startDate,
      endDate: params.endDate,
      target_tool: params.target_tool,
      forceRefresh: params.forceRefresh
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
  params: { sourcingSummary: string; totalLeads: number; leadsPerCompany: number; ignoreDuplicates: boolean }
): Promise<any> {
  const res = await fetch(`${getBaseUrl()}/api/sourcing-agent/run/${encodeURIComponent(agentId)}`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to trigger sourcing agent (${res.status})`);
  }
  return res.json();
}

/**
 * Trigger immediate execution for Prospect Agent (Auto Mode)
 */
export async function triggerProspectAutoMode(agentId: string): Promise<any> {
  const res = await fetch(`${getBaseUrl()}/api/run/${encodeURIComponent(agentId)}`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ mode: "auto" })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to trigger prospect agent (${res.status})`);
  }
  return res.json();
}


/**
 * Appelle l'outil VBUY KPI #1 (Factures à régler) directement depuis le Backend HTTP (sans passer par n8n)
 */
export async function getVbuyKpiFacturesARegler(
  clientId = "DEMO",
  horizon?: '1d' | '1w' | '1m' | '3m' | '6m'
): Promise<any> {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/api/tools/get-vbuy-kpi-factures-a-regler`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders()
    },
    body: JSON.stringify({
      client_id: clientId,
      horizon
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Erreur VBUY KPI (${response.status})`);
  }

  const json = await response.json();
  return json?.data || json;
}

/**
 * Récupère le KPI VBUY #2 : Achats du mois (TND)
 */
export async function getVbuyKpiAchatsDuMois(
  clientId: string = "DEMO"
): Promise<any> {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/api/tools/get-vbuy-kpi-achats-du-mois`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders()
    },
    body: JSON.stringify({
      client_id: clientId
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Erreur VBUY KPI Achats (${response.status})`);
  }

  const json = await response.json();
  return json?.data || json;
}
