# Documentation Technique : Suggestion VDATA (Volume des Dossiers sur 12 Mois)

Cette documentation détaille l'implémentation de la fonctionnalité de **suggestion instantanée** (ou "chip") pour l'agent **VDATA**. L'objectif est de permettre à l'utilisateur de cliquer sur une suggestion et d'obtenir une réponse immédiate (graphique + KPIs) via un appel direct au backend Node.js, sans passer par le workflow complet de n8n.

---

## 1. Vue d'ensemble du Flux (Architecture "Fast-Track")

1. **Interface Utilisateur (Frontend)** : Lorsque l'agent actif est `VDATA`, des chips de suggestions cliquables apparaissent sous le nom de l'agent.
2. **Action Utilisateur** : Le clic sur la puce *"Volume 12 mois ?"* ajoute un message utilisateur dans le chat et déclenche un appel HTTP direct vers le backend Express (`/api/tools/get-dossier-volume-evolution`).
3. **Traitement Backend** : Le backend Node.js interroge la base de données SQL Server (vue `vw_AI_KPI_Exploitation`), traite les données pour s'assurer d'avoir exactement les 12 derniers mois calendaires, et formate la réponse.
4. **Formatage** : La réponse renvoyée au frontend est structurée **exactement** selon le type `VmindN8nResponse` (le même format que renvoie n8n).
5. **Rendu Frontend** : Le composant `ToolResultRenderer` affiche nativement les KPIs sous forme de cartes et le graphique à barres via `recharts`.

---

## 2. Implémentation Backend (Node.js / Express)

### 2.1. La Vue SQL Utilisée : `vw_AI_KPI_Exploitation`

Le backend s'appuie sur une vue existante de la base de données TraLIS :
*   **Nom de la vue** : `dbo.vw_AI_KPI_Exploitation`
*   **Structure attendue** : Cette vue doit retourner au moins une colonne `periode` (au format `YYYY-MM`) et une colonne `nb_dossiers` (entier représentant le volume).

**Requête SQL intégrée au service :**
```sql
SELECT 
    periode,
    SUM(nb_dossiers) as nb_dossiers
FROM dbo.vw_AI_KPI_Exploitation
WHERE periode >= @startMonth
GROUP BY periode
ORDER BY periode ASC
```
*Le paramètre `@startMonth` est calculé dynamiquement en JavaScript pour correspondre exactement à `Mois_Actuel - 12 mois`.*

### 2.2. Le Service Métier (`src/volume.ts`)

Le fichier `C:\mcp\Vmind_Backend\src\volume.ts` contient la logique métier principale.

**Étapes de traitement :**
1.  **Calcul de la date de début** : On détermine le mois de départ (exactement 12 mois en arrière à partir du mois courant).
2.  **Exécution de la requête SQL** : Récupération des données agrégées.
3.  **Génération des mois** : On génère une liste continue de 12 mois en JavaScript (ex: `['2025-07', '2025-08', ..., '2026-06']`). Ceci garantit que si un mois ne contient aucun dossier en base, il apparaîtra quand même sur le graphique avec une valeur de `0`.
4.  **Jointure JS** : On mappe les résultats SQL sur notre liste continue de 12 mois.
5.  **Calcul des KPIs** : On calcule le Total, le Meilleur Mois, le Pire Mois, et la Tendance globale (variation en % entre le premier et le dernier mois).

### 2.3. Structure de Retour (Format Standard n8n)

La fonction retourne un objet JSON strictement conforme à l'interface `VmindN8nResponse` attendue par le frontend :

```json
{
    "ok": true,
    "tool_used": "get_dossier_volume_evolution",
    "response_type": "full",
    "title": "Évolution du volume des dossiers (12 mois)",
    "message": "Voici l'évolution du volume des dossiers sur les 12 derniers mois.",
    "kpis": [
        { "label": "Total 12 mois", "value": 150, "display": "150", "unit": "dossiers", "status": "info", "trend": "up" },
        { "label": "Meilleur mois", "value": 45, "display": "45", "unit": "mai 2026", "status": "success", "trend": "up" },
        // ... (Mois le plus faible, Tendance)
    ],
    "table": { "columns": [], "rows": [] },
    "chart": {
        "type": "bar",
        "title": "Volume mensuel des dossiers",
        "description": "Période : juil. 2025 - juin 2026",
        "xKey": "label",
        "yKey": "value",
        "data": [
            { "label": "juil. 2025", "value": 0 },
            { "label": "août 2025", "value": 12 },
            // ...
        ]
    },
    "details": null,
    "raw": []
}
```
*Note importante pour Recharts* : La clé `chart.data` contient un tableau d'objets avec `{ label, value }`, qui est le format natif requis par le composant `<BarChart>` de Recharts utilisé en frontend.

### 2.4. Enregistrement de l'API (`src/server-http.ts`)

Le service est exposé via une route POST classique :
```typescript
app.post('/api/tools/get-dossier-volume-evolution', async (req, res) => {
    const { client_id, months = 12 } = req.body;
    try {
        const result = await getDossierVolumeEvolution(client_id, months);
        res.json({ ok: true, data: result });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: { message: err.message } });
    }
});
```

---

## 3. Implémentation Frontend (Next.js / React)

L'interface de chat a été modifiée pour afficher les puces de suggestion et traiter les clics.

### 3.1. Rendu des Chips (`VmindChat.tsx`)

Sous le titre de l'agent (quand `activeAgentId === 'VDATA'`), une zone de suggestions est affichée.

```tsx
{/* Suggestions Zone */}
{activeAgentId === 'VDATA' && (
  <div className="mt-3 flex flex-wrap gap-2">
    <button className="suggestion-chip">Taux livraison à temps ?</button>
    <button className="suggestion-chip">Compare Jan-Avr ?</button>
    <button className="suggestion-chip">3 KPIs dégradés ?</button>
    <button className="suggestion-chip">Rapport mensuel PDF ?</button>
    <button 
      onClick={() => handleSuggestionClick(
        "Montre-moi l'évolution du volume des dossiers sur 12 mois", 
        "/api/tools/get-dossier-volume-evolution", 
        { months: 12 }
      )}
      className="suggestion-chip"
      disabled={isLoading}
    >
      Volume 12 mois ?
    </button>
  </div>
)}
```

### 3.2. Style CSS (`globals.css`)

Pour correspondre fidèlement à la maquette de design, une classe personnalisée `.suggestion-chip` a été créée, s'appuyant sur les variables CSS globales de l'application :

```css
.suggestion-chip {
  background: var(--navy3); /* Fond sombre */
  border: 1px solid rgba(0, 229, 200, 0.4); /* Bordure semi-transparente cyan */
  color: var(--cyan); /* Texte cyan néon */
  font-family: var(--font-title);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  padding: 6px 16px;
  border-radius: 20px; /* Forme de pilule */
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 0 10px rgba(0, 229, 200, 0.1);
}

.suggestion-chip:hover {
  background: var(--navy4);
  border-color: var(--cyan); /* Bordure solide au survol */
  color: #fff; /* Texte blanc au survol */
  text-shadow: 0 0 8px var(--cyan);
  box-shadow: 0 0 15px rgba(0, 229, 200, 0.3), inset 0 0 8px rgba(0, 229, 200, 0.1);
  transform: translateY(-2px); /* Soulèvement */
}

.suggestion-chip:active {
  transform: translateY(0); /* Retour position initiale au clic */
  box-shadow: 0 0 8px rgba(0, 229, 200, 0.4);
}
```

### 3.3. Interception et Traitement (`handleSuggestionClick`)

La fonction `handleSuggestionClick` simule un message utilisateur, fait appel à l'API via le proxy/backend, puis injecte le résultat dans le flux de messages du chat.

```typescript
const handleSuggestionClick = async (suggestion: string, toolEndpoint: string, payload: any) => {
    if (isLoading) return;

    // 1. Ajouter le message de l'utilisateur (la question)
    const userMessage: VmindMessage = { /* ... */ text: suggestion, sender: 'user' };
    
    // 2. Ajouter l'indicateur "VMIND réfléchit..."
    const thinkingMessage: VmindMessage = { /* ... */ isThinking: true, sender: 'vm' };
    
    setMessages((prev) => [...prev, userMessage, thinkingMessage]);
    setIsLoading(true);

    try {
      // 3. Appel à l'API Backend Express (Pas de n8n)
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${baseUrl}${toolEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, ...payload })
      });
      
      const wrapper = await response.json();
      const result = wrapper.data; // Contient le format VmindN8nResponse

      // 4. Mettre à jour l'agent actif si nécessaire
      if (onAgentActive) onAgentActive('VDATA');

      // 5. Injecter la réponse formatée dans le chat
      setMessages((prev) => [...prev.filter(m => !m.isThinking), {
        id: `vm-${Date.now()}`,
        sender: 'vm',
        text: result.message,
        tool_used: result.tool_used,
        response_type: result.response_type,
        kpis: result.kpis,
        chart: result.chart,
        // ... (Autres propriétés requises par ToolResultRenderer)
      }]);
    } catch (error) {
      // Gestion des erreurs...
    }
};
```

---

## 4. Tests et Validation

### Tester le composant localement
1. Lancer le backend : `npm run dev:http` dans `C:\mcp\Vmind_Backend`
2. Lancer le frontend : `npm run dev` dans `C:\mcp\Vmind_Front`
3. Dans la barre latérale gauche (Sidebar), **cliquer sur "VDATA"** pour activer l'agent.
4. Constater l'apparition des chips de suggestions sous le titre de l'agent.
5. Cliquer sur la chip **"Volume 12 mois ?"**.
6. Vérifier l'apparition instantanée des KPIs et du graphique à barres, couvrant avec précision l'année en cours.

### Intégration Continue (MCP / Claude)
Puisque la logique de calcul de volume (`volume.ts`) est également exposée comme un outil MCP Server (`get_dossier_volume_evolution` dans `mcp-server.ts`), il est possible de tester la logique métier avec l'IA (Claude) via le serveur MCP, en lui demandant simplement : *"Donne-moi l'évolution du volume des dossiers sur les 12 derniers mois."* Claude fera l'appel MCP, lira les données, et fournira une analyse textuelle basée sur la même source de vérité.
