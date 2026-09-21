'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, LayoutDashboard, Users, Mail, Activity, ArrowUpRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import DashboardView from '../../../features/management/sourcing-workspace/components/DashboardView';
import LeadsView from '../../../features/management/sourcing-workspace/components/LeadsView';
import LogsView from '../../../features/management/sourcing-workspace/components/LogsView';
import LeadDetailDrawer from '../../../features/management/sourcing-workspace/components/LeadDetailDrawer';
import { getAgents } from '@/shared/api/n8n-api';
import { useProspectSocket } from '../../../features/management/prospect-workspace/hooks/useProspectSocket';
import { CyberIcon } from '@/shared/management/components/CyberIcon';
import { VMindGuide } from '@/shared/management/components/VMindGuide';
import { useToast } from '@/shared/contexts/ToastContext';

import '../../../features/management/sourcing-workspace/sourcing-workspace.scss';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function SourcingAgentWorkspacePage() {
  const { agentId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const linkedToast = sessionStorage.getItem('vmind_post_deploy_linked_toast');
      if (linkedToast) {
        showToast(linkedToast, 'success');
        sessionStorage.removeItem('vmind_post_deploy_linked_toast');
      }
    }
  }, [showToast]);

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

  const [showConnectChoiceModal, setShowConnectChoiceModal] = useState(false);

  const availableProspectAgents = React.useMemo(() => {
    return (allAgents || []).filter(
      (a: any) =>
        a.run_mode === 'prospection' ||
        a.run_mode === 'prospect' ||
        (!a.run_mode && a.run_mode !== 'sourcing' && a.run_mode !== 'recouvrement')
    );
  }, [allAgents]);

  const handleDeployNewProspect = () => {
    if (typeof window !== 'undefined') {
      const sourcingUuid = String(agentData?.uuid || agentId);
      const sourcingName = String(agentData?.agent_name || agentName);
      sessionStorage.setItem('vmind_guide_origin_sourcing_uuid', sourcingUuid);
      sessionStorage.setItem('vmind_guide_origin_sourcing_name', sourcingName);
      sessionStorage.setItem('vmind_guide_target_marketplace', 'prospection');
      sessionStorage.setItem('vmind_current_view', 'market');
      sessionStorage.setItem('vmind_mode', 'MANAGEMENT');
    }
    router.push('/?view=market');
  };

  const handleConnectExisting = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('vmind_editing_agent', JSON.stringify(agentData));
      sessionStorage.setItem('vmind_wizard_step', '2');
      sessionStorage.setItem('vmind_current_view', 'wizard');
      sessionStorage.setItem('vmind_mode', 'MANAGEMENT');
    }
    router.push('/?view=wizard');
  };

  const handleConnectProspectClick = () => {
    if (availableProspectAgents.length === 0) {
      // If user has no deployed prospect agent, automatically route to marketplace without asking!
      handleDeployNewProspect();
    } else {
      setShowConnectChoiceModal(true);
    }
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
      return match ? (match.agent_name || match.nom) : null;
    }).filter(Boolean) as string[];
  }, [agentData, allAgents]);

  return (
    <div className="sourcing-workspace-container">

      {/* HEADER (Native VMIND Style) */}
      <div className="sourcing-top-bar">
        <div className="sourcing-top-bar-left">
          <button
            className="sourcing-back-btn"
            onClick={() => {
              if (typeof window !== 'undefined') {
                sessionStorage.setItem('vmind_current_view', 'agents');
                sessionStorage.setItem('vmind_mode', 'MANAGEMENT');
                localStorage.setItem('vmind_mode', 'MANAGEMENT');
              }
              router.push('/?view=agents');
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div className="sourcing-top-bar-avatar">
            <Users size={22} />
          </div>
          <div className="sourcing-top-bar-agent-info">
            <div className="sourcing-top-bar-title">
              <span>Espace de Travail : {agentName}</span>
              {agentData?.is_executing && (
                <span className="sourcing-live-pill">
                  <CyberIcon name="zap" size={11} color="#00E5C8" /> En cours d'exécution...
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
        <div className="sourcing-top-bar-tabs">
          {[
            { id: 'dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard },
            { id: 'leads', label: 'Candidats / Leads', icon: Users },
            { id: 'logs', label: 'Journal', icon: Activity },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`sourcing-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
              {tab.id === 'leads' && leads.length > 0 && (
                <span className="tab-count-badge">{leads.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="sourcing-main-content">
        {isLoading && leads.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--cyan)' }}>
            Chargement de l'espace...
          </div>
        ) : (
          <div className="sourcing-content-container">
            {targetAgentNames.length === 0 && (
              <div className="sourcing-connect-banner">
                <div className="banner-left">
                  <div className="banner-icon">
                    <CyberIcon name="zap" size={14} color="#38BDF8" />
                  </div>
                  <span className="banner-text">
                    Connectez un Agent de Prospection pour automatiser l&apos;envoi de vos campagnes d&apos;emails.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleConnectProspectClick}
                  className="banner-btn"
                >
                  <span>Connecter un Agent de Prospection</span>
                  <ArrowUpRight size={14} />
                </button>
              </div>
            )}
            {activeTab === 'dashboard' && (
              <DashboardView
                leads={leads}
                logs={logs}
                agent={agentData}
                allAgents={allAgents}
                threshold={0}
                onConnectProspect={handleConnectProspectClick}
              />
            )}
            {activeTab === 'leads' && <LeadsView leads={leads} onOpenLead={handleOpenLead} onRefresh={fetchData} />}
            {activeTab === 'logs' && <LogsView logs={logs} onRefresh={fetchData} />}
          </div>
        )}
      </div>

      {/* CHOICE MODAL: CONNECT EXISTING OR DEPLOY NEW PROSPECT AGENT */}
      <AnimatePresence>
        {showConnectChoiceModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px'
            }}
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConnectChoiceModal(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(3, 8, 16, 0.82)',
                backdropFilter: 'blur(12px)',
                cursor: 'pointer'
              }}
            />

            {/* Modal Dialog Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{
                position: 'relative',
                zIndex: 10001,
                width: '100%',
                maxWidth: '680px',
                background: 'linear-gradient(145deg, rgba(8, 20, 38, 0.98) 0%, rgba(13, 27, 48, 0.96) 100%)',
                border: '1px solid rgba(0, 229, 200, 0.3)',
                borderRadius: '24px',
                padding: '32px',
                boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6), 0 0 32px rgba(0, 229, 200, 0.15)',
                color: '#F0F4F8',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(0, 229, 200, 0.15) 0%, rgba(56, 189, 248, 0.15) 100%)',
                    border: '1px solid rgba(0, 229, 200, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#00E5C8',
                    boxShadow: '0 0 16px rgba(0, 229, 200, 0.2)'
                  }}>
                    <CyberIcon name="target" size={24} color="#00E5C8" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#F0F4F8', letterSpacing: '-0.3px' }}>
                      Associer un Agent de Prospection
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                      Choisissez comment connecter votre flux de leads avec un Closer automatisé.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowConnectChoiceModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    width: 34,
                    height: 34,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.color = '#F0F4F8';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.color = 'var(--muted)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Options Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                {/* Option 1: Associer un Agent Existant */}
                <div
                  onClick={handleConnectExisting}
                  style={{
                    background: 'rgba(6, 17, 31, 0.65)',
                    border: '1px solid rgba(0, 229, 200, 0.25)',
                    borderRadius: '16px',
                    padding: '22px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '16px',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#00E5C8';
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 12px 28px rgba(0, 229, 200, 0.15)';
                    e.currentTarget.style.background = 'rgba(0, 229, 200, 0.04)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0, 229, 200, 0.25)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.background = 'rgba(6, 17, 31, 0.65)';
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{
                        width: 38,
                        height: 38,
                        borderRadius: '10px',
                        background: 'rgba(0, 229, 200, 0.12)',
                        border: '1px solid rgba(0, 229, 200, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#00E5C8'
                      }}>
                        <CyberIcon name="target" size={20} color="#00E5C8" />
                      </div>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '8px',
                        background: 'rgba(0, 229, 200, 0.12)',
                        color: '#00E5C8',
                        border: '1px solid rgba(0, 229, 200, 0.25)'
                      }}>
                        {availableProspectAgents.length} {availableProspectAgents.length > 1 ? 'disponibles' : 'disponible'}
                      </span>
                    </div>

                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#F0F4F8' }}>
                      Associer un Agent Existant
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.45 }}>
                      Sélectionnez l&apos;un de vos agents de prospection déjà configurés pour recevoir immédiatement vos contacts sourcés.
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#00E5C8',
                    marginTop: '4px'
                  }}>
                    <span>Configurer l&apos;attribution</span>
                    <ArrowUpRight size={14} />
                  </div>
                </div>

                {/* Option 2: Déployer un Nouvel Agent */}
                <div
                  onClick={handleDeployNewProspect}
                  style={{
                    background: 'rgba(6, 17, 31, 0.65)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    borderRadius: '16px',
                    padding: '22px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '16px',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#38BDF8';
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 12px 28px rgba(56, 189, 248, 0.15)';
                    e.currentTarget.style.background = 'rgba(56, 189, 248, 0.04)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.25)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.background = 'rgba(6, 17, 31, 0.65)';
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{
                        width: 38,
                        height: 38,
                        borderRadius: '10px',
                        background: 'rgba(56, 189, 248, 0.12)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#38BDF8'
                      }}>
                        <CyberIcon name="rocket" size={20} color="#38BDF8" />
                      </div>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '8px',
                        background: 'rgba(56, 189, 248, 0.12)',
                        color: '#38BDF8',
                        border: '1px solid rgba(56, 189, 248, 0.25)'
                      }}>
                        Marketplace
                      </span>
                    </div>

                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#F0F4F8' }}>
                      Déployer un Nouvel Agent
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.45 }}>
                      Accédez au Marketplace pour créer un nouvel agent Closer avec un ICP et des séquences d&apos;emails sur mesure.
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#38BDF8',
                    marginTop: '4px'
                  }}>
                    <span>Découvrir dans le Marketplace</span>
                    <ArrowUpRight size={14} />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Accompanying VMindGuide */}
            <VMindGuide
              isOpen={showConnectChoiceModal}
              onClose={() => setShowConnectChoiceModal(false)}
              mood="convinced"
              title="Optimisation du Pipeline"
              message="Vous possédez déjà des agents de prospection actifs. Souhaitez-vous associer un agent existant ou en créer un nouveau dans le Marketplace ?"
              showBackdrop={false}
            />
          </div>
        )}
      </AnimatePresence>

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
