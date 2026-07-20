"use client";

import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { fetchN8nKpis } from '../api/n8n-api';

interface KpiCacheContextType {
  startDate: string; // Format YYYYMMDD
  endDate: string;   // Format YYYYMMDD
  updateGlobalDates: (start: string, end: string) => void;
  kpisByAgent: Record<string, any>;
  loadingByAgent: Record<string, boolean>;
  cooldowns: Record<string, number>; // Timestamps of last manual refreshes
  fetchKpis: (agentId: string, force?: boolean, targetTool?: string) => Promise<void>;
  error: string | null;
  clearError: () => void;
  activeAgentId: string;
  setActiveAgentId: (agentId: string) => void;
}

const KpiCacheContext = createContext<KpiCacheContextType | undefined>(undefined);

const formatDateToYYYYMMDD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const r = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${r}`;
};

interface KpiCacheProviderProps {
  children: React.ReactNode;
  initialAgentId?: string;
}

export const KpiCacheProvider: React.FC<KpiCacheProviderProps> = ({ children, initialAgentId = "VDATA" }) => {
  const [activeAgentId, setActiveAgentId] = useState<string>(initialAgentId);
  // Set default dates: Jan 1st of current year to current date
  const now = new Date();
  const defaultStart = `${now.getFullYear()}0101`;
  const defaultEnd = formatDateToYYYYMMDD(now);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  
  const [kpisByAgent, setKpisByAgent] = useState<Record<string, any>>({});
  const [loadingByAgent, setLoadingByAgent] = useState<Record<string, boolean>>({});
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const activeAgentRef = useRef<string>('VDATA');

  // Debouncing selection ref
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateGlobalDates = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  const clearError = () => setError(null);

  const fetchKpis = async (agentId: string, force = false, targetTool?: string) => {
    if (!isAuthenticated()) {
      return;
    }

    const upperAgent = agentId.toUpperCase();
    activeAgentRef.current = upperAgent;

    // Clear any previous debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Cooldown logic for force refresh (3 hours backend / UI lock)
    if (force && targetTool) {
      const cooldownKey = `${upperAgent}_${targetTool}`;
      const lastRun = cooldowns[cooldownKey] || 0;
      const nowMs = Date.now();
      if (nowMs - lastRun < 3 * 60 * 60 * 1000) {
        console.log(`[KPI CONTEXT] Cooldown active for ${cooldownKey}. Skipping fetch.`);
        return;
      }
    }

    // Set loading state for this agent
    setLoadingByAgent(prev => ({ ...prev, [agentId]: true }));
    setError(null);

    // Cancel in-flight HTTP request if any
    if (abortControllerRef.current) {
      console.log(`[KPI CONTEXT] Aborting in-flight request for agent switch`);
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const clientId = "DEMO"; // Default tenant id

      console.log(`[KPI CONTEXT] Fetching KPIs for ${upperAgent} (force: ${force}, tool: ${targetTool || 'ALL'})`);
      const response = await fetchN8nKpis(
        {
          allowed_agents: upperAgent,
          client_id: clientId,
          startDate,
          endDate,
          target_tool: targetTool,
          forceRefresh: force
        },
        controller.signal
      );

      // Active Selection Guard: Check if the user hasn't switched away
      if (activeAgentRef.current !== upperAgent) {
        console.warn(`[KPI CONTEXT] Resolved data for ${upperAgent} discarded: Active agent is now ${activeAgentRef.current}`);
        return;
      }

      // Merge new data into cache
      setKpisByAgent(prev => {
        const existingAgentData = prev[agentId] || {};
        
        // If it's a specific tool refresh, nest it under the tool's name key
        if (targetTool) {
          return {
            ...prev,
            [agentId]: {
              ...existingAgentData,
              [targetTool]: response
            }
          };
        }

        // Full agent load or fallback: overwrite cache (extract nested agent key if present)
        const agentKey = agentId.toLowerCase();
        const extractedData = response && typeof response === 'object' 
          ? (response[agentKey] || response[agentId] || response) 
          : response;

        return {
          ...prev,
          [agentId]: extractedData
        };
      });

      // Update manual cooldown if applicable
      if (force && targetTool) {
        setCooldowns(prev => ({
          ...prev,
          [`${upperAgent}_${targetTool}`]: Date.now()
        }));
      }

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log(`[KPI CONTEXT] Request for ${upperAgent} was aborted`);
        return; // Don't trigger error or clear loading for aborted requests
      }
      console.error(`[KPI CONTEXT] Error fetching KPIs:`, err);
      setError(err.message || "Impossible de charger les indicateurs.");
    } finally {
      // Only reset loading if this remains the active agent
      if (activeAgentRef.current === upperAgent) {
        setLoadingByAgent(prev => ({ ...prev, [agentId]: false }));
      }
    }
  };

  // Helper to check if user is authenticated before fetching KPIs
  const isAuthenticated = () => {
    if (typeof window === "undefined") return false;
    const token = localStorage.getItem("vmind_mcp_token") || localStorage.getItem("vmind_session");
    return Boolean(token && token !== "null");
  };

  // Auto-refetch when date changes or when the active agent changes (with 2s debounce)
  useEffect(() => {
    if (!isAuthenticated()) {
      return;
    }

    const currentAgent = activeAgentId || 'VDATA';
    const lowerAgent = currentAgent.toLowerCase();
    if (lowerAgent !== 'vdata' && lowerAgent !== 'vfin') return;

    // Clear previous debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set loading state immediately so the skeletons show up during the 2s wait
    setLoadingByAgent(prev => ({ ...prev, [lowerAgent]: true }));

    // Set new debounce timeout (2 seconds)
    debounceTimeoutRef.current = setTimeout(() => {
      fetchKpis(lowerAgent);
    }, 2000);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [startDate, endDate, activeAgentId]);

  return (
    <KpiCacheContext.Provider
      value={{
        startDate,
        endDate,
        updateGlobalDates,
        kpisByAgent,
        loadingByAgent,
        cooldowns,
        fetchKpis,
        error,
        clearError,
        activeAgentId,
        setActiveAgentId
      }}
    >
      {children}
    </KpiCacheContext.Provider>
  );
};

export const useKpis = () => {
  const context = useContext(KpiCacheContext);
  if (!context) {
    throw new Error('useKpis must be used within a KpiCacheProvider');
  }
  return context;
};
