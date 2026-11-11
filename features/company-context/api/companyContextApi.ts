/**
 * @file companyContextApi.ts
 * @description API client functions for the per-agent Company Context feature.
 */

import {
  CompanyContext,
  CompanyResearchResult,
  CompanyResearchResponse,
  CompanyContextSaveResponse,
  SavedSupervisorContextItem,
} from '../types/company-context.types';

const getBaseUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';
};

/**
 * Fetches the saved company context for a specific supervisor agent (`agentUuid`).
 */
export async function getCompanyContext(agentUuid?: string): Promise<CompanyContext | null> {
  if (!agentUuid || !agentUuid.trim()) {
    return null;
  }

  try {
    const res = await fetch(
      `${getBaseUrl()}/api/company-context?agent_uuid=${encodeURIComponent(agentUuid.trim())}`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!res.ok) {
      return null;
    }

    const json = await res.json();
    if (json && json.success && json.data) {
      return json.data as CompanyContext;
    }
    return null;
  } catch (err) {
    console.warn('[CompanyContextApi] Error fetching company context:', err);
    return null;
  }
}

/**
 * Fetches all saved company contexts from the user's deployed supervisor agents
 * (used by the Wizard's "Importer depuis un autre superviseur" selector).
 */
export async function listSavedCompanyContexts(): Promise<SavedSupervisorContextItem[]> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/company-context/list`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    if (json && json.success && Array.isArray(json.data)) {
      return json.data as SavedSupervisorContextItem[];
    }
    return [];
  } catch (err) {
    console.warn('[CompanyContextApi] Error listing saved company contexts:', err);
    return [];
  }
}

/**
 * Saves or updates the company context for a specific deployed supervisor agent (`agentUuid`).
 */
export async function saveCompanyContext(
  context: Partial<CompanyContext>,
  agentUuid?: string
): Promise<CompanyContext> {
  const targetUuid = (agentUuid || context.agent_uuid || '').trim();
  if (!targetUuid) {
    throw new Error("Identifiant de l'agent superviseur requis pour enregistrer le contexte.");
  }

  const res = await fetch(`${getBaseUrl()}/api/company-context`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...context,
      agent_uuid: targetUuid,
    }),
  });

  const json: CompanyContextSaveResponse = await res.json().catch(() => ({
    success: false,
    error: 'Erreur de communication avec le serveur',
  }));

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error || 'Échec de la sauvegarde du contexte entreprise');
  }

  return json.data;
}

/**
 * Triggers the AI web search & synthesis for a given company URL.
 */
export async function researchCompanyWebsite(url: string): Promise<CompanyResearchResult> {
  const res = await fetch(`${getBaseUrl()}/api/company-context/research`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  const json: CompanyResearchResponse = await res.json().catch(() => ({
    success: false,
    error: "Le service d'analyse est momentanément indisponible",
  }));

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error || "Impossible d'analyser ce site web");
  }

  return json.data;
}
