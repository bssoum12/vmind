export type SkillScope = 'GLOBAL' | 'ERP' | 'TENANT' | 'USER';
export type SkillKind = 'style' | 'method';
export type SkillCategory =
  | 'finance'
  | 'commercial'
  | 'operations'
  | 'achats'
  | 'logistique'
  | 'productivite'
  | 'autre';

export interface InstalledSkillItem {
  id: number;
  slug: string;
  title: string;
  description: string;
  category: SkillCategory;
  kind: SkillKind;
  scope: SkillScope;
  erp_type: string | null;
  tenant_key: string | null;
  owner_user_id: number | null;
  mapped_tools: string[];
  references: string[];
  sub_skills?: Array<{ slug: string; path: string; title: string; description: string }>;
  version: number;
  enabled: boolean;
  row_enabled: boolean;
  user_pref_enabled: boolean;
  has_lower_scope_default: boolean;
  is_personal_owner: boolean;
  source: 'ui' | 'catalog';
}

export interface SkillDetail extends InstalledSkillItem {
  body_md: string;
  references_json: Record<string, string>;
}

export interface DiscoverSkillItem {
  id: number;
  slug: string;
  scope: 'GLOBAL' | 'ERP';
  erp_type: string | null;
  title: string;
  description: string;
  category: SkillCategory;
  kind: SkillKind;
  mapped_tools: string[];
  references: string[];
  sub_skills?: Array<{ slug: string; path: string; title: string; description: string }>;
  version: number;
  enabled: boolean;
  source: 'ui' | 'catalog';
  updated_at?: string;
}

export interface SkillToolOption {
  name: string;
  description: string;
  category: string;
}

export interface SkillVersionItem {
  skill_id: number;
  version: number;
  title: string;
  description: string;
  body_md: string;
  references_json: Record<string, string>;
  mapped_tools: string[];
  comment: string | null;
  changed_by: number | null;
  changed_by_username?: string | null;
  changed_at: string;
}

export interface SkillWritePayload {
  slug?: string;
  title: string;
  description: string;
  category: SkillCategory;
  kind: SkillKind;
  scope: SkillScope;
  erp_type?: string | null;
  tenant_key?: string | null;
  body_md: string;
  references_json?: Record<string, string>;
  mapped_tools?: string[];
  comment?: string;
  enabled?: boolean;
}

const getBaseUrl = () => process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';

function formatConnectionQuery(connectionId?: number | string | null): string {
  if (connectionId !== undefined && connectionId !== null && connectionId !== '') {
    return `?connection_id=${encodeURIComponent(String(connectionId))}`;
  }
  return '';
}

export async function fetchInstalledSkills(connectionId?: number | string | null): Promise<{
  skills: InstalledSkillItem[];
  connection: { id: number | null; erpType: string | null; clientId: string | null } | null;
}> {
  const qs = formatConnectionQuery(connectionId);
  const res = await fetch(`${getBaseUrl()}/api/skills/installed${qs}`, {
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Impossible de récupérer les skills installés.');
  }
  return {
    skills: Array.isArray(data.skills) ? data.skills : [],
    connection: data.connection ?? null,
  };
}

export async function fetchDiscoverSkills(params?: {
  q?: string;
  category?: string;
  connectionId?: number | string | null;
}): Promise<DiscoverSkillItem[]> {
  const search = new URLSearchParams();
  if (params?.q) search.set('q', params.q);
  if (params?.category && params.category !== 'all') search.set('category', params.category);
  if (params?.connectionId !== undefined && params?.connectionId !== null && params?.connectionId !== '') {
    search.set('connection_id', String(params.connectionId));
  }
  const qs = search.toString() ? `?${search.toString()}` : '';

  const res = await fetch(`${getBaseUrl()}/api/skills/discover${qs}`, {
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Impossible de charger le catalogue des skills.');
  }
  return Array.isArray(data.skills) ? data.skills : [];
}

export async function fetchSkillDetail(
  slug: string,
  connectionId?: number | string | null
): Promise<SkillDetail> {
  const qs = formatConnectionQuery(connectionId);
  const res = await fetch(`${getBaseUrl()}/api/skills/${encodeURIComponent(slug)}${qs}`, {
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Skill introuvable.');
  }
  return data.skill;
}

export async function fetchSkillToolOptions(connectionId?: number | string | null): Promise<{
  connected: boolean;
  erpType: string | null;
  clientId: string | null;
  tools: SkillToolOption[];
  reauth: boolean;
}> {
  const qs = formatConnectionQuery(connectionId);
  const res = await fetch(`${getBaseUrl()}/api/skills/tool-options${qs}`, {
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    return { connected: false, erpType: null, clientId: null, tools: [], reauth: false };
  }
  return {
    connected: Boolean(data.connected),
    erpType: data.erp_type ?? null,
    clientId: data.client_id ?? null,
    tools: Array.isArray(data.tools) ? data.tools : [],
    reauth: Boolean(data.reauth),
  };
}

export async function createSkill(payload: SkillWritePayload): Promise<any> {
  const res = await fetch(`${getBaseUrl()}/api/skills`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Erreur lors de la création du skill.');
  }
  return data.skill;
}

export async function updateSkill(
  id: number,
  payload: SkillWritePayload
): Promise<{ mode: 'update' | 'copy_on_write'; skill: any }> {
  const res = await fetch(`${getBaseUrl()}/api/skills/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Erreur lors de la sauvegarde du skill.');
  }
  return { mode: data.mode, skill: data.skill };
}

export async function toggleSkill(
  slug: string,
  options: { enabled: boolean; for?: 'me' | 'tenant'; tenant_key?: string }
): Promise<any> {
  const res = await fetch(`${getBaseUrl()}/api/skills/${encodeURIComponent(slug)}/toggle`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(options),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Erreur lors de l\'activation/désactivation du skill.');
  }
  return data;
}

export async function deleteSkill(id: number): Promise<void> {
  const res = await fetch(`${getBaseUrl()}/api/skills/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Erreur lors de la suppression du skill.');
  }
}

export async function removeSkillFromSpace(slug: string): Promise<void> {
  const res = await fetch(`${getBaseUrl()}/api/skills/space/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Erreur lors du retrait du skill de votre espace.');
  }
}

export async function fetchSkillVersions(id: number): Promise<SkillVersionItem[]> {
  const res = await fetch(`${getBaseUrl()}/api/skills/${id}/versions`, {
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Impossible de récupérer l\'historique des versions.');
  }
  return Array.isArray(data.versions) ? data.versions : [];
}

export async function rollbackSkillVersion(
  id: number,
  version: number,
  comment?: string
): Promise<any> {
  const res = await fetch(`${getBaseUrl()}/api/skills/${id}/rollback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ version, comment }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Erreur lors de la restauration de la version.');
  }
  return data.skill;
}

export async function importSkillMd(payload: {
  content?: string;
  markdown?: string;
  zipBase64?: string;
  url?: string;
  scope?: SkillScope;
  tenant_key?: string;
  comment?: string;
  references_json?: Record<string, string>;
}): Promise<any> {
  const res = await fetch(`${getBaseUrl()}/api/skills/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    const errMsg =
      Array.isArray(data.errors) && data.errors.length > 0
        ? data.errors.join('\n')
        : data.error || 'Erreur lors de l\'import du skill.';
    throw new Error(errMsg);
  }
  return data.skill;
}

export async function exportSkillMd(id: number, fallbackSlug = 'skill'): Promise<void> {
  const res = await fetch(`${getBaseUrl()}/api/skills/${id}/export`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('Impossible d\'exporter le fichier SKILL.md.');
  }
  const text = await res.text();
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fallbackSlug}-SKILL.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportSkillZip(id: number, fallbackSlug = 'skill'): Promise<void> {
  const res = await fetch(`${getBaseUrl()}/api/skills/${id}/export?format=zip`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('Impossible d\'exporter l\'archive ZIP du skill.');
  }
  const buf = await res.arrayBuffer();
  const blob = new Blob([buf], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fallbackSlug}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function fetchAvailableTenantsForAdmin(): Promise<
  Array<{ client_id: string; display_name?: string }>
> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/admin/tenants/getAll`, {
      credentials: 'include',
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.ok || !Array.isArray(data.tenants)) return [];
    return data.tenants.map((t: any) => ({
      client_id: String(t.client_id).toUpperCase(),
      display_name: t.display_name || t.client_id,
    }));
  } catch {
    return [];
  }
}
