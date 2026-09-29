# Audit VMIND AI — Analyse Comparative & Plan d'Action
## Bilan de la Version Actuelle : Ce qui est Fait (DONE), Ce qui Reste à Faire (TODO) et Guide de Mise en Œuvre

Ce document fournit une analyse comparative approfondie suite au rapport d'audit architectural et de sécurité de la plateforme **VMIND**. Il détaille précisément, axe par axe, les éléments déjà résolus dans la version actuelle, les dettes techniques restantes et la méthodologie concrète pour les traiter avec un impact minimal sur le code existant.

---

## 1. Matrice Synthétique d'Avancement

| Axe d'Audit | Statut | Ce qui est Fait (DONE) | Ce qui Reste à Faire (TODO) |
| :--- | :---: | :--- | :--- |
| **Axe A — Découplage MCP & API** | **RÉALISÉ (DONE)** | • Processus MCP dédié (`MCP_Tralis` sur le port `3002`).<br/>• `server-http.ts` réduit de 2 834 à 241 lignes.<br/>• `mcp-server.ts` réduit de 2 036 à 92 lignes.<br/>• Proxy transparent depuis le port `3001`. | • Centraliser le schéma d'infrastructure dans le README racine. |
| **Axe B — Secrets & Credentials** | **PARTIEL** | • Jeton éphémère (5 min) pour l'exécution n8n vers MCP.<br/>• Jeton d'activation utilisateur 24h à usage unique. | • Retirer `tenants.json` et `tenants-virtualdev.json` du suivi git.<br/>• Scanner les exports n8n pour éliminer les secrets en dur. |
| **Axe C — Authentification & RBAC** | **AVANCÉ** | • RBAC strict fail-closed (`TOOL_AGENT_MAPPING`).<br/>• Anti-usurpation cross-tenant du `client_id`.<br/>• Auto-provisionnement du connecteur ERP `DEMO`. | • Tests automatisés (Vitest).<br/>• Rate limiting dédié sur la route `/mcp`.<br/>• Sécurisation renforcée de `run_readonly_query`. |
| **Axe D — Multi-tenant Distribué** | **AVANCÉ** | • Routage transparent via `vmind_tenants.mcp_base_url`.<br/>• Garde-fou anti-boucle 1-saut (`X-VMIND-MCP-Proxied`).<br/>• Validation réelle sur le tenant `virtualdev`. | • Remplacer le Quick Tunnel Cloudflare par un Named Tunnel permanent.<br/>• Health-check périodique passif des instances distantes. |
| **Axe E — Workflows n8n** | **RÉALISÉ (DONE)** | • Flux universel `Front ➔ Back ➔ n8n ➔ Back ➔ Front`.<br/>• Nœud JS `Format VMIND Response1` normalisé.<br/>• Gestion propre des erreurs et de l'accès restreint. | • Éliminer le bypass global `NODE_TLS_REJECT_UNAUTHORIZED=0` dans n8n.<br/>• Automatiser l'export des workflows n8n via script. |
| **Axe F — Base de Données & Persistance** | **AVANCÉ** | • Découplage SQL Server (TraLIS ERP) et PostgreSQL (`vmind_memory`).<br/>• Suppression de la table temporaire des demandes d'inscription. | • Outil de migration versionné (`node-pg-migrate`).<br/>• Éviction/fermeture des pools SQL Server inactifs dans `db.ts`. |
| **Axe G — Exposition Réseau** | **EN COURS** | • Prise en charge du domaine réservé ngrok.<br/>• Filtrage strict `ALLOWED_ORIGINS` en production. | • Migration vers un reverse proxy définitif (Caddy/Nginx + Let's Encrypt). |
| **Axe H — Qualité & Observabilité** | **PARTIEL** | • READMEs réécrits et synchronisés avec l'architecture multi-processus.<br/>• Plus de 70 fiches techniques rédigées dans `documentation/`. | • Zéro test automatisé unitaire ou d'intégration.<br/>• Centralisation et alertes temps réel sur les erreurs (Slack/Discord/Sentry). |
| **Axe I — Prospection & Sourcing** | **STABLE** | • Sous-systèmes isolés dans `src/prospect-agent` et `src/sourcing-agent`.<br/>• Protection par middleware `requireMcpAuth`. | • Documentation fine des permissions par agent pour ces routes. |

---

## 2. Analyse Détaillée Axe par Axe

---

### 🏛️ Axe A — Séparation du MCP et de l'API métier VMIND

#### Constat Initial de l'Audit
`server-http.ts` (2 834 lignes) et `mcp-server.ts` (2 036 lignes) concentraient l'ensemble des responsabilités (serveur MCP, dashboard REST, proxy n8n, admin, prospection, sourcing) dans un seul processus et sur un seul port (3001), créant un couplage fort et un risque de défaillance en cascade.

#### Ce qui est FAIT dans la Version Actuelle (DONE)
1. **Extraction d'un Processus MCP Dédié (`MCP_Tralis`)** :
   - Le serveur MCP a été complètement extrait dans un projet autonome `C:\mcp\MCP_Tralis` écoutant sur son propre port dédié : **`3002`** (`https://localhost:3002/mcp`).
   - Il dispose de son propre cycle de vie, de son propre pool de connexions SQL Server et de sa propre configuration.
2. **Refactorisation de `server-http.ts` (Vmind_Backend)** :
   - Réduit de **2 834 lignes à 241 lignes**.
   - Découpé en routeurs Express modulaires montés proprement :
     - `mcpProxyRouter` (`/mcp`) ➔ relaie vers le port 3002.
     - `toolsProxyRouter` (`/api/tools/*`, `/api/download/*`, `/api/reports/*`) ➔ relaie vers le port 3002.
     - `internalConnectorsRouter` (`/api/internal/connectors`).
     - `vmindAuthRouter` (`/api/auth/vmind`).
     - `authConnectorsRouter` (`/api/auth/login`, `/api/mcp/auth/*`).
     - `conversationsRouter` (`/api/conversations`).
     - `adminTenantsRouter` (`/api/admin/tenants`).
     - `n8nProxyRouter` (`/api/n8n-proxy`).
3. **Modularisation de `mcp-server.ts` (MCP_Tralis)** :
   - Réduit de **2 036 lignes à 92 lignes**.
   - Les 28+ outils TraLIS sont désormais répartis dans des sous-modules métier dédiés sous `MCP_Tralis/src/tools/` (`tools/db`, `tools/invoices`, `tools/kpis`, `tools/commercial`, etc.).

#### Ce qui Reste à Faire (TODO)
* Documenter la séparation des ports (3001 vs 3002) dans un document d'architecture global à la racine du dépôt.

#### Comment le Faire Concrètement
* **Aucun changement de code nécessaire** : L'architecture cible est déjà en place et parfaitement fonctionnelle.

---

### 🔐 Axe B — Gestion des Secrets et des Credentials

#### Constat Initial de l'Audit
* `tenants.json` et `tenants-virtualdev.json` versionnés dans git avec mots de passe SQL Server.
* Clés privées de certificats TLS commitées.
* `N8N_WEBHOOK_SECRET` partagé avec privilège administrateur total.
* `{{N8N_WEBHOOK_SECRET}}` en dur dans les exports de workflows n8n.

#### Ce qui est FAIT dans la Version Actuelle (DONE)
1. **Jeton d'Exécution Éphémère (5 minutes) pour n8n** :
   Dans [`src/routes/n8nProxy.ts`](file:///C:/mcp/Vmind_Backend/src/routes/n8nProxy.ts) (lignes 488-505), le Backend ne transmet plus de clé statique administrateur à n8n. Il signe dynamiquement un `mcp_token` avec une validité ultra-courte de **5 minutes** et un scope restreint `mcp_tool_execution`. Même en cas d'interception dans les logs n8n, le token expire immédiatement.
2. **Tokens d'Activation 24h à Révocation Immédiate** :
   Le nouveau flux d'inscription directe génère un token JWT signé avec une expiration de 24h. Dès que le mot de passe est défini, le code d'activation en base de données est réinitialisé à `NULL`, empêchant toute réutilisation.

#### Ce qui Reste à Faire (TODO)
* Retirer `tenants*.json` du suivi de version git dans `MCP_Tralis`.
* Créer un modèle `tenants.json.example`.
* Remplacer la syntaxe littérale `{{N8N_WEBHOOK_SECRET}}` dans les fichiers n8n par une expression d'environnement `={{ $env.N8N_WEBHOOK_SECRET }}`.

#### Comment le Faire Concrètement
1. Déréférencer sans détruire le fichier local :
   ```powershell
   cd C:\mcp\MCP_Tralis
   git rm --cached tenants.json tenants-virtualdev.json
   ```
2. Ajouter la ligne `tenants*.json` au fichier `.gitignore` de `MCP_Tralis`.
3. Créer `tenants.json.example` avec des valeurs d'exemple :
   ```json
   {
     "DEMO": {
       "server": "localhost",
       "database": "TRALIS_DATA_DEMO",
       "user": "sa",
       "password": "YOUR_STRONG_PASSWORD_HERE"
     }
   }
   ```

---

### 🛡️ Axe C — Authentification, Autorisation et RBAC

#### Constat Initial de l'Audit
* RBAC outil-par-outil bien pensé mais absence totale de tests automatisés.
* Pas de limitation de débit (rate limiting) sur `/mcp`.
* `run_readonly_query` protégé uniquement par une regex SQL.

#### Ce qui est FAIT dans la Version Actuelle (DONE)
1. **Refus par Défaut (Fail-Closed)** :
   `permissions.ts` applique un contrôle strict : si un outil n'est pas explicitement accordé à l'agent demandeur dans `TOOL_AGENT_MAPPING`, il est rejeté immédiatement avec `FORBIDDEN_TOOL_EXECUTION`.
2. **Anti-Usurpation Cross-Tenant** :
   Le `client_id` fourni par l'IA est systématiquement écrasé par le `client_id` certifié dans le JWT.
3. **Auto-Attachement ERP** :
   L'inscription directe assigne automatiquement le connecteur par défaut (`tralis / DEMO`) dans `vmind_user_connectors`, évitant les erreurs de tenant manquant.

#### Ce qui Reste à Faire (TODO)
* Mettre en place des tests automatisés (Vitest).
* Ajouter un rate limiter dédié sur l'endpoint `/mcp` dans `MCP_Tralis`.
* Durcir `run_readonly_query` avec une limite stricte de lignes (`TOP 100`) et vérifier que l'utilisateur SQL Server associé est limité à `db_datareader`.

#### Comment le Faire Concrètement
1. **Rate Limiting sur `/mcp`** :
   Dans [`MCP_Tralis/src/server-http.ts`](file:///C:/mcp/MCP_Tralis/src/server-http.ts), appliquer un limiteur de débit sur `mcpProtocolRouter` :
   ```typescript
   import rateLimit from 'express-rate-limit';
   const mcpLimiter = rateLimit({
       windowMs: 60 * 1000, // 1 minute
       max: 120, // 120 requêtes/minute par client
       message: { error: 'Trop de requêtes MCP. Veuillez patienter.' }
   });
   app.use('/mcp', mcpLimiter, mcpProtocolRouter);
   ```
2. **Tests Vitest** :
   Installer Vitest en dev dependency et créer `test/permissions.test.ts` testant les retours de `canUseTool()`.

---

### 🌐 Axe D — Multi-tenant et Routage MCP Distribué

#### Constat Initial de l'Audit
* Mécanisme de routage distribué très bien conçu (`proxyMcpRequest()`, header anti-boucle `X-VMIND-MCP-Proxied`).
* Dépendance à un Quick Tunnel Cloudflare temporaire pour l'instance de test `virtualdev`.
* Absence d'observabilité sur l'état des instances MCP distantes.

#### Ce qui est FAIT dans la Version Actuelle (DONE)
* Routage distribué à 1 saut validé en conditions réelles avec cache DNS court (30s) et gestion d'erreurs dédiée.

#### Ce qui Reste à Faire (TODO)
* Remplacer le Quick Tunnel aléatoire par un Cloudflare Named Tunnel stable (`mcp-virtualdev.vmind.ai`).
* Créer un health-check automatique vérifiant la disponibilité des instances distantes.

#### Comment le Faire Concrètement
1. Dans le planificateur de tâches de fond ([`src/routes/scheduler.ts`](file:///C:/mcp/Vmind_Backend/src/routes/scheduler.ts)), ajouter une tâche cron exécutée toutes les 10 minutes qui itère sur les tenants actifs ayant un `mcp_base_url` externe et appelle `/health`. Si une instance ne répond pas, enregistrer un log d'alerte.

---

### 🔄 Axe E — Workflows n8n & Cycle Conversationnel

#### Constat Initial de l'Audit
* Risque de contournement du backend ou d'appel direct depuis le frontend.
* Couplage fort entre le format interne de n8n et le frontend.
* `NODE_TLS_REJECT_UNAUTHORIZED=0` global dans n8n.

#### Ce qui est FAIT dans la Version Actuelle (DONE)
1. **Flux Universel Respecté** :
   `Frontend ➔ Backend (/api/n8n-proxy) ➔ n8n (/webhook/vmind-chat) ➔ Backend ➔ Frontend`.
   Le frontend n'appelle jamais n8n en direct.
2. **Nœud de Normalisation (`Format VMIND Response1`)** :
   Le script JavaScript garantit une structure JSON unique (`ok`, `source`, `tool_used`, `response_type`, `title`, `message`, `kpis`, `table`, `chart`, `details`, `error`).
3. **Gestion Intégrée de l'Accès Restreint** :
   Si une demande exige le MCP mais qu'aucun token ERP n'est actif, n8n renvoie directement une réponse sécurisée (`title: "Accès restreint"`) au lieu de planter.
4. **Persistance Fiable** :
   Le Backend persiste automatiquement la question et la réponse complète dans `public.n8n_chat_histories`.

#### Ce qui Reste à Faire (TODO)
* Remplacer la variable d'environnement globale `NODE_TLS_REJECT_UNAUTHORIZED=0` du conteneur Docker n8n par l'option `Ignore SSL Issues` ciblée uniquement sur le nœud HTTP Request local.
* Créer un script automatisé pour exporter les workflows n8n vers `n8nfile/`.

#### Comment le Faire Concrètement
1. Dans le nœud n8n faisant l'appel HTTP vers le MCP local, cocher dans les options : **"Ignore SSL Issues"**.
2. Retirer `NODE_TLS_REJECT_UNAUTHORIZED=0` du fichier `docker-compose.yml` de n8n.

---

### 🗄️ Axe F — Base de Données et Persistance

#### Constat Initial de l'Audit
* Pools de connexions SQL Server maintenus dans une `Map` sans éviction après inactivité.
* Migrations PostgreSQL manuelles sans outil de versioning.
* Port 5432 potentiellement exposé.

#### Ce qui est FAIT dans la Version Actuelle (DONE)
1. **Unification et Assainissement de `vmind_memory`** :
   - Table `vmind_users` consolidée avec rôles et connecteurs.
   - Suppression définitive de la table temporaire `vmind_demandes_inscriptions`.
   - Modèle relationnel direct avec `vmind_user_connectors`.

#### Ce qui Reste à Faire (TODO)
* Ajouter un mécanisme de nettoyage des pools SQL Server inactifs.
* Intégrer un outil de migration versionné (ex: `node-pg-migrate`).

#### Comment le Faire Concrètement
* Dans `MCP_Tralis/src/db.ts`, configurer `idleTimeoutMillis: 1800000` (30 minutes) dans la configuration du pool de connexion `mssql` pour que les connexions des tenants inactifs se ferment automatiquement.

---

### 🌍 Axe G — Exposition Réseau (Tunnels vs Production)

#### Constat Initial de l'Audit
Dépendance à des tunnels ngrok / Cloudflare gratuits sans garantie de disponibilité (SLA) pour relier le backend local au frontend Vercel.

#### Ce qui est FAIT dans la Version Actuelle (DONE)
* Prise en charge de domaines ngrok fixes (`NGROK_DOMAIN`).
* Filtrage strict des origines CORS (`ALLOWED_ORIGINS`) dès que `NODE_ENV=production`.

#### Ce qui Reste à Faire (TODO)
* Pour la production définitive, basculer sur un reverse proxy Linux standard (Caddy ou Nginx) avec certificat Let's Encrypt automatique.

---

### 🧪 Axe H — Qualité, Tests et Observabilité

#### Constat Initial de l'Audit
* 0 test automatisé dans tout le dépôt.
* `README.md` d'origine vide ou générique.
* Fichiers de debug/scratch non ignorés.

#### Ce qui est FAIT dans la Version Actuelle (DONE)
1. **Documentation Racine Complètement Réécrite** :
   - [`Vmind_Backend/README.md`](file:///C:/mcp/Vmind_Backend/README.md) documente clairement l'architecture, les variables d'environnement, les ports 3001, 3002 et 5678.
   - [`MCP_Tralis/README.md`](file:///C:/mcp/MCP_Tralis/README.md) documente les 28 outils et les modes STDIO / Streamable HTTP.
   - Création de guides techniques complets dans `documentation/`.

#### Ce qui Reste à Faire (TODO)
* **Introduire Vitest** pour tester le RBAC (`permissions.ts`) et les flux critiques d'authentification.
* Mettre en place un webhook de notification temps réel (Slack / Discord) sur les erreurs critiques dans `logger.ts`.

#### Comment le Faire Concrètement
1. Installer Vitest : `npm install -D vitest` dans `Vmind_Backend` et `MCP_Tralis`.
2. Ajouter le script dans `package.json` : `"test": "vitest run"`.
3. Dans `logger.ts`, ajouter un envoi HTTP vers un webhook Discord/Slack dès qu'un log de niveau `ERROR` ou un refus de sécurité `FORBIDDEN_TOOL_EXECUTION` est enregistré.

---

### 💼 Axe I — Modules Prospection et Sourcing

#### Constat Initial de l'Audit
Modules volumineux (`prospect-agent` et `sourcing-agent`) intégrés au backend principal.

#### Ce qui est FAIT dans la Version Actuelle (DONE)
* Les modules sont isolés dans des sous-dossiers dédiés (`src/prospect-agent` et `src/sourcing-agent`).
* Leurs routes sont protégées par le middleware centralisé `requireMcpAuth`.

---

# 🎯 Plan d'Action Priorisé (Recommandations Minimales)

### 🟢 Phase 1 : Hygiène Git & Secrets (Effort : ~30 minutes — Sans risque de régression)
1. Déréférencer `tenants*.json` dans `MCP_Tralis` via `git rm --cached tenants.json tenants-virtualdev.json`.
2. Ajouter `tenants*.json` dans `.gitignore` et fournir `tenants.json.example`.
3. Corriger le texte de la note jaune dans le canvas n8n pour indiquer que l'appel provient du Backend.

### 🟡 Phase 2 : Sécurité Réseau & Stabilité (Effort : ~2 heures)
1. Ajouter un middleware `rateLimit` sur l'endpoint `/mcp` dans `MCP_Tralis/src/server-http.ts`.
2. Dans n8n, activer l'option "Ignore SSL Issues" sur le nœud HTTP Request et retirer le bypass global `NODE_TLS_REJECT_UNAUTHORIZED=0`.
3. Définir un timeout d'inactivité sur les pools de connexion SQL Server dans `MCP_Tralis/src/db.ts`.

### 🔵 Phase 3 : Tests Automatisés & Observabilité (Effort : 1 à 2 jours)
1. Installer **Vitest** et écrire une suite de tests unitaires pour `permissions.ts` (`canUseTool()`) et `authEndpoints.ts`.
2. Brancher un webhook de notification (Discord ou Slack) dans `logger.ts` pour être alerté en temps réel des erreurs 500 ou des tentatives d'accès non autorisées.
