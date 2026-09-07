/**
 * Liste des titres de poste (job titles) — condensée depuis une nomenclature
 * exhaustive vers une liste plate business-friendly.
 *
 * Usage: autocomplete / dropdown dans le Prospect Agent Wizard, filtre Sourcing Agent,
 * ou catégorisation des contacts.
 */

export const JOB_TITLES = [
  // Option spéciale décisionnaires
  "Tous les postes décisionnaires",

  // Direction générale
  "PDG / CEO",
  "Directeur général",
  "Directeur général adjoint",
  "Président",
  "Fondateur",
  "Co-fondateur",
  "Associé / Partner",
  "Gérant",
  "Membre du comité de direction",

  // Ventes / Commercial
  "Directeur commercial",
  "Directeur des ventes",
  "Responsable commercial",
  "Responsable des ventes",
  "Chef des ventes",
  "Manager commercial",
  "Ingénieur commercial",
  "Ingénieur d'affaires",
  "Chargé d'affaires",
  "Attaché commercial",
  "Commercial",
  "Représentant commercial",
  "Business developer",
  "Account manager",
  "Key account manager",
  "Chargé de clientèle",
  "Assistant commercial",
  "Responsable export",
  "Responsable grands comptes",

  // Marketing / Communication
  "Directeur marketing",
  "Responsable marketing",
  "Chef de produit",
  "Chargé de marketing",
  "Responsable marketing digital",
  "Growth manager",
  "Chargé de communication",
  "Directeur de la communication",
  "Community manager",
  "Responsable études de marché",
  "Attaché de presse",

  // Direction financière / Comptabilité
  "Directeur financier / CFO",
  "Responsable financier",
  "Contrôleur de gestion",
  "Directeur administratif et financier",
  "Chef comptable",
  "Comptable",
  "Aide-comptable",
  "Trésorier",
  "Analyste financier",
  "Auditeur financier",
  "Responsable de la paie",

  // Direction technique / IT
  "Directeur technique / CTO",
  "Directeur des systèmes d'information / DSI",
  "Responsable informatique",
  "Chef de projet informatique",
  "Ingénieur logiciel / Développeur",
  "Architecte logiciel",
  "Administrateur systèmes et réseaux",
  "Responsable infrastructure IT",
  "Ingénieur DevOps",
  "Data engineer",
  "Data analyst",
  "Data scientist",
  "Responsable cybersécurité",
  "Product manager",
  "Product owner",
  "Scrum master",
  "Ingénieur QA / Testeur",

  // Ressources humaines
  "Directeur des ressources humaines / DRH",
  "Responsable RH",
  "Chargé de recrutement",
  "Gestionnaire de paie",
  "Responsable formation",
  "Assistant RH",

  // Achats / Supply chain / Logistique
  "Directeur des achats",
  "Responsable achats",
  "Acheteur",
  "Directeur logistique",
  "Responsable logistique",
  "Responsable supply chain",
  "Responsable entrepôt",
  "Gestionnaire de stock",
  "Agent logistique",

  // Production / Opérations / Qualité
  "Directeur des opérations / COO",
  "Directeur de production",
  "Responsable de production",
  "Chef d'atelier",
  "Responsable qualité",
  "Ingénieur qualité",
  "Responsable QHSE",
  "Responsable maintenance",
  "Ingénieur méthodes",
  "Superviseur de production",

  // R&D / Ingénierie / Technique
  "Directeur R&D",
  "Responsable R&D",
  "Ingénieur R&D",
  "Ingénieur d'études",
  "Ingénieur projet",
  "Chef de projet",
  "Ingénieur process",
  "Architecte",
  "Ingénieur mécanique",
  "Ingénieur électrique",

  // Juridique
  "Directeur juridique",
  "Responsable juridique",
  "Juriste",
  "Avocat",
  "Assistant juridique",

  // Service client / Support
  "Directeur service client",
  "Responsable service client",
  "Chargé de support client",
  "Conseiller clientèle",
  "Agent de service client",

  // Immobilier / BTP
  "Directeur de projet immobilier",
  "Conducteur de travaux",
  "Architecte / Bureau d'études",
  "Agent immobilier",
  "Chef de chantier",

  // Santé
  "Médecin",
  "Directeur d'établissement de santé",
  "Pharmacien",
  "Infirmier",

  // Éducation
  "Directeur d'établissement scolaire",
  "Enseignant",
  "Responsable pédagogique",

  // Administration / Assistanat
  "Directeur administratif",
  "Assistant de direction",
  "Office manager",
  "Assistant administratif",
  "Secrétaire général",
  "Secrétaire",
  "Réceptionniste",
  "Standardiste",

  // Métiers techniques / BTP (terrain)
  "Électricien",
  "Plombier",
  "Chauffagiste",
  "Maçon",
  "Menuisier",
  "Charpentier",
  "Peintre en bâtiment",
  "Carreleur",
  "Couvreur",
  "Serrurier-métallier",
  "Soudeur",
  "Mécanicien automobile",
  "Mécanicien industriel",
  "Électromécanicien",
  "Technicien de maintenance",
  "Technicien informatique",
  "Chef d'équipe",
  "Contremaître",
  "Grutier",
  "Conducteur d'engins",

  // Transport / Livraison
  "Chauffeur-livreur",
  "Chauffeur poids lourd",
  "Conducteur de transport en commun",
  "Coursier",
  "Pilote de ligne",

  // Entrepôt / Production (opérateurs)
  "Magasinier",
  "Cariste",
  "Manutentionnaire",
  "Préparateur de commandes",
  "Opérateur de production",
  "Ouvrier de production",
  "Contrôleur qualité",

  // Restauration / Hôtellerie
  "Chef cuisinier",
  "Cuisinier",
  "Second de cuisine",
  "Pâtissier",
  "Boulanger",
  "Boucher",
  "Serveur",
  "Barman",
  "Sommelier",
  "Réceptionniste d'hôtel",
  "Gouvernant(e)",
  "Femme/homme de chambre",

  // Commerce / Vente au détail
  "Vendeur",
  "Vendeur-conseil",
  "Caissier",
  "Employé de libre-service",
  "Boucher-vendeur",
  "Fleuriste",
  "Pharmacien d'officine",
  "Opticien",

  // Santé (élargi)
  "Médecin généraliste",
  "Médecin spécialiste",
  "Chirurgien",
  "Dentiste",
  "Sage-femme",
  "Aide-soignant",
  "Kinésithérapeute",
  "Psychologue",
  "Diététicien",
  "Vétérinaire",
  "Ambulancier",

  // Beauté / Bien-être
  "Coiffeur",
  "Esthéticien",
  "Masseur-kinésithérapeute",

  // Sécurité / Public
  "Agent de sécurité",
  "Policier",
  "Gendarme",
  "Sapeur-pompier",
  "Militaire",

  // Agriculture / Environnement
  "Agriculteur",
  "Éleveur",
  "Viticulteur",
  "Paysagiste",
  "Jardinier",
  "Technicien environnement",

  // Créatif / Médias
  "Graphiste",
  "Designer UX/UI",
  "Photographe",
  "Vidéaste / Monteur vidéo",
  "Journaliste",
  "Rédacteur / Copywriter",
  "Traducteur-interprète",

  // Éducation (élargi)
  "Professeur des écoles",
  "Enseignant secondaire",
  "Professeur d'université",
  "Formateur professionnel",

  // Juridique / Notariat (élargi)
  "Notaire",
  "Huissier de justice",

  // Artisanat / Métiers spécialisés
  "Horloger",
  "Bijoutier",
  "Tailleur / Couturier",
  "Cordonnier",
  "Imprimeur",
] as const;

export type JobTitle = (typeof JOB_TITLES)[number];
