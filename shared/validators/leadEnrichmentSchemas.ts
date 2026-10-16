import { z } from 'zod';

/**
 * Zod schemas for Prospeo & CRM jsonb columns: person_raw, company_raw, job_history
 */

export const JobHistoryItemSchema = z.object({
  title: z.string().nullish(),
  position: z.string().nullish(),
  role: z.string().nullish(),
  company_name: z.string().nullish(),
  company: z.string().nullish(),
  companyName: z.string().nullish(),
  entreprise: z.string().nullish(),
  current: z.boolean().nullish(),
  start_year: z.union([z.number(), z.string()]).nullish(),
  end_year: z.union([z.number(), z.string()]).nullish(),
  start_month: z.union([z.number(), z.string()]).nullish(),
  end_month: z.union([z.number(), z.string()]).nullish(),
  start_date: z.string().nullish(),
  end_date: z.string().nullish(),
  duration_in_months: z.number().nullish(),
  logo_url: z.string().nullish(),
  seniority: z.string().nullish(),
  departments: z.array(z.string()).nullish(),
  description: z.string().nullish()
}).passthrough();

export type JobHistoryItem = z.infer<typeof JobHistoryItemSchema>;

export const ProspeoMobileObjectSchema = z.object({
  mobile: z.string().nullish(),
  status: z.string().nullish(),
  revealed: z.boolean().nullish(),
  mobile_country: z.string().nullish(),
  mobile_national: z.string().nullish(),
  mobile_country_code: z.string().nullish(),
  mobile_international: z.string().nullish()
}).passthrough();

export const PersonRawSchema = z.object({
  email: z.string().nullish(),
  full_name: z.string().nullish(),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  headline: z.string().nullish(),
  linkedin_url: z.string().nullish(),
  current_job_title: z.string().nullish(),
  mobile: z.union([
    ProspeoMobileObjectSchema,
    z.string()
  ]).nullish(),
  phone: z.union([
    z.object({
      phone: z.string().nullish(),
      number: z.string().nullish(),
      revealed: z.boolean().nullish(),
      status: z.string().nullish()
    }).passthrough(),
    z.string()
  ]).nullish(),
  phone_number: z.string().nullish(),
  direct_phone: z.string().nullish(),
  direct_number: z.string().nullish(),
  phone_numbers: z.array(z.union([z.string(), z.record(z.string(), z.any())])).nullish(),
  phones: z.array(z.union([z.string(), z.record(z.string(), z.any())])).nullish(),
  job_history: z.array(JobHistoryItemSchema).nullish(),
  skills: z.array(z.any()).nullish(),
  location: z.union([z.string(), z.record(z.string(), z.any())]).nullish()
}).passthrough();

export type PersonRaw = z.infer<typeof PersonRawSchema>;

export const ProspeoPhoneHqObjectSchema = z.object({
  phone_hq: z.string().nullish(),
  phone_hq_country: z.string().nullish(),
  phone_hq_national: z.string().nullish(),
  phone_hq_country_code: z.string().nullish(),
  phone_hq_international: z.string().nullish()
}).passthrough();

export const CompanyRawSchema = z.object({
  name: z.string().nullish(),
  domain: z.string().nullish(),
  website: z.string().nullish(),
  industry: z.string().nullish(),
  employee_count: z.union([z.number(), z.string()]).nullish(),
  employee_range: z.string().nullish(),
  logo_url: z.string().nullish(),
  linkedin_url: z.string().nullish(),
  phone_hq: z.union([
    ProspeoPhoneHqObjectSchema,
    z.string()
  ]).nullish(),
  phone: z.union([
    z.object({
      phone: z.string().nullish(),
      number: z.string().nullish(),
      phone_hq: z.string().nullish()
    }).passthrough(),
    z.string()
  ]).nullish(),
  telephone: z.string().nullish(),
  phone_number: z.string().nullish(),
  phones: z.array(z.union([z.string(), z.record(z.string(), z.any())])).nullish()
}).passthrough();

export type CompanyRaw = z.infer<typeof CompanyRawSchema>;

/**
 * Normalizes any unknown input into a parsed JS object
 */
function toParsedObject(val: unknown): Record<string, any> | null {
  if (!val) return null;
  if (typeof val === 'object' && !Array.isArray(val)) return val as Record<string, any>;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed.startsWith('{')) return null;
    try {
      const parsed = JSON.parse(trimmed);
      return typeof parsed === 'object' && parsed !== null ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Normalizes any unknown input into an array
 */
function toParsedArray(val: unknown): any[] | null {
  if (!val) return null;
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed.startsWith('[')) return null;
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Helper to sanitize phone strings: ignores empty or raw JSON structures, preserves masked numbers (with '*')
 */
function sanitizeCleanPhone(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null;
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return null;
  return trimmed;
}

/**
 * Validates and extracts the lead's direct mobile number using Zod.
 * Preserves masked numbers (e.g. +33 7 84 ** ** **) as requested so users can see the available number.
 * Never looks at company data.
 */
export function extractLeadMobileWithZod(leadMobile: unknown, personRaw: unknown): string | null {
  // 1. Direct leadMobile
  const directClean = sanitizeCleanPhone(leadMobile);
  if (directClean) return directClean;

  // 1b. If leadMobile is an object or stringified JSON
  const mobileObj = toParsedObject(leadMobile);
  if (mobileObj) {
    const parsedProspeo = ProspeoMobileObjectSchema.safeParse(mobileObj);
    if (parsedProspeo.success) {
      const data = parsedProspeo.data;
      if (data.status !== 'UNAVAILABLE') {
        const num = sanitizeCleanPhone(data.mobile || data.mobile_international || data.mobile_national);
        if (num) return num;
      }
    }
  }

  // 2. Parse person_raw with Zod
  const rawObj = toParsedObject(personRaw);
  if (rawObj) {
    const parsedPerson = PersonRawSchema.safeParse(rawObj);
    if (parsedPerson.success) {
      const p = parsedPerson.data;

      // Check mobile field (preserves masked numbers)
      if (p.mobile) {
        if (typeof p.mobile === 'string') {
          const s = sanitizeCleanPhone(p.mobile);
          if (s) return s;
        } else if (typeof p.mobile === 'object' && p.mobile !== null) {
          if (p.mobile.status !== 'UNAVAILABLE') {
            const s = sanitizeCleanPhone(p.mobile.mobile || p.mobile.mobile_international || p.mobile.mobile_national);
            if (s) return s;
          }
        }
      }

      // Check phone field
      if (p.phone) {
        if (typeof p.phone === 'string') {
          const s = sanitizeCleanPhone(p.phone);
          if (s) return s;
        } else if (typeof p.phone === 'object' && p.phone !== null) {
          if (p.phone.status !== 'UNAVAILABLE') {
            const s = sanitizeCleanPhone(p.phone.phone || p.phone.number);
            if (s) return s;
          }
        }
      }

      const sDirectPhone = sanitizeCleanPhone(p.direct_phone);
      if (sDirectPhone) return sDirectPhone;

      const sDirectNum = sanitizeCleanPhone(p.direct_number);
      if (sDirectNum) return sDirectNum;

      const sPhoneNum = sanitizeCleanPhone(p.phone_number);
      if (sPhoneNum) return sPhoneNum;

      // Arrays
      if (Array.isArray(p.phone_numbers)) {
        for (const item of p.phone_numbers) {
          if (typeof item === 'string') {
            const s = sanitizeCleanPhone(item);
            if (s) return s;
          } else if (item && typeof item === 'object') {
            const s = sanitizeCleanPhone(item.number || item.phone || item.mobile);
            if (s) return s;
          }
        }
      }
    }
  }

  return null;
}

/**
 * Validates and extracts the company's HQ standard phone using Zod.
 * Never looks at person data.
 */
export function extractCompanyPhoneWithZod(phoneHq: unknown, companyRaw: unknown): string | null {
  // 1. Direct phoneHq
  const directClean = sanitizeCleanPhone(phoneHq);
  if (directClean) return directClean;

  // 1b. If phoneHq is an object or stringified JSON
  const phoneHqObj = toParsedObject(phoneHq);
  if (phoneHqObj) {
    const parsedHq = ProspeoPhoneHqObjectSchema.safeParse(phoneHqObj);
    if (parsedHq.success) {
      const data = parsedHq.data;
      const num = sanitizeCleanPhone(data.phone_hq || data.phone_hq_international || data.phone_hq_national);
      if (num) return num;
    }
  }

  // 2. Parse company_raw with Zod
  const rawObj = toParsedObject(companyRaw);
  if (rawObj) {
    const parsedCompany = CompanyRawSchema.safeParse(rawObj);
    if (parsedCompany.success) {
      const c = parsedCompany.data;

      // Check phone_hq
      if (c.phone_hq) {
        if (typeof c.phone_hq === 'string') {
          const s = sanitizeCleanPhone(c.phone_hq);
          if (s) return s;
        } else if (typeof c.phone_hq === 'object' && c.phone_hq !== null) {
          const s = sanitizeCleanPhone(c.phone_hq.phone_hq || c.phone_hq.phone_hq_international || c.phone_hq.phone_hq_national);
          if (s) return s;
        }
      }

      // Check phone
      if (c.phone) {
        if (typeof c.phone === 'string') {
          const s = sanitizeCleanPhone(c.phone);
          if (s) return s;
        } else if (typeof c.phone === 'object' && c.phone !== null) {
          const s = sanitizeCleanPhone(c.phone.phone || c.phone.phone_hq || c.phone.number);
          if (s) return s;
        }
      }

      const sTel = sanitizeCleanPhone(c.telephone);
      if (sTel) return sTel;

      const sPhoneNum = sanitizeCleanPhone(c.phone_number);
      if (sPhoneNum) return sPhoneNum;
    }
  }

  return null;
}

/**
 * Validates and extracts parsed job history using Zod.
 */
export function extractJobHistoryWithZod(jobHistory: unknown, personRaw?: unknown): JobHistoryItem[] {
  // 1. Try jobHistory first
  const arr = toParsedArray(jobHistory);
  if (arr) {
    const validated: JobHistoryItem[] = [];
    for (const item of arr) {
      const parsed = JobHistoryItemSchema.safeParse(item);
      if (parsed.success) {
        validated.push(parsed.data);
      }
    }
    if (validated.length > 0) return validated;
  }

  // 2. Fallback to personRaw.job_history
  const rawObj = toParsedObject(personRaw);
  if (rawObj) {
    const parsedPerson = PersonRawSchema.safeParse(rawObj);
    if (parsedPerson.success && parsedPerson.data.job_history) {
      return parsedPerson.data.job_history;
    }
  }

  return [];
}
