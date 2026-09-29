# VMIND AI — Frontend (Interface Utilisateur Next.js)

Interface web moderne et réactive pour la plateforme **VMIND AI**, conçue avec **Next.js 14**, **React 18**, **TypeScript** et **TailwindCSS**. 

L'application offre un espace de discussion interactif avec des agents IA spécialisés, des tableaux de bord dynamiques, la gestion du connecteur **TraLIS ERP**, et le rendu visuel de données complexes (tableaux financiers, graphiques KPIs, alertes de recouvrement).

---

## 🏛️ Architecture et Rôle dans l'Écosystème

Le Frontend communique exclusivement avec le **Backend VMIND (Port 3001)** via des requêtes HTTPS sécurisées et des WebSockets temps réel. Il n'appelle **jamais directement** n8n ou le serveur MCP, garantissant un cloisonnement strict de sécurité.

```text
[ Utilisateur (Navigateur Web) ]
               │
               ▼ HTTPS (Port 3000 ou Vercel)
   [ VMIND Frontend (Next.js 14) ]
               │
               ▼ HTTPS / WSS
   [ VMIND Backend (Port 3001) ] ──► [ n8n (5678) ] ──► [ MCP TraLIS (3002) ]
```

---

## ✨ Fonctionnalités Clés

* **Chat Assistant Conversationnel** :
  * Échange en langage naturel avec les agents métiers (**VDATA**, **VFIN**, **VSELL**, **VSTOCK**, **VBUY**, **VMOVE**).
  * Rendu riche : bulles de texte, tableaux de données, indicateurs KPIs interactifs, graphiques financiers (**Recharts**).
  * Streaming et animations fluides des messages (**Framer Motion**).
* **Connecteur TraLIS ERP Intégré** :
  * Authentification à deux niveaux (identifiants TraLIS + validation du tenant).
  * Statut en direct de la connexion ERP (Connecté / Session expirée / Déconnecté).
  * Changement de tenant et reconnexion automatique transparente.
* **Sécurité & Expérience Utilisateur** :
  * Protection anti-bruteforce et anti-bot avec **Cloudflare Turnstile** invisible.
  * Gestion des sessions via tokens JWT stockés de manière sécurisée.
  * Sphère 3D interactive et identité visuelle immersive avec **Three.js**.

---

## 🛠️ Stack Technique

* **Framework** : [Next.js 14](https://nextjs.org/) (App Router & Pages Router hybride).
* **UI & Style** : [React 18](https://react.dev/), [TailwindCSS](https://tailwindcss.com/), Sass.
* **Composants & Animations** : [Framer Motion](https://www.framer.com/motion/), [Lucide React](https://lucide.dev/), [Three.js](https://threejs.org/).
* **Data Visualization** : [Recharts](https://recharts.org/).
* **Temps Réel & Réseau** : [Socket.io-client](https://socket.io/), [jwt-decode](https://github.com/auth0/jwt-decode).
* **Protection Captcha** : [@marsidev/react-turnstile](https://github.com/marsidev/react-turnstile).

---

## 🚀 Démarrage Rapide

### 1. Prérequis
* Node.js >= 18.x
* Backend VMIND démarré et accessible sur `https://localhost:3001`

### 2. Installation des Dépendances
```bash
npm install
```

### 3. Configuration de l'Environnement (`.env.local`)
Copiez le modèle de configuration :
```powershell
Copy-Item .env.example .env.local
```

Renseignez les variables nécessaires :
```env
# URL de l'API Backend VMIND (Port 3001)
NEXT_PUBLIC_API_URL=https://localhost:3001

# Tenant par défaut
NEXT_PUBLIC_CLIENT_ID=DEMO

# Clé publique Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY="0x4AAAAAADt4SzHzPF9IYUqX"
```

### 4. Lancement en Mode Développement
```bash
npm run dev
```
L'application est accessible sur : **[http://localhost:3000](http://localhost:3000)**.

---

## 📦 Scripts Disponibles

| Commande | Rôle |
| :--- | :--- |
| **`npm run dev`** | Démarre le serveur Next.js en développement avec Fast-Refresh (Port 3000). |
| **`npm run build`** | Compile l'application pour la production et optimise les bundles. |
| **`npm run start`** | Lance le serveur de production compilé. |
| **`npm run lint`** | Analyse le code à la recherche d'erreurs avec ESLint. |

---

## 🌐 Déploiement en Production

Le frontend est conçu pour être déployé sur **[Vercel](https://vercel.com/)** ou sur un conteneur Node.js indépendant :
1. Définir les variables d'environnement dans l'interface Vercel (`NEXT_PUBLIC_API_URL`, etc.).
2. S'assurer que le backend autorise l'URL du frontend dans sa variable `ALLOWED_ORIGINS` (voir `Vmind_Backend/.env`).
