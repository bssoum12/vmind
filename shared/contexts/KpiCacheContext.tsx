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
  lastUpdatedByAgent: Record<string, string | null>;
  cooldowns: Record<string, number>; // Timestamps of last manual refreshes
  fetchKpis: (agentId: string, force?: boolean, targetTool?: string, horizon?: string) => Promise<void>;
  error: string | null;
  clearError: () => void;
  notice: string | null;
  clearNotice: () => void;
  activeAgentId: string;
  setActiveAgentId: (agentId: string) => void;
  clientId: string;
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
  const [lastUpdatedByAgent, setLastUpdatedByAgent] = useState<Record<string, string | null>>({});
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isConnectorConnected, setIsConnectorConnected] = useState<boolean>(false);

  useEffect(() => {
    const checkInitialStatus = async () => {
      if (typeof window !== 'undefined' && (window.location.pathname === '/login' || window.location.pathname.startsWith('/login') || window.location.pathname.startsWith('/reset-password'))) {
        return;
      }
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';
        const res = await fetch(`${baseUrl}/api/connectors/tralis/status`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.connected) {
            setIsConnectorConnected(true);
            const user = data.user || {
              username: data.erp_username || '',
              client_id: data.client_id || 'LOCAL',
              roles: data.roles || ['Administrator'],
              allowedAgents: data.allowedAgents || ['VDATA', 'VFIN', 'VSELL', 'VSTOCK', 'VBUY', 'VMOVE']
            };
            setCurrentUser(user);
          } else {
            setIsConnectorConnected(false);
          }
        }
      } catch {
        setIsConnectorConnected(false);
      }
    };
    checkInitialStatus();

    const handleMcpUpdate = (event?: any) => {
      const sessionDetail = event?.detail;
      if (!sessionDetail || sessionDetail === null || sessionDetail.connected === false) {
        setIsConnectorConnected(false);
        const user = sessionDetail?.user;
        if (user) {
          setCurrentUser(user);
        }
        setKpisByAgent({});
        setError(null);
        setLoadingByAgent({});
      } else {
        const user = sessionDetail?.user || sessionDetail;
        if (user) {
          setCurrentUser(user);
        }
        setIsConnectorConnected(true);
      }
    };
    window.addEventListener('mcp-session-updated', handleMcpUpdate);
    return () => window.removeEventListener('mcp-session-updated', handleMcpUpdate);
  }, []);

  const updateGlobalDates = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  const clearError = () => setError(null);
  const clearNotice = () => setNotice(null);

  // Helper to check if user has ERP connected and agent is allowed
  const isAgentKpiAllowed = (agentId: string) => {
    if (!currentUser) return false;
    const roles = Array.isArray(currentUser.roles) ? currentUser.roles : [currentUser.roles || ''];
    if (roles.some((r: string) => ['Administrator', 'Administrators', 'Admin', 'Superusers'].includes(r))) return true;
    if (Array.isArray(currentUser.allowedAgents)) {
      return currentUser.allowedAgents.includes(agentId.toUpperCase());
    }
    return false;
  };

  const fetchKpis = async (agentId: string, force = false, targetTool?: string, horizon?: string) => {
    if (!currentUser) return;
    if (typeof window !== 'undefined' && (window.location.pathname === '/login' || window.location.pathname.startsWith('/login') || window.location.pathname.startsWith('/reset-password'))) return;

    const agentKey = (agentId || 'vdata').toLowerCase();
    const allowedAgentUpper = agentKey.toUpperCase();

    if (!isConnectorConnected) {
      console.log(`[KPI CONTEXT] Connecteur ERP déconnecté — requête KPI évitée.`);
      setLoadingByAgent(prev => ({ ...prev, [agentKey]: false }));
      return;
    }

    if (!isAgentKpiAllowed(allowedAgentUpper)) {
      console.log(`[KPI CONTEXT] KPIs not allowed for agent ${allowedAgentUpper} (ERP not connected or agent not authorized)`);
      setLoadingByAgent(prev => ({ ...prev, [agentKey]: false }));
      return;
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

    // Set loading state for this agent independently (never aborts other specialists)
    setLoadingByAgent(prev => ({ ...prev, [agentKey]: true }));
    try {
      const clientId = currentUser?.client_id || 'LOCAL';

      console.log(`[KPI CONTEXT] Fetching KPIs for ${allowedAgentUpper} (tenant: ${clientId}, force: ${force}, tool: ${targetTool || 'ALL'}, horizon: ${horizon || '1m'})`);
      const response = await fetchN8nKpis(
        {
          allowed_agents: allowedAgentUpper,
          client_id: clientId,
          startDate,
          endDate,
          target_tool: targetTool,
          forceRefresh: force,
          horizon: horizon || '1m'
        }
      );

      // Si le backend indique qu'aucune donnée n'est encore stockée en base (État 'En attente')
      if (response && response.stored === false) {
        setKpisByAgent(prev => ({
          ...prev,
          [agentKey]: { _stored: false, _inProgress: Boolean(response.inProgress) }
        }));
        setLoadingByAgent(prev => ({ ...prev, [agentKey]: false }));
        return;
      }

      // Si une date de snapshot est renvoyée depuis PostgreSQL
      if (response && response._updatedAt) {
        setLastUpdatedByAgent(prev => ({
          ...prev,
          [agentKey]: response._updatedAt
        }));
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
            [targetTool]: unwrapped,
            _stored: true
          };
        } else {
          // Full agent load: extract nested agent key if present
          const extractedData = response && typeof response === 'object' 
            ? (response[agentKey] || response[allowedAgentUpper] || response) 
            : response;

          updatedAgentData = {
            ...existingAgentData,
            ...(typeof extractedData === 'object' ? extractedData : { data: extractedData }),
            _stored: true
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
      const errMsg = err?.message || "";
      // Interception silencieuse si le connecteur est déconnecté ou accès refusé (403)
      if (errMsg.includes("403") || errMsg.includes("Accès refusé") || errMsg.includes("tenant non autorisé")) {
        console.warn(`[KPI CONTEXT] Connecteur ERP non connecté ou accès refusé (403) — passage silencieux à l'état requis.`);
        setIsConnectorConnected(false);
        setError(null);
      } else {
        console.error(`[KPI CONTEXT] Error fetching KPIs for ${allowedAgentUpper}:`, err);
        let msg = errMsg || "Impossible de charger les indicateurs.";
        if (msg.toLowerCase().includes("fetch failed") || msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("econnrefused")) {
          msg = "Erreur de connexion. Le service d'analyse est temporairement inaccessible.";
        }
        setError(msg);
      }
    } finally {
      setLoadingByAgent(prev => ({ ...prev, [agentKey]: false }));
    }
  };

  // Chargement passif depuis PostgreSQL lors du changement d'onglet spécialiste ou de date (NE LANCE JAMAIS n8n)
  useEffect(() => {
    if (!currentUser || !isConnectorConnected) return;
    if (typeof window !== 'undefined' && (window.location.pathname === '/login' || window.location.pathname.startsWith('/login') || window.location.pathname.startsWith('/reset-password'))) return;

    const currentAgent = activeAgentId || 'VDATA';
    const lowerAgent = currentAgent.toLowerCase();
    if (lowerAgent !== 'vdata' && lowerAgent !== 'vfin' && lowerAgent !== 'vsell' && lowerAgent !== 'vbuy' && lowerAgent !== 'vmove') return;

    if (!isAgentKpiAllowed(currentAgent)) {
      setLoadingByAgent(prev => ({ ...prev, [lowerAgent]: false }));
      return;
    }

    // Interrogation de la base PostgreSQL en mode passif (force = false)
    fetchKpis(lowerAgent, false);
  }, [startDate, endDate, activeAgentId, currentUser, isConnectorConnected]);

  // Polling automatique si un calcul est en cours en tâche de fond pour l'agent actif
  useEffect(() => {
    if (!isConnectorConnected) return;
    const currentAgent = (activeAgentId || 'VDATA').toLowerCase();
    const agentState = kpisByAgent[currentAgent];

    if (agentState && agentState._inProgress && !agentState._stored) {
      const pollTimer = setInterval(() => {
        console.log(`[KPI CONTEXT] Polling backend for background completion of ${currentAgent}...`);
        fetchKpis(currentAgent, false);
      }, 4000);

      return () => clearInterval(pollTimer);
    }
  }, [activeAgentId, kpisByAgent, isConnectorConnected]);

  return (
    <KpiCacheContext.Provider
      value={{
        startDate,
        endDate,
        updateGlobalDates,
        kpisByAgent,
        loadingByAgent,
        lastUpdatedByAgent,
        cooldowns,
        fetchKpis,
        error,
        clearError,
        notice,
        clearNotice,
        activeAgentId,
        setActiveAgentId,
        clientId: currentUser?.client_id || 'LOCAL'
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
