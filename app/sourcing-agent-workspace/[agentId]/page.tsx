'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, LayoutDashboard, Users, Mail, Activity } from 'lucide-react';

import DashboardView from '../../../features/management/sourcing-workspace/components/DashboardView';
import LeadsView from '../../../features/management/sourcing-workspace/components/LeadsView';
import CampaignsView from '../../../features/management/sourcing-workspace/components/CampaignsView';
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
    if (tabParam && ['dashboard', 'leads', 'campaigns', 'logs'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const [leads, setLeads] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [agentName, setAgentName] = useState<string>('Chargement...');
  const [agentData, setAgentData] = useState<any>(null);

  useEffect(() => {
    async function fetchAgentName() {
      try {
        const agents = await getAgents();
        const currentAgent = agents.find(a => String(a.uuid) === String(agentId) || String(a.agent_id) === String(agentId));
        if (currentAgent) {
          setAgentName(currentAgent.agent_name);
          setAgentData(currentAgent);
        } else {
          setAgentName('Agent Inconnu');
          setAgentData(null);
        }
      } catch (err) {
        console.error(err);
        setAgentName('Agent');
        setAgentData(null);
      }
    }
    fetchAgentName();
  }, [agentId]);

  const fetchData = useCallback(async () => {
    if (!agentId) return;
    setIsLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('vmind_session')}` };

      // We use the same backend routes as prospect agent, because the tables are the same and filtered by agentId
      const [leadsRes, campaignsRes, logsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/agent-leads/${agentId}`, { headers, cache: 'no-store' }),
        fetch(`${API_BASE_URL}/api/agent-campaigns/${agentId}`, { headers, cache: 'no-store' }),
        fetch(`${API_BASE_URL}/api/agent-logs/${agentId}`, { headers, cache: 'no-store' })
      ]);

      if (leadsRes.status === 403 || campaignsRes.status === 403 || logsRes.status === 403) {
        sessionStorage.setItem('vmind_current_view', 'agents');
        router.push('/');
        return;
      }

      if (leadsRes.ok) {
        const data = await leadsRes.json();
        setLeads(data);
        setSelectedLead((prev: any) => {
          if (prev) {
            const updated = data.find((l: any) => l.id === prev.id);
            if (updated && JSON.stringify(updated) !== JSON.stringify(prev)) {
              return updated;
            }
          }
          return prev;
        });
      }
      if (campaignsRes.ok) setCampaigns(await campaignsRes.json());
      if (logsRes.ok) setLogs(await logsRes.json());

    } catch (err) {
      console.error("Failed to fetch agent data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [agentId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  useProspectSocket(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
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

  const handleOpenLeadById = (id: number) => {
    const lead = leads.find((l: any) => l.id === id);
    if (lead) {
      setSelectedLead(lead);
      setIsDrawerOpen(true);
    }
  };

  return (
    <div className="workspace-container app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>

      {/* HEADER (Native VMIND Style) */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 32px', borderBottom: '1px solid var(--border)',
        background: 'rgba(8, 20, 38, 0.4)',
        backdropFilter: 'blur(10px)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => {
              sessionStorage.setItem('vmind_current_view', 'agents');
              router.push('/');
            }}
            style={{
              background: 'transparent', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '8px', color: 'var(--text)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>Espace de Travail : {agentName}</h1>
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '4px 0 0 0' }}>Supervisez l'agent de sourcing en temps réel.</p>
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', background: 'var(--navy2)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          {[
            { id: 'dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard },
            { id: 'leads', label: 'Candidats', icon: Users },
            { id: 'campaigns', label: 'Campagnes', icon: Mail },
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

      {/* MAIN CONTENT (CDC Components injected here) */}
      <div className="main-content" style={{ flex: 1, padding: '0', overflowY: 'auto', background: 'var(--navy)' }}>
        {isLoading && leads.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--cyan)' }}>
            Chargement de l'espace...
          </div>
        ) : (
          <div style={{ padding: '2.5rem', maxWidth: '1600px', margin: '0 auto' }}>
            {activeTab === 'dashboard' && <DashboardView leads={leads} campaigns={campaigns} logs={logs} agent={agentData} threshold={0} />}
            {activeTab === 'leads' && <LeadsView leads={leads} onOpenLead={handleOpenLead} onRefresh={fetchData} />}
            {activeTab === 'campaigns' && <CampaignsView campaigns={campaigns} onRefresh={fetchData} defaultCc="" onOpenLeadById={handleOpenLeadById} />}
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
