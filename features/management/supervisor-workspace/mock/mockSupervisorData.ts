import { SupervisorNode, SupervisorLink, CompanyContext, FleetAuditSummary } from '../types/supervisor.types';

export const INITIAL_COMPANY_CONTEXT: CompanyContext = {
  website: 'https://vmind.ai',
  valueProposition: 'Plateforme autonome d\'orchestration commerciale IA pour équipes B2B et scale-ups. Automatisation de l\'extraction de leads et de la prospection hyper-personnalisée.',
  targetCustomers: 'VP Sales, Directeurs Commerciaux, Dirigeants de SaaS B2B et cabinets de conseil générant plus de 1M€ d\'ARR.',
  competitors: 'Apollo.io, Lemlist, Clay, Waalaxy'
};

export const INITIAL_FLEET_SUMMARY: FleetAuditSummary = {
  lastAuditedAt: 'Il y a 2 heures',
  overallScore: 74,
  totalAgents: 9,
  healthyCount: 4,
  warningCount: 2,
  criticalCount: 1,
  unanalyzedCount: 2,
  topPriorities: [
    'Incohérence critique entre Sourcing SaaS EMEA et Prospection Enterprise SaaS (perte de 81% des leads)',
    'Convergence Santé : 2 agents Sourcing alimentent la Prospection Cliniques & Santé',
    '2 agents récemment déployés nécessitent un premier audit de synchronisation'
  ]
};

export const INITIAL_NODES: SupervisorNode[] = [
  // ── Cluster 1: Pipeline SaaS EMEA (2 agents) ──
  {
    id: 'node-sourcing-saas',
    name: 'Sourcing SaaS EMEA',
    type: 'sourcing',
    status: 'WARNING',
    healthScore: 64,
    x: -400,
    y: -130,
    summary: 'Volume élevé mais taux de déchet important. Le ciblage de séniorité trop large extrait des profils non conformes à l\'ICP aval.',
    metrics: {
      totalLeads: 480,
      qualificationRate: 34,
      lastExecution: 'Aujourd\'hui à 08:30'
    },
    config: {
      targetAudience: 'Entreprises SaaS B2B en Europe',
      seniority: ['Manager', 'Director', 'VP'],
      industry: 'Logiciels & Technologies SaaS',
      country: 'France, Royaume-Uni, Allemagne',
      dailyVolume: 50
    },
    findings: [
      {
        id: 'find-s1',
        severity: 'warning',
        title: 'Séniorité trop large',
        description: '45% des contacts extraits sont des Managers ou Team Leads, alors que vos campagnes aval ciblent exclusivement la direction.'
      },
      {
        id: 'find-s2',
        severity: 'info',
        title: 'Excellente complétion des emails',
        description: 'Taux d\'enrichissement email professionnel vérifié à 96.4%.'
      }
    ],
    recommendations: [
      {
        id: 'rec-s1',
        parameter: 'seniority',
        label: 'Niveaux de Séniorité',
        currentValue: "Manager, Director, VP",
        suggestedValue: "Director, VP, C-Level",
        rationale: 'Élimine les contacts non décisionnaires à la source et préserve le quota d\'enrichissement.',
        impact: 'high',
        applied: false
      },
      {
        id: 'rec-s2',
        parameter: 'leadsPerCompany',
        label: 'Contacts par Entreprise',
        currentValue: "5 contacts max",
        suggestedValue: "2 contacts max",
        rationale: 'Diversifie le portefeuille d\'entreprises ciblées plutôt que de saturer les mêmes comptes.',
        impact: 'medium',
        applied: false
      }
    ]
  },
  {
    id: 'node-prospect-enterprise',
    name: 'Prospection Enterprise SaaS',
    type: 'prospect',
    status: 'CRITICAL',
    healthScore: 42,
    x: -180,
    y: -90,
    summary: 'Goulot d\'étranglement sévère. Le seuil de qualification de 85/100 rejette massivement les leads reçus du Sourcing.',
    metrics: {
      totalLeads: 310,
      qualificationRate: 19,
      emailsSent: 58,
      replyRate: 8.6,
      bounceRate: 1.2,
      lastExecution: 'Aujourd\'hui à 09:15'
    },
    config: {
      targetAudience: 'Grands Comptes & Scale-ups Tech',
      seniority: ['VP Sales', 'Chief Revenue Officer', 'CEO'],
      qualificationThreshold: 85,
      sendDelay: '45s',
      dailyVolume: 25
    },
    findings: [
      {
        id: 'find-p1',
        severity: 'critical',
        title: 'Seuil de qualification disproportionné',
        description: 'Le seuil actuel de 85/100 disqualifie 81% des contacts reçus, dont de nombreux directeurs hautement pertinents.'
      },
      {
        id: 'find-p2',
        severity: 'warning',
        title: 'Délai d\'envoi trop rapide pour grand compte',
        description: 'Un espacement de 45s entre emails peut déclencher des filtres anti-spam sur les serveurs de messagerie d\'entreprise.'
      }
    ],
    recommendations: [
      {
        id: 'rec-p1',
        parameter: 'seuil_qualification',
        label: 'Seuil de Qualification ICP',
        currentValue: "85 / 100",
        suggestedValue: "70 / 100",
        rationale: 'Permet de débloquer 45 contacts qualifiés en attente sans compromettre la qualité du ciblage.',
        impact: 'high',
        applied: false
      },
      {
        id: 'rec-p2',
        parameter: 'delai_envois',
        label: 'Espacement entre Envois',
        currentValue: "45 secondes",
        suggestedValue: "120 secondes",
        rationale: 'Améliore la réputation du domaine expéditeur et la délivrabilité globale.',
        impact: 'medium',
        applied: false
      }
    ]
  },

  // ── Cluster 2: Pipeline Retail Outbound (2 agents) ──
  {
    id: 'node-sourcing-retail',
    name: 'Sourcing E-Commerce & Retail',
    type: 'sourcing',
    status: 'UNANALYZED',
    healthScore: 0,
    x: -380,
    y: 150,
    summary: 'Agent nouvellement déployé. Aucun audit diagnostique n\'a encore été réalisé sur cette instance.',
    metrics: {
      totalLeads: 85,
      lastExecution: 'Il y a 3 heures'
    },
    config: {
      targetAudience: 'Marques D2C & Retail omnicanal',
      seniority: ['Directeur E-Commerce', 'Responsable Digital'],
      industry: 'Retail & E-commerce',
      country: 'France',
      dailyVolume: 40
    },
    findings: [],
    recommendations: []
  },
  {
    id: 'node-prospect-retail',
    name: 'Prospection Retail Outbound',
    type: 'prospect',
    status: 'UNANALYZED',
    healthScore: 0,
    x: -160,
    y: 190,
    summary: 'Agent en attente d\'analyse comparative. Lié au Sourcing E-Commerce & Retail.',
    metrics: {
      totalLeads: 0,
      qualificationRate: 0,
      emailsSent: 0,
      lastExecution: 'En attente'
    },
    config: {
      targetAudience: 'Direction E-commerce France',
      seniority: ['Directeur E-Commerce'],
      qualificationThreshold: 75,
      sendDelay: '60s'
    },
    findings: [],
    recommendations: []
  },

  // ── Cluster 3: Pipeline FinTech US (2 agents) ──
  {
    id: 'node-sourcing-fintech',
    name: 'Sourcing FinTech US',
    type: 'sourcing',
    status: 'HEALTHY',
    healthScore: 94,
    x: 180,
    y: -140,
    summary: 'Pipeline modèle. Les critères de ciblage sont parfaitement calibrés avec le marché cible et la cadence d\'exécution.',
    metrics: {
      totalLeads: 240,
      qualificationRate: 88,
      lastExecution: 'Hier à 17:00'
    },
    config: {
      targetAudience: 'Banque en ligne & FinTech US',
      seniority: ['VP Risk', 'Chief Compliance Officer', 'Head of Payments'],
      industry: 'Services Financiers & FinTech',
      country: 'États-Unis (NY, CA)',
      dailyVolume: 30
    },
    findings: [
      {
        id: 'find-sf1',
        severity: 'info',
        title: 'Parfaite adéquation ICP',
        description: '88% des contacts extraits répondent aux critères stricts de la campagne aval.'
      }
    ],
    recommendations: [
      {
        id: 'rec-sf1',
        parameter: 'dailyVolume',
        label: 'Volume Quotidien de Sourcing',
        currentValue: "30 leads / jour",
        suggestedValue: "45 leads / jour",
        rationale: 'Le taux de qualification étant excellent (88%), augmenter la cadence augmentera directement le pipe qualifié.',
        impact: 'medium',
        applied: false
      }
    ]
  },
  {
    id: 'node-prospect-fintech',
    name: 'Prospection C-Level US',
    type: 'prospect',
    status: 'HEALTHY',
    healthScore: 91,
    x: 420,
    y: -100,
    summary: 'Performances exceptionnelles. Taux d\'ouverture de 68% et taux de réponse de 14.2% avec zéro rebond critique.',
    metrics: {
      totalLeads: 210,
      qualificationRate: 88,
      emailsSent: 185,
      replyRate: 14.2,
      bounceRate: 0.8,
      lastExecution: 'Hier à 19:40'
    },
    config: {
      targetAudience: 'Dirigeants FinTech US',
      seniority: ['VP', 'C-Level'],
      qualificationThreshold: 65,
      sendDelay: '180s',
      dailyVolume: 20
    },
    findings: [
      {
        id: 'find-pf1',
        severity: 'info',
        title: 'Excellente délivrabilité',
        description: 'Le délai d\'envoi de 180s et la signature personnalisée maintiennent le domaine en zone verte.'
      }
    ],
    recommendations: []
  },

  // ── Cluster 4: Pipeline Santé & MedTech Convergent (3 agents: 2 Sourcing -> 1 Prospect) ──
  {
    id: 'node-sourcing-health',
    name: 'Sourcing Santé & MedTech',
    type: 'sourcing',
    status: 'HEALTHY',
    healthScore: 92,
    x: 80,
    y: 80,
    summary: 'Extraction qualifiée de directeurs de cliniques, CHU et laboratoires pharmaceutiques en France.',
    metrics: {
      totalLeads: 320,
      qualificationRate: 84,
      lastExecution: 'Aujourd\'hui à 09:45'
    },
    config: {
      targetAudience: 'Cliniques privées, Établissements de santé & MedTech',
      seniority: ['Directeur Général', 'Directeur Médical', 'Président CME'],
      industry: 'Santé, Dispositifs Médicaux & Pharmacie',
      country: 'France & Benelux',
      dailyVolume: 40
    },
    findings: [
      {
        id: 'find-sh1',
        severity: 'info',
        title: 'Contacts décisionnaires validés',
        description: '94% des contacts détiennent le pouvoir d\'achat d\'équipements.'
      }
    ],
    recommendations: []
  },
  {
    id: 'node-sourcing-biotech',
    name: 'Sourcing BioTech Labs',
    type: 'sourcing',
    status: 'WARNING',
    healthScore: 68,
    x: 100,
    y: 220,
    summary: 'Extraction de laboratoires de recherche et startups biotechnologiques.',
    metrics: {
      totalLeads: 190,
      qualificationRate: 62,
      lastExecution: 'Aujourd\'hui à 07:15'
    },
    config: {
      targetAudience: 'Startups BioTech & Recherche Clinique',
      seniority: ['Lead Scientist', 'Directeur R&D', 'Fondateur'],
      industry: 'Biotechnologie & Essais Cliniques',
      country: 'France & Suisse',
      dailyVolume: 25
    },
    findings: [
      {
        id: 'find-sb1',
        severity: 'warning',
        title: 'Profils chercheurs non acheteurs',
        description: 'Certains contacts sont des chercheurs purs sans délégation budgétaire.'
      }
    ],
    recommendations: []
  },
  {
    id: 'node-prospect-health',
    name: 'Prospection Cliniques & Santé',
    type: 'prospect',
    status: 'HEALTHY',
    healthScore: 86,
    x: 380,
    y: 150,
    summary: 'Campagnes d\'engagement hyper-ciblées auprès des décideurs de la santé (reçoit les flux MedTech et BioTech).',
    metrics: {
      totalLeads: 410,
      qualificationRate: 79,
      emailsSent: 260,
      replyRate: 11.4,
      bounceRate: 0.6,
      lastExecution: 'Aujourd\'hui à 10:30'
    },
    config: {
      targetAudience: 'Direction d\'établissements de santé',
      seniority: ['Directeur Général', 'Directeur Médical', 'Président CME'],
      qualificationThreshold: 70,
      sendDelay: '120s',
      dailyVolume: 30
    },
    findings: [
      {
        id: 'find-ph1',
        severity: 'info',
        title: 'Haute délivrabilité médicale',
        description: 'Copies emails professionnelles et respect du cadre réglementaire.'
      }
    ],
    recommendations: []
  }
];

export const INITIAL_LINKS: SupervisorLink[] = [
  // ── Liaison 1: Sourcing Santé -> Prospection Santé ──
  {
    id: 'link-health-to-health',
    source: 'node-sourcing-health',
    target: 'node-prospect-health',
    sourceName: 'Sourcing Santé & MedTech',
    targetName: 'Prospection Cliniques & Santé',
    status: 'HEALTHY',
    alignmentScore: 89,
    summary: 'Pipeline convergent très performant. Adéquation forte entre le ciblage directionnel et les critères ICP.',
    throughput: {
      leadsExtracted: 320,
      leadsTransferred: 280,
      leadsQualified: 245,
      leadsRejected: 35,
      conversionRate: 87.5
    },
    alignmentMatrix: [
      {
        dimension: 'Niveau de Séniorité',
        sourcingValue: 'Directeur Général, CME',
        prospectValue: 'Direction médicale',
        isMatch: true,
        note: 'Alignement parfait.'
      },
      {
        dimension: 'Secteur d\'activité',
        sourcingValue: 'Santé & MedTech',
        prospectValue: 'Santé & Établissements',
        isMatch: true,
        note: 'Cohérence totale.'
      }
    ],
    topRejectionReasons: [
      { reason: 'Établissement public hors cible', count: 24, percentage: 68 },
      { reason: 'Email invalide', count: 11, percentage: 32 }
    ],
    recommendations: []
  },

  // ── Liaison 2: Sourcing BioTech -> Prospection Santé (2ème source vers le même prospecteur) ──
  {
    id: 'link-biotech-to-health',
    source: 'node-sourcing-biotech',
    target: 'node-prospect-health',
    sourceName: 'Sourcing BioTech Labs',
    targetName: 'Prospection Cliniques & Santé',
    status: 'WARNING',
    alignmentScore: 64,
    summary: 'Convergence partielle : flux complémentaire avec quelques rejets sur les profils chercheurs.',
    throughput: {
      leadsExtracted: 190,
      leadsTransferred: 150,
      leadsQualified: 98,
      leadsRejected: 52,
      conversionRate: 65.3
    },
    alignmentMatrix: [
      {
        dimension: 'Niveau de Séniorité',
        sourcingValue: 'Lead Scientist, Fondateur',
        prospectValue: 'Direction médicale',
        isMatch: false,
        note: 'Les chercheurs purs sont filtrés.'
      },
      {
        dimension: 'Secteur d\'activité',
        sourcingValue: 'BioTech',
        prospectValue: 'Santé',
        isMatch: true,
        note: 'Secteur compatible.'
      }
    ],
    topRejectionReasons: [
      { reason: 'Profil scientifique sans pouvoir d\'achat', count: 36, percentage: 69 },
      { reason: 'Entreprise trop petite (< 5 employés)', count: 16, percentage: 31 }
    ],
    recommendations: []
  },
  {
    id: 'link-saas-to-enterprise',
    source: 'node-sourcing-saas',
    target: 'node-prospect-enterprise',
    sourceName: 'Sourcing SaaS EMEA',
    targetName: 'Prospection Enterprise SaaS',
    status: 'CRITICAL',
    alignmentScore: 36,
    summary: 'Désynchronisation majeure : Sourcing extrait des Managers que Prospection rejette immédiatement avec un seuil de 85/100.',
    throughput: {
      leadsExtracted: 480,
      leadsTransferred: 310,
      leadsQualified: 58,
      leadsRejected: 252,
      conversionRate: 18.7
    },
    alignmentMatrix: [
      {
        dimension: 'Niveau de Séniorité',
        sourcingValue: 'Manager, Director, VP',
        prospectValue: 'VP Sales, CRO, CEO uniquement',
        isMatch: false,
        note: 'Conflit direct : les "Managers" représentent 54% des rejets du prospecteur.'
      },
      {
        dimension: 'Secteur d\'activité',
        sourcingValue: 'SaaS B2B & Logiciels',
        prospectValue: 'SaaS B2B & Logiciels',
        isMatch: true,
        note: 'Parfaite harmonie sectorielle.'
      },
      {
        dimension: 'Zone Géographique',
        sourcingValue: 'France, UK, Allemagne',
        prospectValue: 'France uniquement',
        isMatch: false,
        note: 'Sourcing alimente des leads UK/DE alors que les templates emails du prospecteur sont en français.'
      },
      {
        dimension: 'Seuil de Tolérance ICP',
        sourcingValue: 'Filtre standard',
        prospectValue: 'Seuil strict (85/100)',
        isMatch: false,
        note: 'L\'entonnoir est trop étroit en aval par rapport à la granularité amont.'
      }
    ],
    topRejectionReasons: [
      { reason: 'Titre de poste hors cible (Manager / Chef de projet)', count: 136, percentage: 54 },
      { reason: 'Langue / Pays non pris en charge (UK / DE)', count: 68, percentage: 27 },
      { reason: 'Score global inférieur au seuil de 85/100', count: 48, percentage: 19 }
    ],
    recommendations: [
      {
        id: 'rec-link-1',
        targetAgentId: 'node-sourcing-saas',
        targetAgentName: 'Sourcing SaaS EMEA',
        parameter: 'country',
        label: 'Zone Géographique Sourcing',
        currentValue: 'France, UK, Allemagne',
        suggestedValue: 'France',
        rationale: 'Prospection n\'envoie actuellement que des emails francophones. Les leads UK et Allemagne sont gaspillés.',
        impact: 'high',
        applied: false
      },
      {
        id: 'rec-link-2',
        targetAgentId: 'node-sourcing-saas',
        targetAgentName: 'Sourcing SaaS EMEA',
        parameter: 'seniority',
        label: 'Séniorité Sourcing',
        currentValue: 'Manager, Director, VP',
        suggestedValue: 'Director, VP, C-Level',
        rationale: 'Résout 54% des causes d\'élimination automatique constatées lors de la qualification.',
        impact: 'high',
        applied: false
      },
      {
        id: 'rec-link-3',
        targetAgentId: 'node-prospect-enterprise',
        targetAgentName: 'Prospection Enterprise SaaS',
        parameter: 'seuil_qualification',
        label: 'Seuil Prospection',
        currentValue: '85 / 100',
        suggestedValue: '70 / 100',
        rationale: 'Permet d\'augmenter le débit utile immédiatement sans altérer la cohérence commerciale.',
        impact: 'medium',
        applied: false
      }
    ]
  },
  {
    id: 'link-fintech-to-c-level',
    source: 'node-sourcing-fintech',
    target: 'node-prospect-fintech',
    sourceName: 'Sourcing FinTech US',
    targetName: 'Prospection C-Level US',
    status: 'HEALTHY',
    alignmentScore: 95,
    summary: 'Pipeline fluide et hautement synchronisé. 88% de conversion entre le sourcing amont et la qualification aval.',
    throughput: {
      leadsExtracted: 240,
      leadsTransferred: 210,
      leadsQualified: 185,
      leadsRejected: 25,
      conversionRate: 88.1
    },
    alignmentMatrix: [
      {
        dimension: 'Niveau de Séniorité',
        sourcingValue: 'VP, Head of, C-Level',
        prospectValue: 'VP, C-Level',
        isMatch: true,
        note: 'Alignement parfait.'
      },
      {
        dimension: 'Secteur d\'activité',
        sourcingValue: 'FinTech & Banking',
        prospectValue: 'FinTech US',
        isMatch: true,
        note: 'Alignement parfait.'
      },
      {
        dimension: 'Zone Géographique',
        sourcingValue: 'États-Unis',
        prospectValue: 'États-Unis (Anglais)',
        isMatch: true,
        note: 'Copies d\'email en adéquation avec les cibles américaines.'
      }
    ],
    topRejectionReasons: [
      { reason: 'Email invalide ou catch-all détecté', count: 18, percentage: 72 },
      { reason: 'Changement de poste récent (< 1 mois)', count: 7, percentage: 28 }
    ],
    recommendations: []
  },
  {
    id: 'link-retail-to-retail',
    source: 'node-sourcing-retail',
    target: 'node-prospect-retail',
    sourceName: 'Sourcing E-Commerce & Retail',
    targetName: 'Prospection Retail Outbound',
    status: 'UNANALYZED',
    alignmentScore: 0,
    summary: 'Liaison nouvellement établie. En attente d\'analyse de synchronisation.',
    throughput: {
      leadsExtracted: 85,
      leadsTransferred: 0,
      leadsQualified: 0,
      leadsRejected: 0,
      conversionRate: 0
    },
    alignmentMatrix: [
      {
        dimension: 'Niveau de Séniorité',
        sourcingValue: 'Directeur, Responsable',
        prospectValue: 'Directeur uniquement',
        isMatch: false,
        note: 'Audit préventif conseillé.'
      }
    ],
    topRejectionReasons: [],
    recommendations: []
  }
];
