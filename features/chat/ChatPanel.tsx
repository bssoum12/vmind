"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../shared/hooks/useChat';
import { AgentBadge } from '../../components/ui/Badge';
import { KpiCard } from '../../components/ui/KpiCard';
import { AGENTS } from '../../shared/constants/data';

interface ChatPanelProps {
  initialPrompt?: string;
  onOpenVoice: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ initialPrompt, onOpenVoice }) => {
  const { messages, addMessage, clearChat } = useChat();
  const [inputValue, setInputValue] = useState('');
  const [activeTab, setActiveTab] = useState('Conversation');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialPrompt) {
      setInputValue(initialPrompt);
      if (textareaRef.current) {
        textareaRef.current.focus();
        autoResize(textareaRef.current);
      }
    }
  }, [initialPrompt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    addMessage(inputValue);
    setInputValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="chat-title">Assistant Intelligence Entreprise</div>
          <div className="chat-subtitle">Posez vos questions en voix ou en texte — données TraLIS en temps réel</div>
        </div>
        <div className="chat-controls">
          <button className="ctrl-btn active-mode">✦ Texte</button>
          <button className="ctrl-btn" onClick={onOpenVoice}>🎙 Voix</button>
          <button className="ctrl-btn" onClick={clearChat}>↺ Effacer</button>
        </div>
      </div>

      <div className="tabs">
        {['Conversation', 'Historique', 'Rapports'].map(tab => (
          <div 
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </div>
        ))}
      </div>

      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`msg ${msg.sender === 'user' ? 'msg-user' : ''}`}>
            <div className={`msg-avatar ${msg.sender === 'user' ? 'user' : 'vm'}`}>
              {msg.sender === 'user' ? 'AB' : 'VM'}
            </div>
            <div className="msg-body">
              {msg.agent && (
                <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <AgentBadge 
                    label={msg.agent} 
                    bgColor={AGENTS[msg.agent]?.bgColor || 'rgba(0,229,200,0.1)'}
                    color={AGENTS[msg.agent]?.color || 'var(--cyan)'}
                    borderColor={AGENTS[msg.agent]?.borderColor || 'var(--border2)'}
                  />
                </div>
              )}
              <div className="msg-text">
                {msg.isThinking ? (
                  <div className="thinking">
                    <div className="thdot"></div><div className="thdot"></div><div className="thdot"></div>
                  </div>
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: msg.text }} />
                )}
              </div>
              {msg.kpis && (
                <div className="kpi-cards">
                  {msg.kpis.map((kpi, idx) => <KpiCard key={idx} kpi={kpi} />)}
                </div>
              )}
              <div className="msg-meta">{msg.meta || msg.time}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-bar">
        <div className="input-wrap">
          <textarea 
            ref={textareaRef}
            className="input-field" 
            placeholder="Posez votre question en français, arabe ou anglais..."
            rows={1}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              autoResize(e.target);
            }}
            onKeyDown={handleKeyDown}
          />
          <div className="input-actions">
            <div className="voice-btn" onClick={onOpenVoice} title="Interface vocale">🎙</div>
            <div className="send-btn" onClick={handleSend} title="Envoyer">➤</div>
          </div>
        </div>
        <div className="input-hints">
          {[
            { label: '💰 Trésorerie', prompt: 'Situation de trésorerie aujourd\'hui' },
            { label: '🏆 Top clients', prompt: 'Top 5 clients ce mois' },
            { label: '📋 BL impayés', prompt: 'BL non facturés' },
            { label: '📈 Cash forecast', prompt: 'Prévision cash 30 jours' },
            { label: '⚠ Impayés', prompt: 'Impayés clients' }
          ].map((hint, idx) => (
            <div 
              key={idx} 
              className="hint-chip" 
              onClick={() => {
                setInputValue(hint.prompt);
                if (textareaRef.current) {
                  textareaRef.current.focus();
                  autoResize(textareaRef.current);
                }
              }}
            >
              {hint.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
