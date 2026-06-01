"use client";

import React, { useState, useEffect } from 'react';
import { useMode } from '@/shared/contexts/ModeContext';

// Assistant Mode Components
import { Sidebar as AssistantSidebar } from "@/features/sidebar/Sidebar";
import { RightPanel } from "@/features/right_panel/RightPanel";
import { VoiceOverlay } from "@/features/voice/VoiceOverlay";
import { VmindChat } from "@/components/vmind/VmindChat";

// Management Mode Components
import { ManagementSidebar } from "@/features/management/layout/ManagementSidebar";
import { MarketplaceView } from '@/features/management/marketplace/MarketplaceView';
import { AgentsView } from '@/features/management/agents/AgentsView';
import { WizardView } from '@/features/management/wizard/WizardView';
import { JournalView } from '@/features/management/journal/JournalView';
import { ReportsView } from '@/features/management/reports/ReportsView';
import { IntegrationsView } from '@/features/management/integrations/IntegrationsView';
import { ProfileView } from '@/features/management/profile/ProfileView';

export default function Home() {
  const { mode } = useMode();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('vmind_session_id');
    }
  }, []);
  
  // Assistant Mode State
  const [voiceShow, setVoiceShow] = useState(false);
  const [insertPrompt, setInsertPrompt] = useState<string | undefined>(undefined);
  const [activeAgentId, setActiveAgentId] = useState<string>("VMIND");
  const logs: any[] = [];

  const handleInsertPrompt = (text: string) => {
    setInsertPrompt(text);
    setTimeout(() => setInsertPrompt(undefined), 100);
  };

  // Management Mode State
  const [currentView, setCurrentView] = useState('market'); 
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');

  const handleNavigate = (view: string) => {
    setCurrentView(view);
  };

  const handleDeploy = (templateId: string) => {
    setSelectedTemplate(templateId);
    setCurrentView('wizard');
  };

  const handleCancelWizard = () => {
    setCurrentView('market');
    setSelectedTemplate(null);
  };

  const handleSelectCategory = (category: string) => {
    setActiveCategory(category);
  };

  if (mode === 'ASSISTANT') {
    return (
      <main className="main-container anim">
        <AssistantSidebar onInsertPrompt={handleInsertPrompt} activeAgentId={activeAgentId} />
        <div className="content assistant-layout">
          <VmindChat
            initialPrompt={insertPrompt}
            onOpenVoice={() => setVoiceShow(true)}
            onAgentActive={setActiveAgentId}
          />
          <RightPanel
            logs={logs}
            onInsertPrompt={handleInsertPrompt}
            activeAgentId={activeAgentId}
          />
        </div>
        <VoiceOverlay show={voiceShow} onClose={() => setVoiceShow(false)} />
      </main>
    );
  }

  // MANAGEMENT MODE
  return (
    <main className="main-container anim">
      <ManagementSidebar 
        currentView={currentView} 
        onNavigate={handleNavigate}
        activeCategory={activeCategory}
        onSelectCategory={handleSelectCategory}
      />
      <div className="content management-layout">
        <div className="view-container">
          {currentView === 'market' && (
            <MarketplaceView 
              onDeploy={handleDeploy} 
              activeCategory={activeCategory}
              onSelectCategory={handleSelectCategory}
            />
          )}
          
          {currentView === 'agents' && (
            <AgentsView 
              onNavigate={setCurrentView} 
              onConfigure={handleDeploy} 
            />
          )}

          {currentView === 'journal' && (
            <JournalView />
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
            <WizardView 
              templateId={selectedTemplate} 
              onCancel={handleCancelWizard} 
            />
          )}
        </div>
      </div>
    </main>
  );
}
