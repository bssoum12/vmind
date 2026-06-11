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

  // On appelle maintenant notre PROXY Backend au lieu de n8n directement
  const proxyUrl = "http://localhost:3001/api/n8n-proxy";

  console.log("🚀 [n8n-api] PAYLOAD ENVOYÉ:", { message, client_id: clientId, session_id: sessionId });

  try {
    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message,
        client_id: clientId,
        session_id: sessionId
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
  const webhookUrl = "http://localhost:3001/api/deploy-agent";
  
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
  const url = "http://localhost:3001/api/recovery/reset-reminders";
  
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
