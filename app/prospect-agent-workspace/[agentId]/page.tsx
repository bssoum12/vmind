'use client';


import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, LayoutDashboard, Users, Mail, Activity } from 'lucide-react';

import DashboardView from '../../../features/management/prospect-workspace/components/DashboardView';
import LeadsView from '../../../features/management/prospect-workspace/components/LeadsView';
import CampaignsView from '../../../features/management/prospect-workspace/components/CampaignsView';
import LogsView from '../../../features/management/prospect-workspace/components/LogsView';
import LeadDetailDrawer from '../../../features/management/prospect-workspace/components/LeadDetailDrawer';

import '../../../features/management/prospect-workspace/workspace.css';

export default function AgentWorkspacePage() {
  const { agentId } = useParams();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [leads, setLeads] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!agentId) return;
    setIsLoading(true);
    try {
      const headers = { 'x-client-id': 'PROSPECT_AGENT' };
      
      const [leadsRes, campaignsRes, logsRes] = await Promise.all([
        fetch(`http://localhost:3001/api/agent-leads/${agentId}`, { headers }),
        fetch(`http://localhost:3001/api/agent-campaigns/${agentId}`, { headers }),
        fetch(`http://localhost:3001/api/agent-logs/${agentId}`, { headers })
      ]);
      
      if (leadsRes.ok) {
        const data = await leadsRes.json();
        setLeads(data);
        setSelectedLead((prev: any) => {
          if (prev) {
            const updated = data.find((l: any) => l.id === prev.id);
            return updated || prev;
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
  }, [agentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenLead = (lead: any) => {
    setSelectedLead(lead);
    setIsDrawerOpen(true);
  };

  return (
    <div className="workspace-container app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      
      {/* HEADER (Native VMIND Style) */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 32px', borderBottom: '1px solid var(--border)',
        background: 'rgba(8, 20, 38, 0.4)', backdropFilter: 'blur(10px)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={() => router.push('/')}
            style={{
              background: 'transparent', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '8px', color: 'var(--text)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>Espace de Travail : {agentId}</h1>
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '4px 0 0 0' }}>Supervisez l'agent de prospection en temps réel.</p>
          </div>
        </div>
        
        {/* TABS */}
        <div style={{ display: 'flex', background: 'var(--navy2)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          {[
            { id: 'dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard },
            { id: 'leads', label: 'Prospects', icon: Users },
            { id: 'outbox', label: 'Campagnes', icon: Mail },
            { id: 'logs', label: 'Journal', icon: Activity },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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
            {activeTab === 'dashboard' && <DashboardView leads={leads} campaigns={campaigns} threshold={60} />}
            {activeTab === 'leads' && <LeadsView leads={leads} threshold={60} onOpenLead={handleOpenLead} onRefresh={fetchData} />}
            {activeTab === 'outbox' && <CampaignsView campaigns={campaigns} onRefresh={fetchData} defaultCc="" onOpenLeadById={() => {}} />}
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
          threshold={60}
          signature=""
          defaultCc=""
        />
      )}
    </div>
  );
}
