import { useState, useCallback, useRef, useEffect } from 'react';
import { Message, LogEntry } from '../types';
import { RESPONSES } from '../constants/data';

interface UseChatReturn {
  messages: Message[];
  addMessage: (text: string) => void;
  clearChat: () => void;
  logs: LogEntry[];
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'vm',
      agent: 'VMIND',
      text: 'Bonjour Ahmed. Je suis prêt. Vos données TraLIS sont synchronisées en temps réel.<br><br>Que souhaitez-vous analyser aujourd\'hui ? Chiffre d\'affaires, trésorerie, dossiers transport, ou performance commerciale ?',
      time: '09:02:14',
      meta: 'TraLIS sync OK · Latence 340ms'
    }
  ]);

  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 'l1', time: '09:06:14', agent: 'VMOVE', action: '43 dossiers consultés' },
    { id: 'l2', time: '09:04:36', agent: 'VFIN', action: 'CA mensuel extrait' },
    { id: 'l3', time: '09:02:14', agent: 'VMIND', action: 'Session initialisée' },
    { id: 'l4', time: '09:01:50', agent: 'TraLIS', action: 'Sync confirmée' }
  ]);

  const addLog = useCallback((agent: string, action: string) => {
    setLogs(prev => {
      const newLog: LogEntry = {
        id: Math.random().toString(36).substr(2, 9),
        time: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
        agent,
        action
      };
      const updated = [newLog, ...prev];
      return updated.slice(0, 8);
    });
  }, []);

  const getResponse = (msg: string) => {
    const text = msg.toLowerCase();
    if (text.includes('trésorerie') || text.includes('tresorerie') || (text.includes('cash') && !text.includes('forecast')))
      return RESPONSES['trésorerie'];
    if (text.includes('top client') || text.includes('meilleur client') || text.includes('client'))
      return RESPONSES['top clients'];
    if (text.includes('bl') || text.includes('bon de livraison')) return RESPONSES['bl'];
    if (text.includes('impayé') || text.includes('impaye')) return RESPONSES['impayés'];
    if (text.includes('forecast') || text.includes('prévision')) return RESPONSES['cash forecast'];
    if (text.includes('transport') || text.includes('dossier') || text.includes('retard') || text.includes('livraison'))
      return RESPONSES['dossiers transport'];
    if (text.includes('stock')) return RESPONSES['stocks'];
    if (text.includes('achat') || text.includes('fournisseur')) return RESPONSES['achats'];
    if (text.includes('analys') || text.includes('tableau de bord') || text.includes('situation'))
      return RESPONSES['analyse'];
    
    return {
      agent: 'VDATA',
      text: 'Je comprends votre demande. Pour vous fournir une réponse précise, pourriez-vous préciser la période ou le domaine concerné (Finance, Operations, Commercial, Transport) ?<br><br>Vous pouvez utiliser les raccourcis ci-dessous pour des requêtes fréquentes.',
      kpis: []
    };
  };

  const addMessage = useCallback((text: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString('fr-FR', { hour12: false })
    };

    setMessages(prev => [...prev, userMsg]);

    // Thinking placeholder
    const thinkingId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: thinkingId,
      sender: 'vm',
      text: '',
      time: '',
      isThinking: true
    }]);

    setTimeout(() => {
      const resp = getResponse(text);
      const latency = (1.4 + Math.random() * 1.2).toFixed(1);
      
      const botMsg: Message = {
        id: (Date.now() + 2).toString(),
        sender: 'vm',
        agent: resp.agent,
        text: resp.text,
        time: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
        meta: `${new Date().toLocaleTimeString('fr-FR', { hour12: false })} · ${resp.agent} · TraLIS · ${latency}s`,
        kpis: resp.kpis
      };

      setMessages(prev => prev.filter(m => m.id !== thinkingId).concat(botMsg));
      addLog(resp.agent, `Requête traitée — ${latency}s`);
    }, 1500 + Math.random() * 500);
  }, [addLog]);

  const clearChat = useCallback(() => {
    setMessages([{
      id: 'clear',
      sender: 'vm',
      agent: 'VMIND',
      text: 'Conversation réinitialisée. Que souhaitez-vous analyser ?',
      time: new Date().toLocaleTimeString('fr-FR', { hour12: false })
    }]);
  }, []);

  return { messages, addMessage, clearChat, logs };
}
