export type VmindTool =
  | "search_cotations"
  | "get_invoice_detail"
  | "get_dossier_detail"
  | "get_expedition_status"
  | "get_customer_profile"
  | "get_purchase_invoice_detail"
  | null;

export type VmindN8nResponse = {
  ok: boolean;
  tool: VmindTool;
  message?: string | null;
  data?: any;
  error?: any;
};

export interface VmindMessage {
  id: string;
  sender: 'user' | 'vm';
  text: string;
  time: string;
  tool?: VmindTool;
  data?: any;
  error?: any;
  isThinking?: boolean;
}
