/**
 * Phone & Enrichment Extraction Utilities
 * Powered by Zod Validators (leadEnrichmentSchemas.ts)
 * Specifically tailored for Prospeo and CRM jsonb structures (person_raw and company_raw).
 * Strictly guarantees isolation between the lead's direct personal phone and company standard phone.
 */

import { 
  extractLeadMobileWithZod, 
  extractCompanyPhoneWithZod, 
  extractJobHistoryWithZod,
  JobHistoryItem
} from '../validators/leadEnrichmentSchemas';

/**
 * Safely extracts the lead's direct personal mobile from either mobile field or person_raw jsonb.
 * Validates with Zod. Never touches company data.
 */
export function extractLeadMobile(leadMobile: unknown, personRaw?: unknown): string | null {
  return extractLeadMobileWithZod(leadMobile, personRaw);
}

/**
 * Safely extracts the company's standard/HQ phone from either phone_hq field or company_raw jsonb.
 * Validates with Zod. Never touches person data.
 */
export function extractCompanyPhone(phoneHq: unknown, companyRaw?: unknown): string | null {
  return extractCompanyPhoneWithZod(phoneHq, companyRaw);
}

/**
 * Safely validates and extracts parsed job history from job_history or person_raw using Zod.
 */
export function extractJobHistory(jobHistory: unknown, personRaw?: unknown): JobHistoryItem[] {
  return extractJobHistoryWithZod(jobHistory, personRaw);
}

/**
 * White-labels external company logo URLs by routing them through the internal media proxy.
 * Replaces direct third-party S3 URLs (e.g., Prospeo) with first-party /media/company-logo/:file paths.
 */
export function maskCompanyLogoUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (typeof url === 'string' && url.includes('prospeo-static-assets.s3.us-east-1.amazonaws.com/company_logo/')) {
    const filename = url.split('/company_logo/')[1]?.split('?')[0];
    if (filename) {
      return `/media/company-logo/${filename}`;
    }
  }
  return url;
}

export type { JobHistoryItem };
