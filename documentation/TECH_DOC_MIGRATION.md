# Documentation Technique : Migration TraLIS Dashboard

## 1. Vue d'Ensemble
Ce projet représente la modernisation du Dashboard TraLIS, passant d'un prototype HTML/CSS statique à une application web full-stack haute performance utilisant **Next.js** pour le Front-end et **Node.js (Express)** pour le Back-end.

L'objectif principal est de fournir une interface d'analyse métier (Intelligence Entreprise) capable de gérer plusieurs clients (multi-tenant) avec une isolation stricte des données SQL Server.

---

## 2. Architecture du Projet

### A. Front-end (Projet `Vmind_Front`)
Basé sur **Next.js 14** avec le App Router.
- **Dossier `app/`** : Contient les routes. La page principale (`page.tsx`) assemble les trois panneaux majeurs.
- **Dossier `features/`** : Organisation par domaine fonctionnel :
    - `chat/` : Logique conversationnelle et affichage des messages.
    - `sidebar/` : Navigation et liste des agents experts.
    - `right_panel/` : Statut en temps réel des agents et journal d'activité.
- **Dossier `shared/`** :
    - `hooks/` : Logique réutilisable (ex: `useChat.ts` pour la gestion de l'état des messages et des agents).
    - `api/` : Clients API (ex: `tralis-api.ts`) pour communiquer avec le backend.
    - `constants/` : Données statiques et mapping des agents (`data.ts`).

### B. Back-end (Projet `Vmind_Backend`)
Basé sur **Node.js** et **Express**.
- **Serveur HTTP (`server-http.ts`)** : Expose les endpoints pour le Front-end. Il reçoit les requêtes, identifie le `client_id` et exécute les requêtes SQL appropriées.
- **Gestion des Données (`db.ts`)** : Implémente un gestionnaire de pools de connexion SQL Server. Chaque client dispose de son propre pool de connexions, garantissant qu'aucune donnée ne fuit entre les tenants.
- **Protocol MCP** : Le backend est également compatible avec le Model Context Protocol (MCP), permettant à des agents IA de consommer les outils directement.

---

## 3. Processus de Migration (A à Z)

1.  **Analyse du Prototype** : Décomposition du fichier HTML original en composants React (`Header`, `Sidebar`, `Chat`, `KPIBoxes`).
2.  **Modernisation CSS** : Tranfert des styles globaux dans `globals.css` et utilisation de variables CSS pour le thème "Dark Futuriste" (Navy/Cyan/Amber).
3.  **Implémentation du Chat** : Création d'un système de messages asynchrone capable de gérer des "actions" (outils) comme `getInvoiceDetail`.
4.  **Logique Agentique** : Mise en place du système de **Handoff**. Lorsqu'une question est posée, l'assistant général (`VMIND`) délégue la tâche à un expert (`VDATA`, `VMOVE`, etc.) via un mapping défini dans `shared/constants/data.ts`.
5.  **Multi-Tenancy** : Développement du middleware backend pour router les requêtes SQL vers la bonne base de données en fonction du paramètre `client_id` envoyé par le front.

---

## 4. Configuration et Bases de Données

### Configuration Multi-Tenant (`tenants.json`)
C'est le fichier central pour configurer les accès SQL Server.
```json
{
  "DEMO": {
    "active": true,
    "db": {
      "server": "MON_SERVEUR",
      "database": "MA_BASE_DONNEES",
      "user": "UTILISATEUR",
      "password": "MOT_DE_PASSE"
    }
  }
}
```
> [!IMPORTANT]
> Pour ajouter un nouveau client, il suffit d'ajouter une entrée dans ce JSON. Le backend créera automatiquement un pool de connexion séparé lors de la première requête.

### Variables d'Environnement
- **Front-end (`.env.local`)** : `NEXT_PUBLIC_CLIENT_ID=DEMO` (définit la base par défaut).
- **Back-end (`.env`)** : Configuration du port et des secrets éventuels.

---

## 5. Comment Lancer le Projet

### Étape 1 : Le Backend
```bash
cd Vmind_Backend
npm install
npm run dev-http
```
*Le serveur écoute sur le port **3001**.*

### Étape 2 : Le Frontend
```bash
cd Vmind_Front
npm install
npm run dev
```
*L'application est accessible sur **http://localhost:3000**.*

---

## 6. Guide de Test (Scénario Standard)
1.  Ouvrir le navigateur sur `http://localhost:3000`.
2.  Taper une question comme : *"Donne moi les détails de la facture FP 26-06994 sur la base DEMO"*.
3.  Observer :
    - L'apparition du message de transfert de VMIND vers VDATA.
    - L'activation visuelle de l'agent **VDATA** (point vert et halo).
    - L'affichage propre des kpis et des données extraites de SQL Server.

---

*Documentation générée par Antigravity — Avril 2024*
