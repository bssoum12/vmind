'use client';

import { useState, useEffect } from 'react';
import { COUNTRIES, Country } from '@/shared/constants/countries';
import { INDUSTRIES } from '@/shared/constants/industries';
import { JOB_TITLES } from '@/shared/constants/jobTitles';

export interface IcpOptionsData {
  countries: Country[];
  industries: string[];
  jobTitles: string[];
}

const DEFAULT_FALLBACK: IcpOptionsData = {
  countries: [...COUNTRIES],
  industries: [...INDUSTRIES],
  jobTitles: [...JOB_TITLES],
};

let inMemoryIcpCache: IcpOptionsData | null = null;
let fetchPromise: Promise<IcpOptionsData> | null = null;

async function fetchIcpOptions(): Promise<IcpOptionsData> {
  if (inMemoryIcpCache) return inMemoryIcpCache;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async (): Promise<IcpOptionsData> => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';
      const token = typeof window !== 'undefined' ? localStorage.getItem('vmind_session') : null;
      const res = await fetch(`${baseUrl}/api/prospect-agent/icp-options`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch ICP options: ${res.status}`);
      }

      const json = await res.json();
      if (json && json.ok && json.data) {
        const resolved: IcpOptionsData = {
          countries: Array.isArray(json.data.countries) && json.data.countries.length > 0 
            ? json.data.countries 
            : [...COUNTRIES],
          industries: Array.isArray(json.data.industries) && json.data.industries.length > 0 
            ? json.data.industries 
            : [...INDUSTRIES],
          jobTitles: Array.isArray(json.data.jobTitles) && json.data.jobTitles.length > 0 
            ? json.data.jobTitles 
            : [...JOB_TITLES],
        };
        inMemoryIcpCache = resolved;
        return resolved;
      }
    } catch (err) {
      console.warn('[useIcpOptions] Using fallback constants due to fetch issue:', err);
    } finally {
      fetchPromise = null;
    }

    return DEFAULT_FALLBACK;
  })();

  return fetchPromise;
}

export function useIcpOptions() {
  const [data, setData] = useState<IcpOptionsData>(() => inMemoryIcpCache ?? DEFAULT_FALLBACK);
  const [isLoading, setIsLoading] = useState<boolean>(!inMemoryIcpCache);

  useEffect(() => {
    let isMounted = true;
    fetchIcpOptions().then((opts) => {
      if (isMounted) {
        setData(opts);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    countries: data.countries,
    industries: data.industries,
    jobTitles: data.jobTitles,
    isLoading
  };
}
