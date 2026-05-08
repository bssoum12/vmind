import { VmindN8nResponse } from '../types/vmind';

function getVmindSessionId() {
  let sessionId = localStorage.getItem("vmind_session_id");

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem("vmind_session_id", sessionId);
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

  console.log("🚀 Envoi via Proxy Backend...", { message, clientId, sessionId });

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

    // Si le proxy renvoie un tableau, on déballe l'item json
    let finalData = data;
    if (Array.isArray(data) && data.length > 0) {
      finalData = data[0].json || data[0];
    }

    // DEBUG: On affiche le message pour vérifier qu'il n'est pas vide
    alert("📩 Message reçu : " + (finalData.message || "MESSAGE_VIDE"));

    return finalData;
  } catch (error: any) {
    console.error("Fetch Proxy Error:", error);
    throw error;
  }
}
