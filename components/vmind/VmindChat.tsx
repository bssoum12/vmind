"use client";

import React, { useEffect, useState, useRef } from 'react';
import { VmindMessage } from '@/shared/types/vmind';
import { sendVmindMessage } from '@/shared/api/n8n-api';
import { ToolResultRenderer } from './renderers/ToolResultRenderer';
import { resolveAgentFromTool, AGENTS } from '@/shared/constants/data';

interface VmindChatProps {
  initialPrompt?: string;
  onOpenVoice: () => void;
  clientId?: string;
  onAgentActive?: (agentId: string) => void;
  activeAgentId?: string;
}

// Mappage des tools snake_case vers les agents
const TOOL_TO_AGENT: Record<string, string> = {
  'get_invoice_detail': 'VDATA',
  'get_dossier_detail': 'VDATA',
  'get_expedition_status': 'VDATA',
  'get_customer_profile': 'VDATA',
  'get_purchase_invoice_detail': 'VDATA',
  'search_cotations': 'VDATA',
  'get_aged_balance': 'VDATA',
  'get_overdue_alerts': 'VDATA',
};

export const VmindChat: React.FC<VmindChatProps> = ({
  initialPrompt,
  onOpenVoice,
  clientId = "DEMO",
  onAgentActive,
  activeAgentId = "VMIND"
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<VmindMessage[]>([
    {
      id: 'init-1',
      sender: 'vm',
      text: 'Bonjour. Je suis connecté via n8n. Que puis-je pour vous ?',
      time: '',
    },
  ]);

  useEffect(() => {
    // Initialisation de l'heure du message de bienvenue uniquement côté client
    setMessages(prev => prev.map(m =>
      m.id === 'init-1' ? { ...m, time: new Date().toLocaleTimeString('fr-FR', { hour12: false }) } : m
    ));
  }, []);

  useEffect(() => {
    if (initialPrompt) {
      setInput(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput('');
    setIsLoading(true);

    const userMessage: VmindMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
    };

    const thinkingMessage: VmindMessage = {
      id: `thinking-${Date.now()}`,
      sender: 'vm',
      text: '',
      time: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
      isThinking: true,
    };

    setMessages((prev) => [...prev, userMessage, thinkingMessage]);

    try {
      let response = await sendVmindMessage(text, clientId);

      console.log("✅ [VmindChat] Réponse reçue de l'API:", {
        tool: response.tool_used,
        type: response.response_type,
        fullObject: response
      });

      setMessages((prev) => prev.filter(m => !m.isThinking));

      // On utilise maintenant le format standardisé
      const isOk = response && (response.ok === true || (response.ok as any) === "true");

      if (!isOk) {
        setMessages((prev) => [...prev, {
          id: `err-${Date.now()}`,
          sender: 'vm',
          text: response?.message || 'Le service n8n n\'a pas renvoyé de réponse valide (ok=false).',
          time: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
          error: response?.error || 'NO_RESPONSE',
          response_type: 'error',
          title: response?.title || 'Erreur n8n'
        }]);
      } else {
        const toolUsed = response.tool_used as string;
        const agentId = TOOL_TO_AGENT[toolUsed] || 'VMIND';

        if (onAgentActive) onAgentActive(agentId);

        setMessages((prev) => [...prev, {
          id: `vm-${Date.now()}`,
          sender: 'vm',
          text: response.message || 'Voici les informations demandées.',
          time: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
          tool_used: response.tool_used,
          response_type: response.response_type || 'full',
          title: response.title,
          kpis: response.kpis,
          table: response.table,
          chart: response.chart,
          details: response.details,
          raw: response.raw
        }]);
      }

    } catch (error: any) {
      setMessages((prev) => prev.filter(m => !m.isThinking));
      setMessages((prev) => [...prev, {
        id: `err-${Date.now()}`,
        sender: 'vm',
        text: `Erreur de communication avec n8n : ${error.message}`,
        time: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
        error: error.message,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = async (suggestion: string, toolEndpoint: string, payload: any) => {
    if (isLoading) return;

    // Ajouter le message utilisateur (la suggestion)
    const userMessage: VmindMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: suggestion,
      time: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
    };

    const thinkingMessage: VmindMessage = {
      id: `thinking-${Date.now()}`,
      sender: 'vm',
      text: '',
      time: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
      isThinking: true,
    };

    setMessages((prev) => [...prev, userMessage, thinkingMessage]);
    setIsLoading(true);

    try {
      // Utiliser la même base URL que n8n-api.ts
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${baseUrl}${toolEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, ...payload })
      });
      const wrapper = await response.json();

      setMessages((prev) => prev.filter(m => !m.isThinking));

      if (!response.ok || !wrapper.ok) {
        setMessages((prev) => [...prev, {
          id: `err-${Date.now()}`,
          sender: 'vm',
          text: wrapper.error?.message || wrapper.message || 'Erreur lors de l\'appel API direct',
          time: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
          error: wrapper.error?.message || 'API_ERROR',
          response_type: 'error',
          title: 'Erreur API'
        }]);
      } else {
        // wrapper = { ok, data: { ...VmindN8nResponse } }
        // data contient le format standard identique à n8n
        const result = wrapper.data;

        if (onAgentActive) onAgentActive('VDATA');

        setMessages((prev) => [...prev, {
          id: `vm-${Date.now()}`,
          sender: 'vm',
          text: result.message || 'Voici les informations demandées.',
          time: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
          tool_used: result.tool_used || 'get_dossier_volume_evolution',
          response_type: result.response_type || 'full',
          title: result.title,
          kpis: result.kpis,
          table: result.table,
          chart: result.chart,
          details: result.details,
          raw: result.raw
        }]);
      }
    } catch (error: any) {
      setMessages((prev) => prev.filter(m => !m.isThinking));
      setMessages((prev) => [...prev, {
        id: `err-${Date.now()}`,
        sender: 'vm',
        text: `Erreur de communication : ${error.message}`,
        time: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
        error: error.message,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      await handleSend();
    }
  };

  const currentAgentData = activeAgentId !== 'VMIND' ? (AGENTS as any)[activeAgentId] : null;

  return (
    <div className="chat-panel flex flex-col h-full bg-[#0b101e]">
      <div className="chat-header p-4 border-b border-[#1c2538] flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            {currentAgentData && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded" style={{ backgroundColor: currentAgentData.bgColor, color: currentAgentData.color, border: `1px solid ${currentAgentData.borderColor}`}}>
                {currentAgentData.icon}
              </span>
            )}
            <div className="chat-title text-cyan-400 font-bold text-lg">
              {currentAgentData ? `ASSISTANT ${currentAgentData.name}` : 'ASSISTANT VMIND'}
            </div>
          </div>
          <div className="chat-subtitle text-xs text-gray-400 mt-1">
            {currentAgentData ? currentAgentData.desc : 'Orchestration intelligente via Webhook'}
          </div>

          {/* Suggestions Zone */}
          {activeAgentId === 'VDATA' && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="suggestion-chip">
                Taux livraison à temps ?
              </button>
              <button className="suggestion-chip">
                Compare Jan-Avr ?
              </button>
              <button className="suggestion-chip">
                3 KPIs dégradés ?
              </button>
              <button className="suggestion-chip">
                Rapport mensuel PDF ?
              </button>
              <button 
                onClick={() => handleSuggestionClick("Montre-moi l'évolution du volume des dossiers sur 12 mois", "/api/tools/get-dossier-volume-evolution", { months: 12 })}
                className="suggestion-chip"
                disabled={isLoading}
              >
                Volume 12 mois ?
              </button>
            </div>
          )}

          {isLoading && (
            <div className="text-[10px] text-cyan-500 animate-pulse mt-2">
              Analyse en cours...
            </div>
          )}
        </div>
      </div>

      <div className="messages flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const toolUsed = msg.tool_used as string;
          const agentId = TOOL_TO_AGENT[toolUsed] || 'VMIND';
          const agentData = agentId !== 'VMIND' ? (AGENTS as any)[agentId] : null;

          return (
            <div key={msg.id} className={`flex w-full ${isUser ? 'justify-start' : 'justify-end'}`}>
              <div className={`msg flex gap-3 max-w-[85%] ${isUser ? 'flex-row' : 'flex-row-reverse'}`}>
                <div
                  className={`msg-avatar flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${isUser
                    ? 'bg-indigo-600 text-white shadow-[0_0_10px_rgba(79,70,229,0.3)]'
                    : agentData
                      ? 'bg-[#00E5C8]/20 text-[#00E5C8] border border-[#00E5C8]/50 shadow-[0_0_15px_rgba(0,229,200,0.2)]'
                      : 'bg-cyan-900/50 text-cyan-400 border border-cyan-500/30'
                    }`}
                >
                  {isUser ? 'U' : (agentData?.icon || 'VM')}
                </div>

                <div className={`msg-body flex flex-col ${isUser ? 'items-start' : 'items-end'}`}>
                  {msg.tool_used && (
                    <div className={`text-[9px] uppercase mb-1 tracking-wider font-bold ${agentData ? 'text-[#00E5C8]' : 'text-cyan-600'}`}>
                      AGENT ACTIF : {agentId} — {msg.tool_used}
                    </div>
                  )}

                  <div className={`msg-content p-4 rounded-2xl text-sm transition-all duration-500 ${isUser
                    ? 'bg-[#1e293b]/90 border border-indigo-500/30 text-indigo-50 rounded-tl-none'
                    : msg.error
                      ? 'bg-red-900/40 border border-red-500/50 text-red-100'
                      : agentData
                        ? 'bg-[#0f172a] border border-[#00E5C8]/40 text-gray-100 rounded-tr-none shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
                        : 'bg-[#0f172a] border border-[#2a3441] text-gray-100 rounded-tr-none'
                    }`}>
                    {isUser ? (
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    ) : (
                      <ToolResultRenderer message={msg} />
                    )}
                  </div>

                  <div className={`msg-meta text-[9px] text-gray-500 mt-1.5 px-1 font-mono ${isUser ? 'text-left' : 'text-right'}`}>
                    {msg.time}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-bar p-4 border-t border-[#1c2538] bg-[#0b101e] flex-shrink-0">
        <div className="input-wrap relative flex items-center bg-[#151b2b] rounded-lg border border-[#2a3441] focus-within:border-cyan-500/50 transition-colors">
          <textarea
            className="input-field w-full bg-transparent p-3 pr-24 text-sm text-gray-200 placeholder-gray-500 outline-none resize-none max-h-32"
            rows={1}
            placeholder="Posez votre question métier..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />

          <div className="input-actions absolute right-2 flex items-center gap-1">
            <button
              type="button"
              className="voice-btn p-2 text-gray-400 hover:text-cyan-400 transition-colors"
              onClick={onOpenVoice}
              disabled={isLoading}
            >
              🎤
            </button>
            <button
              type="button"
              className={`send-btn p-2 rounded flex items-center justify-center transition-colors ${input.trim() && !isLoading
                ? 'bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/40'
                : 'text-gray-600 cursor-not-allowed'
                }`}
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
