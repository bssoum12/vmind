"use client";

import React, { useEffect, useState, useRef } from 'react';
import { VmindMessage } from '@/shared/types/vmind';
import { sendVmindMessage } from '@/shared/api/n8n-api';
import { ToolResultRenderer } from './renderers/ToolResultRenderer';

interface VmindChatProps {
  initialPrompt?: string;
  onOpenVoice: () => void;
  clientId?: string;
}

export const VmindChat: React.FC<VmindChatProps> = ({
  initialPrompt,
  onOpenVoice,
  clientId = "DEMO"
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
      console.log("n8n Response Raw:", response);

      // Si n8n renvoie un tableau (All Incoming Items), on prend le premier élément
      if (Array.isArray(response) && response.length > 0) {
        response = response[0];
      }

      setMessages((prev) => prev.filter(m => !m.isThinking));

      // Vérification plus robuste : n8n peut renvoyer la chaîne "null" ou l'expression littérale si mal configuré
      const isOk = (response.ok as any) === true || (response.ok as any) === "true";
      const hasRealError = !isOk || (
        response.error &&
        response.error !== "null" &&
        response.error !== null &&
        response.error !== "-" &&
        !String(response.error).includes("{{")
      );

      if (hasRealError) {
        // Extraction propre du message d'erreur (si c'est un objet renvoyé par n8n)
        let errorText = 'Erreur inconnue';
        if (typeof response.error === 'string') {
          errorText = response.error;
        } else if (response.error && typeof response.error === 'object') {
          errorText = response.error.message || response.error.error || JSON.stringify(response.error);
        }

        setMessages((prev) => [...prev, {
          id: `err-${Date.now()}`,
          sender: 'vm',
          text: `Impossible de récupérer les données : ${errorText}`,
          time: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
          error: response.error,
        }]);
      } else {
        // Si tool est "null" en string (erreur fréquente n8n), on le remet à null
        let cleanTool = ((response.tool as any) === "null" || !response.tool) ? null : response.tool;

        // Fallback de sécurité : Si le tool est manquant mais que les données ressemblent à une facture
        if (!cleanTool && (response.data?.invoice || response.data?.reference)) {
          cleanTool = "get_invoice_detail";
        }

        // Sécurité : Si data est une chaîne JSON (suite à un JSON.stringify dans n8n)
        let cleanData = response.data;
        if (typeof cleanData === 'string' && cleanData.trim().startsWith('{')) {
          try {
            cleanData = JSON.parse(cleanData);
          } catch (e) {
            console.warn("Data n'est pas un JSON valide, conservation tel quel");
          }
        }

        setMessages((prev) => [...prev, {
          id: `vm-${Date.now()}`,
          sender: 'vm',
          text: response.message || '',
          time: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
          tool: cleanTool as any,
          data: cleanData === "null" ? null : cleanData,
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

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      await handleSend();
    }
  };

  return (
    <div className="chat-panel flex flex-col h-full bg-[#0b101e]">
      <div className="chat-header p-4 border-b border-[#1c2538] flex-shrink-0">
        <div>
          <div className="chat-title text-cyan-400 font-bold text-lg">ASSISTANT VMIND (n8n)</div>
          <div className="chat-subtitle text-xs text-gray-400">Orchestration intelligente via Webhook</div>
          {isLoading && (
            <div className="text-[10px] text-cyan-500 animate-pulse mt-1">
              Analyse VMIND en cours...
            </div>
          )}
        </div>
      </div>

      <div className="messages flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`msg flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`msg-avatar flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${msg.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-cyan-900 text-cyan-400 border border-cyan-500'
              }`}>
              {msg.sender === 'user' ? 'U' : 'VM'}
            </div>

            <div className={`msg-body flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}>

              {msg.tool && (
                <div className="text-[9px] text-cyan-600 uppercase mb-1 tracking-wider">
                  Tool exécuté : {msg.tool}
                </div>
              )}

              <div className={`msg-content p-3 rounded-lg text-sm ${msg.sender === 'user'
                ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-100'
                : msg.error
                  ? 'bg-red-900/20 border border-red-500/30 text-red-200'
                  : 'bg-[#151b2b] border border-[#2a3441] text-gray-200 w-full'
                }`}>
                {msg.sender === 'user' ? (
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                ) : (
                  <ToolResultRenderer message={msg} />
                )}
              </div>

              <div className="msg-meta text-[10px] text-gray-500 mt-1 px-1">
                {msg.time}
              </div>
            </div>
          </div>
        ))}
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
