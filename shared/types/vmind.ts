export type VmindTool =
  | "search_cotations"
  | "get_invoice_detail"
  | "get_dossier_detail"
  | "get_expedition_status"
  | "get_customer_profile"
  | "get_purchase_invoice_detail"
  | "get_aged_balance"
  | "get_overdue_alerts"
  | string
  | null;

export interface VmindKpi {
  label: string;
  value: number;
  display: string;
  unit: string;
  status: 'success' | 'warning' | 'danger' | 'info';
  trend?: 'up' | 'down' | 'neutral';
}

export interface VmindTable {
  columns: string[];
  rows: any[];
}

export interface VmindChart {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'area' | null | string;
  title: string;
  description: string;
  xKey: string;
  yKey: string;
  data: Array<{ label: string; value: number | string }>;
}

export interface VmindAlert {
  title: string;
  level: 'warning' | 'danger';
  explanation: string;
  action: string;
}

export type VmindN8nResponse = {
  ok: boolean;
  tool_used: VmindTool;
  response_type: string;
  title: string;
  message: string;
  kpis: VmindKpi[];
  table: VmindTable;
  chart: VmindChart;
  details: any;
  raw: any;
  error: any;
  alerts?: VmindAlert[];
  report_url?: string | null;
  report_filename?: string | null;
};

export interface VmindMessage {
  id: string;
  sender: 'user' | 'vm';
  text: string;
  time: string;
  tool_used?: VmindTool;
  response_type?: string;
  title?: string;
  kpis?: VmindKpi[];
  table?: VmindTable;
  chart?: VmindChart;
  details?: any;
  raw?: any;
  error?: any;
  isThinking?: boolean;
  source?: string;
  status?: string;
  alerts?: VmindAlert[];
  report_url?: string | null;
  report_filename?: string | null;
}
