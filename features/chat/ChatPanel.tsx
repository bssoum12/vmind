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
            <button type="button" className="voice-btn flex items-center justify-center rounded-full border border-cyan-400/50 p-2 text-cyan-400 hover:border-cyan-400 transition-colors" onClick={onOpenVoice}>
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4"
                style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }}
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" fill="currentColor" fillOpacity="0.2" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </button>
            <button type="button" className="send-btn flex items-center justify-center" onClick={handleSend}>
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 fill-current stroke-current"
                style={{ strokeWidth: '1.2px', strokeLinejoin: 'round', strokeLinecap: 'round' }}
              >
                <path d="M 3.5 20.5 L 21.5 12 L 3.5 3.5 L 7.5 12 Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
