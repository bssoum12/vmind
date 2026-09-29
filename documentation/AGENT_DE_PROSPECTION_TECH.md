# Documentation Technique : Agent de Prospection

Ce document décrit en détail l'architecture, les fonctionnalités et le flux de données de la fonctionnalité **Agent de Prospection** intégrée au projet **VMIND** (Front-end et Back-end).

---

## 1. Vue d'Ensemble
L'Agent de Prospection est un module autonome et intelligent conçu pour automatiser la recherche, la qualification et la prise de contact avec des prospects (leads). Il s'intègre profondément dans l'écosystème VMIND en combinant une interface utilisateur de gestion (Workspace) avec un backend robuste s'appuyant sur SQL Server, Redis, Upstash QStash et des workflows n8n pour l'exécution asynchrone par LLM.

---

## 2. Architecture Globale et Composants

Le module est divisé entre le client Web (Next.js) et l'API serveur (Express/Node.js).

### A. Le Front-end (`Vmind_Front`)
L'interface de l'agent est structurée autour de deux parcours principaux :
1. **Le Wizard de Déploiement (`features/management/wizard/`)** :
   - Interface conversationnelle et formulaires pour configurer l'agent (Modèle LLM, Seuil de qualification, Volume d'emails, Délais, Signature et **ICP** - *Ideal Customer Profile*).
   - Configuration des règles de déclenchement (Cron/Schedules).
2. **Le Workspace Agent (`features/management/prospect-workspace/`)** :
   - Un tableau de bord complet de supervision (DashboardView).
   - Un gestionnaire de Leads (LeadsView) avec possibilité d'import (CSV, JSON, manuel) et un tiroir détaillé (`LeadDetailDrawer`).
   - Un gestionnaire de Campagnes d'emails (CampaignsView) pour suivre les séquences envoyées.
   - Un observateur de Logs (LogsView) pour le diagnostic.

### B. Le Back-end (`Vmind_Backend/src/prospect-agent/`)
Le backend expose des API dédiées sous le routeur `/api/prospect-agent/` :
- `deploy.ts` : Sauvegarde la configuration de l'agent en base de données et publie son état initial dans Redis.
- `leads.ts` : Gère l'ingestion de nouveaux leads (simples ou par lots), l'assignation à des agents spécifiques, et la vérification des doublons.
- `qualify.ts` : Moteur d'évaluation qui vérifie un lead contre l'ICP de l'agent et met à jour son score de qualification.
- `campaigns.ts` : Gestion des envois d'emails et des modèles de séquences.
- `logs.ts` : Traçabilité des actions effectuées par l'IA.
- `agents.ts` / `api.ts` : Résolution des agents et middleware global de routage.

---

## 3. Le Modèle de Données (SQL Server)

Le cœur de l'agent repose sur un schéma relationnel strict :
- **`agents`** : Stocke l'identité de l'agent, son type (`run_mode`), sa timezone et son UUID public.
- **`agent_config`** : Stocke les paramètres d'IA (LLM, ICP sous format JSON, limites d'emails).
- **`agent_trigger_rules`** : Configuration des déclencheurs temporels.
- **`leads`** : Table globale de tous les contacts bruts (Nom, Email, Poste, Entreprise, etc.).
- **`agent_qualifications`** : Table de liaison mesurant le score (0-100) et le statut (`est_qualifie`) d'un lead spécifique par rapport à un agent spécifique.
- **`agent_lead_access`** : Table de sécurité garantissant qu'un agent a le droit de lire et de traiter un lead donné.

---

## 4. Workflow et Cycle de Vie d'un Lead

1. **Ingestion** : Les leads sont insérés via l'interface (Import de masse ou création manuelle). Le backend (`leads.ts`) vérifie l'existence de l'email. Si le lead existe, il est rattaché à l'agent ; sinon, il est créé.
2. **Assignation Automatique** : Lors de l'ingestion pour un agent, une entrée est générée dans `agent_lead_access` (Droit d'accès) et `agent_qualifications` (Statut initial "Nouveau").
3. **Qualification par l'IA** : L'outil n8n appelle l'endpoint `/qualify`. Le backend analyse le profil du prospect face à l'ICP défini par l'utilisateur lors du wizard. Un score et un raisonnement (`raison`) sont retournés et persistés.
4. **Action (Campagne)** : Si le score dépasse le `seuil_qualification` configuré, le lead est marqué comme qualifié (`est_qualifie = true`), le débloquant pour les séquences d'envoi d'emails.

---

## 5. Sécurité et Identifiants Publics (Refonte UUID)

Historiquement, les entités utilisaient leur identifiant technique (entier `agent_id`). Une refonte de sécurité a été opérée pour rendre le module robuste aux attaques par énumération :

1. **Génération d'UUID :** Chaque agent reçoit un `UNIQUEIDENTIFIER` (ex: `0C59B660-304A...`) lors de sa création.
2. **Middleware de Traduction (`api.ts`) :** Les routes d'API exposées utilisent l'UUID dans l'URL. Un middleware intercepte cet UUID, consulte la base SQL pour retrouver l'`agent_id` interne, et le passe aux contrôleurs. Le moteur SQL continue ainsi de faire des jointures performantes sur des entiers (INT).
3. **Isolation des Payloads (`leads.ts`) :** Pour les routes de type POST acceptant des listes d'agents, la traduction est effectuée à la volée avant toute tentative d'insertion dans les tables de liaison (`agent_lead_access`).
4. **Interface Dynamique :** Le frontend conserve les UUID dans les paramètres d'URL (App Router Next.js) et résout dynamiquement le vrai nom de l'agent via `getAgents()` pour un affichage propre (`Espace de Travail : Nom de l'Agent`).

---

## 6. Intégration Redis & Upstash (QStash)

L'Agent de Prospection ne tourne pas en permanence dans Node.js. Il fonctionne sur un modèle asynchrone "Serverless" via **Upstash** :
- **Redis (`upstash.ts`)** : Sert de cache haute performance. L'état global de l'agent (Running/Paused), son dernier lancement, et son payload de configuration sont poussés vers Redis lors du déploiement. Le webhook n8n interroge ce cache pour prendre ses décisions en millisecondes.
- **QStash** : Planificateur de tâches. À la fin du Wizard, le backend calcule une expression CRON à partir de l'intervalle fourni, et enregistre un "Schedule" sur Upstash. Upstash se chargera de pinguer le Webhook n8n de manière autonome.

---

## 7. Résumé des Acquis

Depuis le début du développement de cette feature, nous avons couvert :
- Le design UI/UX du Wizard et du Workspace complet en s'assurant d'une cohérence visuelle "Dark Futuriste".
- Le parsing complexe des règles de déclenchement temporelles.
- Un système d'import asynchrone de Leads très tolérant aux erreurs (dédoublonnage intelligent).
- L'isolation stricte des données (Multi-Tenant et vérification de permissions `userId / agentId`).
- La refonte de sécurité par UUID garantissant l'anonymat des clés internes.
- La tuyauterie complète avec n8n via Redis/QStash pour orchestrer les LLMs.

---
