"use client";

import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { fetchN8nKpis } from '../api/n8n-api';
import { jwtDecode } from 'jwt-decode';

interface KpiCacheContextType {
  startDate: string; // Format YYYYMMDD
  endDate: string;   // Format YYYYMMDD
  updateGlobalDates: (start: string, end: string) => void;
  kpisByAgent: Record<string, any>;
  loadingByAgent: Record<string, boolean>;
  cooldowns: Record<string, number>; // Timestamps of last manual refreshes
  fetchKpis: (agentId: string, force?: boolean, targetTool?: string, horizon?: string) => Promise<void>;
  error: string | null;
  clearError: () => void;
  notice: string | null;
  clearNotice: () => void;
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
  const [notice, setNotice] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const activeAgentRef = useRef<string>('VDATA');

  // Debouncing selection ref
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateGlobalDates = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  const clearError = () => setError(null);
  const clearNotice = () => setNotice(null);

  // Helper to check if user has ERP connected and agent is allowed
  const isAgentKpiAllowed = (agentId: string) => {
    if (typeof window === "undefined") return false;
    const mcpToken = localStorage.getItem("vmind_mcp_token");
    if (!mcpToken) return false;
    
    const stored = localStorage.getItem("vmind_allowed_agents");
    if (stored) {
      try {
        const allowed: string[] = JSON.parse(stored);
        return allowed.includes(agentId.toUpperCase());
      } catch (e) {}
    }
    
    try {
      const decoded: any = jwtDecode(mcpToken);
      if (decoded.roles && decoded.roles.includes("Administrators")) return true;
      if (decoded.allowedAgents) {
        return decoded.allowedAgents.includes(agentId.toUpperCase());
      }
    } catch (e) {}
    
    return false;
  };

  const fetchKpis = async (agentId: string, force = false, targetTool?: string, horizon?: string) => {
    if (!isAuthenticated()) {
      return;
    }

    const agentKey = (agentId || 'vdata').toLowerCase();
    const allowedAgentUpper = agentKey.toUpperCase();
    activeAgentRef.current = allowedAgentUpper;

    if (!isAgentKpiAllowed(allowedAgentUpper)) {
      console.log(`[KPI CONTEXT] KPIs not allowed for agent ${allowedAgentUpper} (ERP not connected or agent not authorized)`);
      setLoadingByAgent(prev => ({ ...prev, [agentKey]: false }));
      return;
    }

    // Clear any previous debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    const cooldownKey = targetTool ? `${allowedAgentUpper}_${targetTool}` : `${allowedAgentUpper}_ALL`;

    // Cooldown anti-spam for manual force refresh (1 hour)
    if (force) {
      const lastRun = cooldowns[cooldownKey] || 0;
      const nowMs = Date.now();
      const ONE_HOUR_MS = 60 * 60 * 1000; // 1 heure
      if (nowMs - lastRun < ONE_HOUR_MS) {
        const remainingMin = Math.ceil((ONE_HOUR_MS - (nowMs - lastRun)) / (60 * 1000));
        console.log(`[KPI CONTEXT] Cooldown actif pour ${cooldownKey} (reste ${remainingMin} min). Requête conservée pour économiser les tokens.`);
        setNotice(`Données déjà à jour. Prochaine actualisation autorisée dans ${remainingMin} min.`);
        setLoadingByAgent(prev => ({ ...prev, [agentKey]: false }));
        return;
      }
    }

    // Set loading state for this agent (canonical lowercase key)
    setLoadingByAgent(prev => ({ ...prev, [agentKey]: true }));
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

      console.log(`[KPI CONTEXT] Fetching KPIs for ${allowedAgentUpper} (force: ${force}, tool: ${targetTool || 'ALL'}, horizon: ${horizon || '1m'})`);
      const response = await fetchN8nKpis(
        {
          allowed_agents: allowedAgentUpper,
          client_id: clientId,
          startDate,
          endDate,
          target_tool: targetTool,
          forceRefresh: force,
          horizon: horizon || '1m'
        },
        controller.signal
      );

      // Active Selection Guard: Check if the user hasn't switched away
      if (activeAgentRef.current !== allowedAgentUpper) {
        console.warn(`[KPI CONTEXT] Resolved data for ${allowedAgentUpper} discarded: Active agent is now ${activeAgentRef.current}`);
        return;
      }

      // Merge new data into cache (canonical lowercase key)
      setKpisByAgent(prev => {
        const existingAgentData = prev[agentKey] || {};
        let updatedAgentData: any;
        
        // If it's a specific tool refresh, nest it under the tool's name key
        if (targetTool) {
          let unwrapped = response;
          if (unwrapped && typeof unwrapped === 'object') {
            if (unwrapped[agentKey] && unwrapped[agentKey][targetTool]) {
              unwrapped = unwrapped[agentKey][targetTool];
            } else if (unwrapped[allowedAgentUpper] && unwrapped[allowedAgentUpper][targetTool]) {
              unwrapped = unwrapped[allowedAgentUpper][targetTool];
            } else if (unwrapped[targetTool]) {
              unwrapped = unwrapped[targetTool];
            }
          }
          updatedAgentData = {
            ...existingAgentData,
            [targetTool]: unwrapped
          };
        } else {
          // Full agent load or fallback: overwrite cache (extract nested agent key if present)
          const extractedData = response && typeof response === 'object' 
            ? (response[agentKey] || response[allowedAgentUpper] || response) 
            : response;

          updatedAgentData = {
            ...existingAgentData,
            ...(typeof extractedData === 'object' ? extractedData : { data: extractedData })
          };
        }

        return {
          ...prev,
          [agentKey]: updatedAgentData
        };
      });

      // Update manual cooldown if applicable (1 heure)
      if (force) {
        setCooldowns(prev => ({
          ...prev,
          [cooldownKey]: Date.now()
        }));
      }

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log(`[KPI CONTEXT] Request for ${allowedAgentUpper} was aborted`);
        return; // Don't trigger error or clear loading for aborted requests
      }
      console.error(`[KPI CONTEXT] Error fetching KPIs:`, err);
      let msg = err?.message || "Impossible de charger les indicateurs.";
      if (msg.toLowerCase().includes("fetch failed") || msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("econnrefused")) {
        msg = "Erreur de connexion. Le service d'analyse est temporairement inaccessible.";
      }
      setError(msg);
    } finally {
      // Only reset loading if this remains the active agent
      if (activeAgentRef.current === allowedAgentUpper) {
        setLoadingByAgent(prev => ({ ...prev, [agentKey]: false }));
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
    if (lowerAgent !== 'vdata' && lowerAgent !== 'vfin' && lowerAgent !== 'vsell' && lowerAgent !== 'vbuy' && lowerAgent !== 'vmove') return;

    if (!isAgentKpiAllowed(currentAgent)) {
      setLoadingByAgent(prev => ({ ...prev, [lowerAgent]: false }));
      return;
    }

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

  // Instantly clear or refetch KPI cache when MCP session connects/disconnects
  useEffect(() => {
    const handleMcpUpdate = () => {
      const mcpToken = typeof window !== 'undefined' ? localStorage.getItem('vmind_mcp_token') : null;
      if (!mcpToken) {
        // Disconnected from ERP: immediately wipe cached KPIs & errors
        setKpisByAgent({});
        setError(null);
        setLoadingByAgent({});
      } else {
        // Connected: trigger refetch for active agent
        const currentAgent = (activeAgentId || 'VDATA').toLowerCase();
        fetchKpis(currentAgent);
      }
    };
    window.addEventListener('mcp-session-updated', handleMcpUpdate);
    return () => window.removeEventListener('mcp-session-updated', handleMcpUpdate);
  }, [activeAgentId]);

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
        notice,
        clearNotice,
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
