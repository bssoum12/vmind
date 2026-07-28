"use client";
import React, { useEffect, useState, useRef } from 'react';
import { VmindMessage } from '@/shared/types/vmind';
import { sendVmindMessage } from '@/shared/api/n8n-api';
import { ToolResultRenderer } from './renderers/ToolResultRenderer';
import { resolveAgentFromTool, AGENTS } from '@/shared/constants/data';
import { useConversations } from '@/shared/contexts/ConversationsContext';
import { jwtDecode } from 'jwt-decode';

interface VmindChatProps {
  initialPrompt?: string;
  onOpenVoice: () => void;
  clientId?: string;
  onAgentActive?: (agentId: string) => void;
  activeAgentId?: string;
}

// Mappage des tools snake_case vers les agents
const TOOL_TO_AGENT: Record<string, string> = {
  'get_delivery_rate': 'VDATA',
  'get_degraded_kpis': 'VDATA',
  'get_dossier_volume_evolution': 'VDATA',
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
  'get_monthly_validated_revenue': 'VFIN',
  'get_clients_overdue_30_days': 'VFIN',
  'compare_monthly_revenue': 'VFIN',
  'get_lowest_margin_5clients_quarter': 'VFIN',
  'get_treasury_status_today': 'VFIN',
  'get_treasury_forecast_30_days': 'VFIN',
  'get_top_clients_revenue': 'VSELL',
  'Client1_get_top_clients_revenue': 'VSELL',
  'MCP_Client1_get_top_clients_revenue': 'VSELL',
  'compare_client_revenues_monthly': 'VSELL',
  'Client1_compare_client_revenues_monthly': 'VSELL',
  'MCP_Client1_compare_client_revenues_monthly': 'VSELL',
  'get_new_clients_this_quarter': 'VSELL',
  'Client1_get_new_clients_this_quarter': 'VSELL',
  'MCP_Client1_get_new_clients_this_quarter': 'VSELL',
  'get_idle_clients': 'VSELL',
  'Client1_get_idle_clients': 'VSELL',
  'MCP_Client1_get_idle_clients': 'VSELL',
  'get_pipeline_status': 'VSELL',
  'Client1_get_pipeline_status': 'VSELL',
  'MCP_Client1_get_pipeline_status': 'VSELL',
  'get_churn_risk_clients': 'VSELL',
  'Client1_get_churn_risk_clients': 'VSELL',
  'MCP_Client1_get_churn_risk_clients': 'VSELL',
};

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  'compare_agency_performance_jan_apr': 'Analyse par agence',
  'analyze_delay_by_client_type': 'Retards par type de client',
  'generate_monthly_activity_report': 'Rapport mensuel',
  'get_top_clients_revenue': 'Classement Chiffre d\'Affaires',
  'Client1_get_top_clients_revenue': 'Classement Chiffre d\'Affaires',
  'MCP_Client1_get_top_clients_revenue': 'Classement Chiffre d\'Affaires',
  'compare_client_revenues_monthly': 'Comparaison CA par Client',
  'Client1_compare_client_revenues_monthly': 'Comparaison CA par Client',
  'MCP_Client1_compare_client_revenues_monthly': 'Comparaison CA par Client',
  'get_new_clients_this_quarter': 'Nouveaux Clients Trimestre',
  'Client1_get_new_clients_this_quarter': 'Nouveaux Clients Trimestre',
  'MCP_Client1_get_new_clients_this_quarter': 'Nouveaux Clients Trimestre',
  'get_idle_clients': 'Clients Inactifs (>60j)',
  'Client1_get_idle_clients': 'Clients Inactifs (>60j)',
  'MCP_Client1_get_idle_clients': 'Clients Inactifs (>60j)',
  'get_pipeline_status': 'État du Pipeline',
  'Client1_get_pipeline_status': 'État du Pipeline',
  'MCP_Client1_get_pipeline_status': 'État du Pipeline',
  'get_churn_risk_clients': 'Risque de Départ Clients',
  'Client1_get_churn_risk_clients': 'Risque de Départ Clients',
  'MCP_Client1_get_churn_risk_clients': 'Risque de Départ Clients',
};

const getToolDisplayName = (tool?: string | null) => {
  if (!tool) return '';
  return TOOL_DISPLAY_NAMES[tool] || tool.replace(/_/g, ' ');
};

const VDATA_FAST_TRACK_REGISTRY: Record<string, string> = {
  "Taux livraison à temps ?": "Veuillez me fournir le taux de livraison à temps global.",
  "Compare Jan-Avr ?": "Fais une comparaison détaillée des indicateurs entre Janvier et Avril.",
  "3 KPIs dégradés ?": "Affiche-moi les 3 KPIs les plus dégradés actuellement.",
  "Rapport mensuel PDF ?": "Génère et affiche le rapport mensuel d'activité au format PDF.",
  "Retards par type client ?": "Quels sont les retards actuels classés par type de client ?",
  "Volume 12 mois ?": "Quel est le volume total traité sur les 12 derniers mois ?"
};

const VFIN_FAST_TRACK_REGISTRY: Record<string, string> = {
  "CA validé ce mois ?": "Quel est le chiffre d'affaires validé pour ce mois en cours ?",
  "Clients Impayés > 30 jours ?": "Combien de clients ont des impayés supérieurs à 30 jours ?",
  "Comparer CA mois précédent": "Fais une comparaison détaillée du chiffre d'affaires entre ce mois-ci et le mois précédent.",
  "Top 5 marges faibles": "Montre-moi les 5 clients avec les marges les plus faibles sur ce trimestre.",
  "Trésorerie aujourd'hui ?": "Quelle est la situation précise de la trésorerie aujourd'hui ?",
  "Prévision trésorerie 30J ?": "Génère la prévision de trésorerie pour les 30 prochains jours."
};

const VSELL_FAST_TRACK_REGISTRY: Record<string, string> = {
  "Top 10 clients CA ce mois ?": "Quels sont les 10 meilleurs clients ce mois en chiffre d'affaires ?",
  "Compare CA clients mois": "Compare les revenus par client entre ce mois et le mois dernier",
  "Nouveaux clients trimestre ?": "Combien de nouveaux clients ont été acquis ce trimestre ?",
  "Clients inactifs > 60j ?": "Quels clients n'ont pas commandé depuis plus de 60 jours ?",
  "État du pipeline ?": "Quel est l'état du pipeline commercial actuel ?",
  "Risque de départ ?": "Quels clients présentent un risque de départ selon leur historique ?"
};

const FAST_TRACK_REGISTRY: Record<string, string> = {
  ...VDATA_FAST_TRACK_REGISTRY,
  ...VFIN_FAST_TRACK_REGISTRY,
  ...VSELL_FAST_TRACK_REGISTRY
};

const formatTime = (dateString?: string) => {
  if (!dateString) return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return new Date(dateString).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

const formatDateHeader = (dateString?: string) => {
  if (!dateString) return "Aujourd'hui";
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Aujourd'hui";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Hier";
  } else {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }
};

export const VmindChat: React.FC<VmindChatProps> = ({
  initialPrompt,
  onOpenVoice,
  clientId = "DEMO",
  onAgentActive,
  activeAgentId = "VMIND"
}) => {
  const { activeConversationId, createNewConversation, conversations, bumpConversation, updateConversationTitle, refreshConversations } = useConversations();
  const [input, setInput] = useState('');

  // Ref toujours synchrone → garantit la valeur EXACTE de l'agent au moment du clic
  const activeAgentIdRef = useRef<string>(activeAgentId);
  useEffect(() => {
    activeAgentIdRef.current = activeAgentId;
  }, [activeAgentId]);

  const getWelcomeMessage = () => {
    let fullName = "Utilisateur";
    try {
      const token = localStorage.getItem('vmind_session');
      if (token) {
        const decoded: any = jwtDecode(token);
        const firstName = decoded.first_name || '';
        const lastName = decoded.last_name || '';
        if (firstName || lastName) {
          fullName = `${firstName} ${lastName}`.trim();
        } else if (decoded.username) {
          fullName = decoded.username;
        }
      }
    } catch (e) {
      // fallback
    }

    const agentName = activeAgentId === 'VMIND' ? 'VMIND' : activeAgentId;
    return `Bonjour ${fullName}, je suis ${agentName}, Comment puis-je vous assister aujourd'hui ?`;
  };

  // Fetch history when conversation changes
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([{ id: 'init-1', sender: 'vm', text: getWelcomeMessage(), time: new Date().toLocaleTimeString('fr-FR', { hour12: false }) }]);
      return;
    }
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        let token = localStorage.getItem("vmind_mcp_token") || localStorage.getItem("vmind_session");
        if (token && token.startsWith("{")) token = JSON.parse(token).token;

        const res = await fetch(`${baseUrl}/api/conversations/${activeConversationId}/messages`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
          
        // RACE CONDITION GUARD: Si l'utilisateur a cliqué sur une autre conversation pendant que le fetch tournait, on abandonne la mise à jour UI.
        if (activeConversationIdRef.current !== activeConversationId) return;

        // GUARD PROTECTEUR : Si un AbortController est actif, ça veut dire qu'on vient d'envoyer un message et d'ajouter une bulle de chargement. On ignore l'historique vide pour ne pas écraser l'UI.
        if (abortControllersRef.current[activeConversationId]) return;

        if (data.ok && data.messages.length > 0) {
            const historyMsgs = data.messages.map((m: any, i: number) => {
               if (m.role === 'human') {
                  return { id: `hist-h-${i}`, sender: 'user', text: m.text, time: formatTime(m.created_at), rawDate: m.created_at || new Date().toISOString() };
               } else {
                  return { id: `hist-a-${i}`, sender: 'vm', text: m.message || m.text || 'Réponse', time: formatTime(m.created_at), rawDate: m.created_at || new Date().toISOString(), ...m };
               }
            });
           setMessages(historyMsgs);
        } else {
           setMessages([{ id: 'init-1', sender: 'vm', text: getWelcomeMessage(), time: new Date().toLocaleTimeString('fr-FR', { hour12: false }) }]);
        }
      } catch (err) { console.error("Error fetching history", err); }
      finally { setIsLoading(false); }
    };
    fetchHistory();
  }, [activeConversationId]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeConversationIdRef = useRef<string | null>(null);
  const abortControllersRef = useRef<Record<string, AbortController>>({});

  // Keep ref in sync to avoid stale closures in async callbacks
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
    
    // Abort pending requests for other conversations when navigating away
    if (activeConversationId) {
      Object.keys(abortControllersRef.current).forEach(convId => {
        if (convId !== activeConversationId) {
          abortControllersRef.current[convId].abort();
          delete abortControllersRef.current[convId];
        }
      });
    }
  }, [activeConversationId]);

  const [messages, setMessages] = useState<VmindMessage[]>([
    {
      id: 'init-1',
      sender: 'vm',
      text: 'Bonjour',
      time: '',
    },
  ]);

  useEffect(() => {
    // Initialisation du message et de l'heure de bienvenue uniquement côté client
    setMessages(prev => prev.map(m =>
      m.id === 'init-1' ? { 
        ...m, 
        text: getWelcomeMessage(),
        time: new Date().toLocaleTimeString('fr-FR', { hour12: false }) 
      } : m
    ));
  }, [activeAgentId]);

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
      time: formatTime(), rawDate: new Date().toISOString(),
    };

    const thinkingMessage: VmindMessage = {
      id: `thinking-${Date.now()}`,
      sender: 'vm',
      text: '',
      time: formatTime(), rawDate: new Date().toISOString(),
      isThinking: true,
    };

    setMessages((prev) => [...prev, userMessage, thinkingMessage]);

    // Capturer l'agent IMMÉDIATEMENT au moment du clic (ref = toujours à jour, pas de stale closure)
    const agentAtClickTime = activeAgentIdRef.current;

    try {
      let targetConvId = activeConversationId;
      if (!targetConvId) {
         targetConvId = await createNewConversation(agentAtClickTime, text);
         // Forcer le refresh pour avoir la nouvelle conv dans le state
         await refreshConversations();
      }

      // Résolution de l'agent : priorité à la base (source de vérité), fallback sur la capture du clic
      const currentConv = conversations.find(c => c.conversation_id === targetConvId);
      const effectiveAgentId = currentConv?.agent_id || agentAtClickTime;
      if (!currentConv || currentConv.title === 'Nouvelle discussion' || currentConv.title.endsWith('...')) {
        // Fire and forget
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        let token = localStorage.getItem("vmind_mcp_token") || localStorage.getItem("vmind_session");
        if (token && token.startsWith("{")) token = JSON.parse(token).token;
        
        fetch(`${baseUrl}/api/conversations/${targetConvId}/smart-title`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ message: text || text })
        })
        .then(res => res.json())
        .then(data => {
           if (data.ok && data.conversation) {
             updateConversationTitle(targetConvId, data.conversation.title);
           }
        })
        .catch(err => console.error("Smart title error", err));
      }

      const controller = new AbortController();
      abortControllersRef.current[targetConvId] = controller;
      let response = await sendVmindMessage(text, targetConvId, effectiveAgentId, clientId, controller.signal);
      delete abortControllersRef.current[targetConvId];

      if (activeConversationIdRef.current !== targetConvId) return;

      // Call bump
      bumpConversation(targetConvId);

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
          time: formatTime(), rawDate: new Date().toISOString(),
          error: response?.error || 'NO_RESPONSE',
          response_type: 'error',
          title: response?.title || 'Erreur n8n'
        }]);
      } else {
        const toolUsed = response.tool_used as string;

        setMessages((prev) => [...prev, {
          id: `vm-${Date.now()}`,
          sender: 'vm',
          text: response.message || 'Voici les informations demandées.',
          time: formatTime(), rawDate: new Date().toISOString(),
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
      if (error.name === 'AbortError') return;
      setMessages((prev) => prev.filter(m => !m.isThinking));
      setMessages((prev) => [...prev, {
        id: `err-${Date.now()}`,
        sender: 'vm',
        text: `Erreur de communication avec n8n : ${error.message}`,
        time: formatTime(), rawDate: new Date().toISOString(),
        error: error.message,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFastTrackClick = async (shortLabel: string) => {
    if (isLoading) return;
    
    const professionalMessage = FAST_TRACK_REGISTRY[shortLabel];
    if (!professionalMessage) return;

    setInput('');
    setIsLoading(true);

    const userMessage: VmindMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: professionalMessage,
      time: formatTime(), rawDate: new Date().toISOString(),
    };

    const thinkingMessage: VmindMessage = {
      id: `thinking-${Date.now()}`,
      sender: 'vm',
      text: '',
      time: formatTime(), rawDate: new Date().toISOString(),
      isThinking: true,
    };

    setMessages((prev) => [...prev, userMessage, thinkingMessage]);

    // Capturer l'agent IMMÉDIATEMENT au moment du clic (ref = toujours à jour)
    const agentAtClickTime = activeAgentIdRef.current;

    try {
      // Déclenche le Webhook n8n comme pour un message normal (via l'IA)
      let targetConvId = activeConversationId;
      if (!targetConvId) {
         targetConvId = await createNewConversation(agentAtClickTime, professionalMessage);
         await refreshConversations();
      }

      // Résolution de l'agent : priorité à la base (source de vérité), fallback sur la capture du clic
      const currentConv = conversations.find(c => c.conversation_id === targetConvId);
      const effectiveAgentId = currentConv?.agent_id || agentAtClickTime;

      if (!currentConv || currentConv.title === 'Nouvelle discussion' || currentConv.title.endsWith('...')) {
        // Fire and forget
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        let token = localStorage.getItem("vmind_mcp_token") || localStorage.getItem("vmind_session");
        if (token && token.startsWith("{")) token = JSON.parse(token).token;
        
        fetch(`${baseUrl}/api/conversations/${targetConvId}/smart-title`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ message: professionalMessage })
        })
        .then(res => res.json())
        .then(data => {
           if (data.ok && data.conversation) {
             updateConversationTitle(targetConvId, data.conversation.title);
           }
        })
        .catch(err => console.error("Smart title error", err));
      }

        const controller = new AbortController();
        abortControllersRef.current[targetConvId] = controller;
        let response = await sendVmindMessage(professionalMessage, targetConvId, effectiveAgentId, clientId, controller.signal);
        delete abortControllersRef.current[targetConvId];

        if (activeConversationIdRef.current !== targetConvId) return;

        // Call bump
        bumpConversation(targetConvId);

        setMessages((prev) => prev.filter(m => !m.isThinking));

        const isOk = response && (response.ok === true || (response.ok as any) === "true");

      if (!isOk) {
        setMessages((prev) => [...prev, {
          id: `err-${Date.now()}`,
          sender: 'vm',
          text: response?.message || 'Le service n8n n\'a pas renvoyé de réponse valide (ok=false).',
          time: formatTime(), rawDate: new Date().toISOString(),
          error: response?.error || 'NO_RESPONSE',
          response_type: 'error',
          title: response?.title || 'Erreur n8n'
        }]);
      } else {
        const toolUsed = response.tool_used as string;

        setMessages((prev) => [...prev, {
          id: `vm-${Date.now()}`,
          sender: 'vm',
          text: response.message || 'Voici les informations demandées.',
          time: formatTime(), rawDate: new Date().toISOString(),
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
        time: formatTime(), rawDate: new Date().toISOString(),
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
      time: formatTime(), rawDate: new Date().toISOString(),
    };

    const thinkingMessage: VmindMessage = {
      id: `thinking-${Date.now()}`,
      sender: 'vm',
      text: '',
      time: formatTime(), rawDate: new Date().toISOString(),
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
          time: formatTime(), rawDate: new Date().toISOString(),
          error: wrapper.error?.message || 'API_ERROR',
          response_type: 'error',
          title: 'Erreur API'
        }]);
      } else {
        // wrapper = { ok, data: { ...VmindN8nResponse } }
        // data contient le format standard identique à n8n
        const result = wrapper.data;
        const currentConv = conversations.find(c => c.conversation_id === activeConversationId);
        const effectiveAgentId = currentConv?.agent_id || activeAgentId;

        // No automatic agent change on tool execute

        setMessages((prev) => [...prev, {
          id: `vm-${Date.now()}`,
          sender: 'vm',
          text: result.message || 'Voici les informations demandées.',
          time: formatTime(), rawDate: new Date().toISOString(),
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
        time: formatTime(), rawDate: new Date().toISOString(),
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
            {Object.keys(VDATA_FAST_TRACK_REGISTRY).map((label) => (
              <button
                key={label}
                onClick={() => handleFastTrackClick(label)}
                className="suggestion-chip"
                style={{ flexShrink: 0 }}
                disabled={isLoading}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* VFIN Suggestions */}
        {activeAgentId === 'VFIN' && (
          <div className="suggestions-row mt-1 flex gap-2" style={{ overflowX: 'auto', flexWrap: 'nowrap', width: '100%', paddingTop: '8px', paddingBottom: '8px', scrollbarWidth: 'none' }}>
            {Object.keys(VFIN_FAST_TRACK_REGISTRY).map((label) => (
              <button
                key={label}
                onClick={() => handleFastTrackClick(label)}
                className="suggestion-chip"
                style={{ flexShrink: 0 }}
                disabled={isLoading}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* VSELL Suggestions */}
        {activeAgentId === 'VSELL' && (
          <div className="suggestions-row mt-1 flex gap-2" style={{ overflowX: 'auto', flexWrap: 'nowrap', width: '100%', paddingTop: '8px', paddingBottom: '8px', scrollbarWidth: 'none' }}>
            {Object.keys(VSELL_FAST_TRACK_REGISTRY).map((label) => (
              <button
                key={label}
                onClick={() => handleFastTrackClick(label)}
                className="suggestion-chip"
                style={{ flexShrink: 0 }}
                disabled={isLoading}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="text-[10px] text-cyan-500 animate-pulse mt-2">
            Analyse en cours...
          </div>
        )}
      </div>

      <div className="messages">
        {messages.map((msg, index) => {
            const isUser = msg.sender === 'user';
            const toolUsed = msg.tool_used as string;
            
            // Date logic
            let showDateHeader = false;
            let dateHeaderText = "";
            const currentFormattedDate = formatDateHeader(msg.rawDate);
            
            if (index === 0) {
              showDateHeader = true;
              dateHeaderText = currentFormattedDate;
            } else {
              const prevFormattedDate = formatDateHeader(messages[index - 1].rawDate);
              if (currentFormattedDate !== prevFormattedDate) {
                showDateHeader = true;
                dateHeaderText = currentFormattedDate;
              }
            }
            
            // Dynamic agent resolution based on current conversation
            const currentConv = conversations.find(c => c.conversation_id === activeConversationId);
            const agentId = currentConv?.agent_id || activeAgentId || 'VMIND';
            const agentData = agentId !== 'VMIND' ? (AGENTS as any)[agentId] : null;

          return (
            <React.Fragment key={msg.id}>
              {showDateHeader && (
                <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0 10px 0' }}>
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                    {dateHeaderText}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', width: '100%', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
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
            </React.Fragment>
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
