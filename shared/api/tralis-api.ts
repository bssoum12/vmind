/**
 * TraLIS ERP API Service
 * 
 * Centralise les appels vers le backend Express (port 3001).
 * Utilise la variable d'environnement NEXT_PUBLIC_API_URL ou une valeur par défaut.
 */

import { frontLog } from '../utils/frontLog';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ;

// ─── TYPES ───

export interface ToolResponse<T = any> {
  ok: boolean;
  data: T | null;
  error: {
    message: string;
    tool: string;
    client_id: string | null;
  } | null;
}

export interface CommonPayload {
  client_id: string;
}

export interface InvoicePayload extends CommonPayload {
  invoice_ref: string;
  include_lines?: boolean;
}

export interface DossierPayload extends CommonPayload {
  dossier_ref: string;
  include_expeditions?: boolean;
  include_invoices?: boolean;
  include_costs?: boolean;
}

export interface ExpeditionPayload extends CommonPayload {
  expedition_ref: string;
}

export interface CustomerPayload extends CommonPayload {
  tiers_search: string;
  include_balance?: boolean;
}

export interface PurchaseInvoicePayload extends CommonPayload {
  invoice_ref?: string;
  supplier_ref?: string;
  dossier_ref?: string;
}

export interface SearchCotationsPayload extends CommonPayload {
  statut?: string;
  commercial?: string;
  date_from?: string;
  date_to?: string;
  nature?: string;
  max_rows?: number;
}

// ─── HELPER ───

/**
 * Exécute un appel POST vers un outil spécifique du backend.
 */
async function postTool<T>(endpoint: string, payload: any): Promise<ToolResponse<T>> {
  const start = Date.now();
  frontLog.info('API_TRALIS', `➔ POST /api/tools${endpoint} [Client: ${payload?.client_id || 'N/A'}]`);

  try {
    const response = await fetch(`${API_BASE_URL}/api/tools${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const duration = Date.now() - start;

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const errorMsg = errBody.error?.message || errBody.error || `Erreur HTTP ${response.status}`;
      frontLog.error('API_TRALIS', `Échec ${endpoint} (${duration}ms) [Status: ${response.status}]: ${errorMsg}`);
      return {
        ok: false,
        data: null,
        error: {
          message: errorMsg,
          tool: endpoint,
          client_id: payload.client_id || null,
        },
      };
    }

    const data = await response.json();
    frontLog.success('API_TRALIS', `${endpoint} complété (${duration}ms)`);
    return data;
  } catch (error: any) {
    const duration = Date.now() - start;
    frontLog.error('API_TRALIS', `Erreur réseau sur ${endpoint} (${duration}ms): ${error?.message || error}`);
    return {
      ok: false,
      data: null,
      error: {
        message: "Impossible de contacter le serveur backend. Vérifiez qu'il est bien démarré.",
        tool: endpoint,
        client_id: payload.client_id || null,
      },
    };
  }
}

// ─── TOOL FUNCTIONS ───

export const tralisApi = {
  /**
   * Vérifie la santé du service
   */
  async checkHealth() {
    return fetch(`${API_BASE_URL}/health`).then(r => r.json()).catch(() => ({ ok: false }));
  },

  /**
   * Récupère le détail d'une facture de vente
   */
  async getInvoiceDetail(payload: InvoicePayload) {
    return postTool<any>('/get-invoice-detail', payload);
  },

  /**
   * Récupère le détail complet d'un dossier transit
   */
  async getDossierDetail(payload: DossierPayload) {
    return postTool<any>('/get-dossier-detail', payload);
  },

  /**
   * Récupère le statut détaillé d'une expédition
   */
  async getExpeditionStatus(payload: ExpeditionPayload) {
    return postTool<any>('/get-expedition-status', payload);
  },

  /**
   * Récupère le profil d'un tiers (Client ou Fournisseur)
   */
  async getCustomerProfile(payload: CustomerPayload) {
    return postTool<any>('/get-customer-profile', payload);
  },

  /**
   * Récupère le détail d'une facture d'achat fournisseur
   */
  async getPurchaseInvoiceDetail(payload: PurchaseInvoicePayload) {
    return postTool<any>('/get-purchase-invoice-detail', payload);
  },

  /**
   * Recherche et filtre le pipeline des cotations
   */
  async searchCotations(payload: SearchCotationsPayload) {
    return postTool<any[]>('/search-cotations', payload);
  }
};
