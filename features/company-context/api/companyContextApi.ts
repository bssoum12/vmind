/**
 * @file companyContextApi.ts
 * @description Standalone API client for Company Context operations.
 * Communicates with the VMIND backend service.
 */

import { CompanyContext, CompanyResearchResult } from '../types/company-context.types';

const getBaseUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';
};

/**
 * Fetch the current user's global company context.
 */
export async function getCompanyContext(): Promise<CompanyContext | null> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/company-context`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Impossible de récupérer le contexte entreprise');
  }

  const json = await res.json();
  return json.data || null;
}

/**
 * Persist or update the company context.
 * Only called when the user explicitly clicks "Confirmer et Enregistrer".
 */
export async function saveCompanyContext(
  context: Partial<CompanyContext>
): Promise<CompanyContext> {
  const baseUrl = getBaseUrl();

  const res = await fetch(`${baseUrl}/api/company-context`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      website: context.website || '',
      summary: context.summary || '',
      additional_info: context.additional_info || '',
      value_proposition: context.value_proposition || context.valueProposition || '',
      target_customers: context.target_customers || context.targetCustomers || '',
      competitors: context.competitors || '',
      raw_search_data: context.raw_search_data || {}
    })
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Erreur lors de la sauvegarde du contexte entreprise');
  }

  const json = await res.json();

  return json.data;
}

/**
 * Trigger web search & AI synthesis on a company URL.
 */
export async function researchCompanyWebsite(url: string): Promise<CompanyResearchResult> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/company-context/research`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ url })
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Échec de l\'analyse du site web');
  }

  const json = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json.error || 'Résultat d\'analyse indisponible');
  }

  return json.data;
}
