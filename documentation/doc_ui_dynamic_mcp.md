# Documentation Technique : Dynamisation UI et Statuts de Connexion MCP

## 1. Contexte & Objectifs
L'interface utilisateur de VMIND affichait initialement des informations statiques codées "en dur" (ex: `TraLIS v3.2` ou `LLM Engine - OK`). Dans le cadre du déploiement multi-ERP et de la migration HTTPS/Double Auth, ces informations devenaient obsolètes ou trompeuses.

L'objectif de cette *feature* (mise à jour) était de :
1. Rendre l'interface complètement **Agnostique** (indépendante d'un nom d'ERP spécifique).
2. Connecter le statut visuel (Le voyant vert `ERP CONNECTÉ` dans la barre supérieure) de manière **Réactive et Dynamique** au token de session de niveau 2 (`vmind_mcp_token`).

## 2. L'Architecture "Double Session"

L'architecture de VMIND repose sur deux niveaux d'authentification Frontend :
1. **`vmind_session`** : Gère l'accès global à l'application web.
2. **`vmind_mcp_token`** : Gère l'accès spécifique aux outils de l'ERP via l'agent et le proxy MCP. 

Le voyant "ERP Connecté" de la barre supérieure (`TopBar.tsx`) doit refléter **exclusivement la présence du `vmind_mcp_token`**, garantissant que l'utilisateur a non seulement accès au site, mais que le pont vers son ERP est actif.

## 3. Implémentation de la Réactivité (Event Listener)

### Le Problème Initial
Dans une Single Page Application (SPA) comme Next.js / React, un simple `useEffect(..., [])` n'est exécuté qu'une seule fois au montage du composant `TopBar`. 
Si l'utilisateur charge l'application (pas de token MCP), puis se connecte à l'ERP depuis le composant `ConnectorsHub`, le `localStorage` est mis à jour, mais le composant `TopBar` n'a aucun moyen de le savoir : le voyant reste gris (`ERP DÉCONNECTÉ`).

### La Solution : Le bus d'événement natif
Pour pallier ce problème de réactivité sans nécessiter un gestionnaire d'état complexe (comme Redux ou un Context lourd), nous avons utilisé le système d'événements natif du navigateur (`window.dispatchEvent`).

Dans **`TopBar.tsx`**, le code a été restructuré pour isoler la logique de vérification dans une fonction `checkTokens()` :

```typescript
// features/layout/TopBar.tsx

const checkTokens = () => {
  const mcpToken = localStorage.getItem('vmind_mcp_token');
  
  if (mcpToken) {
    setIsErpConnected(true); // Passe le statut à Vert + "ERP CONNECTÉ"
  } else {
    setIsErpConnected(false); // Passe le statut à Gris + "ERP DÉCONNECTÉ"
  }
  
  // (Le reste de la logique pour lire vmind_session et extraire le nom / role)
};

useEffect(() => {
  // 1. Exécution initiale au chargement de la page
  checkTokens();
  
  // 2. Abonnement à l'événement de mise à jour MCP
  window.addEventListener('mcp-session-updated', checkTokens);
  
  // 3. Nettoyage de l'événement lors de la destruction du composant
  return () => window.removeEventListener('mcp-session-updated', checkTokens);
}, []);
```

Du côté du gestionnaire de connexion (dans le `ConnectorsHub`), dès qu'une connexion MCP réussit, l'événement est diffusé :
```typescript
localStorage.setItem('vmind_mcp_token', token);
window.dispatchEvent(new Event('mcp-session-updated')); // Informe instantanément TopBar et Sidebar
```

## 4. Nettoyage et Expérience Utilisateur (UI)

- **Composant StatusDot** : Modification du composant générique `<StatusDot />` pour qu'il accepte dynamiquement une propriété `style` (notamment `backgroundColor`), permettant l'alternance visuelle :
  ```tsx
  <StatusDot style={{ backgroundColor: isErpConnected ? '#00e5c8' : '#8FA3B8' }} />
  ```
- **Sidebar** : Le bas de la barre latérale (`.sidebar-footer`), qui contenait des `div` purement décoratives affichant le texte en dur `TraLIS ERP` et `LLM Engine`, a été complètement supprimé pour prévenir la désinformation de l'utilisateur.
- **TralisConnectorPanel (Mot de Passe)** : Intégration de l'icône oeil (`Eye` / `EyeOff` de *lucide-react*) dans le champ mot de passe, couplée à un `useState` `showPassword`. Un bouton avec positionnement absolu manipule l'attribut `type` du `<input>` (`text` vs `password`).

## 5. Résumé des Fichiers Modifiés

| Composant | Rôle de la modification |
| :--- | :--- |
| `features/layout/TopBar.tsx` | Ajout de l'Event Listener et de la logique booléenne conditionnelle au `vmind_mcp_token`. |
| `components/ui/StatusDot.tsx` | Ajout de l'interface `StatusDotProps` pour l'injection CSS. |
| `features/sidebar/Sidebar.tsx` | Refactorisation UI (Renommage de sections, suppression du footer statique). |
| `features/connectors/components/TralisConnectorPanel.tsx` | Ajout du toggle (œil) pour la visibilité du mot de passe. |
