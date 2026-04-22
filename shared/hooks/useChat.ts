import { useState, useCallback, useRef, useEffect } from 'react';
import { Message, LogEntry } from '../types';
import { tralisApi } from '../api/tralis-api';
import { TOOL_AGENT_MAPPING } from '../constants/data';

interface UseChatReturn {
  messages: Message[];
  addMessage: (text: string) => void;
  clearChat: () => void;
  logs: LogEntry[];
  activeAgentId: string;
}

const DEFAULT_CLIENT_ID = process.env.NEXT_PUBLIC_CLIENT_ID || 'DEMO';

export function useChat(): UseChatReturn {
  const [activeAgentId, setActiveAgentId] = useState('VMIND');
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
    const keywords = [
      'facture', 'dossier', 'client', 'tiers', 'statut', 'demo', 'smti', 'local', 'sur', 
      'donne', 'moi', 'les', 'details', 'detail', 'détails', 'détail', 'avec', 
      'référence', 'reference', 'retourner', 'affiche', 'montre', 'informations', 'livraison',
      'quel', 'est', 'le', 'une', 'expédition', 'expedition', 'détaillé', 'detaille', 'dition'
    ];
    // Règle d'or : une référence DOIT contenir au moins un chiffre ou un tiret
    const allMatches = msg.match(/([A-Z0-9]{2,}-[A-Z0-9-]+|(?=.*\d)[A-Z0-9]{5,})/gi) || [];
    const validMatches = allMatches.filter(m => !keywords.includes(m.toLowerCase()));
    const extractedRef = validMatches.length > 0 ? validMatches[0].trim() : '';

    // Vérification de référence manquante
    if (!extractedRef && (text.includes('dossier') || text.includes('facture') || text.includes('expédition') || text.includes('livraison'))) {
      return {
        agent: 'VMIND',
        text: "Je n'ai pas détecté de référence précise dans votre demande. Pourriez-vous me donner le numéro (ex: Dossier RI26... ou Expédition EXP...) ?",
        kpis: []
      };
    }

    try {
      if (text.includes('expédition') || text.includes('livraison') || text.includes('statut')) {
        toolName = 'getExpeditionStatus';
        result = await tralisApi.getExpeditionStatus({
          client_id: clientId,
          expedition_ref: extractedRef
        });
      } else if (text.includes('facture') || text.includes('#inv') || text.includes('fc-') || text.includes('av-')) {
        toolName = 'getInvoiceDetail';
        result = await tralisApi.getInvoiceDetail({
          client_id: clientId,
          invoice_ref: extractedRef,
          include_lines: true
        });
      } else if (text.includes('dossier') || text.includes('analyse')) {
        toolName = 'getDossierDetail';
        result = await tralisApi.getDossierDetail({
          client_id: clientId,
          dossier_ref: extractedRef,
          include_expeditions: isDetailed,
          include_invoices: isDetailed,
          include_costs: isDetailed
        });
      } else if (text.includes('client') || text.includes('tiers')) {
        toolName = 'getCustomerProfile';
        // Pour le client, on essaie de prendre les mots après "client"
        const clientMatch = text.match(/client (.*?)($| sur)/i);
        const clientSearch = clientMatch ? clientMatch[1].trim() : 'TUNISIE TELECOM';
        result = await tralisApi.getCustomerProfile({
          client_id: clientId,
          tiers_search: clientSearch
        });
      } else if (text.includes('cotation') || text.includes('pipeline')) {
        toolName = 'searchCotations';
        result = await tralisApi.searchCotations({ client_id: clientId });
      }

      // Assignation de l'agent spécialisé selon l'outil identifié
      if (toolName && TOOL_AGENT_MAPPING[toolName]) {
        const nextAgentId = TOOL_AGENT_MAPPING[toolName];

        // Système de Handoff Dynamique
        if (nextAgentId !== activeAgentId) {
          const handoffMsg: Message = {
            id: `handoff-${Date.now()}`,
            sender: 'vm',
            agent: activeAgentId, // C'est l'agent actuel qui passe la main
            text: `Un instant, je sollicite l'agent **${nextAgentId}** pour l'analyse précise de votre demande...`,
            time: new Date().toLocaleTimeString('fr-FR', { hour12: false }),
            meta: 'System Handoff'
          };

          setMessages(prev => [...prev, handoffMsg]);
          setActiveAgentId(nextAgentId);

          // Mise à jour de la bulle de réflexion pour l'agent entrant
          setMessages(prev => prev.map(m =>
            m.isThinking ? { ...m, agent: nextAgentId } : m
          ));

          // Petite pause pour simuler la réflexion de l'agent entrant
          await new Promise(resolve => setTimeout(resolve, 800));
        }

        agent = nextAgentId;
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
      } else if (toolName === 'getExpeditionStatus') {
        const exp = data;
        responseText += `Expédition : <strong>${exp.reference || extractedRef}</strong><br>`;
        responseText += `Statut : <span style="color:var(--amber)">${exp.statut || 'N/A'}</span><br>`;
        responseText += `Dossier lié : <strong>${exp.reference_dossier || 'N/A'}</strong><br><br>`;

        // Section Dates clés
        responseText += `<div style="background:var(--navy4); padding:10px; border-radius:8px; border:1px solid var(--border); margin-bottom:10px">`;
        responseText += `<strong style="color:var(--cyan)">DATES ET ÉTAPES :</strong><br>`;
        responseText += `• Réception : ${exp.dates?.reception || '---'}<br>`;
        responseText += `• Enlèvement : <span style="color:var(--green)">${exp.dates?.enlevement_reel || exp.dates?.enlevement_prevu || '---'}</span><br>`;
        responseText += `• Livraison : <strong>${exp.dates?.livraison || '---'}</strong><br>`;
        responseText += `</div>`;

        // Section Transport / Chauffeur
        responseText += `<div style="font-size:11px; margin-top:10px">`;
        responseText += `<strong style="color:var(--purple)">LOGISTIQUE & TRANSPORT :</strong><br>`;
        responseText += `• Moyen : ${exp.intervenants?.transporteur || 'N/A'}<br>`;
        responseText += `• Véhicule : ${exp.transport?.vehicule || 'N/A'} (Chauffeur: ${exp.transport?.chauffeur || 'N/A'})<br>`;
        responseText += `• Marchandise : ${exp.logistique?.nature || 'N/A'} (${exp.logistique?.poids || 0} kg / ${exp.logistique?.colis || 0} colis)<br>`;
        responseText += `</div>`;

        // Section Douane
        if (exp.douane?.numero_declaration) {
          responseText += `<div style="font-size:11px; margin-top:10px; border-top:1px dashed var(--border2); padding-top:5px">`;
          responseText += `<strong style="color:var(--red)">INFORMATIONS DOUANE :</strong><br>`;
          responseText += `• Décl. : ${exp.douane.numero_declaration} du ${exp.douane.date_declaration || 'N/A'}<br>`;
          responseText += `• Bureau : ${exp.douane.bureau || 'N/A'}<br>`;
          responseText += `</div>`;
        }
      } else if (toolName === 'getDossierDetail') {
        const d = data;
        const main = d.dossier || {};
        responseText += `Dossier : <strong>${main.reference_dossier || extractedRef}</strong><br>`;
        responseText += `Client : <strong>${main.client || 'N/A'}</strong><br>`;
        responseText += `Statut : <span style="color:var(--green)">${main.statut_dossier || 'Ouvert'}</span><br>`;
        responseText += `Type : ${main.nature_transport || 'N/A'} / ${main.type_fret || 'N/A'}<br>`;
        responseText += `Date : ${main.date_creation ? new Date(main.date_creation).toLocaleDateString() : 'N/A'}<br><br>`;

        // Section Marge (Toujours affichée en résumé)
        if (d.marge) {
          responseText += `<div style="background:var(--navy4); padding:10px; border-radius:8px; border:1px solid var(--border); margin-bottom:10px">`;
          responseText += `<strong style="color:var(--cyan)">ANALYSE RENTABILITÉ :</strong><br>`;
          responseText += `CA Client HT : <strong>${d.marge.ca_client || 0} TND</strong><br>`;
          responseText += `Coûts Achats : <span style="color:var(--red)">-${d.marge.cout_achat || 0} TND</span><br>`;
          responseText += `<div style="height:1px; background:var(--border2); margin:5px 0"></div>`;
          responseText += `<strong>MARGE BRUTE : ${d.marge.marge_brute || 0} TND</strong> (${d.marge.taux_marge_pct || 0}%)`;
          responseText += `</div>`;
        }

        // Détails si demandé
        if (isDetailed) {
          if (d.expeditions && d.expeditions.length > 0) {
            responseText += `<div style="font-size:11px; margin-top:10px">`;
            responseText += `<strong style="color:var(--green)">EXPÉDITIONS (${d.expeditions.length}) :</strong><br>`;
            d.expeditions.forEach((e: any) => {
              responseText += `• ${e.reference_expedition} (${e.statut_expedition}) - ${e.lieu_expedition || 'N/A'}<br>`;
            });
            responseText += `</div>`;
          }
          if (d.invoices && d.invoices.length > 0) {
            responseText += `<div style="font-size:11px; margin-top:10px">`;
            responseText += `<strong style="color:var(--cyan)">FACTURES VENTES (${d.invoices.length}) :</strong><br>`;
            d.invoices.forEach((inv: any) => {
              responseText += `• ${inv.reference_facture} : <strong>${inv.total_TTC} ${inv.devise}</strong> (${inv.date_facture ? new Date(inv.date_facture).toLocaleDateString() : 'N/A'})<br>`;
            });
            responseText += `</div>`;
          }
        } else {
          responseText += `<div style="font-size:11px; color:var(--cyan); font-style:italic">Tapez "détail" pour voir les expéditions, factures et coûts liés.</div>`;
        }
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

  return { messages, addMessage, clearChat, logs, activeAgentId };
}
