"use client";

import React, { useEffect, useState } from 'react';
import type { Message } from '@/shared/types';

interface ChatPanelProps {
  initialPrompt?: string;
  onOpenVoice: () => void;
  messages: Message[];
  addMessage: (text: string) => Promise<void>;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  initialPrompt,
  onOpenVoice,
  messages,
  addMessage,
}) => {
  const [input, setInput] = useState('');

  useEffect(() => {
    if (initialPrompt) {
      setInput(initialPrompt);
    }
  }, [initialPrompt]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;

    setInput('');
    await addMessage(text);
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      await handleSend();
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div>
          <div className="chat-title">ASSISTANT VMIND</div>
          <div className="chat-subtitle">Analyse intelligente des données TraLIS</div>
        </div>
      </div>

      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`msg ${msg.sender === 'user' ? 'msg-user' : ''}`}>
            <div className={`msg-avatar ${msg.sender === 'user' ? 'user' : 'vm'}`}>
              {msg.sender === 'user' ? 'U' : (msg.agent || 'VM').slice(0, 2)}
            </div>

            <div className="msg-body">
              <div
                className="msg-text"
                dangerouslySetInnerHTML={{
                  __html: msg.isThinking
                    ? `<div class="thinking"><div class="thdot"></div><div class="thdot"></div><div class="thdot"></div></div>`
                    : msg.text,
                }}
              />
              <div className="msg-meta">
                {msg.agent ? `${msg.agent} · ` : ''}{msg.time} {msg.meta ? `· ${msg.meta}` : ''}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="input-bar">
        <div className="input-wrap">
          <textarea
            className="input-field"
            placeholder="Posez votre question métier..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <div className="input-actions">
            <button type="button" className="voice-btn" onClick={onOpenVoice}>
              🎤
            </button>
            <button type="button" className="send-btn" onClick={handleSend}>
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
