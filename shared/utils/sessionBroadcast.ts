/**
 * Utilitaire de synchronisation multi-onglets via BroadcastChannel
 * Permet de propager instantanément les changements d'état du connecteur ERP
 * (connexion, déconnexion) à l'ensemble des onglets ouverts du navigateur.
 */

let channel: BroadcastChannel | null = null;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    channel = new BroadcastChannel('vmind_mcp_sync');
    channel.onmessage = (event: MessageEvent) => {
      if (event.data?.type === 'MCP_SESSION_UPDATED') {
        const customEvent = new CustomEvent('mcp-session-updated', {
          detail: event.data.detail
        });
        (customEvent as any)._fromBroadcast = true;
        window.dispatchEvent(customEvent);
      }
    };
  } catch (err) {
    console.warn('[BroadcastChannel] Erreur lors de l\'initialisation du canal:', err);
  }
}

/**
 * Émet une mise à jour de session localement dans l'onglet courant
 * et la diffuse à tous les autres onglets ouverts via BroadcastChannel.
 */
export function broadcastMcpSessionUpdate(detail: any): void {
  if (typeof window === 'undefined') return;

  // 1. Émission locale
  window.dispatchEvent(new CustomEvent('mcp-session-updated', { detail }));

  // 2. Diffusion inter-onglets
  try {
    channel?.postMessage({
      type: 'MCP_SESSION_UPDATED',
      detail
    });
  } catch (err) {
    console.warn('[BroadcastChannel] Échec de la diffusion inter-onglets:', err);
  }
}
