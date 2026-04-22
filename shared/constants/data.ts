import { Agent, KPI } from '../types';

export const AGENTS: Record<string, Agent> = {
  VDATA: {
    id: 'VDATA',
    name: 'VDATA',
    desc: 'Données & Analytics',
    status: 'ACTIF',
    color: '#00E5C8',
    bgColor: 'rgba(0,229,200,0.1)',
    borderColor: 'rgba(0,229,200,0.2)',
    icon: 'VDATA'
  },
  VFIN: {
    id: 'VFIN',
    name: 'VFIN',
    desc: 'Finance & Comptabilité',
    status: 'ACTIF',
    color: '#00E676',
    bgColor: 'rgba(0,230,118,0.1)',
    borderColor: 'rgba(0,230,118,0.2)',
    icon: 'VFIN'
  },
  VSELL: {
    id: 'VSELL',
    name: 'VSELL',
    desc: 'Commercial & CRM',
    status: 'VEILLE',
    color: '#FFB800',
    bgColor: 'rgba(255,184,0,0.1)',
    borderColor: 'rgba(255,184,0,0.2)',
    icon: 'VSELL'
  },
  VSTOCK: {
    id: 'VSTOCK',
    name: 'VSTOCK',
    desc: 'Stocks & Inventaire',
    status: 'VEILLE',
    color: '#7B61FF',
    bgColor: 'rgba(123,97,255,0.1)',
    borderColor: 'rgba(123,97,255,0.2)',
    icon: 'VSTOCK'
  },
  VBUY: {
    id: 'VBUY',
    name: 'VBUY',
    desc: 'Achats & Fournisseurs',
    status: 'VEILLE',
    color: '#FF4757',
    bgColor: 'rgba(255,71,87,0.1)',
    borderColor: 'rgba(255,71,87,0.2)',
    icon: 'VBUY'
  },
  VMOVE: {
    id: 'VMOVE',
    name: 'VMOVE',
    desc: 'Transport & Logistique',
    status: 'ACTIF',
    color: '#00BFA8',
    bgColor: 'rgba(0,191,168,0.1)',
    borderColor: 'rgba(0,191,168,0.2)',
    icon: 'VMOVE'
  }
};

export interface ResponseData {
  agent: string;
  text: string;
  kpis: KPI[];
}

export const RESPONSES: Record<string, ResponseData> = {
  'trésorerie': {
    agent: 'VFIN',
    text: 'La trésorerie disponible ce jour est de <strong style="color:var(--cyan)">842 500 TND</strong>.<br><br>Décomposition : Comptes bancaires (724K), Caisse (18K), Effets à recevoir (100K). <br><br>Prévision à 30 jours : <strong style="color:var(--green)">+127K TND</strong> d\'entrées nettes attendues.',
    kpis: [
      { label: 'Trésorerie', val: '842 500 TND', delta: '▲ +3.2% sem.', src: 'finance_get_cash_position' },
      { label: 'Entrées 30j', val: '+127 000', delta: '● Estimation', src: 'finance_get_cash_forecast' }
    ]
  },
  'top clients': {
    agent: 'VSELL',
    text: 'Top 5 clients du mois d\'avril :<br><br>1. <strong style="color:var(--cyan)">Tunisie Telecom</strong> — 384 000 TND (+18%)<br>2. Stafim Distribution — 267 000 TND (+24%)<br>3. SFAX Chemicals — 198 000 TND (+9%)<br>4. Groupe Mabrouk — 155 000 TND (+2%)<br>5. COTUSAL — 142 000 TND (-6%)',
    kpis: [
      { label: 'CA Top 5', val: '1 146 000', delta: '62% du CA total', src: 'sales_get_top_customers' }
    ]
  },
  'bl': {
    agent: 'VMOVE',
    text: '<strong style="color:var(--amber)">14 BL</strong> ont été émis mais ne sont pas encore facturés. Montant estimé non facturé : <strong style="color:var(--red)">89 000 TND</strong>.<br><br>BL les plus anciens : #BL-0847 (12 jours), #BL-0831 (9 jours). Recommandation : déclencher la facturation immédiate.',
    kpis: [
      { label: 'BL Non Facturés', val: '14', delta: '▲ 89K TND en attente', src: 'ops_get_bl_not_invoiced', color: 'rgba(255,184,0,0.3)' }
    ]
  },
  'impayés': {
    agent: 'VFIN',
    text: 'Total des impayés clients : <strong style="color:var(--red)">218 400 TND</strong> sur <strong>37 factures</strong> concernant 8 clients.<br><br>Clients à risque élevé : <strong style="color:var(--amber)">Société X</strong> (88 000 TND, +90 jours), <strong style="color:var(--amber)">Client Y</strong> (45 000 TND, +60 jours).<br><br>⚠ Recommandation : relance immédiate pour les > 60 jours.',
    kpis: [
      { label: 'Impayés Total', val: '218 400', delta: '▲ +8 clients', src: 'finance_get_unpaid_invoices', color: 'rgba(255,71,87,0.15)' },
      { label: 'Factures concernées', val: '37', delta: 'Étalées sur 3 mois', src: 'finance_get_unpaid_invoices' }
    ]
  },
  'cash forecast': {
    agent: 'VFIN',
    text: 'Prévision de trésorerie à 30 jours (14 mai 2026) :<br><br>Encaissements attendus : <strong style="color:var(--green)">+315 000 TND</strong> (factures échues + nouveaux paiements)<br>Décaissements prévus : <strong style="color:var(--red)">-188 000 TND</strong> (fournisseurs + charges)<br><br>Solde prévisionnel : <strong style="color:var(--cyan)">969 500 TND</strong> (+15% vs aujourd\'hui).',
    kpis: [
      { label: 'Solde Prévisionnel', val: '969 500 TND', delta: '▲ +15% dans 30j', src: 'finance_get_cash_forecast' }
    ]
  },
  'dossiers transport': {
    agent: 'VMOVE',
    text: 'État du transport aujourd\'hui : <br><br><strong style="color:var(--cyan)">43 dossiers ouverts</strong>, dont <strong style="color:var(--red)">7 en retard</strong>. Taux de ponctualité : 83%.<br><br>Motifs retards : congestion Rades (4), attente douane (2), panne véhicule (1).',
    kpis: [
      { label: 'Dossiers Actifs', val: '43', delta: '36 dans les délais', src: 'ops_get_open_shipments' },
      { label: 'En Retard', val: '7', delta: '⚠ 2 critiques', src: 'ops_get_delayed_shipments', color: 'rgba(255,71,87,0.15)' }
    ]
  },
  'stocks': {
    agent: 'VSTOCK',
    text: 'État des stocks au 14/04/2026 :<br><br>Niveau global : <strong style="color:var(--cyan)">conforme</strong>. 3 ruptures détectées sur références secondaires.<br><br>Alertes stock : Réf. SUP-1142 (stock = 0), Réf. MAT-0887 (stock critique < seuil).<br><br>Valeur totale stock : 1 240 000 TND.',
    kpis: [
      { label: 'Valeur Stock', val: '1.24M TND', delta: '◈ Conforme', src: 'ops_get_stock_value' },
      { label: 'Ruptures', val: '3', delta: '⚠ à réapprovisionner', src: 'ops_get_stock_alerts', color: 'rgba(255,71,87,0.15)' }
    ]
  },
  'achats': {
    agent: 'VBUY',
    text: 'Achats en cours :<br><br>12 commandes fournisseurs en attente de livraison. Total engagé : <strong style="color:var(--cyan)">456 000 TND</strong>.<br><br>Fournisseurs stratégiques actifs : 7. Délai moyen de livraison : 8 jours.',
    kpis: [
      { label: 'Commandes en cours', val: '12', delta: '456K TND engagés', src: 'purchase_get_orders' }
    ]
  },
  'analyse': {
    agent: 'VDATA',
    text: 'Analyse consolidée du jour :<br><br>✅ CA mensuel en hausse (+12.3%) — objectif dépassé<br>✅ Trésorerie saine (842K TND)<br>⚠ 7 dossiers transport en retard<br>⚠ 14 BL non facturés (89K TND)<br>⚠ 218K TND d\'impayés à surveiller<br><br>Score de santé globale : <strong style="color:var(--cyan)">74/100</strong>',
    kpis: [
      { label: 'Score Santé', val: '74 / 100', delta: '● Bon — 2 alertes actives', src: 'VDATA Analytics' }
    ]
  },
};

/**
 * Mapping des outils backend vers les agents spécifiques du Frontend.
 * Permet de spécialiser les conversations et les identités visuelles.
 */
export const TOOL_AGENT_MAPPING: Record<string, string> = {
  getInvoiceDetail: 'VDATA',
  getDossierDetail: 'VDATA',
  getExpeditionStatus: 'VDATA',
  getCustomerProfile: 'VSELL',
  searchCotations: 'VSELL',
  getPurchaseInvoiceDetail: 'VBUY',
  runReadonlyQuery: 'VDATA'
};
