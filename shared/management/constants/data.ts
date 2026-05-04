export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  accent: string;
  iconBg: string;
  tag?: string;
  deployments: number;
  connections: string[];
}

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'recouvrement',
    name: 'Agent de Recouvrement',
    description: 'Relance automatique les clients en impayé via email, SMS ou WhatsApp selon un calendrier configurable.',
    category: 'Finance · Recouvrement',
    icon: '💳',
    accent: '#FF4757',
    iconBg: 'rgba(255,71,87,0.12)',
    tag: 'pop',
    deployments: 847,
    connections: ['TraLIS', 'Sage', 'Odoo']
  },
  {
    id: 'reporting',
    name: 'Rapport DG Quotidien',
    description: 'Génère et envoie chaque matin un rapport exécutif complet sur la situation financière et opérationnelle.',
    category: 'Reporting · Finance',
    icon: '📊',
    accent: '#00E5C8',
    iconBg: 'rgba(0,229,200,0.1)',
    tag: 'new',
    deployments: 312,
    connections: ['TraLIS', 'Email']
  },
  {
    id: 'transport',
    name: 'Suivi Expéditions',
    description: 'Surveille les dossiers de transport, détecte les retards et notifie les responsables en temps réel.',
    category: 'Operations · Transport',
    icon: '🚛',
    accent: '#00BFA8',
    iconBg: 'rgba(0,191,168,0.1)',
    deployments: 231,
    connections: ['TraLIS']
  },
  {
    id: 'stock',
    name: "Alerte Rupture Stock",
    description: "Surveille les niveaux de stock, anticipe les ruptures et génère automatiquement des demandes d'achat.",
    category: 'Operations · Stocks',
    icon: '📦',
    accent: '#7B61FF',
    iconBg: 'rgba(123,97,255,0.1)',
    tag: 'beta',
    deployments: 187,
    connections: ['TraLIS', 'Odoo']
  },
  {
    id: 'onboarding',
    name: 'Onboarding Client',
    description: 'Accueille les nouveaux clients, envoie les documents contractuels et suit les étapes d\'activation.',
    category: 'Commercial · CRM',
    icon: '🤝',
    accent: '#FFB800',
    iconBg: 'rgba(255,184,0,0.1)',
    deployments: 156,
    connections: ['CRM', 'Email']
  },
  {
    id: 'facturation',
    name: 'Facturation BL Ouverts',
    description: 'Détecte les BL livrés non facturés et déclenche automatiquement la génération des factures dans l\'ERP.',
    category: 'Finance · Facturation',
    icon: '🧾',
    accent: '#00E676',
    iconBg: 'rgba(0,230,118,0.1)',
    deployments: 94,
    connections: ['TraLIS']
  },
  {
    id: 'fournisseurs',
    name: 'Relance Fournisseurs',
    description: 'Suit les commandes fournisseurs en retard et envoie des relances automatiques.',
    category: 'Achats',
    icon: '📧',
    accent: '#2196F3',
    iconBg: 'rgba(33,150,243,0.1)',
    deployments: 112, // Estimated
    connections: ['TraLIS', 'Email']
  },
  {
    id: 'anomalie',
    name: 'Alerte Anomalie Financière',
    description: 'Détecte les variations anormales dans les données financières et alerte la direction.',
    category: 'Finance · BI',
    icon: '⚠️',
    accent: '#FF4757',
    iconBg: 'rgba(255,71,87,0.1)',
    deployments: 85, // Estimated
    connections: ['TraLIS', 'BI']
  },
  {
    id: 'hebdo_ops',
    name: 'Rapport Hebdo Ops',
    description: 'Synthèse hebdomadaire des opérations envoyée chaque vendredi aux responsables.',
    category: 'Reporting · Ops',
    icon: '📅',
    accent: '#FFB800',
    iconBg: 'rgba(255,184,0,0.1)',
    deployments: 198, // Estimated
    connections: ['TraLIS', 'Email']
  }
];

export const MY_AGENTS = [
  {
    id: '1',
    name: 'Yasmine — Recouvrement',
    type: 'Relances Client',
    status: 'running',
    progress: 65,
    icon: '💳',
    iconBg: 'rgba(255,71,87,0.12)'
  },
  {
    id: '2',
    name: 'Khalil — Transport',
    type: 'Suivi de Flotte',
    status: 'pending',
    progress: 0,
    icon: '🚛',
    iconBg: 'rgba(0,191,168,0.1)'
  },
  {
    id: '3',
    name: 'Amira — Facturation',
    type: 'Génération Factures',
    status: 'done',
    progress: 100,
    icon: '🧾',
    iconBg: 'rgba(0,230,118,0.1)'
  }
];
