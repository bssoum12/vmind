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
  'compare_agency_performance_jan_apr': 'VDATA',
  'analyze_delay_by_client_type': 'VDATA',
  'generate_monthly_activity_report': 'VDATA',
};

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  'compare_agency_performance_jan_apr': 'Analyse par agence',
  'analyze_delay_by_client_type': 'Retards par type de client',
  'generate_monthly_activity_report': 'Rapport mensuel',
};

const getToolDisplayName = (tool?: string | null) => {
  if (!tool) return '';
  return TOOL_DISPLAY_NAMES[tool] || tool.replace(/_/g, ' ');
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
          raw: response.raw,
          alerts: response.alerts,
          report_url: response.report_url,
          report_filename: response.report_filename,
          error: response.error
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
          raw: result.raw,
          alerts: result.alerts,
          report_url: result.report_url,
          report_filename: result.report_filename,
          error: result.error
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
      <div className="chat-header flex-shrink-0" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Header top row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

          {/* Status dot */}
          <div style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: currentAgentData ? currentAgentData.color : '#00f0ff',
            boxShadow: `0 0 8px ${currentAgentData ? currentAgentData.color : '#00f0ff'}`,
            flexShrink: 0,
          }} />

          {/* Agent name */}
          <span style={{
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: currentAgentData ? currentAgentData.color : '#00f0ff',
            textTransform: 'uppercase',
          }}>
            {currentAgentData ? `${currentAgentData.name}` : 'VMIND'}
          </span>

          {/* Description */}
          <span style={{
            fontSize: '11px',
            color: 'rgba(160,180,210,0.6)',
            fontWeight: 500,
          }}>
            {currentAgentData ? currentAgentData.desc : 'Orchestration intelligente via Webhook'}
          </span>

          {/* Mode pill */}
          <span style={{
            fontSize: '9px',
            fontWeight: 600,
            letterSpacing: '0.1em',
            padding: '2px 8px',
            borderRadius: '99px',
            background: currentAgentData ? `${currentAgentData.bgColor}` : 'rgba(0,240,255,0.08)',
            color: currentAgentData ? currentAgentData.color : '#00f0ff',
            border: `1px solid ${currentAgentData ? currentAgentData.borderColor : 'rgba(0,240,255,0.2)'}`,
            textTransform: 'uppercase',
          }}>
            ASSISTANT
          </span>
        </div>


        {/* Suggestions Zone */}
        {activeAgentId === 'VDATA' && (
          <div className="suggestions-row mt-1 flex gap-2" style={{ overflowX: 'auto', flexWrap: 'nowrap', width: '100%', paddingTop: '8px', paddingBottom: '8px', scrollbarWidth: 'none' }}>
            <button
              onClick={() => handleSuggestionClick("Quel est le taux de dossiers livrés à temps ce mois ?", "/api/tools/get-delivery-rate", {})}
              className="suggestion-chip"
              style={{ flexShrink: 0 }}
              disabled={isLoading}
            >
              Taux livraison à temps ?
            </button>
            <button
              onClick={() => handleSuggestionClick("Compare les performances de janvier à avril par agence", "/api/tools/compare-agency-performance-jan-apr", {})}
              className="suggestion-chip"
              style={{ flexShrink: 0 }}
              disabled={isLoading}
            >
              Compare Jan-Avr ?
            </button>
            <button
              onClick={() => handleSuggestionClick("Quels sont les 3 indicateurs les plus dégradés cette semaine ?", "/api/tools/get-degraded-kpis", {})}
              className="suggestion-chip"
              style={{ flexShrink: 0 }}
              disabled={isLoading}
            >
              3 KPIs dégradés ?
            </button>
            <button
              onClick={() => handleSuggestionClick("Génère le rapport mensuel global d'activité", "/api/tools/generate-monthly-activity-report", {})}
              className="suggestion-chip"
              style={{ flexShrink: 0 }}
              disabled={isLoading}
            >
              Rapport mensuel PDF ?
            </button>
            <button
              onClick={() => handleSuggestionClick("Analyse la corrélation entre retards et type de client", "/api/tools/analyze-delay-by-client-type", {})}
              className="suggestion-chip"
              style={{ flexShrink: 0 }}
              disabled={isLoading}
            >
              Retards par type client ?
            </button>
            <button
              onClick={() => handleSuggestionClick("Montre-moi l'évolution du volume des dossiers sur 12 mois", "/api/tools/get-dossier-volume-evolution", { months: 12 })}
              className="suggestion-chip"
              style={{ flexShrink: 0 }}
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

      <div className="messages flex-1 overflow-y-auto p-4 space-y-5">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const toolUsed = msg.tool_used as string;
          const agentId = TOOL_TO_AGENT[toolUsed] || 'VMIND';
          const agentData = agentId !== 'VMIND' ? (AGENTS as any)[agentId] : null;

          return (
            <div key={msg.id} style={{ display: 'flex', width: '100%', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
              <div style={{ display: 'flex', gap: '10px', maxWidth: '88%', flexDirection: isUser ? 'row-reverse' : 'row' }}>

                {/* Avatar */}
                <div
                  style={isUser
                    ? {
                        alignSelf: 'flex-start',
                        flexShrink: 0,
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                        color: '#fff',
                        boxShadow: '0 0 12px rgba(79,70,229,0.45)',
                        border: '1px solid rgba(139,92,246,0.5)',
                      }
                    : agentData
                      ? {
                          alignSelf: 'flex-start',
                          flexShrink: 0,
                          width: '32px',
                          height: '32px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 700,
                          background: 'rgba(0,229,200,0.1)',
                          color: '#00E5C8',
                          boxShadow: '0 0 12px rgba(0,229,200,0.25)',
                          border: '1px solid rgba(0,229,200,0.4)',
                        }
                      : {
                          alignSelf: 'flex-start',
                          flexShrink: 0,
                          width: '32px',
                          height: '32px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 700,
                          background: 'rgba(0,240,255,0.08)',
                          color: '#00f0ff',
                          boxShadow: '0 0 10px rgba(0,240,255,0.2)',
                          border: '1px solid rgba(0,240,255,0.25)',
                        }
                  }
                >
                  {isUser ? 'U' : (agentData?.icon || 'VM')}
                </div>

                {/* Bubble body */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: isUser ? 'flex-end' : 'flex-start' }}>

                  {/* Agent label */}
                  {msg.tool_used && (
                    <div className={`text-[9px] uppercase tracking-widest font-bold px-1 ${agentData ? 'text-[#00E5C8]' : 'text-cyan-600'}`}>
                      AGENT ACTIF : {agentId} — {getToolDisplayName(toolUsed)}
                    </div>
                  )}

                  {/* Message bubble */}
                  <div
                    style={isUser
                      ? {
                          background: 'linear-gradient(135deg, rgba(49,38,110,0.85) 0%, rgba(30,23,70,0.9) 100%)',
                          border: '1px solid rgba(139,92,246,0.4)',
                          borderRadius: '16px 4px 16px 16px',
                          padding: '10px 14px',
                          color: '#e8e4ff',
                          fontSize: '13px',
                          lineHeight: '1.55',
                          boxShadow: '0 4px 20px rgba(79,70,229,0.2), inset 0 0 12px rgba(139,92,246,0.06)',
                          backdropFilter: 'blur(8px)',
                        }
                      : msg.error
                        ? {
                            background: 'rgba(127,29,29,0.4)',
                            border: '1px solid rgba(239,68,68,0.4)',
                            borderRadius: '4px 16px 16px 16px',
                            padding: '10px 14px',
                            color: '#fca5a5',
                            fontSize: '13px',
                            lineHeight: '1.55',
                            boxShadow: '0 4px 16px rgba(239,68,68,0.15)',
                          }
                        : agentData
                          ? {
                              background: 'linear-gradient(135deg, rgba(8,20,36,0.92) 0%, rgba(4,12,24,0.95) 100%)',
                              border: '1px solid rgba(0,229,200,0.3)',
                              borderRadius: '4px 16px 16px 16px',
                              padding: '10px 14px',
                              color: '#d1faf6',
                              fontSize: '13px',
                              lineHeight: '1.55',
                              boxShadow: '0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,229,200,0.08), inset 0 0 16px rgba(0,229,200,0.04)',
                              backdropFilter: 'blur(10px)',
                            }
                          : {
                              background: 'linear-gradient(135deg, rgba(10,18,34,0.95) 0%, rgba(6,12,22,0.97) 100%)',
                              border: '1px solid rgba(0,240,255,0.18)',
                              borderRadius: '4px 16px 16px 16px',
                              padding: '10px 14px',
                              color: '#d1f4ff',
                              fontSize: '13px',
                              lineHeight: '1.55',
                              boxShadow: '0 4px 20px rgba(0,0,0,0.45), inset 0 0 12px rgba(0,240,255,0.03)',
                              backdropFilter: 'blur(8px)',
                            }
                    }
                  >
                    {isUser ? (
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    ) : (
                      <ToolResultRenderer message={msg} />
                    )}
                  </div>

                  {/* Timestamp */}
                  <div
                    className="font-mono px-1"
                    style={{
                      fontSize: '9px',
                      color: isUser ? 'rgba(139,92,246,0.5)' : 'rgba(0,240,255,0.3)',
                      textAlign: isUser ? 'right' : 'left',
                    }}
                  >
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
