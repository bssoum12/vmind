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

  const { messages, logs, addMessage, activeAgentId } = useChat();

  const handleInsertPrompt = (text: string) => {
    setInsertPrompt(text);
    setTimeout(() => setInsertPrompt(undefined), 100);
  };

  return (
    <main className="main-container">
      <Sidebar onInsertPrompt={handleInsertPrompt} activeAgentId={activeAgentId} />

      <div className="content">
        <ChatPanel
          initialPrompt={insertPrompt}
          onOpenVoice={() => setVoiceShow(true)}
          messages={messages}
          addMessage={addMessage}
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
