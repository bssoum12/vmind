'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, LayoutDashboard, Users, Mail, Activity } from 'lucide-react';

import DashboardView from '../../../features/management/sourcing-workspace/components/DashboardView';
import LeadsView from '../../../features/management/sourcing-workspace/components/LeadsView';
import LogsView from '../../../features/management/sourcing-workspace/components/LogsView';
import LeadDetailDrawer from '../../../features/management/sourcing-workspace/components/LeadDetailDrawer';
import { getAgents } from '@/shared/api/n8n-api';
import { useProspectSocket } from '../../../features/management/prospect-workspace/hooks/useProspectSocket';

import '../../../features/management/prospect-workspace/workspace.scss'; // Reuse styling

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function SourcingAgentWorkspacePage() {
  const { agentId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['dashboard', 'leads', 'logs'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const [leads, setLeads] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [agentName, setAgentName] = useState<string>('Chargement...');
  const [agentData, setAgentData] = useState<any>(null);
  const [allAgents, setAllAgents] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    if (!agentId) return;
    try {
      const token = localStorage.getItem('vmind_session');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [agents, leadsRes, logsRes] = await Promise.all([
        getAgents().catch(() => []),
        fetch(`${API_BASE_URL}/api/agent-leads/${agentId}`, { headers, cache: 'no-store' }),
        fetch(`${API_BASE_URL}/api/agent-logs/${agentId}`, { headers, cache: 'no-store' })
      ]);

      if (Array.isArray(agents)) {
        setAllAgents(agents);
        const currentAgent = agents.find(a => 
          (a.uuid && String(a.uuid).toLowerCase() === String(agentId).toLowerCase()) || 
          (a.agent_id && String(a.agent_id).toLowerCase() === String(agentId).toLowerCase()) ||
          (a.agent_name && a.agent_name.toLowerCase() === decodeURIComponent(String(agentId)).toLowerCase())
        );
        if (currentAgent) {
          setAgentName(currentAgent.agent_name);
          setAgentData(currentAgent);
        } else {
          setAgentName('Agent Inconnu');
          setAgentData(null);
        }
      }

      if (leadsRes.status === 403 || logsRes.status === 403) {
        sessionStorage.setItem('vmind_current_view', 'agents');
        router.push('/');
        return;
      }

      if (leadsRes.ok) {
        const data = await leadsRes.json();
        setLeads(data);
      }
      if (logsRes.ok) {
        setLogs(await logsRes.json());
      }
    } catch (err) {
      console.error("Failed to load workspace data:", err);
    }
  }, [agentId, router]);

  useEffect(() => {
    setIsLoading(true);
    fetchData().finally(() => setIsLoading(false));
  }, [fetchData]);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  useProspectSocket((payload) => {
    if (typeof payload.is_executing === 'boolean' && (payload.agent_id || payload.uuid)) {
      const targetId = String(payload.uuid || payload.agent_id || '').toLowerCase();
      const currentParamId = String(agentId || '').toLowerCase();
      setAgentData((prev: any) => {
        if (!prev) return prev;
        const prevUuid = String(prev.uuid || '').toLowerCase();
        const prevAgentId = String(prev.agent_id || '').toLowerCase();
        const prevName = String(prev.agent_name || prev.nom || '').toLowerCase();

        if (
          targetId === prevUuid ||
          targetId === prevAgentId ||
          targetId === prevName ||
          targetId === currentParamId
        ) {
          return { ...prev, is_executing: payload.is_executing };
        }
        return prev;
      });
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      fetchData();
    }, 500);
  });

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.replace(`/sourcing-agent-workspace/${agentId}?tab=${tab}`, { scroll: false });
  };

  const handleOpenLead = (lead: any) => {
    setSelectedLead(lead);
    setIsDrawerOpen(true);
  };

  const targetAgentNames = React.useMemo(() => {
    const rawTargets = agentData?.target_agent_ids || agentData?.config?.target_agent_ids || [];
    if (!Array.isArray(rawTargets) || rawTargets.length === 0) return [];
    return rawTargets.map(t => {
      const match = allAgents?.find(a => 
        (a.uuid && String(a.uuid).toLowerCase() === String(t).toLowerCase()) ||
        (a.agent_id && String(a.agent_id).toLowerCase() === String(t).toLowerCase()) ||
        (a.agent_name && a.agent_name.toLowerCase() === String(t).toLowerCase()) ||
        (a.nom && a.nom.toLowerCase() === String(t).toLowerCase())
      );
      return match ? (match.agent_name || match.nom) : String(t);
    });
  }, [agentData, allAgents]);

  return (
    <div className="workspace-container app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>

      {/* HEADER (Native VMIND Style) */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 32px', borderBottom: '1px solid var(--border)',
        background: 'rgba(8, 20, 38, 0.5)',
        backdropFilter: 'blur(16px)',
        flexShrink: 0,
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                sessionStorage.setItem('vmind_current_view', 'agents');
                sessionStorage.setItem('vmind_mode', 'MANAGEMENT');
                localStorage.setItem('vmind_mode', 'MANAGEMENT');
              }
              router.push('/?view=agents');
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '8px', color: 'var(--text)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--cyan)'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                Espace de Travail : {agentName}
              </h1>
              {agentData?.is_executing && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11, padding: '2px 8px', borderRadius: 4,
                  background: 'rgba(0, 229, 200, 0.1)', color: '#00E5C8',
                  border: '1px solid rgba(0, 229, 200, 0.3)',
                  fontWeight: 600, animation: 'pulse 1.5s infinite'
                }}>
                  ⚡ En cours d'exécution...
                </span>
              )}
            </div>

            {/* Sub-header: Sourcing Target Agents Context */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Destination des leads :</span>
              {targetAgentNames.length === 0 ? (
                <span style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>
                  Aucun Target Agent assigné
                </span>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {targetAgentNames.map((name, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: 'rgba(0, 229, 200, 0.08)',
                        color: '#00E5C8',
                        border: '1px solid rgba(0, 229, 200, 0.2)',
                        fontWeight: 500,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      🎯 {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', background: 'var(--navy2)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          {[
            { id: 'dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard },
            { id: 'leads', label: 'Candidats / Leads', icon: Users },
            { id: 'logs', label: 'Journal', icon: Activity },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 16px', borderRadius: '8px',
                background: activeTab === tab.id ? 'var(--cyan)' : 'transparent',
                color: activeTab === tab.id ? '#000' : 'var(--text-muted)',
                fontWeight: activeTab === tab.id ? 600 : 500,
                border: 'none', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              <tab.icon size={16} />
              {tab.label}
              {tab.id === 'leads' && leads.length > 0 && (
                <span className="badge" style={{ marginLeft: '6px' }}>{leads.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="main-content" style={{ flex: 1, padding: '0', overflowY: 'auto', background: 'var(--navy)' }}>
        {isLoading && leads.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--cyan)' }}>
            Chargement de l'espace...
          </div>
        ) : (
          <div style={{ padding: '2.5rem', maxWidth: '1600px', margin: '0 auto' }}>
            {activeTab === 'dashboard' && <DashboardView leads={leads} logs={logs} agent={agentData} allAgents={allAgents} threshold={0} />}
            {activeTab === 'leads' && <LeadsView leads={leads} onOpenLead={handleOpenLead} onRefresh={fetchData} />}
            {activeTab === 'logs' && <LogsView logs={logs} />}
          </div>
        )}
      </div>

      {/* DRAWER */}
      {selectedLead && (
        <LeadDetailDrawer
          lead={selectedLead}
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onRefresh={fetchData}
          signature=""
          defaultCc=""
        />
      )}
    </div>
  );
}
