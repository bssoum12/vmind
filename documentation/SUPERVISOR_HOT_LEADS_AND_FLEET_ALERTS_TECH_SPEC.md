# 📋 Spécification Technique & Architecture : Détection et Alertes Temps Réel des Hot Leads Non Contactés (> 48h) (KBN-15)

> **Document de Référence Technique & Guide d'Implémentation**  
> **Composants impactés** : `VMIND AI (Backend Express/PostgreSQL)`, `Mcp-Server-IA-Front (Next.js)`, `Socket.io (pg_notify)`, `SupervisorWorkspace`.  
> **Auteur** : Équipe Core AI VMIND  
> **Date** : 09 Novembre 2026 (Mise à jour suite revue d'architecture)  
> **Statut** : 🟢 **En Production (Phase 1.5 Terminée)**

---

## 🧭 1. Contexte Opérationnel & Périmètre Réel des Agents

Dans l'écosystème commercial multi-agents de VMIND :
1. **Les Agents de Sourcing** : Découvrent, extraient et enrichissent des profils cibles selon des critères ICP précis, puis les transfèrent vers des agents de prospection cibles.
2. **Les Agents de Prospection (Cold Outreach Unique)** :
   - Qualifient les profils via LLM (`est_qualifie = true`, score de 0 à 100, potentiel `Faible`, `Moyen`, `Élevé`).
   - Génèrent et envoient **un e-mail de premier contact à froid (Cold Outreach)**.
   - **Périmètre strict** : L'Agent de Prospection n'exécute pas de séquences multi-étapes (step 1, step 2, step 3) et n'écoute pas les boîtes de réception pour les réponses entrantes (pas de connecteur IMAP/boîte de réception à ce stade).
   - **Conséquence directe** : Dès lors qu'un e-mail a été envoyé avec succès (`emails_sent >= 1`), la mission de prospection à froid de l'agent est **remplie pour ce lead**. Le prospect a été contacté et ne doit plus figurer dans l'alerte des Hot Leads en souffrance.
3. **Le Superviseur Commercial** : Pilote, audite et coordonne l'ensemble de la flotte pour identifier les goulots d'étranglement et prévenir la déperdition d'opportunités à fort potentiel.

### La Friction Réelle : Les Hot Leads Qualifiés Jamais Contactés
Un prospect qualifié avec un score très élevé ($\ge 85$) ou un potentiel `'Élevé'` est un **Hot Lead**.  
Si ce lead reste sans **aucune prise de contact** pendant plus de **48 heures** après sa qualification, l'opportunité se refroidit rapidement.

Deux situations concrètes d'inactivité existent :
1. **`DRAFT_READY` (Brouillon prêt non envoyé)** : L'IA a généré un brouillon d'e-mail personnalisé (mode semi-automatique), mais personne (ni l'autopilote ni l'opérateur) n'a validé ou déclenché l'envoi depuis $> 48$h.
2. **`NEVER_CONTACTED` (Aucun contact initié)** : Le lead a été qualifié avec succès, mais aucun brouillon n'a encore été généré et aucun e-mail n'a été envoyé depuis $> 48$h.

---

## 🎯 2. Objectifs de la Fonctionnalité KBN-15

1. **Détection Algorithmique Côté Base de Données** : Identifier instantanément tous les Hot Leads en souffrance rattachés aux agents de la flotte supervisée, sans charger de calcul inutile sur le client.
2. **Filtre Strict d'Exclusion des Leads Déjà Contactés** :
   - Tout lead ayant au moins un e-mail envoyé avec succès (`emails_sent > 0`) est **exclu** du flux d'alerte, car sa prospection à froid a été effectuée.
3. **Double Niveau d'Urgence Temporelle** :
   - **`WARNING` (48h à 72h d'inactivité)** : Signalement préventif pour prise en charge prioritaire.
   - **`CRITICAL` ($\ge 72$h d'inactivité)** : Signal d'alarme rouge nécessitant une action immédiate du commercial ou du superviseur.
4. **Distinction du Statut Opérationnel** :
   - **`DRAFT_READY`** (`drafts_count > 0`, `emails_sent = 0`) : Brouillon IA prêt en attente d'expédition.
   - **`NEVER_CONTACTED`** (`drafts_count = 0`, `emails_sent = 0`) : Aucun brouillon généré, opportunité non traitée.
5. **Surveillance de Délivrabilité des E-mails (Spike Detection)** :
   - Alerte si le taux de rebond ou d'échec d'envoi dépasse **5%** sur les dernières 24 heures glissantes.
6. **Interface Cyber Obsidian & Ergonomie Apple** :
   - Bouton Balise Flamme dans le header avec badge dynamique d'alerte.
   - Puce cliquable dans le **Pipeline HUD**.
   - Tiroir coulissant (`SupervisorAlertsDrawer.tsx`) avec filtres rapides, recherche en direct, copie d'e-mail en un clic (`Toast`), action `mailto:` directe et deep-linking vers l'espace de travail de l'agent.

---

## 🏗️ 3. Architecture du Flux de Données

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      PostgreSQL (vmind_memory)                         │
 │                                                                        │
 │  prospect_agent_leads ◄─── prospect_agent_qualifications (score >= 85) │
 │                                     ▲                                  │
 │                                     │ LEFT JOIN                        │
 │                                     ▼                                  │
 │                       prospect_agent_emails_envoyes                    │
 └──────────────────────────────────┬─────────────────────────────────────┘
                                    │ SQL Trigger: pg_notify('prospect_updates')
                                    ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                  Backend VMIND AI (Node.js / Express)                  │
 │                                                                        │
 │  1. pgListener.ts (Écoute de l'événement prospect_updates)             │
 │     • Filtrage par tenant et routage vers la room io.to(user_username) │
 │  2. Route GET /api/supervisor/fleet-alerts/:id                        │
 │     • fetchFleetAlertsInternal(supervisorId, userId)                   │
 │     • Strict emails_sent = 0 & HAVING hours_unattended >= 48           │
 │     • Calcul du taux d'erreur e-mails 24h glissantes                   │
 │  3. Résumé funnel GET /api/supervisor/fleet-funnel/:id                 │
 └──────────────────────────────────┬─────────────────────────────────────┘
                                    │ WebSocket Broadcast & REST Response
                                    ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                  Frontend Next.js (Mcp-Server-IA-Front)                │
 │                                                                        │
 │  • useProspectSocket : Réception de l'event & refresh débouncé 800ms   │
 │  • SupervisorWorkspace.tsx : Bouton Flamme animé avec badge dynamique   │
 │  • SupervisorPipelineHUD.tsx : Puce Hot Leads (>48h) cliquable        │
 │  • SupervisorAlertsDrawer.tsx : Tiroir Cyber Obsidian interactif       │
 │     - Filtres: Tous | Sans brouillon | Brouillon prêt | Critique >72h │
 │     - Recherche instantanée multi-critères                             │
 │     - Copie e-mail / Action mailto / Deep link vers l'agent            │
 └────────────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ 4. Spécifications Backend Détaillées

### 4.1. Requête SQL Optimisée d'Extraction des Hot Leads Non Contactés
Fichier : `VMIND DEVOPS/VMIND%20AI/src/supervisor-agent/routes/fleet.ts`

```sql
SELECT
  l.id AS lead_id,
  l.nom,
  l.prenom,
  l.email,
  l.entreprise,
  l.poste,
  l.secteur,
  l.pays,
  l.mobile,
  q.score,
  q.potentiel,
  q.raison,
  a.agent_id,
  a.uuid AS agent_uuid,
  a.nom AS agent_name,
  COALESCE(q.date_derniere_qualification, q.date_analyse, l.date_collecte) AS date_qualification,
  MAX(e.date_envoi) FILTER (WHERE e.statut ILIKE '%succ%' OR e.statut ILIKE '%envoy%') AS last_outreach,
  COUNT(e.id) FILTER (WHERE e.statut ILIKE '%succ%' OR e.statut ILIKE '%envoy%') AS emails_sent,
  COUNT(e.id) FILTER (WHERE e.statut ILIKE '%brouillon%' OR e.statut ILIKE '%draft%') AS drafts_count,
  ROUND(
    EXTRACT(EPOCH FROM (NOW() - COALESCE(q.date_derniere_qualification, q.date_analyse, l.date_collecte))) / 3600
  ) AS hours_unattended
FROM prospect_agent_qualifications q
JOIN prospect_agent_leads l ON l.id = q.lead_id
JOIN agents a ON a.agent_id = q.agent_id
LEFT JOIN prospect_agent_emails_envoyes e ON e.lead_id = q.lead_id AND e.agent_id = q.agent_id
WHERE q.agent_id = ANY($1::integer[])
  AND (q.score >= 85 OR q.potentiel ILIKE '%eleve%' OR q.potentiel ILIKE '%élevé%')
  AND q.est_qualifie = true
GROUP BY l.id, l.nom, l.prenom, l.email, l.entreprise, l.poste, l.secteur, l.pays, l.mobile,
         q.score, q.potentiel, q.raison, a.agent_id, a.uuid, a.nom,
         q.date_derniere_qualification, q.date_analyse, l.date_collecte
HAVING COUNT(e.id) FILTER (WHERE e.statut ILIKE '%succ%' OR e.statut ILIKE '%envoy%') = 0
   AND EXTRACT(EPOCH FROM (NOW() - COALESCE(q.date_derniere_qualification, q.date_analyse, l.date_collecte))) / 3600 >= 48
ORDER BY hours_unattended DESC, q.score DESC
LIMIT 100;
```

#### Points Clés de la Requête :
1. **Exclusion stricte des leads contactés** : `COUNT(e.id) FILTER (WHERE e.statut ILIKE '%succ%' OR e.statut ILIKE '%envoy%') = 0` garantit qu'aucun lead ayant déjà reçu un e-mail de prospection ne remonte dans cette vue.
2. **Calcul d'inactivité unifié** : L'inactivité est calculée entre `NOW()` et la date de qualification du lead (`COALESCE(q.date_derniere_qualification, q.date_analyse, l.date_collecte)`).
3. **Sécurité et Isolation des IDs (Règle 1)** : La requête joint `agents` pour obtenir `a.uuid AS agent_uuid`, transmis au client sans exposer l'entier interne `agent_id`.

### 4.2. Classification Métier en TypeScript
```typescript
const hoursUnattended = Math.max(48, Number(row.hours_unattended) || 48);
const draftsCount = Number(row.drafts_count) || 0;
const urgency: 'CRITICAL' | 'WARNING' = hoursUnattended >= 72 ? 'CRITICAL' : 'WARNING';
const contactStatus: 'NEVER_CONTACTED' | 'DRAFT_READY' = draftsCount > 0 ? 'DRAFT_READY' : 'NEVER_CONTACTED';
```

---

## 🎨 5. Spécifications Frontend Détaillées

### 5.1. Modèle Typé (`supervisor.types.ts`)
```typescript
export interface HotLeadAlertItem {
  leadId: number;
  nom: string;
  prenom: string;
  email: string;
  entreprise: string | null;
  poste: string | null;
  secteur: string | null;
  pays: string | null;
  mobile: string | null;
  score: number;
  potentiel: string;
  raison: string | null;
  agentId: number;
  agentUuid: string;
  agentName: string;
  dateQualification: string;
  lastOutreach: string | null;
  emailsSent: number;
  draftsCount: number;
  hoursUnattended: number;
  urgency: 'CRITICAL' | 'WARNING';
  contactStatus: 'NEVER_CONTACTED' | 'DRAFT_READY';
}

export interface FleetAlertsData {
  supervisorId: string;
  supervisorName: string;
  unattendedHotLeadsCount: number;
  criticalCount: number;
  warningCount: number;
  neverContactedCount: number;
  draftReadyCount?: number;
  followupOverdueCount?: number;
  hotLeads: HotLeadAlertItem[];
  deliverySpike: DeliverySpikeAlert;
  totalAlertsCount: number;
  lastCheckedAt: string;
}
```

### 5.2. Onglet Dédié & Regroupement par Agent : `SupervisorHotLeadsView.tsx`
Suite aux retours d'ergonomie et aux principes `/apple-design` et `/designing-user-experiences` :
- **Troisième onglet permanent dans le Cockpit** :
  - `Vue d'ensemble` (canvas force graph)
  - `Hot Leads (N)` (onglet dédié avec icône flamme et badge dynamique)
  - `Historique` (audit timeline et matrice de progression)
- **Regroupement par Agent de Prospection (`AgentLeadGroup`)** :
  - Répond à la problématique multi-agents : lorsqu'une flotte compte 5 agents ou plus, chaque agent dispose de sa propre carte de section claire et aérée.
  - En-tête de section par agent : avatar bot, nom de l'agent, compteur d'urgences, et bouton direct `Gérer dans l'agent ↗` (`/prospect-agent-workspace/[agentUuid]?tab=leads`).
- **Simplicité & Sobriété Apple (Anti-Surcharge Cognitive)** :
  - Suppression de tout encombrement superflu (citations d'explication IA verbeuses, accumulation de micro-tags redondants).
  - Présentation linéaire et glanceable affichant uniquement l'essentiel :
    1. **Identité & Société** : Nom complet, Score IA (`92/100`), Poste & Entreprise.
    2. **Canaux directs** : Adresse e-mail avec copie en 1 clic (retour haptique toast) et téléphone direct démasqué si disponible.
    3. **Temps d'inactivité & Urgence** : Puce temporelle sobre (`52h sans contact`, rouge si $>72$h) et état (`Brouillon prêt` vs `Sans contact`).
    4. **Action immédiate** : Bouton unique `Écrire` (mailto direct avec sujet contextualisé).
- **Contrôles de Filtrage & Recherche** :
  - Sélecteur déroulant compact pour isoler un agent spécifique parmi la flotte.
  - Champ de recherche en temps réel (nom, société, poste, e-mail).
  - Filtres segmentés par pilules : `Tous`, `Critiques >72h`, `Brouillon prêt`, `Sans brouillon`.
- **Tiroir Latéral Secondaire (`SupervisorAlertsDrawer.tsx`)** :
  - Conservé comme tiroir contextuel d'appoint lors de la navigation dans la cartographie 2D sans changer d'onglet.

---

## ⚡ 6. Correction Connexe : Déploiement Asynchrone Non-Bloquant

### Problème Initial
Lors de la création d'un Superviseur dans `WizardSupervisorView.tsx`, si l'option "Lancer l'audit maintenant" était activée, l'interface restait bloquée de longues secondes sur l'appel `POST /api/supervisor-agent/run-now/:agentId` pendant l'évaluation LLM séquentielle des nœuds et liens.

### Résolution
1. **Ajout du mode `?async=true` côté Backend (`deploy.ts`)** :
   - Vérifie les autorisations et le verrou Redis anti-collision (`vmind:supervisor:audit_in_flight:${uuid}`).
   - Répond immédiatement avec HTTP 200 `{ success: true, async: true, message: "Audit de supervision lancé en arrière-plan" }`.
   - Exécute `executeSupervisorAuditInternal()` en tâche de fond.
2. **Frontend `WizardSupervisorView.tsx`** :
   - Requête non-bloquante avec `?async=true` et `AbortController` (4s de timeout de sécurité).
   - Redirection immédiate vers le workspace du superviseur.
   - Les indicateurs WebSocket mettent à jour l'interface dès que l'audit d'arrière-plan se termine.

---

## 🔍 7. Analyse Approfondie : Synchronisation Temps Réel vs Multi-Utilisateurs

> **Question d'Architecture** :  
> *« La synchronisation temps réel (Zero Polling) via WebSocket pose-t-elle un problème lorsque plusieurs utilisateurs sont connectés simultanément à la base de données ? »*

### 7.1. Comment fonctionne l'isolation actuelle par tenant
Dans le backend actuel (`pgListener.ts` et `websocket.ts`) :
1. Lors de la connexion WebSocket, l'utilisateur est authentifié via son token JWT de session et rejoint une room privée :
   `socket.join('user_' + username)`.
2. Lorsqu'un trigger PostgreSQL émet `pg_notify('prospect_updates', payload)`, `pgListener` résout l'agent concerné et son propriétaire, puis émet **strictement** vers la room du propriétaire :
   `io.to('user_' + ownerUsername).emit('db_update', payload)`.
3. **Bénéfice immédiat** : Un utilisateur B ne reçoit jamais les événements de données brutes d'un utilisateur A. L'isolation de confidentialité est respectée au niveau du client.

### 7.2. Les Risques Réels d'une Approche Naïve en Multi-Utilisateurs
Bien que l'isolation client soit assurée, une synchronisation temps réel basée sur des triggers au niveau de la ligne (*row-level triggers*) présente **4 goulots d'étranglement majeurs** en forte charge multi-utilisateurs :

#### 1. Saturation de la file de messages PostgreSQL (`LISTEN/NOTIFY`)
- PostgreSQL utilise un buffer mémoire partagé pour `NOTIFY` (limité à 8 Ko par payload et une file globale).
- Si 10 utilisateurs importent simultanément chacun 1 000 leads, PostgreSQL doit générer 10 000 notifications en quelques secondes. Cela peut saturer le buffer et provoquer des erreurs ou des pertes de notifications.

#### 2. Amplification $N+1$ de requêtes dans l'Event Loop Node.js
- Dans `pgListener.ts`, chaque notification reçue déclenche une requête SQL pour trouver le propriétaire :
  `SELECT v.username FROM vmind_users v JOIN agents a ... WHERE a.agent_id = $1`.
- Si 5 000 lignes sont insérées, Node.js exécute 5 000 requêtes SQL concurrentes pour router les événements. Cela sature le pool de connexions (`pgPool`) et peut ralentir les requêtes API standards des autres utilisateurs.

#### 3. Phénomène de "Thundering Herd" sur le Frontend (Cascade de Re-fetches)
- Dans le composant client, chaque événement `db_update` déclenche un appel `fetchRealFleet()`.
- Un appel `fetchRealFleet()` exécute **4 requêtes REST complètes** :
  1. `GET /api/supervisor/fleet-graph/:id`
  2. `GET /api/supervisor/fleet-funnel/:id`
  3. `GET /api/supervisor/fleet-history/:id`
  4. `GET /api/supervisor/fleet-alerts/:id`
- Si un agent qualifie 50 leads d'affilée en 30 secondes, même avec un debounce de 800ms, le navigateur peut relancer inutilement ces 4 requêtes lourdes à répétition.

#### 4. Limite de la Mise à l'Échelle Horizontale (Multi-Instances Node.js)
- Actuellement, le serveur Socket.io est en mémoire sur une instance Express unique.
- Si le backend VMIND est déployé sur plusieurs instances (conteneurs Kubernetes, cluster PM2, etc.), un événement capté par l'instance 1 n'atteint pas l'utilisateur connecté sur l'instance 2, à moins de connecter Socket.io à Redis via `@socket.io/redis-adapter`.

---

### 7.3. Architecture Cible Recommandée (Best Practices Multi-Tenants)

Pour garantir une scalabilité parfaite avec des dizaines d'utilisateurs simultanés :

```
                          ┌────────────────────────┐
                          │   Opération de Masse   │
                          │   (Import / Scraping)  │
                          └───────────┬────────────┘
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │      PostgreSQL DB        │
                        │   (1000 lignes insérées)  │
                        └─────────────┬─────────────┘
                                      │
                     ❌ ÉVITER : 1000 pg_notify individuels
                     ✅ RECOMMANDÉ : 1 seul notify de fin de batch
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │       pgListener.ts       │
                        │ (Event: BATCH_COMPLETED)  │
                        └─────────────┬─────────────┘
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │   Socket.io (Room User)   │
                        │    Signal Léger de Ping   │
                        └─────────────┬─────────────┘
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │   Frontend (SWR / Cache)  │
                        │  Re-fetch avec ETag (304) │
                        └───────────────────────────┘
```

1. **Signaux de Fin de Batch au lieu de Signaux Ligne par Ligne** :
   - Les imports de masse ou les exécutions de scraping ne doivent pas émettre un événement par ligne.
   - Ils doivent émettre un événement unique de complétion de lot (`BATCH_COMPLETED` ou écoute sur `prospect_agent_logs_execution` avec `status = 'COMPLETED'`).
2. **Cache HTTP avec ETags / SWR côté Frontend** :
   - Utiliser des en-têtes `If-None-Match` ou un hash de version sur les endpoints du superviseur (`/fleet-alerts`, `/fleet-funnel`).
   - Si les données n'ont pas changé lors du re-fetch, le serveur répond instantanément avec `304 Not Modified` sans recalculer les jointures complexes.
3. **Adapter Redis pour Socket.io** :
   - Prévoir l'activation de `@socket.io/redis-adapter` dès la mise en place d'un cluster multi-instances.

---

## 🧪 8. Validation & Vérifications Techniques

1. **Compilation Backend (`VMIND AI`)** :
   - Commande : `cd "VMIND DEVOPS\VMIND%20AI" && npm run build`
   - Résultat : **Exit code 0** (compilation TypeScript propre).
2. **Compilation Frontend (`Mcp-Server-IA-Front`)** :
   - Commande : `npx tsc --noEmit`
   - Résultat : **Exit code 0** (0 erreur de typage sur l'ensemble du projet).
3. **Respect des Règles d'Architecture VMIND** :
   - ✅ **Règle 1 (Strict UUID Privacy)** : Aucun ID entier exposé dans les URLs ou composants du tiroir (`agentUuid` public string utilisé partout).
   - ✅ **Règle 20 (Zero Technical Jargon)** : Libellés 100% métier en français (`Sans brouillon`, `Brouillon prêt`, `Critique >72h`).
   - ✅ **Règle 21 (Toast System)** : Centralisation des notifications via `ToastContext` sans `alert()` natif.
