import { useState, useCallback, useRef, useEffect } from 'react';
import { Message, LogEntry } from '../types';
import { tralisApi } from '../api/tralis-api';

interface UseChatReturn {
  messages: Message[];
  addMessage: (text: string) => void;
  clearChat: () => void;
  logs: LogEntry[];
}

const DEFAULT_CLIENT_ID = process.env.NEXT_PUBLIC_CLIENT_ID || 'DEMO';

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'vm',
      agent: 'VMIND',
      text: 'Bonjour Ahmed. Je suis prêt. Vos données TraLIS sont synchronisées en temps réel.<br><br>Que souhaitez-vous analyser aujourd\'hui ? Chiffre d\'affaires, trésorerie, dossiers transport, ou performance commerciale ?',
      time: '09:02:14',
      meta: 'TraLIS sync OK'
    }
  ]);

  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 'l1', time: '09:06:14', agent: 'VMOVE', action: 'Session ERP active' },
    { id: 'l2', time: '09:02:14', agent: 'VMIND', action: 'Initialisation système' }
  ]);

  const addLog = useCallback((agent: string, action: string) => {
    setLogs(prev => {
      const newLog: LogEntry = {
        id: Math.random().toString(36).substr(2, 9),
        time: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
        agent,
        action
      };
      return [newLog, ...prev].slice(0, 8);
    });
  }, []);

  const executeToolCall = async (msg: string) => {
    const text = msg.toLowerCase();
    const isDetailed = text.includes('détail') || text.includes('detail') || text.includes('complet') || text.includes('tout') || text.includes('lignes');
    let result: any;
    let agent = 'VDATA';
    let toolName = '';

    // 1. Détection dynamique du Tenant (client_id)
    let clientId = DEFAULT_CLIENT_ID;
    if (text.includes('sur demo')) clientId = 'DEMO';
    else if (text.includes('sur smti')) clientId = 'SMTI';
    else if (text.includes('sur local')) clientId = 'LOCAL';

    // 2. Extraction améliorée de la référence
    const keywords = ['facture', 'dossier', 'client', 'tiers', 'statut', 'demo', 'smti', 'local', 'sur', 'donne', 'moi', 'les', 'details', 'detail', 'détails', 'détail', 'avec', 'référence', 'reference'];
    // RegEx mise à jour pour supporter : FP 26-XXXXX, FC 2026-XXXXX, etc.
    const allMatches = msg.match(/([A-Z]{2,4}[- ]?[0-9]{2,4}[- ][0-9]+|[A-Z]{2,4}[- ]?[0-9]{2,10}|(?=.*\d)[A-Z0-9-]{6,})/gi) || [];
    const validMatches = allMatches.filter(m => !keywords.includes(m.toLowerCase()));
    const extractedRef = validMatches.length > 0 ? validMatches[0].trim() : '';

    try {
      if (text.includes('facture') || text.includes('détail') || text.includes('#inv') || text.includes('fc-') || text.includes('av-')) {
        toolName = 'getInvoiceDetail';
        agent = 'VFIN';
        result = await tralisApi.getInvoiceDetail({
          client_id: clientId,
          invoice_ref: extractedRef || 'INV-2026-001'
        });
      } else if (text.includes('dossier') || text.includes('#tun') || text.includes('tun-')) {
        toolName = 'getDossierDetail';
        agent = 'VMOVE';
        result = await tralisApi.getDossierDetail({
          client_id: clientId,
          dossier_ref: extractedRef || 'TUN-2847'
        });
      } else if (text.includes('livraison') || text.includes('statut') || text.includes('expédition')) {
        toolName = 'getExpeditionStatus';
        agent = 'VMOVE';
        result = await tralisApi.getExpeditionStatus({
          client_id: clientId,
          expedition_ref: extractedRef || 'EXP-2024-99'
        });
      } else if (text.includes('client') || text.includes('tiers')) {
        toolName = 'getCustomerProfile';
        agent = 'VSELL';
        // Pour le client, on essaie de prendre les mots après "client"
        const clientMatch = text.match(/client (.*?)($| sur)/i);
        const clientSearch = clientMatch ? clientMatch[1].trim() : 'TUNISIE TELECOM';
        result = await tralisApi.getCustomerProfile({
          client_id: clientId,
          tiers_search: clientSearch
        });
      } else if (text.includes('cotation') || text.includes('pipeline')) {
        toolName = 'searchCotations';
        agent = 'VSELL';
        result = await tralisApi.searchCotations({ client_id: clientId });
      }

      if (!toolName) {
        return {
          agent: 'VMIND',
          text: "Je n'ai pas trouvé d'action précise. Recherchez-vous une facture (ex: FC-2024-001) ou un dossier ?",
          kpis: []
        };
      }

      if (!result.ok) {
        return {
          agent,
          text: `<span style="color:var(--red)">Erreur Backend :</span> ${result.error?.message}`,
          kpis: [],
          meta: `Base: ${clientId} · Ref: ${extractedRef || 'Auto'}`
        };
      }

      const data = result.data;
      let responseText = `Données extraites sur la base <strong style="color:var(--cyan)">${clientId}</strong> via <strong style="color:var(--cyan)">${toolName}</strong>.<br><br>`;

      if (toolName === 'getInvoiceDetail') {
        const inv = data.invoice || data.Header || data;
        const dateStr = inv.date_facture || inv.DateFacture ? new Date(inv.date_facture || inv.DateFacture).toLocaleDateString() : 'N/A';
        
        responseText += `Facture : <strong>${inv.reference || inv.FAC_REF || extractedRef}</strong><br>`;
        responseText += `Client : <strong>${inv.client || inv.RaisonSociale || 'N/A'}</strong><br>`;
        responseText += `Date : ${dateStr}<br>`;
        responseText += `Type : ${inv.type || inv.TypeDesignation || 'Facture'}<br>`;
        responseText += `Statut : <span style="color:var(--cyan)">${inv.statut || inv.StatusDesignation || 'N/A'}</span><br>`;
        responseText += `Dossier : ${inv.dossier_ref || inv.DossierReference || 'N/A'}<br><br>`;
        
        responseText += `<div style="background:var(--navy4); padding:10px; border-radius:8px; border:1px solid var(--border); margin-bottom:10px">`;
        responseText += `Total HT : ${inv.total_ht || '0'} ${inv.devise || ''}<br>`;
        responseText += `TVA : ${inv.total_tva || '0'}<br>`;
        responseText += `<strong>TOTAL TTC : ${inv.total_ttc || '0'} ${inv.devise || ''}</strong><br>`;
        
        if (data.summary?.solde_du_tnd) {
          responseText += `<div style="margin-top:5px; padding-top:5px; border-top:1px dashed var(--border2); color:var(--cyan)">`;
          responseText += `<strong>Solde : ${data.summary.solde_du_tnd} TND</strong> (Taux: ${data.invoice?.taux || 'N/A'})`;
          responseText += `</div>`;
        }
        responseText += `</div>`;

        // Affichage des lignes si demandé
        if (isDetailed && data.lines && data.lines.length > 0) {
          responseText += `<div style="font-size:11px; margin-top:10px; overflow-x:auto">`;
          responseText += `<strong style="display:block; margin-bottom:5px">DÉTAIL DES ARTICLES :</strong>`;
          responseText += `<table style="width:100%; border-collapse:collapse; border:1px solid var(--border2)">`;
          responseText += `<tr style="background:var(--navy3)">`;
          responseText += `<th style="padding:4px; text-align:left; border:1px solid var(--border2)">Code</th>`;
          responseText += `<th style="padding:4px; text-align:left; border:1px solid var(--border2)">Désignation</th>`;
          responseText += `<th style="padding:4px; text-align:right; border:1px solid var(--border2)">Qté</th>`;
          responseText += `<th style="padding:4px; text-align:right; border:1px solid var(--border2)">TTC</th>`;
          responseText += `</tr>`;
          
          data.lines.forEach((line: any) => {
            responseText += `<tr>`;
            responseText += `<td style="padding:4px; border:1px solid var(--border2)">${line.article_code || '-'}</td>`;
            responseText += `<td style="padding:4px; border:1px solid var(--border2)">${line.article_nom || 'N/A'}</td>`;
            responseText += `<td style="padding:4px; text-align:right; border:1px solid var(--border2)">${line.quantite}</td>`;
            responseText += `<td style="padding:4px; text-align:right; border:1px solid var(--border2)">${line.montant_ttc}</td>`;
            responseText += `</tr>`;
          });
          
          responseText += `</table>`;
          responseText += `<div style="margin-top:5px; color:var(--muted)">Total articles : ${data.summary?.nb_lignes || data.lines.length}</div>`;
          responseText += `</div>`;
        } else if (!isDetailed) {
          responseText += `<div style="font-size:11px; color:var(--cyan); font-style:italic">Tapez "détail" pour voir les lignes d'articles.</div>`;
        }
      } else if (toolName === 'getDossierDetail') {
        responseText += `Dossier : <strong>${data.Context?.DOS_LIB || data.reference || extractedRef}</strong><br>État : <span style="color:var(--green)">${data.Context?.DOS_ETAT || 'En cours'}</span>`;
      } else {
        responseText += `Requête traitée pour l'outil ${toolName}.`;
      }

      return {
        agent,
        text: responseText,
        kpis: data.KPIs || [],
        meta: `Mode: ${clientId} · Tool: ${toolName}`
      };

    } catch (error) {
      return {
        agent: 'VMIND',
        text: `<span style="color:var(--red)">Erreur Critique :</span> Connexion interrompue.`,
        kpis: []
      };
    }
  };

  const addMessage = useCallback(async (text: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString('fr-FR', { hour12: false })
    };
    setMessages(prev => [...prev, userMsg]);

    const thinkingId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: thinkingId, sender: 'vm', text: '', time: '', isThinking: true }]);

    const resp = await executeToolCall(text);
    const latency = (0.7 + Math.random() * 0.9).toFixed(1);

    const botMsg: Message = {
      id: (Date.now() + 2).toString(),
      sender: 'vm',
      agent: resp.agent,
      text: resp.text,
      time: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
      meta: resp.meta || `${resp.agent} · ${latency}s`,
      kpis: resp.kpis
    };

    setMessages(prev => prev.filter(m => m.id !== thinkingId).concat(botMsg));
    if (resp.agent) addLog(resp.agent, `Traitement ${latency}s`);
  }, [addLog]);

  const clearChat = useCallback(() => {
    setMessages([{
      id: 'clear',
      sender: 'vm',
      agent: 'VMIND',
      text: 'Conversation réinitialisée.',
      time: new Date().toLocaleTimeString('fr-FR', { hour12: false })
    }]);
  }, []);

  return { messages, addMessage, clearChat, logs };
}
