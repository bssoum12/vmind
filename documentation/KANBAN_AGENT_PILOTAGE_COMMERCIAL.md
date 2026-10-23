# 📋 Tableau Kanban : Agent IA de Pilotage Commercial (Superviseur)

> **Document de cadrage et feuille de route opérationnelle**
> Basé sur les orientations fonctionnelles de pilotage commercial et leur adaptation à l'écosystème multi-agents VMIND (**Agent de Sourcing** ➔ **Agent de Prospection**).

---

## 🧭 1. Synthèse de la Vision & Périmètre

Le pilotage commercial dans VMIND change de paradigme : **il supervise désormais une équipe constituée à 100 % d'agents IA**, avec les commerciaux humains placés en bout de chaîne pour la prise en charge des rendez-vous qualifiés, l'émission des cotations et le closing commercial.

### L'entonnoir supervisé :
$$\text{Agent Sourcing (Leads)} \longrightarrow \text{Agent Qualification (ICP)} \longrightarrow \text{Agent Mailing (Outreach)} \longrightarrow \text{Réponses / RDV} \longrightarrow \text{Humain (Closing)}$$

---

## 📊 2. Vue Synthétique du Kanban

| 🟢 FAIT (En Production) | 🟡 PRÊT (Données VMIND Existantes) | 🔵 EN ATTENTE (Spécifications Internes) | 🔴 BLOQUÉ (Dépendances Externes Requises) |
| :--- | :--- | :--- | :--- |
| • Cartographie Graphe 2D | • Entonnoir Global (Funnel) | • Dérive de scoring LLM | • CA & Marge Réalisée (**ERP**) |
| • Drawers Diagnostics | • Désalignement Sourcing / Qualif | • Fatigue des objets d'email | • RDV Obtenus & Coût/RDV (**Agenda**) |
| • Modale Audit Flotte | • Complétude des Données (Data Health) | • Échantillonnage Contrôle Qualité | • Appels & Analyse Vocale (**VoIP**) |
| • Contexte Entreprise | • Alertes Prioritaires (>48h sans suivi) | • Synthèse Hebdo Rituels Manager | • Réputation DNS / Spam (**API Postmaster**) |
| • Carte Marketplace | • Moteur de Recommandations Actionnable | • Calibration du seuil ICP | • Split-Testing A/B Automatisé (**n8n Engine**) |
| | • Tableau de Bord d'Activité & Santé | | • Chatbot Conversationnel DG (**RAG SQL**) |

---

## 🟢 3. Colonne 1 : FAIT / EN PRODUCTION

| ID | Module / Tâche | Description & Livrable | Composant Code |
| :--- | :--- | :--- | :--- |
| **KBN-01** | **Cartographie Réseau Interactive 2D** | Graphe de force interactif (moteur force-directed type Obsidian) modélisant les flux Sourcing ➔ Prospection, les badges d'état et les liens de transmission de leads. | [`SupervisorGraphCanvas.tsx`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/Mcp-Server-IA-Front/features/management/supervisor-workspace/components/SupervisorGraphCanvas.tsx) |
| **KBN-02** | **Tiroirs Latéraux de Diagnostic** | Drawers coulissants affichant le diagnostic unitaire d'un agent (Node) ou d'une liaison (Edge) avec score de santé (0-100%) et constats clés. | [`NodeDiagnosticDrawer.tsx`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/Mcp-Server-IA-Front/features/management/supervisor-workspace/components/NodeDiagnosticDrawer.tsx), [`EdgeDiagnosticDrawer.tsx`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/Mcp-Server-IA-Front/features/management/supervisor-workspace/components/EdgeDiagnosticDrawer.tsx) |
| **KBN-03** | **Modale d'Audit Global de Flotte** | Analyse globale déclenchable en 1 clic pour évaluer la cohérence de toute la flotte d'agents commerciaux déployés. | [`FullFleetAuditModal.tsx`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/Mcp-Server-IA-Front/features/management/supervisor-workspace/components/FullFleetAuditModal.tsx) |
| **KBN-04** | **Contexte Stratégique Entreprise** | Saisie et persistance de la proposition de valeur, du profil client idéal (ICP) et des concurrents servant de benchmark au superviseur. | [`CompanyContextModal.tsx`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/Mcp-Server-IA-Front/features/management/supervisor-workspace/components/CompanyContextModal.tsx) |
| **KBN-05** | **Fiche Marketplace & Wizard de Déploiement** | Carte du template *Superviseur Commercial* sur la Marketplace, ouvrant un assistant de déploiement par étapes (`WizardSupervisorView.tsx`) avec génération de nom unique (`Superviseur Commercial - <RANDOM>`). | [`MarketplaceView.tsx`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/Mcp-Server-IA-Front/features/management/marketplace/MarketplaceView.tsx), [`WizardSupervisorView.tsx`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/Mcp-Server-IA-Front/features/management/wizard/WizardSupervisorView.tsx) |
| **KBN-06** | **Sélection de Flotte Superviseur & Espace Filtré** | Sélecteur multi-agents (`AgentMultiSelect.tsx`), boutons de choix ("Déployer & Lancer l'Audit" vs "Déployer Uniquement"), table PostgreSQL `supervisor_agent_settings`, endpoints backend (`/api/supervisor-agent/deploy`, `/api/supervisor/fleet-graph/:id`), et rendu dynamique du graphe restreint aux agents sélectionnés. | [`AgentMultiSelect.tsx`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/Mcp-Server-IA-Front/features/management/wizard/components/AgentMultiSelect.tsx), [`SupervisorWorkspace.tsx`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/Mcp-Server-IA-Front/features/management/supervisor-workspace/components/SupervisorWorkspace.tsx), [`deploy.ts`](file:///c:/Users/hamza/OneDrive/Bureau/Vmind-front/VMIND%20DEVOPS/VMIND%2520AI/src/supervisor-agent/routes/deploy.ts) |

---

## 🟡 4. Colonne 2 : PRÊT À DÉVELOPPER (Données Existantes VMIND - Phase 1 MVP)

> Ces modules exploitent directement les tables PostgreSQL déjà actives dans VMIND (`prospect_agent_leads`, `prospect_agent_qualifications`, `prospect_agent_emails_envoyes`, `prospect_agent_logs_execution`).

### KBN-10 : Pipeline Funnel Visuel (Entonnoir Global de Conversion)
- **Objectif** : Mesurer et afficher le taux de transformation étape par étape :
  1. **Leads Sourcés** : Volume total extrait par les agents de sourcing (`origin_agent = 'sourcing_agent'`).
  2. **Leads Qualifiés** : Leads ayant passé avec succès le filtre ICP (`est_qualifie = true`).
  3. **Leads Contactés** : Leads ayant reçu au moins un email d'approche (`emails_count > 0` et statut `'SENT'`).
  4. **Leads Engagés** : Réponses positives / prospects chauds prêts pour le commercial.
- **Formule / Métrique** :
  - Taux de qualification : $\frac{\text{Leads Qualifi\'es}}{\text{Leads Sourc\'es}} \times 100$
  - Taux de contactabilité : $\frac{\text{Emails D\'elivr\'es}}{\text{Leads Qualifi\'es}} \times 100$
- **Données VMIND** : Tables `prospect_agent_leads`, `prospect_agent_qualifications`, `prospect_agent_emails_envoyes`.

### KBN-11 : Détecteur de Désalignement Sourcing ➔ Prospection
- **Objectif** : Identifier les frictions entre la cible définie dans l'Agent Sourcing et les critères de qualification de l'Agent Prospection.
- **Métrique clé** : Taux de rejet par critère (ex: 60 % des leads rejetés le sont pour raison "Hors zone géographique" ou "Taille d'entreprise inadaptée").
- **Action suggérée générée** : *"Resserrer le filtre secteur de l'Agent Sourcing pour économiser des crédits d'enrichissement."*
- **Données VMIND** : `prospect_agent_qualifications.raison` et `statut_traitement`.

### KBN-12 : Tableau de Santé & Complétude des Données (Data Health)
- **Objectif** : S'assurer que le CRM ne se pollue pas de fiches incomplètes ou invalides.
- **Indicateurs mesurés** :
  - **Taux d'enrichissement téléphonique** : % de leads avec `telephone_revealed = true`.
  - **Taux de validité des adresses emails** : Ratio d'emails sans erreur de délivrabilité.
  - **Taux de doublons** : Nombre de leads détectés sur le même domaine ou email et consolidés.
- **Données VMIND** : `prospect_agent_leads` (colonnes `email`, `telephone`, `telephone_revealed`, `entreprise`).

### KBN-13 : Moteur de Recommandations Actionnables (Standard Document)
- **Objectif** : Proposer des ajustements conformes à la structure formalisée dans les documents du responsable :
  - **Constat chiffré** : *« Le secteur X produit 3 fois plus de réponses positives. »*
  - **Cause probable** : *« Forte résonance de la proposition de valeur sur ce marché. »*
  - **Action proposée** : *« Réorienter 60 % de l'effort de génération vers le secteur X. »*
  - **Impact estimé** : *« +25 % de leads qualifiés par semaine. »*
  - **Priorité** : *Haute / Moyenne / Basse*
  - **Boucle de feedback** : Boutons `[ Appliquer ]`, `[ Modifier ]`, `[ Rejeter ]`.

### KBN-14 : Alertes Prioritaires Opérationnelles (Hot Leads & Rebond)
- **Objectif** : Prévenir le gaspillage commercial et protéger le domaine :
  - **Lead chaud non pris en charge** : Alerte si un prospect avec `potentiel = 'Eleve'` ou `score >= 85` n'a eu aucune interaction humaine depuis plus de 48 heures.
  - **Pic d'échec d'envoi** : Alerte si le taux d'erreur dépasse 5 % sur une fenêtre de 24h.
- **Données VMIND** : `prospect_agent_qualifications.timestamp`, `prospect_agent_emails_envoyes.statut`.

---

## 🔵 5. Colonne 3 : EN ATTENTE DE SPÉCIFICATIONS INTERNES (Phase 2)

> Fonctionnalités réalisables à moyen terme nécessitant un cadrage métier complémentaire.

### KBN-20 : Analyse de Dérive du Scoring dans le Temps
- **Objectif** : Détecter si le modèle LLM de qualification devient trop sévère ou trop permissif sans justification.
- **Prérequis interne** : Définir la méthode d'échantillonnage temporel (moyenne mobile sur 14 jours vs 30 jours).

### KBN-21 : Analyse de Répétition & Fatigue des Séquences
- **Objectif** : Détecter l'usure d'un objet d'email ou d'une accroche (baisse continue du taux d'ouverture au-delà de 200 envois).
- **Prérequis interne** : Taguer les variantes d'objets dans `prospect_agent_emails_envoyes`.

### KBN-22 : Contrôle Qualité par Échantillonnage Humain
- **Objectif** : Présenter chaque semaine au responsable commercial 5 leads et 5 emails tirés au sort pour relecture et notation binaire (Pertinent / Non pertinent).
- **Prérequis interne** : Créer une table de stockage des retours qualitatifs du manager.

### KBN-23 : Synthèse Hebdomadaire pour les Rituels Commerciaux
- **Objectif** : Génération automatisée de l'ordre du jour de la réunion commerciale du lundi matin (bilan chiffré de la semaine passée, priorités de la semaine).

---

## 🔴 6. Colonne 4 : BLOQUÉ / EN ATTENTE DE DÉPENDANCES EXTERNES (To-Do Suggestions)

> [!IMPORTANT]
> **Ces fonctionnalités sont demandées dans les documents de cadrage du responsable**, mais dépendent d'API ou d'outils tiers non encore branchés à VMIND. Elles doivent être présentées dans l'interface sous forme de **Suggestions & Roadmap** avec mention claire du connecteur requis.

### KBN-30 : Suivi du Chiffre d'Affaires, Marge Réalisée & Devis Signés
- **Statut** : 🔴 **BLOQUÉ (En attente de dépendance)**
- **Dépendance manquante** : **Connecteur ERP Ventes (TraLIS / Odoo / Sage)**
- **Pourquoi c'est bloqué** : VMIND orchestre la prospection et la qualification de leads. Dès lors que le prospect devient client, le devis (*cotation*), la commande, la facture et la marge brute sont enregistrés dans l'ERP. Sans flux ERP montant, le calcul du CA généré par agent est impossible.
- **Suggestion d'affichage UI** : Carte KPI grisée avec badge `[ 🔌 Requis : Connecteur ERP TraLIS/Sage ]`.

### KBN-31 : Suivi des RDV Obtenus & Coût par RDV
- **Statut** : 🔴 **BLOQUÉ (En attente de dépendance)**
- **Dépendance manquante** : **Webhook Agenda / Calendrier (Calendly, Google Calendar, HubSpot Meetings)**
- **Pourquoi c'est bloqué** : Les emails incitent à la prise de rendez-vous (lien de réservation), mais la confirmation effective du RDV, le taux de no-show et la conversion en opportunité dépendent de l'outil d'agenda.
- **Suggestion d'affichage UI** : Étape de l'entonnoir marquée `[ 📅 En attente intégration Agenda ]`.

### KBN-32 : Surveillance de la Réputation DNS du Domaine (Délivrabilité)
- **Statut** : 🔴 **BLOQUÉ (En attente de dépendance)**
- **Dépendance manquante** : **API DNS & Postmaster (Google Postmaster Tools / SendGrid Webhook / MxToolbox)**
- **Pourquoi c'est bloqué** : VMIND enregistre les échecs SMTP locaux, mais n'a pas accès à la réputation globale du nom de domaine, au taux de placement en spam chez Gmail/Outlook ni au statut DMARC en temps réel.
- **Suggestion d'affichage UI** : Voyant d'alerte avec suggestion `[ 🛡️ Connecter API Google Postmaster ]`.

### KBN-33 : Suivi des Appels Téléphoniques Commerciaux
- **Statut** : 🔴 **BLOQUÉ (En attente de dépendance)**
- **Dépendance manquante** : **Connecteur Téléphonie VoIP (Aircall / Twilio / Ringover)**
- **Pourquoi c'est bloqué** : VMIND enrichit les contacts avec leurs numéros directs, mais ne possède pas de softphone intégré pour tracer les appels émis, les durées et la transcription IA.
- **Suggestion d'affichage UI** : Bloc indicateur suggéré `[ 📞 Requis : Intégration Téléphonie Cloud ]`.

### KBN-34 : Moteur de Split-Testing A/B Automatisé
- **Statut** : 🔴 **BLOQUÉ (En attente de dépendance)**
- **Dépendance manquante** : **Moteur de Split-Routing n8n & Calcul de Signification Statistique**
- **Pourquoi c'est bloqué** : Les workflows n8n exécutent actuellement des séquences directes. Il manque la brique algorithmique capable d'attribuer 50/50 les leads et de couper automatiquement la variante perdante.
- **Suggestion d'affichage UI** : Tag de feuille de route `[ 🔬 Phase 3 Roadmap ]`.

### KBN-35 : Chatbot Conversationnel pour la Direction Générale
- **Statut** : 🔴 **BLOQUÉ (En attente de dépendance)**
- **Dépendance manquante** : **Pipeline RAG SQL dédié aux métriques du Superviseur**
- **Pourquoi c'est bloqué** : Le chat assistant principal de VMIND interroge les outils ERP TraLIS, mais ne dispose pas encore des outils d'introspection sur les tables de métriques multi-agents.
- **Suggestion d'affichage UI** : Maquette de boîte de dialogue avec questions types pré-remplies.

---

## 🎯 7. Prochaines Étapes Recommandées

1. **Partager ce document avec votre responsable** pour valider la répartition entre l'existant immédiatement livrable (Colonne 2) et les briques soumises à dépendances (Colonne 4).
2. **Implémenter dans le Superviseur l'onglet "Entonnoir & Performance"** pour rendre visible dès aujourd'hui la valeur ajoutée des données existantes.
3. **Intégrer le volet "Suggestions & Dépendances"** dans l'UI pour matérialiser la vision complète et guider les futurs choix d'intégration de l'entreprise.
