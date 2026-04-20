"use client";

import React, { useState } from 'react';
import { Sidebar } from "@/features/sidebar/Sidebar";
import { ChatPanel } from "@/features/chat/ChatPanel";
import { RightPanel } from "@/features/right_panel/RightPanel";
import { VoiceOverlay } from "@/features/voice/VoiceOverlay";
import { useChat } from "@/shared/hooks/useChat";

export default function Home() {
  const [voiceShow, setVoiceShow] = useState(false);
  const [insertPrompt, setInsertPrompt] = useState<string | undefined>(undefined);
  const { logs, addMessage } = useChat();

  const handleInsertPrompt = (text: string) => {
    // We pass this to ChatPanel which handles the actual input update
    setInsertPrompt(text);
    // Reset after a short delay so it can be re-triggered with the same prompt if needed
    setTimeout(() => setInsertPrompt(undefined), 100);
  };

  return (
    <main className="main-container">
      <Sidebar onInsertPrompt={handleInsertPrompt} />
      
      <div className="content">
        <ChatPanel 
          initialPrompt={insertPrompt} 
          onOpenVoice={() => setVoiceShow(true)} 
        />
        <RightPanel 
          logs={logs} 
          onInsertPrompt={handleInsertPrompt} 
        />
      </div>

      <VoiceOverlay show={voiceShow} onClose={() => setVoiceShow(false)} />
    </main>
  );
}
