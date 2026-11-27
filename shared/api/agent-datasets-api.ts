const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';

export type AgentDataSourceMode = 'erp' | 'file' | 'demo';

export interface ParsedSheetSummary {
  tool_name: string;
  sheet_name: string;
  row_count: number;
  columns: string[];
}

export interface DetectedDatasetMeta {
  sheets: ParsedSheetSummary[];
  total_rows: number;
  detected_date_range: {
    min_date: string | null;
    max_date: string | null;
  };
  detected_currency: string;
  template_matched: boolean;
  compatible_sections?: Record<string, boolean>;
  warnings: string[];
}

export interface AgentDatasetSummary {
  dataset_uuid: string;
  file_name: string;
  source_mode: 'file' | 'demo';
  schema_hash: string;
  template_matched: boolean;
  detected_meta: DetectedDatasetMeta;
  updated_at?: string;
}

export interface AgentDataSourceConfig {
  mode: AgentDataSourceMode;
  dataset_uuid?: string;
  file_name?: string;
  schema_hash?: string;
  template_matched?: boolean;
  total_rows?: number;
  sheet_count?: number;
  updated_at?: string;
}

export const MAX_DATASET_FILES = 3;
export const MAX_DATASET_TOTAL_BYTES = 10 * 1024 * 1024; // 10 MB

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(new Error(`Impossible de lire le fichier « ${file.name} ».`));
    reader.readAsDataURL(file);
  });
}

async function encodeFilesPayload(files: File[]): Promise<Array<{ name: string; content_base64: string }>> {
  if (!files.length) {
    throw new Error('Veuillez sélectionner au moins un fichier Excel (.xlsx) ou CSV (.csv).');
  }
  if (files.length > MAX_DATASET_FILES) {
    throw new Error(`Vous pouvez importer jusqu'à ${MAX_DATASET_FILES} fichiers à la fois.`);
  }
  let totalBytes = 0;
  for (const f of files) {
    totalBytes += f.size;
    const lower = f.name.toLowerCase();
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.csv') && !lower.endsWith('.txt')) {
      throw new Error(`Format non pris en charge pour « ${f.name} ». Utilisez uniquement .xlsx ou .csv.`);
    }
  }
  if (totalBytes > MAX_DATASET_TOTAL_BYTES) {
    throw new Error('La taille totale des fichiers dépasse la limite autorisée de 10 Mo.');
  }

  return Promise.all(
    files.map(async (f) => ({
      name: f.name,
      content_base64: await fileToBase64(f),
    }))
  );
}

export function getAgentDatasetTemplateUrl(domain: string): string {
  return `${BASE_URL}/api/agent-datasets/template/${encodeURIComponent(domain)}.xlsx`;
}

export async function downloadAgentDatasetTemplate(domain: string, fallbackFileName?: string): Promise<void> {
  const res = await fetch(getAgentDatasetTemplateUrl(domain), {
    method: 'GET',
    credentials: 'include',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Impossible de télécharger le modèle Excel.');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fallbackFileName || `modele-${domain}-vmind.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function importAgentDatasetFiles(
  domain: string,
  files: File[]
): Promise<AgentDatasetSummary> {
  const encoded = await encodeFilesPayload(files);
  const res = await fetch(`${BASE_URL}/api/agent-datasets/import/file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ domain, files: encoded }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !data.dataset) {
    throw new Error(data.error || "Impossible d'importer vos fichiers.");
  }
  return data.dataset as AgentDatasetSummary;
}

export async function replaceAgentDatasetFiles(
  agentUuid: string,
  domain: string,
  files: File[]
): Promise<AgentDatasetSummary> {
  const encoded = await encodeFilesPayload(files);
  const res = await fetch(
    `${BASE_URL}/api/agent-datasets/import/file/${encodeURIComponent(agentUuid)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ domain, files: encoded }),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !data.dataset) {
    throw new Error(data.error || 'Impossible de mettre à jour le fichier de données.');
  }
  return data.dataset as AgentDatasetSummary;
}

export async function createAgentDemoDataset(domain: string): Promise<AgentDatasetSummary> {
  const res = await fetch(`${BASE_URL}/api/agent-datasets/demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ domain }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !data.dataset) {
    throw new Error(data.error || 'Impossible de préparer les données de démonstration.');
  }
  return data.dataset as AgentDatasetSummary;
}

export async function getAgentDatasetMetadata(agentUuid: string): Promise<AgentDatasetSummary | null> {
  const res = await fetch(
    `${BASE_URL}/api/agent-datasets/agent/${encodeURIComponent(agentUuid)}`,
    { credentials: 'include' }
  );
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  return data?.ok && data.dataset ? (data.dataset as AgentDatasetSummary) : null;
}
