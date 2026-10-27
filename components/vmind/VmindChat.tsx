"use client";
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { VmindMessage } from '@/shared/types/vmind';
import { sendVmindMessage } from '@/shared/api/n8n-api';
import { ToolResultRenderer } from './renderers/ToolResultRenderer';
import { resolveAgentFromTool, AGENTS } from '@/shared/constants/data';
import { useConversations } from '@/shared/contexts/ConversationsContext';
import { useConnections } from '@/shared/contexts/ConnectionsContext';
import { useSkills } from '@/shared/contexts/SkillsContext';
import { importSkillMd } from '@/shared/api/skills-api';
import { VMindGuide } from '@/shared/management/components/VMindGuide';

interface VmindChatProps {
  initialPrompt?: string;
  onOpenVoice: () => void;
  clientId?: string;
  onAgentActive?: (agentId: string) => void;
  activeAgentId?: string;
}

const CONSOLIDATED_TOOL_DISPLAY_NAMES: Record<string, string> = {
  ping_db: 'Diagnostic Base de Données',
  list_tables: 'Schéma des Tables',
  run_readonly_query: 'Requête SQL Sécurisée',
  list_vd_files: 'Fichiers Vendeur TraLIS',
  list_e255_files: 'Fichiers Échange EDI E255',
  read_allowed_file: 'Lecture Document ERP',
  get_dossiers: 'Gestion des Dossiers d\'Exploitation',
  get_expeditions: 'Expéditions et Traçabilité',
  get_tiers: 'Répertoire Tiers & Clients',
  get_cotations: 'Cotations et Tarification',
  get_recouvrement_clients: 'Recouvrement & Encaissements Clients',
  get_factures_vente: 'Facturation Vente',
  get_invoice_pdf: 'Téléchargement Facture PDF',
  get_achats_fournisseurs: 'Achats & Factures Fournisseurs',
  get_commandes_achat: 'Commandes d\'Achat',
  get_kpi_dashboard: 'Tableau de Bord KPI',
};


const getToolDisplayName = (tool?: string | null) => {
  if (!tool) return '';
  const cleanTool = tool.replace(/^(MCP_)?[A-Za-z0-9]+_get_/, 'get_');
  return CONSOLIDATED_TOOL_DISPLAY_NAMES[cleanTool] || CONSOLIDATED_TOOL_DISPLAY_NAMES[tool] || tool.replace(/_/g, ' ');
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

const VBUY_FAST_TRACK_REGISTRY: Record<string, string> = {
  "Factures à régler (7j) ?": "Combien de factures fournisseurs sont à régler cette semaine ?",
  "Montant achats ce mois ?": "Quel est le montant total des achats ce mois ?",
  "Top 5 fournisseurs ?": "Quels sont les 5 principaux fournisseurs par volume d'achat ?",
  "Délais de livraison dépassés ?": "Quels fournisseurs ont des délais de livraison dépassés ?",
  "Commandes en attente de réception ?": "Quelles commandes fournisseurs sont en attente de réception ?",
  "Rpartition par catgorie (Trimestre) ?": "Quelle est la rpartition des achats par catgorie ce trimestre ?"
};

const VMOVE_FAST_TRACK_REGISTRY: Record<string, string> = {
  "Dossiers en acheminement ?": "Combien de dossiers sont en cours d'acheminement ?",
  "Dossiers en retard ETA ?": "Quels dossiers sont en retard par rapport à la date ETA ?",
  "Dossiers clients en cours ?": "Affiche les dossiers en cours par client",
  "Top transporteurs (Ponctualité) ?": "Quel transporteur a le meilleur taux de ponctualité ce mois ?",
  "Top ports (Retards) ?": "Quels sont les ports avec le plus de retards ce trimestre ?",
  "BL non facturés ?": "Combien de BL ne sont pas encore facturés ?"
};

const FAST_TRACK_REGISTRY: Record<string, string> = {
  ...VDATA_FAST_TRACK_REGISTRY,
  ...VFIN_FAST_TRACK_REGISTRY,
  ...VSELL_FAST_TRACK_REGISTRY,
  ...VBUY_FAST_TRACK_REGISTRY,
  ...VMOVE_FAST_TRACK_REGISTRY
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

/**
 * Detects if an assistant message (e.g. from /skill-assistant) contains a drafted SKILL.md block.
 */
const extractDraftedSkillMd = (text?: string): string | null => {
  if (!text || typeof text !== 'string') return null;
  // Check fenced markdown/yaml block containing SKILL.md YAML frontmatter
  const fencedMatch = text.match(/```(?:markdown|md|yaml)?\s*(---\r?\n[\s\S]*?\r?\n---\r?\n[\s\S]*?)```/i);
  if (fencedMatch && /name\s*:/i.test(fencedMatch[1]) && /description\s*:/i.test(fencedMatch[1])) {
    return fencedMatch[1].trim();
  }
  // Or direct raw frontmatter at the start of the message
  const rawMatch = text.trim().match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n[\s\S]+)$/);
  if (rawMatch && /name\s*:/i.test(rawMatch[1]) && /description\s*:/i.test(rawMatch[1])) {
    return rawMatch[1].trim();
  }
  return null;
};

export const VmindChat: React.FC<VmindChatProps> = ({
  initialPrompt,
  onOpenVoice,
  clientId = "DEMO",
  onAgentActive,
  activeAgentId = "VMIND"
}) => {
  const { activeConversationId, setActiveConversationId, createNewConversation, conversations, bumpConversation, updateConversationTitle, refreshConversations } = useConversations();
  const { activeConnection } = useConnections();
  const { activeSkills, refreshSkills } = useSkills();
  const [input, setInput] = useState('');
  const [cursorPos, setCursorPos] = useState<number>(0);
  const [slashDismissed, setSlashDismissed] = useState<boolean>(false);
  const inputTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [slashHighlightIdx, setSlashHighlightIdx] = useState<number>(0);
  const [hoveredSkillSlug, setHoveredSkillSlug] = useState<string | null>(null);
  const [savingDraftMsgId, setSavingDraftMsgId] = useState<string | null>(null);
  const [savedDraftSlugByMsgId, setSavedDraftSlugByMsgId] = useState<Record<string, string>>({});
  const [draftErrorByMsgId, setDraftErrorByMsgId] = useState<Record<string, string>>({});
  const [isErpConnected, setIsErpConnected] = useState<boolean>(false);
  const [allowedAgents, setAllowedAgents] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const handleSaveDraftedSkill = async (msgId: string, draftedMd: string) => {
    setSavingDraftMsgId(msgId);
    setDraftErrorByMsgId((prev) => {
      const next = { ...prev };
      delete next[msgId];
      return next;
    });
    try {
      const imported = await importSkillMd({
        content: draftedMd,
        scope: 'USER',
        comment: 'Saved from skill-assistant in chat',
      });
      await refreshSkills();
      setSavedDraftSlugByMsgId((prev) => ({ ...prev, [msgId]: imported.slug }));
    } catch (err: any) {
      setDraftErrorByMsgId((prev) => ({
        ...prev,
        [msgId]: err.message || 'Impossible d\'enregistrer ce skill.',
      }));
    } finally {
      setSavingDraftMsgId(null);
    }
  };

  const handleAgentReferralClick = (targetAgentId: string) => {
    // 1. Retrieve the last user question in the conversation history
    const lastUserMsg = messages.slice().reverse().find(m => m.sender === 'user');
    const promptToCopy = lastUserMsg?.text || '';

    // 2. Switch the active agent
    onAgentActive?.(targetAgentId);

    // 3. Reset active conversation to prepare a fresh session for the target agent
    setActiveConversationId(null);

    // 4. Pre-fill the chat input area with the question
    if (promptToCopy) {
      setInput(promptToCopy);
    }
  };

  const checkPermissions = (event?: any) => {
    if (typeof window === 'undefined') return;
    const sessionDetail = event?.detail;

    if (sessionDetail && sessionDetail.connected === true) {
      const user = sessionDetail.user || sessionDetail;
      if (user) {
        setCurrentUser(user);
        const roles = Array.isArray(user.roles) ? user.roles : (user.roles ? [user.roles] : []);
        setIsAdmin(roles.some((r: string) => ['Administrator', 'Administrators', 'Admin', 'Superusers'].includes(r)));
        const agents = sessionDetail.allowedAgents || user.allowedAgents;
        if (Array.isArray(agents)) {
          setAllowedAgents(agents);
        }
      }
      setIsErpConnected(true);
      return;
    }

    if (sessionDetail === null || sessionDetail?.connected === false) {
      setIsErpConnected(false);
      setAllowedAgents([]);
      if (sessionDetail?.user) {
        setCurrentUser(sessionDetail.user);
        const roles = Array.isArray(sessionDetail.user.roles) ? sessionDetail.user.roles : (sessionDetail.user.roles ? [sessionDetail.user.roles] : []);
        setIsAdmin(roles.some((r: string) => ['Administrator', 'Administrators', 'Admin', 'Superusers'].includes(r)));
      }
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://localhost:3001";
    fetch(`${baseUrl}/api/auth/vmind/me`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user) {
          setCurrentUser(data.user);
          const roles = Array.isArray(data.user.roles) ? data.user.roles : (data.user.roles ? [data.user.roles] : []);
          setIsAdmin(roles.some((r: string) => ['Administrator', 'Administrators', 'Admin', 'Superusers'].includes(r)));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    checkPermissions();
    window.addEventListener('mcp-session-updated', checkPermissions);
    return () => window.removeEventListener('mcp-session-updated', checkPermissions);
  }, []);

  const isAgentAllowed = isErpConnected && (isAdmin || allowedAgents.includes(activeAgentId));

  // Ref toujours synchrone → garantit la valeur EXACTE de l'agent au moment du clic
  const activeAgentIdRef = useRef<string>(activeAgentId);
  useEffect(() => {
    activeAgentIdRef.current = activeAgentId;
  }, [activeAgentId]);

  const getWelcomeMessage = () => {
    let fullName = "Utilisateur";
    if (currentUser) {
      const firstName = currentUser.first_name || '';
      const lastName = currentUser.last_name || '';
      if (firstName || lastName) {
        fullName = `${firstName} ${lastName}`.trim();
      } else if (currentUser.username) {
        fullName = currentUser.username;
      }
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
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://localhost:3001";

        const res = await fetch(`${baseUrl}/api/conversations/${activeConversationId}/messages`, {
          credentials: 'include'
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
    // Initialisation du message et de l'heure de bienvenue selon l'agent actif
    if (!activeConversationId) {
      setMessages([{ 
        id: 'init-1', 
        sender: 'vm', 
        text: getWelcomeMessage(),
        time: new Date().toLocaleTimeString('fr-FR', { hour12: false }) 
      }]);
    } else {
      setMessages(prev => prev.map(m =>
        m.id === 'init-1' ? { 
          ...m, 
          text: getWelcomeMessage(),
          time: new Date().toLocaleTimeString('fr-FR', { hour12: false }) 
        } : m
      ));
    }
  }, [activeAgentId, activeConversationId]);

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

    const skillsToSend = [...selectedSkills];
    setInput('');
    setSelectedSkills([]);
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
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://localhost:3001";
        fetch(`${baseUrl}/api/conversations/${targetConvId}/smart-title`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
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
      let response = await sendVmindMessage(
        text,
        targetConvId,
        effectiveAgentId,
        activeConnection?.client_id || clientId,
        controller.signal,
        activeConnection?.id,
        skillsToSend
      );

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

      const detailsStr = typeof response?.details === 'string' 
        ? response.details 
        : JSON.stringify(response?.details || '');
      const textStr = typeof response?.text === 'string' ? response.text : '';
      const messageStr = typeof response?.message === 'string' ? response.message : '';

      const isForbidden = 
        response?.error === 'FORBIDDEN' ||
        response?.error === 'FORBIDDEN_TOOL_EXECUTION' ||
        response?.error === 'UNAUTHORIZED_TOOL_EXECUTION' ||
        detailsStr.includes('FORBIDDEN_TOOL_EXECUTION') ||
        detailsStr.includes('UNAUTHORIZED_TOOL_EXECUTION') ||
        detailsStr.includes('status": "unauthorized') ||
        detailsStr.includes('status":"unauthorized') ||
        detailsStr.includes("Vous n'avez pas les permissions nécessaires") ||
        textStr.includes('FORBIDDEN_TOOL_EXECUTION') ||
        messageStr.includes('FORBIDDEN_TOOL_EXECUTION');

      if (isForbidden) {
        const agentName = effectiveAgentId || activeAgentId || 'cet agent';
        setMessages((prev) => [...prev, {
          id: `vm-${Date.now()}`,
          sender: 'vm',
          text: `ℹ️ Vous n'avez pas l'autorisation d'accéder aux données Erp en direct pour l'agent ${agentName}. Je reste à votre disposition pour toute question méthodologique ou conseil métier dans ce domaine.`,
          time: formatTime(), rawDate: new Date().toISOString(),
          tool_used: null,
          response_type: 'full',
          title: 'Accès restreint',
          kpis: [],
          table: { columns: [], rows: [] },
          chart: { type: null, title: '', description: '', xKey: '', yKey: '', data: [] },
          details: null
        }]);
      } else if (!isOk) {
        setMessages((prev) => [...prev, {
          id: `err-${Date.now()}`,
          sender: 'vm',
          text: response?.message || 'Erreur de traitement. Veuillez relancer la demande d\'analyse.',
          time: formatTime(), rawDate: new Date().toISOString(),
          error: response?.error || 'NO_RESPONSE',
          response_type: 'error',
          title: response?.title || 'Erreur d\'analyse'
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
          skills_used: Array.isArray((response as any).skills_used) ? (response as any).skills_used : undefined,
          error: response.error
        }]);
      }

    } catch (error: any) {
      setMessages((prev) => prev.filter(m => !m.isThinking));
      if (error.name === 'AbortError') return;
      setMessages((prev) => [...prev, {
        id: `err-${Date.now()}`,
        sender: 'vm',
        text: error?.message || 'Erreur de connexion. Le service d\'analyse est temporairement inaccessible.',
        time: formatTime(), rawDate: new Date().toISOString(),
        error: error.message,
      }]);
    } finally {
      setIsLoading(false);
      setMessages((prev) => prev.filter(m => !m.isThinking));
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
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://localhost:3001";
        fetch(`${baseUrl}/api/conversations/${targetConvId}/smart-title`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
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
          text: response?.message || 'Erreur de traitement. Veuillez relancer la demande d\'analyse.',
          time: formatTime(), rawDate: new Date().toISOString(),
          error: response?.error || 'NO_RESPONSE',
          response_type: 'error',
          title: response?.title || 'Erreur d\'analyse'
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
      if (error.name === 'AbortError') return;
      setMessages((prev) => [...prev, {
        id: `err-${Date.now()}`,
        sender: 'vm',
        text: error?.message || 'Erreur de connexion. Le service d\'analyse est temporairement inaccessible.',
        time: formatTime(), rawDate: new Date().toISOString(),
        error: error.message,
      }]);
    } finally {
      setIsLoading(false);
      setMessages((prev) => prev.filter(m => !m.isThinking));
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
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://localhost:3001";
      const response = await fetch(`${baseUrl}${toolEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
          tool_used: result.tool_used || 'get_dossiers',
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

  // Slash-command autocomplete matching at the start, in the middle, or at the end of the input
  const slashMatchInfo = (() => {
    const effectiveCursor = cursorPos > 0 && cursorPos <= input.length ? cursorPos : input.length;
    const textBeforeCursor = input.slice(0, effectiveCursor);
    const matchBeforeCursor = textBeforeCursor.match(/(?:^|\s)\/([a-zA-Z0-9-]*)$/);
    if (matchBeforeCursor && matchBeforeCursor.index !== undefined) {
      const fullMatch = matchBeforeCursor[0];
      const slashOffset = fullMatch.indexOf('/');
      const tokenStart = matchBeforeCursor.index + slashOffset;
      return {
        query: matchBeforeCursor[1].toLowerCase(),
        start: tokenStart,
        end: effectiveCursor,
      };
    }

    const matchAtEnd = input.match(/(?:^|\s)\/([a-zA-Z0-9-]*)$/);
    if (matchAtEnd && matchAtEnd.index !== undefined) {
      const fullMatch = matchAtEnd[0];
      const slashOffset = fullMatch.indexOf('/');
      const tokenStart = matchAtEnd.index + slashOffset;
      return {
        query: matchAtEnd[1].toLowerCase(),
        start: tokenStart,
        end: input.length,
      };
    }

    return null;
  })();

  // Flatten activeSkills + their modular sub-skills for slash autocomplete
  const searchableSkillItems = useMemo(() => {
    const items: Array<{
      id: number | string;
      slug: string;
      displaySlug: string;
      title: string;
      description: string;
      scope: string;
      erp_type?: string | null;
      parentSlug?: string;
    }> = [];

    for (const s of activeSkills) {
      // 1. Top-level skill entry
      items.push({
        id: s.id,
        slug: s.slug,
        displaySlug: s.slug,
        title: s.title,
        description: s.description,
        scope: s.scope,
        erp_type: s.erp_type,
      });

      // 2. Any folder containing a SKILL.md (Claude standard specification)
      if (Array.isArray(s.sub_skills) && s.sub_skills.length > 0) {
        for (const sub of s.sub_skills) {
          items.push({
            id: `${s.id}-${sub.slug}`,
            slug: s.slug,
            displaySlug: sub.slug,
            title: sub.title,
            description: sub.description,
            scope: s.scope,
            erp_type: s.erp_type,
            parentSlug: s.slug,
          });
        }
      } else if (Array.isArray(s.references)) {
        // Fallback: any folder containing a SKILL.md is treated as a skill
        for (const ref of s.references) {
          const match = ref.match(/(?:^|\/)([^/]+)\/(?:SKILL|skill)\.md$/i);
          if (match) {
            const folderSlug = match[1];
            const title = folderSlug
              .split('-')
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ');
            items.push({
              id: `${s.id}-${folderSlug}`,
              slug: s.slug,
              displaySlug: folderSlug,
              title,
              description: `Compétence ${title} incluse dans ${s.title}`,
              scope: s.scope,
              erp_type: s.erp_type,
              parentSlug: s.slug,
            });
          }
        }
      }
    }

    return items;
  }, [activeSkills]);

  const normalizeSearch = (t: string) =>
    (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const slashQuery = slashMatchInfo ? slashMatchInfo.query : null;
  const normalizedQuery = slashQuery !== null ? normalizeSearch(slashQuery) : '';

  const slashSuggestions = slashQuery !== null
    ? searchableSkillItems.filter(
        (item) => {
          const itemKey = item.displaySlug || item.slug;
          if (selectedSkills.includes(itemKey) || selectedSkills.includes(item.slug)) return false;
          if (item.parentSlug && selectedSkills.includes(item.parentSlug)) return false;

          return (
            normalizeSearch(item.displaySlug).includes(normalizedQuery) ||
            normalizeSearch(item.slug).includes(normalizedQuery) ||
            normalizeSearch(item.title).includes(normalizedQuery) ||
            normalizeSearch(item.description).includes(normalizedQuery)
          );
        }
      )
    : [];
  const showSlashMenu = !slashDismissed && slashQuery !== null && selectedSkills.length < 3;

  const selectSlashSkill = (slug: string) => {
    if (selectedSkills.length >= 3 || selectedSkills.includes(slug)) return;
    setSelectedSkills((prev) => [...prev, slug].slice(0, 3));
    if (slashMatchInfo) {
      const before = input.slice(0, slashMatchInfo.start);
      const after = input.slice(slashMatchInfo.end);
      const nextInput =
        before.endsWith(' ') && after.startsWith(' ') ? before + after.slice(1) : before + after;
      setInput(nextInput);
      const nextCaret = before.length;
      setCursorPos(nextCaret);
      setTimeout(() => {
        if (inputTextareaRef.current) {
          inputTextareaRef.current.focus();
          inputTextareaRef.current.setSelectionRange(nextCaret, nextCaret);
        }
      }, 0);
    } else {
      setInput('');
      setCursorPos(0);
    }
    setSlashHighlightIdx(0);
    setSlashDismissed(false);
    setHoveredSkillSlug(null);
  };

  const removeSelectedSkill = (slug: string) => {
    setSelectedSkills((prev) => prev.filter((s) => s !== slug));
    setHoveredSkillSlug((prev) => (prev === slug ? null : prev));
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlashMenu) {
      if (e.key === 'ArrowDown' && slashSuggestions.length > 0) {
        e.preventDefault();
        const nextIdx = (slashHighlightIdx + 1) % slashSuggestions.length;
        setSlashHighlightIdx(nextIdx);
        const nextSlug = slashSuggestions[nextIdx]?.displaySlug || slashSuggestions[nextIdx]?.slug || null;
        setHoveredSkillSlug(nextSlug);
        return;
      }
      if (e.key === 'ArrowUp' && slashSuggestions.length > 0) {
        e.preventDefault();
        const nextIdx = (slashHighlightIdx - 1 + slashSuggestions.length) % slashSuggestions.length;
        setSlashHighlightIdx(nextIdx);
        const nextSlug = slashSuggestions[nextIdx]?.displaySlug || slashSuggestions[nextIdx]?.slug || null;
        setHoveredSkillSlug(nextSlug);
        return;
      }
      if ((e.key === 'Enter' || e.key === 'Tab') && slashSuggestions.length > 0) {
        e.preventDefault();
        const chosen = slashSuggestions[slashHighlightIdx] || slashSuggestions[0];
        if (chosen) selectSlashSkill(chosen.displaySlug || chosen.slug);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSlashDismissed(true);
        setHoveredSkillSlug(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      await handleSend();
    }
  };

  const currentAgentData = activeAgentId !== 'VMIND' ? (AGENTS as any)[activeAgentId] : null;
  const agentColor = currentAgentData ? currentAgentData.color : '#00f0ff';
  const agentBgColor = currentAgentData ? currentAgentData.bgColor : 'rgba(0, 240, 255, 0.08)';
  const agentBorderColor = currentAgentData ? currentAgentData.borderColor : 'rgba(0, 240, 255, 0.25)';

  return (
    <div className="chat-panel flex flex-col h-full bg-[#0b101e]">
      <div className="chat-header flex-shrink-0" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Header top row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

          {/* Status dot */}
          <div style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: agentColor,
            boxShadow: `0 0 8px ${agentColor}`,
            flexShrink: 0,
          }} />

          {/* Agent name */}
          <span style={{
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: agentColor,
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
            background: agentBgColor,
            color: agentColor,
            border: `1px solid ${agentBorderColor}`,
            textTransform: 'uppercase',
          }}>
            ASSISTANT
          </span>
        </div>


        {/* Suggestions Zone (visible only when ERP connected & agent allowed) */}
        {isAgentAllowed && (
          <>
            {activeAgentId === 'VDATA' && (
              <div className="suggestions-row mt-1 flex gap-2" style={{ overflowX: 'auto', flexWrap: 'nowrap', width: '100%', paddingTop: '8px', paddingBottom: '8px', scrollbarWidth: 'none' }}>
                {Object.keys(VDATA_FAST_TRACK_REGISTRY).map((label) => (
                  <button
                    key={label}
                    onClick={() => handleFastTrackClick(label)}
                    className="suggestion-chip"
                    style={{
                      flexShrink: 0,
                      background: agentBgColor,
                      color: agentColor,
                      borderColor: agentBorderColor,
                      boxShadow: `0 0 10px ${agentColor}20`,
                    }}
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
                    style={{
                      flexShrink: 0,
                      background: agentBgColor,
                      color: agentColor,
                      borderColor: agentBorderColor,
                      boxShadow: `0 0 10px ${agentColor}20`,
                    }}
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
                    style={{
                      flexShrink: 0,
                      background: agentBgColor,
                      color: agentColor,
                      borderColor: agentBorderColor,
                      boxShadow: `0 0 10px ${agentColor}20`,
                    }}
                    disabled={isLoading}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* VBUY Suggestions */}
            {activeAgentId === 'VBUY' && (
              <div className="suggestions-row mt-1 flex gap-2" style={{ overflowX: 'auto', flexWrap: 'nowrap', width: '100%', paddingTop: '8px', paddingBottom: '8px', scrollbarWidth: 'none' }}>
                {Object.keys(VBUY_FAST_TRACK_REGISTRY).map((label) => (
                  <button
                    key={label}
                    onClick={() => handleFastTrackClick(label)}
                    className="suggestion-chip"
                    style={{
                      flexShrink: 0,
                      background: agentBgColor,
                      color: agentColor,
                      borderColor: agentBorderColor,
                      boxShadow: `0 0 10px ${agentColor}20`,
                    }}
                    disabled={isLoading}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* VMOVE Suggestions */}
            {activeAgentId === 'VMOVE' && (
              <div className="suggestions-row mt-1 flex gap-2" style={{ overflowX: 'auto', flexWrap: 'nowrap', width: '100%', paddingTop: '8px', paddingBottom: '8px', scrollbarWidth: 'none' }}>
                {Object.keys(VMOVE_FAST_TRACK_REGISTRY).map((label) => (
                  <button
                    key={label}
                    onClick={() => handleFastTrackClick(label)}
                    className="suggestion-chip"
                    style={{
                      flexShrink: 0,
                      background: agentBgColor,
                      color: agentColor,
                      borderColor: agentBorderColor,
                      boxShadow: `0 0 10px ${agentColor}20`,
                    }}
                    disabled={isLoading}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {isLoading && (
          <div className="text-[10px] animate-pulse mt-2 font-medium tracking-wide" style={{ color: agentColor }}>
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
                          background: agentData.bgColor || 'rgba(0,240,255,0.08)',
                          color: agentData.color || '#00f0ff',
                          boxShadow: `0 0 12px ${agentData.color ? agentData.color + '40' : 'rgba(0,240,255,0.2)'}`,
                          border: `1px solid ${agentData.color ? agentData.color + '60' : 'rgba(0,240,255,0.3)'}`,
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

                  {/* Agent label & optional skills_used badge */}
                  {(msg.tool_used || (Array.isArray(msg.skills_used) && msg.skills_used.length > 0)) && (
                    <div className="flex flex-wrap items-center gap-1.5 px-1">
                      {msg.tool_used && (
                        <span className="text-[9px] uppercase tracking-widest font-bold" style={{ color: agentData ? agentData.color : '#00f0ff' }}>
                          AGENT ACTIF : {agentId} — {getToolDisplayName(toolUsed)}
                        </span>
                      )}
                      {Array.isArray(msg.skills_used) && msg.skills_used.map((item: any, idx: number) => {
                        const skillSlug = typeof item === 'string' ? item : item?.slug || `skill-${idx}`;
                        const msgColor = agentData?.color || agentColor;
                        return (
                          <span
                            key={`${skillSlug}-${idx}`}
                            style={{
                              fontSize: '9px',
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: `${msgColor}18`,
                              color: msgColor,
                              border: `1px solid ${msgColor}45`,
                            }}
                          >
                            /{skillSlug}
                          </span>
                        );
                      })}
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
                              border: `1px solid ${agentData.color ? agentData.color + '50' : 'rgba(0,240,255,0.25)'}`,
                              borderRadius: '4px 16px 16px 16px',
                              padding: '10px 14px',
                              color: '#d1faf6',
                              fontSize: '13px',
                              lineHeight: '1.55',
                              boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px ${agentData.color ? agentData.color + '18' : 'rgba(0,240,255,0.08)'}, inset 0 0 16px ${agentData.color ? agentData.color + '0a' : 'rgba(0,240,255,0.04)'}`,
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
                    ) : msg.isThinking ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '2px 4px' }}>
                        <style>{`
                          @keyframes premium-bounce {
                            0%, 80%, 100% { 
                              transform: translateY(0) scale(0.8); 
                              opacity: 0.4;
                              box-shadow: 0 0 0 rgba(0, 229, 200, 0);
                            }
                            40% { 
                              transform: translateY(-4px) scale(1.1); 
                              opacity: 1;
                              box-shadow: 0 0 8px rgba(0, 229, 200, 0.8);
                            }
                          }
                          .premium-dot {
                            width: 5px;
                            height: 5px;
                            background-color: #00E5C8;
                            border-radius: 50%;
                            animation: premium-bounce 1.4s infinite ease-in-out both;
                          }
                          .premium-dot:nth-child(1) { animation-delay: -0.32s; }
                          .premium-dot:nth-child(2) { animation-delay: -0.16s; }
                          .premium-dot:nth-child(3) { animation-delay: 0s; }
                        `}</style>
                        <span style={{ 
                          color: '#00E5C8', 
                          fontSize: '13px', 
                          fontWeight: 500, 
                          letterSpacing: '0.5px',
                          textShadow: '0 0 10px rgba(0, 229, 200, 0.4)'
                        }} className="animate-pulse">
                          L'agent réfléchit
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <div className="premium-dot"></div>
                          <div className="premium-dot"></div>
                          <div className="premium-dot"></div>
                        </div>
                      </div>
                    ) : (
                      <ToolResultRenderer message={msg} onAgentClick={handleAgentReferralClick} />
                    )}
                  </div>

                  {/* "Save as Skill" button when skill-assistant drafts a SKILL.md */}
                  {!isUser && !msg.isThinking && (() => {
                    const draftedMd = extractDraftedSkillMd(msg.text);
                    if (!draftedMd) return null;
                    const savedSlug = savedDraftSlugByMsgId[msg.id];
                    const isSaving = savingDraftMsgId === msg.id;
                    const draftError = draftErrorByMsgId[msg.id];
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 4px', marginTop: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {savedSlug ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '5px 11px',
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                background: 'rgba(16, 185, 129, 0.14)',
                                color: '#6ee7b7',
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                              }}
                            >
                              ✓ Enregistré dans vos skills personnels : /{savedSlug}
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => handleSaveDraftedSkill(msg.id, draftedMd)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                background: 'rgba(0, 229, 200, 0.14)',
                                color: '#00E5C8',
                                border: '1px solid rgba(0, 229, 200, 0.4)',
                                cursor: isSaving ? 'not-allowed' : 'pointer',
                                opacity: isSaving ? 0.5 : 1,
                              }}
                            >
                              {isSaving ? 'Enregistrement...' : '✨ Enregistrer comme Skill personnel'}
                            </button>
                          )}
                        </div>
                        {draftError && (
                          <span style={{ fontSize: '11px', color: '#f87171' }}>
                            {draftError}
                          </span>
                        )}
                      </div>
                    );
                  })()}

                  {/* Timestamp */}
                  <div
                    className="font-mono px-1"
                    style={{
                      fontSize: '9px',
                      color: isUser ? 'rgba(139,92,246,0.5)' : (agentData ? `${agentData.color}80` : 'rgba(0,240,255,0.3)'),
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

      <div
        className="input-bar relative p-4 border-t border-[#1c2538] bg-[#0b101e] flex-shrink-0"
        style={{ position: 'relative' }}
      >
        {/* Slash-command autocomplete dropdown */}
        {showSlashMenu && (
          <div
            style={{
              position: 'absolute',
              left: '24px',
              right: '24px',
              bottom: 'calc(100% + 10px)',
              background: 'linear-gradient(165deg, rgba(13, 22, 40, 0.98) 0%, rgba(8, 13, 25, 0.99) 100%)',
              border: `1px solid ${agentColor}55`,
              borderRadius: '14px',
              boxShadow: `0 20px 50px rgba(0, 0, 0, 0.75), 0 0 25px ${agentColor}22`,
              backdropFilter: 'blur(16px)',
              overflow: 'hidden',
              zIndex: 50,
            }}
          >
            {/* Header bar */}
            <div
              style={{
                padding: '9px 14px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
                background: `${agentColor}12`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: agentColor,
                    boxShadow: `0 0 8px ${agentColor}`,
                  }}
                />
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: agentColor,
                  }}
                >
                  Skills de mon espace ({slashSuggestions.length})
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10.5px', color: '#64748b' }}>
                <span>↑↓ Naviguer</span>
                <span>·</span>
                <span>↵ Sélectionner</span>
                <span>·</span>
                <span>Échap Fermer</span>
              </div>
            </div>

            {/* Skill items list */}
            {slashSuggestions.length === 0 ? (
              <div
                style={{
                  padding: '16px 14px',
                  fontSize: '12px',
                  color: '#8FA3B8',
                  textAlign: 'center',
                }}
              >
                {activeSkills.length === 0
                  ? 'Aucun skill actif dans votre espace. Allez dans Skills Hub → Catalogue & Découverte et cliquez sur "+ Ajouter à mon espace".'
                  : `Aucun skill actif ne correspond à "/${slashQuery}".`}
              </div>
            ) : (
            <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {slashSuggestions.map((skill, idx) => {
                const isHighlighted = idx === slashHighlightIdx;
                const activeSlug = skill.displaySlug || skill.slug;
                const isSubSkill = Boolean(skill.parentSlug);
                const scopeColor = isSubSkill
                  ? { text: agentColor, bg: `${agentColor}18`, border: `${agentColor}45`, label: 'Sous-skill' }
                  : skill.scope === 'USER'
                    ? { text: '#c084fc', bg: 'rgba(192, 132, 252, 0.14)', border: 'rgba(192, 132, 252, 0.35)', label: 'Personnel' }
                    : skill.scope === 'ERP'
                      ? { text: agentColor, bg: `${agentColor}18`, border: `${agentColor}45`, label: skill.erp_type ? `ERP · ${skill.erp_type.toUpperCase()}` : 'ERP' }
                      : skill.scope === 'TENANT'
                        ? { text: '#38bdf8', bg: 'rgba(56, 189, 248, 0.14)', border: 'rgba(56, 189, 248, 0.35)', label: 'Organisation' }
                        : { text: '#94a3b8', bg: 'rgba(148, 163, 184, 0.14)', border: 'rgba(148, 163, 184, 0.3)', label: 'Plateforme' };

                return (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => selectSlashSkill(activeSlug)}
                    onMouseEnter={() => {
                      setSlashHighlightIdx(idx);
                      setHoveredSkillSlug(activeSlug);
                    }}
                    onMouseLeave={() => {
                      setHoveredSkillSlug((prev) => (prev === activeSlug ? null : prev));
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      background: isHighlighted
                        ? `linear-gradient(90deg, ${agentColor}24 0%, ${agentColor}08 100%)`
                        : 'transparent',
                      border: 'none',
                      borderLeft: isHighlighted ? `3px solid ${agentColor}` : '3px solid transparent',
                      borderBottom:
                        idx < slashSuggestions.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          color: agentColor,
                          background: `${agentColor}18`,
                          border: `1px solid ${agentColor}48`,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          flexShrink: 0,
                        }}
                      >
                        /{activeSlug}
                      </span>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#ffffff',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {skill.title}
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: '9.5px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        padding: '3px 8px',
                        borderRadius: '99px',
                        color: scopeColor.text,
                        background: scopeColor.bg,
                        border: `1px solid ${scopeColor.border}`,
                        flexShrink: 0,
                      }}
                    >
                      {scopeColor.label}
                    </span>
                  </button>
                );
              })}
            </div>
            )}
          </div>
        )}

        {/* VMindGuide floating description popup on skill hover (SS2 style, matching agentColor) */}
        {(() => {
          const guideSkill = hoveredSkillSlug
            ? searchableSkillItems.find((s) => (s.displaySlug || s.slug) === hoveredSkillSlug) ||
              activeSkills.find((s) => s.slug === hoveredSkillSlug) ||
              null
            : null;
          return (
            <VMindGuide
              isOpen={Boolean(guideSkill)}
              mood="curious"
              customColor={agentColor}
              title={
                guideSkill
                  ? `/${(guideSkill as any).displaySlug || guideSkill.slug} · ${guideSkill.title}`
                  : undefined
              }
              message={guideSkill ? guideSkill.description : null}
              onClose={() => setHoveredSkillSlug(null)}
            />
          );
        })()}

        {/* Selected skill chips (up to 3) */}
        {selectedSkills.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#64748b',
                fontWeight: 700,
                marginRight: '4px',
              }}
            >
              Skills actifs ({selectedSkills.length}/3) :
            </span>
            {selectedSkills.map((slug) => {
              const matchedItem = searchableSkillItems.find((s) => (s.displaySlug || s.slug) === slug);
              const label = matchedItem ? (matchedItem.displaySlug || matchedItem.slug) : slug;
              return (
                <span
                  key={slug}
                  onMouseEnter={() => setHoveredSkillSlug(slug)}
                  onMouseLeave={() => setHoveredSkillSlug((prev) => (prev === slug ? null : prev))}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '3px 10px',
                    borderRadius: '99px',
                    fontSize: '11.5px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    background: `${agentColor}22`,
                    color: agentColor,
                    border: `1px solid ${agentColor}60`,
                    cursor: 'pointer',
                  }}
                >
                  /{label}
                  <button
                    type="button"
                    onClick={() => removeSelectedSkill(slug)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: agentColor,
                      fontWeight: 800,
                      fontSize: '13px',
                      lineHeight: 1,
                      padding: 0,
                      cursor: 'pointer',
                    }}
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}

        <div
          className="input-wrap relative flex items-center bg-[#151b2b] rounded-xl border transition-all duration-200"
          style={{
            borderColor: input.trim() ? `${agentColor}60` : `${agentColor}30`,
            boxShadow: input.trim() ? `0 0 12px ${agentColor}20` : 'none',
          }}
        >
          <textarea
            ref={inputTextareaRef}
            className="input-field w-full bg-transparent pl-4 pr-[100px] text-sm text-gray-200 placeholder-gray-500 outline-none resize-none"
            style={{ 
              paddingTop: '16px', 
              paddingBottom: '16px', 
              lineHeight: '20px',
              minHeight: '52px',
              height: '52px',
              maxHeight: '120px',
              overflowY: 'auto'
            }}
            placeholder="Posez votre question métier (tapez / pour activer un skill)..."
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setCursorPos(e.target.selectionStart ?? e.target.value.length);
              setSlashDismissed(false);
              setSlashHighlightIdx(0);
              e.target.style.height = '52px';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onClick={(e) => {
              setCursorPos(e.currentTarget.selectionStart ?? e.currentTarget.value.length);
            }}
            onKeyUp={(e) => {
              if (!['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
                setCursorPos(e.currentTarget.selectionStart ?? e.currentTarget.value.length);
              }
            }}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />

          <div className="input-actions absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            <button
              type="button"
              className="voice-btn relative flex items-center justify-center transition-all duration-200"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${agentColor}15 0%, rgba(10,14,23,0.85) 100%)`,
                border: `1.5px solid ${agentColor}`,
                boxShadow: `0 0 10px ${agentColor}35, inset 0 0 8px ${agentColor}15`,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.45 : 1,
              }}
              onClick={onOpenVoice}
              disabled={isLoading}
            >
              <svg
                viewBox="0 0 24 24"
                style={{
                  width: '18px',
                  height: '18px',
                  fill: 'none',
                  stroke: agentColor,
                  strokeWidth: '2',
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round',
                  filter: `drop-shadow(0 0 4px ${agentColor}80)`
                }}
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" fill={`${agentColor}35`} />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </button>
            <button
              type="button"
              className="send-btn relative flex items-center justify-center transition-all duration-200"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: input.trim() && !isLoading
                  ? `linear-gradient(135deg, ${agentColor}25 0%, rgba(10,14,23,0.9) 100%)`
                  : 'rgba(10, 14, 23, 0.7)',
                border: `1.5px solid ${input.trim() && !isLoading ? agentColor : `${agentColor}40`}`,
                boxShadow: input.trim() && !isLoading
                  ? `0 0 14px ${agentColor}45, inset 0 0 10px ${agentColor}20`
                  : `0 0 6px ${agentColor}15`,
                cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                opacity: input.trim() && !isLoading ? 1 : 0.45,
              }}
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
            >
              <svg
                viewBox="0 0 24 24"
                style={{
                  width: '20px',
                  height: '20px',
                  fill: agentColor,
                  stroke: agentColor,
                  strokeWidth: '1.2px',
                  strokeLinejoin: 'round',
                  strokeLinecap: 'round',
                  filter: input.trim() && !isLoading ? `drop-shadow(0 0 5px ${agentColor}90)` : 'none',
                  transform: 'rotate(-5deg) translateY(-1px)',
                }}
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
