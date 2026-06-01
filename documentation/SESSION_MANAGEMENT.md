# Documentation Technique : Gestion de Session (VMIND Front)

Ce document décrit le cycle de vie et la gestion des sessions utilisateur au sein du projet **Vmind_Front**, particulièrement dans le cadre de la communication avec le backend IA (n8n).

---

## 1. Principe Général

Afin de maintenir un contexte conversationnel cohérent entre l'interface utilisateur et le backend d'intelligence artificielle (n8n), un identifiant unique de session (`vmind_session_id`) est nécessaire.

Cet identifiant permet au backend de rattacher chaque message envoyé par l'utilisateur à l'historique de sa conversation courante. Sans cette gestion, l'IA perdrait le contexte entre chaque requête.

## 2. Cycle de Vie de la Session

### A. Stockage des Données
Le projet utilise l'API Web **`sessionStorage`** du navigateur.
Contrairement au `localStorage`, le `sessionStorage` :
- Est isolé par onglet de navigateur.
- Survit aux rafraîchissements de page (F5 / Refresh).
- Est automatiquement détruit à la fermeture de l'onglet ou du navigateur.

### B. Génération à la volée (`n8n-api.ts`)
La création de la session est "Lazy" (paresseuse). Elle n'est générée que lorsqu'un appel vers le backend est requis.

**Fichier concerné** : `shared/api/n8n-api.ts`

```typescript
function getVmindSessionId() {
  let sessionId = sessionStorage.getItem("vmind_session_id");

  if (!sessionId) {
    // Génération d'un UUID V4 standard (ex: "cb067b3f-db07-4aa9-b4bc-850a76548e69")
    sessionId = crypto.randomUUID();
    sessionStorage.setItem("vmind_session_id", sessionId);
  }

  return sessionId;
}
```
Lors de la fonction `sendVmindMessage()`, cet ID est récupéré et intégré directement dans le payload HTTP (JSON) envoyé au Proxy backend.

### C. Réinitialisation Forcée au Refresh (`app/page.tsx`)
Afin d'éviter qu'un utilisateur conserve un ancien contexte d'IA après avoir rafraîchi l'interface (ce qui causerait des incohérences conversationnelles), un mécanisme de nettoyage "Clean Slate" a été implémenté.

**Fichier concerné** : `app/page.tsx`

```typescript
import React, { useState, useEffect } from 'react';
// ... autres imports ...

export default function Home() {
  const { mode } = useMode();

  // Hook de nettoyage de session au montage du composant
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('vmind_session_id');
    }
  }, []);
  
  // ... reste du composant ...
}
```

**Comportement :**
1. L'utilisateur ouvre la page ou rafraîchit (F5).
2. L'application React démarre et monte le composant `Home`.
3. Le hook `useEffect` vide immédiatement la clé `vmind_session_id` du `sessionStorage`.
4. Au premier message envoyé par l'utilisateur, `n8n-api.ts` ne trouvant aucune session en cours, générera un nouveau UUID.
5. Une nouvelle conversation propre démarre côté Backend.

---

> [!NOTE]
> **Pourquoi dans `app/page.tsx` ?**
> Placer ce nettoyage au sommet de l'arbre des composants clients (marqués `"use client"`) garantit qu'il est exécuté de manière globale pour l'application sans pour autant polluer les fichiers purement utilitaires (comme les hooks ou services API) qui ne gèrent pas le cycle de vie de la fenêtre.

## 3. Impact sur l'API Backend / n8n

Du côté de n8n ou du serveur HTTP intermédiaire, chaque requête reçue (`POST /api/n8n-proxy`) contient un champ `session_id`.

Si le `session_id` envoyé est inédit, l'IA alloue une nouvelle zone de mémoire de conversation. S'il correspond à un UUID existant dans la mémoire de l'agent, le message est ajouté au fil de discussion pré-existant.

C'est pourquoi le nettoyage frontend (via `removeItem`) est suffisant pour "réinitialiser" l'agent IA, sans avoir besoin d'envoyer de commande de reset explicite au backend.
