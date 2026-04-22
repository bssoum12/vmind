"use client";

import { useCallback, useState } from 'react';
import { tralisApi } from '../api/tralis-api';
import { resolveAgentFromTool, type AgentId } from '../constants/data';
import type { LogEntry, Message } from '../types';

const DEFAULT_CLIENT_ID = process.env.NEXT_PUBLIC_CLIENT_ID || 'DEMO';

function nowTime() {
  return new Date().toLocaleTimeString('fr-FR', { hour12: false });
}

function detectTenant(text: string): string {
  const tenantMatch = text.match(/\bsur\s+([a-z0-9_-]+)/i);
  if (tenantMatch?.[1]) return tenantMatch[1].toUpperCase();
  return DEFAULT_CLIENT_ID;
}

function detectToolName(text: string): string | null {
  const t = text.toLowerCase();

  if (
    t.includes('client') ||
    t.includes('tiers') ||
    t.includes('profil') ||
    t.includes('solde') ||
    t.includes('balance') ||
    t.includes('fournisseur')
  ) {
    return 'getCustomerProfile';
  }

  if (t.includes('facture')) return 'getInvoiceDetail';
  if (t.includes('dossier')) return 'getDossierDetail';
  if (t.includes('expédition') || t.includes('expedition') || t.includes('statut')) return 'getExpeditionStatus';
  if (t.includes('cotation') || t.includes('pipeline')) return 'searchCotations';
  if (t.includes('achat')) return 'getPurchaseInvoiceDetail';

  return null;
}

function extractEntity(text: string): string {
  const tenantRemoved = text.replace(/\bsur\s+[a-z0-9_-]+/i, '').trim();

  const keywords = [
    'donne', 'moi', 'le', 'la', 'les', 'du', 'de', 'des',
    'profil', 'client', 'tiers', 'fournisseur',
    'facture', 'dossier', 'expédition', 'expedition',
    'statut', 'balance', 'solde', 'pipeline', 'cotation',
    'quel', 'quelle', 'est', 'situation', 'analyse', 'detail', 'détail'
  ];

  const words = tenantRemoved.split(/\s+/).filter(Boolean);
  const filtered = words.filter(w => !keywords.includes(w.toLowerCase()));
  return filtered.join(' ').trim();
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      sender: 'vm',
      agent: 'VMIND',
      text: 'Bonjour. Je suis prêt à analyser vos données TraLIS.',
      time: nowTime(),
      meta: 'Session initialisée',
    },
  ]);

  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'log-init',
      time: nowTime(),
      agent: 'VMIND',
      action: 'Initialisation du système',
    },
  ]);

  const [activeAgentId, setActiveAgentId] = useState<AgentId>('VMIND');

  const addLog = useCallback((agent: string, action: string) => {
    setLogs(prev => [
      {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        time: nowTime(),
        agent,
        action,
      },
      ...prev,
    ].slice(0, 20));
  }, []);

  const addMessage = useCallback(async (text: string) => {
    const clientId = detectTenant(text);
    const toolName = detectToolName(text);
    const extractedValue = extractEntity(text);

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      time: nowTime(),
    };

    setMessages(prev => [...prev, userMessage]);

    if (!toolName) {
      const fallbackMessage: Message = {
        id: `vm-${Date.now()}-fallback`,
        sender: 'vm',
        agent: 'VMIND',
        text: "Je n’ai pas identifié d’outil précis à utiliser.",
        time: nowTime(),
        meta: 'Aucun tool détecté',
      };

      setMessages(prev => [...prev, fallbackMessage]);
      addLog('VMIND', 'Aucun tool détecté');
      return;
    }

    const nextAgentId = resolveAgentFromTool(toolName);

    if (nextAgentId && nextAgentId !== activeAgentId) {
      const handoffMessage: Message = {
        id: `handoff-${Date.now()}`,
        sender: 'vm',
        agent: activeAgentId,
        text: `Un instant, je sollicite l'agent **${nextAgentId}** pour l'analyse précise de votre demande...`,
        time: nowTime(),
        meta: 'System Handoff',
      };

      setMessages(prev => [...prev, handoffMessage]);
      setActiveAgentId(nextAgentId);
      addLog(nextAgentId, `Analyse données via ${toolName}`);
    }

    const thinkingMessage: Message = {
      id: `thinking-${Date.now()}`,
      sender: 'vm',
      agent: nextAgentId || 'VMIND',
      text: '',
      time: nowTime(),
      isThinking: true,
    };

    setMessages(prev => [...prev, thinkingMessage]);

    const isDetailed = text.includes('détail') || text.includes('plus info') || text.includes('analys');
    let responseText = '';
    let responseMeta = `${toolName} · ${clientId}`;

    try {
      let response: any = null;

      if (toolName === 'getCustomerProfile') {
        response = await tralisApi.getCustomerProfile({
          client_id: clientId,
          tiers_search: extractedValue || 'TUNISIE TELECOM',
          include_balance: true,
        });

        if (response.ok && response.data) {
          const c = response.data;
          if (c.match_count > 1 && c.matches) {
            responseText += `J'ai trouvé <strong>${c.match_count}</strong> clients correspondant à "<em>${extractedValue}</em>" :<br><br>`;
            c.matches.forEach((m: any) => {
              responseText += `• <strong>${m.raison_sociale}</strong> (Code: ${m.code_client || '---'}) - ${m.ville || ''}<br>`;
            });
            responseText += `<br><div style="font-size:11px; color:var(--cyan); font-style:italic">Veuillez préciser le nom exact ou le code client.</div>`;
          } else if (c.tiers) {
            const tiers = c.tiers;
            const bal = c.balance || null;
            responseText += `Client : <strong>${tiers.raison_sociale || 'N/A'}</strong> (${tiers.code_client || 'Sans code'})<br>`;
            responseText += `Ville : <strong>${tiers.ville || 'N/A'}</strong> (${tiers.pays || '---'})<br>`;
            responseText += `Contact : <span style="color:var(--cyan)">${tiers.telephone || '---'}</span> | ${tiers.email || '---'}<br><br>`;

            if (bal) {
              const soldeColor = bal.solde_client > 0 ? 'var(--red)' : 'var(--green)';
              responseText += `<div style="background:var(--navy4); padding:10px; border-radius:8px; border:1px solid var(--border); margin-bottom:10px">`;
              responseText += `<strong style="color:var(--cyan)">SITUATION COMPTABLE :</strong><br>`;
              responseText += `Solde Actuel : <strong style="color:${soldeColor}">${bal.solde_client?.toLocaleString() || 0} TND</strong><br>`;
              responseText += `Limite Crédit : ${bal.limite_credit?.toLocaleString() || 0} TND<br>`;
              if (bal.alerte_credit) responseText += `<div style="margin-top:5px; color:var(--red); font-weight:700; font-size:10px">⚠ ${bal.alerte_credit}</div>`;
              responseText += `</div>`;

              responseText += `<div style="font-size:11px; margin-top:10px">`;
              responseText += `<strong style="color:var(--purple)">DÉTAIL ENCOURS :</strong><br>`;
              responseText += `• 0-30j : ${bal.encours_0_30j?.toLocaleString() || 0} TND<br>`;
              responseText += `• 31-60j : ${bal.encours_31_60j?.toLocaleString() || 0} TND<br>`;
              responseText += `• +90j : <span style="color:var(--red)">${bal.encours_plus_90j?.toLocaleString() || 0} TND</span><br>`;
              responseText += `</div>`;
            }
          }
        } else {
          responseText = `Aucune donnée trouvée pour : <strong>${extractedValue || 'tiers demandé'}</strong>`;
        }
      }

      if (toolName === 'getInvoiceDetail') {
        response = await tralisApi.getInvoiceDetail({
          client_id: clientId,
          invoice_ref: extractedValue || 'FC-2026-42114',
          include_lines: true,
        });

        if (response.ok && response.data) {
          const d = response.data;
          const inv = d.invoice || d.Header || d;
          const dateStr = inv.date_facture || inv.DateFacture ? new Date(inv.date_facture || inv.DateFacture).toLocaleDateString() : 'N/A';

          responseText = `Facture : <strong>${inv.reference || inv.FAC_REF || extractedValue}</strong><br>`;
          responseText += `Client : <strong>${inv.client || inv.RaisonSociale || 'N/A'}</strong><br>`;
          responseText += `Date : ${dateStr}<br>`;
          responseText += `Statut : <span style="color:var(--cyan)">${inv.statut || inv.StatusDesignation || 'N/A'}</span><br>`;
          responseText += `Dossier : ${inv.dossier_ref || inv.DossierReference || 'N/A'}<br><br>`;

          responseText += `<div style="background:var(--navy4); padding:10px; border-radius:8px; border:1px solid var(--border); margin-bottom:10px">`;
          responseText += `Total HT : ${inv.total_ht || '0'} ${inv.devise || ''}<br>`;
          responseText += `TVA : ${inv.total_tva || '0'}<br>`;
          responseText += `<strong>TOTAL TTC : ${inv.total_ttc || '0'} ${inv.devise || ''}</strong><br>`;
          responseText += `</div>`;

          if (isDetailed && d.lines && d.lines.length > 0) {
            responseText += `<div style="font-size:11px; margin-top:10px; overflow-x:auto">`;
            responseText += `<strong style="display:block; margin-bottom:5px">DÉTAIL DES ARTICLES :</strong>`;
            responseText += `<table style="width:100%; border-collapse:collapse; border:1px solid var(--border2)">`;
            responseText += `<tr style="background:var(--navy3)">`;
            responseText += `<th style="padding:4px; text-align:left; border:1px solid var(--border2)">Désignation</th>`;
            responseText += `<th style="padding:4px; text-align:right; border:1px solid var(--border2)">Qté</th>`;
            responseText += `<th style="padding:4px; text-align:right; border:1px solid var(--border2)">TTC</th>`;
            responseText += `</tr>`;
            d.lines.forEach((line: any) => {
              responseText += `<tr>`;
              responseText += `<td style="padding:4px; border:1px solid var(--border2)">${line.article_nom || 'N/A'}</td>`;
              responseText += `<td style="padding:4px; text-align:right; border:1px solid var(--border2)">${line.quantite}</td>`;
              responseText += `<td style="padding:4px; text-align:right; border:1px solid var(--border2)">${line.montant_ttc}</td>`;
              responseText += `</tr>`;
            });
            responseText += `</table></div>`;
          } else if (!isDetailed) {
            responseText += `<div style="font-size:11px; color:var(--cyan); font-style:italic">Tapez "détail" pour voir les lignes d'articles.</div>`;
          }
        } else {
          responseText = `Facture non trouvée pour : <strong>${extractedValue || 'référence demandée'}</strong>`;
        }
      }

      if (toolName === 'getDossierDetail') {
        response = await tralisApi.getDossierDetail({
          client_id: clientId,
          dossier_ref: extractedValue || 'DOS-2025-0042',
          include_expeditions: isDetailed,
          include_invoices: isDetailed,
          include_costs: isDetailed,
        });

        if (response.ok && response.data) {
          const d = response.data;
          const dossier = d.dossier || {};
          const marge = d.marge || {};
          responseText = `Dossier : <strong>${dossier.reference_dossier || extractedValue}</strong><br>`;
          responseText += `Client : <strong>${dossier.client || 'N/A'}</strong><br>`;
          responseText += `Statut : <span style="color:var(--green)">${dossier.statut_dossier || 'Ouvert'}</span><br><br>`;

          if (marge) {
            responseText += `<div style="background:var(--navy4); padding:10px; border-radius:8px; border:1px solid var(--border); margin-bottom:10px">`;
            responseText += `<strong style="color:var(--cyan)">ANALYSE RENTABILITÉ :</strong><br>`;
            responseText += `CA Client HT : <strong>${marge.ca_client || 0} TND</strong><br>`;
            responseText += `Coûts Achats : <span style="color:var(--red)">-${marge.cout_achat || 0} TND</span><br>`;
            responseText += `<div style="height:1px; background:var(--border2); margin:5px 0"></div>`;
            responseText += `<strong>MARGE BRUTE : ${marge.marge_brute || 0} TND</strong> (${marge.taux_marge_pct || 0}%)`;
            responseText += `</div>`;
          }

          if (isDetailed) {
            if (d.expeditions && d.expeditions.length > 0) {
              responseText += `<div style="font-size:11px; margin-top:10px">`;
              responseText += `<strong style="color:var(--green)">EXPÉDITIONS (${d.expeditions.length}) :</strong><br>`;
              d.expeditions.forEach((e: any) => responseText += `• ${e.reference_expedition} (${e.statut_expedition})<br>`);
              responseText += `</div>`;
            }
          } else {
            responseText += `<div style="font-size:11px; color:var(--cyan); font-style:italic">Tapez "détail" pour voir les expéditions et factures.</div>`;
          }
        } else {
          responseText = `Dossier non trouvé pour : <strong>${extractedValue || 'référence demandée'}</strong>`;
        }
      }

      if (toolName === 'getExpeditionStatus') {
        response = await tralisApi.getExpeditionStatus({
          client_id: clientId,
          expedition_ref: extractedValue || 'EXP-2025-001',
        });

        if (response.ok && response.data) {
          const exp = response.data;
          responseText = `Expédition : <strong>${exp.reference || extractedValue}</strong><br>`;
          responseText += `Statut : <span style="color:var(--amber)">${exp.statut || 'N/A'}</span><br><br>`;

          responseText += `<div style="background:var(--navy4); padding:10px; border-radius:8px; border:1px solid var(--border); margin-bottom:10px">`;
          responseText += `<strong style="color:var(--cyan)">DATES ET ÉTAPES :</strong><br>`;
          responseText += `• Réception : ${exp.dates?.reception || '---'}<br>`;
          responseText += `• Enlèvement : <span style="color:var(--green)">${exp.dates?.enlevement_reel || exp.dates?.enlevement_prevu || '---'}</span><br>`;
          responseText += `• Livraison : <strong>${exp.dates?.livraison || '---'}</strong><br>`;
          responseText += `</div>`;

          responseText += `<div style="font-size:11px; margin-top:10px">`;
          responseText += `<strong style="color:var(--purple)">LOGISTIQUE :</strong><br>`;
          responseText += `• Transporteur : ${exp.intervenants?.transporteur || 'N/A'}<br>`;
          responseText += `• Véhicule : ${exp.transport?.vehicule || 'N/A'} (Chauffeur: ${exp.transport?.chauffeur || 'N/A'})<br>`;
          responseText += `</div>`;
        } else {
          responseText = `Expédition non trouvée pour : <strong>${extractedValue || 'référence demandée'}</strong>`;
        }
      }

      if (toolName === 'searchCotations') {
        response = await tralisApi.searchCotations({
          client_id: clientId,
        });

        if (response.ok && response.data) {
          const d = response.data;
          const summary = d.pipeline_summary || {};
          responseText = `
            <strong>Pipeline cotations</strong><br/><br/>
            • Nombre en cours : <strong>${summary.nb_en_cours ?? 'N/A'}</strong><br/>
            • CA potentiel : ${summary.ca_potentiel_total ?? 'N/A'}<br/>
            • Marge potentielle : ${summary.marge_potentielle ?? 'N/A'}<br/>
            • Nombre de cotations : ${d.cotations?.length || 0}
          `;
        } else {
          responseText = `Aucune cotation disponible.`;
        }
      }

      if (toolName === 'getPurchaseInvoiceDetail') {
        response = await tralisApi.getPurchaseInvoiceDetail({
          client_id: clientId,
          supplier_ref: extractedValue || 'FOURNISSEUR',
        });

        if (response.ok && response.data) {
          const purchase = response.data.purchase_invoice || response.data;
          responseText = `
            <strong>Facture achat</strong><br/><br/>
            • Réf interne : <strong>${purchase.reference_interne || 'N/A'}</strong><br/>
            • Fournisseur : ${purchase.fournisseur || 'N/A'}<br/>
            • Total TTC : <strong>${purchase.total_ttc ?? 'N/A'} ${purchase.devise || ''}</strong>
          `;
        } else {
          responseText = `Facture achat non trouvée.`;
        }
      }

      const finalMessage: Message = {
        id: `vm-${Date.now()}`,
        sender: 'vm',
        agent: nextAgentId || 'VMIND',
        text: responseText || 'Réponse vide.',
        time: nowTime(),
        meta: responseMeta,
      };

      setMessages(prev =>
        prev.filter(m => !m.isThinking).concat(finalMessage)
      );
    } catch (error) {
      const errorMessage: Message = {
        id: `vm-${Date.now()}-error`,
        sender: 'vm',
        agent: nextAgentId || 'VMIND',
        text: `Erreur lors de l’exécution du tool <strong>${toolName}</strong>.`,
        time: nowTime(),
        meta: 'Erreur',
      };

      setMessages(prev =>
        prev.filter(m => !m.isThinking).concat(errorMessage)
      );
    }
  }, [activeAgentId, addLog]);

  const clearChat = useCallback(() => {
    setMessages([
      {
        id: 'clear-1',
        sender: 'vm',
        agent: 'VMIND',
        text: 'Conversation réinitialisée.',
        time: nowTime(),
        meta: 'Reset',
      },
    ]);

    setActiveAgentId('VMIND');
    addLog('VMIND', 'Conversation réinitialisée');
  }, [addLog]);

  return {
    messages,
    logs,
    addMessage,
    clearChat,
    activeAgentId,
  };
}
