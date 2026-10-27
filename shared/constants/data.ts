export type AgentId =
  "VMIND" | "VDATA" | "VFIN" | "VSELL" | "VSTOCK" | "VBUY" | "VMOVE";

export interface AgentConfig {
  id: AgentId;
  name: string;
  desc: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}

export const AGENTS: Record<Exclude<AgentId, "VMIND">, AgentConfig> = {
  VDATA: {
    id: "VDATA",
    name: "VDATA",
    desc: "Données & Analytics",
    color: "#00E5C8",
    bgColor: "rgba(0, 229, 200, 0.10)",
    borderColor: "rgba(0, 229, 200, 0.25)",
    icon: "VD",
  },
  VFIN: {
    id: "VFIN",
    name: "VFIN",
    desc: "Finance & Comptabilité",
    color: "#00E676",
    bgColor: "rgba(0, 230, 118, 0.10)",
    borderColor: "rgba(0, 230, 118, 0.25)",
    icon: "VF",
  },
  VSELL: {
    id: "VSELL",
    name: "VSELL",
    desc: "Commercial & CRM",
    color: "#FFB800",
    bgColor: "rgba(255, 184, 0, 0.10)",
    borderColor: "rgba(255, 184, 0, 0.25)",
    icon: "VS",
  },
  VBUY: {
    id: "VBUY",
    name: "VBUY",
    desc: "Achats & Fournisseurs",
    color: "#FF4757",
    bgColor: "rgba(255, 71, 87, 0.10)",
    borderColor: "rgba(255, 71, 87, 0.25)",
    icon: "VB",
  },
  VMOVE: {
    id: "VMOVE",
    name: "VMOVE",
    desc: "Transport & Logistique",
    color: "#00BFA8",
    bgColor: "rgba(0, 191, 168, 0.10)",
    borderColor: "rgba(0, 191, 168, 0.25)",
    icon: "VM",
  },
  VSTOCK: {
    id: "VSTOCK",
    name: "VSTOCK",
    desc: "Stocks & Inventaire",
    color: "#7B61FF",
    bgColor: "rgba(123, 97, 255, 0.10)",
    borderColor: "rgba(123, 97, 255, 0.25)",
    icon: "VK",
  },
};

export const TOOL_AGENT_MAPPING: Record<string, AgentId> = {






};

export function resolveAgentFromTool(toolName?: string | null): AgentId | null {
  if (!toolName) return null;
  const lower = String(toolName).toLowerCase(); if (lower.includes('vmove') || lower.includes('dossier') || lower.includes('expedition') || lower.includes('transport')) return 'VMOVE'; if (lower.includes('vfin') || lower.includes('facture') || lower.includes('recouvrement') || lower.includes('tresorerie') || lower.includes('creance')) return 'VFIN'; if (lower.includes('vsell') || lower.includes('cotation') || lower.includes('client') || lower.includes('crm')) return 'VSELL'; if (lower.includes('vbuy') || lower.includes('achat') || lower.includes('fournisseur') || lower.includes('commande')) return 'VBUY'; if (lower.includes('vstock') || lower.includes('stock') || lower.includes('article')) return 'VSTOCK'; return 'VDATA';
}
