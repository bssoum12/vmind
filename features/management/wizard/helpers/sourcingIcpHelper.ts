/**
 * Helper to extract and format Ideal Customer Profile (ICP) parameters
 * from a target Prospect Agent into standard sourcing conclusion sentences.
 */

export interface IcpData {
  secteur_activite?: string[] | string;
  zone_geo?: string[] | string;
  poste_contact?: string[] | string;
  taille_min?: number;
  taille_max?: number;
}

/**
 * Extracts the ICP object from any agent representation (Redis config, SQL settings, parameters JSON)
 */
export function extractIcpFromAgent(agent: any): IcpData | null {
  if (!agent) return null;

  // 1. Check direct config.icp or agent.icp
  const configIcp = agent?.config?.icp || agent?.icp;
  if (configIcp && typeof configIcp === 'object') {
    return configIcp;
  }

  // 2. Check prospection_config.icp
  const prospIcp = agent?.config?.prospection_config?.icp || agent?.prospection_config?.icp;
  if (prospIcp && typeof prospIcp === 'object') {
    return prospIcp;
  }

  // 3. Check parameters JSON (SQL raw fallback)
  if (agent?.parameters) {
    try {
      const parsed = typeof agent.parameters === 'string' ? JSON.parse(agent.parameters) : agent.parameters;
      const paramIcp = parsed?.config?.icp || parsed?.prospection_config?.icp || parsed?.icp;
      if (paramIcp) return paramIcp;
    } catch (_) {}
  }

  // 4. Check flat properties
  if (agent?.secteur_activite || agent?.zone_geo || agent?.poste_contact) {
    return {
      secteur_activite: agent.secteur_activite,
      zone_geo: agent.zone_geo,
      poste_contact: agent.poste_contact,
      taille_min: agent.taille_min,
      taille_max: agent.taille_max
    };
  }

  return null;
}

/**
 * Builds the standard two-line targeting conclusion matching:
 * COMPANY_TARGET: Entreprises du secteur {secteur} basées en {pays} de taille entre {taille_min} et {taille_max}.
 * LEAD_TARGET: {postes} with any seniority and any department.
 */
export function buildSourcingConclusionFromIcp(rawIcp: any): string {
  if (!rawIcp) return '';

  const parseList = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val.filter(Boolean).map(String);
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
      } catch (_) {}
      return val.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  };

  const cleanSectors = parseList(rawIcp.secteur_activite);
  const cleanCountries = parseList(rawIcp.zone_geo);
  const cleanTitles = parseList(rawIcp.poste_contact);

  const secteurPart = cleanSectors.length > 0 ? cleanSectors.join(', ') : 'Tous secteurs';
  const paysPart = cleanCountries.length > 0 ? cleanCountries.join(', ') : 'Toutes zones';

  let taillePart = '';
  const min = rawIcp.taille_min !== undefined && rawIcp.taille_min !== null ? Number(rawIcp.taille_min) : undefined;
  const max = rawIcp.taille_max !== undefined && rawIcp.taille_max !== null ? Number(rawIcp.taille_max) : undefined;

  if (min !== undefined && max !== undefined && (min > 0 || max > 0)) {
    taillePart = ` de taille entre ${min} et ${max}`;
  } else if (min !== undefined && min > 0) {
    taillePart = ` de taille supérieure à ${min}`;
  } else if (max !== undefined && max > 0) {
    taillePart = ` de taille inférieure à ${max}`;
  }

  const postesPart = cleanTitles.length > 0 ? cleanTitles.join(', ') : 'Tous les postes';

  const companyTarget = `COMPANY_TARGET: Entreprises du secteur ${secteurPart} basées en ${paysPart}${taillePart}.`;
  const leadTarget = `LEAD_TARGET: ${postesPart} with any seniority and any department.`;

  return `${companyTarget}\n${leadTarget}`;
}
