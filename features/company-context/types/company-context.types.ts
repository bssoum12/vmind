/**
 * @file company-context.types.ts
 * @description Standalone Type definitions for the Company Context feature.
 */

export interface CompanyContext {
  id?: number | string;
  user_id?: number;
  website: string;
  summary?: string;
  additional_info?: string;
  value_proposition?: string;
  valueProposition?: string;
  target_customers?: string;
  targetCustomers?: string;
  competitors?: string;
  raw_search_data?: any;
  updated_at?: string;
  created_at?: string;
}

export interface CompanyResearchResult {
  summary: string;
  domain: string;
  website: string;
  raw_search_data?: any;
}

export interface CompanyResearchResponse {
  success: boolean;
  data?: CompanyResearchResult;
  error?: string;
}

export interface CompanyContextSaveResponse {
  success: boolean;
  data?: CompanyContext;
  error?: string;
}

export interface CompanyContextModalProps {
  isOpen?: boolean;
  context?: CompanyContext | any;
  onClose: () => void;
  onSaveContext?: (updatedContext: any) => void | Promise<void>;
  inline?: boolean;
  onBack?: () => void;
}
