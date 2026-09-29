# Documentation d'Intégration Webhook n8n - VMIND

Ce document détaille les étapes d'intégration et le code associé pour remplacer l'ancienne logique de chat (`useChat.ts`) par une architecture basée sur un webhook n8n.
L'objectif est d'interroger directement n8n depuis le frontend, puis de rendre visuellement la réponse retournée, avec un focus spécifique sur le rendu du tool `get_invoice_detail`.

---

## 1. Création des Types TypeScript

Pour typer fortement les retours du webhook n8n et les messages du chat, nous avons créé le fichier `shared/types/vmind.ts`.

**Fichier : `shared/types/vmind.ts`**

```typescript
export type VmindTool =
  | "search_cotations"
  | "get_invoice_detail"
  | "get_dossier_detail"
  | "get_expedition_status"
  | "get_customer_profile"
  | "get_purchase_invoice_detail"
  | null;

export type VmindN8nResponse = {
  ok: boolean;
  tool: VmindTool;
  message?: string | null;
  data?: any;
  error?: any;
};

export interface VmindMessage {
  id: string;
  sender: 'user' | 'vm';
  text: string;
  time: string;
  tool?: VmindTool;
  data?: any;
  error?: any;
  isThinking?: boolean;
}
```

---

## 2. Création de la Fonction d'Appel Réseau (API)

Nous avons implémenté une fonction utilitaire pour appeler le Webhook n8n avec la méthode POST.

**Fichier : `shared/api/n8n-api.ts`**

```typescript
import { VmindN8nResponse } from '../types/vmind';

export async function sendVmindMessage(message: string, clientId = "DEMO"): Promise<VmindN8nResponse> {
  const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || "http://localhost:5678/webhook-test/vmind-chat";
  
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message,
      client_id: clientId
    })
  });

  if (!response.ok) {
    throw new Error(`Erreur lors de l'appel n8n: ${response.statusText}`);
  }

  return response.json();
}
```

---

## 3. Création du Composant de Rendu de Facture

Ce composant gère l'affichage structuré (UI Dashboard / Cards) lorsque le tool `get_invoice_detail` est retourné par n8n. Il a été conçu avec les styles Dark/Cyan existants.

**Fichier : `components/vmind/renderers/InvoiceDetailResult.tsx`**

```tsx
import React from 'react';

interface InvoiceDetailResultProps {
  data: any;
}

export const InvoiceDetailResult: React.FC<InvoiceDetailResultProps> = ({ data }) => {
  if (!data || !data.invoice) {
    return <div className="text-red-400">Données de facture invalides ou manquantes.</div>;
  }

  const { invoice, lines, summary } = data;
  const dateStr = invoice.date_facture ? new Date(invoice.date_facture).toLocaleDateString() : 'N/A';
  const echeanceStr = invoice.date_echeance ? new Date(invoice.date_echeance).toLocaleDateString() : 'N/A';

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header Card */}
      <div className="bg-[#1a2235] p-4 rounded-lg border-l-4 border-cyan-500 border-y border-r border-[#2a3441]">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <strong className="text-cyan-400 text-lg">{invoice.reference || 'N/A'}</strong>
          </div>
          <span className="text-xs bg-cyan-900/40 text-cyan-400 px-3 py-1 rounded border border-cyan-500/40 font-bold">
            {invoice.statut || 'N/A'}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm mt-2">
          <div>
            <div className="text-gray-400 text-xs uppercase mb-1">Client</div>
            <div className="font-semibold text-gray-100">{invoice.client || 'N/A'}</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs uppercase mb-1">Dossier Lié</div>
            <div className="font-semibold text-gray-100">{invoice.dossier_ref || 'N/A'}</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs uppercase mb-1">Date Facture</div>
            <div className="text-gray-200">{dateStr}</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs uppercase mb-1">Échéance</div>
            <div className="text-amber-400">{echeanceStr}</div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#151b2b] p-3 rounded-lg border border-[#2a3441] text-center">
          <div className="text-xl font-bold text-gray-100">{invoice.total_ht || '0'} <span className="text-xs text-gray-400">{invoice.devise || ''}</span></div>
          <div className="text-[10px] text-gray-400 uppercase mt-1">TOTAL HT</div>
        </div>
        <div className="bg-[#151b2b] p-3 rounded-lg border border-[#2a3441] text-center">
          <div className="text-xl font-bold text-gray-100">{invoice.total_tva || '0'} <span className="text-xs text-gray-400">{invoice.devise || ''}</span></div>
          <div className="text-[10px] text-gray-400 uppercase mt-1">TVA</div>
        </div>
        <div className="bg-gradient-to-r from-cyan-900/30 to-transparent p-3 rounded-lg border border-cyan-500/50 text-center">
          <div className="text-xl font-bold text-cyan-400">{invoice.total_ttc || '0'} <span className="text-xs text-cyan-600">{invoice.devise || ''}</span></div>
          <div className="text-[10px] text-cyan-400 uppercase mt-1 font-bold">TOTAL TTC</div>
        </div>
      </div>

      {/* Lines Table */}
      {lines && lines.length > 0 ? (
        <div className="mt-2 overflow-x-auto rounded border border-[#2a3441]">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#151b2b] text-gray-400 border-b border-[#2a3441]">
              <tr>
                <th className="p-2 font-semibold">Désignation</th>
                <th className="p-2 font-semibold text-right">Qté</th>
                <th className="p-2 font-semibold text-right">P.U HT</th>
                <th className="p-2 font-semibold text-right">TVA</th>
                <th className="p-2 font-semibold text-right">TTC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a3441]">
              {lines.map((line: any, idx: number) => (
                <tr key={idx} className="hover:bg-[#1a2235]/50 transition-colors">
                  <td className="p-2 text-gray-300">{line.article_nom || line.designation || 'N/A'}</td>
                  <td className="p-2 text-right">{line.quantite || 0}</td>
                  <td className="p-2 text-right">{line.prix_unitaire_ht || 0}</td>
                  <td className="p-2 text-right">{line.taux_tva || 0}%</td>
                  <td className="p-2 text-right font-medium text-cyan-400">{line.montant_ttc || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-xs italic text-cyan-500 mt-2">
          Aucune ligne détaillée n'a été retournée pour cette facture.
        </div>
      )}
    </div>
  );
};
```

---

## 4. Création du Routeur de Rendu

Le `ToolResultRenderer` s'occupe de lire le type de `tool` retourné par n8n et d'afficher le composant correspondant (pour le moment uniquement `InvoiceDetailResult`, les autres outils ont un rendu brut JSON par défaut).

**Fichier : `components/vmind/renderers/ToolResultRenderer.tsx`**

```tsx
import React from 'react';
import { VmindMessage } from '@/shared/types/vmind';
import { InvoiceDetailResult } from './InvoiceDetailResult';

interface ToolResultRendererProps {
  message: VmindMessage;
}

export const ToolResultRenderer: React.FC<ToolResultRendererProps> = ({ message }) => {
  const { tool, data, text } = message;

  // Si c'est un message sans tool (message texte simple de l'assistant)
  if (!tool) {
    return (
      <div 
        className="msg-text whitespace-pre-wrap"
        dangerouslySetInnerHTML={{
          __html: message.isThinking
            ? `<div class="thinking"><div class="thdot"></div><div class="thdot"></div><div class="thdot"></div></div>`
            : text
        }}
      />
    );
  }

  // Switch selon le tool
  switch (tool) {
    case 'get_invoice_detail':
      return <InvoiceDetailResult data={data} />;
      
    // Les autres outils ne sont pas encore implémentés visuellement
    case 'search_cotations':
    case 'get_dossier_detail':
    case 'get_expedition_status':
    case 'get_customer_profile':
    case 'get_purchase_invoice_detail':
      return (
        <div className="bg-[#151b2b] p-4 rounded border border-amber-500/50">
          <div className="text-amber-500 font-bold mb-2">Tool : {tool}</div>
          <div className="text-xs text-gray-300">
            Ce tool n'a pas encore de vue spécifique dans cette itération. 
            Voici les données brutes :
          </div>
          <pre className="text-[10px] text-gray-400 mt-2 overflow-x-auto p-2 bg-black/40 rounded">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      );
      
    default:
      return (
        <div className="text-red-400">
          Tool non reconnu : {tool}
        </div>
      );
  }
};
```

---

## 5. Création du Composant Chat Principal

`VmindChat` remplace l'ancien `ChatPanel`. Il a son propre état local pour gérer les messages et utilise directement l'API n8n au lieu d'utiliser un Hook externe.

**Fichier : `components/vmind/VmindChat.tsx`**

```tsx
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
      time: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
    },
  ]);

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
      const response = await sendVmindMessage(text, clientId);

      setMessages((prev) => prev.filter(m => !m.isThinking));

      if (!response.ok || response.error) {
        setMessages((prev) => [...prev, {
          id: `err-${Date.now()}`,
          sender: 'vm',
          text: `Impossible de récupérer les données : ${response.error || 'Erreur inconnue'}`,
          time: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
          error: response.error,
        }]);
      } else {
        setMessages((prev) => [...prev, {
          id: `vm-${Date.now()}`,
          sender: 'vm',
          text: response.message || '',
          time: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
          tool: response.tool,
          data: response.data,
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
            <div className={`msg-avatar flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              msg.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-cyan-900 text-cyan-400 border border-cyan-500'
            }`}>
              {msg.sender === 'user' ? 'U' : 'VM'}
            </div>

            <div className={`msg-body flex flex-col max-w-[85%] ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            }`}>
              
              {msg.tool && (
                <div className="text-[9px] text-cyan-600 uppercase mb-1 tracking-wider">
                  Tool exécuté : {msg.tool}
                </div>
              )}

              <div className={`msg-content p-3 rounded-lg text-sm ${
                msg.sender === 'user' 
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
              className={`send-btn p-2 rounded flex items-center justify-center transition-colors ${
                input.trim() && !isLoading
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
```

---

## 6. Intégration dans la Page Principale

Enfin, nous avons mis à jour `app/page.tsx` pour remplacer `ChatPanel` par `VmindChat` et retirer `useChat`.

**Fichier : `app/page.tsx` (modifications clés)**

```tsx
import { VmindChat } from "@/components/vmind/VmindChat";

export default function Home() {
  const [voiceShow, setVoiceShow] = useState(false);
  const [insertPrompt, setInsertPrompt] = useState<string | undefined>(undefined);

  // Valeurs par défaut factices pour les autres composants (RightPanel, Sidebar) 
  // qui utilisaient les logs et activeAgentId provenant de l'ancien useChat
  const activeAgentId = "VMIND";
  const logs: any[] = [];

  // ...

  return (
    <main className="main-container">
      {/* ... */}
      <div className="content">
        <VmindChat
          initialPrompt={insertPrompt}
          onOpenVoice={() => setVoiceShow(true)}
        />
        {/* ... */}
      </div>
      {/* ... */}
    </main>
  );
}
```

---

L'implémentation est terminée. Le frontend pointe désormais directement vers le webhook n8n pour résoudre les intentions et récupérer les résultats des outils métiers.
