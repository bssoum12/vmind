import { VmindN8nResponse } from '../types/vmind';

function getVmindSessionId() {
  let sessionId = sessionStorage.getItem("vmind_session_id");

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem("vmind_session_id", sessionId);
  }

  return sessionId;
}

/**
 * Appelle n8n via le Proxy du Backend pour éviter les problèmes de CORS
 */
export async function sendVmindMessage(message: string, clientId = "DEMO"): Promise<VmindN8nResponse> {
  const sessionId = getVmindSessionId();

  // On utilise une variable d'environnement pour Vercel, ou localhost par défaut
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const proxyUrl = `${baseUrl}/api/n8n-proxy`;

  console.log("🚀 [n8n-api] PAYLOAD ENVOYÉ:", { message, client_id: clientId, session_id: sessionId });

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
      console.warn("Could not parse tokens:", e);
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
        session_id: sessionId,
        mcp_token
      })
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
    console.error("❌ [n8n-api] FETCH ERROR:", error);
    throw error;
  }
}

export async function deployAgent(config: any, clientId = "DEMO"): Promise<any> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
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
    headers: {
      "Content-Type": "application/json"
    },
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
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const url = `${baseUrl}/api/recovery/reset-reminders`;
  
  console.log("🔄 [n8n-api] RESETTING REMINDERS FOR:", invoiceRefs);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ invoice_refs: invoiceRefs })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Erreur de réinitialisation (${response.status})`);
  }

  return response.json();
}

// ─── Agent Management APIs ────────────────────────────────────────────────────
 
const getBaseUrl = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function getAuthHeaders(): Record<string, string> {
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
          return { "Authorization": `Bearer ${token}` };
        }
      }
    } catch (e) {
      console.warn("Could not retrieve session token:", e);
    }
  }
  return {};
}

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
export async function resumeAgent(agentName: string): Promise<any> {
  const res = await fetch(`${getBaseUrl()}/api/resume-agent/${encodeURIComponent(agentName)}`, {
    method: "POST",
    headers: getAuthHeaders()
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
