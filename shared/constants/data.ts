export type AgentId =
  | 'VMIND'
  | 'VDATA'
  | 'VFIN'
  | 'VSELL'
  | 'VSTOCK'
  | 'VBUY'
  | 'VMOVE';

export interface AgentConfig {
  id: AgentId;
  name: string;
  desc: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}

export const AGENTS: Record<Exclude<AgentId, 'VMIND'>, AgentConfig> = {
  VDATA: {
    id: 'VDATA',
    name: 'VDATA',
    desc: 'Données & Analytics',
    color: '#00E5C8',
    bgColor: 'rgba(0, 229, 200, 0.10)',
    borderColor: 'rgba(0, 229, 200, 0.25)',
    icon: 'VD',
  },
  VFIN: {
    id: 'VFIN',
    name: 'VFIN',
    desc: 'Finance & Comptabilité',
    color: '#00E676',
    bgColor: 'rgba(0, 230, 118, 0.10)',
    borderColor: 'rgba(0, 230, 118, 0.25)',
    icon: 'VF',
  },
  VSELL: {
    id: 'VSELL',
    name: 'VSELL',
    desc: 'Commercial & CRM',
    color: '#FFB800',
    bgColor: 'rgba(255, 184, 0, 0.10)',
    borderColor: 'rgba(255, 184, 0, 0.25)',
    icon: 'VS',
  },
  VSTOCK: {
    id: 'VSTOCK',
    name: 'VSTOCK',
    desc: 'Stocks & Inventaire',
    color: '#7B61FF',
    bgColor: 'rgba(123, 97, 255, 0.10)',
    borderColor: 'rgba(123, 97, 255, 0.25)',
    icon: 'VK',
  },
  VBUY: {
    id: 'VBUY',
    name: 'VBUY',
    desc: 'Achats & Fournisseurs',
    color: '#FF4757',
    bgColor: 'rgba(255, 71, 87, 0.10)',
    borderColor: 'rgba(255, 71, 87, 0.25)',
    icon: 'VB',
  },
  VMOVE: {
    id: 'VMOVE',
    name: 'VMOVE',
    desc: 'Transport & Logistique',
    color: '#00BFA8',
    bgColor: 'rgba(0, 191, 168, 0.10)',
    borderColor: 'rgba(0, 191, 168, 0.25)',
    icon: 'VM',
  },
};

export const TOOL_AGENT_MAPPING: Record<string, AgentId> = {
  getCustomerProfile: 'VDATA',
  getInvoiceDetail: 'VDATA',
  getDossierDetail: 'VDATA',
  getExpeditionStatus: 'VDATA',
  searchCotations: 'VDATA',
  getPurchaseInvoiceDetail: 'VDATA',
};

export function resolveAgentFromTool(toolName?: string | null): AgentId | null {
  if (!toolName) return null;
  return TOOL_AGENT_MAPPING[toolName] ?? null;
}
