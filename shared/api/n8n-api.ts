import { VmindN8nResponse } from '../types/vmind';


function getVmindSessionId() {
  let sessionId = localStorage.getItem("vmind_session_id");

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem("vmind_session_id", sessionId);
  }

  return sessionId;
}
export async function sendVmindMessage(message: string, clientId = "DEMO"): Promise<VmindN8nResponse> {
  const sessionId = getVmindSessionId();
  const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || "http://localhost:5678/webhook-test/vmind-chat";

  const response = await fetch(webhookUrl, {
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
    throw new Error(`Erreur lors de l'appel n8n: ${response.statusText}`);
  }

  return response.json();
}
