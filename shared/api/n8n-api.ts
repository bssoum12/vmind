import { VmindN8nResponse } from '../types/vmind';

export async function sendVmindMessage(message: string, clientId = "DEMO"): Promise<VmindN8nResponse> {
  const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || "http://localhost:5678/webhook-test/vmind-chat";
  
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message,
      client_id: clientId
    })
  });

  if (!response.ok) {
    throw new Error(`Erreur lors de l'appel n8n: ${response.statusText}`);
  }

  return response.json();
}
