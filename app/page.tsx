"use client";

import React, { useState } from 'react';
import { Sidebar } from "@/features/sidebar/Sidebar";
import { ChatPanel } from "@/features/chat/ChatPanel";
import { RightPanel } from "@/features/right_panel/RightPanel";
import { VoiceOverlay } from "@/features/voice/VoiceOverlay";
import { VmindChat } from "@/components/vmind/VmindChat";

export default function Home() {
  const [voiceShow, setVoiceShow] = useState(false);
  const [insertPrompt, setInsertPrompt] = useState<string | undefined>(undefined);

  // Valeurs par défaut factices pour les autres composants en attendant leur suppression complète ou refactorisation
  const activeAgentId = "VMIND";
  const logs: any[] = [];

  const handleInsertPrompt = (text: string) => {
    setInsertPrompt(text);
    setTimeout(() => setInsertPrompt(undefined), 100);
  };

  return (
    <main className="main-container">
      <Sidebar onInsertPrompt={handleInsertPrompt} activeAgentId={activeAgentId} />

      <div className="content">
        <VmindChat
          initialPrompt={insertPrompt}
          onOpenVoice={() => setVoiceShow(true)}
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
