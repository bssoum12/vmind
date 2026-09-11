'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, LayoutDashboard, Users, Mail, Terminal, Target } from 'lucide-react';

import DashboardView from '../../../features/management/prospect-workspace/components/DashboardView';
import LeadsView from '../../../features/management/prospect-workspace/components/LeadsView';
import CampaignsView from '../../../features/management/prospect-workspace/components/CampaignsView';
import LogsView from '../../../features/management/prospect-workspace/components/LogsView';
import LeadDetailDrawer from '../../../features/management/prospect-workspace/components/LeadDetailDrawer';
import { VMindGuide, VMindGuideArrow, GuideMood } from '@/shared/management/components/VMindGuide';
import { CyberIcon } from '@/shared/management/components/CyberIcon';
import { getAgents } from '@/shared/api/n8n-api';
import { useProspectSocket } from '../../../features/management/prospect-workspace/hooks/useProspectSocket';
import '../../../features/management/prospect-workspace/workspace.scss';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';

export default function AgentWorkspacePage() {
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

  // Tutorial state
  const [navTutorialStep, setNavTutorialStep] = useState<number>(0);

  useEffect(() => {
    if (!localStorage.getItem('vmind_tutorial_workspace_nav')) {
      localStorage.setItem('vmind_tutorial_workspace_nav', 'true');
      setNavTutorialStep(1);
    }

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

  const nextTutorialStep = () => {
    if (navTutorialStep >= 4) {
      setNavTutorialStep(0);
    } else {
      setNavTutorialStep(s => s + 1);
    }
  };

  useEffect(() => {
    if (navTutorialStep <= 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return;

      if (e.key === ' ' || e.code === 'Space' || e.key === 'ArrowRight') {
        e.preventDefault();
        nextTutorialStep();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setNavTutorialStep(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navTutorialStep]);

  const getTutorialContent = () => {
    switch (navTutorialStep) {
      case 1:
        return {
          title: "Vue d'ensemble",
          message: "Voici le tableau de bord de votre agent. Il résume ses performances globales et les métriques de prospection.",
          mood: 'focused' as GuideMood
        };
      case 2:
        return {
          title: "Gestion des Prospects",
          message: "L'onglet Prospects contient la base de données. Vous pouvez importer, qualifier, ou assigner des leads manuellement.",
          mood: 'curious' as GuideMood
        };
      case 3:
        return {
          title: "Campagnes",
          message: "Supervisez ici les emails envoyés. Validez les brouillons de l'IA avant leur expédition.",
          mood: 'convinced' as GuideMood
        };
      case 4:
        return {
          title: "Journal",
          message: "Consultez le journal système (logs) pour vérifier chaque décision prise par l'intelligence artificielle.",
          mood: 'settled' as GuideMood
        };
      default:
        return null;
    }
  };

  const getTabBtnStyle = (step: number) => {
    if (navTutorialStep === step) {
      return {
        position: 'relative' as any,
        zIndex: 10003,
        background: '#00E5C8',
        color: '#04101E',
        fontWeight: 700,
        boxShadow: '0 0 0 3px #00E5C8, 0 0 25px rgba(0, 229, 200, 0.75)',
        pointerEvents: 'none' as any,
      };
    }
    return {};
  };

  const renderTutorialArrow = (step: number) => {
    if (navTutorialStep === step) {
      return (
        <VMindGuideArrow
          direction="up"
          color="#00E5C8"
          style={{
            position: 'absolute',
            bottom: '-42px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10004
          }}
        />
      );
    }
    return null;
  };

  const fetchData = useCallback(async () => {
    if (!agentId) return;
    setIsLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('vmind_session')}` };

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
  }, [agentId]);

  useEffect(() => {
    fetchData();
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

    // When a DB update happens, debounce the fetch by 500ms to batch multiple updates
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      fetchData();
    }, 500);
  });

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

      {/* ── Tutorial Overlay ── */}
      {navTutorialStep > 0 && (
        <div
          onClick={nextTutorialStep}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(3, 8, 16, 0.82)', zIndex: 10000,
            cursor: 'pointer'
          }}
        />
      )}

      {/* ── VMind Guide for Tutorial ── */}
      {navTutorialStep > 0 && (
        <VMindGuide
          isOpen={navTutorialStep > 0}
          title={getTutorialContent()?.title}
          message={getTutorialContent()?.message || null}
          mood={getTutorialContent()?.mood}
          showBackdrop={false}
          onClose={() => setNavTutorialStep(0)}
        >
          <div className="vmind-guide-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
            <button
              type="button"
              className="vmind-guide-btn-primary"
              onClick={nextTutorialStep}
            >
              <span>{navTutorialStep < 4 ? 'Suivant' : 'Terminer'}</span>
              <CyberIcon name="arrow-right" size={13} color="currentColor" />
            </button>
          </div>
        </VMindGuide>
      )}

      {/* HEADER (Native VMIND Style) */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 32px', borderBottom: '1px solid var(--border)',
        background: 'rgba(8, 20, 38, 0.4)',
        backdropFilter: navTutorialStep > 0 ? 'none' : 'blur(10px)',
        flexShrink: 0,
        position: 'relative',
        zIndex: navTutorialStep > 0 ? 10001 : 1
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
              background: 'transparent', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '8px', color: 'var(--text)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'rgba(0, 229, 200, 0.1)',
              border: '1px solid rgba(0, 229, 200, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00E5C8',
              flexShrink: 0
            }}>
              <Target size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 12 }}>
                Espace de Travail : {agentName}
                {agentData?.is_executing && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 12, padding: '2px 10px', borderRadius: 4,
                    background: 'rgba(0, 229, 200, 0.1)', color: '#00E5C8',
                    border: '1px solid rgba(0, 229, 200, 0.3)',
                    fontWeight: 600, animation: 'pulse 1.5s infinite',
                    verticalAlign: 'middle'
                  }}>
                    <CyberIcon name="zap" size={11} color="#00E5C8" /> En cours d'exécution...
                  </span>
                )}
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '4px 0 0 0' }}>Supervisez l'agent de prospection en temps réel.</p>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', background: 'var(--navy2)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border)', position: 'relative', zIndex: 10002 }}>
          {[
            { id: 'dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard, step: 1 },
            { id: 'leads', label: 'Prospects', icon: Users, step: 2 },
            { id: 'outbox', label: 'Campagnes', icon: Mail, step: 3 },
            { id: 'logs', label: 'Journal', icon: Terminal, step: 4 },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isStepActive = navTutorialStep === tab.step;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '6px 14px', borderRadius: '8px',
                  background: isStepActive ? '#00E5C8' : isActive ? 'var(--cyan)' : 'transparent',
                  color: (isStepActive || isActive) ? '#04101E' : 'var(--text-muted)',
                  fontWeight: (isStepActive || isActive) ? 700 : 500,
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                  ...getTabBtnStyle(tab.step)
                }}
              >
                {renderTutorialArrow(tab.step)}
                <Icon size={16} style={{ flexShrink: 0, color: (isStepActive || isActive) ? '#04101E' : 'inherit' }} />
                <span style={{ color: (isStepActive || isActive) ? '#04101E' : 'inherit' }}>{tab.label}</span>
              </button>
            );
          })}
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
            {activeTab === 'dashboard' && <DashboardView leads={leads} campaigns={campaigns} threshold={60} agent={agentData} />}
            {activeTab === 'leads' && <LeadsView leads={leads} threshold={60} onOpenLead={handleOpenLead} onRefresh={fetchData} isNavTutorialActive={navTutorialStep > 0} agent={agentData} />}
            {activeTab === 'outbox' && <CampaignsView campaigns={campaigns} onRefresh={fetchData} defaultCc="" onOpenLeadById={handleOpenLeadById} />}
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
