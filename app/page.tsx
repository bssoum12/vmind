"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMode } from '@/shared/contexts/ModeContext';

import { ShieldAlert, LogOut, ArrowLeft } from 'lucide-react';

// Assistant Mode Components
import { Sidebar as AssistantSidebar } from "@/features/sidebar/Sidebar";
import { RightPanel } from "@/features/right_panel/RightPanel";
import { VoiceOverlay } from "@/features/voice/VoiceOverlay";
import { VmindChat } from "@/components/vmind/VmindChat";
import { GlobalMaxRemindersPopup } from "@/components/vmind/GlobalMaxRemindersPopup";
import { ConversationsProvider } from "@/shared/contexts/ConversationsContext";
import { useKpis } from '@/shared/contexts/KpiCacheContext';

import dynamic from 'next/dynamic';

// Management Mode Components (Dynamically loaded on demand for max performance)
const ManagementSidebar = dynamic(() => import('@/features/management/layout/ManagementSidebar').then(m => m.ManagementSidebar), { ssr: false });
const MarketplaceView = dynamic(() => import('@/features/management/marketplace/MarketplaceView').then(m => m.MarketplaceView), { ssr: false });
const AgentsView = dynamic(() => import('@/features/management/agents/AgentsView').then(m => m.AgentsView), { ssr: false });
const WizardRouter = dynamic(() => import('@/features/management/wizard/WizardRouter').then(m => m.WizardRouter), { ssr: false });
const JournalView = dynamic(() => import('@/features/management/journal/JournalView').then(m => m.JournalView), { ssr: false });
const ReportsView = dynamic(() => import('@/features/management/reports/ReportsView').then(m => m.ReportsView), { ssr: false });
const IntegrationsView = dynamic(() => import('@/features/management/integrations/IntegrationsView').then(m => m.IntegrationsView), { ssr: false });
const ProfileView = dynamic(() => import('@/features/management/profile/ProfileView').then(m => m.ProfileView), { ssr: false });
const PromptsConfigView = dynamic(() => import('@/features/management/prompts/PromptsConfigView').then(m => m.PromptsConfigView), { ssr: false });

const ConnectorsHub = dynamic(() => import('@/features/connectors/ConnectorsHub').then(m => m.ConnectorsHub), { ssr: false });
/* ─────────────────────────────────────────────────────
   Accès Non Autorisé View (Premium VMIND Design)
───────────────────────────────────────────────────── */
function UnauthorizedView({ onBackToLogin, onBackToDashboard }: { onBackToLogin: () => void; onBackToDashboard?: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'radial-gradient(ellipse 120% 80% at 50% 50%, #071424 0%, #050B16 55%, #03080f 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', -apple-system, sans-serif",
      color: '#FFFFFF', zIndex: 9999,
      padding: '20px'
    }}>
      {/* Premium Background */}
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}
      >
        <defs>
          <radialGradient id="unauth-blob" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255, 71, 87, 0.06)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <rect width="1440" height="900" fill="url(#unauth-blob)" />
        <g stroke="rgba(0,229,200,0.03)" strokeWidth="0.8" fill="none">
          <path d="M 0,450 H 1440" />
          <path d="M 720,0 V 900" />
          <path d="M 0,225 H 1440" />
          <path d="M 0,675 H 1440" />
        </g>
      </svg>

      <div className="anim-card" style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: '480px',
        background: 'linear-gradient(160deg, rgba(8,20,38,0.98) 0%, rgba(4,12,24,0.99) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(0,229,200,0.48)',
        borderRadius: '22px',
        padding: '40px 42px 34px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 229, 200, 0.1)',
        textAlign: 'center'
      }}>
        {/* Corners */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '40px', height: '40px', borderTop: '2px solid #00E5C8', borderLeft: '2px solid #00E5C8', borderRadius: '22px 0 0 0', opacity: 0.6 }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: '40px', height: '40px', borderTop: '2px solid #00E5C8', borderRight: '2px solid #00E5C8', borderRadius: '0 22px 0 0', opacity: 0.6 }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '40px', height: '40px', borderBottom: '2px solid #00E5C8', borderLeft: '2px solid #00E5C8', borderRadius: '0 0 0 22px', opacity: 0.3 }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: '40px', height: '40px', borderBottom: '2px solid #00E5C8', borderRight: '2px solid #00E5C8', borderRadius: '0 0 22px 0', opacity: 0.3 }} />

        {/* Shield Icon */}
        <div style={{
          width: '80px', height: '80px',
          borderRadius: '50%',
          background: 'rgba(255, 71, 87, 0.1)',
          border: '1px solid rgba(255, 71, 87, 0.3)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 0 20px rgba(255, 71, 87, 0.2)'
        }}>
          <ShieldAlert size={40} color="#ff4757" />
        </div>

        <h1 style={{
          fontSize: '22px', fontWeight: 800,
          color: '#ffffff', letterSpacing: '0.05em',
          marginBottom: '12px', textTransform: 'uppercase'
        }}>
          Accès Non Autorisé
        </h1>

        <p style={{
          fontSize: '14px', color: '#8FA3B8',
          lineHeight: 1.6, marginBottom: '32px'
        }}>
          Vous ne disposez pas des privilèges nécessaires pour accéder à cette section. Veuillez contacter votre administrateur TraLIS si vous estimez qu'il s'agit d'une erreur.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              style={{
                width: '100%', height: '50px', borderRadius: '10px',
                background: 'rgba(0, 229, 200, 0.08)',
                color: '#00E5C8',
                border: '1px solid rgba(0, 229, 200, 0.3)',
                cursor: 'pointer',
                fontSize: '13px', fontWeight: 700,
                letterSpacing: '0.05em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'all 0.2s',
                fontFamily: 'inherit'
              }}
            >
              <ArrowLeft size={16} />
              RETOUR AU DASHBOARD
            </button>
          )}

          <button
            onClick={onBackToLogin}
            style={{
              width: '100%', height: '50px', borderRadius: '10px',
              background: 'linear-gradient(90deg, #00E5C8 0%, #21F3D6 100%)',
              color: '#021010',
              border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: 800,
              letterSpacing: '0.05em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: '0 0 20px rgba(0, 229, 200, 0.3)',
              fontFamily: 'inherit'
            }}
          >
            RETOUR À LA CONNEXION
          </button>
        </div>
      </div>
    </div>
  );
}

function HomeContent() {
  const router = useRouter();
  const { mode, setMode } = useMode();
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(true);
  const [clientId, setClientId] = useState<string>("DEMO");

  useEffect(() => {
    const handleMcpUpdated = (e: any) => {
      const detail = e?.detail;
      const targetClientId = detail?.client_id || detail?.user?.client_id;
      if (targetClientId) {
        setClientId(targetClientId);
      }
    };
    window.addEventListener('mcp-session-updated', handleMcpUpdated);
    return () => window.removeEventListener('mcp-session-updated', handleMcpUpdated);
  }, []);

  useEffect(() => {
    setIsMounted(true);

    const checkAuth = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';
        const res = await fetch(`${baseUrl}/api/auth/vmind/me`, {
          credentials: 'include'
        });

        // Nettoyage proactif de tout stockage résiduel dans localStorage
        localStorage.removeItem('vmind_session');
        localStorage.removeItem('vmind_client_id');
        localStorage.removeItem('vmind_allowed_agents');
        localStorage.removeItem('vmind_connector_status');
        localStorage.removeItem('vmind_mcp_token');
        localStorage.removeItem('vmind_mode');

        if (!res.ok) {
          setIsAuthenticated(false);
          window.location.href = '/login';
          return;
        }

        const data = await res.json();
        if (!data.ok || !data.user) {
          setIsAuthenticated(false);
          window.location.href = '/login';
          return;
        }

        setIsAuthenticated(true);
        if (data.user.client_id) {
          setClientId(data.user.client_id);
        }

        // Notification globale de session pour hydrater l'ensemble des composants React
        window.dispatchEvent(new CustomEvent('mcp-session-updated', { detail: { connected: true, user: data.user } }));

        // Contrôle d'autorisation pour le mode MANAGEMENT (Administrateurs uniquement)
        if (mode === 'MANAGEMENT') {
          const roles = Array.isArray(data.user.roles)
            ? data.user.roles
            : typeof data.user.roles === 'string'
              ? [data.user.roles]
              : [];
          if (!roles.includes('Administrators') && !roles.includes('Utilisateur') && !roles.includes('Administrator') && !roles.includes('Superusers')) {
            setIsAuthorized(false);
            return;
          }
        }
        setIsAuthorized(true);
      } catch (err) {
        console.error("Auth check failed", err);
        setIsAuthenticated(false);
        window.location.href = '/login';
      }
    };

    checkAuth();
  }, [mode]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('vmind_session_id');
    }
  }, []);

  // Assistant Mode State
  const [voiceShow, setVoiceShow] = useState(false);
  const [insertPrompt, setInsertPrompt] = useState<string | undefined>(undefined);
  const { activeAgentId, setActiveAgentId } = useKpis();
  const logs: any[] = [];

  const handleInsertPrompt = (text: string) => {
    setInsertPrompt(text);
    setTimeout(() => setInsertPrompt(undefined), 100);
  };

  const [assistantView, setAssistantView] = useState<'chat' | 'connectors'>('chat');

  useEffect(() => {
    const handleSwitchView = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail === 'connectors' || customEvent.detail === 'chat') {
        setAssistantView(customEvent.detail as 'chat' | 'connectors');
      }
    };
    window.addEventListener('switch-assistant-view', handleSwitchView);
    return () => window.removeEventListener('switch-assistant-view', handleSwitchView);
  }, []);

  // Management Mode State

  const searchParams = useSearchParams();

  const [currentView, setCurrentView] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('vmind_current_view') || 'market';
    }
    return 'market';
  });

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('vmind_wizard_template') || null;
    }
    return null;
  });

  const currentViewRef = useRef(currentView);
  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);

  // Synchronize browser history (Chrome native back / forward buttons)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Ensure the root history state is initialized with the current view
    if (!window.history.state || !window.history.state.view) {
      const initialView = currentViewRef.current || 'market';
      const initialUrl = initialView === 'market' ? '/' : `/?view=${initialView}`;
      window.history.replaceState({ view: initialView }, '', window.location.href || initialUrl);
    }

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      const urlParams = new URLSearchParams(window.location.search);
      const viewParam = urlParams.get('view');
      const templateParam = urlParams.get('template');

      // Resolve the target view from state, or fallback to URL query param / 'market'
      let targetView = state?.view || (viewParam ? (viewParam === 'marketplace' ? 'market' : viewParam) : 'market');

      // If user was inside the wizard and clicked Chrome Back to return
      if (currentViewRef.current === 'wizard' && targetView !== 'wizard') {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('vmind_editing_agent');
          sessionStorage.removeItem('vmind_guide_link_prospect_uuid');
          sessionStorage.removeItem('vmind_wizard_template');
          sessionStorage.removeItem('vmind_wizard_step');
          sessionStorage.removeItem('vmind_wizard_prev_view');
          sessionStorage.removeItem('vmind_sourcing_target_agent');
          sessionStorage.removeItem('vmind_wizard_return_url');
        }
        setSelectedTemplate(null);
        setEditingAgent(null);
        setInitialWizardStep(undefined);
      } else if (targetView === 'wizard') {
        // If user clicked Chrome Forward into wizard or restored it
        const targetTemplate = state?.template || templateParam || (typeof window !== 'undefined' ? sessionStorage.getItem('vmind_wizard_template') : null);
        if (targetTemplate) {
          setSelectedTemplate(targetTemplate);
        }
        if (state?.editingAgent) {
          setEditingAgent(state.editingAgent);
        }
        if (state?.initialStep) {
          setInitialWizardStep(state.initialStep);
        }
      }

      setCurrentView(targetView);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('vmind_current_view', targetView);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!searchParams) return;
    const viewParam = searchParams.get('view');
    const modeParam = searchParams.get('mode');
    const templateParam = searchParams.get('template');

    if (modeParam === 'management' || modeParam === 'MANAGEMENT' || viewParam || templateParam) {
      setMode('MANAGEMENT');
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('vmind_mode', 'MANAGEMENT');
        localStorage.setItem('vmind_mode', 'MANAGEMENT');
      }
    } else if (modeParam === 'assistant' || modeParam === 'ASSISTANT') {
      setMode('ASSISTANT');
    }

    if (viewParam) {
      const normalizedView = viewParam === 'marketplace' ? 'market' : viewParam;
      setCurrentView(normalizedView);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('vmind_current_view', normalizedView);
      }
    }

    if (templateParam) {
      setSelectedTemplate(templateParam);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('vmind_wizard_template', templateParam);
      }
    }
  }, [searchParams, setMode]);

  useEffect(() => {
    const handleSwitchManagementView = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setMode('MANAGEMENT');
        const view = customEvent.detail;
        setCurrentView(view);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('vmind_current_view', view);
          const newUrl = view === 'market' ? '/' : `/?view=${view}`;
          window.history.replaceState({ view }, '', newUrl);
        }
      }
    };
    window.addEventListener('switch-management-view', handleSwitchManagementView);
    return () => window.removeEventListener('switch-management-view', handleSwitchManagementView);
  }, [setMode]);

  const [activeCategory, setActiveCategory] = useState('all');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setMobileSidebarOpen(prev => !prev);
    const handleClose = () => setMobileSidebarOpen(false);
    window.addEventListener('toggle-mobile-sidebar', handleToggle);
    window.addEventListener('close-mobile-sidebar', handleClose);
    return () => {
      window.removeEventListener('toggle-mobile-sidebar', handleToggle);
      window.removeEventListener('close-mobile-sidebar', handleClose);
    };
  }, []);

  const handleNavigate = (view: string) => {
    if (view === currentViewRef.current) return;
    setCurrentView(view);
    setMobileSidebarOpen(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('vmind_current_view', view);
      const newUrl = view === 'market' ? '/' : `/?view=${view}`;
      window.history.pushState({ view }, '', newUrl);
    }
  };

  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [initialWizardStep, setInitialWizardStep] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAgentStr = sessionStorage.getItem('vmind_editing_agent');
      if (savedAgentStr) {
        try {
          const agentObj = JSON.parse(savedAgentStr);
          const savedStepStr = sessionStorage.getItem('vmind_wizard_step');
          const savedStep = savedStepStr ? parseInt(savedStepStr, 10) : undefined;
          setEditingAgent(agentObj);
          const template = agentObj.run_mode || 'prospection';
          setSelectedTemplate(template);
          if (savedStep) {
            setInitialWizardStep(savedStep);
          }
          setCurrentView('wizard');
          sessionStorage.removeItem('vmind_editing_agent');
          sessionStorage.removeItem('vmind_wizard_step');

          // Initialize history state for editing agent arrival so Chrome back navigates gracefully
          const newUrl = `/?view=wizard&template=${encodeURIComponent(template)}`;
          window.history.replaceState(
            { view: 'wizard', template, previousView: 'agents', editingAgent: agentObj, initialStep: savedStep },
            '',
            newUrl
          );
        } catch (e) {
          console.error("Failed to parse saved editing agent:", e);
        }
      }
    }
  }, []);

  const handleDeploy = (templateId: string, agent?: any, initialStep: number = 1) => {
    const prevView = currentViewRef.current !== 'wizard' ? currentViewRef.current : 'market';
    setSelectedTemplate(templateId);
    setEditingAgent(agent || null);
    setInitialWizardStep(initialStep);
    setCurrentView('wizard');
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('vmind_current_view', 'wizard');
      sessionStorage.setItem('vmind_wizard_template', templateId);
      sessionStorage.setItem('vmind_wizard_prev_view', prevView);
      const newUrl = `/?view=wizard&template=${encodeURIComponent(templateId)}`;
      window.history.pushState(
        {
          view: 'wizard',
          template: templateId,
          previousView: prevView,
          editingAgent: agent || null,
          initialStep
        },
        '',
        newUrl
      );
    }
  };

  const handleCancelWizard = () => {
    const hasPostDeploy = typeof window !== 'undefined' && sessionStorage.getItem('vmind_post_deploy_tutorial_agent');
    const returnUrl = typeof window !== 'undefined' ? sessionStorage.getItem('vmind_wizard_return_url') : null;
    const savedPrevView = typeof window !== 'undefined' ? sessionStorage.getItem('vmind_wizard_prev_view') : null;

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('vmind_editing_agent');
      sessionStorage.removeItem('vmind_guide_link_prospect_uuid');
      sessionStorage.removeItem('vmind_wizard_template');
      sessionStorage.removeItem('vmind_wizard_step');
      sessionStorage.removeItem('vmind_wizard_prev_view');
      sessionStorage.removeItem('vmind_sourcing_target_agent');
      sessionStorage.removeItem('vmind_wizard_return_url');
    }

    if (returnUrl) {
      router.push(returnUrl);
      return;
    }

    const targetView = hasPostDeploy ? 'agents' : (savedPrevView || 'market');
    setCurrentView(targetView);
    setSelectedTemplate(null);
    setEditingAgent(null);
    setInitialWizardStep(undefined);

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('vmind_current_view', targetView);
      const targetUrl = targetView === 'market' ? '/' : `/?view=${targetView}`;
      window.history.replaceState({ view: targetView }, '', targetUrl);
    }
  };

  const handleSelectCategory = (category: string) => {
    setActiveCategory(category);
  };

  // Loading view while authentication is verified
  if (!isMounted || isAuthenticated === null || isAuthenticated === false) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        backgroundColor: '#050B16',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 99999
      }}>
        <div className="spinner" style={{
          width: '40px', height: '40px',
          border: '2px solid rgba(0, 229, 200, 0.1)',
          borderTopColor: '#00E5C8',
          borderRadius: '50%',
          animation: 'spinRing 1s linear infinite'
        }} />
        <style jsx global>{`
          @keyframes spinRing {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Access Blocker if not authorized for current mode (Management)
  if (!isAuthorized) {
    return (
      <UnauthorizedView
        onBackToLogin={() => {
          localStorage.removeItem('vmind_session');
          window.location.href = '/login';
        }}
        onBackToDashboard={() => {
          setMode('ASSISTANT');
          setIsAuthorized(true);
        }}
      />
    );
  }

  if (mode === 'ASSISTANT') {
    return (
      <ConversationsProvider>
        <main className={`main-container anim ${mobileSidebarOpen ? 'mobile-sidebar-open' : ''}`}>
          {mobileSidebarOpen && (
            <div 
              className="mobile-sidebar-backdrop show" 
              onClick={() => setMobileSidebarOpen(false)} 
            />
          )}
          <AssistantSidebar 
            onInsertPrompt={handleInsertPrompt} 
            activeAgentId={activeAgentId} 
            onAgentClick={(id) => {
              setActiveAgentId(id);
              setMobileSidebarOpen(false);
            }} 
          />
          
          <div className="content assistant-layout" style={{ display: assistantView === 'chat' ? 'flex' : 'none' }}>
            <VmindChat
              initialPrompt={insertPrompt}
              onOpenVoice={() => setVoiceShow(true)}
              onAgentActive={(id) => {
                setActiveAgentId(id);
                setMobileSidebarOpen(false);
              }}
              activeAgentId={activeAgentId}
              clientId={clientId}
            />
            <RightPanel
              logs={logs}
              onInsertPrompt={handleInsertPrompt}
              activeAgentId={activeAgentId}
            />
          </div>
          
          <div style={{ display: assistantView === 'connectors' ? 'block' : 'none', flex: 1, height: '100%', minWidth: 0 }}>
            <ConnectorsHub />
          </div>

          <VoiceOverlay show={voiceShow} onClose={() => setVoiceShow(false)} />
          <GlobalMaxRemindersPopup />
        </main>
      </ConversationsProvider>
    );
  }

  // MANAGEMENT MODE
  return (
    <main className={`main-container anim ${mobileSidebarOpen ? 'mobile-sidebar-open' : ''}`}>
      {mobileSidebarOpen && (
        <div 
          className="mobile-sidebar-backdrop show" 
          onClick={() => setMobileSidebarOpen(false)} 
        />
      )}
      <ManagementSidebar
        currentView={currentView}
        onNavigate={(view) => {
          handleNavigate(view);
          setMobileSidebarOpen(false);
        }}
        activeCategory={activeCategory}
        onSelectCategory={(cat) => {
          handleSelectCategory(cat);
          setMobileSidebarOpen(false);
        }}
      />
      <div className="content management-layout">
        <div className="view-container">
          {(currentView === 'market' || currentView === 'marketplace') && (
            <MarketplaceView
              onDeploy={handleDeploy}
              activeCategory={activeCategory}
              onSelectCategory={(cat) => {
                handleSelectCategory(cat);
                setMobileSidebarOpen(false);
              }}
            />
          )}

          {currentView === 'agents' && (
            <AgentsView
              onNavigate={(view) => {
                setCurrentView(view);
                setMobileSidebarOpen(false);
              }}
              onConfigure={(templateId, agent, step) => handleDeploy(templateId, agent, step)}
            />
          )}

          {currentView === 'journal' && (
            <JournalView />
          )}

          {currentView === 'prompts' && (
            <PromptsConfigView />
          )}
          {currentView === 'reports' && (
            <ReportsView />
          )}

          {currentView === 'integrations' && (
            <IntegrationsView />
          )}

          {currentView === 'profile' && (
            <ProfileView />
          )}

          {currentView === 'wizard' && selectedTemplate && (
            <WizardRouter
              templateId={selectedTemplate}
              agentToEdit={editingAgent}
              initialStep={initialWizardStep}
              onCancel={handleCancelWizard}
            />
          )}
        </div>
      </div>
      <GlobalMaxRemindersPopup />
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div style={{
        position: 'fixed', inset: 0,
        backgroundColor: '#050B16',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 99999
      }}>
        <div className="spinner" style={{
          width: '40px', height: '40px',
          border: '2px solid rgba(0, 229, 200, 0.1)',
          borderTopColor: '#00E5C8',
          borderRadius: '50%',
          animation: 'spinRing 1s linear infinite'
        }} />
        <style jsx global>{`
          @keyframes spinRing {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
