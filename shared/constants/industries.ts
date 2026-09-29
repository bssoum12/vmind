/**
 * Liste des secteurs d'activité (industries) — condensée depuis la nomenclature
 * officielle NAT/NACE vers une liste plate business-friendly.
 *
 * Usage: autocomplete / dropdown dans le Prospect Agent Wizard, filtre Sourcing Agent,
 * ou catégorisation des leads.
 */

export const INDUSTRIES = [
  // Industries extractives & énergie
  "Mines et extraction",
  "Extraction de pétrole et de gaz",
  "Extraction de phosphates",
  "Production et distribution d'électricité",
  "Production et distribution de gaz",
  "Eau, assainissement et gestion des déchets",

  // Agroalimentaire
  "Agroalimentaire",
  "Boulangerie, pâtisserie et confiserie",
  "Boissons (alcoolisées et non alcoolisées)",
  "Huiles et corps gras",
  "Produits laitiers",
  "Meunerie et produits céréaliers",

  // Textile, cuir, ameublement
  "Textile et habillement",
  "Cuir, maroquinerie et chaussures",
  "Bois et ameublement",
  "Papier, carton et imprimerie",
  "Édition (livres, presse, jeux)",

  // Chimie, pharma, matériaux
  "Chimie et produits chimiques",
  "Industrie pharmaceutique",
  "Plasturgie et caoutchouc",
  "Verre et céramique",
  "Matériaux de construction (ciment, béton, plâtre)",
  "Métallurgie et sidérurgie",
  "Construction et structures métalliques",

  // Machines, électronique, transport
  "Machines et équipements industriels",
  "Équipements électriques",
  "Électronique et composants",
  "Informatique - matériel (hardware)",
  "Automobile et équipements automobiles",
  "Aéronautique et spatial",
  "Construction navale",
  "Matériel ferroviaire",
  "Fabrication de meubles",
  "Instruments médicaux et de précision",
  "Bijouterie et joaillerie",
  "Jouets et articles de sport",
  "Autres industries manufacturières",

  // BTP / Immobilier
  "Construction et BTP",
  "Travaux publics et génie civil",
  "Promotion immobilière",
  "Immobilier (agences, gestion, location)",
  "Architecture",

  // Commerce
  "Commerce de gros",
  "Commerce de détail",
  "Commerce et réparation automobile",
  "Import-export / négoce international",
  "E-commerce",

  // Transport et logistique
  "Transport routier de marchandises",
  "Transport et logistique",
  "Transport maritime",
  "Transport aérien",
  "Transport ferroviaire",
  "Entreposage et stockage",
  "Services postaux et courrier",

  // Hôtellerie, tourisme, restauration
  "Hôtellerie et hébergement touristique",
  "Restauration",
  "Tourisme et voyages",

  // Information, communication, tech
  "Télécommunications",
  "Édition de logiciels",
  "Services informatiques et conseil IT",
  "Hébergement de données et cloud",
  "Audiovisuel, cinéma et production TV",
  "Médias et presse",
  "Agences de communication et publicité",

  // Finance et assurance
  "Banque et services financiers",
  "Assurance",
  "Gestion de fonds et investissement",
  "Fintech",

  // Services professionnels
  "Conseil en stratégie et management",
  "Cabinets comptables et audit",
  "Cabinets juridiques",
  "Ingénierie et bureaux d'études",
  "Ressources humaines et recrutement",
  "Marketing et études de marché",
  "R&D et biotechnologie",

  // Services aux entreprises / support
  "Sécurité privée",
  "Nettoyage et services aux bâtiments",
  "Location de matériel et équipements",
  "Services administratifs et centres d'appels",
  "Événementiel et organisation de salons",
  "Travail temporaire et intérim",

  // Éducation
  "Enseignement primaire et secondaire",
  "Enseignement supérieur",
  "Formation professionnelle et continue",

  // Santé et social
  "Santé humaine (hôpitaux, cliniques)",
  "Cabinets médicaux et dentaires",
  "Laboratoires d'analyses médicales",
  "Action sociale et hébergement médicalisé",

  // Arts, sport, loisirs
  "Sport et clubs de fitness",
  "Arts, culture et spectacle vivant",
  "Jeux et divertissement",
  "Parcs d'attractions et loisirs",

  // Autres services
  "Coiffure, esthétique et bien-être",
  "Blanchisserie et pressing",
  "Réparation d'appareils et équipements",
  "Services funéraires",
  "Autres services aux particuliers",
] as const;

export type Industry = (typeof INDUSTRIES)[number];
